import React from "react";

const AparaturDesaList = ({ aparatur, onEdit, onDelete }) => {
	return (
		<div className="bg-white shadow-md rounded-lg p-4">
			<h2 className="text-xl font-semibold mb-4">Daftar Aparatur Desa</h2>
			<div className="overflow-x-auto">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Nama Lengkap
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Jabatan
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Status
							</th>
							<th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
								Aksi
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{/* Data akan di-map di sini */}
						{aparatur && aparatur.length > 0 ? (
							aparatur.map((item) => (
								<tr key={item.id}>
									<td className="px-6 py-4 whitespace-nowrap">
										{item.nama_lengkap}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										{item.jabatan}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<span
											className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
												item.status === "Aktif"
													? "bg-green-100 text-green-800"
													: "bg-red-100 text-red-800"
											}`}
										>
											{item.status}
										</span>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
										<button
											onClick={() => onEdit(item)}
											className="text-indigo-600 hover:text-indigo-900 mr-4"
										>
											Edit
										</button>
										<button
											onClick={() => onDelete(item.id)}
											className="text-red-600 hover:text-red-900"
										>
											Hapus
										</button>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan="4" className="px-6 py-4 text-center text-gray-500">
									Tidak ada data aparatur desa.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default AparaturDesaList;
