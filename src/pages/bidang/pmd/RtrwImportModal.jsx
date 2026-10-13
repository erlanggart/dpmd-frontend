import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  LuCircleAlert,
  LuCircleCheck,
  LuFileSpreadsheet,
  LuUpload,
  LuX,
} from "react-icons/lu";
import api from "../../../api";

const JENIS = [
  {
    id: "bpjs",
    label: "Data BPJS",
    hint: "Master kepesertaan BPJS Ketenagakerjaan",
    expect: "Sheet DATABASE atau data_upah · kolom NIK, ID_PEGAWAI, KPJ, NAMA_LENGKAP, UPAH, BLTH",
  },
  {
    id: "add",
    label: "Data ADD",
    hint: "Penerima insentif dari Siskeudes",
    expect: "Sheet Sheet2 · kolom Kd_Desa, Nm_Desa, Nm_Penerima, Kd_Keg, Sumberdana, Keterangan, Nilai",
  },
];

const MAX_BYTES = 60 * 1024 * 1024;

const formatBytes = (value) => {
  if (!value && value !== 0) return "-";
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(0)} KB`;
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
};

const formatNumber = (value) =>
  typeof value === "number" ? value.toLocaleString("id-ID") : "-";

/**
 * Modal import Excel untuk sumber Persandingan RT/RW.
 *
 * Alur: pilih jenis → pilih file → POST /import (202 + job) → polling
 * /import/status sampai job selesai → tampilkan delta → onImported() agar
 * halaman memuat ulang data dari cache yang baru.
 */
const RtrwImportModal = ({ onClose, onImported }) => {
  const [jenis, setJenis] = useState("bpjs");
  const [file, setFile] = useState(null);
  const [info, setInfo] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [job, setJob] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);
  const importedRef = useRef(false);
  // onImported dibuat ulang tiap render induk; disimpan di ref supaya tidak
  // masuk dependency effect polling dan mereset timer 2 detiknya.
  const onImportedRef = useRef(onImported);
  onImportedRef.current = onImported;

  const activeJenis = JENIS.find((item) => item.id === jenis);
  const currentSource = info?.sources?.find((item) => item.jenis === jenis);
  const running = submitting || job?.status === "running";

  const loadInfo = useCallback(async () => {
    try {
      const response = await api.get("/kelembagaan/rtrw-comparison/import/info");
      if (response.data?.success) {
        setInfo(response.data.data);
        // Job dari sesi lain yang masih berjalan tetap diikuti agar user tidak
        // mengira tidak ada apa-apa lalu mengunggah lagi dan kena 409.
        if (response.data.data.activeJob) setJob(response.data.data.activeJob);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memuat info sumber data");
    }
  }, []);

  useEffect(() => {
    loadInfo();
    return () => {
      if (pollRef.current) window.clearTimeout(pollRef.current);
    };
  }, [loadInfo]);

  // Polling status job. Berhenti sendiri saat job selesai/gagal.
  useEffect(() => {
    if (job?.status !== "running") return undefined;
    let cancelled = false;

    const poll = async () => {
      try {
        const response = await api.get("/kelembagaan/rtrw-comparison/import/status");
        if (cancelled) return;
        const next = response.data?.data?.activeJob || response.data?.data?.lastJob;
        if (next) setJob(next);
        if (next?.status === "running") {
          pollRef.current = window.setTimeout(poll, 2000);
        } else {
          loadInfo();
          if (next?.status === "done" && !importedRef.current) {
            importedRef.current = true;
            onImportedRef.current?.();
          }
        }
      } catch (err) {
        if (cancelled) return;
        setError(err.response?.data?.message || "Gagal memantau proses import");
      }
    };

    pollRef.current = window.setTimeout(poll, 1500);
    return () => {
      cancelled = true;
      if (pollRef.current) window.clearTimeout(pollRef.current);
    };
  }, [job?.status, job?.id, loadInfo]);

  const pickFile = (candidate) => {
    setError(null);
    if (!candidate) return;

    const name = candidate.name.toLowerCase();
    if (!name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      setError("Hanya file Excel (.xlsx / .xls) yang diperbolehkan.");
      return;
    }
    if (candidate.size > MAX_BYTES) {
      setError(`Ukuran file ${formatBytes(candidate.size)} melebihi batas 60 MB.`);
      return;
    }
    setFile(candidate);
  };

  const submit = async () => {
    if (!file || running) return;
    setSubmitting(true);
    setError(null);
    setJob(null);
    importedRef.current = false;

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("jenis", jenis);
      const response = await api.post("/kelembagaan/rtrw-comparison/import", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setJob(response.data?.data?.job || null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      const payload = err.response?.data;
      setError(payload?.message || err.message || "Import gagal");
      if (payload?.data?.activeJob) setJob(payload.data.activeJob);
    } finally {
      setSubmitting(false);
    }
  };

  const result = job?.status === "done" ? job.result?.[job.jenis] : null;
  const beforeMeta = job?.before?.cache?.meta;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-gray-200 px-5 py-4">
          <div>
            <h3 className="font-semibold text-gray-900">Import Excel Sumber Data</h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Ganti master BPJS atau ADD. Cache persandingan otomatis diregenerasi setelah upload.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={running}
            className="rounded-lg p-1 hover:bg-gray-100 disabled:opacity-40"
            title={running ? "Tunggu proses selesai" : "Tutup"}
          >
            <LuX className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              Jenis data
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              {JENIS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setJenis(item.id); setError(null); }}
                  disabled={running}
                  className={`rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-50 ${
                    jenis === item.id
                      ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                      : "border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <span className="block text-sm font-semibold text-gray-900">{item.label}</span>
                  <span className="block text-xs text-gray-500">{item.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {currentSource && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs">
              <p className="mb-1.5 font-semibold text-gray-700">Data aktif saat ini</p>
              <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">File</dt>
                  <dd className="truncate font-medium text-gray-800">{currentSource.excel?.name || "-"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Ukuran</dt>
                  <dd className="font-medium text-gray-800">{formatBytes(currentSource.excel?.size)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Baris</dt>
                  <dd className="font-medium tabular-nums text-gray-800">
                    {formatNumber(currentSource.cache?.meta?.totalRows)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-gray-500">Cache dibuat</dt>
                  <dd className="font-medium text-gray-800">{formatDateTime(currentSource.cache?.generatedAt)}</dd>
                </div>
              </dl>
            </div>
          )}

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-gray-500">
              File Excel
            </label>
            <div
              onDragOver={(event) => { event.preventDefault(); if (!running) setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                if (!running) pickFile(event.dataTransfer.files?.[0]);
              }}
              onClick={() => !running && fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
                running
                  ? "cursor-not-allowed border-gray-200 bg-gray-50"
                  : dragging
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(event) => pickFile(event.target.files?.[0])}
              />
              {file ? (
                <>
                  <LuFileSpreadsheet className="h-7 w-7 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">{file.name}</span>
                  <span className="text-xs text-gray-500">{formatBytes(file.size)}</span>
                </>
              ) : (
                <>
                  <LuUpload className="h-7 w-7 text-gray-400" />
                  <span className="text-sm text-gray-600">
                    Tarik file ke sini atau <span className="font-medium text-blue-600">pilih file</span>
                  </span>
                  <span className="text-xs text-gray-400">.xlsx / .xls · maksimal 60 MB</span>
                </>
              )}
            </div>
            <p className="mt-1.5 text-[11px] leading-relaxed text-gray-400">
              Format diharapkan: {activeJenis?.expect}
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <p className="text-xs leading-relaxed text-red-700">{error}</p>
            </div>
          )}

          {job?.status === "running" && (
            <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5">
              <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
              <div className="text-xs text-blue-800">
                <p className="font-semibold">Meregenerasi cache {job.label}...</p>
                <p className="text-blue-600">
                  {job.jenis === "add"
                    ? "File ADD besar, biasanya ±30 detik. Jangan tutup halaman."
                    : "Biasanya hanya beberapa detik."}
                </p>
              </div>
            </div>
          )}

          {job?.status === "failed" && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <LuCircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <div className="min-w-0 text-xs text-red-700">
                  <p className="font-semibold">Regenerasi cache gagal</p>
                  <p className="mt-1 break-words font-mono text-[11px] leading-relaxed">{job.error}</p>
                  <p className="mt-1.5">
                    File Excel sudah tergantikan. Cadangan tersimpan di <code>data/backups/</code>:{" "}
                    {job.backups?.join(", ") || "-"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {job?.status === "done" && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2.5">
              <div className="flex items-start gap-2">
                <LuCircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                <div className="min-w-0 text-xs text-green-800">
                  <p className="font-semibold">
                    Import {job.label} selesai ({(job.durationMs / 1000).toFixed(1)} detik)
                  </p>
                  {result && (
                    <dl className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
                      <div className="flex justify-between gap-2">
                        <dt>Baris</dt>
                        <dd className="font-semibold tabular-nums">
                          {formatNumber(beforeMeta?.totalRows)} → {formatNumber(result.totalRows)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>Penerima</dt>
                        <dd className="font-semibold tabular-nums">
                          {formatNumber(beforeMeta?.totalPenerima)} → {formatNumber(result.totalPenerima)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt>Desa</dt>
                        <dd className="font-semibold tabular-nums">
                          {formatNumber(beforeMeta?.totalDesa)} → {formatNumber(result.totalDesa)}
                        </dd>
                      </div>
                      {job.after?.periode?.length > 0 && (
                        <div className="flex justify-between gap-2">
                          <dt>Periode</dt>
                          <dd className="font-semibold">{job.after.periode.join(", ")}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                  <p className="mt-2 text-green-700">
                    Arsip: <code>{job.archivedAs}</code> · cadangan lama di <code>data/backups/</code>
                  </p>
                  {job.jenis === "bpjs" && (
                    <p className="mt-1.5 text-amber-700">
                      Catatan: overlay status aktif/non-aktif punya sumber terpisah (folder DESK BPJS)
                      dan tidak ikut terupdate.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-5 py-3">
          <p className="text-[11px] text-gray-400">
            File lama dicadangkan otomatis sebelum digantikan.
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={running}
              className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-40"
            >
              {job?.status === "done" ? "Tutup" : "Batal"}
            </button>
            <button
              onClick={submit}
              disabled={!file || running}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {running ? (
                <>
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Memproses...
                </>
              ) : (
                <>
                  <LuUpload className="h-3.5 w-3.5" />
                  Import &amp; Regenerasi
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RtrwImportModal;
