import React, { useState } from "react";
import {
  LuChevronDown,
  LuChevronUp,
} from "react-icons/lu";

const StatistikLKD = ({ summaryData, loading = false }) => {
  const [showBreakdown, setShowBreakdown] = useState(false);

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

  const totalVerified =
    (summaryData.verified_kelembagaan?.rw || 0) +
    (summaryData.verified_kelembagaan?.rt || 0) +
    (summaryData.verified_kelembagaan?.posyandu || 0) +
    (summaryData.verified_kelembagaan?.karangTaruna || 0) +
    (summaryData.verified_kelembagaan?.lpm || 0) +
    (summaryData.verified_kelembagaan?.pkk || 0);

  const rwVerified = summaryData.verified_kelembagaan?.rw || 0;
  const rtVerified = summaryData.verified_kelembagaan?.rt || 0;
  const rwRtTotal = rwVerified + rtVerified;

  const lembagaList = [
    { label: "Posyandu", verified: summaryData.verified_kelembagaan?.posyandu || 0, color: "#9333ea" },
    { label: "Karang Taruna", verified: summaryData.verified_kelembagaan?.karangTaruna || 0, color: "#ea580c" },
    { label: "LPM", verified: summaryData.verified_kelembagaan?.lpm || 0, color: "#4f46e5" },
    { label: "PKK", verified: summaryData.verified_kelembagaan?.pkk || 0, color: "#ec4899" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Statistik LKD</h2>
          <p className="text-sm text-gray-500 mt-1">
            Lembaga Kemasyarakatan Desa yang telah terverifikasi dan aktif
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-gray-900">{totalVerified}</div>
          <div className="text-xs text-gray-500">Total Terverifikasi</div>
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
            <span>RW: <span className="font-bold text-gray-700">{rwVerified}</span></span>
            <span className="text-gray-300">|</span>
            <span>RT: <span className="font-bold text-gray-700">{rtVerified}</span></span>
          </div>
        </div>

        {/* Other Lembaga Cards */}
        {lembagaList.map((item, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-sm font-semibold text-gray-600">{item.label}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{item.verified}</div>
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
            <div className="text-3xl font-bold text-green-600">
              {(summaryData.verified_by_status?.desa?.rw || 0) +
                (summaryData.verified_by_status?.desa?.rt || 0) +
                (summaryData.verified_by_status?.desa?.posyandu || 0) +
                (summaryData.verified_by_status?.desa?.karangTaruna || 0) +
                (summaryData.verified_by_status?.desa?.lpm || 0) +
                (summaryData.verified_by_status?.desa?.pkk || 0)}
            </div>
          </div>

          <div className="space-y-2">
            {[
              { 
                label: "RW", 
                verified: summaryData.verified_by_status?.desa?.rw || 0,
                total: summaryData.by_status.desa.rw,
                color: "blue"
              },
              { 
                label: "RT", 
                verified: summaryData.verified_by_status?.desa?.rt || 0,
                total: summaryData.by_status.desa.rt,
                color: "cyan"
              },
              { 
                label: "Posyandu", 
                verified: summaryData.verified_by_status?.desa?.posyandu || 0,
                total: summaryData.by_status.desa.posyandu,
                color: "purple"
              },
              { 
                label: "Karang Taruna", 
                verified: summaryData.verified_by_status?.desa?.karangTaruna || 0,
                total: summaryData.by_status.desa.karangTaruna,
                color: "orange"
              },
              { 
                label: "LPM", 
                verified: summaryData.verified_by_status?.desa?.lpm || 0,
                total: summaryData.by_status.desa.lpm,
                color: "indigo"
              },
              { 
                label: "PKK", 
                verified: summaryData.verified_by_status?.desa?.pkk || 0,
                total: summaryData.by_status.desa.pkk || 0,
                color: "pink"
              },
            ].map((item, idx) => {
              const unverified = item.total - item.verified;
              return (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-green-600">{item.verified}</span>
                    {unverified > 0 && (
                      <>
                        <span className="text-gray-400 text-sm">|</span>
                        <span className="text-sm font-semibold text-amber-600">{unverified}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
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
            <div className="text-3xl font-bold text-purple-600">
              {(summaryData.verified_by_status?.kelurahan?.rw || 0) +
                (summaryData.verified_by_status?.kelurahan?.rt || 0) +
                (summaryData.verified_by_status?.kelurahan?.posyandu || 0) +
                (summaryData.verified_by_status?.kelurahan?.karangTaruna || 0) +
                (summaryData.verified_by_status?.kelurahan?.lpm || 0) +
                (summaryData.verified_by_status?.kelurahan?.pkk || 0)}
            </div>
          </div>

          <div className="space-y-2">
            {[
              { 
                label: "RW", 
                verified: summaryData.verified_by_status?.kelurahan?.rw || 0,
                total: summaryData.by_status.kelurahan.rw,
                color: "blue"
              },
              { 
                label: "RT", 
                verified: summaryData.verified_by_status?.kelurahan?.rt || 0,
                total: summaryData.by_status.kelurahan.rt,
                color: "cyan"
              },
              { 
                label: "Posyandu", 
                verified: summaryData.verified_by_status?.kelurahan?.posyandu || 0,
                total: summaryData.by_status.kelurahan.posyandu,
                color: "purple"
              },
              { 
                label: "Karang Taruna", 
                verified: summaryData.verified_by_status?.kelurahan?.karangTaruna || 0,
                total: summaryData.by_status.kelurahan.karangTaruna,
                color: "orange"
              },
              { 
                label: "LPM", 
                verified: summaryData.verified_by_status?.kelurahan?.lpm || 0,
                total: summaryData.by_status.kelurahan.lpm,
                color: "indigo"
              },
              { 
                label: "PKK", 
                verified: summaryData.verified_by_status?.kelurahan?.pkk || 0,
                total: summaryData.by_status.kelurahan.pkk || 0,
                color: "pink"
              },
            ].map((item, idx) => {
              const unverified = item.total - item.verified;
              return (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-green-600">{item.verified}</span>
                    {unverified > 0 && (
                      <>
                        <span className="text-gray-400 text-sm">|</span>
                        <span className="text-sm font-semibold text-amber-600">{unverified}</span>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default StatistikLKD;
