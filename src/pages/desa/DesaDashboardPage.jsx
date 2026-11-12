import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MotionConfig, motion } from "framer-motion";
import {
	LuArrowRight,
	LuBanknote,
	LuBuilding2,
	LuCircleAlert,
	LuCircleCheck,
	LuFileText,
	LuLayoutDashboard,
	LuLoader,
	LuMapPin,
	LuStore,
	LuUsers,
	LuWallet,
} from "react-icons/lu";
import api from "../../api";
import PeringatanVerifikasiDitolak from "../../components/desa/PeringatanVerifikasiDitolak";

const DEFAULT_COMPLETION = {
	filled: 0,
	total: 0,
	percentage: 0,
};

const formatNumber = (value) => {
	const safeValue = Number(value || 0);

	return new Intl.NumberFormat("id-ID").format(
		Number.isFinite(safeValue) ? safeValue : 0,
	);
};

const formatCurrency = (value) => {
	const safeValue = Number(value || 0);

	return new Intl.NumberFormat("id-ID", {
		style: "currency",
		currency: "IDR",
		minimumFractionDigits: 0,
	}).format(Number.isFinite(safeValue) ? safeValue : 0);
};

const formatCurrencyShort = (value) => {
	const safeValue = Number(value || 0);

	if (!safeValue) {
		return "Rp 0";
	}

	if (safeValue >= 1000000000) {
		return `Rp ${(safeValue / 1000000000).toFixed(1).replace(".0", "")} M`;
	}

	if (safeValue >= 1000000) {
		return `Rp ${(safeValue / 1000000).toFixed(1).replace(".0", "")} Jt`;
	}

	if (safeValue >= 1000) {
		return `Rp ${(safeValue / 1000).toFixed(1).replace(".0", "")} Rb`;
	}

	return formatCurrency(safeValue);
};

const humanizeText = (value) => {
	if (!value) {
		return null;
	}

	return String(value)
		.replace(/_/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/\b\w/g, (character) => character.toUpperCase());
};

const countAvailableStages = (stages = []) => {
	return stages.filter((stage) => stage?.hasData).length;
};

const ikonStat = {
	profil: LuMapPin,
	aparatur: LuUsers,
	kelembagaan: LuBuilding2,
	bankeu: LuBanknote,
};

const gradienIkon = {
	emerald: "from-emerald-400 to-emerald-600 shadow-emerald-500/25",
	brand: "from-brand-400 to-brand-600 shadow-brand-500/25",
	slate: "from-slate-400 to-slate-600 shadow-slate-500/20",
};

// masuk berurutan: wadah mengatur jeda, tiap anak naik sambil memudar masuk
const wadahAnim = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
const itemAnim = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

const ubinIkon = (nada) => `flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md ${gradienIkon[nada] || gradienIkon.slate}`;

// cincin progres SVG: garis digambar lewat pathLength
const CincinProgres = ({ persen, className = "h-28 w-28" }) => (
	<div className={`relative shrink-0 ${className}`} role="img" aria-label={`${persen}% selesai`}>
		<svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true">
			<circle cx="50" cy="50" r="42" fill="none" strokeWidth="8" className="stroke-white/10" />
			<motion.circle
				cx="50"
				cy="50"
				r="42"
				fill="none"
				strokeWidth="8"
				strokeLinecap="round"
				className="stroke-brand-400"
				initial={{ pathLength: 0 }}
				animate={{ pathLength: Math.min(Math.max(persen, 0), 100) / 100 }}
				transition={{ type: "spring", stiffness: 80, damping: 20 }}
			/>
		</svg>
		<span className="absolute inset-0 flex items-center justify-center text-xl font-semibold tabular-nums" aria-hidden="true">
			{persen}%
		</span>
	</div>
);

const BilahProgres = ({ persen, className = "" }) => (
	<div className={`h-1.5 overflow-hidden rounded-full bg-slate-100 ${className}`}>
		<motion.div
			className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
			initial={{ width: 0 }}
			animate={{ width: `${Math.min(Math.max(persen, 0), 100)}%` }}
			transition={{ type: "spring", stiffness: 100, damping: 20 }}
		/>
	</div>
);

