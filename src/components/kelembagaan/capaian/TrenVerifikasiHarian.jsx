import React, { useEffect, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { LuLoader } from "react-icons/lu";
import kelembagaanApi from "../../../api/kelembagaan";
import { WARNA_LEMBAGA } from "./warnaLembaga";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const RENTANG = [7, 30, 90];

const formatTanggal = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" });

const Statistik = ({ label, nilai }) => (
  <div className="rounded-lg bg-slate-50 px-4 py-3">
    <div className="text-xs text-slate-500">{label}</div>
    <div className="text-lg font-bold text-slate-900">{nilai}</div>
  </div>
);

const TrenVerifikasiHarian = () => {
  const [hari, setHari] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let batal = false;
    setLoading(true);
    setError(null);
    kelembagaanApi
      .getTrenVerifikasiHarian(hari)
      .then((res) => !batal && setData(res.data))
      .catch((err) => !batal && setError(err.response?.data?.message || "Gagal memuat tren verifikasi"))
      .finally(() => !batal && setLoading(false));
    return () => {
      batal = true;
    };
  }, [hari]);

  const keys = Object.keys(WARNA_LEMBAGA);
  const totalPerHari = data
    ? data.tanggal.map((_, i) => keys.reduce((s, k) => s + (data.per_lembaga[k]?.data[i] || 0), 0))
    : [];
  const totalPeriode = totalPerHari.reduce((a, b) => a + b, 0);
  const puncak = Math.max(0, ...totalPerHari);
  const hariPuncak = puncak > 0 ? data.tanggal[totalPerHari.indexOf(puncak)] : null;
  const hariIni = totalPerHari[totalPerHari.length - 1] || 0;

  const chartData = data && {
    labels: data.tanggal.map(formatTanggal),
    datasets: keys.map((k) => ({
      label: data.per_lembaga[k]?.label || k,
      data: data.per_lembaga[k]?.data || [],
      backgroundColor: WARNA_LEMBAGA[k],
      borderRadius: 2,
    })),
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom", labels: { usePointStyle: true, pointStyle: "rectRounded", boxWidth: 12, padding: 16 } },
      tooltip: {
        filter: (item) => item.parsed.y > 0,
        callbacks: {
          footer: (items) => `Total: ${totalPerHari[items[0]?.dataIndex] || 0} lembaga`,
        },
      },
    },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
      y: {
        stacked: true,
        beginAtZero: true,
        ticks: { precision: 0 },
        title: { display: true, text: "Lembaga diverifikasi" },
      },
    },
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Tren Verifikasi Harian</h3>
          <p className="text-sm text-slate-500">Jumlah lembaga yang diverifikasi kabupaten per hari</p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
          {RENTANG.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setHari(r)}
              aria-pressed={hari === r}
              className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${
                hari === r ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {r} hari
            </button>
          ))}
        </div>
      </div>

      {data && !loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Statistik label={`Total ${hari} hari`} nilai={totalPeriode} />
          <Statistik label="Hari ini" nilai={hariIni} />
          <Statistik label="Rata-rata per hari" nilai={(totalPeriode / hari).toFixed(1)} />
          <Statistik label="Puncak" nilai={hariPuncak ? `${puncak} (${formatTanggal(hariPuncak)})` : "-"} />
        </div>
      )}

      <div className="h-80">
        {loading ? (
          <div className="h-full flex items-center justify-center gap-2 text-slate-500">
            <LuLoader className="h-5 w-5 animate-spin" />
            <span className="text-sm">Memuat tren verifikasi...</span>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-sm text-red-600">{error}</div>
        ) : (
          <Bar data={chartData} options={chartOptions} />
        )}
      </div>

      <p className="text-xs text-slate-400 mt-3">
        Dihitung dari tanggal verifikasi terakhir lembaga yang saat ini berstatus terverifikasi.
      </p>
    </div>
  );
};

export default TrenVerifikasiHarian;
