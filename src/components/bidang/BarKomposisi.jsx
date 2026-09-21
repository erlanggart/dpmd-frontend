// src/components/bidang/BarKomposisi.jsx
//
// Satu batang komposisi: bagian-bagian dari SATU keseluruhan, dibaca sebagai
// proporsi. Dipakai untuk tahapan berjenjang — status badan hukum BUM Desa,
// tahap penyaluran Bankeu — bukan untuk membandingkan besaran yang tidak
// sejenis.
//
// Dibuat dari div, bukan pustaka grafik. Bentuknya cuma satu batang; memanggil
// recharts untuknya berarti menambah beban tanpa menambah apa pun, dan justru
// menyulitkan dua detail yang penting di sini: celah 2px antar segmen supaya
// warna bersebelahan tidak menyatu, dan ujung membulat hanya di kedua tepi
// batang.
//
// WARNA. `warna` harus berupa ramp ORDINAL satu rona — gelap ke terang mengikuti
// urutan tahapan, bukan warna kategori yang berbeda-beda rona. Ramp yang dipakai
// pemanggil sudah divalidasi (lightness monoton, jarak antar langkah >= 0.06,
// ujung teringan tetap >= 2:1 terhadap latar). Mengganti warnanya sembarangan
// akan merusak keterbacaan tahapan.
import React, { useState } from 'react';

const angka = (n) => Number(n || 0).toLocaleString('id-ID');

const BarKomposisi = ({ data, warna, total: totalDiberikan, tinggi = 12 }) => {
	const [disorot, setDisorot] = useState(null);

	const total = totalDiberikan ?? data.reduce((jml, d) => jml + Number(d.jumlah || 0), 0);
	if (total <= 0) {
		return (
			<div className="rounded-full bg-slate-100" style={{ height: tinggi }} aria-hidden />
		);
	}

	const persen = (n) => (Number(n || 0) / total) * 100;

	return (
		<div>
			{/* Lapisan sorot: satu baris keterangan di atas batang, muncul saat
			    segmen disentuh. Tidak melayang di atas kursor supaya tidak menutupi
			    segmen sebelahnya yang justru ingin dibandingkan. */}
			<div className="mb-2 h-[18px]">
				{disorot !== null && data[disorot] && (
					<p className="text-[11.5px] leading-tight text-slate-600">
						<span className="font-semibold text-slate-900">{data[disorot].label}</span>
						{' — '}
						<span className="tabular-nums">{angka(data[disorot].jumlah)}</span>
						<span className="text-slate-400"> · {Math.round(persen(data[disorot].jumlah))}%</span>
					</p>
				)}
			</div>

			<div className="flex overflow-hidden rounded-full" style={{ height: tinggi }} role="img" aria-label="Komposisi">
				{data.map((d, i) => {
					const lebar = persen(d.jumlah);
					if (lebar <= 0) return null;
					return (
						<div
							key={d.label}
							onMouseEnter={() => setDisorot(i)}
							onMouseLeave={() => setDisorot(null)}
							title={`${d.label}: ${angka(d.jumlah)}`}
							className="h-full transition-opacity duration-150"
							style={{
								width: `${lebar}%`,
								backgroundColor: warna[i % warna.length],
								// Celah 2px berupa latar permukaan, bukan garis: dua warna
								// bersebelahan tidak pernah bersentuhan langsung.
								marginRight: i < data.length - 1 ? 2 : 0,
								opacity: disorot === null || disorot === i ? 1 : 0.45,
							}}
						/>
					);
				})}
			</div>

			{/* Legenda membawa angka dan persen. Identitas tidak pernah bergantung
			    pada warna saja — syarat wajib untuk ramp yang sebagian langkahnya
			    berkontras rendah terhadap latar putih. */}
			<ul className="mt-3.5 space-y-2">
				{data.map((d, i) => (
					<li
						key={d.label}
						onMouseEnter={() => setDisorot(i)}
						onMouseLeave={() => setDisorot(null)}
						className="flex items-center gap-2.5"
					>
						<span
							className="h-2.5 w-2.5 shrink-0 rounded-sm"
							style={{ backgroundColor: warna[i % warna.length] }}
							aria-hidden
						/>
						<span className="min-w-0 flex-1 truncate text-[12.5px] text-slate-700">{d.label}</span>
						<span className="shrink-0 text-[12.5px] font-semibold tabular-nums text-slate-900">
							{angka(d.jumlah)}
						</span>
						<span className="w-9 shrink-0 text-right text-[11.5px] tabular-nums text-slate-400">
							{Math.round(persen(d.jumlah))}%
						</span>
					</li>
				))}
			</ul>
		</div>
	);
};

export default BarKomposisi;
