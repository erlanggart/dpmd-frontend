import React, { useState } from "react";
import {
  LuChevronDown,
  LuChevronUp,
} from "react-icons/lu";

const StatistikLKD = ({ summaryData, loading = false }) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [mode, setMode] = useState("verified");
  const isVerified = mode === "verified";

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-100 rounded mb-2" />
        ))}
      </div>
    );
  }

  if (!summaryData) {
    return null;
  }

  const KEYS = ["rw", "rt", "posyandu", "karangTaruna", "lpm", "pkk"];
  const LABELS = {
    rw: "RW",
    rt: "RT",
    posyandu: "Posyandu",
    karangTaruna: "Karang Taruna",
    lpm: "LPM",
    pkk: "PKK",
  };

  // Belum terverifikasi = total - terverifikasi
  const pick = (total, verified) =>
    isVerified ? verified : Math.max((total || 0) - (verified || 0), 0);

  const count = (key) =>
    pick(summaryData.total_kelembagaan?.[key], summaryData.verified_kelembagaan?.[key]);

  const countByStatus = (scope, key) =>
    pick(summaryData.by_status?.[scope]?.[key], summaryData.verified_by_status?.[scope]?.[key]);

  const sumByStatus = (scope) =>
    KEYS.reduce((acc, key) => acc + countByStatus(scope, key), 0);

  const totalCount = KEYS.reduce((acc, key) => acc + count(key), 0);

  const rwCount = count("rw");
  const rtCount = count("rt");
  const rwRtTotal = rwCount + rtCount;

  const lembagaList = [
    { label: "Posyandu", value: count("posyandu"), color: "#9333ea" },
    { label: "Karang Taruna", value: count("karangTaruna"), color: "#ea580c" },
    { label: "LPM", value: count("lpm"), color: "#4f46e5" },
    { label: "PKK", value: count("pkk"), color: "#ec4899" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Statistik LKD</h2>
          <p className="text-sm text-gray-500 mt-1">
            {isVerified
              ? "Lembaga Kemasyarakatan Desa yang telah terverifikasi dan aktif"
              : "Lembaga Kemasyarakatan Desa aktif yang belum terverifikasi"}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="inline-flex rounded-xl border border-gray-200 bg-gray-100 p-1">
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
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-gray-900">{totalCount}</div>
            <div className="text-xs text-gray-500">
              {isVerified ? "Total Terverifikasi" : "Total Belum Terverifikasi"}
            </div>
          </div>
        </div>
      </div>

      {/* Card Lembaga */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* RW & RT - Combined Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm font-semibold text-gray-600">RW & RT</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">{rwRtTotal}</div>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
            <span>RW: <span className="font-bold text-gray-700">{rwCount}</span></span>
            <span className="text-gray-300">|</span>
            <span>RT: <span className="font-bold text-gray-700">{rtCount}</span></span>
          </div>
        </div>

        {/* Other Lembaga Cards */}
        {lembagaList.map((item, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm font-semibold text-gray-600">{item.label}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Toggle Breakdown Button */}
      <button
        onClick={() => setShowBreakdown(!showBreakdown)}
        className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors mx-auto"
      >
        {showBreakdown ? (
          <>
            <span>Sembunyikan Breakdown Desa & Kelurahan</span>
            <LuChevronUp className="w-4 h-4" />
          </>
        ) : (
          <>
            <span>Lihat Breakdown Desa & Kelurahan</span>
            <LuChevronDown className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Breakdown Section */}
      {showBreakdown && (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Desa */}
        <div className="bg-white rounded-xl border-2 border-green-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Desa</h3>
              <p className="text-sm text-gray-500">
                {summaryData.by_status.desa.count} Desa
              </p>
            </div>
            <div className={`text-3xl font-bold ${isVerified ? "text-green-600" : "text-amber-600"}`}>
              {sumByStatus("desa")}
            </div>
          </div>

          <div className="space-y-2">
            {KEYS.map((key) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm font-medium text-gray-700">{LABELS[key]}</span>
                <span className={`text-sm font-semibold ${isVerified ? "text-green-600" : "text-amber-600"}`}>
                  {countByStatus("desa", key)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Kelurahan */}
        <div className="bg-white rounded-xl border-2 border-purple-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Kelurahan</h3>
              <p className="text-sm text-gray-500">
                {summaryData.by_status.kelurahan.count} Kelurahan
              </p>
            </div>
            <div className={`text-3xl font-bold ${isVerified ? "text-purple-600" : "text-amber-600"}`}>
              {sumByStatus("kelurahan")}
            </div>
          </div>

          <div className="space-y-2">
            {KEYS.map((key) => (
              <div key={key} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm font-medium text-gray-700">{LABELS[key]}</span>
                <span className={`text-sm font-semibold ${isVerified ? "text-green-600" : "text-amber-600"}`}>
                  {countByStatus("kelurahan", key)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default StatistikLKD;
