import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { jagaKonteks } from "../scene/jagaKonteks";
import { AnimatePresence, motion } from "framer-motion";
import { FiArrowLeft, FiMessageSquare, FiSend, FiX } from "react-icons/fi";
import { kendali } from "../jelajahStore";
import { kirimUcap, pindahDunia, useMultipemain } from "../multipemain";
import { useKoleksi } from "../pancing";
import { aturHujan } from "../suaraPancing";
import { aturSuasanaSuara, senyapkanSuasana } from "../suasanaSuara";
import { ubahTenaga, useKabarTenaga, useTenaga } from "../tenaga";
import { KOMODITAS, aksiPetak, animasiKebun, aturKebun, benihDipegang, catat, daftarBenih, hadiahWarga, kebun, pilihBenih, tinggalkanKebun, useKebun } from "../kebun";
import { terapkanTata, titikAbangDesa } from "../scene/kebunDesaData";
import PedagangHujan from "../scene/PedagangHujan";
import PanelPelindung from "../ui/PanelPelindung";
import { catatKunjungan, pendengarRayakan } from "../bangunWilayah";
import { usahaKini } from "../usahaWilayah";
import * as desaHidup from "./desaHidup";
import { malam, masukDesa, rayakan, tangkapAyam, tidurSampaiPagi, useDesa } from "./desaHidup";
import { JamDesa, KartuMisi, LayarTidur, Selebrasi, SpandukAcara } from "../ui/HudDesa";
import HudDemam from "../ui/HudDemam";
import KebunDesa from "../scene/KebunDesa";
import BumdesDesa from "./BumdesDesa";
import HudKebun from "../ui/HudKebun";
import PanelGali from "../ui/PanelGali";
import PanelPengepul from "../ui/PanelPengepul";
import PetaKecamatan from "../ui/PetaKecamatan";
import PanelWarungDesa from "../ui/PanelWarungDesa";
import Joystick from "../ui/Joystick";
import LingkunganDesa from "./LingkunganDesa";
import PemainWilayah from "./PemainWilayah";
import BalonSuasana from "../scene/BalonSuasana";
import PemainLain from "../scene/PemainLain";
import TombolSuara from "../ui/TombolSuara";
import WargaDesa from "./Warga";
import { WARGA_PER_ID, kalimatWarga, posWarga, tempatkanWarga, wargaAktif } from "./wargaDesa";
import { layar, useProyektor } from "./layar";
import { pemainWilayah, uiWilayah, useUiWilayah } from "./uiWilayah";

/*
 * Dunia kecamatan: dunia 3D tersendiri (terpisah dari kantor DPMD) sesuai
 * potensi wilayahnya: tata letak dari nama kecamatan, usaha dari potensinya
 * (bertani, ikan, ternak, wisata, produksi, tambang) yang dikerjakan tokoh
 * pemain sendiri, warga yang bisa diajak ngobrol, warung, pembeli, cuaca, dan
 * tenaga (pingsan = siuman di saung, tetap di desa).
 */

// abang payung ada selama cuaca tidak cerah
const adaMendung = () => kebun.cuaca.jenis !== "cerah";

