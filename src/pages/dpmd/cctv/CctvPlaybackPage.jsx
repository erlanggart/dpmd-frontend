import React, { useCallback, useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import {
	Play,
	Pause,
	Square,
	RotateCcw,
	RotateCw,
	Loader2,
	VideoOff,
	Info,
	ArrowLeft,
	Maximize,
	Camera,
} from "lucide-react";
import toast from "react-hot-toast";
import {
	buatSesiPlayback,
	getKamera,
	getKetersediaanPlayback,
	seekSesiPlayback,
	stopSesiPlayback,
} from "../../../api/smartCctvApi";

/**
 * Playback DVR (Hikvision) lewat mesin AI.
 *
 * Alur dua tahap: pilih kamera dari grid pratinjau langsung, lalu pemutar —
 * rekaman selalu mulai pukul 00.00 dengan jendela arsip 24 jam penuh.
 *
 * Video sengaja TANPA kontrol bawaan peramban (tanpa progressbar ganda);
 * play/pause, ±10 detik, kecepatan, dan fullscreen lewat control bar di dalam
 * card. Geser/seek membuat sesi baru pada waktu target dengan sisa hari itu
 * (mesin AI hanya mendukung satu sesi sekaligus, ±5 detik penyiapan).
 */

const HARI_MENIT = 24 * 60;
const KECEPATAN = [0.5, 0.75, 1, 1.5, 2];

const hariLokal = (d) => {
	const pad = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const epochHari = (tanggal) => {
	const [y, m, day] = tanggal.split("-").map(Number);
	return new Date(y, m - 1, day).getTime() / 1000;
};

const jamLabel = (epoch) =>
	new Date(epoch * 1000).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

const pesanApi = (e, fallback) => {
	const d = e.response?.data;
	const detail = d?.detail;
	if (detail && typeof detail === "object" && detail.message) return detail.message;
	if (typeof detail === "string" && detail) return detail;
	return d?.message || fallback;
};

const WARNA_STATUS = {
	active: "bg-emerald-500",
	inactive: "bg-slate-400",
	maintenance: "bg-amber-500",
	offline: "bg-red-500",
};

const LabelStatus = ({ status }) => (
	<span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
		<span className={`h-1.5 w-1.5 rounded-full ${WARNA_STATUS[status] || "bg-slate-400"}`} />
		{status === "active"
			? "Aktif"
			: status === "maintenance"
				? "Pemeliharaan"
				: status === "offline"
					? "Offline"
					: "Nonaktif"}
	</span>
);

/**
 * Kartu pemilih kamera — SENGAJA tanpa pratinjau live.
 *
 * Sebelumnya tiap kartu memuat stream MJPEG, sehingga membuka halaman ini
 * membuka N koneksi panjang ke origin yang sama dan ikut menghabiskan jatah
 * 6-koneksi HTTP/1.1 per-origin milik halaman Live Monitoring. Akibatnya pindah
 * Live ⇄ Playback membuat tile "Memuat aliran…" macet. Sekarang kartu murni
 * identitas; satu-satunya stream dibuka di tahap pemutar setelah kamera dipilih.
 */
const KartuPilih = ({ kamera, onPilih }) => (
	<button
		onClick={() => onPilih(kamera)}
		className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:border-slate-400 hover:shadow-md"
	>
		<div className="relative flex aspect-video items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
			<Camera className="h-10 w-10 text-slate-600 transition-colors group-hover:text-slate-400" />
			{kamera.lokasi && (
				<span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
					{kamera.lokasi}
				</span>
			)}
			<span className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
				<span className="flex items-center gap-1.5 rounded-lg bg-slate-900/85 px-3 py-1.5 text-xs font-semibold text-white">
					<Play className="h-3.5 w-3.5" />
					Buka playback
				</span>
			</span>
		</div>
		<div className="flex items-center justify-between gap-2 px-3 py-2.5">
			<div className="min-w-0">
				<p className="truncate text-sm font-semibold text-slate-900">{kamera.name}</p>
				<div className="mt-0.5 flex items-center gap-2">
					<span className="text-xs text-slate-500">Kamera {kamera.id}</span>
					<LabelStatus status={kamera.status} />
				</div>
			</div>
			<Play className="h-4 w-4 flex-shrink-0 text-slate-300 transition-colors group-hover:text-slate-700" />
		</div>
	</button>
);

const CctvPlaybackPage = () => {
	const [tahap, setTahap] = useState("pilih"); // pilih | tonton
	const [kamera, setKamera] = useState([]);
	const [memuatDaftar, setMemuatDaftar] = useState(true);
	const [cameraId, setCameraId] = useState("");
	const [tanggal, setTanggal] = useState(() => hariLokal(new Date()));

	const [sesi, setSesi] = useState(null); // { sid, stream_url, start_ts, end_ts }
	const [memuat, setMemuat] = useState(false);
	const [mencari, setMencari] = useState(false);
	const [ketersediaan, setKetersediaan] = useState(null);
	const [posisiMenit, setPosisiMenit] = useState(0);
	const [jalan, setJalan] = useState(false);
	const [kecepatan, setKecepatan] = useState(1);

	const videoRef = useRef(null);
	const hlsRef = useRef(null);
	const wrapRef = useRef(null);
	// Salinan sesi terkini — dipakai cleanup tanpa menaruh `sesi` di dependensi
	// (dependensi sesi membuat cleanup berjalan tiap sesi berubah dan langsung
	// mematikan sesi baru — playback mati seketika).
	const sesiRef = useRef(null);
	sesiRef.current = sesi;
	// Posisi hasil-commit terakhir (epoch). Guard seek membandingkan ke ref
	// ini, BUKAN ke state posisiMenit — state sudah berubah saat drag berakhir,
	// sehingga guard lama menganggap "tidak ada perubahan" dan seek tidak
	// pernah terkirim (slider meloncat kembali ke posisi video).
	const commitRef = useRef(0);
	const dragRef = useRef(false);
	const mencariRef = useRef(false);
	const kecepatanRef = useRef(1);

	useEffect(() => {
		setMemuatDaftar(true);
		getKamera()
			.then((r) => {
				const list = r.data.data || [];
				setKamera(list.filter((k) => k.status === "active"));
			})
			.catch(() => toast.error("Gagal memuat daftar kamera."))
			.finally(() => setMemuatDaftar(false));
	}, []);

	const hentikan = useCallback(async () => {
		const s = sesiRef.current;
		setSesi(null);
		setPosisiMenit(0);
		setJalan(false);
		commitRef.current = 0;
		if (s?.sid) {
			try {
				await stopSesiPlayback(s.sid);
			} catch {
				// sesi akan dibersihkan mesin AI sendiri lewat TTL
			}
		}
	}, []);

	// Berhenti hanya saat halaman ditinggalkan (unmount sungguhan).
	useEffect(() => () => {
		const s = sesiRef.current;
		if (s?.sid) stopSesiPlayback(s.sid).catch(() => {});
	}, []);

	// Ganti kamera/tanggal membatalkan sesi berjalan.
	useEffect(() => {
		if (sesiRef.current) hentikan();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [cameraId, tanggal]);

	// Cek ketersediaan rekaman tiap kamera/tanggal berubah.
	useEffect(() => {
		setKetersediaan(null);
		if (!cameraId || !tanggal) return undefined;
		let batal = false;
		getKetersediaanPlayback({ camera_id: cameraId, date: tanggal })
			.then((r) => {
				if (!batal) setKetersediaan(r.data.data);
			})
			.catch(() => {
				if (!batal) setKetersediaan(null);
			});
		return () => {
			batal = true;
		};
	}, [cameraId, tanggal]);

	// Pasang HLS.js ke <video> tiap sesi berubah.
	useEffect(() => {
		const video = videoRef.current;
		if (!video || !sesi) return undefined;
		// stream_url SUDAH berawalan "/ai" — Express menambahkannya di
		// smartCctv.service.js (putarPlayback/seekPlayback). JANGAN menambah
		// "/ai" lagi di sini: double prefix → /ai/ai/... → 404 manifestLoadError.
		const url = sesi.stream_url;
		const putar = () => {
			video.playbackRate = kecepatanRef.current;
			video.play().catch(() => {});
		};
		const onPlay = () => setJalan(true);
		const onPause = () => setJalan(false);
		video.addEventListener("play", onPlay);
		video.addEventListener("pause", onPause);

		let hls = null;
		if (Hls.isSupported()) {
			hls = new Hls({ lowLatencyMode: false });
			hlsRef.current = hls;
			hls.loadSource(url);
			hls.attachMedia(video);
			hls.on(Hls.Events.MANIFEST_PARSED, putar);
			hls.on(Hls.Events.ERROR, (_, data) => {
				// Sesi lama dibunuh server saat seek — jangan tampilkan galatnya.
				if (data.fatal && !mencariRef.current) {
					toast.error("Pemutaran terputus: " + (data.details || "galat tidak diketahui"));
				}
			});
		} else if (video.canPlayType("application/vnd.apple.mpegurl")) {
			// Safari: HLS bawaan.
			video.src = url;
			putar();
		} else {
			toast.error("Peramban ini tidak mendukung HLS.");
		}

		return () => {
			video.removeEventListener("play", onPlay);
			video.removeEventListener("pause", onPause);
			if (hls) {
				hls.destroy();
				hlsRef.current = null;
			}
		};
	}, [sesi]);

	// Posisi playhead absolut (menit sejak 00.00 tanggal terpilih).
	useEffect(() => {
		const video = videoRef.current;
		if (!video || !sesi) return undefined;
		const tick = () => {
			// Jangan tarik slider saat pengguna menyeret atau sesi sedang dicari.
			if (dragRef.current || mencariRef.current) return;
			const epoch = sesi.start_ts + (video.currentTime || 0);
			commitRef.current = epoch;
			setPosisiMenit(Math.max(0, Math.min(HARI_MENIT, Math.round((epoch - epochHari(tanggal)) / 60))));
		};
		video.addEventListener("timeupdate", tick);
		return () => video.removeEventListener("timeupdate", tick);
	}, [sesi, tanggal]);

	const pilihKamera = (k) => {
		setCameraId(String(k.id));
		setTahap("tonton");
	};

	const gantiKamera = async () => {
		await hentikan();
		setTahap("pilih");
	};

	const mulai = async () => {
		if (!cameraId || !tanggal) return toast.error("Pilih kamera terlebih dahulu.");
		setMemuat(true);
		try {
			// Sesi lama ditutup dulu — mesin AI hanya mendukung satu sesi.
			if (sesiRef.current?.sid) await stopSesiPlayback(sesiRef.current.sid).catch(() => {});
			const r = await buatSesiPlayback({
				camera_id: Number(cameraId),
				start_iso: `${tanggal}T00:00:00`,
				lookahead_min: HARI_MENIT,
			});
			commitRef.current = epochHari(tanggal);
			setSesi(r.data.data);
			setPosisiMenit(0);
		} catch (e) {
			toast.error(pesanApi(e, "Gagal memulai playback. Pastikan layanan AI berjalan."));
		} finally {
			setMemuat(false);
		}
	};

	// Geser ke epoch absolut dalam hari terpilih; window baru = sisa hari.
	const geserKe = async (targetEpoch) => {
		if (!sesi || mencariRef.current) return;
		const hariMulai = epochHari(tanggal);
		const target = Math.max(hariMulai, Math.min(hariMulai + HARI_MENIT * 60 - 60, Math.round(targetEpoch)));
		if (target === commitRef.current) return;
		const menitTarget = Math.round((target - hariMulai) / 60);
		setPosisiMenit(menitTarget);
		setMencari(true);
		mencariRef.current = true;
		try {
			const r = await seekSesiPlayback(sesi.sid, {
				start_iso: new Date(target * 1000).toISOString(),
				lookahead_min: Math.max(1, HARI_MENIT - menitTarget),
			});
			commitRef.current = target;
			setSesi(r.data.data);
		} catch (e) {
			// Kembali ke posisi terakhir yang berhasil.
			setPosisiMenit(Math.round((commitRef.current - hariMulai) / 60));
			toast.error(pesanApi(e, "Gagal memindahkan posisi."));
		} finally {
			mencariRef.current = false;
			setMencari(false);
		}
	};

	const geser = (menitAbsolut) => geserKe(epochHari(tanggal) + menitAbsolut * 60);

	const lompatDetik = (delta) => {
		if (!sesi) return toast.error("Tekan Putar terlebih dahulu.");
		const video = videoRef.current;
		const playhead = sesi.start_ts + (video?.currentTime || 0);
		geserKe(playhead + delta);
	};

	const toggleMain = () => {
		const video = videoRef.current;
		if (!video) return;
		if (video.paused) video.play().catch(() => {});
		else video.pause();
	};

	const aturKecepatan = (x) => {
		kecepatanRef.current = x;
		setKecepatan(x);
		if (videoRef.current) videoRef.current.playbackRate = x;
	};

	const fullscreen = () => {
		if (document.fullscreenElement) document.exitFullscreen?.();
		else wrapRef.current?.requestFullscreen?.();
	};

	const alasanTersedia = {
		no_dvr: "Kamera ini tampaknya tidak terhubung ke DVR rekaman.",
		no_ffmpeg: "ffmpeg tidak ditemukan di server mesin AI.",
		no_recording: "Tidak ada rekaman pada tanggal tersebut di DVR.",
		dvr_not_responding: "DVR tidak merespons — coba lagi beberapa saat.",
		error: "Gagal memeriksa rekaman di DVR.",
		unavailable: "Rekaman untuk tanggal itu tidak tersedia di DVR.",
	};

	const tanggalHariIni = hariLokal(new Date());
	const pesanTersedia = () => {
		if (!ketersediaan || ketersediaan.available !== false) return null;
		// DVR Hikvision mengisi arsip hari berjalan bertahap — segmen siang sering
		// belum terdaftar padahal rekaman malam sudah ada. Beri pesan khusus.
		if (tanggal === tanggalHariIni && (ketersediaan.reason === "error" || ketersediaan.reason === "no_recording")) {
			return "Rekaman hari ini belum terdaftar di DVR saat ini. Arsip hari berjalan terisi bertahap (paling lengkap setelah malam) — coba tanggal kemarin, atau buka lagi nanti.";
		}
		return alasanTersedia[ketersediaan.reason] || "Rekaman tidak tersedia untuk kombinasi ini.";
	};

	const kameraTerpilih = kamera.find((k) => String(k.id) === cameraId);

	// ───────────────────────── Tahap pilih kamera ─────────────────────────
	if (tahap === "pilih") {
		return (
			<div className="rounded-xl border border-slate-200 bg-white p-5">
				<div className="mb-4">
					<h2 className="text-base font-semibold text-slate-900">Pilih Kamera</h2>
					<p className="mt-0.5 text-sm text-slate-500">
						Pratinjau langsung tiap kamera — klik kartu untuk membuka rekaman 24 jam.
					</p>
				</div>
				{memuatDaftar ? (
					<div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
						<Loader2 className="h-4 w-4 animate-spin" />
						Memuat daftar kamera…
					</div>
				) : kamera.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-2 py-16 text-slate-400">
						<VideoOff className="h-8 w-8" />
						<p className="text-sm">Tidak ada kamera aktif.</p>
					</div>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{kamera.map((k) => (
							<KartuPilih key={k.id} kamera={k} onPilih={pilihKamera} />
						))}
					</div>
				)}
			</div>
		);
	}

	// ───────────────────────── Tahap pemutar ─────────────────────────
	return (
		<div className="rounded-xl border border-slate-200 bg-white p-5">
			<div className="mb-4 flex flex-wrap items-end gap-3">
				<button
					onClick={gantiKamera}
					className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
				>
					<ArrowLeft className="h-4 w-4" />
					Ganti Kamera
				</button>
				{kameraTerpilih && (
					<div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
						<Camera className="h-4 w-4 text-slate-500" />
						<div className="leading-tight">
							<p className="text-sm font-semibold text-slate-900">{kameraTerpilih.name}</p>
							<p className="text-[11px] text-slate-500">Kamera {kameraTerpilih.id}</p>
						</div>
					</div>
				)}
				<div>
					<label className="mb-1 block text-xs font-medium text-slate-500">Tanggal rekaman</label>
					<input
						type="date"
						value={tanggal}
						onChange={(e) => setTanggal(e.target.value)}
						className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
					/>
				</div>
				<p className="pb-2 text-xs text-slate-400">Mulai 00.00 · 24 jam.</p>
				{sesi ? (
					<button
						onClick={hentikan}
						className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
					>
						<Square className="h-4 w-4" />
						Berhenti
					</button>
				) : (
					<button
						onClick={mulai}
						disabled={memuat}
						className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
					>
						{memuat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
						Putar
					</button>
				)}
			</div>

			{ketersediaan && ketersediaan.available === false && (
				<div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
					<Info className="h-4 w-4 flex-shrink-0" />
					{pesanTersedia()}
				</div>
			)}

			{/* Video tanpa kontrol bawaan — semua lewat control bar card. */}
			<div ref={wrapRef} className="relative overflow-hidden rounded-xl bg-slate-900">
				<video ref={videoRef} autoPlay playsInline className="aspect-video w-full" />
				{!sesi && (
					<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-slate-400">
						<VideoOff className="h-10 w-10" />
						<p className="mt-3 text-sm">Tekan Putar untuk membuka rekaman.</p>
					</div>
				)}
				{mencari && (
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
						<span className="flex items-center gap-2 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-medium text-white">
							<Loader2 className="h-3.5 w-3.5 animate-spin" />
							Mencari rekaman…
						</span>
					</div>
				)}
			</div>

			{/* Control bar kustom (pengganti kontrol bawaan video). */}
			<div className="mt-3 flex flex-wrap items-center gap-1.5">
				<button
					onClick={toggleMain}
					disabled={!sesi}
					title={jalan ? "Jeda" : "Putar"}
					className="rounded-lg bg-slate-900 p-2 text-white transition-colors hover:bg-slate-700 disabled:opacity-40"
				>
					{jalan ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
				</button>
				<button
					onClick={() => lompatDetik(-10)}
					disabled={!sesi || mencari}
					title="Mundur 10 detik"
					className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
				>
					<RotateCcw className="h-4 w-4" />
				</button>
				<button
					onClick={() => lompatDetik(10)}
					disabled={!sesi || mencari}
					title="Lanjut 10 detik"
					className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
				>
					<RotateCw className="h-4 w-4" />
				</button>
				<select
					value={kecepatan}
					onChange={(e) => aturKecepatan(Number(e.target.value))}
					disabled={!sesi}
					title="Kecepatan pemutaran"
					className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-medium text-slate-700 disabled:opacity-40"
				>
					{KECEPATAN.map((x) => (
						<option key={x} value={x}>
							{x}×
						</option>
					))}
				</select>
				<span className="ml-auto px-1 text-xs font-medium text-slate-500">
					{sesi
						? `${jamLabel(epochHari(tanggal) + posisiMenit * 60)} — s.d. 24.00`
						: "— : —"}
				</span>
				<button
					onClick={fullscreen}
					title="Layar penuh"
					className="rounded-lg border border-slate-200 p-2 text-slate-600 transition-colors hover:bg-slate-50"
				>
					<Maximize className="h-4 w-4" />
				</button>
			</div>

			{/* Progressbar card — slider absolut 00.00–24.00. */}
			{sesi && (
				<div className="mt-3">
					<div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
						<span>00.00</span>
						<span>24.00</span>
					</div>
					<input
						type="range"
						min={0}
						max={HARI_MENIT}
						step={1}
						value={posisiMenit}
						disabled={mencari || memuat}
						onPointerDown={() => {
							dragRef.current = true;
						}}
						onChange={(e) => setPosisiMenit(Number(e.target.value))}
						onMouseUp={(e) => {
							dragRef.current = false;
							geser(Number(e.target.value));
						}}
						onTouchEnd={(e) => {
							dragRef.current = false;
							geser(Number(e.target.value));
						}}
						onKeyUp={(e) => {
							dragRef.current = false;
							geser(Number(e.target.value));
						}}
						onBlur={() => {
							dragRef.current = false;
						}}
						className={`w-full accent-slate-900 ${mencari ? "opacity-50" : ""}`}
					/>
				</div>
			)}
		</div>
	);
};

export default CctvPlaybackPage;
