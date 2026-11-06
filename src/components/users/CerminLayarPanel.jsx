import { useEffect, useRef, useState } from "react";
import { Replayer } from "rrweb";
import "rrweb/dist/style.css";
import { io } from "socket.io-client";
import { LuMonitor, LuShieldAlert, LuSmartphone } from "react-icons/lu";
import { ASAL_SERVER } from "../../utils/asalServer";
import { ambilToken } from "../../utils/tokenSesi";

const JENIS_META = 4; // EventType.Meta rrweb: pembuka siaran, membawa ukuran layar
const BATAS_LEBAR_HP = 700;

const LENCANA = {
	menyambung: ["Menyambung…", "bg-amber-100 text-amber-700"],
	menunggu: ["Belum bisa ditonton", "bg-slate-100 text-slate-600"],
	tersambung: ["Siaran langsung", "bg-emerald-100 text-emerald-700"],
	ditolak: ["Ditolak", "bg-rose-100 text-rose-700"],
	putus: ["Sambungan terputus", "bg-rose-100 text-rose-700"],
};

/**
 * Sisi superadmin dari cermin layar. Yang tampil bukan video, melainkan DOM yang dibangun
 * ulang dari bingkai rrweb, di dalam bingkai monitor atau HP sesuai perangkat pengguna.
 * Tidak ada tombol rekam dan tidak ada yang tersimpan: menutup panel ini memutus siaran.
 */
