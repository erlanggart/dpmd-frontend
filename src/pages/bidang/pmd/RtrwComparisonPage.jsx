import React, { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
  nik_invalid: {
    label: "NIK Invalid",
    color: "bg-rose-100 text-rose-800",
    dotColor: "bg-rose-500",
  },
};

// Status kepesertaan BPJS (overlay dari DESK BPJS JULI 2026)
const MEMBERSHIP_CONFIG = {
  aktif: { label: "Aktif", color: "bg-green-100 text-green-800", dotColor: "bg-green-500" },
  non_aktif: { label: "Non-Aktif", color: "bg-red-100 text-red-800", dotColor: "bg-red-500" },
  mixed: { label: "Campuran", color: "bg-orange-100 text-orange-800", dotColor: "bg-orange-500" },
  unmarked: { label: "Belum ditandai", color: "bg-gray-100 text-gray-500", dotColor: "bg-gray-300" },
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(Number(value || 0));
};

const formatCandidate = (candidate) => {
  if (!candidate) return "";
  const source = candidate.sources?.length ? ` (${candidate.sources.join("+")})` : "";
  return `${candidate.desaNama || candidate.desaKode}${candidate.kecamatanNama ? ` - ${candidate.kecamatanNama}` : ""}${source}`;
};

const joinValues = (values) => {
  const filtered = (values || []).map((v) => (v ?? "").toString().trim()).filter(Boolean);
  return filtered.length > 0 ? [...new Set(filtered)].join("; ") : "";
};

const sumValues = (values) => (values || []).reduce((sum, v) => sum + Number(v || 0), 0);

// Pisahkan daftar wilayah kosong menjadi desa vs kelurahan (dari status_pemerintahan)
const splitEmpty = (list = []) => ({
  desa: list.filter((e) => e.jenis !== "kelurahan"),
  kelurahan: list.filter((e) => e.jenis === "kelurahan"),
});

const emptyLabel = (list = []) => {
  const { desa, kelurahan } = splitEmpty(list);
  const parts = [];
  if (desa.length) parts.push(`${desa.length} desa`);
  if (kelurahan.length) parts.push(`${kelurahan.length} kelurahan`);
  return `${parts.join(" · ") || "0"} kosong`;
};

// Angka dengan animasi hitung-naik (easeOutCubic). Melanjutkan dari nilai
// yang sedang tampil bila target berubah, jadi mulus saat pindah tab.
const CountUp = ({ value = 0, duration = 800, className }) => {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = Number(value) || 0;
    if (from === to) return;
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = Math.round(from + (to - from) * eased);
      fromRef.current = current;
      setDisplay(current);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = to;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <span className={className}>{display.toLocaleString("id-ID")}</span>;
};

const TANGKIL_KODE = "32.01.03.2011";

// Bangun klasifikasi (7 golongan) langsung dari data.comparison — semua field
// yang dibutuhkan sudah tersedia di respons dasar tanpa perlu memuat detail.
const buildClassification = (data) => {
  const dbBpjs = [];
  const nikBerbeda = [];
  const desaBerbeda = [];
  const nikInvalid = [];
  const bpjsNoDb = [];
  const dbNoBpjs = [];
  const bpjsCocokAdd = [];

  const comparison = [...(data?.comparison || [])].sort((a, b) => a.desaKode.localeCompare(b.desaKode));

  comparison.forEach((desa) => {
    (desa.items || []).forEach((item) => {
      const base = {
        key: `${desa.desaKode}::${item.key}`,
        desaKode: desa.desaKode,
        desaNama: desa.desaNama,
        kecamatanNama: desa.kecamatanNama,
        jenis: item.jenis || "",
        rw: item.rwNomor || "",
        rt: item.rtNomor || "",
        namaDb: (item.dbNama || []).join(", "),
        namaAdd: (item.addNama || []).join(", "),
        namaBpjs: (item.bpjsNama || []).join(", "),
        nik: (item.nik || []).join(", "),
        nikDb: (item.dbNik || []).join(", "),
        nikBpjs: (item.bpjsNik || []).join(", "),
        nikCocok: item.nikMatch,
        nikBerbeda: item.nikMismatch,
        tglBeda: item.tglLahirMismatch,
        desaBedaTangkil: item.bpjsTangkilDbConfirmed,
        kodeDesaBpjsAsal: item.bpjsTangkilDbConfirmed
          ? (item.bpjsOriginalDesaKode || TANGKIL_KODE)
          : (item.bpjsOriginalDesaKode || ""),
        adaAdd: item.inAdd,
        nilaiAdd: item.addNilai || 0,
        upahBpjs: item.bpjsUpah || 0,
        fuzzy: item.isFuzzy,
        status: item.status,
        keterangan: item.keterangan || "",
        sumber: "",
        kandidatDesa: "",
        // Crosscheck Data Status BPJS (DESK BPJS JULI 2026)
        bpjsMembership: item.bpjsMembership || null,
        bpjsNonAktifSebab: item.bpjsNonAktifSebab || "",
        inBaru: Boolean(item.inBaru),
        baruJabatan: item.baruJabatan || "",
        // Desa Berbeda (Tangkil / NIK lintas-desa) & klasifikasi NIK Invalid.
        desaBerbedaSumber: item.bpjsDesaBerbedaSumber || "",
        desaBerbedaLabel: item.bpjsDesaBerbedaSumber === "nik_lintas_desa" ? "NIK Lintas-Desa"
          : item.bpjsDesaBerbedaSumber === "tangkil" ? "Tangkil" : "",
        nikInvalidSebab: item.bpjsNikInvalidSebab || "",
        nikInvalidLabel: ({ nama_berbeda: "Nama Berbeda", tgl_lahir_beda: "Tgl Lahir Berbeda", banyak_desa: "Banyak Desa" })[item.bpjsNikInvalidSebab] || "",
        kandidatNik: (item.bpjsNikInvalidKandidat || [])
          .map((c) => `${c.nama || ""} — ${c.desaNama || c.desaKode}${c.kecamatanNama ? ` (${c.kecamatanNama})` : ""}`)
          .join("; "),
      };

      if (item.inDb && item.inBpjs) {
        dbBpjs.push(base);
        if (item.nikMismatch) nikBerbeda.push(base);
        if (item.bpjsDesaBerbeda) desaBerbeda.push(base);
      }

      if (item.inBpjs && !item.inDb) {
        if (item.bpjsNikInvalid) nikInvalid.push(base);
        if (item.inAdd) bpjsCocokAdd.push(base);
        else bpjsNoDb.push({ ...base, sumber: "BPJS (tanpa DB & ADD)" });
      }

      if (item.inDb && !item.inBpjs) {
        dbNoBpjs.push(base);
      }
    });
  });

  (data?.tangkilUnresolved || []).forEach((item) => {
    bpjsNoDb.push({
      key: `tangkil::${item.nik || item.nama}`,
      desaKode: TANGKIL_KODE,
      desaNama: "Tangkil (asal BPJS)",
      kecamatanNama: "Citeureup",
      jenis: "",
      rw: "",
      rt: "",
      namaDb: "",
      namaAdd: "",
      namaBpjs: item.nama || "",
      nik: item.nik || "",
      nikDb: "",
      nikBpjs: item.nik || "",
      nikCocok: false,
      nikBerbeda: false,
      tglBeda: false,
      desaBedaTangkil: false,
      kodeDesaBpjsAsal: TANGKIL_KODE,
      adaAdd: false,
      nilaiAdd: 0,
      upahBpjs: item.upah || 0,
      fuzzy: false,
      status: "only_bpjs",
      keterangan: "",
      sumber: "BPJS Tangkil (tak terkonfirmasi walau fuzzy)",
      kandidatDesa: (item.bpjsCandidates || [])
        .map((c) => `${c.desaNama || c.desaKode}${c.kecamatanNama ? ` (${c.kecamatanNama})` : ""}`)
        .join("; "),
    });
  });

  const bySortKey = (a, b) =>
    a.desaKode.localeCompare(b.desaKode)
    || String(a.jenis).localeCompare(String(b.jenis))
    || String(a.rw).localeCompare(String(b.rw))
    || String(a.rt).localeCompare(String(b.rt))
    || String(a.namaDb || a.namaBpjs).localeCompare(String(b.namaDb || b.namaBpjs));

  [dbBpjs, nikBerbeda, desaBerbeda, nikInvalid, bpjsNoDb, dbNoBpjs, bpjsCocokAdd].forEach((arr) => arr.sort(bySortKey));

  // Pecah "DB tidak ada di BPJS" berdasarkan ada/tidaknya referensi ADD.
  const dbNoBpjsAdd = dbNoBpjs.filter((row) => row.adaAdd);
  const dbNoBpjsNoAdd = dbNoBpjs.filter((row) => !row.adaAdd);

  // Crosscheck keanggotaan (Cek Aktif / Non-Aktif) pada dua kelompok Data BPJS.
  const isAktif = (row) => row.bpjsMembership === "aktif";
  const isNonAktif = (row) => row.bpjsMembership === "non_aktif" || row.bpjsMembership === "mixed";
  const bpjsNoDbAll = [...bpjsNoDb, ...bpjsCocokAdd].sort(bySortKey); // semua BPJS tanpa DB (± ADD)

  const dbBpjsAktif = dbBpjs.filter(isAktif);
  const dbBpjsNonAktif = dbBpjs.filter(isNonAktif);
  const bpjsNoDbAktif = bpjsNoDbAll.filter(isAktif);
  const bpjsNoDbNonAktif = bpjsNoDbAll.filter(isNonAktif);

  // "Data Baru": pengurus di sheet BARU yang BELUM ada di BPJS master (anomaliBpjs=false).
  // Dipisah 2: yang cocok Database (disandingkan dgn record DB) & yang tidak. Sumber: baruList.
  const baruMapped = [...(data?.baruList || [])]
    .filter((b) => !b.anomaliBpjs)
    .map((b, index) => ({
      key: `baru::${b.desaKode}::${b.nik || b.nama}::${index}`,
      desaKode: b.desaKode,
      desaNama: b.desaNama || b.desaKode,
      kecamatanNama: b.kecamatanNama || "",
      jenis: b.jenis || "",
      rw: b.rwNomor || "",
      rt: b.rtNomor || "",
      nama: b.nama || "",
      nik: b.nik || "",
      jabatan: b.jabatan || "",
      tglLahir: b.tglLahir || "",
      pendidikan: b.pendidikan || "",
      alamat: b.alamat || "",
      matchedDb: Boolean(b.matchedDb),
      matchType: b.matchType || "",
      // Sandingan record Database (bila cocok)
      dbNama: b.db?.nama || "",
      dbNik: b.db?.nik || "",
      dbJenis: b.db?.jenis || "",
      dbRw: b.db?.rwNomor || "",
      dbRt: b.db?.rtNomor || "",
      dbJabatan: b.db?.jabatan || "",
      dbTglLahir: b.db?.tglLahir || "",
      dbAlamat: b.db?.alamat || "",
      dbPendidikan: b.db?.pendidikan || "",
    }));
  const byBaruSort = (a, b) => a.desaKode.localeCompare(b.desaKode) || String(a.nama).localeCompare(String(b.nama));
  const dbNoBpjsBaruAda = baruMapped.filter((r) => r.matchedDb).sort(byBaruSort);
  const dbNoBpjsBaruTidak = baruMapped.filter((r) => !r.matchedDb).sort(byBaruSort);

  return {
    dbBpjs, nikBerbeda, desaBerbeda, nikInvalid, bpjsNoDb, dbNoBpjs, dbNoBpjsAdd, dbNoBpjsNoAdd, bpjsCocokAdd,
    dbBpjsAktif, dbBpjsNonAktif,
    bpjsNoDbAktif, bpjsNoDbNonAktif,
    dbNoBpjsBaruAda, dbNoBpjsBaruTidak,
  };
};

