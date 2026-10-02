import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
	AlertCircle, CheckCircle2, Clapperboard, Clock, Film, Loader2, Lock, RotateCcw, ShieldCheck, UploadCloud, X, XCircle,
} from "lucide-react";
import { batalUnggah, getHalamanUnggah, getStatusDesa, unggahVideo } from "../../api/videoDesaApi";
import { LABEL_ORIENTASI, formatDurasi, formatUkuran, formatWaktu } from "../bidang/video-desa/videoDesaUtils";

/**
 * Tautan tunggal Video Desa — dibagikan Bidang Sekretariat ke semua desa,
 * dibuka TANPA login. Isinya card semua kegiatan video dari seluruh bidang;
 * desa memilih desanya lalu mengirim satu video per kegiatan.
 *
 * Kebanyakan dibuka dari HP lewat WhatsApp dengan sinyal yang tidak bisa
 * diandalkan: unggahan dikirim per potongan dan lanjut sendiri setelah sinyal
 * kembali (lihat unggahVideo di api/videoDesaApi.js).
 */

const Bingkai = ({ children }) => (
	<div className="min-h-screen bg-slate-100">
		<div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">{children}</div>
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

const Pemberitahuan = ({ ikon: Ikon, judul, keterangan }) => (
	<Bingkai>
		<div className="rounded-2xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
			<div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
				<Ikon className="h-7 w-7 text-slate-500" />
			</div>
			<h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">{judul}</h1>
			{keterangan && <p className="mx-auto mt-2.5 max-w-md text-sm leading-6 text-slate-500">{keterangan}</p>}
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
		let selesai = false;
		const akhiri = (info) => { if (selesai) return; selesai = true; URL.revokeObjectURL(url); resolve(info); };
		v.onloadedmetadata = () => akhiri({ durasi: v.duration, lebar: v.videoWidth, tinggi: v.videoHeight });
		v.onerror = () => akhiri(null);
		setTimeout(() => akhiri(null), 8000);
		v.src = url;
	});

/** Status kiriman desa untuk satu kegiatan, dalam bahasa desa. */
const StatusKiriman = ({ s }) => {
	if (!s) return null;
	if (s.pemrosesan === "gagal") {
		return <p className="flex items-start gap-1.5 text-xs text-rose-700"><XCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />Video sebelumnya tidak lolos pemeriksaan: {s.alasan}. Silakan kirim ulang.</p>;
	}
	if (s.status === "ditolak") {
		return <p className="flex items-start gap-1.5 text-xs text-rose-700"><XCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />Video sebelumnya ditolak bidang{s.alasan ? `: ${s.alasan}` : ""}. Silakan kirim ulang.</p>;
	}
	if (s.status === "disetujui") {
		return <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" />Video sudah disetujui. Terima kasih!</p>;
	}
	if (s.pemrosesan === "antre" || s.pemrosesan === "diproses") {
		return <p className="flex items-center gap-1.5 text-xs font-medium text-slate-600"><ShieldCheck className="h-4 w-4" />Terkirim — sedang diperiksa keamanannya oleh sistem.</p>;
	}
	return <p className="flex items-center gap-1.5 text-xs font-medium text-amber-700"><Clock className="h-4 w-4" />Terkirim {formatWaktu(s.dikirim_pada)} — menunggu verifikasi bidang.</p>;
};

