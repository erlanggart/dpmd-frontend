import React, {
	useEffect,
	useState,
	useImperativeHandle,
	forwardRef,
	useRef,
	useCallback,
} from "react";
import {
	LuActivity,
	LuPlus,
	LuPencil,
	LuRefreshCw,
	LuCircleCheck,
	LuUserPlus,
	LuUserCheck,
	LuFileText,
	LuArrowLeftRight,
} from "react-icons/lu";
import {
	getDetailActivityLogs,
	getListActivityLogs,
	getAllActivityLogs,
} from "../../services/activityLogs";
import { useAuth } from "../../context/AuthContext";

// ── Relative time formatter ────────────────────────────────────────────────
const formatRelative = (dateString) => {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now - date;
	const diffMin = Math.floor(diffMs / 60_000);
	const diffHour = Math.floor(diffMs / 3_600_000);
	const diffDay = Math.floor(diffMs / 86_400_000);

	if (diffMin < 1) return "Baru saja";
	if (diffMin < 60) return `${diffMin} menit lalu`;
	if (diffHour < 24) return `${diffHour} jam lalu`;

	const isYesterday =
		diffDay === 1 ||
		(diffDay === 0 &&
			new Date(now.getFullYear(), now.getMonth(), now.getDate()) >
				new Date(date.getFullYear(), date.getMonth(), date.getDate()));

	if (isYesterday) {
		const time = date.toLocaleTimeString("id-ID", {
			hour: "2-digit",
			minute: "2-digit",
		});
		return `Kemarin, ${time}`;
	}

	return date.toLocaleDateString("id-ID", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
};

// ── Icon per activity type ─────────────────────────────────────────────────
const ACTIVITY_ICON_MAP = {
	create: {
		icon: LuPlus,
		bg: "bg-indigo-50",
		color: "text-indigo-500",
		border: "border-indigo-100",
	},
	update: {
		icon: LuPencil,
		bg: "bg-amber-50",
		color: "text-amber-500",
		border: "border-amber-100",
	},
	toggle_status: {
		icon: LuArrowLeftRight,
		bg: "bg-orange-50",
		color: "text-orange-500",
		border: "border-orange-100",
	},
	verify: {
		icon: LuCircleCheck,
		bg: "bg-green-50",
		color: "text-green-500",
		border: "border-green-100",
	},
	resubmit: {
		icon: LuRefreshCw,
		bg: "bg-sky-50",
		color: "text-sky-500",
		border: "border-sky-100",
	},
	add_pengurus: {
		icon: LuUserPlus,
		bg: "bg-blue-50",
		color: "text-blue-500",
		border: "border-blue-100",
	},
	update_pengurus: {
		icon: LuPencil,
		bg: "bg-amber-50",
		color: "text-amber-500",
		border: "border-amber-100",
	},
	toggle_pengurus_status: {
		icon: LuArrowLeftRight,
		bg: "bg-orange-50",
		color: "text-orange-500",
		border: "border-orange-100",
	},
	verify_pengurus: {
		icon: LuUserCheck,
		bg: "bg-green-50",
		color: "text-green-500",
		border: "border-green-100",
	},
	resubmit_pengurus: {
		icon: LuRefreshCw,
		bg: "bg-sky-50",
		color: "text-sky-500",
		border: "border-sky-100",
	},
};

const DEFAULT_ICON = {
	icon: LuFileText,
	bg: "bg-gray-50",
	color: "text-gray-400",
	border: "border-gray-100",
};

const ActivityIcon = ({ type }) => {
	const cfg = ACTIVITY_ICON_MAP[type] || DEFAULT_ICON;
	const Icon = cfg.icon;
	return (
		<div
			className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border ${cfg.bg} ${cfg.border}`}
		>
			<Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
		</div>
	);
};

// ── Main component ─────────────────────────────────────────────────────────
const AktivitasLog = forwardRef(
	({ lembagaType, lembagaId, mode = "detail", title, desaId }, ref) => {
		const PAGE_SIZE = 10;
		const { user } = useAuth();
		const [logs, setLogs] = useState([]);
		const [loading, setLoading] = useState(true);
		const [loadingMore, setLoadingMore] = useState(false);
		const [hasMore, setHasMore] = useState(false);
		const [offset, setOffset] = useState(0);
		const scrollContainerRef = useRef(null);

		const fetchLogs = useCallback(
			async ({ reset = false } = {}) => {
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
						const targetDesaId = desaId || user?.desa_id;
						if (!targetDesaId) return;
						response = await getAllActivityLogs({
							desa_id: targetDesaId,
							limit: PAGE_SIZE,
							offset: targetOffset,
						});
					} else if (mode === "list") {
						const targetDesaId = desaId || user?.desa_id;
						if (!targetDesaId) return;
						response = await getListActivityLogs(
							lembagaType,
							targetDesaId,
							PAGE_SIZE,
							targetOffset,
						);
					} else {
						if (!lembagaId) return;
						response = await getDetailActivityLogs(
							lembagaType,
							lembagaId,
							PAGE_SIZE,
							targetOffset,
						);
					}

					const nextLogs = response?.data?.logs || [];
					const nextHasMore = Boolean(response?.data?.hasMore);

					setLogs((prev) => {
						if (reset) return nextLogs;
						const ids = new Set(prev.map((l) => l.id));
						return [...prev, ...nextLogs.filter((l) => !ids.has(l.id))];
					});
					setOffset(targetOffset + nextLogs.length);
					setHasMore(nextHasMore);
				} catch (err) {
					console.error("Error fetching activity logs:", err);
					if (reset) {
						setLogs([]);
						setHasMore(false);
						setOffset(0);
					}
				} finally {
					reset ? setLoading(false) : setLoadingMore(false);
				}
			},
			[desaId, hasMore, lembagaId, lembagaType, loading, loadingMore, mode, offset, user?.desa_id],
		);

		const handleScroll = useCallback(
			(e) => {
				const el = e.currentTarget;
				if (
					el.scrollHeight - el.scrollTop - el.clientHeight < 120 &&
					!loading &&
					!loadingMore &&
					hasMore
				) {
					fetchLogs({ reset: false });
				}
			},
			[fetchLogs, hasMore, loading, loadingMore],
		);

		useImperativeHandle(ref, () => ({
			refresh: () => fetchLogs({ reset: true }),
		}));

		useEffect(() => {
			setLogs([]);
			setOffset(0);
			setHasMore(false);
			fetchLogs({ reset: true });
			// eslint-disable-next-line react-hooks/exhaustive-deps
		}, [lembagaType, lembagaId, mode, desaId, user?.desa_id]);

		const subtitle =
			mode === "all"
				? "Riwayat aktivitas seluruh kelembagaan"
				: mode === "list"
					? `Riwayat perubahan ${title || lembagaType}`
					: "Riwayat perubahan dan aktivitas";

		return (
			<div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
				{/* Header */}
				<div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
					<div className="w-8 h-8 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center flex-shrink-0">
						<LuActivity className="w-4 h-4 text-gray-500" />
					</div>
					<div>
						<h3 className="text-sm font-bold text-gray-900">Log Aktivitas</h3>
						<p className="text-xs text-gray-400">{subtitle}</p>
					</div>
				</div>

				{/* Body */}
				{loading ? (
					<div className="py-10 flex flex-col items-center gap-2">
						<div className="w-5 h-5 border-2 border-gray-200 border-t-indigo-400 rounded-full animate-spin" />
						<p className="text-xs text-gray-400">Memuat riwayat...</p>
					</div>
				) : logs.length === 0 ? (
					<div className="py-10 flex flex-col items-center gap-2 text-center px-4">
						<div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
							<LuActivity className="w-5 h-5 text-gray-400" />
						</div>
						<p className="text-sm font-medium text-gray-500">Belum ada aktivitas</p>
						<p className="text-xs text-gray-400">
							Riwayat akan muncul setelah ada perubahan data
						</p>
					</div>
				) : (
					<div
						ref={scrollContainerRef}
						onScroll={handleScroll}
						className="max-h-[480px] overflow-y-auto"
					>
						<div className="relative px-4 py-3">
							{/* Vertical timeline line */}
							<div className="absolute left-[27px] top-3 bottom-3 w-px bg-gray-100" />

							<div className="space-y-4">
								{logs.map((log) => (
									<div key={log.id} className="flex gap-3">
										{/* Icon — sits on the timeline line */}
										<div className="relative z-10">
											<ActivityIcon type={log.activity_type} />
										</div>

										{/* Content */}
										<div className="flex-1 min-w-0 pt-0.5">
											<p className="text-sm text-gray-800 leading-snug">
												{log.action_description}
											</p>
											<p className="text-xs text-gray-400 mt-0.5">
												<span className="font-medium text-gray-500">
													{log.user_name || "—"}
												</span>
												{" · "}
												{formatRelative(log.created_at)}
											</p>
										</div>
									</div>
								))}
							</div>

							{loadingMore && (
								<div className="flex items-center justify-center gap-2 pt-4 text-xs text-gray-400">
									<LuRefreshCw className="w-3.5 h-3.5 animate-spin" />
									Memuat lebih banyak...
								</div>
							)}

							{!hasMore && logs.length > 0 && (
								<p className="text-center text-xs text-gray-300 pt-4">
									— Semua log sudah ditampilkan —
								</p>
							)}
						</div>
					</div>
				)}
			</div>
		);
	},
);

AktivitasLog.displayName = "AktivitasLog";

export default AktivitasLog;
