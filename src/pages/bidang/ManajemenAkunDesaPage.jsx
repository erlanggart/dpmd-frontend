// src/pages/bidang/ManajemenAkunDesaPage.jsx
//
// Staf bidang DPMD membuatkan akun operator desa.
//
// Halaman ini TIDAK punya daftar fitur sendiri. Katalog hak akses datang dari
// GET /bidang/akun-desa/meta, yang sudah disaring server sesuai bidang si
// pengguna — jadi satu berkas ini melayani PMD, SPKED, KKD, dan Pemdes tanpa
// percabangan per bidang. Menambah fitur desa baru cukup di
// backend/src/config/bidangDesaPermissions.js; halaman ini ikut sendiri.
//
// Alurnya sengaja dibuat bertahap "pilih desa dulu, baru kelola akunnya":
// tanpa itu staf dihadapkan pada ribuan akun se-kabupaten sekaligus, dan yang
// paling sering ia butuhkan — melihat apakah desa X sudah punya operator —
// justru paling sulit dijawab.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import api from "../../api";
import {
	FiAlertCircle,
	FiCheck,
	FiEdit2,
	FiEye,
	FiEyeOff,
	FiLock,
	FiMapPin,
	FiPlus,
	FiPower,
	FiSearch,
	FiShield,
	FiUserCheck,
	FiUsers,
	FiX,
} from "react-icons/fi";

const formKosong = {
	name: "",
	email: "",
	password: "",
	jabatan_desa: "",
	no_hp: "",
	is_active: true,
	permissions: [],
};

// Contoh bagian/jabatan untuk mempercepat pengisian; tetap boleh diketik bebas.
const JABATAN_SARAN = [
	"Operator",
	"Kesejahteraan",
	"Pemerintahan",
	"Pembangunan",
	"Pelayanan",
	"Keuangan",
	"Perencanaan",
	"Umum & Tata Usaha",
];

const pesanError = (error, cadangan) =>
	error?.response?.data?.message || error?.message || cadangan;

/** Sandi acak yang mudah dibacakan lewat telepon — tanpa karakter yang mirip (0/O, 1/l). */
const buatSandi = () => {
	const huruf = "abcdefghjkmnpqrstuvwxyz";
	const angka = "23456789";
	let hasil = "";
	for (let i = 0; i < 4; i += 1) hasil += huruf[Math.floor(Math.random() * huruf.length)];
	for (let i = 0; i < 4; i += 1) hasil += angka[Math.floor(Math.random() * angka.length)];
	return hasil;
};

