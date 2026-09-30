// Tab Semua Aplikasi — seluruh container/VM di host Proxmox (super-apps,
// simpaskor, Gate, asta-desa, posyandu, postgres-db, …): status, pemakaian
// CPU/RAM/disk/jaringan, grafik, serta pengaturan jatah disk, RAM, dan CPU.

import React, { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import {
	FiBox,
	FiCpu,
	FiDatabase,
	FiHardDrive,
	FiLayers,
	FiMonitor,
	FiPlay,
	FiPlus,
	FiPower,
	FiRefreshCw,
	FiRotateCw,
	FiServer,
	FiSettings,
	FiShield,
	FiSquare,
	FiX,
	FiClock,
	FiList,
} from "react-icons/fi";
import api from "../../../../api";
import {
	Bar,
	Card,
	Galat,
	GrafikArea,
	Kosong,
	Legenda,
	Memuat,
	PilihRentang,
	SERI,
	Stat,
	StatusBadge,
	Tombol,
	formatBytes,
	formatDurasi,
	formatRate,
	formatWaktu,
	pesanError,
	tingkatDari,
	usePolling,
} from "../serverUi";

const RENTANG = [
	{ value: "hour", label: "1 jam" },
	{ value: "day", label: "24 jam" },
	{ value: "week", label: "7 hari" },
	{ value: "month", label: "30 hari" },
];

const persen = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);

const PanduanSetup = ({ status, onRetry }) => (
	<Card title="Hubungkan ke Proxmox" subtitle="Agar semua aplikasi di server bisa dipantau & diatur dari sini" icon={FiServer}>
		<div className="space-y-4 text-sm text-slate-700">
			{status?.configured && status.error && (
				<div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">
					<b>Gagal terhubung:</b> {status.error}
				</div>
			)}
			<p>
				Semua aplikasi berjalan sebagai container di host Proxmox. Panel ini membaca & mengaturnya lewat <b>API token</b> (bukan sandi root). Lakukan sekali
				saja:
			</p>
			<ol className="list-decimal space-y-3 pl-5">
				<li>
					Di shell <b>host Proxmox</b>, buat user & token khusus panel dengan hak terbatas:
					<pre className="mt-1.5 overflow-x-auto rounded-lg bg-slate-900 p-3 text-[11.5px] leading-relaxed text-slate-100">{`pveum role add DPMDPanel --privs "Sys.Audit,VM.Audit,VM.PowerMgmt,VM.Config.Disk,VM.Config.Memory,VM.Config.CPU,VM.Config.Options,Datastore.Audit,Datastore.AllocateSpace"
pveum user add panel@pve --comment "Panel Manajemen Server DPMD"
pveum acl modify / --users panel@pve --roles DPMDPanel --propagate 1
pveum user token add panel@pve dpmd --privsep 0`}</pre>
					<p className="mt-1 text-xs text-slate-500">VM.Config.Options wajib — tanpa itu Proxmox menolak (403) penambahan disk container.</p>
					<p className="mt-1 text-xs text-slate-500">Perintah terakhir menampilkan secret token satu kali — salin.</p>
				</li>
				<li>
					Di container <b>super-apps</b>, tambahkan ke <code className="rounded bg-slate-100 px-1">/var/www/backend/.env</code>:
					<pre className="mt-1.5 overflow-x-auto rounded-lg bg-slate-900 p-3 text-[11.5px] leading-relaxed text-slate-100">{`PROXMOX_URL=https://172.168.20.20:8006
PROXMOX_TOKEN_ID=panel@pve!dpmd
PROXMOX_TOKEN_SECRET=<secret dari langkah 1>
PROXMOX_VERIFY_TLS=false
PROXMOX_SELF_VMID=100
PROXMOX_PROTECTED_VMIDS=102`}</pre>
					<p className="mt-1 text-xs text-slate-500">
						SELF_VMID = container panel ini (tidak bisa dimatikan dari sini). PROTECTED = container yang juga dilindungi, mis. Gate (102).
					</p>
				</li>
				<li>
					Restart backend: <code className="rounded bg-slate-100 px-1">pm2 restart dpmd-backend --update-env</code>, lalu tekan tombol di bawah.
				</li>
			</ol>
			<Tombol icon={FiRefreshCw} variant="dark" onClick={onRetry}>
				Cek koneksi
			</Tombol>
		</div>
	</Card>
);

