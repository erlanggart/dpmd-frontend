import "./integritas.css";

const NILAI = ["Korupsi", "Suap", "Gratifikasi", "Nepotisme"];
// lapisan perisai yang ditumpuk di sumbu Z agar tampak tebal saat berputar
const LAPISAN = [-5, -3, -1, 1, 3, 5];
const PERISAI = "M32 4 L56 13 V31 C56 46 45 56 32 61 C19 56 8 46 8 31 V13 Z";

export default function LencanaIntegritas({ className = "", style }) {
	return (
		<div
			role="img"
			aria-label={`Zona integritas: anti ${NILAI.join(", anti ").toLowerCase()}`}
			className={`flex items-center gap-4 ${className}`}
			style={style}
		>
			<div className="integ-perisai-adegan relative h-16 w-16 shrink-0" aria-hidden="true">
				<div className="integ-cahaya" />
				<div className="integ-perisai">
					{LAPISAN.map((z, i) => {
						const muka = i === 0 || i === LAPISAN.length - 1;
						return (
							<svg key={z} viewBox="0 0 64 64" style={{ "--z": `${z}px`, "--balik": i === 0 ? "180deg" : "0deg" }}>
								<path d={PERISAI} fill={muka ? "#e3b23c" : "#9a7420"} stroke={muka ? "#f6d77f" : "none"} strokeWidth="1.5" />
								{muka && <path d="M21 33 L29 41 L44 24" fill="none" stroke="#0a1220" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />}
							</svg>
						);
					})}
				</div>
			</div>

			<div className="min-w-0 flex-1 max-w-[19rem]" aria-hidden="true">
				<p className="m-0 mb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#eef2f7]/55">Zona Integritas</p>
				<div className="integ-prisma-adegan" style={{ "--t": "52px" }}>
					<div className="integ-prisma">
						{NILAI.map((n, i) => (
							<div key={n} className="integ-sisi" style={{ "--i": i }}>
								<span className="text-[12px] font-bold tracking-[0.2em] text-[#e3b23c]">ANTI</span>
								<span className="truncate text-[20px] font-extrabold tracking-[-0.01em] text-[#eef2f7]">{n}</span>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
