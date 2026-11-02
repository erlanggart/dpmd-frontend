import { useId } from "react";

// Ilustrasi joran (SVG) — tiap jenis punya ciri sendiri: ruas bambu, anyaman karbon,
// reel baitcasting, batang titanium mengilap, reel besar pancing dasar, sisik naga emas.
// viewBox 240×64: gagang di kiri, ujung joran di kanan.

const GAYA = {
	bambu: { batang: ["#d9b26a", "#a77b3a"], tebal: 4.5, pemandu: 0, reel: "tanpa", gagang: "tali", ruas: true },
	fiber: { batang: ["#4b5563", "#1f2937"], tebal: 3.6, pemandu: 4, reel: "spinning", warnaReel: "#cbd5e1", gagang: "gabus" },
	karbon: { batang: ["#1e293b", "#020617"], tebal: 3.4, pemandu: 5, reel: "spinning", warnaReel: "#0f172a", aksenReel: "#22d3ee", gagang: "eva", anyaman: true },
	kilat: { batang: ["#38bdf8", "#0369a1"], tebal: 3.2, pemandu: 6, reel: "casting", warnaReel: "#0c4a6e", aksenReel: "#fde047", gagang: "pelatuk" },
	titanium: { batang: ["#e2e8f0", "#64748b"], tebal: 3.6, pemandu: 6, reel: "spinning", warnaReel: "#94a3b8", aksenReel: "#f97316", gagang: "eva", kilau: true },
	dasar: { batang: ["#6b4f3a", "#2b1d12"], tebal: 5.4, pemandu: 3, reel: "besar", warnaReel: "#b91c1c", aksenReel: "#fbbf24", gagang: "gabus", roller: true },
	naga: { batang: ["#fde68a", "#b45309"], tebal: 4, pemandu: 6, reel: "spinning", warnaReel: "#ca8a04", aksenReel: "#fef3c7", gagang: "eva", sisik: true, rumbai: true },
};

