// Tab Trafik — request per menit, kode status, waktu respons, endpoint
// terpadat/terlambat/paling sering error, dan IP pengakses terbanyak.

import React, { useCallback, useState } from "react";
import Swal from "sweetalert2";
import { FiActivity, FiAlertCircle, FiBarChart2, FiClock, FiRefreshCw, FiRotateCcw, FiUsers, FiZap } from "react-icons/fi";
import api from "../../../../api";
import {
	Bar,
	Card,
	Galat,
	GrafikArea,
	Legenda,
	Memuat,
	SERI,
	Stat,
	Tombol,
	formatAngka,
	formatBytes,
	formatWaktu,
	pesanError,
	sejak,
	usePolling,
} from "../serverUi";

const TabelRute = ({ rows, kolom }) => (
	<div className="max-h-[380px] overflow-auto">
		<table className="w-full text-sm">
			<thead className="sticky top-0 bg-slate-50 text-left text-[11.5px] uppercase tracking-wide text-slate-500">
				<tr>
					<th className="px-4 py-2">Endpoint</th>
					{kolom.map((k) => (
						<th key={k.key} className="px-3 py-2 text-right">
							{k.label}
						</th>
					))}
				</tr>
			</thead>
			<tbody className="divide-y divide-slate-100">
				{rows.map((r) => (
					<tr key={r.route}>
						<td className="max-w-[360px] truncate px-4 py-2 font-mono text-xs text-slate-700" title={r.route}>
							{r.route}
						</td>
						{kolom.map((k) => (
							<td key={k.key} className={`px-3 py-2 text-right text-xs ${k.kelas ? k.kelas(r) : "text-slate-700"}`}>
								{k.format ? k.format(r[k.key]) : r[k.key]}
							</td>
						))}
					</tr>
				))}
				{!rows.length && (
					<tr>
						<td colSpan={kolom.length + 1} className="px-4 py-6 text-center text-sm text-slate-500">
							Belum ada data.
						</td>
					</tr>
				)}
			</tbody>
		</table>
	</div>
);

