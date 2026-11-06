import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { ASAL_SERVER } from "../utils/asalServer";
import { ambilToken } from "../utils/tokenSesi";

// Elemen berkelas ini diganti kotak kosong di layar yang ditonton (pesan pribadi, dll).
const KELAS_BLOKIR_CERMIN = "rahasia-cermin";

const AMBANG_DIAM_MS = 60 * 1000;

/**
 * Sisi pengguna dari cermin layar. Memegang satu soket diam; rrweb baru menyala saat
 * server berkata ada yang menonton, dan mati lagi begitu penonton terakhir pergi. Inilah
 * yang membedakan "bisa ditonton saat diperiksa" dari "layar semua orang direkam".
 *
 * Penyelubungan harus di sini, sebelum bingkainya lahir, karena server hanya menyalurkan:
 * semua isian jadi titik-titik tanpa perlu didaftar satu per satu, sebab daftar akan selalu
 * ketinggalan kolom baru. Hanya tab yang terlihat yang merekam: dua tab sekaligus membuat
 * bingkainya bercampur, dan tab di latar memang tidak sedang dilihat siapa pun.
 */
export default function CerminSubjek() {
	const { user, expressToken } = useAuth();
	const peran = user?.role;

	useEffect(() => {
		const token = ambilToken();
		// layar sesama superadmin tidak bisa ditonton, jadi tak perlu soket
		if (!token || token === "VPN_ACCESS_TOKEN" || peran === "superadmin") return;

		let dibuang = false;
		let soket = null;
		let diminta = false;
		let hentikanRekam = null;
		let hentikanLapor = null;

		const lapor = (jenis, isi = {}) => soket?.connected && soket.emit("aktivitas", { jenis, waktu: Date.now(), ...isi });

		const matikanRekam = () => {
			hentikanRekam?.();
			hentikanRekam = null;
		};

		const nyalakanRekam = async () => {
			if (hentikanRekam || !diminta || document.visibilityState !== "visible") return;
			let record;
			try {
				({ record } = await import("rrweb"));
			} catch {
				return;
			}
			// selama pustakanya diunduh, penonton bisa saja sudah pergi
			if (dibuang || hentikanRekam || !diminta || document.visibilityState !== "visible") return;
			hentikanRekam = record({
				emit: (bingkai) => soket?.connected && soket.emit("bingkai", bingkai),
				maskAllInputs: true,
				maskInputFn: () => "•••",
				blockClass: KELAS_BLOKIR_CERMIN,
				sampling: { mousemove: 50, scroll: 100, input: "last" },
				// bingkai penuh berkala: penonton yang bergabung di tengah butuh titik mula
				checkoutEveryNms: 30000,
			});
		};

		const mulaiLapor = () => {
			if (hentikanLapor) return;
			let halaman = "";
			let sentuhTerakhir = Date.now();
			let diam = false;
			const periksa = () => {
				if (location.pathname !== halaman) {
					halaman = location.pathname;
					lapor("halaman", { path: halaman, judul: document.title });
				}
				if (!diam && Date.now() - sentuhTerakhir > AMBANG_DIAM_MS) {
					diam = true;
					lapor("diam");
				}
			};
			const disentuh = () => {
				sentuhTerakhir = Date.now();
				if (diam) {
					diam = false;
					lapor("aktif");
				}
			};
			const sentuhan = ["pointerdown", "keydown", "scroll", "wheel"];
			sentuhan.forEach((e) => document.addEventListener(e, disentuh, { passive: true }));
			const jam = setInterval(periksa, 1000);
			periksa();
			lapor("tab", { terlihat: document.visibilityState === "visible" });
			hentikanLapor = () => {
				clearInterval(jam);
				sentuhan.forEach((e) => document.removeEventListener(e, disentuh));
				hentikanLapor = null;
			};
		};

		const berubahTerlihat = () => {
			if (!diminta) return;
			const terlihat = document.visibilityState === "visible";
			lapor("tab", { terlihat });
			if (terlihat) nyalakanRekam();
			else matikanRekam();
		};
		document.addEventListener("visibilitychange", berubahTerlihat);

		const berhenti = () => {
			diminta = false;
			matikanRekam();
			hentikanLapor?.();
		};

		import("socket.io-client").then(({ io }) => {
			if (dibuang) return;
			soket = io(`${ASAL_SERVER}/cermin`, { auth: { token }, transports: ["polling", "websocket"] });
			soket.on("mulai-rekam", () => {
				diminta = true;
				mulaiLapor();
				nyalakanRekam();
			});
			soket.on("henti-rekam", berhenti);
			soket.on("disconnect", berhenti);
		});

		return () => {
			dibuang = true;
			berhenti();
			document.removeEventListener("visibilitychange", berubahTerlihat);
			soket?.disconnect();
		};
	}, [expressToken, peran]);

	return null;
}
