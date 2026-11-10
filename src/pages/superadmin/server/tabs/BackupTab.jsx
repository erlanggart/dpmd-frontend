// Tab Backup — cadangan database MySQL, serta snapshot & backup penuh
// container/VM Proxmox (buat, rollback, hapus).

import React from "react";
import Swal from "sweetalert2";
import { FiArchive, FiCamera, FiDatabase, FiDownloadCloud, FiHardDrive, FiRotateCcw, FiServer, FiTrash2 } from "react-icons/fi";
import api from "../../../../api";
import { Bar, Card, Galat, Kosong, Memuat, Tombol, formatBytes, formatWaktu, pesanError, sejak, usePolling } from "../serverUi";

const NAMA_SNAP = /^[A-Za-z][A-Za-z0-9_]{1,39}$/;

// Proxmox memberi epoch detik; kontrak menyebut ISO — terima keduanya.
const ke_ms = (t) => (typeof t === "number" && t < 1e12 ? t * 1000 : t);

const namaBawaan = () => {
	const d = new Date();
	const p = (n) => String(n).padStart(2, "0");
	return `panel_${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
};

const BackupTab = () => {
	const [data, setData] = React.useState(null);
	const [galat, setGalat] = React.useState(null);
	const mysqlJalan = !!data?.mysql?.running;

	const muat = () =>
		api
			.get("/superadmin/server/backups")
			.then((r) => {
				setData(r.data?.data || null);
				setGalat(null);
			})
			.catch((e) => setGalat(pesanError(e)));

	usePolling(muat, mysqlJalan ? 3000 : 15000, [mysqlJalan]);

	// Jalankan aksi Proxmox: toast, lalu muat ulang segera dan lagi setelah 4 dtk.
	const jalankan = async (fn) => {
		try {
			await fn();
			Swal.fire({ toast: true, position: "bottom-end", icon: "success", title: "Tugas dikirim ke Proxmox", timer: 1800, showConfirmButton: false });
			muat();
			setTimeout(muat, 4000);
		} catch (e) {
			Swal.fire({ icon: "error", title: "Gagal", text: pesanError(e) });
		}
	};

	const backupMysql = async () => {
		try {
			await api.post("/superadmin/server/backups/mysql");
			muat();
		} catch (e) {
			Swal.fire({ icon: "error", title: "Gagal", text: pesanError(e) });
		}
	};

	const buatSnapshot = async (g) => {
		const ok = await Swal.fire({
			title: `Buat snapshot ${g.name}`,
			html: `<input id="snap-nama" class="swal2-input" placeholder="Nama" value="${namaBawaan()}"><input id="snap-ket" class="swal2-input" placeholder="Keterangan (opsional)">`,
			showCancelButton: true,
			confirmButtonText: "Buat",
			cancelButtonText: "Batal",
			preConfirm: () => {
				const name = document.getElementById("snap-nama").value.trim();
				if (!NAMA_SNAP.test(name)) {
					Swal.showValidationMessage("Nama 2–40 karakter, diawali huruf, hanya huruf/angka/garis bawah");
					return false;
				}
				return { name, description: document.getElementById("snap-ket").value.trim() };
			},
		});
		if (ok.isConfirmed) jalankan(() => api.post(`/superadmin/server/backups/${g.vmid}/snapshots`, ok.value));
	};

	const rollbackSnapshot = async (g, snap) => {
		const ok = await Swal.fire({
			icon: "warning",
			title: `Rollback ${g.name} ke snapshot ${snap}?`,
			html: `Seluruh isi container kembali ke kondisi saat snapshot dibuat. Data yang ditulis sesudahnya <b>HILANG</b>. Container akan dihentikan sebentar.<br/><br/>Ketik <b>VMID ${g.vmid}</b> untuk konfirmasi`,
			input: "text",
			inputValidator: (v) => (v === String(g.vmid) ? undefined : `Ketik ${g.vmid} persis`),
			showCancelButton: true,
			confirmButtonText: "Rollback",
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
		});
		if (ok.isConfirmed) {
			jalankan(() =>
				api.post(`/superadmin/server/backups/${g.vmid}/snapshots/${encodeURIComponent(snap)}/rollback`, { konfirmasi: String(g.vmid) }),
			);
		}
	};

	const hapusSnapshot = async (g, snap) => {
		const ok = await Swal.fire({
			icon: "warning",
			title: `Hapus snapshot ${snap}?`,
			text: `Snapshot milik ${g.name} dihapus permanen.`,
			showCancelButton: true,
			confirmButtonText: "Hapus",
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
		});
		if (ok.isConfirmed) jalankan(() => api.delete(`/superadmin/server/backups/${g.vmid}/snapshots/${encodeURIComponent(snap)}`));
	};

	const hapusBackup = async (b) => {
		const ok = await Swal.fire({
			icon: "warning",
			title: "Hapus backup ini?",
			text: b.volid,
			showCancelButton: true,
			confirmButtonText: "Hapus",
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
		});
		if (ok.isConfirmed) jalankan(() => api.post("/superadmin/server/backups/volume/delete", { volid: b.volid }));
	};

	const backupPenuh = async (g) => {
		const storages = (data.backup_storages || []).filter((s) => s.node === g.node);
		if (!storages.length) {
			Swal.fire({ icon: "error", title: "Tidak ada storage backup di node ini" });
			return;
		}
		const ok = await Swal.fire({
			title: `Backup penuh ${g.name}`,
			text: "Mode snapshot: aplikasi tetap berjalan selama backup.",
			input: "select",
			inputOptions: Object.fromEntries(storages.map((s) => [s.storage, s.storage])),
			showCancelButton: true,
			confirmButtonText: "Mulai backup",
			cancelButtonText: "Batal",
		});
		if (ok.isConfirmed) jalankan(() => api.post(`/superadmin/server/backups/${g.vmid}/vzdump`, { storage: ok.value }));
	};

	if (galat && !data) return <Galat pesan={galat} onRetry={muat} />;
	if (!data) return <Memuat />;

	const { mysql, proxmox, guests = [], backup_storages: storages = [] } = data;
	const proxmoxSiap = proxmox.configured && !proxmox.error;

	return (
		<div className="space-y-4">
			<Card
				title="Database MySQL"
				icon={FiDatabase}
				actions={
					<Tombol variant="primary" icon={FiDownloadCloud} disabled={mysql.running || !mysql.available} onClick={backupMysql}>
						Backup sekarang
					</Tombol>
				}
			>
				<div className="space-y-3">
					{mysql.running && (
						<p className="flex items-center gap-2 text-sm text-slate-600" role="status">
							<span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500" />
							Sedang membuat cadangan…
						</p>
					)}
					{mysql.last_error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{mysql.last_error}</div>}
					{!mysql.available && mysql.error && <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{mysql.error}</div>}
					{(mysql.files || []).length ? (
						<ul className="divide-y divide-slate-100">
							{mysql.files.map((f) => (
								<li key={f.name} className="flex items-center justify-between gap-3 py-2 text-sm">
									<span className="min-w-0 truncate font-mono text-xs text-slate-800">{f.name}</span>
									<span className="shrink-0 text-xs text-slate-500">
										{formatBytes(f.size)} · {sejak(f.mtime)}
									</span>
								</li>
							))}
						</ul>
					) : (
						<Kosong icon={FiDatabase} title="Belum ada cadangan" text="Tekan Backup sekarang untuk membuat yang pertama." />
					)}
					<p className="text-xs text-slate-500">Disimpan di {mysql.dir} di server (7 terbaru). Backup otomatis harian di host Proxmox tetap berjalan.</p>
				</div>
			</Card>

			{!proxmoxSiap ? (
				<Kosong icon={FiServer} title="Proxmox belum tersambung" text={proxmox.error} />
			) : (
				<>
					<Card title="Penyimpanan backup" icon={FiHardDrive}>
						{storages.length ? (
							<div className="grid gap-4 sm:grid-cols-2">
								{storages.map((s) => (
									<div key={`${s.node}/${s.storage}`}>
										<p className="text-sm font-semibold text-slate-800">
											{s.storage} <span className="text-xs font-normal text-slate-500">· {s.node}</span>
										</p>
										<Bar percent={s.total ? (s.used / s.total) * 100 : 0} className="my-1 h-2" />
										<p className="text-xs text-slate-500">
											{formatBytes(s.used)} / {formatBytes(s.total)}
										</p>
									</div>
								))}
							</div>
						) : (
							<Kosong title="Tidak ada storage backup" />
						)}
					</Card>

					<div className="grid gap-4 lg:grid-cols-2">
						{guests.map((g) => (
							<Card
								key={g.vmid}
								title={g.name}
								subtitle={`${g.vmid} · ${String(g.type).toUpperCase()} · ${g.status}`}
								icon={FiServer}
								actions={
									g.protected && (
										<span
											title={g.is_self ? "Container panel ini" : "Terlindungi dari aksi berbahaya"}
											className="rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-semibold text-amber-800 ring-1 ring-amber-200"
										>
											Terlindungi
										</span>
									)
								}
							>
								<div className="space-y-4">
									<div>
										<div className="mb-1 flex items-center justify-between gap-2">
											<p className="text-[11px] font-semibold text-slate-500">Snapshot</p>
											<Tombol icon={FiCamera} onClick={() => buatSnapshot(g)}>
												Buat snapshot
											</Tombol>
										</div>
										{g.snapshots.length ? (
											<ul className="divide-y divide-slate-100">
												{g.snapshots.map((s) => (
													<li key={s.name} className="flex items-center gap-2 py-2">
														<div className="min-w-0 flex-1">
															<p className="truncate font-mono text-xs font-bold text-slate-800">{s.name}</p>
															<p className="truncate text-[11px] text-slate-500">
																{s.description ? `${s.description} · ` : ""}
																{s.snaptime ? formatWaktu(ke_ms(s.snaptime)) : "-"}
															</p>
														</div>
														<Tombol
															variant="dangerLight"
															icon={FiRotateCcw}
															disabled={g.protected}
															title={g.protected ? "Terlindungi: rollback dinonaktifkan" : undefined}
															onClick={() => rollbackSnapshot(g, s.name)}
														>
															Rollback
														</Tombol>
														<Tombol variant="ghost" icon={FiTrash2} title="Hapus" onClick={() => hapusSnapshot(g, s.name)}>
															<span className="sr-only">Hapus</span>
														</Tombol>
													</li>
												))}
											</ul>
										) : (
											<p className="text-xs text-slate-500">Belum ada snapshot.</p>
										)}
									</div>

									<div>
										<div className="mb-1 flex items-center justify-between gap-2">
											<p className="text-[11px] font-semibold text-slate-500">Backup penuh</p>
											<Tombol icon={FiArchive} onClick={() => backupPenuh(g)}>
												Backup penuh
											</Tombol>
										</div>
										{g.backups.length ? (
											<ul className="divide-y divide-slate-100">
												{g.backups.map((b) => (
													<li key={b.volid} className="flex items-center gap-2 py-2">
														<div className="min-w-0 flex-1">
															<p className="truncate font-mono text-xs text-slate-800" title={b.volid}>
																{b.volid.slice(b.volid.lastIndexOf("/") + 1)}
															</p>
															<p className="truncate text-[11px] text-slate-500">
																{b.storage} · {formatBytes(b.size)} · {formatWaktu(ke_ms(b.ctime))}
																{b.notes ? ` · ${b.notes}` : ""}
															</p>
														</div>
														<Tombol variant="ghost" icon={FiTrash2} title="Hapus" onClick={() => hapusBackup(b)}>
															<span className="sr-only">Hapus</span>
														</Tombol>
													</li>
												))}
											</ul>
										) : (
											<p className="text-xs text-slate-500">Belum ada backup penuh.</p>
										)}
									</div>
								</div>
							</Card>
						))}
					</div>
				</>
			)}
		</div>
	);
};

export default BackupTab;
