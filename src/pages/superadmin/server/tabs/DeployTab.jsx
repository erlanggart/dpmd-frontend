// Tab Deploy — versi yang berjalan per repo, riwayat commit, deploy ulang, dan
// rollback ke commit tertentu. Eksekusi dilakukan penerima webhook di server.

import React, { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { FiGitBranch, FiRefreshCw, FiRotateCcw, FiTerminal, FiUploadCloud } from "react-icons/fi";
import api from "../../../../api";
import { Card, Galat, Kosong, Memuat, StatusBadge, Tombol, pesanError, sejak, usePolling } from "../serverUi";

const toast = (title) => Swal.fire({ toast: true, position: "bottom-end", icon: "success", title, timer: 1800, showConfirmButton: false });

const KartuRepo = ({ repo, handler, sibuk, onAksi }) => {
	if (!repo.available) {
		return (
			<Card title={repo.label} subtitle={<span className="font-mono">{repo.dir}</span>} icon={FiGitBranch}>
				<Kosong title="Repo tidak tersedia" text={repo.error} />
			</Card>
		);
	}
	const { head, pinned, behind } = repo;
	const proses = repo.key === "dpmd-fahri-express" ? (handler.processes || []).find((p) => p.name === "dpmd-backend") : null;

	const deployUlang = async () => {
		const ok = await Swal.fire({
			icon: "question",
			title: `Deploy ulang ${repo.label}?`,
			text: "Mengambil versi terbaru main lalu membangun dan me-restart. Backend tidak bisa diakses ±beberapa detik.",
			showCancelButton: true,
			confirmButtonText: "Deploy ulang",
			cancelButtonText: "Batal",
		});
		if (ok.isConfirmed) onAksi(`/deploy/${repo.key}/redeploy`, undefined, "Deploy dimasukkan antrean");
	};

	const rollback = async (c) => {
		const ok = await Swal.fire({
			icon: "warning",
			title: `Rollback ${repo.label} ke ${c.short}?`,
			html: `Kode akan kembali ke commit ini. <b>Migrasi database tidak dibatalkan</b> — kolom/tabel baru tetap ada. Versi ini bertahan sampai ada push baru ke main atau Anda menekan Deploy ulang.<br/><br/>Ketik <b>${c.short}</b> untuk konfirmasi`,
			input: "text",
			inputValidator: (v) => (v === c.short ? undefined : `Ketik ${c.short} persis`),
			showCancelButton: true,
			confirmButtonText: "Rollback",
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
		});
		if (ok.isConfirmed) onAksi(`/deploy/${repo.key}/rollback`, { sha: c.sha }, "Rollback dimasukkan antrean");
	};

	return (
		<Card
			title={repo.label}
			subtitle={<span className="font-mono">{repo.dir}</span>}
			icon={FiGitBranch}
			actions={
				<Tombol variant="dark" icon={FiUploadCloud} disabled={sibuk} onClick={deployUlang}>
					Deploy ulang
				</Tombol>
			}
		>
			<div className="space-y-3">
				<div>
					<p className="text-[11px] font-semibold text-slate-500">Versi berjalan</p>
					{head ? (
						<>
							<p className="text-sm text-slate-800">
								<span className="font-mono font-bold">{head.short}</span> · {head.subject}
							</p>
							<p className="text-xs text-slate-500">
								{head.author} · {sejak(head.date)}
							</p>
						</>
					) : (
						<p className="text-sm text-slate-500">-</p>
					)}
				</div>

				<div>
					{pinned ? (
						<>
							<StatusBadge tingkat="waspada" label={`Di-rollback ke ${pinned.sha.slice(0, 7)}`} />
							<p className="mt-1 text-xs text-slate-500">
								oleh {pinned.by}, {sejak(pinned.at)}. Kembali normal saat ada push baru ke main atau tombol Deploy ulang.
							</p>
						</>
					) : behind > 0 ? (
						<StatusBadge tingkat="waspada" label={`Tertinggal ${behind} commit dari main`} />
					) : (
						<StatusBadge tingkat="baik" label="Mutakhir" />
					)}
				</div>

				<p className="text-xs text-slate-600">
					{repo.key === "dpmd-fahri-express"
						? proses
							? `Proses: ${proses.status} · aktif sejak ${sejak(proses.uptime)} · ${proses.restarts} restart`
							: "Proses: tidak ditemukan"
						: "Berkas statis, dibangun ulang tiap deploy"}
				</p>

				<ul className="max-h-96 divide-y divide-slate-100 overflow-auto rounded-lg border border-slate-100">
					{(repo.commits || []).map((c) => (
						<li key={c.sha} className="flex items-center gap-3 px-3 py-2">
							<span className="font-mono text-xs font-bold text-slate-700">{c.short}</span>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm text-slate-800" title={c.subject}>
									{c.subject}
								</p>
								<p className="text-[11px] text-slate-500">
									{c.author} · {sejak(c.date)}
								</p>
							</div>
							{c.is_head ? (
								<span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-700">Berjalan</span>
							) : (
								<Tombol variant="dangerLight" icon={FiRotateCcw} disabled={sibuk} onClick={() => rollback(c)} className="shrink-0">
									Rollback
								</Tombol>
							)}
						</li>
					))}
				</ul>
			</div>
		</Card>
	);
};

const DeployTab = () => {
	const [data, setData] = useState(null);
	const [galat, setGalat] = useState(null);
	const [memeriksa, setMemeriksa] = useState(false);
	const logRef = useRef(null);

	const sedangDeploy = (data?.handler?.deploying || []).length > 0;

	const muat = () =>
		api
			.get("/superadmin/server/deploy")
			.then((r) => {
				setData(r.data?.data || null);
				setGalat(null);
			})
			.catch((e) => setGalat(pesanError(e)));

	usePolling(muat, sedangDeploy ? 3000 : 15000, [sedangDeploy]);

	useEffect(() => {
		if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
	}, [data?.log]);

	const periksa = async () => {
		setMemeriksa(true);
		try {
			const r = await api.post("/superadmin/server/deploy/fetch");
			setData(r.data?.data || null);
		} catch (e) {
			Swal.fire({ icon: "error", title: "Gagal memeriksa pembaruan", text: pesanError(e) });
		} finally {
			setMemeriksa(false);
		}
	};

	const aksi = async (jalur, body, pesan) => {
		try {
			await api.post(`/superadmin/server${jalur}`, body);
			toast(pesan);
			muat();
		} catch (e) {
			Swal.fire({ icon: "error", title: "Gagal", text: pesanError(e) });
		}
	};

	if (galat && !data) return <Galat pesan={galat} onRetry={muat} />;
	if (!data) return <Memuat />;

	const { handler, repos = [], log = [] } = data;
	const deploying = handler.deploying || [];
	const namaDeploy = repos.filter((r) => deploying.includes(r.key)).map((r) => r.label).join(", ");

	return (
		<div className="space-y-4">
			<Card
				title="Status Deploy"
				icon={FiGitBranch}
				actions={
					<Tombol icon={FiRefreshCw} disabled={memeriksa} onClick={periksa}>
						{memeriksa ? "Memeriksa…" : "Periksa pembaruan"}
					</Tombol>
				}
			>
				<div className="flex flex-wrap items-center gap-3">
					{handler.reachable ? (
						<StatusBadge tingkat="baik" label="Penerima deploy aktif" />
					) : (
						<>
							<StatusBadge tingkat="kritis" label="Penerima deploy tidak terjangkau" />
							{handler.error && <span className="text-xs text-red-700">{handler.error}</span>}
						</>
					)}
					{deploying.length > 0 && (
						<span className="inline-flex items-center gap-2">
							<span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-amber-500" />
							<StatusBadge tingkat="waspada" label={`Sedang deploy: ${namaDeploy || deploying.join(", ")}`} />
						</span>
					)}
				</div>
			</Card>

			<div className="grid gap-4 lg:grid-cols-2">
				{repos.map((r) => (
					<KartuRepo key={r.key} repo={r} handler={handler} sibuk={deploying.includes(r.key)} onAksi={aksi} />
				))}
			</div>

			<Card title="Log Deploy" icon={FiTerminal}>
				<pre ref={logRef} className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-3 text-[12px] leading-relaxed">
					{log.join("\n")}
				</pre>
			</Card>
		</div>
	);
};

export default DeployTab;
