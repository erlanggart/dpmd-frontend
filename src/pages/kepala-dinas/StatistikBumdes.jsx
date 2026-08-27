// src/pages/kepala-dinas/StatistikBumdes.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import BumdesCharts from './components/BumdesCharts';
import BumdesEkonomi from './components/BumdesEkonomi';
import BumdesDirectory from './components/BumdesDirectory';
import { Store, TrendingUp, Building2, PauseCircle, AlertCircle } from 'lucide-react';
import PageHeader from '../../components/statistik/PageHeader';
import { useDataCache } from '../../context/DataCacheContext';
import { isVpnUser } from '../../utils/vpnHelper';

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api',
  getEndpoint: (path) => {
    const basePath = isVpnUser() ? '/vpn-core' : '/kepala-dinas';
    return `${API_CONFIG.BASE_URL}${basePath}${path}`;
  }
};

const CACHE_KEY = 'statistik-bumdes';
const CACHE_KEY_DAFTAR = 'statistik-bumdes-daftar';

const SummaryCard = ({ icon: Icon, label, value, sub, tone = 'default' }) => {
  const iconClass =
    tone === 'positive'
      ? 'bg-emerald-50 text-emerald-600 ring-emerald-100'
      : tone === 'muted'
        ? 'bg-slate-100 text-slate-500 ring-slate-200'
        : 'bg-slate-900 text-white';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-600">
          {label}
        </p>
        <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ring-1 ${iconClass}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
};

const StatistikBumdes = () => {
  const [loading, setLoading] = useState(true);
  const [bumdesData, setBumdesData] = useState(null);
  const [daftar, setDaftar] = useState([]);
  const [error, setError] = useState(null);
  const { getCachedData, setCachedData, isCached } = useDataCache();

  useEffect(() => {
    // Ringkasan dan daftar disimpan terpisah di cache; keduanya harus sama-sama
    // ada sebelum boleh melewati pemanggilan ke server, kalau tidak direktori
    // akan tampil kosong padahal datanya cuma belum diambil.
    if (isCached(CACHE_KEY) && isCached(CACHE_KEY_DAFTAR)) {
      setBumdesData(getCachedData(CACHE_KEY).data);
      setDaftar(getCachedData(CACHE_KEY_DAFTAR).data || []);
      setLoading(false);
    } else {
      fetchBumdesData();
    }
  }, []);

  const fetchBumdesData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('expressToken');
      const config = token ? { headers: { Authorization: `Bearer ${token}` } } : {};

      // Diambil berbarengan: ringkasan untuk kartu dan grafik, daftar untuk
      // direktori. Daftar dibiarkan gagal sendiri tanpa menjatuhkan halaman —
      // ringkasan tetap berguna walau direktorinya tidak tersedia.
      const [ringkasan, daftarRes] = await Promise.allSettled([
        axios.get(API_CONFIG.getEndpoint('/dashboard'), config),
        axios.get(API_CONFIG.getEndpoint('/bumdes'), config),
      ]);

      if (ringkasan.status === 'rejected') throw ringkasan.reason;

      const data = ringkasan.value.data.data.bumdes;
      setBumdesData(data);
      setCachedData(CACHE_KEY, data);

      if (daftarRes.status === 'fulfilled') {
        const isi = daftarRes.value.data?.data || [];
        setDaftar(isi);
        setCachedData(CACHE_KEY_DAFTAR, isi);
      } else {
        console.error('Gagal memuat daftar BUMDes:', daftarRes.reason);
        setDaftar([]);
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching bumdes data:', err);
      setError(err.response?.data?.message || 'Gagal memuat data BUMDes');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-900" />
          <p className="mt-3 text-sm text-slate-500">Memuat data BUMDes…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 ring-1 ring-rose-100">
            <AlertCircle className="h-5 w-5 text-rose-600" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-900">Data gagal dimuat</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{error}</p>
          <button
            onClick={fetchBumdesData}
            className="mt-5 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  const total = bumdesData?.total || 0;
  const aktif = bumdesData?.aktif || 0;
  const nonAktif = bumdesData?.non_aktif || 0;
  const persen = (n) => (total > 0 ? `${((n / total) * 100).toFixed(1)}% dari total` : '0% dari total');

  return (
    <div className="min-h-screen bg-slate-50 p-4 pt-20 sm:p-6 lg:p-8 lg:pt-8">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Header */}
        <PageHeader
          icon={Store}
          title="Statistik BUMDes"
          subtitle="Badan Usaha Milik Desa se-Kabupaten Bogor"
          stats={[
            { label: 'Total BUMDes', value: total.toLocaleString('id-ID') },
            { label: 'Aktif', value: aktif.toLocaleString('id-ID') },
            { label: 'Non-Aktif', value: nonAktif.toLocaleString('id-ID') },
            {
              label: 'Berbadan Hukum',
              value: (bumdesData?.berbadan_hukum || 0).toLocaleString('id-ID'),
            },
          ]}
        />

        {/* Ringkasan */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SummaryCard
            icon={Building2}
            label="Total BUMDes"
            value={total.toLocaleString('id-ID')}
            sub="Unit usaha terdaftar"
          />
          <SummaryCard
            icon={TrendingUp}
            label="BUMDes Aktif"
            value={aktif.toLocaleString('id-ID')}
            sub={persen(aktif)}
            tone="positive"
          />
          <SummaryCard
            icon={PauseCircle}
            label="BUMDes Non-Aktif"
            value={nonAktif.toLocaleString('id-ID')}
            sub={persen(nonAktif)}
            tone="muted"
          />
        </div>

        {/* Gambaran ekonomi — setiap angka menyebut berapa BUMDes yang
            menyusunnya. Menggantikan kartu total lama yang memakai penyebut
            416 padahal hanya sekitar separuh yang melapor. */}
        <BumdesEkonomi data={daftar} />

        {/* Sebaran per kecamatan dan status */}
        <BumdesCharts bumdes={bumdesData} />

        {/* Direktori: pencarian + detail per BUMDes */}
        <BumdesDirectory data={daftar} />
      </div>
    </div>
  );
};

export default StatistikBumdes;
