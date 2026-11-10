// Tab Jurnal Tindakan — semua tindakan mitigasi (blokir otomatis oleh sistem dan
// aksi manual superadmin) dalam linimasa per hari, plus ringkasan perlindungan
// yang sedang aktif.

import React, { useEffect, useMemo, useState } from "react";
import {
	FiActivity,
	FiArchive,
	FiBox,
	FiCpu,
	FiGitBranch,
	FiLock,
	FiServer,
	FiSettings,
	FiShield,
	FiSlash,
	FiTrash2,
	FiUnlock,
	FiUser,
	FiBookOpen,
} from "react-icons/fi";
import api from "../../../../api";
import { Card, Galat, Kosong, Memuat, PilihRentang, Stat, StatusBadge, Tombol, jamSaja, pesanError, usePolling } from "../serverUi";

const RENTANG = [
	{ value: 24, label: "24 jam" },
	{ value: 168, label: "7 hari" },
	{ value: 720, label: "30 hari" },
];

const JENIS = [
	{ value: "semua", label: "Semua" },
	{ value: "manual", label: "Manual" },
	{ value: "otomatis", label: "Otomatis" },
];

const KATEGORI = [
	{ value: "semua", label: "Semua kategori" },
	{ value: "blokir", label: "Blokir IP" },
	{ value: "buka_blokir", label: "Buka blokir" },
	{ value: "deploy", label: "Deploy" },
	{ value: "backup", label: "Backup" },
	{ value: "proxmox", label: "Proxmox" },
	{ value: "aplikasi", label: "Aplikasi" },
	{ value: "konfigurasi", label: "Konfigurasi" },
	{ value: "pembersihan", label: "Pembersihan" },
	{ value: "lainnya", label: "Lainnya" },
];

const IKON = {
	blokir: { icon: FiSlash, kelas: "bg-red-50 text-red-600" },
	buka_blokir: { icon: FiUnlock, kelas: "bg-emerald-50 text-emerald-600" },
	deploy: { icon: FiGitBranch, kelas: "bg-blue-50 text-blue-600" },
	backup: { icon: FiArchive, kelas: "bg-violet-50 text-violet-600" },
	proxmox: { icon: FiServer, kelas: "bg-blue-50 text-blue-600" },
	aplikasi: { icon: FiBox, kelas: "bg-slate-100 text-slate-600" },
	konfigurasi: { icon: FiSettings, kelas: "bg-slate-100 text-slate-600" },
	pembersihan: { icon: FiTrash2, kelas: "bg-slate-100 text-slate-600" },
	lainnya: { icon: FiActivity, kelas: "bg-slate-100 text-slate-600" },
};

const hariDari = (t) =>
	new Date(t).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const BarisProteksi = ({ aktif, children }) => (
	<li className="flex items-start justify-between gap-3 py-2 text-sm text-slate-700">
		<span className="min-w-0">{children}</span>
		<StatusBadge tingkat={aktif ? "baik" : "waspada"} label={aktif ? "Aktif" : "Mati"} className="shrink-0" />
	</li>
);