const COL_DESA = { key: "desa", label: "Desa", type: "desa" };
const COL_LOKASI = { key: "lokasi", label: "RT/RW", type: "lokasi" };

const DB_NO_BPJS_COLUMNS = [
  COL_DESA, COL_LOKASI,
  { key: "namaDb", label: "Nama DB" },
  { key: "nik", label: "NIK" },
  { key: "adaAdd", label: "Ada ADD", type: "bool" },
  { key: "nilaiAdd", label: "Nilai ADD", type: "currency", align: "right" },
  { key: "status", label: "Status" },
];

// Definisi 7 tab. Tab pertama tetap tampilan perbandingan lama.
const TAB_DEFS = [
  { id: "comparison", label: "Perbandingan RT/RW" },
  {
    id: "db_bpjs",
    label: "DB + BPJS",
    bucket: "dbBpjs",
    title: "Data Cocok Database & BPJS",
    description: "Seluruh data yang cocok antara Database dan BPJS (termasuk yang juga ada di ADD).",
    columns: [
      COL_DESA, COL_LOKASI,
      { key: "namaDb", label: "Nama DB" },
      { key: "namaBpjs", label: "Nama BPJS" },
      { key: "nik", label: "NIK" },
      { key: "nikCocok", label: "NIK Cocok", type: "bool" },
      { key: "tglBeda", label: "Tgl Lahir Beda", type: "bool" },
      { key: "desaBedaTangkil", label: "Desa Beda", type: "bool" },
      { key: "bpjsMembership", label: "Status BPJS", type: "membership" },
      { key: "adaAdd", label: "Ada ADD", type: "bool" },
      { key: "nilaiAdd", label: "Nilai ADD", type: "currency", align: "right" },
      { key: "upahBpjs", label: "Upah BPJS", type: "currency", align: "right" },
    ],
  },
  {
    id: "nik_berbeda",
    label: "DB + BPJS NIK Berbeda",
    bucket: "nikBerbeda",
    title: "Cocok Database & BPJS — NIK Berbeda",
    description: "Data cocok DB & BPJS namun NIK berbeda (sudah disamakan aplikasi via fuzzy match). Angka NIK yang berbeda ditandai merah.",
    columns: [
      COL_DESA, COL_LOKASI,
      { key: "namaDb", label: "Nama & NIK DB", type: "nameNik", nameKey: "namaDb", nikKey: "nikDb", otherNikKey: "nikBpjs" },
      { key: "namaBpjs", label: "Nama & NIK BPJS", type: "nameNik", nameKey: "namaBpjs", nikKey: "nikBpjs", otherNikKey: "nikDb" },
      { key: "keterangan", label: "Keterangan" },
    ],
  },
  {
    id: "desa_berbeda",
    label: "DB + BPJS Desa Berbeda",
    bucket: "desaBerbeda",
    title: "Cocok Database & BPJS — Lokasi Desa Berbeda",
    description: "Cocok via NIK database namun kode desa asal BPJS berbeda: anomali Tangkil ATAU NIK yang terdaftar di desa lain (kini di-reassign ke desa database). Angka NIK yang berbeda ditandai merah.",
    columns: [
      COL_DESA, COL_LOKASI,
      { key: "namaDb", label: "Nama DB" },
      { key: "namaBpjs", label: "Nama BPJS" },
      { key: "nikDb", label: "NIK Database", type: "nikDiff", nikKey: "nikDb", otherNikKey: "nikBpjs" },
      { key: "nikBpjs", label: "NIK BPJS", type: "nikDiff", nikKey: "nikBpjs", otherNikKey: "nikDb" },
      { key: "kodeDesaBpjsAsal", label: "Kode Desa BPJS Asal" },
      { key: "desaBerbedaLabel", label: "Sumber Anomali" },
      { key: "keterangan", label: "Keterangan" },
    ],
  },
  {
    id: "bpjs_nik_invalid",
    label: "NIK Invalid",
    bucket: "nikInvalid",
    title: "BPJS Tanpa Database — NIK Invalid",
    description: "Peserta BPJS tanpa padanan DB di desanya; NIK-nya ditemukan di database desa lain namun tak dapat dikonfirmasi (nama berbeda, tanggal lahir berbeda, atau tersebar di >1 desa). Perlu verifikasi manual.",
    columns: [
      COL_DESA, COL_LOKASI,
      { key: "namaBpjs", label: "Nama BPJS" },
      { key: "nik", label: "NIK" },
      { key: "nikInvalidLabel", label: "Sebab" },
      { key: "kandidatNik", label: "Kandidat di Database (desa lain)" },
    ],
  },
  {
    id: "bpjs_no_db",
    label: "BPJS Tidak Ada di DB",
    bucket: "bpjsNoDb",
    title: "BPJS Tidak Ada di Database",
    description: "BPJS tanpa padanan di Database (termasuk pool Tangkil yang tak terkonfirmasi walau fuzzy).",
    columns: [
      COL_DESA, COL_LOKASI,
      { key: "namaBpjs", label: "Nama BPJS" },
      { key: "nik", label: "NIK" },
      { key: "upahBpjs", label: "Upah BPJS", type: "currency", align: "right" },
      { key: "sumber", label: "Sumber" },
      { key: "kandidatDesa", label: "Kandidat Desa" },
    ],
  },
  {
    id: "db_no_bpjs",
    label: "DB Tidak Ada di BPJS",
    bucket: "dbNoBpjs",
    title: "Database Tidak Ada di BPJS",
    description: "Data Database (pengurus RT/RW) yang tidak memiliki padanan di BPJS.",
    columns: DB_NO_BPJS_COLUMNS,
  },
  {
    id: "db_no_bpjs_no_add",
    label: "DB Tanpa Referensi ADD",
    bucket: "dbNoBpjsNoAdd",
    title: "Database Tidak Ada di BPJS — Tanpa Referensi ADD",
    description: "Pengurus RT/RW di Database yang tidak ada di BPJS dan tidak memiliki referensi dari ADD.",
    columns: DB_NO_BPJS_COLUMNS,
  },
  {
    id: "db_no_bpjs_with_add",
    label: "DB Ada Referensi ADD",
    bucket: "dbNoBpjsAdd",
    title: "Database Tidak Ada di BPJS — Ada Referensi ADD",
    description: "Pengurus RT/RW di Database yang tidak ada di BPJS namun memiliki referensi dari ADD.",
    columns: DB_NO_BPJS_COLUMNS,
  },
  {
    id: "bpjs_add",
    label: "BPJS Cocok ADD Tanpa DB",
    bucket: "bpjsCocokAdd",
    title: "BPJS Cocok ADD (Tanpa Database)",
    description: "BPJS tanpa DB namun memiliki referensi cocok dari data ADD.",
    columns: [
      COL_DESA, COL_LOKASI,
      { key: "namaBpjs", label: "Nama BPJS" },
      { key: "namaAdd", label: "Nama ADD" },
      { key: "nik", label: "NIK" },
      { key: "upahBpjs", label: "Upah BPJS", type: "currency", align: "right" },
      { key: "nilaiAdd", label: "Nilai ADD", type: "currency", align: "right" },
      { key: "fuzzy", label: "Cocok Fuzzy", type: "bool" },
    ],
  },
  // --- Crosscheck Data Status BPJS pada pool "Database & BPJS" ---
  {
    id: "db_bpjs_aktif",
    label: "Cek Aktif",
    bucket: "dbBpjsAktif",
    title: "Database & BPJS — Cek Aktif",
    description: "Pengurus yang ada di Database & Data BPJS, dan pada Data Status BPJS ditandai MASIH AKTIF.",
    columns: [
      COL_DESA, COL_LOKASI,
      { key: "namaDb", label: "Nama DB" },
      { key: "namaBpjs", label: "Nama BPJS" },
      { key: "nik", label: "NIK" },
      { key: "bpjsMembership", label: "Status", type: "membership" },
      { key: "upahBpjs", label: "Upah BPJS", type: "currency", align: "right" },
    ],
  },
  {
    id: "db_bpjs_non_aktif",
    label: "Cek Non-Aktif",
    bucket: "dbBpjsNonAktif",
    title: "Database & BPJS — Cek Non-Aktif",
    description: "Pengurus yang ada di Database & Data BPJS, namun pada Data Status BPJS ditandai TIDAK AKTIF (berakhir masa bakti / mengundurkan diri / meninggal, dll).",
    columns: [
      COL_DESA, COL_LOKASI,
      { key: "namaDb", label: "Nama DB" },
      { key: "namaBpjs", label: "Nama BPJS" },
      { key: "nik", label: "NIK" },
      { key: "bpjsNonAktifSebab", label: "Sebab Non-Aktif" },
      { key: "bpjsMembership", label: "Status", type: "membership" },
    ],
  },
  // --- Crosscheck Data Status BPJS pada pool "BPJS Tidak Ada di Database" ---
  {
    id: "bpjs_nodb_aktif",
    label: "Cek Aktif",
    bucket: "bpjsNoDbAktif",
    title: "BPJS Tanpa Database — Cek Aktif",
    description: "Peserta Data BPJS yang tidak ada di Database, dan pada Data Status BPJS ditandai MASIH AKTIF.",
    columns: [
      COL_DESA, COL_LOKASI,
      { key: "namaBpjs", label: "Nama BPJS" },
      { key: "nik", label: "NIK" },
      { key: "bpjsMembership", label: "Status", type: "membership" },
      { key: "status", label: "Sumber" },
      { key: "upahBpjs", label: "Upah BPJS", type: "currency", align: "right" },
    ],
  },
  {
    id: "bpjs_nodb_non_aktif",
    label: "Cek Non-Aktif",
    bucket: "bpjsNoDbNonAktif",
    title: "BPJS Tanpa Database — Cek Non-Aktif",
    description: "Peserta Data BPJS yang tidak ada di Database, namun pada Data Status BPJS ditandai TIDAK AKTIF.",
    columns: [
      COL_DESA, COL_LOKASI,
      { key: "namaBpjs", label: "Nama BPJS" },
      { key: "nik", label: "NIK" },
      { key: "bpjsNonAktifSebab", label: "Sebab Non-Aktif" },
      { key: "bpjsMembership", label: "Status", type: "membership" },
    ],
  },
  // --- "Data Baru" pada pool "Database Tidak Ada di BPJS" ---
  {
    id: "db_no_bpjs_baru_ada",
    label: "Data Baru — Ada di DB",
    bucket: "dbNoBpjsBaruAda",
    title: "Data Baru — Ada di Database",
    description: "Pengurus dari sheet BARU (Data Status BPJS) yang belum di BPJS master, TAPI identitasnya cocok dengan Database. Klik baris untuk melihat penyandingan Database ↔ Data Baru.",
    detail: "baru",
    columns: [
      COL_DESA, COL_LOKASI,
      { key: "nama", label: "Nama (Baru)" },
      { key: "nik", label: "NIK", type: "nikDiff", nikKey: "nik", otherNikKey: "dbNik" },
      { key: "matchType", label: "Cocok Via", type: "matchType" },
      { key: "_detail", label: "", type: "detail" },
    ],
  },
  {
    id: "db_no_bpjs_baru_tidak",
    label: "Data Baru — Tidak di DB",
    bucket: "dbNoBpjsBaruTidak",
    title: "Data Baru — Tidak Ada di Database",
    description: "Pengurus dari sheet BARU (Data Status BPJS) yang belum di BPJS master dan TIDAK ditemukan di Database. Kandidat pendaftaran baru sepenuhnya.",
    columns: [
      COL_DESA, COL_LOKASI,
      { key: "nama", label: "Nama" },
      { key: "nik", label: "NIK" },
      { key: "jabatan", label: "Jabatan" },
      { key: "tglLahir", label: "Tgl Lahir" },
      { key: "pendidikan", label: "Pendidikan" },
      { key: "alamat", label: "Alamat" },
    ],
  },
];

