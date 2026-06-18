import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
	LuActivity,
	LuBanknote,
	LuBuilding2,
	LuCircleAlert,
	LuCircleCheck,
	LuDollarSign,
	LuFileText,
	LuLayoutDashboard,
	LuLoader,
	LuMapPin,
	LuStore,
	LuTrendingUp,
	LuUsers,
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

const formatDate = (value) => {
	if (!value) {
		return "Tanpa tanggal";
	}

	const parsedDate = new Date(value);

	if (Number.isNaN(parsedDate.getTime())) {
		return "Tanpa tanggal";
	}

	return new Intl.DateTimeFormat("id-ID", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(parsedDate);
};

const truncateText = (value, length = 130) => {
	if (!value) {
		return "Ringkasan belum tersedia.";
	}

	if (value.length <= length) {
		return value;
	}

	return `${value.slice(0, length).trim()}...`;
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
			<div className="flex h-64 items-center justify-center rounded-3xl border border-slate-200 bg-white shadow-sm">
				<div className="flex flex-col items-center gap-3 text-slate-500">
					<LuLoader className="h-8 w-8 animate-spin text-slate-600" />
					<p className="text-sm font-medium">Memuat ringkasan dashboard desa...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
				<div className="flex items-start gap-3 text-red-700">
					<LuCircleAlert className="mt-0.5 h-5 w-5 flex-shrink-0" />
					<div>
						<h2 className="text-base font-semibold text-red-900">Dashboard gagal dimuat</h2>
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
		berita = [],
	} = dashboardData || {};

	const profileCompletion = profil.completion || DEFAULT_COMPLETION;
	const desaLabel =
		desa.status_pemerintahan === "kelurahan" ? "Kelurahan" : "Desa";
	const todayLabel = new Intl.DateTimeFormat("id-ID", {
		dateStyle: "full",
	}).format(new Date());
	const moduleYearsLabel =
		bankeu.years?.length > 0
			? bankeu.years.slice(0, 3).join(", ")
			: null;

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
					value: profil.luas_wilayah
						? `${profil.luas_wilayah} km²`
						: "Belum diisi",
				},
			],
			badge:
				profileCompletion.percentage === 100 ? "Lengkap" : "Perlu pembaruan",
			badgeClass:
				profileCompletion.percentage === 100
					? "bg-slate-100 text-slate-700"
					: "bg-amber-100 text-amber-700",
			gradient: "from-slate-500 to-slate-500",
			surface: "from-slate-50 via-white to-slate-50",
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
				{
					label: "Status aktif",
					value: `${formatNumber(aparatur.aktif)} orang`,
				},
				{
					label: "Nonaktif",
					value: `${formatNumber(aparatur.nonaktif)} orang`,
				},
			],
			badge: aparatur.total > 0 ? "Terdata" : "Kosong",
			badgeClass:
				aparatur.total > 0
					? "bg-slate-100 text-slate-700"
					: "bg-slate-100 text-slate-600",
			gradient: "from-slate-500 to-slate-600",
			surface: "from-slate-50 via-white to-slate-50",
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
				{
					label: "Berlaku",
					value: `${formatNumber(produkHukum.berlaku)} dokumen`,
				},
				{
					label: "Dicabut",
					value: `${formatNumber(produkHukum.dicabut)} dokumen`,
				},
			],
			badge: produkHukum.total > 0 ? "Tersedia" : "Belum ada",
			badgeClass:
				produkHukum.total > 0
					? "bg-amber-100 text-amber-700"
					: "bg-slate-100 text-slate-600",
			gradient: "from-slate-500 to-slate-500",
			surface: "from-slate-50 via-white to-slate-50",
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
				{
					label: "Badan hukum",
					value: bumdes.badan_hukum || "Belum diisi",
				},
				{
					label: "Nilai aset",
					value: bumdes.nilai_aset
						? formatCurrencyShort(bumdes.nilai_aset)
						: "Belum diisi",
				},
			],
			badge: bumdes.exists
				? humanizeText(bumdes.status) || "Terdata"
				: "Belum ada",
			badgeClass: bumdes.exists
				? "bg-slate-100 text-slate-700"
				: "bg-slate-100 text-slate-600",
			gradient: "from-slate-500 to-slate-600",
			surface: "from-slate-50 via-white to-slate-50",
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
				{
					label: "Posyandu",
					value: `${formatNumber(kelembagaan.posyandu)} unit`,
				},
			],
			badge: kelembagaan.total_lembaga > 0 ? "Aktif" : "Belum ada",
			badgeClass:
				kelembagaan.total_lembaga > 0
					? "bg-slate-100 text-slate-700"
					: "bg-slate-100 text-slate-600",
			gradient: "from-slate-500 to-slate-500",
			surface: "from-slate-50 via-white to-slate-50",
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
				{
					label: "Disetujui",
					value: `${formatNumber(bankeu.approved)} proposal`,
				},
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
					? "bg-slate-100 text-slate-700"
					: bankeu.total_proposals > 0
						? "bg-slate-100 text-slate-700"
						: "bg-slate-100 text-slate-600",
			gradient: "from-slate-500 to-slate-600",
			surface: "from-slate-50 via-white to-slate-50",
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
			gradient: "from-slate-500 to-slate-500",
			surface: "from-slate-50 via-white to-slate-50",
			ready: !!keuangan?.add?.hasData,
		},
		{
			id: "bhprd",
			title: "BHPRD 2025",
			amount: countAvailableStages(bhprdStages) > 0
				? keuangan?.bhprd?.totalFormatted || "Rp 0"
				: "Rp 0",
			status:
				countAvailableStages(bhprdStages) > 0
					? `${countAvailableStages(bhprdStages)}/${bhprdStages.length} tahap memiliki data pencairan`
					: "Belum ada data pencairan",
			gradient: "from-slate-500 to-slate-600",
			surface: "from-slate-50 via-white to-slate-50",
			ready: countAvailableStages(bhprdStages) > 0,
		},
		{
			id: "dd",
			title: "DD 2025",
			amount: countAvailableStages(ddStages) > 0
				? keuangan?.dd?.totalFormatted || "Rp 0"
				: "Rp 0",
			status:
				countAvailableStages(ddStages) > 0
					? `${countAvailableStages(ddStages)}/${ddStages.length} tahap memiliki data pencairan`
					: "Belum ada data pencairan",
			gradient: "from-slate-500 to-slate-600",
			surface: "from-slate-50 via-white to-slate-50",
			ready: countAvailableStages(ddStages) > 0,
		},
		{
			id: "bankeu-funding",
			title: "Bankeu 2025",
			amount: countAvailableStages(bankeuFundingStages) > 0
				? keuangan?.bankeu?.totalFormatted || "Rp 0"
				: "Rp 0",
			status:
				countAvailableStages(bankeuFundingStages) > 0
					? `${countAvailableStages(bankeuFundingStages)}/${bankeuFundingStages.length} tahap memiliki data pencairan`
					: "Belum ada data pencairan",
			gradient: "from-slate-500 to-slate-600",
			surface: "from-slate-50 via-white to-slate-50",
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
			tone: "bg-slate-100 text-slate-700",
			actionLabel: "Perbarui profil",
		});
	}

	if (bankeu.needs_action > 0) {
		focusItems.push({
			title: "Tindak lanjuti proposal Bankeu",
			description: `${formatNumber(bankeu.needs_action)} proposal membutuhkan revisi atau tindak lanjut dari desa.`,
			link: "/desa/bankeu",
			icon: LuBanknote,
			tone: "bg-slate-100 text-slate-700",
			actionLabel: "Buka modul Bankeu",
		});
	}

	if (!bumdes.exists) {
		focusItems.push({
			title: "Lengkapi data BUMDes",
			description: "BUMDes belum tercatat. Isi identitas dan legalitas usaha desa agar profil ekonomi desa lebih kuat.",
			link: "/desa/bumdes",
			icon: LuStore,
			tone: "bg-slate-100 text-slate-700",
			actionLabel: "Isi data BUMDes",
		});
	}

	if (produkHukum.total === 0) {
		focusItems.push({
			title: "Unggah produk hukum desa",
			description: "Belum ada dokumen peraturan yang tersimpan. Arsip hukum penting untuk mendukung modul aparatur dan kelembagaan.",
			link: "/desa/produk-hukum",
			icon: LuFileText,
			tone: "bg-amber-100 text-amber-700",
			actionLabel: "Buka arsip hukum",
		});
	}

	if (aparatur.total === 0) {
		focusItems.push({
			title: "Input aparatur desa",
			description: "Belum ada aparatur yang terdata. Tambahkan aparatur untuk memudahkan administrasi dan pelaporan desa.",
			link: "/desa/aparatur-desa",
			icon: LuUsers,
			tone: "bg-slate-100 text-slate-700",
			actionLabel: "Kelola aparatur",
		});
	}

	if (focusItems.length === 0) {
		focusItems.push({
			title: "Data inti desa sudah terisi",
			description: "Pantau pencairan keuangan, pengajuan bantuan keuangan, dan berita DPMD dari dashboard ini.",
			link: "/desa/dashboard",
			icon: LuCircleCheck,
			tone: "bg-slate-100 text-slate-700",
			actionLabel: "Tetap di dashboard",
		});
	}

	return (
		<div className="space-y-6">
			<section className="relative overflow-hidden rounded-[28px] bg-slate-950 text-white shadow-xl">
				<div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(148,163,184,0.24),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(71,85,105,0.28),_transparent_32%)]" />
				<div className="absolute left-8 top-8 h-40 w-40 rounded-full bg-slate-400/10 blur-3xl" />
				<div className="absolute bottom-0 right-0 h-56 w-56 rounded-full bg-slate-400/10 blur-3xl" />
				<div className="relative p-6 md:p-8 xl:p-10">
					<div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
						<div className="max-w-3xl space-y-4">
							<div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 backdrop-blur-sm">
								<LuLayoutDashboard className="h-4 w-4 text-slate-300" />
								Ringkasan fitur dan data utama {desaLabel.toLowerCase()}
							</div>
							<div>
								<h1 className="text-3xl font-bold tracking-tight md:text-4xl xl:text-5xl">
									Dashboard {desaLabel} {desa.nama}
								</h1>
								<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
									Pantau kelengkapan data desa, status modul kerja, realisasi keuangan,
									serta berita terbaru dari DPMD dalam satu halaman.
								</p>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:w-[520px] xl:flex-shrink-0">
							<div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
								<p className="text-xs font-medium uppercase tracking-wide text-slate-400">
									Profil Terisi
								</p>
								<p className="mt-2 text-2xl font-semibold text-white">
									{profileCompletion.percentage}%
								</p>
							</div>
							<div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
								<p className="text-xs font-medium uppercase tracking-wide text-slate-400">
									Aparatur
								</p>
								<p className="mt-2 text-2xl font-semibold text-white">
									{formatNumber(aparatur.total)}
								</p>
							</div>
							<div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
								<p className="text-xs font-medium uppercase tracking-wide text-slate-400">
									Kelembagaan
								</p>
								<p className="mt-2 text-2xl font-semibold text-white">
									{formatNumber(kelembagaan.total_lembaga)}
								</p>
							</div>
							<div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
								<p className="text-xs font-medium uppercase tracking-wide text-slate-400">
									Proposal Bankeu
								</p>
								<p className="mt-2 text-2xl font-semibold text-white">
									{formatNumber(bankeu.total_proposals)}
								</p>
							</div>
						</div>
					</div>

					<div className="mt-8 flex flex-wrap gap-3">
						<div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
							<LuMapPin className="h-4 w-4 text-slate-300" />
							{desa.kecamatan ? `Kecamatan ${desa.kecamatan}` : "Kecamatan belum tersedia"}
						</div>
						<div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
							<LuCircleCheck className="h-4 w-4 text-slate-300" />
							{completedModules}/{featureCards.length} modul telah memiliki data inti
						</div>
						<div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
							<LuDollarSign className="h-4 w-4 text-slate-300" />
							Realisasi 2025 {keuangan.total_realisasi_formatted || formatCurrency(0)}
						</div>
						<div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
							<LuTrendingUp className="h-4 w-4 text-slate-300" />
							{todayLabel}
						</div>
					</div>
				</div>
			</section>

			<div className="grid gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,1fr)]">
				<div className="space-y-6">
					<section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
						<div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
							<div>
								<h2 className="text-xl font-semibold text-slate-900">Ringkasan Fitur Desa</h2>
								<p className="mt-1 text-sm text-slate-500">
									Semua modul utama untuk user desa diringkas dalam kartu yang bisa langsung dibuka.
								</p>
							</div>
							<div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
								<LuLayoutDashboard className="h-4 w-4" />
								{featureCards.length} modul utama
							</div>
						</div>

						<div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
							{featureCards.map((card) => {
								const IconComponent = card.icon;

								return (
									<Link
										key={card.id}
										to={card.link}
										className={`group relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br ${card.surface} p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg`}
									>
										<div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.gradient}`} />
										<div className="flex items-start justify-between gap-4">
											<div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${card.gradient} text-white shadow-lg`}>
												<IconComponent className="h-5 w-5" />
											</div>
											<span className={`rounded-full px-3 py-1 text-xs font-semibold ${card.badgeClass}`}>
												{card.badge}
											</span>
										</div>

										<div className="mt-5">
											<p className="text-sm font-medium text-slate-500">{card.title}</p>
											<p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
												{card.value}
											</p>
											<p className="mt-2 text-sm leading-6 text-slate-600">
												{card.description}
											</p>
										</div>

										<div className="mt-5 space-y-2 rounded-2xl border border-white/70 bg-white/70 p-3 backdrop-blur-sm">
											{card.highlights.map((highlight) => (
												<div
													key={`${card.id}-${highlight.label}`}
													className="flex items-center justify-between gap-4 text-sm"
												>
													<span className="text-slate-500">{highlight.label}</span>
													<span className="text-right font-semibold text-slate-800">
														{highlight.value}
													</span>
												</div>
											))}
										</div>

										<div className="mt-5 flex items-center justify-between text-sm font-semibold text-slate-700">
											<span>{card.actionLabel}</span>
											<LuTrendingUp className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
										</div>
									</Link>
								);
							})}
						</div>
					</section>

					<section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
						<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
							<div>
								<h2 className="text-xl font-semibold text-slate-900">Realisasi Keuangan 2025</h2>
								<p className="mt-1 text-sm text-slate-500">
									Ringkasan realisasi keuangan desa dari data pencairan yang tersedia di sistem.
								</p>
							</div>
							<div className="rounded-2xl bg-gradient-to-br from-slate-500 to-slate-600 px-5 py-4 text-white shadow-lg shadow-slate-500/20">
								<p className="text-xs font-medium uppercase tracking-wide text-slate-100">
									Total realisasi
								</p>
								<p className="mt-2 text-2xl font-semibold">
									{keuangan.total_realisasi_formatted || formatCurrency(0)}
								</p>
							</div>
						</div>

						<div className="mt-6 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
							{financeCards.map((card) => (
								<div
									key={card.id}
									className={`rounded-3xl border border-slate-200 bg-gradient-to-br ${card.surface} p-5 shadow-sm`}
								>
									<div className="flex items-start justify-between gap-4">
										<div className={`flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br ${card.gradient} text-white shadow-md`}>
											<LuDollarSign className="h-5 w-5" />
										</div>
										<span
											className={`rounded-full px-3 py-1 text-xs font-semibold ${
												card.ready
													? "bg-slate-100 text-slate-700"
													: "bg-slate-100 text-slate-600"
											}`}
										>
											{card.ready ? "Tersedia" : "Belum ada data"}
										</span>
									</div>

									<p className="mt-5 text-sm font-medium text-slate-500">{card.title}</p>
									<p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
										{card.amount}
									</p>
									<p className="mt-3 text-sm leading-6 text-slate-600">
										{card.status}
									</p>
								</div>
							))}
						</div>
					</section>
				</div>

				<div className="space-y-6">
					<section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
						<div className="flex items-center justify-between gap-3">
							<div>
								<h2 className="text-xl font-semibold text-slate-900">Berita & Artikel DPMD</h2>
								<p className="mt-1 text-sm text-slate-500">
									Pembaruan terbaru yang relevan untuk desa dari kanal berita DPMD.
								</p>
							</div>
							<div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600">
								<LuActivity className="h-4 w-4" />
								{formatNumber(berita.length)} item
							</div>
						</div>

						{berita.length > 0 ? (
							<div className="mt-6 space-y-3">
								{berita.map((item, index) => (
									<Link
										key={item.id_berita || item.slug || index}
										to={item.slug ? `/berita/${item.slug}` : "/"}
										className="group block rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white hover:shadow-sm"
									>
										<div className="flex items-start gap-4">
											<div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-sm font-semibold text-white">
												{String(index + 1).padStart(2, "0")}
											</div>
											<div className="min-w-0 flex-1">
												<div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
													<span className="rounded-full bg-slate-200 px-2.5 py-1 text-slate-700">
														{humanizeText(item.kategori) || "Berita DPMD"}
													</span>
													<span>{formatDate(item.tanggal_publish || item.created_at)}</span>
													<span>{formatNumber(item.views)} dibaca</span>
												</div>
												<h3 className="mt-3 text-base font-semibold leading-6 text-slate-900 transition group-hover:text-slate-700">
													{item.judul}
												</h3>
												<p className="mt-2 text-sm leading-6 text-slate-600">
													{truncateText(item.ringkasan, 145)}
												</p>
											</div>
										</div>
									</Link>
								))}
							</div>
						) : (
							<div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
								Belum ada berita atau artikel DPMD yang dipublikasikan.
							</div>
						)}
					</section>

					<section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
						<h2 className="text-xl font-semibold text-slate-900">Fokus Berikutnya</h2>
						<p className="mt-1 text-sm text-slate-500">
							Rekomendasi tindak lanjut berdasarkan kondisi data desa saat ini.
						</p>

						<div className="mt-6 space-y-3">
							{focusItems.slice(0, 3).map((item, index) => {
								const IconComponent = item.icon;

								return (
									<Link
										key={`${item.title}-${index}`}
										to={item.link}
										className="group block rounded-3xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 hover:bg-white hover:shadow-sm"
									>
										<div className="flex items-start gap-4">
											<div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${item.tone}`}>
												<IconComponent className="h-5 w-5" />
											</div>
											<div className="min-w-0 flex-1">
												<h3 className="text-base font-semibold text-slate-900 transition group-hover:text-slate-700">
													{item.title}
												</h3>
												<p className="mt-2 text-sm leading-6 text-slate-600">
													{item.description}
												</p>
												<p className="mt-3 text-sm font-semibold text-slate-700">
													{item.actionLabel}
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
		</div>
	);
};

export default DesaDashboardPage;
