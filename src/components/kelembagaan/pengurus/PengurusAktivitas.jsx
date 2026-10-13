import React, { useState } from "react";
import {
	FaUserPlus,
	FaClipboardCheck,
	FaHourglassHalf,
	FaCheckCircle,
	FaTimesCircle,
	FaRedo,
	FaHistory,
	FaPen,
	FaExchangeAlt,
	FaToggleOn,
	FaUndo,
} from "react-icons/fa";

const formatWaktu = (v) =>
	v
		? new Date(v).toLocaleString("id-ID", {
				day: "numeric",
				month: "long",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			})
		: "";

const ROLE_LABEL = {
	desa: "Desa",
	kecamatan: "Kecamatan",
	superadmin: "Superadmin",
	kepala_bidang: "Kepala Bidang",
	pegawai: "Pegawai",
	bendahara: "Bendahara",
};

// Terjemahkan satu baris log ke label, ikon, warna, dan detail yang mudah dibaca
const describeLog = (log) => {
	const nv = log.new_value || {};
	const ov = log.old_value || {};
	switch (log.activity_type) {
		case "create":
			return { label: "Pengurus ditambahkan", icon: FaUserPlus, tone: "blue", detail: nv.jabatan ? `Jabatan: ${nv.jabatan}` : null };
		case "update": {
			const changes = [];
			if (ov.nama_lengkap && ov.nama_lengkap !== nv.nama_lengkap) changes.push(`Nama: ${ov.nama_lengkap} → ${nv.nama_lengkap}`);
			if (ov.jabatan && ov.jabatan !== nv.jabatan) changes.push(`Jabatan: ${ov.jabatan} → ${nv.jabatan}`);
			return { label: "Data pengurus diubah", icon: FaPen, tone: "slate", detail: changes.join(" · ") || null };
		}
		case "update_status":
			return {
				label: "Status jabatan diubah",
				icon: FaToggleOn,
				tone: "slate",
				detail: `${ov.status_jabatan || "-"} → ${nv.status_jabatan || "-"}`,
			};
		case "update_pengurus":
			if (nv.lembaga) {
				return { label: "Pengurus dipindahkan", icon: FaExchangeAlt, tone: "purple", detail: `${ov.lembaga || "-"} → ${nv.lembaga}` };
			}
			return { label: "Data pengurus diubah", icon: FaPen, tone: "slate", detail: null };
		case "verify_pengurus":
			if (nv.status_verifikasi === "verified") return { label: "Diverifikasi", icon: FaCheckCircle, tone: "green", detail: null };
			if (nv.status_verifikasi === "ditolak")
				return { label: "Verifikasi ditolak", icon: FaTimesCircle, tone: "red", detail: nv.catatan_verifikasi || null };
			return { label: "Verifikasi dibatalkan", icon: FaUndo, tone: "amber", detail: null };
		case "resubmit_pengurus":
			return { label: "Diajukan ulang untuk verifikasi", icon: FaRedo, tone: "blue", detail: null };
		default:
			return { label: log.action_description, icon: FaHistory, tone: "slate", detail: null };
	}
};

const TONE = {
	blue: "bg-blue-100 text-blue-600",
	green: "bg-green-100 text-green-600",
	red: "bg-red-100 text-red-600",
	amber: "bg-amber-100 text-amber-600",
	purple: "bg-purple-100 text-purple-600",
	slate: "bg-slate-100 text-slate-500",
	gray: "bg-gray-100 text-gray-400",
};

const oleh = (log) =>
	log.user_name ? `oleh ${log.user_name}${ROLE_LABEL[log.user_role] ? ` (${ROLE_LABEL[log.user_role]})` : ""}` : "";

/**
 * Timeline proses pengurus: dibuat → data lengkap → (riwayat tolak/ajukan ulang) → terverifikasi.
 * Langkah "kelengkapan" mengikuti syarat verifikasi di PengurusDetailPage (NIK + SK).
 */
