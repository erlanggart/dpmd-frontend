import React from "react";
import {
  LuBuilding2,
  LuHouse,
  LuUsers,
  LuMapPin,
  LuShield,
  LuHeart,
  LuHeartHandshake,
} from "react-icons/lu";

// Reusable Notched Card Component
const NotchedCard = ({ icon: Icon, title, value, subtitle, color, badge }) => {
  return (
    <div
      className="relative rounded-2xl p-6 hover:translate-y-[-4px] transition-all duration-300 overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color}, ${color})`,
        boxShadow: `0 10px 30px ${color}40, 0 4px 12px ${color}30`,
        transition: "all 0.3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 15px 40px ${color}60, 0 8px 16px ${color}40`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = `0 10px 30px ${color}40, 0 4px 12px ${color}30`;
      }}
    >
      {/* White box that borders with notch */}
      <div className="absolute left-0 top-0 bottom-0 right-4 bg-white ">
        {/* Middle Notch - colored with rounded left full */}
        <div
          className="absolute right-[0%] top-[30%] h-[40%] w-3 rounded-l-full z-10"
          style={{ backgroundColor: `${color}` }}
        ></div>
      </div>

      {/* Top Notch - white for cutout effect */}
      <div className="absolute right-0 top-0 h-[30%] w-4 bg-white rounded-br-full z-10"></div>

      {/* Bottom Notch - white for cutout effect */}
      <div className="absolute right-0 bottom-0 h-[30%] w-4 bg-white rounded-tr-full z-10"></div>

      <div className="flex items-center justify-between  relative z-20 mr-5 mb-4">
        <div
          className="p-3 rounded-xl shadow-sm"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-6 w-6" style={{ color: color }} />
        </div>
        {badge && <div className="relative z-20">{badge}</div>}
      </div>

      <div className="text-sm text-gray-500 font-medium mb-2 relative z-20">
        {title}
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1 relative z-20">
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-400 relative z-20">{subtitle}</div>
      )}
    </div>
  );
};