const KartuGuest = ({ g, onOpen }) => {
	const mem = persen(g.mem, g.maxmem);
	const disk = g.type === "lxc" ? persen(g.disk, g.maxdisk) : null;
	const jalan = g.status === "running";
	return (
		<button
			onClick={() => onOpen(g.vmid)}
			className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-300 hover:shadow-md"
		>
			<div className="flex items-start justify-between gap-2">
				<div className="flex min-w-0 items-center gap-2.5">
					<span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${jalan ? "bg-blue-50 text-blue-600" : "bg-slate-100 text-slate-400"}`}>
						{g.type === "lxc" ? <FiBox className="h-4 w-4" /> : <FiMonitor className="h-4 w-4" />}
					</span>
					<div className="min-w-0">
						<p className="truncate font-bold text-slate-800">{g.name}</p>
						<p className="text-[11px] text-slate-500">
							{g.type === "lxc" ? "Container" : "VM"} {g.vmid} · {g.node}
						</p>
					</div>
				</div>
				<StatusBadge tingkat={jalan ? "baik" : "kritis"} label={jalan ? "Berjalan" : g.status} />
			</div>
			<div className="mt-3 flex flex-wrap gap-1">
				{g.is_self && <span className="rounded bg-blue-100 px-1.5 text-[10px] font-bold text-blue-700">PANEL INI</span>}
				{g.protected && !g.is_self && (
					<span className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 text-[10px] font-bold text-slate-600">
						<FiShield className="h-2.5 w-2.5" /> TERLINDUNGI
					</span>
				)}
				{g.tags.map((t) => (
					<span key={t} className="rounded bg-violet-50 px-1.5 text-[10px] font-semibold text-violet-700">
						{t}
					</span>
				))}
			</div>
			<div className="mt-3 space-y-2 text-xs">
				<div>
					<div className="mb-0.5 flex justify-between text-slate-600">
						<span>CPU ({g.maxcpu} core)</span>
						<b>{jalan ? `${g.cpu}%` : "-"}</b>
					</div>
					<Bar percent={g.cpu} className="h-1.5" />
				</div>
				<div>
					<div className="mb-0.5 flex justify-between text-slate-600">
						<span>RAM</span>
						<b>
							{formatBytes(g.mem)} / {formatBytes(g.maxmem)}
						</b>
					</div>
					<Bar percent={mem} tingkat={tingkatDari(mem, 90)} className="h-1.5" />
				</div>
				<div>
					<div className="mb-0.5 flex justify-between text-slate-600">
						<span>Disk</span>
						<b>{disk !== null ? `${formatBytes(g.disk)} / ${formatBytes(g.maxdisk)}` : formatBytes(g.maxdisk)}</b>
					</div>
					<Bar percent={disk ?? 0} tingkat={tingkatDari(disk, 85)} className="h-1.5" />
				</div>
			</div>
			<div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
				<p className="text-[11px] text-slate-500">{jalan ? `Aktif ${formatDurasi(g.uptime)}` : "Tidak berjalan"}</p>
				<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 transition group-hover:text-blue-600">
					<FiSettings className="h-3 w-3" /> Atur kapasitas
				</span>
			</div>
		</button>
	);
};

const konfirmasiNama = async (judul, html, nama, tombol, warna = "#dc2626") => {
	const r = await Swal.fire({
		icon: "warning",
		title: judul,
		html: `${html}<p style="margin-top:12px;font-size:13px">Ketik <b>${nama}</b> untuk konfirmasi:</p>`,
		input: "text",
		inputPlaceholder: nama,
		showCancelButton: true,
		confirmButtonText: tombol,
		cancelButtonText: "Batal",
		confirmButtonColor: warna,
		preConfirm: (v) => {
			if (String(v || "").trim() !== nama) {
				Swal.showValidationMessage(`Nama tidak cocok. Ketik persis: ${nama}`);
				return false;
			}
			return v.trim();
		},
	});
	return r.isConfirmed ? r.value : null;
};

const GB = 1024 ** 3;
const PILIHAN_DISK = [5, 10, 25, 50, 100];

/** Satu disk: pemakaian, pilihan cepat tambah GB, dan pratinjau hasilnya. */
const KelolaDisk = ({ disk, pakai, sisaPool, sibuk, onTambah }) => {
	const [tambah, setTambah] = useState(10);
	const gb = Math.round(Number(tambah) || 0);
	const sekarangGb = disk.size_bytes ? Math.round(disk.size_bytes / GB) : null;
	const sisaGb = sisaPool != null ? Math.floor(sisaPool / GB) : null;
	const melebihi = sisaGb != null && gb > sisaGb;
	const valid = gb >= 1 && gb <= 2048 && !melebihi;
	const p = pakai?.total ? persen(pakai.used, pakai.total) : null;

	return (
		<div className="rounded-xl border border-slate-200 bg-white p-4">
			<div className="flex flex-wrap items-start justify-between gap-2">
				<div className="min-w-0">
					<p className="text-sm font-bold text-slate-800">
						{disk.key === "rootfs" ? "Disk utama" : `Disk tambahan ${disk.key}`}
						{disk.mountpoint && <span className="ml-1 font-mono text-xs font-normal text-slate-500">→ {disk.mountpoint}</span>}
					</p>
					<p className="truncate font-mono text-[11px] text-slate-400">
						{disk.storage}:{disk.volume}
					</p>
				</div>
				<span className="text-2xl font-extrabold tracking-tight text-slate-900">{disk.size || "-"}</span>
			</div>

			{p !== null && (
				<div className="mt-3">
					<Bar percent={p} tingkat={tingkatDari(p, 85)} className="h-2.5" />
					<div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-slate-500">
						<span>
							Terpakai <b className="text-slate-700">{formatBytes(pakai.used)}</b> dari {formatBytes(pakai.total)} ({p}%)
						</span>
						<span>Sisa {formatBytes(pakai.total - pakai.used)}</span>
					</div>
					{p >= 85 && <p className="mt-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-800">Disk hampir penuh — disarankan tambah kapasitas.</p>}
				</div>
			)}

			<p className="mt-4 text-xs font-semibold text-slate-600">Tambah kapasitas</p>
			<div className="mt-1.5 flex flex-wrap items-center gap-1.5">
				{PILIHAN_DISK.map((n) => (
					<button
						key={n}
						onClick={() => setTambah(n)}
						disabled={sisaGb != null && n > sisaGb}
						className={`rounded-lg px-3 py-1.5 text-xs font-bold ring-1 transition disabled:cursor-not-allowed disabled:opacity-40 ${
							gb === n ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-700 ring-slate-200 hover:ring-slate-400"
						}`}
					>
						+{n} GB
					</button>
				))}
				<label className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs ring-1 ring-slate-200">
					<span className="text-slate-500">Lainnya</span>
					<input
						type="number"
						min={1}
						max={2048}
						value={tambah}
						onChange={(e) => setTambah(e.target.value)}
						className="w-16 bg-transparent text-right font-bold text-slate-800 outline-none"
					/>
					<span className="text-slate-500">GB</span>
				</label>
			</div>

			<div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
				<div className="text-xs text-slate-600">
					<p>
						Ukuran baru: <b className="text-slate-900">{disk.size || "-"}</b> → <b className="text-emerald-700">{sekarangGb != null ? `${sekarangGb + gb} GB` : `+${gb} GB`}</b>
					</p>
					{sisaGb != null && (
						<p className={melebihi ? "font-semibold text-red-600" : "text-slate-500"}>
							{melebihi ? `Ruang pool ${disk.storage} tidak cukup (sisa ${sisaGb} GB).` : `Sisa pool ${disk.storage} setelahnya: ${sisaGb - gb} GB`}
						</p>
					)}
				</div>
				<Tombol icon={FiPlus} variant="dark" disabled={sibuk || !valid} onClick={() => onTambah(disk, gb)}>
					Tambah {gb || 0} GB
				</Tombol>
			</div>
			<p className="mt-2 text-[11px] text-slate-400">Aplikasi tetap berjalan selama proses. Disk hanya bisa diperbesar, tidak bisa dikecilkan kembali.</p>
		</div>
	);
};

const PILIHAN_RAM = [1024, 2048, 4096, 8192, 16384, 32768];
const PILIHAN_SWAP = [0, 512, 1024, 2048, 4096];

/** Jatah RAM/CPU/swap dengan slider, pratinjau perubahan, dan peringatan OOM. */
const KelolaSumberDaya = ({ d, host, sibuk, onSimpan }) => {
	const awal = { memory_mb: d.config.memory_mb ?? 0, cores: d.config.cores ?? 1, swap_mb: d.config.swap_mb ?? 0 };
	const [v, setV] = useState(awal);
	const maxRam = host?.maxmem ? Math.floor(host.maxmem / 1024 ** 2 / 512) * 512 : 65536;
	const maxCores = host?.maxcpu || 64;
	const dipakaiMb = Math.round((d.mem || 0) / 1024 ** 2);
	const ramBaru = Number(v.memory_mb) || 0;
	const terlaluKecil = d.status === "running" && ramBaru > 0 && ramBaru < dipakaiMb * 1.15;
	const berubah =
		ramBaru !== Number(awal.memory_mb) || Number(v.cores) !== Number(awal.cores) || (d.type === "lxc" && Number(v.swap_mb) !== Number(awal.swap_mb));

	const Selisih = ({ lama, baru, satuan }) =>
		Number(lama) === Number(baru) ? (
			<span className="text-xs text-slate-400">tidak berubah</span>
		) : (
			<span className={`text-xs font-bold ${Number(baru) > Number(lama) ? "text-emerald-600" : "text-amber-600"}`}>
				{lama} → {baru} {satuan}
			</span>
		);

	return (
		<div className="space-y-5">
			<div>
				<div className="flex items-baseline justify-between gap-2">
					<p className="text-sm font-bold text-slate-800">RAM</p>
					<Selisih lama={`${(awal.memory_mb / 1024).toFixed(1)}`} baru={`${(ramBaru / 1024).toFixed(1)}`} satuan="GB" />
				</div>
				<div className="mt-2 flex items-center gap-3">
					<input
						type="range"
						min={512}
						max={Math.max(maxRam, ramBaru)}
						step={512}
						value={ramBaru}
						onChange={(e) => setV({ ...v, memory_mb: Number(e.target.value) })}
						className="h-2 flex-1 cursor-pointer accent-slate-900"
					/>
					<span className="w-20 text-right text-sm font-extrabold tabular-nums text-slate-900">{(ramBaru / 1024).toFixed(1)} GB</span>
				</div>
				<div className="mt-2 flex flex-wrap gap-1.5">
					{PILIHAN_RAM.filter((m) => m <= maxRam).map((m) => (
						<button
							key={m}
							onClick={() => setV({ ...v, memory_mb: m })}
							className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ${ramBaru === m ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-400"}`}
						>
							{m / 1024} GB
						</button>
					))}
				</div>
				<p className="mt-1.5 text-[11px] text-slate-500">
					Sedang dipakai {formatBytes(d.mem)} · RAM fisik host {host ? formatBytes(host.maxmem) : "-"}
				</p>
				{terlaluKecil && (
					<p className="mt-1.5 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-700">
						Terlalu dekat/di bawah pemakaian saat ini — aplikasi bisa dimatikan sistem karena kehabisan memori.
					</p>
				)}
			</div>

			<div>
				<div className="flex items-baseline justify-between gap-2">
					<p className="text-sm font-bold text-slate-800">Core CPU</p>
					<Selisih lama={awal.cores} baru={v.cores} satuan="core" />
				</div>
				<div className="mt-2 flex items-center gap-3">
					<input
						type="range"
						min={1}
						max={Math.max(maxCores, Number(v.cores) || 1)}
						step={1}
						value={v.cores}
						onChange={(e) => setV({ ...v, cores: Number(e.target.value) })}
						className="h-2 flex-1 cursor-pointer accent-slate-900"
					/>
					<span className="w-20 text-right text-sm font-extrabold tabular-nums text-slate-900">{v.cores} core</span>
				</div>
				<p className="mt-1.5 text-[11px] text-slate-500">
					Pemakaian CPU saat ini {d.status === "running" ? `${d.cpu}%` : "-"} · host punya {maxCores} thread
				</p>
			</div>

			{d.type === "lxc" && (
				<div>
					<div className="flex items-baseline justify-between gap-2">
						<p className="text-sm font-bold text-slate-800">Swap</p>
						<Selisih lama={awal.swap_mb} baru={v.swap_mb} satuan="MB" />
					</div>
					<div className="mt-2 flex flex-wrap gap-1.5">
						{PILIHAN_SWAP.map((m) => (
							<button
								key={m}
								onClick={() => setV({ ...v, swap_mb: m })}
								className={`rounded-md px-2 py-1 text-xs font-semibold ring-1 ${Number(v.swap_mb) === m ? "bg-slate-900 text-white ring-slate-900" : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-400"}`}
							>
								{m === 0 ? "Tanpa swap" : m < 1024 ? `${m} MB` : `${m / 1024} GB`}
							</button>
						))}
					</div>
					<p className="mt-1.5 text-[11px] text-slate-500">Cadangan memori di disk saat RAM penuh (lebih lambat dari RAM).</p>
				</div>
			)}

			<div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
				<Tombol icon={FiSettings} variant="dark" disabled={sibuk || !berubah} onClick={() => onSimpan(v)}>
					Simpan perubahan
				</Tombol>
				{berubah && (
					<Tombol disabled={sibuk} onClick={() => setV(awal)}>
						Batalkan
					</Tombol>
				)}
				{!berubah && <span className="text-xs text-slate-400">Geser slider atau pilih ukuran untuk mengubah.</span>}
			</div>
		</div>
	);
};

