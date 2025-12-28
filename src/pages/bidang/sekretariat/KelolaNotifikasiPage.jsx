import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaBell, FaPaperPlane, FaHistory, FaUsers, FaClock, FaCheckCircle, FaExclamationTriangle, FaPlay } from 'react-icons/fa';
import api from '../../../api';
import { toast } from 'react-hot-toast';

const KelolaNotifikasiPage = () => {
	const [activeTab, setActiveTab] = useState('send'); // send, history, settings
	const [loading, setLoading] = useState(false);
	const [statistics, setStatistics] = useState({
		totalSent: 0,
		totalSubscribers: 0,
		todaySchedules: 0,
		tomorrowSchedules: 0
	});

	// Form state untuk kirim notifikasi
	const [notificationForm, setNotificationForm] = useState({
		title: '',
		message: '',
		targetRoles: [],
		type: 'manual', // manual, schedule
		url: '/jadwal-kegiatan'
	});

	// History state
	const [notificationHistory, setNotificationHistory] = useState([]);
	const [historyLoading, setHistoryLoading] = useState(false);

	const roleOptions = [
		{ value: 'kepala_dinas', label: 'Kepala Dinas' },
		{ value: 'sekretaris_dinas', label: 'Sekretaris Dinas' },
		{ value: 'kepala_bidang', label: 'Kepala Bidang' },
		{ value: 'ketua_tim', label: 'Ketua Tim' },
		{ value: 'pegawai', label: 'Pegawai' }
	];

	useEffect(() => {
		loadStatistics();
		if (activeTab === 'history') {
			loadHistory();
		}
	}, [activeTab]);

	const loadStatistics = async () => {
		try {
			const response = await api.get('/push-notification/statistics');
			if (response.data.success) {
				setStatistics(response.data.data);
			}
		} catch (error) {
			console.error('Error loading statistics:', error);
		}
	};

	const loadHistory = async () => {
		setHistoryLoading(true);
		try {
			const response = await api.get('/push-notification/history');
			if (response.data.success) {
				setNotificationHistory(response.data.data);
			}
		} catch (error) {
			console.error('Error loading history:', error);
			toast.error('Gagal memuat riwayat notifikasi');
		} finally {
			setHistoryLoading(false);
		}
	};

	const handleRoleToggle = (roleValue) => {
		setNotificationForm(prev => {
			const roles = prev.targetRoles.includes(roleValue)
				? prev.targetRoles.filter(r => r !== roleValue)
				: [...prev.targetRoles, roleValue];
			return { ...prev, targetRoles: roles };
		});
	};

	const handleSendNotification = async () => {
		if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
			toast.error('Judul dan pesan harus diisi');
			return;
		}

		if (notificationForm.targetRoles.length === 0) {
			toast.error('Pilih minimal satu role penerima');
			return;
		}

		setLoading(true);
		try {
			const response = await api.post('/push-notification/send', {
				title: notificationForm.title,
				body: notificationForm.message,
				roles: notificationForm.targetRoles,
				data: {
					url: notificationForm.url,
					type: notificationForm.type
				}
			});

			if (response.data.success) {
				toast.success(`Notifikasi berhasil dikirim ke ${response.data.sentTo} pengguna`);
				setNotificationForm({
					title: '',
					message: '',
					targetRoles: [],
					type: 'manual',
					url: '/jadwal-kegiatan'
				});
				loadStatistics();
			}
		} catch (error) {
			console.error('Error sending notification:', error);
			toast.error(error.response?.data?.message || 'Gagal mengirim notifikasi');
		} finally {
			setLoading(false);
		}
	};

	const handleTestMorningReminder = async () => {
		setLoading(true);
		try {
			const response = await api.get('/cron/test-morning-reminder');
			if (response.data.success) {
				toast.success(`Test notifikasi pagi berhasil! Dikirim ke ${response.data.sentTo} pengguna`);
				loadStatistics();
			}
		} catch (error) {
			console.error('Error:', error);
			toast.error('Gagal mengirim test notifikasi');
		} finally {
			setLoading(false);
		}
	};

	const handleTestEveningReminder = async () => {
		setLoading(true);
		try {
			const response = await api.get('/cron/test-evening-reminder');
			if (response.data.success) {
				toast.success(`Test notifikasi malam berhasil! Dikirim ke ${response.data.sentTo} pengguna`);
				loadStatistics();
			}
		} catch (error) {
			console.error('Error:', error);
			toast.error('Gagal mengirim test notifikasi');
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 p-6">
			<div className="max-w-7xl mx-auto">
				{/* Header */}
				<div className="mb-8">
					<div className="flex items-center gap-3 mb-2">
						<FaBell className="text-3xl text-blue-600" />
						<h1 className="text-3xl font-bold text-gray-800">Kelola Notifikasi Push</h1>
					</div>
					<p className="text-gray-600">
						Kelola dan kirim notifikasi push ke pengguna aplikasi DPMD
					</p>
				</div>

				{/* Statistics Cards */}
				<div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						className="bg-white rounded-lg shadow-md p-6"
					>
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600 mb-1">Total Terkirim</p>
								<p className="text-2xl font-bold text-blue-600">{statistics.totalSent}</p>
							</div>
							<FaPaperPlane className="text-3xl text-blue-400" />
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1 }}
						className="bg-white rounded-lg shadow-md p-6"
					>
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600 mb-1">Subscriber Aktif</p>
								<p className="text-2xl font-bold text-green-600">{statistics.totalSubscribers}</p>
							</div>
							<FaUsers className="text-3xl text-green-400" />
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
						className="bg-white rounded-lg shadow-md p-6"
					>
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600 mb-1">Jadwal Hari Ini</p>
								<p className="text-2xl font-bold text-purple-600">{statistics.todaySchedules}</p>
							</div>
							<FaClock className="text-3xl text-purple-400" />
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
						className="bg-white rounded-lg shadow-md p-6"
					>
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600 mb-1">Jadwal Besok</p>
								<p className="text-2xl font-bold text-orange-600">{statistics.tomorrowSchedules}</p>
							</div>
							<FaClock className="text-3xl text-orange-400" />
						</div>
					</motion.div>
				</div>

				{/* Tabs */}
				<div className="bg-white rounded-lg shadow-md mb-6">
					<div className="flex border-b">
						<button
							onClick={() => setActiveTab('send')}
							className={`flex-1 py-4 px-6 font-medium transition-colors ${
								activeTab === 'send'
									? 'text-blue-600 border-b-2 border-blue-600'
									: 'text-gray-600 hover:text-gray-800'
							}`}
						>
							<FaPaperPlane className="inline mr-2" />
							Kirim Notifikasi
						</button>
						<button
							onClick={() => setActiveTab('test')}
							className={`flex-1 py-4 px-6 font-medium transition-colors ${
								activeTab === 'test'
									? 'text-blue-600 border-b-2 border-blue-600'
									: 'text-gray-600 hover:text-gray-800'
							}`}
						>
							<FaPlay className="inline mr-2" />
							Test Notifikasi
						</button>
						<button
							onClick={() => setActiveTab('history')}
							className={`flex-1 py-4 px-6 font-medium transition-colors ${
								activeTab === 'history'
									? 'text-blue-600 border-b-2 border-blue-600'
									: 'text-gray-600 hover:text-gray-800'
							}`}
						>
							<FaHistory className="inline mr-2" />
							Riwayat
						</button>
					</div>

					<div className="p-6">
						{/* Tab Content: Send Notification */}
						{activeTab === 'send' && (
							<div className="space-y-6">
								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Judul Notifikasi
									</label>
									<input
										type="text"
										value={notificationForm.title}
										onChange={(e) => setNotificationForm({ ...notificationForm, title: e.target.value })}
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										placeholder="Contoh: Informasi Penting"
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Pesan
									</label>
									<textarea
										value={notificationForm.message}
										onChange={(e) => setNotificationForm({ ...notificationForm, message: e.target.value })}
										rows="4"
										className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
										placeholder="Tulis pesan notifikasi..."
									/>
								</div>

								<div>
									<label className="block text-sm font-medium text-gray-700 mb-2">
										Target Penerima
									</label>
									<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
										{roleOptions.map((role) => (
											<button
												key={role.value}
												onClick={() => handleRoleToggle(role.value)}
												className={`px-4 py-3 rounded-lg border-2 transition-all ${
													notificationForm.targetRoles.includes(role.value)
														? 'border-blue-500 bg-blue-50 text-blue-700'
														: 'border-gray-300 hover:border-gray-400'
												}`}
											>
												{notificationForm.targetRoles.includes(role.value) && (
													<FaCheckCircle className="inline mr-2 text-blue-500" />
												)}
												{role.label}
											</button>
										))}
									</div>
								</div>

								<div className="flex gap-4">
									<button
										onClick={handleSendNotification}
										disabled={loading}
										className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
									>
										{loading ? 'Mengirim...' : 'Kirim Notifikasi'}
									</button>
								</div>
							</div>
						)}

						{/* Tab Content: Test Notifications */}
						{activeTab === 'test' && (
							<div className="space-y-6">
								<div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
									<div className="flex">
										<FaExclamationTriangle className="text-yellow-400 mt-1" />
										<div className="ml-3">
											<p className="text-sm text-yellow-700">
												<strong>Test Mode:</strong> Tombol ini akan mengirim notifikasi jadwal ke semua user yang subscribe.
												Gunakan untuk testing fitur notifikasi otomatis.
											</p>
										</div>
									</div>
								</div>

								<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
									<div className="border border-gray-200 rounded-lg p-6">
										<div className="flex items-center gap-3 mb-4">
											<div className="bg-orange-100 p-3 rounded-full">
												<FaClock className="text-2xl text-orange-600" />
											</div>
											<div>
												<h3 className="font-semibold text-lg">Morning Reminder (07:00)</h3>
												<p className="text-sm text-gray-600">Notifikasi jadwal hari ini</p>
											</div>
										</div>
										<button
											onClick={handleTestMorningReminder}
											disabled={loading}
											className="w-full bg-orange-600 text-white px-6 py-3 rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{loading ? 'Mengirim...' : 'Test Morning Reminder'}
										</button>
									</div>

									<div className="border border-gray-200 rounded-lg p-6">
										<div className="flex items-center gap-3 mb-4">
											<div className="bg-purple-100 p-3 rounded-full">
												<FaClock className="text-2xl text-purple-600" />
											</div>
											<div>
												<h3 className="font-semibold text-lg">Evening Reminder (21:00)</h3>
												<p className="text-sm text-gray-600">Notifikasi jadwal besok</p>
											</div>
										</div>
										<button
											onClick={handleTestEveningReminder}
											disabled={loading}
											className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{loading ? 'Mengirim...' : 'Test Evening Reminder'}
										</button>
									</div>
								</div>

								<div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-6">
									<p className="text-sm text-blue-700">
										<strong>Jadwal Otomatis:</strong> Sistem akan mengirim notifikasi secara otomatis setiap hari pada jam 07:00 (jadwal hari ini) dan 21:00 (jadwal besok).
									</p>
								</div>
							</div>
						)}

						{/* Tab Content: History */}
						{activeTab === 'history' && (
							<div>
								{historyLoading ? (
									<div className="text-center py-12">
										<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
										<p className="text-gray-600 mt-4">Memuat riwayat...</p>
									</div>
								) : notificationHistory.length === 0 ? (
									<div className="text-center py-12">
										<FaHistory className="text-6xl text-gray-300 mx-auto mb-4" />
										<p className="text-gray-600">Belum ada riwayat notifikasi</p>
									</div>
								) : (
									<div className="space-y-4">
										{notificationHistory.map((item, index) => (
											<div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
												<div className="flex items-start justify-between">
													<div className="flex-1">
														<h4 className="font-semibold text-gray-800">{item.title}</h4>
														<p className="text-sm text-gray-600 mt-1">{item.body}</p>
														<div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
															<span className="flex items-center gap-1">
																<FaUsers />
																{item.sentTo} penerima
															</span>
															<span className="flex items-center gap-1">
																<FaClock />
																{new Date(item.createdAt).toLocaleString('id-ID')}
															</span>
														</div>
													</div>
													<div className={`px-3 py-1 rounded-full text-xs font-medium ${
														item.success
															? 'bg-green-100 text-green-700'
															: 'bg-red-100 text-red-700'
													}`}>
														{item.success ? 'Berhasil' : 'Gagal'}
													</div>
												</div>
											</div>
										))}
									</div>
								)}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export default KelolaNotifikasiPage;
