import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { BarChart3, Camera, CameraOff, ShieldAlert, Activity, Eye } from "lucide-react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler } from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import toast from "react-hot-toast";
import { getStatistik } from "../../../api/smartCctvApi";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

const TIPE_LABEL = {
	known: "Dikenal",
	unknown: "Tidak dikenal",
	fall: "Jatuh",
	fall_warning: "Peringatan jatuh",
	immobility: "Tidak bergerak",
	other: "Lainnya",
	person: "Orang terdeteksi",
};

const WARNA_TIPE = {
	known: "#10b981",
	unknown: "#f59e0b",
	fall: "#ef4444",
	fall_warning: "#f97316",
	immobility: "#8b5cf6",
	other: "#94a3b8",
	person: "#0ea5e9",
};

const Kartu = ({ ikon: Ikon, angka, label, warna }) => (
	<div className="rounded-xl border border-slate-200 bg-white p-4">
		<div className="flex items-center gap-3">
			<div className={`flex h-10 w-10 items-center justify-center rounded-lg ${warna}`}>
				<Ikon className="h-5 w-5 text-white" />
			</div>
			<div>
				<p className="text-2xl font-semibold tabular-nums text-slate-900">{angka}</p>
				<p className="text-xs text-slate-500">{label}</p>
			</div>
		</div>
	</div>
);

const CctvAnalyticsPage = () => {
	const location = useLocation();
	const dasar = location.pathname.startsWith("/superadmin") ? "/superadmin" : "/dpmd";
	const [stats, setStats] = useState(null);
	const [memuat, setMemuat] = useState(true);

	useEffect(() => {
		getStatistik()
			.then((r) => setStats(r.data.data))
			.catch((e) => toast.error(e.response?.data?.message || "Gagal memuat statistik."))
			.finally(() => setMemuat(false));
	}, []);

	if (memuat || !stats) {
		return (
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{[1, 2, 3, 4].map((n) => (
					<div key={n} className="h-24 animate-pulse rounded-xl bg-slate-100" />
				))}
			</div>
		);
	}

	const { kamera, peristiwa, grafik, topKamera, terbaru } = stats;

	const dataGrafik = {
		labels: grafik.map((g) => g.tanggal.slice(8) + "/" + g.tanggal.slice(5, 7)),
		datasets: [
			{
				label: "Peristiwa per hari",
				data: grafik.map((g) => g.jumlah),
				borderColor: "#0f172a",
				backgroundColor: "rgba(15, 23, 42, 0.08)",
				fill: true,
				tension: 0.35,
				pointRadius: 2,
			},
		],
	};

	const dataTipe = {
		labels: peristiwa.perTipe.map((t) => TIPE_LABEL[t.type] || t.type),
		datasets: [
			{
				data: peristiwa.perTipe.map((t) => t.jumlah),
				backgroundColor: peristiwa.perTipe.map((t) => WARNA_TIPE[t.type] || WARNA_TIPE.other),
				borderWidth: 0,
			},
		],
	};

	const dataKamera = {
		labels: topKamera.map((k) => k.nama),
		datasets: [
			{
				label: "Peristiwa",
				data: topKamera.map((k) => k.jumlah),
				backgroundColor: "#0f172a",
				borderRadius: 6,
			},
		],
	};

	return (
		<div className="space-y-5">
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<Kartu ikon={Camera} angka={kamera.active} label={`Kamera aktif dari ${kamera.total}`} warna="bg-emerald-500" />
				<Kartu ikon={Activity} angka={peristiwa.total30Hari} label="Peristiwa 30 hari" warna="bg-slate-900" />
				<Kartu ikon={ShieldAlert} angka={peristiwa.kritis} label="Kritis belum ditangani" warna="bg-red-500" />
				<Kartu ikon={CameraOff} angka={kamera.inactive + kamera.maintenance + kamera.offline} label="Kamera tidak aktif" warna="bg-amber-500" />
			</div>

			<div className="grid gap-5 lg:grid-cols-3">
				<div className="rounded-xl border border-slate-200 bg-white p-5 lg:col-span-2">
					<h3 className="mb-3 text-sm font-semibold text-slate-900">Tren peristiwa 30 hari</h3>
					<div className="h-64">
						<Line
							data={dataGrafik}
							options={{
								responsive: true,
								maintainAspectRatio: false,
								plugins: { legend: { display: false } },
								scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
							}}
						/>
					</div>
				</div>
				<div className="rounded-xl border border-slate-200 bg-white p-5">
					<h3 className="mb-3 text-sm font-semibold text-slate-900">Per tipe (30 hari)</h3>
					<div className="h-64">
						{peristiwa.perTipe.length === 0 ? (
							<p className="flex h-full items-center justify-center text-sm text-slate-400">Belum ada data</p>
						) : (
							<Doughnut
								data={dataTipe}
								options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "bottom" } } }}
							/>
						)}
					</div>
				</div>
			</div>

			<div className="grid gap-5 lg:grid-cols-2">
				<div className="rounded-xl border border-slate-200 bg-white p-5">
					<h3 className="mb-3 text-sm font-semibold text-slate-900">Kamera paling aktif</h3>
					<div className="h-56">
						{topKamera.length === 0 ? (
							<p className="flex h-full items-center justify-center text-sm text-slate-400">Belum ada data</p>
						) : (
							<Bar
								data={dataKamera}
								options={{
									indexAxis: "y",
									responsive: true,
									maintainAspectRatio: false,
									plugins: { legend: { display: false } },
								}}
							/>
						)}
					</div>
				</div>
				<div className="rounded-xl border border-slate-200 bg-white p-5">
					<div className="mb-3 flex items-center justify-between">
						<h3 className="text-sm font-semibold text-slate-900">Peristiwa terbaru</h3>
						<Link to={`${dasar}/cctv/riwayat`} className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700">
							<Eye className="h-3.5 w-3.5" />
							Lihat semua
						</Link>
					</div>
					{terbaru.length === 0 ? (
						<p className="py-10 text-center text-sm text-slate-400">Belum ada peristiwa</p>
					) : (
						<ul className="divide-y divide-slate-50">
							{terbaru.map((p) => (
								<li key={p.id} className="flex items-center justify-between gap-3 py-2.5">
									<div className="min-w-0">
										<p className="truncate text-sm font-medium text-slate-900">
											{TIPE_LABEL[p.type] || p.type}
											{p.nama ? ` — ${p.nama}` : ""}
										</p>
										<p className="text-xs text-slate-500">
											{p.camera?.name || `Kamera ${p.camera_id}`} · {new Date(p.occurred_at).toLocaleString("id-ID")}
										</p>
									</div>
									<span
										className={`h-2 w-2 flex-shrink-0 rounded-full ${
											p.severity === "critical" ? "bg-red-500" : p.severity === "warning" ? "bg-amber-500" : "bg-sky-400"
										}`}
									/>
								</li>
							))}
						</ul>
					)}
				</div>
			</div>
		</div>
	);
};

export default CctvAnalyticsPage;