const JournalTab = ({ onNavigate }) => {
	const [jam, setJam] = useState(168);
	const [data, setData] = useState(null);
	const [galat, setGalat] = useState(null);
	const [sec, setSec] = useState(null);
	const [jenis, setJenis] = useState("semua");
	const [kategori, setKategori] = useState("semua");

	const muat = () =>
		api
			.get("/superadmin/server/journal", { params: { hours: jam } })
			.then((r) => {
				setData(r.data?.data || null);
				setGalat(null);
			})
			.catch((e) => setGalat(pesanError(e)));

	usePolling(muat, 30000, [jam]);

	useEffect(() => {
		api
			.get("/superadmin/server/config")
			.then((r) => setSec(r.data?.data?.config?.security || null))
			.catch(() => {});
	}, []);

	const items = useMemo(
		() => (data?.items || []).filter((i) => (jenis === "semua" || i.jenis === jenis) && (kategori === "semua" || i.kategori === kategori)),
		[data, jenis, kategori],
	);
	const perHari = useMemo(() => {
		const peta = new Map();
		items.forEach((i) => {
			const h = hariDari(i.at);
			if (!peta.has(h)) peta.set(h, []);
			peta.get(h).push(i);
		});
		return [...peta.entries()];
	}, [items]);

	if (galat && !data) return <Galat pesan={galat} onRetry={muat} />;
	if (!data) return <Memuat />;
	const r = data.ringkasan || {};

	return (
		<div className="space-y-4">
			{sec && (
				<Card title="Perlindungan aktif" subtitle="Mitigasi yang sedang berjalan saat ini" icon={FiShield}>
					<ul className="divide-y divide-slate-100">
						<BarisProteksi aktif={sec.detection}>Deteksi serangan: SQL injection, XSS, path traversal, pemindai</BarisProteksi>
						<BarisProteksi aktif={sec.waf_mode}>WAF: tolak langsung request anonim berpola serangan serius</BarisProteksi>
						<BarisProteksi aktif={sec.auto_block}>
							Blokir otomatis: skor ≥ {sec.auto_block_score} dalam {sec.auto_block_window_minutes} menit → blokir {sec.auto_block_duration_minutes} menit
						</BarisProteksi>
						<BarisProteksi aktif={sec.honeypot}>Honeypot: penyentuh jalur jebakan langsung diblokir {sec.honeypot_block_minutes} menit</BarisProteksi>
						<BarisProteksi aktif={(sec.blocked_countries || []).length > 0}>
							Blokir negara: {(sec.blocked_countries || []).length ? sec.blocked_countries.join(", ") : "tidak ada"}
						</BarisProteksi>
						<BarisProteksi aktif={sec.scan_system_logs}>Pemindaian log nginx & SSH</BarisProteksi>
					</ul>
					<p className="mt-2 text-xs text-slate-500">Pemblokiran berlaku di tingkat aplikasi (API). Aset statis dan SSH dilindungi terpisah (fail2ban di host).</p>
					<Tombol variant="ghost" className="mt-2" onClick={() => onNavigate("pengaturan")}>
						Ubah di Pengaturan
					</Tombol>
				</Card>
			)}

			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<Stat label="Tindakan manual" value={r.manual ?? 0} tone="violet" icon={FiUser} />
				<Stat label="Tindakan otomatis" value={r.otomatis ?? 0} tone="blue" icon={FiCpu} />
				<Stat label="Permintaan ditolak" value={r.permintaan_ditolak ?? 0} tone="red" icon={FiSlash} />
				<Stat label="IP diblokir aktif" value={r.ip_diblokir_aktif ?? 0} tone="amber" icon={FiLock} />
			</div>

			<Card title="Jurnal Tindakan" subtitle="Terbaru di atas" icon={FiBookOpen} actions={<PilihRentang value={jam} onChange={setJam} opsi={RENTANG} />}>
				<div className="mb-4 flex flex-wrap items-center gap-2">
					<PilihRentang value={jenis} onChange={setJenis} opsi={JENIS} />
					<select
						value={kategori}
						onChange={(e) => setKategori(e.target.value)}
						className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
						aria-label="Kategori"
					>
						{KATEGORI.map((k) => (
							<option key={k.value} value={k.value}>
								{k.label}
							</option>
						))}
					</select>
				</div>
				{!items.length ? (
					<Kosong title="Belum ada tindakan" text="Tidak ada tindakan mitigasi pada rentang ini." />
				) : (
					<div className="space-y-5">
						{perHari.map(([hari, daftar]) => (
							<div key={hari}>
								<p className="mb-1 text-[11.5px] font-bold uppercase tracking-wide text-slate-500">{hari}</p>
								<ul className="divide-y divide-slate-100">
									{daftar.map((i) => {
										const k = IKON[i.kategori] || IKON.lainnya;
										const Ikon = k.icon;
										return (
											<li key={i.id} className="flex items-start gap-3 py-2.5">
												<span className="w-11 shrink-0 pt-1 font-mono text-xs text-slate-500">{jamSaja(i.at)}</span>
												<span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${k.kelas}`}>
													<Ikon className="h-3.5 w-3.5" />
												</span>
												<div className="min-w-0 flex-1">
													<p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
														<span className="font-semibold text-slate-800">{i.judul}</span>
														<span
															className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${i.jenis === "otomatis" ? "bg-blue-50 text-blue-700" : "bg-violet-50 text-violet-700"}`}
														>
															{i.jenis === "otomatis" ? "Otomatis" : "Manual"}
														</span>
													</p>
													{i.rincian && <p className="mt-0.5 break-words text-xs text-slate-500">{i.rincian}</p>}
													{(i.oleh || i.ip) && (
														<p className="mt-0.5 text-xs text-slate-500">
															{i.oleh && <>oleh {i.oleh}</>}
															{i.oleh && i.ip && " · "}
															{i.ip && <span className="font-mono">{i.ip}</span>}
														</p>
													)}
												</div>
											</li>
										);
									})}
								</ul>
							</div>
						))}
					</div>
				)}
			</Card>
		</div>
	);
};

export default JournalTab;
