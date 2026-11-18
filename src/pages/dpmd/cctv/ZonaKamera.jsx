import React, { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Plus, RefreshCw, Trash2, Undo2, Check } from "lucide-react";
import toast from "react-hot-toast";
import { getStreamUrl, ubahKamera } from "../../../api/smartCctvApi";

/**
 * Editor zona pantau per kamera. Koordinat disimpan relatif (0..1) terhadap
 * lebar/tinggi gambar, jadi tidak bergantung ukuran layar maupun resolusi kamera.
 * AI hanya mencatat orang yang kakinya di dalam zona pada jam pantau.
 */

const MAKS_ZONA = 8;
const MAKS_TITIK = 20;
const inputKelas =
	"w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none";
const WARNA = ["#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#14b8a6", "#ec4899", "#84cc16"];

/** Posisi klik → [x, y] relatif 0..1, dibulatkan 4 desimal. */
const normalisasiTitik = (clientX, clientY, rect) => {
	const f = (v) => Math.round(Math.min(1, Math.max(0, v)) * 10000) / 10000;
	return [f((clientX - rect.left) / rect.width), f((clientY - rect.top) / rect.height)];
};

const hhmm = (v) => (typeof v === "string" ? v.slice(0, 5) : "");
const pusat = (titik) => [
	titik.reduce((a, p) => a + p[0], 0) / titik.length,
	titik.reduce((a, p) => a + p[1], 0) / titik.length,
];

