import React from "react";
import {
  LuUsers,
  LuHeart,
  LuHeartHandshake,
  LuBuilding2,
  LuCheck,
} from "react-icons/lu";

// Minimal Card Component
const MinimalCard = ({ icon: Icon, title, value, subtitle, color }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all duration-300 group hover:border-gray-300">
      <div className="flex items-start justify-between mb-4">
        <div
          className="p-2.5 rounded-lg"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-5 w-5" style={{ color: color }} />
        </div>
      </div>
      
      <div className="text-sm text-gray-500 font-medium mb-1">
        {title}
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-2">
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-400">{subtitle}</div>
      )}
    </div>
  );
};

// Circle Progress Component (Simplified)
const CircleProgress = ({ percentage, color, size = 60, strokeWidth = 6 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold" style={{ color }}>
          {percentage}%
        </span>
      </div>
    </div>
  );
};

const StatistikLKD = ({ summaryData, loading = false }) => {
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-200 rounded-xl p-5 animate-pulse h-32"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!summaryData) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Statistik LKD</h2>
          <p className="text-sm text-gray-500 mt-1">
            Lembaga Kemasyarakatan Desa yang telah terverifikasi dan aktif

          </p>
        </div>
        <div className="bg-white rounded-md p-2 text-right">
          <div className="text-3xl font-bold text-gray-900">
            {(summaryData.verified_kelembagaan?.rw || 0) +
              (summaryData.verified_kelembagaan?.rt || 0) +
              (summaryData.verified_kelembagaan?.posyandu || 0) +
              (summaryData.verified_kelembagaan?.karangTaruna || 0) +
              (summaryData.verified_kelembagaan?.lpm || 0) +
              (summaryData.verified_kelembagaan?.pkk || 0)}
          </div>
          <div className="text-xs text-gray-500">Total Kelembagaan Terverifikasi</div>
        </div>
      </div>

      {/* Main Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* RW & RT Combined Card */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white col-span-1 md:col-span-2 lg:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <LuUsers className="h-5 w-5" />
            <span className="text-sm font-medium opacity-90">RW & RT</span>
          </div>
          <div className="text-4xl font-bold mb-4">
            {(summaryData.verified_kelembagaan?.rw || 0) + (summaryData.verified_kelembagaan?.rt || 0)}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
              <div className="text-xs opacity-80 mb-1">Rukun Warga</div>
              <div className="text-2xl font-bold">{summaryData.verified_kelembagaan?.rw || 0}</div>
            </div>
            <div className="bg-white/20 rounded-lg p-3 backdrop-blur-sm">
              <div className="text-xs opacity-80 mb-1">Rukun Tetangga</div>
              <div className="text-2xl font-bold">{summaryData.verified_kelembagaan?.rt || 0}</div>
            </div>
          </div>
        </div>

        {/* Posyandu */}
        <MinimalCard
          icon={LuHeartHandshake}
          title="Posyandu"
          value={summaryData.verified_kelembagaan?.posyandu || 0}
          color="#9333ea"
        />

        {/* Karang Taruna with Progress */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all duration-300">
          <div className="flex items-start justify-between mb-4">
            <div
              className="p-2.5 rounded-lg"
              style={{ backgroundColor: "#ea580c15" }}
            >
              <LuUsers className="h-5 w-5 text-orange-600" />
            </div>
            <CircleProgress
              percentage={summaryData.formation_stats.karangTaruna.persentase}
              color="#ea580c"
            />
          </div>
          <div className="text-sm text-gray-500 font-medium mb-1">
            Karang Taruna
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {summaryData.verified_kelembagaan?.karangTaruna || 0}
          </div>
          
        </div>

        {/* LPM with Progress */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all duration-300">
          <div className="flex items-start justify-between mb-4">
            <div
              className="p-2.5 rounded-lg"
              style={{ backgroundColor: "#4f46e515" }}
            >
              <LuBuilding2 className="h-5 w-5 text-indigo-600" />
            </div>
            <CircleProgress
              percentage={summaryData.formation_stats.lpm.persentase}
              color="#4f46e5"
            />
          </div>
          <div className="text-sm text-gray-500 font-medium mb-1">
            LPM
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {summaryData.verified_kelembagaan?.lpm || 0}
          </div>
         
        </div>

        {/* PKK with Progress */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-all duration-300">
          <div className="flex items-start justify-between mb-4">
            <div
              className="p-2.5 rounded-lg"
              style={{ backgroundColor: "#ec489915" }}
            >
              <LuHeart className="h-5 w-5 text-pink-600" />
            </div>
            <CircleProgress
              percentage={summaryData.formation_stats?.pkk?.persentase || 0}
              color="#ec4899"
            />
          </div>
          <div className="text-sm text-gray-500 font-medium mb-1">
            PKK
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            {summaryData.verified_kelembagaan?.pkk || 0}
          </div>
         
        </div>
      </div>

      {/* Breakdown Section - Minimal */}
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
                    <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md">
                      <LuCheck className="w-3.5 h-3.5" />
                      <span className="text-sm font-semibold">{item.verified}</span>
                    </div>
                    {unverified > 0 && (
                      <>
                        <span className="text-gray-400 text-sm">|</span>
                        <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2.5 py-1 rounded-md">
                          <span className="text-sm font-semibold">{unverified}</span>
                        </div>
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
                    <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2.5 py-1 rounded-md">
                      <LuCheck className="w-3.5 h-3.5" />
                      <span className="text-sm font-semibold">{item.verified}</span>
                    </div>
                    {unverified > 0 && (
                      <>
                        <span className="text-gray-400 text-sm">|</span>
                        <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2.5 py-1 rounded-md">
                          <span className="text-sm font-semibold">{unverified}</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatistikLKD;
