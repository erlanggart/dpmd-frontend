import React, { useEffect, useState } from "react";
import { AlertTriangle, Check, CheckCheck, Eye, Info, ShieldAlert, Wifi, WifiOff } from "lucide-react";
import toast from "react-hot-toast";
import {
	ackPeristiwa,
	ackSemuaPeristiwa,
	getPeristiwa,
	resolvePeristiwa,
} from "../../../api/smartCctvApi";
import GambarPeristiwa from "./GambarPeristiwa";
import { useCctvAlerts } from "../../../hooks/useCctvAlerts";

/**
 * Peringatan langsung. Daftar atas dari socket (sesi berjalan), daftar bawah
 * dari riwayat server (status new/acknowledged) supaya peringatan yang terlewat
 * saat tab tertutup tetap muncul saat dibuka kembali.
 */

const SEVERITY = {
	critical: { warna: "border-red-300 bg-red-50 text-red-700", ikon: ShieldAlert },
	warning: { warna: "border-amber-300 bg-amber-50 text-amber-700", ikon: AlertTriangle },
	info: { warna: "border-sky-300 bg-sky-50 text-sky-700", ikon: Info },
};

const TIPE_LABEL = {
	known: "Wajah dikenal",
	unknown: "Wajah tidak dikenal",
	fall: "Jatuh",
	fall_warning: "Peringatan jatuh",
	immobility: "Tidak bergerak",
	other: "Lainnya",
	person: "Orang terdeteksi",
};

const LencanaTipe = ({ type }) => (
	<span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
		{TIPE_LABEL[type] || type}
	</span>
);

const KartuPeristiwa = ({ p, onSelesai, sumber }) => {
	const sev = SEVERITY[p.severity] || SEVERITY.info;
	const Ikon = sev.ikon;
	return (
		<div className={`rounded-xl border ${sev.warna} p-3.5`}>
			<div className="flex items-start gap-3">
				<Ikon className="mt-0.5 h-5 w-5 flex-shrink-0" />
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<p className="text-sm font-semibold">{TIPE_LABEL[p.type] || p.type}</p>
						<LencanaTipe type={p.type} />
						{sumber === "langsung" && (
							<span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600">
								<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
								Langsung
							</span>
						)}
					</div>
					<p className="mt-1 text-xs text-slate-600">
						{kameraLabel(p)} · {new Date(p.occurred_at).toLocaleString("id-ID")}
						{p.nama ? ` · ${p.nama}` : ""}
						{p.similarity ? ` · keyakinan ${(Number(p.similarity) * 100).toFixed(0)}%` : ""}
					</p>
				</div>
				<div className="flex flex-shrink-0 items-center gap-1.5">
					{p.id && (
						<button
							onClick={() => onSelesai("resolve", p)}
							title="Tandai selesai"
							className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/70 hover:text-slate-900"
						>
							<CheckCheck className="h-4 w-4" />
						</button>
					)}
					{p.id && p.status === "active" && (
						<button
							onClick={() => onSelesai("ack", p)}
							title="Akui"
							className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/70 hover:text-slate-900"
						>
							<Check className="h-4 w-4" />
						</button>
					)}
					{p.id && (
						<button
							onClick={() => onSelesai("lihat", p)}
							title="Lihat snapshot"
							className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/70 hover:text-slate-900"
						>
							<Eye className="h-4 w-4" />
						</button>
					)}
				</div>
			</div>
		</div>
	);
};

const kameraLabel = (p) => p.kamera || p.camera?.name || (p.camera_id ? `Kamera ${p.camera_id}` : "—");

