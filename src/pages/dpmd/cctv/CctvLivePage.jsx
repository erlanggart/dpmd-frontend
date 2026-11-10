import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
	RefreshCw, Radio, Waves, AlertTriangle, Plus, MonitorPlay, CameraOff, Maximize2, Minimize2, X, ChevronLeft, ChevronRight,
	LayoutGrid, Expand, ScanSearch,
} from "lucide-react";
import toast from "react-hot-toast";
import { getKamera, getStreamUrl } from "../../../api/smartCctvApi";
import { useCctvAlerts } from "../../../hooks/useCctvAlerts";
import { sambungMse, urlWs } from "./mse";

/**
 * Grid kamera langsung + pemutar besar.
 *
 * Sumber gambar dicoba berurutan per tile: MJPEG mesin AI (bila terpasang) →
 * video langsung go2rtc lewat MSE/WebSocket (H.264 asli, tanpa transkode) →
 * MJPEG go2rtc → potret go2rtc berkala. URL go2rtc diambil dari stream-url
 * yang membawa token media (nginx menolak tanpa token).
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


// Sumber yang dicoba berurutan; yang gagal digeser ke berikutnya. Tampilan deteksi AI
// (bingkai bertanda kotak orang/wajah, diperbarui tiap analisis) dibuka lewat tombol.
const URUTAN_SUMBER = ["mse", "go2rtc", "bingkai"];
const BUTUH_GO2RTC = new Set(["mse", "go2rtc", "bingkai"]);
const BATAS_MSE_MS = 8000;
const JEDA_BINGKAI_MS = 3000;
const LABEL_SUMBER = { mse: "live", go2rtc: "go2rtc", bingkai: "potret", ai: "deteksi AI" };
const LABEL_PERISTIWA = { known: "Dikenal", unknown: "Tak dikenal", person: "Orang", fall: "Jatuh", fall_warning: "Rawan jatuh", immobility: "Diam lama", other: "Peristiwa" };

const JEDA_DETEKSI_MS = 1500;
// Tiap kamera dianalisis ±4–5 dtk sekali (9 kamera bergiliran di CPU). Layanan
// dianggap diam bila tidak ada analisis/jawaban baru selama ini.
const BASI_DETEKSI_MS = 15000;
// Layanan AI sudah menahan kotak tiap orang yang terlewat satu analisis
// (lacakOrang di cctv-ai), jadi di sini cukup hapus saat analisis kosong.
const KOSONG_UNTUK_HAPUS = 1;

/**
 * Kotak deteksi AI (orang/wajah/rebah) digambar di atas video live. Posisinya
 * dari analisis terakhir layanan AI, jadi bisa sedikit tertinggal dari gerakan
 * di video. cocok: "slice" untuk video object-cover, "meet" untuk object-contain.
 */
