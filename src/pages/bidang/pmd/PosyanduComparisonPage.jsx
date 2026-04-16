import React, { useState, useEffect, useMemo } from "react";
import {
  LuSearch,
  LuFilter,
  LuChevronDown,
  LuChevronRight,
  LuDatabase,
  LuFileSpreadsheet,
  LuCircleCheck,
  LuCircleAlert,
  LuCircleMinus,
} from "react-icons/lu";
import api from "../../../api";

const STATUS_CONFIG = {
  matched: {
    label: "Cocok (Gema & ADD)",
    color: "bg-green-100 text-green-800",
    dotColor: "bg-green-500",
  },
  fuzzy_matched: {
    label: "Cocok (Nama Mirip)",
    color: "bg-orange-100 text-orange-800",
    dotColor: "bg-orange-500",
  },
  only_gema: {
    label: "Hanya di Gema",
    color: "bg-yellow-100 text-yellow-800",
    dotColor: "bg-yellow-500",
  },
  only_add: {
    label: "Hanya di ADD",
    color: "bg-blue-100 text-blue-800",
    dotColor: "bg-blue-500",
  },
  only_db: {
    label: "Hanya di Database",
    color: "bg-gray-100 text-gray-700",
    dotColor: "bg-gray-400",
  },
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
};

const PosyanduComparisonPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterKecamatan, setFilterKecamatan] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [expandedDesa, setExpandedDesa] = useState(new Set());
  const [showOnlyDiscrepancy, setShowOnlyDiscrepancy] = useState(false);
  const [sortBy, setSortBy] = useState("kode");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/kelembagaan/posyandu-comparison");
      if (response.data.success) {
        setData(response.data.data);
      } else {
        throw new Error(response.data.message || "Gagal memuat data");
      }
    } catch (err) {
      setError(
        err.response?.data?.message || err.message || "Gagal memuat data",
      );
    } finally {
      setLoading(false);
    }
  };

  // Get unique kecamatan list
  const kecamatanList = useMemo(() => {
    if (!data) return [];
    const kecs = [...new Set(data.comparison.map((d) => d.kecamatanNama))];
    return kecs.sort();
  }, [data]);

  // Filtered data
  const filteredData = useMemo(() => {
    if (!data) return [];
    let filtered = data.comparison;

    if (filterKecamatan) {
      filtered = filtered.filter((d) => d.kecamatanNama === filterKecamatan);
    }

    if (searchTerm) {
      const term = searchTerm.toUpperCase();
      filtered = filtered.filter(
        (d) =>
          d.desaNama.toUpperCase().includes(term) ||
          d.kecamatanNama.toUpperCase().includes(term) ||
          d.items.some((item) => item.nama.toUpperCase().includes(term)),
      );
    }

    if (showOnlyDiscrepancy) {
      filtered = filtered.filter((d) => d.onlyGema > 0 || d.onlyAdd > 0);
    }

    if (filterStatus) {
      filtered = filtered
        .map((d) => ({
          ...d,
          items: d.items.filter((item) => {
            if (filterStatus === 'fuzzy_matched') return item.status === 'matched' && item.isFuzzy;
            return item.status === filterStatus;
          }),
        }))
        .filter((d) => d.items.length > 0);
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === "kode") return a.desaKode.localeCompare(b.desaKode);
      return a.desaNama.localeCompare(b.desaNama);
    });

    return filtered;
  }, [data, filterKecamatan, searchTerm, showOnlyDiscrepancy, filterStatus, sortBy]);

  // Filtered summary
  const filteredSummary = useMemo(() => {
    return {
      totalDesa: filteredData.length,
      totalMatched: filteredData.reduce((a, d) => a + d.matched, 0),
      totalOnlyGema: filteredData.reduce((a, d) => a + d.onlyGema, 0),
      totalOnlyAdd: filteredData.reduce((a, d) => a + d.onlyAdd, 0),
      totalOnlyDb: filteredData.reduce((a, d) => a + d.onlyDb, 0),
    };
  }, [filteredData]);

  const toggleDesa = (desaId) => {
    setExpandedDesa((prev) => {
      const next = new Set(prev);
      if (next.has(desaId)) next.delete(desaId);
      else next.add(desaId);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedDesa(new Set(filteredData.map((d) => d.desaId)));
  };

  const collapseAll = () => {
    setExpandedDesa(new Set());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">
            Memproses data perbandingan posyandu...
          </p>
          <p className="text-gray-400 text-sm mt-1">
            Membaca file Excel dan database
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center bg-red-50 p-6 rounded-xl max-w-md">
          <LuCircleAlert className="w-12 h-12 text-red-500 mx-auto mb-3" />
          <p className="text-red-700 font-medium">Gagal Memuat Data</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Pembanding Data Posyandu
        </h1>
        <p className="text-gray-500 mt-1">
          Perbandingan data posyandu dari Database, Posyandu Gema, dan Posyandu
          ADD
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard
          icon={<LuDatabase />}
          label="Database"
          value={data.summary.totalDbPosyandu}
          color="indigo"
        />
        <SummaryCard
          icon={<LuFileSpreadsheet />}
          label="Gema"
          value={data.summary.totalGemaPosyandu}
          color="purple"
        />
        <SummaryCard
          icon={<LuFileSpreadsheet />}
          label="ADD"
          value={data.summary.totalAddPosyandu}
          color="cyan"
        />
        <SummaryCard
          icon={<LuCircleCheck />}
          label="Cocok"
          value={data.summary.totalMatched}
          color="green"
          subtitle={data.summary.totalFuzzyMatched > 0 ? `${data.summary.totalFuzzyMatched} nama mirip` : null}
        />
        <SummaryCard
          icon={<LuCircleAlert />}
          label="Hanya Gema"
          value={data.summary.totalOnlyGema}
          color="yellow"
        />
        <SummaryCard
          icon={<LuCircleMinus />}
          label="Hanya ADD"
          value={data.summary.totalOnlyAdd}
          color="blue"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari desa atau posyandu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
            />
          </div>

          {/* Kecamatan filter */}
          <select
            value={filterKecamatan}
            onChange={(e) => setFilterKecamatan(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Semua Kecamatan</option>
            {kecamatanList.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Semua Status</option>
            <option value="matched">Cocok (Gema & ADD)</option>
            <option value="fuzzy_matched">Cocok (Nama Mirip)</option>
            <option value="only_gema">Hanya di Gema</option>
            <option value="only_add">Hanya di ADD</option>
            <option value="only_db">Hanya di Database</option>
          </select>

          {/* Discrepancy toggle */}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyDiscrepancy}
              onChange={(e) => setShowOnlyDiscrepancy(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-gray-600">Hanya desa berselisih</span>
          </label>

          {/* Sort */}
          <div className="flex items-center gap-1 border border-gray-300 rounded-lg overflow-hidden">
            <button
              onClick={() => setSortBy("kode")}
              className={`px-3 py-2 text-xs transition-colors ${sortBy === "kode" ? "bg-blue-600 text-white" : "bg-gray-50 hover:bg-gray-100 text-gray-600"}`}
            >
              Kode Desa
            </button>
            <button
              onClick={() => setSortBy("nama")}
              className={`px-3 py-2 text-xs transition-colors ${sortBy === "nama" ? "bg-blue-600 text-white" : "bg-gray-50 hover:bg-gray-100 text-gray-600"}`}
            >
              Abjad
            </button>
          </div>

          {/* Expand/Collapse */}
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Buka Semua
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-2 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Tutup Semua
            </button>
          </div>
        </div>

        {/* Filtered result count */}
        <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
          <span>{filteredSummary.totalDesa} desa</span>
          <span className="text-green-600">
            {filteredSummary.totalMatched} cocok
          </span>
          <span className="text-yellow-600">
            {filteredSummary.totalOnlyGema} hanya gema
          </span>
          <span className="text-blue-600">
            {filteredSummary.totalOnlyAdd} hanya ADD
          </span>
          <span className="text-gray-500">
            {filteredSummary.totalOnlyDb} hanya DB
          </span>
        </div>
      </div>

      {/* Comparison List */}
      <div className="space-y-2">
        {filteredData.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <LuFilter className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Tidak ada data yang sesuai filter</p>
          </div>
        ) : (
          filteredData.map((desa) => (
            <DesaRow
              key={desa.desaId}
              desa={desa}
              expanded={expandedDesa.has(desa.desaId)}
              onToggle={() => toggleDesa(desa.desaId)}
              filterStatus={filterStatus}
            />
          ))
        )}
      </div>
    </div>
  );
};

const SummaryCard = ({ icon, label, value, color, subtitle }) => {
  const colorMap = {
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    cyan: "bg-cyan-50 text-cyan-600 border-cyan-200",
    green: "bg-green-50 text-green-600 border-green-200",
    yellow: "bg-yellow-50 text-yellow-600 border-yellow-200",
    blue: "bg-blue-50 text-blue-600 border-blue-200",
  };

  return (
    <div className={`rounded-xl border p-3 ${colorMap[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{icon}</span>
        <span className="text-xs font-medium opacity-75">{label}</span>
      </div>
      <p className="text-2xl font-bold">{value.toLocaleString("id-ID")}</p>
      {subtitle && <p className="text-xs opacity-60 mt-0.5">{subtitle}</p>}
    </div>
  );
};

const DesaRow = ({ desa, expanded, onToggle, filterStatus }) => {
  const hasDiscrepancy = desa.onlyGema > 0 || desa.onlyAdd > 0;
  const items = filterStatus
    ? desa.items.filter((i) => {
        if (filterStatus === 'fuzzy_matched') return i.status === 'matched' && i.isFuzzy;
        return i.status === filterStatus;
      })
    : desa.items;

  return (
    <div
      className={`bg-white rounded-xl border ${hasDiscrepancy ? "border-yellow-300" : "border-gray-200"} shadow-sm overflow-hidden`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 transition-colors text-left"
      >
        <span className="text-gray-400">
          {expanded ? (
            <LuChevronDown className="w-5 h-5" />
          ) : (
            <LuChevronRight className="w-5 h-5" />
          )}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{desa.desaNama}</span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-sm text-gray-500">{desa.kecamatanNama}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Badge count={desa.totalDb} label="DB" variant="gray" />
          <Badge count={desa.totalGema} label="Gema" variant="purple" />
          <Badge count={desa.totalAdd} label="ADD" variant="cyan" />
          {desa.matched > 0 && (
            <Badge count={desa.matched} label="Cocok" variant="green" />
          )}
          {desa.onlyGema > 0 && (
            <Badge count={desa.onlyGema} label="Hanya Gema" variant="yellow" />
          )}
          {desa.onlyAdd > 0 && (
            <Badge count={desa.onlyAdd} label="Hanya ADD" variant="blue" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && items.length > 0 && (
        <div className="border-t border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <th className="px-4 py-2 text-left font-medium w-12">No</th>
                  <th className="px-4 py-2 text-left font-medium">Database</th>
                  <th className="px-4 py-2 text-left font-medium">Gema</th>
                  <th className="px-4 py-2 text-left font-medium">ADD</th>
                  <th className="px-4 py-2 text-left font-medium w-40">Status</th>
                  <th className="px-4 py-2 text-right font-medium w-36">
                    Nilai ADD
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const cfg = STATUS_CONFIG[item.status];
                  const statusCfg = item.isFuzzy && item.status === 'matched' ? STATUS_CONFIG.fuzzy_matched : cfg;
                  return (
                    <tr
                      key={item.normalized + idx}
                      className="border-t border-gray-50 hover:bg-gray-50"
                    >
                      <td className="px-4 py-2 text-gray-400">{idx + 1}</td>
                      <td className="px-4 py-2">
                        {item.dbNama && item.dbNama.length > 0 ? (
                          <span className="font-medium text-gray-900">{item.dbNama.join(', ')}</span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">(tidak ada)</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {item.gemaNama && item.gemaNama.length > 0 ? (
                          <span className="font-medium text-gray-900">{item.gemaNama.join(', ')}</span>
                        ) : (
                          <span className="text-gray-400 italic text-xs">(tidak ada)</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {item.addNama && item.addNama.length > 0 ? (
                          <div>
                            <span className="font-medium text-gray-900">{item.addNama.join(', ')}</span>
                            {item.isFuzzy && (
                              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-700 border border-orange-200">
                                ~mirip
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-xs">(tidak ada)</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotColor}`}
                          ></span>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right text-gray-600">
                        {item.addNilai > 0
                          ? formatCurrency(item.addNilai)
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {expanded && items.length === 0 && (
        <div className="border-t border-gray-100 p-4 text-center text-gray-400 text-sm">
          Tidak ada data posyandu untuk desa ini
        </div>
      )}
    </div>
  );
};

const Badge = ({ count, label, variant }) => {
  const variants = {
    gray: "bg-gray-100 text-gray-600",
    purple: "bg-purple-100 text-purple-600",
    cyan: "bg-cyan-100 text-cyan-600",
    green: "bg-green-100 text-green-600",
    yellow: "bg-yellow-100 text-yellow-600",
    blue: "bg-blue-100 text-blue-600",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${variants[variant]}`}
    >
      <span className="font-bold">{count}</span>
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
};

export default PosyanduComparisonPage;