function labelAksi(dekat) {
	if (!dekat) return null;
	const u = usahaKini();
	if (dekat === "tani:sumur") return { teks: u.sumber.teks, tombol: u.sumber.tombol, warna: "#0284c7" };
	if (dekat === "tani:jual") return { teks: u.pembeli.ajak, tombol: "Jual", warna: "#b45309" };
	if (dekat === "abang") return { teks: "Beli payung / jas hujan dari abang ☂️", tombol: "Beli", warna: "#0369a1" };
	if (dekat === "warung") return { teks: "Belanja di Warung Bu Imas 🏪", tombol: "Belanja", warna: "#be123c" };
	if (dekat === "tidur") return { teks: "Tidur di saung sampai pagi 😴 (tenaga penuh)", tombol: "Tidur", warna: "#4338ca" };
	if (dekat.startsWith("ayam:")) return { teks: "Tangkap ayam! 🐔", tombol: "Tangkap", warna: "#ea580c", darurat: true };
	if (dekat.startsWith("warga:")) {
		const w = WARGA_PER_ID[dekat.slice(6)];
		return { teks: `Ngobrol dengan ${w.nama} 💬`, tombol: "Ngobrol", warna: "#7c3aed" };
	}
	if (dekat.startsWith("tani:petak:")) {
		const a = aksiPetak(+dekat.slice(11));
		if (!a?.jenis) return null;
		const warna = a.jenis === "panen" ? "#ca8a04" : a.darurat ? "#dc2626" : a.jenis === "siram" ? "#0284c7" : "#4d7c0f";
		return { teks: a.label, tombol: a.tombol, warna, darurat: a.darurat };
	}
	return null;
}

// aksi petak boleh berulang saat E ditahan, kecuali Gali Dalam (tiap ayunan harus disengaja)
const bolehUlang = (d) => d?.startsWith("tani:petak:") && aksiPetak(+d.slice(11))?.jenis !== "gali";

const CUACA = { cerah: { ikon: "☀️", nama: "Cerah" }, mendung: { ikon: "⛅", nama: "Mendung" }, hujan: { ikon: "🌧️", nama: "Hujan" } };

/** di dalam Canvas: memindahkan label DOM mengikuti benda 3D */
function Proyektor() {
	useProyektor();
	return null;
}

const daftarkan = (kunci, data) => (el) => {
	if (el) layar.set(kunci, { ...data, el });
	else layar.delete(kunci);
};

