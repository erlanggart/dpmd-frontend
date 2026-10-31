import { Link } from "react-router-dom";
import { FiArrowLeft, FiBox, FiCheck } from "react-icons/fi";
import { AREA_LAIN, GEDUNG, LOBI, RUANGAN } from "../kantorConfig";
import { TANGGA, rectTangga } from "../scene/layout";

// Versi tanpa 3D dengan isi yang sama: denah kedua lantai digambar langsung dari
// koordinat kantorConfig (pintu masuk di bawah). Dipakai bila WebGL tidak tersedia
// atau dipilih pengunjung.

const LEBAR = GEDUNG.x1 - GEDUNG.x0;
const DALAM = GEDUNG.z1 - GEDUNG.z0;
const letak = (r) => ({
	left: `${((r.x0 - GEDUNG.x0) / LEBAR) * 100}%`,
	top: `${((r.z0 - GEDUNG.z0) / DALAM) * 100}%`,
	width: `${((r.x1 - r.x0) / LEBAR) * 100}%`,
	height: `${((r.z1 - r.z0) / DALAM) * 100}%`,
});

const PENDUKUNG = AREA_LAIN.filter((a) => !["lorong1", "belakang1", "aula2"].includes(a.id));

function Denah({ lantai, dikunjungi, onBuka }) {
	const ruang = [LOBI, ...RUANGAN].filter((r) => r.lantai === lantai);
	return (
		<div className="relative w-full overflow-hidden rounded-2xl bg-[#e7e1d4] ring-1 ring-black/10" style={{ aspectRatio: `${LEBAR} / ${DALAM}` }}>
			{PENDUKUNG.filter((a) => a.lantai === lantai).map((a) => (
				<div
					key={a.id}
					className="absolute flex items-center justify-center border border-slate-300 bg-slate-200/70 p-0.5 text-center text-[9px] font-medium leading-tight text-slate-600 sm:text-[11px]"
					style={letak(a.rect)}
				>
					{a.nama.replace("Ruang Rapat ", "Rapat ")}
				</div>
			))}
			{TANGGA.map((t) => (
				<div
					key={t.id}
					className="absolute flex items-center justify-center border border-slate-400 text-[9px] font-semibold text-slate-600 sm:text-[11px]"
					style={{
						...letak(rectTangga(t)),
						background: "repeating-linear-gradient(0deg,#d6d1c6 0 6px,#c4beb2 6px 8px)",
					}}
				>
					Tangga
				</div>
			))}
			{ruang.map((r) => {
				const sudah = dikunjungi.has(r.id);
				return (
					<button
						key={r.id}
						onClick={() => onBuka(r.id)}
						className="absolute flex flex-col items-center justify-center gap-0.5 border-2 p-0.5 text-center transition hover:brightness-95 focus-visible:z-10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1"
						style={{ ...letak(r.rect), background: `${r.warna}26`, borderColor: r.warna }}
						aria-label={`${r.nama}${sudah ? " (sudah dikunjungi)" : ""}`}
					>
						<span className="text-[10px] font-bold leading-none sm:text-sm" style={{ color: r.warna }}>
							{r.labelPeta}
						</span>
						{sudah && (
							<span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white">
								<FiCheck className="h-3 w-3" />
							</span>
						)}
					</button>
				);
			})}
			{lantai === 0 && (
				<span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded bg-white/80 px-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
					▼ Pintu masuk
				</span>
			)}
		</div>
	);
}

export default function Denah2D({ statistik, dikunjungi, onBuka, onCoba3D, galat3D }) {
	return (
		<main className="min-h-[100svh] bg-[#f6f3ec]">
			<header className="sticky top-0 z-10 border-b border-black/5 bg-[#f6f3ec]/90 backdrop-blur">
				<div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
					<Link to="/" className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-slate-700 hover:bg-black/5">
						<FiArrowLeft /> Beranda
					</Link>
					<p className="text-sm font-semibold text-slate-800">
						{dikunjungi.size}/{RUANGAN.length} ruang dikunjungi
					</p>
					{onCoba3D ? (
						<button
							onClick={onCoba3D}
							className="inline-flex items-center gap-2 rounded-full bg-[rgb(var(--color-primary))] px-4 py-2 text-sm font-semibold text-white"
						>
							<FiBox /> <span className="hidden sm:inline">Coba versi</span> 3D
						</button>
					) : (
						<span className="w-16" />
					)}
				</div>
			</header>

			<div className="mx-auto max-w-4xl px-4 py-8">
				{galat3D && (
					<p className="mb-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
						Versi 3D tidak bisa dijalankan di perangkat ini, jadi kami tampilkan denah 2D dengan isi yang sama.
						<span className="mt-1 block text-xs text-amber-700/80">Detail: {galat3D}</span>
					</p>
				)}
				<h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Denah Kantor DPMD</h1>
				<p className="mt-2 max-w-2xl text-slate-600">
					Pilih ruang berwarna untuk melihat tugas bidang dan layanan yang tersedia di sana. Kabupaten Bogor memiliki{" "}
					{statistik ? `${statistik.kecamatan} kecamatan, ${statistik.desa} desa, dan ${statistik.kelurahan} kelurahan` : "puluhan kecamatan dan ratusan desa"}{" "}
					yang dibina DPMD.
				</p>

				{[1, 0].map((l) => (
					<section key={l} className="mt-8">
						<h2 className="mb-2 text-sm font-bold uppercase tracking-[0.16em] text-slate-500">Lantai {l + 1}</h2>
						<Denah lantai={l} dikunjungi={dikunjungi} onBuka={onBuka} />
					</section>
				))}
			</div>
		</main>
	);
}