const LapisanDeteksi = ({ urlDeteksi, onTokenBasi, cocok = "slice" }) => {
	const [d, setD] = useState(null);
	useEffect(() => {
		if (!urlDeteksi) return undefined;
		let hidup = true;
		let segarTerakhir = 0;
		let analisisTerakhir = 0; // perkiraan waktu analisis yang terakhir dilihat
		let kosongBeruntun = 0;
		let jawabanTerakhir = Date.now();
		const ambil = async () => {
			if (document.visibilityState !== "visible") return;
			try {
				const r = await fetch(urlDeteksi, { cache: "no-store" });
				if (r.status === 403 && Date.now() - segarTerakhir > 60000) {
					segarTerakhir = Date.now();
					onTokenBasi?.(); // token media kedaluwarsa → minta URL baru
				}
				if (r.status === 404) {
					if (hidup) setD(null); // kamera belum/tidak dianalisis
					return;
				}
				const j = r.ok ? await r.json() : null;
				if (!hidup || !j?.success) return;
				if (j.umur_ms > BASI_DETEKSI_MS) {
					setD(null);
					return;
				}
				jawabanTerakhir = Date.now();
				const pada = Date.now() - j.umur_ms;
				const analisisBaru = Math.abs(pada - analisisTerakhir) > 1000;
				analisisTerakhir = pada;
				if (j.tanda?.length) {
					kosongBeruntun = 0;
					setD(j);
				} else if (analisisBaru && ++kosongBeruntun >= KOSONG_UNTUK_HAPUS) {
					setD(null);
				}
			} catch {
				// gangguan jaringan sesaat: kotak terakhir dipertahankan
			} finally {
				if (hidup && Date.now() - jawabanTerakhir > BASI_DETEKSI_MS) setD(null);
			}
		};
		ambil();
		const id = setInterval(ambil, JEDA_DETEKSI_MS);
		return () => {
			hidup = false;
			clearInterval(id);
		};
	}, [urlDeteksi, onTokenBasi]);

	if (!d?.tanda?.length || !d.lebar || !d.tinggi) return null;
	const garis = Math.max(2, d.lebar / 320);
	const huruf = Math.max(12, d.lebar / 45);
	return (
		<svg
			className="pointer-events-none absolute inset-0 h-full w-full"
			viewBox={`0 0 ${d.lebar} ${d.tinggi}`}
			preserveAspectRatio={`xMidYMid ${cocok}`}
			aria-hidden="true"
		>
			{d.tanda.map(({ kotak: [x, y, w, h], label, warna }, i) => (
				<g key={i}>
					<rect x={x} y={y} width={w} height={h} fill="none" stroke={warna} strokeWidth={garis} rx={garis} />
					<rect x={x} y={Math.max(0, y - huruf * 1.35)} width={Math.max(w, label.length * huruf * 0.6)} height={huruf * 1.35} fill={warna} />
					<text x={x + huruf * 0.3} y={Math.max(0, y - huruf * 1.35) + huruf} fill="#fff" fontSize={huruf} fontWeight="700">
						{label}
					</text>
				</g>
			))}
		</svg>
	);
};

