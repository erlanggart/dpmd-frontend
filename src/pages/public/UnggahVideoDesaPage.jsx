import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { AlertCircle, CheckCircle2, Clapperboard, Film, Loader2, Lock, UploadCloud, X } from "lucide-react";
import { batalUnggah, getHalamanUnggah, unggahVideo } from "../../api/videoDesaApi";
import { LABEL_ORIENTASI, formatDurasi, formatUkuran, formatWaktu } from "../bidang/video-desa/videoDesaUtils";

/**
 * Halaman unggah video untuk desa — dibuka dari tautan yang dibagikan bidang,
 * TANPA login. Kebanyakan dibuka dari HP lewat WhatsApp, dengan sinyal yang
 * tidak bisa diandalkan: unggahan dikirim per potongan dan otomatis lanjut
 * setelah sinyal kembali (lihat unggahVideo di api/videoDesaApi.js).
 */

const Bingkai = ({ children }) => (
	<div className="min-h-screen bg-slate-100">
		<div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">{children}</div>
	</div>
);

const Kop = () => (
	<div className="flex items-center gap-3">
		<img src="/logo-dpmd.png" alt="" className="h-9 w-9 flex-shrink-0 object-contain" />
		<div className="min-w-0 text-left">
			<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Pemerintah Kabupaten Bogor</p>
			<p className="truncate text-xs font-medium text-slate-500">Dinas Pemberdayaan Masyarakat dan Desa</p>
		</div>
	</div>
);