const ManajemenAkunDesaPage = () => {
	const [meta, setMeta] = useState(null);
	const [desas, setDesas] = useState([]);
	const [memuatAwal, setMemuatAwal] = useState(true);
	const [galatAwal, setGalatAwal] = useState(null);

	const [kecamatanId, setKecamatanId] = useState("");
	const [desaId, setDesaId] = useState("");
	const [cari, setCari] = useState("");

	const [akun, setAkun] = useState([]);
	const [memuatAkun, setMemuatAkun] = useState(false);

	// Kondisi desa terpilih: siapa yang sudah memegang fitur bidang ini.
	const [ringkasan, setRingkasan] = useState(null);
	const [memuatRingkasan, setMemuatRingkasan] = useState(false);

	const [modalTerbuka, setModalTerbuka] = useState(false);
	const [akunDiubah, setAkunDiubah] = useState(null); // null = mode tambah
	const [form, setForm] = useState(formKosong);
	const [tampilSandi, setTampilSandi] = useState(false);
	const [menyimpan, setMenyimpan] = useState(false);

	const katalog = meta?.catalog || [];
	const labelPermission = useMemo(() => {
		const peta = new Map();
		(meta?.catalog_lengkap || []).forEach((p) => peta.set(p.key, p.label));
		return peta;
	}, [meta]);

	// ── Muat data awal ────────────────────────────────────────────────────────
	useEffect(() => {
		let batal = false;

		(async () => {
			try {
				// Daftar desa dipakai bersama seluruh aplikasi (location.routes.js).
				// include_kelurahan wajib: kelurahan juga memakai halaman desa.
				const [metaRes, desaRes] = await Promise.all([
					api.get("/bidang/akun-desa/meta"),
					api.get("/desas", { params: { include_kelurahan: 1 } }),
				]);
				if (batal) return;
				setMeta(metaRes.data?.data || null);
				setDesas(desaRes.data?.data || []);
			} catch (error) {
				if (batal) return;
				setGalatAwal(pesanError(error, "Tidak dapat memuat data awal."));
			} finally {
				if (!batal) setMemuatAwal(false);
			}
		})();

		return () => {
			batal = true;
		};
	}, []);

	const kecamatans = useMemo(() => {
		const peta = new Map();
		desas.forEach((d) => {
			if (d.kecamatans && !peta.has(String(d.kecamatan_id))) {
				peta.set(String(d.kecamatan_id), { id: String(d.kecamatan_id), nama: d.kecamatans.nama });
			}
		});
		return [...peta.values()].sort((a, b) => a.nama.localeCompare(b.nama));
	}, [desas]);

	const desaTerpilih = useMemo(
		() => desas.find((d) => String(d.id) === String(desaId)) || null,
		[desas, desaId],
	);

	const desaSeKecamatan = useMemo(
		() => desas.filter((d) => String(d.kecamatan_id) === String(kecamatanId)),
		[desas, kecamatanId],
	);

	// ── Muat akun ─────────────────────────────────────────────────────────────
	const muatAkun = useCallback(async () => {
		setMemuatAkun(true);
		try {
			const params = {};
			if (desaId) params.desa_id = desaId;
			else if (kecamatanId) params.kecamatan_id = kecamatanId;
			if (cari.trim()) params.q = cari.trim();

			const res = await api.get("/bidang/akun-desa/users", { params });
			setAkun(res.data?.data || []);
		} catch (error) {
			Swal.fire({
				icon: "error",
				title: "Gagal memuat akun",
				text: pesanError(error, "Terjadi kesalahan."),
			});
		} finally {
			setMemuatAkun(false);
		}
	}, [desaId, kecamatanId, cari]);

	useEffect(() => {
		if (memuatAwal || galatAwal) return;
		// Tunda sebentar supaya mengetik di kotak cari tidak memicu request per huruf.
		const timer = setTimeout(muatAkun, cari ? 400 : 0);
		return () => clearTimeout(timer);
	}, [muatAkun, memuatAwal, galatAwal, cari]);

	/**
	 * Tarik kondisi desa terpilih.
	 *
	 * Inilah langkah "lihat dulu, baru buat": selama ini belum dijalankan,
	 * tombol Tambah Akun tidak boleh dipakai — kalau tidak, staf bisa membuat
	 * operator kedua untuk desa yang sebenarnya sudah punya.
	 */
	const muatRingkasan = useCallback(async () => {
		if (!desaId) {
			setRingkasan(null);
			return;
		}
		setMemuatRingkasan(true);
		try {
			const res = await api.get(`/bidang/akun-desa/desa/${desaId}/ringkasan`);
			setRingkasan(res.data?.data || null);
		} catch (error) {
			setRingkasan(null);
			Swal.fire({
				icon: "error",
				title: "Gagal memeriksa desa",
				text: pesanError(error, "Tidak dapat memastikan apakah desa ini sudah punya operator."),
			});
		} finally {
			setMemuatRingkasan(false);
		}
	}, [desaId]);

	useEffect(() => {
		if (memuatAwal || galatAwal) return;
		muatRingkasan();
	}, [muatRingkasan, memuatAwal, galatAwal]);

	// ── Aksi ──────────────────────────────────────────────────────────────────
	const bukaTambah = async () => {
		if (!desaId) {
			Swal.fire({
				icon: "info",
				title: "Pilih desa dulu",
				text: "Akun operator selalu melekat pada satu desa, jadi desanya harus ditentukan lebih dulu.",
			});
			return;
		}

		// Kondisi desa belum selesai ditarik — jangan biarkan form terbuka, karena
		// justru pemeriksaan inilah yang mencegah akun ganda.
		if (memuatRingkasan || !ringkasan) {
			Swal.fire({
				icon: "info",
				title: "Sedang memeriksa desa ini",
				text: "Tunggu sebentar sampai daftar operator yang sudah ada selesai dimuat.",
			});
			return;
		}

		// Sudah ada operator aktif: tahan di sini, tawarkan mengubah yang ada.
		// Penjaga sebenarnya tetap di server (409) — ini supaya staf tidak perlu
		// mengisi form panjang lebih dulu untuk kemudian ditolak.
		const aktifSudahPegang = ringkasan.sudah_pegang.filter((u) => u.is_active);
		if (aktifSudahPegang.length > 0) {
			const lanjut = await Swal.fire({
				icon: "warning",
				title: "Desa ini sudah punya operator",
				html:
					`<div style="text-align:left;font-size:14px">` +
					aktifSudahPegang
						.map((u) => `<p style="margin:0 0 4px"><b>${u.name}</b> — ${u.email}</p>`)
						.join("") +
					`<p style="margin:10px 0 0;color:#64748b;font-size:12.5px">Sebaiknya ubah akun yang ada daripada menambah akun kedua untuk pekerjaan yang sama.</p>` +
					`</div>`,
				showCancelButton: true,
				confirmButtonText: "Tetap buat baru",
				cancelButtonText: "Batal",
				confirmButtonColor: "#b45309",
			});
			if (!lanjut.isConfirmed) return;
		}

		setAkunDiubah(null);
		// Seluruh fitur bidang dicentang sejak awal: itu memang alasan staf
		// membuat akun ini. Mengosongkannya hanya menambah satu langkah wajib.
		setForm({ ...formKosong, password: buatSandi(), permissions: katalog.map((p) => p.key) });
		setTampilSandi(true);
		setModalTerbuka(true);
	};

	/**
	 * Tambahkan fitur bidang ini ke akun desa yang SUDAH ADA.
	 *
	 * Ini jalan yang benar ketika desa sudah menunjuk petugas tapi belum diberi
	 * akses kelembagaan: satu orang, satu akun, satu sandi yang sudah ia hafal —
	 * bukan akun kedua yang harus ia ingat terpisah.
	 */
	const beriAkses = async (user) => {
		const fitur = (ringkasan?.fitur_inti || []).map((k) => labelPermission.get(k) || k);
		const konfirmasi = await Swal.fire({
			icon: "question",
			title: "Beri akses ke akun ini?",
			html:
				`<div style="text-align:left;font-size:14px">` +
				`<p style="margin:0 0 8px"><b>${user.name}</b><br/>${user.email}</p>` +
				`<p style="margin:0">Akan mendapat tambahan akses: <b>${fitur.join(", ")}</b>.</p>` +
				`<p style="margin:8px 0 0;color:#64748b;font-size:12.5px">Akses lamanya tidak berubah, dan tidak ada akun baru yang dibuat.</p>` +
				`</div>`,
			showCancelButton: true,
			confirmButtonText: "Ya, beri akses",
			cancelButtonText: "Batal",
			confirmButtonColor: "#0f172a",
		});
		if (!konfirmasi.isConfirmed) return;

		try {
			await api.put(`/bidang/akun-desa/users/${user.id}/permissions`, {
				// Kirim hak akses yang sudah ia punya dari bidang ini DITAMBAH fitur
				// intinya. Yang di luar wewenang bidang tidak perlu ikut — server
				// mempertahankannya sendiri lewat mergePermissions().
				permissions: [
					...new Set([...(user.permissions_dikelola || []), ...(ringkasan?.fitur_inti || [])]),
				],
			});
			await Promise.all([muatAkun(), muatRingkasan()]);
			Swal.fire({
				icon: "success",
				title: "Akses ditambahkan",
				timer: 1600,
				showConfirmButton: false,
			});
		} catch (error) {
			Swal.fire({
				icon: "error",
				title: "Gagal memberi akses",
				text: pesanError(error, "Terjadi kesalahan."),
			});
		}
	};

	const bukaUbah = (user) => {
		setAkunDiubah(user);
		setForm({
			name: user.name || "",
			email: user.email || "",
			password: "",
			jabatan_desa: user.jabatan_desa || "",
			no_hp: user.no_hp || "",
			is_active: user.is_active !== false,
			permissions: [...(user.permissions_dikelola || [])],
		});
		setTampilSandi(false);
		setModalTerbuka(true);
	};

	const togglePermission = (key) =>
		setForm((prev) => ({
			...prev,
			permissions: prev.permissions.includes(key)
				? prev.permissions.filter((k) => k !== key)
				: [...prev.permissions, key],
		}));

	const simpan = async (e, tetapBuat = false) => {
		if (e?.preventDefault) e.preventDefault();
		if (menyimpan) return;

		if (!form.name.trim()) return Swal.fire({ icon: "error", title: "Nama wajib diisi" });
		if (!form.email.trim()) return Swal.fire({ icon: "error", title: "Email wajib diisi" });
		if (!akunDiubah && form.password.length < 6)
			return Swal.fire({ icon: "error", title: "Password minimal 6 karakter" });
		if (akunDiubah && form.password && form.password.length < 6)
			return Swal.fire({ icon: "error", title: "Password baru minimal 6 karakter" });
		if (!akunDiubah && form.permissions.length === 0)
			return Swal.fire({ icon: "error", title: "Pilih minimal satu hak akses" });

		setMenyimpan(true);
		try {
			const payload = {
				name: form.name.trim(),
				email: form.email.trim(),
				jabatan_desa: form.jabatan_desa.trim(),
				no_hp: form.no_hp.trim(),
				is_active: form.is_active,
				permissions: form.permissions,
			};
			if (form.password) payload.password = form.password;

			if (akunDiubah) {
				await api.put(`/bidang/akun-desa/users/${akunDiubah.id}`, payload);
			} else {
				await api.post("/bidang/akun-desa/users", {
					...payload,
					desa_id: desaId,
					tetap_buat: tetapBuat,
				});
			}

			setModalTerbuka(false);
			await Promise.all([muatAkun(), muatRingkasan()]);

			// Sandi hanya bisa dibacakan sekali di sini; setelah ini tidak
			// ditampilkan lagi di mana pun, jadi tampilkan dengan jelas.
			if (!akunDiubah) {
				Swal.fire({
					icon: "success",
					title: "Akun dibuat",
					html:
						`<div style="text-align:left;font-size:14px">` +
						`<p style="margin:0 0 8px">Sampaikan ke petugas desa:</p>` +
						`<div style="background:#f1f5f9;border-radius:10px;padding:10px 12px;font-family:monospace">` +
						`<div><b>Email</b>: ${payload.email}</div>` +
						`<div><b>Sandi</b>: ${form.password}</div>` +
						`</div></div>`,
				});
			} else {
				Swal.fire({
					icon: "success",
					title: "Akun diperbarui",
					timer: 1500,
					showConfirmButton: false,
				});
			}
		} catch (error) {
			// Server menolak karena desa ini sudah punya operator aktif untuk
			// fitur yang sama. Tawarkan jalan keluarnya, jangan sekadar melarang.
			if (error?.response?.status === 409 && error.response.data?.code === "AKUN_FITUR_SUDAH_ADA") {
				const sudahAda = error.response.data?.data?.akun_sudah_ada || [];
				const daftar = sudahAda
					.map((u) => `<li><b>${u.name}</b> — ${u.email}</li>`)
					.join("");

				const pilihan = await Swal.fire({
					icon: "warning",
					title: "Desa ini sudah punya operator",
					html:
						`<div style="text-align:left;font-size:14px">` +
						`<p style="margin:0 0 8px">Akun yang sudah memegang fitur ini:</p>` +
						`<ul style="margin:0 0 10px;padding-left:18px">${daftar}</ul>` +
						`<p style="margin:0;color:#64748b;font-size:12.5px">Membuat akun baru berarti desa ini punya dua akun untuk pekerjaan yang sama.</p>` +
						`</div>`,
					showCancelButton: true,
					showDenyButton: true,
					confirmButtonText: "Batal, pakai yang ada",
					denyButtonText: "Tetap buat baru",
					cancelButtonText: "Kembali ke form",
					confirmButtonColor: "#0f172a",
					denyButtonColor: "#b45309",
				});

				if (pilihan.isConfirmed) {
					setModalTerbuka(false);
					await Promise.all([muatAkun(), muatRingkasan()]);
				} else if (pilihan.isDenied) {
					setMenyimpan(false);
					return simpan(null, true);
				}
			} else {
				Swal.fire({
					icon: "error",
					title: "Gagal menyimpan",
					text: pesanError(error, "Terjadi kesalahan saat menyimpan akun."),
				});
			}
		} finally {
			setMenyimpan(false);
		}
	};

	const ubahStatus = async (user) => {
		const jadiAktif = !user.is_active;
		const konfirmasi = await Swal.fire({
			icon: "warning",
			title: jadiAktif ? "Aktifkan akun ini?" : "Nonaktifkan akun ini?",
			html: `<b>${user.name}</b><br/><span style="font-size:13px">${user.email}</span>`,
			showCancelButton: true,
			confirmButtonText: jadiAktif ? "Ya, aktifkan" : "Ya, nonaktifkan",
			cancelButtonText: "Batal",
			confirmButtonColor: jadiAktif ? "#059669" : "#dc2626",
		});
		if (!konfirmasi.isConfirmed) return;

		try {
			await api.patch(`/bidang/akun-desa/users/${user.id}/status`, { is_active: jadiAktif });
			await muatAkun();
		} catch (error) {
			Swal.fire({
				icon: "error",
				title: "Gagal mengubah status",
				text: pesanError(error, "Terjadi kesalahan."),
			});
		}
	};

	// ── Render ────────────────────────────────────────────────────────────────
	if (memuatAwal) {
		return (
			<div className="max-w-5xl mx-auto p-10 text-center text-slate-500 text-sm">
				Memuat data...
			</div>
		);
	}

	if (galatAwal) {
		return (
			<div className="max-w-2xl mx-auto mt-10 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
				<FiAlertCircle className="mx-auto h-8 w-8 text-amber-500" />
				<p className="mt-3 font-semibold text-amber-900">Halaman tidak dapat dibuka</p>
				<p className="mt-1 text-sm text-amber-800">{galatAwal}</p>
			</div>
		);
	}

	return (
		<div className="max-w-5xl mx-auto space-y-5">
			{/* Header */}
			<div className="rounded-2xl bg-slate-900 text-white p-5 shadow-lg">
				<div className="flex flex-wrap items-start justify-between gap-4">
					<div className="min-w-0">
						<h1 className="text-xl font-bold">Akun Operator Desa</h1>
						<p className="text-slate-300 text-sm mt-1">
							{meta?.bidang?.nama
								? `Dibuat atas nama ${meta.bidang.nama}`
								: "Buatkan akun petugas desa untuk fitur bidang Anda"}
						</p>
					</div>
					<div className="rounded-xl bg-white/10 px-4 py-2 text-center shrink-0">
						<div className="text-lg font-bold">{meta?.total_akun_dikelola ?? 0}</div>
						<div className="text-[11px] text-slate-300">Akun dikelola</div>
					</div>
				</div>

				<div className="mt-4 flex flex-wrap items-center gap-2">
					<span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
						<FiShield className="h-3.5 w-3.5" />
						Fitur yang bisa Anda berikan
					</span>
					{katalog.map((p) => (
						<span
							key={p.key}
							className="px-2.5 py-1 rounded-lg bg-white/10 text-[11px] font-semibold"
						>
							{p.label}
						</span>
					))}
				</div>
			</div>

			{/* Pemilih desa */}
			<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
				<div className="flex items-center gap-2 mb-3">
					<FiMapPin className="h-4 w-4 text-slate-400" />
					<h2 className="text-sm font-bold text-slate-800">Pilih Desa</h2>
				</div>
				<div className="grid gap-3 sm:grid-cols-2">
					<div>
						<label className="block text-xs font-semibold text-slate-600 mb-1.5">Kecamatan</label>
						<select
							value={kecamatanId}
							onChange={(e) => {
								setKecamatanId(e.target.value);
								setDesaId("");
							}}
							className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
						>
							<option value="">— Semua kecamatan —</option>
							{kecamatans.map((k) => (
								<option key={k.id} value={k.id}>
									{k.nama}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-xs font-semibold text-slate-600 mb-1.5">
							Desa / Kelurahan
						</label>
						<select
							value={desaId}
							onChange={(e) => setDesaId(e.target.value)}
							disabled={!kecamatanId}
							className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm disabled:bg-slate-50 disabled:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
						>
							<option value="">
								{kecamatanId ? "— Pilih desa —" : "Pilih kecamatan dulu"}
							</option>
							{desaSeKecamatan.map((d) => (
								<option key={d.id} value={d.id}>
									{d.status_pemerintahan === "kelurahan" ? "Kel." : "Desa"} {d.nama}
								</option>
							))}
						</select>
					</div>
				</div>
			</div>

			{/* Kondisi desa terpilih — ditarik sebelum akun boleh dibuat */}
			{desaTerpilih && (
				<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
					{memuatRingkasan ? (
						<p className="text-sm text-slate-500">Memeriksa akun yang sudah ada di desa ini...</p>
					) : !ringkasan ? (
						<p className="text-sm text-slate-500">Kondisi desa ini belum bisa dipastikan.</p>
					) : (
						<>
							{/* Sudah ada yang memegang → jangan buat lagi */}
							{ringkasan.sudah_pegang.length > 0 ? (
								<div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
									<div className="flex items-start gap-2">
										<FiUserCheck className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
										<div className="min-w-0">
											<p className="text-sm font-bold text-emerald-900">
												Sudah ada operator untuk fitur ini
											</p>
											<p className="text-[12px] text-emerald-800 mt-0.5">
												Tidak perlu membuat akun baru. Ubah akun di bawah bila perlu.
											</p>
										</div>
									</div>
									<div className="mt-2.5 space-y-2">
										{ringkasan.sudah_pegang.map((u) => (
											<div
												key={u.id}
												className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white border border-emerald-100 px-3 py-2"
											>
												<div className="min-w-0">
													<span className="text-sm font-semibold text-slate-800">{u.name}</span>
													{!u.is_active && (
														<span className="ml-2 px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-semibold">
															Nonaktif
														</span>
													)}
													<span className="block text-[12px] text-slate-500 break-all">
														{u.email}
													</span>
												</div>
												<button
													onClick={() => bukaUbah(u)}
													className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 shrink-0"
												>
													Ubah
												</button>
											</div>
										))}
									</div>
								</div>
							) : (
								<div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex items-start gap-2">
									<FiAlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
									<div>
										<p className="text-sm font-bold text-amber-900">
											Belum ada operator untuk fitur ini
										</p>
										<p className="text-[12px] text-amber-800 mt-0.5">
											{ringkasan.bisa_diberi.length > 0
												? "Beri akses ke akun yang sudah ada di bawah, atau buat akun baru."
												: "Silakan buat akun operator untuk desa ini."}
										</p>
									</div>
								</div>
							)}

							{/* Akun desa yang sudah ada tapi belum punya fitur bidang ini.
							    Memberi akses ke sini selalu lebih baik daripada akun baru. */}
							{ringkasan.bisa_diberi.length > 0 && (
								<div className="mt-3">
									<p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">
										Akun desa yang sudah ada — bisa langsung diberi akses
									</p>
									<div className="space-y-2">
										{ringkasan.bisa_diberi.map((u) => (
											<div
												key={u.id}
												className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
											>
												<div className="min-w-0">
													<span className="text-sm font-semibold text-slate-800">{u.name}</span>
													{u.jabatan_desa && (
														<span className="ml-2 text-[11px] text-slate-500">
															{u.jabatan_desa}
														</span>
													)}
													{!u.is_active && (
														<span className="ml-2 px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-semibold">
															Nonaktif
														</span>
													)}
													<span className="block text-[12px] text-slate-500 break-all">
														{u.email}
													</span>
												</div>
												<button
													onClick={() => beriAkses(u)}
													className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 shrink-0"
												>
													<FiPlus className="h-3.5 w-3.5" />
													Beri akses
												</button>
											</div>
										))}
									</div>
								</div>
							)}

							{/* Siapa yang berwenang di desa ini — supaya staf bisa menghubunginya
							    alih-alih diam-diam mengambil alih pengelolaan akun. */}
							{ringkasan.admin_desa.length > 0 && (
								<p className="mt-3 text-[12px] text-slate-500">
									Admin Desa:{" "}
									{ringkasan.admin_desa
										.map((a) => `${a.name}${a.no_hp ? ` (${a.no_hp})` : ""}`)
										.join(", ")}
								</p>
							)}
						</>
					)}
				</div>
			)}

			{/* Toolbar */}
			<div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
				<div className="relative flex-1 max-w-md">
					<FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
					<input
						type="text"
						value={cari}
						onChange={(e) => setCari(e.target.value)}
						placeholder="Cari nama, email, atau desa..."
						className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
					/>
				</div>
				<button
					onClick={bukaTambah}
					className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors"
				>
					<FiPlus className="h-4 w-4" />
					{desaTerpilih ? `Tambah Akun ${desaTerpilih.nama}` : "Tambah Akun"}
				</button>
			</div>

			{/* Daftar akun */}
			{memuatAkun ? (
				<div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 text-sm">
					Memuat akun...
				</div>
			) : akun.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
					<FiUsers className="mx-auto h-8 w-8 text-slate-300" />
					<p className="mt-3 font-semibold text-slate-700">
						{desaTerpilih ? `Belum ada akun di ${desaTerpilih.nama}` : "Belum ada akun"}
					</p>
					<p className="text-sm text-slate-500 mt-1">
						{desaTerpilih
							? 'Klik "Tambah Akun" untuk membuatkan operator desa ini.'
							: "Pilih desa di atas, atau buat akun pertama untuk bidang Anda."}
					</p>
				</div>
			) : (
				<div className="space-y-3">
					{akun.map((user) => (
						<div
							key={user.id}
							className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
						>
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div className="min-w-0">
									<div className="flex items-center gap-2 flex-wrap">
										<h3 className="font-bold text-slate-800">{user.name}</h3>
										{user.jabatan_desa && (
											<span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
												{user.jabatan_desa}
											</span>
										)}
										<span
											className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
												user.is_active
													? "bg-emerald-100 text-emerald-700"
													: "bg-slate-200 text-slate-600"
											}`}
										>
											{user.is_active ? "Aktif" : "Nonaktif"}
										</span>
									</div>
									<p className="text-sm text-slate-500 mt-0.5 break-all">{user.email}</p>
									{user.desa && (
										<p className="text-xs text-slate-500 mt-0.5">
											{user.desa.status_pemerintahan === "kelurahan" ? "Kel." : "Desa"}{" "}
											{user.desa.nama}
											{user.desa.kecamatan ? ` — Kec. ${user.desa.kecamatan.nama}` : ""}
										</p>
									)}
								</div>

								<div className="flex items-center gap-2">
									<button
										onClick={() => bukaUbah(user)}
										className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50"
									>
										<FiEdit2 className="h-3.5 w-3.5" />
										Ubah
									</button>
									<button
										onClick={() => ubahStatus(user)}
										className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold ${
											user.is_active
												? "border-red-200 text-red-600 hover:bg-red-50"
												: "border-emerald-200 text-emerald-700 hover:bg-emerald-50"
										}`}
									>
										<FiPower className="h-3.5 w-3.5" />
										{user.is_active ? "Nonaktifkan" : "Aktifkan"}
									</button>
								</div>
							</div>

							<div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
								{user.permissions_dikelola?.map((key) => (
									<span
										key={key}
										className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900/5 text-slate-700 text-[11px] font-medium"
									>
										<FiCheck className="h-3 w-3" />
										{labelPermission.get(key) || key}
									</span>
								))}
								{/* Hak akses milik bidang lain ditampilkan tapi tidak bisa disentuh —
								    supaya staf tahu akun ini juga dipakai untuk urusan lain. */}
								{user.permissions_bidang_lain?.map((key) => (
									<span
										key={key}
										title="Diberikan bidang lain atau Admin Desa — tidak dapat Anda ubah"
										className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-50 text-slate-400 text-[11px] font-medium border border-dashed border-slate-200"
									>
										<FiLock className="h-3 w-3" />
										{labelPermission.get(key) || key}
									</span>
								))}
								{!user.permissions?.length && (
									<span className="text-xs text-amber-600">
										Belum ada hak akses — akun ini hanya bisa melihat dashboard.
									</span>
								)}
							</div>
						</div>
					))}
				</div>
			)}

			{/* Modal tambah/ubah */}
			{modalTerbuka && (
				<div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
					{/* dvh, bukan vh: di HP, vh mengabaikan bilah alamat browser sehingga
					    dasar modal — tempat tombol simpan — jatuh di luar layar. */}
					<div
						className="flex w-full max-h-[92vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl"
						style={{ maxHeight: "92dvh" }}
					>
						<div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
							<div className="min-w-0">
								<h2 className="font-bold text-slate-800">
									{akunDiubah ? "Ubah Akun" : "Tambah Akun Operator"}
								</h2>
								{!akunDiubah && desaTerpilih && (
									<p className="text-xs text-slate-500 mt-0.5">
										{desaTerpilih.status_pemerintahan === "kelurahan" ? "Kel." : "Desa"}{" "}
										{desaTerpilih.nama}
										{desaTerpilih.kecamatans ? ` — Kec. ${desaTerpilih.kecamatans.nama}` : ""}
									</p>
								)}
							</div>
							<button
								onClick={() => setModalTerbuka(false)}
								className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
								aria-label="Tutup"
							>
								<FiX className="h-5 w-5" />
							</button>
						</div>

						<form onSubmit={simpan} className="flex min-h-0 flex-1 flex-col">
							<div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
								<div>
									<label className="block text-sm font-semibold text-slate-700 mb-1.5">
										Nama Petugas <span className="text-red-500">*</span>
									</label>
									<input
										type="text"
										value={form.name}
										onChange={(e) => setForm({ ...form, name: e.target.value })}
										placeholder="Contoh: Rahmat Ramadan"
										className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
									/>
								</div>

								<div>
									<label className="block text-sm font-semibold text-slate-700 mb-1.5">
										Email (dipakai untuk login) <span className="text-red-500">*</span>
									</label>
									<input
										type="email"
										value={form.email}
										onChange={(e) => setForm({ ...form, email: e.target.value })}
										placeholder="nama@contoh.com"
										autoComplete="off"
										className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
									/>
								</div>

								<div>
									<label className="block text-sm font-semibold text-slate-700 mb-1.5">
										Password {akunDiubah ? "" : <span className="text-red-500">*</span>}
									</label>
									<div className="flex gap-2">
										<div className="relative flex-1">
											<input
												type={tampilSandi ? "text" : "password"}
												value={form.password}
												onChange={(e) => setForm({ ...form, password: e.target.value })}
												placeholder={
													akunDiubah ? "Kosongkan bila tidak diganti" : "Minimal 6 karakter"
												}
												autoComplete="new-password"
												className="w-full px-3 py-2.5 pr-11 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900/10"
											/>
											<button
												type="button"
												onClick={() => setTampilSandi((s) => !s)}
												className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
												aria-label={tampilSandi ? "Sembunyikan password" : "Tampilkan password"}
											>
												{tampilSandi ? (
													<FiEyeOff className="h-4 w-4" />
												) : (
													<FiEye className="h-4 w-4" />
												)}
											</button>
										</div>
										<button
											type="button"
											onClick={() => {
												setForm((f) => ({ ...f, password: buatSandi() }));
												setTampilSandi(true);
											}}
											className="px-3 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 whitespace-nowrap"
										>
											Acak
										</button>
									</div>
									<p className="text-[11px] text-slate-500 mt-1">
										Sandi acak dibuat tanpa huruf/angka yang mudah tertukar, supaya aman
										dibacakan lewat telepon.
									</p>
								</div>

								<div className="grid gap-4 sm:grid-cols-2">
									<div>
										<label className="block text-sm font-semibold text-slate-700 mb-1.5">
											Jabatan / Bagian
										</label>
										<input
											type="text"
											list="saran-jabatan-desa"
											value={form.jabatan_desa}
											onChange={(e) => setForm({ ...form, jabatan_desa: e.target.value })}
											placeholder="Contoh: Kesejahteraan"
											className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
										/>
										<datalist id="saran-jabatan-desa">
											{JABATAN_SARAN.map((opt) => (
												<option key={opt} value={opt} />
											))}
										</datalist>
									</div>
									<div>
										<label className="block text-sm font-semibold text-slate-700 mb-1.5">
											Nomor HP
										</label>
										<input
											type="tel"
											value={form.no_hp}
											onChange={(e) => setForm({ ...form, no_hp: e.target.value })}
											placeholder="081234567890"
											className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10"
										/>
									</div>
								</div>

								<div>
									<label className="block text-sm font-semibold text-slate-700 mb-2">
										Hak Akses Fitur
									</label>
									<div className="grid gap-2 sm:grid-cols-2">
										{katalog.map((permission) => {
											const dicentang = form.permissions.includes(permission.key);
											return (
												<label
													key={permission.key}
													className={`flex gap-2.5 items-start rounded-xl border p-3 cursor-pointer transition-colors ${
														dicentang
															? "border-slate-900 bg-slate-900/5"
															: "border-slate-200 hover:bg-slate-50"
													}`}
												>
													<input
														type="checkbox"
														checked={dicentang}
														onChange={() => togglePermission(permission.key)}
														className="mt-0.5 h-4 w-4 accent-slate-900"
													/>
													<span className="min-w-0">
														<span className="block text-sm font-semibold text-slate-800">
															{permission.label}
														</span>
														<span className="block text-[11px] text-slate-500 leading-snug">
															{permission.description}
														</span>
													</span>
												</label>
											);
										})}
									</div>

									{/* Saat mengubah akun yang juga dipakai bidang lain, tunjukkan apa
									    yang TIDAK ikut tersimpan — supaya staf tidak mengira ia
									    baru saja mencabutnya. */}
									{akunDiubah?.permissions_bidang_lain?.length > 0 && (
										<div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3">
											<p className="text-[11px] font-semibold text-slate-600 mb-1.5">
												Akun ini juga memegang fitur bidang lain:
											</p>
											<div className="flex flex-wrap gap-1.5">
												{akunDiubah.permissions_bidang_lain.map((key) => (
													<span
														key={key}
														className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white text-slate-500 text-[11px] font-medium border border-dashed border-slate-300"
													>
														<FiLock className="h-3 w-3" />
														{labelPermission.get(key) || key}
													</span>
												))}
											</div>
											<p className="text-[11px] text-slate-500 mt-1.5">
												Tidak akan berubah saat Anda menyimpan.
											</p>
										</div>
									)}

									<p className="text-[11px] text-slate-500 mt-2">
										Dashboard dan Pengaturan selalu bisa diakses semua akun desa.
									</p>
								</div>

								<label className="flex items-center gap-2.5 cursor-pointer">
									<input
										type="checkbox"
										checked={form.is_active}
										onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
										className="h-4 w-4 accent-slate-900"
									/>
									<span className="text-sm font-medium text-slate-700">Akun aktif</span>
								</label>
							</div>

							<div
								className="flex shrink-0 gap-3 border-t border-slate-100 bg-white px-5 py-3"
								style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
							>
								<button
									type="button"
									onClick={() => setModalTerbuka(false)}
									className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50"
								>
									Batal
								</button>
								<button
									type="submit"
									disabled={menyimpan}
									className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 disabled:opacity-60"
								>
									{menyimpan ? "Menyimpan..." : akunDiubah ? "Simpan Perubahan" : "Buat Akun"}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default ManajemenAkunDesaPage;
