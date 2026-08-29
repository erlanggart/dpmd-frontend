// Gambaran ekonomi BUMDes untuk Core Dashboard.
//
// Dihitung dari daftar yang sama dengan direktori di bawahnya, supaya grafik
// dan tabel tidak mungkin berbeda angka.
//
// PRINSIP: setiap angka menyebut BERAPA BUMDes yang menyusunnya. Dari 416
// BUMDes, hanya sekitar seperempat mengisi omset dengan nilai di atas nol.
// Menyajikan "Total Omset" tanpa penyebut membuat pembaca awam mengira itu
// angka seluruh kabupaten, padahal bukan.
//
// TIGA HAL YANG SENGAJA TIDAK DIGRAFIKKAN, karena datanya tidak mendukung:
//
//  1. Tren omset 2023 -> 2025. Median 2023 dan 2024 sama-sama Rp 0: lebih dari
//     separuh pelapor menulis nol. Lonjakan di 2025 adalah pelaporan yang
//     membaik, bukan usaha yang tumbuh. Grafik tren akan mengarang kisah sukses.
//  2. Peringkat kecamatan menurut omset. Jonggol tertinggi (Rp 13,9 M), tapi
//     92% darinya satu BUMDes (Sukamaju). Yang diranking pencilannya, bukan
//     kecamatannya.
//  3. Total penyertaan modal apa adanya. Satu salah ketik di Ligarmukti
//     (Rp 1.000.000.002.018) menyumbang 97% dari total. Nilai semacam itu
//     dikeluarkan dari penjumlahan DAN dilaporkan di bagian mutu data.
//
// Warna: satu hue slate, terang -> gelap. Seluruh datanya berskala URUT
// (Perintis..Maju, kelas omset, corong omset->laba->PADes), jadi sekuensial,
// bukan kategorikal. Langkah paling terang (#94a3b8) kontrasnya 2,56:1 —
// di atas lantai 2:1 untuk sekuensial tapi di bawah 3:1, sehingga setiap
// batang WAJIB berlabel nilai yang terbaca tanpa hover.
import React, { useMemo } from 'react';
import { AlertTriangle, TrendingUp, Users, Wallet, Database } from 'lucide-react';
import { Kartu, Judul, Batang, Kosong } from './bumdesViz';
import { RAMP, nf, rupiahRingkas } from './bumdesFormat';
import {
  KELAS_OMSET as KELAS_OMSET_BERSAMA, beroperasi, kelasOmsetDari, omsetTerbaru,
} from './bumdesFilter';

const rupiahPenuh = (n) =>
  n === null || n === undefined ? '—' : `Rp ${nf.format(Math.round(n))}`;

const median = (angka) => {
  if (!angka.length) return 0;
  const urut = [...angka].sort((a, b) => a - b);
  const t = Math.floor(urut.length / 2);
  return urut.length % 2 ? urut[t] : (urut[t - 1] + urut[t]) / 2;
};

/* ------------------------------------------------------------------ utama -- */

const KELAS_OMSET = KELAS_OMSET_BERSAMA.filter((k) => k.min !== null);