/** Form unggah di dalam satu card kegiatan. */
const FormUnggah = ({ token, data, kegiatan, identitas, onSelesai, onBatal, onSibuk }) => {
	const [berkas, setBerkas] = useState(null);
	const [info, setInfo] = useState(null);
	const [keterangan, setKeterangan] = useState("");
	const [galat, setGalat] = useState("");
	const [kemajuan, setKemajuan] = useState(null);
	const pengendali = useRef(null);
	const sesiRef = useRef(null);
	const masukan = useRef(null);

	useEffect(() => {
		onSibuk(Boolean(kemajuan));
		if (!kemajuan) return undefined;
		// Cegah tab tertutup tanpa sengaja di tengah unggahan.
		const tahan = (e) => { e.preventDefault(); e.returnValue = ""; };
		window.addEventListener("beforeunload", tahan);
		return () => window.removeEventListener("beforeunload", tahan);
	}, [kemajuan, onSibuk]);

	const pilih = async (f) => {
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
		if (!info) return [];
		const p = [];
		if (kegiatan.orientasi === "lanskap" && info.tinggi > info.lebar) p.push("Video ini tegak (potret), padahal diminta mendatar (lanskap 16:9).");
		if (kegiatan.orientasi === "potret" && info.lebar > info.tinggi) p.push("Video ini mendatar (lanskap), padahal diminta tegak (potret 9:16).");
		if (kegiatan.maks_durasi_detik && info.durasi > kegiatan.maks_durasi_detik + 1) {
			p.push(`Durasi ${formatDurasi(info.durasi)} melebihi arahan ${formatDurasi(kegiatan.maks_durasi_detik)}.`);
		}
		if (info.lebar && Math.min(info.lebar, info.tinggi) < 720) p.push("Resolusi di bawah 720p — akan terlihat pecah di videotron.");
		return p;
	}, [info, kegiatan]);

	const kirim = async () => {
		setGalat("");
		if (!berkas) return setGalat("Pilih berkas video terlebih dahulu.");
		pengendali.current = new AbortController();
		setKemajuan({ terkirim: 0, total: berkas.size });
		try {
			await unggahVideo({
				token,
				berkas,
				isian: { ...identitas, permintaan_id: kegiatan.id, keterangan },
				onKemajuan: setKemajuan,
				onSesi: (id) => { sesiRef.current = id; },
				signal: pengendali.current.signal,
			});
			setKemajuan(null);
			onSelesai();
		} catch (err) {
			if (err?.name === "AbortError") {
				if (sesiRef.current) batalUnggah(token, sesiRef.current);
				setGalat("Unggahan dibatalkan.");
			} else {
				setGalat(
					err.response?.data?.message ||
						"Unggahan terhenti karena koneksi terputus terlalu lama. Pastikan sinyal stabil (lebih baik pakai Wi-Fi), lalu kirim lagi."
				);
			}
			setKemajuan(null);
		} finally {
			sesiRef.current = null;
		}
	};

	const persen = kemajuan ? Math.floor((kemajuan.terkirim / kemajuan.total) * 100) : 0;

	return (
		<div className="mt-4 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
			{!berkas ? (
				<button type="button" onClick={() => masukan.current?.click()} className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-7 text-center transition-colors hover:border-slate-400">
					<UploadCloud className="h-8 w-8 text-slate-400" />
					<span className="text-sm font-medium text-slate-700">Pilih video dari galeri / berkas</span>
					<span className="text-xs text-slate-500">MP4, MOV, WebM · maks {formatUkuran(data.maks_ukuran)}</span>
				</button>
			) : (
				<div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
					<Film className="h-6 w-6 flex-shrink-0 text-slate-500" />
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-medium text-slate-900">{berkas.name}</p>
						<p className="text-xs text-slate-500">
							{[formatUkuran(berkas.size), info?.durasi ? formatDurasi(info.durasi) : null, info?.lebar ? `${info.lebar}×${info.tinggi}` : null].filter(Boolean).join(" · ")}
						</p>
					</div>
					{!kemajuan && (
						<button type="button" onClick={() => { pilih(null); if (masukan.current) masukan.current.value = ""; }} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Ganti video">
							<X className="h-4 w-4" />
						</button>
					)}
				</div>
			)}
			<input ref={masukan} type="file" accept={["video/*", ...data.ekstensi].join(",")} className="hidden" onChange={(e) => pilih(e.target.files?.[0])} />

			{peringatan.length > 0 && (
				<div className="space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
					{peringatan.map((p) => <p key={p}>⚠ {p}</p>)}
					<p className="text-amber-700/80">Video tetap bisa dikirim, tapi mungkin tidak terpakai.</p>
				</div>
			)}

			<label className="block">
				<span className="text-xs font-semibold text-slate-700">Keterangan video</span>
				<textarea value={keterangan} onChange={(e) => setKeterangan(e.target.value)} disabled={!!kemajuan} rows={2} maxLength={2000} placeholder="Isi singkat video, lokasi pengambilan, nama kegiatan…" className={kelasMasukan} />
			</label>

			{galat && <p className="flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />{galat}</p>}

			{kemajuan ? (
				<div className="space-y-2">
					<div className="flex items-center justify-between text-sm">
						<span className="font-medium text-slate-900">{persen < 100 ? "Mengunggah…" : "Menyelesaikan…"}</span>
						<span className="tabular-nums text-slate-600">{persen}% · {formatUkuran(kemajuan.terkirim)} / {formatUkuran(kemajuan.total)}</span>
					</div>
					<div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
						<div className="h-full rounded-full bg-slate-900 transition-[width] duration-300" style={{ width: `${persen}%` }} />
					</div>
					<p className="text-xs text-slate-500">Jangan tutup halaman ini. Bila sinyal putus sebentar, unggahan lanjut sendiri.</p>
					<button type="button" onClick={() => pengendali.current?.abort()} className="text-xs font-medium text-rose-600 hover:underline">Batalkan unggahan</button>
				</div>
			) : (
				<div className="flex gap-2">
					<button type="button" onClick={kirim} disabled={!berkas} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-300">
						<UploadCloud className="h-4 w-4" /> Kirim video
					</button>
					<button type="button" onClick={onBatal} className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200">Tutup</button>
				</div>
			)}
		</div>
	);
};