const DetailGuest = ({ vmid, nodes = [], storages = [], onClose, onChanged }) => {
	const [d, setD] = useState(null);
	const [galat, setGalat] = useState(null);
	const [rentang, setRentang] = useState("hour");
	const [rrd, setRrd] = useState(null);
	const [sibuk, setSibuk] = useState(false);

	const muat = useCallback(async () => {
		try {
			const r = await api.get(`/superadmin/server/proxmox/guests/${vmid}`);
			setD(r.data?.data);
			setGalat(null);
		} catch (e) {
			setGalat(pesanError(e));
		}
	}, [vmid]);

	useEffect(() => {
		muat();
	}, [muat]);

	useEffect(() => {
		setRrd(null);
		api
			.get(`/superadmin/server/proxmox/rrd/${vmid}`, { params: { timeframe: rentang } })
			.then((r) => setRrd(r.data?.data || []))
			.catch(() => setRrd([]));
	}, [vmid, rentang]);

	const daya = async (aksi) => {
		const label = { start: "Nyalakan", shutdown: "Matikan (aman)", reboot: "Reboot", stop: "Paksa mati" }[aksi];
		const ket = {
			shutdown: "Aplikasi dimatikan dengan rapi. Pengguna tidak bisa mengaksesnya sampai dinyalakan lagi.",
			reboot: "Aplikasi dimulai ulang; tidak bisa diakses ±1 menit.",
			stop: "<b>Seperti mencabut kabel listrik.</b> Data yang belum tersimpan bisa rusak. Gunakan hanya bila Matikan tidak berhasil.",
		}[aksi];
		let nama = null;
		if (aksi !== "start") {
			nama = await konfirmasiNama(`${label} ${d.name}?`, `<p style="font-size:14px">${ket}</p>`, d.name, label);
			if (!nama) return;
		}
		setSibuk(true);
		try {
			const r = await api.post(`/superadmin/server/proxmox/guests/${vmid}/power/${aksi}`, { confirm_name: nama });
			Swal.fire({ icon: "success", title: "Perintah dikirim", text: r.data?.message, timer: 2500, showConfirmButton: false });
			setTimeout(() => {
				muat();
				onChanged();
			}, 4000);
		} catch (e) {
			Swal.fire({ icon: "error", title: "Gagal", text: pesanError(e) });
		} finally {
			setSibuk(false);
		}
	};

	const tambahDisk = async (disk, gb) => {
		const nama = await konfirmasiNama(
			`Tambah ${gb} GB ke ${d.name}?`,
			`<p style="font-size:14px">${disk.key}: ${disk.size} → ±${Math.round((disk.size_bytes || 0) / 1024 ** 3) + gb}G. Aplikasi tetap berjalan selama proses.</p>`,
			d.name,
			`Tambah ${gb} GB`,
			"#0f172a",
		);
		if (!nama) return;
		setSibuk(true);
		try {
			const r = await api.post(`/superadmin/server/proxmox/guests/${vmid}/resize`, { disk: disk.key, add_gb: gb, confirm_name: nama });
			Swal.fire({ icon: "success", title: "Disk diperbesar", text: r.data?.message });
			muat();
			onChanged();
		} catch (e) {
			Swal.fire({ icon: "error", title: "Gagal", text: pesanError(e) });
		} finally {
			setSibuk(false);
		}
	};

	const simpanSumberDaya = async (res) => {
		const nama = await konfirmasiNama(
			`Ubah sumber daya ${d.name}?`,
			`<p style="font-size:14px">RAM ${d.config.memory_mb} → <b>${res.memory_mb} MB</b>, core ${d.config.cores ?? "-"} → <b>${res.cores}</b>${
				d.type === "lxc" ? `, swap ${d.config.swap_mb} → <b>${res.swap_mb} MB</b>` : ""
			}.<br/><small>Menurunkan RAM di bawah pemakaian saat ini bisa membuat aplikasi dimatikan sistem (OOM).</small></p>`,
			d.name,
			"Simpan",
			"#0f172a",
		);
		if (!nama) return;
		setSibuk(true);
		try {
			const r = await api.put(`/superadmin/server/proxmox/guests/${vmid}/resources`, { ...res, confirm_name: nama });
			Swal.fire({ icon: "success", title: "Tersimpan", text: r.data?.message });
			muat();
			onChanged();
		} catch (e) {
			Swal.fire({ icon: "error", title: "Gagal", text: pesanError(e) });
		} finally {
			setSibuk(false);
		}
	};

	const jangka = rentang === "week" || rentang === "month";
	const tick = jangka ? (t) => new Date(t).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) : undefined;
	const lbl = (t) => formatWaktu(t);
	const jalan = d?.status === "running";

	return (
		<div className="fixed inset-0 z-50 flex justify-end bg-slate-900/50" onClick={onClose}>
			<div className="h-full w-full max-w-6xl overflow-y-auto bg-slate-50 shadow-2xl" onClick={(e) => e.stopPropagation()}>
				<div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white px-5 py-3">
					<div className="min-w-0">
						<p className="truncate text-lg font-bold text-slate-800">{d?.name || `#${vmid}`}</p>
						<p className="text-xs text-slate-500">
							{d ? `${d.type === "lxc" ? "Container LXC" : "Mesin virtual"} ${d.vmid} · node ${d.node} · ${d.config.ostype || ""}` : "Memuat…"}
						</p>
					</div>
					<button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Tutup">
						<FiX className="h-5 w-5" />
					</button>
				</div>

				<div className="space-y-4 p-5">
					{galat && <Galat pesan={galat} onRetry={muat} />}
					{!d && !galat && <Memuat />}
					{d && (
						<>
							<div className="flex flex-wrap items-center gap-2">
								<StatusBadge tingkat={jalan ? "baik" : "kritis"} label={jalan ? `Berjalan · ${formatDurasi(d.uptime)}` : d.status} />
								{d.config.onboot && <span className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">Otomatis menyala saat boot</span>}
								{d.network.map((n) => n.ip && (
									<span key={n.key} className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
										{n.ip}
									</span>
								))}
								<div className="ml-auto flex flex-wrap gap-1.5">
									{jalan ? (
										<>
											<Tombol icon={FiRotateCw} disabled={sibuk || d.protected} onClick={() => daya("reboot")}>
												Reboot
											</Tombol>
											<Tombol icon={FiPower} variant="dangerLight" disabled={sibuk || d.protected} onClick={() => daya("shutdown")}>
												Matikan
											</Tombol>
											<Tombol icon={FiSquare} variant="danger" disabled={sibuk || d.protected} onClick={() => daya("stop")}>
												Paksa mati
											</Tombol>
										</>
									) : (
										<Tombol icon={FiPlay} variant="primary" disabled={sibuk} onClick={() => daya("start")}>
											Nyalakan
										</Tombol>
									)}
								</div>
							</div>
							{d.protected && (
								<p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-800">
									<FiShield className="mr-1 inline h-3.5 w-3.5" />
									{d.is_self
										? "Ini container tempat panel berjalan — tombol mati/reboot dinonaktifkan agar panel tidak memutus dirinya sendiri."
										: "Container terlindungi — tidak bisa dimatikan dari panel."}
								</p>
							)}

							<div className="grid grid-cols-2 gap-3 md:grid-cols-4">
								<Stat icon={FiCpu} tone="blue" label="CPU" value={jalan ? `${d.cpu}%` : "-"} hint={`${d.maxcpu} core`} />
								<Stat icon={FiLayers} tone="violet" label="RAM" value={`${persen(d.mem, d.maxmem)}%`} hint={`${formatBytes(d.mem)} / ${formatBytes(d.maxmem)}`} />
								<Stat
									icon={FiHardDrive}
									tone="green"
									label="Disk"
									value={d.type === "lxc" ? `${persen(d.disk, d.maxdisk)}%` : formatBytes(d.maxdisk)}
									hint={d.type === "lxc" ? `${formatBytes(d.disk)} / ${formatBytes(d.maxdisk)}` : "Pemakaian di dalam VM tidak terbaca"}
								/>
								<Stat icon={FiDatabase} label="Total trafik" value={formatBytes(d.netin + d.netout)} hint={`↓ ${formatBytes(d.netin)} · ↑ ${formatBytes(d.netout)}`} />
							</div>

							<div className="grid gap-4 xl:grid-cols-2">
								<Card title="Kapasitas Disk" subtitle="Tambah ruang penyimpanan tanpa mematikan aplikasi" icon={FiHardDrive}>
									<div className="space-y-3">
										{d.disks.map((disk) => {
											const pool = storages.find((s) => s.storage === disk.storage && s.node === d.node);
											return (
												<KelolaDisk
													key={disk.key}
													disk={disk}
													pakai={disk.key === "rootfs" && d.type === "lxc" ? { used: d.disk, total: d.maxdisk } : null}
													sisaPool={pool?.maxdisk ? pool.maxdisk - pool.disk : null}
													sibuk={sibuk}
													onTambah={tambahDisk}
												/>
											);
										})}
										{!d.disks.length && <p className="text-sm text-slate-500">Tidak ada disk terbaca (butuh izin VM.Audit).</p>}
									</div>
								</Card>

								<Card title="Jatah RAM & CPU" subtitle={d.type === "lxc" ? "Berlaku langsung tanpa restart" : "Sebagian perubahan butuh reboot VM"} icon={FiSettings}>
									<KelolaSumberDaya
										key={`${d.config.memory_mb}-${d.config.cores}-${d.config.swap_mb}`}
										d={d}
										host={nodes.find((n) => n.node === d.node)}
										sibuk={sibuk}
										onSimpan={simpanSumberDaya}
									/>
								</Card>
							</div>

							<Card title="Grafik Kinerja" icon={FiClock} actions={<PilihRentang value={rentang} onChange={setRentang} opsi={RENTANG} />}>
								{rrd === null ? (
									<Memuat teks="Memuat grafik…" />
								) : !rrd.length ? (
									<p className="py-6 text-center text-sm text-slate-500">Data grafik tidak tersedia.</p>
								) : (
									<div className="grid gap-5 md:grid-cols-2">
										<div>
											<p className="mb-1 text-[13px] font-bold text-slate-700">CPU (%)</p>
											<GrafikArea data={rrd} series={[{ key: "cpu", name: "CPU", color: SERI.biru }]} satuan="%" tickFormat={tick} labelFormat={lbl} height={160} />
										</div>
										<div>
											<p className="mb-1 text-[13px] font-bold text-slate-700">RAM (%)</p>
											<GrafikArea data={rrd} series={[{ key: "memory", name: "RAM", color: SERI.ungu }]} satuan="%" domain={[0, 100]} tickFormat={tick} labelFormat={lbl} height={160} />
										</div>
										<div>
											<div className="mb-1 flex items-center justify-between">
												<p className="text-[13px] font-bold text-slate-700">Jaringan</p>
												<Legenda items={[{ label: "Masuk", color: SERI.biru }, { label: "Keluar", color: SERI.oranye }]} />
											</div>
											<GrafikArea
												data={rrd}
												series={[
													{ key: "rx", name: "Masuk", color: SERI.biru },
													{ key: "tx", name: "Keluar", color: SERI.oranye },
												]}
												format={formatRate}
												tickFormat={tick}
												labelFormat={lbl}
												height={160}
											/>
										</div>
										<div>
											<div className="mb-1 flex items-center justify-between">
												<p className="text-[13px] font-bold text-slate-700">Disk I/O</p>
												<Legenda items={[{ label: "Baca", color: SERI.aqua }, { label: "Tulis", color: SERI.magenta }]} />
											</div>
											<GrafikArea
												data={rrd}
												series={[
													{ key: "read", name: "Baca", color: SERI.aqua },
													{ key: "write", name: "Tulis", color: SERI.magenta },
												]}
												format={formatRate}
												tickFormat={tick}
												labelFormat={lbl}
												height={160}
											/>
										</div>
									</div>
								)}
							</Card>

							<div className="grid gap-4 md:grid-cols-2">
								<Card title="Snapshot" icon={FiLayers}>
									{!d.snapshots.length ? (
										<p className="text-sm text-slate-500">Belum ada snapshot.</p>
									) : (
										<ul className="space-y-1.5 text-sm">
											{d.snapshots.map((s) => (
												<li key={s.name} className="flex justify-between gap-2">
													<span className="font-semibold">{s.name}</span>
													<span className="text-xs text-slate-500">{s.time ? formatWaktu(s.time) : ""}</span>
												</li>
											))}
										</ul>
									)}
								</Card>
								<Card title="Aktivitas Terakhir" icon={FiList}>
									{!d.tasks.length ? (
										<p className="text-sm text-slate-500">Tidak ada.</p>
									) : (
										<ul className="max-h-56 space-y-1.5 overflow-auto text-xs">
											{d.tasks.map((t) => (
												<li key={t.upid} className="flex justify-between gap-2">
													<span>
														<b>{t.type}</b> <span className="text-slate-500">{t.user}</span>
													</span>
													<span className={t.status && t.status !== "OK" ? "font-semibold text-red-600" : "text-slate-500"}>
														{t.status || "berjalan"} · {formatWaktu(t.start)}
													</span>
												</li>
											))}
										</ul>
									)}
								</Card>
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
};

const ProxmoxTab = () => {
	const [status, setStatus] = useState(null);
	const [data, setData] = useState(null);
	const [galat, setGalat] = useState(null);
	const [buka, setBuka] = useState(null);
	const [filter, setFilter] = useState("semua");
	const [rrdNode, setRrdNode] = useState(null);

	const cekStatus = useCallback(async () => {
		try {
			const r = await api.get("/superadmin/server/proxmox/status");
			setStatus(r.data?.data);
		} catch (e) {
			setStatus({ configured: false, error: pesanError(e) });
		}
	}, []);

	const muat = useCallback(async () => {
		try {
			const r = await api.get("/superadmin/server/proxmox/overview");
			setData(r.data?.data);
			setGalat(null);
		} catch (e) {
			setGalat(pesanError(e));
		}
	}, []);

	useEffect(() => {
		cekStatus();
	}, [cekStatus]);

	usePolling(() => status?.connected && muat(), 15000, [status?.connected]);

	useEffect(() => {
		if (!status?.connected) return;
		api
			.get("/superadmin/server/proxmox/rrd/node", { params: { timeframe: "day" } })
			.then((r) => setRrdNode(r.data?.data || []))
			.catch(() => setRrdNode([]));
	}, [status?.connected]);

	if (!status) return <Memuat teks="Memeriksa koneksi Proxmox…" />;
	if (!status.connected) return <PanduanSetup status={status} onRetry={cekStatus} />;
	if (galat && !data) return <Galat pesan={galat} onRetry={muat} />;
	if (!data) return <Memuat teks="Memuat semua aplikasi…" />;

	const guests = data.guests.filter((g) => !g.template && (filter === "semua" || (filter === "jalan" ? g.status === "running" : g.status !== "running")));
	const jalan = data.guests.filter((g) => g.status === "running" && !g.template).length;
	const totalGuest = data.guests.filter((g) => !g.template).length;
	const alokasiRam = data.guests.reduce((t, g) => t + (g.maxmem || 0), 0);
	const alokasiDisk = data.guests.reduce((t, g) => t + (g.maxdisk || 0), 0);
	const n = data.nodes[0];

	return (
		<div className="space-y-4">
			{data.nodes.map((node) => (
				<Card
					key={node.node}
					title={`Host Fisik: ${node.node}`}
					subtitle={`${node.pve_version || "Proxmox VE"} · ${node.cpu_model || ""} · aktif ${formatDurasi(node.uptime)}`}
					icon={FiServer}
					actions={
						<>
							<StatusBadge tingkat={node.status === "online" ? "baik" : "kritis"} label={node.status} />
							<Tombol icon={FiRefreshCw} onClick={muat}>
								Muat ulang
							</Tombol>
						</>
					}
				>
					<div className="grid gap-4 md:grid-cols-3">
						{[
							["CPU", node.cpu, `${node.maxcpu} thread · load ${node.loadavg ? node.loadavg.join(" / ") : "-"}`],
							["RAM", persen(node.mem, node.maxmem), `${formatBytes(node.mem)} / ${formatBytes(node.maxmem)}`],
							["Disk sistem", persen(node.disk, node.maxdisk), `${formatBytes(node.disk)} / ${formatBytes(node.maxdisk)}`],
						].map(([k, v, h]) => (
							<div key={k}>
								<div className="mb-1 flex justify-between text-sm">
									<span className="font-semibold text-slate-700">{k}</span>
									<b>{v}%</b>
								</div>
								<Bar percent={v} className="h-2.5" />
								<p className="mt-1 text-xs text-slate-500">{h}</p>
							</div>
						))}
					</div>
				</Card>
			))}

			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<Stat icon={FiBox} tone={jalan < totalGuest ? "red" : "green"} label="Aplikasi berjalan" value={`${jalan} / ${totalGuest}`} hint="Container & VM" />
				<Stat icon={FiLayers} tone="violet" label="RAM dialokasikan" value={formatBytes(alokasiRam)} hint={n ? `${persen(alokasiRam, n.maxmem)}% dari RAM fisik` : ""} />
				<Stat icon={FiHardDrive} tone="blue" label="Disk dialokasikan" value={formatBytes(alokasiDisk)} hint="Total jatah disk semua aplikasi" />
				<Stat icon={FiDatabase} label="Pool storage" value={data.storages.length} hint={data.storages.map((s) => s.storage).join(", ")} />
			</div>

			<Card title="Pool Storage" subtitle="Ruang fisik tempat disk semua aplikasi disimpan" icon={FiDatabase}>
				<div className="space-y-3">
					{data.storages.map((s) => {
						const p = persen(s.disk, s.maxdisk);
						return (
							<div key={`${s.node}-${s.storage}`}>
								<div className="mb-1 flex flex-wrap justify-between gap-2 text-sm">
									<span className="font-semibold text-slate-700">
										{s.storage} <span className="text-xs font-normal text-slate-500">({s.plugintype} · {s.content})</span>
									</span>
									<span className="text-slate-600">
										{formatBytes(s.disk)} / {formatBytes(s.maxdisk)} · <b>{p}%</b> · sisa {formatBytes(s.maxdisk - s.disk)}
									</span>
								</div>
								<Bar percent={p} tingkat={tingkatDari(p, 85)} className="h-2.5" />
							</div>
						);
					})}
				</div>
			</Card>

			<Card
				title="Semua Aplikasi"
				subtitle="Klik kartu untuk detail, grafik, dan pengaturan storage/RAM/CPU"
				icon={FiBox}
				actions={
					<PilihRentang
						value={filter}
						onChange={setFilter}
						opsi={[
							{ value: "semua", label: "Semua" },
							{ value: "jalan", label: "Berjalan" },
							{ value: "mati", label: "Mati" },
						]}
					/>
				}
			>
				{!guests.length ? (
					<Kosong icon={FiBox} title="Tidak ada aplikasi" />
				) : (
					<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
						{guests.map((g) => (
							<KartuGuest key={g.vmid} g={g} onOpen={setBuka} />
						))}
					</div>
				)}
			</Card>

			<Card title="Riwayat Host 24 Jam" icon={FiClock}>
				{rrdNode === null ? (
					<Memuat />
				) : !rrdNode.length ? (
					<p className="py-6 text-center text-sm text-slate-500">Tidak tersedia.</p>
				) : (
					<div className="grid gap-5 md:grid-cols-2">
						<div>
							<p className="mb-1 text-[13px] font-bold text-slate-700">CPU host (%)</p>
							<GrafikArea data={rrdNode} series={[{ key: "cpu", name: "CPU", color: SERI.biru }]} satuan="%" labelFormat={(t) => formatWaktu(t)} />
						</div>
						<div>
							<p className="mb-1 text-[13px] font-bold text-slate-700">RAM host (%)</p>
							<GrafikArea data={rrdNode} series={[{ key: "memory", name: "RAM", color: SERI.ungu }]} satuan="%" domain={[0, 100]} labelFormat={(t) => formatWaktu(t)} />
						</div>
					</div>
				)}
			</Card>

			{buka && <DetailGuest vmid={buka} nodes={data.nodes} storages={data.storages} onClose={() => setBuka(null)} onChanged={muat} />}
		</div>
	);
};

export default ProxmoxTab;
