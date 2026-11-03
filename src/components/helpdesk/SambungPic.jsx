import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, UserRound } from "lucide-react";
import api from "../../api";
import { pesanGalat } from "./ikonHelpdesk";

/**
 * Urusan akun di Helpdesk: penanya disambungkan langsung ke PIC program yang
 * memakai akunnya. Semua di dalam kolom chat — pesan diteruskan ke fitur Pesan
 * PIC, dan balasan PIC dari Pesan tampil di sini (dibaca berkala).
 */

export const KUNCI_SAMBUNG = "helpdesk_sambung_pic";
const JEDA_BACA_MS = 4000;

const jam = (v) => new Date(v).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

/** Pilihan program (muncul di bawah jawaban bot untuk pertanyaan akun). */
export function PilihProgram({ program, onPilih }) {
	return (
		<div className="mt-2 grid grid-cols-2 gap-1.5">
			{program.map((p) => (
				<button
					key={p.key}
					type="button"
					onClick={() => onPilih(p)}
					title={p.ket}
					className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-left text-[12px] font-medium leading-snug text-slate-700 transition hover:border-emerald-400 hover:bg-emerald-50/60"
				>
					{p.label}
				</button>
			))}
		</div>
	);
}

/** Formulir singkat sebelum disambungkan: nama (tamu) dan keperluan. */
export function FormSambung({ program, pertanyaan, login, wilayah, onBatal, onTersambung }) {
	const [nama, setNama] = useState("");
	const [pesan, setPesan] = useState(pertanyaan || "");
	const [website, setWebsite] = useState("");
	const [kirim, setKirim] = useState(false);
	const [galat, setGalat] = useState("");

	const sambung = async (e) => {
		e.preventDefault();
		if (kirim) return;
		setKirim(true);
		setGalat("");
		try {
			const { data } = await api.post("/helpdesk/publik/sambung", { program: program.key, nama, pesan, website, ...wilayah });
			onTersambung({ ...data.data, nama: nama || null });
		} catch (err) {
			setGalat(pesanGalat(err, "menyambungkan ke PIC"));
		} finally {
			setKirim(false);
		}
	};

	return (
		<form onSubmit={sambung} className="mt-2 space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
			<p className="m-0 text-[12px] text-slate-600">
				Pesan Anda dikirim langsung ke <b className="text-slate-900">PIC {program.label}</b> dan dibalas di percakapan ini.
			</p>
			{!login && (
				<input
					value={nama}
					onChange={(e) => setNama(e.target.value)}
					placeholder="Nama Anda"
					maxLength={150}
					required
					className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
				/>
			)}
			<textarea
				value={pesan}
				onChange={(e) => setPesan(e.target.value)}
				placeholder="Tuliskan keperluan Anda, sebutkan nama desa/kecamatan"
				rows={3}
				maxLength={2000}
				required
				className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
			/>
			<input value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
			{galat && <p className="m-0 text-[12px] text-rose-600">{galat}</p>}
			<div className="flex items-center justify-end gap-2">
				<button type="button" onClick={onBatal} className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800">
					Batal
				</button>
				<button type="submit" disabled={kirim || !pesan.trim() || (!login && !nama.trim())} className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
					{kirim ? "Menyambungkan…" : "Sambungkan ke PIC"}
				</button>
			</div>
		</form>
	);
}

