// src/components/AlertPopup.jsx
// Modern glassmorphic alert popup to replace SweetAlert2
import React, { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiCheckCircle, FiXCircle, FiAlertTriangle, FiInfo, FiX } from "react-icons/fi";

const ICON_CONFIG = {
	success: {
		Icon: FiCheckCircle,
		bg: "bg-emerald-50",
		ring: "ring-emerald-500/20",
		color: "text-emerald-500",
		gradient: "from-emerald-500 to-teal-500",
		pulse: "bg-emerald-400",
		btnBg: "bg-emerald-500 hover:bg-emerald-600 active:scale-95",
	},
	error: {
		Icon: FiXCircle,
		bg: "bg-rose-50",
		ring: "ring-rose-500/20",
		color: "text-rose-500",
		gradient: "from-rose-500 to-pink-500",
		pulse: "bg-rose-400",
		btnBg: "bg-rose-500 hover:bg-rose-600 active:scale-95",
	},
	warning: {
		Icon: FiAlertTriangle,
		bg: "bg-amber-50",
		ring: "ring-amber-500/20",
		color: "text-amber-500",
		gradient: "from-amber-500 to-orange-500",
		pulse: "bg-amber-400",
		btnBg: "bg-amber-500 hover:bg-amber-600 active:scale-95",
	},
	info: {
		Icon: FiInfo,
		bg: "bg-sky-50",
		ring: "ring-sky-500/20",
		color: "text-sky-500",
		gradient: "from-sky-500 to-blue-500",
		pulse: "bg-sky-400",
		btnBg: "bg-sky-500 hover:bg-sky-600 active:scale-95",
	},
};

