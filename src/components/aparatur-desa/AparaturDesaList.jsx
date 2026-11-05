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

// Nama item sama dengan ITEM_VERIFIKASI di backend, untuk keputusan yang belum final.
const LABEL_ITEM = {
	biodata: "Biodata diri",
	jabatan_sk: "Jabatan & SK pengangkatan",
	bpjs: "Nomor BPJS",
	file_sk_terakhir: "SK terakhir",
	file_ktp: "KTP",
	file_pas_foto: "Pas foto",
	file_kk: "Kartu Keluarga",
	file_akta_kelahiran: "Akta kelahiran",
	file_ijazah_terakhir: "Ijazah terakhir",
	file_bpjs_kesehatan: "Kartu BPJS Kesehatan",
	file_bpjs_ketenagakerjaan: "Kartu BPJS Ketenagakerjaan",
};

const tanggalPendek = (nilai) => {
	const d = nilai ? new Date(nilai) : null;
	return d && !Number.isNaN(d.getTime())
		? d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
		: null;
};

// Tahap pemeriksaan: dikirim desa, diperiksa Bidang Pemdes, lalu hasilnya.
const tahapVerifikasi = (a) => {
	const diperiksa = Object.values(a.verifikasi_item || {}).filter((v) => v?.status).length;
	const pada = tanggalPendek(a.dpmd_verified_at);
	if (a.status_verifikasi === "terverifikasi") {
		return { bilah: ["bg-emerald-500", "bg-emerald-500", "bg-emerald-500"], warna: "text-emerald-700", judul: "Terverifikasi", sub: pada && `Diperiksa ${pada}` };
	}
	if (a.status_verifikasi === "ditolak") {
		return { bilah: ["bg-slate-400", "bg-slate-400", "bg-rose-500"], warna: "text-rose-700", judul: "Perlu dibetulkan", sub: pada && `Diperiksa ${pada}` };
	}
	if (diperiksa > 0) {
		return { bilah: ["bg-slate-400", "bg-sky-500", "bg-slate-200"], warna: "text-sky-700", judul: "Sedang diperiksa", sub: `${diperiksa} item sudah diperiksa` };
	}
	return { bilah: ["bg-slate-400", "bg-slate-200", "bg-slate-200"], warna: "text-slate-600", judul: "Menunggu diperiksa", sub: "Belum diperiksa Bidang Pemdes" };
};

const TahapVerifikasi = ({ aparatur }) => {
	const t = tahapVerifikasi(aparatur);
	return (
		<div className="min-w-[8.5rem]">
			<div className="flex gap-0.5" aria-hidden="true">
				{t.bilah.map((warna, i) => (
					<span key={i} className={`h-1 flex-1 rounded-full ${warna}`} />
				))}
			</div>
			<p className={`mt-1.5 text-xs font-semibold ${t.warna}`}>{t.judul}</p>
			{t.sub && <p className="text-[11px] text-slate-500">{t.sub}</p>}
		</div>
	);
};

// Catatan final sudah disusun server; selama pemeriksaan berjalan diambil dari keputusan per item.
const catatanVerifikasi = (a) => {
	if (a.status_verifikasi === "terverifikasi") return [];
	if (a.catatan_verifikasi) return String(a.catatan_verifikasi).split("\n").map((t) => t.trim()).filter(Boolean);
	return Object.entries(a.verifikasi_item || {})
		.filter(([, v]) => v?.status === "tidak_sesuai" && v.catatan)
		.map(([kunci, v]) => `${LABEL_ITEM[kunci] || kunci}: ${v.catatan}`);
};

