import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, UserCircle, Edit3, Eye, Users, Landmark } from "lucide-react";

const getBaseHost = () => {
	const apiBase = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
	return apiBase.replace(/\/?api\/?$/, "");
};

const getPasFotoUrl = (person) => {
	if (person?.file_pas_foto) {
		return `${getBaseHost()}/uploads/aparatur_desa_files/${person.file_pas_foto}`;
	}
	return null;
};

// Hasil pemeriksaan Bidang Pemdes, supaya desa langsung melihat baris mana
// yang ditolak tanpa membuka detailnya satu per satu.
const CapVerifikasi = ({ status }) => {
	if (!status) return null;
	const ditolak = status === "ditolak";
	return (
		<span
			title={ditolak ? "Verifikasi ditolak Bidang Pemdes" : "Terverifikasi Bidang Pemdes"}
			className={`inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${
				ditolak ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
			}`}
		>
			{ditolak ? "Ditolak" : "Terverifikasi"}
		</span>
	);
};

const AparaturDesaList = ({ aparatur = [] }) => {
	const nav = useNavigate();
	const [tab, setTab] = useState("pemdes");
	const [q, setQ] = useState("");

	const filtered = useMemo(() => {
		const src = Array.isArray(aparatur) ? aparatur : [];
		const query = (q || "").toLowerCase().trim();
		if (!query) return src;
		return src.filter((a) =>
			(a.nama_lengkap || "").toLowerCase().includes(query) ||
			(a.jabatan || "").toLowerCase().includes(query)
		);
	}, [aparatur, q]);

	const isBPD = (a) => (a.jabatan || "").toUpperCase().includes("BPD");

	const getJabatanOrder = (jabatan) => {
		const j = (jabatan || "").toLowerCase();
		if (j === "kepala desa") return 0;
		if (j === "sekretaris desa" || j === "sekretaris") return 1;
		if (j.includes("kasi") || j.includes("kepala seksi")) return 2;
		if (j.includes("kaur") || j.includes("kepala urusan")) return 3;
		if (j.includes("kadus") || j.includes("kepala dusun")) return 4;
		if (j.includes("staf")) return 5;
		return 6;
	};

	const extractNumber = (jabatan) => {
		const match = (jabatan || "").match(/(\d+)/);
		return match ? parseInt(match[1], 10) : 0;
	};

	const pemdes = useMemo(() => {
		return filtered
			.filter((a) => !isBPD(a))
			.sort((a, b) => {
				const orderA = getJabatanOrder(a.jabatan);
				const orderB = getJabatanOrder(b.jabatan);
				if (orderA !== orderB) return orderA - orderB;
				return extractNumber(a.jabatan) - extractNumber(b.jabatan);
			});
	}, [filtered]);
	const bpd = useMemo(() => filtered.filter((a) => isBPD(a)), [filtered]);

	const currentData = tab === "pemdes" ? pemdes : bpd;

	return (
		<div className="space-y-4">
			{/* Search & Tabs */}
			<div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
				<div className="p-4 border-b border-slate-100">
					<div className="relative">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
						<input
							type="text"
							className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-transparent transition-all"
							placeholder="Cari nama atau jabatan..."
							value={q}
							onChange={(e) => setQ(e.target.value)}
						/>
						{q && (
							<button
								onClick={() => setQ("")}
								className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
							>
								<X className="h-4 w-4" />
							</button>
						)}
					</div>
				</div>

				<div className="flex border-b border-slate-100">
					<button
						onClick={() => setTab("pemdes")}
						className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
							tab === "pemdes"
								? "text-slate-900 border-b-2 border-slate-700 bg-slate-50"
								: "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
						}`}
					>
						<Users className="w-4 h-4" />
						Pemerintah Desa
						<span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
							tab === "pemdes" ? "bg-slate-200 text-slate-700" : "bg-slate-100 text-slate-500"
						}`}>{pemdes.length}</span>
					</button>
					<button
						onClick={() => setTab("bpd")}
						className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all ${
							tab === "bpd"
								? "text-slate-900 border-b-2 border-slate-700 bg-slate-50"
								: "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
						}`}
					>
						<Landmark className="w-4 h-4" />
						BPD
						<span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
							tab === "bpd" ? "bg-slate-200 text-slate-700" : "bg-slate-100 text-slate-500"
						}`}>{bpd.length}</span>
					</button>
				</div>

				{/* Desktop Table */}
				<div className="hidden md:block">
					<table className="w-full">
						<thead>
							<tr className="bg-slate-50/80">
								<th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Aparatur</th>
								<th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Jabatan</th>
								<th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Jenis Kelamin</th>
								<th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Pendidikan</th>
								<th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
								<th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{currentData.length > 0 ? currentData.map((item) => {
								const foto = getPasFotoUrl(item);
								return (
									<tr key={item.id} className="hover:bg-slate-50 transition-colors group">
										<td className="px-5 py-3">
											<Link to={`/desa/aparatur-desa/${item.id}`} className="flex items-center gap-3">
												{foto ? (
													<img
														src={foto}
														alt={item.nama_lengkap}
														className="h-9 w-9 rounded-full object-cover ring-2 ring-slate-100"
														onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
													/>
												) : null}
												<div className={`h-9 w-9 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center ring-2 ring-slate-100 ${foto ? 'hidden' : ''}`}>
													<UserCircle className="h-5 w-5 text-slate-600" />
												</div>
												<span className="flex items-center gap-1.5 font-medium text-slate-900 group-hover:text-slate-700 transition-colors">
													{item.nama_lengkap}
													<CapVerifikasi status={item.status_verifikasi} />
												</span>
											</Link>
										</td>
										<td className="px-5 py-3">
											<span className="inline-flex px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
												{item.jabatan || "-"}
											</span>
										</td>
										<td className="px-5 py-3 text-sm text-slate-600">
											{item.jenis_kelamin === "Laki_laki" || item.jenis_kelamin === "Laki-laki" ? "Laki-laki" : item.jenis_kelamin === "Perempuan" ? "Perempuan" : "-"}
										</td>
										<td className="px-5 py-3 text-sm text-slate-600">{item.pendidikan_terakhir || "-"}</td>
										<td className="px-5 py-3">
											<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
												(item.status || "").toLowerCase() === "aktif"
													? "bg-emerald-100 text-emerald-700"
													: "bg-rose-100 text-rose-700"
											}`}>
												<span className={`w-1.5 h-1.5 rounded-full ${
													(item.status || "").toLowerCase() === "aktif" ? "bg-emerald-500" : "bg-rose-500"
												}`} />
												{item.status || "-"}
											</span>
										</td>
										<td className="px-5 py-3 text-right">
											<div className="flex items-center justify-end gap-1">
												<button
													onClick={() => nav(`/desa/aparatur-desa/${item.id}`)}
													className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
													title="Detail"
												>
													<Eye className="w-4 h-4" />
												</button>
												<button
													onClick={() => nav(`/desa/aparatur-desa/${item.id}/edit`)}
													className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
													title="Edit"
												>
													<Edit3 className="w-4 h-4" />
												</button>
											</div>
										</td>
									</tr>
								);
							}) : (
								<tr>
									<td colSpan="6" className="px-5 py-12 text-center">
										<UserCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
										<p className="text-slate-400 text-sm">
											{tab === "pemdes" ? "Tidak ada data pemerintah desa" : "Tidak ada data BPD"}
										</p>
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				{/* Mobile Cards */}
				<div className="md:hidden divide-y divide-slate-100">
					{currentData.length > 0 ? currentData.map((item) => {
						const foto = getPasFotoUrl(item);
						return (
							<div key={item.id} className="p-4 hover:bg-slate-50/50 transition-colors">
								<div className="flex items-center gap-3">
									{foto ? (
										<img
											src={foto}
											alt={item.nama_lengkap}
											className="h-11 w-11 rounded-full object-cover ring-2 ring-slate-100 flex-shrink-0"
											onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
										/>
									) : null}
									<div className={`h-11 w-11 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center flex-shrink-0 ${foto ? 'hidden' : ''}`}>
										<UserCircle className="h-6 w-6 text-slate-600" />
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-1.5">
											<Link to={`/desa/aparatur-desa/${item.id}`} className="font-semibold text-slate-900 text-sm hover:text-slate-700">
												{item.nama_lengkap}
											</Link>
											<CapVerifikasi status={item.status_verifikasi} />
										</div>
										<div className="flex items-center gap-2 mt-1 flex-wrap">
											<span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">{item.jabatan || "-"}</span>
											<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
												(item.status || "").toLowerCase() === "aktif" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
											}`}>
												<span className={`w-1.5 h-1.5 rounded-full ${(item.status || "").toLowerCase() === "aktif" ? "bg-emerald-500" : "bg-rose-500"}`} />
												{item.status}
											</span>
										</div>
									</div>
									<div className="flex items-center gap-1 flex-shrink-0">
										<button onClick={() => nav(`/desa/aparatur-desa/${item.id}`)} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg">
											<Eye className="w-4 h-4" />
										</button>
										<button onClick={() => nav(`/desa/aparatur-desa/${item.id}/edit`)} className="p-2 text-slate-400 hover:text-slate-700 rounded-lg">
											<Edit3 className="w-4 h-4" />
										</button>
									</div>
								</div>
							</div>
						);
					}) : (
						<div className="p-8 text-center">
							<UserCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
							<p className="text-slate-400 text-sm">
								{tab === "pemdes" ? "Tidak ada data pemerintah desa" : "Tidak ada data BPD"}
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};

export default AparaturDesaList;
