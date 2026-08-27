// Direktori BUMDes untuk halaman Statistik BUMDes di Core Dashboard.
//
// Seluruh 416 baris diambil sekali dari /kepala-dinas/bumdes, lalu pencarian,
// penyaringan, pengurutan, dan halaman dikerjakan di sisi klien. Untuk jumlah
// sebesar ini itu jauh lebih enak dipakai daripada bolak-balik ke server:
// hasilnya muncul seketika saat mengetik.
//
// Kelas Tailwind ditulis utuh, tidak dirangkai dari variabel — kelas dinamis
// tidak ikut ter-scan saat build dan diam-diam hilang di produksi.
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Search, SlidersHorizontal, X, ArrowUpDown, ArrowUp, ArrowDown,
  Building2, MapPin, Phone, Mail, User, FileText, Wallet,
  CheckCircle2, XCircle, Inbox, RotateCcw, ChevronLeft, ChevronRight,
} from 'lucide-react';

const PER_HALAMAN = 12;

/* ----------------------------------------------------------------- format -- */

const nf = new Intl.NumberFormat('id-ID');

const rupiah = (n) =>
  n === null || n === undefined || Number.isNaN(n) ? '—' : `Rp ${nf.format(n)}`;

/** Bentuk ringkas untuk kolom tabel yang sempit: Rp 1,2 M / Rp 286 Jt. */
const rupiahRingkas = (n) => {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  if (n === 0) return 'Rp 0';
  const abs = Math.abs(n);
  if (abs >= 1e12) return `Rp ${(n / 1e12).toFixed(1).replace('.', ',')} T`;
  if (abs >= 1e9) return `Rp ${(n / 1e9).toFixed(1).replace('.', ',')} M`;
  if (abs >= 1e6) return `Rp ${Math.round(n / 1e6)} Jt`;
  if (abs >= 1e3) return `Rp ${Math.round(n / 1e3)} Rb`;
  return `Rp ${nf.format(n)}`;
};

const teks = (v) => (v === null || v === undefined || String(v).trim() === '' ? '—' : String(v));

const isAktif = (status) => String(status ?? '').toLowerCase().replace(/[\s-]+/g, '_') === 'aktif';

/* ------------------------------------------------------------------ atoms -- */

const KELAS_PERINGKAT = {
  Maju: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Berkembang: 'bg-sky-50 text-sky-700 ring-sky-200',
  Pemula: 'bg-amber-50 text-amber-700 ring-amber-200',
  Perintis: 'bg-slate-100 text-slate-600 ring-slate-200',
};

const LencanaStatus = ({ status }) =>
  isAktif(status) ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
      <CheckCircle2 className="h-3 w-3" /> Aktif
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
      <XCircle className="h-3 w-3" /> Tidak Aktif
    </span>
  );

