import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useBidangPath } from "../../../hooks/useBidangPath";
import {
  LuShield,
  LuBuilding2,
  LuChevronDown,
  LuChevronRight,
  LuCheck,
  LuX,
  LuSearch,
  LuRefreshCw,
  LuArrowLeft,
  LuShieldCheck,
  LuShieldAlert,
  LuMapPin,
  LuFileText,
  LuTriangleAlert,
  LuInfo,
  LuTrendingUp,
} from "react-icons/lu";
import api from "../../../api";
import toast from "react-hot-toast";

const KelembagaanLainnyaPage = () => {
  const navigate = useNavigate();
  const { getPath } = useBidangPath();
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [unverifiedItems, setUnverifiedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedKecamatan, setExpandedKecamatan] = useState({});
  const [expandedDesa, setExpandedDesa] = useState({});
  const [expandedGroup, setExpandedGroup] = useState({});

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/kelembagaan/lainnya-dashboard");
      if (res.data.success) {
        setData(res.data.data || []);
        setSummary(res.data.summary || null);
        setUnverifiedItems(res.data.unverified || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleKecamatan = (id) => {
    setExpandedKecamatan((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDesa = (id) => {
    setExpandedDesa((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Build desa name lookup from data for unverified items
  const desaNameMap = {};
  data.forEach((kec) => {
    kec.desas.forEach((desa) => {
      desaNameMap[desa.id] = { desaNama: desa.nama, kecNama: kec.nama };
    });
  });

  // Group lembaga lainnya by name across all desa
  const groupedLembaga = React.useMemo(() => {
    const groups = {};
    data.forEach((kec) => {
      kec.desas.forEach((desa) => {
        desa.lembaga_lainnya.items.forEach((item) => {
          const key = item.nama.trim().toLowerCase();
          if (!groups[key]) {
            groups[key] = { nama: item.nama, items: [] };
          }
          groups[key].items.push({
            ...item,
            desa_id: desa.id,
            desa_nama: desa.nama,
            kec_nama: kec.nama,
          });
        });
      });
    });
    return Object.values(groups).sort((a, b) => b.items.length - a.items.length);
  }, [data]);

  const toggleGroup = (nama) => {
    setExpandedGroup((prev) => ({ ...prev, [nama]: !prev[nama] }));
  };

  // Filter kecamatan/desa by search
  const filteredData = data
    .map((kec) => {
      if (!searchQuery) return kec;
      const lowerQuery = searchQuery.toLowerCase();
      if (kec.nama.toLowerCase().includes(lowerQuery)) return kec;
      const filteredDesas = kec.desas.filter(
        (desa) =>
          desa.nama.toLowerCase().includes(lowerQuery) ||
          desa.satlinmas.items.some((s) =>
            s.nama.toLowerCase().includes(lowerQuery)
          ) ||
          desa.lembaga_lainnya.items.some((l) =>
            l.nama.toLowerCase().includes(lowerQuery)
          )
      );
      if (filteredDesas.length === 0) return null;
      return { ...kec, desas: filteredDesas };
    })
    .filter(Boolean);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data...</p>
        </div>
      </div>
    );
  }

  const satlinmasPercent =
    summary && summary.satlinmas.total > 0
      ? Math.round(
          (summary.satlinmas.verified / summary.satlinmas.total) * 100
        )
      : 0;
  const lembagaPercent =
    summary && summary.lembaga_lainnya.total > 0
      ? Math.round(
          (summary.lembaga_lainnya.verified / summary.lembaga_lainnya.total) *
            100
        )
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between px-4 sm:px-6 py-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(getPath("/bidang/pmd"))}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <LuArrowLeft className="h-5 w-5 text-gray-600" />
              </button>
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-md">
                <LuBuilding2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                  Kelembagaan Lainnya
                </h1>
                <p className="hidden sm:block text-xs sm:text-sm text-gray-500">
                  Dashboard Satlinmas & Lembaga Custom Desa
                </p>
              </div>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <LuRefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Infographic Cards */}
        {summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Desa */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <LuMapPin className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-500">
                  Total Desa
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {summary.totalDesa}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Desa/Kelurahan terdaftar
              </p>
            </div>

            {/* Satlinmas */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                  <LuShield className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-500">
                  Satlinmas
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {summary.satlinmas.total}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-emerald-600 font-medium">
                  {summary.satlinmas.desaTerbentuk} terbentuk
                </span>
                <span className="text-xs text-gray-400">|</span>
                <span className="text-xs text-red-500">
                  {summary.satlinmas.desaBelumTerbentuk} belum
                </span>
              </div>
            </div>

            {/* Lembaga Custom */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center">
                  <LuFileText className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-500">
                  Lembaga Lainnya
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {summary.lembaga_lainnya.total}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Di {summary.lembaga_lainnya.desaDenganLembaga} desa
              </p>
            </div>

            {/* Total Belum Verifikasi */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                  <LuTriangleAlert className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-500">
                  Belum Verifikasi
                </span>
              </div>
              <p className="text-3xl font-bold text-gray-900">
                {summary.satlinmas.unverified +
                  summary.lembaga_lainnya.unverified}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Menunggu verifikasi
              </p>
            </div>
          </div>
        )}

        {/* Verification Progress Bars */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Satlinmas Progress */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <LuShieldCheck className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-semibold text-gray-800">
                    Verifikasi Satlinmas
                  </h3>
                </div>
                <span className="text-sm font-bold text-emerald-600">
                  {satlinmasPercent}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${satlinmasPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <LuCheck className="h-3 w-3 text-emerald-500" />
                  {summary.satlinmas.verified} terverifikasi
                </span>
                <span className="flex items-center gap-1">
                  <LuX className="h-3 w-3 text-red-400" />
                  {summary.satlinmas.unverified} belum
                </span>
              </div>
            </div>

            {/* Lembaga Lainnya Progress */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <LuTrendingUp className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-800">
                    Verifikasi Lembaga Lainnya
                  </h3>
                </div>
                <span className="text-sm font-bold text-blue-600">
                  {lembagaPercent}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                <div
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${lembagaPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <LuCheck className="h-3 w-3 text-blue-500" />
                  {summary.lembaga_lainnya.verified} terverifikasi
                </span>
                <span className="flex items-center gap-1">
                  <LuX className="h-3 w-3 text-red-400" />
                  {summary.lembaga_lainnya.unverified} belum
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Grouped Lembaga Lainnya List */}
        {groupedLembaga.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <LuBuilding2 className="h-5 w-5 text-blue-600" />
              <h3 className="font-semibold text-gray-800">
                Daftar Kelembagaan Lainya ({groupedLembaga.length} jenis)
              </h3>
            </div>
            <div className="space-y-2">
              {groupedLembaga.map((group) => {
                const verified = group.items.filter(
                  (i) => i.status_verifikasi === "verified"
                ).length;
                const isOpen = expandedGroup[group.nama];
                return (
                  <div
                    key={group.nama}
                    className="border border-gray-100 rounded-xl overflow-hidden"
                  >
                    <button
                      onClick={() => toggleGroup(group.nama)}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <LuFileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-gray-800">
                            {group.nama}
                          </p>
                          <p className="text-xs text-gray-500">
                            {group.items.length} desa
                            <span className="mx-1">·</span>
                            <span className="text-emerald-600">
                              {verified} terverifikasi
                            </span>
                            {group.items.length - verified > 0 && (
                              <>
                                <span className="mx-1">·</span>
                                <span className="text-amber-600">
                                  {group.items.length - verified} belum
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-bold">
                          {group.items.length}
                        </span>
                        {isOpen ? (
                          <LuChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <LuChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="border-t border-gray-100 bg-gray-50 p-3 space-y-1.5">
                        {group.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between bg-white rounded-lg p-2.5 cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() =>
                              navigate(
                                getPath(
                                  `/bidang/pmd/kelembagaan/lembaga-lainnya/${item.id}`
                                )
                              )
                            }
                          >
                            <div>
                              <p className="text-sm text-gray-700 font-medium">
                                {item.desa_nama}
                              </p>
                              <p className="text-xs text-gray-400">
                                {item.kec_nama}
                              </p>
                            </div>
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                item.status_verifikasi === "verified"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {item.status_verifikasi === "verified"
                                ? "✓"
                                : "Belum"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Unverified Items Quick List */}
        {unverifiedItems.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border border-amber-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <LuShieldAlert className="h-5 w-5 text-amber-600" />
              <h3 className="font-semibold text-gray-800">
                Lembaga Belum Terverifikasi ({unverifiedItems.length})
              </h3>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {unverifiedItems.map((item) => {
                const desaInfo = desaNameMap[item.desa_id];
                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center justify-between p-3 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors cursor-pointer"
                    onClick={() =>
                      navigate(
                        getPath(
                          `/bidang/pmd/kelembagaan/${item.type}/${item.id}`
                        )
                      )
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                          item.type === "satlinmas"
                            ? "bg-emerald-100 text-emerald-600"
                            : "bg-blue-100 text-blue-600"
                        }`}
                      >
                        {item.type === "satlinmas" ? (
                          <LuShield className="h-4 w-4" />
                        ) : (
                          <LuFileText className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {item.nama}
                        </p>
                        <p className="text-xs text-gray-500">
                          {desaInfo
                            ? `${desaInfo.desaNama}, ${desaInfo.kecNama}`
                            : ""}
                          {" · "}
                          <span className="capitalize">
                            {item.type === "lembaga-lainnya"
                              ? "Lembaga Lainnya"
                              : "Satlinmas"}
                          </span>
                        </p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-amber-200 text-amber-800 font-medium">
                      Belum Verifikasi
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4">
          <div className="relative">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Cari kecamatan, desa, atau nama lembaga..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Kecamatan Accordion */}
        <div className="space-y-4">
          {filteredData.map((kec) => (
            <div
              key={kec.id}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
            >
              {/* Kecamatan Header */}
              <button
                onClick={() => toggleKecamatan(kec.id)}
                className="w-full flex items-center justify-between p-4 sm:p-5 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <LuMapPin className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-gray-800">
                      Kecamatan {kec.nama}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {kec.totalDesa} Desa/Kelurahan
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Summary badges */}
                  <div className="hidden sm:flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs">
                      <LuShield className="h-4 w-4 text-emerald-500" />
                      <span className="text-gray-600">
                        {kec.summary.satlinmas.total} Satlinmas
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                          kec.summary.satlinmas.verified ===
                          kec.summary.satlinmas.total
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {kec.summary.satlinmas.verified}/
                        {kec.summary.satlinmas.total}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <LuFileText className="h-4 w-4 text-blue-500" />
                      <span className="text-gray-600">
                        {kec.summary.lembaga_lainnya.total} Lembaga
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                          kec.summary.lembaga_lainnya.verified ===
                          kec.summary.lembaga_lainnya.total
                            ? "bg-blue-100 text-blue-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {kec.summary.lembaga_lainnya.verified}/
                        {kec.summary.lembaga_lainnya.total}
                      </span>
                    </div>
                  </div>
                  {expandedKecamatan[kec.id] ? (
                    <LuChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <LuChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Mobile summary badges */}
              {!expandedKecamatan[kec.id] && (
                <div className="sm:hidden flex items-center gap-3 px-5 pb-4">
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <LuShield className="h-3.5 w-3.5 text-emerald-500" />
                    {kec.summary.satlinmas.verified}/
                    {kec.summary.satlinmas.total}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <LuFileText className="h-3.5 w-3.5 text-blue-500" />
                    {kec.summary.lembaga_lainnya.verified}/
                    {kec.summary.lembaga_lainnya.total}
                  </span>
                </div>
              )}

              {/* Desa List */}
              {expandedKecamatan[kec.id] && (
                <div className="border-t border-gray-100">
                  {kec.desas.map((desa) => (
                    <div
                      key={desa.id}
                      className="border-b border-gray-50 last:border-b-0"
                    >
                      {/* Desa Header */}
                      <button
                        onClick={() => toggleDesa(desa.id)}
                        className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
                            <LuBuilding2 className="h-4 w-4 text-gray-500" />
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-semibold text-gray-700">
                              {desa.nama}
                            </p>
                            <p className="text-xs text-gray-400 capitalize">
                              {desa.status || "desa"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {/* Satlinmas badge */}
                          <span
                            className={`text-xs px-2 py-1 rounded-full font-medium ${
                              desa.satlinmas.terbentuk
                                ? desa.satlinmas.verified > 0
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-600"
                            }`}
                          >
                            {desa.satlinmas.terbentuk ? (
                              <>
                                <LuShield className="inline h-3 w-3 mr-1" />
                                Satlinmas{" "}
                                {desa.satlinmas.verified > 0 ? "✓" : "!"}
                              </>
                            ) : (
                              "Belum Satlinmas"
                            )}
                          </span>

                          {/* Lembaga count */}
                          {desa.lembaga_lainnya.total > 0 && (
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                              {desa.lembaga_lainnya.total} Lembaga
                            </span>
                          )}

                          {expandedDesa[desa.id] ? (
                            <LuChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <LuChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </button>

                      {/* Desa Detail */}
                      {expandedDesa[desa.id] && (
                        <div className="px-5 pb-4 space-y-3">
                          {/* Satlinmas Section */}
                          <div className="bg-emerald-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <LuShield className="h-4 w-4 text-emerald-600" />
                              <h4 className="text-sm font-semibold text-emerald-800">
                                Satlinmas
                              </h4>
                            </div>
                            {desa.satlinmas.items.length > 0 ? (
                              <div className="space-y-2">
                                {desa.satlinmas.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between bg-white rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() =>
                                      navigate(
                                        getPath(
                                          `/bidang/pmd/kelembagaan/satlinmas/${item.id}`
                                        )
                                      )
                                    }
                                  >
                                    <span className="text-sm text-gray-700 font-medium">
                                      {item.nama}
                                    </span>
                                    <span
                                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                                        item.status_verifikasi === "verified"
                                          ? "bg-emerald-100 text-emerald-700"
                                          : "bg-amber-100 text-amber-700"
                                      }`}
                                    >
                                      {item.status_verifikasi === "verified"
                                        ? "Terverifikasi"
                                        : "Belum Verifikasi"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-sm text-red-600 bg-white rounded-lg p-3">
                                <LuInfo className="h-4 w-4" />
                                <span>Satlinmas belum terbentuk</span>
                              </div>
                            )}
                          </div>

                          {/* Lembaga Lainnya Section */}
                          <div className="bg-blue-50 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <LuFileText className="h-4 w-4 text-blue-600" />
                              <h4 className="text-sm font-semibold text-blue-800">
                                Lembaga Custom Desa
                              </h4>
                            </div>
                            {desa.lembaga_lainnya.items.length > 0 ? (
                              <div className="space-y-2">
                                {desa.lembaga_lainnya.items.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between bg-white rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow"
                                    onClick={() =>
                                      navigate(
                                        getPath(
                                          `/bidang/pmd/kelembagaan/lembaga-lainnya/${item.id}`
                                        )
                                      )
                                    }
                                  >
                                    <span className="text-sm text-gray-700 font-medium">
                                      {item.nama}
                                    </span>
                                    <span
                                      className={`text-xs px-2 py-1 rounded-full font-medium ${
                                        item.status_verifikasi === "verified"
                                          ? "bg-blue-100 text-blue-700"
                                          : "bg-amber-100 text-amber-700"
                                      }`}
                                    >
                                      {item.status_verifikasi === "verified"
                                        ? "Terverifikasi"
                                        : "Belum Verifikasi"}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-sm text-gray-500 bg-white rounded-lg p-3">
                                <LuInfo className="h-4 w-4" />
                                <span>Belum ada lembaga lainnya</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {filteredData.length === 0 && (
            <div className="text-center py-12">
              <LuSearch className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Tidak ada data ditemukan</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KelembagaanLainnyaPage;
