import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useBidangPath } from "../../../hooks/useBidangPath";
import {
  LuUsers,
  LuShieldCheck,
  LuShieldAlert,
  LuSearch,
  LuRefreshCw,
  LuArrowLeft,
  LuChevronDown,
  LuChevronRight,
  LuTriangleAlert,
  LuFilter,
  LuX,
  LuGraduationCap,
  LuCalendarDays,
  LuMapPin,
  LuBuilding2,
  LuExternalLink,
} from "react-icons/lu";
import api from "../../../api";
import toast from "react-hot-toast";

const TYPE_LABELS = {
  rw: "RW",
  rt: "RT",
  posyandu: "Posyandu",
  karang_taruna: "Karang Taruna",
  lpm: "LPM",
  pkk: "PKK",
  satlinmas: "Satlinmas",
  "lembaga-lainnya": "Lembaga Lainnya",
};

const EDUCATION_ORDER = [
  "SD", "SMP", "SMA", "SMK", "D1", "D2", "D3", "D4", "S1", "S2", "S3",
];

const AGE_RANGE_LABELS = {
  "<20": "< 20 Tahun",
  "20-30": "20 - 30 Tahun",
  "31-40": "31 - 40 Tahun",
  "41-50": "41 - 50 Tahun",
  "51-60": "51 - 60 Tahun",
  ">60": "> 60 Tahun",
  unknown: "Tidak Diketahui",
};

