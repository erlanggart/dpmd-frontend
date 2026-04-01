import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiCheckCircle, FiX } from "react-icons/fi";

const getStorageUrl = (imagePath) => {
	if (!imagePath) return null;
	const base = import.meta.env.VITE_IMAGE_BASE_URL || "http://127.0.0.1:3001";
	return `${base}/storage/${imagePath}`;
};

const AbsensiSuccessPopup = ({ show, onClose, data, autoCloseMs = 4000 }) => {
	useEffect(() => {
		if (show && autoCloseMs > 0) {
			const timer = setTimeout(() => onClose(), autoCloseMs);
			return () => clearTimeout(timer);
		}
	}, [show, autoCloseMs, onClose]);

	return (
		<AnimatePresence>
			{show && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.2 }}
					className="fixed inset-0 z-[100] flex items-center justify-center p-6"
					onClick={onClose}
				>
					{/* Backdrop */}
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="absolute inset-0 bg-black/40 backdrop-blur-sm"
					/>

					{/* Popup Card */}
					<motion.div
						initial={{ opacity: 0, scale: 0.8, y: 30 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.85, y: 20 }}
						transition={{ type: "spring", stiffness: 300, damping: 25 }}
						className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden"
						onClick={(e) => e.stopPropagation()}
					>
						{/* Close Button */}
						<button
							onClick={onClose}
							className="absolute top-3 right-3 z-10 w-8 h-8 bg-black/10 hover:bg-black/20 rounded-full flex items-center justify-center transition-colors"
						>
							<FiX className="h-4 w-4 text-gray-600" />
						</button>

						{/* Image Section */}
						{data?.image_path ? (
							<div className="w-full bg-gradient-to-b from-slate-50 to-white px-6 pt-8 pb-2 flex justify-center">
								<motion.img
									initial={{ scale: 0.5, opacity: 0 }}
									animate={{ scale: 1, opacity: 1 }}
									transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
									src={getStorageUrl(data.image_path)}
									alt="Success"
									className="max-h-48 object-contain rounded-2xl"
								/>
							</div>
						) : (
							<div className="w-full px-6 pt-8 pb-2 flex justify-center">
								<motion.div
									initial={{ scale: 0 }}
									animate={{ scale: 1 }}
									transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
									className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center"
								>
									<motion.div
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										transition={{ delay: 0.3, type: "spring", stiffness: 400 }}
									>
										<FiCheckCircle className="h-10 w-10 text-emerald-500" />
									</motion.div>
								</motion.div>
							</div>
						)}

						{/* Text Section */}
						<div className="px-6 pt-4 pb-8 text-center">
							<motion.h2
								initial={{ opacity: 0, y: 10 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.2 }}
								className="text-xl font-bold text-slate-800 mb-2"
							>
								{data?.title || "Berhasil!"}
							</motion.h2>
							{data?.message && (
								<motion.p
									initial={{ opacity: 0, y: 10 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: 0.3 }}
									className="text-slate-500 text-sm leading-relaxed"
								>
									{data.message}
								</motion.p>
							)}

							{/* Tap to close hint */}
							<motion.p
								initial={{ opacity: 0 }}
								animate={{ opacity: 0.4 }}
								transition={{ delay: 1 }}
								className="text-[10px] text-slate-400 mt-4"
							>
								Ketuk di luar untuk menutup
							</motion.p>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default AbsensiSuccessPopup;