const ZonaKamera = ({ kamera, onTutup, onSelesai }) => {
	const [zona, setZona] = useState(() =>
		Array.isArray(kamera.zona) ? kamera.zona.map((z) => ({ nama: z.nama, titik: z.titik })) : []
	);
	const [sedang, setSedang] = useState(null); // null | array titik yang sedang digambar
	const [duaEmpat, setDuaEmpat] = useState(!kamera.jam_pantau);
	const [mulai, setMulai] = useState(hhmm(kamera.jam_pantau?.mulai) || "17:00");
	const [selesai, setSelesai] = useState(hhmm(kamera.jam_pantau?.selesai) || "07:00");
	const [gambar, setGambar] = useState(null);
	const [gagalGambar, setGagalGambar] = useState(false);
	const [memuat, setMemuat] = useState(true);
	const [menyimpan, setMenyimpan] = useState(false);
	const [galat, setGalat] = useState("");
	const kanvasRef = useRef(null);

	const muatGambar = useCallback(async () => {
		setMemuat(true);
		setGagalGambar(false);
		try {
			const r = await getStreamUrl(kamera.id);
			const u = r.data.data?.go2rtc_frame_url;
			if (!u) throw new Error("tanpa url");
			setGambar(`${u}&_=${Date.now()}`);
		} catch {
			setGambar(null);
			setGagalGambar(true);
			setMemuat(false);
		}
	}, [kamera.id]);

	useEffect(() => {
		muatGambar();
	}, [muatGambar]);

	const klik = (e) => {
		if (!sedang || sedang.length >= MAKS_TITIK) return;
		const rect = kanvasRef.current.getBoundingClientRect();
		if (!rect.width || !rect.height) return;
		setSedang([...sedang, normalisasiTitik(e.clientX, e.clientY, rect)]);
	};

	const mulaiZona = () => {
		if (zona.length >= MAKS_ZONA) return;
		setSedang([]);
	};

	const selesaiZona = () => {
		if (!sedang || sedang.length < 3) return;
		setZona([...zona, { nama: `Zona ${zona.length + 1}`, titik: sedang }]);
		setSedang(null);
	};

	const simpan = async () => {
		setGalat("");
		if (zona.some((z) => !z.nama.trim() || z.nama.trim().length > 40)) {
			setGalat("Nama zona wajib diisi (maks. 40 karakter).");
			return;
		}
		if (!duaEmpat && (!mulai || !selesai || mulai === selesai)) {
			setGalat("Jam mulai dan selesai wajib diisi dan tidak boleh sama.");
			return;
		}
		setMenyimpan(true);
		try {
			await ubahKamera(kamera.id, {
				zona: zona.length ? zona.map((z) => ({ nama: z.nama.trim(), titik: z.titik })) : null,
				jam_pantau: duaEmpat ? null : { mulai, selesai },
			});
			toast.success("Zona dan jam pantau disimpan.");
			onSelesai();
		} catch (err) {
			setGalat(err.response?.data?.message || "Gagal menyimpan zona.");
		} finally {
			setMenyimpan(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4" onClick={onTutup}>
			<div onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6">
				<h3 className="text-lg font-semibold text-slate-900">Zona pantau — {kamera.name}</h3>
				<p className="mt-1 text-sm text-slate-500">
					AI hanya mencatat &amp; memberi notifikasi untuk orang yang berada di dalam zona pada jam pantau. Kamera tanpa zona tidak
					mencatat deteksi orang. Orang jatuh selalu tercatat.
				</p>

				<div className="mt-4 flex flex-wrap items-center gap-2">
					<button
						type="button"
						onClick={mulaiZona}
						disabled={!!sedang || zona.length >= MAKS_ZONA}
						className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40"
					>
						<Plus className="h-4 w-4" />
						Zona baru
					</button>
					{sedang && (
						<>
							<button
								type="button"
								onClick={() => setSedang(sedang.slice(0, -1))}
								disabled={!sedang.length}
								className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-40"
							>
								<Undo2 className="h-4 w-4" />
								Batalkan titik
							</button>
							<button
								type="button"
								onClick={selesaiZona}
								disabled={sedang.length < 3}
								className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
							>
								<Check className="h-4 w-4" />
								Selesai
							</button>
							<button type="button" onClick={() => setSedang(null)} className="text-sm text-slate-500 hover:text-slate-900">
								Batal
							</button>
							<span className="text-xs text-slate-500">
								Klik gambar untuk menambah titik ({sedang.length}/{MAKS_TITIK}, minimal 3).
							</span>
						</>
					)}
					<button
						type="button"
						onClick={muatGambar}
						className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
					>
						<RefreshCw className="h-4 w-4" />
						Muat ulang gambar
					</button>
				</div>

				{gagalGambar && (
					<p className="mt-2 text-sm text-amber-700">Gagal memuat potret kamera. Anda tetap dapat menggambar zona di atas latar abu-abu.</p>
				)}

				<div
					ref={kanvasRef}
					onClick={klik}
					className={`relative mt-3 w-full select-none overflow-hidden rounded-lg bg-slate-300 ${gambar ? "" : "aspect-video"} ${sedang ? "cursor-crosshair" : ""}`}
				>
					{gambar && (
						<img
							src={gambar}
							alt={`Potret kamera ${kamera.name}`}
							draggable={false}
							onLoad={() => setMemuat(false)}
							onError={() => {
								setGambar(null);
								setGagalGambar(true);
								setMemuat(false);
							}}
							className="block w-full"
						/>
					)}
					{memuat && !gagalGambar && (
						<div className="absolute inset-0 flex items-center justify-center bg-slate-200/70">
							<Loader2 className="h-6 w-6 animate-spin text-slate-500" />
						</div>
					)}
					<svg className="absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
						{zona.map((z, i) => (
							<polygon
								key={i}
								points={z.titik.map((p) => p.join(",")).join(" ")}
								fill={WARNA[i % WARNA.length]}
								fillOpacity={0.3}
								stroke={WARNA[i % WARNA.length]}
								strokeWidth={2}
								vectorEffect="non-scaling-stroke"
							/>
						))}
						{sedang && sedang.length > 0 && (
							<>
								<polyline points={sedang.map((p) => p.join(",")).join(" ")} fill="none" stroke="#fff" strokeWidth={2} vectorEffect="non-scaling-stroke" />
								{sedang.map((p, i) => (
									<circle key={i} cx={p[0]} cy={p[1]} r={0.007} fill="#f43f5e" stroke="#fff" strokeWidth={0.002} />
								))}
							</>
						)}
					</svg>
					{/* Label HTML agar teks tidak ikut melar mengikuti rasio gambar */}
					{zona.map((z, i) => {
						const [cx, cy] = pusat(z.titik);
						return (
							<span
								key={i}
								className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] font-semibold text-white"
								style={{ left: `${cx * 100}%`, top: `${cy * 100}%` }}
							>
								{z.nama}
							</span>
						);
					})}
				</div>

				<div className="mt-4 space-y-2">
					<p className="text-sm font-medium text-slate-700">
						Zona ({zona.length}/{MAKS_ZONA})
					</p>
					{zona.length === 0 && <p className="text-sm text-slate-500">Belum ada zona — orang tidak akan dicatat.</p>}
					{zona.map((z, i) => (
						<div key={i} className="flex items-center gap-2">
							<span className="h-3 w-3 shrink-0 rounded-full" style={{ background: WARNA[i % WARNA.length] }} />
							<input
								value={z.nama}
								maxLength={40}
								onChange={(e) => setZona(zona.map((x, j) => (j === i ? { ...x, nama: e.target.value } : x)))}
								className={inputKelas}
								aria-label={`Nama zona ${i + 1}`}
							/>
							<button
								type="button"
								onClick={() => setZona(zona.filter((_, j) => j !== i))}
								title="Hapus zona"
								className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
							>
								<Trash2 className="h-4 w-4" />
							</button>
						</div>
					))}
				</div>

				<div className="mt-4 space-y-2">
					<p className="text-sm font-medium text-slate-700">Jam pantau (WIB)</p>
					<label className="flex items-center gap-2 text-sm text-slate-700">
						<input type="radio" checked={duaEmpat} onChange={() => setDuaEmpat(true)} />
						Sepanjang hari (24 jam)
					</label>
					<label className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
						<input type="radio" checked={!duaEmpat} onChange={() => setDuaEmpat(false)} />
						Rentang:
						<input type="time" value={mulai} disabled={duaEmpat} onChange={(e) => setMulai(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:opacity-40" />
						sampai
						<input type="time" value={selesai} disabled={duaEmpat} onChange={(e) => setSelesai(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1 text-sm disabled:opacity-40" />
					</label>
					<p className="text-xs text-slate-500">Contoh 17:00–07:00 = malam hari.</p>
				</div>

				{galat && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{galat}</p>}

				<div className="mt-5 flex justify-end gap-2">
					<button type="button" onClick={onTutup} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
						Batal
					</button>
					<button
						type="button"
						onClick={simpan}
						disabled={menyimpan}
						className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
					>
						{menyimpan && <Loader2 className="h-4 w-4 animate-spin" />}
						Simpan
					</button>
				</div>
			</div>
		</div>
	);
};

export default ZonaKamera;
