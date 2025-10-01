import React, { useMemo, useState, useEffect } from "react";
import { FaCross, FaTrash, FaXingSquare } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";

const AparaturDesaList = ({ aparatur = [] }) => {
	const nav = useNavigate();

	const [tab, setTab] = useState("aktif"); // 'aktif' | 'tidak_aktif'
	const [q, setQ] = useState("");
	const [inactivePage, setInactivePage] = useState(1);
	const pageSize = 10;

	// Apply search (by nama_lengkap)
	const filtered = useMemo(() => {
		const src = Array.isArray(aparatur) ? aparatur : [];
		const query = (q || "").toLowerCase().trim();
		if (!query) return src;
		return src.filter((a) =>
			(a.nama_lengkap || "").toLowerCase().includes(query)
		);
	}, [aparatur, q]);

	const aktif = useMemo(
		() => filtered.filter((a) => (a.status || "").toLowerCase() === "aktif"),
		[filtered]
	);
	const tidakAktifFull = useMemo(
		() => filtered.filter((a) => (a.status || "").toLowerCase() !== "aktif"),
		[filtered]
	);

	const totalInactivePages = Math.max(
		1,
		Math.ceil(tidakAktifFull.length / pageSize)
	);
	useEffect(() => {
		setInactivePage(1);
	}, [q]);
	useEffect(() => {
		if (inactivePage > totalInactivePages) setInactivePage(totalInactivePages);
	}, [inactivePage, totalInactivePages]);

	const tidakAktif = useMemo(() => {
		const start = (inactivePage - 1) * pageSize;
		return tidakAktifFull.slice(start, start + pageSize);
	}, [tidakAktifFull, inactivePage]);

	const Table = ({ items, title }) => (
		<div className="bg-white shadow-md rounded-lg p-4">
			<h2 className="text-lg font-semibold mb-3">{title}</h2>
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
						{items && items.length > 0 ? (
							items.map((item) => (
								<tr key={item.id}>
									<td className="px-6 py-4 whitespace-nowrap">
										<Link
											to={`/desa/aparatur-desa/${item.id}`}
											className="text-primary hover:underline"
										>
											{item.nama_lengkap}
										</Link>
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										{item.jabatan}
									</td>
									<td className="px-6 py-4 whitespace-nowrap">
										<span
											className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
												(item.status || "").toLowerCase() === "aktif"
													? "bg-green-100 text-green-800"
													: "bg-red-100 text-red-800"
											}`}
										>
											{item.status}
										</span>
									</td>
									<td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
										<button
											onClick={() => nav(`/desa/aparatur-desa/${item.id}/edit`)}
											className="text-indigo-600 hover:text-indigo-900"
										>
											Edit
										</button>
									</td>
								</tr>
							))
						) : (
							<tr>
								<td colSpan="4" className="px-6 py-4 text-center text-gray-500">
									Tidak ada data.
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</div>
	);

	return (
		<div className="space-y-4">
			{/* Search */}
			<div className="input-group flex items-center gap-2">
				<input
					type="text"
					className=" w-full"
					placeholder="Cari nama aparatur..."
					value={q}
					onChange={(e) => setQ(e.target.value)}
				/>
				{q && (
					<button
						type="button"
						className="text-red-500 hover:text-red-700"
						onClick={() => setQ("")}
					>
						<FaTrash />
					</button>
				)}
			</div>

			{/* Tabs */}
			<div className="flex border-b">
				<button
					type="button"
					className={`px-4 py-2 -mb-px border-b-2 ${
						tab === "aktif"
							? "border-primary text-primary"
							: "border-transparent text-gray-500"
					}`}
					onClick={() => setTab("aktif")}
				>
					Aparatur Aktif ({aktif.length})
				</button>
				<button
					type="button"
					className={`px-4 py-2 -mb-px border-b-2 ${
						tab === "tidak_aktif"
							? "border-primary text-primary"
							: "border-transparent text-gray-500"
					}`}
					onClick={() => setTab("tidak_aktif")}
				>
					Riwayat (Tidak Aktif) ({tidakAktifFull.length})
				</button>
			</div>

			{/* Content */}
			{tab === "aktif" ? (
				<Table items={aktif} title="Aparatur Aktif" />
			) : (
				<>
					<Table items={tidakAktif} title="Riwayat (Tidak Aktif)" />
					<div className="flex items-center justify-between mt-2">
						<div className="text-sm text-gray-600">
							Halaman {inactivePage} dari {totalInactivePages}
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								className="px-3 py-1.5 border rounded disabled:opacity-50"
								onClick={() => setInactivePage((p) => Math.max(1, p - 1))}
								disabled={inactivePage <= 1}
							>
								Sebelumnya
							</button>
							<button
								type="button"
								className="px-3 py-1.5 border rounded disabled:opacity-50"
								onClick={() =>
									setInactivePage((p) => Math.min(totalInactivePages, p + 1))
								}
								disabled={inactivePage >= totalInactivePages}
							>
								Berikutnya
							</button>
						</div>
					</div>
				</>
			)}
		</div>
	);
};

export default AparaturDesaList;