const LencanaPeringkat = ({ nilai }) => {
  if (!nilai) return <span className="text-xs text-slate-400">—</span>;
  const kunci = String(nilai).trim();
  const kelas = KELAS_PERINGKAT[kunci] || 'bg-slate-100 text-slate-600 ring-slate-200';
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${kelas}`}>
      {kunci}
    </span>
  );
};

const Pilihan = ({ label, value, onChange, options }) => (
  <label className="flex min-w-0 flex-col gap-1">
    <span className="text-[11px] font-medium text-slate-500">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full truncate rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition-colors focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </label>
);

/* ------------------------------------------------------------ panel detail -- */

const Baris = ({ icon: Icon, label, children }) => (
  <div className="flex gap-3 py-2.5">
    {Icon && <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />}
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 break-words text-sm text-slate-800">{children}</p>
    </div>
  </div>
);

const Angka = ({ label, nilai }) => (
  <div className="rounded-lg bg-slate-50 px-3 py-2.5">
    <p className="text-[11px] font-medium text-slate-500">{label}</p>
    <p className="mt-0.5 text-sm font-semibold text-slate-900">{rupiah(nilai)}</p>
  </div>
);

const LABEL_DOKUMEN = {
  perdes: 'Perdes',
  anggaran_dasar: 'AD',
  anggaran_rumah_tangga: 'ART',
  program_kerja: 'Proker',
  sk_bum_desa: 'SK BUM Desa',
  profil: 'Profil',
  berita_acara: 'Berita Acara',
};

const PanelDetail = ({ item, onClose }) => {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <button
        type="button"
        aria-label="Tutup detail"
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Detail ${item.nama}`}
        className="relative flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <LencanaStatus status={item.status} />
              <LencanaPeringkat nilai={item.pemeringkatan} />
            </div>
            <h2 className="mt-2 truncate text-base font-semibold text-slate-900">{item.nama}</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {teks(item.desa)}, Kec. {teks(item.kecamatan)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!isAktif(item.status) && item.keterangan_tidak_aktif && (
            <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800 ring-1 ring-amber-100">
              {item.keterangan_tidak_aktif}
            </p>
          )}

          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Keuangan</h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Angka label="Nilai Aset" nilai={item.aset} />
              <Angka label="Penyertaan Modal" nilai={item.total_penyertaan_modal} />
              <Angka label="Omset 2024" nilai={item.omset_2024} />
              <Angka label="Laba 2024" nilai={item.laba_2024} />
              <Angka label="Omset 2025" nilai={item.omset_2025} />
              <Angka label="Laba 2025" nilai={item.laba_2025} />
              <Angka label="PADes 2024" nilai={item.pades_2024} />
              <Angka label="PADes 2025" nilai={item.pades_2025} />
            </div>
          </section>

          <section className="mt-5 border-t border-slate-100 pt-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Profil</h3>
            <div className="mt-1 divide-y divide-slate-100">
              <Baris icon={Building2} label="Tahun Pendirian">{teks(item.tahun_pendirian)}</Baris>
              <Baris icon={Wallet} label="Jenis Usaha Utama">{teks(item.jenis_usaha_utama)}</Baris>
              <Baris icon={User} label="Direktur">
                {teks(item.direktur)}
                {item.hp_direktur ? ` · ${item.hp_direktur}` : ''}
              </Baris>
              <Baris icon={User} label="Tenaga Kerja">
                {item.tenaga_kerja ? `${nf.format(item.tenaga_kerja)} orang` : '—'}
              </Baris>
              <Baris icon={MapPin} label="Alamat">{teks(item.alamat)}</Baris>
              <Baris icon={Phone} label="Telepon">{teks(item.telepon)}</Baris>
              <Baris icon={Mail} label="Email">{teks(item.email)}</Baris>
            </div>
          </section>

          <section className="mt-5 border-t border-slate-100 pt-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Legalitas</h3>
            <div className="mt-1 divide-y divide-slate-100">
              <Baris icon={FileText} label="Status Badan Hukum">{teks(item.badan_hukum)}</Baris>
              <Baris icon={FileText} label="Nomor Perdes">{teks(item.nomor_perdes)}</Baris>
              <Baris icon={FileText} label="NIB">{teks(item.nib)}</Baris>
              <Baris icon={FileText} label="NPWP">{teks(item.npwp)}</Baris>
              <Baris icon={FileText} label="LKPP">{teks(item.lkpp)}</Baris>
            </div>
          </section>

          <section className="mt-5 border-t border-slate-100 pt-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Dokumen Terunggah
            </h3>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {Object.entries(LABEL_DOKUMEN).map(([kunci, label]) => (
                <span
                  key={kunci}
                  className={
                    item.dokumen?.[kunci]
                      ? 'inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-emerald-200'
                      : 'inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-400 ring-1 ring-slate-200'
                  }
                >
                  {item.dokumen?.[kunci] ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  {label}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Laporan keuangan terunggah: {item.dokumen?.laporan_keuangan ?? 0} dari 4 tahun
            </p>
          </section>

          {(item.desa_wisata || item.ketahanan_pangan || item.peran_mbg) && (
            <section className="mt-5 border-t border-slate-100 pt-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Peran dalam Program
              </h3>
              <div className="mt-1 divide-y divide-slate-100">
                {item.ketahanan_pangan && <Baris label="Ketahanan Pangan 2025">{item.ketahanan_pangan}</Baris>}
                {item.desa_wisata && <Baris label="Desa Wisata">{item.desa_wisata}</Baris>}
                {item.peran_mbg && <Baris label="MBG">{item.peran_mbg}</Baris>}
              </div>
            </section>
          )}
        </div>
      </aside>
    </div>
  );
};

/* ------------------------------------------------------------------ utama -- */

const KOLOM_URUT = [
  { key: 'nama', label: 'Nama BUMDes', tipe: 'teks' },
  { key: 'kecamatan', label: 'Kecamatan', tipe: 'teks' },
  { key: 'aset', label: 'Aset', tipe: 'angka' },
  { key: 'omset_2024', label: 'Omset 2024', tipe: 'angka' },
  { key: 'laba_2024', label: 'Laba 2024', tipe: 'angka' },
  { key: 'tenaga_kerja', label: 'Pekerja', tipe: 'angka' },
];

const BumdesDirectory = ({ data = [] }) => {
  const [cari, setCari] = useState('');
  const [kecamatan, setKecamatan] = useState('semua');
  const [status, setStatus] = useState('semua');
  const [badanHukum, setBadanHukum] = useState('semua');
  const [peringkat, setPeringkat] = useState('semua');
  const [urut, setUrut] = useState({ key: 'nama', arah: 'asc' });
  const [halaman, setHalaman] = useState(1);
  const [filterTerbuka, setFilterTerbuka] = useState(false);
  const [dipilih, setDipilih] = useState(null);

  const opsiKecamatan = useMemo(() => {
    const set = [...new Set(data.map((d) => d.kecamatan).filter(Boolean))].sort();
    return [{ value: 'semua', label: 'Semua kecamatan' }, ...set.map((k) => ({ value: k, label: k }))];
  }, [data]);

  const opsiBadanHukum = useMemo(() => {
    const set = [...new Set(data.map((d) => d.badan_hukum).filter(Boolean))].sort();
    return [{ value: 'semua', label: 'Semua status' }, ...set.map((k) => ({ value: k, label: k }))];
  }, [data]);

  const opsiPeringkat = useMemo(() => {
    const set = [...new Set(data.map((d) => d.pemeringkatan).filter(Boolean))].sort();
    return [{ value: 'semua', label: 'Semua peringkat' }, ...set.map((k) => ({ value: k, label: k }))];
  }, [data]);

  const hasil = useMemo(() => {
    const kata = cari.trim().toLowerCase().split(/\s+/).filter(Boolean);

    const cocok = data.filter((d) => {
      if (kecamatan !== 'semua' && d.kecamatan !== kecamatan) return false;
      if (status === 'aktif' && !isAktif(d.status)) return false;
      if (status === 'tidak_aktif' && isAktif(d.status)) return false;
      if (badanHukum !== 'semua' && d.badan_hukum !== badanHukum) return false;
      if (peringkat !== 'semua' && d.pemeringkatan !== peringkat) return false;
      if (!kata.length) return true;

      // Setiap kata harus ditemukan, supaya "cibinong maju" menyempit, bukan melebar.
      // Kode desa ikut dicari dalam dua bentuk: tersimpan bertitik
      // ("32.01.05.2008") tapi orang lazim mengetiknya tanpa titik.
      const sasaran = [
        d.nama, d.desa, d.kecamatan, d.direktur,
        d.jenis_usaha_utama, d.nib, d.npwp,
        d.kode_desa, d.kode_desa?.replace(/./g, ''),
      ].filter(Boolean).join(' ').toLowerCase();
      return kata.every((k) => sasaran.includes(k));
    });

    const kolom = KOLOM_URUT.find((k) => k.key === urut.key) || KOLOM_URUT[0];
    const arah = urut.arah === 'asc' ? 1 : -1;
    return [...cocok].sort((a, b) => {
      const va = a[kolom.key];
      const vb = b[kolom.key];
      if (kolom.tipe === 'angka') {
        // Nilai kosong selalu tenggelam ke bawah, pada kedua arah urutan.
        // Memakai -Infinity saja membuatnya justru naik ke atas saat menaik.
        const aKosong = va === null || va === undefined;
        const bKosong = vb === null || vb === undefined;
        if (aKosong && bKosong) return 0;
        if (aKosong) return 1;
        if (bKosong) return -1;
        if (va === vb) return 0;
        return va < vb ? -arah : arah;
      }
      return String(va ?? '').localeCompare(String(vb ?? ''), 'id') * arah;
    });
  }, [data, cari, kecamatan, status, badanHukum, peringkat, urut]);

  useEffect(() => { setHalaman(1); }, [cari, kecamatan, status, badanHukum, peringkat, urut]);

  const totalHalaman = Math.max(1, Math.ceil(hasil.length / PER_HALAMAN));
  const halamanAman = Math.min(halaman, totalHalaman);
  const tampil = hasil.slice((halamanAman - 1) * PER_HALAMAN, halamanAman * PER_HALAMAN);

  const adaFilter =
    cari.trim() !== '' || kecamatan !== 'semua' || status !== 'semua' ||
    badanHukum !== 'semua' || peringkat !== 'semua';

  const reset = useCallback(() => {
    setCari(''); setKecamatan('semua'); setStatus('semua');
    setBadanHukum('semua'); setPeringkat('semua');
  }, []);

  const ubahUrut = (key) =>
    setUrut((u) => (u.key === key ? { key, arah: u.arah === 'asc' ? 'desc' : 'asc' } : { key, arah: 'asc' }));

  const IkonUrut = ({ aktif, arah }) => {
    if (!aktif) return <ArrowUpDown className="h-3.5 w-3.5 text-slate-300" />;
    return arah === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5 text-slate-700" />
      : <ArrowDown className="h-3.5 w-3.5 text-slate-700" />;
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white">
      {/* Kepala: pencarian + penyaring */}
      <div className="border-b border-slate-200 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari nama BUMDes, desa, kecamatan, direktur, NIB…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterTerbuka((v) => !v)}
              aria-expanded={filterTerbuka}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filter
            </button>
            {adaFilter && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            )}
          </div>
        </div>

        {filterTerbuka && (
          <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-2 lg:grid-cols-4">
            <Pilihan label="Kecamatan" value={kecamatan} onChange={setKecamatan} options={opsiKecamatan} />
            <Pilihan
              label="Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: 'semua', label: 'Semua status' },
                { value: 'aktif', label: 'Aktif' },
                { value: 'tidak_aktif', label: 'Tidak Aktif' },
              ]}
            />
            <Pilihan label="Badan Hukum" value={badanHukum} onChange={setBadanHukum} options={opsiBadanHukum} />
            <Pilihan label="Pemeringkatan" value={peringkat} onChange={setPeringkat} options={opsiPeringkat} />
          </div>
        )}

        <p className="mt-3 text-xs text-slate-500">
          Menampilkan <span className="font-semibold text-slate-800">{nf.format(hasil.length)}</span> dari{' '}
          {nf.format(data.length)} BUMDes
          {adaFilter ? ' (tersaring)' : ''}
        </p>
      </div>

      {/* Kosong */}
      {hasil.length === 0 ? (
        <div className="px-5 py-16 text-center">
          <Inbox className="mx-auto h-9 w-9 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">Tidak ada BUMDes yang cocok</p>
          <p className="mt-1 text-sm text-slate-500">Coba ubah kata kunci atau longgarkan penyaringnya.</p>
          {adaFilter && (
            <button
              type="button"
              onClick={reset}
              className="mt-4 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Reset pencarian
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Tabel — layar sedang ke atas */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  {KOLOM_URUT.map((k) => (
                    <th
                      key={k.key}
                      scope="col"
                      className={k.tipe === 'angka' ? 'px-4 py-2.5 text-right' : 'px-4 py-2.5'}
                    >
                      <button
                        type="button"
                        onClick={() => ubahUrut(k.key)}
                        className={
                          k.tipe === 'angka'
                            ? 'ml-auto inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-900'
                            : 'inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 transition-colors hover:text-slate-900'
                        }
                      >
                        {k.label}
                        <IkonUrut aktif={urut.key === k.key} arah={urut.arah} />
                      </button>
                    </th>
                  ))}
                  <th scope="col" className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tampil.map((d) => (
                  <tr
                    key={d.id}
                    onClick={() => setDipilih(d)}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') setDipilih(d); }}
                    className="cursor-pointer transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{d.nama}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{teks(d.desa)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{teks(d.kecamatan)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{rupiahRingkas(d.aset)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{rupiahRingkas(d.omset_2024)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">{rupiahRingkas(d.laba_2024)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                      {d.tenaga_kerja ? nf.format(d.tenaga_kerja) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col items-start gap-1">
                        <LencanaStatus status={d.status} />
                        <LencanaPeringkat nilai={d.pemeringkatan} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Kartu — layar kecil */}
          <ul className="divide-y divide-slate-100 md:hidden">
            {tampil.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => setDipilih(d)}
                  className="w-full px-4 py-3.5 text-left transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{d.nama}</p>
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {teks(d.desa)}, Kec. {teks(d.kecamatan)}
                      </p>
                    </div>
                    <LencanaStatus status={d.status} />
                  </div>
                  <dl className="mt-2.5 grid grid-cols-3 gap-2">
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-slate-400">Aset</dt>
                      <dd className="text-xs font-semibold tabular-nums text-slate-800">{rupiahRingkas(d.aset)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-slate-400">Omset 24</dt>
                      <dd className="text-xs font-semibold tabular-nums text-slate-800">{rupiahRingkas(d.omset_2024)}</dd>
                    </div>
                    <div>
                      <dt className="text-[10px] uppercase tracking-wide text-slate-400">Pekerja</dt>
                      <dd className="text-xs font-semibold tabular-nums text-slate-800">
                        {d.tenaga_kerja ? nf.format(d.tenaga_kerja) : '—'}
                      </dd>
                    </div>
                  </dl>
                </button>
              </li>
            ))}
          </ul>

          {/* Halaman */}
          {totalHalaman > 1 && (
            <nav
              aria-label="Navigasi halaman"
              className="flex flex-col gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-xs text-slate-500">
                Halaman {halamanAman} dari {totalHalaman}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHalaman((h) => Math.max(1, h - 1))}
                  disabled={halamanAman === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
                >
                  <ChevronLeft className="h-4 w-4" /> Sebelumnya
                </button>
                <button
                  type="button"
                  onClick={() => setHalaman((h) => Math.min(totalHalaman, h + 1))}
                  disabled={halamanAman === totalHalaman}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
                >
                  Berikutnya <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </nav>
          )}
        </>
      )}

      <PanelDetail item={dipilih} onClose={() => setDipilih(null)} />
    </section>
  );
};

export default BumdesDirectory;
