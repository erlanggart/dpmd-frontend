// src/pages/superadmin/SuperadminDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
	ResponsiveContainer,
	AreaChart,
	Area,
	PieChart,
	Pie,
	Cell,
	Tooltip,
} from "recharts";
import {
	FiActivity,
	FiAlertTriangle,
	FiArrowUpRight,
	FiBookOpen,
	FiBriefcase,
	FiCalendar,
	FiCheckCircle,
	FiClock,
	FiCpu,
	FiDatabase,
	FiDownloadCloud,
	FiFileText,
	FiHardDrive,
	FiHome,
	FiImage,
	FiLayers,
	FiMail,
	FiMapPin,
	FiRefreshCw,
	FiServer,
	FiSettings,
	FiShield,
	FiUserCheck,
	FiUsers,
	FiZap,
} from "react-icons/fi";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";
import OnlineUsersSidebar from "../../components/users/OnlineUsersSidebar";

/* ───────────────────────────── Helper ───────────────────────────── */

const angka = (v) => (v === null || v === undefined ? "—" : Number(v).toLocaleString("id-ID"));

const waktuRelatif = (tgl) => {
	if (!tgl) return "";
	const detik = Math.round((Date.now() - new Date(tgl).getTime()) / 1000);
	if (detik < 60) return "baru saja";
	if (detik < 3600) return `${Math.floor(detik / 60)} mnt lalu`;
	if (detik < 86400) return `${Math.floor(detik / 3600)} jam lalu`;
	return new Date(tgl).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};

/** Warna status berdasarkan persentase pemakaian. */
const nadaPersen = (p) => {
	if (p == null) return { teks: "text-slate-400", isi: "#cbd5e1", label: "—" };
	if (p >= 85) return { teks: "text-rose-600", isi: "#e11d48", label: "Kritis" };
	if (p >= 70) return { teks: "text-amber-600", isi: "#d97706", label: "Tinggi" };
	return { teks: "text-emerald-600", isi: "#059669", label: "Normal" };
};

const WARNA_AKSI = {
	create: "bg-emerald-100 text-emerald-700",
	update: "bg-sky-100 text-sky-700",
	delete: "bg-rose-100 text-rose-700",
	login: "bg-violet-100 text-violet-700",
	logout: "bg-slate-100 text-slate-600",
	approve: "bg-teal-100 text-teal-700",
	reject: "bg-orange-100 text-orange-700",
};

const muncul = (delay = 0) => ({
	initial: { opacity: 0, y: 14 },
	animate: { opacity: 1, y: 0 },
	transition: { delay, duration: 0.35, ease: [0.22, 1, 0.36, 1] },
});

/* ──────────────────────────── Komponen kecil ──────────────────────────── */

