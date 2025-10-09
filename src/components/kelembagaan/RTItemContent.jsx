import React from "react";
import {
	LuHouse,
	LuUserCheck,
	LuUserX,
	LuBadgeCheck,
	LuCrown,
	LuMapPin,
	LuChevronRight,
} from "react-icons/lu";

const RTItemContent = ({ item }) => {
	const hasKetua = item.ketua_nama && item.ketua_nama.trim();

	return (
		<div className="relative">
			{/* Background gradient untuk hover effect */}
			<div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity duration-300"></div>

			<div className="relative flex items-center justify-between p-1">
				<div className="flex items-center space-x-4 flex-1">
					{/* Enhanced RT Icon dengan status indicator */}
					<div className="relative">
						<div className="w-14 h-14 bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
							<LuHouse className="w-7 h-7" />
						</div>
						{/* Status indicator dot */}
						<div
							className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white shadow-md ${
								hasKetua ? "bg-green-500" : "bg-yellow-500"
							} flex items-center justify-center`}
						>
							{hasKetua ? (
								<LuUserCheck className="w-2.5 h-2.5 text-white" />
							) : (
								<LuUserX className="w-2.5 h-2.5 text-white" />
							)}
						</div>
					</div>

					{/* Enhanced RT Info */}
					<div className="flex-1 space-y-2">
						{/* Header dengan RT number dan status */}
						<div className="flex items-center justify-between">
							<div className="flex items-center space-x-3">
								<h4 className="text-xl font-bold text-gray-800 group-hover:text-blue-800 transition-colors">
									RT {item.nomor}
								</h4>
								{hasKetua ? (
									<span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 text-xs font-semibold rounded-full shadow-sm">
										<LuBadgeCheck className="w-3 h-3 mr-1" />
										Aktif
									</span>
								) : (
									<span className="inline-flex items-center px-3 py-1 bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-700 text-xs font-semibold rounded-full shadow-sm">
										<LuUserX className="w-3 h-3 mr-1" />
										Perlu Ketua
									</span>
								)}
							</div>
						</div>

						{/* Informasi detail */}
						<div className="space-y-1">
							<div className="flex items-center space-x-2 text-sm">
								<LuCrown className="w-4 h-4 text-yellow-600" />
								<span className="text-gray-600">Ketua:</span>
								<span
									className={`font-semibold ${
										hasKetua ? "text-green-700" : "text-gray-500"
									}`}
								>
									{hasKetua ? item.ketua_nama : "Belum ada"}
								</span>
							</div>

							{/* Additional info bisa ditambah di sini */}
							{item.alamat && (
								<div className="flex items-center space-x-2 text-sm text-gray-500">
									<LuMapPin className="w-4 h-4" />
									<span className="truncate">{item.alamat}</span>
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Enhanced arrow indicator dengan action hint */}
				<div className="flex flex-col items-center space-y-1 text-gray-400 group-hover:text-blue-500 transition-all duration-300 group-hover:translate-x-1">
					<LuChevronRight className="w-6 h-6" />
					<div className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
						Lihat Detail
					</div>
				</div>
			</div>
		</div>
	);
};

export default RTItemContent;
