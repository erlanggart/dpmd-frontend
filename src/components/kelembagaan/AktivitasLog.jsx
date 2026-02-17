import React, { useEffect, useState, useImperativeHandle, forwardRef } from "react";
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
import { getDetailActivityLogs, getListActivityLogs } from "../../services/activityLogs";
import { useAuth } from "../../context/AuthContext";

const AktivitasLog = forwardRef(({ lembagaType, lembagaId, mode = "detail", title, desaId }, ref) => {
	const { user } = useAuth();
	const [logs, setLogs] = useState([]);
	const [loading, setLoading] = useState(true);

	const fetchLogs = async () => {
		if (!lembagaType) return;
		
		setLoading(true);
		try {
			let response;
			if (mode === "list") {
				// List mode - tampilkan semua log untuk type ini di desa
				// Gunakan desaId dari prop (untuk admin) atau user.desa_id (untuk user desa)
				const targetDesaId = desaId || user?.desa_id;
				if (!targetDesaId) return;
				response = await getListActivityLogs(lembagaType, targetDesaId, 50);
			} else {
				// Detail mode - tampilkan log spesifik lembaga
				if (!lembagaId) return;
				response = await getDetailActivityLogs(lembagaType, lembagaId, 50);
			}
			setLogs(response?.data?.logs || []);
		} catch (error) {
			console.error('Error fetching activity logs:', error);
			setLogs([]);
		} finally {
			setLoading(false);
		}
	};

	// Expose refresh function to parent via ref
	useImperativeHandle(ref, () => ({
		refresh: fetchLogs
	}));

	useEffect(() => {
		fetchLogs();
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
							{mode === "list" 
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
					<div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
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
													{mode === "list" && log.kelembagaan_nama && (
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
				</div>
			)}
		</div>
	</div>
);
});

AktivitasLog.displayName = 'AktivitasLog';

export default AktivitasLog;