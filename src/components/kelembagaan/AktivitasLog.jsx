import React, { useEffect, useState, useImperativeHandle, forwardRef, useRef, useCallback } from "react";
import { 
	LuSettings2, 
	LuUser, 
	LuCalendar, 
	LuPlus, 
	LuPencil, 
	LuRefreshCw, 
	LuCircleCheck, 
	LuFileText,
	LuUserPlus,
	LuUserCheck
} from "react-icons/lu";
import { getDetailActivityLogs, getListActivityLogs, getAllActivityLogs } from "../../services/activityLogs";
import { useAuth } from "../../context/AuthContext";

const AktivitasLog = forwardRef(({ lembagaType, lembagaId, mode = "detail", title, desaId }, ref) => {
	const PAGE_SIZE = 10;
	const { user } = useAuth();
	const [logs, setLogs] = useState([]);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [hasMore, setHasMore] = useState(false);
	const [offset, setOffset] = useState(0);
	const scrollContainerRef = useRef(null);

	const fetchLogs = useCallback(async ({ reset = false } = {}) => {
		if (mode !== "all" && !lembagaType) return;

		const targetOffset = reset ? 0 : offset;
		
		if (reset) {
			setLoading(true);
		} else {
			if (loading || loadingMore || !hasMore) return;
			setLoadingMore(true);
		}
		try {
			let response;
			if (mode === "all") {
				// All mode - tampilkan semua log semua kelembagaan di desa
				const targetDesaId = desaId || user?.desa_id;
				if (!targetDesaId) return;
				response = await getAllActivityLogs({ desa_id: targetDesaId, limit: PAGE_SIZE, offset: targetOffset });
			} else if (mode === "list") {
				// List mode - tampilkan semua log untuk type ini di desa
				// Gunakan desaId dari prop (untuk admin) atau user.desa_id (untuk user desa)
				const targetDesaId = desaId || user?.desa_id;
				if (!targetDesaId) return;
				response = await getListActivityLogs(lembagaType, targetDesaId, PAGE_SIZE, targetOffset);
			} else {
				// Detail mode - tampilkan log spesifik lembaga
				if (!lembagaId) return;
				response = await getDetailActivityLogs(lembagaType, lembagaId, PAGE_SIZE, targetOffset);
			}

			const nextLogs = response?.data?.logs || [];
			const nextHasMore = Boolean(response?.data?.hasMore);

			setLogs((prevLogs) => {
				if (reset) return nextLogs;
				const existingIds = new Set(prevLogs.map((log) => log.id));
				const dedupedLogs = nextLogs.filter((log) => !existingIds.has(log.id));
				return [...prevLogs, ...dedupedLogs];
			});
			setOffset(targetOffset + nextLogs.length);
			setHasMore(nextHasMore);
		} catch (error) {
			console.error('Error fetching activity logs:', error);
			if (reset) {
				setLogs([]);
				setHasMore(false);
				setOffset(0);
			}
		} finally {
			if (reset) {
				setLoading(false);
			} else {
				setLoadingMore(false);
			}
		}
	}, [desaId, hasMore, lembagaId, lembagaType, loading, loadingMore, mode, offset, user?.desa_id]);

	const handleScroll = useCallback((event) => {
		const element = event.currentTarget;
		const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight;

		if (distanceToBottom < 120 && !loading && !loadingMore && hasMore) {
			fetchLogs({ reset: false });
		}
	}, [fetchLogs, hasMore, loading, loadingMore]);

	// Expose refresh function to parent via ref
	useImperativeHandle(ref, () => ({
		refresh: () => fetchLogs({ reset: true })
	}));

	useEffect(() => {
		setLogs([]);
		setOffset(0);
		setHasMore(false);
		fetchLogs({ reset: true });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [lembagaType, lembagaId, mode, desaId, user?.desa_id]);

	const formatDate = (dateString) => {
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('id-ID', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}).format(date);
	};

	const getActivityIcon = (activityType) => {
		const iconProps = "w-5 h-5";
		switch (activityType) {
			case 'create':
				return <LuPlus className={`${iconProps} text-green-600`} />;
			case 'update':
				return <LuPencil className={`${iconProps} text-blue-600`} />;
			case 'toggle_status':
				return <LuRefreshCw className={`${iconProps} text-orange-600`} />;
			case 'verify':
				return <LuCircleCheck className={`${iconProps} text-green-600`} />;
			case 'add_pengurus':
				return <LuUserPlus className={`${iconProps} text-purple-600`} />;
			case 'update_pengurus':
				return <LuPencil className={`${iconProps} text-blue-600`} />;
			case 'toggle_pengurus_status':
				return <LuRefreshCw className={`${iconProps} text-orange-600`} />;
			case 'verify_pengurus':
				return <LuUserCheck className={`${iconProps} text-green-600`} />;
			default:
				return <LuFileText className={`${iconProps} text-gray-600`} />;
		}
	};

	const getEntityBadge = (entityType) => {
		return entityType === 'lembaga' 
			? <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">Lembaga</span>
			: <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Pengurus</span>;
	};

	return (
		<div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300">
			{/* Header dengan gradient accent */}
			<div className="h-1.5 bg-gradient-to-r from-purple-400 to-pink-500 rounded-t-2xl"></div>

			<div className="p-6">
				{/* Header Section */}
				<div className="flex items-center space-x-3 mb-6">
					<div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-600 rounded-xl flex items-center justify-center text-white shadow-lg">
						<LuSettings2 className="w-6 h-6" />
					</div>
					<div>
						<h3 className="text-xl font-bold text-gray-800">Log Aktivitas</h3>
						<p className="text-sm text-gray-500">
							{mode === "all"
								? "Riwayat aktivitas seluruh kelembagaan"
								: mode === "list" 
									? `Riwayat perubahan ${title || "semua " + lembagaType}`
									: "Riwayat perubahan dan aktivitas"}
						</p>
					</div>
				</div>

				{/* Content */}
				{loading ? (
					<div className="text-center py-12">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
						<p className="text-sm text-gray-500 mt-4">Memuat riwayat...</p>
					</div>
				) : logs.length === 0 ? (
					<div className="text-center py-12">
						<div className="w-20 h-20 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
							<LuSettings2 className="w-8 h-8 text-gray-400" />
						</div>
						<h4 className="text-lg font-medium text-gray-600 mb-2">
							Belum ada aktivitas
						</h4>
						<p className="text-sm text-gray-500">
							Riwayat aktivitas akan tampil di sini setelah ada perubahan data
						</p>
					</div>
				) : (
					<div
						ref={scrollContainerRef}
						onScroll={handleScroll}
						className="space-y-3 max-h-[600px] overflow-y-auto pr-2"
					>
						{logs.map((log) => (
							<div
								key={log.id}
								className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-200 border border-gray-100"
							>
								<div className="flex items-start space-x-3">
									<div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200 shadow-sm">
										{getActivityIcon(log.activity_type)}
									</div>
									<div className="flex-1 min-w-0">
										<div className="flex items-start justify-between mb-2">
											<div className="flex-1">
												<p className="text-sm font-medium text-gray-800 leading-relaxed">
													{log.action_description}
												</p>
												<div className="flex items-center space-x-2 mt-1">
													{getEntityBadge(log.entity_type)}
													{(mode === "list" || mode === "all") && log.kelembagaan_nama && (
														<span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded truncate">
															{log.kelembagaan_nama}
														</span>
													)}
													{log.entity_name && (
														<span className="text-xs text-gray-500">
															· {log.entity_name}
														</span>
													)}
												</div>
											</div>
										</div>
										<div className="flex items-center space-x-4 text-xs text-gray-500">
											<div className="flex items-center space-x-1">
												<LuUser className="w-3 h-3" />
												<span>{log.user_name}</span>
											</div>
											<div className="flex items-center space-x-1">
												<LuCalendar className="w-3 h-3" />
												<span>{formatDate(log.created_at)}</span>
											</div>
										</div>
									</div>
								</div>
							</div>
					))}
						{loadingMore && (
							<div className="flex items-center justify-center py-3 text-sm text-gray-500">
								<LuRefreshCw className="w-4 h-4 animate-spin mr-2" />
								Memuat log berikutnya...
							</div>
						)}
						{!hasMore && logs.length > 0 && (
							<div className="text-center py-2 text-xs text-gray-400">
								Semua log sudah dimuat
							</div>
						)}
				</div>
			)}
		</div>
	</div>
);
});

AktivitasLog.displayName = 'AktivitasLog';

export default AktivitasLog;