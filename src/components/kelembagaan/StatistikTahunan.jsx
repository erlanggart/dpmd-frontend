import React, { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Line, Doughnut } from "react-chartjs-2";
import { LuLoader } from "react-icons/lu";
import kelembagaanApi from "../../api/kelembagaan";

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const COLORS = {
  rw: { border: "#3b82f6", bg: "rgba(59, 130, 246, 0.15)" },
  rt: { border: "#06b6d4", bg: "rgba(6, 182, 212, 0.15)" },
  posyandu: { border: "#9333ea", bg: "rgba(147, 51, 234, 0.15)" },
  karangTaruna: { border: "#ea580c", bg: "rgba(234, 88, 12, 0.15)" },
  lpm: { border: "#4f46e5", bg: "rgba(79, 70, 229, 0.15)" },
  pkk: { border: "#ec4899", bg: "rgba(236, 72, 153, 0.15)" },
};

const PersentaseBar = ({ label, verified, total, color }) => {
  const pct = total > 0 ? Math.round((verified / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-28 text-sm font-medium text-gray-700 shrink-0">{label}</div>
      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="w-20 text-right text-sm">
        <span className="font-bold text-gray-900">{verified}</span>
        <span className="text-gray-400">/{total}</span>
      </div>
      <div className="w-12 text-right text-xs font-semibold" style={{ color }}>
        {pct}%
      </div>
    </div>
  );
};

const StatistikTahunan = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await kelembagaanApi.getStatistikTahunan();
        if (res.success) setData(res.data);
      } catch (err) {
        console.error("Error fetching statistik tahunan:", err);
        setError("Gagal memuat statistik tahunan");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 flex items-center justify-center min-h-[300px]">
        <div className="flex items-center gap-2 text-gray-500">
          <LuLoader className="h-5 w-5 animate-spin" />
          <span className="text-sm">Memuat statistik tahunan...</span>
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

  const { years, per_lembaga, grand_totals } = data;
  const labels = years.map(String);

  // Helper: get cumulative verified value for a lembaga at a given year
  const getCumulativeVerified = (key, year) => {
    const found = per_lembaga[key]?.cumulative_verified?.find((r) => r.tahun === year);
    return found ? found.jumlah_verified : 0;
  };

  // --- 1. Area Chart: Perkembangan Verifikasi RW, RT, Posyandu ---
  const areaChartKeys = ["rw", "rt", "posyandu"];
  const areaChartData = {
    labels,
    datasets: areaChartKeys.map((key) => ({
      label: per_lembaga[key]?.label || key.toUpperCase(),
      data: years.map((y) => getCumulativeVerified(key, y)),
      borderColor: COLORS[key].border,
      backgroundColor: COLORS[key].bg,
      borderWidth: 2.5,
      pointRadius: 5,
      pointHoverRadius: 7,
      pointBackgroundColor: "#fff",
      pointBorderColor: COLORS[key].border,
      pointBorderWidth: 2,
      tension: 0.35,
      fill: true,
    })),
  };

  const areaChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: "circle",
          font: { size: 12, family: "'Inter', sans-serif", weight: "500" },
          boxWidth: 10,
        },
      },
      tooltip: {
        backgroundColor: "rgba(0,0,0,0.85)",
        padding: 14,
        titleFont: { size: 13, weight: "bold" },
        bodyFont: { size: 12 },
        cornerRadius: 8,
        usePointStyle: true,
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

  // --- 2. Table data: RW, RT, Posyandu per tahun ---
  const tableKeys = ["rw", "rt", "posyandu"];

  // --- 3. Doughnut: Verifikasi (tanpa satlinmas) ---
  const verifikasiDoughnutData = {
    labels: ["Terverifikasi", "Belum Terverifikasi"],
    datasets: [{
      data: [grand_totals.verified, grand_totals.unverified],
      backgroundColor: ["rgba(34, 197, 94, 0.85)", "rgba(234, 179, 8, 0.85)"],
      borderColor: ["#22c55e", "#eab308"],
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

  // --- 4. Per lembaga verification keys (tanpa satlinmas) ---
  const verifikasiKeys = ["rw", "rt", "posyandu", "karangTaruna", "lpm", "pkk"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Statistik Kelembagaan Tahunan</h2>
        <p className="text-sm text-gray-500 mt-1">
          Tren perkembangan, verifikasi, dan status kelembagaan dari tahun ke tahun
        </p>
      </div>

      {/* Area Chart - Perkembangan Verifikasi RW, RT, Posyandu */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          Perkembangan Verifikasi RW, RT & Posyandu
        </h3>
        <p className="text-sm text-gray-500 mb-5">
          Jumlah kumulatif lembaga terverifikasi per tahun
        </p>
        <div className="h-80">
          <Line data={areaChartData} options={areaChartOptions} />
        </div>
        {/* Current counts */}
        <div className="grid grid-cols-3 gap-4 mt-5 pt-5 border-t border-gray-100">
          {areaChartKeys.map((key) => (
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

      {/* Tabel Jumlah Terverifikasi RW, RT, Posyandu Per Tahun */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 overflow-x-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-1">
          Jumlah Terverifikasi RW, RT & Posyandu Per Tahun
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Jumlah kumulatif lembaga yang telah diverifikasi tiap tahun
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-3 px-3 font-semibold text-gray-700">Lembaga</th>
              {years.map((year) => (
                <th key={year} className="text-center py-3 px-3 font-semibold text-gray-700">
                  {year}
                </th>
              ))}
              <th className="text-center py-3 px-3 font-semibold text-gray-700">Saat Ini</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tableKeys.map((key) => (
              <tr key={key} className="hover:bg-gray-50">
                <td className="py-3 px-3 font-semibold" style={{ color: COLORS[key].border }}>
                  {per_lembaga[key]?.label}
                </td>
                {years.map((year) => (
                  <td key={year} className="py-3 px-3 text-center">
                    <span className="font-bold text-gray-900">{getCumulativeVerified(key, year)}</span>
                  </td>
                ))}
                <td className="py-3 px-3 text-center">
                  <span className="font-bold" style={{ color: COLORS[key].border }}>
                    {per_lembaga[key]?.totals.verified || 0}
                  </span>
                  <span className="text-gray-400 text-xs ml-1">/ {per_lembaga[key]?.totals.total || 0}</span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-300 bg-gray-50 font-bold">
              <td className="py-3 px-3 text-gray-900">Total</td>
              {years.map((year) => (
                <td key={year} className="py-3 px-3 text-center font-bold text-gray-900">
                  {tableKeys.reduce((sum, key) => sum + getCumulativeVerified(key, year), 0)}
                </td>
              ))}
              <td className="py-3 px-3 text-center font-bold text-gray-900">
                {tableKeys.reduce((sum, key) => sum + (per_lembaga[key]?.totals.verified || 0), 0)}
                <span className="text-gray-400 text-xs ml-1">/ {tableKeys.reduce((sum, key) => sum + (per_lembaga[key]?.totals.total || 0), 0)}</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Doughnut Charts */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Capaian Verifikasi Per Lembaga */}
      <div className="col-span-1 md:col-span-2">
        <h3 className="text-lg font-bold text-gray-900 mb-1">Capaian Verifikasi Per Lembaga</h3>
        <p className="text-sm text-gray-500 mb-4">
          Persentase kelembagaan yang telah diverifikasi kabupaten
        </p>
        <div className="divide-y divide-gray-100">
          {verifikasiKeys.map((key) => (
            <PersentaseBar
              key={key}
              label={per_lembaga[key]?.label || key}
              verified={per_lembaga[key]?.totals.verified || 0}
              total={per_lembaga[key]?.totals.total || 0}
              color={COLORS[key]?.border || "#999"}
            />
          ))}
        </div>
        {/* Total row */}
        <div className="mt-3 pt-3 border-t-2 border-gray-200 flex items-center gap-3">
          <div className="w-28 text-sm font-bold text-gray-900 shrink-0">Total</div>
          <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full bg-gray-700 transition-all duration-700"
              style={{ width: `${grand_totals.persentase_verifikasi}%` }}
            />
          </div>
          <div className="w-20 text-right text-sm">
            <span className="font-bold text-gray-900">{grand_totals.verified}</span>
            <span className="text-gray-400">/{grand_totals.total}</span>
          </div>
          <div className="w-12 text-right text-xs font-bold text-gray-900">
            {grand_totals.persentase_verifikasi}%
          </div>
        </div>
      </div>
      
          <div className="col-span-1">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Ringkasan Status Kelembagaan</h3>
        <p className="text-sm text-gray-500 ">
          Komposisi verifikasi dan status aktif seluruh kelembagaan
        </p>
        <div>

        
            <h4 className="text-sm font-semibold text-gray-700 text-center mb-3">Status Verifikasi</h4>
            <div className="h-56">
              <Doughnut data={verifikasiDoughnutData} options={doughnutOptions} />
            </div>
            <div className="text-center mt-3">
              <span className="text-2xl font-bold text-gray-900">{grand_totals.persentase_verifikasi}%</span>
              <span className="text-sm text-gray-500 ml-2">terverifikasi</span>
            </div>
          </div>
          </div>
        </div>
      </div>

      
    </div>
  );
};

export default StatistikTahunan;
