// src/pages/kepala-dinas/StatistikBumdes.jsx
//
// Halaman Statistik BUMDes untuk Core Dashboard.
//
// SATU SUMBER, SATU IRISAN. Seluruh isi halaman — kartu angka, grafik, dan
// direktori — dihitung dari daftar yang sama (/kepala-dinas/bumdes) dan dari
// irisan filter yang sama. Sebelumnya grafik memakai agregat /kepala-dinas/
// dashboard sementara tabel memakai daftar, dan penyaringnya hanya ada di dalam
// tabel: menyaring satu kecamatan mengubah tabel tapi grafik di atasnya tetap
// menampilkan seluruh kabupaten. Dua angka berbeda untuk hal yang sama di satu
// layar. Sekarang tidak mungkin lagi.
import React, { useMemo, useState } from 'react';
import axios from 'axios';
import { Store, AlertCircle } from 'lucide-react';
import PageHeader from '../../components/statistik/PageHeader';
import { useDataCache } from '../../context/DataCacheContext';
import { isVpnUser } from '../../utils/vpnHelper';
import BumdesFilterBar from './components/BumdesFilterBar';
import BumdesRingkasan from './components/BumdesRingkasan';
import BumdesCharts from './components/BumdesCharts';
import BumdesEkonomi from './components/BumdesEkonomi';
import BumdesKesiapan from './components/BumdesKesiapan';
import BumdesDirectory from './components/BumdesDirectory';
import {
  FILTER_AWAL, adaFilterAktif, terapkanFilter, isAktif, beroperasi, tahapBadanHukum,
} from './components/bumdesFilter';

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api',
  getEndpoint: (path) => {
    const basePath = isVpnUser() ? '/vpn-core' : '/kepala-dinas';
    return `${API_CONFIG.BASE_URL}${basePath}${path}`;
  },
};

const CACHE_KEY_DAFTAR = 'statistik-bumdes-daftar';

const nf = new Intl.NumberFormat('id-ID');

const StatistikBumdes = () => {
  const { getCachedData, setCachedData, isCached } = useDataCache();
  const [daftar, setDaftar] = useState(() =>
    (isCached(CACHE_KEY_DAFTAR) ? getCachedData(CACHE_KEY_DAFTAR).data : null));
  const [loading, setLoading] = useState(() => !isCached(CACHE_KEY_DAFTAR));
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({ ...FILTER_AWAL });

  const ambilData = React.useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('expressToken');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};
      const res = await axios.get(API_CONFIG.getEndpoint('/bumdes'), config);
      const isi = res.data?.data || [];
      setDaftar(isi);
      setCachedData(CACHE_KEY_DAFTAR, isi);
      setError(null);
    } catch (err) {
      console.error('Error fetching bumdes data:', err);
      setError(err.response?.data?.message || 'Gagal memuat data BUMDes');
    } finally {
      setLoading(false);
    }
  }, [setCachedData]);

  React.useEffect(() => {
    if (daftar === null) ambilData();
    // Sengaja hanya sekali: cache sudah dibaca saat state dibuat.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const semua = useMemo(() => daftar || [], [daftar]);
  const hasil = useMemo(() => terapkanFilter(semua, filter), [semua, filter]);

  const ringkasan = useMemo(() => ({
    total: hasil.length,
    aktif: hasil.filter((d) => isAktif(d.status)).length,
    berbadanHukum: hasil.filter((d) => tahapBadanHukum(d) === 'Terbit Sertifikat Badan Hukum').length,
    beroperasi: hasil.filter(beroperasi).length,
  }), [hasil]);

  if (loading && daftar === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-900" />
          <p className="mt-3 text-sm text-slate-500">Memuat data BUMDes…</p>
        </div>
      </div>
    );
  }

  if (error && daftar === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 ring-1 ring-rose-100">
            <AlertCircle className="h-5 w-5 text-rose-600" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-900">Data gagal dimuat</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{error}</p>
          <button
            onClick={ambilData}
            className="mt-5 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const totalKabupaten = semua.length;
  const aktifKabupaten = semua.filter((d) => isAktif(d.status)).length;
  const badanHukumKabupaten = semua.filter(
    (d) => tahapBadanHukum(d) === 'Terbit Sertifikat Badan Hukum'
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 pt-20 sm:p-6 lg:p-8 lg:pt-8">
      <div className="mx-auto max-w-7xl">
        {/* Angka di kepala halaman SELALU se-kabupaten, tidak ikut filter —
            itu jangkar yang membuat pembaca tahu sebesar apa irisan yang
            sedang dilihatnya. */}
        <PageHeader
          icon={Store}
          title="Statistik BUMDes"
          subtitle="Badan Usaha Milik Desa se-Kabupaten Bogor"
          stats={[
            { label: 'Total BUMDes', value: nf.format(totalKabupaten) },
            { label: 'Aktif', value: nf.format(aktifKabupaten) },
            { label: 'Non-Aktif', value: nf.format(totalKabupaten - aktifKabupaten) },
            { label: 'Berbadan Hukum', value: nf.format(badanHukumKabupaten) },
          ]}
        />
      </div>

      {/* Satu baris penyaring, menaungi semua yang ada di bawahnya. */}
      <div className="mt-5">
        <BumdesFilterBar
          data={semua}
          filter={filter}
          onChange={setFilter}
          jumlahHasil={hasil.length}
        />
      </div>

      {/* Saat data sedang diambil ulang, isi lama ditahan dengan opasitas
          diturunkan: tidak ada kerangka berkedip dan tidak ada lompatan tata
          letak. */}
      <div
        className={`mx-auto mt-5 max-w-7xl space-y-5 transition-opacity duration-300 ${
          loading ? 'opacity-50' : 'opacity-100'
        }`}
      >
        <BumdesRingkasan ringkasan={ringkasan} totalKeseluruhan={totalKabupaten} />

        <BumdesCharts data={hasil} filter={filter} onFilter={setFilter} />

        <BumdesEkonomi data={hasil} />

        <BumdesKesiapan data={hasil} filter={filter} onFilter={setFilter} />

        <BumdesDirectory
          data={hasil}
          adaFilter={adaFilterAktif(filter)}
          onReset={() => setFilter({ ...FILTER_AWAL })}
        />
      </div>
    </div>
  );
};

export default StatistikBumdes;
