// src/pages/kepala-dinas/StatistikBumdes.jsx
//
// Halaman Statistik BUMDes untuk Core Dashboard. Kartu angka, grafik, dan
// direktori dihitung dari satu daftar (/kepala-dinas/bumdes) dan satu irisan
// filter, supaya tidak ada dua angka berbeda untuk hal yang sama.
import React, { lazy, Suspense, useMemo, useState } from 'react';
import axios from 'axios';
import { Store, AlertCircle, Plus, FolderOpen, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';
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

// Formulir tambah/ubah memakai skema kolom yang SAMA dengan halaman desa
// (components/bumdes/skemaBumdes.js), jadi keduanya tidak bisa menyimpang lagi.
// Dimuat malas supaya Core Dashboard — yang hanya membaca — tidak ikut
// menanggung ukurannya.
const FormulirBumdesSpked = lazy(() => import('../../components/bumdes/FormulirBumdesSpked'));
const BumdesDokumenManager = lazy(() => import('../bidang/spked/bumdes/BumdesDokumenManager'));

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api',
  getEndpoint: (path) => {
    const basePath = isVpnUser() ? '/vpn-core' : '/kepala-dinas';
    return `${API_CONFIG.BASE_URL}${basePath}${path}`;
  },
};

const CACHE_KEY_DAFTAR = 'statistik-bumdes-daftar';

const nf = new Intl.NumberFormat('id-ID');

/**
 * `tersemat` dipakai saat halaman ini menjadi salah satu sub-tab di halaman
 * Bidang SPKED. Yang dilepas hanya bingkai halaman penuh dan kepala halamannya
 * — perhitungannya tidak boleh bercabang, justru itu inti "satu sumber, satu
 * irisan": angka di SPKED dan di Core Dashboard harus mustahil berbeda.
 */
const StatistikBumdes = ({ tersemat = false, bisaKelola = false }) => {
  const { getCachedData, setCachedData, isCached } = useDataCache();
  const [daftar, setDaftar] = useState(() =>
    (isCached(CACHE_KEY_DAFTAR) ? getCachedData(CACHE_KEY_DAFTAR).data : null));
  const [loading, setLoading] = useState(() => !isCached(CACHE_KEY_DAFTAR));
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({ ...FILTER_AWAL });

  // Panel pengelolaan. Hanya dipakai bila `bisaKelola` — Core Dashboard
  // membuka halaman ini untuk membaca, bukan menyunting.
  const [panel, setPanel] = useState(null);        // 'tambah' | 'ubah' | 'dokumen'
  const [dataUbah, setDataUbah] = useState(null);  // baris MENTAH dari /bumdes
  const [memuatUbah, setMemuatUbah] = useState(false);

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

  /**
   * Membuka formulir ubah.
   *
   * Baris di halaman ini datang dari /kepala-dinas/bumdes yang sudah
   * dinormalkan (`nama`, `aset`, `omset_2025`), sedangkan formulir suntingnya
   * menunggu bentuk MENTAH tabelnya (`namabumdesa`, `NilaiAset`, `Omset2025`).
   * Jadi barisnya diambil ulang lewat /bumdes/:id, bukan dipetakan balik —
   * pemetaan balik atas 60-an kolom pasti meleset dan diam-diam menghapus
   * kolom yang tidak ikut terpetakan saat disimpan.
   */
  const bukaUbah = React.useCallback(async (baris) => {
    setMemuatUbah(true);
    try {
      const res = await api.get(`/bumdes/${baris.id}`);
      const mentah = res.data?.data || res.data;
      if (!mentah) throw new Error('Data tidak ditemukan');
      setDataUbah(mentah);
      setPanel('ubah');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memuat data BUMDes untuk diubah');
    } finally {
      setMemuatUbah(false);
    }
  }, []);

  /** Tutup panel dan ambil ulang daftar supaya angka di seluruh halaman ikut bergerak. */
  const selesaiKelola = React.useCallback(() => {
    setPanel(null);
    setDataUbah(null);
    ambilData();
  }, [ambilData]);

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
      <div className={`flex items-center justify-center px-4 ${tersemat ? 'py-20' : 'min-h-screen bg-slate-50'}`}>
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-900" />
          <p className="mt-3 text-sm text-slate-500">Memuat data BUMDes…</p>
        </div>
      </div>
    );
  }

  if (error && daftar === null) {
    return (
      <div className={`flex items-center justify-center p-4 ${tersemat ? 'py-16' : 'min-h-screen bg-slate-50'}`}>
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
    <div className={tersemat ? '' : 'min-h-screen bg-slate-50 p-4 pt-20 sm:p-6 lg:p-8 lg:pt-8'}>
      {!tersemat && (
        <div className="mx-auto max-w-7xl">
          {/* Angka di kepala halaman selalu se-kabupaten, tidak ikut filter. */}
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
      )}

      {bisaKelola && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPanel('tambah')}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Tambah BUMDes
          </button>
          {/* Dokumen "Tidak Terhubung" — berkas di server yang tidak tertaut ke
              BUMDes mana pun — tidak mungkin muncul di modal detail, karena modal
              itu selalu milik satu BUMDes. Jadi pengelola dokumen tetap ada,
              hanya pindah dari tab tersendiri menjadi panel di sini. */}
          <button
            type="button"
            onClick={() => setPanel('dokumen')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <FolderOpen className="h-4 w-4" />
            Kelola Dokumen
          </button>
          {memuatUbah && (
            <span className="inline-flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Memuat data untuk diubah…
            </span>
          )}
        </div>
      )}

      <div className="mt-5">
        <BumdesFilterBar
          data={semua}
          filter={filter}
          onChange={setFilter}
          jumlahHasil={hasil.length}
          tersemat={tersemat}
        />
      </div>

      {/* Saat data diambil ulang, isi lama ditahan dengan opasitas diturunkan. */}
      <div
        className={`mx-auto mt-5 space-y-5 transition-opacity duration-300 ${tersemat ? '' : 'max-w-7xl'} ${
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
          onUbah={bisaKelola ? bukaUbah : undefined}
        />
      </div>

      {/* Panel pengelolaan. Layar penuh dan z-[60]+ — bilah navigasi bawah
          PegawaiLayout memakai z-50 dan akan menelan kliknya. */}
      {bisaKelola && panel && (
        <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm">
          <div className="flex h-full flex-col">
            <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
              <h2 className="text-sm font-semibold text-slate-900">
                {panel === 'tambah' && 'Tambah BUMDes'}
                {panel === 'ubah' && `Ubah ${dataUbah?.namabumdesa || 'BUMDes'}`}
                {panel === 'dokumen' && 'Kelola Dokumen BUMDes'}
              </h2>
              <button
                type="button"
                onClick={selesaiKelola}
                aria-label="Tutup"
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center gap-3 py-24 text-sm text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Memuat formulir…
                  </div>
                }
              >
                {panel === 'tambah' && <FormulirBumdesSpked onSelesai={selesaiKelola} />}
                {panel === 'ubah' && dataUbah && (
                  <FormulirBumdesSpked awal={dataUbah} onSelesai={selesaiKelola} />
                )}
                {panel === 'dokumen' && <BumdesDokumenManager />}
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatistikBumdes;
