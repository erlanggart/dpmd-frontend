import React from "react";
import { LuX, LuAlertTriangle } from "react-icons/lu";

const SimpleModal = ({
	show,
	onHide,
	title,
	message,
	confirmText = "Ya, Hapus",
	cancelText = "Batal",
	onConfirm,
	isLoading = false,
	variant = "danger", // danger, warning, info
}) => {
	if (!show) return null;

	const variantStyles = {
		danger: {
			icon: "text-red-500",
			confirmBtn: "bg-red-500 hover:bg-red-600 focus:ring-red-500",
			iconBg: "bg-red-100",
		},
		warning: {
			icon: "text-yellow-500",
			confirmBtn: "bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500",
			iconBg: "bg-yellow-100",
		},
		info: {
			icon: "text-blue-500",
			confirmBtn: "bg-blue-500 hover:bg-blue-600 focus:ring-blue-500",
			iconBg: "bg-blue-100",
		},
	};

	const currentVariant = variantStyles[variant] || variantStyles.danger;

	return (
		<div className="fixed inset-0 z-50 overflow-y-auto">
			<div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
				{/* Overlay */}
				<div
					className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
					onClick={onHide}
				></div>

				{/* Modal */}
				<div className="relative inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-2xl sm:max-w-lg">
					{/* Close button */}
					<button
						onClick={onHide}
						className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
					>
						<LuX className="w-5 h-5" />
					</button>

					{/* Content */}
					<div className="text-center">
						{/* Icon */}
						<div
							className={`mx-auto flex items-center justify-center w-16 h-16 ${currentVariant.iconBg} rounded-full mb-4`}
						>
							<LuAlertTriangle className={`w-8 h-8 ${currentVariant.icon}`} />
						</div>

						{/* Title */}
						<h3 className="text-lg font-semibold text-gray-900 mb-2">
							{title}
						</h3>

						{/* Message */}
						<p className="text-sm text-gray-500 mb-6">{message}</p>

						{/* Actions */}
						<div className="flex flex-col-reverse sm:flex-row sm:justify-center sm:space-x-3 space-y-3 space-y-reverse sm:space-y-0">
							<button
								type="button"
								onClick={onHide}
								disabled={isLoading}
								className="w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{cancelText}
							</button>
							<button
								type="button"
								onClick={onConfirm}
								disabled={isLoading}
								className={`w-full sm:w-auto px-6 py-2.5 text-sm font-medium text-white ${currentVariant.confirmBtn} rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors`}
							>
								{isLoading ? (
									<div className="flex items-center justify-center">
										<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
										Memproses...
									</div>
								) : (
									confirmText
								)}
							</button>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default SimpleModal;
