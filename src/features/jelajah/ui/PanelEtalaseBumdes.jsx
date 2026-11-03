import { useEffect, useState } from "react";
import api from "../../../api";
import { urlFotoProduk } from "../../../components/bumdes/KatalogProdukUI";

// Papan etalase di gerbang food court Pasar BUMDes: produk asli BUM Desa se-Kabupaten
// Bogor dari katalog publik (/api/public/bumdes/katalog-produk) — sama dengan halaman
// /pasar-bumdes. Tanpa transaksi; pembeli menghubungi BUM Desa lewat halaman itu.

const rupiah = (n) => (n ? `Rp${Number(n).toLocaleString("id-ID")}` : "Hubungi penjual");

export default function PanelEtalaseBumdes() {
	const [data, setData] = useState(null);
	const [galat, setGalat] = useState(null);
	const [kategori, setKategori] = useState("");

	useEffect(() => {
		let batal = false;
		setData(null);
		setGalat(null);
		api
			.get("/public/bumdes/katalog-produk", { params: { limit: 24, ...(kategori ? { kategori } : {}) } })
			.then((r) => !batal && setData(r.data?.data || null))
			.catch(() => !batal && setGalat("Etalase belum bisa dimuat — coba lagi nanti"));
		return () => {
			batal = true;
		};
	}, [kategori]);

	const opsi = data?.kategori_opsi || data?.kategori || [];
	const daftarKategori = (Array.isArray(opsi) ? opsi : []).map((k) => (typeof k === "string" ? k : k.kategori || k.nama)).filter(Boolean);

	return (
		<div className="space-y-3">
			<p className="rounded-2xl bg-emerald-50 px-3 py-2 text-xs leading-relaxed text-emerald-900 ring-1 ring-emerald-100">
				Produk asli dari BUM Desa se-Kabupaten Bogor. Menu di lapak food court ini dibuat dari bahan-bahan seperti ini — telur, ikan, sayur hidroponik, tempe, beras, dan lainnya.
			</p>
			{daftarKategori.length > 0 && (
				<div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
					{["", ...daftarKategori.slice(0, 10)].map((k) => (
						<button
							key={k || "semua"}
							onClick={() => setKategori(k)}
							className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition ${kategori === k ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
						>
							{k || "Semua"}
						</button>
					))}
				</div>
			)}
			{galat && <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700">{galat}</p>}
			{!data && !galat && (
				<div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
					{Array.from({ length: 6 }, (_, i) => (
						<div key={i} className="h-40 animate-pulse rounded-2xl bg-slate-100" />
					))}
				</div>
			)}
			{data && (
				<ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
					{(data.produk || []).map((p) => {
						const foto = urlFotoProduk(p.foto);
						return (
							<li key={p.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
								<div className="flex aspect-square items-center justify-center bg-gradient-to-br from-emerald-50 to-amber-50 text-4xl">
									{foto ? <img src={foto} alt={p.nama} loading="lazy" className="h-full w-full object-cover" /> : "🧺"}
								</div>
								<div className="p-2">
									<p className="line-clamp-2 text-xs font-bold leading-snug text-slate-900">{p.nama}</p>
									<p className="mt-0.5 text-xs font-black text-emerald-700">
										{rupiah(p.harga)}
										{p.harga && p.satuan ? <span className="font-medium text-slate-400"> / {p.satuan}</span> : null}
									</p>
									<p className="mt-1 line-clamp-2 text-[10px] leading-snug text-slate-500">
										{p.bumdes?.nama}
										{p.bumdes?.kecamatan ? ` · Kec. ${p.bumdes.kecamatan}` : ""}
									</p>
								</div>
							</li>
						);
					})}
				</ul>
			)}
			{data && !(data.produk || []).length && <p className="text-center text-sm text-slate-500">Belum ada produk di kategori ini.</p>}
			<a href="/pasar-bumdes" target="_blank" rel="noreferrer" className="block rounded-2xl bg-emerald-600 px-4 py-2.5 text-center text-sm font-black text-white hover:bg-emerald-500">
				Buka Pasar BUMDes lengkap ↗
			</a>
		</div>
	);
}
