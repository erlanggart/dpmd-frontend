// Tab Aplikasi & Layanan — proses PM2 (restart/stop/log), layanan systemd,
// port yang terbuka, dan monitor uptime website + sertifikat SSL.

import React, { useCallback, useState } from "react";
import Swal from "sweetalert2";
import {
	FiBox,
	FiEdit2,
	FiFileText,
	FiGlobe,
	FiLock,
	FiPlay,
	FiPlus,
	FiRefreshCw,
	FiRotateCw,
	FiSquare,
	FiTrash2,
	FiX,
	FiCpu,
	FiWifi,
} from "react-icons/fi";
import api from "../../../../api";
import {
	Card,
	Galat,
	Kosong,
	Memuat,
	StatusBadge,
	Tombol,
	formatAngka,
	formatBytes,
	formatWaktu,
	pesanError,
	sejak,
	usePolling,
} from "../serverUi";

const ModalLog = ({ nama, onClose }) => {
	const [data, setData] = useState(null);
	const [jenis, setJenis] = useState("out");
	const [galat, setGalat] = useState(null);
	const muat = useCallback(() => {
		api
			.get(`/superadmin/server/apps/pm2/${encodeURIComponent(nama)}/logs`, { params: { lines: 300 } })
			.then((r) => setData(r.data?.data))
			.catch((e) => setGalat(pesanError(e)));
	}, [nama]);
	usePolling(muat, 5000, [nama]);
	const isi = data?.[jenis];
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3" onClick={onClose}>
			<div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
				<div className="flex items-center justify-between gap-3 border-b px-4 py-3">
					<div>
						<p className="font-bold text-slate-800">Log PM2 — {nama}</p>
						<p className="text-xs text-slate-500">{isi?.path || ""} · diperbarui otomatis tiap 5 detik</p>
					</div>
					<div className="flex items-center gap-2">
						<div className="inline-flex rounded-lg bg-slate-100 p-0.5">
							{[
								["out", "Output"],
								["error", "Error"],
							].map(([k, l]) => (
								<button
									key={k}
									onClick={() => setJenis(k)}
									className={`rounded-md px-2.5 py-1 text-xs font-semibold ${jenis === k ? "bg-white shadow-sm" : "text-slate-500"}`}
								>
									{l}
								</button>
							))}
						</div>
						<button onClick={onClose} className="rounded-lg p-1.5 hover:bg-slate-100" aria-label="Tutup">
							<FiX className="h-5 w-5" />
						</button>
					</div>
				</div>
				<div className="flex-1 overflow-auto bg-slate-950 p-3 font-mono text-[11.5px] leading-relaxed text-slate-200">
					{galat && <p className="text-red-400">{galat}</p>}
					{!data && !galat && <p className="text-slate-400">Memuat…</p>}
					{isi?.error && <p className="text-amber-400">{isi.error}</p>}
					{isi?.lines?.map((b, i) => (
						<div key={i} className={`whitespace-pre-wrap break-all ${/error|fail|exception/i.test(b) ? "text-red-300" : /warn/i.test(b) ? "text-amber-300" : ""}`}>
							{b}
						</div>
					))}
				</div>
			</div>
		</div>
	);
};

const BlokUptime = ({ history }) => {
	const slot = [...Array(Math.max(0, 60 - history.length)).fill(null), ...history];
	return (
		<div className="flex h-7 items-end gap-[2px]" aria-label="Riwayat 60 pemeriksaan terakhir">
			{slot.map((h, i) => (
				<span
					key={i}
					title={h ? `${formatWaktu(h.t, { second: "2-digit" })} — ${h.up ? `online ${h.ms} ms` : "DOWN"}` : "Belum diperiksa"}
					className={`h-full flex-1 rounded-[2px] ${h === null ? "bg-slate-200" : h.up ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"}`}
				/>
			))}
		</div>
	);
};

const EditorMonitor = ({ awal, onClose, onSaved }) => {
	const [daftar, setDaftar] = useState(awal.map((m) => ({ name: m.name, url: m.url })));
	const [simpan, setSimpan] = useState(false);
	const ubah = (i, k, v) => setDaftar((d) => d.map((m, j) => (j === i ? { ...m, [k]: v } : m)));
	const kirim = async () => {
		setSimpan(true);
		try {
			await api.put("/superadmin/server/monitors", { monitors: daftar.filter((m) => m.url.trim()) });
			Swal.fire({ icon: "success", title: "Monitor disimpan", timer: 1500, showConfirmButton: false });
			onSaved();
		} catch (e) {
			Swal.fire({ icon: "error", title: "Gagal menyimpan", text: pesanError(e) });
		} finally {
			setSimpan(false);
		}
	};
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3" onClick={onClose}>
			<div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
				<div className="border-b px-5 py-3">
					<p className="font-bold text-slate-800">Atur Monitor Uptime</p>
					<p className="text-xs text-slate-500">
						Tambahkan alamat website/aplikasi lain di server ini. Dicek tiap 1 menit; peringatan muncul bila gagal 2x berturut-turut.
					</p>
				</div>
				<div className="max-h-[60vh] space-y-2 overflow-auto p-5">
					{daftar.map((m, i) => (
						<div key={i} className="flex flex-col gap-2 sm:flex-row">
							<input
								value={m.name}
								onChange={(e) => ubah(i, "name", e.target.value)}
								placeholder="Nama (mis. Website DPMD)"
								className="rounded-lg border border-slate-200 px-3 py-2 text-sm sm:w-48"
							/>
							<input
								value={m.url}
								onChange={(e) => ubah(i, "url", e.target.value)}
								placeholder="https://contoh.go.id"
								className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
							/>
							<button onClick={() => setDaftar((d) => d.filter((_, j) => j !== i))} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label="Hapus">
								<FiTrash2 className="h-4 w-4" />
							</button>
						</div>
					))}
					<Tombol icon={FiPlus} onClick={() => setDaftar((d) => [...d, { name: "", url: "" }])}>
						Tambah monitor
					</Tombol>
				</div>
				<div className="flex justify-end gap-2 border-t px-5 py-3">
					<Tombol onClick={onClose}>Batal</Tombol>
					<Tombol variant="dark" onClick={kirim} disabled={simpan}>
						{simpan ? "Menyimpan…" : "Simpan"}
					</Tombol>
				</div>
			</div>
		</div>
	);
};

