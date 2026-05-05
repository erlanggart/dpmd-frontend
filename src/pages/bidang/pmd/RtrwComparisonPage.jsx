import React, { useEffect, useMemo, useState } from "react";
import {
  LuChevronDown,
  LuChevronRight,
  LuCircleAlert,
  LuCircleCheck,
  LuCircleHelp,
  LuDatabase,
  LuDownload,
  LuFileSpreadsheet,
  LuFilter,
  LuSearch,
  LuShieldCheck,
  LuX,
} from "react-icons/lu";
import * as XLSX from "xlsx";
import api from "../../../api";

const STATUS_CONFIG = {
  all_three: {
    label: "DB + ADD + BPJS",
    color: "bg-green-100 text-green-800",
    dotColor: "bg-green-500",
  },
  db_add: {
    label: "DB + ADD",
    color: "bg-teal-100 text-teal-800",
    dotColor: "bg-teal-500",
  },
  db_bpjs: {
    label: "DB + BPJS",
    color: "bg-emerald-100 text-emerald-800",
    dotColor: "bg-emerald-500",
  },
  add_bpjs: {
    label: "ADD + BPJS",
    color: "bg-indigo-100 text-indigo-800",
    dotColor: "bg-indigo-500",
  },
  only_db: {
    label: "Hanya Database",
    color: "bg-gray-100 text-gray-700",
    dotColor: "bg-gray-400",
  },
  only_add: {
    label: "Hanya ADD",
    color: "bg-blue-100 text-blue-800",
    dotColor: "bg-blue-500",
  },
  only_bpjs: {
    label: "Hanya BPJS",
    color: "bg-amber-100 text-amber-800",
    dotColor: "bg-amber-500",
  },
  nik_mismatch: {
    label: "NIK Berbeda",
    color: "bg-red-100 text-red-800",
    dotColor: "bg-red-500",
  },
  bpjs_tangkil_suspect: {
    label: "BPJS ?",
    color: "bg-violet-100 text-violet-800",
    dotColor: "bg-violet-500",
  },
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(value || 0));
};

const joinNames = (names) => (names && names.length > 0 ? names.join(", ") : "-");
const pendingDetailsText = (count) => (count ? `${count} detail` : "-");
const formatCandidate = (candidate) => {
  if (!candidate) return "";
  const source = candidate.sources?.length ? ` (${candidate.sources.join("+")})` : "";
  return `${candidate.desaNama || candidate.desaKode}${candidate.kecamatanNama ? ` - ${candidate.kecamatanNama}` : ""}${source}`;
};

const RtrwComparisonPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterKecamatan, setFilterKecamatan] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showOnlyDiscrepancy, setShowOnlyDiscrepancy] = useState(false);
  const [expandedDesa, setExpandedDesa] = useState(new Set());
  const [listModal, setListModal] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    let keepLoading = false;
    try {
      setLoading(true);
      setError(null);
      const response = await api.get("/kelembagaan/rtrw-comparison");
      if (response.data.processing) {
        keepLoading = true;
        window.setTimeout(fetchData, 3000);
        return;
      }
      if (response.data.success) {
        setData(response.data.data);
      } else {
        throw new Error(response.data.message || "Gagal memuat data");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Gagal memuat data");
    } finally {
      if (!keepLoading) setLoading(false);
    }
  };

  const kecamatanList = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.comparison.map((desa) => desa.kecamatanNama))].sort();
  }, [data]);

  const filteredData = useMemo(() => {
    if (!data) return [];

    let result = data.comparison;
    if (filterKecamatan) {
      result = result.filter((desa) => desa.kecamatanNama === filterKecamatan);
    }

    if (searchTerm) {
      const term = searchTerm.toUpperCase();
      result = result.filter((desa) => {
        return (
          desa.desaNama.toUpperCase().includes(term) ||
          desa.kecamatanNama.toUpperCase().includes(term) ||
          desa.items.some((item) => {
            return (
              item.nama.toUpperCase().includes(term) ||
              (item.nik || []).some((nik) => nik.includes(term))
            );
          })
        );
      });
    }

    if (showOnlyDiscrepancy) {
      result = result.filter((desa) => {
        return desa.items.some((item) => item.status !== "all_three" || item.nikMismatch || item.bpjsTangkilSuspect);
      });
    }

    if (filterStatus) {
      result = result
        .map((desa) => ({
          ...desa,
          items: desa.items.filter((item) => {
            if (filterStatus === "nik_mismatch") return item.nikMismatch;
            if (filterStatus === "bpjs_tangkil_suspect") return item.bpjsTangkilSuspect;
            return item.status === filterStatus;
          }),
        }))
        .filter((desa) => desa.items.length > 0);
    }

    return [...result].sort((a, b) => a.desaKode.localeCompare(b.desaKode));
  }, [data, filterKecamatan, filterStatus, searchTerm, showOnlyDiscrepancy]);

  const filteredSummary = useMemo(() => {
    const countStatus = (status) => filteredData.reduce(
      (sum, desa) => sum + desa.items.filter((item) => item.status === status).length,
      0,
    );

    return {
      totalDesa: filteredData.length,
      totalAllThree: countStatus("all_three"),
      totalDbAdd: countStatus("db_add"),
      totalDbBpjs: countStatus("db_bpjs"),
      totalAddBpjs: countStatus("add_bpjs"),
      totalOnlyDb: countStatus("only_db"),
      totalOnlyAdd: countStatus("only_add"),
      totalOnlyBpjs: countStatus("only_bpjs"),
      totalNikMismatch: filteredData.reduce(
        (sum, desa) => sum + desa.items.filter((item) => item.nikMismatch).length,
        0,
      ),
      totalBpjsTangkilSuspect: filteredData.reduce(
        (sum, desa) => sum + desa.items.filter((item) => item.bpjsTangkilSuspect).length,
        0,
      ),
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

  const exportToExcel = () => {
    const rows = [];

    filteredData.forEach((desa) => {
      desa.items.forEach((item) => {
        const statusLabel = item.nikMismatch
          ? STATUS_CONFIG.nik_mismatch.label
          : item.bpjsTangkilSuspect
            ? `${STATUS_CONFIG[item.status]?.label || item.status} / BPJS ?`
          : STATUS_CONFIG[item.status]?.label || item.status;

        rows.push({
          Kecamatan: desa.kecamatanNama,
          "Kode Desa": desa.desaKode,
          Desa: desa.desaNama,
          Nama: item.nama,
          NIK: (item.nik || []).join(", ") || "-",
          Jenis: item.jenis || "-",
          RW: item.rwNomor || "-",
          RT: item.rtNomor || "-",
          "Nama Database": joinNames(item.dbNama),
          "Nama ADD": joinNames(item.addNama),
          "Nama BPJS": joinNames(item.bpjsNama),
          "BPJS Kode Asal": item.bpjsOriginalDesaKode || "-",
          "BPJS Perlu Verifikasi": item.bpjsTangkilSuspect ? "Ya" : "Tidak",
          "Kandidat BPJS": (item.bpjsTangkilCandidates || []).map(formatCandidate).join("; ") || "-",
          Status: statusLabel,
          Keterangan: item.keterangan,
          "Nilai ADD": item.addNilai || 0,
          "Detail Database": (item.dbDetails || [])
            .map((d) => `${d.jabatan || "-"} ${d.jenis || ""} ${d.rtNomor ? `RT ${d.rtNomor}` : ""} ${d.rwNomor ? `RW ${d.rwNomor}` : ""} | NIK: ${d.nik || "-"}`)
            .join("; ") || pendingDetailsText(item.dbDetailCount),
          "Detail ADD": (item.addDetails || [])
            .map((d) => `${d.tglBukti || "-"} | ${d.keterangan || "-"} | ${formatCurrency(d.nilai)}`)
            .join("; ") || pendingDetailsText(item.addDetailCount),
          "Detail BPJS": (item.bpjsDetails || [])
            .map((d) => `${d.nik || "-"} | KPJ ${d.kpj || "-"} | BLTH ${d.blth || "-"} | ${formatCurrency(d.upah)}`)
            .join("; ") || pendingDetailsText(item.bpjsDetailCount),
        });
      });
    });

    if (rows.length === 0) return;

    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = Object.keys(rows[0]).map((key) => {
      const maxLen = Math.max(key.length, ...rows.map((row) => String(row[key] ?? "").length));
      return { wch: Math.min(maxLen + 2, 70) };
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Perbandingan RT RW");
    const filename = `RT_RW_Comparison_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
          <p className="font-medium text-gray-600">Memproses persandingan RT/RW...</p>
          <p className="mt-1 text-sm text-gray-400">Membaca ringkasan ADD, BPJS, dan database</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md rounded-xl bg-red-50 p-6 text-center">
          <LuCircleAlert className="mx-auto mb-3 h-12 w-12 text-red-500" />
          <p className="font-medium text-red-700">Gagal Memuat Data</p>
          <p className="mt-1 text-sm text-red-500">{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Persandingan Data RT/RW</h1>
        <p className="mt-1 text-gray-500">
          Perbandingan pengurus RT/RW dari Database, penerima insentif ADD, dan peserta BPJS
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <SummaryCard
          icon={<LuDatabase />}
          label="Database"
          value={data.summary.totalDbPengurus}
          color="gray"
          subtitle={`${data.summary.totalDbDesa} desa`}
          extraInfo={data.summary.desaWithoutDb?.length ? {
            label: `${data.summary.desaWithoutDb.length} desa kosong`,
            onClick: () => setListModal({ title: "Desa Tanpa Data Database", list: data.summary.desaWithoutDb }),
          } : null}
        />
        <SummaryCard
          icon={<LuFileSpreadsheet />}
          label="ADD"
          value={data.summary.totalAddPenerima}
          color="blue"
          subtitle={`${data.summary.totalAddRows} baris transaksi`}
          extraInfo={data.summary.desaWithoutAdd?.length ? {
            label: `${data.summary.desaWithoutAdd.length} desa kosong`,
            onClick: () => setListModal({ title: "Desa Tanpa Data ADD", list: data.summary.desaWithoutAdd }),
          } : null}
        />
        <SummaryCard
          icon={<LuShieldCheck />}
          label="BPJS"
          value={data.summary.totalBpjsPenerima}
          color="amber"
          subtitle={`${data.summary.totalBpjsDesa} desa`}
          extraInfo={data.summary.desaWithoutBpjs?.length ? {
            label: `${data.summary.desaWithoutBpjs.length} desa kosong`,
            onClick: () => setListModal({ title: "Desa Tanpa Data BPJS", list: data.summary.desaWithoutBpjs }),
          } : null}
        />
        <SummaryCard
          icon={<LuCircleCheck />}
          label="Lengkap"
          value={data.summary.totalAllThree}
          color="green"
          subtitle={data.summary.totalNikMismatch ? `${data.summary.totalNikMismatch} NIK berbeda` : "3 sumber cocok"}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        <SummaryCard label="DB + ADD" value={data.summary.totalDbAdd} color="teal" />
        <SummaryCard label="DB + BPJS" value={data.summary.totalDbBpjs} color="green" />
        <SummaryCard label="ADD + BPJS" value={data.summary.totalAddBpjs} color="indigo" />
        <SummaryCard label="Hanya DB" value={data.summary.totalOnlyDb} color="gray" />
        <SummaryCard label="Hanya ADD" value={data.summary.totalOnlyAdd} color="blue" />
        <SummaryCard label="Hanya BPJS" value={data.summary.totalOnlyBpjs} color="amber" />
        <SummaryCard label="NIK Berbeda" value={data.summary.totalNikMismatch} color="red" />
        <SummaryCard
          label="BPJS ?"
          value={data.summary.totalBpjsTangkilRelocated}
          color="violet"
          subtitle={data.summary.totalBpjsTangkilSuspect ? `${data.summary.totalBpjsTangkilSuspect} baris sandingan` : undefined}
        />
      </div>

      {listModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setListModal(null)}>
          <div className="mx-4 flex max-h-[70vh] w-full max-w-md flex-col rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
              <h3 className="font-semibold text-gray-900">{listModal.title}</h3>
              <button onClick={() => setListModal(null)} className="rounded-lg p-1 hover:bg-gray-100">
                <LuX className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3">
              <p className="mb-2 text-xs text-gray-500">{listModal.list.length} desa</p>
              <ul className="space-y-1">
                {listModal.list.map((item, index) => (
                  <li key={`${item}-${index}`} className="rounded px-2 py-1 text-sm text-gray-700 hover:bg-gray-50">
                    <span className="mr-2 inline-block w-6 text-right text-xs text-gray-400">{index + 1}.</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari desa, nama, atau NIK..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={filterKecamatan}
            onChange={(event) => setFilterKecamatan(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Kecamatan</option>
            {kecamatanList.map((kecamatan) => (
              <option key={kecamatan} value={kecamatan}>{kecamatan}</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Status</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showOnlyDiscrepancy}
              onChange={(event) => setShowOnlyDiscrepancy(event.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Hanya selisih
          </label>

          <button
            onClick={() => setExpandedDesa(new Set(filteredData.map((desa) => desa.desaId)))}
            className="rounded-lg bg-gray-100 px-3 py-2 text-xs transition-colors hover:bg-gray-200"
          >
            Buka Semua
          </button>
          <button
            onClick={() => setExpandedDesa(new Set())}
            className="rounded-lg bg-gray-100 px-3 py-2 text-xs transition-colors hover:bg-gray-200"
          >
            Tutup Semua
          </button>
          <button
            onClick={exportToExcel}
            disabled={filteredData.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <LuDownload className="h-3.5 w-3.5" />
            Export Excel
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
          <span>{filteredSummary.totalDesa} desa</span>
          <span className="text-green-600">{filteredSummary.totalAllThree} lengkap</span>
          <span className="text-teal-600">{filteredSummary.totalDbAdd} DB+ADD</span>
          <span className="text-emerald-600">{filteredSummary.totalDbBpjs} DB+BPJS</span>
          <span className="text-indigo-600">{filteredSummary.totalAddBpjs} ADD+BPJS</span>
          <span className="text-blue-600">{filteredSummary.totalOnlyAdd} hanya ADD</span>
          <span className="text-amber-600">{filteredSummary.totalOnlyBpjs} hanya BPJS</span>
          <span className="text-red-600">{filteredSummary.totalNikMismatch} NIK berbeda</span>
          <span className="text-violet-600">{filteredSummary.totalBpjsTangkilSuspect} BPJS ?</span>
        </div>
      </div>

      <div className="space-y-2">
        {filteredData.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <LuFilter className="mx-auto mb-3 h-12 w-12 opacity-50" />
            <p>Tidak ada data sesuai filter</p>
          </div>
        ) : (
          filteredData.map((desa) => (
            <DesaRow
              key={desa.desaId}
              desa={desa}
              expanded={expandedDesa.has(desa.desaId)}
              onToggle={() => toggleDesa(desa.desaId)}
            />
          ))
        )}
      </div>
    </div>
  );
};

const SummaryCard = ({ icon, label, value, color, subtitle, extraInfo }) => {
  const colorMap = {
    gray: "bg-gray-50 text-gray-600 border-gray-200",
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
    green: "bg-green-50 text-green-600 border-green-200",
    teal: "bg-teal-50 text-teal-600 border-teal-200",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-200",
    red: "bg-red-50 text-red-600 border-red-200",
    violet: "bg-violet-50 text-violet-600 border-violet-200",
  };

  return (
    <div className={`rounded-xl border p-3 ${colorMap[color] || colorMap.gray}`}>
      <div className="mb-1 flex items-center gap-2">
        {icon && <span className="text-lg">{icon}</span>}
        <span className="text-xs font-medium opacity-75">{label}</span>
      </div>
      <p className="text-2xl font-bold">{(value || 0).toLocaleString("id-ID")}</p>
      {subtitle && <p className="mt-0.5 text-xs opacity-60">{subtitle}</p>}
      {extraInfo && (
        <button onClick={extraInfo.onClick} className="mt-1 text-[10px] underline opacity-60 hover:opacity-100">
          {extraInfo.label}
        </button>
      )}
    </div>
  );
};

const DesaRow = ({ desa, expanded, onToggle }) => {
  const hasDiscrepancy = desa.items.some((item) => item.status !== "all_three" || item.nikMismatch || item.bpjsTangkilSuspect);

  return (
    <div className={`overflow-hidden rounded-xl border bg-white shadow-sm ${hasDiscrepancy ? "border-yellow-300" : "border-gray-200"}`}>
      <button onClick={onToggle} className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-gray-50">
        <span className="shrink-0 text-gray-400">
          {expanded ? <LuChevronDown className="h-5 w-5" /> : <LuChevronRight className="h-5 w-5" />}
        </span>
        <div className="min-w-0 w-56 shrink-0">
          <span className="block truncate text-sm font-semibold text-gray-900">{desa.desaNama}</span>
          <span className="block truncate text-xs text-gray-400">{desa.kecamatanNama}</span>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge count={desa.totalDb} label="DB" variant="gray" />
          <Badge count={desa.totalAdd} label="ADD" variant="blue" />
          <Badge count={desa.totalBpjs} label="BPJS" variant="amber" />
        </div>
        <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
          <Badge count={desa.allThree} label="Lengkap" variant="green" />
          <Badge count={desa.onlyAdd} label="Hanya ADD" variant="blue" />
          <Badge count={desa.onlyBpjs} label="Hanya BPJS" variant="amber" />
          <Badge count={desa.nikMismatch} label="NIK beda" variant="red" />
          <Badge count={desa.bpjsTangkilSuspect} label="BPJS ?" variant="violet" />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs uppercase text-gray-500">
                  <th className="w-12 px-4 py-2 text-left font-medium">No</th>
                  <th className="px-4 py-2 text-left font-medium">Database</th>
                  <th className="px-4 py-2 text-left font-medium">ADD</th>
                  <th className="px-4 py-2 text-left font-medium">BPJS</th>
                  <th className="w-32 px-4 py-2 text-left font-medium">RT/RW</th>
                  <th className="w-40 px-4 py-2 text-left font-medium">Status</th>
                  <th className="w-36 px-4 py-2 text-right font-medium">Nilai ADD</th>
                </tr>
              </thead>
              <tbody>
                {desa.items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-gray-400">Tidak ada data RT/RW</td>
                  </tr>
                ) : (
                  desa.items.map((item, index) => (
                    <RtrwItemRow key={`${item.key}-${index}`} item={item} index={index} desaKode={desa.desaKode} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const RtrwItemRow = ({ item, index, desaKode }) => {
  const [expanded, setExpanded] = useState(false);
  const [detailItem, setDetailItem] = useState(item);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const statusConfig = item.nikMismatch ? STATUS_CONFIG.nik_mismatch : STATUS_CONFIG[item.status];
  const bpjsSuspectText = item.bpjsTangkilSuspect
    ? `Kode BPJS asal ${item.bpjsOriginalDesaNama || "Tangkil"} (${item.bpjsOriginalDesaKode || "-"}), disandingkan berdasarkan nama${item.bpjsTangkilAmbiguous ? ` dari ${item.bpjsTangkilCandidateCount} kandidat` : ""}.`
    : "";
  const hasDetails = Boolean(
    item.dbDetailCount ||
    item.addDetailCount ||
    item.bpjsDetailCount ||
    item.dbDetails?.length ||
    item.addDetails?.length ||
    item.bpjsDetails?.length
  );

  const handleToggle = async () => {
    if (!hasDetails) return;
    if (expanded) {
      setExpanded(false);
      return;
    }

    setExpanded(true);
    if (detailItem.detailsLoaded || detailLoading) return;

    try {
      setDetailLoading(true);
      setDetailError(null);
      const response = await api.get("/kelembagaan/rtrw-comparison", {
        params: {
          desaKode,
          itemKey: item.key,
          includeDetails: 1,
        },
      });
      if (response.data?.processing) {
        throw new Error("Data sumber masih disiapkan, coba buka detail lagi sebentar lagi");
      }
      const loadedItem = response.data?.data?.comparison?.[0]?.items?.[0];
      if (!response.data?.success || !loadedItem) {
        throw new Error(response.data?.message || "Detail tidak ditemukan");
      }
      setDetailItem(loadedItem);
    } catch (err) {
      setDetailError(err.response?.data?.message || err.message || "Gagal memuat detail");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <>
      <tr className={`border-t border-gray-50 hover:bg-gray-50 ${hasDetails ? "cursor-pointer" : ""}`} onClick={handleToggle}>
        <td className="px-4 py-2 text-gray-400">
          <div className="flex items-center gap-1">
            {hasDetails && (expanded ? <LuChevronDown className="h-3.5 w-3.5" /> : <LuChevronRight className="h-3.5 w-3.5" />)}
            {index + 1}
          </div>
        </td>
        <SourceCell names={item.dbNama} />
        <SourceCell names={item.addNama} />
        <SourceCell names={item.bpjsNama} nik={item.nik} suspect={item.bpjsTangkilSuspect} suspectText={bpjsSuspectText} />
        <td className="px-4 py-2 text-gray-600">
          <div className="text-xs font-medium text-gray-800">{item.jenis || "-"}</div>
          <div className="text-xs text-gray-500">
            {item.rwNomor ? `RW ${item.rwNomor}` : ""}
            {item.rtNomor ? ` / RT ${item.rtNomor}` : ""}
          </div>
        </td>
        <td className="px-4 py-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.color}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dotColor}`} />
            {statusConfig.label}
          </span>
          {item.bpjsTangkilSuspect && (
            <span
              title={bpjsSuspectText}
              className="ml-1 inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700"
            >
              <LuCircleHelp className="h-3 w-3" />
              BPJS ?
            </span>
          )}
          <p className="mt-1 text-[11px] leading-snug text-gray-400">{item.keterangan}</p>
        </td>
        <td className="px-4 py-2 text-right text-gray-600">
          {item.addNilai ? formatCurrency(item.addNilai) : "-"}
        </td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="bg-slate-50 px-4 py-3">
            {detailLoading ? (
              <div className="py-6 text-center text-xs text-gray-500">Memuat detail sumber data...</div>
            ) : detailError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{detailError}</div>
            ) : (
              <div className="space-y-3">
                {detailItem.bpjsTangkilSuspect && (
                  <div className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-700">
                    <div className="flex items-center gap-1 font-semibold">
                      <LuCircleHelp className="h-4 w-4" />
                      BPJS memakai kode asal {detailItem.bpjsOriginalDesaNama || "Tangkil"} ({detailItem.bpjsOriginalDesaKode || "-"})
                    </div>
                    <p className="mt-1">
                      Disandingkan berdasarkan nama. Kandidat: {(detailItem.bpjsTangkilCandidates || []).map(formatCandidate).join("; ") || "-"}.
                    </p>
                  </div>
                )}
                <div className="grid gap-3 lg:grid-cols-3">
                  <DetailPanel title="Database" icon={<LuDatabase />} emptyText="Tidak ada di database" empty={!detailItem.dbDetails?.length}>
                    <DbDetails details={detailItem.dbDetails} />
                  </DetailPanel>
                  <DetailPanel title="ADD" icon={<LuFileSpreadsheet />} emptyText="Tidak ada di ADD" empty={!detailItem.addDetails?.length}>
                    <AddDetails details={detailItem.addDetails} total={detailItem.addNilai} />
                  </DetailPanel>
                  <DetailPanel title="BPJS" icon={<LuShieldCheck />} emptyText="Tidak ada di BPJS" empty={!detailItem.bpjsDetails?.length}>
                    <BpjsDetails details={detailItem.bpjsDetails} />
                  </DetailPanel>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
};

const SourceCell = ({ names, nik, suspect, suspectText }) => (
  <td className="px-4 py-2">
    {names && names.length > 0 ? (
      <div>
        <span className="inline-flex items-center gap-1 font-medium text-gray-900">
          {names.join(", ")}
          {suspect && (
            <LuCircleHelp title={suspectText} className="h-4 w-4 shrink-0 text-violet-600" />
          )}
        </span>
        {nik?.length > 0 && <p className="mt-0.5 text-[11px] text-gray-400">NIK: {nik.join(", ")}</p>}
      </div>
    ) : (
      <span className="text-xs italic text-gray-400">(tidak ada)</span>
    )}
  </td>
);

const DetailPanel = ({ title, icon, emptyText, empty, children }) => (
  <div className="rounded-lg border border-gray-200 bg-white">
    <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2 text-sm font-semibold text-gray-800">
      {icon}
      {title}
    </div>
    <div className="max-h-72 overflow-y-auto p-3">
      {empty ? <p className="text-xs italic text-gray-400">{emptyText}</p> : children}
    </div>
  </div>
);

const DbDetails = ({ details = [] }) => {
  if (!details.length) return null;
  return (
    <div className="space-y-2 text-xs">
      {details.map((detail) => (
        <div key={detail.id} className="rounded border border-gray-100 p-2">
          <div className="font-semibold text-gray-800">{detail.nama}</div>
          <div className="text-gray-500">{detail.jabatan || "-"} - {detail.jenis || "-"}</div>
          <div className="text-gray-500">{detail.rwNomor ? `RW ${detail.rwNomor}` : ""}{detail.rtNomor ? ` / RT ${detail.rtNomor}` : ""}</div>
          <div className="mt-1 text-gray-500">NIK: {detail.nik || "-"}</div>
          <div className="text-gray-500">Status: {detail.statusJabatan || "-"} / {detail.statusVerifikasi || "-"}</div>
          <div className="text-gray-500">Bank: {detail.namaBank || "-"} {detail.nomorRekening || ""}</div>
        </div>
      ))}
    </div>
  );
};

const AddDetails = ({ details = [], total }) => {
  if (!details.length) return null;
  return (
    <div className="space-y-2 text-xs">
      {details.map((detail, index) => (
        <div key={`${detail.noBukti}-${index}`} className="rounded border border-blue-100 p-2">
          <div className="font-semibold text-gray-800">{detail.keterangan || "-"}</div>
          <div className="text-gray-500">{detail.tglBukti || "-"} - {detail.noBukti || "-"}</div>
          <div className="text-gray-500">Rekening: {detail.nmBank || "-"} {detail.rekBank || ""}</div>
          <div className="mt-1 font-semibold text-blue-700">{formatCurrency(detail.nilai)}</div>
        </div>
      ))}
      <div className="rounded bg-blue-50 px-2 py-1 text-right font-semibold text-blue-700">Total {formatCurrency(total)}</div>
    </div>
  );
};

const BpjsDetails = ({ details = [] }) => {
  if (!details.length) return null;
  return (
    <div className="space-y-2 text-xs">
      {details.map((detail, index) => (
        <div key={`${detail.nik}-${index}`} className="rounded border border-amber-100 p-2">
          <div className="font-semibold text-gray-800">{detail.namaLengkap}</div>
          <div className="text-gray-500">NIK: {detail.nik || "-"}</div>
          <div className="text-gray-500">KPJ: {detail.kpj || "-"} / Kode TK: {detail.kodeTk || "-"}</div>
          {detail.originalIdPegawai && (
            <div className="text-violet-600">ID Pegawai asal: {detail.originalIdPegawai}</div>
          )}
          <div className="text-gray-500">Tgl Lahir: {detail.tglLahir || "-"} / BLTH: {detail.blth || "-"}</div>
          <div className="mt-1 font-semibold text-amber-700">Upah {formatCurrency(detail.upah)}</div>
        </div>
      ))}
    </div>
  );
};

const Badge = ({ count, label, variant }) => {
  const variants = {
    gray: "bg-gray-100 text-gray-600",
    blue: "bg-blue-100 text-blue-600",
    amber: "bg-amber-100 text-amber-700",
    green: "bg-green-100 text-green-600",
    red: "bg-red-100 text-red-600",
    violet: "bg-violet-100 text-violet-700",
  };

  return (
    <span className={`inline-flex w-[5.7rem] items-center justify-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${count === 0 ? "opacity-30" : ""} ${variants[variant]}`}>
      <span className="font-bold">{count || 0}</span>
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
};

export default RtrwComparisonPage;