const UnggahVideoDesaPage = () => {
	const { token } = useParams();
	const [memuat, setMemuat] = useState(true);
	const [data, setData] = useState(null);
	const [galatMuat, setGalatMuat] = useState(null);

	const [kecamatanId, setKecamatanId] = useState("");
	const [desaId, setDesaId] = useState("");
	const [nama, setNama] = useState("");
	const [hp, setHp] = useState("");
	const [statusDesa, setStatusDesa] = useState({});
	const [memuatStatus, setMemuatStatus] = useState(false);
	const [terbuka, setTerbuka] = useState(null); // id kegiatan yang form-nya terbuka
	const [sibuk, setSibuk] = useState(false);
	const [pesanSukses, setPesanSukses] = useState(null);

	useEffect(() => {
		(async () => {
			try {
				const r = await getHalamanUnggah(token);
				const d = r.data.data;
				setData(d);
				document.title = "Video Desa — DPMD Kabupaten Bogor";
				if (d.desa_terkunci) {
					const desa = d.desa.find((x) => x.id === d.desa_terkunci);
					if (desa) { setKecamatanId(String(desa.kecamatan_id)); setDesaId(String(desa.id)); }
				}
			} catch (e) {
				const kode = e.response?.status;
				setGalatMuat({
					ikon: kode === 403 ? Lock : AlertCircle,
					judul: kode === 403 ? "Pengumpulan video ditutup" : "Tautan tidak dapat dibuka",
					pesan: e.response?.data?.message || "Halaman tidak dapat dimuat. Periksa koneksi internet lalu muat ulang.",
				});
			} finally {
				setMemuat(false);
			}
		})();
	}, [token]);

	const muatStatus = useCallback(async (id) => {
		if (!id) { setStatusDesa({}); return; }
		setMemuatStatus(true);
		try {
			const r = await getStatusDesa(token, id);
			setStatusDesa(Object.fromEntries((r.data.data || []).map((s) => [s.permintaan_id, s])));
		} catch {
			setStatusDesa({});
		} finally {
			setMemuatStatus(false);
		}
	}, [token]);

	useEffect(() => {
		setTerbuka(null);
		setPesanSukses(null);
		muatStatus(desaId);
	}, [desaId, muatStatus]);

	const desaDiKecamatan = useMemo(
		() => (data?.desa || []).filter((d) => String(d.kecamatan_id) === String(kecamatanId)),
		[data, kecamatanId]
	);

	const perBidang = useMemo(() => {
		const kelompok = new Map();
		(data?.kegiatan || []).forEach((k) => {
			const kunci = k.bidang || "Lainnya";
			if (!kelompok.has(kunci)) kelompok.set(kunci, []);
			kelompok.get(kunci).push(k);
		});
		return [...kelompok.entries()];
	}, [data]);

	if (memuat) {
		return (
			<Bingkai>
				<div className="space-y-3"><div className="h-40 animate-pulse rounded-2xl bg-white" /><div className="h-64 animate-pulse rounded-2xl bg-white" /></div>
			</Bingkai>
		);
	}
	if (galatMuat) return <Pemberitahuan ikon={galatMuat.ikon} judul={galatMuat.judul} keterangan={galatMuat.pesan} />;

	const desaTerpilih = data.desa.find((d) => String(d.id) === String(desaId));
	const identitasLengkap = Boolean(desaId && nama.trim() && hp.replace(/\D/g, "").length >= 9);
	const terkunci = Boolean(data.desa_terkunci && desaId);
	const bolehKirim = (s) => !s || s.status === "ditolak" || s.pemrosesan === "gagal";

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
								<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Pengumpulan Video Desa</p>
								<h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Video Kegiatan Desa untuk Videotron & Media Sosial DPMD</h1>
							</div>
						</div>
						<ul className="mt-4 space-y-1 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
							<li>• Pilih desa Anda, lalu kirim <b>satu video untuk setiap kegiatan</b> di bawah.</li>
							<li>• Format <b>MP4</b> (disarankan), MOV, atau WebM — maksimal <b>{formatUkuran(data.maks_ukuran)}</b> per video.</li>
							<li>• Kualitas disarankan <b>1080p (Full HD)</b>, gambar stabil, suara jelas, tanpa musik berhak cipta.</li>
							<li>• Video diperiksa keamanannya oleh sistem, lalu diverifikasi bidang terkait.</li>
						</ul>
					</div>
				</div>

				<div className="space-y-3 rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-sm sm:px-7">
					<p className="text-sm font-semibold text-slate-900">1. Identitas pengirim</p>
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
						<label className="block">
							<span className="text-xs font-semibold text-slate-700">Kecamatan <span className="text-rose-600">*</span></span>
							<select value={kecamatanId} disabled={terkunci || sibuk} onChange={(e) => { setKecamatanId(e.target.value); setDesaId(""); }} className={kelasMasukan}>
								<option value="">Pilih kecamatan</option>
								{data.kecamatan.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
							</select>
						</label>
						<label className="block">
							<span className="text-xs font-semibold text-slate-700">Desa/Kelurahan <span className="text-rose-600">*</span></span>
							<select value={desaId} disabled={terkunci || !kecamatanId || sibuk} onChange={(e) => setDesaId(e.target.value)} className={kelasMasukan}>
								<option value="">{kecamatanId ? "Pilih desa" : "Pilih kecamatan dulu"}</option>
								{desaDiKecamatan.map((d) => <option key={d.id} value={d.id}>{d.nama}</option>)}
							</select>
						</label>
						<label className="block">
							<span className="text-xs font-semibold text-slate-700">Nama pengirim <span className="text-rose-600">*</span></span>
							<input value={nama} onChange={(e) => setNama(e.target.value)} disabled={sibuk} maxLength={150} placeholder="Nama dan jabatan" className={kelasMasukan} />
						</label>
						<label className="block">
							<span className="text-xs font-semibold text-slate-700">No. HP / WhatsApp <span className="text-rose-600">*</span></span>
							<input value={hp} onChange={(e) => setHp(e.target.value)} disabled={sibuk} inputMode="tel" maxLength={20} placeholder="08…" className={kelasMasukan} />
						</label>
					</div>
				</div>

				<div className="space-y-3">
					<p className="px-1 text-sm font-semibold text-slate-900">
						2. Kegiatan video{desaTerpilih ? ` — ${desaTerpilih.status_pemerintahan === "kelurahan" ? "Kelurahan" : "Desa"} ${desaTerpilih.nama}` : ""}
						{memuatStatus && <Loader2 className="ml-2 inline h-3.5 w-3.5 animate-spin text-slate-400" />}
					</p>

					{pesanSukses && (
						<p className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
							<CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" /> {pesanSukses}
						</p>
					)}

					{perBidang.length === 0 ? (
						<div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
							Belum ada kegiatan video yang dibuka. Silakan cek kembali nanti.
						</div>
					) : (
						perBidang.map(([bidang, daftar]) => (
							<div key={bidang} className="space-y-2">
								<p className="px-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Bidang {bidang}</p>
								{daftar.map((k) => {
									const s = statusDesa[k.id];
									const boleh = bolehKirim(s);
									return (
										<div key={k.id} className="rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm sm:px-6">
											<div className="flex items-start justify-between gap-3">
												<div className="min-w-0">
													<h2 className="text-base font-semibold text-slate-900">{k.judul}</h2>
													<p className="mt-0.5 text-xs text-slate-500">
														{LABEL_ORIENTASI[k.orientasi]}
														{k.maks_durasi_detik ? ` · maks ${formatDurasi(k.maks_durasi_detik)} (menit:detik)` : ""}
														{k.tutup_pada ? ` · paling lambat ${formatWaktu(k.tutup_pada)}` : ""}
													</p>
												</div>
												{s && s.status === "disetujui" && <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-600" />}
											</div>
											{k.deskripsi && <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{k.deskripsi}</p>}
											{desaId && <div className="mt-3"><StatusKiriman s={s} /></div>}

											{terbuka === k.id ? (
												<FormUnggah
													token={token}
													data={data}
													kegiatan={k}
													identitas={{ desa_id: Number(desaId), nama_pengirim: nama, no_hp: hp }}
													onSibuk={setSibuk}
													onBatal={() => setTerbuka(null)}
													onSelesai={() => {
														setSibuk(false);
														setTerbuka(null);
														setPesanSukses(`Video untuk "${k.judul}" berhasil terkirim. Sistem memeriksa keamanannya, lalu bidang akan memverifikasi.`);
														muatStatus(desaId);
													}}
												/>
											) : (
												boleh && (
													<button
														type="button"
														disabled={!identitasLengkap || sibuk || memuatStatus}
														onClick={() => { setPesanSukses(null); setTerbuka(k.id); }}
														className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-300"
													>
														{s ? <RotateCcw className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
														{s ? "Kirim ulang video" : "Unggah video"}
													</button>
												)
											)}
											{boleh && !identitasLengkap && terbuka !== k.id && (
												<p className="mt-2 text-xs text-slate-400">Lengkapi identitas pengirim di atas dulu.</p>
											)}
										</div>
									);
								})}
							</div>
						))
					)}
				</div>
			</div>
		</Bingkai>
	);
};

export default UnggahVideoDesaPage;
