// Halaman statistik penyaluran per tahap (BHPRD T1–T3, DD Earmarked/Non-Earmarked,
// Insentif DD). Sebelumnya delapan file terpisah yang isinya identik dan hanya
// beda endpoint + tema warna; sekarang satu komponen dengan konfigurasi.
//
// Warna: dominan hitam-navy; merah bata hanya sebagai teks. Warna status
// (hijau/kuning/merah) dipertahankan karena mengandung makna data.
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  TrendingUp,
  DollarSign,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  MapPin,
  Download,
  AlertCircle,
} from 'lucide-react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import api from '../../api';
import { isVpnUser } from '../../utils/vpnHelper';
import { useDataCache } from '../../context/DataCacheContext';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

// Deret warna grafik yang serumpun dengan brand: merah bata → emas → slate.
const CHART_SERIES = ['#0f172a', '#334155', '#64748b', '#94a3b8', '#cbd5e1', '#b91c1c'];
const CHART_PRIMARY = '#0f172a';

const formatRupiah = (value) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value || 0);

const STATUS_BADGE = {
  Tersampaikan: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  'Belum Tersampaikan': 'bg-rose-50 text-rose-700 ring-rose-200',
  Proses: 'bg-amber-50 text-amber-700 ring-amber-200',
};

const StatusBadge = ({ status }) => (
  <span
    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${
      STATUS_BADGE[status] || 'bg-slate-100 text-slate-600 ring-slate-200'
    }`}
  >
    {status || '—'}
  </span>
);

const StatCard = ({ icon: Icon, label, value, tone = 'default' }) => {
  const toneClass =
    tone === 'positive'
      ? 'text-emerald-700'
      : tone === 'warning'
        ? 'text-amber-700'
        : 'text-slate-900';
  const iconClass =
    tone === 'positive'
      ? 'bg-emerald-50 text-emerald-600 ring-emerald-100'
      : tone === 'warning'
        ? 'bg-amber-50 text-amber-600 ring-amber-100'
        : 'bg-slate-900 text-white';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-600">
          {label}
        </p>
        <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ring-1 ${iconClass}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={`mt-2 break-words text-xl font-semibold tracking-tight ${toneClass}`}>
        {value}
      </p>
    </div>
  );
};

const ChartCard = ({ title, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
    <div className="mb-4 flex items-center gap-2.5">
      <span className="h-4 w-1 rounded-full bg-slate-900" />
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
    </div>
    {children}
  </div>
);

const StatistikTahapanPage = ({
  title,
  subtitle,
  icon: HeaderIcon = DollarSign,
  cacheKey,
  endpoint,
  vpnEndpoint,
  exportSheetName,
  exportFileName,
  valueLabel = 'Realisasi', // 'Realisasi' (BHPRD) atau 'Alokasi' (DD)
  desaCount = 'rows', // 'unique' bila satu desa punya banyak baris (BHPRD)
  showCairBreakdown = false, // kartu Dana Cair / Belum Cair (BHPRD)
  showDetailTable = false, // tabel rincian per kecamatan (DD)
  backPath = '/core-dashboard/dashboard',
}) => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedKecamatan, setExpandedKecamatan] = useState({});
  const { getCachedData, setCachedData, isCached } = useDataCache();

  const fetchData = async () => {
    try {
      setLoading(true);
      const url = isVpnUser() ? vpnEndpoint : endpoint;
      const response = await api.get(url);
      const result = response.data.data || [];
      setData(result);
      setCachedData(cacheKey, result);
      setError(null);
    } catch (err) {
      console.error(`Error fetching ${title} data:`, err);
      setError(`Gagal memuat data ${title}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isCached(cacheKey)) {
      setData(getCachedData(cacheKey).data);
      setLoading(false);
    } else {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  const processedData = useMemo(
    () =>
      data.map((item) => ({
        kecamatan: item.kecamatan,
        desa: item.desa,
        status: item.sts,
        realisasi: parseInt(item.Realisasi?.replace(/,/g, '') || '0', 10),
      })),
    [data]
  );

  const stats = useMemo(() => {
    const totalDesa =
      desaCount === 'unique'
        ? new Set(processedData.map((i) => `${i.kecamatan}_${i.desa}`)).size
        : processedData.length;
    const total = processedData.reduce((sum, i) => sum + i.realisasi, 0);
    const danaCair = processedData
      .filter(
        (i) =>
          i.status?.toLowerCase().includes('cair') ||
          i.status?.toLowerCase().includes('selesai')
      )
      .reduce((sum, i) => sum + i.realisasi, 0);

    const kecamatanStats = processedData.reduce((acc, i) => {
      if (!acc[i.kecamatan]) acc[i.kecamatan] = 0;
      acc[i.kecamatan] += i.realisasi;
      return acc;
    }, {});

    return {
      totalDesa,
      total,
      danaCair,
      belumCair: total - danaCair,
      avgPerDesa: totalDesa > 0 ? Math.round(total / totalDesa) : 0,
      totalKecamatan: Object.keys(kecamatanStats).length,
      topKecamatan: Object.entries(kecamatanStats)
        .map(([name, t]) => ({ name, total: t }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 10),
    };
  }, [processedData, desaCount]);

  const groupedByKecamatan = useMemo(
    () =>
      processedData.reduce((acc, item) => {
        if (!acc[item.kecamatan]) acc[item.kecamatan] = [];
        acc[item.kecamatan].push(item);
        return acc;
      }, {}),
    [processedData]
  );

  const statusChartData = useMemo(() => {
    const statusCount = processedData.reduce((acc, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      return acc;
    }, {});
    const labels = Object.keys(statusCount);
    return {
      labels,
      datasets: [
        {
          data: Object.values(statusCount),
          backgroundColor: labels.map((_, i) => CHART_SERIES[i % CHART_SERIES.length]),
          borderColor: '#ffffff',
          borderWidth: 2,
        },
      ],
    };
  }, [processedData]);

  const kecamatanChartData = useMemo(
    () => ({
      labels: stats.topKecamatan.map((k) => k.name),
      datasets: [
        {
          label: `Total ${valueLabel} (Rp)`,
          data: stats.topKecamatan.map((k) => k.total),
          backgroundColor: CHART_PRIMARY,
          borderRadius: 4,
        },
      ],
    }),
    [stats.topKecamatan, valueLabel]
  );

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { padding: 14, font: { size: 11 }, boxWidth: 10 } },
    },
  };

  const barChartOptions = {
    ...chartOptions,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        ticks: { callback: (value) => `Rp ${(value / 1000000).toFixed(0)}jt`, font: { size: 11 } },
      },
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
    },
  };

  const handleExport = () => {
    const exportData = processedData.map((item) => ({
      Kecamatan: item.kecamatan,
      Desa: item.desa,
      Status: item.status,
      [valueLabel]: formatRupiah(item.realisasi),
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, exportSheetName);
    XLSX.writeFile(wb, `${exportFileName}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-[3px] border-slate-200 border-t-slate-900" />
          <p className="mt-3 text-sm text-slate-500">Memuat data {title}…</p>
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
          <h3 className="mt-4 text-base font-semibold text-slate-900">Data gagal dimuat</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{error}</p>
          <button
            onClick={fetchData}
            className="mt-5 w-full rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 pt-20 sm:p-6 lg:p-8 lg:pt-8">
      <div className="mx-auto max-w-7xl space-y-5">
        {/* Kembali */}
        <button
          onClick={() => navigate(backPath)}
          className="group inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          Kembali ke Dashboard
        </button>

        {/* Header */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-3.5">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900">
              <HeaderIcon className="h-5 w-5 text-white" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                {title}
              </h1>
              <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
              <p className="mt-2 text-xs text-slate-400">
                {stats.totalDesa} desa · {stats.totalKecamatan} kecamatan ·{' '}
                <span className="font-medium text-slate-600">{formatRupiah(stats.total)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
        </div>

        {/* Ringkasan */}
        <div
          className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${
            showCairBreakdown ? 'lg:grid-cols-5' : 'lg:grid-cols-3'
          }`}
        >
          <StatCard icon={Users} label="Total Desa" value={stats.totalDesa} />
          <StatCard
            icon={DollarSign}
            label={`Total ${valueLabel}`}
            value={formatRupiah(stats.total)}
          />
          {showCairBreakdown && (
            <>
              <StatCard
                icon={CheckCircle}
                label="Dana Cair"
                value={formatRupiah(stats.danaCair)}
                tone="positive"
              />
              <StatCard
                icon={XCircle}
                label="Belum Cair"
                value={formatRupiah(stats.belumCair)}
                tone="warning"
              />
            </>
          )}
          <StatCard
            icon={TrendingUp}
            label="Rata-rata / Desa"
            value={formatRupiah(stats.avgPerDesa)}
          />
        </div>

        {/* Grafik */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ChartCard title="Distribusi Status">
            <div className="h-72">
              <Pie data={statusChartData} options={chartOptions} />
            </div>
          </ChartCard>
          <ChartCard title="10 Kecamatan Tertinggi">
            <div className="h-72">
              <Bar data={kecamatanChartData} options={barChartOptions} />
            </div>
          </ChartCard>
        </div>

        {/* Rincian per kecamatan */}
        {showDetailTable && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex items-center gap-2.5 border-b border-slate-200 p-5">
              <span className="h-4 w-1 rounded-full bg-slate-900" />
              <h3 className="text-sm font-semibold text-slate-900">
                Rincian per Kecamatan
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-brand-600">
                      Kecamatan
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-brand-600">
                      Desa
                    </th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-brand-600">
                      Status
                    </th>
                    <th className="px-5 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-brand-600">
                      {valueLabel}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {Object.entries(groupedByKecamatan).map(([kecamatan, items]) => {
                    const isExpanded = expandedKecamatan[kecamatan];
                    const totalKec = items.reduce((sum, i) => sum + i.realisasi, 0);
                    return (
                      <React.Fragment key={kecamatan}>
                        <tr className="bg-slate-50/70">
                          <td className="px-5 py-3" colSpan="4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <MapPin className="h-4 w-4 flex-shrink-0 text-brand-600" />
                                <span className="truncate font-semibold text-slate-900">
                                  {kecamatan}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {items.length} desa
                                </span>
                                <span className="text-xs font-semibold text-slate-700">
                                  {formatRupiah(totalKec)}
                                </span>
                              </div>
                              <button
                                onClick={() =>
                                  setExpandedKecamatan((prev) => ({
                                    ...prev,
                                    [kecamatan]: !prev[kecamatan],
                                  }))
                                }
                                className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition-colors hover:border-slate-200 hover:bg-slate-50 hover:text-brand-700"
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronUp className="h-3.5 w-3.5" />
                                    Tutup
                                  </>
                                ) : (
                                  <>
                                    <ChevronDown className="h-3.5 w-3.5" />
                                    Lihat Detail
                                  </>
                                )}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded &&
                          items.map((item, index) => (
                            <tr
                              key={`${item.desa}-${index}`}
                              className="transition-colors hover:bg-slate-50"
                            >
                              <td className="px-5 py-3 text-sm text-slate-400">— {kecamatan}</td>
                              <td className="px-5 py-3 text-sm font-medium text-slate-900">
                                {item.desa}
                              </td>
                              <td className="px-5 py-3">
                                <StatusBadge status={item.status} />
                              </td>
                              <td className="px-5 py-3 text-right text-sm font-semibold text-slate-900">
                                {formatRupiah(item.realisasi)}
                              </td>
                            </tr>
                          ))}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatistikTahapanPage;
