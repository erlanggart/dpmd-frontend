// src/components/UserActionModal.jsx
import React, { useState } from "react";
import { LuEdit, LuTrash2, LuUserCheck, LuUserX, LuX } from "lucide-react";

const UserActionModal = ({ user, isOpen, onClose, onAction }) => {
	const [selectedAction, setSelectedAction] = useState("");
	const [isLoading, setIsLoading] = useState(false);

	if (!isOpen || !user) return null;

	const handleAction = async (actionType) => {
		setIsLoading(true);
		try {
			await onAction(actionType, user);
			onClose();
		} catch (error) {
			console.error("Action failed:", error);
		} finally {
			setIsLoading(false);
		}
	};

	const actions = [
		{
			key: "edit",
			label: "Edit User",
			icon: LuEdit,
			color: "text-blue-600",
			bgColor: "bg-blue-50",
			description: "Edit informasi user",
		},
		{
			key: "toggle_status",
			label: user.is_active ? "Nonaktifkan" : "Aktifkan",
			icon: user.is_active ? LuUserX : LuUserCheck,
			color: user.is_active ? "text-red-600" : "text-green-600",
			bgColor: user.is_active ? "bg-red-50" : "bg-green-50",
			description: user.is_active
				? "Nonaktifkan akses user"
				: "Aktifkan akses user",
		},
		{
			key: "delete",
			label: "Hapus User",
			icon: LuTrash2,
			color: "text-red-600",
			bgColor: "bg-red-50",
			description: "Hapus user dari sistem",
		},
	];

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-lg shadow-xl max-w-md w-full">
				<div className="flex items-center justify-between p-6 border-b border-gray-200">
					<h2 className="text-lg font-semibold text-gray-900">
						Aksi User: {user.name}
					</h2>
					<button
						onClick={onClose}
						className="text-gray-400 hover:text-gray-600 transition-colors"
					>
						<LuX className="h-5 w-5" />
					</button>
				</div>

				<div className="p-6">
					<div className="mb-4 p-4 bg-gray-50 rounded-lg">
						<div className="text-sm text-gray-600">
							<div>
								<strong>Email:</strong> {user.email}
							</div>
							<div>
								<strong>Role:</strong> {user.role}
							</div>
							<div>
								<strong>Status:</strong>
								<span
									className={`ml-1 ${
										user.is_active ? "text-green-600" : "text-red-600"
									}`}
								>
									{user.is_active ? "Aktif" : "Nonaktif"}
								</span>
							</div>
						</div>
					</div>

					<div className="space-y-3">
						{actions.map((action) => {
							const IconComponent = action.icon;
							return (
								<button
									key={action.key}
									onClick={() => handleAction(action.key)}
									disabled={isLoading}
									className={`w-full p-4 rounded-lg border border-gray-200 hover:shadow-sm transition-all duration-200 ${action.bgColor} hover:bg-opacity-80 disabled:opacity-50 disabled:cursor-not-allowed`}
								>
									<div className="flex items-center gap-3">
										<IconComponent className={`h-5 w-5 ${action.color}`} />
										<div className="text-left flex-1">
											<div className={`font-medium ${action.color}`}>
												{action.label}
											</div>
											<div className="text-sm text-gray-600">
												{action.description}
											</div>
										</div>
									</div>
								</button>
							);
						})}
					</div>
				</div>

				<div className="flex justify-end gap-3 p-6 border-t border-gray-200">
					<button
						onClick={onClose}
						disabled={isLoading}
						className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors disabled:opacity-50"
					>
						Batal
					</button>
				</div>
			</div>
		</div>
	);
};

export default UserActionModal;
