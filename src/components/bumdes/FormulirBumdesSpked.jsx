// src/components/bumdes/FormulirBumdesSpked.jsx
//
// Formulir BUM Desa untuk Bidang SPKED — menambah maupun mengubah.
//
// Kolomnya sama persis dengan halaman desa karena keduanya menggambar dari
// skemaBumdes.js. Bedanya cuma dua, dan keduanya memang beda kewenangan:
//
//   1. SPKED memilih desa mana yang diisi; halaman desa selalu desanya sendiri.
//   2. SPKED mengunggah berkas dasar hukum LANGSUNG di sini, sementara desa
//      memilihnya dari modul Produk Hukum Desa.
//
// Berkas tidak ikut dalam simpanan biasa: kolom path-nya sengaja tidak masuk
// daftar-izin backend, dan hanya boleh berubah lewat POST /bumdes/upload-file.
// Jadi urutannya selalu simpan dulu, unggah kemudian — untuk data baru id-nya
// pun belum ada sebelum tersimpan.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Upload, FileText, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';
import FormulirBumdes from './FormulirBumdes';
import {
	DOKUMEN_BADAN_HUKUM, DOKUMEN_LAPORAN_KEUANGAN, KUNCI_BUMDES, nilaiAwalBumdes,
} from './skemaBumdes';

const SEMUA_DOKUMEN = [...DOKUMEN_BADAN_HUKUM, ...DOKUMEN_LAPORAN_KEUANGAN];

/** Ambil hanya kunci yang memang disunting formulir, buang sisanya. */
const susunKiriman = (data) => {
	const keluar = {};
	for (const k of KUNCI_BUMDES) {
		// Kolom path berkas ditolak backend; jangan ikut dikirim.
		if (SEMUA_DOKUMEN.some((d) => d.kunci === k)) continue;
		if (data[k] !== undefined && data[k] !== null) keluar[k] = data[k];
	}
	return keluar;
};

/* ------------------------------------------------------------- pemilih desa -- */