export default function PengurusDashboardPage() {
  const navigate = useNavigate();
  const { getPath } = useBidangPath();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [unverified, setUnverified] = useState([]);
  const [filters, setFilters] = useState({ kecamatans: [], desas: [] });

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedKecamatan, setSelectedKecamatan] = useState("");
  const [selectedDesa, setSelectedDesa] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showUnverified, setShowUnverified] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedKecamatan) params.append("kecamatan_id", selectedKecamatan);
      if (selectedDesa) params.append("desa_id", selectedDesa);
      if (selectedType) params.append("pengurusable_type", selectedType);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());

      const qs = params.toString();
      const res = await api.get(`/kelembagaan/pengurus-dashboard${qs ? `?${qs}` : ""}`);
      if (res.data.success) {
        setData(res.data.data || []);
        setSummary(res.data.summary || null);
        setUnverified(res.data.unverified || []);
        setFilters(res.data.filters || { kecamatans: [], desas: [] });
      }
    } catch (error) {
      console.error("Error fetching pengurus dashboard:", error);
      toast.error("Gagal memuat data pengurus");
    } finally {
      setLoading(false);
    }
  }, [selectedKecamatan, selectedDesa, selectedType, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter desas based on selected kecamatan
  const filteredDesas = useMemo(() => {
    if (!selectedKecamatan) return filters.desas;
    return filters.desas.filter((d) => String(d.kecamatan_id) === String(selectedKecamatan));
  }, [filters.desas, selectedKecamatan]);

  // Filtered verified data for table
  const verifiedData = useMemo(() => {
    return data.filter((p) => p.status_verifikasi === "verified");
  }, [data]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedKecamatan("");
    setSelectedDesa("");
    setSelectedType("");
  };

  const hasActiveFilters = searchQuery || selectedKecamatan || selectedDesa || selectedType;

  // Compute max value for bar charts
  const maxAgeCount = summary ? Math.max(...Object.values(summary.ageRanges), 1) : 1;
  const maxEduCount = summary
    ? Math.max(...Object.values(summary.educationStats), 1)
    : 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <LuRefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-gray-500">Memuat data pengurus...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 p-8 ">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(getPath("/bidang/pmd"))}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <LuArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Dashboard Pengurus</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Data pengurus aktif seluruh kelembagaan desa
            </p>
          </div>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <LuRefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-white rounded-xl border border-gray-200 p-5">
          <SummaryCard
            icon={<LuUsers className="w-6 h-6 text-blue-600" />}
            label="Total Pengurus"
            value={summary.total}
            bgColor="bg-blue-50"
            borderColor="border-blue-200"
          />
          <SummaryCard
            icon={<LuShieldCheck className="w-6 h-6 text-emerald-600" />}
            label="Terverifikasi"
            value={summary.verified}
            bgColor="bg-emerald-50"
            borderColor="border-emerald-200"
          />
          <SummaryCard
            icon={<LuShieldAlert className="w-6 h-6 text-amber-600" />}
            label="Belum Verifikasi"
            value={summary.unverified}
            bgColor="bg-amber-50"
            borderColor="border-amber-200"
            onClick={() => setShowUnverified(!showUnverified)}
            clickable
          />
          <SummaryCard
            icon={
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold text-blue-600">
                  {summary.genderStats.L}
                </span>
                <span className="text-xs text-gray-400">L</span>
                <span className="text-gray-300 mx-1">|</span>
                <span className="text-lg font-bold text-pink-600">
                  {summary.genderStats.P}
                </span>
                <span className="text-xs text-gray-400">P</span>
              </div>
            }
            label="Jenis Kelamin"
            value=""
            bgColor="bg-purple-50"
            borderColor="border-purple-200"
            isCustomIcon
          />
        </div>
      )}

      {/* Unverified Warning Panel */}
      {showUnverified && unverified.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <LuTriangleAlert className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-amber-800">
                Pengurus Belum Terverifikasi ({unverified.length})
              </h3>
            </div>
            <button
              onClick={() => setShowUnverified(false)}
              className="p-1 hover:bg-amber-100 rounded"
            >
              <LuX className="w-4 h-4 text-amber-600" />
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {unverified.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(getPath(`/bidang/pmd/pengurus/${p.id}`))}
                className="w-full flex items-center justify-between p-3 bg-white rounded-lg border border-amber-100 hover:border-amber-300 hover:shadow-sm transition-all text-left"
              >
                <div>
                  <p className="font-medium text-gray-800">{p.nama_lengkap}</p>
                  <p className="text-xs text-gray-500">
                    {p.jabatan} — {TYPE_LABELS[p.pengurusable_type] || p.pengurusable_type}
                  </p>
                  <p className="text-xs text-gray-400">
                    {p.desa_nama}, {p.kecamatan_nama}
                  </p>
                </div>
                <LuExternalLink className="w-4 h-4 text-amber-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Infographics */}
      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Gender Pie Chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <LuUsers className="w-4 h-4 text-purple-500" />
              Jenis Kelamin
            </h3>
            <GenderChart male={summary.genderStats.L} female={summary.genderStats.P} />
          </div>

          {/* Age Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <LuCalendarDays className="w-4 h-4 text-orange-500" />
              Rentang Umur
            </h3>
            <div className="space-y-2">
              {Object.entries(summary.ageRanges)
                .filter(([key]) => key !== "unknown")
                .map(([range, count]) => (
                  <BarRow
                    key={range}
                    label={AGE_RANGE_LABELS[range] || range}
                    value={count}
                    max={maxAgeCount}
                    color="bg-orange-400"
                  />
                ))}
              {summary.ageRanges.unknown > 0 && (
                <BarRow
                  label="Tidak Diketahui"
                  value={summary.ageRanges.unknown}
                  max={maxAgeCount}
                  color="bg-gray-300"
                />
              )}
            </div>
          </div>

          {/* Education Distribution */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <LuGraduationCap className="w-4 h-4 text-indigo-500" />
              Pendidikan
            </h3>
            <div className="space-y-2">
              {Object.entries(summary.educationStats)
                .sort((a, b) => {
                  const ia = EDUCATION_ORDER.indexOf(a[0]);
                  const ib = EDUCATION_ORDER.indexOf(b[0]);
                  if (ia === -1 && ib === -1) return a[0].localeCompare(b[0]);
                  if (ia === -1) return 1;
                  if (ib === -1) return -1;
                  return ia - ib;
                })
                .map(([edu, count]) => (
                  <BarRow
                    key={edu}
                    label={edu}
                    value={count}
                    max={maxEduCount}
                    color="bg-indigo-400"
                  />
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Kelembagaan Type Distribution */}
      {summary && Object.keys(summary.typeStats).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <LuBuilding2 className="w-4 h-4 text-teal-500" />
            Distribusi per Kelembagaan
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {Object.entries(summary.typeStats)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <div
                  key={type}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <span className="text-sm font-medium text-gray-700">{type}</span>
                  <span className="text-sm font-bold text-teal-700 bg-teal-100 px-2 py-0.5 rounded-full">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Cari nama, jabatan, atau NIK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 text-sm rounded-lg border transition-colors ${
              showFilters || hasActiveFilters
                ? "bg-blue-50 border-blue-200 text-blue-700"
                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            <LuFilter className="w-4 h-4" />
            Filter
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LuX className="w-4 h-4" />
              Reset
            </button>
          )}
        </div>

        {/* Filter dropdowns */}
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 pt-3 border-t border-gray-100">
            <select
              value={selectedKecamatan}
              onChange={(e) => {
                setSelectedKecamatan(e.target.value);
                setSelectedDesa("");
              }}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Kecamatan</option>
              {filters.kecamatans.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.nama}
                </option>
              ))}
            </select>
            <select
              value={selectedDesa}
              onChange={(e) => setSelectedDesa(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Desa</option>
              {filteredDesas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nama}
                </option>
              ))}
            </select>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Kelembagaan</option>
              {Object.entries(TYPE_LABELS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Verified Pengurus Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">
            Pengurus Terverifikasi
            <span className="text-sm font-normal text-gray-500 ml-2">
              ({verifiedData.length} orang)
            </span>
          </h3>
        </div>
        {verifiedData.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            <LuUsers className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <p>Tidak ada data pengurus terverifikasi</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-600">
                  <th className="text-left px-4 py-3 font-medium">No</th>
                  <th className="text-left px-4 py-3 font-medium">Nama</th>
                  <th className="text-left px-4 py-3 font-medium">Jabatan</th>
                  <th className="text-left px-4 py-3 font-medium">Kelembagaan</th>
                  <th className="text-left px-4 py-3 font-medium">Desa</th>
                  <th className="text-left px-4 py-3 font-medium">Kecamatan</th>
                  <th className="text-left px-4 py-3 font-medium">JK</th>
                  <th className="text-left px-4 py-3 font-medium">Pendidikan</th>
                  <th className="text-center px-4 py-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {verifiedData.map((p, idx) => (
                  <tr
                    key={p.id}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                    onClick={() => navigate(getPath(`/bidang/pmd/pengurus/${p.id}`))}
                  >
                    <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {p.nama_lengkap}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.jabatan}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-0.5 text-xs font-medium bg-teal-100 text-teal-700 rounded-full">
                        {TYPE_LABELS[p.pengurusable_type] || p.pengurusable_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.desa_nama}</td>
                    <td className="px-4 py-3 text-gray-600">{p.kecamatan_nama}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.jenis_kelamin === "L" ? "L" : p.jenis_kelamin === "P" ? "P" : "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.pendidikan || "-"}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(getPath(`/bidang/pmd/pengurus/${p.id}`));
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Lihat Detail"
                      >
                        <LuExternalLink className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========================
   Sub-components
   ======================== */

function SummaryCard({ icon, label, value, bgColor, borderColor, onClick, clickable, isCustomIcon }) {
  const Wrapper = clickable ? "button" : "div";
  return (
    <Wrapper
      onClick={onClick}
      className={`${bgColor} border ${borderColor} rounded-xl p-4 ${
        clickable ? "cursor-pointer hover:shadow-md transition-shadow text-left w-full" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        {isCustomIcon ? icon : <div>{icon}</div>}
        {clickable && <LuChevronRight className="w-4 h-4 text-gray-400" />}
      </div>
      {value !== "" && (
        <p className="text-2xl font-bold text-gray-800 mt-2">{value.toLocaleString()}</p>
      )}
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </Wrapper>
  );
}

function GenderChart({ male, female }) {
  const total = male + female || 1;
  const malePct = Math.round((male / total) * 100);
  const femalePct = 100 - malePct;

  return (
    <div>
      {/* Visual bar */}
      <div className="flex rounded-full overflow-hidden h-6 mb-3">
        {malePct > 0 && (
          <div
            className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium transition-all duration-500"
            style={{ width: `${malePct}%` }}
          >
            {malePct > 10 ? `${malePct}%` : ""}
          </div>
        )}
        {femalePct > 0 && (
          <div
            className="bg-pink-500 flex items-center justify-center text-white text-xs font-medium transition-all duration-500"
            style={{ width: `${femalePct}%` }}
          >
            {femalePct > 10 ? `${femalePct}%` : ""}
          </div>
        )}
      </div>
      <div className="flex justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-gray-600">Laki-laki ({male})</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-pink-500" />
          <span className="text-gray-600">Perempuan ({female})</span>
        </div>
      </div>
    </div>
  );
}

function BarRow({ label, value, max, color }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-28 flex-shrink-0 truncate" title={label}>
        {label}
      </span>
      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
        <div
          className={`${color} h-full rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-gray-700 w-8 text-right">{value}</span>
    </div>
  );
}