const KartuStat = ({ stat, persen }) => {
	const Ikon = ikonStat[stat.id] || LuLayoutDashboard;

	return (
		<motion.div
			variants={itemAnim}
			whileHover={{ y: -2 }}
			className="min-w-0 rounded-2xl border border-slate-200/70 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md sm:p-4"
		>
			<span className={ubinIkon("brand")}>
				<Ikon className="h-5 w-5" />
			</span>
			<p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-slate-900 sm:text-3xl">
				{stat.value}
			</p>
			<p className="mt-0.5 truncate text-sm font-medium text-slate-600">{stat.label}</p>
			<p className="mt-0.5 truncate text-xs text-slate-400">{stat.hint}</p>
			{persen !== undefined && <BilahProgres persen={persen} className="mt-3" />}
		</motion.div>
	);
};

const KartuModul = ({ card }) => {
	const Ikon = card.icon;
	const nada = card.badgeClass.includes("brand") ? "brand" : card.ready ? "emerald" : "slate";

	return (
		<motion.div variants={itemAnim} className="h-full">
			<Link
				to={card.link}
				className="group flex h-full flex-col rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md hover:ring-2 hover:ring-brand-500/20"
			>
				<div className="flex items-center gap-3">
					<span className={ubinIkon(nada)}>
						<Ikon className="h-5 w-5" />
					</span>
					<p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{card.title}</p>
					<span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${card.badgeClass}`}>
						{card.badge}
					</span>
				</div>

				<p className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">{card.value}</p>
				<p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">{card.description}</p>

				<dl className="mt-4 space-y-1.5 rounded-xl bg-slate-50 p-3 text-xs">
					{card.highlights.map((h) => (
						<div key={`${card.id}-${h.label}`} className="flex items-center justify-between gap-3">
							<dt className="text-slate-500">{h.label}</dt>
							<dd className="min-w-0 truncate text-right font-semibold text-slate-900">{h.value}</dd>
						</div>
					))}
				</dl>

				<div className="mt-auto flex items-center justify-between pt-4 text-sm font-semibold text-slate-900">
					<span className="transition-colors group-hover:text-brand-700">{card.actionLabel}</span>
					<LuArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-brand-600" />
				</div>
			</Link>
		</motion.div>
	);
};

const KartuKeuangan = ({ card }) => {
	// tahapan dibaca dari teks status yang sudah ada ("2/3 tahap memiliki data pencairan")
	const tahap = /^(\d+)\/(\d+) tahap/.exec(card.status);

	return (
		<motion.div variants={itemAnim} className="h-full">
			<div className="flex h-full flex-col rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
				<div className="flex items-center gap-3">
					<span className={ubinIkon(card.ready ? "emerald" : "slate")}>
						<LuWallet className="h-5 w-5" />
					</span>
					<p className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{card.title}</p>
					<span
						className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
							card.ready ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-slate-100 text-slate-500 ring-slate-200"
						}`}
					>
						{card.ready ? "Tersedia" : "Kosong"}
					</span>
				</div>
				<p className="mt-4 break-words text-xl font-semibold tabular-nums tracking-tight text-slate-900">{card.amount}</p>
				<p className="mb-3 mt-1 text-xs leading-5 text-slate-500">{card.status}</p>
				{tahap && <BilahProgres persen={(Number(tahap[1]) / Number(tahap[2])) * 100} className="mt-auto" />}
			</div>
		</motion.div>
	);
};