/** Tile kamera. `ringkas` = mode dinding (nama di atas gambar, tanpa kaki). */
const KartuKamera = ({ kamera, peristiwaTerbaru, dasar, ringkas = false, onPerbesar }) => {
	const [mode, setMode] = useState("mse"); // mse | go2rtc | bingkai | ai | webrtc | mati
	const [selesaiMuat, setSelesaiMuat] = useState(false);
	const [url, setUrl] = useState(null); // balasan stream-url (bertoken)
	const [detak, setDetak] = useState(0); // pemicu bingkai berikutnya
	const videoRef = useRef(null);
	const mseRef = useRef(null);
	const bersihRef = useRef(null);
	const selesaiRef = useRef(false);

	useEffect(() => {
		selesaiRef.current = selesaiMuat;
	}, [selesaiMuat]);

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

	const sumberBerikut = useCallback(
		(dari) => {
			setSelesaiMuat(false);
			// tampilan deteksi gagal → kembali ke video langsung
			let i = dari === "ai" ? 0 : URUTAN_SUMBER.indexOf(dari) + 1;
			// Sumber go2rtc butuh URL bertoken; tanpa itu langsung lewati.
			while (URUTAN_SUMBER[i] && BUTUH_GO2RTC.has(URUTAN_SUMBER[i]) && !url?.go2rtc_frame_url) i += 1;
			setMode(URUTAN_SUMBER[i] || "mati");
		},
		[url]
	);

	// AI gagal sebelum URL bertoken tiba → begitu tiba, lanjut ke go2rtc.
	useEffect(() => {
		if (url?.go2rtc_frame_url) setMode((m) => (m === "mati" ? "mse" : m));
	}, [url]);

	// Mode MSE: sambungkan <video>; tidak tampil dalam batas waktu → sumber berikutnya.
	useEffect(() => {
		if (mode !== "mse" || !url?.go2rtc_frame_url) return undefined;
		let hidup = true;
		const pengawas = setTimeout(() => {
			if (hidup && !selesaiRef.current) sumberBerikut("mse");
		}, BATAS_MSE_MS);
		const putus = sambungMse(urlWs(url), mseRef.current, () => {
			if (hidup) sumberBerikut("mse");
		});
		return () => {
			hidup = false;
			clearTimeout(pengawas);
			putus();
		};
	}, [mode, url, sumberBerikut]);

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

	const cobaLagi = async () => {
		matikanWebRtc();
		setSelesaiMuat(false);
		await muatUrl(); // token media mungkin sudah kedaluwarsa
		setMode("mse");
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
			toast.error(`WebRTC gagal: ${err.message}. Kembali ke aliran biasa.`);
			setMode("mse");
		});
	};

	const kembaliGambar = () => {
		matikanWebRtc();
		setSelesaiMuat(false);
		setMode("mse");
	};

	const gantiDeteksi = () => {
		matikanWebRtc();
		setSelesaiMuat(false);
		setMode((m) => (m === "ai" ? "mse" : "ai"));
	};

	const nonaktif = kamera.status !== "active";
	const srcGambar =
		mode === "ai"
			? url?.ai_mjpeg_url
			: mode === "go2rtc"
				? url?.go2rtc_mjpeg_url
				: mode === "bingkai" && url?.go2rtc_frame_url
					? `${url.go2rtc_frame_url}&_=${detak}`
					: null;

	return (
		<div className={`group overflow-hidden rounded-xl ${ringkas ? "bg-slate-900 ring-1 ring-white/10" : "border border-slate-200 bg-white shadow-sm"}`}>
			<div className="relative aspect-video bg-slate-900">
				{srcGambar && !nonaktif && (
					<img
						key={mode}
						src={srcGambar}
						alt={`Kamera ${kamera.name}`}
						className="h-full w-full object-cover"
						onLoad={() => setSelesaiMuat(true)}
						onError={() => {
							// Potret yang sudah pernah tampil boleh gagal sesekali —
							// gambar terakhir tetap dipertahankan.
							if (mode === "bingkai" && selesaiMuat) return;
							sumberBerikut(mode);
						}}
					/>
				)}
				{mode === "mse" && !nonaktif && (
					<video
						ref={mseRef}
						autoPlay
						muted
						playsInline
						className="h-full w-full bg-slate-900 object-cover"
						onLoadedData={() => setSelesaiMuat(true)}
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
				{/* Mode "ai" sudah bergambar kotak sendiri; mode lain diberi lapisan kotak. */}
				{!nonaktif && selesaiMuat && mode !== "ai" && mode !== "mati" && (
					<LapisanDeteksi urlDeteksi={url?.ai_deteksi_url} onTokenBasi={muatUrl} />
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
					<div className="pointer-events-none absolute inset-0 flex items-center justify-center">
						<span className="flex items-center gap-2 rounded-lg bg-black/50 px-3 py-1.5 text-xs font-medium text-white">
							<RefreshCw className="h-3.5 w-3.5 animate-spin" />
							{mode === "webrtc" ? "Menyambung WebRTC…" : "Memuat aliran…"}
						</span>
					</div>
				)}

				{/* Klik gambar = pemutar besar */}
				{onPerbesar && mode !== "mati" && (
					<button
						type="button"
						onClick={onPerbesar}
						aria-label={`Perbesar kamera ${kamera.name}`}
						className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition hover:bg-black/30 hover:opacity-100 focus-visible:opacity-100"
					>
						<span className="flex items-center gap-1.5 rounded-lg bg-black/60 px-3 py-1.5 text-xs font-semibold text-white">
							<Maximize2 className="h-3.5 w-3.5" />
							Perbesar
						</span>
					</button>
				)}

				<div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5">
					<span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
						{kamera.lokasi || "Tanpa lokasi"}
					</span>
					{selesaiMuat && LABEL_SUMBER[mode] && (
						<span className="flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-slate-200" title="Sumber gambar">
							{mode === "mse" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />}
							{LABEL_SUMBER[mode]}
						</span>
					)}
					{peristiwaTerbaru && (
						<span className="flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
							<AlertTriangle className="h-3 w-3" />
							{LABEL_PERISTIWA[peristiwaTerbaru.type] || peristiwaTerbaru.type}
						</span>
					)}
				</div>
				{ringkas && (
					<div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-1.5 pt-6">
						<p className="truncate text-xs font-semibold text-white">{kamera.name}</p>
					</div>
				)}
			</div>
			{!ringkas && (
				<div className="flex items-center justify-between gap-2 px-3 py-2.5">
					<div className="min-w-0">
						<p className="truncate text-sm font-semibold text-slate-900">{kamera.name}</p>
						<LabelStatus status={kamera.status} />
					</div>
					<div className="flex flex-shrink-0 items-center gap-1">
						{onPerbesar && (
							<button
								onClick={onPerbesar}
								title="Perbesar"
								className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
							>
								<Maximize2 className="h-4 w-4" />
							</button>
						)}
						{!nonaktif && url?.ai_mjpeg_url && (
							<button
								onClick={gantiDeteksi}
								title={mode === "ai" ? "Kembali ke video langsung" : "Tampilan deteksi AI: kotak orang & wajah"}
								className={`rounded-lg p-1.5 transition-colors ${mode === "ai" ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-100 hover:text-slate-900"}`}
							>
								<ScanSearch className="h-4 w-4" />
							</button>
						)}
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
							<button onClick={kembaliGambar} title="Kembali ke aliran biasa" className="rounded-lg bg-slate-900 p-1.5 text-white">
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
			)}
		</div>
	);
};

/**
 * Pemutar besar satu kamera: video langsung (MSE), bila gagal potret tiap
 * detik. ←/→ pindah kamera, F layar penuh, Esc tutup.
 */
const PemutarBesar = ({ daftar, indeks, onGanti, onTutup }) => {
	const kamera = daftar[indeks];
	const [url, setUrl] = useState(null);
	const [mode, setMode] = useState("mse"); // mse | potret | mati
	const [tampil, setTampil] = useState(false);
	const [detak, setDetak] = useState(0);
	const [penuh, setPenuh] = useState(false);
	const wadahRef = useRef(null);
	const videoRef = useRef(null);
	const tampilRef = useRef(false);

	useEffect(() => {
		tampilRef.current = tampil;
	}, [tampil]);

	useEffect(() => {
		let batal = false;
		setUrl(null);
		setMode("mse");
		setTampil(false);
		getStreamUrl(kamera.id)
			.then((r) => {
				if (!batal) setUrl(r.data.data || null);
			})
			.catch(() => {
				if (!batal) setMode("mati");
			});
		return () => {
			batal = true;
		};
	}, [kamera.id]);

	useEffect(() => {
		if (mode !== "mse" || !url) return undefined;
		if (!url.go2rtc_frame_url) {
			setMode("mati");
			return undefined;
		}
		let hidup = true;
		const pengawas = setTimeout(() => {
			if (hidup && !tampilRef.current) setMode("potret");
		}, BATAS_MSE_MS);
		const putus = sambungMse(urlWs(url), videoRef.current, () => {
			if (hidup) setMode("potret");
		});
		return () => {
			hidup = false;
			clearTimeout(pengawas);
			putus();
		};
	}, [mode, url]);

	useEffect(() => {
		if (mode !== "potret") return undefined;
		const jeda = setInterval(() => setDetak((d) => d + 1), 1000);
		return () => clearInterval(jeda);
	}, [mode]);

	const alihPenuh = useCallback(() => {
		if (document.fullscreenElement) document.exitFullscreen?.();
		else wadahRef.current?.requestFullscreen?.();
	}, []);

	useEffect(() => {
		const ubah = () => setPenuh(Boolean(document.fullscreenElement));
		document.addEventListener("fullscreenchange", ubah);
		return () => document.removeEventListener("fullscreenchange", ubah);
	}, []);

	useEffect(() => {
		const dengar = (e) => {
			if (e.key === "Escape" && !document.fullscreenElement) onTutup();
			else if (e.key === "ArrowRight") onGanti((indeks + 1) % daftar.length);
			else if (e.key === "ArrowLeft") onGanti((indeks - 1 + daftar.length) % daftar.length);
			else if (e.key === "f" || e.key === "F") alihPenuh();
		};
		window.addEventListener("keydown", dengar);
		const semula = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		return () => {
			window.removeEventListener("keydown", dengar);
			document.body.style.overflow = semula;
		};
	}, [indeks, daftar.length, onGanti, onTutup, alihPenuh]);

	return (
		<div className="fixed inset-0 z-[90] flex flex-col bg-slate-950/95 backdrop-blur-sm">
			<div className="flex shrink-0 items-center justify-between gap-3 px-4 py-3 text-white sm:px-6">
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold">{kamera.name}</p>
					<p className="text-[11px] text-slate-400">
						{kamera.lokasi || "Tanpa lokasi"} · Kamera {indeks + 1} dari {daftar.length}
						{tampil && mode === "mse" && " · siaran langsung"}
						{tampil && mode === "potret" && " · potret tiap detik"}
					</p>
				</div>
				<div className="flex shrink-0 items-center gap-1.5">
					<button type="button" onClick={alihPenuh} title="Layar penuh (F)" className="rounded-lg bg-white/10 p-2 ring-1 ring-white/15 hover:bg-white/20">
						{penuh ? <Minimize2 className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
					</button>
					<button type="button" onClick={onTutup} title="Tutup (Esc)" className="rounded-lg bg-white/10 p-2 ring-1 ring-white/15 hover:bg-white/20">
						<X className="h-4 w-4" />
					</button>
				</div>
			</div>

			<div ref={wadahRef} className="relative flex min-h-0 flex-1 items-center justify-center bg-black px-2 pb-2 sm:px-6 sm:pb-6">
				{mode === "mse" && (
					// Pembungkus seukuran video supaya lapisan kotak (object-contain → "meet") tepat di atasnya.
					<div className="relative h-full w-full">
						<video
							key={kamera.id}
							ref={videoRef}
							autoPlay
							muted
							playsInline
							onLoadedData={() => setTampil(true)}
							className="h-full w-full rounded-lg bg-black object-contain"
						/>
						{tampil && <LapisanDeteksi urlDeteksi={url?.ai_deteksi_url} cocok="meet" />}
					</div>
				)}
				{mode === "potret" && url?.go2rtc_frame_url && (
					<img
						src={`${url.go2rtc_frame_url}&_=${detak}`}
						alt={`Kamera ${kamera.name}`}
						onLoad={() => setTampil(true)}
						className="h-full w-full rounded-lg object-contain"
					/>
				)}
				{mode === "mati" && (
					<div className="flex flex-col items-center gap-2 text-center text-slate-400">
						<CameraOff className="h-8 w-8" />
						<p className="text-sm">Aliran kamera ini belum tersedia.</p>
					</div>
				)}
				{!tampil && mode !== "mati" && (
					<span className="pointer-events-none absolute flex items-center gap-2 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium text-white">
						<RefreshCw className="h-3.5 w-3.5 animate-spin" />
						Menyambung…
					</span>
				)}
				{daftar.length > 1 && (
					<>
						<button
							type="button"
							onClick={() => onGanti((indeks - 1 + daftar.length) % daftar.length)}
							title="Kamera sebelumnya (←)"
							className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white ring-1 ring-white/15 hover:bg-white/25 sm:left-8"
						>
							<ChevronLeft className="h-5 w-5" />
						</button>
						<button
							type="button"
							onClick={() => onGanti((indeks + 1) % daftar.length)}
							title="Kamera berikutnya (→)"
							className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white ring-1 ring-white/15 hover:bg-white/25 sm:right-8"
						>
							<ChevronRight className="h-5 w-5" />
						</button>
					</>
				)}
			</div>
		</div>
	);
};

// Tata letak grid. "auto" = mengikuti lebar layar.
const TATA_LETAK = {
	auto: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
	1: "grid-cols-1",
	2: "grid-cols-1 sm:grid-cols-2",
	3: "grid-cols-2 lg:grid-cols-3",
	4: "grid-cols-2 lg:grid-cols-4",
};
const KUNCI_TATA_LETAK = "cctv-tata-letak";

const CctvLivePage = () => {
	const location = useLocation();
	const dasar = location.pathname.startsWith("/superadmin") ? "/superadmin" : "/dpmd";
	const [kamera, setKamera] = useState([]);
	const [memuat, setMemuat] = useState(true);
	const [besar, setBesar] = useState(null); // indeks kamera di pemutar besar
	const [tataLetak, setTataLetak] = useState(() => {
		try {
			const simpan = localStorage.getItem(KUNCI_TATA_LETAK);
			return TATA_LETAK[simpan] ? simpan : "auto";
		} catch {
			return "auto";
		}
	});
	const [dinding, setDinding] = useState(false);
	const dindingRef = useRef(null);
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

	const pilihTataLetak = (nilai) => {
		setTataLetak(nilai);
		try {
			localStorage.setItem(KUNCI_TATA_LETAK, nilai);
		} catch {
			/* penyimpanan tidak tersedia */
		}
	};

	// Mode dinding = grid memenuhi layar (Fullscreen API) dengan latar gelap.
	const alihDinding = () => {
		if (document.fullscreenElement) document.exitFullscreen?.();
		else dindingRef.current?.requestFullscreen?.();
	};
	useEffect(() => {
		const ubah = () => setDinding(Boolean(dindingRef.current) && document.fullscreenElement === dindingRef.current);
		document.addEventListener("fullscreenchange", ubah);
		return () => document.removeEventListener("fullscreenchange", ubah);
	}, []);

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
	const tutupBesar = useCallback(() => setBesar(null), []);

	return (
		<div className="rounded-xl border border-slate-200 bg-white p-5">
			<div className="mb-4 flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="text-base font-semibold text-slate-900">Live Grid</h2>
					<p className="text-sm text-slate-500">
						{kamera.length} kamera terdaftar · {aktif} aktif
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<div className="inline-flex items-center gap-0.5 rounded-lg border border-slate-200 p-0.5" role="group" aria-label="Tata letak grid">
						<LayoutGrid className="mx-1.5 h-4 w-4 text-slate-400" />
						{Object.keys(TATA_LETAK).map((k) => (
							<button
								key={k}
								type="button"
								onClick={() => pilihTataLetak(k)}
								title={k === "auto" ? "Otomatis mengikuti lebar layar" : `${k} kolom`}
								className={`rounded-md px-2 py-1 text-xs font-semibold transition-colors ${
									tataLetak === k ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
								}`}
							>
								{k === "auto" ? "Auto" : k}
							</button>
						))}
					</div>
					<button
						onClick={alihDinding}
						disabled={!kamera.length}
						title="Tampilkan semua kamera memenuhi layar"
						className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50"
					>
						<Expand className="h-4 w-4" />
						Mode dinding
					</button>
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
				<div ref={dindingRef} className={dinding ? "h-full overflow-auto bg-slate-950 p-3" : ""}>
					{dinding && (
						<div className="mb-2 flex items-center justify-between px-1 text-white">
							<p className="text-sm font-semibold">Smart CCTV · {aktif} kamera aktif</p>
							<button
								type="button"
								onClick={alihDinding}
								className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-xs font-semibold ring-1 ring-white/15 hover:bg-white/20"
							>
								<Minimize2 className="h-3.5 w-3.5" />
								Keluar (Esc)
							</button>
						</div>
					)}
					<div className={`grid ${dinding ? "gap-2" : "gap-4"} ${TATA_LETAK[tataLetak]}`}>
						{kamera.map((k, i) => (
							<KartuKamera
								key={k.id}
								kamera={k}
								peristiwaTerbaru={alertPerKamera.get(String(k.id))}
								dasar={dasar}
								ringkas={dinding}
								onPerbesar={dinding ? undefined : () => setBesar(i)}
							/>
						))}
					</div>
				</div>
			)}

			{besar !== null && kamera[besar] && (
				<PemutarBesar daftar={kamera} indeks={besar} onGanti={setBesar} onTutup={tutupBesar} />
			)}
		</div>
	);
};

export default CctvLivePage;