const CctvAlertsPage = () => {
	const { peristiwa: langsung, jumlahBelumDibaca, tersambung, tandaiDibaca } = useCctvAlerts();
	const [riwayat, setRiwayat] = useState([]);
	const [memuat, setMemuat] = useState(true);
	const [snapshot, setSnapshot] = useState(null);

	const muatRiwayat = async () => {
		try {
			const r = await getPeristiwa({ status: "active", limit: 50 });
			setRiwayat(r.data.data?.items || []);
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal memuat peringatan.");
		} finally {
			setMemuat(false);
		}
	};

	useEffect(() => {
		muatRiwayat();
	}, []);

	// Saat tab dibuka, lencana dinolkan (peringatan memang sedang dilihat).
	useEffect(() => {
		tandaiDibaca();
	}, [tandaiDibaca]);

	const tangani = async (aksi, p) => {
		if (aksi === "lihat") {
			setSnapshot(p);
			return;
		}
		try {
			if (aksi === "ack") await ackPeristiwa(p.id);
			else await resolvePeristiwa(p.id);
			toast.success(aksi === "ack" ? "Peringatan diakui." : "Peringatan ditandai selesai.");
			muatRiwayat();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal memperbarui peringatan.");
		}
	};

	const akuiSemua = async () => {
		try {
			const r = await ackSemuaPeristiwa();
			toast.success(`${r.data.data?.count || 0} peringatan diakui.`);
			muatRiwayat();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal mengakui semua.");
		}
	};

	const baruDariRiwayat = riwayat.filter(
		(p) => !langsung.some((l) => String(l.event_uuid) === String(p.event_uuid))
	);

	return (
		<div className="grid gap-5 lg:grid-cols-2">
			<div className="rounded-xl border border-slate-200 bg-white p-5">
				<div className="mb-4 flex items-center justify-between">
					<div className="flex items-center gap-2">
						<h2 className="text-base font-semibold text-slate-900">Sesi langsung</h2>
						{tersambung ? (
							<span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
								<Wifi className="h-3.5 w-3.5" /> tersambung
							</span>
						) : (
							<span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
								<WifiOff className="h-3.5 w-3.5" /> terputus
							</span>
						)}
					</div>
					{jumlahBelumDibaca > 0 && (
						<span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
							{jumlahBelumDibaca} baru
						</span>
					)}
				</div>
				{langsung.length === 0 ? (
					<p className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
						Belum ada peringatan selama sesi ini. Peringatan deteksi akan muncul di sini seketika.
					</p>
				) : (
					<div className="max-h-[70vh] space-y-2.5 overflow-y-auto pr-1">
						{langsung.map((p, i) => (
							<KartuPeristiwa key={p.event_uuid || i} p={p} onSelesai={tangani} sumber="langsung" />
						))}
					</div>
				)}
			</div>

			<div className="rounded-xl border border-slate-200 bg-white p-5">
				<div className="mb-4 flex items-center justify-between">
					<h2 className="text-base font-semibold text-slate-900">Belum ditangani</h2>
					<button
						onClick={akuiSemua}
						className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
					>
						<CheckCheck className="h-3.5 w-3.5" />
						Akui semua
					</button>
				</div>
				{memuat ? (
					<div className="space-y-2.5">
						{[1, 2, 3].map((n) => (
							<div key={n} className="h-16 animate-pulse rounded-xl bg-slate-100" />
						))}
					</div>
				) : baruDariRiwayat.length === 0 ? (
					<p className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-400">
						Semua peringatan sudah ditangani.
					</p>
				) : (
					<div className="max-h-[70vh] space-y-2.5 overflow-y-auto pr-1">
						{baruDariRiwayat.map((p) => (
							<KartuPeristiwa key={p.id} p={p} onSelesai={tangani} sumber="riwayat" />
						))}
					</div>
				)}
			</div>

			{snapshot && (
				<div
					className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
					onClick={() => setSnapshot(null)}
				>
					<div className="w-full max-w-2xl rounded-xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
						<div className="mb-3 flex items-center justify-between">
							<div>
								<p className="text-sm font-semibold text-slate-900">
									{TIPE_LABEL[snapshot.type] || snapshot.type} · {kameraLabel(snapshot)}
								</p>
								<p className="text-xs text-slate-500">{new Date(snapshot.occurred_at).toLocaleString("id-ID")}</p>
							</div>
							<button onClick={() => setSnapshot(null)} className="text-slate-400 hover:text-slate-900">
								✕
							</button>
						</div>
						<GambarPeristiwa id={snapshot.id} className="w-full rounded-lg border border-slate-200" />
					</div>
				</div>
			)}
		</div>
	);
};

export default CctvAlertsPage;
