import React from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { LuLoader } from "react-icons/lu";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const COLORS = {
  rw: { border: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)" },
  rt: { border: "#06b6d4", bg: "rgba(6, 182, 212, 0.15)" },
  posyandu: { border: "#9333ea", bg: "rgba(147, 51, 234, 0.15)" },
};

const CHART_KEYS = ["rw", "rt", "posyandu"];

const ChartVerifikasiTahunan = ({ data, loading, error }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 flex items-center justify-center min-h-[300px]">
        <div className="flex items-center gap-2 text-gray-500">
          <LuLoader className="h-5 w-5 animate-spin" />
          <span className="text-sm">Memuat chart verifikasi...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-sm text-red-600">{error || "Data tidak tersedia"}</p>
      </div>
    );
  }

  const { years, per_lembaga } = data;
  const labels = years.map(String);

  const getCumulativeVerified = (key, year) => {
    const found = per_lembaga[key]?.cumulative_verified?.find((r) => r.tahun === year);
    return found ? found.jumlah_verified : 0;
  };

  const chartData = {
    labels,
    datasets: CHART_KEYS.map((key) => ({
      label: per_lembaga[key]?.label || key.toUpperCase(),
      data: years.map((y) => getCumulativeVerified(key, y)),
      backgroundColor: COLORS[key].border,
      borderColor: COLORS[key].border,
      borderWidth: 1,
      borderRadius: 4,
      barPercentage: 0.7,
      categoryPercentage: 0.8,
    })),
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: "rectRounded",
          font: { size: 12, family: "'Inter', sans-serif", weight: "500" },
          boxWidth: 12,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.85)",
        padding: 14,
        titleFont: { size: 13, weight: "bold" },
        bodyFont: { size: 12 },
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} lembaga terverifikasi`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 12, weight: "600" } },
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0,0,0,0.04)" },
        ticks: { font: { size: 11 }, precision: 0 },
        title: { display: true, text: "Jumlah Lembaga Terverifikasi", font: { size: 12 } },
      },
    },
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-1">
        Perkembangan Verifikasi RW, RT & Posyandu
      </h3>
      <p className="text-sm text-gray-500 mb-5">
        Jumlah kumulatif lembaga terverifikasi per tahun
      </p>
      <div className="h-80">
        <Bar data={chartData} options={chartOptions} />
      </div>
      <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100">
        {CHART_KEYS.map((key) => (
          <div key={key} className="text-center">
            <div className="text-2xl font-bold" style={{ color: COLORS[key].border }}>
              {per_lembaga[key]?.totals.verified || 0}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {per_lembaga[key]?.label} Terverifikasi
            </div>
            {(per_lembaga[key]?.totals.unverified || 0) > 0 && (
              <div className="text-xs text-amber-500 mt-0.5">
                {per_lembaga[key]?.totals.unverified} belum terverifikasi
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartVerifikasiTahunan;
