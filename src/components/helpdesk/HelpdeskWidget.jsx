import { createContext, Fragment, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
	ArrowLeft, ArrowRight, ArrowUpRight, Check, ChevronDown, ChevronRight, CircleCheck, Flame, House, Inbox,
	LifeBuoy, MapPin, Search, Send, Star, Ticket, X, Zap,
} from "lucide-react";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import { LABEL_TINGKAT, STATUS_TIKET, ikonKategori, pesanGalat, waktu } from "./ikonHelpdesk";
import { FormSambung, KUNCI_SAMBUNG, PercakapanPic, PilihProgram } from "./SambungPic";

/**
 * Helpdesk DPMD: tombol bantuan melayang untuk masyarakat, operator desa, dan
 * kecamatan.
 *
 * Bot menjawab dari data akun penanya (tiket, proposal Bankeu, aparatur), data
 * resmi sistem, dan FAQ DPMD — disusun AI (Groq) bila aktif di server. Bila belum
 * terjawab, penanya ditawari pertanyaan terdekat, lalu diarahkan ke petugas
 * yang berwenang (kecamatan -> bidang DPMD -> DPMD) lewat WhatsApp atau tiket.
 * Tamu memilih kecamatan sendiri; akun memakai wilayah akunnya.
 *
 * Urusan akun tidak dijawab bot: penanya memilih program yang memakai akunnya,
 * lalu disambungkan langsung ke PIC program di kolom chat ini (SambungPic.jsx).
 *
 * Pegawai DPMD tidak melihat widget ini — mereka menjawab tiket dari panel
 * Helpdesk. Notifikasi balasan membuka widget lewat ?bantuan=tiket.
 *
 * Tombol hanya tampil di landing page ("/"). Pengecualiannya halaman yang
 * dibuka dari notifikasi balasan tiket, supaya balasan tetap bisa dibaca.
 */

const PERAN_INTERNAL = ["superadmin", "kepala_dinas", "sekretaris_dinas", "kepala_bidang", "ketua_tim", "pegawai", "bendahara"];
const KUNCI_WILAYAH = "helpdesk_wilayah";
const KUNCI_SAPA = "helpdesk_sudah_disapa";
const KUNCI_TIKET_TAMU = "helpdesk_tiket_tamu";
const MAKS_TIKET_TAMU = 10;
const WARNA_TOPIK = [
	"bg-emerald-50 text-emerald-600", "bg-sky-50 text-sky-600", "bg-violet-50 text-violet-600",
	"bg-amber-50 text-amber-600", "bg-rose-50 text-rose-600", "bg-teal-50 text-teal-600",
];

const INPUT = "w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 focus:bg-white transition";
const MUNCUL = "transition duration-300 ease-out starting:opacity-0 starting:translate-y-2 motion-reduce:transition-none";

const bacaSimpan = (kunci, bawaan) => {
	try { return JSON.parse(localStorage.getItem(kunci)) ?? bawaan; } catch { return bawaan; }
};
const tulisSimpan = (kunci, nilai) => {
	try { localStorage.setItem(kunci, JSON.stringify(nilai)); } catch { /* opsional */ }
};
const sudahDisapa = () => {
	try { return sessionStorage.getItem(KUNCI_SAPA) === "1"; } catch { return true; }
};
const tandaiDisapa = () => {
	try { sessionStorage.setItem(KUNCI_SAPA, "1"); } catch { /* opsional */ }
};
const simpanTiketTamu = (kunci) => {
	const daftar = [kunci, ...bacaSimpan(KUNCI_TIKET_TAMU, []).filter((x) => x.kode !== kunci.kode)].slice(0, MAKS_TIKET_TAMU);
	tulisSimpan(KUNCI_TIKET_TAMU, daftar);
	return daftar;
};

/* ── Teks jawaban: **tebal**, daftar bernomor, dan butir "-" ─────────────── */

function Sebaris({ teks }) {
	return String(teks).split(/(\*\*[^*]+\*\*)/g).map((bagian, i) => (
		bagian.startsWith("**") && bagian.endsWith("**") && bagian.length > 4
			? <strong key={i} className="font-semibold text-slate-900">{bagian.slice(2, -2)}</strong>
			: <Fragment key={i}>{bagian}</Fragment>
	));
}