const BumdesEkonomi = ({ data = [] }) => {
  const s = useMemo(() => {
    const total = data.length;
    if (!total) return null;

    const angkaAda = (v) => v !== null && v !== undefined;

    // Definisi "berusaha" datang dari bumdesFilter, sama persis dengan kartu
    // ringkasan di atas halaman dan dengan penyaring skala omset.
    const jumlahBeroperasi = data.filter(beroperasi).length;

    // Kelengkapan: tiga angka inti (aset, omset, laba).
    let lengkap = 0, sebagian = 0, kosong = 0;
    for (const d of data) {
      const punya = [d.aset, omsetTerbaru(d), d.laba_2025 ?? d.laba_2024].filter(angkaAda).length;
      if (punya === 3) lengkap += 1;
      else if (punya > 0) sebagian += 1;
      else kosong += 1;
    }

    // Nilai penyertaan modal yang lebih dari 100x nilai tengah dianggap salah
    // ketik, bukan angka asli. Dikeluarkan dari jumlah DAN dilaporkan.
    const modalPositif = data.map((d) => d.total_penyertaan_modal).filter((v) => v > 0);
    const ambang = modalPositif.length ? median(modalPositif) * 100 : Infinity;
    const janggal = data
      .filter((d) => d.total_penyertaan_modal > ambang)
      .map((d) => ({ desa: d.desa, nama: d.nama, nilai: d.total_penyertaan_modal }));
    const modalBersih = data.filter((d) => d.total_penyertaan_modal > 0 && d.total_penyertaan_modal <= ambang);
    const modal = modalBersih.reduce((t, d) => t + d.total_penyertaan_modal, 0);

    const jumlah = (kunci) => {
      const isi = data.filter((d) => angkaAda(d[kunci]));
      return { nilai: isi.reduce((t, d) => t + d[kunci], 0), n: isi.length };
    };
    const omset = jumlah('omset_2025');
    const laba = jumlah('laba_2025');
    const pades = jumlah('pades_2025');

    // Kelas ukuran usaha memakai omset tahun TERBARU yang diisi tiap BUMDes —
    // patokan yang sama dengan penyaring "Skala omset". Memakai kolom 2025 saja
    // menghitung 220 BUMDes sementara penyaringnya mengiris 232.
    const omsetPositif = data.filter(beroperasi).map(omsetTerbaru);
    const medianOmset = median(omsetPositif);

    const kelas = KELAS_OMSET.map((k) => ({
      ...k,
      n: data.filter((d) => kelasOmsetDari(d) === k.id).length,
    }));

    return {
      total, beroperasi: jumlahBeroperasi, lengkap, sebagian, kosong,
      modal, modalN: modalBersih.length, janggal,
      omset, laba, pades,
      medianOmset, omsetPositifN: omsetPositif.length,
      kelas,
    };
  }, [data]);

  if (!s) return <Kartu><Kosong /></Kartu>;

  const persen = (n) => Math.round((n / s.total) * 100);
  const maksCorong = Math.max(s.omset.nilai, s.laba.nilai, s.pades.nilai, 1);
  const maksKelas = Math.max(...s.kelas.map((k) => k.n), 1);

  return (
    <div className="space-y-5">
      {/* 1 — Berapa yang benar-benar hidup, dan seberapa lengkap datanya */}
      <Kartu>
        <Judul
          icon={Database}
          catatan="Status “aktif” adalah label administratif. Yang dihitung di sini adalah BUMDes yang melaporkan omset di atas nol pada tahun terbaru yang diisinya — ukuran kegiatan usaha yang sebenarnya, dan angka yang sama dengan kartu “Melaporkan omset di atas nol” di atas."
        >
          Seberapa banyak yang benar-benar berusaha
        </Judul>

        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="text-4xl font-semibold tracking-tight text-slate-900">
            {nf.format(s.beroperasi)}
          </p>
          <p className="text-sm text-slate-500">
            dari {nf.format(s.total)} BUMDes melaporkan omset di atas nol ({persen(s.beroperasi)}%)
          </p>
        </div>

        <div className="mt-5">
          <p className="text-xs font-medium text-slate-600">Kelengkapan laporan keuangan</p>
          <div
            className="mt-2 flex h-3 w-full gap-0.5 overflow-hidden rounded-[4px]"
            role="img"
            aria-label={`Lengkap ${s.lengkap}, sebagian ${s.sebagian}, belum melapor ${s.kosong} dari ${s.total} BUMDes`}
          >
            <div style={{ width: `${(s.lengkap / s.total) * 100}%`, backgroundColor: RAMP[5] }} />
            <div style={{ width: `${(s.sebagian / s.total) * 100}%`, backgroundColor: RAMP[1] }} />
            <div style={{ width: `${(s.kosong / s.total) * 100}%` }} className="bg-slate-100" />
          </div>
          <dl className="mt-2.5 grid grid-cols-3 gap-3 text-xs">
            <div>
              <dt className="text-slate-500">Aset, omset, laba lengkap</dt>
              <dd className="font-semibold text-slate-900">{nf.format(s.lengkap)} ({persen(s.lengkap)}%)</dd>
            </div>
            <div>
              <dt className="text-slate-500">Sebagian saja</dt>
              <dd className="font-semibold text-slate-900">{nf.format(s.sebagian)} ({persen(s.sebagian)}%)</dd>
            </div>
            <div>
              <dt className="text-slate-500">Belum melapor</dt>
              <dd className="font-semibold text-slate-900">{nf.format(s.kosong)} ({persen(s.kosong)}%)</dd>
            </div>
          </dl>
        </div>
      </Kartu>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* 2 — Hasil usaha 2025 */}
        <Kartu>
          <Judul
            icon={TrendingUp}
            catatan="Omset, laba, lalu bagian yang kembali ke kas desa. Angka dalam kurung adalah jumlah BUMDes yang mengisinya — bukan seluruh 416."
          >
            Hasil usaha tahun 2025
          </Judul>
          <div className="space-y-3.5">
            <Batang
              urutan={0}
              label="Omset" nilai={s.omset.nilai} tampil={rupiahRingkas(s.omset.nilai)}
              maks={maksCorong} warna={RAMP[5]} judulHover={rupiahPenuh(s.omset.nilai)}
              keterangan={`dari ${s.omset.n} BUMDes yang mengisi`}
            />
            <Batang
              urutan={1}
              label="Laba" nilai={s.laba.nilai} tampil={rupiahRingkas(s.laba.nilai)}
              maks={maksCorong} warna={RAMP[3]} judulHover={rupiahPenuh(s.laba.nilai)}
              keterangan={`dari ${s.laba.n} BUMDes · ${s.omset.nilai > 0 ? ((s.laba.nilai / s.omset.nilai) * 100).toFixed(1) : 0}% dari omset`}
            />
            <Batang
              urutan={2}
              label="Kembali ke kas desa (PADes)" nilai={s.pades.nilai} tampil={rupiahRingkas(s.pades.nilai)}
              maks={maksCorong} warna={RAMP[1]} judulHover={rupiahPenuh(s.pades.nilai)}
              keterangan={`dari ${s.pades.n} BUMDes · ${s.laba.nilai > 0 ? ((s.pades.nilai / s.laba.nilai) * 100).toFixed(0) : 0}% dari laba`}
            />
          </div>

          <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-slate-400" />
              <p className="text-xs font-medium text-slate-600">Modal desa yang ditanam (2019–2024)</p>
            </div>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
              {rupiahRingkas(s.modal)}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
              dari {s.modalN} BUMDes. Angka ini akumulasi enam tahun, jadi tidak setara
              dibandingkan langsung dengan omset satu tahun di atas.
            </p>
          </div>
        </Kartu>

        {/* 3 — Sebaran ukuran usaha */}
        <Kartu>
          <Judul
            icon={Users}
            catatan={`Nilai tengah omset ${rupiahRingkas(s.medianOmset)} setahun, sekitar ${rupiahRingkas(s.medianOmset / 12)} sebulan. Rata-rata tidak dipakai karena tertarik segelintir BUMDes besar.`}
          >
            Ukuran usaha yang sebenarnya
          </Judul>
          <div className="space-y-3">
            {s.kelas.map((k, i) => (
              <Batang
                key={k.label}
                label={k.label}
                nilai={k.n}
                tampil={`${nf.format(k.n)} BUMDes`}
                maks={maksKelas}
                warna={RAMP[i + 1]}
                urutan={i}
                judulHover={`${k.n} BUMDes beromset ${k.label}`}
              />
            ))}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
            Dihitung dari {s.omsetPositifN} BUMDes yang beromset di atas nol pada tahun
            terbaru yang diisinya — patokan yang sama dengan penyaring “Skala omset”.
          </p>
        </Kartu>
      </div>

      {/* 5 — Mutu data: disebut, bukan disembunyikan */}
      {s.janggal.length > 0 && (
        <Kartu className="border-amber-200 bg-amber-50">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-amber-900">
                Nilai janggal yang dikeluarkan dari perhitungan
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-amber-800">
                Nilai lebih dari 100 kali nilai tengah dianggap salah ketik, bukan angka
                asli. Dikeluarkan dari penjumlahan modal di atas, tapi ditampilkan di sini
                supaya bisa diperbaiki di sumbernya.
              </p>
              <ul className="mt-2.5 space-y-1">
                {s.janggal.map((j) => (
                  <li key={j.desa} className="text-xs text-amber-900">
                    <span className="font-medium">{j.desa}</span> — penyertaan modal tercatat{' '}
                    <span className="font-semibold tabular-nums">{rupiahPenuh(j.nilai)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Kartu>
      )}
    </div>
  );
};

export default BumdesEkonomi;