const PemilihDesa = ({ data, onPilih, terkunci }) => {
	const [kecamatan, setKecamatan] = useState([]);
	const [desa, setDesa] = useState([]);
	const [idKecamatan, setIdKecamatan] = useState('');
	const [memuatDesa, setMemuatDesa] = useState(false);

	useEffect(() => {
		api.get('/kecamatans')
			.then((r) => setKecamatan(r.data?.data || []))
			.catch(() => setKecamatan([]));
	}, []);

	// Saat mengubah data lama, kecamatannya sudah diketahui dari barisnya.
	useEffect(() => {
		if (!data.kecamatan || !kecamatan.length || idKecamatan) return;
		const cocok = kecamatan.find((k) => k.nama_kecamatan === data.kecamatan);
		if (cocok) setIdKecamatan(String(cocok.id_kecamatan));
	}, [data.kecamatan, kecamatan, idKecamatan]);

	useEffect(() => {
		if (!idKecamatan) { setDesa([]); return; }
		setMemuatDesa(true);
		api.get(`/desas/kecamatan/${idKecamatan}`)
			.then((r) => setDesa(r.data?.data || []))
			.catch(() => setDesa([]))
			.finally(() => setMemuatDesa(false));
	}, [idKecamatan]);

	if (terkunci) {
		return (
			<div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
				<p className="text-xs font-medium text-slate-500">Desa</p>
				<p className="mt-1 text-sm font-semibold text-slate-900">
					{data.desa || '—'} · Kec. {data.kecamatan || '—'}
					{data.kode_desa ? ` · ${data.kode_desa}` : ''}
				</p>
				<p className="mt-1 text-xs text-slate-500">
					Desa tidak bisa dipindah saat mengubah data. Hapus lalu buat ulang bila salah desa.
				</p>
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-5">
			<h3 className="mb-4 text-sm font-semibold text-slate-900">Desa yang Diisi</h3>
			<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<div>
					<label className="mb-1.5 block text-sm font-medium text-slate-700">Kecamatan</label>
					<select
						value={idKecamatan}
						onChange={(e) => { setIdKecamatan(e.target.value); onPilih(null); }}
						className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-900"
					>
						<option value="">Pilih kecamatan</option>
						{kecamatan.map((k) => (
							<option key={k.id_kecamatan} value={k.id_kecamatan}>{k.nama_kecamatan}</option>
						))}
					</select>
				</div>
				<div>
					<label className="mb-1.5 block text-sm font-medium text-slate-700">
						Desa {memuatDesa && <span className="text-xs text-slate-400">memuat…</span>}
					</label>
					<select
						value={desa.find((d) => d.nama_desa === data.desa)?.id_desa || ''}
						onChange={(e) => {
							const pilih = desa.find((d) => String(d.id_desa) === e.target.value);
							onPilih(pilih || null);
						}}
						disabled={!idKecamatan || memuatDesa}
						className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-900 disabled:bg-slate-50"
					>
						<option value="">Pilih desa</option>
						{desa.map((d) => (
							<option key={d.id_desa} value={d.id_desa}>{d.nama_desa}</option>
						))}
					</select>
				</div>
			</div>
		</div>
	);
};

/* ------------------------------------------------------------------ utama -- */

const FormulirBumdesSpked = ({ awal = null, onSelesai }) => {
	const sedangUbah = Boolean(awal?.id);
	const [data, setData] = useState(() => ({ ...nilaiAwalBumdes(), ...(awal || {}) }));
	const [berkas, setBerkas] = useState({});   // kunci -> File
	const [menyimpan, setMenyimpan] = useState(false);

	const ubah = useCallback((kunci, nilai) => {
		setData((d) => ({ ...d, [kunci]: nilai }));
	}, []);

	const pilihDesa = useCallback((d) => {
		setData((lama) => ({
			...lama,
			desa_id: d?.id_desa || '',
			desa: d?.nama_desa || '',
			kode_desa: d?.kode_desa || '',
			kecamatan: d?.nama_kecamatan || lama.kecamatan,
		}));
	}, []);

	const jumlahBerkasBaru = useMemo(() => Object.keys(berkas).length, [berkas]);

	const unggahBerkas = async (bumdesId) => {
		const gagal = [];
		for (const [kunci, file] of Object.entries(berkas)) {
			const fd = new FormData();
			fd.append('file', file);
			fd.append('bumdes_id', String(bumdesId));
			fd.append('field_name', kunci);
			try {
				await api.post('/bumdes/upload-file', fd, {
					headers: { 'Content-Type': 'multipart/form-data' },
				});
			} catch (e) {
				gagal.push(`${kunci}: ${e.response?.data?.message || 'gagal'}`);
			}
		}
		return gagal;
	};

	const simpan = async () => {
		if (!data.namabumdesa?.trim()) return toast.error('Nama BUMDes wajib diisi');
		if (!sedangUbah && !data.desa_id) return toast.error('Pilih kecamatan dan desa dulu');

		setMenyimpan(true);
		try {
			const kiriman = susunKiriman(data);
			let id = awal?.id;

			if (sedangUbah) {
				await api.put(`/bumdes/${id}`, kiriman);
			} else {
				const r = await api.post('/bumdes', kiriman);
				id = r.data?.data?.id ?? r.data?.id;
				if (!id) throw new Error('Server tidak mengembalikan id BUMDes baru');
			}

			// Berkas menyusul setelah barisnya pasti ada — untuk data baru,
			// id-nya memang baru lahir di langkah di atas.
			const gagal = jumlahBerkasBaru ? await unggahBerkas(id) : [];

			if (gagal.length) {
				toast.error(`Data tersimpan, tapi ${gagal.length} berkas gagal diunggah`);
			} else {
				toast.success(sedangUbah ? 'Data BUMDes diperbarui' : 'BUMDes ditambahkan');
			}
			onSelesai?.();
		} catch (e) {
			toast.error(e.response?.data?.message || e.message || 'Gagal menyimpan data BUMDes');
		} finally {
			setMenyimpan(false);
		}
	};

	const slotDokumen = (
		<div className="space-y-2">
			<p className="text-xs text-slate-500">
				Berkas diunggah setelah data tersimpan. Kosongkan bila tidak ingin mengganti.
			</p>
			<div className="divide-y divide-slate-100">
				{SEMUA_DOKUMEN.map((d) => {
					const adaLama = Boolean(data[d.kunci]);
					const baru = berkas[d.kunci];
					return (
						<label
							key={d.kunci}
							className="flex cursor-pointer items-center justify-between gap-3 py-2.5"
						>
							<span className="min-w-0">
								<span className="block text-sm text-slate-700">{d.label}</span>
								<span className="block truncate text-xs text-slate-400">
									{baru ? baru.name : adaLama ? String(data[d.kunci]).split('/').pop() : 'Belum ada berkas'}
								</span>
							</span>
							<span className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700">
								{baru ? <Check className="h-3.5 w-3.5" /> : adaLama ? <FileText className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
								{baru ? 'Siap diunggah' : adaLama ? 'Ganti' : 'Pilih'}
							</span>
							<input
								type="file"
								accept="application/pdf,image/*"
								className="hidden"
								onChange={(e) => {
									const f = e.target.files?.[0];
									setBerkas((b) => (f ? { ...b, [d.kunci]: f } : b));
								}}
							/>
						</label>
					);
				})}
			</div>
		</div>
	);

	return (
		<div className="mx-auto max-w-5xl p-5">
			<FormulirBumdes
				data={data}
				onUbah={ubah}
				mode="spked"
				slotAtas={<PemilihDesa data={data} onPilih={pilihDesa} terkunci={sedangUbah} />}
				slotDokumen={slotDokumen}
				// SPKED memang pemilik kolom penilaian, jadi tidak dikunci
				// baca-saja seperti di halaman desa.
				tampilkanBacaSaja={false}
			/>

			<div className="sticky bottom-0 mt-5 flex gap-3 border-t border-slate-200 bg-white/95 py-4 backdrop-blur">
				<button
					type="button"
					onClick={onSelesai}
					className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
				>
					Batal
				</button>
				<button
					type="button"
					onClick={simpan}
					disabled={menyimpan}
					className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
				>
					{menyimpan && <Loader2 className="h-4 w-4 animate-spin" />}
					{sedangUbah ? 'Simpan Perubahan' : 'Simpan'}
					{jumlahBerkasBaru > 0 && ` · ${jumlahBerkasBaru} berkas`}
				</button>
			</div>
		</div>
	);
};

export default FormulirBumdesSpked;
