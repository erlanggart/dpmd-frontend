import React, { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Check, CheckCheck, Eye, Filter, Search } from "lucide-react";
import toast from "react-hot-toast";
import { ackPeristiwa, getKamera, getPeristiwa, resolvePeristiwa, urlSnapshotPeristiwa } from "../../../api/smartCctvApi";

/**
 * Riwayat deteksi: filter kamera/tipe/statusrentang tanggal, halaman demi
 * halaman, pratinjau snapshot, akui/selesaikan.
 */

const TIPE = ["known", "unknown", "fall", "fall_warning", "immobility", "other"];
const STATUS = ["active", "acknowledged", "resolved"];

const TIPE_LABEL = {
	known: "Dikenal",
	unknown: "Tidak dikenal",
	fall: "Jatuh",
	fall_warning: "Peringatan jatuh",
	immobility: "Tidak bergerak",
	other: "Lainnya",
};

const STATUS_LABEL = { active: "Baru", acknowledged: "Diakui", resolved: "Selesai" };

const GAYA_TIPE = {
	known: "border-emerald-200 bg-emerald-50 text-emerald-700",
	unknown: "border-amber-200 bg-amber-50 text-amber-700",
	fall: "border-red-200 bg-red-50 text-red-700",
	fall_warning: "border-orange-200 bg-orange-50 text-orange-700",
	immobility: "border-purple-200 bg-purple-50 text-purple-700",
	other: "border-slate-200 bg-slate-50 text-slate-600",
};