// Warna kartu tab (dipakai saat tab aktif)
const TAB_COLOR = {
  comparison: "blue",
  db_bpjs: "green",
  nik_berbeda: "red",
  desa_berbeda: "violet",
  bpjs_no_db: "amber",
  db_no_bpjs: "gray",
  bpjs_add: "indigo",
  bpjs_nik_invalid: "red",
  db_bpjs_aktif: "green",
  db_bpjs_non_aktif: "green",
  bpjs_nodb_aktif: "amber",
  bpjs_nodb_non_aktif: "amber",
  db_no_bpjs_baru_ada: "gray",
  db_no_bpjs_baru_tidak: "gray",
};

const TAB_ACTIVE_CLASS = {
  blue: "border-blue-500 bg-blue-50 ring-1 ring-blue-300",
  green: "border-green-500 bg-green-50 ring-1 ring-green-300",
  red: "border-red-500 bg-red-50 ring-1 ring-red-300",
  violet: "border-violet-500 bg-violet-50 ring-1 ring-violet-300",
  amber: "border-amber-500 bg-amber-50 ring-1 ring-amber-300",
  gray: "border-gray-500 bg-gray-100 ring-1 ring-gray-300",
  indigo: "border-indigo-500 bg-indigo-50 ring-1 ring-indigo-300",
  sky: "border-sky-500 bg-sky-50 ring-1 ring-sky-300",
};

const TAB_VALUE_CLASS = {
  blue: "text-blue-700",
  green: "text-green-700",
  red: "text-red-700",
  violet: "text-violet-700",
  amber: "text-amber-700",
  gray: "text-gray-700",
  indigo: "text-indigo-700",
  sky: "text-sky-700",
};

