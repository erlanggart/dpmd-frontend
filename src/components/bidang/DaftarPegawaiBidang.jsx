import React, { useState, useEffect, useCallback } from 'react';
import { Users, Mail, Phone, RefreshCw, UserCircle, Search, Copy, Check, ChevronDown, Briefcase, Building2 } from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';
import { getAvatarUrl } from '../../utils/avatarUtils';

const DaftarPegawaiBidang = ({ bidangId, bidangName }) => {
	const [loading, setLoading] = useState(true);
	const [pegawai, setPegawai] = useState([]);
	const [allPegawai, setAllPegawai] = useState([]);
	const [showAll, setShowAll] = useState(false);
	const [searchTerm, setSearchTerm] = useState('');
	const [copiedNip, setCopiedNip] = useState(null);
	const [loadingAll, setLoadingAll] = useState(false);

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

	const fetchAllPegawai = useCallback(async () => {
		try {
			setLoadingAll(true);
			const response = await api.get(`/bidang/${bidangId}/pegawai`, { params: { all: true } });
			if (response.data.success) {
				setAllPegawai(response.data.data || []);
			}
		} catch (error) {
			console.error('Error fetching all pegawai:', error);
			toast.error('Gagal memuat data seluruh pegawai');
		} finally {
			setLoadingAll(false);
		}
	}, [bidangId]);

	useEffect(() => {
		fetchPegawai();
	}, [fetchPegawai]);

	useEffect(() => {
		if (showAll && allPegawai.length === 0) {
			fetchAllPegawai();
		}
	}, [showAll, allPegawai.length, fetchAllPegawai]);

	const handleCopyNip = (nip) => {
		if (!nip) return;
		navigator.clipboard.writeText(nip).then(() => {
			setCopiedNip(nip);
			toast.success('NIP disalin');
			setTimeout(() => setCopiedNip(null), 2000);
		}).catch(() => {
			toast.error('Gagal menyalin NIP');
		});
	};

	// Pimpinan diberi penanda gelap supaya terbaca sebagai jenjang, bukan warna acak.
	const getRoleColor = (role) => {
		const colors = {
			'kepala_dinas': 'bg-slate-900 text-white border-slate-900',
			'sekretaris_dinas': 'bg-slate-800 text-white border-slate-800',
			'kepala_bidang': 'bg-slate-100 text-slate-800 border-slate-200',
			'sekretaris': 'bg-slate-100 text-slate-800 border-slate-200',
			'koordinator': 'bg-slate-100 text-slate-800 border-slate-200',
			'ketua_tim': 'bg-slate-100 text-slate-800 border-slate-200',
			'bendahara': 'bg-emerald-50 text-emerald-700 border-emerald-100',
			'staff': 'bg-slate-50 text-slate-600 border-slate-200'
		};
		return colors[role] || 'bg-slate-50 text-slate-600 border-slate-200';
	};

	const getRoleLabel = (role) => {
		const labels = {
			'kepala_dinas': 'Kepala Dinas',
			'sekretaris_dinas': 'Sekretaris Dinas',
			'kepala_bidang': 'Kepala Bidang',
			'sekretaris': 'Sekretaris',
			'koordinator': 'Koordinator',
			'ketua_tim': 'Ketua Tim',
			'bendahara': 'Bendahara',
			'staff': 'Staff'
		};
		return labels[role] || role;
	};

	// Yang ditampilkan di badge adalah JABATAN pegawai kalau memang terdata.
	// Peran akun hanya dipakai sebagai cadangan supaya kolomnya tidak kosong —
	// dulu peran selalu yang dipakai, jadi Kepala Dinas terbaca "Staff".
	const getJabatanLabel = (p) => {
		const jabatan = (p.user?.jabatan || '').trim();
		return jabatan || getRoleLabel(p.role);
	};

	const getRoleOrder = (role) => {
		const orders = {
			'kepala_dinas': 1,
			'sekretaris_dinas': 2,
			'kepala_bidang': 3,
			'sekretaris': 4,
			'koordinator': 5,
			'ketua_tim': 6,
			'bendahara': 7,
			'staff': 8
		};
		return orders[role] || 99;
	};

	const currentList = showAll ? allPegawai : pegawai;
	const filteredList = currentList
		.filter((p) => {
			if (!searchTerm) return true;
			const q = searchTerm.toLowerCase();
			return (
				(p.user?.fullname || '').toLowerCase().includes(q) ||
				(p.user?.nip || '').toLowerCase().includes(q) ||
				(p.user?.jabatan || '').toLowerCase().includes(q) ||
				(p.user?.email || '').toLowerCase().includes(q) ||
				(p.user?.bidang_nama || '').toLowerCase().includes(q) ||
				(getRoleLabel(p.role) || '').toLowerCase().includes(q)
			);
		})
		.sort((a, b) => {
			const roleDiff = getRoleOrder(a.role) - getRoleOrder(b.role);
			if (roleDiff !== 0) return roleDiff;

			return (a.user?.fullname || '').localeCompare(b.user?.fullname || '', 'id-ID', {
				sensitivity: 'base'
			});
		});

	const PegawaiCard = ({ p }) => (
		<div className="group relative bg-white rounded-xl p-4 border border-gray-200 hover:border-purple-200 hover:shadow-md transition-all duration-200">
			<div className="flex items-start gap-3">
				{/* Avatar */}
				<div className="flex-shrink-0">
					{p.user?.avatar ? (
						<img
							src={getAvatarUrl(p.user.avatar)}
							alt={p.user?.fullname}
							className="h-12 w-12 rounded-xl object-cover border-2 border-white shadow-md"
						/>
					) : (
						<div className="h-12 w-12 bg-gradient-to-br from-purple-400 to-indigo-500 rounded-xl flex items-center justify-center shadow-md">
							<span className="text-white font-bold text-lg">
								{p.user?.fullname?.charAt(0).toUpperCase() || 'U'}
							</span>
						</div>
					)}
				</div>

				{/* Info */}
				<div className="flex-1 min-w-0">
					<div className="flex items-start justify-between gap-2 mb-1.5">
						<div className="flex-1 min-w-0">
							<h4 className="font-bold text-gray-800 text-sm truncate">
								{p.user?.fullname || 'Nama tidak tersedia'}
							</h4>
							{/* Peran akun hanya jadi baris pelengkap ketika jabatan resminya
							    terdata — badge di kanan sudah memuat jabatan itu, jadi tidak
							    perlu ditulis dua kali. */}
							{(p.user?.jabatan || '').trim() && (
								<p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
									<Briefcase className="h-3 w-3 flex-shrink-0" />
									{getRoleLabel(p.role)}
								</p>
							)}
						</div>
						<span
							title={getJabatanLabel(p)}
							className={`flex-shrink-0 max-w-[45%] truncate px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getRoleColor(p.role)}`}
						>
							{getJabatanLabel(p)}
						</span>
					</div>

					{/* NIP with copy */}
					{p.user?.nip && (
						<div className="flex items-center gap-1.5 mb-1.5">
							<span className="text-xs text-gray-600 font-mono bg-gray-50 px-2 py-0.5 rounded">
								NIP: {p.user.nip}
							</span>
							<button
								onClick={() => handleCopyNip(p.user.nip)}
								className="p-1 hover:bg-purple-50 rounded transition-colors"
								title="Salin NIP"
							>
								{copiedNip === p.user.nip ? (
									<Check className="h-3.5 w-3.5 text-green-500" />
								) : (
									<Copy className="h-3.5 w-3.5 text-gray-400 hover:text-purple-600" />
								)}
							</button>
						</div>
					)}

					{/* Contact & Details */}
					<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
						{p.user?.email && (
							<span className="flex items-center gap-1 truncate">
								<Mail className="h-3 w-3 flex-shrink-0" />
								{p.user.email}
							</span>
						)}
						{p.user?.phone && (
							<span className="flex items-center gap-1">
								<Phone className="h-3 w-3 flex-shrink-0" />
								{p.user.phone}
							</span>
						)}
						{showAll && p.user?.bidang_nama && (
							<span className="flex items-center gap-1 text-purple-600">
								<Building2 className="h-3 w-3 flex-shrink-0" />
								{p.user.bidang_nama}
							</span>
						)}
						{p.user?.golongan && (
							<span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[10px] font-medium">
								{p.user.golongan}{p.user.pangkat ? ` - ${p.user.pangkat}` : ''}
							</span>
						)}
						{p.user?.status_kepegawaian && (
							<span className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded text-[10px] font-medium">
								{p.user.status_kepegawaian.replace(/_/g, ' ')}
							</span>
						)}
					</div>
				</div>
			</div>
		</div>
	);

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
		<div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6">
			{/* Header */}
			<div className="flex items-center justify-between mb-4">
				<div className="flex items-center gap-3">
					<div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
						<Users className="h-5 w-5 text-white" />
					</div>
					<div>
						<h3 className="text-lg font-bold text-gray-800">Daftar Pegawai</h3>
						<p className="text-sm text-gray-500">{showAll ? 'Seluruh DPMD' : bidangName}</p>
					</div>
				</div>
				<button
					onClick={() => { showAll ? fetchAllPegawai() : fetchPegawai(); }}
					className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
					title="Refresh"
				>
					<RefreshCw className="h-4 w-4 text-gray-600" />
				</button>
			</div>

			{/* Toggle & Search */}
			<div className="flex flex-col sm:flex-row gap-3 mb-4">
				<button
					onClick={() => { setShowAll(!showAll); setSearchTerm(''); }}
					className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
						showAll
							? 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
							: 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
					}`}
				>
					<Building2 className="h-4 w-4" />
					{showAll ? 'Semua Pegawai DPMD' : 'Pegawai Bidang'}
					<ChevronDown className={`h-4 w-4 transition-transform ${showAll ? 'rotate-180' : ''}`} />
				</button>
				<div className="flex-1 relative">
					<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
					<input
						type="text"
						placeholder="Cari nama, NIP, jabatan..."
						value={searchTerm}
						onChange={(e) => setSearchTerm(e.target.value)}
						className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
					/>
				</div>
			</div>

			{/* Loading all */}
			{showAll && loadingAll ? (
				<div className="flex items-center justify-center py-12">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
				</div>
			) : filteredList.length === 0 ? (
				<div className="text-center py-12">
					<UserCircle className="h-16 w-16 text-gray-300 mx-auto mb-3" />
					<p className="text-gray-500">
						{searchTerm ? 'Tidak ada pegawai yang cocok' : 'Belum ada data pegawai'}
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{filteredList.map((p) => (
						<PegawaiCard key={p.id} p={p} />
					))}
				</div>
			)}

			{/* Footer */}
			{filteredList.length > 0 && (
				<div className="mt-4 pt-4 border-t border-gray-200">
					<div className="flex items-center justify-between text-sm">
						<span className="text-gray-600">
							{searchTerm
								? `${filteredList.length} dari ${currentList.length} pegawai`
								: 'Total Pegawai'}
						</span>
						<span className="font-bold text-gray-800">{filteredList.length} orang</span>
					</div>
				</div>
			)}
		</div>
	);
};

export default DaftarPegawaiBidang;