/** Percakapan langsung dengan PIC (layar penuh di widget). */
export function PercakapanPic({ sesi, onKembali, onAkhiri }) {
	const [benang, setBenang] = useState(null);
	const [balas, setBalas] = useState("");
	const [kirim, setKirim] = useState(false);
	const [galat, setGalat] = useState("");
	const ujung = useRef(null);

	useEffect(() => {
		let hidup = true;
		const baca = () =>
			api
				.get(`/helpdesk/publik/sambung/${sesi.id}`, { params: { k: sesi.k } })
				.then((r) => hidup && setBenang(r.data.data))
				.catch((err) => {
					if (!hidup) return;
					if (err.response?.status === 403 || err.response?.status === 404) onAkhiri();
				});
		baca();
		const t = setInterval(baca, JEDA_BACA_MS);
		return () => {
			hidup = false;
			clearInterval(t);
		};
	}, [sesi.id, sesi.k, onAkhiri]);

	const jumlah = benang?.pesan.length || 0;
	useEffect(() => {
		ujung.current?.scrollIntoView({ block: "end" });
	}, [jumlah]);

	const kirimBalas = async (e) => {
		e.preventDefault();
		const isi = balas.trim();
		if (!isi || kirim) return;
		setKirim(true);
		setGalat("");
		try {
			const { data } = await api.post(`/helpdesk/publik/sambung/${sesi.id}/balas`, { k: sesi.k, pesan: isi, nama: sesi.nama });
			setBenang(data.data);
			setBalas("");
		} catch (err) {
			setGalat(pesanGalat(err, "mengirim pesan"));
		} finally {
			setKirim(false);
		}
	};

	const dibalas = benang?.pesan.some((m) => m.dari === "petugas");

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="flex shrink-0 items-center gap-2.5 border-b border-slate-100 px-3 py-2.5">
				<button type="button" onClick={onKembali} aria-label="Kembali ke chat bot" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100">
					<ArrowLeft size={16} />
				</button>
				<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
					<UserRound size={16} />
				</span>
				<div className="min-w-0 flex-1">
					<p className="m-0 truncate text-[13px] font-semibold text-slate-900">PIC {sesi.program}</p>
					<p className="m-0 truncate text-[11px] text-slate-500">
						{sesi.pic} · {sesi.code}
					</p>
				</div>
			</div>

			<div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-slate-50/60 px-3 py-3">
				{!benang && <p className="py-6 text-center text-xs text-slate-400">Memuat percakapan…</p>}
				{benang?.pesan.map((m) =>
					m.dari === "sistem" ? (
						<p key={m.id} className="mx-auto max-w-[90%] text-center text-[11px] leading-snug text-slate-400">
							{m.isi}
						</p>
					) : m.dari === "pelapor" ? (
						<div key={m.id} className="flex justify-end">
							<div className="max-w-[82%] rounded-2xl rounded-br-md bg-emerald-600 px-3 py-2 text-[13px] text-white">
								<p className="m-0 whitespace-pre-line">{m.isi}</p>
								<p className="m-0 mt-0.5 text-right text-[10px] text-emerald-100">{jam(m.pada)}</p>
							</div>
						</div>
					) : (
						<div key={m.id} className="flex">
							<div className="max-w-[82%] rounded-2xl rounded-bl-md bg-white px-3 py-2 text-[13px] text-slate-700 ring-1 ring-slate-200">
								<p className="m-0 text-[11px] font-semibold text-slate-900">{m.nama || "PIC"}</p>
								<p className="m-0 whitespace-pre-line">{m.isi}</p>
								<p className="m-0 mt-0.5 text-[10px] text-slate-400">{jam(m.pada)}</p>
							</div>
						</div>
					),
				)}
				{benang && !dibalas && <p className="text-center text-[11px] text-slate-400">Menunggu balasan PIC — pesan baru muncul otomatis di sini.</p>}
				<div ref={ujung} />
			</div>

			<form onSubmit={kirimBalas} className="shrink-0 border-t border-slate-100 bg-white p-3">
				{galat && <p className="m-0 mb-1.5 text-[12px] text-rose-600">{galat}</p>}
				<div className="flex items-center gap-2">
					<input
						value={balas}
						onChange={(e) => setBalas(e.target.value)}
						placeholder={`Tulis pesan untuk PIC ${sesi.program}…`}
						maxLength={2000}
						className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white"
					/>
					<button type="submit" disabled={kirim || !balas.trim()} aria-label="Kirim" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white disabled:opacity-40">
						<Send size={15} />
					</button>
				</div>
			</form>
		</div>
	);
}