// Kartu tab dikelompokkan menjadi "kolam" (pool). mainTab = tab yang dibuka saat
// badan kartu diklik; subTabs = tombol kecil di dalam kartu. count = angka besar kartu.
const POOLS = [
  {
    id: "comparison",
    label: "Perbandingan RT/RW",
    color: "blue",
    mainTab: "comparison",
    subTabs: [],
    showWilayahSplit: true,
    count: (_tc, summary) => summary.totalDesa,
  },
  {
    id: "db_and_bpjs",
    label: "Database dan BPJS",
    color: "green",
    mainTab: "db_bpjs",
    subTabs: ["nik_berbeda", "desa_berbeda", "db_bpjs_aktif", "db_bpjs_non_aktif"],
    // Angka unik: sub-tab adalah subset dari DB+BPJS, jadi jangan dijumlah.
    count: (tc) => tc.db_bpjs,
  },
  {
    id: "bpjs_no_db_pool",
    label: "BPJS Tidak Ada di Database",
    color: "amber",
    mainTab: "bpjs_no_db",
    subTabs: ["bpjs_no_db", "bpjs_add", "bpjs_nodb_aktif", "bpjs_nodb_non_aktif", "bpjs_nik_invalid"],
    count: (tc) => (tc.bpjs_no_db || 0) + (tc.bpjs_add || 0),
  },
  {
    id: "db_no_bpjs_pool",
    label: "Database Tidak Ada di BPJS",
    color: "gray",
    mainTab: "db_no_bpjs",
    subTabs: ["db_no_bpjs_no_add", "db_no_bpjs_with_add", "db_no_bpjs_baru_ada", "db_no_bpjs_baru_tidak"],
    count: (tc) => tc.db_no_bpjs,
  },
];

const poolTabs = (pool) => [...new Set([pool.mainTab, ...pool.subTabs])];

const TAB_DEF_BY_ID = Object.fromEntries(TAB_DEFS.map((tab) => [tab.id, tab]));

// Label ringkas untuk tombol sub-tab di dalam kartu pool (tanpa prefix "DB + BPJS" dsb)
const SUBTAB_SHORT = {
  nik_berbeda: "NIK Berbeda",
  desa_berbeda: "Desa Berbeda",
  bpjs_no_db: "BPJS",
  bpjs_add: "BPJS ada di ADD",
  db_no_bpjs_no_add: "Database",
  db_no_bpjs_with_add: "ADD",
  db_bpjs_aktif: "Cek Aktif",
  db_bpjs_non_aktif: "Cek Non-Aktif",
  bpjs_nodb_aktif: "Cek Aktif",
  bpjs_nodb_non_aktif: "Cek Non-Aktif",
  bpjs_nik_invalid: "NIK Invalid",
  db_no_bpjs_baru_ada: "Baru • di DB",
  db_no_bpjs_baru_tidak: "Baru • tak di DB",
};

// Aksen warna khusus tombol sub-tab crosscheck: hijau utk Aktif, merah utk Non-Aktif.
const SUBTAB_ACCENT = {
  db_bpjs_aktif: { color: "green", dot: "bg-green-500" },
  bpjs_nodb_aktif: { color: "green", dot: "bg-green-500" },
  db_bpjs_non_aktif: { color: "red", dot: "bg-red-500" },
  bpjs_nodb_non_aktif: { color: "red", dot: "bg-red-500" },
  bpjs_nik_invalid: { color: "red", dot: "bg-rose-500" },
};

// Sub-tab crosscheck Data Status BPJS -> ditaruh di BARIS KEDUA (di bawah sub-tab asli pool).
const SUBTAB_SECOND_ROW = new Set([
  "db_bpjs_aktif", "db_bpjs_non_aktif",
  "bpjs_nodb_aktif", "bpjs_nodb_non_aktif",
  "db_no_bpjs_baru_ada", "db_no_bpjs_baru_tidak",
]);

// Sub-tab yang ditaruh di BARIS KETIGA (di bawah Aktif/Non-Aktif).
const SUBTAB_THIRD_ROW = new Set(["bpjs_nik_invalid"]);

const loadAllDetailsForExport = async (filteredData) => {
  const hasAllDetails = filteredData.every((desa) =>
    desa.items.every((item) => item.detailsLoaded),
  );
  if (hasAllDetails) return filteredData;

  const response = await api.get("/kelembagaan/rtrw-comparison", {
    params: { includeDetails: 1, waitForCache: 1 },
    timeout: 300000,
  });
  if (response.data?.processing) {
    throw new Error("Cache data masih disiapkan, coba lagi sebentar lagi.");
  }
  if (!response.data?.success) {
    throw new Error(response.data?.message || "Gagal memuat detail data");
  }

  const fullComparison = response.data.data.comparison || [];
  const itemMap = new Map();
  fullComparison.forEach((desa) => {
    desa.items.forEach((item) => {
      itemMap.set(`${desa.desaKode}::${item.key}`, item);
    });
  });

  return filteredData.map((desa) => ({
    ...desa,
    items: desa.items.map((item) => itemMap.get(`${desa.desaKode}::${item.key}`) || item),
  }));
};

const buildExportRows = (filteredData) => {
  const rows = [];
  filteredData.forEach((desa) => {
    desa.items.forEach((item) => {
      const db = item.dbDetails || [];
      const bpjs = item.bpjsDetails || [];
      const add = item.addDetails || [];

      rows.push({
        // 17 kolom Database
        "NAMA": joinValues(db.map((d) => d.namaLengkap || d.nama)) || item.dbNama?.join("; ") || "",
        "NIK": joinValues(db.map((d) => d.nik)),
        "JENIS KELAMIN": joinValues(db.map((d) => d.jenisKelamin)),
        "TEMPAT LAHIR": joinValues(db.map((d) => d.tempatLahir)),
        "TANGGAL LAHIR": joinValues(db.map((d) => d.tglLahir)),
        "JABATAN": joinValues(db.map((d) => d.jabatan)),
        "NOMOR RW": joinValues(db.map((d) => d.rwNomor)) || item.rwNomor || "",
        "NOMOR RT": joinValues(db.map((d) => d.rtNomor)) || item.rtNomor || "",
        "ALAMAT": joinValues(db.map((d) => d.alamat)),
        "DESA": desa.desaNama,
        "KECAMATAN": desa.kecamatanNama,
        "PENDIDIKAN": joinValues(db.map((d) => d.pendidikan)),
        "STATUS PERNIKAHAN": joinValues(db.map((d) => d.statusPerkawinan)),
        "NO HP": joinValues(db.map((d) => d.noTelepon)),
        "NAMA BANK": joinValues(db.map((d) => d.namaBank)),
        "NOMOR REKENING": joinValues(db.map((d) => d.nomorRekening)),
        "NAMA REKENING": joinValues(db.map((d) => d.namaRekening)),

        // Detail BPJS
        "NIK BPJS": joinValues(bpjs.map((d) => d.nik)),
        "NAMA BPJS": joinValues(bpjs.map((d) => d.namaLengkap)) || item.bpjsNama?.join("; ") || "",
        "TGL LAHIR BPJS": joinValues(bpjs.map((d) => d.tglLahir)),
        "KPJ": joinValues(bpjs.map((d) => d.kpj)),
        "KODE TK": joinValues(bpjs.map((d) => d.kodeTk)),
        "UPAH BPJS": sumValues(bpjs.map((d) => d.upah)),
        "BLTH": joinValues(bpjs.map((d) => d.blth)),
        "ID PEGAWAI ASAL": joinValues(bpjs.map((d) => d.originalIdPegawai || d.idPegawai)),

        // Detail ADD
        "NAMA ADD": item.addNama?.join("; ") || "",
        "TOTAL NILAI ADD": item.addNilai || 0,
        "NO BUKTI ADD": joinValues(add.map((d) => d.noBukti)),
        "TGL BUKTI ADD": joinValues(add.map((d) => d.tglBukti)),
        "KETERANGAN ADD": joinValues(add.map((d) => d.keterangan)),
        "REK BANK ADD": joinValues(add.map((d) => d.rekBank)),
        "NM BANK ADD": joinValues(add.map((d) => d.nmBank)),

        // Keterangan
        "NIK BERBEDA": item.nikMismatch ? "Ya" : "Tidak",
        "TANGGAL LAHIR BERBEDA": item.tglLahirMismatch ? "Ya" : "Tidak",
        "NO REK BERBEDA": item.norekMismatch ? "Ya" : "Tidak",
      });
    });
  });
  return rows;
};

const RtrwComparisonPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("comparison");
  const [isPending, startTransition] = useTransition();

  // Pindah tab lewat transition agar kartu tetap responsif dan kita bisa
  // menampilkan overlay loading saat tabel besar sedang dirender.
  const selectTab = (tabId) => startTransition(() => setActiveTab(tabId));
  const [searchTerm, setSearchTerm] = useState("");
  const [filterKecamatan, setFilterKecamatan] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showOnlyDiscrepancy, setShowOnlyDiscrepancy] = useState(false);
  const [expandedDesa, setExpandedDesa] = useState(new Set());
  const [listModal, setListModal] = useState(null);
  const [exporting, setExporting] = useState(false);

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
            if (filterStatus === "nik_invalid") return item.bpjsNikInvalid;
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

  const classification = useMemo(() => buildClassification(data), [data]);

  const tabCounts = useMemo(() => ({
    db_bpjs: classification.dbBpjs.length,
    nik_berbeda: classification.nikBerbeda.length,
    desa_berbeda: classification.desaBerbeda.length,
    bpjs_nik_invalid: classification.nikInvalid.length,
    bpjs_no_db: classification.bpjsNoDb.length,
    db_no_bpjs: classification.dbNoBpjs.length,
    db_no_bpjs_no_add: classification.dbNoBpjsNoAdd.length,
    db_no_bpjs_with_add: classification.dbNoBpjsAdd.length,
    bpjs_add: classification.bpjsCocokAdd.length,
    db_bpjs_aktif: classification.dbBpjsAktif.length,
    db_bpjs_non_aktif: classification.dbBpjsNonAktif.length,
    bpjs_nodb_aktif: classification.bpjsNoDbAktif.length,
    bpjs_nodb_non_aktif: classification.bpjsNoDbNonAktif.length,
    db_no_bpjs_baru_ada: classification.dbNoBpjsBaruAda.length,
    db_no_bpjs_baru_tidak: classification.dbNoBpjsBaruTidak.length,
  }), [classification]);

  const activeTabDef = TAB_DEFS.find((tab) => tab.id === activeTab);
  const activePoolDef = POOLS.find((pool) => poolTabs(pool).includes(activeTab)) || POOLS[0];

  const wilayahSplit = useMemo(() => {
    const list = data?.comparison || [];
    const kelurahan = list.filter((d) => d.statusPemerintahan === "kelurahan").length;
    return { kelurahan, desa: list.length - kelurahan };
  }, [data]);

  const toggleDesa = (desaId) => {
    setExpandedDesa((prev) => {
      const next = new Set(prev);
      if (next.has(desaId)) next.delete(desaId);
      else next.add(desaId);
      return next;
    });
  };

  const exportToExcel = async () => {
    if (exporting || filteredData.length === 0) return;

    setExporting(true);
    try {
      const itemsWithDetails = await loadAllDetailsForExport(filteredData);
      const rows = buildExportRows(itemsWithDetails);
      if (rows.length === 0) return;

      const ws = XLSX.utils.json_to_sheet(rows);
      ws["!cols"] = Object.keys(rows[0]).map((key) => {
        const maxLen = Math.max(key.length, ...rows.map((row) => String(row[key] ?? "").length));
        return { wch: Math.min(maxLen + 2, 60) };
      });

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Perbandingan RT RW");
      const filename = `RT_RW_Comparison_${new Date().toISOString().split("T")[0]}.xlsx`;
      XLSX.writeFile(wb, filename);
    } catch (err) {
      console.error("Export Excel gagal:", err);
      alert(err?.response?.data?.message || err?.message || "Gagal mengekspor Excel");
    } finally {
      setExporting(false);
    }
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
            label: emptyLabel(data.summary.desaWithoutDb),
            onClick: () => setListModal({ title: "Wilayah Tanpa Data Database", list: data.summary.desaWithoutDb }),
          } : null}
        />
        <SummaryCard
          icon={<LuFileSpreadsheet />}
          label="ADD"
          value={data.summary.totalAddPenerima}
          color="blue"
          subtitle={`${data.summary.totalAddRows} baris transaksi`}
          extraInfo={data.summary.desaWithoutAdd?.length ? {
            label: emptyLabel(data.summary.desaWithoutAdd),
            onClick: () => setListModal({ title: "Wilayah Tanpa Data ADD", list: data.summary.desaWithoutAdd }),
          } : null}
        />
        <SummaryCard
          icon={<LuShieldCheck />}
          label="BPJS"
          value={data.summary.totalBpjsPenerima}
          color="amber"
          subtitle={`${data.summary.totalBpjsDesa} desa`}
          extraInfo={data.summary.desaWithoutBpjs?.length ? {
            label: emptyLabel(data.summary.desaWithoutBpjs),
            onClick: () => setListModal({ title: "Wilayah Tanpa Data BPJS", list: data.summary.desaWithoutBpjs }),
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

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Rincian Persandingan</h3>
        <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow label="DB + ADD" value={data.summary.totalDbAdd} />
          <InfoRow label="DB + BPJS" value={data.summary.totalDbBpjs} />
          <InfoRow label="ADD + BPJS" value={data.summary.totalAddBpjs} />
          <InfoRow label="Hanya DB" value={data.summary.totalOnlyDb} />
          <InfoRow label="Hanya ADD" value={data.summary.totalOnlyAdd} />
          <InfoRow label="Hanya BPJS" value={data.summary.totalOnlyBpjs} />
          <InfoRow label="NIK Berbeda" value={data.summary.totalNikMismatch} valueClass="text-red-600" />
          <InfoRow
            label="BPJS Tangkil ✓ (dikonfirmasi)"
            value={data.summary.totalBpjsTangkilConfirmed}
            hint={`${data.summary.totalBpjsTangkilPool || 0} pool Tangkil`}
            valueClass="text-green-600"
          />
          <InfoRow
            label="BPJS Tangkil ? (tidak terselesaikan)"
            value={data.summary.totalBpjsTangkilUnresolved}
            valueClass="text-violet-600"
            onClick={data.summary.totalBpjsTangkilUnresolved ? () => selectTab("bpjs_no_db") : null}
          />
          {data.summary.statusOverlayAvailable && (
            <>
              <InfoRow
                label="Status BPJS — Aktif"
                value={data.summary.totalBpjsAktif}
                valueClass="text-green-600"
                onClick={() => selectTab("db_bpjs_aktif")}
              />
              <InfoRow
                label="Status BPJS — Non-Aktif"
                value={data.summary.totalBpjsNonAktif}
                valueClass="text-red-600"
                onClick={() => selectTab("db_bpjs_non_aktif")}
              />
            </>
          )}
        </div>
      </div>

      {listModal && (
        <EmptyListModal title={listModal.title} list={listModal.list} onClose={() => setListModal(null)} />
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {POOLS.map((pool) => {
          const count = pool.count(tabCounts, data.summary);
          const poolActive = activePoolDef.id === pool.id;
          const color = pool.color;
          const mainActive = poolActive && activeTab === pool.mainTab;
          return (
            <div
              key={pool.id}
              className={`flex h-full flex-col rounded-xl border p-3 transition-all ${poolActive
                ? `${TAB_ACTIVE_CLASS[color]} shadow-sm`
                : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"}`}
            >
              <button onClick={() => selectTab(pool.mainTab)} className="block text-left">
                <span className="block text-xs font-medium leading-tight text-gray-500">{pool.label}</span>
                <CountUp
                  value={count}
                  className={`mt-1 block text-2xl font-bold ${mainActive ? TAB_VALUE_CLASS[color] : "text-gray-800"}`}
                />
              </button>

              {pool.showWilayahSplit && (
                <span className="mt-1 block text-[11px] text-gray-500">
                  {wilayahSplit.desa.toLocaleString("id-ID")} Desa · {wilayahSplit.kelurahan.toLocaleString("id-ID")} Kelurahan
                </span>
              )}

              {pool.subtitle && (
                <span className="mt-1 block text-[11px] text-gray-500">{pool.subtitle}</span>
              )}

              {pool.subTabs.length > 0 && (() => {
                const renderSubTab = (tabId) => {
                  const label = SUBTAB_SHORT[tabId] || TAB_DEF_BY_ID[tabId].label;
                  const subActive = activeTab === tabId;
                  const accent = SUBTAB_ACCENT[tabId];
                  const subColor = accent ? accent.color : color;
                  return (
                    <button
                      key={tabId}
                      onClick={() => selectTab(tabId)}
                      className={`flex flex-1 items-center justify-between gap-2 rounded-lg border px-2 py-1 text-left text-[11px] transition-all ${subActive
                        ? `${TAB_ACTIVE_CLASS[subColor]} font-semibold`
                        : "border-gray-200 bg-white/70 text-gray-600 hover:border-gray-300"}`}
                    >
                      <span className="flex items-center gap-1.5 leading-tight">
                        {accent && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${accent.dot}`} />}
                        {label}
                      </span>
                      <CountUp
                        value={tabCounts[tabId]}
                        className={`shrink-0 text-sm font-bold ${subActive ? TAB_VALUE_CLASS[subColor] : "text-gray-700"}`}
                      />
                    </button>
                  );
                };
                const baseTabs = pool.subTabs.filter((t) => !SUBTAB_SECOND_ROW.has(t) && !SUBTAB_THIRD_ROW.has(t));
                const secondTabs = pool.subTabs.filter((t) => SUBTAB_SECOND_ROW.has(t));
                const thirdTabs = pool.subTabs.filter((t) => SUBTAB_THIRD_ROW.has(t));
                return (
                  <div className="mt-2 flex flex-1 flex-col gap-2">
                    {baseTabs.length > 0 && (
                      <div className="flex flex-1 flex-wrap gap-2">{baseTabs.map(renderSubTab)}</div>
                    )}
                    {secondTabs.length > 0 && (
                      <div className="flex flex-1 flex-wrap gap-2 border-t border-gray-100 pt-2">{secondTabs.map(renderSubTab)}</div>
                    )}
                    {thirdTabs.length > 0 && (
                      <div className="flex flex-1 flex-wrap gap-2">{thirdTabs.map(renderSubTab)}</div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      <div className="relative space-y-6">
        {isPending && (
          <div className="absolute inset-0 z-20 flex items-start justify-center rounded-xl bg-white/70 pt-16 backdrop-blur-[1px]">
            <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-md">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
              <span className="text-sm font-medium text-gray-600">Memproses data...</span>
            </div>
          </div>
        )}

      {activeTabDef && activeTabDef.bucket && (
        <ClassifiedTable
          key={activeTabDef.id}
          title={activeTabDef.title}
          description={activeTabDef.description}
          rows={classification[activeTabDef.bucket]}
          columns={activeTabDef.columns}
          kecamatanList={kecamatanList}
          filenameBase={activeTabDef.id}
          detailType={activeTabDef.detail}
        />
      )}

      {activeTab === "comparison" && (
        <>
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
                disabled={filteredData.length === 0 || exporting}
                className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {exporting ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                    Menyiapkan...
                  </>
                ) : (
                  <>
                    <LuDownload className="h-3.5 w-3.5" />
                    Export Excel
                  </>
                )}
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
        </>
      )}
      </div>
    </div>
  );
};

// Kelompokkan daftar wilayah per kecamatan (urut nama), untuk ditampilkan di modal.
const groupByKecamatan = (items) => {
  const map = new Map();
  items.forEach((item) => {
    if (!map.has(item.kecamatan)) map.set(item.kecamatan, []);
    map.get(item.kecamatan).push(item);
  });
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([kecamatan, list]) => ({
      kecamatan,
      list: list.sort((a, b) => a.nama.localeCompare(b.nama)),
    }));
};

const EmptyListModal = ({ title, list, onClose }) => {
  const { desa, kelurahan } = splitEmpty(list);

  const Column = ({ heading, items, accent }) => {
    const groups = groupByKecamatan(items);
    return (
      <div className="flex-1">
        <div className={`mb-2 flex items-center justify-between rounded-lg px-2 py-1 text-xs font-semibold ${accent}`}>
          <span>{heading}</span>
          <span>{items.length}</span>
        </div>
        {items.length === 0 ? (
          <p className="px-2 py-1 text-xs italic text-gray-400">Tidak ada</p>
        ) : (
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.kecamatan}>
                <div className="mb-1 flex items-center justify-between border-b border-gray-100 px-1 pb-0.5 text-xs font-semibold text-gray-500">
                  <span>{group.kecamatan}</span>
                  <span className="text-gray-400">{group.list.length}</span>
                </div>
                <ul className="space-y-0.5">
                  {group.list.map((item, index) => (
                    <li key={`${item.nama}-${index}`} className="rounded px-2 py-0.5 text-sm text-gray-700 hover:bg-gray-50">
                      <span className="mr-1.5 inline-block w-5 text-right text-xs text-gray-400">{index + 1}.</span>
                      {item.nama}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="mx-4 flex max-h-[75vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500">{desa.length} desa · {kelurahan.length} kelurahan</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <LuX className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="flex flex-1 gap-4 overflow-y-auto px-4 py-3">
          <Column heading="Desa" items={desa} accent="bg-gray-100 text-gray-600" />
          <Column heading="Kelurahan" items={kelurahan} accent="bg-blue-100 text-blue-700" />
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ label, value, hint, valueClass, onClick }) => {
  const content = (
    <>
      <span className="flex items-center gap-1 text-gray-500">
        {label}
        {hint && <span className="text-[11px] text-gray-400">· {hint}</span>}
      </span>
      <CountUp value={value} className={`font-semibold tabular-nums ${valueClass || "text-gray-800"}`} />
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="flex items-center justify-between border-b border-gray-100 py-1.5 text-sm text-left transition-colors hover:bg-gray-50"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-1.5 text-sm">
      {content}
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
      <p className="text-2xl font-bold"><CountUp value={value} /></p>
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
          <Badge count={desa.bpjsTangkilConfirmed} label="BPJS DB" variant="green" />
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
  const statusConfig = item.nikMismatch ? STATUS_CONFIG.nik_mismatch
    : item.bpjsNikInvalid ? STATUS_CONFIG.nik_invalid
      : STATUS_CONFIG[item.status];
  const bpjsSuspectText = item.bpjsTangkilSuspect
    ? `Kode BPJS asal ${item.bpjsOriginalDesaNama || "Tangkil"} (${item.bpjsOriginalDesaKode || "-"}), disandingkan berdasarkan nama${item.bpjsTangkilAmbiguous ? ` dari ${item.bpjsTangkilCandidateCount} kandidat` : ""}.`
    : "";
  const bpjsConfirmedText = item.bpjsTangkilDbConfirmed
    ? `Kode BPJS asal ${item.bpjsOriginalDesaNama || "Tangkil"} (${item.bpjsOriginalDesaKode || "-"}), dikonfirmasi cocok dengan database (NIK sama).`
    : "";
  const statusTooltip = [
    item.keterangan,
    bpjsSuspectText || bpjsConfirmedText,
  ].filter(Boolean).join("\n");
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
        <SourceCell names={item.bpjsNama} nik={item.nik} suspect={item.bpjsTangkilSuspect} confirmed={item.bpjsTangkilDbConfirmed} suspectText={bpjsSuspectText || bpjsConfirmedText} />
        <td className="px-4 py-2 text-gray-600">
          <div className="text-xs font-medium text-gray-800">{item.jenis || "-"}</div>
          <div className="text-xs text-gray-500">
            {item.rwNomor ? `RW ${item.rwNomor}` : ""}
            {item.rtNomor ? ` / RT ${item.rtNomor}` : ""}
          </div>
        </td>
        <td className="px-4 py-2">
          <span
            title={statusTooltip}
            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${statusConfig.color}`}
          >
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
          {item.bpjsTangkilDbConfirmed && (
            <span
              title={bpjsConfirmedText}
              className="ml-1 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700"
            >
              <LuCircleCheck className="h-3 w-3" />
              BPJS DB
            </span>
          )}
          {item.tglLahirMismatch && (
            <span
              title="Tanggal lahir di BPJS berbeda dengan database"
              className="ml-1 inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700"
            >
              <LuCircleAlert className="h-3 w-3" />
              TGL ?
            </span>
          )}
          {(item.bpjsMembership === "aktif" || item.bpjsMembership === "non_aktif" || item.bpjsMembership === "mixed") && (
            <span
              title={item.bpjsNonAktifSebab || `Status kepesertaan BPJS: ${MEMBERSHIP_CONFIG[item.bpjsMembership]?.label}`}
              className={`ml-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${MEMBERSHIP_CONFIG[item.bpjsMembership]?.color}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${MEMBERSHIP_CONFIG[item.bpjsMembership]?.dotColor}`} />
              BPJS {MEMBERSHIP_CONFIG[item.bpjsMembership]?.label}
            </span>
          )}
          {item.inBaru && !item.inBpjs && (
            <span
              title={`Terdaftar sebagai pengurus BARU${item.baruJabatan ? ` (${item.baruJabatan})` : ""} — belum di BPJS`}
              className="ml-1 inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-medium text-sky-700"
            >
              <LuCircleHelp className="h-3 w-3" />
              BARU
            </span>
          )}
          {item.nikMatch && (
            <span
              title="NIK BPJS sama dengan NIK di database"
              className="ml-1 inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700"
            >
              <LuCircleCheck className="h-3 w-3" />
              NIK ✓
            </span>
          )}
          {item.norekMatch && (
            <span
              title="Nomor rekening ADD sama dengan nomor rekening di database"
              className="ml-1 inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-medium text-teal-700"
            >
              <LuCircleCheck className="h-3 w-3" />
              Norek ✓
            </span>
          )}
          {item.norekMismatch && (
            <span
              title="Nomor rekening ADD berbeda dengan nomor rekening di database"
              className="ml-1 inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-700"
            >
              <LuCircleAlert className="h-3 w-3" />
              Norek ✗
            </span>
          )}
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
                {detailItem.bpjsTangkilDbConfirmed && (
                  <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700">
                    <div className="flex items-center gap-1 font-semibold">
                      <LuCircleCheck className="h-4 w-4" />
                      BPJS kode asal {detailItem.bpjsOriginalDesaNama || "Tangkil"} ({detailItem.bpjsOriginalDesaKode || "-"}) — dikonfirmasi via NIK database
                    </div>
                    <p className="mt-1">
                      Data BPJS memiliki NIK yang sama dengan data di database, sehingga desa asal dapat dikonfirmasi tanpa perlu kandidat.
                    </p>
                  </div>
                )}
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
                    <DbDetails details={detailItem.dbDetails} bpjsDetails={detailItem.bpjsDetails} />
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

const SourceCell = ({ names, nik, suspect, confirmed, suspectText }) => (
  <td className="px-4 py-2">
    {names && names.length > 0 ? (
      <div>
        <span className="inline-flex items-center gap-1 font-medium text-gray-900">
          {names.join(", ")}
          {suspect && (
            <LuCircleHelp title={suspectText} className="h-4 w-4 shrink-0 text-violet-600" />
          )}
          {confirmed && (
            <LuCircleCheck title={suspectText} className="h-4 w-4 shrink-0 text-green-500" />
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

const DbDetails = ({ details = [], bpjsDetails = [] }) => {
  if (!details.length) return null;
  const bpjsTglLahirs = new Set(bpjsDetails.map((d) => d.tglLahir).filter(Boolean));
  return (
    <div className="space-y-2 text-xs">
      {details.map((detail) => {
        const tglLahirMatch = detail.tglLahir && bpjsTglLahirs.has(detail.tglLahir);
        const tglLahirMismatch = detail.tglLahir && bpjsTglLahirs.size > 0 && !tglLahirMatch;
        return (
          <div key={detail.id} className="rounded border border-gray-100 p-2">
            <div className="font-semibold text-gray-800">{detail.nama}</div>
            <div className="text-gray-500">{detail.jabatan || "-"} - {detail.jenis || "-"}</div>
            <div className="text-gray-500">{detail.rwNomor ? `RW ${detail.rwNomor}` : ""}{detail.rtNomor ? ` / RT ${detail.rtNomor}` : ""}</div>
            <div className="mt-1 text-gray-500">NIK: {detail.nik || "-"}</div>
            <div className="flex items-center gap-1 text-gray-500">
              Tgl Lahir: {detail.tglLahir || "-"}
              {tglLahirMatch && <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">✓ cocok BPJS</span>}
              {tglLahirMismatch && <span className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">✗ beda BPJS</span>}
            </div>
            <div className="text-gray-500">Status: {detail.statusJabatan || "-"} / {detail.statusVerifikasi || "-"}</div>
            <div className="text-gray-500">Bank: {detail.namaBank || "-"} {detail.nomorRekening || ""}</div>
          </div>
        );
      })}
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

const BoolBadge = ({ value }) => (
  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${value ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
    {value ? "Ya" : "Tidak"}
  </span>
);

// Render NIK dengan menandai angka yang berbeda (dibanding NIK pembanding) merah.
const renderNikDiff = (nik, otherNik) => {
  const value = String(nik || "").trim();
  if (!value) return <span className="italic text-gray-300">-</span>;

  const other = String(otherNik || "").trim();
  const comparable = /^\d+$/.test(value) && /^\d+$/.test(other);

  if (!comparable) {
    return <span className="font-mono text-gray-500">{value}</span>;
  }

  return (
    <span className="font-mono">
      {value.split("").map((ch, index) => (
        <span key={index} className={other[index] !== ch ? "font-bold text-red-600" : "text-gray-500"}>
          {ch}
        </span>
      ))}
    </span>
  );
};

const renderClassifiedCell = (col, row) => {
  const value = row[col.key];
  switch (col.type) {
    case "nameNik":
      return (
        <div className="min-w-[11rem]">
          <div className="font-medium text-gray-800">{row[col.nameKey] || "-"}</div>
          <div className="mt-0.5 text-xs">{renderNikDiff(row[col.nikKey], row[col.otherNikKey])}</div>
        </div>
      );
    case "nikDiff":
      return <span className="text-xs">{renderNikDiff(row[col.nikKey], row[col.otherNikKey])}</span>;
    case "matchType": {
      if (value === "nik") return <span className="rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-medium text-green-700">NIK</span>;
      if (value === "nama") return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">Nama</span>;
      return <span className="italic text-gray-300">-</span>;
    }
    case "detail":
      return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-medium text-gray-600">
          <LuSearch className="h-3 w-3" /> Detail
        </span>
      );
    case "desa":
      return (
        <div className="min-w-[10rem]">
          <div className="font-medium text-gray-800">{row.desaNama}</div>
          <div className="text-xs text-gray-400">{row.kecamatanNama} · {row.desaKode}</div>
        </div>
      );
    case "lokasi":
      return (
        <div>
          <div className="text-xs font-medium text-gray-700">{row.jenis || "-"}</div>
          <div className="text-xs text-gray-400">
            {row.rw ? `RW ${row.rw}` : ""}{row.rt ? ` / RT ${row.rt}` : ""}
          </div>
        </div>
      );
    case "bool":
      return <BoolBadge value={Boolean(value)} />;
    case "membership": {
      const cfg = MEMBERSHIP_CONFIG[value];
      if (!cfg) return <span className="italic text-gray-300">-</span>;
      return (
        <span title={row.bpjsNonAktifSebab || undefined} className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor}`} />
          {cfg.label}
        </span>
      );
    }
    case "currency":
      return <span className="tabular-nums text-gray-700">{value ? formatCurrency(value) : "-"}</span>;
    default:
      return <span className="text-gray-700">{value || <span className="italic text-gray-300">-</span>}</span>;
  }
};

const ClassifiedTable = ({ title, description, rows, columns, kecamatanList, filenameBase, detailType }) => {
  const [search, setSearch] = useState("");
  const [kecamatan, setKecamatan] = useState("");
  const [openKec, setOpenKec] = useState(() => new Set());
  const [openDesa, setOpenDesa] = useState(() => new Set());
  const [detailRow, setDetailRow] = useState(null);

  // Kolom "Desa" tak perlu ditampilkan per baris karena sudah jadi grup dropdown
  const displayColumns = useMemo(() => columns.filter((col) => col.type !== "desa"), [columns]);
  const totalCols = displayColumns.length + 1;

  const filtered = useMemo(() => {
    let result = rows;
    if (kecamatan) result = result.filter((row) => row.kecamatanNama === kecamatan);
    if (search) {
      const term = search.toUpperCase();
      result = result.filter((row) =>
        (row.namaDb || "").toUpperCase().includes(term)
        || (row.namaBpjs || "").toUpperCase().includes(term)
        || (row.namaAdd || "").toUpperCase().includes(term)
        || (row.nama || "").toUpperCase().includes(term)
        || (row.nik || "").includes(term)
        || (row.desaNama || "").toUpperCase().includes(term)
      );
    }
    return result;
  }, [rows, search, kecamatan]);

  // Kelompokkan: Kecamatan -> Desa
  const groups = useMemo(() => {
    const kecMap = new Map();
    filtered.forEach((row) => {
      if (!kecMap.has(row.kecamatanNama)) kecMap.set(row.kecamatanNama, new Map());
      const desaMap = kecMap.get(row.kecamatanNama);
      if (!desaMap.has(row.desaKode)) {
        desaMap.set(row.desaKode, { desaKode: row.desaKode, desaNama: row.desaNama, rows: [] });
      }
      desaMap.get(row.desaKode).rows.push(row);
    });
    return [...kecMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([kec, desaMap]) => {
        const desas = [...desaMap.values()].sort((a, b) => a.desaKode.localeCompare(b.desaKode));
        return { kecamatan: kec, count: desas.reduce((sum, d) => sum + d.rows.length, 0), desas };
      });
  }, [filtered]);

  // Auto buka grup saat mencari / memfilter kecamatan
  useEffect(() => {
    if (search) {
      setOpenKec(new Set(groups.map((g) => g.kecamatan)));
      setOpenDesa(new Set(groups.flatMap((g) => g.desas.map((d) => `${g.kecamatan}::${d.desaKode}`))));
    } else if (kecamatan) {
      setOpenKec(new Set([kecamatan]));
      setOpenDesa(new Set());
    } else {
      setOpenKec(new Set());
      setOpenDesa(new Set());
    }
  }, [search, kecamatan, groups]);

  const toggleKec = (kec) => setOpenKec((prev) => {
    const next = new Set(prev);
    if (next.has(kec)) next.delete(kec); else next.add(kec);
    return next;
  });
  const toggleDesa = (id) => setOpenDesa((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const expandAll = () => {
    setOpenKec(new Set(groups.map((g) => g.kecamatan)));
    setOpenDesa(new Set(groups.flatMap((g) => g.desas.map((d) => `${g.kecamatan}::${d.desaKode}`))));
  };
  const collapseAll = () => {
    setOpenKec(new Set());
    setOpenDesa(new Set());
  };

  const exportTab = () => {
    if (!filtered.length) return;
    const exportRows = filtered.map((row) => {
      const out = {
        "KODE DESA": row.desaKode,
        "DESA": row.desaNama,
        "KECAMATAN": row.kecamatanNama,
        "JENIS": row.jenis || "",
        "RW": row.rw || "",
        "RT": row.rt || "",
      };
      columns.forEach((col) => {
        if (col.type === "desa" || col.type === "lokasi" || col.type === "detail") return;
        if (col.type === "nameNik") {
          const nameHeader = col.label.toUpperCase();
          out[nameHeader] = row[col.nameKey] ?? "";
          out[nameHeader.replace("NAMA & ", "")] = row[col.nikKey] ?? "";
          return;
        }
        if (col.type === "nikDiff") {
          out[col.label.toUpperCase()] = row[col.nikKey] ?? "";
          return;
        }
        if (col.type === "matchType") {
          out[col.label.toUpperCase()] = row[col.key] === "nik" ? "NIK" : row[col.key] === "nama" ? "Nama" : "";
          return;
        }
        const value = row[col.key];
        out[col.label.toUpperCase()] = col.type === "bool"
          ? (value ? "Ya" : "Tidak")
          : col.type === "currency"
            ? Number(value || 0)
            : col.type === "membership"
              ? (MEMBERSHIP_CONFIG[value]?.label || "")
              : (value ?? "");
      });
      // Tab "Data Baru — Ada di DB": sertakan sandingan record Database di export.
      if (detailType === "baru") {
        out["NAMA (DB)"] = row.dbNama || "";
        out["NIK (DB)"] = row.dbNik || "";
        out["JABATAN (BARU)"] = row.jabatan || "";
        out["JABATAN (DB)"] = row.dbJabatan || "";
        out["TGL LAHIR (BARU)"] = row.tglLahir || "";
        out["TGL LAHIR (DB)"] = row.dbTglLahir || "";
        out["PENDIDIKAN (BARU)"] = row.pendidikan || "";
        out["PENDIDIKAN (DB)"] = row.dbPendidikan || "";
      }
      return out;
    });

    const ws = XLSX.utils.json_to_sheet(exportRows);
    ws["!cols"] = Object.keys(exportRows[0]).map((key) => {
      const maxLen = Math.max(key.length, ...exportRows.map((r) => String(r[key] ?? "").length));
      return { wch: Math.min(maxLen + 2, 55) };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `RTRW_${filenameBase}_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="mt-0.5 text-sm text-gray-500">{description}</p>
          </div>
          <button
            onClick={exportTab}
            disabled={filtered.length === 0}
            className="flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <LuDownload className="h-3.5 w-3.5" />
            Export Excel
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Cari desa, nama, atau NIK..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={kecamatan}
            onChange={(event) => setKecamatan(event.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Semua Kecamatan</option>
            {kecamatanList.map((kec) => (
              <option key={kec} value={kec}>{kec}</option>
            ))}
          </select>
          <button
            onClick={expandAll}
            className="rounded-lg bg-gray-100 px-3 py-2 text-xs transition-colors hover:bg-gray-200"
          >
            Buka Semua
          </button>
          <button
            onClick={collapseAll}
            className="rounded-lg bg-gray-100 px-3 py-2 text-xs transition-colors hover:bg-gray-200"
          >
            Tutup Semua
          </button>
          <span className="text-xs text-gray-500">
            {filtered.length.toLocaleString("id-ID")} baris · {groups.length} kecamatan
          </span>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs uppercase text-gray-500">
              <th className="w-12 px-4 py-2 text-left font-medium">No</th>
              {displayColumns.map((col) => (
                <th key={col.key} className={`px-4 py-2 font-medium ${col.align === "right" ? "text-right" : "text-left"}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 ? (
              <tr>
                <td colSpan={totalCols} className="px-4 py-10 text-center text-gray-400">
                  Tidak ada data sesuai filter
                </td>
              </tr>
            ) : (
              groups.map((group) => {
                const kecOpen = openKec.has(group.kecamatan);
                return (
                  <React.Fragment key={group.kecamatan}>
                    <tr
                      className="cursor-pointer border-t border-gray-200 bg-gray-100 hover:bg-gray-200"
                      onClick={() => toggleKec(group.kecamatan)}
                    >
                      <td colSpan={totalCols} className="px-3 py-2">
                        <div className="flex items-center gap-2 font-semibold text-gray-800">
                          {kecOpen ? <LuChevronDown className="h-4 w-4" /> : <LuChevronRight className="h-4 w-4" />}
                          <span>{group.kecamatan}</span>
                          <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-500">
                            {group.desas.length} desa · {group.count.toLocaleString("id-ID")} baris
                          </span>
                        </div>
                      </td>
                    </tr>
                    {kecOpen && group.desas.map((desa) => {
                      const desaId = `${group.kecamatan}::${desa.desaKode}`;
                      const desaOpen = openDesa.has(desaId);
                      return (
                        <React.Fragment key={desaId}>
                          <tr
                            className="cursor-pointer border-t border-gray-100 bg-gray-50 hover:bg-gray-100"
                            onClick={() => toggleDesa(desaId)}
                          >
                            <td colSpan={totalCols} className="py-1.5 pl-9 pr-3">
                              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                {desaOpen ? <LuChevronDown className="h-3.5 w-3.5" /> : <LuChevronRight className="h-3.5 w-3.5" />}
                                <span>{desa.desaNama}</span>
                                <span className="text-xs text-gray-400">{desa.desaKode}</span>
                                <span className="rounded-full bg-white px-2 py-0.5 text-xs text-gray-500">
                                  {desa.rows.length.toLocaleString("id-ID")}
                                </span>
                              </div>
                            </td>
                          </tr>
                          {desaOpen && desa.rows.map((row, index) => (
                            <tr
                              key={row.key}
                              className={`border-t border-gray-50 hover:bg-blue-50/40 ${detailType ? "cursor-pointer" : ""}`}
                              onClick={detailType ? () => setDetailRow(row) : undefined}
                            >
                              <td className="px-4 py-2 text-xs text-gray-400">{index + 1}</td>
                              {displayColumns.map((col) => (
                                <td key={col.key} className={`px-4 py-2 align-top ${col.align === "right" ? "text-right" : "text-left"}`}>
                                  {renderClassifiedCell(col, row)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {detailType === "baru" && detailRow && (
        <BaruDetailModal row={detailRow} onClose={() => setDetailRow(null)} />
      )}
    </div>
  );
};

// Modal penyandingan Data Baru (sheet DESK) <-> Database, dua kolom kiri-kanan.
const BaruDetailModal = ({ row, onClose }) => {
  const norm = (v) => String(v ?? "").trim().toUpperCase();
  const fields = [
    { label: "Nama", db: row.dbNama, baru: row.nama },
    { label: "NIK", db: row.dbNik, baru: row.nik, nik: true },
    { label: "Jenis", db: row.dbJenis, baru: row.jenis },
    { label: "RW", db: row.dbRw, baru: row.rw },
    { label: "RT", db: row.dbRt, baru: row.rt },
    { label: "Jabatan", db: row.dbJabatan, baru: row.jabatan },
    { label: "Tgl Lahir", db: row.dbTglLahir, baru: row.tglLahir },
    { label: "Alamat", db: row.dbAlamat, baru: row.alamat },
    { label: "Pendidikan", db: row.dbPendidikan, baru: row.pendidikan },
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Penyandingan Data Baru ↔ Database</h3>
            <p className="mt-0.5 text-xs text-gray-500">{row.desaNama} · {row.kecamatanNama} · cocok via {row.matchType === "nik" ? "NIK" : "nama"}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <LuX className="h-5 w-5" />
          </button>
        </div>
        <div className="grid grid-cols-[7rem_1fr_1fr] gap-x-3 p-4 text-sm">
          <div className="pb-2 text-xs font-semibold uppercase text-gray-400">Kolom</div>
          <div className="pb-2 text-xs font-semibold uppercase text-blue-600">Database</div>
          <div className="pb-2 text-xs font-semibold uppercase text-sky-600">Data Baru</div>
          {fields.map((f) => {
            const diff = norm(f.db) !== norm(f.baru);
            return (
              <React.Fragment key={f.label}>
                <div className={`border-t border-gray-100 py-2 text-xs font-medium ${diff ? "text-red-500" : "text-gray-500"}`}>{f.label}</div>
                <div className="border-t border-gray-100 py-2 text-gray-800">
                  {f.nik ? renderNikDiff(f.db, f.baru) : (f.db || <span className="italic text-gray-300">-</span>)}
                </div>
                <div className={`border-t border-gray-100 py-2 ${diff ? "bg-red-50/60" : ""} text-gray-800`}>
                  {f.nik ? renderNikDiff(f.baru, f.db) : (f.baru || <span className="italic text-gray-300">-</span>)}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
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
