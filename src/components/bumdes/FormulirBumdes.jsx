// src/components/bumdes/FormulirBumdes.jsx
//
// Penampil formulir BUM Desa. Kolomnya datang dari skemaBumdes.js — berkas ini
// hanya tahu cara menggambar, bukan kolom apa saja yang ada.
//
// Satu-satunya percabangan adalah `mode`:
//   'desa'  → Perdes/SK dipilih dari modul Produk Hukum Desa (berkas sudah
//             diunggah di sana; yang disimpan id-nya)
//   'spked' → Perdes/SK dan lima dokumen lain diunggah langsung di sini
//
// Selain itu keduanya identik, dan memang harus identik: dua formulir yang
// ditulis terpisah untuk tabel yang sama sudah pernah menyimpang tiga puluh
// kolom.
import React from 'react';
import { SEKSI_BUMDES, SEKSI_BACA_SAJA } from './skemaBumdes';

const kelasKolom = (mati) =>
	`w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-colors ${
		mati
			? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-500'
			: 'border-slate-200 bg-white text-slate-900 focus:border-slate-900'
	}`;

const Label = ({ anak, wajib, catatan }) => (
	<label className="mb-1.5 block text-sm font-medium text-slate-700">
		{anak}
		{wajib && <span className="ml-0.5 text-rose-500">*</span>}
		{catatan && <span className="ml-2 text-xs font-normal text-slate-400">{catatan}</span>}
	</label>
);

/** Satu kolom, digambar menurut jenisnya. */
const Kolom = ({ def, nilai, onUbah, matikan }) => {
	const mati = matikan || def.hanyaBaca;

	if (def.jenis === 'pilih') {
		return (
			<div className={def.lebar === 'penuh' ? 'sm:col-span-2' : undefined}>
				<Label wajib={def.wajib}>{def.label}</Label>
				<select
					value={nilai ?? ''}
					onChange={(e) => onUbah(def.kunci, e.target.value)}
					disabled={mati}
					className={kelasKolom(mati)}
				>
					<option value="">Pilih opsi</option>
					{def.opsi.map((o) => (
						<option key={o.value} value={o.value}>{o.label}</option>
					))}
				</select>
			</div>
		);
	}

	if (def.jenis === 'teksPanjang') {
		return (
			<div className={def.lebar === 'penuh' ? 'sm:col-span-2' : undefined}>
				<Label wajib={def.wajib}>{def.label}</Label>
				<textarea
					value={nilai ?? ''}
					onChange={(e) => onUbah(def.kunci, e.target.value)}
					placeholder={def.contoh}
					rows={def.baris || 3}
					disabled={mati}
					className={`${kelasKolom(mati)} resize-none`}
				/>
			</div>
		);
	}

	return (
		<div className={def.lebar === 'penuh' ? 'sm:col-span-2' : undefined}>
			<Label wajib={def.wajib} catatan={def.catatanLabel}>{def.label}</Label>
			<input
				type={def.tipeInput || (def.jenis === 'angka' ? 'number' : 'text')}
				value={nilai ?? ''}
				onChange={(e) => onUbah(def.kunci, e.target.value)}
				placeholder={def.contoh}
				disabled={mati}
				readOnly={def.hanyaBaca}
				className={kelasKolom(mati)}
			/>
		</div>
	);
};

const Seksi = ({ judul, children }) => (
	<section className="rounded-2xl border border-slate-200 bg-white p-5">
		<h3 className="mb-4 text-sm font-semibold text-slate-900">{judul}</h3>
		{children}
	</section>
);

/**
 * @param {object}   data          nilai formulir
 * @param {function} onUbah        (kunci, nilai) => void
 * @param {boolean}  bisaSunting   false = seluruh kolom dimatikan
 * @param {'desa'|'spked'} mode
 * @param {ReactNode} slotDasarHukum  blok Perdes/SK milik pemanggil
 * @param {ReactNode} slotDokumen     blok unggah dokumen (mode SPKED)
 * @param {ReactNode} slotAtas        mis. penunjuk desa di halaman SPKED
 */
const FormulirBumdes = ({
	data = {},
	onUbah,
	bisaSunting = true,
	mode = 'desa',
	slotDasarHukum = null,
	slotDokumen = null,
	slotAtas = null,
	tampilkanBacaSaja = true,
}) => (
	<div className="space-y-5">
		{slotAtas}

		{SEKSI_BUMDES.map((seksi) => {
			const kolom = seksi.kolom.filter((k) => !k.tampilBila || k.tampilBila(data));
			return (
				<Seksi key={seksi.id} judul={seksi.judul}>
					{seksi.slotDokumenDasarHukum && slotDasarHukum && (
						<div className="mb-4">{slotDasarHukum}</div>
					)}
					<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
						{kolom.map((def) => (
							<Kolom
								key={def.kunci}
								def={def}
								nilai={data[def.kunci]}
								onUbah={onUbah}
								// Desa dan kecamatan ikut akun di halaman desa, tapi
								// harus bisa disetel dari SPKED lewat penunjuk desa.
								matikan={!bisaSunting || (def.dariAkunDesa && mode === 'desa')}
							/>
						))}
					</div>
				</Seksi>
			);
		})}

		{mode === 'spked' && slotDokumen && (
			<Seksi judul="Dokumen">{slotDokumen}</Seksi>
		)}

		{tampilkanBacaSaja && SEKSI_BACA_SAJA.map((seksi) => (
			<Seksi key={seksi.id} judul={`${seksi.judul} — diisi DPMD`}>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					{seksi.kolom.map((k) => (
						<div key={k.kunci}>
							<Label>{k.label}</Label>
							<div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
								{data[k.kunci] || <span className="text-slate-400">Belum ada data</span>}
							</div>
						</div>
					))}
				</div>
			</Seksi>
		))}
	</div>
);

export default FormulirBumdes;
