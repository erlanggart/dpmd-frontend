// src/components/ResetPasswordModal.jsx
// Konfirmasi reset kata sandi.
//
// Dibuka dari panel rincian pengguna, jadi lapisannya harus di atas panel itu
// (z-[60]) sekaligus di atas bilah nav mengambang milik layout HP (z-50) —
// karena itu z-[70]. Di HP bentuknya lembar dari bawah supaya tombolnya berada
// dalam jangkauan ibu jari dan tidak pernah tertutup bilah nav.
import React, { useEffect } from "react";
import { LuX, LuShield, LuRefreshCw, LuTriangleAlert } from "react-icons/lu";

const ResetPasswordModal = ({
	isOpen,
	onClose,
	onConfirm,
	userName,
	isLoading,
}) => {
	useEffect(() => {
		if (!isOpen) return undefined;
		const onKey = (e) => {
			if (e.key === "Escape" && !isLoading) onClose();
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [isOpen, isLoading, onClose]);

	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
			<div
				className="absolute inset-0"
				onClick={() => !isLoading && onClose()}
				aria-hidden="true"
			/>
			<div
				role="dialog"
				aria-modal="true"
				aria-label="Reset password"
				className="animate-slideUp relative flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl sm:rounded-2xl"
			>
				{/* Pegangan geser — hanya di HP */}
				<div className="flex justify-center pt-2.5 sm:hidden">
					<span className="h-1 w-10 rounded-full bg-slate-200" />
				</div>

				{/* Header */}
				<div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 p-4 sm:p-6">
					<div className="flex min-w-0 items-center gap-3">
						<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
							<LuTriangleAlert className="h-5 w-5 text-red-600" />
						</div>
						<div className="min-w-0">
							<h3 className="text-base font-semibold text-slate-900 sm:text-lg">
								Reset Password
							</h3>
							<p className="truncate text-sm text-slate-500">
								Konfirmasi reset password user
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						disabled={isLoading}
						aria-label="Tutup"
						className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-50"
					>
						<LuX className="h-5 w-5" />
					</button>
				</div>

				{/* Isi */}
				<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
					<p className="mb-3 text-sm text-slate-700">
						Apakah Anda yakin ingin mereset password untuk user:
					</p>
					<div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
						<p className="break-words font-medium text-slate-900">{userName}</p>
					</div>
					<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
						<div className="flex items-start gap-2">
							<LuShield className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
							<div className="min-w-0 text-sm">
								<p className="mb-1 font-medium text-amber-800">
									Password akan direset menjadi:
								</p>
								<p className="rounded border border-amber-200 bg-white px-2 py-1 font-mono text-slate-800">
									password
								</p>
							</div>
						</div>
					</div>
				</div>

				{/* Tombol — tetap terlihat, aman dari area gestur HP */}
				<div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-100 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:gap-3 sm:p-6 sm:pb-6">
					<button
						type="button"
						onClick={onClose}
						disabled={isLoading}
						className="min-h-11 flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
					>
						Batal
					</button>
					<button
						type="button"
						onClick={onConfirm}
						disabled={isLoading}
						className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
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
	);
};

export default ResetPasswordModal;
