import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LuPrinter, LuGauge, LuDollarSign, LuCalendar, LuFuel, LuUser, LuClock, LuCheck, LuLock } from "react-icons/lu";
import Swal from "sweetalert2";
import printerService from "../services/printer";

const CetakBonBensin = () => {
	const navigate = useNavigate();
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [passwordInput, setPasswordInput] = useState("");
	const CORRECT_PASSWORD = "bahlil";

	// Check authentication on mount
	useEffect(() => {
		const authStatus = sessionStorage.getItem('cetakBonAuth');
		if (authStatus === 'true') {
			setIsAuthenticated(true);
		}
	}, []);

	// Handle password submission
	const handlePasswordSubmit = (e) => {
		e.preventDefault();
		
		if (passwordInput === CORRECT_PASSWORD) {
			sessionStorage.setItem('cetakBonAuth', 'true');
			setIsAuthenticated(true);
			setPasswordInput("");
			Swal.fire({
				icon: 'success',
				title: 'Berhasil!',
				text: 'Password benar',
				timer: 1500,
				showConfirmButton: false,
			});
		} else {
			Swal.fire({
				icon: 'error',
				title: 'Password Salah!',
				text: 'Anda akan dikembalikan ke dashboard',
				timer: 1500,
				showConfirmButton: false,
			}).then(() => {
				navigate('/dashboard');
			});
		}
	};

	// Load from localStorage or use defaults
	const getInitialFormData = () => {
		const saved = localStorage.getItem('cetakBonBensinForm');
		if (saved) {
			const parsed = JSON.parse(saved);
			// Keep semua data termasuk tanggal & waktu, hanya reset yang calculated
			return {
				...parsed,
				liter: "", // Reset liter karena calculated field
				totalHarga: "", // Reset total untuk transaksi baru
				nomorTransaksi: "", // Reset nomor transaksi
				waktuDetik: parsed.waktuDetik || "00", // Keep detik atau default 00
			};
		}
		return {
			tanggal: new Date().toISOString().split('T')[0],
			waktu: new Date().toTimeString().slice(0, 5),
			waktuDetik: "00",
			jenisBensin: "Pertalite",
			liter: "",
			hargaPerLiter: "10000",
			totalHarga: "",
			platNomor: "",
			namaPetugas: "",
			nomorPompa: "",
			nomorTransaksi: "",
			shift: "",
		};
	};

	const [formData, setFormData] = useState(getInitialFormData);

	// Save to localStorage whenever formData changes
	useEffect(() => {
		localStorage.setItem('cetakBonBensinForm', JSON.stringify(formData));
	}, [formData]);

	const jenisBensinOptions = [
		{ value: "Pertalite", harga: 10000 },
		{ value: "Pertamax", harga: 12200 },
		{ value: "Pertamax Turbo", harga: 13900 },
		{ value: "Dexlite", harga: 11550 },
		{ value: "Pertamina Dex", harga: 13350 },
	];

	const handleInputChange = (e) => {
		const { name, value } = e.target;
		let newFormData = { ...formData, [name]: value };

		// Auto calculate liter when total harga or harga per liter changes
		if (name === "totalHarga" || name === "hargaPerLiter") {
			const total = parseFloat(name === "totalHarga" ? value : formData.totalHarga) || 0;
			const harga = parseFloat(name === "hargaPerLiter" ? value : formData.hargaPerLiter) || 0;
			if (harga > 0) {
				newFormData.liter = (total / harga).toFixed(2);
			} else {
				newFormData.liter = "0.00";
			}
		}

		// Update price when jenis bensin changes
		if (name === "jenisBensin") {
			const selectedBensin = jenisBensinOptions.find(b => b.value === value);
			if (selectedBensin) {
				newFormData.hargaPerLiter = selectedBensin.harga.toString();
				const total = parseFloat(formData.totalHarga) || 0;
				if (selectedBensin.harga > 0) {
					newFormData.liter = (total / selectedBensin.harga).toFixed(2);
				}
			}
		}

		// Add random seconds when waktu changes
		if (name === "waktu") {
			const randomSeconds = Math.floor(Math.random() * 60).toString().padStart(2, '0');
			newFormData.waktuDetik = randomSeconds;
		}

		setFormData(newFormData);
	};

	const formatRupiah = (angka) => {
		return new Intl.NumberFormat("id-ID", {
			style: "currency",
			currency: "IDR",
			minimumFractionDigits: 0,
		}).format(angka);
	};

	const formatRupiahBon = (angka) => {
		// Format seperti bon: RP. 12,200
		const formatted = Math.round(angka).toLocaleString('id-ID');
		return `RP. ${formatted}`;
	};

	const generateNomorTransaksi = () => {
		// Format: 401xxxx (7 digit, starts with 401)
		const randomPart = Math.floor(1000 + Math.random() * 9000); // 4 digit random
		return `401${randomPart}`;
	};

	const showPreview = () => {
		const noTrans = formData.nomorTransaksi || generateNomorTransaksi();
		const tanggalFormat = new Date(formData.tanggal + 'T' + formData.waktu).toLocaleString('id-ID', {
			day: '2-digit',
			month: '2-digit', 
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit',
			hour12: false
		}).replace(',', '');

		const shiftInfo = formData.shift ? `Shift ${formData.shift} ` : '';
		const nopolInfo = formData.platNomor ? `Nopol:${formData.platNomor} ` : '';
		const totalStr = Math.round(formData.totalHarga).toLocaleString('id-ID');

		const previewHTML = `
			<div style="
				font-family: 'Courier New', monospace;
				font-size: 9px;
				line-height: 1.2;
				width: 58mm;
				background: white;
				padding: 5mm;
				margin: auto;
				border: 1px solid #ccc;
				box-shadow: 0 2px 8px rgba(0,0,0,0.1);
			">
				<!-- Header -->
				<div style="text-align: center; margin-bottom: 2px;">
					<img src="/pertamina-logo.png" alt="PERTAMINA" style="height: 18px; margin-bottom: 2px; display: block; margin-left: auto; margin-right: auto;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
					<div style="display: none; font-weight: bold; font-size: 10px;">PERTAMINA</div>
					<div style="font-size: 8px; margin-top: 1px;">3416930</div>
					<div style="font-weight: bold; margin: 2px 0; font-size: 9px;">${noTrans}</div>
					<div style="font-size: 7px;">DPMD KAB. BOGOR</div>
					<div style="font-size: 7px;">JL. TEGAR BERIMAN NO. 43</div>
				</div>
				
				<div style="margin: 2px 0;"></div>
				
				<!-- Transaction Info -->
				<div style="text-align: left; font-size: 8px;">
					<div>${shiftInfo}${nopolInfo}No Trans:${noTrans}</div>
					<div>Waktu:${tanggalFormat}</div>
					<div>--------------------------------</div>
					${formData.nomorPompa ? `<div>Pulau/Pompa:${formData.nomorPompa}</div>` : ''}
					<div>Nama Produk:${formData.jenisBensin.toUpperCase()}</div>
					<div>Harga/Liter:${formatRupiahBon(formData.hargaPerLiter)}</div>
					<div>Volume:(L) ${formData.liter}</div>
					<div>Total Harga:${formatRupiahBon(formData.totalHarga)}</div>
					${formData.namaPetugas ? `<div>Operator:${formData.namaPetugas.toUpperCase()}</div>` : ''}
					<div>--------------------------------</div>
					<div>CASH${' '.repeat(Math.max(0, 28 - totalStr.length))}${totalStr}</div>
					<div>--------------------------------</div>
				</div>
			</div>
		`;

		return { html: previewHTML, noTrans };
	};

	const generateESCPOS = async () => {
		const ESC = '\x1B';
		const GS = '\x1D';
		const CENTER = ESC + 'a1';
		const LEFT = ESC + 'a0';
		
		// Font A (default, ukuran standar - tidak terlalu besar, tidak terlalu kecil)
		const FONT_A = ESC + 'M0';
		
		// Condensed mode (font lebih tipis dan ramping)
		const CONDENSED_ON = ESC + '\x0F';  // atau ESC + SI
		
		// Double width untuk kode SPBU
		const DOUBLE_WIDTH = GS + '!' + '\x10';  // 2x width
		const NORMAL_SIZE = GS + '!' + '\x00';  // normal size
		
		// Line spacing normal (30 dots - lebih nyaman dibaca)
		const LINE_SPACING_NORMAL = ESC + '3' + '\x1E';  // 30 dots
		
		const CUT = GS + 'V1';
		const LINE = '--------------------------------';

		const noTrans = formData.nomorTransaksi || generateNomorTransaksi();
		
		// Format tanggal dan waktu dengan detik random
		const dateObj = new Date(formData.tanggal + 'T' + formData.waktu);
		const detik = formData.waktuDetik || "00";
		
		const day = dateObj.getDate().toString().padStart(2, '0');
		const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
		const year = dateObj.getFullYear();
		const hours = dateObj.getHours().toString().padStart(2, '0');
		const minutes = dateObj.getMinutes().toString().padStart(2, '0');
		
		const tanggalFormat = `${day}/${month}/${year} ${hours}:${minutes}:${detik}`;

		let receipt = '';
		
		// Initialize dengan Font A (standar) + Condensed
		receipt += ESC + '@';  // Initialize
		receipt += FONT_A;  // Font A (ukuran standar)
		receipt += CONDENSED_ON;  // Font lebih tipis/ramping
		receipt += LINE_SPACING_NORMAL;  // Line spacing normal
		
		// Header - Margin atas agar tidak terlalu dekat dengan batas kertas
		receipt += '\n\n\n';
		
		// Logo Pertamina (jika berhasil di-convert)
		receipt += CENTER;
		try {
			const logoResult = await printerService.convertImageToBitmap('/pertamina-logo.png', 180);
			if (logoResult.success && logoResult.bitmapCommand) {
				receipt += logoResult.bitmapCommand;
				receipt += '\n';
			}
		} catch (error) {
			console.error('Logo conversion failed:', error);
			// Fallback ke text jika gagal
			receipt += 'PERTAMINA\n';
		}
		
		receipt += DOUBLE_WIDTH;  // Perbesar kode SPBU
		receipt += '3416930\n';
		receipt += NORMAL_SIZE;  // Kembali normal
		receipt += 'SPBU RAYA PEMDA CIBINONG\n';
		receipt += 'JL. RAYA PEMDA CIBINONG\n';
		receipt += '\n';
		
		// Info Shift, Nopol, Trans (No Trans di kanan)
		receipt += LEFT;
		const shiftInfo = formData.shift ? `Shift ${formData.shift} ` : '';
		const nopolInfo = formData.platNomor ? `Nopol:${formData.platNomor} ` : '';
		const leftInfo = `${shiftInfo}${nopolInfo}`.trim();
		const rightInfo = `No Trans:${noTrans}`;
		const totalWidth = 32; // lebar standar thermal 58mm
		const spacing = Math.max(1, totalWidth - leftInfo.length - rightInfo.length);
		receipt += leftInfo + ' '.repeat(spacing) + rightInfo + '\n';
		receipt += `Waktu:${tanggalFormat}\n`;
		receipt += LINE + '\n';
		
		// Detail Transaksi (alignment titik dua)
		if (formData.nomorPompa) {
			receipt += `Pulau/Pompa   : ${formData.nomorPompa}\n`;
		}
		receipt += `Nama Produk   : ${formData.jenisBensin.toUpperCase()}\n`;
		receipt += `Harga/Liter   : ${formatRupiahBon(formData.hargaPerLiter)}\n`;
		receipt += `Volume        : (L) ${formData.liter}\n`;
		receipt += `Total Harga   : ${formatRupiahBon(formData.totalHarga)}\n`;
		
		if (formData.namaPetugas) {
			receipt += `Operator      : ${formData.namaPetugas.toUpperCase()}\n`;
		}
		receipt += LINE + '\n';
		
		// Payment Info
		const totalStr = Math.round(formData.totalHarga).toLocaleString('id-ID');
		const spaces = 32 - 4 - totalStr.length;
		receipt += `CASH${' '.repeat(Math.max(0, spaces))}${totalStr}\n`;
		receipt += LINE + '\n';
		
		// Cut paper
		receipt += '\n\n';
		receipt += CUT;
		
		return receipt;
	};

	const handlePrintThermal = async () => {
		if (!formData.totalHarga || parseFloat(formData.totalHarga) <= 0) {
			Swal.fire({
				icon: 'warning',
				title: 'Perhatian',
				text: 'Mohon isi total harga!',
			});
			return;
		}

		// Show preview first
		const { html: previewHTML, noTrans } = showPreview();
		
		const result = await Swal.fire({
			title: 'Preview Bon (58mm)',
			html: previewHTML,
			width: 400,
			showCancelButton: true,
			confirmButtonText: '🖨️ Cetak ke Printer',
			confirmButtonColor: '#10b981',
			cancelButtonText: 'Batal',
			cancelButtonColor: '#6b7280',
		});

		if (!result.isConfirmed) return;

		// Update nomor transaksi if generated
		if (!formData.nomorTransaksi) {
			setFormData({ ...formData, nomorTransaksi: noTrans });
		}

		try {
			// Show loading
			Swal.fire({
				title: 'Mencetak...',
				text: 'Memproses logo dan mengirim ke printer...',
				allowOutsideClick: false,
				didOpen: () => {
					Swal.showLoading();
				},
			});

			// Generate ESC/POS data (async karena ada image processing)
			const escposData = await generateESCPOS();

			// Send to backend for printing
			await printerService.printToBluetooth(escposData);

			// Show success message
			Swal.fire({
				icon: 'success',
				title: 'Berhasil!',
				text: 'Bon berhasil dicetak',
				timer: 2000,
			});

			// Reset only transaction-specific fields, keep others in localStorage
			setFormData({
				...formData,
				totalHarga: "",
				liter: "",
				nomorTransaksi: "",
			});

		} catch (error) {
			console.error('Print error:', error);
			
			let errorMessage = 'Terjadi kesalahan saat mencetak';
			
			if (error.message) {
				errorMessage = error.message;
			}
			
			// Show specific error based on error code
			if (error.error) {
				if (error.error.includes('ENOENT')) {
					errorMessage = 'Printer Bluetooth tidak ditemukan. Pastikan printer terhubung di /dev/rfcomm0';
				} else if (error.error.includes('EACCES')) {
					errorMessage = 'Tidak ada izin akses printer. Hubungi administrator untuk mengatur permission.';
				}
			}

			Swal.fire({
				icon: 'error',
				title: 'Gagal Mencetak',
				text: errorMessage,
			});
		}
	};

	const resetForm = () => {
		setFormData({
			tanggal: new Date().toISOString().split('T')[0],
			waktu: new Date().toTimeString().slice(0, 5),
			jenisBensin: "Pertalite",
			liter: "",
			hargaPerLiter: "10000",
			totalHarga: "",
			platNomor: "",
			namaPetugas: "",
			nomorPompa: "",
			nomorTransaksi: "",
			shift: "",
		});
	};

	// If not authenticated, show password form
	if (!isAuthenticated) {
		return (
			<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
				<div className="max-w-md w-full">
					<div className="bg-white rounded-2xl shadow-xl p-8">
						<div className="flex flex-col items-center mb-6">
							<div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4">
								<LuLock className="w-12 h-12 text-white" />
							</div>
							<h1 className="text-2xl font-bold text-gray-800 mb-2">Halaman Terlindungi</h1>
							<p className="text-sm text-gray-500 text-center">Masukkan password untuk mengakses Halaman</p>
						</div>

						<form onSubmit={handlePasswordSubmit}>
							<div className="mb-6">
								<label className="block text-sm font-semibold text-gray-700 mb-2">
									Password
								</label>
								<input
									type="password"
									value={passwordInput}
									onChange={(e) => setPasswordInput(e.target.value)}
									placeholder="Masukkan password"
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
									autoFocus
									required
								/>
							</div>

							<button
								type="submit"
								className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
							>
								<LuCheck className="w-5 h-5" />
								Masuk
							</button>

							<button
								type="button"
								onClick={() => navigate('/dashboard')}
								className="w-full mt-3 px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
							>
								Kembali ke Dashboard
							</button>
						</form>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
			<div className="max-w-2xl mx-auto">
				{/* Header */}
				<div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
					<div className="flex items-center justify-center space-x-3 mb-4">
						<div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
							<LuPrinter className="w-8 h-8 text-white" />
						</div>
						<div>
							<h1 className="text-3xl font-bold text-gray-800">Cetak Bon Bensin</h1>
							<p className="text-sm text-gray-500">EPPOS EPX588 Thermal Printer</p>
						</div>
					</div>
				</div>

				{/* Form */}
				<div className="bg-white rounded-2xl shadow-xl p-6">
					<div className="space-y-4">
						{/* Date & Time */}
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-semibold text-gray-700 mb-2">
									<LuCalendar className="inline w-4 h-4 mr-1" />
									Tanggal
								</label>
								<input
									type="date"
									name="tanggal"
									value={formData.tanggal}
									onChange={handleInputChange}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>
							<div>
								<label className="block text-sm font-semibold text-gray-700 mb-2">
									<LuClock className="inline w-4 h-4 mr-1" />
									Waktu
								</label>
								<input
									type="time"
									name="waktu"
									value={formData.waktu}
									onChange={handleInputChange}
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>
						</div>

						{/* Jenis Bensin */}
						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">
								<LuFuel className="inline w-4 h-4 mr-1" />
								Jenis Bensin
							</label>
							<select
								name="jenisBensin"
								value={formData.jenisBensin}
								onChange={handleInputChange}
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							>
								{jenisBensinOptions.map((bensin) => (
									<option key={bensin.value} value={bensin.value}>
										{bensin.value} - {formatRupiah(bensin.harga)}/L
									</option>
								))}
							</select>
						</div>

						{/* Total Harga - Input */}
						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">
								<LuDollarSign className="inline w-4 h-4 mr-1" />
								Total Harga
							</label>
							<input
								type="number"
								name="totalHarga"
								value={formData.totalHarga}
								onChange={handleInputChange}
								placeholder="Masukkan total harga"
								min="0"
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>

						{/* Harga Per Liter */}
						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">
								<LuDollarSign className="inline w-4 h-4 mr-1" />
								Harga per Liter
							</label>
							<input
								type="number"
								name="hargaPerLiter"
								value={formData.hargaPerLiter}
								onChange={handleInputChange}
								placeholder="Harga per liter"
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
							/>
						</div>

						{/* Liter - Read Only (Auto calculated) */}
						<div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-200">
							<label className="block text-sm font-semibold text-gray-700 mb-2">
								<LuGauge className="inline w-4 h-4 mr-1" />
								Jumlah Liter (Otomatis)
							</label>
							<div className="text-3xl font-bold text-green-600">
								{formData.liter ? `${formData.liter} L` : "0.00 L"}
							</div>
						</div>

						{/* Info Tambahan */}
						<div className="grid grid-cols-3 gap-4">
							<div>
								<label className="block text-sm font-semibold text-gray-700 mb-2">
									Shift (opsional)
								</label>
								<input
									type="text"
									name="shift"
									value={formData.shift}
									onChange={handleInputChange}
									placeholder="1"
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>
							<div className="col-span-2">
								<label className="block text-sm font-semibold text-gray-700 mb-2">
									Plat Nomor (opsional)
								</label>
								<input
									type="text"
									name="platNomor"
									value={formData.platNomor}
									onChange={handleInputChange}
									placeholder="F 1234 AB"
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
								/>
							</div>
						</div>

						{/* Nomor Transaksi & Pompa */}
						<div className="grid grid-cols-2 gap-4">
							<div>
								<label className="block text-sm font-semibold text-gray-700 mb-2">
									No. Transaksi (opsional)
								</label>
								<input
									type="text"
									name="nomorTransaksi"
									value={formData.nomorTransaksi}
									onChange={handleInputChange}
									placeholder="Auto generate"
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>
							<div>
								<label className="block text-sm font-semibold text-gray-700 mb-2">
									Pulau/Pompa (opsional)
								</label>
								<input
									type="text"
									name="nomorPompa"
									value={formData.nomorPompa}
									onChange={handleInputChange}
									placeholder="1"
									className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
								/>
							</div>
						</div>

						{/* Nama Operator/Petugas */}
						<div>
							<label className="block text-sm font-semibold text-gray-700 mb-2">
								<LuUser className="inline w-4 h-4 mr-1" />
								Operator (opsional)
							</label>
							<input
								type="text"
								name="namaPetugas"
								value={formData.namaPetugas}
								onChange={handleInputChange}
								placeholder="Nama operator"
								className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
							/>
						</div>

						{/* Action Buttons */}
						<div className="flex gap-3 pt-4">
							<button
								onClick={handlePrintThermal}
								className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
							>
								<LuPrinter className="w-5 h-5" />
								Cetak Bon
							</button>
							<button
								onClick={resetForm}
								className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors"
							>
								Reset
							</button>
						</div>
					</div>
				</div>

				{/* Info Box */}
				<div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
					<h3 className="font-semibold text-blue-900 mb-2">📌 Petunjuk Penggunaan:</h3>
					<ul className="text-sm text-blue-800 space-y-1">
						<li>• Pastikan printer EPPOS EPX588 sudah terhubung via USB</li>
						<li>• Izinkan akses USB saat browser meminta permission</li>
						<li>• Jika printer tidak terdeteksi, gunakan opsi "Preview" untuk print via browser</li>
						<li>• Lebar kertas thermal: 58mm (standar)</li>
					</ul>
				</div>
			</div>
		</div>
	);
};

export default CetakBonBensin;