export const PengurusTimeline = ({ pengurus, logs }) => {
	const asc = [...(logs || [])].reverse();
	const createLog = asc.find((l) => l.activity_type === "create");

	// Riwayat verifikasi dari log. Bila status sekarang verified, entri "verified" terakhir
	// sudah diwakili langkah akhir sehingga tidak diulang.
	let riwayat = asc.filter((l) => ["verify_pengurus", "resubmit_pengurus"].includes(l.activity_type));
	const last = riwayat[riwayat.length - 1];
	if (pengurus.status_verifikasi === "verified" && last?.new_value?.status_verifikasi === "verified") {
		riwayat = riwayat.slice(0, -1);
	}

	const missing = [];
	if (!pengurus.nik) missing.push("NIK");
	if (!pengurus.produk_hukum_id) missing.push("SK Pengangkatan");
	const lengkap = missing.length === 0;
	const verified = pengurus.status_verifikasi === "verified";
	const ditolak = pengurus.status_verifikasi === "ditolak";

	const steps = [
		{
			key: "create",
			icon: FaUserPlus,
			tone: "blue",
			title: "Pengurus ditambahkan",
			time: pengurus.created_at,
			desc: createLog ? oleh(createLog) : pengurus.imported ? "melalui impor data" : null,
		},
		{
			key: "lengkap",
			icon: FaClipboardCheck,
			tone: lengkap ? "green" : "amber",
			title: lengkap ? "Data wajib lengkap" : "Data wajib belum lengkap",
			desc: lengkap ? "NIK dan SK Pengangkatan sudah terisi" : `Belum ada: ${missing.join(", ")}`,
		},
		...riwayat.map((l) => {
			const d = describeLog(l);
			return { key: l.id, icon: d.icon, tone: d.tone, title: d.label, time: l.created_at, desc: [oleh(l), d.detail].filter(Boolean).join(" — ") };
		}),
		verified
			? {
					key: "final",
					icon: FaCheckCircle,
					tone: "green",
					title: "Terverifikasi",
					time: pengurus.verified_at,
					desc: pengurus.verifikator_nama ? `oleh ${pengurus.verifikator_nama}` : null,
				}
			: {
					key: "final",
					icon: ditolak ? FaTimesCircle : FaHourglassHalf,
					tone: ditolak ? "red" : "gray",
					title: ditolak ? "Menunggu perbaikan dari desa" : "Menunggu verifikasi",
					desc: ditolak ? "Desa perlu memperbaiki data lalu mengajukan ulang" : lengkap ? "Siap diverifikasi" : "Lengkapi data wajib terlebih dahulu",
					pending: true,
				},
	];

	// Horizontal; bila langkah banyak (riwayat tolak/ajukan ulang) bisa digeser ke samping
	return (
		// py-1.5: ruang untuk ring langkah pending (ring + offset 4px) agar tidak terpotong overflow
		<div className="overflow-x-auto -mx-1 px-1 py-1.5">
			<ol className="flex min-w-max">
				{steps.map((s, i) => {
					const Icon = s.icon;
					return (
						<li key={s.key} className="relative flex-1 w-40 min-w-[10rem] px-2 text-center">
							{/* Garis penghubung ke langkah berikutnya */}
							{i < steps.length - 1 && (
								<span className="absolute top-4 left-1/2 w-full h-px bg-gray-200" aria-hidden="true" />
							)}
							<div
								className={`relative z-10 mx-auto w-8 h-8 rounded-full flex items-center justify-center ${TONE[s.tone]} ${
									s.pending ? "ring-2 ring-offset-2 ring-gray-200" : ""
								}`}
							>
								<Icon className="w-3.5 h-3.5" />
							</div>
							<p className={`mt-2 text-sm font-semibold leading-tight ${s.pending ? "text-gray-500" : "text-gray-900"}`}>
								{s.title}
							</p>
							{s.time && <p className="text-xs text-gray-400 mt-0.5">{formatWaktu(s.time)}</p>}
							{s.desc && <p className="text-xs text-gray-600 mt-0.5 break-words">{s.desc}</p>}
						</li>
					);
				})}
			</ol>
		</div>
	);
};

const LOG_PREVIEW = 5;

/** Daftar semua log aktivitas pengurus, terbaru di atas. `logs === null` = sedang dimuat. */
export const PengurusActivityLog = ({ logs }) => {
	const [showAll, setShowAll] = useState(false);

	if (logs === null) return <p className="text-sm text-gray-400">Memuat log aktivitas...</p>;
	if (logs.length === 0) return <p className="text-sm text-gray-500">Belum ada aktivitas tercatat.</p>;

	const shown = showAll ? logs : logs.slice(0, LOG_PREVIEW);

	return (
		<div>
			<ul className="divide-y divide-gray-100">
				{shown.map((log) => {
					const d = describeLog(log);
					const Icon = d.icon;
					return (
						<li key={log.id} className="flex gap-3 py-3 first:pt-0">
							<div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${TONE[d.tone]}`}>
								<Icon className="w-3.5 h-3.5" />
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex flex-wrap items-baseline justify-between gap-x-3">
									<p className="text-sm font-semibold text-gray-900">{d.label}</p>
									<p className="text-xs text-gray-400 whitespace-nowrap">{formatWaktu(log.created_at)}</p>
								</div>
								{d.detail && <p className="text-xs text-gray-600 mt-0.5 break-words">{d.detail}</p>}
								<p className="text-xs text-gray-400 mt-0.5">
									{oleh(log) || "—"}
									{log.kelembagaan_nama && ` · ${log.kelembagaan_nama}`}
								</p>
							</div>
						</li>
					);
				})}
			</ul>
			{logs.length > LOG_PREVIEW && (
				<button
					type="button"
					onClick={() => setShowAll((v) => !v)}
					className="mt-3 text-xs font-semibold text-indigo-600 hover:text-indigo-800"
				>
					{showAll ? "Tampilkan lebih sedikit" : `Tampilkan semua (${logs.length})`}
				</button>
			)}
		</div>
	);
};
