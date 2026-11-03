import { Link } from "react-router-dom";
import JudulBagian from "./JudulBagian";

/* Bagian penutup landing page: kontak kantor DPMD (isi yang dulu ada di footer). */
const KONTAK = [
	{
		label: "Alamat",
		isi: "Jl. KSR Dadi Kusmayadi, Cibinong, Bogor, Jawa Barat 16914",
		href: "https://maps.google.com/?q=Dinas+Pemberdayaan+Masyarakat+dan+Desa+Kabupaten+Bogor",
		aksi: "Buka di peta",
	},
	{ label: "Telepon", isi: "(021) 8754102", href: "tel:+62218754102", aksi: "Telepon" },
	{ label: "Surel", isi: "dpmd@bogorkab.go.id", href: "mailto:dpmd@bogorkab.go.id", aksi: "Kirim surel" },
	{ label: "Jam layanan", isi: "Senin–Jumat, 07.30–16.00 WIB. Sistem dapat diakses 24 jam." },
];

const TAUTAN = [
	{ to: "/bantuan-keuangan", label: "Bantuan keuangan" },
	{ to: "/pasar-bumdes", label: "Pasar BUM Desa" },
	{ to: "/jelajah", label: "Jelajahi kantor 3D" },
	{ to: "/login", label: "Masuk ke sistem" },
];

export default function SectionKontak() {
	return (
		<div className="flex flex-col border-t border-[#1e293b] bg-[#0a1220] px-5 pb-8 pt-20 md:min-h-dvh md:pt-24 lg:px-8">
			<div className="flex flex-1 flex-col justify-center">
				<JudulBagian judul="Datang, telepon, atau kirim surel" keterangan="Kantor DPMD Kabupaten Bogor melayani desa, kecamatan, dan masyarakat pada hari kerja." />
				<dl className="mx-auto mt-12 grid w-full max-w-6xl gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
					{KONTAK.map((k, i) => (
						<div key={k.label} data-masuk style={{ "--urut": 4 + i }} className="border-t border-[#334155] pt-5">
							<dt className="text-[13px] font-semibold text-[#94a3b8]">{k.label}</dt>
							<dd className="m-0 mt-2 text-[17px] font-semibold leading-snug text-[#eef2f7]">{k.isi}</dd>
							{k.href && (
								<a href={k.href} target={k.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer"
									className="mt-3 inline-block text-[14px] font-semibold text-[#e3b23c] underline decoration-[#e3b23c]/40 underline-offset-4 hover:decoration-[#e3b23c]">
									{k.aksi}
								</a>
							)}
						</div>
					))}
				</dl>
				<nav data-masuk style={{ "--urut": 8 }} aria-label="Tautan layanan" className="mx-auto mt-12 flex w-full max-w-6xl flex-wrap gap-x-7 gap-y-3">
					{TAUTAN.map((t) => (
						<Link key={t.to} to={t.to} className="text-[15px] font-semibold text-[#cbd5e1] underline decoration-[#334155] underline-offset-4 hover:text-[#eef2f7] hover:decoration-[#e3b23c]">
							{t.label}
						</Link>
					))}
				</nav>
			</div>
			<div className="mx-auto mt-12 flex w-full max-w-6xl flex-wrap justify-between gap-3 border-t border-[#1e293b] pt-5 text-[12.5px] text-[#64748b]">
				<span>© {new Date().getFullYear()} Dinas Pemberdayaan Masyarakat dan Desa Kabupaten Bogor</span>
				<span>Sistem Informasi Pemberdayaan Desa</span>
			</div>
		</div>
	);
}
