import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { RefreshCw, Radio, Waves, AlertTriangle, Plus, MonitorPlay, CameraOff } from "lucide-react";
import toast from "react-hot-toast";
import { getKamera, getStreamUrl, urlMjpegAI } from "../../../api/smartCctvApi";
import { useCctvAlerts } from "../../../hooks/useCctvAlerts";

/**
 * Grid kamera langsung.
 *
 * Aliran gambar: MJPEG dari mesin AI (/ai/cameras/:id/stream) bila terpasang,
 * selain itu dari go2rtc lewat URL bertoken (stream-url) — tetap satu <img>
 * tanpa JavaScript video. Pilihan WebRTC (go2rtc) tersedia per tile untuk
 * kualitas lebih baik dengan codec H.264 asli; peer ditutup saat tile unmount.
 */

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

/** Pemutar WebRTC go2rtc (URL bertoken dari stream-url). Mengembalikan fungsi pembersih. */
const sambungWebRtc = async (url, videoEl, onGagal) => {
	const pc = new RTCPeerConnection();
	pc.addTransceiver("video", { direction: "recvonly" });
	pc.addTransceiver("audio", { direction: "recvonly" });
	pc.ontrack = (ev) => {
		if (videoEl) videoEl.srcObject = ev.streams[0];
	};
	try {
		const offer = await pc.createOffer();
		await pc.setLocalDescription(offer);
		const resp = await fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ type: "offer", sdp: offer.sdp }),
		});
		if (!resp.ok) throw new Error(`go2rtc ${resp.status}`);
		const ct = resp.headers.get("content-type") || "";
		const jawab = ct.includes("json") ? await resp.json() : { type: "answer", sdp: await resp.text() };
		await pc.setRemoteDescription(jawab);
	} catch (err) {
		pc.close();
		onGagal?.(err);
		return null;
	}
	return () => {
		pc.close();
	};
};

// Sumber gambar dicoba berurutan; yang gagal digeser ke berikutnya:
// MJPEG mesin AI (bila terpasang) → MJPEG go2rtc → bingkai go2rtc berkala
// (bila go2rtc tidak bisa membuat MJPEG dari H.264) → menyerah dengan pesan.
const URUTAN_SUMBER = ["ai", "go2rtc", "bingkai"];
const JEDA_BINGKAI_MS = 3000;

