import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  LuUpload, LuFileSpreadsheet, LuX, LuCircleCheck, LuCircleAlert,
  LuChevronDown, LuChevronRight, LuRefreshCw, LuArrowLeft, LuInfo,
  LuBuilding2, LuUsers, LuTriangleAlert, LuLoader, LuTrash2,
} from "react-icons/lu";
import api from "../../../api";
import toast from "react-hot-toast";

// ─── Constants ──────────────────────────────────────────────────────────────

const LEMBAGA_TYPES = [
  { key: "rws",            label: "RW" },
  { key: "rts",            label: "RT" },
  { key: "posyandus",      label: "Posyandu" },
  { key: "lpms",           label: "LPM" },
  { key: "karang_tarunas", label: "K. Taruna" },
  { key: "pkks",           label: "PKK" },
  { key: "satlinmas",      label: "Linmas" },
  { key: "lembaga-lainnya", label: "Lainnya" },
];

const SHEET_LABELS = {
  "01_RTRW":             "RT/RW",
  "02_POSYANDU":         "Posyandu",
  "03_LPM":              "LPM",
  "04_KARANG_TARUNA":    "Karang Taruna",
  "05_PKK":              "PKK",
  "06_LINMAS":           "Linmas",
  "07_LEMBAGA_LAINNYA":  "Lembaga Lainnya",
};

// ─── Sub-components ─────────────────────────────────────────────────────────

function Badge({ imported }) {
  if (imported) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
        <LuUpload className="h-3 w-3" /> Import
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
      <LuUsers className="h-3 w-3" /> Manual
    </span>
  );
}

function VerifikasiBadge({ status }) {
  const map = {
    verified:   { label: "Terverifikasi",   cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    unverified: { label: "Belum Verifikasi", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    ditolak:    { label: "Ditolak",          cls: "bg-rose-100 text-rose-700 border-rose-200" },
  };
  const s = map[status] || { label: status || "-", cls: "bg-slate-100 text-slate-500 border-slate-200" };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}>
      {s.label}
    </span>
  );
}

function StatCard({ label, value, color = "slate" }) {
  const colorMap = {
    blue:    "bg-blue-50 border-blue-200 text-blue-700",
    green:   "bg-emerald-50 border-emerald-200 text-emerald-700",
    amber:   "bg-amber-50 border-amber-200 text-amber-700",
    red:     "bg-rose-50 border-rose-200 text-rose-700",
    slate:   "bg-slate-50 border-slate-200 text-slate-700",
  };
  return (
    <div className={`flex flex-col items-center p-3 rounded-lg border ${colorMap[color]}`}>
      <span className="text-2xl font-bold">{value}</span>
      <span className="text-xs mt-0.5 text-center">{label}</span>
    </div>
  );
}

// ─── Drop Zone ───────────────────────────────────────────────────────────────

