// Tab Audit — memindai konfigurasi keamanan server yang sebenarnya (SSH,
// firewall, port terbuka, update tertunda, rahasia JWT, header web, TLS,
// database) dan memberi skor, nilai A–F, serta perintah perbaikan siap salin.
// Pemindaian hanya membaca; tidak ada yang diubah otomatis.

import React, { useCallback, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { FiCheckCircle, FiCopy, FiRefreshCw, FiShield } from "react-icons/fi";
import api from "../../../../api";
import { Card, Galat, Kosong, Memuat, PilihRentang, formatWaktu, pesanError, usePolling } from "../serverUi";

const STATUS = {
	fail: { tag: "FAIL", kelas: "bg-red-100 text-red-700 ring-red-200", garis: "border-l-red-500" },
	warn: { tag: "WARN", kelas: "bg-amber-100 text-amber-700 ring-amber-200", garis: "border-l-amber-500" },
	info: { tag: "INFO", kelas: "bg-blue-100 text-blue-700 ring-blue-200", garis: "border-l-blue-500" },
	pass: { tag: " OK ", kelas: "bg-emerald-100 text-emerald-700 ring-emerald-200", garis: "border-l-emerald-500" },
	skip: { tag: "SKIP", kelas: "bg-slate-100 text-slate-500 ring-slate-200", garis: "border-l-slate-300" },
};

const NILAI = {
	A: { warna: "#00ff41", teks: "Sangat baik" },
	B: { warna: "#7dff9f", teks: "Baik" },
	C: { warna: "#ffbf1f", teks: "Perlu perhatian" },
	D: { warna: "#ff8c33", teks: "Lemah" },
	F: { warna: "#ff3b4e", teks: "Berbahaya" },
};

const FILTER = [
	{ value: "masalah", label: "Masalah" },
	{ value: "semua", label: "Semua" },
	{ value: "pass", label: "Lulus" },
];

const salin = async (teks) => {
	try {
		await navigator.clipboard.writeText(teks);
		Swal.fire({ toast: true, position: "bottom-end", icon: "success", title: "Perintah disalin", timer: 1400, showConfirmButton: false });
	} catch {
		Swal.fire({ icon: "info", title: "Salin manual", html: `<pre style="text-align:left;white-space:pre-wrap">${teks}</pre>` });
	}
};

/** Cincin skor 0–100. */
const CincinSkor = ({ skor, nilai }) => {
	const r = 54;
	const k = 2 * Math.PI * r;
	const w = NILAI[nilai]?.warna || "#00ff41";
	return (
		<svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0" role="img" aria-label={`Skor ${skor}, nilai ${nilai}`}>
			<circle cx="70" cy="70" r={r} fill="none" stroke="#0b1b11" strokeWidth="10" />
			<circle
				cx="70"
				cy="70"
				r={r}
				fill="none"
				stroke={w}
				strokeWidth="10"
				strokeLinecap="butt"
				strokeDasharray={`${(skor / 100) * k} ${k}`}
				transform="rotate(-90 70 70)"
				style={{ filter: `drop-shadow(0 0 6px ${w})`, transition: "stroke-dasharray .8s ease" }}
			/>
			<text x="70" y="68" textAnchor="middle" fill={w} style={{ fontSize: 40, fontWeight: 800 }}>
				{nilai}
			</text>
			<text x="70" y="92" textAnchor="middle" fill="#7fc497" style={{ fontSize: 13 }}>
				{skor}/100
			</text>
		</svg>
	);
};

const AuditTab = () => {
	const [data, setData] = useState(null);
	const [galat, setGalat] = useState(null);
	const [memindai, setMemindai] = useState(false);
	const [filter, setFilter] = useState("masalah");

	const muat = useCallback(async (segar = false) => {
		if (segar) setMemindai(true);
		try {
			const res = await api.get("/superadmin/server/audit", { params: segar ? { refresh: "1" } : {} });
			setData(res.data?.data || null);
			setGalat(null);
		} catch (e) {
			setGalat(pesanError(e));
		} finally {
			setMemindai(false);
		}
	}, []);

	usePolling(() => muat(false), 0);

	const kelompok = useMemo(() => {
		if (!data) return [];
		const tampil = data.checks.filter((c) => (filter === "semua" ? true : filter === "pass" ? c.status === "pass" : ["fail", "warn", "info"].includes(c.status)));
		const peta = new Map();
		for (const c of tampil) {
			if (!peta.has(c.kategori)) peta.set(c.kategori, []);
			peta.get(c.kategori).push(c);
		}
		return [...peta.entries()];
	}, [data, filter]);

	if (galat && !data) return <Galat pesan={galat} onRetry={() => muat(true)} />;
	if (!data) return <Memuat teks="Memindai konfigurasi keamanan…" />;

	const n = NILAI[data.grade] || NILAI.A;

	return (
		<div className="space-y-4">
			<Card
				title="audit --full"
				subtitle={`Dipindai ${formatWaktu(data.scanned_at, { second: "2-digit" })} · ${data.checks.length} pemeriksaan · ${data.duration_ms} ms`}
				icon={FiShield}
				actions={
					<button
						onClick={() => muat(true)}
						disabled={memindai}
						className="inline-flex items-center gap-1.5 rounded bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
					>
						<FiRefreshCw className={`h-3.5 w-3.5 ${memindai ? "animate-spin" : ""}`} />
						{memindai ? "memindai…" : "pindai ulang"}
					</button>
				}
			>
				<div className="flex flex-wrap items-center gap-6">
					<CincinSkor skor={data.score} nilai={data.grade} />
					<div className="min-w-0 flex-1 space-y-3">
						<div>
							<p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">postur keamanan</p>
							<p className="text-2xl font-extrabold" style={{ color: n.warna, textShadow: `0 0 12px ${n.warna}66` }}>
								{n.teks}
							</p>
							<p className="mt-1 max-w-2xl text-[12.5px] text-slate-600">
								Setiap temuan <b className="text-red-600">FAIL</b> mengurangi 15 poin, <b className="text-amber-600">WARN</b> 5 poin. Perbaiki dari atas; perintah perbaikan
								siap disalin dan dijalankan di server.
							</p>
						</div>
						<div className="flex flex-wrap gap-2 text-[12px]">
							{["fail", "warn", "info", "pass", "skip"].map((s) => (
								<span key={s} className={`inline-flex items-center gap-1.5 rounded px-2 py-1 font-bold ring-1 ${STATUS[s].kelas}`}>
									[{STATUS[s].tag}] {data.counts[s]}
								</span>
							))}
						</div>
						{data.platform !== "linux" && (
							<p className="text-[11.5px] text-amber-600">Server ini bukan Linux — pemeriksaan SSH, firewall, update, dan izin berkas dilewati.</p>
						)}
					</div>
				</div>
			</Card>

			<div className="flex items-center justify-between gap-2">
				<PilihRentang value={filter} onChange={setFilter} opsi={FILTER} />
				<span className="text-[11.5px] text-slate-500">Hasil disimpan 60 detik; "pindai ulang" memaksa pemeriksaan baru.</span>
			</div>

			{!kelompok.length ? (
				<Kosong icon={FiCheckCircle} title="Tidak ada masalah" text="Semua pemeriksaan pada filter ini lulus." />
			) : (
				kelompok.map(([kategori, daftar]) => (
					<Card key={kategori} title={kategori} subtitle={`${daftar.length} temuan`} bodyClass="divide-y divide-slate-100 p-0">
						{daftar.map((c) => {
							const s = STATUS[c.status];
							return (
								<div key={c.id} className={`border-l-2 px-4 py-3 ${s.garis}`}>
									<div className="flex flex-wrap items-start gap-2.5">
										<span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold ring-1 ${s.kelas}`}>[{s.tag}]</span>
										<div className="min-w-0 flex-1">
											<p className="text-[13.5px] font-bold text-slate-800">{c.judul}</p>
											<p className="mt-0.5 break-words text-[12.5px] text-slate-600">{c.detail}</p>
											{c.saran && <p className="mt-1 text-[12px] text-slate-500">→ {c.saran}</p>}
											{c.perintah && (
												<div className="mt-2 flex items-start gap-2 bg-slate-950 px-3 py-2">
													<pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre text-[11.5px] text-slate-200 [font-family:inherit]">{c.perintah}</pre>
													<button onClick={() => salin(c.perintah)} className="kali-ikon shrink-0" title="Salin perintah">
														<FiCopy className="h-3.5 w-3.5" />
													</button>
												</div>
											)}
										</div>
									</div>
								</div>
							);
						})}
					</Card>
				))
			)}
		</div>
	);
};

export default AuditTab;
