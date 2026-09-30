// Tab Keamanan — tingkat ancaman, grafik serangan, jenis serangan, IP
// penyerang teratas, blokir IP (manual & otomatis), dan jejak kejadian lengkap.

import React, { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import { Bar as BarRc, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
	FiAlertOctagon,
	FiCheckCircle,
	FiChevronLeft,
	FiChevronRight,
	FiCopy,
	FiExternalLink,
	FiFilter,
	FiList,
	FiLock,
	FiRefreshCw,
	FiShield,
	FiShieldOff,
	FiSlash,
	FiTarget,
	FiTrash2,
	FiUnlock,
	FiAlertTriangle,
	FiEye,
} from "react-icons/fi";
import api from "../../../../api";
import {
	Card,
	Galat,
	Kosong,
	Legenda,
	Memuat,
	PilihRentang,
	SEVERITY,
	SeverityBadge,
	Stat,
	Tombol,
	formatAngka,
	formatWaktu,
	pesanError,
	sejak,
	usePolling,
} from "../serverUi";

const RENTANG = [
	{ value: "1h", label: "1 jam" },
	{ value: "24h", label: "24 jam" },
	{ value: "7d", label: "7 hari" },
	{ value: "30d", label: "30 hari" },
];

const TINGKAT = {
	aman: { judul: "Aman", teks: "Tidak ada aktivitas mencurigakan yang berarti dalam 1 jam terakhir.", kelas: "from-emerald-600 to-emerald-700", icon: FiCheckCircle },
	waspada: { judul: "Waspada", teks: "Ada aktivitas mencurigakan ringan (pemindaian/login gagal). Sistem terus memantau.", kelas: "from-amber-500 to-amber-600", icon: FiEye },
	tinggi: { judul: "Ancaman Tinggi", teks: "Beberapa serangan serius terdeteksi dalam 1 jam terakhir. Periksa IP penyerang di bawah.", kelas: "from-orange-600 to-red-600", icon: FiAlertTriangle },
	kritis: { judul: "Kritis — Sedang Diserang", teks: "Serangan intens sedang berlangsung. Pertimbangkan memblokir IP penyerang dan memperketat ambang auto-block.", kelas: "from-red-600 to-red-800", icon: FiAlertOctagon },
};

const SUMBER = { app: "Aplikasi", nginx: "Nginx", ssh: "SSH" };

const DURASI = [
	{ value: 60, label: "1 jam" },
	{ value: 360, label: "6 jam" },
	{ value: 1440, label: "1 hari" },
	{ value: 10080, label: "7 hari" },
	{ value: 43200, label: "30 hari" },
	{ value: "", label: "Permanen" },
];

const salin = (teks) => {
	navigator.clipboard?.writeText(teks).then(
		() => Swal.fire({ icon: "success", title: "Disalin", timer: 1000, showConfirmButton: false }),
		() => {},
	);
};

const TooltipSerangan = ({ active, payload, label, harian }) => {
	if (!active || !payload?.length) return null;
	const total = payload.reduce((t, p) => t + (p.value || 0), 0);
	return (
		<div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
			<p className="mb-1 font-semibold text-slate-500">
				{harian ? new Date(label).toLocaleDateString("id-ID", { dateStyle: "medium" }) : formatWaktu(label)}
			</p>
			{[...payload].reverse().map((p) => (
				<p key={p.dataKey} className="flex items-center gap-1.5 text-slate-700">
					<span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
					{SEVERITY[p.dataKey]?.label}: <b>{p.value}</b>
				</p>
			))}
			<p className="mt-1 border-t pt-1 font-semibold text-slate-800">Total: {total}</p>
		</div>
	);
};

const FormBlokir = ({ awal = "", onDone }) => {
	const [ip, setIp] = useState(awal);
	const [alasan, setAlasan] = useState("");
	const [durasi, setDurasi] = useState(1440);
	const [kirim, setKirim] = useState(false);
	useEffect(() => setIp(awal), [awal]);
	const submit = async (e) => {
		e.preventDefault();
		setKirim(true);
		try {
			await api.post("/superadmin/server/security/blocklist", { ip: ip.trim(), reason: alasan || undefined, minutes: durasi || null });
			Swal.fire({ icon: "success", title: `IP ${ip} diblokir`, timer: 1500, showConfirmButton: false });
			setIp("");
			setAlasan("");
			onDone();
		} catch (err) {
			Swal.fire({ icon: "error", title: "Gagal memblokir", text: pesanError(err) });
		} finally {
			setKirim(false);
		}
	};
	return (
		<form onSubmit={submit} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto_auto]">
			<input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="Alamat IP, mis. 185.220.101.1" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
			<input value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Alasan (opsional)" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
			<select value={durasi} onChange={(e) => setDurasi(e.target.value ? Number(e.target.value) : "")} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
				{DURASI.map((d) => (
					<option key={d.label} value={d.value}>
						{d.label}
					</option>
				))}
			</select>
			<button type="submit" disabled={kirim} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50">
				<FiSlash className="h-4 w-4" /> Blokir
			</button>
		</form>
	);
};

const SecurityTab = () => {
	const [rentang, setRentang] = useState("24h");
	const [ringkas, setRingkas] = useState(null);
	const [galat, setGalat] = useState(null);
	const [blokir, setBlokir] = useState([]);
	const [ipForm, setIpForm] = useState("");
	const [kejadian, setKejadian] = useState(null);
	const [filter, setFilter] = useState({ type: "", severity: "", source: "", ip: "", q: "", page: 1 });

	const muatRingkas = useCallback(async () => {
		try {
			const r = await api.get("/superadmin/server/security/summary", { params: { range: rentang } });
			setRingkas(r.data?.data);
			setGalat(null);
		} catch (e) {
			setGalat(pesanError(e));
		}
	}, [rentang]);

	const muatBlokir = useCallback(async () => {
		try {
			const r = await api.get("/superadmin/server/security/blocklist");
			setBlokir(r.data?.data || []);
		} catch {
			/* ringkasan menampilkan galat */
		}
	}, []);

	const muatKejadian = useCallback(async () => {
		try {
			const params = { ...filter, range: rentang, limit: 25 };
			Object.keys(params).forEach((k) => params[k] === "" && delete params[k]);
			const r = await api.get("/superadmin/server/security/events", { params });
			setKejadian(r.data);
		} catch {
			setKejadian({ data: [], total: 0, page: 1, limit: 25 });
		}
	}, [filter, rentang]);

	usePolling(
		() => {
			muatRingkas();
			muatBlokir();
		},
		20000,
		[rentang],
	);
	useEffect(() => {
		muatKejadian();
	}, [muatKejadian]);

	const muatSemua = () => {
		muatRingkas();
		muatBlokir();
		muatKejadian();
	};

	const bukaBlokir = async (ip) => {
		const ok = await Swal.fire({ icon: "question", title: `Buka blokir ${ip}?`, showCancelButton: true, confirmButtonText: "Buka blokir", cancelButtonText: "Batal" });
		if (!ok.isConfirmed) return;
		try {
			await api.delete(`/superadmin/server/security/blocklist/${encodeURIComponent(ip)}`);
			muatSemua();
		} catch (e) {
			Swal.fire({ icon: "error", title: "Gagal", text: pesanError(e) });
		}
	};

	const blokirCepat = async (ip, privat) => {
		const ok = await Swal.fire({
			icon: "warning",
			title: `Blokir ${ip}?`,
			html: privat
				? `<p style="font-size:14px"><b style="color:#b91c1c">Ini IP jaringan internal/proxy.</b> Memblokirnya bisa memutus akses SEMUA pengguna. Lanjutkan hanya bila Anda yakin.</p>`
				: `<p style="font-size:14px">IP ini tidak akan bisa mengakses aplikasi/API selama 24 jam.</p>`,
			showCancelButton: true,
			confirmButtonText: "Blokir 24 jam",
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
		});
		if (!ok.isConfirmed) return;
		try {
			await api.post("/superadmin/server/security/blocklist", { ip, minutes: 1440, reason: "Diblokir dari daftar penyerang teratas" });
			muatSemua();
		} catch (e) {
			Swal.fire({ icon: "error", title: "Gagal", text: pesanError(e) });
		}
	};

	const hapusJejak = async () => {
		const ok = await Swal.fire({
			icon: "warning",
			title: "Hapus seluruh jejak serangan?",
			text: "Semua riwayat kejadian keamanan dihapus permanen. Daftar blokir IP tidak terpengaruh.",
			showCancelButton: true,
			confirmButtonText: "Hapus semua",
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
		});
		if (!ok.isConfirmed) return;
		try {
			await api.delete("/superadmin/server/security/events");
			muatSemua();
		} catch (e) {
			Swal.fire({ icon: "error", title: "Gagal", text: pesanError(e) });
		}
	};

	const setF = (k, v) => setFilter((f) => ({ ...f, [k]: v, page: k === "page" ? v : 1 }));

	if (galat && !ringkas) return <Galat pesan={galat} onRetry={muatRingkas} />;
	if (!ringkas) return <Memuat teks="Menganalisis keamanan…" />;

	const t = TINGKAT[ringkas.threat_level] || TINGKAT.aman;
	const TIcon = t.icon;
	const harian = rentang === "7d" || rentang === "30d";
	const aktifBlokir = blokir.filter((b) => !b.expired);
	const jenisOpsi = Object.entries(ringkas.event_types || {});
	const totalHalaman = kejadian ? Math.max(1, Math.ceil(kejadian.total / kejadian.limit)) : 1;

	return (
		<div className="space-y-4">
			{/* Tingkat ancaman */}
			<div className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-gradient-to-r ${t.kelas} p-5 text-white shadow`}>
				<div className="flex items-start gap-3">
					<span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/15">
						<TIcon className="h-6 w-6" />
					</span>
					<div>
						<p className="text-xs font-semibold uppercase tracking-wider text-white/80">Tingkat ancaman saat ini</p>
						<p className="text-2xl font-extrabold">{t.judul}</p>
						<p className="mt-0.5 max-w-2xl text-sm text-white/90">{t.teks}</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<PilihRentang value={rentang} onChange={setRentang} opsi={RENTANG} />
					<button onClick={muatSemua} className="rounded-lg bg-white/15 p-2 hover:bg-white/25" title="Muat ulang">
						<FiRefreshCw className="h-4 w-4" />
					</button>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<Stat icon={FiTarget} tone="red" label="Kejadian" value={formatAngka(ringkas.total)} hint={`dalam ${RENTANG.find((r) => r.value === rentang)?.label}`} />
				<Stat icon={FiShield} tone="amber" label="IP mencurigakan" value={formatAngka(ringkas.unique_ips)} hint={`${formatAngka(ringkas.last_hour)} kejadian 1 jam terakhir`} />
				<Stat icon={FiAlertOctagon} tone="red" label="Serius" value={formatAngka(ringkas.by_severity.critical + ringkas.by_severity.high)} hint={`${ringkas.by_severity.critical} kritis · ${ringkas.by_severity.high} tinggi`} />
				<Stat icon={FiLock} tone="violet" label="IP diblokir" value={formatAngka(aktifBlokir.length)} hint={`${aktifBlokir.filter((b) => b.auto).length} otomatis · ${aktifBlokir.filter((b) => !b.auto).length} manual`} />
			</div>

			{/* Grafik */}
			<Card
				title="Grafik Serangan"
				subtitle={`Jumlah kejadian per ${harian ? "hari" : "jam"}, menurut tingkat keparahan`}
				icon={FiTarget}
				actions={<Legenda items={["critical", "high", "medium", "low"].map((k) => ({ label: SEVERITY[k].label, color: SEVERITY[k].warna }))} />}
			>
				{!ringkas.timeline.length ? (
					<Kosong icon={FiCheckCircle} title="Tidak ada serangan tercatat" text="Belum ada kejadian keamanan pada rentang waktu ini." />
				) : (
					<div style={{ height: 240 }}>
						<ResponsiveContainer width="100%" height="100%">
							<BarChart data={ringkas.timeline} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
								<CartesianGrid stroke="#eef2f6" vertical={false} />
								<XAxis
									dataKey="t"
									tickFormatter={(v) => (harian ? new Date(v).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) : new Date(v).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }))}
									tick={{ fontSize: 10.5, fill: "#64748b" }}
									axisLine={false}
									tickLine={false}
									minTickGap={30}
								/>
								<YAxis allowDecimals={false} tick={{ fontSize: 10.5, fill: "#64748b" }} axisLine={false} tickLine={false} width={44} />
								<Tooltip cursor={{ fill: "#f1f5f9" }} content={<TooltipSerangan harian={harian} />} />
								{["low", "medium", "high", "critical"].map((k, i, arr) => (
									<BarRc
										key={k}
										dataKey={k}
										stackId="s"
										fill={SEVERITY[k].warna}
										stroke="#fff"
										strokeWidth={1}
										radius={i === arr.length - 1 ? [4, 4, 0, 0] : 0}
										maxBarSize={28}
										isAnimationActive={false}
									/>
								))}
							</BarChart>
						</ResponsiveContainer>
					</div>
				)}
			</Card>

			<div className="grid gap-4 lg:grid-cols-5">
				{/* Jenis serangan */}
				<Card className="lg:col-span-2" title="Jenis Serangan" subtitle="Klik untuk menyaring jejak kejadian" icon={FiShield}>
					{!ringkas.by_type.length ? (
						<p className="py-6 text-center text-sm text-slate-500">Tidak ada.</p>
					) : (
						<ul className="space-y-2">
							{ringkas.by_type.map((x) => (
								<li key={x.event_type}>
									<button
										onClick={() => setF("type", x.event_type)}
										className="w-full rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/40"
									>
										<div className="flex items-center justify-between gap-2">
											<span className="flex items-center gap-2">
												<SeverityBadge severity={x.severity} />
												<span className="text-sm font-semibold text-slate-800">{x.label || x.event_type}</span>
											</span>
											<span className="text-sm font-extrabold text-slate-800">{formatAngka(x.n)}</span>
										</div>
										<p className="mt-1 text-xs text-slate-500">
											{x.info} · dari {formatAngka(x.ips)} IP
										</p>
									</button>
								</li>
							))}
						</ul>
					)}
				</Card>

				{/* IP teratas */}
				<Card className="lg:col-span-3" title="IP Penyerang Teratas" subtitle="Diurutkan dari serangan paling serius" icon={FiTarget} bodyClass="p-0">
					{!ringkas.top_ips.length ? (
						<div className="p-5">
							<Kosong icon={FiCheckCircle} title="Tidak ada IP mencurigakan" />
						</div>
					) : (
						<div className="max-h-[520px] overflow-auto">
							<ul className="divide-y divide-slate-100">
								{ringkas.top_ips.map((ip) => (
									<li key={ip.ip_address} className="px-4 py-3">
										<div className="flex flex-wrap items-start justify-between gap-2">
											<div className="min-w-0">
												<div className="flex flex-wrap items-center gap-2">
													<span className="font-mono text-sm font-bold text-slate-800">{ip.ip_address}</span>
													{ip.blocked && <span className="rounded bg-red-100 px-1.5 text-[10.5px] font-bold text-red-700">DIBLOKIR</span>}
													{ip.private && (
														<span className="rounded bg-slate-100 px-1.5 text-[10.5px] font-bold text-slate-600" title="IP jaringan internal — kemungkinan proxy/load balancer">
															INTERNAL/PROXY
														</span>
													)}
													{ip.score > 0 && <span className="rounded bg-orange-100 px-1.5 text-[10.5px] font-bold text-orange-700">skor {ip.score}</span>}
												</div>
												<p className="mt-0.5 text-xs text-slate-500">
													<b className="text-slate-700">{formatAngka(ip.n)}</b> kejadian ({formatAngka(ip.serius)} serius) · terakhir {sejak(ip.last_seen)} lalu · via{" "}
													{ip.sources.map((s) => SUMBER[s] || s).join(", ")}
												</p>
												<div className="mt-1.5 flex flex-wrap gap-1">
													{ip.types.slice(0, 6).map((ty) => (
														<span key={ty} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10.5px] font-medium text-slate-600">
															{ringkas.event_types[ty]?.label || ty}
														</span>
													))}
												</div>
											</div>
											<div className="flex shrink-0 gap-1.5">
												<Tombol icon={FiFilter} variant="ghost" onClick={() => setF("ip", ip.ip_address)} title="Lihat kejadian IP ini" />
												<a
													href={`https://www.abuseipdb.com/check/${ip.ip_address}`}
													target="_blank"
													rel="noreferrer"
													className="inline-flex items-center rounded-lg px-2 py-1.5 text-slate-600 hover:bg-slate-100"
													title="Cek reputasi IP di AbuseIPDB"
												>
													<FiExternalLink className="h-3.5 w-3.5" />
												</a>
												{ip.blocked ? (
													<Tombol icon={FiUnlock} onClick={() => bukaBlokir(ip.ip_address)}>
														Buka
													</Tombol>
												) : (
													<Tombol icon={FiSlash} variant="danger" onClick={() => blokirCepat(ip.ip_address, ip.private)}>
														Blokir
													</Tombol>
												)}
											</div>
										</div>
									</li>
								))}
							</ul>
						</div>
					)}
				</Card>
			</div>

			{/* Blokir IP */}
			<Card
				title="Daftar Blokir IP"
				subtitle="IP di sini ditolak mengakses aplikasi & API (HTTP 403). Blokir otomatis dibuat sistem saat skor ancaman melewati ambang."
				icon={FiLock}
			>
				<FormBlokir awal={ipForm} onDone={muatSemua} />
				<div className="mt-4 overflow-x-auto">
					{!blokir.length ? (
						<Kosong icon={FiShieldOff} title="Belum ada IP yang diblokir" />
					) : (
						<table className="w-full min-w-[780px] text-sm">
							<thead className="bg-slate-50 text-left text-[11.5px] uppercase tracking-wide text-slate-500">
								<tr>
									<th className="px-3 py-2">IP</th>
									<th className="px-3 py-2">Alasan</th>
									<th className="px-3 py-2">Jenis</th>
									<th className="px-3 py-2 text-right">Ditolak</th>
									<th className="px-3 py-2">Berlaku sampai</th>
									<th className="px-3 py-2 text-right">Aksi</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{blokir.map((b) => (
									<tr key={b.id} className={b.expired ? "opacity-50" : ""}>
										<td className="px-3 py-2 font-mono text-xs font-bold">{b.ip_address}</td>
										<td className="max-w-[320px] px-3 py-2 text-xs text-slate-600">
											{b.reason || "-"}
											<p className="text-[11px] text-slate-400">
												oleh {b.created_by || "-"} · {formatWaktu(b.created_at)}
											</p>
										</td>
										<td className="px-3 py-2">
											<span className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${b.auto ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-700"}`}>
												{b.auto ? "Otomatis" : "Manual"}
											</span>
										</td>
										<td className="px-3 py-2 text-right text-xs font-semibold">{formatAngka(b.hits)}x</td>
										<td className="px-3 py-2 text-xs">{b.expired ? "Kedaluwarsa" : b.expires_at ? formatWaktu(b.expires_at) : <b>Permanen</b>}</td>
										<td className="px-3 py-2">
											<div className="flex justify-end gap-1.5">
												<Tombol
													icon={FiCopy}
													variant="ghost"
													title="Salin perintah firewall (ufw) untuk memblokir di tingkat server"
													onClick={() => salin(`sudo ufw insert 1 deny from ${b.ip_address}`)}
												/>
												<Tombol icon={FiUnlock} onClick={() => bukaBlokir(b.ip_address)}>
													Buka
												</Tombol>
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					)}
				</div>
				<p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-[11.5px] text-slate-500">
					💡 Blokir di sini bekerja di tingkat aplikasi. Untuk menutup total (termasuk SSH & berkas statis), salin perintah firewall lewat tombol{" "}
					<FiCopy className="inline h-3 w-3" /> dan jalankan di terminal server.
				</p>
			</Card>

			{/* Target & log sistem */}
			<div className="grid gap-4 lg:grid-cols-2">
				<Card title="Alamat yang Paling Diincar" icon={FiTarget} bodyClass="p-0">
					{!ringkas.top_paths.length ? (
						<p className="p-5 text-center text-sm text-slate-500">Tidak ada.</p>
					) : (
						<ul className="max-h-[320px] divide-y divide-slate-100 overflow-auto">
							{ringkas.top_paths.map((p) => (
								<li key={p.path} className="flex items-center justify-between gap-3 px-4 py-2">
									<span className="truncate font-mono text-xs text-slate-700" title={p.path}>
										{p.path}
									</span>
									<span className="shrink-0 text-xs font-bold text-slate-800">{formatAngka(p.n)}x</span>
								</li>
							))}
						</ul>
					)}
				</Card>
				<Card title="Sumber Deteksi" subtitle="Dari mana serangan terdeteksi" icon={FiEye}>
					<div className="grid grid-cols-3 gap-2">
						{Object.entries(SUMBER).map(([k, l]) => (
							<div key={k} className="rounded-xl bg-slate-50 p-3 text-center">
								<p className="text-xl font-extrabold text-slate-800">{formatAngka(ringkas.by_source[k] || 0)}</p>
								<p className="text-xs text-slate-500">{l}</p>
							</div>
						))}
					</div>
					<ul className="mt-4 space-y-1.5 text-xs">
						{ringkas.system_logs.map((s) => (
							<li key={s.key} className="flex items-center justify-between gap-2">
								<span className="font-mono text-slate-600">{s.path}</span>
								<span className={s.readable ? "font-semibold text-emerald-600" : "text-slate-400"}>{s.readable ? "✓ dipantau" : "tidak terbaca"}</span>
							</li>
						))}
					</ul>
				</Card>
			</div>

			{/* Jejak kejadian */}
			<Card
				title="Jejak Kejadian"
				subtitle={kejadian ? `${formatAngka(kejadian.total)} kejadian cocok` : ""}
				icon={FiList}
				bodyClass="p-0"
				actions={
					<Tombol icon={FiTrash2} variant="dangerLight" onClick={hapusJejak}>
						Hapus semua
					</Tombol>
				}
			>
				<div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3">
					<select value={filter.type} onChange={(e) => setF("type", e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
						<option value="">Semua jenis</option>
						{jenisOpsi.map(([k, v]) => (
							<option key={k} value={k}>
								{v.label}
							</option>
						))}
					</select>
					<select value={filter.severity} onChange={(e) => setF("severity", e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
						<option value="">Semua tingkat</option>
						{Object.entries(SEVERITY).map(([k, v]) => (
							<option key={k} value={k}>
								{v.label}
							</option>
						))}
					</select>
					<select value={filter.source} onChange={(e) => setF("source", e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
						<option value="">Semua sumber</option>
						{Object.entries(SUMBER).map(([k, v]) => (
							<option key={k} value={k}>
								{v}
							</option>
						))}
					</select>
					<input value={filter.ip} onChange={(e) => setF("ip", e.target.value.trim())} placeholder="IP" className="w-36 rounded-lg border border-slate-200 px-2 py-1.5 text-xs" />
					<input value={filter.q} onChange={(e) => setF("q", e.target.value)} placeholder="Cari path/detail…" className="w-48 rounded-lg border border-slate-200 px-2 py-1.5 text-xs" />
					{(filter.type || filter.severity || filter.source || filter.ip || filter.q) && (
						<Tombol variant="ghost" onClick={() => setFilter({ type: "", severity: "", source: "", ip: "", q: "", page: 1 })}>
							Reset filter
						</Tombol>
					)}
				</div>
				{!kejadian ? (
					<Memuat />
				) : !kejadian.data.length ? (
					<div className="p-5">
						<Kosong icon={FiCheckCircle} title="Tidak ada kejadian" text="Tidak ada kejadian yang cocok dengan filter." />
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full min-w-[920px] text-sm">
							<thead className="bg-slate-50 text-left text-[11.5px] uppercase tracking-wide text-slate-500">
								<tr>
									<th className="px-4 py-2">Waktu</th>
									<th className="px-3 py-2">Tingkat</th>
									<th className="px-3 py-2">Jenis</th>
									<th className="px-3 py-2">IP</th>
									<th className="px-3 py-2">Target & detail</th>
									<th className="px-4 py-2">Tindakan</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{kejadian.data.map((e) => (
									<tr key={e.id} className="align-top hover:bg-slate-50/60">
										<td className="whitespace-nowrap px-4 py-2 text-xs text-slate-600">{formatWaktu(e.created_at, { second: "2-digit" })}</td>
										<td className="px-3 py-2">
											<SeverityBadge severity={e.severity} />
										</td>
										<td className="px-3 py-2 text-xs font-semibold text-slate-700">
											{e.label}
											<p className="font-normal text-slate-400">{SUMBER[e.source] || e.source}</p>
										</td>
										<td className="px-3 py-2">
											<button onClick={() => setF("ip", e.ip_address)} className="font-mono text-xs font-semibold text-blue-600 hover:underline">
												{e.ip_address}
											</button>
											<button onClick={() => setIpForm(e.ip_address)} className="ml-1.5 text-[11px] text-red-500 hover:underline" title="Isi ke form blokir">
												blokir
											</button>
										</td>
										<td className="max-w-[420px] px-3 py-2 text-xs">
											{e.path && (
												<p className="truncate font-mono text-slate-700" title={e.path}>
													{e.method ? `${e.method} ` : ""}
													{e.path}
												</p>
											)}
											{e.detail && <p className="text-slate-500">{e.detail}</p>}
											{e.user_agent && (
												<p className="truncate text-[11px] text-slate-400" title={e.user_agent}>
													{e.user_agent}
												</p>
											)}
										</td>
										<td className="px-4 py-2">
											{e.blocked ? (
												<span className="rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-bold text-red-700">Ditolak</span>
											) : (
												<span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600">Dicatat</span>
											)}
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
				{kejadian && kejadian.total > kejadian.limit && (
					<div className="flex items-center justify-between border-t px-4 py-2.5 text-xs text-slate-600">
						<span>
							Halaman {kejadian.page} dari {totalHalaman}
						</span>
						<div className="flex gap-1.5">
							<Tombol icon={FiChevronLeft} disabled={filter.page <= 1} onClick={() => setF("page", filter.page - 1)}>
								Sebelumnya
							</Tombol>
							<Tombol disabled={filter.page >= totalHalaman} onClick={() => setF("page", filter.page + 1)}>
								Berikutnya <FiChevronRight className="h-3.5 w-3.5" />
							</Tombol>
						</div>
					</div>
				)}
			</Card>
		</div>
	);
};

export default SecurityTab;
