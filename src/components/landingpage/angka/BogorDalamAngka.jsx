import { AbsoluteFill, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

/*
 * Komposisi Remotion "Bogor dalam angka" (1280x720, 30 fps, 18 detik, berulang).
 * Satu titik = satu desa/kelurahan. Titik-titik itu tetap di layar sepanjang
 * video dan berubah makna di tiap babak: wilayah, BUMDes, lembaga.
 */

export const DURASI = 540;
const NAVY = "#101b2e";
const KERTAS = "#eef2f7";
const PADI = "#e3b23c";
const KOLOM = 29;
const angka = (n) => Number(n || 0).toLocaleString("id-ID");

const BABAK = [
	{ dari: 0, sampai: 170 },
	{ dari: 170, sampai: 340 },
	{ dari: 340, sampai: 510 },
	{ dari: 510, sampai: DURASI },
];
const LEMBAGA = ["RT", "RW", "LPM", "PKK", "Posyandu", "Karang Taruna", "Satlinmas", "lembaga lainnya"];

function Hitung({ nilai, mulai = 0, lama = 40 }) {
	const f = useCurrentFrame();
	const t = interpolate(f, [mulai, mulai + lama], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
	return <>{angka(Math.round(nilai * (1 - (1 - t) ** 3)))}</>;
}

function Judul({ besar, kecil, catatan }) {
	const f = useCurrentFrame();
	const { fps } = useVideoConfig();
	const masuk = spring({ frame: f, fps, config: { damping: 200 } });
	const keluar = interpolate(f, [150, 170], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
	return (
		<div style={{ position: "absolute", left: 80, top: 150, width: 470, opacity: masuk * keluar, transform: `translateY(${(1 - masuk) * 30}px)` }}>
			<div style={{ fontSize: 150, fontWeight: 800, lineHeight: 0.95, letterSpacing: "-0.045em", color: KERTAS }}>{besar}</div>
			<div style={{ fontSize: 46, fontWeight: 700, marginTop: 14, color: PADI, letterSpacing: "-0.02em" }}>{kecil}</div>
			<div style={{ fontSize: 26, lineHeight: 1.4, marginTop: 22, color: "rgba(238,242,247,.72)" }}>{catatan}</div>
		</div>
	);
}

function Titik({ desa, kelurahan, bumdes }) {
	const f = useCurrentFrame();
	const total = desa + kelurahan;
	const ukuran = 15, jarak = 22;
	const lebar = KOLOM * jarak;
	const baris = Math.ceil(total / KOLOM);
	const x0 = 1280 - 80 - lebar, y0 = (720 - baris * jarak) / 2;

	// babak 2: desa yang punya BUMDes menyala; babak 3: titik melebar jadi kelompok lembaga
	const b2 = interpolate(f, [175, 215], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
	const b3 = interpolate(f, [345, 385], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
	const akhir = interpolate(f, [510, 535], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
	const urutBumdes = Math.min(bumdes, desa);

	return (
		<svg width={1280} height={720} style={{ position: "absolute", inset: 0 }}>
			{Array.from({ length: total }, (_, i) => {
				const kel = i >= desa;
				const muncul = interpolate(f, [4 + (i / total) * 70, 16 + (i / total) * 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
				const cx = x0 + (i % KOLOM) * jarak + jarak / 2;
				const cy = y0 + Math.floor(i / KOLOM) * jarak + jarak / 2;
				const punya = !kel && i < urutBumdes;
				const warna = b2 > 0 ? (punya ? PADI : KERTAS) : kel ? KERTAS : PADI;
				const r = (ukuran / 2) * muncul * (1 - b3 * 0.55) * akhir;
				const isi = b3 > 0 ? `rgba(238,242,247,${0.25 + (0.2 * ((i * 7) % 5)) / 4})` : warna;
				return (
					<g key={i} opacity={punya ? 1 : 1 - 0.75 * b2 * (1 - b3)}>
						<circle cx={cx} cy={cy} r={Math.max(0, r)} fill={isi} />
						{b3 > 0 && [0, 1, 2].map((s) => (
							<circle key={s} cx={cx + (s - 1) * 5 * b3} cy={cy + (s === 1 ? -4 : 3) * b3} r={Math.max(0, 2.3 * b3 * akhir)} fill={s === 1 ? PADI : KERTAS} />
						))}
					</g>
				);
			})}
		</svg>
	);
}

function Tutup() {
	const f = useCurrentFrame();
	const o = interpolate(f, [0, 10, 22, 30], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
	return (
		<AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: o }}>
			<div style={{ fontSize: 54, fontWeight: 800, color: KERTAS, letterSpacing: "-0.03em" }}>Semua tercatat di satu sistem.</div>
		</AbsoluteFill>
	);
}

export default function BogorDalamAngka({ desa = 416, kelurahan = 19, kecamatan = 40, bumdes = 390, lembaga = 28191 }) {
	const f = useCurrentFrame();
	return (
		<AbsoluteFill style={{ backgroundColor: NAVY, fontFamily: "'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', sans-serif" }}>
			<Titik desa={desa} kelurahan={kelurahan} bumdes={bumdes} />
			<Sequence from={BABAK[0].dari} durationInFrames={BABAK[0].sampai - BABAK[0].dari}>
				<Judul besar={<Hitung nilai={desa} mulai={6} lama={60} />} kecil="desa" catatan={`dan ${angka(kelurahan)} kelurahan di ${angka(kecamatan)} kecamatan. Satu titik, satu desa atau kelurahan.`} />
			</Sequence>
			<Sequence from={BABAK[1].dari} durationInFrames={BABAK[1].sampai - BABAK[1].dari}>
				<Judul besar={<Hitung nilai={bumdes} mulai={6} lama={45} />} kecil="BUMDes aktif" catatan="Badan usaha milik desa yang tercatat aktif dan melapor ke DPMD." />
			</Sequence>
			<Sequence from={BABAK[2].dari} durationInFrames={BABAK[2].sampai - BABAK[2].dari}>
				<Judul besar={<Hitung nilai={lembaga} mulai={6} lama={55} />} kecil="lembaga kemasyarakatan" catatan={LEMBAGA.join(", ").replace(/, ([^,]*)$/, ", dan $1") + "."} />
			</Sequence>
			<Sequence from={BABAK[3].dari} durationInFrames={BABAK[3].sampai - BABAK[3].dari}>
				<Tutup />
			</Sequence>
			<div style={{ position: "absolute", left: 80, bottom: 56, display: "flex", gap: 10 }}>
				{BABAK.slice(0, 3).map((b) => (
					<div key={b.dari} style={{ width: 56, height: 4, borderRadius: 2, background: "rgba(238,242,247,.2)", overflow: "hidden" }}>
						<div style={{ height: "100%", background: PADI, width: `${interpolate(f, [b.dari, b.sampai], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%` }} />
					</div>
				))}
			</div>
		</AbsoluteFill>
	);
}