const StatistikKelembagaanSummary = ({ summaryData, loading = false }) => {
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-200 rounded-lg shadow-sm p-6 animate-pulse h-32"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!summaryData) {
    return null;
  }

  // Circle Progress Component
  const CircleProgress = ({
    percentage,
    color,
    size = 120,
    strokeWidth = 10,
  }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;

    return (
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-gray-200"
          />
          {/* Progress circle */}
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
          <span className="text-2xl font-bold" style={{ color }}>
            {percentage}%
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Kelembagaan Statistics */}
      <div className="bg-white/30 rounded-lg shadow-sm border border-white p-6 space-y-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <LuUsers className="h-5 w-5 text-blue-600" />
          Statistik Kelembagaan Kabupaten
        </h2>

        {/* RW, RT, Posyandu - Top 3 Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Combined RW & RT Card */}
          <div
            className="relative rounded-2xl md:col-span-2 p-6 hover:translate-y-[-4px] transition-all duration-300 overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #2563eb)",
              boxShadow: "0 10px 30px #3b82f640, 0 4px 12px #3b82f630",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 15px 40px #3b82f660, 0 8px 16px #3b82f640";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "0 10px 30px #3b82f640, 0 4px 12px #3b82f630";
            }}
          >
            {/* White box that borders with notch */}
            <div className="absolute left-0 top-0 bottom-0 right-4 bg-white">
              <div
                className="absolute right-[0%] top-[30%] h-[40%] w-3 rounded-l-full z-10"
                style={{ backgroundColor: "#3b82f6" }}
              ></div>
            </div>

            {/* Top Notch */}
            <div className="absolute right-0 top-0 h-[30%] w-4 bg-white rounded-br-full z-10"></div>
            {/* Bottom Notch */}
            <div className="absolute right-0 bottom-0 h-[30%] w-4 bg-white rounded-tr-full z-10"></div>

            <div className="relative z-20 mr-5">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="p-3 rounded-xl shadow-sm"
                  style={{ backgroundColor: "#3b82f615" }}
                >
                  <LuUsers className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500 font-medium">
                    Total RW & RT
                  </div>
                  <div className="text-3xl font-bold text-gray-900">
                    {summaryData.total_kelembagaan.rw + summaryData.total_kelembagaan.rt}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* RW Section */}
                <div className="bg-blue-500 rounded-lg p-4 border border-blue-600/30">
                  <div className="text-xs text-white font-medium mb-1">
                    Rukun Warga
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {summaryData.total_kelembagaan.rw}
                  </div>
                  {summaryData.total_pengurus && (
                    <div className="text-xs text-white font-semibold">
                      {summaryData.total_pengurus.rw} Pengurus
                    </div>
                  )}
                </div>

                {/* RT Section */}
                <div className="bg-blue-500 rounded-lg p-4 border border-blue-600/30">
                  <div className="text-xs text-white font-medium mb-1">
                    Rukun Tetangga
                  </div>
                  <div className="text-2xl font-bold text-white mb-1">
                    {summaryData.total_kelembagaan.rt}
                  </div>
                  {summaryData.total_pengurus && (
                    <div className="text-xs text-white font-semibold">
                      {summaryData.total_pengurus.rt} Pengurus
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Posyandu Card */}
          <NotchedCard
            icon={LuHeartHandshake}
            title="Pos Pelayanan Terpadu"
            value={summaryData.total_kelembagaan.posyandu}
            subtitle={
              summaryData.total_pengurus &&
              `${summaryData.total_pengurus.posyandu} Pengurus Aktif`
            }
            color="#9333ea"
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Tingkat Pembentukan Kelembagaan Desa
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Karang Taruna */}
            <NotchedCard
              icon={LuUsers}
              title="Karang Taruna"
              value={summaryData.total_kelembagaan.karangTaruna}
              subtitle={
                summaryData.total_pengurus &&
                `${summaryData.total_pengurus.karangTaruna} Pengurus • ${summaryData.formation_stats.karangTaruna.total} Desa/Kelurahan`
              }
              color="#ea580c"
              badge={
                <CircleProgress
                  percentage={
                    summaryData.formation_stats.karangTaruna.persentase
                  }
                  color="#2563eb"
                  size={80}
                  strokeWidth={6}
                />
              }
            />
            {/* LPM */}
            <NotchedCard
              icon={LuBuilding2}
              title="LPM"
              value={summaryData.total_kelembagaan.lpm}
              subtitle={
                summaryData.total_pengurus &&
                `${summaryData.total_pengurus.lpm} Pengurus • ${summaryData.formation_stats.lpm.total} Desa/Kelurahan`
              }
              color="#4f46e5"
              badge={
                <CircleProgress
                  percentage={summaryData.formation_stats.lpm.persentase}
                  color="#4f46e5"
                  size={80}
                  strokeWidth={6}
                />
              }
            />
            {/* Satlinmas */}
            <NotchedCard
              icon={LuShield}
              title="Satlinmas"
              value={summaryData.total_kelembagaan.satlinmas}
              subtitle={
                summaryData.total_pengurus &&
                `${summaryData.total_pengurus.satlinmas} Pengurus • ${summaryData.formation_stats.satlinmas.total} Desa/Kelurahan`
              }
              color="#10b981"
              badge={
                <CircleProgress
                  percentage={summaryData.formation_stats.satlinmas.persentase}
                  color="#ea580c"
                  size={80}
                  strokeWidth={6}
                />
              }
            />
            {/* PKK */}
            <NotchedCard
              icon={LuHeart}
              title="PKK"
              value={summaryData.total_kelembagaan?.pkk || 0}
              subtitle={
                summaryData.total_pengurus &&
                `${summaryData.total_pengurus.pkk || 0} Pengurus • ${
                  summaryData.formation_stats?.pkk?.total || 0
                } Desa/Kelurahan`
              }
              color="#ec4899"
              badge={
                <CircleProgress
                  percentage={summaryData.formation_stats?.pkk?.persentase || 0}
                  color="#ec4899"
                  size={80}
                  strokeWidth={6}
                />
              }
            />
          </div>
        </div>
        {/* Breakdown by Desa vs Kelurahan */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Perbandingan Statistik Desa & Kelurahan
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Desa Statistics */}
            <div className="bg-white/50 rounded-2xl p-6 border-2 border-green-200 shadow-lg">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-green-200">
                <div className="p-3 bg-green-600 rounded-xl shadow-md">
                  <LuHouse className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-green-800">Desa</h4>
                  <p className="text-sm text-green-600">{summaryData.by_status.desa.count} Desa</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* RW & RT Combined */}
                <div className="bg-white rounded-xl p-4 shadow-md border border-green-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <LuUsers className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-gray-700">RW & RT</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">
                      {summaryData.by_status.desa.rw + summaryData.by_status.desa.rt}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 border border-red-200">
                      <div className="text-xs text-red-600 font-medium mb-1">RW</div>
                      <div className="text-xl font-bold text-red-700">
                        {summaryData.by_status.desa.rw}
                      </div>
                      {summaryData.by_status.desa.pengurus && (
                        <div className="text-xs text-red-500 mt-1">
                          {summaryData.by_status.desa.pengurus.rw} Pengurus
                        </div>
                      )}
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-3 border border-yellow-200">
                      <div className="text-xs text-yellow-600 font-medium mb-1">RT</div>
                      <div className="text-xl font-bold text-yellow-700">
                        {summaryData.by_status.desa.rt}
                      </div>
                      {summaryData.by_status.desa.pengurus && (
                        <div className="text-xs text-yellow-600 mt-1">
                          {summaryData.by_status.desa.pengurus.rt} Pengurus
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Other Kelembagaan */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-green-100 col-span-2">
                    <LuHeartHandshake className="h-5 w-5 text-purple-600 mb-2" />
                    <div className="text-xs text-gray-600 mb-1">Posyandu</div>
                    <div className="text-xl font-bold text-gray-800">
                      {summaryData.by_status.desa.posyandu}
                    </div>
                    {summaryData.by_status.desa.pengurus && (
                      <div className="text-xs text-purple-500 mt-1">
                        {summaryData.by_status.desa.pengurus.posyandu} Pengurus
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm border border-green-100">
                    <LuUsers className="h-5 w-5 text-orange-600 mb-2" />
                    <div className="text-xs text-gray-600 mb-1">Karang Taruna</div>
                    <div className="text-xl font-bold text-gray-800">
                      {summaryData.by_status.desa.karangTaruna}
                    </div>
                    {summaryData.by_status.desa.pengurus && (
                      <div className="text-xs text-orange-500 mt-1">
                        {summaryData.by_status.desa.pengurus.karangTaruna} Pengurus
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm border border-green-100">
                    <LuBuilding2 className="h-5 w-5 text-indigo-600 mb-2" />
                    <div className="text-xs text-gray-600 mb-1">LPM</div>
                    <div className="text-xl font-bold text-gray-800">
                      {summaryData.by_status.desa.lpm}
                    </div>
                    {summaryData.by_status.desa.pengurus && (
                      <div className="text-xs text-indigo-500 mt-1">
                        {summaryData.by_status.desa.pengurus.lpm} Pengurus
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm border border-green-100">
                    <LuHeart className="h-5 w-5 text-pink-600 mb-2" />
                    <div className="text-xs text-gray-600 mb-1">PKK</div>
                    <div className="text-xl font-bold text-gray-800">
                      {summaryData.by_status.desa.pkk || 0}
                    </div>
                    {summaryData.by_status.desa.pengurus && (
                      <div className="text-xs text-pink-500 mt-1">
                        {summaryData.by_status.desa.pengurus.pkk || 0} Pengurus
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm border border-green-100 ">
                    <LuShield className="h-5 w-5 text-emerald-600 mb-2" />
                    <div className="text-xs text-gray-600 mb-1">Satlinmas</div>
                    <div className="text-xl font-bold text-gray-800">
                      {summaryData.by_status.desa.satlinmas}
                    </div>
                    {summaryData.by_status.desa.pengurus && (
                      <div className="text-xs text-emerald-500 mt-1">
                        {summaryData.by_status.desa.pengurus.satlinmas} Pengurus
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Kelurahan Statistics */}
            <div className="bg-white/50 rounded-2xl p-6 border-2 border-purple-200 shadow-lg">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-purple-200">
                <div className="p-3 bg-purple-600 rounded-xl shadow-md">
                  <LuBuilding2 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h4 className="text-xl font-bold text-purple-800">Kelurahan</h4>
                  <p className="text-sm text-purple-600">{summaryData.by_status.kelurahan.count} Kelurahan</p>
                </div>
              </div>

              <div className="space-y-4">
                {/* RW & RT Combined */}
                <div className="bg-white rounded-xl p-4 shadow-md border border-purple-100">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <LuUsers className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold text-gray-700">RW & RT</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">
                      {summaryData.by_status.kelurahan.rw + summaryData.by_status.kelurahan.rt}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-3 border border-red-200">
                      <div className="text-xs text-red-600 font-medium mb-1">RW</div>
                      <div className="text-xl font-bold text-red-700">
                        {summaryData.by_status.kelurahan.rw}
                      </div>
                      {summaryData.by_status.kelurahan.pengurus && (
                        <div className="text-xs text-red-500 mt-1">
                          {summaryData.by_status.kelurahan.pengurus.rw} Pengurus
                        </div>
                      )}
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-3 border border-yellow-200">
                      <div className="text-xs text-yellow-600 font-medium mb-1">RT</div>
                      <div className="text-xl font-bold text-yellow-700">
                        {summaryData.by_status.kelurahan.rt}
                      </div>
                      {summaryData.by_status.kelurahan.pengurus && (
                        <div className="text-xs text-yellow-600 mt-1">
                          {summaryData.by_status.kelurahan.pengurus.rt} Pengurus
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Other Kelembagaan */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100 col-span-2">
                    <LuHeartHandshake className="h-5 w-5 text-purple-600 mb-2" />
                    <div className="text-xs text-gray-600 mb-1">Posyandu</div>
                    <div className="text-xl font-bold text-gray-800">
                      {summaryData.by_status.kelurahan.posyandu}
                    </div>
                    {summaryData.by_status.kelurahan.pengurus && (
                      <div className="text-xs text-purple-500 mt-1">
                        {summaryData.by_status.kelurahan.pengurus.posyandu} Pengurus
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                    <LuUsers className="h-5 w-5 text-orange-600 mb-2" />
                    <div className="text-xs text-gray-600 mb-1">Karang Taruna</div>
                    <div className="text-xl font-bold text-gray-800">
                      {summaryData.by_status.kelurahan.karangTaruna}
                    </div>
                    {summaryData.by_status.kelurahan.pengurus && (
                      <div className="text-xs text-orange-500 mt-1">
                        {summaryData.by_status.kelurahan.pengurus.karangTaruna} Pengurus
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                    <LuBuilding2 className="h-5 w-5 text-indigo-600 mb-2" />
                    <div className="text-xs text-gray-600 mb-1">LPM</div>
                    <div className="text-xl font-bold text-gray-800">
                      {summaryData.by_status.kelurahan.lpm}
                    </div>
                    {summaryData.by_status.kelurahan.pengurus && (
                      <div className="text-xs text-indigo-500 mt-1">
                        {summaryData.by_status.kelurahan.pengurus.lpm} Pengurus
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                    <LuHeart className="h-5 w-5 text-pink-600 mb-2" />
                    <div className="text-xs text-gray-600 mb-1">PKK</div>
                    <div className="text-xl font-bold text-gray-800">
                      {summaryData.by_status.kelurahan.pkk || 0}
                    </div>
                    {summaryData.by_status.kelurahan.pengurus && (
                      <div className="text-xs text-pink-500 mt-1">
                        {summaryData.by_status.kelurahan.pengurus.pkk || 0} Pengurus
                      </div>
                    )}
                  </div>

                  <div className="bg-white rounded-lg p-4 shadow-sm border border-purple-100">
                    <LuShield className="h-5 w-5 text-emerald-600 mb-2" />
                    <div className="text-xs text-gray-600 mb-1">Satlinmas</div>
                    <div className="text-xl font-bold text-gray-800">
                      {summaryData.by_status.kelurahan.satlinmas}
                    </div>
                    {summaryData.by_status.kelurahan.pengurus && (
                      <div className="text-xs text-emerald-500 mt-1">
                        {summaryData.by_status.kelurahan.pengurus.satlinmas} Pengurus
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatistikKelembagaanSummary;
