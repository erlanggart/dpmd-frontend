import { Link } from "react-router-dom";
import JudulBagian from "./JudulBagian";

const BIDANG = [
	{ judul: "Pemerintahan desa", isi: "Profil desa, data aparatur, dan struktur pemerintahan desa dikelola terpusat." },
	{ judul: "Keuangan dan aset", isi: "Alokasi dana transfer, bantuan keuangan, dan aset desa dipantau secara terbuka." },
	{ judul: "Sarana dan prasarana", isi: "Infrastruktur desa dan program unggulan kewilayahan dicatat dan dilaporkan." },
	{ judul: "Pemberdayaan", isi: "Kelembagaan masyarakat, BUMDes, dan kegiatan pemberdayaan didata dan dipantau." },
];

const PINTU = [
	{
		to: "/bantuan-keuangan",
		judul: "Rekap bantuan keuangan desa",
		isi: "Realisasi dan status pengajuan bantuan keuangan infrastruktur tiap desa, terbuka untuk umum.",
		aksi: "Buka rekap bantuan keuangan",
	},
	{
		to: "/pasar-bumdes",
		judul: "Pasar BUM Desa",
		isi: "Produk unggulan dan paket wisata dari BUM Desa se-Kabupaten Bogor. Pesan langsung ke BUM Desa penjualnya lewat WhatsApp.",
		aksi: "Buka Pasar BUM Desa",
	},
];

export default function FeatureSection() {
	return (
		<div className="border-t border-[#1e293b] bg-[#0a1220] px-5 py-20 md:pb-10 md:pt-24 lg:px-8">
			<JudulBagian judul="Satu sistem, empat bidang" keterangan="Setiap bidang di DPMD bekerja dengan data yang sama, jadi desa cukup melapor sekali." />

			<dl className="mx-auto mt-12 grid max-w-6xl gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
				{BIDANG.map((b, i) => (
					<div key={b.judul} data-masuk style={{ "--urut": 4 + i }} className="border-t-2 border-[#e3b23c] pt-5">
						<dt className="text-[18px] font-bold tracking-[-0.01em] text-[#eef2f7]">{b.judul}</dt>
						<dd className="m-0 mt-2 text-[15px] leading-relaxed text-[#94a3b8]">{b.isi}</dd>
					</div>
				))}
			</dl>

			<div className="mx-auto mt-16 grid max-w-6xl gap-4 lg:grid-cols-2">
				{PINTU.map((p, i) => (
					<Link key={p.to} data-masuk style={{ "--urut": 8 + i }} to={p.to} className="group flex flex-col rounded-lg border border-[#1e293b] bg-[#0f1a2c] p-7 text-inherit no-underline transition hover:border-[#475569] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3b23c] lg:p-9">
						<span className="text-[clamp(1.4rem,2.4vw,1.9rem)] font-extrabold tracking-[-0.025em] text-[#eef2f7]">{p.judul}</span>
						<span className="mt-3 max-w-lg text-[15.5px] leading-relaxed text-[#94a3b8]">{p.isi}</span>
						<span className="mt-7 text-[15px] font-semibold text-[#e3b23c] underline decoration-[#e3b23c]/40 underline-offset-4 transition group-hover:decoration-[#e3b23c]">{p.aksi}</span>
					</Link>
				))}
			</div>
		</div>
	);
}
