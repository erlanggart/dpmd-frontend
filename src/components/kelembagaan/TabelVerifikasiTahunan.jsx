import React from "react";
import { LuLoader } from "react-icons/lu";

const COLORS = {
  rw: { border: "#0f172a" },
  rt: { border: "#334155" },
  posyandu: { border: "#64748b" },
};

const TABLE_KEYS = ["rw", "rt", "posyandu"];

const TabelVerifikasiTahunan = ({ data, loading, error }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 flex items-center justify-center min-h-[200px]">
        <div className="flex items-center gap-2 text-slate-500">
          <LuLoader className="h-5 w-5 animate-spin" />
          <span className="text-sm">Memuat tabel verifikasi...</span>
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

  const getCumulativeVerified = (key, year) => {
    const found = per_lembaga[key]?.cumulative_verified?.find((r) => r.tahun === year);
    return found ? found.jumlah_verified : 0;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 overflow-x-auto">
      <h3 className="text-lg font-bold text-slate-900 mb-1">
        Jumlah Terverifikasi RW, RT & Posyandu Per Tahun
      </h3>
      <p className="text-sm text-slate-500 mb-4">
        Jumlah kumulatif lembaga yang telah diverifikasi tiap tahun
      </p>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-slate-200">
            <th className="text-left py-3 px-3 font-semibold text-slate-700">Lembaga</th>
            {years.map((year) => (
              <th key={year} className="text-center py-3 px-3 font-semibold text-slate-700">
                {year}
              </th>
            ))}
            <th className="text-center py-3 px-3 font-semibold text-slate-700">Saat Ini</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {TABLE_KEYS.map((key) => (
            <tr key={key} className="hover:bg-slate-50">
              <td className="py-3 px-3 font-semibold" style={{ color: COLORS[key].border }}>
                {per_lembaga[key]?.label}
              </td>
              {years.map((year) => (
                <td key={year} className="py-3 px-3 text-center">
                  <span className="font-bold text-slate-900">{getCumulativeVerified(key, year)}</span>
                </td>
              ))}
              <td className="py-3 px-3 text-center">
                <span className="font-bold" style={{ color: COLORS[key].border }}>
                  {per_lembaga[key]?.totals.verified || 0}
                </span>
                <span className="text-slate-400 text-xs ml-1">/ {per_lembaga[key]?.totals.total || 0}</span>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
            <td className="py-3 px-3 text-slate-900">Total</td>
            {years.map((year) => (
              <td key={year} className="py-3 px-3 text-center font-bold text-slate-900">
                {TABLE_KEYS.reduce((sum, key) => sum + getCumulativeVerified(key, year), 0)}
              </td>
            ))}
            <td className="py-3 px-3 text-center font-bold text-slate-900">
              {TABLE_KEYS.reduce((sum, key) => sum + (per_lembaga[key]?.totals.verified || 0), 0)}
              <span className="text-slate-400 text-xs ml-1">
                / {TABLE_KEYS.reduce((sum, key) => sum + (per_lembaga[key]?.totals.total || 0), 0)}
              </span>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default TabelVerifikasiTahunan;
