// Tab Pengaturan — ambang peringatan, kuota storage, dan perlindungan keamanan
// (deteksi, WAF, blokir otomatis, whitelist IP).

import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { FiBell, FiHardDrive, FiRotateCcw, FiSave, FiShield, FiX } from "react-icons/fi";
import api from "../../../../api";
import { Card, Galat, Memuat, Toggle, Tombol, pesanError } from "../serverUi";

const Angka = ({ label, hint, value, onChange, satuan, min = 0, max }) => (
	<label className="block">
		<span className="text-sm font-semibold text-slate-700">{label}</span>
		{hint && <span className="block text-xs text-slate-500">{hint}</span>}
		<span className="mt-1 flex items-center gap-2">
			<input
				type="number"
				min={min}
				max={max}
				value={value}
				onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
				className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
			/>
			{satuan && <span className="text-sm text-slate-500">{satuan}</span>}
		</span>
	</label>
);

const LencanaPush = ({ ada }) => (
	<span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${ada ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
		{ada ? "Push aktif" : "Belum mengizinkan push"}
	</span>
);

const SettingsTab = () => {
	const [cfg, setCfg] = useState(null);
	const [bawaan, setBawaan] = useState(null);
	const [ipSaya, setIpSaya] = useState("");
	const [whitelist, setWhitelist] = useState("");
	const [negara, setNegara] = useState("");
	const [galat, setGalat] = useState(null);
	const [simpan, setSimpan] = useState(false);

	const muat = () =>
		api
			.get("/superadmin/server/config")
			.then((r) => {
				const d = r.data?.data;
				setCfg(d.config);
				setBawaan(d.defaults);
				setIpSaya(d.your_ip);
				setWhitelist((d.config.security.whitelist || []).join("\n"));
				setNegara((d.config.security.blocked_countries || []).join(", "));
				setGalat(null);
			})
			.catch((e) => setGalat(pesanError(e)));

	useEffect(() => {
		muat();
	}, []);

	const [penerima, setPenerima] = useState(null);
	const [tambahan, setTambahan] = useState([]);
	const [cari, setCari] = useState("");
	const [hasil, setHasil] = useState([]);

	useEffect(() => {
		api
			.get("/superadmin/server/notifications/recipients")
			.then((r) => {
				setPenerima(r.data?.data || { superadmin: [] });
				setTambahan(r.data?.data?.tambahan || []);
			})
			.catch(() => setPenerima({ superadmin: [] }));
	}, []);

	// Pencarian akun dengan jeda 300 ms; hasil kosong bila kurang dari 2 huruf.
	useEffect(() => {
		if (cari.trim().length < 2) {
			setHasil([]);
			return undefined;
		}
		const id = setTimeout(() => {
			api
				.get("/superadmin/server/notifications/users", { params: { q: cari.trim() } })
				.then((r) => setHasil(r.data?.data || []))
				.catch(() => setHasil([]));
		}, 300);
		return () => clearTimeout(id);
	}, [cari]);

	const ujiPush = async (jenis) => {
		try {
			const r = await api.post("/superadmin/server/notifications/test", { jenis });
			Swal.fire({ icon: "success", title: `Terkirim ke ${r.data?.data?.terkirim ?? 0} perangkat`, timer: 1800, showConfirmButton: false });
		} catch (e) {
			Swal.fire({ icon: "error", title: "Gagal mengirim", text: pesanError(e) });
		}
	};

	const set = (grup, k, v) => setCfg((c) => ({ ...c, [grup]: { ...c[grup], [k]: v } }));

	// Daftar akun tambahan ikut disimpan lewat cfg.notifications.push_users.
	const ubahTambahan = (daftar) => {
		setTambahan(daftar);
		set("notifications", "push_users", daftar.map((u) => u.id));
	};
	const tambahkan = (u) => {
		if (!tambahan.some((x) => x.id === u.id)) ubahTambahan([...tambahan, u]);
		setCari("");
		setHasil([]);
	};

	const kirim = async () => {
		setSimpan(true);
		try {
			const body = {
				...cfg,
				security: {
					...cfg.security,
					whitelist: whitelist.split(/[\n,]/).map((s) => s.trim()).filter(Boolean),
					blocked_countries: negara.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean),
				},
			};
			const r = await api.put("/superadmin/server/config", body);
			setCfg(r.data?.data);
			setNegara((r.data?.data?.security?.blocked_countries || []).join(", "));
			Swal.fire({ icon: "success", title: "Pengaturan disimpan", timer: 1500, showConfirmButton: false });
		} catch (e) {
			Swal.fire({ icon: "error", title: "Gagal menyimpan", text: pesanError(e) });
		} finally {
			setSimpan(false);
		}
	};

	const kembalikan = async () => {
		const n0 = cfg.notifications || {};
		const ok = await Swal.fire({ icon: "question", title: "Kembalikan ke bawaan?", text: "Nilai di formulir diganti nilai bawaan. Tekan Simpan untuk menerapkan.", showCancelButton: true, confirmButtonText: "Ya", cancelButtonText: "Batal" });
		if (!ok.isConfirmed) return;
		setCfg({ ...bawaan, monitors: cfg.monitors, notifications: { ...bawaan.notifications, push_users: n0.push_users || [] } });
		setWhitelist(bawaan.security.whitelist.join("\n"));
		setNegara("");
	};

	if (galat && !cfg) return <Galat pesan={galat} onRetry={muat} />;
	if (!cfg) return <Memuat />;
	const a = cfg.alerts;
	const s = cfg.storage;
	const k = cfg.security;
		const n = cfg.notifications || {};

	return (
		<div className="space-y-4">
			<div className="grid gap-4 lg:grid-cols-2">
				<Card title="Ambang Peringatan" subtitle="Peringatan muncul bila kondisi bertahan ±30 detik" icon={FiBell}>
					<div className="grid gap-4 sm:grid-cols-2">
						<Angka label="CPU" value={a.cpu_percent} onChange={(v) => set("alerts", "cpu_percent", v)} satuan="%" min={10} max={100} />
						<Angka label="RAM" value={a.memory_percent} onChange={(v) => set("alerts", "memory_percent", v)} satuan="%" min={10} max={100} />
						<Angka label="Disk" value={a.disk_percent} onChange={(v) => set("alerts", "disk_percent", v)} satuan="%" min={10} max={100} />
						<Angka label="Event loop tersendat" value={a.event_loop_ms} onChange={(v) => set("alerts", "event_loop_ms", v)} satuan="ms" min={20} />
						<Angka label="Rasio error 5xx" value={a.error_rate_percent} onChange={(v) => set("alerts", "error_rate_percent", v)} satuan="%" min={1} max={100} />
					</div>
					<div className="mt-3 border-t pt-2">
						<Toggle
							checked={a.push_notification}
							onChange={(v) => set("alerts", "push_notification", v)}
							label="Kirim push notification ke superadmin"
							hint="Notifikasi ke HP/peramban saat peringatan baru muncul (maks. sekali per 30 menit per masalah)."
						/>
					</div>
				</Card>

				<Card title="Storage" subtitle="Kuota berkas unggahan aplikasi" icon={FiHardDrive}>
					<div className="grid gap-4 sm:grid-cols-2">
						<Angka label="Kuota total" hint="0 = tanpa batas" value={s.quota_gb} onChange={(v) => set("storage", "quota_gb", v)} satuan="GB" />
						<Angka label="Peringatan kuota" value={s.warn_percent} onChange={(v) => set("storage", "warn_percent", v)} satuan="%" min={10} max={100} />
						<Angka label="Maks. satu unggahan" hint="0 = ikuti fitur" value={s.max_upload_mb} onChange={(v) => set("storage", "max_upload_mb", v)} satuan="MB" />
						<Angka label="Umur berkas temp" hint="Yang boleh dibersihkan" value={s.temp_max_age_hours} onChange={(v) => set("storage", "temp_max_age_hours", v)} satuan="jam" min={1} />
					</div>
					<div className="mt-3 border-t pt-2">
						<Toggle checked={s.enforce} onChange={(v) => set("storage", "enforce", v)} label="Tolak unggahan saat kuota penuh" hint="Bila mati, kuota hanya memicu peringatan." />
					</div>
				</Card>
			</div>

				<Card title="Notifikasi Push Server" subtitle="Peringatan, pemulihan, dan laporan harian ke perangkat" icon={FiBell}>
					<p className="mb-4 text-xs text-slate-500">
						Peringatan, pemberitahuan pulih, dan laporan harian dikirim sebagai push ke semua superadmin dan akun di bawah ini. Saklar induknya: &apos;Kirim push notification&apos; di kartu Ambang Peringatan.
					</p>
					<div className="grid gap-6 lg:grid-cols-2">
						<div className="space-y-4">
							<div>
								<p className="text-sm font-semibold text-slate-700">Superadmin (otomatis)</p>
								<ul className="mt-1 divide-y divide-slate-100">
									{(penerima?.superadmin || []).map((u) => (
										<li key={u.id} className="flex items-center justify-between gap-2 py-1.5 text-sm text-slate-700">
											<span className="min-w-0 truncate">{u.name}</span>
											<LencanaPush ada={u.has_push} />
										</li>
									))}
								</ul>
							</div>
							<div>
								<p className="text-sm font-semibold text-slate-700">Akun tambahan</p>
								<div className="relative mt-1">
									<input
										value={cari}
										onChange={(e) => setCari(e.target.value)}
										placeholder="Cari nama atau email akun…"
										className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
									/>
									{hasil.length > 0 && (
										<ul className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
											{hasil.map((u) => (
												<li key={u.id}>
													<button type="button" onClick={() => tambahkan(u)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-100">
														<span className="min-w-0">
															<span className="block truncate text-sm text-slate-800">{u.name}</span>
															<span className="block truncate text-xs text-slate-500">{u.email} · {u.role}</span>
														</span>
														<LencanaPush ada={u.has_push} />
													</button>
												</li>
											))}
										</ul>
									)}
								</div>
								<ul className="mt-1 divide-y divide-slate-100">
									{tambahan.map((u) => (
										<li key={u.id} className="flex items-center gap-2 py-1.5">
											<span className="min-w-0 flex-1">
												<span className="block truncate text-sm text-slate-800">{u.name}</span>
												<span className="block truncate text-xs text-slate-500">{u.email} · {u.role}</span>
											</span>
											<LencanaPush ada={u.has_push} />
											<Tombol variant="ghost" icon={FiX} onClick={() => ubahTambahan(tambahan.filter((x) => x.id !== u.id))}>
												Cabut
											</Tombol>
										</li>
									))}
									{!tambahan.length && <li className="py-1.5 text-xs text-slate-500">Belum ada akun tambahan.</li>}
								</ul>
							</div>
						</div>
						<div className="space-y-3">
							<label className="block">
								<span className="text-sm font-semibold text-slate-700">Level minimum</span>
								<select
									value={n.push_min_level || "warning"}
									onChange={(e) => set("notifications", "push_min_level", e.target.value)}
									className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
								>
									<option value="warning">Semua peringatan</option>
									<option value="critical">Hanya kritis</option>
								</select>
							</label>
							<Toggle
								checked={n.daily_report}
								onChange={(v) => set("notifications", "daily_report", v)}
								label="Laporan harian"
								hint="Ringkasan kondisi, serangan, tindakan, deploy, dan backup setiap hari."
							/>
							<Angka label="Jam kirim laporan" value={n.daily_report_hour ?? 7} onChange={(v) => set("notifications", "daily_report_hour", v)} satuan="WIB" min={0} max={23} />
							<div className="border-t pt-3">
								<div className="flex flex-wrap gap-2">
									<Tombol onClick={() => ujiPush("pesan")}>Kirim notifikasi uji</Tombol>
									<Tombol onClick={() => ujiPush("laporan")}>Kirim laporan uji</Tombol>
								</div>
								<p className="mt-1 text-xs text-slate-500">Uji memakai pengaturan yang sudah disimpan. Akun yang belum mengizinkan push di perangkatnya tidak akan menerima.</p>
							</div>
						</div>
					</div>
				</Card>

				<Card title="Keamanan" subtitle="Perlindungan aplikasi dari serangan" icon={FiShield}>
				<div className="grid gap-6 lg:grid-cols-2">
					<div className="divide-y divide-slate-100">
						<Toggle checked={k.detection} onChange={(v) => set("security", "detection", v)} label="Deteksi serangan" hint="Periksa setiap request untuk pola SQL injection, XSS, path traversal, pemindai, dan alat peretasan." />
						<Toggle
							checked={k.waf_mode}
							disabled={!k.detection}
							onChange={(v) => set("security", "waf_mode", v)}
							label="Mode WAF (tolak langsung)"
							hint="Request TANPA login yang berpola serangan serius langsung ditolak 403. Pengguna yang login hanya dicatat."
						/>
						<Toggle checked={k.auto_block} onChange={(v) => set("security", "auto_block", v)} label="Blokir IP otomatis" hint="IP yang skor ancamannya melewati ambang diblokir sementara." />
						<Toggle
							checked={k.scan_system_logs}
							onChange={(v) => set("security", "scan_system_logs", v)}
							label="Pindai log nginx & SSH"
							hint="Deteksi serangan yang tidak sampai ke aplikasi (bila berkas log ada di server ini)."
						/>
						<Toggle
							checked={k.honeypot}
							onChange={(v) => set("security", "honeypot", v)}
							label="Honeypot (blokir instan)"
							hint={`IP anonim yang meminta jalur jebakan (/.env, /.git/config, /wp-login.php, /phpmyadmin, …) langsung diblokir ${Math.round((k.honeypot_block_minutes || 1440) / 60)} jam. Jalur ini tidak pernah dipakai pengguna sah.`}
						/>
						<Toggle
							checked={k.geo_lookup}
							onChange={(v) => set("security", "geo_lookup", v)}
							label="Lokasi IP (Peta Ancaman)"
							hint="Cari negara/kota/ISP IP publik lewat ip-api.com (disimpan 30 hari). Dipakai globe dan blokir negara."
						/>
						<label className="block py-2">
							<span className="block text-sm font-semibold text-slate-700">Blokir negara (geo-block)</span>
							<span className="mt-0.5 block text-xs text-slate-500">
								Kode ISO 2 huruf, pisahkan koma, mis. <code>CN, RU</code>. Request anonim dari negara ini ditolak; pengguna yang login tetap bisa masuk. ID tidak boleh diblokir.
							</span>
							<input
								value={negara}
								onChange={(e) => setNegara(e.target.value.toUpperCase())}
								disabled={!k.geo_lookup}
								placeholder="kosong = tidak ada"
								className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs disabled:opacity-50"
							/>
						</label>
					</div>
					<div className="space-y-4">
						<div className="grid gap-4 sm:grid-cols-2">
							<Angka label="Ambang skor blokir" hint="Kritis=15, Tinggi=8, Sedang=3, Rendah=1" value={k.auto_block_score} onChange={(v) => set("security", "auto_block_score", v)} min={5} />
							<Angka label="Jendela hitung" value={k.auto_block_window_minutes} onChange={(v) => set("security", "auto_block_window_minutes", v)} satuan="menit" min={1} />
							<Angka label="Lama blokir otomatis" value={k.auto_block_duration_minutes} onChange={(v) => set("security", "auto_block_duration_minutes", v)} satuan="menit" min={1} />
							<Angka label="Simpan jejak serangan" value={k.retention_days} onChange={(v) => set("security", "retention_days", v)} satuan="hari" min={1} max={365} />
							<Angka label="Lama blokir honeypot" value={k.honeypot_block_minutes} onChange={(v) => set("security", "honeypot_block_minutes", v)} satuan="menit" min={1} />
						</div>
						<label className="block">
							<span className="text-sm font-semibold text-slate-700">Whitelist IP (tidak pernah diblokir)</span>
							<span className="block text-xs text-slate-500">
								Satu IP per baris. Awalan dengan * didukung, mis. <code>10.20.*</code>. IP Anda saat ini: <b className="font-mono">{ipSaya}</b>
							</span>
							<textarea value={whitelist} onChange={(e) => setWhitelist(e.target.value)} rows={5} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs" />
							{ipSaya && !whitelist.split(/[\n,]/).map((x) => x.trim()).includes(ipSaya) && (
								<button type="button" onClick={() => setWhitelist((w) => `${w.trim()}\n${ipSaya}`.trim())} className="mt-1 text-xs font-semibold text-blue-600 hover:underline">
									+ Tambahkan IP saya ({ipSaya})
								</button>
							)}
						</label>
					</div>
				</div>
			</Card>

			<div className="sticky bottom-3 z-10 flex justify-end gap-2 rounded-2xl bg-white/90 p-3 shadow-lg ring-1 ring-slate-200 backdrop-blur">
				<Tombol icon={FiRotateCcw} onClick={kembalikan}>
					Kembalikan bawaan
				</Tombol>
				<Tombol icon={FiSave} variant="dark" disabled={simpan} onClick={kirim} className="px-5 py-2 text-sm">
					{simpan ? "Menyimpan…" : "Simpan pengaturan"}
				</Tombol>
			</div>
		</div>
	);
};

export default SettingsTab;