const Pemberitahuan = ({ ikon: Ikon, judul, keterangan, baik, children }) => (
	<Bingkai>
		<div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
			<div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl ${baik ? "bg-emerald-50" : "bg-slate-100"}`}>
				<Ikon className={`h-7 w-7 ${baik ? "text-emerald-600" : "text-slate-500"}`} />
			</div>
			<h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{judul}</h1>
			{keterangan && <p className="mx-auto mt-2.5 max-w-md text-sm leading-6 text-slate-500">{keterangan}</p>}
			{children}
			<div className="mt-10 flex justify-center border-t border-slate-100 pt-6"><Kop /></div>
		</div>
	</Bingkai>
);

const kelasMasukan =
	"mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 disabled:bg-slate-50 disabled:text-slate-500";

/** Baca durasi & resolusi di browser sebelum mengunggah — untuk peringatan dini saja. */
const bacaInfoVideo = (berkas) =>
	new Promise((resolve) => {
		const url = URL.createObjectURL(berkas);
		const v = document.createElement("video");
		v.preload = "metadata";
		const selesai = (info) => { URL.revokeObjectURL(url); resolve(info); };
		v.onloadedmetadata = () => selesai({ durasi: v.duration, lebar: v.videoWidth, tinggi: v.videoHeight });
		v.onerror = () => selesai(null);
		setTimeout(() => selesai(null), 8000);
		v.src = url;
	});

const UnggahVideoDesaPage = () => {
	const { token } = useParams();
	const [memuat, setMemuat] = useState(true);
	const [data, setData] = useState(null);
	const [galatMuat, setGalatMuat] = useState(null);

	const [kecamatanId, setKecamatanId] = useState("");
	const [desaId, setDesaId] = useState("");
	const [nama, setNama] = useState("");
	const [hp, setHp] = useState("");
	const [keterangan, setKeterangan] = useState("");
	const [berkas, setBerkas] = useState(null);
	const [info, setInfo] = useState(null);
	const [galat, setGalat] = useState("");

	const [kemajuan, setKemajuan] = useState(null); // { terkirim, total }
	const [selesai, setSelesai] = useState(null);
	const pengendali = useRef(null);
	const sesiRef = useRef(null);
	const masukanBerkas = useRef(null);

	useEffect(() => {
		(async () => {
			try {
				const r = await getHalamanUnggah(token);
				const d = r.data.data;
				setData(d);
				document.title = `${d.judul} — Unggah Video Desa`;
				if (d.desa_terkunci) {
					const desa = d.desa.find((x) => x.id === d.desa_terkunci);
					if (desa) { setKecamatanId(String(desa.kecamatan_id)); setDesaId(String(desa.id)); }
				}
			} catch (e) {
				setGalatMuat(e.response?.data?.message || "Halaman tidak dapat dimuat. Periksa koneksi internet lalu muat ulang.");
			} finally {
				setMemuat(false);
			}
		})();
	}, [token]);

	// Cegah tab tertutup tanpa sengaja di tengah unggahan.
	useEffect(() => {
		if (!kemajuan) return undefined;
		const tahan = (e) => { e.preventDefault(); e.returnValue = ""; };
		window.addEventListener("beforeunload", tahan);
		return () => window.removeEventListener("beforeunload", tahan);
	}, [kemajuan]);

	const desaDiKecamatan = useMemo(
		() => (data?.desa || []).filter((d) => String(d.kecamatan_id) === String(kecamatanId)),
		[data, kecamatanId]
	);

	const pilihBerkas = async (f) => {
		setGalat("");
		setInfo(null);
		if (!f) { setBerkas(null); return; }
		const ext = `.${(f.name.split(".").pop() || "").toLowerCase()}`;
		if (!data.ekstensi.includes(ext)) {
			setBerkas(null);
			setGalat(`Format ${ext} tidak diterima. Gunakan MP4 (disarankan), MOV, atau WebM.`);
			return;
		}
		if (f.size > data.maks_ukuran) {
			setBerkas(null);
			setGalat(`Ukuran video ${formatUkuran(f.size)} melebihi batas ${formatUkuran(data.maks_ukuran)}. Kompres dulu (mis. ekspor ulang 1080p di CapCut).`);
			return;
		}
		setBerkas(f);
		setInfo(await bacaInfoVideo(f));
	};

	const peringatan = useMemo(() => {
		if (!info || !data) return [];
		const p = [];
		if (data.orientasi === "lanskap" && info.tinggi > info.lebar) p.push("Video ini tegak (potret), padahal diminta mendatar (lanskap 16:9).");
		if (data.orientasi === "potret" && info.lebar > info.tinggi) p.push("Video ini mendatar (lanskap), padahal diminta tegak (potret 9:16).");
		if (data.maks_durasi_detik && info.durasi > data.maks_durasi_detik + 1) {
			p.push(`Durasi ${formatDurasi(info.durasi)} melebihi arahan ${formatDurasi(data.maks_durasi_detik)}.`);
		}
		if (info.lebar && Math.min(info.lebar, info.tinggi) < 720) p.push("Resolusi di bawah 720p — akan terlihat pecah di videotron.");
		return p;
	}, [info, data]);

	const kirim = async (e) => {
		e.preventDefault();
		setGalat("");
		if (!desaId) return setGalat("Pilih kecamatan dan desa terlebih dahulu.");
		if (!berkas) return setGalat("Pilih berkas video terlebih dahulu.");

		pengendali.current = new AbortController();
		setKemajuan({ terkirim: 0, total: berkas.size });
		try {
			const hasil = await unggahVideo({
				token,
				berkas,
				isian: { desa_id: Number(desaId), nama_pengirim: nama, no_hp: hp, keterangan },
				onKemajuan: setKemajuan,
				onSesi: (id) => { sesiRef.current = id; },
				signal: pengendali.current.signal,
			});
			setSelesai(hasil || {});
		} catch (err) {
			if (err?.name === "AbortError") {
				if (sesiRef.current) batalUnggah(token, sesiRef.current);
				setGalat("Unggahan dibatalkan.");
			} else {
				setGalat(
					err.response?.data?.message ||
						"Unggahan terhenti karena koneksi terputus terlalu lama. Pastikan sinyal stabil (lebih baik pakai Wi-Fi), lalu tekan Kirim lagi."
				);
			}
		} finally {
			setKemajuan(null);
			sesiRef.current = null;
		}
	};

	if (memuat) {
		return (
			<Bingkai>
				<div className="space-y-3"><div className="h-40 animate-pulse rounded-2xl bg-white" /><div className="h-64 animate-pulse rounded-2xl bg-white" /></div>
			</Bingkai>
		);
	}
	if (galatMuat) return <Pemberitahuan ikon={AlertCircle} judul="Tautan tidak dapat dibuka" keterangan={galatMuat} />;
	if (data.tertutup) return <Pemberitahuan ikon={Lock} judul={data.judul} keterangan={data.tertutup} />;
	if (selesai) {
		const desa = data.desa.find((d) => String(d.id) === String(desaId));
		return (
			<Pemberitahuan ikon={CheckCircle2} baik judul="Video berhasil terkirim" keterangan={`Terima kasih. Video dari ${desa?.status_pemerintahan === "kelurahan" ? "Kelurahan" : "Desa"} ${desa?.nama || ""} sudah diterima DPMD dan akan ditinjau oleh bidang.`}>
				<button
					onClick={() => { setSelesai(null); setBerkas(null); setInfo(null); setKeterangan(""); if (masukanBerkas.current) masukanBerkas.current.value = ""; }}
					className="mt-6 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
				>
					Kirim video lain
				</button>
			</Pemberitahuan>
		);
	}

	const persen = kemajuan ? Math.floor((kemajuan.terkirim / kemajuan.total) * 100) : 0;
	const terkunci = Boolean(data.desa_terkunci && desaId);

	return (
		<Bingkai>
			<div className="space-y-3 sm:space-y-4">
				<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
					<div className="h-1.5 bg-slate-900" />
					<div className="px-5 py-6 sm:px-7">
						<Kop />
						<div className="mt-5 flex items-start gap-3">
							<div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white"><Clapperboard className="h-5 w-5" /></div>
							<div className="min-w-0">
								<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Unggah Video Desa</p>
								<h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{data.judul}</h1>
							</div>
						</div>
						{data.deskripsi && <p className="mt-4 whitespace-pre-line text-sm leading-6 text-slate-600">{data.deskripsi}</p>}
						<ul className="mt-4 space-y-1 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
							<li>• Orientasi: <b>{LABEL_ORIENTASI[data.orientasi]}</b></li>
							{data.maks_durasi_detik && <li>• Durasi maksimal: <b>{formatDurasi(data.maks_durasi_detik)}</b> (menit:detik)</li>}
							<li>• Format: <b>MP4</b> (disarankan), MOV, atau WebM — maksimal <b>{formatUkuran(data.maks_ukuran)}</b></li>
							<li>• Kualitas disarankan: <b>1080p (Full HD)</b>, gambar stabil, suara jelas</li>
							<li>• Maksimal <b>{data.maks_per_desa} video</b> per desa{data.tutup_pada ? `, paling lambat ${formatWaktu(data.tutup_pada)}` : ""}</li>
						</ul>
					</div>
				</div>

				<form onSubmit={kirim} className="space-y-4 rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-7">
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<label className="block">
							<span className="text-sm font-semibold text-slate-900">Kecamatan <span className="text-rose-600">*</span></span>
							<select value={kecamatanId} disabled={terkunci || !!kemajuan} onChange={(e) => { setKecamatanId(e.target.value); setDesaId(""); }} className={kelasMasukan} required>
								<option value="">Pilih kecamatan</option>
								{data.kecamatan.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
							</select>
						</label>
						<label className="block">
							<span className="text-sm font-semibold text-slate-900">Desa/Kelurahan <span className="text-rose-600">*</span></span>
							<select value={desaId} disabled={terkunci || !kecamatanId || !!kemajuan} onChange={(e) => setDesaId(e.target.value)} className={kelasMasukan} required>
								<option value="">{kecamatanId ? "Pilih desa" : "Pilih kecamatan dulu"}</option>
								{desaDiKecamatan.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
							</select>
						</label>
					</div>

					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<label className="block">
							<span className="text-sm font-semibold text-slate-900">Nama pengirim <span className="text-rose-600">*</span></span>
							<input value={nama} onChange={(e) => setNama(e.target.value)} disabled={!!kemajuan} required maxLength={150} placeholder="Nama dan jabatan" className={kelasMasukan} />
						</label>
						<label className="block">
							<span className="text-sm font-semibold text-slate-900">No. HP / WhatsApp <span className="text-rose-600">*</span></span>
							<input value={hp} onChange={(e) => setHp(e.target.value)} disabled={!!kemajuan} required inputMode="tel" maxLength={20} placeholder="08…" className={kelasMasukan} />
						</label>
					</div>

					<label className="block">
						<span className="text-sm font-semibold text-slate-900">Keterangan video</span>
						<textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} disabled={!!kemajuan} rows={3} maxLength={2000} placeholder="Isi singkat video, lokasi pengambilan, nama kegiatan…" className={kelasMasukan} />
					</label>

					<div>
						<span className="text-sm font-semibold text-slate-900">Berkas video <span className="text-rose-600">*</span></span>
						{!berkas ? (
							<button type="button" onClick={() => masukanBerkas.current?.click()} className="mt-1.5 flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-8 text-center transition-colors hover:border-slate-400 hover:bg-slate-50">
								<UploadCloud className="h-8 w-8 text-slate-400" />
								<span className="text-sm font-medium text-slate-700">Pilih video dari galeri / berkas</span>
								<span className="text-xs text-slate-500">MP4, MOV, WebM · maks {formatUkuran(data.maks_ukuran)}</span>
							</button>
						) : (
							<div className="mt-1.5 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
								<Film className="h-6 w-6 flex-shrink-0 text-slate-500" />
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium text-slate-900">{berkas.name}</p>
									<p className="text-xs text-slate-500">
										{[formatUkuran(berkas.size), info?.durasi ? formatDurasi(info.durasi) : null, info?.lebar ? `${info.lebar}×${info.tinggi}` : null].filter(Boolean).join(" · ")}
									</p>
								</div>
								{!kemajuan && (
									<button type="button" onClick={() => { pilihBerkas(null); if (masukanBerkas.current) masukanBerkas.current.value = ""; }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label="Ganti video">
										<X className="h-4 w-4" />
									</button>
								)}
							</div>
						)}
						<input ref={masukanBerkas} type="file" accept={["video/*", ...data.ekstensi].join(",")} className="hidden" onChange={(e) => pilihBerkas(e.target.files?.[0])} />
						{peringatan.length > 0 && (
							<div className="mt-2 space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
								{peringatan.map((p) => <p key={p}>⚠ {p}</p>)}
								<p className="text-amber-700/80">Video tetap bisa dikirim, tapi mungkin tidak terpakai.</p>
							</div>
						)}
					</div>

					{galat && <p className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />{galat}</p>}

					{kemajuan ? (
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="font-medium text-slate-900">{persen < 100 ? "Mengunggah…" : "Memproses video…"}</span>
								<span className="tabular-nums text-slate-600">{persen}% · {formatUkuran(kemajuan.terkirim)} / {formatUkuran(kemajuan.total)}</span>
							</div>
							<div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
								<div className="h-full rounded-full bg-slate-900 transition-[width] duration-300" style={{ width: `${persen}%` }} />
							</div>
							<p className="text-xs text-slate-500">Jangan tutup halaman ini. Bila sinyal putus sebentar, unggahan lanjut sendiri.</p>
							<button type="button" onClick={() => pengendali.current?.abort()} className="text-xs font-medium text-rose-600 hover:underline">Batalkan unggahan</button>
						</div>
					) : (
						<button type="submit" className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800">
							<UploadCloud className="h-4 w-4" /> Kirim video
						</button>
					)}
				</form>

				{kemajuan && (
					<p className="flex items-center justify-center gap-2 text-xs text-slate-500"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Unggahan berjalan…</p>
				)}
			</div>
		</Bingkai>
	);
};

export default UnggahVideoDesaPage;
