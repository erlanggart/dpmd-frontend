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
import { AlertTriangle, TrendingUp, Users, Wallet, Award, Database } from 'lucide-react';

/** Ramp sekuensial slate, terang -> gelap. Monoton menurun (syarat sekuensial). */
const RAMP = ['#94a3b8', '#64748b', '#475569', '#334155', '#1e293b', '#0f172a'];

const nf = new Intl.NumberFormat('id-ID');

const rupiahRingkas = (n) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  const abs = Math.abs(n);
  if (abs >= 1e12) return `Rp ${(n / 1e12).toFixed(1).replace('.', ',')} T`;
  if (abs >= 1e9) return `Rp ${(n / 1e9).toFixed(1).replace('.', ',')} M`;
  if (abs >= 1e6) return `Rp ${Math.round(n / 1e6)} Jt`;
  if (abs >= 1e3) return `Rp ${Math.round(n / 1e3)} Rb`;
  return `Rp ${nf.format(n)}`;
};

const rupiahPenuh = (n) =>
  n === null || n === undefined ? '—' : `Rp ${nf.format(Math.round(n))}`;

const median = (angka) => {
  if (!angka.length) return 0;
  const urut = [...angka].sort((a, b) => a - b);
  const t = Math.floor(urut.length / 2);
  return urut.length % 2 ? urut[t] : (urut[t - 1] + urut[t]) / 2;
};

/* --------------------------------------------------------------- potongan -- */

const Kartu = ({ children, className = '' }) => (
  <section className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`}>
    {children}
  </section>
);

const Judul = ({ icon: Icon, children, catatan }) => (
  <div className="mb-4">
    <div className="flex items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-slate-400" />}
      <h3 className="text-sm font-semibold text-slate-900">{children}</h3>
    </div>
    {catatan && <p className="mt-1 text-xs leading-relaxed text-slate-500">{catatan}</p>}
  </div>
);

/**
 * Batang horizontal dengan label nilai yang selalu terlihat.
 * Label wajib: langkah ramp paling terang tidak mencapai kontras 3:1.
 */
const Batang = ({ label, nilai, tampil, maks, warna, keterangan, judulHover }) => {
  const persen = maks > 0 ? Math.max(1.5, (nilai / maks) * 100) : 0;
  return (
    <div title={judulHover}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-slate-700">{label}</span>
        <span className="text-sm font-semibold tabular-nums text-slate-900">{tampil}</span>
      </div>
      <div className="mt-1.5 h-2.5 w-full rounded-[4px] bg-slate-100">
        <div
          className="h-2.5 rounded-[4px]"
          style={{ width: `${persen}%`, backgroundColor: warna }}
        />
      </div>
      {keterangan && <p className="mt-1 text-[11px] text-slate-500">{keterangan}</p>}
    </div>
  );
};

/* ------------------------------------------------------------------ utama -- */

const KELAS_OMSET = [
  { label: 'di bawah Rp 10 Jt', min: 0, maks: 1e7 },
  { label: 'Rp 10–50 Jt', min: 1e7, maks: 5e7 },
  { label: 'Rp 50–250 Jt', min: 5e7, maks: 2.5e8 },
  { label: 'Rp 250 Jt – 1 M', min: 2.5e8, maks: 1e9 },
  { label: 'di atas Rp 1 M', min: 1e9, maks: Infinity },
];

const URUTAN_PERINGKAT = ['Perintis', 'Pemula', 'Berkembang', 'Maju'];

const BumdesEkonomi = ({ data = [] }) => {
  const s = useMemo(() => {
    const total = data.length;
    if (!total) return null;

    const angkaAda = (v) => v !== null && v !== undefined;
    const omsetTerbaru = (d) => (angkaAda(d.omset_2025) ? d.omset_2025 : d.omset_2024);

    const beroperasi = data.filter((d) => (d.omset_2025 > 0) || (d.omset_2024 > 0)).length;

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

    const omsetPositif = data.map((d) => d.omset_2025).filter((v) => v > 0);
    const medianOmset = median(omsetPositif);

    const kelas = KELAS_OMSET.map((k) => ({
      ...k,
      n: omsetPositif.filter((v) => v >= k.min && v < k.maks).length,
    }));

    const peringkat = URUTAN_PERINGKAT.map((p) => ({
      label: p,
      n: data.filter((d) => String(d.pemeringkatan_2024 || '').trim().toLowerCase() === p.toLowerCase()).length,
    }));
    const peringkatTerdata = peringkat.reduce((t, p) => t + p.n, 0);

    return {
      total, beroperasi, lengkap, sebagian, kosong,
      modal, modalN: modalBersih.length, janggal,
      omset, laba, pades,
      medianOmset, omsetPositifN: omsetPositif.length,
      kelas, peringkat, peringkatTerdata,
    };
  }, [data]);

  if (!s) return null;

  const persen = (n) => Math.round((n / s.total) * 100);
  const maksCorong = Math.max(s.omset.nilai, s.laba.nilai, s.pades.nilai, 1);
  const maksKelas = Math.max(...s.kelas.map((k) => k.n), 1);
  const maksPeringkat = Math.max(...s.peringkat.map((p) => p.n), 1);

  return (
    <div className="space-y-5">
      {/* 1 — Berapa yang benar-benar hidup, dan seberapa lengkap datanya */}
      <Kartu>
        <Judul
          icon={Database}
          catatan="Status “aktif” adalah label administratif. Yang dihitung di sini adalah BUMDes yang melaporkan omset di atas nol — ukuran kegiatan usaha yang sebenarnya."
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
              label="Omset" nilai={s.omset.nilai} tampil={rupiahRingkas(s.omset.nilai)}
              maks={maksCorong} warna={RAMP[5]} judulHover={rupiahPenuh(s.omset.nilai)}
              keterangan={`dari ${s.omset.n} BUMDes yang mengisi`}
            />
            <Batang
              label="Laba" nilai={s.laba.nilai} tampil={rupiahRingkas(s.laba.nilai)}
              maks={maksCorong} warna={RAMP[3]} judulHover={rupiahPenuh(s.laba.nilai)}
              keterangan={`dari ${s.laba.n} BUMDes · ${s.omset.nilai > 0 ? ((s.laba.nilai / s.omset.nilai) * 100).toFixed(1) : 0}% dari omset`}
            />
            <Batang
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
                judulHover={`${k.n} BUMDes beromset ${k.label}`}
              />
            ))}
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
            Dihitung dari {s.omsetPositifN} BUMDes yang beromset di atas nol pada 2025.
          </p>
        </Kartu>
      </div>

      {/* 4 — Pemeringkatan resmi */}
      <Kartu>
        <Judul
          icon={Award}
          catatan="Penilaian resmi 2024 — satu-satunya penilaian yang lengkap untuk seluruh BUMDes. Pemeringkatan 2026 masih berjalan dan belum mencakup semuanya, jadi belum dipakai di sini."
        >
          Kelas BUMDes menurut penilaian resmi
        </Judul>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {s.peringkat.map((p, i) => (
            <Batang
              key={p.label}
              label={p.label}
              nilai={p.n}
              tampil={`${nf.format(p.n)} (${s.peringkatTerdata ? Math.round((p.n / s.peringkatTerdata) * 100) : 0}%)`}
              maks={maksPeringkat}
              warna={RAMP[i + 1]}
              judulHover={`${p.n} BUMDes berkelas ${p.label}`}
            />
          ))}
        </div>
      </Kartu>

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