const ItemFokus = ({ item, nomor }) => {
	const Ikon = item.icon;
	const beres = Ikon === LuCircleCheck;

	return (
		<motion.li variants={itemAnim}>
			<Link
				to={item.link}
				className={`group block rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
					beres ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200/70 bg-white"
				}`}
			>
				<div className="flex items-start gap-3">
					<div className="relative shrink-0">
						<span className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.tone}`}>
							<Ikon className="h-5 w-5" />
						</span>
						{!beres && (
							<span className="absolute -left-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-semibold text-white ring-2 ring-white">
								{nomor}
							</span>
						)}
					</div>
					<div className="min-w-0 flex-1">
						<h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
						<p className="mt-1 text-sm leading-6 text-slate-500">{item.description}</p>
						<p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
							{item.actionLabel}
							<LuArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
						</p>
					</div>
				</div>
			</Link>
		</motion.li>
	);
};

const DesaDashboardPage = () => {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [dashboardData, setDashboardData] = useState(null);

	useEffect(() => {
		const fetchDashboardData = async () => {
			try {
				setLoading(true);
				setError(null);

				const response = await api.get("/desa/dashboard/summary");
				setDashboardData(response.data.data);
			} catch (requestError) {
				setError(
					requestError.response?.data?.message ||
						"Gagal memuat data dashboard desa",
				);
			} finally {
				setLoading(false);
			}
		};

		fetchDashboardData();
	}, []);

	if (loading) {
		return (
			<div className="space-y-6" aria-busy="true" aria-label="Memuat ringkasan dashboard desa">
				<div className="h-48 animate-pulse rounded-3xl bg-slate-200" />
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					{[0, 1, 2, 3].map((i) => (
						<div key={i} className="h-36 animate-pulse rounded-2xl bg-slate-100" />
					))}
				</div>
				<div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
					{[0, 1, 2, 3].map((i) => (
						<div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-100" />
					))}
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
				<div className="flex items-start gap-3 text-rose-700">
					<LuCircleAlert className="mt-0.5 h-5 w-5 flex-shrink-0" />
					<div>
						<h2 className="text-base font-semibold text-rose-900">Dashboard gagal dimuat</h2>
						<p className="mt-1 text-sm">{error}</p>
					</div>
				</div>
			</div>
		);
	}

	const {
		desa = {},
		profil = {},
		aparatur = {},
		produk_hukum: produkHukum = {},
		bumdes = {},
		kelembagaan = {},
		bankeu = {},
		keuangan = {},
		verifikasi_ditolak: verifikasiDitolak = null,
	} = dashboardData || {};

	const profileCompletion = profil.completion || DEFAULT_COMPLETION;
	const desaLabel =
		desa.status_pemerintahan === "kelurahan" ? "Kelurahan" : "Desa";
	const todayLabel = new Intl.DateTimeFormat("id-ID", {
		dateStyle: "full",
	}).format(new Date());
	const moduleYearsLabel =
		bankeu.years?.length > 0 ? bankeu.years.slice(0, 3).join(", ") : null;

	const bhprdStages = [
		keuangan?.bhprd?.tahap1,
		keuangan?.bhprd?.tahap2,
		keuangan?.bhprd?.tahap3,
	].filter(Boolean);

	const ddStages = [
		keuangan?.dd?.earmarked?.tahap1,
		keuangan?.dd?.earmarked?.tahap2,
		keuangan?.dd?.nonearmarked?.tahap1,
		keuangan?.dd?.nonearmarked?.tahap2,
	].filter(Boolean);

	const bankeuFundingStages = [
		keuangan?.bankeu?.tahap1,
		keuangan?.bankeu?.tahap2,
	].filter(Boolean);

	const summaryStats = [
		{
			id: "profil",
			label: "Profil terisi",
			value: `${profileCompletion.percentage}%`,
			hint: `${profileCompletion.filled}/${profileCompletion.total} data utama`,
		},
		{
			id: "aparatur",
			label: "Aparatur",
			value: formatNumber(aparatur.total),
			hint: `${formatNumber(aparatur.nonaktif)} nonaktif`,
		},
		{
			id: "kelembagaan",
			label: "Kelembagaan",
			value: formatNumber(kelembagaan.total_lembaga),
			hint: `${formatNumber(kelembagaan.rw)} RW / ${formatNumber(kelembagaan.rt)} RT`,
		},
		{
			id: "bankeu",
			label: "Proposal Bankeu",
			value: formatNumber(bankeu.total_proposals),
			hint:
				bankeu.needs_action > 0
					? `${formatNumber(bankeu.needs_action)} perlu tindakan`
					: `${formatNumber(bankeu.approved)} disetujui`,
		},
	];

	const featureCards = [
		{
			id: "profil-desa",
			title: "Profil Desa",
			link: "/desa/profil-desa",
			icon: LuMapPin,
			value: `${profileCompletion.percentage}%`,
			description:
				profileCompletion.percentage === 100
					? "Data dasar desa sudah lengkap dan siap digunakan lintas modul."
					: `${profileCompletion.filled}/${profileCompletion.total} data utama sudah terisi.`,
			highlights: [
				{
					label: "Jumlah penduduk",
					value: profil.jumlah_penduduk
						? `${formatNumber(profil.jumlah_penduduk)} jiwa`
						: "Belum diisi",
				},
				{
					label: "Luas wilayah",
					value: profil.luas_wilayah ? `${profil.luas_wilayah} km²` : "Belum diisi",
				},
			],
			badge: profileCompletion.percentage === 100 ? "Lengkap" : "Perlu pembaruan",
			badgeClass:
				profileCompletion.percentage === 100
					? "bg-emerald-50 text-emerald-700 ring-emerald-100"
					: "bg-amber-50 text-amber-700 ring-amber-100",
			ready: profileCompletion.percentage > 0,
			actionLabel: "Buka profil desa",
		},
		{
			id: "aparatur-desa",
			title: "Aparatur Desa",
			link: "/desa/aparatur-desa",
			icon: LuUsers,
			value: `${formatNumber(aparatur.total)} orang`,
			description:
				aparatur.total > 0
					? "Struktur aparatur telah terdata untuk kebutuhan administrasi dan pelayanan."
					: "Belum ada aparatur yang terinput pada modul aparatur desa.",
			highlights: [
				{ label: "Status aktif", value: `${formatNumber(aparatur.aktif)} orang` },
				{ label: "Nonaktif", value: `${formatNumber(aparatur.nonaktif)} orang` },
			],
			badge: aparatur.total > 0 ? "Terdata" : "Kosong",
			badgeClass:
				aparatur.total > 0
					? "bg-emerald-50 text-emerald-700 ring-emerald-100"
					: "bg-slate-100 text-slate-600 ring-slate-200",
			ready: aparatur.total > 0,
			actionLabel: "Kelola aparatur",
		},
		{
			id: "produk-hukum",
			title: "Produk Hukum",
			link: "/desa/produk-hukum",
			icon: LuFileText,
			value: `${formatNumber(produkHukum.total)} dokumen`,
			description:
				produkHukum.total > 0
					? "Peraturan desa, perkades, dan keputusan kepala desa sudah terdokumentasi."
					: "Belum ada produk hukum desa yang diunggah ke sistem.",
			highlights: [
				{ label: "Berlaku", value: `${formatNumber(produkHukum.berlaku)} dokumen` },
				{ label: "Dicabut", value: `${formatNumber(produkHukum.dicabut)} dokumen` },
			],
			badge: produkHukum.total > 0 ? "Tersedia" : "Belum ada",
			badgeClass:
				produkHukum.total > 0
					? "bg-emerald-50 text-emerald-700 ring-emerald-100"
					: "bg-slate-100 text-slate-600 ring-slate-200",
			ready: produkHukum.total > 0,
			actionLabel: "Buka arsip hukum",
		},
		{
			id: "bumdes",
			title: "BUMDes",
			link: "/desa/bumdes",
			icon: LuStore,
			value: bumdes.exists
				? humanizeText(bumdes.status) || "Terdata"
				: "Belum ada",
			description: bumdes.exists
				? bumdes.nama || "Data BUMDes sudah terhubung di sistem."
				: "Lengkapi identitas, legalitas, dan kondisi usaha BUMDes desa.",
			highlights: [
				{ label: "Badan hukum", value: bumdes.badan_hukum || "Belum diisi" },
				{
					label: "Nilai aset",
					value: bumdes.nilai_aset
						? formatCurrencyShort(bumdes.nilai_aset)
						: "Belum diisi",
				},
			],
			badge: bumdes.exists ? humanizeText(bumdes.status) || "Terdata" : "Belum ada",
			badgeClass: bumdes.exists
				? "bg-emerald-50 text-emerald-700 ring-emerald-100"
				: "bg-slate-100 text-slate-600 ring-slate-200",
			ready: !!bumdes.exists,
			actionLabel: "Kelola BUMDes",
		},
		{
			id: "kelembagaan",
			title: "Kelembagaan",
			link: "/desa/kelembagaan",
			icon: LuBuilding2,
			value: `${formatNumber(kelembagaan.total_lembaga)} unit`,
			description:
				kelembagaan.total_lembaga > 0
					? `${formatNumber(kelembagaan.lembaga_strategis)} dari 4 lembaga strategis telah terbentuk.`
					: "Belum ada data kelembagaan yang terinput untuk desa ini.",
			highlights: [
				{
					label: "RW / RT",
					value: `${formatNumber(kelembagaan.rw)} / ${formatNumber(kelembagaan.rt)}`,
				},
				{ label: "Posyandu", value: `${formatNumber(kelembagaan.posyandu)} unit` },
			],
			badge: kelembagaan.total_lembaga > 0 ? "Aktif" : "Belum ada",
			badgeClass:
				kelembagaan.total_lembaga > 0
					? "bg-emerald-50 text-emerald-700 ring-emerald-100"
					: "bg-slate-100 text-slate-600 ring-slate-200",
			ready: kelembagaan.total_lembaga > 0,
			actionLabel: "Buka kelembagaan",
		},
		{
			id: "bankeu",
			title: "Bantuan Keuangan",
			link: "/desa/bankeu",
			icon: LuBanknote,
			value: `${formatNumber(bankeu.total_proposals)} proposal`,
			description:
				bankeu.total_proposals > 0
					? `${formatNumber(bankeu.in_progress)} proposal sedang berjalan${moduleYearsLabel ? ` untuk TA ${moduleYearsLabel}` : ""}.`
					: "Belum ada proposal bantuan keuangan yang diajukan dari desa.",
			highlights: [
				{ label: "Disetujui", value: `${formatNumber(bankeu.approved)} proposal` },
				{
					label: "Perlu tindakan",
					value: `${formatNumber(bankeu.needs_action)} proposal`,
				},
			],
			badge:
				bankeu.needs_action > 0
					? "Perlu aksi"
					: bankeu.total_proposals > 0
						? "Terpantau"
						: "Siap diajukan",
			badgeClass:
				bankeu.needs_action > 0
					? "bg-brand-50 text-brand-700 ring-brand-100"
					: bankeu.total_proposals > 0
						? "bg-emerald-50 text-emerald-700 ring-emerald-100"
						: "bg-slate-100 text-slate-600 ring-slate-200",
			ready: bankeu.total_proposals > 0,
			actionLabel: "Pantau pengajuan",
		},
	];

	const financeCards = [
		{
			id: "add",
			title: "ADD 2025",
			amount: keuangan?.add?.hasData
				? `Rp ${keuangan.add.realisasiFormatted}`
				: "Rp 0",
			status: keuangan?.add?.hasData
				? humanizeText(keuangan.add.status) || "Data tersedia"
				: "Belum ada data pencairan",
			ready: !!keuangan?.add?.hasData,
		},
		{
			id: "bhprd",
			title: "BHPRD 2025",
			amount:
				countAvailableStages(bhprdStages) > 0
					? keuangan?.bhprd?.totalFormatted || "Rp 0"
					: "Rp 0",
			status:
				countAvailableStages(bhprdStages) > 0
					? `${countAvailableStages(bhprdStages)}/${bhprdStages.length} tahap memiliki data pencairan`
					: "Belum ada data pencairan",
			ready: countAvailableStages(bhprdStages) > 0,
		},
		{
			id: "dd",
			title: "DD 2025",
			amount:
				countAvailableStages(ddStages) > 0
					? keuangan?.dd?.totalFormatted || "Rp 0"
					: "Rp 0",
			status:
				countAvailableStages(ddStages) > 0
					? `${countAvailableStages(ddStages)}/${ddStages.length} tahap memiliki data pencairan`
					: "Belum ada data pencairan",
			ready: countAvailableStages(ddStages) > 0,
		},
		{
			id: "bankeu-funding",
			title: "Bankeu 2025",
			amount:
				countAvailableStages(bankeuFundingStages) > 0
					? keuangan?.bankeu?.totalFormatted || "Rp 0"
					: "Rp 0",
			status:
				countAvailableStages(bankeuFundingStages) > 0
					? `${countAvailableStages(bankeuFundingStages)}/${bankeuFundingStages.length} tahap memiliki data pencairan`
					: "Belum ada data pencairan",
			ready: countAvailableStages(bankeuFundingStages) > 0,
		},
	];

	const completedModules = featureCards.filter((card) => card.ready).length;
	const persenModul = featureCards.length ? Math.round((completedModules / featureCards.length) * 100) : 0;
	const focusItems = [];

	if (profileCompletion.percentage < 100) {
		focusItems.push({
			title: "Lengkapi profil desa",
			description: `${profileCompletion.total - profileCompletion.filled} data utama masih perlu dilengkapi agar informasi desa lebih utuh.`,
			link: "/desa/profil-desa",
			icon: LuMapPin,
			tone: "bg-brand-50 text-brand-700",
			actionLabel: "Perbarui profil",
		});
	}

	if (bankeu.needs_action > 0) {
		focusItems.push({
			title: "Tindak lanjuti proposal Bankeu",
			description: `${formatNumber(bankeu.needs_action)} proposal membutuhkan revisi atau tindak lanjut dari desa.`,
			link: "/desa/bankeu",
			icon: LuBanknote,
			tone: "bg-brand-50 text-brand-700",
			actionLabel: "Buka modul Bankeu",
		});
	}

	if (!bumdes.exists) {
		focusItems.push({
			title: "Lengkapi data BUMDes",
			description:
				"BUMDes belum tercatat. Isi identitas dan legalitas usaha desa agar profil ekonomi desa lebih kuat.",
			link: "/desa/bumdes",
			icon: LuStore,
			tone: "bg-slate-100 text-slate-700",
			actionLabel: "Isi data BUMDes",
		});
	}

	if (produkHukum.total === 0) {
		focusItems.push({
			title: "Unggah produk hukum desa",
			description:
				"Belum ada dokumen peraturan yang tersimpan. Arsip hukum penting untuk mendukung modul aparatur dan kelembagaan.",
			link: "/desa/produk-hukum",
			icon: LuFileText,
			tone: "bg-slate-100 text-slate-700",
			actionLabel: "Buka arsip hukum",
		});
	}

	if (aparatur.total === 0) {
		focusItems.push({
			title: "Input aparatur desa",
			description:
				"Belum ada aparatur yang terdata. Tambahkan aparatur untuk memudahkan administrasi dan pelaporan desa.",
			link: "/desa/aparatur-desa",
			icon: LuUsers,
			tone: "bg-slate-100 text-slate-700",
			actionLabel: "Kelola aparatur",
		});
	}

	if (focusItems.length === 0) {
		focusItems.push({
			title: "Data inti desa sudah terisi",
			description:
				"Pantau realisasi keuangan dan pengajuan bantuan keuangan langsung dari dashboard ini.",
			link: "/desa/dashboard",
			icon: LuCircleCheck,
			tone: "bg-emerald-50 text-emerald-700",
			actionLabel: "Tetap di dashboard",
		});
	}

	return (
		<MotionConfig reducedMotion="user">
			<motion.div variants={wadahAnim} initial="hidden" animate="show" className="space-y-6">
				{/* Ditaruh paling atas: ini satu-satunya tempat desa diberi tahu bahwa
						ada data yang ditolak beserta alasannya. */}
				<PeringatanVerifikasiDitolak data={verifikasiDitolak} />

				{/* Hero */}
				<motion.section
					variants={itemAnim}
					className="relative overflow-hidden rounded-3xl bg-slate-900 p-5 text-white sm:p-8"
				>
					<div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
					<div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />
					<div className="relative flex items-center justify-between gap-6">
						<div className="min-w-0 flex-1">
							<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-300">
								<LuLayoutDashboard className="h-3.5 w-3.5" />
								Dashboard {desaLabel}
							</div>
							<h1 className="mt-2 break-words text-2xl font-semibold tracking-tight sm:text-4xl">
								{desaLabel} {desa.nama}
							</h1>
							<p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
								Ringkasan kelengkapan data, status modul kerja, dan realisasi keuangan{" "}
								{desaLabel.toLowerCase()} dalam satu halaman.
							</p>

							<div className="mt-4 flex gap-2 overflow-x-auto pb-1 text-xs font-medium text-slate-100 md:flex-wrap md:overflow-visible md:pb-0">
								{[
									[LuMapPin, desa.kecamatan ? `Kecamatan ${desa.kecamatan}` : "Kecamatan belum tersedia"],
									[LuCircleCheck, `${completedModules}/${featureCards.length} modul memiliki data inti`],
									[LuWallet, `Realisasi 2025 ${keuangan.total_realisasi_formatted || formatCurrency(0)}`],
									[null, todayLabel],
								].map(([Ikon, teks]) => (
									<span key={teks} className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-white/10 px-2.5 py-1.5 ring-1 ring-white/15">
										{Ikon && <Ikon className="h-3.5 w-3.5 text-brand-300" />}
										{teks}
									</span>
								))}
							</div>
						</div>

						<div className="hidden shrink-0 flex-col items-center gap-2 md:flex">
							<CincinProgres persen={persenModul} />
							<p className="text-xs font-semibold uppercase tracking-wide text-slate-300">Kelengkapan modul</p>
							<p className="text-xs text-slate-400">{completedModules} dari {featureCards.length} modul siap</p>
						</div>
					</div>
				</motion.section>

				{/* KPI */}
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
					{summaryStats.map((stat) => (
						<KartuStat key={stat.id} stat={stat} persen={stat.id === "profil" ? profileCompletion.percentage : undefined} />
					))}
				</div>

				<div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_24rem]">
					<div className="min-w-0 space-y-8">
						{/* Modul */}
						<section>
							<motion.div variants={itemAnim} className="flex items-end justify-between gap-3">
								<div>
									<h2 className="text-base font-semibold text-slate-900">Modul Desa</h2>
									<p className="mt-1 text-sm text-slate-500">
										Semua modul utama beserta ringkasan datanya. Klik untuk membuka.
									</p>
								</div>
								<span className="shrink-0 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
									{featureCards.length} modul
								</span>
							</motion.div>
							<div className="mt-4 grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
								{featureCards.map((card) => (
									<KartuModul key={card.id} card={card} />
								))}
							</div>
						</section>

						{/* Keuangan */}
						<section>
							<motion.div variants={itemAnim} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<h2 className="text-base font-semibold text-slate-900">Realisasi Keuangan 2025</h2>
									<p className="mt-1 text-sm text-slate-500">
										Ringkasan realisasi dari data pencairan yang tersedia di sistem.
									</p>
								</div>
								<div className="rounded-xl bg-slate-900 px-4 py-2.5 text-white ring-1 ring-inset ring-brand-500/30">
									<p className="text-[11px] font-semibold uppercase tracking-wide text-brand-300">Total realisasi</p>
									<p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight">
										{keuangan.total_realisasi_formatted || formatCurrency(0)}
									</p>
								</div>
							</motion.div>
							<div className="mt-4 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
								{financeCards.map((card) => (
									<KartuKeuangan key={card.id} card={card} />
								))}
							</div>
						</section>
					</div>

					{/* Fokus */}
					<section className="min-w-0 xl:sticky xl:top-6">
						<motion.div variants={itemAnim}>
							<h2 className="text-base font-semibold text-slate-900">Fokus Berikutnya</h2>
							<p className="mt-1 text-sm text-slate-500">
								Rekomendasi tindak lanjut berdasarkan kondisi data desa saat ini.
							</p>
						</motion.div>
						<ol className="mt-4 space-y-3">
							{focusItems.slice(0, 4).map((item, index) => (
								<ItemFokus key={`${item.title}-${index}`} item={item} nomor={index + 1} />
							))}
						</ol>
					</section>
				</div>
			</motion.div>
		</MotionConfig>
	);
};

export default DesaDashboardPage;
