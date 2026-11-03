import { Link } from "react-router-dom";
import JudulBagian from "./JudulBagian";

const PROGRAM = [
	{
		to: "/bantuan-keuangan",
		judul: "Bantuan Keuangan Infrastruktur Desa",
		isi: "Bantuan keuangan untuk pembangunan dan perbaikan jalan, jembatan, saluran irigasi, dan infrastruktur desa lainnya.",
		tahun: "2025",
	},
	{
		to: "/kegiatan/bimtek-bumdes-2025",
		judul: "Bimbingan Teknis Pengelolaan BUMDes",
		isi: "Pelatihan dan pendampingan pengelola BUMDes dalam manajemen keuangan dan pengembangan usaha.",
		tahun: "2025",
	},
	{
		to: "/kegiatan/pelatihan-aparatur-desa-2025",
		judul: "Pelatihan Aparatur Desa",
		isi: "Peningkatan kompetensi aparatur desa dalam administrasi pemerintahan, pelayanan publik, dan tata kelola.",
		tahun: "2025",
	},
	{
		to: "/kegiatan/pengembangan-produk-unggulan-desa",
		judul: "Pengembangan Produk Unggulan Desa",
		isi: "Pendampingan produk unggulan desa supaya ekonomi warga tumbuh dan produk lokal mampu bersaing.",
		tahun: "2025",
	},
];

export default function KegiatanSection() {
	return (
		<div className="border-t border-[#1e293b] bg-[#0a1220] px-5 py-20 md:pb-10 md:pt-24 lg:px-8">
			<JudulBagian judul="Program berjalan" keterangan="Kegiatan unggulan DPMD tahun ini. Pilih program untuk melihat rincian dan perkembangannya." />
			<ul className="mx-auto mt-10 max-w-6xl list-none p-0">
				{PROGRAM.map((p, i) => (
					<li key={p.to} data-masuk style={{ "--urut": 4 + i }} className="border-t border-[#1e293b] last:border-b">
						<Link to={p.to} className="group grid gap-2 py-5 text-inherit no-underline sm:grid-cols-[4rem_1fr_auto] sm:items-baseline sm:gap-6 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e3b23c]">
							<span className="text-[14px] font-semibold tabular-nums text-[#64748b]">{p.tahun}</span>
							<span>
								<span className="block text-[clamp(1.15rem,1.9vw,1.5rem)] font-bold tracking-[-0.02em] text-[#eef2f7] transition group-hover:text-[#e3b23c]">{p.judul}</span>
								<span className="mt-1.5 block max-w-2xl text-[15px] leading-relaxed text-[#94a3b8]">{p.isi}</span>
							</span>
							<span className="text-[14px] font-semibold text-[#cbd5e1] underline decoration-[#334155] underline-offset-4 transition group-hover:decoration-[#e3b23c]">Lihat rincian</span>
						</Link>
					</li>
				))}
			</ul>
		</div>
	);
}
