// Gambaran ekonomi BUMDes: berapa yang berusaha, hasil usaha, ukuran usaha.
// Setiap angka menyebut berapa BUMDes yang menyusunnya. Nilai penyertaan modal
// yang lebih dari 100x nilai tengah dianggap salah ketik dan dikeluarkan.
import React, { useMemo } from 'react';
import { AlertTriangle, TrendingUp, Users, Wallet, Database } from 'lucide-react';
import { Kartu, Judul, Batang, Cincin, PitaBertumpuk, Kosong } from './bumdesViz';
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
      <Kartu>
        <Judul icon={Database}>BUMDes yang berusaha</Judul>

        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
          <Cincin
            nilai={s.beroperasi}
            total={s.total}
            tengah={`${persen(s.beroperasi)}%`}
            bawah={`${nf.format(s.beroperasi)} BUMDes`}
          />

          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{nf.format(s.beroperasi)}</span> dari{' '}
              {nf.format(s.total)} BUMDes beromset di atas nol.
            </p>

            <p className="mt-5 text-xs font-medium text-slate-600">
              Kelengkapan laporan keuangan
            </p>
            <div className="mt-2">
              <PitaBertumpuk
                total={s.total}
                segmen={[
                  { id: 'lengkap', label: 'Lengkap', nilai: s.lengkap, warna: RAMP[5] },
                  { id: 'sebagian', label: 'Sebagian', nilai: s.sebagian, warna: RAMP[1] },
                  { id: 'kosong', label: 'Belum melapor', nilai: s.kosong, warna: '#f1f5f9' },
                ]}
              />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-3 text-xs">
              <div>
                <dt className="text-slate-500">Lengkap</dt>
                <dd className="font-semibold text-slate-900">{nf.format(s.lengkap)} ({persen(s.lengkap)}%)</dd>
              </div>
              <div>
                <dt className="text-slate-500">Sebagian</dt>
                <dd className="font-semibold text-slate-900">{nf.format(s.sebagian)} ({persen(s.sebagian)}%)</dd>
              </div>
              <div>
                <dt className="text-slate-500">Belum melapor</dt>
                <dd className="font-semibold text-slate-900">{nf.format(s.kosong)} ({persen(s.kosong)}%)</dd>
              </div>
            </dl>
          </div>
        </div>
      </Kartu>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Kartu>
          <Judul icon={TrendingUp}>Hasil usaha 2025</Judul>
          <div className="space-y-3.5">
            <Batang
              urutan={0}
              label="Omset" nilai={s.omset.nilai} tampil={rupiahRingkas(s.omset.nilai)}
              maks={maksCorong} warna={RAMP[5]} judulHover={rupiahPenuh(s.omset.nilai)}
              keterangan={`${s.omset.n} BUMDes`}
            />
            <Batang
              urutan={1}
              label="Laba" nilai={s.laba.nilai} tampil={rupiahRingkas(s.laba.nilai)}
              maks={maksCorong} warna={RAMP[3]} judulHover={rupiahPenuh(s.laba.nilai)}
              keterangan={`${s.laba.n} BUMDes · ${s.omset.nilai > 0 ? ((s.laba.nilai / s.omset.nilai) * 100).toFixed(1) : 0}% dari omset`}
            />
            <Batang
              urutan={2}
              label="PADes" nilai={s.pades.nilai} tampil={rupiahRingkas(s.pades.nilai)}
              maks={maksCorong} warna={RAMP[1]} judulHover={rupiahPenuh(s.pades.nilai)}
              keterangan={`${s.pades.n} BUMDes · ${s.laba.nilai > 0 ? ((s.pades.nilai / s.laba.nilai) * 100).toFixed(0) : 0}% dari laba`}
            />
          </div>

          <div className="mt-5 rounded-lg bg-slate-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-slate-400" />
              <p className="text-xs font-medium text-slate-600">Penyertaan modal 2019–2024</p>
            </div>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
              {rupiahRingkas(s.modal)}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {s.modalN} BUMDes · akumulasi 6 tahun
            </p>
          </div>
        </Kartu>

        <Kartu>
          <Judul
            icon={Users}
            catatan={`Nilai tengah omset ${rupiahRingkas(s.medianOmset)} per tahun.`}
          >
            Ukuran usaha
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
          <p className="mt-4 text-[11px] text-slate-500">
            Dari {s.omsetPositifN} BUMDes beromset di atas nol.
          </p>
        </Kartu>
      </div>

      {s.janggal.length > 0 && (
        <Kartu className="border-amber-200 bg-amber-50">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-amber-900">
                Nilai janggal, dikeluarkan dari perhitungan
              </h3>
              <ul className="mt-2 space-y-1">
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