const TrafficTab = () => {
	const [data, setData] = useState(null);
	const [galat, setGalat] = useState(null);

	const muat = useCallback(async () => {
		try {
			const r = await api.get("/superadmin/server/traffic");
			setData(r.data?.data);
			setGalat(null);
		} catch (e) {
			setGalat(pesanError(e));
		}
	}, []);
	usePolling(muat, 10000);

	const reset = async () => {
		const ok = await Swal.fire({ icon: "question", title: "Reset statistik trafik?", text: "Penghitung endpoint, IP, dan kode status dimulai dari nol.", showCancelButton: true, confirmButtonText: "Reset", cancelButtonText: "Batal" });
		if (!ok.isConfirmed) return;
		await api.post("/superadmin/server/traffic/reset");
		muat();
	};

	if (galat && !data) return <Galat pesan={galat} onRetry={muat} />;
	if (!data) return <Memuat />;

	const s = data.status;
	const total = data.total || 1;
	const kelas = ["2xx", "3xx", "4xx", "5xx"].map((k) => ({ k, n: s[k] || 0 }));
	const kodeRinci = Object.entries(s)
		.filter(([k]) => /^\d{3}$/.test(k))
		.sort((a, b) => b[1] - a[1]);
	const maksIp = data.top_ips[0]?.count || 1;

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-4 py-2.5 text-xs text-slate-600 ring-1 ring-slate-200">
				<span>
					Statistik sejak <b>{formatWaktu(data.since)}</b> ({sejak(data.since)}) — tersimpan di memori, kembali nol saat backend restart.
				</span>
				<div className="flex gap-1.5">
					<Tombol icon={FiRefreshCw} onClick={muat}>
						Muat ulang
					</Tombol>
					<Tombol icon={FiRotateCcw} onClick={reset}>
						Reset
					</Tombol>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<Stat icon={FiActivity} tone="blue" label="Total request" value={formatAngka(data.total)} hint={`${formatBytes(data.bytes)} dikirim`} />
				<Stat icon={FiZap} tone="green" label="Request / menit" value={formatAngka(data.rpm)} hint="Rata-rata 60 menit terakhir" />
				<Stat icon={FiClock} tone="violet" label="Waktu respons" value={`${data.p50} ms`} hint={`p95 ${data.p95} ms · p99 ${data.p99} ms`} />
				<Stat
					icon={FiAlertCircle}
					tone={(s["5xx"] || 0) / total > 0.02 ? "red" : "amber"}
					label="Error server (5xx)"
					value={formatAngka(s["5xx"] || 0)}
					hint={`${(((s["5xx"] || 0) / total) * 100).toFixed(2)}% dari semua request`}
				/>
			</div>

			<div className="grid gap-4 lg:grid-cols-3">
				<Card className="lg:col-span-2" title="Request per Menit" subtitle="60 menit terakhir" icon={FiBarChart2} actions={<Legenda items={[{ label: "Berhasil/lainnya", color: SERI.biru }, { label: "Error klien 4xx", color: SERI.kuning }, { label: "Error server 5xx", color: SERI.merah }]} />}>
					<GrafikArea
						data={data.per_minute.map((m) => ({ ...m, ok: m.count - m.e4 - m.e5 }))}
						series={[
							{ key: "ok", name: "Berhasil/lainnya", color: SERI.biru },
							{ key: "e4", name: "4xx", color: SERI.kuning },
							{ key: "e5", name: "5xx", color: SERI.merah },
						]}
						stacked
						format={(v) => formatAngka(Math.round(v))}
						height={220}
					/>
				</Card>
				<Card title="Kode Status" icon={FiActivity}>
					<div className="space-y-3">
						{kelas.map(({ k, n }) => (
							<div key={k}>
								<div className="mb-1 flex justify-between text-sm">
									<span className="font-semibold text-slate-700">
										{k} <span className="text-xs font-normal text-slate-500">{{ "2xx": "berhasil", "3xx": "dialihkan", "4xx": "ditolak/tidak ada", "5xx": "error server" }[k]}</span>
									</span>
									<span>
										<b>{formatAngka(n)}</b> <span className="text-xs text-slate-500">({((n / total) * 100).toFixed(1)}%)</span>
									</span>
								</div>
								<Bar percent={(n / total) * 100} tingkat={k === "5xx" ? "kritis" : k === "4xx" ? "waspada" : "baik"} className="h-2" />
							</div>
						))}
					</div>
					<div className="mt-4 flex flex-wrap gap-1.5">
						{kodeRinci.slice(0, 14).map(([k, n]) => (
							<span key={k} className={`rounded-md px-1.5 py-0.5 text-[11px] font-semibold ${k >= 500 ? "bg-red-100 text-red-700" : k >= 400 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"}`}>
								{k}: {formatAngka(n)}
							</span>
						))}
					</div>
				</Card>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card title="Endpoint Tersibuk" icon={FiActivity} bodyClass="p-0">
					<TabelRute
						rows={data.top_routes}
						kolom={[
							{ key: "count", label: "Request", format: formatAngka },
							{ key: "avg_ms", label: "Rata2", format: (v) => `${v} ms` },
							{ key: "bytes", label: "Data", format: formatBytes },
						]}
					/>
				</Card>
				<Card title="Endpoint Terlambat" subtitle="Minimal 3 request" icon={FiClock} bodyClass="p-0">
					<TabelRute
						rows={data.slowest_routes}
						kolom={[
							{ key: "avg_ms", label: "Rata2", format: (v) => `${v} ms`, kelas: (r) => (r.avg_ms > 1000 ? "font-bold text-red-600" : r.avg_ms > 300 ? "font-semibold text-amber-600" : "text-slate-700") },
							{ key: "max_ms", label: "Terlama", format: (v) => `${v} ms` },
							{ key: "count", label: "Request", format: formatAngka },
						]}
					/>
				</Card>
				<Card title="Endpoint Paling Sering Error" icon={FiAlertCircle} bodyClass="p-0">
					<TabelRute
						rows={data.error_routes}
						kolom={[
							{ key: "errors", label: "Error", format: formatAngka, kelas: () => "font-bold text-red-600" },
							{ key: "count", label: "Request", format: formatAngka },
						]}
					/>
				</Card>
				<Card title="IP Pengakses Terbanyak" icon={FiUsers} bodyClass="p-0">
					<ul className="max-h-[380px] divide-y divide-slate-100 overflow-auto">
						{data.top_ips.map((ip) => (
							<li key={ip.ip} className="px-4 py-2">
								<div className="mb-1 flex justify-between gap-2 text-xs">
									<span className="font-mono font-semibold text-slate-700">{ip.ip}</span>
									<span className="text-slate-600">
										<b>{formatAngka(ip.count)}</b> req · {formatAngka(ip.errors)} error · {formatBytes(ip.bytes)} · {sejak(ip.last)} lalu
									</span>
								</div>
								<Bar percent={(ip.count / maksIp) * 100} tingkat="baik" className="h-1.5" />
							</li>
						))}
					</ul>
				</Card>
			</div>
		</div>
	);
};

export default TrafficTab;
