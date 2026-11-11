import { useRef } from "react";
import { KataNaik } from "./JudulBagian";
import { useSlideAktif } from "./dek/slideAktif";
import "./integritas.css";

/* Section Zona Integritas: komitmen anti korupsi, suap, gratifikasi, dan nepotisme,
   dengan adegan 3D CSS di sisi kanan (lihat integritas.css). */
const NILAI = [
	{ nama: "Korupsi", isi: "Anggaran desa dikelola terbuka dan bisa dipertanggungjawabkan." },
	{ nama: "Suap", isi: "Tidak ada imbalan untuk mempercepat atau meloloskan layanan." },
	{ nama: "Gratifikasi", isi: "Hadiah yang berkaitan dengan jabatan ditolak." },
	{ nama: "Nepotisme", isi: "Keputusan berdasar aturan dan kinerja, bukan kedekatan." },
];

const PERISAI = "M88 6 L164 34 V92 C164 140 132 172 88 190 C44 172 12 140 12 92 V34 Z";
const DALAM = "M88 22 L150 45 V93 C150 131 124 158 88 173 C52 158 26 131 26 93 V45 Z";
// lapis perisai di sumbu Z: depan & belakang bermuka emblem, tengah jadi tebal sisi
const LAPISAN = Array.from({ length: 14 }, (_, i) => i - 6.5);
// posisi partikel ditetapkan sekali (bukan acak per render) supaya tidak berkedip saat render ulang
const PARTIKEL = Array.from({ length: 12 }, (_, i) => ({
	"--x": `${12 + ((i * 37) % 76)}%`,
	"--t": `${48 + ((i * 23) % 40)}%`,
	"--u": `${3 + (i % 3)}px`,
	"--zz": `${((i * 53) % 220) - 110}px`,
	"--d": `${5 + (i % 4)}s`,
	"--tunda": `${-((i * 0.83) % 6).toFixed(2)}s`,
}));

function Emblem({ depan }) {
	return (
		<>
			<defs>
				<linearGradient id={`igEmas${depan}`} x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor="#f8d977" />
					<stop offset="0.5" stopColor="#e3b23c" />
					<stop offset="1" stopColor="#a8791d" />
				</linearGradient>
				<clipPath id={`igPotong${depan}`}><path d={PERISAI} /></clipPath>
			</defs>
			<path d={PERISAI} fill={`url(#igEmas${depan})`} stroke="#fbe5a2" strokeWidth="2" />
			<path d={DALAM} fill="#0f1b30" stroke="#f6d77f" strokeWidth="1.5" />
			<path d="M60 96 L80 116 L118 74" fill="none" stroke="#e3b23c" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
			<text x="88" y="150" textAnchor="middle" fill="#f6d77f" fontSize="9.5" fontWeight="800" letterSpacing="1.6">INTEGRITAS</text>
			{depan === 1 && (
				<g clipPath={`url(#igPotong${depan})`}>
					<rect className="ig-kilau" x="-40" y="-20" width="44" height="240" fill="#fff" opacity="0.28" transform="skewX(-18)" />
				</g>
			)}
		</>
	);
}

