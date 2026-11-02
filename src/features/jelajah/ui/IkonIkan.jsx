// Gambar ikan 2D (SVG) dari parameter spesies yang sama dengan model 3D-nya.
// `siluet`: ikan yang belum pernah ditangkap tampil sebagai bayangan.
export default function IkonIkan({ ikan, siluet = false, className = "" }) {
	const { warna: w, bentuk: b } = ikan;
	const belut = b.ekor === "belut";
	const ry = Math.max(5, Math.min(22, b.tinggi * 48));
	const rx = belut ? 50 : 38;
	const cx = belut ? 62 : 64;
	const isi = (c) => (siluet ? "#475569" : c);
	const ekor =
		b.ekor === "garpu"
			? `M${cx - rx + 6},30 L${cx - rx - 22},${30 - ry * 1.1} L${cx - rx - 12},30 L${cx - rx - 22},${30 + ry * 1.1} Z`
			: b.ekor === "pisau"
				? `M${cx + 4},${30 + ry * 0.7} L${cx - rx - 14},30 L${cx - rx + 4},${30 + ry * 0.2} Z`
				: belut
					? ""
					: `M${cx - rx + 6},30 Q${cx - rx - 22},${30 - ry * 1.2} ${cx - rx - 18},30 Q${cx - rx - 22},${30 + ry * 1.2} ${cx - rx + 6},30 Z`;
	return (
		<svg viewBox="0 0 128 60" className={className} aria-hidden="true" style={siluet ? { opacity: 0.45 } : undefined}>
			{ekor && <path d={ekor} fill={isi(w.sirip)} />}
			{!belut && <path d={`M${cx + 6},${30 - ry + 2} Q${cx - 6},${30 - ry - 12} ${cx - 20},${30 - ry + 3} Z`} fill={isi(w.sirip)} />}
			{belut && <path d={`M${cx - rx},30 Q${cx},${30 - ry - 6} ${cx + 20},${30 - ry + 1} L${cx + 20},${30 + ry - 1} Q${cx},${30 + ry + 6} ${cx - rx},30 Z`} fill={isi(w.sirip)} />}
			<ellipse cx={cx} cy={30} rx={rx} ry={ry} fill={isi(w.punggung)} />
			<ellipse cx={cx + 2} cy={30 + ry * 0.35} rx={rx * 0.86} ry={ry * 0.55} fill={isi(w.perut)} />
			{b.belang && !siluet && [0, 1, 2].map((i) => <rect key={i} x={cx - 14 + i * 12} y={30 - ry} width={4} height={ry * 1.6} rx={2} fill={w.sirip} opacity={0.45} />)}
			{b.tutul && !siluet && [0, 1, 2, 3].map((i) => <circle key={i} cx={cx - 18 + i * 9} cy={30 + ry * 0.2} r={2.2} fill="#3b3f46" />)}
			{b.duri && [0, 1, 2, 3].map((i) => <path key={i} d={`M${cx + 10 - i * 9},${30 - ry + 1} l-3,-9 l-3,9 Z`} fill={isi(w.sirip)} />)}
			{b.kumis && !siluet && (
				<g stroke={w.punggung} strokeWidth={1.4} fill="none" strokeLinecap="round">
					<path d={`M${cx + rx - 3},33 q10,4 16,12`} />
					<path d={`M${cx + rx - 4},35 q6,8 8,16`} />
				</g>
			)}
			<circle cx={cx + rx * 0.68} cy={30 - ry * 0.18} r={Math.max(2.2, ry * 0.2)} fill={siluet ? "#475569" : b.mataNyala || "#f8fafc"} />
			{!siluet && <circle cx={cx + rx * 0.7} cy={30 - ry * 0.18} r={Math.max(1.2, ry * 0.1)} fill="#0b0b0b" />}
			{siluet && (
				<text x={cx} y={34} textAnchor="middle" fontSize={14} fontWeight={800} fill="#e2e8f0">
					?
				</text>
			)}
		</svg>
	);
}
