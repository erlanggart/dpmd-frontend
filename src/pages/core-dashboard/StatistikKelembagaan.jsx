import React, { useState, useEffect } from "react";
import { LuUsers, LuLoader, LuX, LuRefreshCw } from "react-icons/lu";
import StatistikTahunan from "../../components/kelembagaan/StatistikTahunan";
import StatistikLKD from "../../components/kelembagaan/StatistikLKD";
import kelembagaanApi from "../../api/kelembagaan";
import PageHeader from "../../components/statistik/PageHeader";
import { useDataCache } from "../../context/DataCacheContext";

const CACHE_KEY = "statistik-kelembagaan";

const StatistikKelembagaan = () => {
	const [summaryData, setSummaryData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const { getCachedData, setCachedData, isCached, clearCache } = useDataCache();

	const fetchSummaryData = async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await kelembagaanApi.getSummary();

			if (response.success) {
				setSummaryData(response.data);
				setCachedData(CACHE_KEY, response.data);
			} else {
				throw new Error(response.message || "Gagal mengambil data summary");
			}
		} catch (err) {
			console.error("Error fetching summary data:", err);
			setError(
				err.message || "Gagal mengambil data statistik. Silakan coba lagi."
			);
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		if (isCached(CACHE_KEY)) {
			setSummaryData(getCachedData(CACHE_KEY).data);
			setLoading(false);
		} else {
			fetchSummaryData();
		}
	}, []);

	const handleRefresh = () => {
		clearCache(CACHE_KEY);
		fetchSummaryData();
	};

	if (loading) {
		return (
			<div className="min-h-screen bg-slate-50 p-4 pt-20 sm:p-6 lg:p-8 lg:pt-8">
				<div className="flex min-h-96 items-center justify-center rounded-2xl border border-slate-200 bg-white">
					<div className="flex items-center gap-2.5">
						<LuLoader className="h-5 w-5 animate-spin text-brand-600" />
						<span className="text-sm text-slate-500">
							Memuat data statistik kelembagaan...
						</span>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-slate-50 p-4 pt-20 sm:p-6 lg:p-8 lg:pt-8">
				<div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center">
					<div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
						<LuX className="h-5 w-5 text-slate-900" />
					</div>
					<h3 className="mt-4 text-base font-semibold text-slate-900">
						Data gagal dimuat
					</h3>
					<p className="mt-1.5 text-sm leading-relaxed text-slate-500">{error}</p>
					<button
						onClick={handleRefresh}
						className="mt-5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
					>
						Coba Lagi
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen space-y-6 bg-slate-50 p-4 pt-20 sm:p-6 lg:p-8 lg:pt-8">
			{/* Header */}
			<PageHeader
				icon={LuUsers}
				title="Statistik Kelembagaan Desa"
				subtitle="Informasi lengkap kelembagaan di seluruh Kabupaten Bogor"
				actions={
					<button
						onClick={handleRefresh}
						className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-white/20"
					>
						<LuRefreshCw className="h-4 w-4" />
						<span>Refresh</span>
					</button>
				}
			/>

			{/* Statistik LKD */}
			<StatistikLKD summaryData={summaryData} loading={loading} />

			{/* Statistik Tahunan */}
			<StatistikTahunan />
		</div>
	);
};

export default StatistikKelembagaan;