const Panel = ({ title, icon: Icon, action, onAction, children, className = "", delay = 0 }) => (
	<motion.section
		{...muncul(delay)}
		className={`rounded-2xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}
	>
		<header className="mb-4 flex items-center gap-2.5">
			{Icon && (
				<span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
					<Icon className="h-4 w-4" />
				</span>
			)}
			<h3 className="text-sm font-semibold text-slate-900">{title}</h3>
			{action && (
				<button
					onClick={onAction}
					className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
				>
					{action}
					<FiArrowUpRight className="h-3.5 w-3.5" />
				</button>
			)}
		</header>
		{children}
	</motion.section>
);

const Skeleton = ({ className = "" }) => <span className={`inline-block animate-pulse rounded-md bg-slate-200/80 ${className}`} />;

const KpiCard = ({ icon: Icon, label, value, sub, tone, onClick, delay }) => (
	<motion.button
		{...muncul(delay)}
		whileHover={{ y: -3 }}
		onClick={onClick}
		className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow hover:shadow-lg hover:shadow-slate-200/60"
	>
		<div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full opacity-[0.08] transition-transform duration-500 group-hover:scale-150 ${tone.bg}`} />
		<div className="relative flex items-start justify-between">
			<span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone.soft}`}>
				<Icon className="h-5 w-5" />
			</span>
			<FiArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-slate-600" />
		</div>
		<p className="relative mt-3 text-2xl font-bold tracking-tight text-slate-900 tabular-nums">
			{value === undefined ? <Skeleton className="h-7 w-16" /> : angka(value)}
		</p>
		<p className="relative mt-0.5 text-xs font-medium text-slate-500">{label}</p>
		{sub && <p className="relative mt-1 truncate text-[11px] text-slate-400">{sub}</p>}
	</motion.button>
);

const Gauge = ({ label, icon: Icon, persen, detail }) => {
	const nada = nadaPersen(persen);
	const keliling = 2 * Math.PI * 30;
	const isi = persen == null ? 0 : Math.min(persen, 100) / 100;
	return (
		<div className="flex flex-col items-center rounded-xl bg-slate-50 p-3">
			<div className="relative h-20 w-20">
				<svg viewBox="0 0 72 72" className="h-20 w-20 -rotate-90">
					<circle cx="36" cy="36" r="30" fill="none" stroke="#e2e8f0" strokeWidth="7" />
					<motion.circle
						cx="36"
						cy="36"
						r="30"
						fill="none"
						stroke={nada.isi}
						strokeWidth="7"
						strokeLinecap="round"
						strokeDasharray={keliling}
						initial={{ strokeDashoffset: keliling }}
						animate={{ strokeDashoffset: keliling * (1 - isi) }}
						transition={{ duration: 1, ease: "easeOut" }}
					/>
				</svg>
				<div className="absolute inset-0 flex flex-col items-center justify-center">
					<span className={`text-base font-bold tabular-nums ${nada.teks}`}>
						{persen == null ? "—" : `${Math.round(persen)}%`}
					</span>
				</div>
			</div>
			<div className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
				<Icon className="h-3.5 w-3.5 text-slate-400" />
				{label}
			</div>
			<p className="mt-0.5 text-[11px] text-slate-400">{detail || nada.label}</p>
		</div>
	);
};

const TooltipGrafik = ({ active, payload }) => {
	if (!active || !payload?.length) return null;
	return (
		<div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
			{payload.map((p) => (
				<p key={p.dataKey} className="flex items-center gap-2 text-slate-600">
					<span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
					{p.name}: <b className="text-slate-900">{Math.round(p.value)}%</b>
				</p>
			))}
		</div>
	);
};

/* ──────────────────────────── Halaman ──────────────────────────── */

const PERAN = [
	{ key: "superadmin", label: "Super Admin", warna: "#e11d48" },
	{ key: "kepala_dinas", label: "Kepala Dinas", warna: "#2563eb" },
	{ key: "sekretaris_dinas", label: "Sekretaris", warna: "#4f46e5" },
	{ key: "kepala_bidang", label: "Kepala Bidang", warna: "#059669" },
	{ key: "ketua_tim", label: "Ketua Tim", warna: "#0d9488" },
	{ key: "pegawai", label: "Pegawai", warna: "#64748b" },
	{ key: "desa", label: "Desa", warna: "#16a34a" },
	{ key: "kecamatan", label: "Kecamatan", warna: "#7c3aed" },
	{ key: "kelurahan", label: "Kelurahan", warna: "#0891b2" },
];

const PINTASAN = [
	{ label: "User", icon: FiUsers, path: "/superadmin/users", tone: "bg-sky-50 text-sky-700" },
	{ label: "Kepegawaian", icon: FiBriefcase, path: "/superadmin/kepegawaian", tone: "bg-amber-50 text-amber-700" },
	{ label: "Bidang", icon: FiLayers, path: "/superadmin/bidang", tone: "bg-emerald-50 text-emerald-700" },
	{ label: "Berita", icon: FiFileText, path: "/superadmin/berita", tone: "bg-pink-50 text-pink-700" },
	{ label: "Hero Gallery", icon: FiImage, path: "/superadmin/hero-gallery", tone: "bg-violet-50 text-violet-700" },
	{ label: "Server", icon: FiServer, path: "/superadmin/server", tone: "bg-slate-100 text-slate-700" },
	{ label: "Backup", icon: FiDownloadCloud, path: "/superadmin/backup", tone: "bg-teal-50 text-teal-700" },
	{ label: "Settings", icon: FiSettings, path: "/superadmin/settings", tone: "bg-orange-50 text-orange-700" },
];

const SuperadminDashboard = () => {
	const { user } = useAuth();
	const navigate = useNavigate();
	const [data, setData] = useState({});
	const [memuat, setMemuat] = useState(true);
	const [diperbarui, setDiperbarui] = useState(null);
	const [kini, setKini] = useState(new Date());

	useEffect(() => {
		const t = setInterval(() => setKini(new Date()), 1000);
		return () => clearInterval(t);
	}, []);

	const muat = useCallback(async () => {
		setMemuat(true);
		const ambil = (url, config) =>
			api.get(url, config).then((r) => (r.data?.success ? r.data.data : null)).catch(() => null);

		const [general, users, berita, absensi, server, aktivitas, statAktivitas] = await Promise.all([
			ambil("/chatbot/stats"),
			ambil("/users/stats"),
			ambil("/berita/admin/stats"),
			ambil("/absensi/admin/dashboard-hari-ini"),
			ambil("/superadmin/server/overview"),
			ambil("/activity-logs", { params: { limit: 8 } }),
			ambil("/activity-logs/stats"),
		]);
		setData({ general, users, berita, absensi, server, aktivitas, statAktivitas });
		setDiperbarui(new Date());
		setMemuat(false);
	}, []);

	useEffect(() => {
		muat();
		// Metrik server berubah cepat — segarkan tiap menit selama halaman terbuka.
		const t = setInterval(muat, 60000);
		return () => clearInterval(t);
	}, [muat]);

	const { general, users, berita, absensi, server, aktivitas, statAktivitas } = data;
	// undefined = masih memuat pertama kali (tampil skeleton); null = gagal.
	const g = (k) => (memuat && !diperbarui ? undefined : general?.[k] ?? null);

	const jam = kini.getHours();
	const sapaan = jam < 11 ? "Selamat pagi" : jam < 15 ? "Selamat siang" : jam < 18 ? "Selamat sore" : "Selamat malam";
	const nama = user?.name || user?.nama || "Superadmin";

	const cpu = server?.latest?.cpu ?? null;
	const ram = server?.latest?.memory?.percent ?? null;
	const disk = server?.latest?.disk?.percent ?? null;
	const peringatan = Array.isArray(server?.alerts) ? server.alerts : [];
	const sehat = server ? peringatan.length === 0 && server.database?.connected !== false : null;

	const riwayat = useMemo(
		() =>
			(server?.history || []).map((p, i) => ({
				i,
				cpu: typeof p.cpu === "number" ? p.cpu : null,
				memory: typeof p.memory === "number" ? p.memory : p.memory?.percent ?? null,
			})),
		[server],
	);

	const dataPeran = useMemo(
		() => PERAN.map((p) => ({ ...p, value: Number(users?.[p.key]) || 0 })).filter((p) => p.value > 0),
		[users],
	);

	const ringkasAbsensi = absensi?.summary;
	const totalAbsen = absensi?.total_records || 0;
	const belumAbsen = Array.isArray(absensi?.belum_absen) ? absensi.belum_absen.length : absensi?.belum_absen;
	const persenHadir = totalAbsen ? Math.round(((ringkasAbsensi?.hadir || 0) / totalAbsen) * 100) : null;

	const persenTerbit = berita?.total_berita ? Math.round((berita.published / berita.total_berita) * 100) : 0;

	return (
		<div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_#eef2ff_0%,_transparent_45%)] p-4 md:p-6 lg:p-8">
			<div className="mx-auto flex max-w-[1600px] gap-6">
				<div className="min-w-0 flex-1 space-y-6">
					{/* ── Hero ── */}
					<motion.section
						{...muncul(0)}
						className="relative overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl shadow-slate-900/10 md:p-8"
					>
						<div className="pointer-events-none absolute inset-0">
							<div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-indigo-500/30 blur-3xl" />
							<div className="absolute -bottom-28 right-10 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
							<div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
						</div>

						<div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
							<div>
								<span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium text-white/70 backdrop-blur">
									<FiShield className="h-3.5 w-3.5" />
									Control Center · Super Administrator
								</span>
								<h1 className="mt-4 text-2xl font-semibold tracking-tight md:text-4xl">
									{sapaan}, <span className="bg-gradient-to-r from-indigo-300 to-emerald-300 bg-clip-text text-transparent">{nama.split(" ")[0]}</span>
								</h1>
								<p className="mt-2 max-w-xl text-sm text-white/60">
									Ringkasan seluruh sistem DPMD Kabupaten Bogor — data, pengguna, dan kesehatan server dalam satu layar.
								</p>

								<div className="mt-5 flex flex-wrap items-center gap-2">
									<span
										className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
											sehat === null
												? "bg-white/10 text-white/70"
												: sehat
													? "bg-emerald-400/15 text-emerald-200"
													: "bg-rose-400/15 text-rose-200"
										}`}
									>
										<span className="relative flex h-2 w-2">
											{sehat !== null && (
												<span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${sehat ? "bg-emerald-300" : "bg-rose-300"}`} />
											)}
											<span className={`relative inline-flex h-2 w-2 rounded-full ${sehat === null ? "bg-white/50" : sehat ? "bg-emerald-300" : "bg-rose-300"}`} />
										</span>
										{sehat === null ? "Status server tidak tersedia" : sehat ? "Semua sistem normal" : `${peringatan.length || 1} peringatan aktif`}
									</span>
									{statAktivitas && (
										<span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/75">
											<FiActivity className="h-3.5 w-3.5" />
											{angka(statAktivitas.today)} aktivitas hari ini
										</span>
									)}
									{persenHadir !== null && (
										<span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium text-white/75">
											<FiUserCheck className="h-3.5 w-3.5" />
											{persenHadir}% pegawai hadir
										</span>
									)}
								</div>
							</div>

							<div className="flex items-end gap-4 lg:flex-col lg:items-end">
								<div className="text-left lg:text-right">
									<p className="font-mono text-3xl font-semibold tabular-nums tracking-tight md:text-4xl">
										{kini.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
									</p>
									<p className="mt-1 text-xs text-white/50">
										{kini.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
									</p>
								</div>
								<button
									onClick={muat}
									disabled={memuat}
									className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-medium text-white backdrop-blur transition-colors hover:bg-white/20 disabled:opacity-60"
								>
									<FiRefreshCw className={`h-3.5 w-3.5 ${memuat ? "animate-spin" : ""}`} />
									{diperbarui ? `Diperbarui ${diperbarui.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}` : "Memuat…"}
								</button>
							</div>
						</div>
					</motion.section>

					{/* ── KPI ── */}
					<div className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-8">
						<KpiCard delay={0.04} icon={FiHome} label="Desa / Kelurahan" value={g("totalDesaDanKelurahan")}
							sub={general ? `${angka(general.totalDesa)} desa · ${angka(general.totalKelurahan)} kel.` : null}
							tone={{ bg: "bg-emerald-500", soft: "bg-emerald-50 text-emerald-600" }} onClick={() => navigate("/core-dashboard")} />
						<KpiCard delay={0.07} icon={FiMapPin} label="Kecamatan" value={g("totalKecamatan")}
							tone={{ bg: "bg-violet-500", soft: "bg-violet-50 text-violet-600" }} onClick={() => navigate("/core-dashboard")} />
						<KpiCard delay={0.1} icon={FiUsers} label="Pegawai DPMD" value={g("totalPegawai")}
							tone={{ bg: "bg-orange-500", soft: "bg-orange-50 text-orange-600" }} onClick={() => navigate("/superadmin/kepegawaian")} />
						<KpiCard delay={0.13} icon={FiUserCheck} label="Aparatur Desa" value={g("totalAparatur")}
							tone={{ bg: "bg-sky-500", soft: "bg-sky-50 text-sky-600" }} onClick={() => navigate("/core-dashboard")} />
						<KpiCard delay={0.16} icon={FiBriefcase} label="BUMDes" value={g("totalBumdes")}
							tone={{ bg: "bg-amber-500", soft: "bg-amber-50 text-amber-600" }} onClick={() => navigate("/core-dashboard")} />
						<KpiCard delay={0.19} icon={FiBookOpen} label="Produk Hukum" value={g("totalProdukHukum")}
							tone={{ bg: "bg-indigo-500", soft: "bg-indigo-50 text-indigo-600" }} onClick={() => navigate("/core-dashboard")} />
						<KpiCard delay={0.22} icon={FiCalendar} label="Kegiatan" value={g("totalKegiatan")}
							tone={{ bg: "bg-cyan-500", soft: "bg-cyan-50 text-cyan-600" }} onClick={() => navigate("/superadmin/bidang/sekretariat/jadwal-kegiatan")} />
						<KpiCard delay={0.25} icon={FiMail} label="Surat Masuk" value={g("totalSurat")}
							tone={{ bg: "bg-rose-500", soft: "bg-rose-50 text-rose-600" }} onClick={() => navigate("/superadmin/bidang/sekretariat/disposisi")} />
					</div>

					{/* ── Server + Pengguna ── */}
					<div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
						<Panel title="Kesehatan Server" icon={FiServer} action="Kelola server" onAction={() => navigate("/superadmin/server")} className="xl:col-span-3" delay={0.28}>
							{server ? (
								<>
									<div className="grid grid-cols-3 gap-3">
										<Gauge label="CPU" icon={FiCpu} persen={cpu} />
										<Gauge label="Memori" icon={FiZap} persen={ram} />
										<Gauge label="Disk" icon={FiHardDrive} persen={disk} />
									</div>

									{riwayat.length > 1 && (
										<div className="mt-4">
											<div className="mb-1 flex items-center justify-between text-[11px] text-slate-400">
												<span>Pemakaian 1 jam terakhir</span>
												<span className="flex items-center gap-3">
													<span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-indigo-500" />CPU</span>
													<span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Memori</span>
												</span>
											</div>
											<div className="h-28">
												<ResponsiveContainer width="100%" height="100%">
													<AreaChart data={riwayat} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
														<defs>
															<linearGradient id="gCpu" x1="0" y1="0" x2="0" y2="1">
																<stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
																<stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
															</linearGradient>
															<linearGradient id="gMem" x1="0" y1="0" x2="0" y2="1">
																<stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
																<stop offset="100%" stopColor="#10b981" stopOpacity={0} />
															</linearGradient>
														</defs>
														<Tooltip content={<TooltipGrafik />} />
														<Area type="monotone" dataKey="memory" name="Memori" stroke="#10b981" strokeWidth={2} fill="url(#gMem)" dot={false} isAnimationActive={false} />
														<Area type="monotone" dataKey="cpu" name="CPU" stroke="#6366f1" strokeWidth={2} fill="url(#gCpu)" dot={false} isAnimationActive={false} />
													</AreaChart>
												</ResponsiveContainer>
											</div>
										</div>
									)}

									<div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
										{[
											{
												label: "Database",
												nilai: server.database?.connected === false ? "Terputus" : server.database?.connected ? `${server.database.latency_ms ?? "–"} ms` : "—",
												nada: server.database?.connected === false ? "text-rose-600" : "text-slate-900",
												icon: FiDatabase,
											},
											{
												label: "Aplikasi PM2",
												nilai: server.apps?.pm2_available ? `${server.apps.online}/${server.apps.total} online` : "—",
												nada: server.apps?.pm2_available && server.apps.online < server.apps.total ? "text-amber-600" : "text-slate-900",
												icon: FiLayers,
											},
											{ label: "Request/menit", nilai: angka(server.traffic?.rpm != null ? Math.round(server.traffic.rpm) : null), nada: "text-slate-900", icon: FiActivity },
											{ label: "Respons p95", nilai: server.traffic?.p95 != null ? `${Math.round(server.traffic.p95)} ms` : "—", nada: "text-slate-900", icon: FiClock },
										].map((m) => (
											<div key={m.label} className="rounded-xl border border-slate-100 px-3 py-2.5">
												<p className="flex items-center gap-1.5 text-[11px] text-slate-400">
													<m.icon className="h-3 w-3" />
													{m.label}
												</p>
												<p className={`mt-0.5 text-sm font-semibold tabular-nums ${m.nada}`}>{m.nilai}</p>
											</div>
										))}
									</div>

									{peringatan.length > 0 && (
										<div className="mt-4 space-y-1.5">
											{peringatan.slice(0, 3).map((a, i) => (
												<div key={a.id || a.key || i} className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">
													<FiAlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
													<span>{a.message || a.title || a.label || String(a.key || "Peringatan")}</span>
												</div>
											))}
										</div>
									)}
								</>
							) : (
								<div className="flex flex-col items-center justify-center rounded-xl bg-slate-50 py-10 text-center">
									{memuat && !diperbarui ? (
										<FiRefreshCw className="h-6 w-6 animate-spin text-slate-300" />
									) : (
										<>
											<FiServer className="h-8 w-8 text-slate-300" />
											<p className="mt-2 text-sm font-medium text-slate-600">Metrik server belum tersedia</p>
											<p className="mt-0.5 text-xs text-slate-400">Pastikan modul Manajemen Server aktif di backend.</p>
										</>
									)}
								</div>
							)}
						</Panel>

						<Panel title="Pengguna Sistem" icon={FiUsers} action="Kelola" onAction={() => navigate("/superadmin/users")} className="xl:col-span-2" delay={0.32}>
							<div className="flex flex-col items-center gap-5 sm:flex-row xl:flex-col 2xl:flex-row">
								<div className="relative h-40 w-40 flex-shrink-0">
									<ResponsiveContainer width="100%" height="100%">
										<PieChart>
											<Pie data={dataPeran.length ? dataPeran : [{ value: 1, warna: "#e2e8f0" }]} dataKey="value" innerRadius={52} outerRadius={72} paddingAngle={dataPeran.length > 1 ? 2 : 0} stroke="none">
												{(dataPeran.length ? dataPeran : [{ warna: "#e2e8f0" }]).map((p, i) => (
													<Cell key={i} fill={p.warna} />
												))}
											</Pie>
											{dataPeran.length > 0 && <Tooltip formatter={(v, n, item) => [angka(v), item.payload.label]} />}
										</PieChart>
									</ResponsiveContainer>
									<div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
										<span className="text-2xl font-bold tabular-nums text-slate-900">{users ? angka(users.total) : "—"}</span>
										<span className="text-[11px] text-slate-400">akun</span>
									</div>
								</div>
								<ul className="grid w-full grid-cols-2 gap-x-4 gap-y-1.5">
									{PERAN.map((p) => (
										<li key={p.key} className="flex items-center justify-between gap-2 text-xs">
											<span className="flex min-w-0 items-center gap-2 text-slate-600">
												<span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: p.warna }} />
												<span className="truncate">{p.label}</span>
											</span>
											<span className="font-semibold tabular-nums text-slate-900">{angka(users?.[p.key])}</span>
										</li>
									))}
								</ul>
							</div>
						</Panel>
					</div>

					{/* ── Aktivitas + Absensi + Berita ── */}
					<div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
						<Panel title="Aktivitas Terbaru" icon={FiActivity} action="Semua log" onAction={() => navigate("/superadmin/activity-logs")} className="xl:col-span-2" delay={0.36}>
							{statAktivitas && (
								<div className="mb-4 grid grid-cols-3 gap-2">
									{[
										{ l: "Hari ini", v: statAktivitas.today },
										{ l: "7 hari", v: statAktivitas.thisWeek },
										{ l: "Bulan ini", v: statAktivitas.thisMonth },
									].map((s) => (
										<div key={s.l} className="rounded-xl bg-slate-50 px-3 py-2">
											<p className="text-[11px] text-slate-400">{s.l}</p>
											<p className="text-lg font-bold tabular-nums text-slate-900">{angka(s.v)}</p>
										</div>
									))}
								</div>
							)}
							{Array.isArray(aktivitas) && aktivitas.length > 0 ? (
								<ol className="relative space-y-1 before:absolute before:bottom-3 before:left-[15px] before:top-3 before:w-px before:bg-slate-100">
									{aktivitas.map((log) => (
										<li key={log.id} className="relative flex items-start gap-3 rounded-xl px-1 py-2 transition-colors hover:bg-slate-50">
											<span className="relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
												{(log.userName || "?").charAt(0).toUpperCase()}
											</span>
											<div className="min-w-0 flex-1">
												<p className="truncate text-sm text-slate-700">
													<b className="font-semibold text-slate-900">{log.userName || "Sistem"}</b>{" "}
													{log.description || `${log.action} ${log.entityName || log.entityType || ""}`}
												</p>
												<div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
													<span className={`rounded-md px-1.5 py-0.5 font-medium capitalize ${WARNA_AKSI[String(log.action).toLowerCase()] || "bg-slate-100 text-slate-600"}`}>
														{log.action}
													</span>
													{log.module && <span className="truncate">{log.module}</span>}
													<span className="ml-auto flex-shrink-0">{waktuRelatif(log.createdAt)}</span>
												</div>
											</div>
										</li>
									))}
								</ol>
							) : (
								<div className="rounded-xl bg-slate-50 py-8 text-center text-xs text-slate-400">
									{memuat && !diperbarui ? "Memuat aktivitas…" : "Belum ada aktivitas tercatat"}
								</div>
							)}
						</Panel>

						<div className="space-y-6">
							<Panel title="Absensi Hari Ini" icon={FiClock} delay={0.4}>
								{ringkasAbsensi ? (
									<>
										<div className="flex items-end justify-between">
											<div>
												<p className="text-3xl font-bold tabular-nums text-slate-900">{persenHadir ?? 0}%</p>
												<p className="text-xs text-slate-400">tingkat kehadiran · {angka(totalAbsen)} tercatat</p>
											</div>
											{belumAbsen != null && (
												<span className="rounded-lg bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-600">{angka(belumAbsen)} belum absen</span>
											)}
										</div>
										<div className="mt-4 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
											{[
												{ k: "hadir", c: "bg-emerald-500" },
												{ k: "dinas_luar", c: "bg-cyan-500" },
												{ k: "izin", c: "bg-sky-500" },
												{ k: "sakit", c: "bg-amber-500" },
												{ k: "cuti", c: "bg-violet-500" },
											].map((s) => (
												<motion.div
													key={s.k}
													className={s.c}
													initial={{ width: 0 }}
													animate={{ width: `${totalAbsen ? ((ringkasAbsensi[s.k] || 0) / totalAbsen) * 100 : 0}%` }}
													transition={{ duration: 0.8 }}
												/>
											))}
										</div>
										<ul className="mt-3 grid grid-cols-5 gap-1 text-center">
											{[
												{ k: "hadir", l: "Hadir", c: "bg-emerald-500" },
												{ k: "dinas_luar", l: "DL", c: "bg-cyan-500" },
												{ k: "izin", l: "Izin", c: "bg-sky-500" },
												{ k: "sakit", l: "Sakit", c: "bg-amber-500" },
												{ k: "cuti", l: "Cuti", c: "bg-violet-500" },
											].map((s) => (
												<li key={s.k}>
													<p className="text-sm font-bold tabular-nums text-slate-900">{angka(ringkasAbsensi[s.k] || 0)}</p>
													<p className="flex items-center justify-center gap-1 text-[10px] text-slate-400">
														<span className={`h-1.5 w-1.5 rounded-full ${s.c}`} />
														{s.l}
													</p>
												</li>
											))}
										</ul>
									</>
								) : (
									<div className="rounded-xl bg-slate-50 py-6 text-center text-xs text-slate-400">Data absensi belum tersedia</div>
								)}
							</Panel>

							<Panel title="Berita & Publikasi" icon={FiFileText} action="Kelola" onAction={() => navigate("/superadmin/berita")} delay={0.44}>
								<div className="flex items-center gap-4">
									<div>
										<p className="text-3xl font-bold tabular-nums text-slate-900">{angka(berita?.total_berita)}</p>
										<p className="text-xs text-slate-400">total berita</p>
									</div>
									<div className="flex-1">
										<div className="flex justify-between text-[11px] text-slate-500">
											<span className="flex items-center gap-1"><FiCheckCircle className="h-3 w-3 text-emerald-500" />{angka(berita?.published)} terbit</span>
											<span>{angka(berita?.draft)} draft</span>
										</div>
										<div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
											<motion.div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" initial={{ width: 0 }} animate={{ width: `${persenTerbit}%` }} transition={{ duration: 0.8 }} />
										</div>
									</div>
								</div>
								{berita?.by_kategori?.length > 0 && (
									<div className="mt-4 flex flex-wrap gap-1.5">
										{berita.by_kategori.slice(0, 6).map((k, i) => (
											<span key={i} className="rounded-lg bg-slate-100 px-2 py-1 text-[11px] text-slate-600">
												{k.kategori || "Umum"} <b className="text-slate-900">{k._count?.id ?? 0}</b>
											</span>
										))}
									</div>
								)}
							</Panel>
						</div>
					</div>

					{/* ── Pintasan ── */}
					<Panel title="Akses Cepat" icon={FiZap} delay={0.48}>
						<div className="grid grid-cols-4 gap-2 md:grid-cols-8">
							{PINTASAN.map((p) => (
								<button
									key={p.path}
									onClick={() => navigate(p.path)}
									className="group flex flex-col items-center gap-2 rounded-xl p-3 transition-colors hover:bg-slate-50"
								>
									<span className={`flex h-11 w-11 items-center justify-center rounded-2xl transition-transform group-hover:scale-110 ${p.tone}`}>
										<p.icon className="h-5 w-5" />
									</span>
									<span className="text-center text-[11px] font-medium text-slate-600">{p.label}</span>
								</button>
							))}
						</div>
					</Panel>
				</div>

				{/* Pengguna online — hanya di layar lebar */}
				<div className="hidden xl:block">
					<OnlineUsersSidebar />
				</div>
			</div>
		</div>
	);
};

export default SuperadminDashboard;