export default function CerminLayarPanel({ user }) {
	const wadahRef = useRef(null);
	const kolomRef = useRef(null);
	const replayerRef = useRef(null);
	const [keadaan, setKeadaan] = useState("menyambung");
	const [alasan, setAlasan] = useState(null);
	const [ukuran, setUkuran] = useState(null);
	const [ruang, setRuang] = useState({ lebar: 0, tinggi: 0 });
	const [halaman, setHalaman] = useState(null);
	const [tabTerlihat, setTabTerlihat] = useState(null);
	const [diam, setDiam] = useState(false);

	const hp = ukuran ? ukuran.lebar < BATAS_LEBAR_HP : user.last_login?.device_type === "mobile";

	useEffect(() => {
		const soket = io(`${ASAL_SERVER}/cermin`, { auth: { token: ambilToken(), peran: "tonton" }, transports: ["polling", "websocket"] });
		const akhiriReplayer = () => {
			try {
				replayerRef.current?.destroy();
			} catch {
				// replayer yang belum sempat jalan tidak perlu dihentikan
			}
			replayerRef.current = null;
		};

		soket.on("connect", () => {
			soket.emit("tonton", { userId: user.id }, (jawab) => {
				if (!jawab?.ok) {
					setAlasan(jawab?.alasan || "Ditolak server");
					setKeadaan("ditolak");
				} else setKeadaan(jawab.subjekTersambung ? "menyambung" : "menunggu");
			});
		});
		soket.on("connect_error", () => setKeadaan("putus"));
		soket.on("disconnect", () => setKeadaan((k) => (k === "ditolak" ? k : "putus")));
		soket.on("subjek-hadir", () => setKeadaan("menyambung"));
		soket.on("subjek-pergi", () => {
			setKeadaan("menunggu");
			akhiriReplayer();
		});
		soket.on("aktivitas", (a) => {
			if (a.jenis === "halaman") setHalaman(a.path);
			if (a.jenis === "tab") setTabTerlihat(a.terlihat);
			if (a.jenis === "diam") setDiam(true);
			if (a.jenis === "aktif") setDiam(false);
		});
		soket.on("bingkai", (bingkai) => {
			// replayer menuntut pembuka sebagai titik mula; penonton yang masuk di tengah menunggu pembuka berikutnya
			if (!replayerRef.current) {
				if (bingkai.type !== JENIS_META || !wadahRef.current) return;
				if (bingkai.data?.width) setUkuran({ lebar: bingkai.data.width, tinggi: bingkai.data.height });
				const r = new Replayer([bingkai], { root: wadahRef.current, liveMode: true, mouseTail: false });
				r.on("resize", (d) => d?.width && setUkuran({ lebar: d.width, tinggi: d.height }));
				r.startLive(bingkai.timestamp);
				replayerRef.current = r;
			} else replayerRef.current.addEvent(bingkai);
			setKeadaan("tersambung");
		});

		return () => {
			soket.disconnect();
			akhiriReplayer();
		};
	}, [user.id]);

	useEffect(() => {
		const kolom = kolomRef.current;
		if (!kolom) return undefined;
		const ukur = () => setRuang({ lebar: kolom.clientWidth, tinggi: kolom.clientHeight });
		ukur();
		const pengamat = new ResizeObserver(ukur);
		pengamat.observe(kolom);
		return () => pengamat.disconnect();
	}, []);

	// Bezel, kaki monitor: ruang yang tidak tersedia untuk layar.
	const lebarBingkai = hp ? 20 : 24;
	const tinggiBingkai = hp ? 20 : 54;
	const skala = ukuran
		? Math.min(1, (ruang.lebar - lebarBingkai) / ukuran.lebar, (ruang.tinggi - tinggiBingkai) / ukuran.tinggi)
		: 1;

	// Yang disentuh hanya tampilannya: mengubah lebar iframe berarti mengubah tata letak
	// yang diamati, dan yang ditonton bukan lagi layar orang itu.
	useEffect(() => {
		const wrapper = replayerRef.current?.wrapper;
		if (!wrapper) return;
		wrapper.style.transformOrigin = "0 0";
		wrapper.style.transform = `scale(${skala})`;
	}, [skala, keadaan, ukuran]);

	const [teks, warna] = LENCANA[keadaan];
	// soket tersambung tapi tab di latar: rrweb sengaja tidak jalan, jadi tidak akan ada bingkai
	const tabDiLatar = keadaan === "menyambung" && tabTerlihat === false;
	const Ikon = hp ? LuSmartphone : LuMonitor;
	const layarGaya = ukuran ? { width: ukuran.lebar * skala, height: ukuran.tinggi * skala } : hp ? { width: 220, height: 420 } : { width: "100%", height: 340 };

	return (
		<div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-3">
			<div className="flex shrink-0 flex-wrap items-center gap-2">
				<span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${warna}`}>{keadaan === "ditolak" && alasan ? alasan : teks}</span>
				{ukuran && (
					<span className="flex items-center gap-1 text-xs text-slate-500">
						<Ikon className="h-3.5 w-3.5" /> {hp ? "HP" : "Monitor"} {ukuran.lebar}×{ukuran.tinggi}
					</span>
				)}
				{tabTerlihat === false && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Tab di latar</span>}
				{diam && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Sedang diam</span>}
				{halaman && <span className="ml-auto truncate font-mono text-[11px] text-slate-400">{halaman}</span>}
			</div>

			<div ref={kolomRef} className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl bg-slate-100 p-1">
				<div className={`relative overflow-hidden bg-white ${hp ? "rounded-[1.6rem] border-[10px] border-slate-900" : "rounded-lg border-[12px] border-b-[14px] border-slate-800"}`} style={layarGaya}>
					{/* iframe rrweb menangkap tetikus; ini jendela pengawasan, bukan remote desktop */}
					<div ref={wadahRef} className="pointer-events-none absolute left-0 top-0" />
					{keadaan !== "tersambung" && (
						<div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center text-slate-400">
							<Ikon className="h-9 w-9" />
							<p className="m-0 text-sm font-medium">{tabDiLatar ? "Aplikasi sedang di latar" : keadaan === "ditolak" && alasan ? alasan : teks}</p>
							{tabDiLatar && <p className="m-0 text-xs">Layar muncul begitu pengguna kembali ke tab aplikasi.</p>}
							{keadaan === "menunggu" && (
								<p className="m-0 max-w-sm text-xs">
									Aplikasi di perangkatnya belum versi terbaru, atau sedang tidak dibuka. Layar muncul sendiri setelah ia memperbarui lewat banner update atau memuat ulang halaman.
								</p>
							)}
						</div>
					)}
				</div>
				{!hp && (
					<>
						<div className="h-3 w-16 shrink-0 bg-slate-700" />
						<div className="h-1.5 w-32 shrink-0 rounded-full bg-slate-700" />
					</>
				)}
			</div>

			{/* sengaja tidak bisa ditutup: yang menonton layar orang lain harus terus melihat batas wewenangnya */}
			<p className="m-0 flex shrink-0 items-start gap-1.5 text-[11px] leading-snug text-amber-700">
				<LuShieldAlert className="mt-px h-3.5 w-3.5 shrink-0" />
				Isian seperti sandi tampil sebagai titik-titik dan memang tidak pernah dikirim. Tidak ada yang direkam. Sesi menonton ini tercatat atas nama Anda.
			</p>
		</div>
	);
}
