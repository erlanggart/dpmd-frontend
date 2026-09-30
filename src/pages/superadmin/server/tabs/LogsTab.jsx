// Tab Log — baca log aplikasi, deploy, nginx, dan SSH langsung dari server,
// dengan saringan level & kata kunci serta mode ikuti (live tail).

import React, { useCallback, useEffect, useRef, useState } from "react";
import { FiDownload, FiFileText, FiPause, FiPlay, FiRefreshCw, FiSearch } from "react-icons/fi";
import api from "../../../../api";
import { Card, Tombol, formatBytes, formatWaktu, pesanError, usePolling } from "../serverUi";

const WARNA_LEVEL = {
	error: "text-red-300",
	warn: "text-amber-300",
	info: "text-slate-200",
	debug: "text-slate-400",
};

const LogsTab = () => {
	const [sumber, setSumber] = useState([]);
	const [pilih, setPilih] = useState("error");
	const [level, setLevel] = useState("");
	const [q, setQ] = useState("");
	const [cari, setCari] = useState("");
	const [baris, setBaris] = useState(300);
	const [data, setData] = useState(null);
	const [galat, setGalat] = useState(null);
	const [ikuti, setIkuti] = useState(true);
	const kotak = useRef(null);

	useEffect(() => {
		api
			.get("/superadmin/server/logs/sources")
			.then((r) => setSumber(r.data?.data || []))
			.catch(() => {});
	}, []);

	const muat = useCallback(async () => {
		try {
			const r = await api.get("/superadmin/server/logs", { params: { source: pilih, level, q: cari, lines: baris } });
			setData(r.data?.data);
			setGalat(null);
		} catch (e) {
			setGalat(pesanError(e));
		}
	}, [pilih, level, cari, baris]);

	usePolling(() => ikuti && muat(), 5000, [ikuti, muat]);
	useEffect(() => {
		muat();
	}, [muat]);

	useEffect(() => {
		if (ikuti && kotak.current) kotak.current.scrollTop = kotak.current.scrollHeight;
	}, [data, ikuti]);

	const unduh = () => {
		if (!data) return;
		const blob = new Blob([data.lines.map((l) => l.raw).join("\n")], { type: "text/plain" });
		const a = document.createElement("a");
		a.href = URL.createObjectURL(blob);
		a.download = `${pilih}-${new Date().toISOString().slice(0, 19)}.log`;
		a.click();
		URL.revokeObjectURL(a.href);
	};

	return (
		<Card
			title="Log Server"
			subtitle={data ? `${data.path} · ${formatBytes(data.size)}${data.modified ? ` · diubah ${formatWaktu(data.modified, { second: "2-digit" })}` : ""}` : ""}
			icon={FiFileText}
			bodyClass="p-0"
			actions={
				<>
					<Tombol icon={ikuti ? FiPause : FiPlay} variant={ikuti ? "primary" : "light"} onClick={() => setIkuti(!ikuti)}>
						{ikuti ? "Live" : "Dijeda"}
					</Tombol>
					<Tombol icon={FiRefreshCw} onClick={muat}>
						Muat ulang
					</Tombol>
					<Tombol icon={FiDownload} onClick={unduh} disabled={!data?.lines?.length}>
						Unduh
					</Tombol>
				</>
			}
		>
			<div className="flex flex-wrap gap-2 border-b border-slate-100 px-4 py-3">
				<div className="flex flex-wrap gap-1">
					{sumber.map((s) => (
						<button
							key={s.key}
							onClick={() => setPilih(s.key)}
							className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${pilih === s.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
						>
							{s.label}
						</button>
					))}
				</div>
				<div className="ml-auto flex flex-wrap gap-2">
					<select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
						<option value="">Semua level</option>
						<option value="error">Error</option>
						<option value="warn">Warning</option>
						<option value="info">Info</option>
					</select>
					<select value={baris} onChange={(e) => setBaris(Number(e.target.value))} className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs">
						{[100, 300, 1000, 2000].map((n) => (
							<option key={n} value={n}>
								{n} baris
							</option>
						))}
					</select>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							setCari(q);
						}}
						className="relative"
					>
						<FiSearch className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
						<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari lalu Enter…" className="w-52 rounded-lg border border-slate-200 py-1.5 pl-8 pr-2 text-xs" />
					</form>
				</div>
			</div>
			<div ref={kotak} className="h-[62vh] overflow-auto bg-slate-950 px-4 py-3 font-mono text-[11.5px] leading-relaxed">
				{galat && <p className="text-red-400">{galat}</p>}
				{data?.error && <p className="text-amber-400">{data.error} — log ini mungkin tidak ada di server ini.</p>}
				{data && !data.error && !data.lines.length && <p className="text-slate-500">Tidak ada baris yang cocok.</p>}
				{data?.lines.map((l, i) => (
					<div key={i} className={`whitespace-pre-wrap break-all border-b border-white/5 py-0.5 ${WARNA_LEVEL[l.level] || "text-slate-300"}`}>
						{l.time && <span className="mr-2 text-slate-500">{l.time}</span>}
						{l.level && <span className="mr-2 font-bold uppercase">[{l.level}]</span>}
						{l.message}
					</div>
				))}
			</div>
		</Card>
	);
};

export default LogsTab;
