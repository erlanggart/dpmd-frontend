import React, { useState, useEffect } from "react";
import { LuUsers, LuLoader, LuX, LuRefreshCw } from "react-icons/lu";
import StatistikKelembagaanSummary from "../../components/kelembagaan/StatistikKelembagaanSummary";
import kelembagaanApi from "../../api/kelembagaan";
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
			<div className="p-6 space-y-6">
				<div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<div className="flex items-center justify-center min-h-96">
						<div className="flex items-center gap-2">
							<LuLoader className="h-6 w-6 animate-spin text-blue-600" />
							<span className="text-gray-600">
								Memuat data statistik kelembagaan...
							</span>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="p-6">
				<div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
					<LuX className="h-12 w-12 text-red-500 mx-auto mb-4" />
					<h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
					<p className="text-red-600 mb-4">{error}</p>
					<button
						onClick={handleRefresh}
						className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
					>
						Coba Lagi
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6">
			{/* Header */}
			<div className=" rounded-lg shadow-sm border border-gray-200 p-6">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl">
							<LuUsers className="h-6 w-6 text-white" />
						</div>
						<div>
							<h1 className="text-2xl font-bold text-gray-900">
								Statistik Kelembagaan Desa
							</h1>
							<p className="text-gray-600 text-sm">
								Informasi lengkap kelembagaan di seluruh Kabupaten Bogor
							</p>
						</div>
					</div>
					<button
						onClick={handleRefresh}
						className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
					>
						<LuRefreshCw className="h-4 w-4" />
						<span>Refresh</span>
					</button>
				</div>
			</div>

			{/* Summary Statistics */}
			<StatistikKelembagaanSummary summaryData={summaryData} loading={loading} />
		</div>
	);
};

export default StatistikKelembagaan;