export default function JoranGambar({ joran, className = "" }) {
	const id = useId().replace(/:/g, "");
	const g = GAYA[joran.id] || GAYA.fiber;
	const ujung = joran.ujung;
	// batang meruncing dari x 70 (pangkal) ke x 232 (ujung), y 34
	const lebarPangkal = g.tebal;
	const batang = `M70 ${34 - lebarPangkal / 2} L232 33.4 L232 34.6 L70 ${34 + lebarPangkal / 2} Z`;
	const pemandu = Array.from({ length: g.pemandu }, (_, i) => 92 + (i * 128) / Math.max(1, g.pemandu));
	return (
		<svg viewBox="0 0 240 64" className={className} role="img" aria-label={joran.nama}>
			<defs>
				<linearGradient id={`b${id}`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor={g.batang[0]} />
					<stop offset="1" stopColor={g.batang[1]} />
				</linearGradient>
				<linearGradient id={`k${id}`} x1="0" y1="0" x2="1" y2="0">
					<stop offset="0" stopColor="#fff" stopOpacity="0" />
					<stop offset="0.5" stopColor="#fff" stopOpacity="0.65" />
					<stop offset="1" stopColor="#fff" stopOpacity="0" />
				</linearGradient>
				<pattern id={`a${id}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
					<rect width="2" height="4" fill="#334155" />
				</pattern>
			</defs>
			{/* bayangan lembut */}
			<ellipse cx="130" cy="56" rx="100" ry="3" fill="#0f172a" opacity="0.12" />
			{/* gagang */}
			{g.gagang === "tali" ? (
				<g>
					<rect x="8" y="30" width="60" height="8" rx="3" fill="#a77b3a" />
					{Array.from({ length: 12 }, (_, i) => (
						<line key={i} x1={12 + i * 4.5} y1="30" x2={10 + i * 4.5} y2="38" stroke="#5b3a1a" strokeWidth="1.4" />
					))}
				</g>
			) : (
				<g>
					<rect x="6" y="29" width="24" height="10" rx="4" fill={g.gagang === "gabus" ? "#c8a46b" : "#1f2937"} />
					<rect x="32" y="30.5" width="10" height="7" rx="2" fill="#475569" />
					<rect x="44" y="29.5" width="22" height="9" rx="4" fill={g.gagang === "gabus" ? "#c8a46b" : "#1f2937"} />
					{g.gagang === "gabus" && [10, 16, 22, 48, 54, 60].map((x) => <circle key={x} cx={x} cy={33 + (x % 3)} r="0.8" fill="#8b6a3a" />)}
					{g.gagang === "pelatuk" && <path d="M36 38 Q38 46 33 47" stroke="#0c4a6e" strokeWidth="2.4" fill="none" strokeLinecap="round" />}
				</g>
			)}
			{g.rumbai && (
				<g>
					<line x1="7" y1="34" x2="3" y2="48" stroke="#dc2626" strokeWidth="1.6" />
					<line x1="7" y1="34" x2="6" y2="50" stroke="#ef4444" strokeWidth="1.6" />
					<line x1="7" y1="34" x2="9" y2="49" stroke="#dc2626" strokeWidth="1.6" />
					<circle cx="7" cy="34" r="2" fill="#fbbf24" />
				</g>
			)}
			{/* batang */}
			<path d={batang} fill={`url(#b${id})`} />
			{g.anyaman && <path d={batang} fill={`url(#a${id})`} opacity="0.55" />}
			{g.kilau && <path d={`M70 ${34 - lebarPangkal / 2} L232 33.4 L232 33.8 L70 ${33.2 - lebarPangkal / 4} Z`} fill={`url(#k${id})`} />}
			{g.ruas && [96, 128, 160, 190, 214].map((x) => <rect key={x} x={x} y={31.5} width="2.2" height={4.6 - (x - 96) / 60} rx="1" fill="#7c5a2a" />)}
			{g.sisik &&
				Array.from({ length: 16 }, (_, i) => {
					const x = 76 + i * 9;
					const r = Math.max(0.8, 2.2 - i * 0.09);
					return <path key={i} d={`M${x - r} 34 Q${x} ${34 - r * 1.4} ${x + r} 34`} stroke="#92400e" strokeWidth="0.7" fill="none" />;
				})}
			{/* lilitan & pemandu senar */}
			{pemandu.map((x, i) => (
				<g key={x}>
					<rect x={x - 1.6} y="31" width="3.2" height="6" rx="1" fill={ujung} opacity="0.9" />
					<circle cx={x} cy={g.roller ? 28.5 : 29} r={Math.max(1.4, 3.2 - i * 0.35)} fill="none" stroke={g.roller ? "#fbbf24" : "#e2e8f0"} strokeWidth="1.1" />
				</g>
			))}
			{/* ujung joran */}
			<circle cx="232" cy="34" r="1.6" fill={ujung} />
			<rect x="222" y="32.6" width="10" height="2.8" rx="1" fill={ujung} />
			{/* reel */}
			{g.reel === "spinning" && (
				<g>
					<rect x="40" y="38" width="3" height="7" fill="#64748b" />
					<circle cx="41.5" cy="50" r="7" fill={g.warnaReel} stroke="#0f172a" strokeWidth="1" />
					<circle cx="41.5" cy="50" r="3.6" fill={g.aksenReel || "#e2e8f0"} />
					<rect x="47" y="48.6" width="9" height="2.6" rx="1.2" fill="#475569" />
					<circle cx="56" cy="49.9" r="1.8" fill={g.aksenReel || "#94a3b8"} />
				</g>
			)}
			{g.reel === "casting" && (
				<g>
					<ellipse cx="38" cy="25" rx="10" ry="6" fill={g.warnaReel} stroke="#0f172a" strokeWidth="1" />
					<ellipse cx="38" cy="25" rx="5" ry="3" fill={g.aksenReel} />
					<rect x="47" y="23" width="7" height="2.4" rx="1.2" fill="#475569" />
					<circle cx="54" cy="24.2" r="1.8" fill={g.aksenReel} />
				</g>
			)}
			{g.reel === "besar" && (
				<g>
					<rect x="39" y="38" width="4" height="5" fill="#475569" />
					<rect x="30" y="42" width="22" height="16" rx="4" fill={g.warnaReel} stroke="#0f172a" strokeWidth="1" />
					<rect x="33" y="45" width="16" height="10" rx="2" fill={g.aksenReel} opacity="0.85" />
					<rect x="52" y="47" width="8" height="3" rx="1.2" fill="#1f2937" />
					<circle cx="61" cy="48.5" r="2.4" fill={g.aksenReel} />
				</g>
			)}
			{g.reel === "tanpa" && <rect x="44" y="31" width="10" height="6" rx="1.5" fill="#f1f5f9" opacity="0.85" />}
			{/* senar dari reel ke ujung */}
			<path d="M42 44 Q130 30 232 34" stroke="#94a3b8" strokeWidth="0.5" fill="none" opacity="0.6" />
		</svg>
	);
}
