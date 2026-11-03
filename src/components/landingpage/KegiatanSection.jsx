import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api";
import JudulBagian from "./JudulBagian";

const DASAR_GAMBAR = import.meta.env.VITE_IMAGE_BASE_URL || "http://127.0.0.1:3001";
const urlGambar = (p) => `${DASAR_GAMBAR}/storage/uploads/${encodeURIComponent(p).replace(/%2F/g, "/")}`;

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
	// Foto dokumentasi dari menu Hero Gallery superadmin.
	const [galeri, setGaleri] = useState([]);
	useEffect(() => {
		api.get("/public/hero-gallery").then((r) => setGaleri(Array.isArray(r.data?.data) ? r.data.data : [])).catch(() => setGaleri([]));
	}, []);

	return (
		<div className="border-t border-[#1e293b] bg-[#0a1220] px-5 py-20 lg:px-8 lg:py-28">
			<JudulBagian judul="Program berjalan" keterangan="Kegiatan unggulan DPMD tahun ini. Pilih program untuk melihat rincian dan perkembangannya." />
			<ul className="mx-auto mt-12 max-w-6xl list-none p-0">
				{PROGRAM.map((p) => (
					<li key={p.to} className="border-t border-[#1e293b] last:border-b">
						<Link to={p.to} className="group grid gap-2 py-7 text-inherit no-underline sm:grid-cols-[5rem_1fr_auto] sm:items-baseline sm:gap-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#e3b23c]">
							<span className="text-[14px] font-semibold tabular-nums text-[#64748b]">{p.tahun}</span>
							<span>
								<span className="block text-[clamp(1.25rem,2.2vw,1.75rem)] font-bold tracking-[-0.02em] text-[#eef2f7] transition group-hover:text-[#e3b23c]">{p.judul}</span>
								<span className="mt-2 block max-w-2xl text-[15.5px] leading-relaxed text-[#94a3b8]">{p.isi}</span>
							</span>
							<span className="text-[14px] font-semibold text-[#cbd5e1] underline decoration-[#334155] underline-offset-4 transition group-hover:decoration-[#e3b23c]">Lihat rincian</span>
						</Link>
					</li>
				))}
			</ul>

			{galeri.length > 0 && (
				<div className="mx-auto mt-14 max-w-6xl">
					<p className="m-0 text-[14px] font-semibold text-[#94a3b8]">Dokumentasi kegiatan</p>
					<div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3">
						{galeri.slice(0, 6).map((g) => (
							<figure key={g.id} className="m-0 overflow-hidden rounded-md bg-[#0f1a2c]">
								<img src={urlGambar(g.image_path)} alt={g.title || "Dokumentasi kegiatan DPMD"} loading="lazy" className="aspect-[4/3] w-full object-cover" />
								{g.title && <figcaption className="px-3 py-2 text-[13px] text-[#94a3b8]">{g.title}</figcaption>}
							</figure>
						))}
					</div>
				</div>
			)}
		</div>
	);
}
