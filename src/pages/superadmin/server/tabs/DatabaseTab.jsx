// Tab Database — koneksi & latensi MySQL, statistik query, ukuran tiap tabel,
// dan proses/query yang sedang berjalan.

import React, { useCallback, useMemo, useState } from "react";
import { FiActivity, FiDatabase, FiLink, FiList, FiRefreshCw, FiSearch, FiTable, FiZap } from "react-icons/fi";
import api from "../../../../api";
import {
	Bar,
	Card,
	Galat,
	Memuat,
	Stat,
	StatusBadge,
	Tombol,
	formatAngka,
	formatBytes,
	formatDurasi,
	pesanError,
	usePolling,
} from "../serverUi";

const DatabaseTab = () => {
	const [data, setData] = useState(null);
	const [galat, setGalat] = useState(null);
	const [cari, setCari] = useState("");
	const [urut, setUrut] = useState("total_size");

	const muat = useCallback(async () => {
		try {
			const r = await api.get("/superadmin/server/database");
			setData(r.data?.data);
			setGalat(null);
		} catch (e) {
			setGalat(pesanError(e));
		}
	}, []);
	usePolling(muat, 20000);

	const tabel = useMemo(() => {
		const t = (data?.tables || []).filter((x) => x.name.toLowerCase().includes(cari.toLowerCase()));
		return [...t].sort((a, b) => (urut === "name" ? a.name.localeCompare(b.name) : (b[urut] || 0) - (a[urut] || 0)));
	}, [data, cari, urut]);

	if (galat && !data) return <Galat pesan={galat} onRetry={muat} />;
	if (!data) return <Memuat teks="Memeriksa database…" />;
	if (!data.connected) {
		return <Galat pesan={`Database tidak terhubung: ${data.error || "tanpa keterangan"}`} onRetry={muat} />;
	}

	const c = data.connections;
	const pakaiKoneksi = c.max ? (c.current / c.max) * 100 : 0;
	const maksTabel = data.tables[0]?.total_size || 1;

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<Stat icon={FiZap} tone={data.latency_ms > 200 ? "amber" : "green"} label="Latensi" value={`${data.latency_ms} ms`} hint="Waktu tempuh query sederhana" />
				<Stat icon={FiDatabase} tone="blue" label="Ukuran database" value={formatBytes(data.size.total)} hint={`${data.size.tables} tabel · ±${formatAngka(data.size.rows)} baris`} />
				<Stat icon={FiLink} tone={pakaiKoneksi > 80 ? "red" : "violet"} label="Koneksi" value={`${c.current}${c.max ? ` / ${c.max}` : ""}`} hint={`${c.running} sedang bekerja · puncak ${c.max_used}`} />
				<Stat icon={FiActivity} label="Query / detik" value={formatAngka(data.queries.qps)} hint={`${formatAngka(data.queries.slow)} query lambat`} />
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<Card title="Server Database" icon={FiDatabase} actions={<StatusBadge tingkat="baik" label="Terhubung" />}>
					<dl className="space-y-2 text-[13px]">
						{[
							["Versi", data.version],
							["Nama database", data.name],
							["Aktif selama", formatDurasi(data.uptime)],
							["Buffer pool", data.buffer_pool.size ? formatBytes(data.buffer_pool.size) : "-"],
							["Cache hit rate", data.buffer_pool.hit_rate !== null ? `${data.buffer_pool.hit_rate}%` : "-"],
							["Zona waktu", data.variables.time_zone || "-"],
							["Charset", data.variables.character_set_server || "-"],
							["Slow query log", data.variables.slow_query_log || "-"],
							["Batas query lambat", data.variables.long_query_time ? `${Number(data.variables.long_query_time)} dtk` : "-"],
						].map(([k, v]) => (
							<div key={k} className="flex justify-between gap-3 border-b border-slate-100 pb-1.5">
								<dt className="text-slate-500">{k}</dt>
								<dd className="text-right font-semibold text-slate-800">{v}</dd>
							</div>
						))}
					</dl>
				</Card>

				<Card title="Pemakaian Koneksi" icon={FiLink}>
					<div className="space-y-4">
						<div>
							<div className="mb-1 flex justify-between text-sm">
								<span className="text-slate-600">Koneksi aktif</span>
								<b>{c.max ? `${Math.round(pakaiKoneksi)}%` : c.current}</b>
							</div>
							<Bar percent={pakaiKoneksi} className="h-3" />
						</div>
						<dl className="space-y-2 text-[13px]">
							{[
								["Total koneksi sejak menyala", formatAngka(c.total)],
								["Koneksi gagal/terputus", formatAngka(c.aborted)],
								["Data diterima", formatBytes(data.traffic.received)],
								["Data dikirim", formatBytes(data.traffic.sent)],
								["Antrean kunci baris", formatAngka(data.queries.row_lock_waits)],
							].map(([k, v]) => (
								<div key={k} className="flex justify-between gap-3">
									<dt className="text-slate-500">{k}</dt>
									<dd className="font-semibold text-slate-800">{v}</dd>
								</div>
							))}
						</dl>
					</div>
				</Card>

				<Card title="Komposisi Query" subtitle="Sejak database menyala" icon={FiActivity}>
					{(() => {
						const jenis = [
							["SELECT (baca)", data.queries.select],
							["INSERT (tambah)", data.queries.insert],
							["UPDATE (ubah)", data.queries.update],
							["DELETE (hapus)", data.queries.delete],
						];
						const total = jenis.reduce((t, [, v]) => t + v, 0) || 1;
						return (
							<ul className="space-y-3">
								{jenis.map(([k, v]) => (
									<li key={k}>
										<div className="mb-1 flex justify-between text-[13px]">
											<span className="text-slate-600">{k}</span>
											<span className="font-semibold text-slate-800">
												{formatAngka(v)} <span className="font-normal text-slate-400">({Math.round((v / total) * 100)}%)</span>
											</span>
										</div>
										<Bar percent={(v / total) * 100} tingkat="baik" className="h-1.5" />
									</li>
								))}
							</ul>
						);
					})()}
				</Card>
			</div>

			<Card
				title="Tabel"
				subtitle={`${data.tables.length} tabel — ukuran dan jumlah baris perkiraan dari information_schema`}
				icon={FiTable}
				bodyClass="p-0"
				actions={
					<>
						<div className="relative">
							<FiSearch className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
							<input
								value={cari}
								onChange={(e) => setCari(e.target.value)}
								placeholder="Cari tabel…"
								className="w-44 rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-xs"
							/>
						</div>
						<select value={urut} onChange={(e) => setUrut(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
							<option value="total_size">Urut: ukuran</option>
							<option value="row_estimate">Urut: baris</option>
							<option value="index_size">Urut: indeks</option>
							<option value="free_size">Urut: ruang terbuang</option>
							<option value="name">Urut: nama</option>
						</select>
						<Tombol icon={FiRefreshCw} onClick={muat}>
							Muat ulang
						</Tombol>
					</>
				}
			>
				<div className="max-h-[520px] overflow-auto">
					<table className="w-full min-w-[760px] text-sm">
						<thead className="sticky top-0 z-10 bg-slate-50 text-left text-[11.5px] uppercase tracking-wide text-slate-500">
							<tr>
								<th className="px-4 py-2">Tabel</th>
								<th className="px-3 py-2 text-right">Baris</th>
								<th className="px-3 py-2 text-right">Data</th>
								<th className="px-3 py-2 text-right">Indeks</th>
								<th className="px-3 py-2 text-right">Terbuang</th>
								<th className="w-[22%] px-4 py-2">Total</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{tabel.map((t) => (
								<tr key={t.name} className="hover:bg-slate-50/60">
									<td className="px-4 py-2">
										<p className="font-mono text-xs font-semibold text-slate-800">{t.name}</p>
										<p className="text-[11px] text-slate-400">{t.engine}</p>
									</td>
									<td className="px-3 py-2 text-right">{formatAngka(t.row_estimate)}</td>
									<td className="px-3 py-2 text-right text-slate-600">{formatBytes(t.data_size)}</td>
									<td className="px-3 py-2 text-right text-slate-600">{formatBytes(t.index_size)}</td>
									<td className={`px-3 py-2 text-right ${t.free_size > 50 * 1048576 ? "font-semibold text-amber-600" : "text-slate-400"}`}>{formatBytes(t.free_size)}</td>
									<td className="px-4 py-2">
										<div className="flex items-center gap-2">
											<Bar percent={(t.total_size / maksTabel) * 100} tingkat="baik" className="h-1.5" />
											<span className="w-16 shrink-0 text-right text-xs font-semibold">{formatBytes(t.total_size)}</span>
										</div>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Card>

			<Card title="Proses Berjalan" subtitle="Koneksi/query yang sedang aktif di MySQL (diurut dari yang paling lama)" icon={FiList} bodyClass="p-0">
				{!data.processes.length ? (
					<p className="p-5 text-center text-sm text-slate-500">Tidak ada data proses (butuh hak PROCESS di MySQL untuk melihat koneksi pengguna lain).</p>
				) : (
					<div className="max-h-[360px] overflow-auto">
						<table className="w-full min-w-[720px] text-sm">
							<thead className="sticky top-0 bg-slate-50 text-left text-[11.5px] uppercase tracking-wide text-slate-500">
								<tr>
									<th className="px-4 py-2">ID</th>
									<th className="px-3 py-2">User / Host</th>
									<th className="px-3 py-2">Perintah</th>
									<th className="px-3 py-2 text-right">Durasi</th>
									<th className="px-4 py-2">Query</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{data.processes.map((p) => (
									<tr key={p.id} className={p.command === "Query" && p.time > 5 ? "bg-amber-50" : ""}>
										<td className="px-4 py-2 font-mono text-xs">{p.id}</td>
										<td className="px-3 py-2 text-xs text-slate-600">
											{p.user}@{String(p.host || "").split(":")[0]}
										</td>
										<td className="px-3 py-2 text-xs">{p.command}</td>
										<td className="px-3 py-2 text-right text-xs font-semibold">{p.time}s</td>
										<td className="max-w-[420px] truncate px-4 py-2 font-mono text-[11px] text-slate-600" title={p.info || ""}>
											{p.info || p.state || "-"}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Card>
		</div>
	);
};

export default DatabaseTab;
