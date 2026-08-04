import React from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { LuLoader } from "react-icons/lu";

ChartJS.register(ArcElement, Tooltip, Legend);

const RingkasanStatusKelembagaan = ({ data, loading, error }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 flex items-center justify-center min-h-[200px]">
        <div className="flex items-center gap-2 text-slate-500">
          <LuLoader className="h-5 w-5 animate-spin" />
          <span className="text-sm">Memuat ringkasan status...</span>
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

  const { grand_totals } = data;

  const doughnutData = {
    labels: ["Terverifikasi", "Belum Terverifikasi", "Verifikasi Ditolak"],
    datasets: [{
      data: [grand_totals.verified, grand_totals.unverified, grand_totals.ditolak || 0],
      backgroundColor: ["rgba(34, 197, 94, 0.85)", "rgba(234, 179, 8, 0.85)", "rgba(239, 68, 68, 0.85)"],
      borderColor: ["#059669", "#d97706", "#e11d48"],
      borderWidth: 2,
      hoverOffset: 6,
    }],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: {
      legend: {
        position: "bottom",
        labels: { padding: 16, usePointStyle: true, font: { size: 12, weight: "500" } },
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.85)",
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: (ctx) => {
            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
            const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
            return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900 mb-1">Ringkasan Status Kelembagaan</h3>
      <p className="text-sm text-slate-500">
        Komposisi verifikasi dan status aktif seluruh kelembagaan
      </p>
      <div>
        <h4 className="text-sm font-semibold text-slate-700 text-center mb-3">Status Verifikasi</h4>
        <div className="h-56">
          <Doughnut data={doughnutData} options={doughnutOptions} />
        </div>
        <div className="text-center mt-3">
          <span className="text-2xl font-bold text-slate-900">{grand_totals.persentase_verifikasi}%</span>
          <span className="text-sm text-slate-500 ml-2">terverifikasi</span>
        </div>
      </div>
    </div>
  );
};

export default RingkasanStatusKelembagaan;
