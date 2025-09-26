import React from "react";
import { Link } from "react-router-dom";

// Fungsi untuk memotong teks jika terlalu panjang
const truncateText = (text, maxLength) => {
	if (text.length <= maxLength) {
		return text;
	}
	return text.substring(0, maxLength) + "...";
};

const ProdukHukumList = ({ produkHukums }) => {
	console.log(produkHukums);
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
			{produkHukums.map((item) => (
				<Link
					to={`/desa/produk-hukum/${item.id}`}
					key={item.id}
					className="flex flex-col bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-300  overflow-hidden border border-slate-200 hover:scale-105 h-full"
				>
					<div className="p-6 flex-grow ">
						<div>
							<p className="font-semibold text-xs">
								{item.jenis} {item.desa.nama}
							</p>
							<p className="text-xs text-slate-500">
								Kecamatan {item.desa.kecamatan.nama}
							</p>
						</div>
						<h3 className=" text-center text-lg font-bold text-gray-800 py-2">
							{truncateText(item.judul, 50)}
						</h3>
						<div className="text-sm text-center text-slate-500 space-y-1 flex-grow">
							<p>
								<span className="font-semibold">Nomor </span> {item.nomor}
							</p>
							<p>
								<span className="font-semibold">Tahun </span> {item.tahun}
							</p>
						</div>
					</div>
					<div
						className={`px-6 py-2 text-xs font-bold text-white ${
							item.status_peraturan === "berlaku"
								? "bg-green-500"
								: "bg-red-500"
						}`}
					>
						{item.status_peraturan.toUpperCase()}
					</div>
				</Link>
			))}
		</div>
	);
};

export default ProdukHukumList;
