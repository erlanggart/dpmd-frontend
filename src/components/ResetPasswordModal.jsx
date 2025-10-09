// src/components/ResetPasswordModal.jsx
import React from "react";
import { LuX, LuShield, LuRefreshCw, LuTriangleAlert } from "react-icons/lu";

const ResetPasswordModal = ({
	isOpen,
	onClose,
	onConfirm,
	userName,
	isLoading,
}) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg shadow-xl w-full max-w-md">
				{/* Header */}
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<div className="flex items-center gap-3">
						<div className="h-10 w-10 bg-red-100 rounded-full flex items-center justify-center">
							<LuTriangleAlert className="h-5 w-5 text-red-600" />
						</div>
						<div>
							<h3 className="text-lg font-semibold text-gray-900">
								Reset Password
							</h3>
							<p className="text-sm text-gray-500">
								Konfirmasi reset password user
							</p>
						</div>
					</div>
					<button
						onClick={onClose}
						disabled={isLoading}
						className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors disabled:opacity-50"
					>
						<LuX className="h-5 w-5 text-gray-500" />
					</button>
				</div>

				{/* Content */}
				<div className="p-6">
					<div className="mb-6">
						<p className="text-gray-700 mb-3">
							Apakah Anda yakin ingin mereset password untuk user:
						</p>
						<div className="bg-gray-50 rounded-lg p-3 border">
							<p className="font-medium text-gray-900">{userName}</p>
						</div>
						<div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
							<div className="flex items-start gap-2">
								<LuShield className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
								<div className="text-sm">
									<p className="font-medium text-yellow-800 mb-1">
										Password akan direset menjadi:
									</p>
									<p className="font-mono bg-white px-2 py-1 rounded border text-gray-800">
										dpmdbogorkab
									</p>
								</div>
							</div>
						</div>
					</div>

					{/* Action Buttons */}
					<div className="flex gap-3">
						<button
							type="button"
							onClick={onClose}
							disabled={isLoading}
							className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							Batal
						</button>
						<button
							type="button"
							onClick={onConfirm}
							disabled={isLoading}
							className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
						>
							{isLoading ? (
								<>
									<LuRefreshCw className="h-4 w-4 animate-spin" />
									Mereset...
								</>
							) : (
								<>
									<LuShield className="h-4 w-4" />
									Reset Password
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default ResetPasswordModal;
