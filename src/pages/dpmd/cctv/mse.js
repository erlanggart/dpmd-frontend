// Pemutar MSE go2rtc bersama untuk live view & pemutaran ulang Smart CCTV.

// ---------------------------------------------------------------------------
// MSE lewat WebSocket go2rtc: klien mengirim daftar kodek yang didukung,
// go2rtc menjawab tipe MIME lalu mengalirkan potongan fMP4.
// ---------------------------------------------------------------------------
const KODEK_MSE = ["avc1.640029", "avc1.64002A", "avc1.640033", "hvc1.1.6.L153.B0", "mp4a.40.2", "mp4a.40.5", "flac", "opus"];
const kodekDidukung = () =>
	KODEK_MSE.filter((k) => window.MediaSource?.isTypeSupported(`video/mp4; codecs="${k}"`)).join(",");

/** URL WebSocket bertoken, diturunkan dari URL potret go2rtc dari stream-url. */
export const urlWs = (u) => {
	if (!u?.go2rtc_frame_url) return null;
	const alamat = new URL(u.go2rtc_frame_url.replace("/api/frame.jpeg", "/api/ws"), window.location.origin);
	alamat.protocol = alamat.protocol === "https:" ? "wss:" : "ws:";
	return alamat.toString();
};

/**
 * Sambungkan <video> ke go2rtc lewat MSE. Mengembalikan fungsi pembersih.
 * ikutiUjung: siaran langsung selalu dikejar ke ujung (live); pemutaran ulang
 * rekaman boleh dijeda sehingga tidak dikejar.
 */
export const sambungMse = (wsUrl, video, onGagal, { ikutiUjung = true } = {}) => {
	if (!window.MediaSource || !wsUrl || !video) {
		onGagal?.(new Error("MSE tidak didukung"));
		return () => {};
	}
	let ws = null;
	let sb = null;
	let selesai = false;
	const antre = [];
	const gagal = (err) => {
		if (!selesai) onGagal?.(err);
	};
	const ms = new MediaSource();
	video.src = URL.createObjectURL(ms);

	ms.addEventListener(
		"sourceopen",
		() => {
			URL.revokeObjectURL(video.src);
			ws = new WebSocket(wsUrl);
			ws.binaryType = "arraybuffer";
			ws.onopen = () => ws.send(JSON.stringify({ type: "mse", value: kodekDidukung() }));
			ws.onmessage = (ev) => {
				if (typeof ev.data === "string") {
					let pesan = null;
					try {
						pesan = JSON.parse(ev.data);
					} catch {
						return;
					}
					if (pesan.type === "mse" && !sb) {
						try {
							sb = ms.addSourceBuffer(pesan.value);
						} catch (err) {
							gagal(err);
							return;
						}
						sb.mode = "segments";
						sb.addEventListener("updateend", () => {
							if (sb.updating) return;
							try {
								if (antre.length) {
									sb.appendBuffer(antre.shift());
									return;
								}
								// Buang buffer lama dan tetap di ujung siaran langsung.
								const b = sb.buffered;
								if (b.length) {
									const akhir = b.end(b.length - 1);
									if (akhir - b.start(0) > (ikutiUjung ? 30 : 120)) sb.remove(b.start(0), akhir - (ikutiUjung ? 10 : 60));
									if (ikutiUjung && akhir - video.currentTime > 2.5) video.currentTime = akhir - 0.5;
								}
							} catch {
								/* buffer sedang dibongkar — abaikan */
							}
						});
					} else if (pesan.type === "error") {
						gagal(new Error(pesan.value));
					}
					return;
				}
				if (!sb) return;
				if (sb.updating || antre.length) {
					if (antre.length < 60) antre.push(ev.data);
				} else {
					try {
						sb.appendBuffer(ev.data);
					} catch (err) {
						gagal(err);
					}
				}
			};
			ws.onerror = () => gagal(new Error("WebSocket gagal"));
			ws.onclose = () => gagal(new Error("Sambungan terputus"));
		},
		{ once: true }
	);
	video.play?.().catch(() => {});

	return () => {
		selesai = true;
		try {
			ws?.close();
		} catch {
			/* sudah tertutup */
		}
		video.removeAttribute("src");
		video.load?.();
	};
};