const AppsTab = () => {
	const [data, setData] = useState(null);
	const [galat, setGalat] = useState(null);
	const [log, setLog] = useState(null);
	const [edit, setEdit] = useState(false);
	const [sibuk, setSibuk] = useState(null);

	const muat = useCallback(async () => {
		try {
			const r = await api.get("/superadmin/server/apps");
			setData(r.data?.data);
			setGalat(null);
		} catch (e) {
			setGalat(pesanError(e));
		}
	}, []);
	usePolling(muat, 15000);

	const aksi = async (p, a) => {
		const teks = {
			restart: "Proses dimatikan lalu dinyalakan ulang. Pengguna yang sedang terhubung akan tersambung ulang otomatis (rapat video ikut terputus sesaat).",
			reload: "Dimuat ulang tanpa downtime (bila mode cluster); pada mode fork sama dengan restart.",
			stop: "Proses dihentikan dan TIDAK menyala sampai dijalankan lagi. Fitur yang bergantung padanya akan mati.",
			start: "Menjalankan kembali proses yang berhenti.",
		}[a];
		const ok = await Swal.fire({
			icon: a === "stop" ? "warning" : "question",
			title: `${a.charAt(0).toUpperCase() + a.slice(1)} "${p.name}"?`,
			text: teks,
			showCancelButton: true,
			confirmButtonText: `Ya, ${a}`,
			cancelButtonText: "Batal",
			confirmButtonColor: a === "stop" ? "#dc2626" : "#0f172a",
		});
		if (!ok.isConfirmed) return;
		setSibuk(`${p.name}:${a}`);
		try {
			const r = await api.post(`/superadmin/server/apps/pm2/${encodeURIComponent(p.name)}/${a}`);
			Swal.fire({ icon: "success", title: "Berhasil", text: r.data?.message, timer: 2500, showConfirmButton: false });
			setTimeout(muat, r.data?.scheduled ? 6000 : 1000);
		} catch (e) {
			Swal.fire({ icon: "error", title: "Gagal", text: pesanError(e) });
		} finally {
			setSibuk(null);
		}
	};

	const cekSekarang = async () => {
		setSibuk("monitor");
		try {
			await api.post("/superadmin/server/monitors/check");
			await muat();
		} finally {
			setSibuk(null);
		}
	};

	if (galat && !data) return <Galat pesan={galat} onRetry={muat} />;
	if (!data) return <Memuat />;
	const { pm2, services, ports, monitors } = data;

	return (
		<div className="space-y-4">
			{/* PM2 */}
			<Card
				title="Aplikasi (PM2)"
				subtitle={pm2.available ? `PM2 ${pm2.version || ""} · ${pm2.processes.length} proses` : "Proses Node.js yang dijalankan PM2"}
				icon={FiBox}
				actions={<Tombol icon={FiRefreshCw} onClick={muat}>Muat ulang</Tombol>}
				bodyClass="p-0"
			>
				{!pm2.available ? (
					<div className="p-5">
						<Kosong icon={FiBox} title="PM2 tidak terdeteksi" text={pm2.note} />
					</div>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full min-w-[860px] text-sm">
							<thead className="bg-slate-50 text-left text-[11.5px] uppercase tracking-wide text-slate-500">
								<tr>
									<th className="px-4 py-2.5">Aplikasi</th>
									<th className="px-3 py-2.5">Status</th>
									<th className="px-3 py-2.5 text-right">CPU</th>
									<th className="px-3 py-2.5 text-right">Memori</th>
									<th className="px-3 py-2.5">Aktif sejak</th>
									<th className="px-3 py-2.5 text-right">Restart</th>
									<th className="px-4 py-2.5 text-right">Aksi</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-slate-100">
								{pm2.processes.map((p) => (
									<tr key={p.id} className="hover:bg-slate-50/60">
										<td className="px-4 py-3">
											<div className="flex items-center gap-2">
												<p className="font-semibold text-slate-800">{p.name}</p>
												{p.is_self && <span className="rounded bg-blue-100 px-1.5 text-[10px] font-bold text-blue-700">BACKEND INI</span>}
											</div>
											<p className="max-w-[280px] truncate text-[11px] text-slate-500" title={p.script}>
												{p.exec_mode} · PID {p.pid || "-"} · Node {p.node_version || "-"} {p.version ? `· v${p.version}` : ""}
											</p>
										</td>
										<td className="px-3 py-3">
											<StatusBadge tingkat={p.status === "online" ? "baik" : p.status === "launching" ? "waspada" : "kritis"} label={p.status} />
										</td>
										<td className="px-3 py-3 text-right font-semibold text-slate-700">{p.cpu}%</td>
										<td className="px-3 py-3 text-right">
											<p className="font-semibold text-slate-700">{formatBytes(p.memory)}</p>
											{p.max_memory_restart && <p className="text-[11px] text-slate-400">batas {formatBytes(p.max_memory_restart)}</p>}
										</td>
										<td className="px-3 py-3 text-slate-600">{p.status === "online" && p.uptime_since ? `${sejak(p.uptime_since)} lalu` : "-"}</td>
										<td className="px-3 py-3 text-right">
											<span className={p.unstable_restarts > 0 ? "font-bold text-amber-600" : "text-slate-600"}>{formatAngka(p.restarts)}</span>
										</td>
										<td className="px-4 py-3">
											<div className="flex justify-end gap-1.5">
												<Tombol icon={FiFileText} onClick={() => setLog(p.name)} title="Lihat log">
													Log
												</Tombol>
												{p.status === "online" ? (
													<>
														<Tombol icon={FiRotateCw} disabled={!!sibuk} onClick={() => aksi(p, "restart")}>
															Restart
														</Tombol>
														{!p.is_self && (
															<Tombol icon={FiSquare} variant="dangerLight" disabled={!!sibuk} onClick={() => aksi(p, "stop")}>
																Stop
															</Tombol>
														)}
													</>
												) : (
													<Tombol icon={FiPlay} variant="primary" disabled={!!sibuk} onClick={() => aksi(p, "start")}>
														Start
													</Tombol>
												)}
											</div>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>
				)}
			</Card>

			{/* Monitor uptime */}
			<Card
				title="Monitor Uptime & SSL"
				subtitle="Setiap alamat dicek tiap 1 menit dari server ini"
				icon={FiGlobe}
				actions={
					<>
						<Tombol icon={FiRefreshCw} disabled={sibuk === "monitor"} onClick={cekSekarang}>
							{sibuk === "monitor" ? "Memeriksa…" : "Cek sekarang"}
						</Tombol>
						<Tombol icon={FiEdit2} variant="dark" onClick={() => setEdit(true)}>
							Atur monitor
						</Tombol>
					</>
				}
			>
				<div className="space-y-3">
					{monitors.map((m) => (
						<div key={m.url} className="rounded-xl border border-slate-200 p-3.5">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div className="min-w-0">
									<p className="font-semibold text-slate-800">{m.name}</p>
									<a href={m.url} target="_blank" rel="noreferrer" className="break-all text-xs text-blue-600 hover:underline">
										{m.url}
									</a>
								</div>
								<div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
									{m.last && <span>HTTP {m.last.status || "—"}</span>}
									{m.avg_ms !== null && <span>rata-rata {m.avg_ms} ms</span>}
									{m.uptime_percent !== null && <span className="font-semibold">{m.uptime_percent}% uptime ({m.checks} cek)</span>}
									<StatusBadge
										tingkat={!m.last ? "netral" : m.last.up ? "baik" : "kritis"}
										label={!m.last ? "Menunggu cek" : m.last.up ? "Online" : "Down"}
									/>
								</div>
							</div>
							<div className="mt-2.5">
								<BlokUptime history={m.history} />
							</div>
							{m.last?.error && <p className="mt-1.5 text-xs text-red-600">Galat terakhir: {m.last.error}</p>}
							{m.ssl && (
								<div
									className={`mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-3 py-2 text-xs ${
										m.ssl.days_left <= 14 ? "bg-amber-50 text-amber-800" : "bg-slate-50 text-slate-600"
									}`}
								>
									<span className="inline-flex items-center gap-1 font-semibold">
										<FiLock className="h-3.5 w-3.5" /> SSL {m.ssl.authorized ? "valid" : "tidak terverifikasi"}
									</span>
									<span>Penerbit: {m.ssl.issuer}</span>
									<span>Berakhir: {new Date(m.ssl.valid_to).toLocaleDateString("id-ID", { dateStyle: "long" })}</span>
									<span className="font-bold">{m.ssl.days_left} hari lagi</span>
								</div>
							)}
						</div>
					))}
					{!monitors.length && <Kosong icon={FiGlobe} title="Belum ada monitor" text="Tambahkan alamat website yang ingin dipantau." />}
				</div>
			</Card>

			<div className="grid gap-4 lg:grid-cols-2">
				{/* systemd */}
				<Card title="Layanan Sistem" subtitle="Unit systemd penting di server" icon={FiCpu} bodyClass="p-0">
					{!services.available ? (
						<div className="p-5">
							<Kosong icon={FiCpu} title="Tidak tersedia" text={services.note} />
						</div>
					) : (
						<ul className="divide-y divide-slate-100">
							{services.services.map((s) => (
								<li key={s.unit} className="flex items-center justify-between gap-3 px-4 py-2.5">
									<div className="min-w-0">
										<p className="text-sm font-semibold text-slate-800">{s.label}</p>
										<p className="truncate text-[11px] text-slate-500">
											{s.unit} {s.pid ? `· PID ${s.pid}` : ""} {s.memory ? `· ${formatBytes(s.memory)}` : ""}
										</p>
									</div>
									<StatusBadge tingkat={s.active === "active" ? "baik" : s.active === "activating" ? "waspada" : "kritis"} label={`${s.active} (${s.sub})`} />
								</li>
							))}
						</ul>
					)}
				</Card>

				{/* Port */}
				<Card title="Port Terbuka" subtitle="Port TCP yang sedang mendengarkan koneksi" icon={FiWifi} bodyClass="p-0">
					{!ports.available ? (
						<div className="p-5">
							<Kosong icon={FiWifi} title="Tidak tersedia" text={ports.note || "Hanya di server Linux."} />
						</div>
					) : (
						<div className="max-h-[360px] overflow-auto">
							<table className="w-full text-sm">
								<thead className="sticky top-0 bg-slate-50 text-left text-[11.5px] uppercase tracking-wide text-slate-500">
									<tr>
										<th className="px-4 py-2">Port</th>
										<th className="px-3 py-2">Alamat</th>
										<th className="px-3 py-2">Proses</th>
										<th className="px-4 py-2">Akses</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-slate-100">
									{ports.ports.map((p) => (
										<tr key={`${p.address}:${p.port}`}>
											<td className="px-4 py-2 font-mono font-semibold">{p.port}</td>
											<td className="px-3 py-2 font-mono text-xs text-slate-600">{p.address}</td>
											<td className="px-3 py-2 text-slate-700">{p.process || "-"}</td>
											<td className="px-4 py-2">
												{p.public ? (
													<span className="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">Publik</span>
												) : (
													<span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-bold text-slate-600">Lokal</span>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
							<p className="border-t px-4 py-2 text-[11px] text-slate-500">
								Port "Publik" bisa diakses dari luar kecuali ditutup firewall. Pastikan hanya port yang memang diperlukan (80, 443, SSH, RTC video) yang terbuka.
							</p>
						</div>
					)}
				</Card>
			</div>

			{log && <ModalLog nama={log} onClose={() => setLog(null)} />}
			{edit && (
				<EditorMonitor
					awal={monitors}
					onClose={() => setEdit(false)}
					onSaved={() => {
						setEdit(false);
						muat();
					}}
				/>
			)}
		</div>
	);
};

export default AppsTab;