export default function DuniaWilayah({ wilayah, penampilan, sentuh, onKeluar, onPindah, onKonteksHilang }) {
	useKebun();
	useUiWilayah();
	useDesa();
	const koin = useKoleksi().poin;
	const tenaga = useTenaga();
	const kabar = useKabarTenaga();
	const [panel, setPanel] = useState(null);
	const [obrolan, setObrolan] = useState(null); // { id, teks, hadiah }
	const [toast, setToast] = useState([]);
	const giliran = useRef({});
	const masukPada = useRef(performance.now());
	const dekatRef = useRef(null);
	dekatRef.current = uiWilayah.dekat;
	const { daftar: tamuLain, obrolan: pesan, status: statusMp } = useMultipemain();
	const [ketik, setKetik] = useState(null);

	// main bareng: pindah ke ruang kecamatan ini, kirim posisi tokoh dunia ini
	useEffect(() => {
		const q = pemainWilayah;
		pindahDunia(wilayah.kecamatan, () => ({ x: +q.x.toFixed(2), y: +(q.y || 0).toFixed(2), z: +q.z.toFixed(2), rot: +q.rot.toFixed(2), pose: q.pose || "jalan", udara: !!q.udara, lari: !!q.lari, pu: q.pose === "panjat" ? q.pu : undefined, pt: q.pose === "panjat" ? q.pt : undefined }));
		return () => pindahDunia(null);
	}, [wilayah.kecamatan]);

	// teman datang/pergi & pesan teman tampil sebagai toast (balonnya di atas kepala)
	const pesanTerakhir = pesan.at(-1);
	const pesanLalu = useRef(pesanTerakhir);
	useEffect(() => {
		if (pesanTerakhir === pesanLalu.current) return;
		pesanLalu.current = pesanTerakhir;
		if (pesanTerakhir && !pesanTerakhir.sendiri) ubahTenaga(0, { teks: pesanTerakhir.sistem ? pesanTerakhir.teks : `💬 ${pesanTerakhir.nama}: ${pesanTerakhir.teks}`, jenis: "info" });
	}, [pesanTerakhir]);

	// tata & kebun kecamatan ini dipasang sebelum isi dunianya dirender
	useMemo(() => {
		terapkanTata(wilayah.kecamatan, ["wisata", "produksi", "tambang"].includes(wilayah.game));
		aturKebun(wilayah);
		tempatkanWarga();
		masukDesa();
	}, [wilayah]);
	// titik abang payung ikut tata kecamatan (dihitung setelah terapkanTata)
	const abangDesa = useMemo(() => [titikAbangDesa()], [wilayah]); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		kendali.aksi = null;
		kendali.teleport = null;
		kendali.arah.x = 0; kendali.arah.y = 0;
		if (import.meta.env.DEV) window.__desa = { kebun, pemainWilayah, posWarga, kendali, desaHidup };
		pendengarRayakan.add(rayakan);
		const h = catatKunjungan(wilayah.kecamatan);
		// useKabarTenaga hanya memegang kabar terakhir, jadi kabar masuk digabung jadi satu toast
		const teks = [kebun.kabarMasuk, h.kas > 0 && `💰 Kas BUMDes terkumpul: 🪙 +${h.kas}`].filter(Boolean).join(" · ");
		if (teks) ubahTenaga(0, { teks, jenis: "baik" });
		kebun.kabarMasuk = null;
		if (h.pertama) rayakan(`📍 Kunjungan perdana: Kec. ${wilayah.kecamatan}`, `🪙 +${h.bonus}`);
		return () => { pendengarRayakan.delete(rayakan); tinggalkanKebun(); };
	}, [wilayah]);

	// suasana desa: angin, kicau burung, jangkrik, desau hujan
	useEffect(() => {
		const t = setInterval(() => {
			const h = kebun.cuaca.hujan;
			const m = malam();
			aturSuasanaSuara({ angin: 0.45 + h * 0.6, burung: h > 0.3 ? 0.05 : 0.9 * (1 - m), jangkrik: 0.1 + m * 0.9 });
			aturHujan(h);
		}, 500);
		return () => { clearInterval(t); senyapkanSuasana(); aturHujan(0); };
	}, []);

	// kabar (panen, cuaca, pingsan, belanja) sebagai tumpukan toast singkat
	useEffect(() => {
		if (!kabar || kabar.id < masukPada.current) return;
		setToast((d) => (d.some((x) => x.id === kabar.id) ? d : [...d.slice(-2), kabar]));
		const t = setTimeout(() => setToast((d) => d.filter((x) => x.id !== kabar.id)), 3400);
		return () => clearTimeout(t);
	}, [kabar]);

	// gelembung obrolan hilang sendiri, atau saat pemain menjauh
	useEffect(() => {
		if (!obrolan) return;
		const t = setInterval(() => {
			const pw = posWarga.get(obrolan.id);
			if (performance.now() > obrolan.sampai || Math.hypot(pw.x - pemainWilayah.x, pw.z - pemainWilayah.z) > 5) setObrolan(null);
		}, 250);
		return () => clearInterval(t);
	}, [obrolan]);

	const ngobrol = (id) => {
		const w = WARGA_PER_ID[id];
		const n = (giliran.current[id] = (giliran.current[id] ?? -1) + 1);
		let teks = kalimatWarga(id, n);
		let hadiah = null;
		if (w.hadiah) {
			const h = hadiahWarga(id, w.hadiah);
			const p = usahaKini().pupuk;
			if (h) hadiah = h.teks || (h.pupuk ? `Ieu, bawa ${h.pupuk} ${p.satuan} ${p.nama}. Gratis! (${p.ikon} +${h.pupuk})` : h.benih ? `Ieu, bibit ${KOMODITAS[h.benih].nama.toLowerCase()} 4 bungkus buat kamu. (${KOMODITAS[h.benih].ikon} +4)` : null);
		}
		if (hadiah) teks = hadiah;
		posWarga.get(id).ngobrol = performance.now() + 6500;
		catat("obrol", { id });
		setObrolan({ id, teks, hadiah: !!hadiah, sampai: performance.now() + 6500, kunci: Date.now() });
	};

	const jalankan = (d) => {
		if (!d) return;
		if (d === "tani:jual") setPanel("pengepul");
		else if (d === "warung") setPanel("warung");
		else if (d === "abang") setPanel("abang");
		else if (d === "tidur") tidurSampaiPagi();
		else if (d.startsWith("ayam:")) tangkapAyam(+d.slice(5));
		else {
			if (d.startsWith("warga:")) ngobrol(d.slice(6));
			kendali.aksi = d;
		}
	};

	useEffect(() => {
		const tekan = (e) => {
			if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName)) return;
			// E ditahan: pekerjaan di petak mengalir terus tanpa menekan berulang
			if (e.code === "KeyE" && !panel && (!e.repeat || bolehUlang(dekatRef.current))) jalankan(dekatRef.current);
			if (e.code === "KeyF" && !panel && !e.repeat) {
				const d = dekatRef.current;
				if (d?.startsWith("tani:petak:") && aksiPetak(+d.slice(11))?.jenis === "gali") kendali.aksi = `tani:angkut:${d.slice(11)}`;
			}
			if (e.code === "Escape" && panel) setPanel(null);
			if (e.code === "KeyM" && !e.repeat) setPanel((p) => (p === "peta" ? null : p || "peta"));
			const angka = /^Digit([1-9])$/.exec(e.code);
			if (angka && !panel) {
				const b = daftarBenih()[+angka[1] - 1];
				if (b) pilihBenih(b);
			}
		};
		window.addEventListener("keydown", tekan);
		return () => window.removeEventListener("keydown", tekan);
	}, [panel]); // eslint-disable-line react-hooks/exhaustive-deps

	// tombol aksi di layar sentuh juga bisa ditahan
	const tahan = useRef(null);
	const lepasTahan = () => { clearInterval(tahan.current); tahan.current = null; };
	const mulaiTahan = () => {
		jalankan(dekatRef.current);
		lepasTahan();
		tahan.current = setInterval(() => { if (bolehUlang(dekatRef.current)) jalankan(dekatRef.current); }, 220);
	};
	useEffect(() => lepasTahan, []);

	const aksi = labelAksi(uiWilayah.dekat);
	// panel Gali Dalam tetap tampil selama animasi (uiWilayah.dekat/depan bisa null saat itu)
	const animasi = animasiKebun();
	const iGali = animasi?.jenis === "gali" ? animasi.petak : aksi && uiWilayah.dekat?.startsWith("tani:petak:") && aksiPetak(+uiWilayah.dekat.slice(11))?.jenis === "gali" ? +uiWilayah.dekat.slice(11) : null;
	const k = KOMODITAS[kebun.komoditas];
	const cuaca = CUACA[kebun.cuaca.jenis];
	const benih = daftarBenih();
	const pegang = benihDipegang();
	const pingsan = tenaga <= 0;

	return (
		<div className="fixed inset-0 z-[60] select-none overflow-hidden bg-[#cfe6f5]">
			<Canvas shadows dpr={[1, 1.5]} camera={{ fov: 50, near: 0.1, far: 900, position: [2, 6, -43] }} onCreated={({ gl }) => jagaKonteks(gl, onKonteksHilang)}>
				<Suspense fallback={null}>
					<LingkunganDesa kecamatan={wilayah.kecamatan} model={k?.model} game={wilayah.game} varian={k?.varian} />
					<KebunDesa />
					<BumdesDesa kecamatan={wilayah.kecamatan} />
					<WargaDesa model={k?.model} />
					<PemainWilayah penampilan={penampilan} />
					<PedagangHujan daftar={abangDesa} hadir={adaMendung} />
					<PemainLain diWilayah />
					<BalonSuasana pemain={pemainWilayah} />
					<Proyektor />
				</Suspense>
			</Canvas>

			{/* label yang menempel di dunia 3D */}
			<div className="pointer-events-none absolute inset-0 overflow-hidden">
				{wargaAktif().map((w) => (
					<div key={w.id} ref={daftarkan(`nama:${w.id}`, { jenis: "nama", id: w.id, tinggi: w.kecil ? 1.55 : 2.2 })} className="absolute left-0 top-0 whitespace-nowrap opacity-0 will-change-transform">
						<span className="rounded-full bg-slate-950/70 px-2 py-0.5 text-[11px] font-bold text-white">{w.nama}</span>
						<span className="ml-1 text-[10px] font-semibold text-white drop-shadow">{w.peran}</span>
					</div>
				))}
				{obrolan && (
					<div key={obrolan.kunci} ref={daftarkan("obrol", { jenis: "obrol", id: obrolan.id, tinggi: WARGA_PER_ID[obrolan.id].kecil ? 1.9 : 2.65 })} className="absolute left-0 top-0 w-[min(18rem,80vw)] opacity-0 will-change-transform">
						<div className={`relative rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug shadow-xl ${obrolan.hadiah ? "bg-amber-50 text-amber-950 ring-2 ring-amber-400" : "bg-white text-slate-800"}`}>
							<b className="mb-0.5 block text-[11px] text-violet-700">{WARGA_PER_ID[obrolan.id].nama}</b>
							{obrolan.hadiah && "🎁 "}{obrolan.teks}
							<span className={`absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 ${obrolan.hadiah ? "bg-amber-50" : "bg-white"}`} />
						</div>
					</div>
				)}
				{kebun.efek.map((e) => (
					<div key={e.id} ref={daftarkan(`efek:${e.id}`, { jenis: "efek", id: e.id })} className="absolute left-0 top-0 whitespace-nowrap opacity-0 will-change-transform">
						<span className="text-[20px] font-black" style={{ color: e.warna, textShadow: "0 2px 0 rgba(0,0,0,.45), 0 0 12px rgba(0,0,0,.35)" }}>{e.teks}</span>
					</div>
				))}
			</div>

			{/* bilah atas */}
			<div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-4">
				<div className="flex gap-2">
					<button type="button" onClick={onKeluar}
						className="pointer-events-auto flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 text-[13px] font-bold text-slate-800 shadow-lg backdrop-blur hover:bg-white">
						<FiArrowLeft aria-label="Kembali ke kantor DPMD" /> <span className="hidden sm:inline">Kembali ke kantor DPMD</span>
					</button>
					<button type="button" onClick={() => setPanel("peta")} title="Peta kecamatan (M)"
						className="pointer-events-auto flex items-center gap-2 rounded-xl bg-white/90 px-3 py-2 text-[13px] font-bold text-slate-800 shadow-lg backdrop-blur hover:bg-white">
						🗺️ <span className="hidden sm:inline">Peta</span>
					</button>
					<TombolSuara />
					{statusMp === "tersambung" && (
						<button type="button" onClick={() => setKetik("")} aria-label="Ngobrol dengan teman di kecamatan ini" title="Ngobrol dengan teman di kecamatan ini"
							className="pointer-events-auto flex h-10 items-center gap-1.5 rounded-xl bg-white/90 px-2.5 text-[13px] font-bold text-slate-800 shadow-lg backdrop-blur hover:bg-white">
							<FiMessageSquare /> <span className="tabular-nums">{tamuLain.length + 1}</span>
						</button>
					)}
				</div>
				<div className="flex flex-wrap items-center justify-end gap-2">
					<JamDesa />
					<span className="hidden rounded-xl bg-slate-950/75 px-3 py-2 text-[13px] font-bold text-white shadow-lg backdrop-blur sm:inline" title="Cuaca">{cuaca.ikon} {cuaca.nama}</span>
					<span className="hidden rounded-xl bg-slate-950/75 px-3 py-2 text-[13px] font-bold text-white shadow-lg backdrop-blur sm:inline">Kec. {wilayah.kecamatan}</span>
					<span className="hidden rounded-xl bg-amber-400 px-3 py-2 text-[13px] font-extrabold text-slate-900 shadow-lg sm:inline">🪙 {koin}</span>
				</div>
			</div>

			{ketik !== null && (
				<form
					className="absolute inset-x-3 top-[3.75rem] z-20 flex gap-2 sm:left-4 sm:right-auto sm:w-96"
					onSubmit={(e) => {
						e.preventDefault();
						kirimUcap(ketik);
						setKetik(null);
					}}
				>
					<input autoFocus value={ketik} onChange={(e) => setKetik(e.target.value.slice(0, 120))} onKeyDown={(e) => e.key === "Escape" && setKetik(null)} onBlur={() => !ketik && setKetik(null)}
						maxLength={120} placeholder={`Tulis pesan untuk teman di ${wilayah.kecamatan}…`} aria-label="Pesan obrolan"
						className="min-w-0 flex-1 rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-lg outline-none ring-2 ring-sky-500" />
					<button type="submit" aria-label="Kirim" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white shadow-lg"><FiSend /></button>
				</form>
			)}

			<HudKebun />
			<div className="absolute right-3 top-[5.25rem] sm:right-4 sm:top-[4.5rem]"><KartuMisi /></div>
			<div className="pointer-events-none absolute inset-x-0 top-[3.6rem] flex justify-center sm:top-3"><SpandukAcara /></div>
			<Selebrasi />
			<LayarTidur />

			<HudDemam />

			{/* toast kabar */}
			<div className="pointer-events-none absolute inset-x-0 top-[8.5rem] flex flex-col items-center gap-1.5 px-4 sm:top-[7rem]">
				<AnimatePresence>
					{toast.map((t) => (
						<motion.p key={t.id} initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }}
							className={`m-0 max-w-md rounded-full px-4 py-1.5 text-center text-[13px] font-bold shadow-lg ${t.jenis === "buruk" ? "bg-rose-600 text-white" : t.jenis === "baik" ? "bg-emerald-600 text-white" : "bg-slate-900/85 text-white"}`}>
							{t.teks}
						</motion.p>
					))}
				</AnimatePresence>
			</div>

			{/* bawah: benih yang dipegang + tombol aksi */}
			<div className={`pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 px-4 ${sentuh ? "pb-[max(10.5rem,calc(env(safe-area-inset-bottom)+9.5rem))]" : "pb-6"}`}>
				{iGali != null && !panel && <PanelGali i={iGali} sentuh={sentuh} onGali={() => (kendali.aksi = `tani:petak:${iGali}`)} onAngkut={() => (kendali.aksi = `tani:angkut:${iGali}`)} />}
				{aksi && iGali == null && !panel && (
					<button type="button" onPointerDown={mulaiTahan} onPointerUp={lepasTahan} onPointerLeave={lepasTahan} onClick={(e) => e.detail === 0 && jalankan(uiWilayah.dekat)}
						className={`pointer-events-auto flex max-w-full items-center gap-3 rounded-2xl bg-white py-2 pl-2 pr-4 text-left shadow-xl ring-1 ring-black/5 active:scale-95 ${aksi.darurat ? "animate-pulse ring-2 ring-rose-400" : ""}`}>
						<span className="flex h-10 min-w-10 items-center justify-center rounded-xl px-2.5 text-[14px] font-extrabold text-white" style={{ background: aksi.warna }}>
							{sentuh ? aksi.tombol : "E"}
						</span>
						<span className="truncate text-[14px] font-semibold text-slate-800">{aksi.teks}</span>
					</button>
				)}
				{!sentuh && !aksi && !panel && (
					<p className="m-0 text-center text-[12px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,.6)]">
						WASD jalan · Shift lari · C jongkok · Spasi loncat / panjat pagar · seret untuk memutar kamera · gulir zoom · tahan E untuk kerja · M peta{benih.length > 1 ? ` · 1–${benih.length} pilih benih` : ""}
					</p>
				)}
				{benih.length > 1 && !panel && (
					<div className="pointer-events-auto flex gap-1.5 rounded-2xl bg-slate-950/70 p-1.5 shadow-lg backdrop-blur">
						{benih.map((kom, i) => {
							const kk = KOMODITAS[kom];
							const aktif = pegang === kom;
							return (
								<button key={kom} type="button" onClick={() => pilihBenih(kom)} title={`Benih ${kk.nama}`}
									className={`relative flex h-11 w-11 items-center justify-center rounded-xl text-xl ${aktif ? "bg-amber-400 ring-2 ring-white" : "bg-white/10 hover:bg-white/20"}`}>
									{kk.ikon}
									<span className="absolute -right-1 -top-1 rounded-full bg-slate-900 px-1 text-[9.5px] font-black text-white">{kom === kebun.komoditas ? "∞" : kebun.benih[kom]}</span>
									{!sentuh && <span className="absolute bottom-0 left-1 text-[9px] font-black text-white/70">{i + 1}</span>}
								</button>
							);
						})}
					</div>
				)}
			</div>

			{sentuh && !panel && (
				<>
					<div className="absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-5">
						<Joystick />
					</div>
					<button type="button" onPointerDown={() => (kendali.jongkok = !kendali.jongkok)} aria-label="Jongkok"
						className="absolute bottom-[max(6.5rem,calc(env(safe-area-inset-bottom)+5rem))] right-5 flex h-12 w-12 items-center justify-center rounded-full bg-white/85 text-xl shadow-xl active:scale-90">
						🧎
					</button>
					<button type="button" onPointerDown={() => (kendali.loncat = true)} aria-label="Loncat"
						className="absolute bottom-[max(1.75rem,env(safe-area-inset-bottom))] right-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/85 text-2xl font-black text-slate-800 shadow-xl active:scale-90">
						⤒
					</button>
				</>
			)}

			<AnimatePresence>
				{pingsan && (
					<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 z-[65] flex items-center justify-center bg-slate-950/85">
						<p className="m-0 text-center text-lg font-black text-white">
							😵 Pingsan…
							<br />
							<span className="text-sm font-medium text-slate-300">Tenaga habis. Warga menggotong Anda ke saung kebun.</span>
						</p>
					</motion.div>
				)}
			</AnimatePresence>

			{panel && (
				<div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-900/40 sm:items-center sm:p-4" onClick={() => setPanel(null)}>
					<section role="dialog" aria-modal="true" aria-label={panel === "warung" ? "Warung Bu Imas" : panel === "abang" ? "Abang Payung" : panel === "peta" ? "Bangun Kabupaten" : usahaKini().pembeli.peran} onClick={(e) => e.stopPropagation()}
						className={`max-h-[88vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl ${panel === "peta" ? "sm:max-w-3xl" : "sm:max-w-md"}`}>
						<div className="mb-4 flex items-center justify-between">
							<h2 className="m-0 text-lg font-bold text-slate-900">{panel === "warung" ? "🏪 Warung Bu Imas" : panel === "abang" ? "☂️ Abang Payung" : panel === "peta" ? "🗺️ Bangun Kabupaten" : usahaKini().pembeli.judul}</h2>
							<button type="button" onClick={() => setPanel(null)} aria-label="Tutup" className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"><FiX /></button>
						</div>
						{panel === "warung" ? <PanelWarungDesa /> : panel === "abang" ? <PanelPelindung /> : panel === "peta"
							? <PetaKecamatan kiniDi={wilayah.kecamatan} onMain={(p) => { setPanel(null); onPindah(p); }} />
							: <PanelPengepul onTutup={() => setPanel(null)} />}
					</section>
				</div>
			)}
		</div>
	);
}