const AlertPopup = ({
	show,
	icon = "info",
	title,
	message,
	onClose,
	onConfirm,
	confirmText = "OK",
	cancelText = "Batal",
	showCancel = false,
	autoClose = 0,
	confirmColor,
}) => {
	const config = ICON_CONFIG[icon] || ICON_CONFIG.info;
	const { Icon } = config;

	const handleClose = useCallback(() => {
		onClose?.();
	}, [onClose]);

	useEffect(() => {
		if (show && autoClose > 0) {
			const timer = setTimeout(handleClose, autoClose);
			return () => clearTimeout(timer);
		}
	}, [show, autoClose, handleClose]);

	// ESC key close
	useEffect(() => {
		if (!show) return;
		const handleKey = (e) => { if (e.key === "Escape") handleClose(); };
		window.addEventListener("keydown", handleKey);
		return () => window.removeEventListener("keydown", handleKey);
	}, [show, handleClose]);

	return (
		<AnimatePresence>
			{show && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
					className="fixed inset-0 z-[200] flex items-center justify-center p-5"
					onClick={!showCancel ? handleClose : undefined}
				>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="absolute inset-0 bg-black/30 backdrop-blur-md"
					/>

					{/* Card */}
					<motion.div
						initial={{ opacity: 0, scale: 0.75, y: 40 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.85, y: 20 }}
						transition={{ type: "spring", stiffness: 380, damping: 28 }}
						className="relative bg-white/95 backdrop-blur-xl rounded-[1.75rem] shadow-[0_20px_60px_rgba(0,0,0,0.15)] max-w-[340px] w-full overflow-hidden border border-white/60"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Top gradient accent */}
						<div className={`h-1 w-full bg-gradient-to-r ${config.gradient}`} />

						{/* Close button */}
						{!showCancel && (
							<button
								onClick={handleClose}
								className="absolute top-3.5 right-3.5 z-10 w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
							>
								<FiX className="h-3.5 w-3.5 text-slate-500" />
							</button>
						)}

						<div className="px-6 pt-7 pb-6">
							{/* Icon */}
							<div className="flex justify-center mb-5">
								<motion.div
									initial={{ scale: 0, rotate: -30 }}
									animate={{ scale: 1, rotate: 0 }}
									transition={{ type: "spring", stiffness: 400, damping: 18, delay: 0.1 }}
									className="relative"
								>
									{/* Pulse ring */}
									<motion.div
										initial={{ scale: 0.8, opacity: 0 }}
										animate={{ scale: [0.8, 1.4, 1.4], opacity: [0.5, 0.2, 0] }}
										transition={{ duration: 1.5, delay: 0.3, repeat: Infinity, repeatDelay: 2 }}
										className={`absolute inset-0 rounded-full ${config.pulse}`}
									/>
									<div className={`relative w-16 h-16 rounded-full ${config.bg} ring-4 ${config.ring} flex items-center justify-center`}>
										<motion.div
											initial={{ scale: 0 }}
											animate={{ scale: 1 }}
											transition={{ type: "spring", stiffness: 500, damping: 20, delay: 0.25 }}
										>
											<Icon className={`h-8 w-8 ${config.color}`} strokeWidth={2.2} />
										</motion.div>
									</div>
								</motion.div>
							</div>

							{/* Title */}
							<motion.h2
								initial={{ opacity: 0, y: 12 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.18 }}
								className="text-center text-lg font-bold text-slate-800 mb-1.5"
							>
								{title}
							</motion.h2>

							{/* Message */}
							{message && (
								<motion.p
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.25 }}
									className="text-center text-[13px] text-slate-500 leading-relaxed"
								>
									{message}
								</motion.p>
							)}

							{/* Buttons */}
							<motion.div
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.32 }}
								className={`mt-6 flex gap-3 ${showCancel ? "justify-between" : "justify-center"}`}
							>
								{showCancel && (
									<button
										onClick={handleClose}
										className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all duration-200 active:scale-95"
									>
										{cancelText}
									</button>
								)}
								<button
									onClick={() => {
										if (showCancel) {
											onConfirm?.();
										} else {
											handleClose();
										}
									}}
									className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all duration-200 shadow-lg shadow-current/10 ${confirmColor || config.btnBg}`}
								>
									{confirmText}
								</button>
							</motion.div>

							{/* Auto-close progress */}
							{autoClose > 0 && (
								<motion.div className="mt-4 h-0.5 bg-slate-100 rounded-full overflow-hidden">
									<motion.div
										initial={{ width: "100%" }}
										animate={{ width: "0%" }}
										transition={{ duration: autoClose / 1000, ease: "linear" }}
										className={`h-full bg-gradient-to-r ${config.gradient} rounded-full`}
									/>
								</motion.div>
							)}
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

// ── Imperative helper (drop-in Swal.fire replacement) ──
let _setAlert = null;

export const AlertProvider = ({ children }) => {
	const [alert, setAlert] = React.useState(null);
	const resolveRef = React.useRef(null);

	React.useEffect(() => {
		_setAlert = (opts) => {
			return new Promise((resolve) => {
				resolveRef.current = resolve;
				setAlert({ ...opts, show: true });
			});
		};
		return () => { _setAlert = null; };
	}, []);

	const handleClose = () => {
		setAlert(null);
		resolveRef.current?.({ isConfirmed: false });
	};

	const handleConfirm = () => {
		setAlert(null);
		resolveRef.current?.({ isConfirmed: true });
	};

	return (
		<>
			{children}
			{alert && (
				<AlertPopup
					show={alert.show}
					icon={alert.icon}
					title={alert.title}
					message={alert.text || alert.message}
					onClose={handleClose}
					onConfirm={handleConfirm}
					confirmText={alert.confirmText || alert.confirmButtonText || "OK"}
					cancelText={alert.cancelText || alert.cancelButtonText || "Batal"}
					showCancel={alert.showCancel || alert.showCancelButton || false}
					autoClose={alert.timer || alert.autoClose || 0}
					confirmColor={alert.confirmColor}
				/>
			)}
		</>
	);
};

export const showAlert = (opts) => {
	if (_setAlert) return _setAlert(opts);
	console.warn("AlertProvider not mounted");
	return Promise.resolve({ isConfirmed: false });
};

export default AlertPopup;
