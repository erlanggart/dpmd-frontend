import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { RefreshCw, Radio, Waves, AlertTriangle, Plus, MonitorPlay } from "lucide-react";
import toast from "react-hot-toast";
import { getKamera, urlMjpegAI } from "../../../api/smartCctvApi";
import { useCctvAlerts } from "../../../hooks/useCctvAlerts";

/**
 * Grid kamera langsung.
 *
 * Aliran gambar utama: MJPEG dari mesin AI (/ai/cameras/:id/stream) — satu
 * <img> tanpa JavaScript video, tahan terhadap kamera yang mati (ganti ke
 * snapshot diam). Pilihan WebRTC (go2rtc) tersedia per tile untuk kualitas
 * lebih baik dengan codec H.264 asli; koneksi peer ditutup saat tile unmount.
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

/** Pemutar WebRTC go2rtc. Mengembalikan fungsi pembersih. */
const sambungWebRtc = async (src, videoEl, onGagal) => {
	const pc = new RTCPeerConnection();
	pc.addTransceiver("video", { direction: "recvonly" });
	pc.addTransceiver("audio", { direction: "recvonly" });
	pc.ontrack = (ev) => {
		if (videoEl) videoEl.srcObject = ev.streams[0];
	};
	try {
		const offer = await pc.createOffer();
		await pc.setLocalDescription(offer);
		const resp = await fetch(`/go2rtc/api/webrtc?src=${encodeURIComponent(src)}`, {
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

const KartuKamera = ({ kamera, peristiwaTerbaru, dasar }) => {
	const [mode, setMode] = useState("mjpeg"); // mjpeg | webrtc | snapshot | mati
	const [selesaiMuat, setSelesaiMuat] = useState(false);
	const videoRef = useRef(null);
	const bersihRef = useRef(null);

	const stream = useMemo(() => {
		if (!kamera.go2rtc_src) return null;
		return { webrtc_url: `/go2rtc/api/webrtc?src=${encodeURIComponent(kamera.go2rtc_src)}` };
	}, [kamera.go2rtc_src]);

	const matikanWebRtc = useCallback(() => {
		bersihRef.current?.();
		bersihRef.current = null;
	}, []);

	useEffect(() => () => matikanWebRtc(), [matikanWebRtc]);

	const nyalakanWebRtc = async () => {
		matikanWebRtc();
		setMode("webrtc");
		setSelesaiMuat(false);
		if (!stream) {
			toast.error("Kamera ini belum terdaftar di go2rtc.");
			setMode("mjpeg");
			return;
		}
		bersihRef.current = await sambungWebRtc(kamera.go2rtc_src, videoRef.current, (err) => {
			toast.error(`WebRTC gagal: ${err.message}. Beralih ke MJPEG.`);
			setMode("mjpeg");
		});
	};

	const kembaliMjpeg = () => {
		matikanWebRtc();
		setMode("mjpeg");
	};

	const nonaktif = kamera.status !== "active";

	return (
		<div className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
			<div className="relative aspect-video bg-slate-900">
				{mode === "mjpeg" && !nonaktif && (
					<img
						src={urlMjpegAI(kamera.id, 5)}
						alt={`Kamera ${kamera.name}`}
						className="h-full w-full object-cover"
						onLoad={() => setSelesaiMuat(true)}
						onError={() => {
							setMode("snapshot");
							setSelesaiMuat(false);
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
				{(mode === "snapshot" || nonaktif) && (
					<img
						src={`/ai/cameras/${kamera.id}/snapshot?t=${Date.now()}`}
						alt={`Snapshot kamera ${kamera.name}`}
						className="h-full w-full object-cover opacity-60"
					/>
				)}
				{!selesaiMuat && !nonaktif && (
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
					{mode !== "webrtc" && !nonaktif && (
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
							onClick={kembaliMjpeg}
							title="Kembali ke MJPEG"
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