const GAYA_STATUS = {
	active: "border-red-200 bg-red-50 text-red-700",
	acknowledged: "border-amber-200 bg-amber-50 text-amber-700",
	resolved: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const CctvHistoryPage = () => {
	const location = useLocation();
	const [kamera, setKamera] = useState([]);
	const [items, setItems] = useState([]);
	const [total, setTotal] = useState(0);
	const [halaman, setHalaman] = useState(1);
	const [memuat, setMemuat] = useState(true);
	const [snapshot, setSnapshot] = useState(null);

	const [filter, setFilter] = useState(() => ({
		camera_id: location.state?.camera_id || "",
		type: "",
		status: "",
		dari: "",
		sampai: "",
		cari: "",
	}));

	const perHalaman = 20;

	useEffect(() => {
		getKamera()
			.then((r) => setKamera(r.data.data || []))
			.catch(() => {});
	}, []);

	const muat = useCallback(async () => {
		setMemuat(true);
		try {
			const params = { page: halaman, limit: perHalaman };
			if (filter.camera_id) params.camera_id = filter.camera_id;
			if (filter.type) params.type = filter.type;
			if (filter.status) params.status = filter.status;
			if (filter.dari) params.dari = filter.dari;
			if (filter.sampai) params.sampai = filter.sampai;
			if (filter.cari.trim()) params.nama = filter.cari.trim();
			const r = await getPeristiwa(params);
			setItems(r.data.data?.items || []);
			setTotal(r.data.data?.total || 0);
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal memuat riwayat.");
		} finally {
			setMemuat(false);
		}
	}, [filter, halaman]);

	useEffect(() => {
		muat();
	}, [muat]);

	const ubahFilter = (k, v) => {
		setFilter((f) => ({ ...f, [k]: v }));
		setHalaman(1);
	};

	const tangani = async (aksi, p) => {
		if (aksi === "lihat") return setSnapshot(p);
		try {
			if (aksi === "ack") await ackPeristiwa(p.id);
			else await resolvePeristiwa(p.id);
			toast.success(aksi === "ack" ? "Peristiwa diakui." : "Peristiwa ditandai selesai.");
			muat();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal memperbarui.");
		}
	};

	const totalHalaman = Math.max(1, Math.ceil(total / perHalaman));

	const selectKelas =
		"rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none";

	return (
		<div className="rounded-xl border border-slate-200 bg-white p-5">
			<div className="mb-4 flex flex-wrap items-center gap-2">
				<Filter className="h-4 w-4 text-slate-400" />
				<select value={filter.camera_id} onChange={(e) => ubahFilter("camera_id", e.target.value)} className={selectKelas}>
					<option value="">Semua kamera</option>
					{kamera.map((k) => (
						<option key={k.id} value={k.id}>
							{k.name}
							{k.lokasi ? ` — ${k.lokasi}` : ""}
						</option>
					))}
				</select>
				<select value={filter.type} onChange={(e) => ubahFilter("type", e.target.value)} className={selectKelas}>
					<option value="">Semua tipe</option>
					{TIPE.map((t) => (
						<option key={t} value={t}>
							{TIPE_LABEL[t]}
						</option>
					))}
				</select>
				<select value={filter.status} onChange={(e) => ubahFilter("status", e.target.value)} className={selectKelas}>
					<option value="">Semua status</option>
					{STATUS.map((s) => (
						<option key={s} value={s}>
							{STATUS_LABEL[s]}
						</option>
					))}
				</select>
				<input
					type="date"
					value={filter.dari}
					onChange={(e) => ubahFilter("dari", e.target.value)}
					className={selectKelas}
					title="Dari tanggal"
				/>
				<input
					type="date"
					value={filter.sampai}
					onChange={(e) => ubahFilter("sampai", e.target.value)}
					className={selectKelas}
					title="Sampai tanggal"
				/>
				<div className="relative">
					<Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
					<input
						value={filter.cari}
						onChange={(e) => ubahFilter("cari", e.target.value)}
						placeholder="Cari nama…"
						className={`${selectKelas} pl-8`}
					/>
				</div>
			</div>

			{memuat ? (
				<div className="space-y-2">
					{Array.from({ length: 8 }).map((_, i) => (
						<div key={i} className="h-12 animate-pulse rounded-lg bg-slate-100" />
					))}
				</div>
			) : items.length === 0 ? (
				<p className="rounded-xl border border-dashed border-slate-200 py-14 text-center text-sm text-slate-400">
					Tidak ada peristiwa yang cocok dengan filter.
				</p>
			) : (
				<div className="overflow-x-auto">
					<table className="w-full text-left text-sm">
						<thead>
							<tr className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400">
								<th className="py-2 pr-3">Waktu</th>
								<th className="py-2 pr-3">Kamera</th>
								<th className="py-2 pr-3">Tipe</th>
								<th className="py-2 pr-3">Nama</th>
								<th className="py-2 pr-3">Keyakinan</th>
								<th className="py-2 pr-3">Status</th>
								<th className="py-2 pr-3 text-right">Aksi</th>
							</tr>
						</thead>
						<tbody>
							{items.map((p) => (
								<tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/60">
									<td className="whitespace-nowrap py-2.5 pr-3 text-slate-600">
										{new Date(p.occurred_at).toLocaleString("id-ID")}
									</td>
									<td className="py-2.5 pr-3 font-medium text-slate-900">{p.camera?.name || `Kamera ${p.camera_id}`}</td>
									<td className="py-2.5 pr-3">
										<span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${GAYA_TIPE[p.type] || GAYA_TIPE.other}`}>
											{TIPE_LABEL[p.type] || p.type}
										</span>
									</td>
									<td className="py-2.5 pr-3 text-slate-700">{p.nama || "—"}</td>
									<td className="py-2.5 pr-3 tabular-nums text-slate-600">
										{p.similarity != null
											? `${(Number(p.similarity) * 100).toFixed(0)}%`
											: p.confidence != null
												? `${(Number(p.confidence) * 100).toFixed(0)}%`
												: "—"}
									</td>
									<td className="py-2.5 pr-3">
										<span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${GAYA_STATUS[p.status] || ""}`}>
											{STATUS_LABEL[p.status] || p.status}
										</span>
									</td>
									<td className="py-2.5 text-right">
										<div className="inline-flex items-center gap-1">
											<button
												onClick={() => tangani("lihat", p)}
												title="Snapshot"
												className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
											>
												<Eye className="h-4 w-4" />
											</button>
											{p.status === "active" && (
												<button
													onClick={() => tangani("ack", p)}
													title="Akui"
													className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
												>
													<Check className="h-4 w-4" />
												</button>
											)}
											{p.status !== "resolved" && (
												<button
													onClick={() => tangani("resolve", p)}
													title="Selesaikan"
													className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
												>
													<CheckCheck className="h-4 w-4" />
												</button>
											)}
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			)}

			{totalHalaman > 1 && (
				<div className="mt-4 flex items-center justify-between text-sm text-slate-500">
					<span>
						{total} peristiwa · halaman {halaman}/{totalHalaman}
					</span>
					<div className="flex gap-2">
						<button
							disabled={halaman <= 1}
							onClick={() => setHalaman((h) => h - 1)}
							className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium disabled:opacity-40"
						>
							Sebelumnya
						</button>
						<button
							disabled={halaman >= totalHalaman}
							onClick={() => setHalaman((h) => h + 1)}
							className="rounded-lg border border-slate-200 px-3 py-1.5 font-medium disabled:opacity-40"
						>
							Berikutnya
						</button>
					</div>
				</div>
			)}

			{snapshot && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
					onClick={() => setSnapshot(null)}
				>
					<div className="w-full max-w-2xl rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
						<div className="mb-3 flex items-center justify-between">
							<div>
								<p className="text-sm font-semibold text-slate-900">
									{TIPE_LABEL[snapshot.type] || snapshot.type} · {snapshot.camera?.name || `Kamera ${snapshot.camera_id}`}
								</p>
								<p className="text-xs text-slate-500">{new Date(snapshot.occurred_at).toLocaleString("id-ID")}</p>
							</div>
							<button onClick={() => setSnapshot(null)} className="text-slate-400 hover:text-slate-900">
								✕
							</button>
						</div>
						<img
							src={urlSnapshotPeristiwa(snapshot.id)}
							alt="Snapshot peristiwa"
							className="w-full rounded-lg border border-slate-200"
						/>
					</div>
				</div>
			)}
		</div>
	);
};

export default CctvHistoryPage;
