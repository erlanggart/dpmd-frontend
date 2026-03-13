import React, { useState, useEffect, useCallback } from 'react';
import { Users, Mail, Phone, Shield, RefreshCw, UserCircle } from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';

const DaftarPegawaiBidang = ({ bidangId, bidangName }) => {
	const [loading, setLoading] = useState(true);
	const [pegawai, setPegawai] = useState([]);

	const fetchPegawai = useCallback(async () => {
		try {
			setLoading(true);
			const response = await api.get(`/bidang/${bidangId}/pegawai`);
			if (response.data.success) {
				setPegawai(response.data.data || []);
			}
		} catch (error) {
			console.error('Error fetching pegawai:', error);
			toast.error('Gagal memuat data pegawai');
		} finally {
			setLoading(false);
		}
	}, [bidangId]);

	useEffect(() => {
		fetchPegawai();
	}, [fetchPegawai]);

	const getRoleColor = (role) => {
		const colors = {
			'kepala_bidang': 'bg-purple-100 text-purple-800 border-purple-200',
			'sekretaris': 'bg-blue-100 text-blue-800 border-blue-200',
			'staff': 'bg-gray-100 text-gray-800 border-gray-200',
			'koordinator': 'bg-green-100 text-green-800 border-green-200'
		};
		return colors[role] || 'bg-gray-100 text-gray-800 border-gray-200';
	};

	const getRoleLabel = (role) => {
		const labels = {
			'kepala_bidang': 'Kepala Bidang',
			'sekretaris': 'Sekretaris',
			'staff': 'Staff',
			'koordinator': 'Koordinator'
		};
		return labels[role] || role;
	};

	if (loading) {
		return (
			<div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
				</div>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6">
			{/* Header */}
			<div className="flex items-center justify-between mb-6">
				<div className="flex items-center gap-3">
					<div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
						<Users className="h-5 w-5 text-white" />
					</div>
					<div>
						<h3 className="text-xl font-bold text-gray-800">Daftar Pegawai</h3>
						<p className="text-sm text-gray-500">{bidangName}</p>
					</div>
				</div>
				<button
					onClick={fetchPegawai}
					className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
					title="Refresh"
				>
					<RefreshCw className="h-4 w-4 text-gray-600" />
				</button>
			</div>

			{/* Pegawai List */}
			{pegawai.length === 0 ? (
				<div className="text-center py-12">
					<UserCircle className="h-16 w-16 text-gray-300 mx-auto mb-3" />
					<p className="text-gray-500">Belum ada data pegawai</p>
				</div>
			) : (
				<div className="space-y-3">
					{pegawai.map((p) => (
						<div
							key={p.id}
							className="group relative bg-gradient-to-br from-gray-50 to-white rounded-xl p-4 border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all duration-200"
						>
							<div className="flex items-start gap-4">
								{/* Avatar */}
								<div className="flex-shrink-0">
									{p.user?.avatar ? (
										<img
											src={p.user.avatar}
											alt={p.user?.fullname}
											className="h-14 w-14 rounded-xl object-cover border-2 border-white shadow-md"
										/>
									) : (
										<div className="h-14 w-14 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
											<span className="text-white font-bold text-lg">
												{p.user?.fullname?.charAt(0).toUpperCase() || 'U'}
											</span>
										</div>
									)}
								</div>

								{/* Info */}
								<div className="flex-1 min-w-0">
									<div className="flex items-start justify-between gap-2 mb-2">
										<div className="flex-1 min-w-0">
											<h4 className="font-bold text-gray-800 text-base truncate">
												{p.user?.fullname || 'Nama tidak tersedia'}
											</h4>
											<p className="text-sm text-gray-600 truncate">{p.user?.nip || '-'}</p>
										</div>
										<span className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold border ${getRoleColor(p.role)}`}>
											{getRoleLabel(p.role)}
										</span>
									</div>

									{/* Contact Info */}
									<div className="space-y-1">
										{p.user?.email && (
											<div className="flex items-center gap-2 text-sm text-gray-600">
												<Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
												<span className="truncate">{p.user.email}</span>
											</div>
										)}
										{p.user?.phone && (
											<div className="flex items-center gap-2 text-sm text-gray-600">
												<Phone className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
												<span>{p.user.phone}</span>
											</div>
										)}
									</div>
								</div>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Footer Info */}
			{pegawai.length > 0 && (
				<div className="mt-4 pt-4 border-t border-gray-200">
					<div className="flex items-center justify-between text-sm">
						<span className="text-gray-600">Total Pegawai</span>
						<span className="font-bold text-gray-800">{pegawai.length} orang</span>
					</div>
				</div>
			)}
		</div>
	);
};

export default DaftarPegawaiBidang;