const KartuKamera = ({ kamera, peristiwaTerbaru, dasar }) => {
	const [mode, setMode] = useState("ai"); // ai | go2rtc | bingkai | webrtc | mati
	const [selesaiMuat, setSelesaiMuat] = useState(false);
	const [url, setUrl] = useState(null); // balasan stream-url (bertoken)
	const [detak, setDetak] = useState(0); // pemicu bingkai berikutnya
	const videoRef = useRef(null);
	const bersihRef = useRef(null);

	const muatUrl = useCallback(async () => {
		try {
			const r = await getStreamUrl(kamera.id);
			setUrl(r.data.data || null);
			return r.data.data || null;
		} catch {
			setUrl(null);
			return null;
		}
	}, [kamera.id]);

	useEffect(() => {
		muatUrl();
	}, [muatUrl, kamera.go2rtc_src]);

	// AI gagal sebelum URL bertoken tiba → begitu tiba, lanjut ke go2rtc.
	useEffect(() => {
		if (url?.go2rtc_frame_url) setMode((m) => (m === "mati" ? "go2rtc" : m));
	}, [url]);

	// Mode bingkai: ambil potret baru tiap beberapa detik.
	useEffect(() => {
		if (mode !== "bingkai") return undefined;
		const jeda = setInterval(() => setDetak((d) => d + 1), JEDA_BINGKAI_MS);
		return () => clearInterval(jeda);
	}, [mode]);

	const matikanWebRtc = useCallback(() => {
		bersihRef.current?.();
		bersihRef.current = null;
	}, []);

	useEffect(() => () => matikanWebRtc(), [matikanWebRtc]);

	const sumberBerikut = (dari) => {
		setSelesaiMuat(false);
		let i = URUTAN_SUMBER.indexOf(dari) + 1;
		// Sumber go2rtc butuh URL bertoken; tanpa itu langsung lewati.
		while (URUTAN_SUMBER[i] && URUTAN_SUMBER[i] !== "ai" && !url?.go2rtc_frame_url) i += 1;
		setMode(URUTAN_SUMBER[i] || "mati");
	};

	const cobaLagi = async () => {
		matikanWebRtc();
		setSelesaiMuat(false);
		await muatUrl(); // token media mungkin sudah kedaluwarsa
		setMode("ai");
	};

	const nyalakanWebRtc = async () => {
		matikanWebRtc();
		if (!url?.webrtc_url) {
			toast.error("Kamera ini belum terdaftar di go2rtc.");
			return;
		}
		setMode("webrtc");
		setSelesaiMuat(false);
		bersihRef.current = await sambungWebRtc(url.webrtc_url, videoRef.current, (err) => {
			toast.error(`WebRTC gagal: ${err.message}. Kembali ke aliran gambar.`);
			setMode("go2rtc");
		});
	};

	const kembaliGambar = () => {
		matikanWebRtc();
		setSelesaiMuat(false);
		setMode("ai");
	};

	const nonaktif = kamera.status !== "active";
	const srcGambar =
		mode === "ai"
			? urlMjpegAI(kamera.id, 5)
			: mode === "go2rtc"
				? url?.go2rtc_mjpeg_url
				: mode === "bingkai" && url?.go2rtc_frame_url
					? `${url.go2rtc_frame_url}&_=${detak}`
					: null;

	return (
		<div className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
			<div className="relative aspect-video bg-slate-900">
				{srcGambar && !nonaktif && (
					<img
						key={mode}
						src={srcGambar}
						alt={`Kamera ${kamera.name}`}
						className="h-full w-full object-cover"
						onLoad={() => setSelesaiMuat(true)}
						onError={() => {
							// Bingkai yang sudah pernah tampil boleh gagal sesekali —
							// gambar terakhir tetap dipertahankan.
							if (mode === "bingkai" && selesaiMuat) return;
							sumberBerikut(mode);
						}}
					/>
				)}
				{mode === "webrtc" && (
					<video
						ref={videoRef}
						autoPlay
						muted
						playsInline
						className="h-full w-full bg-slate-900 object-cover"
						onLoadedData={() => setSelesaiMuat(true)}
					/>
				)}
				{nonaktif && url?.go2rtc_frame_url && (
					<img src={url.go2rtc_frame_url} alt={`Potret kamera ${kamera.name}`} className="h-full w-full object-cover opacity-50" />
				)}
				{mode === "mati" && !nonaktif && (
					<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
						<CameraOff className="h-6 w-6 text-slate-500" />
						<p className="text-xs font-medium text-slate-300">Aliran kamera belum tersedia</p>
						<p className="text-[11px] text-slate-500">Layanan go2rtc/AI belum menjawab atau kamera tidak terjangkau.</p>
						<button
							onClick={cobaLagi}
							className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/20 hover:bg-white/20"
						>
							<RefreshCw className="h-3 w-3" />
							Coba lagi
						</button>
					</div>
				)}
				{!selesaiMuat && !nonaktif && mode !== "mati" && (
					<div className="absolute inset-0 flex items-center justify-center">
						<span className="flex items-center gap-2 rounded-lg bg-black/50 px-3 py-1.5 text-xs font-medium text-white">
							<RefreshCw className="h-3.5 w-3.5 animate-spin" />
							{mode === "webrtc" ? "Menyambung WebRTC…" : "Memuat aliran…"}
						</span>
					</div>
				)}
				<div className="absolute left-2 top-2 flex items-center gap-1.5">
					<span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
						{kamera.lokasi || "Tanpa lokasi"}
					</span>
					{selesaiMuat && mode !== "ai" && mode !== "webrtc" && (
						<span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-slate-300" title="Sumber gambar">
							{mode === "bingkai" ? "go2rtc · potret" : "go2rtc"}
						</span>
					)}
					{peristiwaTerbaru && (
						<span className="flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
							<AlertTriangle className="h-3 w-3" />
							{peristiwaTerbaru.type}
						</span>
					)}
				</div>
			</div>
			<div className="flex items-center justify-between gap-2 px-3 py-2.5">
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold text-slate-900">{kamera.name}</p>
					<LabelStatus status={kamera.status} />
				</div>
				<div className="flex flex-shrink-0 items-center gap-1">
					{mode !== "webrtc" && !nonaktif && url?.webrtc_url && (
						<button
							onClick={nyalakanWebRtc}
							title="Aliran WebRTC (go2rtc)"
							className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
						>
							<Waves className="h-4 w-4" />
						</button>
					)}
					{mode === "webrtc" && (
						<button
							onClick={kembaliGambar}
							title="Kembali ke aliran gambar"
							className="rounded-lg bg-slate-900 p-1.5 text-white"
						>
							<Radio className="h-4 w-4" />
						</button>
					)}
					<Link
						to={`${dasar}/cctv/riwayat`}
						state={{ camera_id: String(kamera.id) }}
						title="Riwayat deteksi kamera ini"
						className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
					>
						<MonitorPlay className="h-4 w-4" />
					</Link>
				</div>
			</div>
		</div>
	);
};

