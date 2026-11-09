import React, { useState } from "react";

// scope: "desa" | "kelurahan" | "semua" dari tab halaman; kosong = gabungan.
const StatistikLKD = ({ summaryData, loading = false, scope }) => {
  const [mode, setMode] = useState("verified");
  const isVerified = mode === "verified";

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
        <div className="h-6 bg-slate-200 rounded w-1/3 mb-4" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 bg-slate-100 rounded mb-2" />
        ))}
      </div>
    );
  }

  if (!summaryData) {
    return null;
  }

  const KEYS = ["rw", "rt", "posyandu", "karangTaruna", "lpm", "pkk"];

  // Belum terverifikasi = total - terverifikasi
  const pick = (total, verified) =>
    isVerified ? verified : Math.max((total || 0) - (verified || 0), 0);

  const countByStatus = (status, key) =>
    pick(summaryData.by_status?.[status]?.[key], summaryData.verified_by_status?.[status]?.[key]);

  const count = (key) =>
    scope === "desa" || scope === "kelurahan"
      ? countByStatus(scope, key)
      : pick(summaryData.total_kelembagaan?.[key], summaryData.verified_kelembagaan?.[key]);

  const wilayah = { kelurahan: "Kelurahan", semua: "Desa & Kelurahan" }[scope] || "Desa";

  const totalCount = KEYS.reduce((acc, key) => acc + count(key), 0);

  const rwCount = count("rw");
  const rtCount = count("rt");
  const rwRtTotal = rwCount + rtCount;

  const lembagaList = [
    { label: "Posyandu", value: count("posyandu"), color: "#0f172a" },
    { label: "Karang Taruna", value: count("karangTaruna"), color: "#64748b" },
    { label: "LPM", value: count("lpm"), color: "#b91c1c" },
    { label: "PKK", value: count("pkk"), color: "#94a3b8" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Statistik LKD</h2>
          <p className="text-sm text-slate-500 mt-1">
            {isVerified
              ? `Lembaga Kemasyarakatan ${wilayah} yang telah terverifikasi dan aktif`
              : `Lembaga Kemasyarakatan ${wilayah} aktif yang belum terverifikasi`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
            {[
              { id: "verified", label: "Terverifikasi" },
              { id: "unverified", label: "Belum Terverifikasi" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setMode(item.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  mode === item.id
                    ? "bg-white text-brand-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-slate-900">{totalCount}</div>
            <div className="text-xs text-slate-500">
              {isVerified ? "Total Terverifikasi" : "Total Belum Terverifikasi"}
            </div>
          </div>
        </div>
      </div>

      {/* Card Lembaga */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* RW & RT - Combined Card */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-slate-400" />
            <span className="text-sm font-semibold text-slate-600">RW & RT</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{rwRtTotal}</div>
          <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
            <span>RW: <span className="font-bold text-slate-700">{rwCount}</span></span>
            <span className="text-slate-300">|</span>
            <span>RT: <span className="font-bold text-slate-700">{rtCount}</span></span>
          </div>
        </div>

        {/* Other Lembaga Cards */}
        {lembagaList.map((item, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm font-semibold text-slate-600">{item.label}</span>
            </div>
            <div className="text-3xl font-bold text-slate-900">{item.value}</div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default StatistikLKD;
