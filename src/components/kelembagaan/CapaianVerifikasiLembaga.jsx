import React from "react";
import { LuLoader } from "react-icons/lu";

const COLORS = {
  rw: { border: "#0f172a" },
  rt: { border: "#334155" },
  posyandu: { border: "#64748b" },
  karangTaruna: { border: "#94a3b8" },
  lpm: { border: "#b91c1c" },
  pkk: { border: "#94a3b8" },
};

const VERIFIKASI_KEYS = ["rw", "rt", "posyandu", "karangTaruna", "lpm", "pkk"];

const PersentaseBar = ({ label, verified, total, color }) => {
  const pct = total > 0 ? Math.round((verified / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="w-28 text-sm font-medium text-slate-700 shrink-0">{label}</div>
      <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="w-20 text-right text-sm">
        <span className="font-bold text-slate-900">{verified}</span>
        <span className="text-slate-400">/{total}</span>
      </div>
      <div className="w-12 text-right text-xs font-semibold" style={{ color }}>
        {pct}%
      </div>
    </div>
  );
};

const CapaianVerifikasiLembaga = ({ data, loading, error }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 flex items-center justify-center min-h-[200px]">
        <div className="flex items-center gap-2 text-slate-500">
          <LuLoader className="h-5 w-5 animate-spin" />
          <span className="text-sm">Memuat capaian verifikasi...</span>
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

  const { per_lembaga, grand_totals } = data;

  return (
    <div>
      <h3 className="text-lg font-bold text-slate-900 mb-1">Capaian Verifikasi Per Lembaga</h3>
      <p className="text-sm text-slate-500 mb-4">
        Persentase kelembagaan yang telah diverifikasi kabupaten
      </p>
      <div className="divide-y divide-slate-100">
        {VERIFIKASI_KEYS.map((key) => (
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
      <div className="mt-3 pt-3 border-t-2 border-slate-200 flex items-center gap-3">
        <div className="w-28 text-sm font-bold text-slate-900 shrink-0">Total</div>
        <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-slate-700 transition-all duration-700"
            style={{ width: `${grand_totals.persentase_verifikasi}%` }}
          />
        </div>
        <div className="w-20 text-right text-sm">
          <span className="font-bold text-slate-900">{grand_totals.verified}</span>
          <span className="text-slate-400">/{grand_totals.total}</span>
        </div>
        <div className="w-12 text-right text-xs font-bold text-slate-900">
          {grand_totals.persentase_verifikasi}%
        </div>
      </div>
    </div>
  );
};

export default CapaianVerifikasiLembaga;