function Adegan() {
	return (
		<div className="ig-panggung" aria-hidden="true">
			<div className="ig-dunia">
				<div className="ig-lantai">
					<div className="ig-sinar" />
					<div className="ig-garis" />
					{[0, 1, 2].map((i) => <div key={i} className="ig-gelang" style={{ "--i": i }} />)}
				</div>

				<div className="ig-perisai">
					{LAPISAN.map((z, i) => {
						const muka = i === 0 || i === LAPISAN.length - 1;
						return (
							<svg key={z} viewBox="0 0 176 196" style={{ "--z": `${z}px`, "--balik": i === 0 ? "180deg" : "0deg" }}>
								{muka ? <Emblem depan={i === 0 ? 0 : 1} /> : <path d={PERISAI} fill={i % 2 ? "#9a7420" : "#8a6519"} />}
							</svg>
						);
					})}
				</div>

				<div className="ig-cincin">
					{NILAI.map((n, i) => (
						<div key={n.nama} className="ig-kartu" style={{ "--i": i, "--y": `${i % 2 ? 14 : -14}px` }}>
							<div className="ig-muka">
								<span className="text-[11px] font-bold tracking-[0.22em] text-[#e3b23c]">ANTI</span>
								<span className="text-[22px] font-extrabold leading-tight tracking-[-0.02em] text-[#eef2f7]">{n.nama}</span>
							</div>
							<div className="ig-punggung" />
						</div>
					))}
				</div>

				{PARTIKEL.map((p, i) => <span key={i} className="ig-partikel" style={p} />)}
			</div>
		</div>
	);
}

export default function SectionIntegritas() {
	const aktif = useSlideAktif();
	const dunia = useRef(null);
	const bingkai = useRef(0);

	// Adegan sedikit miring mengikuti kursor (desktop). Ditulis langsung ke CSS variable
	// lewat rAF: tanpa render ulang React.
	const gerak = (e) => {
		if (e.pointerType !== "mouse") return;
		const r = e.currentTarget.getBoundingClientRect();
		const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
		cancelAnimationFrame(bingkai.current);
		bingkai.current = requestAnimationFrame(() => {
			const el = dunia.current?.querySelector(".ig-dunia");
			if (!el) return;
			el.style.setProperty("--rx", `${(x * 22).toFixed(2)}deg`);
			el.style.setProperty("--ry", `${(-y * 12).toFixed(2)}deg`);
		});
	};

	return (
		<div onPointerMove={gerak} className={`relative flex flex-col justify-center overflow-hidden border-t border-[#1e293b] bg-[#0a1220] px-5 py-20 md:min-h-dvh md:py-24 lg:px-8 ${aktif ? "" : "ig-diam"}`}>
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_75%_55%,rgba(227,178,60,0.10),transparent_70%)]" />
			<div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.05fr]">
				<div>
					<p data-masuk style={{ "--urut": 0 }} className="m-0 text-[13px] font-bold uppercase tracking-[0.2em] text-[#e3b23c]">Zona Integritas</p>
					<h2 className="m-0 mt-4 text-[clamp(2.25rem,4.5vw,3.75rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-[#eef2f7]">
						<KataNaik teks="Bersih melayani desa." mulai={1} />
					</h2>
					<p data-masuk style={{ "--urut": 4 }} className="m-0 mt-5 max-w-xl text-[17px] leading-relaxed text-[#94a3b8]">
						DPMD Kabupaten Bogor berkomitmen menolak korupsi, suap, gratifikasi, dan nepotisme dalam setiap urusan dengan desa, kecamatan, dan masyarakat.
					</p>
					<dl className="m-0 mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
						{NILAI.map((n, i) => (
							<div key={n.nama} data-masuk style={{ "--urut": 5 + i }} className="border-t border-[#334155] pt-4">
								<dt className="flex items-baseline gap-2 text-[17px] font-bold text-[#eef2f7]">
									<span className="text-[12px] font-bold tabular-nums text-[#e3b23c]">{String(i + 1).padStart(2, "0")}</span>
									Anti {n.nama}
								</dt>
								<dd className="m-0 mt-1.5 text-[14.5px] leading-relaxed text-[#94a3b8]">{n.isi}</dd>
							</div>
						))}
					</dl>
					<p data-masuk style={{ "--urut": 9 }} className="m-0 mt-8 text-[13.5px] text-[#64748b]">
						Menemukan pelanggaran? Sampaikan lewat kontak resmi DPMD di bagian akhir halaman ini.
					</p>
				</div>

				<div ref={dunia} data-masuk style={{ "--urut": 3 }} className="flex justify-center">
					<Adegan />
				</div>
			</div>
		</div>
	);
}