const CctvLivePage = () => {
	const location = useLocation();
	const dasar = location.pathname.startsWith("/superadmin") ? "/superadmin" : "/dpmd";
	const [kamera, setKamera] = useState([]);
	const [memuat, setMemuat] = useState(true);
	const { peristiwa: alertTerbaru } = useCctvAlerts();

	const muat = useCallback(async () => {
		setMemuat(true);
		try {
			const r = await getKamera();
			setKamera(r.data.data || []);
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal memuat daftar kamera.");
		} finally {
			setMemuat(false);
		}
	}, []);

	useEffect(() => {
		muat();
	}, [muat]);

	// Peringatan 15 detik terakhir per kamera disematkan di tile-nya.
	const alertPerKamera = useMemo(() => {
		const peta = new Map();
		const batas = Date.now() - 15000;
		for (const a of alertTerbaru) {
			const t = new Date(a.occurred_at).getTime();
			if (Number.isFinite(t) && t < batas) continue;
			if (!peta.has(String(a.camera_id))) peta.set(String(a.camera_id), a);
		}
		return peta;
	}, [alertTerbaru]);

	const aktif = kamera.filter((k) => k.status === "active").length;

	return (
		<div className="rounded-xl border border-slate-200 bg-white p-5">
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="text-base font-semibold text-slate-900">Live Grid</h2>
					<p className="text-sm text-slate-500">
						{kamera.length} kamera terdaftar · {aktif} aktif
					</p>
				</div>
				<div className="flex items-center gap-2">
					<button
						onClick={muat}
						className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
					>
						<RefreshCw className={`h-4 w-4 ${memuat ? "animate-spin" : ""}`} />
						Muat ulang
					</button>
					<Link
						to={`${dasar}/cctv/kamera`}
						className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
					>
						<Plus className="h-4 w-4" />
						Kelola kamera
					</Link>
				</div>
			</div>

			{memuat ? (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
					{[1, 2, 3, 4].map((n) => (
						<div key={n} className="aspect-video animate-pulse rounded-xl bg-slate-100" />
					))}
				</div>
			) : kamera.length === 0 ? (
				<div className="rounded-xl border border-dashed border-slate-200 py-16 text-center">
					<MonitorPlay className="mx-auto h-10 w-10 text-slate-300" />
					<p className="mt-3 text-sm font-medium text-slate-600">Belum ada kamera terdaftar</p>
					<p className="mt-1 text-sm text-slate-400">Tambahkan kamera di tab Kamera untuk mulai memantau.</p>
				</div>
			) : (
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
					{kamera.map((k) => (
						<KartuKamera key={k.id} kamera={k} peristiwaTerbaru={alertPerKamera.get(String(k.id))} dasar={dasar} />
					))}
				</div>
			)}
		</div>
	);
};

export default CctvLivePage;