function DropZone({ files, onChange }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  const addFiles = (incoming) => {
    const valid = Array.from(incoming).filter(f =>
      f.name.endsWith(".xlsx") || f.name.endsWith(".xls")
    );
    if (valid.length < incoming.length) toast.error("Beberapa file bukan .xlsx/.xls dan diabaikan");
    if (!valid.length) return;
    onChange(prev => {
      const names = new Set(prev.map(f => f.name));
      return [...prev, ...valid.filter(f => !names.has(f.name))];
    });
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <div
        className={`relative border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer ${
          dragging ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:border-blue-300 hover:bg-gray-50"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <LuFileSpreadsheet className="mx-auto h-12 w-12 text-gray-400 mb-3" />
        <p className="text-sm font-medium text-gray-700">Drag & drop file Excel, atau klik untuk memilih</p>
        <p className="text-xs text-gray-400 mt-1">Format: .xlsx / .xls — bisa pilih banyak file sekaligus (maks. 20 file, 50MB/file)</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="mt-3 space-y-1">
          {files.map((f, i) => (
            <li key={i} className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
              <span className="flex items-center gap-2 min-w-0">
                <LuFileSpreadsheet className="h-4 w-4 text-green-600 shrink-0" />
                <span className="truncate text-gray-700">{f.name}</span>
                <span className="text-gray-400 shrink-0">{(f.size / 1024).toFixed(0)} KB</span>
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); onChange(prev => prev.filter((_, j) => j !== i)); }}
                className="text-gray-400 hover:text-red-500 shrink-0"
              >
                <LuX className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── Import Report ────────────────────────────────────────────────────────────

function ImportReport({ results }) {
  const [expanded, setExpanded] = useState(() => results.map((_, i) => i === 0));

  const toggle = (i) => setExpanded(prev => { const n = [...prev]; n[i] = !n[i]; return n; });

  return (
    <div className="space-y-3">
      {results.map((r, i) => {
        const total = r.stats.inserted + r.stats.updated + r.stats.skip_manual + r.stats.skip_invalid + r.stats.errors;
        const success = r.stats.inserted + r.stats.updated;
        const hasErrors = r.errors.length > 0;

        return (
          <div key={i} className={`border rounded-xl overflow-hidden ${hasErrors ? "border-amber-200" : "border-emerald-200"}`}>
            <button
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
              onClick={() => toggle(i)}
            >
              <div className="flex items-center gap-3 min-w-0">
                {hasErrors
                  ? <LuCircleAlert className="h-5 w-5 text-amber-500 shrink-0" />
                  : <LuCircleCheck className="h-5 w-5 text-emerald-500 shrink-0" />}
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{r.filename}</p>
                  <p className="text-xs text-gray-500">
                    {total} baris diproses · {success} berhasil · {r.errors.length} error
                  </p>
                </div>
              </div>
              {expanded[i] ? <LuChevronDown className="h-4 w-4 text-gray-400 shrink-0" /> : <LuChevronRight className="h-4 w-4 text-gray-400 shrink-0" />}
            </button>

            {expanded[i] && (
              <div className="border-t border-gray-100 px-5 py-4 space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard label="Baru Diinsert" value={r.stats.inserted} color="green" />
                  <StatCard label="Diperbarui" value={r.stats.updated} color="blue" />
                  <StatCard label="Dilewati (Manual)" value={r.stats.skip_manual} color="amber" />
                  <StatCard label="Error / Tidak Valid" value={r.stats.errors + r.stats.skip_invalid + r.stats.desa_missing} color="red" />
                </div>

                {/* Per-sheet breakdown */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Per Sheet</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Object.entries(r.per_sheet).map(([sheet, counts]) => (
                      <div key={sheet} className="bg-gray-50 rounded-lg p-3 border border-gray-200 text-xs">
                        <p className="font-semibold text-gray-700 mb-1">{SHEET_LABELS[sheet] || sheet}</p>
                        <p className="text-emerald-600">+{counts.inserted} baru</p>
                        <p className="text-blue-600">↑{counts.updated} update</p>
                        <p className="text-gray-400">{counts.skip} skip</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Error list */}
                {r.errors.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Detail Error ({r.errors.length})
                    </p>
                    <div className="rounded-lg border border-red-200 overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-red-50 text-red-700">
                            <th className="text-left px-3 py-2 font-semibold">Sheet</th>
                            <th className="text-left px-3 py-2 font-semibold">Baris</th>
                            <th className="text-left px-3 py-2 font-semibold">Nama</th>
                            <th className="text-left px-3 py-2 font-semibold">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-100">
                          {r.errors.map((err, j) => (
                            <tr key={j} className="bg-white">
                              <td className="px-3 py-2 font-medium">{SHEET_LABELS[err.sheet] || err.sheet}</td>
                              <td className="px-3 py-2">{err.row}</td>
                              <td className="px-3 py-2">{err.nama || "-"}</td>
                              <td className="px-3 py-2 text-red-600">{err.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Kecamatan Stats Table ────────────────────────────────────────────────────

function KecamatanStats({ stats, onDesaClick }) {
  const [expanded, setExpanded] = useState({});
  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  if (!stats || stats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-400">
        <LuBuilding2 className="h-12 w-12 mb-3 text-gray-300" />
        <p className="text-sm">Belum ada data pengurus di database.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 font-semibold text-gray-600 min-w-[200px]">Kecamatan / Desa</th>
            <th className="text-center px-3 py-3 font-semibold text-gray-600">Total</th>
            {LEMBAGA_TYPES.map(t => (
              <th key={t.key} className="text-center px-2 py-3 font-semibold text-gray-600 text-xs">{t.label}</th>
            ))}
            <th className="text-center px-3 py-3 font-semibold text-blue-600 text-xs">Import</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {stats.map(kec => {
            const kecTotal = kec.desas.reduce((s, d) => s + d.total, 0);
            const kecImported = kec.desas.reduce((s, d) => s + d.imported_total, 0);
            const kecCounts = {};
            LEMBAGA_TYPES.forEach(t => {
              kecCounts[t.key] = kec.desas.reduce((s, d) => s + (d.counts[t.key] || 0), 0);
            });

            return (
              <React.Fragment key={kec.id}>
                {/* Kecamatan row */}
                <tr
                  className="bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors"
                  onClick={() => toggle(kec.id)}
                >
                  <td className="px-4 py-2.5 font-semibold text-blue-800 flex items-center gap-2">
                    {expanded[kec.id]
                      ? <LuChevronDown className="h-4 w-4 shrink-0" />
                      : <LuChevronRight className="h-4 w-4 shrink-0" />}
                    {kec.nama}
                    <span className="text-xs font-normal text-blue-600">({kec.desas.length} desa)</span>
                  </td>
                  <td className="text-center px-3 py-2.5 font-bold text-blue-800">{kecTotal}</td>
                  {LEMBAGA_TYPES.map(t => (
                    <td key={t.key} className="text-center px-2 py-2.5 text-blue-700">
                      {kecCounts[t.key] || "-"}
                    </td>
                  ))}
                  <td className="text-center px-3 py-2.5 text-blue-700 font-medium">{kecImported}</td>
                </tr>

                {/* Desa rows */}
                {expanded[kec.id] && kec.desas.map(desa => (
                  <tr
                    key={desa.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onDesaClick(desa, kec.nama)}
                  >
                    <td className="px-4 py-2 pl-12 text-gray-700 hover:text-blue-700 hover:underline">
                      {desa.nama}
                    </td>
                    <td className="text-center px-3 py-2 font-medium text-gray-800">{desa.total}</td>
                    {LEMBAGA_TYPES.map(t => (
                      <td key={t.key} className="text-center px-2 py-2 text-gray-600">
                        {desa.counts[t.key] || "-"}
                      </td>
                    ))}
                    <td className="text-center px-3 py-2 text-blue-600 font-medium">{desa.imported_total || "-"}</td>
                  </tr>
                ))}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Desa Pengurus Modal ──────────────────────────────────────────────────────

const TYPE_ORDER = ["rws", "rts", "posyandus", "lpms", "karang_tarunas", "pkks", "satlinmas", "lembaga-lainnya"];
const TYPE_LABEL_MAP = {
  rws: "RW", rts: "RT", posyandus: "Posyandu", lpms: "LPM",
  karang_tarunas: "Karang Taruna", pkks: "PKK", satlinmas: "Linmas", "lembaga-lainnya": "Lembaga Lainnya",
};

function PengurusTable({ rows }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400">
        <LuUsers className="h-8 w-8 mb-2 text-gray-300" />
        <p className="text-sm">Tidak ada data pengurus.</p>
      </div>
    );
  }
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
          <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Nama</th>
          <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Jabatan</th>
          <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Lembaga</th>
          <th className="text-center px-3 py-2.5 font-semibold text-gray-600">Sumber</th>
          <th className="text-center px-3 py-2.5 font-semibold text-gray-600">Verifikasi</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-100">
        {rows.map(p => (
          <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${p.imported ? "bg-blue-50/30" : ""}`}>
            <td className="px-4 py-2.5">
              <p className="font-medium text-gray-900">{p.nama_lengkap}</p>
              {p.nik && <p className="text-xs text-gray-400">{p.nik}</p>}
            </td>
            <td className="px-4 py-2.5 text-gray-700">{p.jabatan}</td>
            <td className="px-4 py-2.5 text-gray-600 text-xs font-medium">
              {p.lembaga_nama || TYPE_LABEL_MAP[p.pengurusable_type] || p.pengurusable_type}
            </td>
            <td className="px-3 py-2.5 text-center"><Badge imported={p.imported} /></td>
            <td className="px-3 py-2.5 text-center"><VerifikasiBadge status={p.status_verifikasi} /></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DesaModal({ desa, kecamatanNama, pengurus, loading, onDelete, deleting, isSuperadmin, onClose }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [activeTab, setActiveTab] = useState(null);

  // Group pengurus by type, in fixed order
  const grouped = TYPE_ORDER.reduce((acc, type) => {
    const rows = pengurus.filter(p => p.pengurusable_type === type);
    if (rows.length > 0) acc[type] = rows;
    return acc;
  }, {});
  const tabs = Object.keys(grouped);

  // Set default active tab when data loads
  React.useEffect(() => {
    if (tabs.length > 0 && (activeTab === null || !tabs.includes(activeTab))) {
      setActiveTab(tabs[0]);
    }
  }, [tabs.join(",")]); // eslint-disable-line

  const importedCount = pengurus.filter(p => p.imported).length;
  const activeRows = activeTab ? (grouped[activeTab] || []) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[88vh] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{desa.nama}</h2>
            <p className="text-sm text-gray-500">Kecamatan {kecamatanNama} · {loading ? "..." : pengurus.length} pengurus aktif</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {/* Delete button — superadmin only */}
            {isSuperadmin && importedCount > 0 && !confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={loading || deleting}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <LuTrash2 className="h-3.5 w-3.5" />
                Hapus Import ({importedCount})
              </button>
            )}
            {isSuperadmin && confirmDelete && (
              <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-1.5">
                <span className="text-xs text-rose-700 font-medium">Hapus {importedCount} data?</span>
                <button
                  onClick={() => { onDelete(); setConfirmDelete(false); }}
                  disabled={deleting}
                  className="px-2 py-1 text-xs font-bold bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-50 flex items-center gap-1"
                >
                  {deleting ? <LuLoader className="h-3 w-3 animate-spin" /> : <LuTrash2 className="h-3 w-3" />}
                  Ya, Hapus
                </button>
                <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900 rounded">
                  Batal
                </button>
              </div>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <LuX className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 px-6 py-2.5 bg-gray-50 border-b border-gray-200 text-xs text-gray-500">
          <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-blue-400"></span>Import Excel</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400"></span>Input manual</span>
        </div>

        {loading || deleting ? (
          <div className="flex flex-col items-center justify-center py-20">
            <LuLoader className="h-8 w-8 text-blue-500 animate-spin" />
            {deleting && <p className="text-sm text-gray-500 mt-3">Menghapus data import...</p>}
          </div>
        ) : pengurus.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <LuUsers className="h-10 w-10 mb-2 text-gray-300" />
            <p className="text-sm">Tidak ada data pengurus aktif.</p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-1 px-4 pt-3 pb-0 border-b border-gray-200 overflow-x-auto">
              {tabs.map(type => {
                const isActive = activeTab === type;
                const count = grouped[type].length;
                const importedInTab = grouped[type].filter(p => p.imported).length;
                return (
                  <button
                    key={type}
                    onClick={() => setActiveTab(type)}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-lg border-b-2 whitespace-nowrap transition-colors ${
                      isActive
                        ? "border-blue-500 text-blue-700 bg-blue-50"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    {TYPE_LABEL_MAP[type] || type}
                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${isActive ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                      {count}
                    </span>
                    {importedInTab > 0 && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block"></span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab content — fixed height, scrollable */}
            <div className="overflow-y-auto flex-1 min-h-0">
              <PengurusTable rows={activeRows} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PengurusImportPage() {
  const navigate = useNavigate();

  const isSuperadmin = (() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}").role === "superadmin"; }
    catch { return false; }
  })();

  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [importResults, setImportResults] = useState(null);

  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [selectedDesa, setSelectedDesa] = useState(null);
  const [selectedKecNama, setSelectedKecNama] = useState("");
  const [desaPengurus, setDesaPengurus] = useState([]);
  const [loadingDesa, setLoadingDesa] = useState(false);
  const [deletingDesa, setDeletingDesa] = useState(false);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const res = await api.get("/kelembagaan/pengurus/import/stats");
      setStats(res.data.data || []);
    } catch {
      toast.error("Gagal memuat statistik pengurus");
      setStats([]);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleImport = async () => {
    if (!files.length) { toast.error("Pilih minimal satu file Excel"); return; }
    setUploading(true);
    setImportResults(null);
    try {
      const fd = new FormData();
      files.forEach(f => fd.append("files", f));
      const res = await api.post("/kelembagaan/pengurus/import", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 300000,
      });
      setImportResults(res.data.data || []);
      setFiles([]);
      toast.success("Import selesai!");
      fetchStats();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Gagal import";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const openDesaModal = async (desa, kecNama) => {
    setSelectedDesa(desa);
    setSelectedKecNama(kecNama);
    setDesaPengurus([]);
    setLoadingDesa(true);
    try {
      const res = await api.get(`/kelembagaan/pengurus/import/desa/${desa.id}`);
      setDesaPengurus(res.data.data || []);
    } catch {
      toast.error("Gagal memuat pengurus desa");
    } finally {
      setLoadingDesa(false);
    }
  };

  const closeModal = () => { setSelectedDesa(null); setDesaPengurus([]); setDeletingDesa(false); };

  const handleDeleteImported = async () => {
    if (!selectedDesa) return;
    setDeletingDesa(true);
    try {
      const res = await api.delete(`/kelembagaan/pengurus/import/desa/${selectedDesa.id}`);
      toast.success(res.data.message || "Data import berhasil dihapus");
      // Reload pengurus list in modal
      const listRes = await api.get(`/kelembagaan/pengurus/import/desa/${selectedDesa.id}`);
      setDesaPengurus(listRes.data.data || []);
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal menghapus data import");
    } finally {
      setDeletingDesa(false);
    }
  };

  const totalStats = stats
    ? { desas: stats.reduce((s, k) => s + k.desas.length, 0), pengurus: stats.reduce((s, k) => s + k.desas.reduce((ss, d) => ss + d.total, 0), 0), imported: stats.reduce((s, k) => s + k.desas.reduce((ss, d) => ss + d.imported_total, 0), 0) }
    : null;

  return (
    <div className="space-y-6 pb-12 p-6 lg:p-8">
      {/* Header */}
      <header className="flex items-center justify-between bg-white rounded-xl border border-gray-200 shadow-sm p-5 gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
          >
            <LuArrowLeft className="h-5 w-5" />
          </button>
          <div className="h-11 w-11 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-md">
            <LuFileSpreadsheet className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Import Pengurus Kelembagaan</h1>
            <p className="text-sm text-gray-500">Upload file output template BNBA untuk memasukkan data pengurus ke database</p>
          </div>
        </div>
        <button
          onClick={fetchStats}
          disabled={statsLoading}
          className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
        >
          <LuRefreshCw className={`h-4 w-4 ${statsLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </header>

      {/* Info banner */}
      <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-800">
        <LuInfo className="h-5 w-5 shrink-0 mt-0.5 text-blue-500" />
        <div>
          <p className="font-semibold">Cara penggunaan</p>
          <ul className="mt-1 space-y-0.5 text-blue-700 list-disc list-inside">
            <li>Upload satu atau beberapa file <b>output_template_*.xlsx</b> hasil build dari BNBA.</li>
            <li>Data baru akan diinsert dengan flag <b>imported = true</b>.</li>
            <li>Data yang sudah ada dan ber-flag imported akan diperbarui.</li>
            <li>Data yang diinput manual (imported = false) <b>tidak</b> akan ditimpa.</li>
          </ul>
        </div>
      </div>

      {/* Upload zone */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Upload File Excel</h2>
        <DropZone files={files} onChange={setFiles} />
        <div className="flex justify-end">
          <button
            onClick={handleImport}
            disabled={uploading || files.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading
              ? <><LuLoader className="h-4 w-4 animate-spin" /> Mengimport...</>
              : <><LuUpload className="h-4 w-4" /> Import ke Database</>}
          </button>
        </div>
      </div>

      {/* Import results */}
      {importResults && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <LuCircleCheck className="h-5 w-5 text-emerald-500" />
              Hasil Import
            </h2>
            <button onClick={() => setImportResults(null)} className="text-xs text-gray-400 hover:text-gray-600">Tutup</button>
          </div>
          <ImportReport results={importResults} />
        </div>
      )}

      {/* Stats section */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="font-semibold text-gray-900">Rekap Pengurus per Kecamatan</h2>
            <p className="text-xs text-gray-500 mt-0.5">Klik nama desa untuk melihat daftar pengurus</p>
          </div>
          {totalStats && (
            <div className="hidden sm:flex items-center gap-4 text-sm text-gray-600">
              <span><b className="text-gray-900">{totalStats.desas}</b> desa</span>
              <span><b className="text-gray-900">{totalStats.pengurus.toLocaleString()}</b> pengurus</span>
              <span className="text-blue-600"><b>{totalStats.imported.toLocaleString()}</b> imported</span>
            </div>
          )}
        </div>

        {statsLoading ? (
          <div className="flex items-center justify-center py-16">
            <LuLoader className="h-8 w-8 text-blue-500 animate-spin" />
          </div>
        ) : (
          <KecamatanStats stats={stats} onDesaClick={openDesaModal} />
        )}
      </div>

      {/* Desa modal */}
      {selectedDesa && (
        <DesaModal
          desa={selectedDesa}
          kecamatanNama={selectedKecNama}
          pengurus={desaPengurus}
          loading={loadingDesa}
          onDelete={handleDeleteImported}
          deleting={deletingDesa}
          isSuperadmin={isSuperadmin}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
