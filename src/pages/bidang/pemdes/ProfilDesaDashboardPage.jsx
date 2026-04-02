import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  BarChart3,
  Building2,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ClipboardList,
  Filter,
  Loader2,
  Mail,
  MapPinned,
  Phone,
  PieChart as PieChartIcon,
  RefreshCw,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend as RechartsLegend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import toast from 'react-hot-toast';
import api from '../../../api';
import { useBidangPath } from '../../../hooks/useBidangPath';

const COMPLETION_COLORS = ['#0f766e', '#f59e0b', '#cbd5e1'];
const CATEGORY_COLORS = ['#0284c7', '#7c3aed', '#ea580c', '#16a34a', '#db2777', '#0f766e'];
const KECAMATAN_COLORS = ['#0f766e', '#14b8a6', '#22c55e', '#84cc16', '#f59e0b', '#f97316', '#fb7185', '#8b5cf6'];
const RADIAN = Math.PI / 180;

const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) {
    return null;
  }

  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={700}
    >
      {`${Math.round(percent * 100)}%`}
    </text>
  );
};

const formatNumber = (value) => new Intl.NumberFormat('id-ID').format(Number(value || 0));

const formatDate = (value) => {
  if (!value) {
    return 'Belum diperbarui';
  }

  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getCompletionTone = (statusKey) => {
  if (statusKey === 'lengkap') {
    return {
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      bar: 'from-emerald-500 to-teal-500',
    };
  }

  if (statusKey === 'perlu_dilengkapi') {
    return {
      badge: 'bg-amber-100 text-amber-700 border-amber-200',
      bar: 'from-amber-500 to-orange-500',
    };
  }

  return {
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
    bar: 'from-slate-300 to-slate-400',
  };
};

const buildParams = (filters, includePagination = false, pagination = { page: 1, limit: 15 }) => {
  const params = new URLSearchParams();
  const filterKeys = [
    'search',
    'kecamatan_id',
    'desa_id',
    'klasifikasi_desa',
    'status_desa',
    'tipologi_desa',
    'completion_status',
  ];

  filterKeys.forEach((key) => {
    if (filters[key]) {
      params.append(key, filters[key]);
    }
  });

  if (includePagination) {
    params.append('page', String(pagination.page));
    params.append('limit', String(pagination.limit));
  }

  return params.toString();
};

const StatCard = ({ icon, title, value, subtitle, tone }) => {
  const iconElement = React.createElement(icon, { className: 'h-6 w-6' });

  return (
    <div className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{title}</p>
          <p className="mt-3 text-3xl font-black tracking-tight text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
          {iconElement}
        </div>
      </div>
    </div>
  );
};

const InsightList = ({ title, icon, items, emptyText, accentClass, progressClass }) => {
  const iconElement = React.createElement(icon, { className: 'h-5 w-5' });

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center gap-3">
        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accentClass}`}>
          {iconElement}
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">5 desa teratas berdasarkan kondisi profil</p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-400">
          {emptyText}
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.desa_id} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900">{item.nama_desa}</p>
                  <p className="mt-1 text-xs text-slate-500">Kecamatan {item.kecamatan_nama}</p>
                </div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-sm">
                  {item.completion_percentage}%
                </span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white">
                <div
                  className={`h-2 rounded-full bg-gradient-to-r ${progressClass}`}
                  style={{ width: `${Math.max(item.completion_percentage, 6)}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">{item.status_label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const IndicatorPill = ({ active, label, icon }) => {
  const iconElement = React.createElement(icon, { className: 'h-3.5 w-3.5' });

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
        active
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
          : 'border-slate-200 bg-slate-50 text-slate-400'
      }`}
    >
      {iconElement}
      {label}
    </div>
  );
};

const ChartEmpty = ({ text }) => (
  <div className="flex h-[260px] items-center justify-center text-sm text-slate-400">{text}</div>
);

const ProfilDesaDashboardPage = () => {
  const navigate = useNavigate();
  const { getPath } = useBidangPath();
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [data, setData] = useState([]);
  const [stats, setStats] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [desaList, setDesaList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1, totalItems: 0 });
  const [filters, setFilters] = useState({
    search: '',
    kecamatan_id: '',
    desa_id: '',
    klasifikasi_desa: '',
    status_desa: '',
    tipologi_desa: '',
    completion_status: '',
  });

  const fetchKecamatanList = useCallback(async () => {
    try {
      const response = await api.get('/kecamatans');
      if (response.data.success) {
        setKecamatanList(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch kecamatan list:', error);
    }
  }, []);

  const fetchDesaByKecamatan = useCallback(async (kecamatanId) => {
    try {
      const response = await api.get(`/desas/kecamatan/${kecamatanId}`);
      if (response.data.success) {
        setDesaList(response.data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch desa list:', error);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setStatsLoading(true);
      const queryString = buildParams(filters);
      const response = await api.get(`/pemdes/profil-desa/stats${queryString ? `?${queryString}` : ''}`);
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch profil desa stats:', error);
      toast.error('Gagal memuat ringkasan profil desa');
    } finally {
      setStatsLoading(false);
    }
  }, [filters]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const queryString = buildParams(filters, true, {
        page: pagination.page,
        limit: pagination.limit,
      });
      const response = await api.get(`/pemdes/profil-desa${queryString ? `?${queryString}` : ''}`);

      if (response.data.success) {
        setData(response.data.data || []);
        setPagination((prev) => ({
          ...prev,
          totalPages: response.data.meta?.totalPages || 1,
          totalItems: response.data.meta?.totalItems || 0,
        }));
      }
    } catch (error) {
      console.error('Failed to fetch profil desa data:', error);
      toast.error('Gagal memuat data profil desa');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.limit, pagination.page]);

  useEffect(() => {
    fetchKecamatanList();
  }, [fetchKecamatanList]);

  useEffect(() => {
    if (filters.kecamatan_id) {
      fetchDesaByKecamatan(filters.kecamatan_id);
      return;
    }

    setDesaList([]);
    setFilters((prev) => ({ ...prev, desa_id: '' }));
  }, [fetchDesaByKecamatan, filters.kecamatan_id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      kecamatan_id: '',
      desa_id: '',
      klasifikasi_desa: '',
      status_desa: '',
      tipologi_desa: '',
      completion_status: '',
    });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const summaryText = stats
    ? `${stats.profil_terisi} dari ${stats.total_desa} desa sudah memiliki isian profil. ${stats.profil_lengkap} desa berada pada kategori lengkap, sementara ${stats.profil_belum_diisi} desa masih belum memiliki data inti.`
    : '';

  const klasifikasiChart = stats?.klasifikasi || [];
  const kecamatanChart = stats?.kecamatan_completion?.slice(0, 8) || [];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,_rgba(13,148,136,0.16),_transparent_28%),radial-gradient(circle_at_bottom_left,_rgba(249,115,22,0.14),_transparent_30%),#f8fafc] px-4 py-6 sm:px-6 lg:px-8">
      <div className=" space-y-6">
        <div className="relative overflow-hidden rounded-[30px] bg-gradient-to-br from-amber-500 via-orange-500 to-teal-600 p-7 text-white shadow-[0_24px_80px_-32px_rgba(15,118,110,0.65)] sm:p-8">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.32),_transparent_42%)]" />
          <div className="absolute -right-14 bottom-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-10 top-8 h-32 w-32 rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <button
                onClick={() => navigate(getPath('/bidang/pemdes'))}
                className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/15"
              >
                <ArrowLeft className="h-4 w-4" />
                Kembali ke Pemdes
              </button>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                <Sparkles className="h-4 w-4" />
                Dashboard Profil Desa
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Profil seluruh desa dalam satu panel ringkas</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
                Pantau kelengkapan data profil desa, sebaran kategori, kualitas informasi lokasi, dan desa yang perlu ditindaklanjuti tanpa harus membuka profil satu per satu.
              </p>
              {stats && (
                <div className="mt-5 rounded-3xl border border-white/15 bg-white/10 px-5 py-4 text-sm leading-6 text-white/90 backdrop-blur-sm">
                  {summaryText}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
              <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-white/70">Rata-rata</p>
                <p className="mt-2 text-3xl font-black">{stats?.rata_rata_kelengkapan ?? 0}%</p>
                <p className="mt-1 text-xs text-white/70">kelengkapan profil inti</p>
              </div>
              <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-white/70">Populasi</p>
                <p className="mt-2 text-3xl font-black">{formatNumber(stats?.total_penduduk_terlapor || 0)}</p>
                <p className="mt-1 text-xs text-white/70">penduduk terlapor</p>
              </div>
              <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-white/70">Koordinat</p>
                <p className="mt-2 text-3xl font-black">{formatNumber(stats?.desa_dengan_koordinat || 0)}</p>
                <p className="mt-1 text-xs text-white/70">desa punya titik lokasi</p>
              </div>
              <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-white/70">Foto Kantor</p>
                <p className="mt-2 text-3xl font-black">{formatNumber(stats?.desa_dengan_foto || 0)}</p>
                <p className="mt-1 text-xs text-white/70">profil dengan dokumentasi</p>
              </div>
            </div>
          </div>
        </div>

        {statsLoading && !stats ? (
          <div className="flex items-center justify-center rounded-3xl border border-slate-200 bg-white p-12 text-slate-500 shadow-sm">
            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
            Memuat ringkasan profil desa...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <StatCard
                icon={Building2}
                title="Total Desa"
                value={formatNumber(stats?.total_desa || 0)}
                subtitle="wilayah yang dipantau pada dashboard ini"
                tone="bg-sky-100 text-sky-700"
              />
              <StatCard
                icon={ClipboardList}
                title="Profil Terisi"
                value={formatNumber(stats?.profil_terisi || 0)}
                subtitle={`${formatNumber(stats?.profil_tersimpan || 0)} profil sudah tersimpan di sistem`}
                tone="bg-emerald-100 text-emerald-700"
              />
              <StatCard
                icon={BadgeCheck}
                title="Profil Lengkap"
                value={formatNumber(stats?.profil_lengkap || 0)}
                subtitle={`${formatNumber(stats?.profil_perlu_dilengkapi || 0)} desa masih perlu pelengkapan`}
                tone="bg-teal-100 text-teal-700"
              />
              <StatCard
                icon={Users}
                title="Data Kontak"
                value={formatNumber(stats?.desa_dengan_kontak || 0)}
                subtitle="desa sudah memiliki telepon atau email"
                tone="bg-amber-100 text-amber-700"
              />
              <StatCard
                icon={MapPinned}
                title="Titik Lokasi"
                value={formatNumber(stats?.desa_dengan_koordinat || 0)}
                subtitle="profil memiliki latitude dan longitude"
                tone="bg-violet-100 text-violet-700"
              />
              <StatCard
                icon={Camera}
                title="Narasi & Foto"
                value={formatNumber(stats?.desa_dengan_narasi || 0)}
                subtitle={`${formatNumber(stats?.desa_dengan_foto || 0)} desa sudah mengunggah foto kantor`}
                tone="bg-rose-100 text-rose-700"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
                    <PieChartIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Status kelengkapan</h3>
                    <p className="text-sm text-slate-500">Proporsi profil lengkap, parsial, dan kosong</p>
                  </div>
                </div>

                {stats?.completion_status?.some((item) => item.value > 0) ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={stats.completion_status}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={105}
                        labelLine={false}
                        label={renderPieLabel}
                      >
                        {stats.completion_status.map((entry, index) => (
                          <Cell key={entry.key} fill={COMPLETION_COLORS[index % COMPLETION_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value, name) => [`${value} desa`, name]} />
                      <RechartsLegend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <ChartEmpty text="Belum ada data untuk divisualisasikan" />
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Klasifikasi desa</h3>
                    <p className="text-sm text-slate-500">Kategori profil yang paling banyak dilaporkan</p>
                  </div>
                </div>

                {klasifikasiChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={klasifikasiChart}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={105}
                        labelLine={false}
                        label={renderPieLabel}
                      >
                        {klasifikasiChart.map((entry, index) => (
                          <Cell key={entry.key} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip formatter={(value, name) => [`${value} desa`, name]} />
                      <RechartsLegend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <ChartEmpty text="Belum ada klasifikasi desa yang terisi" />
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm xl:col-span-4">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Rata-rata per kecamatan</h3>
                    <p className="text-sm text-slate-500">Skor kelengkapan rata-rata untuk 8 kecamatan teratas</p>
                  </div>
                </div>

                {kecamatanChart.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={kecamatanChart} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} fontSize={12} />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                      <RechartsTooltip formatter={(value, name, item) => [`${value}%`, item?.payload?.name || name]} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                        {kecamatanChart.map((entry, index) => (
                          <Cell key={entry.id} fill={KECAMATAN_COLORS[index % KECAMATAN_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <ChartEmpty text="Belum ada ringkasan kecamatan" />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <InsightList
                title="Desa dengan progres terbaik"
                icon={BadgeCheck}
                items={stats?.top_completed || []}
                emptyText="Belum ada data desa yang bisa dibandingkan."
                accentClass="bg-emerald-100 text-emerald-700"
                progressClass="from-emerald-500 to-teal-500"
              />
              <InsightList
                title="Desa prioritas tindak lanjut"
                icon={CircleAlert}
                items={stats?.needs_attention || []}
                emptyText="Tidak ada desa yang membutuhkan perhatian saat ini."
                accentClass="bg-amber-100 text-amber-700"
                progressClass="from-amber-500 to-orange-500"
              />
            </div>
          </>
        )}

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Daftar profil desa</h2>
              <p className="mt-1 text-sm text-slate-500">Filter data berdasarkan wilayah, kategori profil, dan status kelengkapan.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative min-w-[280px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(event) => handleFilterChange('search', event.target.value)}
                  placeholder="Cari desa, kode, kecamatan, atau kategori..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-teal-400 focus:bg-white"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowFilters((prev) => !prev)}
                className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                  showFilters
                    ? 'border-teal-200 bg-teal-50 text-teal-700'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Filter className="h-4 w-4" />
                Filter
                <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              <button
                type="button"
                onClick={() => {
                  fetchStats();
                  fetchData();
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Muat ulang
              </button>

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Reset
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-5 grid grid-cols-1 gap-3 border-t border-slate-100 pt-5 md:grid-cols-2 xl:grid-cols-6">
              <select
                value={filters.kecamatan_id}
                onChange={(event) => handleFilterChange('kecamatan_id', event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-teal-400 focus:bg-white"
              >
                <option value="">Semua Kecamatan</option>
                {kecamatanList.map((kecamatan) => (
                  <option key={kecamatan.id} value={kecamatan.id}>
                    {kecamatan.nama}
                  </option>
                ))}
              </select>

              <select
                value={filters.desa_id}
                onChange={(event) => handleFilterChange('desa_id', event.target.value)}
                disabled={!filters.kecamatan_id}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none disabled:cursor-not-allowed disabled:bg-slate-100 focus:border-teal-400 focus:bg-white"
              >
                <option value="">Semua Desa</option>
                {desaList.map((desa) => (
                  <option key={desa.id} value={desa.id}>
                    {desa.nama}
                  </option>
                ))}
              </select>

              <select
                value={filters.completion_status}
                onChange={(event) => handleFilterChange('completion_status', event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-teal-400 focus:bg-white"
              >
                <option value="">Semua Status Kelengkapan</option>
                {(stats?.filter_options?.completion_status || []).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                value={filters.klasifikasi_desa}
                onChange={(event) => handleFilterChange('klasifikasi_desa', event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-teal-400 focus:bg-white"
              >
                <option value="">Semua Klasifikasi</option>
                {(stats?.filter_options?.klasifikasi_desa || []).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                value={filters.status_desa}
                onChange={(event) => handleFilterChange('status_desa', event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-teal-400 focus:bg-white"
              >
                <option value="">Semua Status Desa</option>
                {(stats?.filter_options?.status_desa || []).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>

              <select
                value={filters.tipologi_desa}
                onChange={(event) => handleFilterChange('tipologi_desa', event.target.value)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none focus:border-teal-400 focus:bg-white"
              >
                <option value="">Semua Tipologi</option>
                {(stats?.filter_options?.tipologi_desa || []).map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200">
            {loading ? (
              <div className="flex items-center justify-center py-16 text-slate-500">
                <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                Memuat daftar profil desa...
              </div>
            ) : data.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <ClipboardList className="mx-auto h-12 w-12 text-slate-300" />
                <p className="mt-4 text-base font-semibold text-slate-700">Tidak ada data yang cocok</p>
                <p className="mt-2 text-sm text-slate-500">Ubah filter atau kata kunci pencarian untuk melihat hasil lain.</p>
              </div>
            ) : (
              <>
                <div className="hidden overflow-x-auto xl:block">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50/90">
                      <tr>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Desa</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Kategori Profil</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Kelengkapan</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Kontak & Penduduk</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Indikator</th>
                        <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Update</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {data.map((item) => {
                        const tone = getCompletionTone(item.completion.status_key);

                        return (
                          <tr key={item.desa_id} className="align-top transition hover:bg-slate-50/70">
                            <td className="px-6 py-5">
                              <div className="min-w-[220px]">
                                <p className="text-sm font-semibold text-slate-900">{item.nama_desa}</p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {item.status_pemerintahan === 'kelurahan' ? 'Kelurahan' : 'Desa'} · Kode {item.kode_desa}
                                </p>
                                <p className="mt-2 text-xs font-medium text-slate-600">Kecamatan {item.kecamatan.nama}</p>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="min-w-[240px] space-y-2">
                                <div className="flex flex-wrap gap-2">
                                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                                    {item.klasifikasi_desa_label}
                                  </span>
                                  <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                                    {item.status_desa_label}
                                  </span>
                                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                                    {item.tipologi_desa_label}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="min-w-[220px]">
                                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tone.badge}`}>
                                    {item.completion.status_label}
                                  </span>
                                  <span className="font-bold text-slate-800">{item.completion.percentage}%</span>
                                </div>
                                <div className="h-2 rounded-full bg-slate-100">
                                  <div
                                    className={`h-2 rounded-full bg-gradient-to-r ${tone.bar}`}
                                    style={{ width: `${Math.max(item.completion.percentage, item.completion.percentage === 0 ? 0 : 6)}%` }}
                                  />
                                </div>
                                <p className="mt-2 text-xs text-slate-500">
                                  {item.completion.filled} dari {item.completion.total} indikator inti terisi
                                </p>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="min-w-[220px] space-y-2 text-sm text-slate-600">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-slate-400" />
                                  <span>{item.jumlah_penduduk ? `${formatNumber(item.jumlah_penduduk)} jiwa` : 'Penduduk belum diisi'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-slate-400" />
                                  <span>{item.no_telp || 'Nomor telepon belum diisi'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Mail className="h-4 w-4 text-slate-400" />
                                  <span className="truncate">{item.email || 'Email belum diisi'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5">
                              <div className="min-w-[220px] space-y-2">
                                <div className="flex flex-wrap gap-2">
                                  <IndicatorPill active={item.flags.has_contact} label="Kontak" icon={Phone} />
                                  <IndicatorPill active={item.flags.has_coordinates} label="Koordinat" icon={MapPinned} />
                                  <IndicatorPill active={item.flags.has_office_photo} label="Foto" icon={Camera} />
                                  <IndicatorPill active={item.flags.has_narratives} label="Narasi" icon={ClipboardList} />
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-sm text-slate-600">
                              <div className="min-w-[140px]">
                                <p className="font-medium text-slate-700">{formatDate(item.updated_at)}</p>
                                <p className="mt-1 text-xs text-slate-500">Status: {item.profil_tersimpan ? 'profil tersimpan' : 'belum dibuat'}</p>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-4 p-4 xl:hidden">
                  {data.map((item) => {
                    const tone = getCompletionTone(item.completion.status_key);

                    return (
                      <div key={item.desa_id} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-base font-bold text-slate-900">{item.nama_desa}</p>
                            <p className="mt-1 text-xs text-slate-500">Kecamatan {item.kecamatan.nama} · Kode {item.kode_desa}</p>
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tone.badge}`}>
                            {item.completion.status_label}
                          </span>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">
                            {item.klasifikasi_desa_label}
                          </span>
                          <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700">
                            {item.status_desa_label}
                          </span>
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                            {item.tipologi_desa_label}
                          </span>
                        </div>

                        <div className="mt-4">
                          <div className="mb-2 flex items-center justify-between text-sm text-slate-700">
                            <span>Kelengkapan inti</span>
                            <span className="font-bold">{item.completion.percentage}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-white">
                            <div
                              className={`h-2 rounded-full bg-gradient-to-r ${tone.bar}`}
                              style={{ width: `${Math.max(item.completion.percentage, item.completion.percentage === 0 ? 0 : 6)}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-slate-600 sm:grid-cols-2">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-slate-400" />
                            {item.jumlah_penduduk ? `${formatNumber(item.jumlah_penduduk)} jiwa` : 'Penduduk belum diisi'}
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-slate-400" />
                            {item.no_telp || 'Telepon belum diisi'}
                          </div>
                          <div className="flex items-center gap-2 sm:col-span-2">
                            <Mail className="h-4 w-4 text-slate-400" />
                            {item.email || 'Email belum diisi'}
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <IndicatorPill active={item.flags.has_contact} label="Kontak" icon={Phone} />
                          <IndicatorPill active={item.flags.has_coordinates} label="Koordinat" icon={MapPinned} />
                          <IndicatorPill active={item.flags.has_office_photo} label="Foto" icon={Camera} />
                          <IndicatorPill active={item.flags.has_narratives} label="Narasi" icon={ClipboardList} />
                        </div>

                        <p className="mt-4 text-xs text-slate-500">Pembaruan terakhir: {formatDate(item.updated_at)}</p>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-4 border-t border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-slate-500">
                    Menampilkan <span className="font-semibold text-slate-700">{data.length}</span> data dari total{' '}
                    <span className="font-semibold text-slate-700">{formatNumber(pagination.totalItems)}</span> desa.
                  </p>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                      disabled={pagination.page <= 1}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                      Halaman {pagination.page} / {pagination.totalPages}
                    </div>
                    <button
                      type="button"
                      onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))}
                      disabled={pagination.page >= pagination.totalPages}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilDesaDashboardPage;