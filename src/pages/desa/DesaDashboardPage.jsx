import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
			<div className="flex h-64 items-center justify-center rounded-xl border border-slate-200 bg-white">
				<div className="flex flex-col items-center gap-3 text-slate-500">
					<LuLoader className="h-6 w-6 animate-spin text-slate-900" />
					<p className="text-sm font-medium">Memuat ringkasan dashboard desa...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-xl border border-rose-200 bg-rose-50 p-6">
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
			hint: `${formatNumber(aparatur.aktif)} aktif`,
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
		<div className="space-y-5">
			{/* Header */}
			<section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
				<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
					<div className="min-w-0">
						<div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-600">
							<LuLayoutDashboard className="h-3.5 w-3.5" />
							Dashboard {desaLabel.toLowerCase()}
						</div>
						<h1 className="mt-2 truncate text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
							{desaLabel} {desa.nama}
						</h1>
						<p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
							Ringkasan kelengkapan data, status modul kerja, dan realisasi keuangan
							{desaLabel.toLowerCase()} dalam satu halaman.
						</p>

						<div className="mt-4 flex flex-wrap gap-2 text-xs font-medium text-slate-600">
							<span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
								<LuMapPin className="h-3.5 w-3.5 text-slate-400" />
								{desa.kecamatan ? `Kecamatan ${desa.kecamatan}` : "Kecamatan belum tersedia"}
							</span>
							<span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
								<LuCircleCheck className="h-3.5 w-3.5 text-slate-400" />
								{completedModules}/{featureCards.length} modul memiliki data inti
							</span>
							<span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
								<LuWallet className="h-3.5 w-3.5 text-slate-400" />
								Realisasi 2025 {keuangan.total_realisasi_formatted || formatCurrency(0)}
							</span>
							<span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
								{todayLabel}
							</span>
						</div>
					</div>
				</div>

				<div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 lg:grid-cols-4">
					{summaryStats.map((stat) => (
						<div key={stat.id} className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-4">
							<span className="absolute inset-y-0 left-0 w-1 bg-brand-500" />
							<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
								{stat.label}
							</p>
							<p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
								{stat.value}
							</p>
							<p className="mt-1 truncate text-xs text-slate-500">{stat.hint}</p>
						</div>
					))}
				</div>
			</section>

			<div className="grid gap-5 xl:grid-cols-[minmax(0,1.9fr)_minmax(300px,1fr)]">
				<div className="space-y-5">
					{/* Modul */}
					<section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
						<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
							<div>
								<h2 className="text-base font-semibold text-slate-900">Modul Desa</h2>
								<p className="mt-1 text-sm text-slate-500">
									Semua modul utama beserta ringkasan datanya. Klik untuk membuka.
								</p>
							</div>
							<span className="inline-flex items-center gap-1.5 self-start rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 sm:self-auto">
								{featureCards.length} modul
							</span>
						</div>

						<div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
							{featureCards.map((card) => {
								const IconComponent = card.icon;

								return (
									<Link
										key={card.id}
										to={card.link}
										className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm"
									>
										<div className="flex items-start justify-between gap-3">
											<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
												<IconComponent className="h-4 w-4" />
											</div>
											<span
												className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${card.badgeClass}`}
											>
												{card.badge}
											</span>
										</div>

										<div className="mt-4">
											<p className="text-sm font-medium text-slate-500">{card.title}</p>
											<p className="mt-1 text-xl font-semibold tracking-tight text-slate-900">
												{card.value}
											</p>
											<p className="mt-2 text-sm leading-6 text-slate-500">
												{card.description}
											</p>
										</div>

										<div className="mt-4 space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3">
											{card.highlights.map((highlight) => (
												<div
													key={`${card.id}-${highlight.label}`}
													className="flex items-center justify-between gap-4 text-xs"
												>
													<span className="text-slate-500">{highlight.label}</span>
													<span className="text-right font-semibold text-slate-900">
														{highlight.value}
													</span>
												</div>
											))}
										</div>

										<div className="mt-4 flex items-center justify-between text-sm font-semibold text-slate-900">
											<span className="transition-colors group-hover:text-brand-700">{card.actionLabel}</span>
											<LuArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
										</div>
									</Link>
								);
							})}
						</div>
					</section>

					{/* Keuangan */}
					<section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
						<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<h2 className="text-base font-semibold text-slate-900">
									Realisasi Keuangan 2025
								</h2>
								<p className="mt-1 text-sm text-slate-500">
									Ringkasan realisasi dari data pencairan yang tersedia di sistem.
								</p>
							</div>
							<div className="rounded-lg bg-slate-900 px-4 py-3 text-white ring-1 ring-inset ring-brand-500/30">
								<p className="text-[11px] font-semibold uppercase tracking-wide text-brand-400">
									Total realisasi
								</p>
								<p className="mt-1 text-xl font-semibold tracking-tight">
									{keuangan.total_realisasi_formatted || formatCurrency(0)}
								</p>
							</div>
						</div>

						<div className="mt-5 grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
							{financeCards.map((card) => (
								<div
									key={card.id}
									className="rounded-xl border border-slate-200 bg-slate-50 p-4"
								>
									<div className="flex items-start justify-between gap-3">
										<p className="text-sm font-medium text-slate-500">{card.title}</p>
										<span
											className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
												card.ready
													? "bg-emerald-50 text-emerald-700 ring-emerald-100"
													: "bg-white text-slate-500 ring-slate-200"
											}`}
										>
											{card.ready ? "Tersedia" : "Kosong"}
										</span>
									</div>
									<p className="mt-3 text-xl font-semibold tracking-tight text-slate-900">
										{card.amount}
									</p>
									<p className="mt-2 text-xs leading-5 text-slate-500">{card.status}</p>
								</div>
							))}
						</div>
					</section>
				</div>

				{/* Fokus */}
				<section className="h-fit rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
					<h2 className="text-base font-semibold text-slate-900">Fokus Berikutnya</h2>
					<p className="mt-1 text-sm text-slate-500">
						Rekomendasi tindak lanjut berdasarkan kondisi data desa saat ini.
					</p>

					<div className="mt-5 space-y-3">
						{focusItems.slice(0, 4).map((item, index) => {
							const IconComponent = item.icon;

							return (
								<Link
									key={`${item.title}-${index}`}
									to={item.link}
									className="group block rounded-xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white"
								>
									<div className="flex items-start gap-3">
										<div
											className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${item.tone}`}
										>
											<IconComponent className="h-4 w-4" />
										</div>
										<div className="min-w-0 flex-1">
											<h3 className="text-sm font-semibold text-slate-900">{item.title}</h3>
											<p className="mt-1.5 text-sm leading-6 text-slate-500">
												{item.description}
											</p>
											<p className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700">
												{item.actionLabel}
												<LuArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
											</p>
										</div>
									</div>
								</Link>
							);
						})}
					</div>
				</section>
			</div>
		</div>
	);
};

export default DesaDashboardPage;