function TeksKaya({ teks }) {
	const blok = [];
	String(teks || "").split("\n").forEach((baris) => {
		const nomor = baris.match(/^\s*(\d+)[.)]\s+(.*)$/);
		const butir = baris.match(/^\s*[-•]\s+(.*)$/);
		const jenis = nomor ? "ol" : butir ? "ul" : "p";
		const isi = nomor ? nomor[2] : butir ? butir[1] : baris;
		const akhir = blok[blok.length - 1];
		if (jenis !== "p" && akhir?.jenis === jenis) akhir.isi.push(isi);
		else blok.push({ jenis, isi: [isi] });
	});
	return blok.map((b, i) => {
		if (b.jenis === "ol") {
			return (
				<ol key={i} className="m-0 my-1.5 list-none space-y-1 pl-0">
					{b.isi.map((x, j) => (
						<li key={j} className="flex gap-2">
							<span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700">{j + 1}</span>
							<span><Sebaris teks={x} /></span>
						</li>
					))}
				</ol>
			);
		}
		if (b.jenis === "ul") {
			return (
				<ul key={i} className="m-0 my-1.5 list-none space-y-1 pl-0">
					{b.isi.map((x, j) => <li key={j} className="flex gap-2"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" /><span><Sebaris teks={x} /></span></li>)}
				</ul>
			);
		}
		return b.isi[0].trim() ? <p key={i} className="m-0 [&+p]:mt-2"><Sebaris teks={b.isi[0]} /></p> : null;
	});
}

function AvatarBot({ besar = false }) {
	return (
		<span className={`relative flex shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-black/5 ${besar ? "h-11 w-11 p-1.5" : "h-8 w-8 p-1"}`}>
			<img src="/logo-dpmd-96.png" alt="" className="h-full w-full object-contain" />
			{besar && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-lime-400 ring-2 ring-emerald-600" />}
		</span>
	);
}

/* ── Pemilih daftar dengan pencarian (lembar dari bawah di dalam panel) ──── */

const KonteksLapisan = createContext(null);

function PemilihDaftar({ label, Ikon, nilai, pilihan, placeholder, onPilih, disabled = false, cari = true }) {
	const lapisan = useContext(KonteksLapisan);
	const [buka, setBuka] = useState(false);
	const [kata, setKata] = useState("");
	const kolomCari = useRef(null);
	const terpilih = pilihan.find((p) => String(p.value) === String(nilai));

	useEffect(() => {
		if (!buka) return undefined;
		const t = setTimeout(() => kolomCari.current?.focus(), 150);
		const tutup = (e) => { if (e.key === "Escape") setBuka(false); };
		window.addEventListener("keydown", tutup);
		return () => { clearTimeout(t); window.removeEventListener("keydown", tutup); };
	}, [buka]);

	const q = kata.trim().toLowerCase();
	const tersaring = q ? pilihan.filter((p) => p.label.toLowerCase().includes(q)) : pilihan;
	const tutup = () => { setBuka(false); setKata(""); };

	const lembar = buka && (
		<div className="pointer-events-auto absolute inset-0 z-20 flex flex-col justify-end">
			<button type="button" aria-label="Tutup pilihan" onClick={tutup} className="absolute inset-0 bg-slate-900/25 backdrop-blur-[2px] transition-opacity duration-200 starting:opacity-0" />
			<div role="listbox" aria-label={label} className="relative flex max-h-[78%] flex-col rounded-t-[26px] bg-white shadow-[0_-20px_50px_-20px_rgba(15,23,42,.45)] transition duration-300 ease-out starting:translate-y-full motion-reduce:transition-none">
				<span aria-hidden className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-200" />
				<div className="flex items-center justify-between px-4 pb-2 pt-2.5">
					<p className="m-0 text-sm font-bold text-slate-900">{label}</p>
					<button type="button" onClick={tutup} aria-label="Tutup" className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"><X size={14} /></button>
				</div>
				{cari && (
					<div className="px-4 pb-2">
						<div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2.5 ring-emerald-500/30 focus-within:bg-white focus-within:ring-2">
							<Search size={14} className="text-slate-400" />
							<input ref={kolomCari} value={kata} onChange={(e) => setKata(e.target.value)} placeholder={`Cari ${label.toLowerCase()}…`}
								className="w-full border-0 bg-transparent p-0 text-sm text-slate-900 placeholder-slate-400 focus:outline-none" />
						</div>
					</div>
				)}
				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-3">
					{tersaring.length === 0 && <p className="m-0 py-8 text-center text-sm text-slate-400">Tidak ditemukan</p>}
					{tersaring.map((p) => {
						const aktif = String(p.value) === String(nilai);
						return (
							<button key={p.value} type="button" role="option" aria-selected={aktif} onClick={() => { onPilih(p.value); tutup(); }}
								className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${aktif ? "bg-emerald-50 font-semibold text-emerald-700" : "text-slate-700 hover:bg-slate-50"}`}>
								<span className="flex-1">{p.label}</span>
								{aktif && <Check size={14} className="text-emerald-600" />}
							</button>
						);
					})}
				</div>
			</div>
		</div>
	);

	return (
		<>
			<button type="button" disabled={disabled} onClick={() => setBuka(true)}
				className={`flex w-full items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left text-sm transition ${disabled ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300" : "border-slate-200 bg-white text-slate-900 hover:border-emerald-300 hover:bg-emerald-50/30"}`}>
				{Ikon && <Ikon size={14} className={terpilih ? "text-emerald-600" : "text-slate-400"} />}
				<span className={`min-w-0 flex-1 truncate ${terpilih ? "font-medium" : "text-slate-400"}`}>{terpilih ? terpilih.label : placeholder}</span>
				<ChevronDown size={14} className="text-slate-400" />
			</button>
			{lembar && (lapisan ? createPortal(lembar, lapisan) : lembar)}
		</>
	);
}

/* ── Pilih wilayah (tamu): kecamatan wajib, desa opsional ─────────────────── */

function PilihWilayah({ nilai, onPilih }) {
	const [kecamatan, setKecamatan] = useState([]);
	const [desaMuat, setDesaMuat] = useState({ kid: null, daftar: [] });
	const [kid, setKid] = useState(nilai.kecamatan_id || "");
	const [did, setDid] = useState(nilai.desa_id || "");

	useEffect(() => {
		api.get("/helpdesk/publik/kecamatan").then((r) => setKecamatan(r.data.data || [])).catch(() => {});
	}, []);
	useEffect(() => {
		if (!kid) return;
		api.get(`/helpdesk/publik/kecamatan/${kid}/desa`)
			.then((r) => setDesaMuat({ kid, daftar: r.data.data || [] }))
			.catch(() => setDesaMuat({ kid, daftar: [] }));
	}, [kid]);
	const desa = desaMuat.kid === kid ? desaMuat.daftar : [];

	return (
		<div className={`mt-2 space-y-2 rounded-2xl bg-white p-3 ring-1 ring-slate-200 ${MUNCUL}`}>
			<p className="m-0 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
				<MapPin size={13} className="text-emerald-600" />
				Pilih wilayah Anda supaya diarahkan ke petugas yang tepat
			</p>
			<PemilihDaftar label="Kecamatan" Ikon={MapPin} placeholder="Pilih kecamatan" nilai={kid}
				pilihan={kecamatan.map((k) => ({ value: String(k.id), label: k.nama }))}
				onPilih={(v) => { setKid(v); setDid(""); }} />
			<PemilihDaftar label="Desa/Kelurahan" Ikon={House} placeholder={kid ? "Pilih desa/kelurahan (opsional)" : "Pilih kecamatan dulu"} nilai={did}
				disabled={!kid} pilihan={desa.map((d) => ({ value: String(d.id), label: d.nama }))} onPilih={setDid} />
			<button type="button" disabled={!kid} onClick={() => onPilih({ kecamatan_id: Number(kid), desa_id: did ? Number(did) : null })}
				className="w-full rounded-2xl bg-emerald-600 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:opacity-40">
				Tampilkan kontak
			</button>
		</div>
	);
}

/* ── Kartu kontak petugas ─────────────────────────────────────────────────── */

const IkonWa = ({ size = 14 }) => (
	<svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden>
		<path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.3-.5-2.4-1.5-.9-.8-1.5-1.8-1.7-2.1-.2-.3 0-.5.1-.6l.4-.5.3-.5c.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5 2.5 1 3 .8 3.6.7.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.1-.3-.2-.6-.3zM12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2z" />
	</svg>
);

function KartuKontak({ kontak, ringkas, onTiket }) {
	if (!kontak) return null;
	if (ringkas) {
		return (
			<div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
				<span className="mr-0.5">Masih butuh bantuan?</span>
				{kontak.whatsapp_url && (
					<a href={kontak.whatsapp_url} target="_blank" rel="noopener noreferrer"
						className="inline-flex items-center gap-1 rounded-full bg-[#25D366]/10 px-2.5 py-1 font-semibold text-[#128C4B] no-underline transition hover:bg-[#25D366]/20">
						<IkonWa size={12} />{kontak.nama}
					</a>
				)}
				<button type="button" onClick={onTiket} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 transition hover:bg-slate-200">
					<Ticket size={12} />Tiket
				</button>
			</div>
		);
	}
	const inisial = (kontak.pengelola || kontak.nama || "?").split(/\s+/).map((k) => k[0]).join("").slice(0, 2).toUpperCase();
	return (
		<div className={`mt-2 overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_-16px_rgba(5,150,105,.5)] ring-1 ring-emerald-100 ${MUNCUL}`}>
			<div className="flex items-center gap-3 p-3">
				<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-xs font-bold text-white">{inisial}</span>
				<div className="min-w-0">
					<p className="m-0 text-[10px] font-bold uppercase tracking-wider text-slate-400">Ditangani oleh</p>
					<p className="m-0 truncate text-sm font-bold text-slate-900">{kontak.nama}</p>
					{kontak.pengelola && <p className="m-0 truncate text-[11px] text-slate-500">{kontak.pengelola}</p>}
				</div>
			</div>
			{kontak.dialihkan && (
				<p className="m-0 mx-3 mb-2 rounded-xl bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700">
					Petugas di tingkat sebelumnya belum punya nomor WhatsApp, jadi dialihkan ke {kontak.nama}.
				</p>
			)}
			<div className="grid grid-cols-2 gap-2 px-3 pb-3">
				{kontak.whatsapp_url ? (
					<a href={kontak.whatsapp_url} target="_blank" rel="noopener noreferrer"
						className="flex items-center justify-center gap-1.5 rounded-xl bg-[#25D366] py-2.5 text-xs font-bold text-white no-underline shadow-sm transition hover:brightness-95">
						<IkonWa />WhatsApp
					</a>
				) : (
					<span className="flex items-center justify-center rounded-xl bg-slate-50 py-2.5 text-[11px] text-slate-400">WA belum tersedia</span>
				)}
				<button type="button" onClick={onTiket} className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white transition hover:bg-slate-700">
					<Ticket size={14} />Buat Tiket
				</button>
			</div>
		</div>
	);
}

/* ── Formulir tiket ───────────────────────────────────────────────────────── */

function FormTiket({ awal, login, wilayahDariAkun, kategori, wilayahAwal, riwayat, onBatal, onSelesai }) {
	const [form, setForm] = useState({ nama: "", whatsapp: "", website: "", pesan: awal.pesan || "", kategori_id: awal.kategori_id || "", mendesak: false });
	const [wilayah, setWilayah] = useState(wilayahAwal);
	const [kirim, setKirim] = useState(false);
	const [galat, setGalat] = useState("");

	const kat = kategori.find((k) => k.id === Number(form.kategori_id));
	const butuhWilayah = !wilayahDariAkun && kat?.target_level === "kecamatan" && !wilayah.kecamatan_id;
	const ubah = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

	const submit = async (e) => {
		e.preventDefault();
		setGalat("");
		setKirim(true);
		try {
			const { data } = await api.post("/helpdesk/publik/tiket", {
				...form,
				kategori_id: form.kategori_id ? Number(form.kategori_id) : null,
				...wilayah,
				riwayat,
			});
			if (!login && data.data?.code) simpanTiketTamu({ kode: data.data.code, whatsapp: form.whatsapp.trim() });
			onSelesai(data.data);
		} catch (err) {
			setGalat(pesanGalat(err, "membuat tiket"));
		} finally {
			setKirim(false);
		}
	};

	return (
		<form onSubmit={submit} className="flex-1 space-y-3 overflow-y-auto p-4">
			<div className="mb-1 flex items-center gap-2">
				<button type="button" onClick={onBatal} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label="Kembali"><ArrowLeft size={16} /></button>
				<div>
					<p className="m-0 text-sm font-bold text-slate-900">Buat Tiket Bantuan</p>
					<p className="m-0 text-[11px] text-slate-500">Dijawab tertulis oleh petugas yang berwenang</p>
				</div>
			</div>
			<input type="text" name="website" value={form.website} onChange={ubah("website")} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
			<div>
				<span className="text-xs font-semibold text-slate-600">Kategori</span>
				<div className="mt-1">
					<PemilihDaftar label="Kategori" placeholder="Pilih kategori" nilai={form.kategori_id} cari={false}
						pilihan={kategori.map((k) => ({ value: String(k.id), label: `${k.name} — ${LABEL_TINGKAT[k.target_level]}` }))}
						onPilih={(v) => setForm((f) => ({ ...f, kategori_id: v }))} />
				</div>
			</div>
			{!login && (
				<>
					<label className="block">
						<span className="text-xs font-semibold text-slate-600">Nama</span>
						<input className={`${INPUT} mt-1`} value={form.nama} onChange={ubah("nama")} required maxLength={150} placeholder="Nama lengkap" />
					</label>
					<label className="block">
						<span className="text-xs font-semibold text-slate-600">Nomor WhatsApp</span>
						<input className={`${INPUT} mt-1`} value={form.whatsapp} onChange={ubah("whatsapp")} required inputMode="tel" placeholder="081234567890" />
					</label>
				</>
			)}
			{butuhWilayah && <PilihWilayah nilai={wilayah} onPilih={(w) => { setWilayah(w); tulisSimpan(KUNCI_WILAYAH, w); }} />}
			<label className="block">
				<span className="text-xs font-semibold text-slate-600">Pertanyaan</span>
				<textarea className={`${INPUT} mt-1 min-h-[104px]`} value={form.pesan} onChange={ubah("pesan")} required maxLength={2000} placeholder="Jelaskan kendala atau pertanyaan Anda, sebutkan nama desa dan menu aplikasinya bila ada" />
			</label>
			<label className="flex items-start gap-2 rounded-2xl bg-rose-50/60 px-3 py-2.5 text-xs text-slate-700 ring-1 ring-rose-100">
				<input type="checkbox" checked={form.mendesak} onChange={ubah("mendesak")} className="mt-0.5" />
				<span><b className="text-rose-700">Mendesak</b> — misalnya tenggat pengajuan sudah dekat. Tiket ditandai prioritas untuk petugas.</span>
			</label>
			{galat && <p className="m-0 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{galat}</p>}
			<button type="submit" disabled={kirim || butuhWilayah || !form.kategori_id}
				className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:brightness-105 disabled:opacity-50">
				{kirim ? "Mengirim…" : "Kirim Tiket"}
			</button>
		</form>
	);
}

/* ── Percakapan satu tiket (akun maupun tamu) ─────────────────────────────── */

function NilaiTiket({ onNilai }) {
	const [bintang, setBintang] = useState(0);
	const [catatan, setCatatan] = useState("");
	const [kirim, setKirim] = useState(false);
	return (
		<div className="space-y-2 border-t border-slate-100 bg-amber-50/40 p-3">
			<p className="m-0 text-center text-xs font-semibold text-slate-700">Seberapa puas dengan jawaban petugas?</p>
			<div className="flex justify-center gap-1">
				{[1, 2, 3, 4, 5].map((n) => (
					<button key={n} type="button" onClick={() => setBintang(n)} aria-label={`${n} bintang`} className="p-0.5 transition hover:scale-110">
						<Star size={26} className={n <= bintang ? "fill-amber-400 text-amber-400" : "text-slate-300"} />
					</button>
				))}
			</div>
			{bintang > 0 && (
				<div className={`flex gap-2 ${MUNCUL}`}>
					<input className={INPUT} value={catatan} onChange={(e) => setCatatan(e.target.value)} maxLength={500} placeholder="Catatan (opsional)" />
					<button type="button" disabled={kirim} onClick={async () => { setKirim(true); try { await onNilai(bintang, catatan); } finally { setKirim(false); } }}
						className="shrink-0 rounded-2xl bg-amber-500 px-4 text-xs font-bold text-white transition hover:bg-amber-600 disabled:opacity-50">Kirim</button>
				</div>
			)}
		</div>
	);
}

function PercakapanTiket({ tiket, onKembali, onKirim, onNilai }) {
	const [balas, setBalas] = useState("");
	const [kirim, setKirim] = useState(false);
	const [galat, setGalat] = useState("");

	const kirimBalas = async (e) => {
		e.preventDefault();
		if (!balas.trim()) return;
		setKirim(true);
		setGalat("");
		try {
			await onKirim(balas);
			setBalas("");
		} catch (err) {
			setGalat(pesanGalat(err, "mengirim balasan"));
		} finally {
			setKirim(false);
		}
	};

	const bisaNilai = !tiket.rating && ["dijawab", "selesai"].includes(tiket.status);
	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="flex items-center gap-2 border-b border-slate-100 px-4 py-2.5">
				<button type="button" onClick={onKembali} className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100" aria-label="Kembali"><ArrowLeft size={16} /></button>
				<div className="min-w-0">
					<p className="m-0 font-mono text-[11px] text-slate-500">{tiket.code} · {tiket.tujuan_nama}</p>
					<p className="m-0 truncate text-sm font-bold text-slate-900">{tiket.subject}</p>
				</div>
			</div>
			<div className="flex-1 space-y-2.5 overflow-y-auto bg-slate-50/70 p-4">
				{tiket.pesan.map((m) => (
					<div key={m.id} className={m.sender_type === "sistem" ? "text-center" : m.sender_type === "pelapor" ? "flex justify-end" : "flex"}>
						{m.sender_type === "sistem" ? (
							<p className="m-0 inline-block whitespace-pre-line rounded-xl bg-white px-2.5 py-1.5 text-left text-[11px] text-slate-500 ring-1 ring-slate-200">{m.body}</p>
						) : (
							<div className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-sm ${m.sender_type === "pelapor" ? "rounded-br-md bg-gradient-to-br from-emerald-600 to-teal-500 text-white" : "rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200"}`}>
								{m.sender_type === "petugas" && <p className="m-0 mb-0.5 text-[11px] font-bold text-emerald-700">{m.sender_name}</p>}
								{m.body}
								<p className={`m-0 mt-1 text-[10px] ${m.sender_type === "pelapor" ? "text-emerald-50/80" : "text-slate-400"}`}>{waktu(m.created_at)}</p>
							</div>
						)}
					</div>
				))}
				{tiket.rating && (
					<p className="m-0 text-center text-[11px] text-slate-500">Anda menilai tiket ini {"★".repeat(tiket.rating)}{"☆".repeat(5 - tiket.rating)}</p>
				)}
			</div>
			{bisaNilai && <NilaiTiket onNilai={onNilai} />}
			{tiket.status !== "selesai" ? (
				<form onSubmit={kirimBalas} className="border-t border-slate-100 p-3">
					{galat && <p className="m-0 mb-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{galat}</p>}
					<div className="flex gap-2">
						<input className={INPUT} value={balas} onChange={(e) => setBalas(e.target.value)} placeholder="Tulis balasan…" maxLength={2000} />
						<button type="submit" disabled={kirim || !balas.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white disabled:opacity-40" aria-label="Kirim"><Send size={15} /></button>
					</div>
				</form>
			) : (
				<p className="m-0 border-t border-slate-100 py-3 text-center text-xs text-slate-500">Tiket ini sudah selesai.</p>
			)}
		</div>
	);
}

function KartuTiket({ t, onBuka }) {
	return (
		<button type="button" onClick={onBuka} className="w-full rounded-2xl bg-white p-3 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-emerald-300">
			<div className="flex items-center justify-between gap-2">
				<span className="font-mono text-[11px] text-slate-500">{t.code}</span>
				<span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${STATUS_TIKET[t.status]?.kelas}`}>{STATUS_TIKET[t.status]?.label}</span>
			</div>
			<p className="m-0 mt-1 line-clamp-2 text-sm font-semibold text-slate-900">{t.subject}</p>
			<p className="m-0 mt-0.5 text-[11px] text-slate-500">{t.category_name || "Umum"} · {t.tujuan_nama} · {waktu(t.last_message_at)}</p>
		</button>
	);
}

const KosongTiket = ({ teks }) => (
	<div className="py-8 text-center">
		<Inbox size={32} className="mx-auto text-slate-300" />
		<p className="m-0 mt-2 text-sm text-slate-400">{teks}</p>
	</div>
);

function TiketSaya({ onKembali }) {
	const [items, setItems] = useState(null);
	const [buka, setBuka] = useState(null);

	const muat = useCallback(() => {
		api.get("/helpdesk/publik/tiket-saya").then((r) => setItems(r.data.data || [])).catch(() => setItems([]));
	}, []);
	useEffect(() => { muat(); }, [muat]);

	const bukaTiket = async (id) => {
		const { data } = await api.get(`/helpdesk/publik/tiket-saya/${id}`);
		setBuka(data.data);
	};

	if (buka) {
		return (
			<PercakapanTiket
				tiket={buka}
				onKembali={() => { setBuka(null); muat(); }}
				onKirim={async (pesan) => { await api.post(`/helpdesk/publik/tiket-saya/${buka.id}/balas`, { pesan }); await bukaTiket(buka.id); }}
				onNilai={async (rating, catatan) => { await api.post(`/helpdesk/publik/tiket-saya/${buka.id}/nilai`, { rating, catatan }); await bukaTiket(buka.id); }}
			/>
		);
	}
	return (
		<div className="flex-1 space-y-2 overflow-y-auto p-4">
			<button type="button" onClick={onKembali} className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"><ArrowLeft size={13} />Kembali</button>
			<p className="m-0 text-sm font-bold text-slate-900">Tiket Saya</p>
			{items === null && <p className="m-0 py-8 text-center text-sm text-slate-400">Memuat…</p>}
			{items?.length === 0 && <KosongTiket teks="Belum ada tiket." />}
			{items?.map((t) => <KartuTiket key={t.id} t={t} onBuka={() => bukaTiket(t.id).catch(() => {})} />)}
		</div>
	);
}

/* Tamu: tiket dibuka dengan kode tiket + nomor WhatsApp. Tiket dari perangkat
   ini disimpan di browser; dari perangkat lain dicari dengan kodenya. */
function TiketTamu({ onKembali }) {
	const [simpanan, setSimpanan] = useState(() => bacaSimpan(KUNCI_TIKET_TAMU, []));
	const [items, setItems] = useState(null);
	const [buka, setBuka] = useState(null);
	const [form, setForm] = useState({ kode: "", whatsapp: "" });
	const [cari, setCari] = useState(false);
	const [galat, setGalat] = useState("");

	const muat = useCallback(() => {
		if (!simpanan.length) { setItems([]); return; }
		api.post("/helpdesk/publik/cek-tiket", { tiket: simpanan }).then((r) => setItems(r.data.data || [])).catch(() => setItems([]));
	}, [simpanan]);
	useEffect(() => { muat(); }, [muat]);

	const bukaTiket = async (kunci) => {
		const { data } = await api.post("/helpdesk/publik/cek-tiket/detail", kunci);
		setBuka({ kunci, tiket: data.data });
	};

	const cekKode = async (e) => {
		e.preventDefault();
		setGalat("");
		setCari(true);
		try {
			const kunci = { kode: form.kode.trim().toUpperCase(), whatsapp: form.whatsapp.trim() };
			await bukaTiket(kunci);
			setSimpanan(simpanTiketTamu(kunci));
			setForm({ kode: "", whatsapp: "" });
		} catch (err) {
			setGalat(pesanGalat(err, "mencari tiket"));
		} finally {
			setCari(false);
		}
	};

	const lupakan = (kode) => {
		const sisa = simpanan.filter((x) => x.kode !== kode);
		tulisSimpan(KUNCI_TIKET_TAMU, sisa);
		setSimpanan(sisa);
	};

	if (buka) {
		return (
			<PercakapanTiket
				tiket={buka.tiket}
				onKembali={() => { setBuka(null); muat(); }}
				onKirim={async (pesan) => { await api.post("/helpdesk/publik/cek-tiket/balas", { ...buka.kunci, pesan }); await bukaTiket(buka.kunci); }}
				onNilai={async (rating, catatan) => { await api.post("/helpdesk/publik/cek-tiket/nilai", { ...buka.kunci, rating, catatan }); await bukaTiket(buka.kunci); }}
			/>
		);
	}
	return (
		<div className="flex-1 space-y-2 overflow-y-auto p-4">
			<button type="button" onClick={onKembali} className="mb-1 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"><ArrowLeft size={13} />Kembali</button>
			<p className="m-0 text-sm font-bold text-slate-900">Tiket Saya</p>
			<form onSubmit={cekKode} className="space-y-2 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200">
				<p className="m-0 text-xs text-slate-600">Cek tiket dengan kode tiket dan nomor WhatsApp yang diisi saat membuat tiket.</p>
				<input className={INPUT} value={form.kode} onChange={(e) => setForm((f) => ({ ...f, kode: e.target.value }))} required maxLength={20} placeholder="Kode tiket, mis. HD-261102-A1B2C3" autoCapitalize="characters" />
				<input className={INPUT} value={form.whatsapp} onChange={(e) => setForm((f) => ({ ...f, whatsapp: e.target.value }))} required maxLength={20} inputMode="tel" placeholder="Nomor WhatsApp, mis. 081234567890" />
				{galat && <p className="m-0 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-600">{galat}</p>}
				<button type="submit" disabled={cari} className="flex w-full items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:opacity-50">
					<Search size={14} />{cari ? "Mencari…" : "Cek Tiket"}
				</button>
			</form>
			{simpanan.length > 0 && <p className="m-0 pt-2 text-xs font-semibold text-slate-500">Tiket di perangkat ini</p>}
			{items === null && <p className="m-0 py-6 text-center text-sm text-slate-400">Memuat…</p>}
			{items?.length === 0 && simpanan.length === 0 && <KosongTiket teks="Belum ada tiket tersimpan di perangkat ini." />}
			{items?.map((t) => {
				const kunci = simpanan.find((x) => x.kode === t.code);
				return (
					<div key={t.code} className="relative">
						<KartuTiket t={t} onBuka={() => kunci && bukaTiket(kunci).catch(() => {})} />
						<button type="button" onClick={() => lupakan(t.code)} title="Hapus dari perangkat ini" aria-label="Hapus dari perangkat ini"
							className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"><X size={13} /></button>
					</div>
				);
			})}
		</div>
	);
}

/* ── Layar sambutan ───────────────────────────────────────────────────────── */

function Sambutan({ awal, nama, onTanya, onTopik }) {
	return (
		<div className="space-y-4">
			<div className={MUNCUL}>
				<p className="m-0 text-[22px] font-extrabold leading-tight tracking-tight text-slate-900">Halo{nama ? `, ${nama}` : ""}! 👋</p>
				<p className="m-0 mt-1 text-sm text-slate-500">{awal?.salam || "Ada yang bisa kami bantu hari ini?"}</p>
			</div>

			{awal?.pintasan_akun?.length > 0 && (
				<div className="space-y-1.5">
					<p className="m-0 text-[11px] font-bold uppercase tracking-wider text-slate-400">Cek data Anda</p>
					<div className="flex flex-wrap gap-1.5">
						{awal.pintasan_akun.map((p) => (
							<button key={p} type="button" onClick={() => onTanya(p)}
								className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-105">
								<Zap size={11} />{p}
							</button>
						))}
					</div>
				</div>
			)}

			{awal?.kategori?.length > 0 && (
				<div className="space-y-1.5">
					<p className="m-0 text-[11px] font-bold uppercase tracking-wider text-slate-400">Pilih topik</p>
					<div className="grid grid-cols-2 gap-2">
						{awal.kategori.map((k, i) => {
							const Ikon = ikonKategori(k.icon);
							return (
								<button key={k.id} type="button" onClick={() => onTopik(k)}
									className="group flex items-center gap-2.5 rounded-2xl bg-white p-2.5 text-left ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-emerald-200">
									<span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${WARNA_TOPIK[i % WARNA_TOPIK.length]}`}><Ikon size={16} /></span>
									<span className="text-[12px] font-bold leading-tight text-slate-800">{k.name}</span>
								</button>
							);
						})}
					</div>
				</div>
			)}

			{awal?.populer?.length > 0 && (
				<div className="space-y-1.5">
					<p className="m-0 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-400"><Flame size={12} className="text-orange-400" />Sering ditanyakan</p>
					<div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200/80">
						{awal.populer.map((q) => (
							<button key={q} type="button" onClick={() => onTanya(q)}
								className="flex w-full items-center gap-2 border-b border-slate-100 px-3 py-2.5 text-left text-[13px] text-slate-700 transition last:border-0 hover:bg-emerald-50/60">
								<span className="flex-1">{q}</span>
								<ChevronRight size={13} className="text-slate-300" />
							</button>
						))}
					</div>
				</div>
			)}
		</div>
	);
}

/* ── Widget utama ─────────────────────────────────────────────────────────── */

export default function HelpdeskWidget() {
	const { pathname } = useLocation();
	const navigate = useNavigate();
	const [params, setParams] = useSearchParams();
	const { user } = useAuth() || {};
	const [buka, setBuka] = useState(false);
	const [sapa, setSapa] = useState(false);
	const [awal, setAwal] = useState(null);
	const [pesan, setPesan] = useState([]);
	const [masukan, setMasukan] = useState("");
	const [menunggu, setMenunggu] = useState(false);
	const [kategoriId, setKategoriId] = useState(null);
	const [wilayah, setWilayah] = useState(() => bacaSimpan(KUNCI_WILAYAH, {}));
	const [layar, setLayar] = useState("chat"); // chat | tiket | tiketSaya | selesai | pic
	const [sesiPic, setSesiPic] = useState(() => bacaSimpan(KUNCI_SAMBUNG, null));
	const [tiketAwal, setTiketAwal] = useState({});
	const [hasilTiket, setHasilTiket] = useState(null);
	const ujung = useRef(null);
	const kolomMasukan = useRef(null);
	const [lapisan, setLapisan] = useState(null);
	const [jalurNotif, setJalurNotif] = useState(null);

	const login = Boolean(user?.id);
	const internal = PERAN_INTERNAL.includes(String(user?.role || "").toLowerCase());
	const nama = (awal?.nama || user?.name || "").split(/\s+/).slice(0, 2).join(" ");

	useEffect(() => {
		if (sudahDisapa()) return undefined;
		const t = setTimeout(() => setSapa(true), 5000);
		return () => clearTimeout(t);
	}, []);

	/* Notifikasi balasan tiket membuka widget langsung di Tiket Saya. */
	useEffect(() => {
		if (params.get("bantuan") !== "tiket") return;
		setBuka(true);
		setLayar("tiketSaya");
		setJalurNotif(pathname);
		const sisa = new URLSearchParams(params);
		sisa.delete("bantuan");
		setParams(sisa, { replace: true });
	}, [params, setParams, pathname]);

	/* Data awal dimuat ulang saat status login berubah: wilayah dan FAQ yang
	   boleh dipakai berbeda untuk tamu dan akun. */
	useEffect(() => {
		if (!buka) return;
		api.get("/helpdesk/publik/awal").then((r) => setAwal(r.data.data)).catch(() => setAwal({ kategori: [], salam: "" }));
	}, [buka, user?.id]);

	useEffect(() => { ujung.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [pesan, menunggu]);

	const riwayat = pesan.filter((p) => p.teks && !p.lokal && !p.meta?.galat).map((p) => ({ peran: p.peran, teks: p.teks }));
	const wilayahDariAkun = Boolean(awal?.wilayah?.punya);

	const bukaWidget = () => {
		setBuka((b) => !b);
		setSapa(false);
		tandaiDisapa();
	};

	const tanya = async (teks) => {
		const isi = teks.trim();
		if (!isi || menunggu) return;
		setMasukan("");
		setPesan((p) => [...p, { peran: "user", teks: isi }]);
		setMenunggu(true);
		try {
			const { data } = await api.post("/helpdesk/publik/chat", { pesan: isi, riwayat, kategori_id: kategoriId, ...wilayah });
			const d = data.data;
			if (d.kategori) setKategoriId(d.kategori.id);
			setPesan((p) => [...p, { peran: "bot", teks: d.jawaban, meta: { ...d, pertanyaan: isi } }]);
		} catch (err) {
			setPesan((p) => [...p, { peran: "bot", teks: pesanGalat(err, "menghubungi Helpdesk"), meta: { galat: true } }]);
		} finally {
			setMenunggu(false);
			kolomMasukan.current?.focus();
		}
	};

	const pilihTopik = (k) => {
		setKategoriId(k.id);
		setPesan((p) => [...p,
			{ peran: "user", teks: k.name, lokal: true },
			{
				peran: "bot",
				lokal: true,
				teks: k.pertanyaan?.length
					? `Siap, seputar **${k.name}**. Pilih pertanyaan di bawah, atau ketik sendiri pertanyaan Anda.`
					: `Siap, seputar **${k.name}**. Silakan ketik pertanyaan Anda.`,
				meta: { pilihan: k.pertanyaan || [] },
			},
		]);
	};

	const pilihWilayah = async (idx, w) => {
		setWilayah(w);
		tulisSimpan(KUNCI_WILAYAH, w);
		const m = pesan[idx];
		try {
			const { data } = await api.post("/helpdesk/publik/kontak", { kategori_id: m.meta.kategori?.id, pertanyaan: m.meta.pertanyaan, ...w });
			setPesan((p) => p.map((x, i) => (i === idx ? { ...x, meta: { ...x.meta, ...data.data } } : x)));
		} catch { /* kartu wilayah tetap tampil */ }
	};

	const nilai = async (idx, membantu) => {
		const m = pesan[idx];
		setPesan((p) => p.map((x, i) => (i === idx ? { ...x, nilai: membantu } : x)));
		try { await api.post("/helpdesk/publik/umpan-balik", { log_id: m.meta.log_id, membantu }); } catch { /* opsional */ }
	};

	const jalankanAksi = (a) => {
		if (a.url === "#tiket-saya") { setLayar("tiketSaya"); return; }
		if (/^https:\/\//.test(a.url)) { window.open(a.url, "_blank", "noopener"); return; }
		navigate(a.url);
	};

	const keTiket = (meta) => {
		setTiketAwal({ pesan: meta?.pertanyaan || "", kategori_id: meta?.kategori?.id || kategoriId || "" });
		setLayar("tiket");
	};

	const pilihProgram = (idx, program) => {
		setPesan((p) => [
			...p.map((x, i) => (i === idx ? { ...x, meta: { ...x.meta, programDipilih: program } } : x)),
		]);
	};
	const batalProgram = (idx) => setPesan((p) => p.map((x, i) => (i === idx ? { ...x, meta: { ...x.meta, programDipilih: null } } : x)));
	const tersambung = (sesi) => {
		setSesiPic(sesi);
		tulisSimpan(KUNCI_SAMBUNG, sesi);
		setLayar("pic");
	};
	const akhiriPic = useCallback(() => {
		setSesiPic(null);
		try { localStorage.removeItem(KUNCI_SAMBUNG); } catch { /* opsional */ }
		setLayar("chat");
	}, []);

	const mulaiUlang = () => {
		setPesan([]);
		setKategoriId(null);
		setLayar("chat");
	};

	if (internal || (pathname !== "/" && pathname !== jalurNotif)) return null;
	/* Halaman desa di ponsel punya bilah navigasi bawah; tombol naik di atasnya. */
	const bawah = pathname.startsWith("/desa") ? "bottom-[5.25rem] lg:bottom-4" : "bottom-4";
	const bawahPanel = pathname.startsWith("/desa") ? "bottom-[9.5rem] lg:bottom-[5.5rem] h-[min(640px,calc(100dvh-11rem))] lg:h-[min(660px,calc(100dvh-7rem))]" : "bottom-[5.5rem] h-[min(660px,calc(100dvh-7rem))]";

	return (
		<>
			{buka && (
				<div className={`fixed right-3 z-[300] flex w-[calc(100vw-1.5rem)] origin-bottom-right flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_-20px_rgba(15,23,42,.45)] ring-1 ring-black/5 transition duration-300 ease-out starting:scale-95 starting:opacity-0 motion-reduce:transition-none sm:right-5 sm:w-[400px] ${bawahPanel}`}
					role="dialog" aria-label="Helpdesk DPMD">
					<div ref={setLapisan} className="pointer-events-none absolute inset-0 z-30" />
					<KonteksLapisan.Provider value={lapisan}>
						<div className="relative flex shrink-0 items-center gap-3 overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 px-4 py-3.5 text-white">
							<span aria-hidden className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
							<span aria-hidden className="pointer-events-none absolute -bottom-12 right-16 h-24 w-24 rounded-full bg-white/10" />
							<AvatarBot besar />
							<div className="relative min-w-0 flex-1">
								<p className="m-0 text-[15px] font-bold leading-tight">Helpdesk DPMD</p>
								<p className="m-0 text-[11px] text-emerald-50/90">Online · {awal?.ai ? "dibantu AI · " : ""}biasanya menjawab instan</p>
							</div>
							{layar === "chat" && (
								<button type="button" onClick={() => setLayar("tiketSaya")} title="Tiket saya" aria-label="Tiket saya" className="relative flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/15"><Ticket size={17} /></button>
							)}
							{pesan.length > 0 && layar === "chat" && (
								<button type="button" onClick={mulaiUlang} title="Ke awal" aria-label="Ke awal" className="relative flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/15"><House size={17} /></button>
							)}
							<button type="button" onClick={() => setBuka(false)} title="Tutup" aria-label="Tutup" className="relative flex h-9 w-9 items-center justify-center rounded-xl hover:bg-white/15"><X size={18} /></button>
						</div>

						{layar === "tiketSaya" && (login ? <TiketSaya onKembali={() => setLayar("chat")} /> : <TiketTamu onKembali={() => setLayar("chat")} />)}

						{layar === "pic" && sesiPic && <PercakapanPic sesi={sesiPic} onKembali={() => setLayar("chat")} onAkhiri={akhiriPic} />}

						{layar === "tiket" && awal && (
							<FormTiket awal={tiketAwal} login={login} wilayahDariAkun={wilayahDariAkun} kategori={awal.kategori} wilayahAwal={wilayah} riwayat={riwayat}
								onBatal={() => setLayar("chat")} onSelesai={(d) => { setHasilTiket(d); setLayar("selesai"); }} />
						)}

						{layar === "selesai" && hasilTiket && (
							<div className="flex-1 overflow-y-auto p-5 text-center">
								<div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30"><CircleCheck size={32} /></div>
								<p className="m-0 mb-1 mt-4 text-lg font-extrabold text-slate-900">Tiket terkirim 🎉</p>
								<p className="m-0 text-sm text-slate-600">Kode tiket Anda</p>
								<p className="my-1.5 inline-block rounded-xl bg-emerald-50 px-3 py-1 font-mono text-lg font-bold text-emerald-700">{hasilTiket.code}</p>
								<p className="m-0 text-xs text-slate-500">
									Diteruskan ke <b>{hasilTiket.tujuan}</b>.
									{login
										? " Balasan akan muncul di menu Tiket Saya dan notifikasi."
										: " Petugas dapat menghubungi Anda lewat WhatsApp. Status dan balasan tiket bisa dicek kapan saja di menu Tiket Saya (ikon tiket di atas) — dari perangkat lain, gunakan kode ini dan nomor WhatsApp Anda."}
								</p>
								<div className="text-left"><KartuKontak kontak={hasilTiket.kontak} ringkas={false} onTiket={() => setLayar("tiketSaya")} /></div>
								<button type="button" onClick={mulaiUlang} className="mt-4 text-xs font-semibold text-slate-500 hover:text-slate-800">Kembali ke chat</button>
							</div>
						)}

						{layar === "chat" && (
							<>
								<div className="flex-1 space-y-3 overflow-y-auto bg-gradient-to-b from-emerald-50/50 via-white to-white p-4">
									{sesiPic && (
										<button type="button" onClick={() => setLayar("pic")}
											className="flex w-full items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-white px-3 py-2 text-left text-[12px] text-slate-700 hover:bg-emerald-50/60">
											<span>Percakapan dengan <b>PIC {sesiPic.program}</b> masih terbuka</span>
											<span className="shrink-0 font-semibold text-emerald-700">Buka</span>
										</button>
									)}
									{pesan.length === 0 && <Sambutan awal={awal} nama={nama} onTanya={tanya} onTopik={pilihTopik} />}

									{pesan.map((m, i) => (
										m.peran === "user" ? (
											<div key={i} className={`flex justify-end ${MUNCUL}`}>
												<div className="max-w-[82%] whitespace-pre-line rounded-3xl rounded-br-lg bg-gradient-to-br from-emerald-600 to-teal-500 px-3.5 py-2 text-sm text-white shadow-sm">{m.teks}</div>
											</div>
										) : (
											<div key={i} className={`flex gap-2 ${MUNCUL}`}>
												<AvatarBot />
												<div className="min-w-0 flex-1">
													<div className={`inline-block max-w-full rounded-3xl rounded-tl-lg px-3.5 py-2.5 text-[13.5px] leading-relaxed shadow-sm ${m.meta?.galat ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100" : "bg-white text-slate-700 ring-1 ring-slate-200/80"}`}>
														{(m.meta?.kategori || m.meta?.sumber === "akun" || m.meta?.sumber === "data") && (
															<span className="mb-1 flex flex-wrap gap-1">
																{m.meta?.sumber === "akun" && !m.meta?.program_akun && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">Data akun Anda</span>}
																{m.meta?.sumber === "data" && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700">Data resmi DPMD</span>}
																{m.meta?.kategori && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">{m.meta.kategori.name}</span>}
															</span>
														)}
														<TeksKaya teks={m.teks} />
													</div>

													{m.meta?.aksi?.length > 0 && (
														<div className="mt-1.5 flex flex-wrap gap-1.5">
															{m.meta.aksi.map((a) => (
																<button key={a.url} type="button" onClick={() => jalankanAksi(a)}
																	className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700">
																	{a.label}{/^https:/.test(a.url) ? <ArrowUpRight size={12} /> : <ArrowRight size={12} />}
																</button>
															))}
														</div>
													)}

													{[...(m.meta?.pilihan || []), ...(m.meta?.saran || [])].length > 0 && (
														<div className="mt-1.5 flex flex-col items-start gap-1.5">
															{[...(m.meta?.pilihan || []), ...(m.meta?.saran || [])].map((s) => (
																<button key={s} type="button" onClick={() => tanya(s)}
																	className="max-w-full rounded-2xl bg-white px-3 py-1.5 text-left text-[12px] font-medium text-emerald-800 ring-1 ring-emerald-200 transition hover:bg-emerald-50">
																	{s}
																</button>
															))}
														</div>
													)}

													{m.meta?.program_akun?.length > 0 && !m.meta.programDipilih && <PilihProgram program={m.meta.program_akun} onPilih={(p) => pilihProgram(i, p)} />}
													{m.meta?.programDipilih && (
														<FormSambung program={m.meta.programDipilih} pertanyaan={m.meta.pertanyaan_akun} login={login} wilayah={wilayah}
															onBatal={() => batalProgram(i)} onTersambung={tersambung} />
													)}
													{m.meta?.butuh_wilayah && !m.meta?.kontak && <PilihWilayah nilai={wilayah} onPilih={(w) => pilihWilayah(i, w)} />}
													{m.meta && !m.meta.galat && !m.lokal && <KartuKontak kontak={m.meta.kontak} ringkas={m.meta.terjawab} onTiket={() => keTiket(m.meta)} />}

													{m.meta?.log_id && m.meta.terjawab && !m.meta.program_akun && (
														<div className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
															{m.nilai === undefined ? (
																<>
																	<span className="mr-0.5">Membantu?</span>
																	<button type="button" onClick={() => nilai(i, true)} className="rounded-full px-1.5 py-0.5 transition hover:bg-emerald-50" aria-label="Membantu">👍</button>
																	<button type="button" onClick={() => nilai(i, false)} className="rounded-full px-1.5 py-0.5 transition hover:bg-rose-50" aria-label="Tidak membantu">👎</button>
																</>
															) : (
																<span className={MUNCUL}>{m.nilai ? "Terima kasih! 💚" : "Terima kasih, akan kami perbaiki 🙏"}</span>
															)}
														</div>
													)}
												</div>
											</div>
										)
									))}

									{menunggu && (
										<div className="flex gap-2">
											<AvatarBot />
											<div className="flex gap-1 rounded-3xl rounded-tl-lg bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200/80">
												{[0, 1, 2].map((d) => <span key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-emerald-500" style={{ animationDelay: `${d * 120}ms` }} />)}
											</div>
										</div>
									)}
									<div ref={ujung} />
								</div>

								<form onSubmit={(e) => { e.preventDefault(); tanya(masukan); }} className="flex shrink-0 items-center gap-2 border-t border-slate-100 bg-white p-3">
									<input ref={kolomMasukan} value={masukan} onChange={(e) => setMasukan(e.target.value)} placeholder="Tanya seputar layanan DPMD…" maxLength={1000} disabled={menunggu}
										className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 transition focus:border-emerald-500/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
									<button type="submit" disabled={menunggu || !masukan.trim()} aria-label="Kirim"
										className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-teal-500 text-white shadow-md shadow-emerald-600/25 transition hover:brightness-105 active:scale-95 disabled:opacity-40">
										<Send size={15} />
									</button>
								</form>
							</>
						)}
					</KonteksLapisan.Provider>
				</div>
			)}

			{sapa && !buka && (
				<div className={`fixed right-3 z-[300] flex max-w-[250px] items-start gap-2 rounded-2xl rounded-br-md bg-white p-3 shadow-xl ring-1 ring-black/5 sm:right-5 ${pathname.startsWith("/desa") ? "bottom-[9rem] lg:bottom-[5rem]" : "bottom-[5rem]"} ${MUNCUL}`}>
					<button type="button" onClick={bukaWidget} className="text-left">
						<p className="m-0 text-[13px] font-bold text-slate-900">Ada yang bisa dibantu? 👋</p>
						<p className="m-0 mt-0.5 text-[11.5px] text-slate-500">Tanya soal Bankeu, BUMDes, aparatur, akun, atau layanan DPMD lainnya.</p>
					</button>
					<button type="button" onClick={() => { setSapa(false); tandaiDisapa(); }} aria-label="Tutup sapaan" className="-mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"><X size={12} /></button>
				</div>
			)}

			<button type="button" onClick={bukaWidget} aria-label={buka ? "Tutup Helpdesk" : "Buka Helpdesk"}
				className={`group fixed right-3 z-[300] flex h-14 items-center gap-2 rounded-full bg-gradient-to-br from-emerald-600 to-teal-500 pl-2 pr-2 text-white shadow-[0_16px_40px_-12px_rgba(5,150,105,.7)] transition hover:-translate-y-0.5 active:scale-95 sm:right-5 sm:pr-5 ${bawah}`}>
				<span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
					{!buka && <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-white/20 [animation-duration:2.4s] motion-reduce:hidden" />}
					{buka ? <X size={20} className="relative" /> : <LifeBuoy size={20} className="relative" />}
				</span>
				<span className="hidden text-sm font-bold sm:inline">{buka ? "Tutup" : "Tanya DPMD"}</span>
			</button>
		</>
	);
}
