// Tab Storage — kapasitas disk, kuota berkas aplikasi (bisa diatur langsung),
// pemakaian per folder & jenis berkas, berkas terbesar, dan pembersihan.

import React, { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
	FiAlertTriangle,
	FiArchive,
	FiFile,
	FiFolder,
	FiHardDrive,
	FiPieChart,
	FiRefreshCw,
	FiSave,
	FiTrash2,
} from "react-icons/fi";
import api from "../../../../api";
import {
	Bar,
	Card,
	Galat,
	Memuat,
	SERI,
	Stat,
	StatusBadge,
	Toggle,
	Tombol,
	formatAngka,
	formatBytes,
	formatWaktu,
	pesanError,
	tingkatDari,
} from "../serverUi";

const WARNA_KATEGORI = {
	PDF: SERI.biru,
	Gambar: SERI.oranye,
	"Dokumen Office": SERI.aqua,
	Video: SERI.kuning,
	Arsip: SERI.magenta,
	Audio: SERI.hijau,
	Log: SERI.ungu,
	Lainnya: "#94a3b8",
};

const PengaturKuota = ({ kuota, onSaved }) => {
	const [gb, setGb] = useState(kuota.quota_bytes ? Math.round(kuota.quota_bytes / 1024 ** 3) : 0);
	const [warn, setWarn] = useState(kuota.warn_percent);
	const [enforce, setEnforce] = useState(kuota.enforce);
	const [maxMb, setMaxMb] = useState(kuota.max_upload_mb);
	const [simpan, setSimpan] = useState(false);

	const kirim = async () => {
		setSimpan(true);
		try {
			await api.put("/superadmin/server/config", {
				storage: { quota_gb: Number(gb), warn_percent: Number(warn), enforce, max_upload_mb: Number(maxMb) },
			});
			Swal.fire({ icon: "success", title: "Kuota disimpan", timer: 1500, showConfirmButton: false });
			onSaved();
		} catch (e) {
			Swal.fire({ icon: "error", title: "Gagal", text: pesanError(e) });
		} finally {
			setSimpan(false);
		}
	};

	const pakaiGb = kuota.used_bytes !== null ? kuota.used_bytes / 1024 ** 3 : null;
	const preset = [5, 10, 25, 50, 100, 250];

	return (
		<div className="space-y-4">
			<div>
				<label className="text-sm font-semibold text-slate-700">Kuota total berkas aplikasi</label>
				<p className="text-xs text-slate-500">Batas gabungan folder storage/ dan private/. Isi 0 untuk tanpa batas.</p>
				<div className="mt-2 flex items-center gap-2">
					<input
						type="number"
						min={0}
						value={gb}
						onChange={(e) => setGb(e.target.value)}
						className="w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
					/>
					<span className="text-sm text-slate-600">GB</span>
				</div>
				<div className="mt-2 flex flex-wrap gap-1.5">
					{preset.map((p) => (
						<button
							key={p}
							onClick={() => setGb(p)}
							className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ${
								Number(gb) === p ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
							}`}
						>
							{p} GB
						</button>
					))}
					<button
						onClick={() => setGb(0)}
						className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ${Number(gb) === 0 ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200"}`}
					>
						Tanpa batas
					</button>
				</div>
				{pakaiGb !== null && Number(gb) > 0 && Number(gb) < pakaiGb && (
					<p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-red-600">
						<FiAlertTriangle className="h-3.5 w-3.5" /> Kuota lebih kecil dari pemakaian saat ini ({pakaiGb.toFixed(1)} GB) — unggahan akan langsung ditolak.
					</p>
				)}
			</div>
			<div className="grid gap-3 sm:grid-cols-2">
				<div>
					<label className="text-sm font-semibold text-slate-700">Peringatan pada</label>
					<div className="mt-1 flex items-center gap-2">
						<input type="number" min={10} max={100} value={warn} onChange={(e) => setWarn(e.target.value)} className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
						<span className="text-sm text-slate-600">% kuota</span>
					</div>
				</div>
				<div>
					<label className="text-sm font-semibold text-slate-700">Maks. ukuran satu unggahan</label>
					<div className="mt-1 flex items-center gap-2">
						<input type="number" min={0} value={maxMb} onChange={(e) => setMaxMb(e.target.value)} className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
						<span className="text-sm text-slate-600">MB (0 = ikuti fitur)</span>
					</div>
				</div>
			</div>
			<Toggle
				checked={enforce}
				onChange={setEnforce}
				label="Tolak unggahan saat kuota penuh"
				hint="Bila mati, kuota hanya memicu peringatan tanpa menolak unggahan."
			/>
			<Tombol icon={FiSave} variant="dark" onClick={kirim} disabled={simpan}>
				{simpan ? "Menyimpan…" : "Simpan kuota"}
			</Tombol>
		</div>
	);
};

const StorageTab = () => {
	const [data, setData] = useState(null);
	const [galat, setGalat] = useState(null);
	const [pratinjau, setPratinjau] = useState(null);
	const [sibuk, setSibuk] = useState(null);

	const muat = useCallback(async (segar = false) => {
		if (segar) setSibuk("scan");
		try {
			const r = await api.get("/superadmin/server/storage", { params: segar ? { refresh: 1 } : {} });
			setData(r.data?.data);
			setGalat(null);
		} catch (e) {
			setGalat(pesanError(e));
		} finally {
			setSibuk(null);
		}
	}, []);

	const muatPratinjau = useCallback(() => {
		api
			.get("/superadmin/server/storage/cleanup")
			.then((r) => setPratinjau(r.data?.data))
			.catch(() => setPratinjau({}));
	}, []);

	useEffect(() => {
		muat();
		muatPratinjau();
	}, [muat, muatPratinjau]);

	const bersihkan = async (target, info) => {
		const ok = await Swal.fire({
			icon: "warning",
			title: `Bersihkan ${info.label.toLowerCase()}?`,
			html: `<p style="font-size:14px">${formatAngka(info.files)} berkas (${formatBytes(info.size)}) akan dihapus permanen.${
				target === "logs" ? "<br/><small>Isi log dikosongkan; berkasnya tetap ada.</small>" : ""
			}</p>`,
			showCancelButton: true,
			confirmButtonText: "Ya, bersihkan",
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
		});
		if (!ok.isConfirmed) return;
		setSibuk(target);
		try {
			const r = await api.post("/superadmin/server/storage/cleanup", { target });
			const h = r.data?.data;
			Swal.fire({ icon: "success", title: "Selesai", text: `${formatAngka(h.files)} berkas dibersihkan, ${formatBytes(h.freed)} ruang dibebaskan.` });
			muatPratinjau();
			setTimeout(() => muat(), 1500);
		} catch (e) {
			Swal.fire({ icon: "error", title: "Gagal", text: pesanError(e) });
		} finally {
			setSibuk(null);
		}
	};

	if (galat && !data) return <Galat pesan={galat} onRetry={() => muat()} />;
	if (!data) return <Memuat teks="Menghitung pemakaian storage…" />;

	const d = data.disk;
	const q = data.quota;
	const totalKat = (data.categories || []).reduce((t, c) => t + c.size, 0) || 1;
	const subMaks = data.subfolders?.[0]?.size || 1;

	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<Stat icon={FiHardDrive} tone="blue" label="Disk terpakai" value={d ? `${d.percent}%` : "-"} hint={d ? `${formatBytes(d.used)} dari ${formatBytes(d.total)}` : ""} />
				<Stat icon={FiHardDrive} tone="green" label="Disk tersisa" value={d ? formatBytes(d.free) : "-"} hint="Ruang kosong di partisi aplikasi" />
				<Stat icon={FiFolder} tone="violet" label="Berkas aplikasi" value={formatBytes(data.app_usage)} hint={`${formatAngka(data.total_files)} berkas`} />
				<Stat
					icon={FiPieChart}
					tone={q.full ? "red" : q.percent >= q.warn_percent ? "amber" : "slate"}
					label="Kuota"
					value={q.quota_bytes ? `${q.percent ?? 0}%` : "Tanpa batas"}
					hint={q.quota_bytes ? `dari ${formatBytes(q.quota_bytes)}` : "Atur di panel kuota"}
				/>
			</div>

			<div className="grid gap-4 lg:grid-cols-5">
				<Card
					className="lg:col-span-3"
					title="Kapasitas"
					subtitle={data.scanned_at ? `Dihitung ${formatWaktu(data.scanned_at, { second: "2-digit" })} (${data.duration_ms} ms)${data.scanning ? " · sedang menghitung ulang…" : ""}` : ""}
					icon={FiHardDrive}
					actions={
						<Tombol icon={FiRefreshCw} disabled={sibuk === "scan"} onClick={() => muat(true)}>
							{sibuk === "scan" ? "Menghitung…" : "Hitung ulang"}
						</Tombol>
					}
				>
					<div className="space-y-5">
						{d && (
							<div>
								<div className="mb-1.5 flex justify-between text-sm">
									<span className="font-semibold text-slate-700">Disk server (partisi aplikasi)</span>
									<span className="text-slate-600">
										{formatBytes(d.used)} / {formatBytes(d.total)}
									</span>
								</div>
								<Bar percent={d.percent} className="h-3" />
							</div>
						)}
						{q.quota_bytes > 0 && (
							<div>
								<div className="mb-1.5 flex justify-between text-sm">
									<span className="flex items-center gap-2 font-semibold text-slate-700">
										Kuota berkas aplikasi
										{q.full && <StatusBadge tingkat="kritis" label={q.enforce ? "Penuh — unggahan ditolak" : "Penuh"} />}
									</span>
									<span className="text-slate-600">
										{formatBytes(q.used_bytes)} / {formatBytes(q.quota_bytes)}
									</span>
								</div>
								<Bar percent={q.percent} tingkat={tingkatDari(q.percent, q.warn_percent)} className="h-3" />
							</div>
						)}
						<div>
							<p className="mb-2 text-sm font-semibold text-slate-700">Per lokasi</p>
							<div className="space-y-2">
								{data.folders.map((f) => (
									<div key={f.key} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm">
										<span className="flex items-center gap-2 font-medium text-slate-700">
											<FiFolder className="h-4 w-4 text-slate-400" />
											{f.label}
										</span>
										<span className="text-slate-600">
											<b className="text-slate-800">{formatBytes(f.size)}</b> · {formatAngka(f.files)} berkas
										</span>
									</div>
								))}
							</div>
						</div>
						{data.partitions?.length > 0 && (
							<div>
								<p className="mb-2 text-sm font-semibold text-slate-700">Semua partisi</p>
								<div className="space-y-2.5">
									{data.partitions.map((p) => (
										<div key={`${p.filesystem}-${p.mount}`}>
											<div className="mb-1 flex justify-between gap-2 text-xs">
												<span className="truncate font-mono text-slate-600">
													{p.mount} <span className="text-slate-400">({p.type})</span>
												</span>
												<span className="shrink-0 text-slate-600">
													{formatBytes(p.used)} / {formatBytes(p.total)} · {p.percent}%
												</span>
											</div>
											<Bar percent={p.percent} />
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</Card>

				<Card className="lg:col-span-2" title="Atur Kuota Storage" subtitle="Batasi ruang yang boleh dipakai unggahan" icon={FiPieChart}>
					<PengaturKuota kuota={q} onSaved={() => muat()} />
				</Card>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<Card title="Jenis Berkas" subtitle="Proporsi ruang per jenis" icon={FiPieChart}>
					<div className="mb-4 flex h-4 w-full gap-[2px] overflow-hidden rounded-full">
						{data.categories.map((c) => (
							<span
								key={c.name}
								title={`${c.name}: ${formatBytes(c.size)}`}
								style={{ width: `${(c.size / totalKat) * 100}%`, background: WARNA_KATEGORI[c.name] || "#94a3b8" }}
								className="h-full min-w-[3px]"
							/>
						))}
					</div>
					<ul className="space-y-2">
						{data.categories.map((c) => (
							<li key={c.name} className="flex items-center justify-between gap-3 text-sm">
								<span className="flex items-center gap-2 text-slate-700">
									<span className="h-2.5 w-2.5 rounded-sm" style={{ background: WARNA_KATEGORI[c.name] || "#94a3b8" }} />
									{c.name}
								</span>
								<span className="text-slate-600">
									<b className="text-slate-800">{formatBytes(c.size)}</b> · {formatAngka(c.files)} berkas · {Math.round((c.size / totalKat) * 100)}%
								</span>
							</li>
						))}
					</ul>
				</Card>

				<Card title="Folder Terbesar" subtitle="Per modul/fitur" icon={FiFolder}>
					<ul className="max-h-[360px] space-y-2.5 overflow-auto pr-1">
						{data.subfolders.map((s) => (
							<li key={s.path}>
								<div className="mb-1 flex justify-between gap-3 text-xs">
									<span className="truncate font-mono text-slate-700" title={s.path}>
										{s.path}
									</span>
									<span className="shrink-0 text-slate-600">
										<b>{formatBytes(s.size)}</b> · {formatAngka(s.files)}
									</span>
								</div>
								<Bar percent={(s.size / subMaks) * 100} tingkat="baik" className="h-1.5" />
							</li>
						))}
					</ul>
				</Card>
			</div>

			<Card title="Berkas Terbesar" subtitle="30 berkas yang paling banyak memakan ruang" icon={FiFile} bodyClass="p-0">
				<div className="max-h-[420px] overflow-auto">
					<table className="w-full text-sm">
						<thead className="sticky top-0 bg-slate-50 text-left text-[11.5px] uppercase tracking-wide text-slate-500">
							<tr>
								<th className="px-4 py-2">Berkas</th>
								<th className="px-3 py-2 text-right">Ukuran</th>
								<th className="px-4 py-2">Diubah</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{data.largest_files.map((f) => (
								<tr key={f.path}>
									<td className="max-w-[520px] truncate px-4 py-2 font-mono text-xs text-slate-700" title={f.path}>
										{f.path}
									</td>
									<td className="px-3 py-2 text-right font-semibold">{formatBytes(f.size)}</td>
									<td className="px-4 py-2 text-xs text-slate-500">{formatWaktu(f.modified)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Card>

			<Card title="Pembersihan" subtitle="Bebaskan ruang dari berkas yang aman dihapus" icon={FiTrash2}>
				{!pratinjau ? (
					<Memuat teks="Menghitung berkas yang bisa dibersihkan…" />
				) : (
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						{Object.entries(pratinjau).map(([key, info]) => (
							<div key={key} className="flex flex-col rounded-xl border border-slate-200 p-4">
								<FiArchive className="h-5 w-5 text-slate-400" />
								<p className="mt-2 text-sm font-bold text-slate-800">{info.label}</p>
								<p className="mt-0.5 flex-1 text-xs text-slate-500">
									{key === "logs"
										? "Isi semua berkas log dikosongkan."
										: key === "backups"
											? "Berkas backup lokal lebih dari 7 hari."
											: `Berkas lebih dari ${info.age_rule} jam.`}
								</p>
								<p className="mt-2 text-lg font-extrabold text-slate-800">{formatBytes(info.size)}</p>
								<p className="text-xs text-slate-500">{formatAngka(info.files)} berkas</p>
								<Tombol
									className="mt-3"
									icon={FiTrash2}
									variant="dangerLight"
									disabled={!info.files || !!sibuk}
									onClick={() => bersihkan(key, info)}
								>
									{sibuk === key ? "Membersihkan…" : "Bersihkan"}
								</Tombol>
							</div>
						))}
					</div>
				)}
			</Card>
		</div>
	);
};

export default StorageTab;