const CatatanVerifikasi = ({ aparatur, catatan }) => (
	<div className="rounded-lg bg-rose-50 px-3 py-2.5">
		<div className="flex items-start justify-between gap-3">
			<div className="min-w-0">
				<p className="text-xs font-semibold text-rose-900">Catatan Bidang Pemdes</p>
				<ul className="mt-1 space-y-0.5 text-xs text-slate-700">
					{catatan.map((baris) => {
						const pisah = baris.indexOf(": ");
						return (
							<li key={baris}>
								{pisah > 0 ? (
									<>
										<span className="font-semibold text-slate-900">{baris.slice(0, pisah)}:</span> {baris.slice(pisah + 2)}
									</>
								) : (
									baris
								)}
							</li>
						);
					})}
				</ul>
			</div>
			<Link
				to={`/desa/aparatur-desa/${aparatur.id}/edit`}
				className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 transition-colors hover:bg-rose-100"
			>
				<Edit3 className="h-3.5 w-3.5" />
				Betulkan
			</Link>
		</div>
	</div>
);

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
						}`}>{pemdes.filter((item) => (item.status || "").toLowerCase() === "aktif").length}</span>
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
						}`}>{bpd.filter((item) => (item.status || "").toLowerCase() === "aktif").length}</span>
					</button>
				</div>

				{/* Desktop Table */}
				<div className="hidden md:block">
					<table className="w-full">
						<thead>
							<tr className="bg-slate-50/80">
								<th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Aparatur</th>
								<th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Jabatan</th>
								<th className="hidden px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider xl:table-cell">Jenis Kelamin</th>
								<th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Pendidikan</th>
								<th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Verifikasi DPMD</th>
								<th className="px-5 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
								<th className="px-5 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Aksi</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{currentData.length > 0 ? currentData.map((item) => {
								const foto = getPasFotoUrl(item);
								const catatan = catatanVerifikasi(item);
								return (
									<React.Fragment key={item.id}>
									<tr className="hover:bg-slate-50 transition-colors group">
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
												<span className="font-medium text-slate-900 group-hover:text-slate-700 transition-colors">
													{item.nama_lengkap}
												</span>
											</Link>
										</td>
										<td className="px-5 py-3">
											<span className="inline-flex px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
												{item.jabatan || "-"}
											</span>
										</td>
										<td className="hidden px-5 py-3 text-sm text-slate-600 xl:table-cell">
											{item.jenis_kelamin === "Laki_laki" || item.jenis_kelamin === "Laki-laki" ? "Laki-laki" : item.jenis_kelamin === "Perempuan" ? "Perempuan" : "-"}
										</td>
										<td className="px-5 py-3 text-sm text-slate-600">{item.pendidikan_terakhir || "-"}</td>
										<td className="px-5 py-3">
											<TahapVerifikasi aparatur={item} />
										</td>
										<td className="px-5 py-3">
											<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
												(item.status || "").toLowerCase() === "aktif"
													? "bg-emerald-100 text-emerald-700"
													: "bg-rose-100 text-rose-700"
											}`}>
												<span className={`w-1.5 h-1.5 rounded-full ${
													(item.status || "").toLowerCase() === "aktif" ? "bg-emerald-500" : "bg-rose-500"
												}`} />
												{item.status?.replace(/_/g, " ") || "-"}
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
									{catatan.length > 0 && (
										<tr className="!border-t-0">
											<td colSpan="7" className="px-5 pb-3 pt-0">
												<CatatanVerifikasi aparatur={item} catatan={catatan} />
											</td>
										</tr>
									)}
									</React.Fragment>
								);
							}) : (
								<tr>
									<td colSpan="7" className="px-5 py-12 text-center">
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
						const catatan = catatanVerifikasi(item);
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
										<Link to={`/desa/aparatur-desa/${item.id}`} className="font-semibold text-slate-900 text-sm hover:text-slate-700">
											{item.nama_lengkap}
										</Link>
										<div className="flex items-center gap-2 mt-1 flex-wrap">
											<span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">{item.jabatan || "-"}</span>
											<span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
												(item.status || "").toLowerCase() === "aktif" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
											}`}>
												<span className={`w-1.5 h-1.5 rounded-full ${(item.status || "").toLowerCase() === "aktif" ? "bg-emerald-500" : "bg-rose-500"}`} />
												{item.status?.replace(/_/g, " ")}
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
								<div className="mt-3 pl-14">
									<TahapVerifikasi aparatur={item} />
								</div>
								{catatan.length > 0 && (
									<div className="mt-2">
										<CatatanVerifikasi aparatur={item} catatan={catatan} />
									</div>
								)}
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
