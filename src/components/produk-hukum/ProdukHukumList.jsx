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
	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
			{produkHukums.map((item) => (
				<Link
					to={`/desa/produk-hukum/${item.id}`}
					key={item.id}
					className="block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden border border-slate-200 "
				>
					<div className="p-6">
						<h3 className="text-lg font-bold text-gray-800 mb-2">
							{truncateText(item.judul, 50)}
						</h3>
						<div className="text-sm text-gray-600 space-y-1">
							<p>
								<span className="font-semibold">Jenis:</span> {item.jenis}
							</p>
							<p>
								<span className="font-semibold">Nomor:</span> {item.nomor}
							</p>
							<p>
								<span className="font-semibold">Tahun:</span> {item.tahun}
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
