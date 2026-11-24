import React, { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Link, useLocation } from "react-router-dom";
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
  LuUpload,
  LuX,
} from "react-icons/lu";
import * as XLSX from "xlsx";
import api from "../../../api";
import { useAuth } from "../../../context/AuthContext";
import RtrwImportModal from "./RtrwImportModal";

// Harus sama dengan RTRW_IMPORT_ROLES di routes/kelembagaan.routes.js — kalau
// berbeda, tombol muncul untuk user yang nanti ditolak 403 oleh backend.
const IMPORT_ROLES = ["superadmin", "pemberdayaan_masyarakat", "pemerintahan_desa", "kepala_bidang", "kepala_dinas"];
// Dua nama di atas juga dipakai checkRole() sebagai pseudo-peran berbasis bidang
// (BIDANG_ROLE_MAP), jadi seluruh pegawai bidang tersebut lolos apa pun perannya
// — pegawai, ketua_tim, bendahara, kabid. 5 = Pemberdayaan Masyarakat (PM/PMD),
// 6 = Pemerintahan Desa.
const IMPORT_BIDANG_IDS = [5, 6];

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

// Pilihan sumber data yang ikut dikomparasi. Status per baris dihitung ulang di
// klien dari flag inDb/inAdd/inBpjs yang sudah dikirim backend, jadi memilih
// "hanya DB + BPJS" tidak perlu request ulang maupun perubahan API.
const SOURCE_DEFS = [
  { key: "db", label: "Database", flag: "inDb", on: "bg-blue-600 text-white ring-blue-600", off: "text-blue-700 ring-blue-300 hover:bg-blue-50" },
  { key: "bpjs", label: "BPJS", flag: "inBpjs", on: "bg-green-600 text-white ring-green-600", off: "text-green-700 ring-green-300 hover:bg-green-50" },
  { key: "add", label: "ADD", flag: "inAdd", on: "bg-orange-500 text-white ring-orange-500", off: "text-orange-700 ring-orange-300 hover:bg-orange-50" },
];

// Cermin statusFromSources() di rtrwComparison.controller.js.
const statusFromSources = (hasDb, hasAdd, hasBpjs) => {
  if (hasDb && hasAdd && hasBpjs) return "all_three";
  if (hasDb && hasAdd) return "db_add";
  if (hasDb && hasBpjs) return "db_bpjs";
  if (hasAdd && hasBpjs) return "add_bpjs";
  if (hasDb) return "only_db";
  if (hasAdd) return "only_add";
  return "only_bpjs";
};

// Sumber yang wajib aktif agar sebuah status bisa muncul (untuk menyaring dropdown).
const STATUS_SOURCES = {
  all_three: ["db", "add", "bpjs"],
  db_add: ["db", "add"],
  db_bpjs: ["db", "bpjs"],
  add_bpjs: ["add", "bpjs"],
  only_db: ["db"],
  only_add: ["add"],
  only_bpjs: ["bpjs"],
  nik_mismatch: ["db", "bpjs"],
  bpjs_tangkil_suspect: ["bpjs"],
  nik_invalid: ["bpjs"],
};

/**
 * Alamat halaman detail pengurus untuk layout yang sedang dipakai. Halaman ini
 * juga dipasang di layout lain (mis. /bpjs) yang TIDAK punya rute pengurus —
 * di sana namanya dibiarkan teks biasa daripada menautkan ke rute yang akan
 * dialihkan balik ke dashboard.
 */
const usePengurusHref = () => {
  const { pathname } = useLocation();
  return useCallback((id) => {
    if (!id) return null;
    if (pathname.startsWith("/superadmin")) return `/superadmin/bidang/pmd/pengurus/${id}`;
    if (pathname.startsWith("/bidang/pmd")) return `/bidang/pmd/pengurus/${id}`;
    return null;
  }, [pathname]);
};

/** Nama pengurus database sebagai tautan ke detailnya (bila rutenya tersedia). */
const PengurusLinks = ({ refs, fallback, hrefOf }) => {
  const list = (refs || []).filter((item) => item?.id);
  if (!list.length) return <>{fallback || <span className="italic text-gray-300">-</span>}</>;
  return (
    <>
      {list.map((item, index) => {
        const href = hrefOf?.(item.id);
        return (
          <React.Fragment key={item.id}>
            {index > 0 && ", "}
            {href ? (
              <Link
                to={href}
                title="Buka detail pengurus"
                onClick={(event) => event.stopPropagation()}
                className="text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800"
              >
                {item.nama}
              </Link>
            ) : item.nama}
          </React.Fragment>
        );
      })}
    </>
  );
};

// Persempit SELURUH payload persandingan ke sumber yang dipilih — dipakai sekali
// di level halaman, sebelum kartu ringkasan, hitungan tab, dan tabel dihitung,
// supaya semuanya memakai angka yang sama. Backend tak perlu dipanggil ulang:
// flag inDb/inAdd/inBpjs dan penanda silang tiap baris sudah cukup.
const rescopeData = (data, sources) => {
  if (!data) return null;
  if (sources.db && sources.add && sources.bpjs) return data;

  const fullStatus = statusFromSources(sources.db, sources.add, sources.bpjs);
  const withBpjs = Boolean(sources.bpjs);

  const comparison = (data.comparison || []).map((desa) => {
    const items = (desa.items || [])
      .filter((item) => SOURCE_DEFS.some((def) => sources[def.key] && item[def.flag]))
      .map((item) => {
        const inDb = Boolean(sources.db && item.inDb);
        const inAdd = Boolean(sources.add && item.inAdd);
        const inBpjs = Boolean(sources.bpjs && item.inBpjs);
        return {
          ...item,
          inDb,
          inAdd,
          inBpjs,
          status: statusFromSources(inDb, inAdd, inBpjs),
          dbNama: sources.db ? item.dbNama : [],
          dbRefs: sources.db ? item.dbRefs : [],
          addNama: sources.add ? item.addNama : [],
          bpjsNama: withBpjs ? item.bpjsNama : [],
          bpjsKpj: withBpjs ? item.bpjsKpj : [],
          addNilai: sources.add ? item.addNilai : 0,
          bpjsUpah: withBpjs ? item.bpjsUpah : 0,
          // Penanda silang hanya berlaku bila kedua sumbernya ikut dikomparasi.
          nikMatch: item.nikMatch && inDb && inBpjs,
          nikMismatch: item.nikMismatch && inDb && inBpjs,
          tglLahirMismatch: item.tglLahirMismatch && inDb && inBpjs,
          norekMatch: item.norekMatch && inDb && inAdd,
          norekMismatch: item.norekMismatch && inDb && inAdd,
          // Penanda yang murni berasal dari BPJS ikut padam bila BPJS dilepas.
          bpjsTangkilSuspect: item.bpjsTangkilSuspect && withBpjs,
          bpjsTangkilDbConfirmed: item.bpjsTangkilDbConfirmed && withBpjs,
          bpjsDesaBerbeda: item.bpjsDesaBerbeda && withBpjs,
          bpjsNikInvalid: item.bpjsNikInvalid && withBpjs,
          bpjsMembership: withBpjs ? item.bpjsMembership : null,
          inBaru: Boolean(item.inBaru && withBpjs),
        };
      });
    const countStatus = (status) => items.filter((item) => item.status === status).length;
    return {
      ...desa,
      items,
      allThree: countStatus(fullStatus),
      dbAdd: countStatus("db_add"),
      dbBpjs: countStatus("db_bpjs"),
      addBpjs: countStatus("add_bpjs"),
      onlyDb: countStatus("only_db"),
      onlyAdd: countStatus("only_add"),
      onlyBpjs: countStatus("only_bpjs"),
      nikMismatch: items.filter((item) => item.nikMismatch).length,
      bpjsTangkilSuspect: items.filter((item) => item.bpjsTangkilSuspect).length,
      bpjsTangkilConfirmed: items.filter((item) => item.bpjsTangkilDbConfirmed).length,
    };
  });

  const countItems = (predicate) => comparison.reduce(
    (sum, desa) => sum + desa.items.filter(predicate).length,
    0,
  );
  const countStatus = (status) => countItems((item) => item.status === status);

  const summary = {
    ...data.summary,
    // Angka per sumber (totalDbPengurus, totalAddPenerima, dst.) sengaja dibiarkan:
    // itu isi berkas sumbernya, dan kartunya disembunyikan saat sumber tak dipilih.
    totalAllThree: countStatus(fullStatus),
    totalDbAdd: countStatus("db_add"),
    totalDbBpjs: countStatus("db_bpjs"),
    totalAddBpjs: countStatus("add_bpjs"),
    totalOnlyDb: countStatus("only_db"),
    totalOnlyAdd: countStatus("only_add"),
    totalOnlyBpjs: countStatus("only_bpjs"),
    totalFuzzyMatched: countItems((item) => item.isFuzzy),
    totalNikMismatch: countItems((item) => item.nikMismatch),
    totalDesaBerbeda: countItems((item) => item.bpjsDesaBerbeda),
    totalNikInvalid: countItems((item) => item.bpjsNikInvalid),
    totalBpjsAktif: countItems((item) => item.bpjsMembership === "aktif"),
    totalBpjsNonAktif: countItems((item) => item.bpjsMembership === "non_aktif" || item.bpjsMembership === "mixed"),
    totalBpjsUnmarked: countItems((item) => item.bpjsMembership === "unmarked"),
    ...(withBpjs ? {} : {
      totalBpjsTangkilPool: 0,
      totalBpjsTangkilConfirmed: 0,
      totalBpjsTangkilUnresolved: 0,
      totalBpjsUnmappable: 0,
      totalBaru: 0,
      totalBaruMatchedDb: 0,
      totalBaruUnmatched: 0,
      totalBaruAnomali: 0,
      totalStatusAktif: 0,
      totalStatusNonAktif: 0,
      totalStatusTanpaMaster: 0,
    }),
  };

  return {
    ...data,
    comparison,
    summary,
    // Daftar yang seluruhnya berasal dari BPJS dikosongkan bila BPJS dilepas,
    // sehingga tab-tab turunannya ikut nol.
    tangkilUnresolved: withBpjs ? data.tangkilUnresolved : [],
    baruList: withBpjs ? data.baruList : [],
    bpjsStatus: withBpjs ? data.bpjsStatus : { aktif: [], nonAktif: [] },
    bpjsUnmappable: withBpjs ? data.bpjsUnmappable : [],
  };
};

// Status kepesertaan BPJS (overlay dari DESK BPJS JULI 2026)
const MEMBERSHIP_CONFIG = {
  aktif: { label: "Aktif", color: "bg-green-100 text-green-800", dotColor: "bg-green-500" },
  non_aktif: { label: "Non-Aktif", color: "bg-red-100 text-red-800", dotColor: "bg-red-500" },
  mixed: { label: "Campuran", color: "bg-orange-100 text-orange-800", dotColor: "bg-orange-500" },
  unmarked: { label: "Belum ditandai", color: "bg-gray-100 text-gray-500", dotColor: "bg-gray-300" },
};

// Status jabatan pengurus di database (kolom pengurus.status_jabatan)
const STATUS_JABATAN_CONFIG = {
  aktif: { label: "Aktif", color: "bg-green-100 text-green-800", dotColor: "bg-green-500" },
  selesai: { label: "Selesai", color: "bg-gray-100 text-gray-600", dotColor: "bg-gray-400" },
  nonaktif: { label: "Non-Aktif", color: "bg-red-100 text-red-800", dotColor: "bg-red-500" },
  campuran: { label: "Campuran", color: "bg-orange-100 text-orange-800", dotColor: "bg-orange-500" },
};

// Satu baris bisa membawa >1 record DB (mis. ketua lama "selesai" + ketua baru
// "aktif" bernama sama) → tampilkan sebagai "Campuran", detailnya di tooltip.
const statusJabatanConfig = (value) => {
  const parts = String(value || "").split(", ").filter(Boolean);
  return parts.length > 1 ? STATUS_JABATAN_CONFIG.campuran : STATUS_JABATAN_CONFIG[parts[0]];
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
        dbRefs: item.dbRefs || [],
        namaAdd: (item.addNama || []).join(", "),
        namaBpjs: (item.bpjsNama || []).join(", "),
        nik: (item.nik || []).join(", "),
        nikDb: (item.dbNik || []).join(", "),
        // Status jabatan dari database. Nilai jamak (merge >1 record) → tampil apa adanya.
        statusJabatan: (item.dbStatusJabatan || []).join(", "),
        jabatanDb: (item.dbJabatan || []).join(", "),
        nikBpjs: (item.bpjsNik || []).join(", "),
        kpj: (item.bpjsKpj || []).join(", "),
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

  // "Data Baru": pengurus di sheet BARU. Dipisah 2: yang cocok Database
  // (disandingkan dgn record DB) & yang tidak — keduanya hanya untuk yang BELUM
  // ada di BPJS master (anomaliBpjs=false). Sumber: baruList.
  const baruMapped = [...(data?.baruList || [])]
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
      anomaliBpjs: Boolean(b.anomaliBpjs),
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
  const baruBelumBpjs = baruMapped.filter((r) => !r.anomaliBpjs);
  const dbNoBpjsBaruAda = baruBelumBpjs.filter((r) => r.matchedDb).sort(byBaruSort);
  const dbNoBpjsBaruTidak = baruBelumBpjs.filter((r) => !r.matchedDb).sort(byBaruSort);

  // Data Status BPJS sebagai sumber tersendiri (rtrwbpjsstatus.json), apa adanya —
  // bukan hasil persandingan. Sheet AKTIF / NON AKTIF / BARU.
  const statusAktif = (data?.bpjsStatus?.aktif || []).map((r, index) => ({
    ...r,
    key: `status-aktif::${r.desaKode}::${r.nik || r.kpj}::${index}`,
    bpjsMembership: "aktif",
  }));
  const statusNonAktif = (data?.bpjsStatus?.nonAktif || []).map((r, index) => ({
    ...r,
    key: `status-nonaktif::${r.desaKode}::${r.nama}::${index}`,
    bpjsMembership: "non_aktif",
    bpjsNonAktifSebab: r.sebab || "",
  }));
  const statusBaru = [...baruMapped].sort(byBaruSort);
  // Selisih: peserta Data Status BPJS (sheet AKTIF/NON AKTIF) yang tidak ketemu
  // di master Data BPJS. Sheet BARU tidak dihitung — memang belum di master.
  const statusSelisih = [...statusAktif, ...statusNonAktif]
    .filter((r) => !r.adaDiMaster)
    .sort((a, b) => a.desaKode.localeCompare(b.desaKode) || String(a.nama).localeCompare(String(b.nama)));

  // Peserta BPJS yang tidak bisa dipetakan ke desa mana pun di database, jadi
  // tidak pernah muncul di persandingan. Baris ini tidak punya desa/kecamatan,
  // jadi dua tingkat pengelompokan ClassifiedTable dipakai ulang:
  // kecamatanNama -> sebab, desaKode/desaNama -> ID_PEGAWAI.
  const bpjsUnmappable = (data?.bpjsUnmappable || []).map((r) => ({
    ...r,
    kecamatanNama: r.sebabLabel || "Tidak diketahui",
    desaKode: r.idPegawai || "(kosong)",
    desaNama: r.idPegawai || "(kosong)",
    barisExcelLabel: r.barisExcel ? `Baris ${r.barisExcel}` : "",
  }));

  return {
    dbBpjs, nikBerbeda, desaBerbeda, nikInvalid, bpjsNoDb, dbNoBpjs, dbNoBpjsAdd, dbNoBpjsNoAdd, bpjsCocokAdd,
    dbBpjsAktif, dbBpjsNonAktif,
    bpjsNoDbAktif, bpjsNoDbNonAktif,
    dbNoBpjsBaruAda, dbNoBpjsBaruTidak,
    statusAktif, statusNonAktif, statusBaru, statusSelisih,
    bpjsUnmappable,
  };
};

const COL_DESA = { key: "desa", label: "Desa", type: "desa" };
const COL_LOKASI = { key: "lokasi", label: "RT/RW", type: "lokasi" };

const COL_STATUS_JABATAN = { key: "statusJabatan", label: "Status Jabatan", type: "statusJabatan" };

const DB_NO_BPJS_COLUMNS = [
  COL_DESA, COL_LOKASI,
  { key: "namaDb", label: "Nama DB" },
  { key: "nik", label: "NIK" },
  COL_STATUS_JABATAN,
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
      { key: "kpj", label: "KPJ" },
      COL_STATUS_JABATAN,
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
      { key: "kpj", label: "KPJ" },
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
      { key: "kpj", label: "KPJ" },
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
    id: "bpjs_unmappable",
    label: "Tidak Terpetakan",
    bucket: "bpjsUnmappable",
    title: "Data BPJS Tidak Terpetakan",
    description: "Peserta BPJS yang ID_PEGAWAI-nya tidak bisa dipetakan ke desa mana pun di database, sehingga tidak ikut terhitung di seluruh persandingan. Dikelompokkan per sebab, lalu per ID_PEGAWAI. Perlu perbaikan data di sumber BPJS.",
    groupAllLabel: "Semua Sebab",
    searchPlaceholder: "Cari nama, NIK, atau ID_PEGAWAI...",
    columns: [
      COL_DESA,
      { key: "idPegawai", label: "ID_PEGAWAI" },
      { key: "nama", label: "Nama" },
      { key: "nik", label: "NIK" },
      { key: "kpj", label: "KPJ" },
      { key: "tglLahir", label: "Tgl Lahir" },
      { key: "upah", label: "Upah", type: "currency", align: "right" },
      { key: "barisExcelLabel", label: "Baris Excel" },
      { key: "sebabLabel", label: "Sebab" },
      { key: "petunjukLabel", label: "NIK ada di Database" },
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
    description: "Data Database (Ketua RT/RW) yang tidak memiliki padanan di BPJS.",
    columns: DB_NO_BPJS_COLUMNS,
  },
  {
    id: "db_no_bpjs_no_add",
    label: "DB Tanpa Referensi ADD",
    bucket: "dbNoBpjsNoAdd",
    title: "Database Tidak Ada di BPJS — Tanpa Referensi ADD",
    description: "Ketua RT/RW di Database yang tidak ada di BPJS dan tidak memiliki referensi dari ADD.",
    columns: DB_NO_BPJS_COLUMNS,
  },
  {
    id: "db_no_bpjs_with_add",
    label: "DB Ada Referensi ADD",
    bucket: "dbNoBpjsAdd",
    title: "Database Tidak Ada di BPJS — Ada Referensi ADD",
    description: "Ketua RT/RW di Database yang tidak ada di BPJS namun memiliki referensi dari ADD.",
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
      { key: "kpj", label: "KPJ" },
      COL_STATUS_JABATAN,
      { key: "bpjsMembership", label: "Status BPJS", type: "membership" },
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
      { key: "kpj", label: "KPJ" },
      COL_STATUS_JABATAN,
      { key: "bpjsNonAktifSebab", label: "Sebab Non-Aktif" },
      { key: "bpjsMembership", label: "Status BPJS", type: "membership" },
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
  // --- Data Status BPJS sebagai sumber tersendiri (rtrwbpjsstatus.json) ---
  {
    id: "status_aktif",
    label: "Status BPJS — Aktif",
    bucket: "statusAktif",
    title: "Data Status BPJS — AKTIF",
    description: "Isi sheet AKTIF pada Data Status BPJS (rtrwbpjsstatus.json), apa adanya — belum disandingkan dengan Database/ADD. Nama diambil dari master Data BPJS via NIK/KPJ. Baris di-dedup per NIK/KPJ sehingga bisa lebih sedikit dari jumlah baris mentah sheet.",
    columns: [
      COL_DESA,
      { key: "nama", label: "Nama" },
      { key: "nik", label: "NIK" },
      { key: "kpj", label: "KPJ" },
      { key: "kodeTk", label: "Kode TK" },
      { key: "tglLahir", label: "Tgl Lahir" },
      { key: "bpjsMembership", label: "Status", type: "membership" },
      { key: "upah", label: "Upah", type: "currency", align: "right" },
    ],
  },
  {
    id: "status_non_aktif",
    label: "Status BPJS — Non-Aktif",
    bucket: "statusNonAktif",
    title: "Data Status BPJS — NON AKTIF",
    description: "Isi sheet NON AKTIF pada Data Status BPJS (rtrwbpjsstatus.json). Sheet ini tidak memuat NIK — NIK/KPJ dilengkapi dari master Data BPJS bila nama & desa cocok. Baris di-dedup per nama+desa.",
    columns: [
      COL_DESA,
      { key: "nama", label: "Nama" },
      { key: "nik", label: "NIK" },
      { key: "kpj", label: "KPJ" },
      { key: "tglLahir", label: "Tgl Lahir" },
      { key: "sebab", label: "Sebab Non-Aktif" },
      { key: "bpjsMembership", label: "Status", type: "membership" },
    ],
  },
  {
    id: "status_baru",
    label: "Status BPJS — Baru",
    bucket: "statusBaru",
    title: "Data Status BPJS — BARU",
    description: "Isi sheet BARU pada Data Status BPJS (rtrwbpjsstatus.json): pengurus RT/RW yang diajukan baru. Klik baris untuk penyandingan dengan Database.",
    detail: "baru",
    columns: [
      COL_DESA, COL_LOKASI,
      { key: "nama", label: "Nama" },
      { key: "nik", label: "NIK" },
      { key: "jabatan", label: "Jabatan" },
      { key: "tglLahir", label: "Tgl Lahir" },
      { key: "matchedDb", label: "Ada di DB", type: "bool" },
      { key: "anomaliBpjs", label: "Sudah di BPJS", type: "bool" },
      { key: "_detail", label: "", type: "detail" },
    ],
  },
  {
    id: "status_selisih",
    label: "Selisih vs Master BPJS",
    bucket: "statusSelisih",
    title: "Data Status BPJS — Selisih terhadap Master Data BPJS",
    description: "Peserta pada sheet AKTIF / NON AKTIF Data Status BPJS yang TIDAK ditemukan di master Data BPJS (rtrwbpjs.json). AKTIF dicari via NIK lalu KPJ; NON AKTIF via nama + kode desa (sheet-nya tidak memuat NIK). Baris AKTIF di sini tampil tanpa nama karena namanya memang hanya ada di master. Sheet BARU tidak dihitung — memang belum terdaftar di master.",
    columns: [
      COL_DESA,
      { key: "sheet", label: "Sheet" },
      { key: "nama", label: "Nama" },
      { key: "nik", label: "NIK" },
      { key: "kpj", label: "KPJ" },
      { key: "tglLahir", label: "Tgl Lahir" },
      { key: "sebab", label: "Sebab Non-Aktif" },
      { key: "bpjsMembership", label: "Status", type: "membership" },
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
  bpjs_unmappable: "rose",
  db_bpjs_aktif: "green",
  db_bpjs_non_aktif: "green",
  bpjs_nodb_aktif: "amber",
  bpjs_nodb_non_aktif: "amber",
  db_no_bpjs_baru_ada: "gray",
  db_no_bpjs_baru_tidak: "gray",
  status_aktif: "sky",
  status_non_aktif: "sky",
  status_baru: "sky",
  status_selisih: "sky",
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
  rose: "border-rose-500 bg-rose-50 ring-1 ring-rose-300",
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
  rose: "text-rose-700",
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
    needs: ["db", "bpjs"],
    color: "green",
    mainTab: "db_bpjs",
    subTabs: ["nik_berbeda", "desa_berbeda", "db_bpjs_aktif", "db_bpjs_non_aktif"],
    // Angka unik: sub-tab adalah subset dari DB+BPJS, jadi jangan dijumlah.
    count: (tc) => tc.db_bpjs,
  },
  {
    id: "bpjs_no_db_pool",
    label: "BPJS Tidak Ada di Database",
    needs: ["bpjs"],
    color: "amber",
    mainTab: "bpjs_no_db",
    subTabs: ["bpjs_no_db", "bpjs_add", "bpjs_nodb_aktif", "bpjs_nodb_non_aktif", "bpjs_nik_invalid"],
    count: (tc) => (tc.bpjs_no_db || 0) + (tc.bpjs_add || 0),
  },
  {
    id: "bpjs_unmappable_pool",
    label: "Data Tidak Terpetakan",
    needs: ["bpjs"],
    subtitle: "ID_PEGAWAI tak dikenal database — di luar seluruh perhitungan",
    color: "rose",
    mainTab: "bpjs_unmappable",
    subTabs: [],
    count: (tc) => tc.bpjs_unmappable || 0,
  },
  {
    id: "db_no_bpjs_pool",
    label: "Database Tidak Ada di BPJS",
    needs: ["db", "bpjs"],
    color: "gray",
    mainTab: "db_no_bpjs",
    subTabs: ["db_no_bpjs_no_add", "db_no_bpjs_with_add", "db_no_bpjs_baru_ada", "db_no_bpjs_baru_tidak"],
    count: (tc) => tc.db_no_bpjs,
  },
  {
    id: "bpjs_status_pool",
    label: "Data Status BPJS",
    needs: ["bpjs"],
    subtitle: "Sumber: rtrwbpjsstatus.json (AKTIF / NON AKTIF / BARU)",
    color: "sky",
    mainTab: "status_aktif",
    subTabs: ["status_aktif", "status_non_aktif", "status_baru", "status_selisih"],
    count: (tc) => (tc.status_aktif || 0) + (tc.status_non_aktif || 0) + (tc.status_baru || 0),
  },
];

const poolTabs = (pool) => [...new Set([pool.mainTab, ...pool.subTabs])];

// Pool hanya relevan bila seluruh sumber yang dibutuhkannya ikut disandingkan.
const poolAvailable = (pool, sources) => (pool.needs || []).every((key) => sources[key]);

// Jumlah kolom disesuaikan dengan banyaknya kartu yang tampil supaya tidak ada
// sel sisa maupun kartu yang melar dua kali lipat. Ditulis sebagai kelas utuh,
// bukan string dirangkai, karena Tailwind memindai nama kelas secara literal.
// Kartu ringkasan atas: jumlahnya juga berubah mengikuti sumber terpilih.
const SUMMARY_GRID_COLS = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
};

const POOL_GRID_COLS = {
  // 1-2 kartu tetap memakai raster 3 kolom supaya kartunya tidak melebar penuh.
  1: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
  2: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
  3: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
  5: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-5",
  6: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
};

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
  status_aktif: "Aktif",
  status_non_aktif: "Non-Aktif",
  status_baru: "Baru",
  status_selisih: "Selisih vs Master",
};

// Aksen warna khusus tombol sub-tab crosscheck: hijau utk Aktif, merah utk Non-Aktif.
const SUBTAB_ACCENT = {
  db_bpjs_aktif: { color: "green", dot: "bg-green-500" },
  bpjs_nodb_aktif: { color: "green", dot: "bg-green-500" },
  db_bpjs_non_aktif: { color: "red", dot: "bg-red-500" },
  bpjs_nodb_non_aktif: { color: "red", dot: "bg-red-500" },
  bpjs_nik_invalid: { color: "red", dot: "bg-rose-500" },
  status_aktif: { color: "green", dot: "bg-green-500" },
  status_non_aktif: { color: "red", dot: "bg-red-500" },
  status_baru: { color: "sky", dot: "bg-sky-500" },
  status_selisih: { color: "amber", dot: "bg-amber-500" },
};

// Sub-tab crosscheck Data Status BPJS -> ditaruh di BARIS KEDUA (di bawah sub-tab asli pool).
const SUBTAB_SECOND_ROW = new Set([
  "db_bpjs_aktif", "db_bpjs_non_aktif",
  "bpjs_nodb_aktif", "bpjs_nodb_non_aktif",
  "db_no_bpjs_baru_ada", "db_no_bpjs_baru_tidak",
  "status_selisih",
]);

// Sub-tab yang ditaruh di BARIS KETIGA (di bawah Aktif/Non-Aktif).
const SUBTAB_THIRD_ROW = new Set(["bpjs_nik_invalid"]);

// Satu kali ambil seluruh persandingan beserta detail sumbernya, dipetakan per
// `${desaKode}::${itemKey}` — kunci yang sama dipakai baris tabel klasifikasi.
const fetchDetailItemMap = async () => {
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

  const itemMap = new Map();
  (response.data.data.comparison || []).forEach((desa) => {
    desa.items.forEach((item) => {
      itemMap.set(`${desa.desaKode}::${item.key}`, item);
    });
  });
  return itemMap;
};

const loadAllDetailsForExport = async (filteredData) => {
  const hasAllDetails = filteredData.every((desa) =>
    desa.items.every((item) => item.detailsLoaded),
  );
  if (hasAllDetails) return filteredData;

  const itemMap = await fetchDetailItemMap();

  // Ambil DETAIL-nya saja dari server; status & penanda tetap versi yang tampil
  // (sudah mengikuti pilihan sumber), supaya isi Excel sama dengan layar.
  return filteredData.map((desa) => ({
    ...desa,
    items: desa.items.map((item) => {
      const full = itemMap.get(`${desa.desaKode}::${item.key}`);
      if (!full) return item;
      return {
        ...item,
        dbDetails: full.dbDetails,
        addDetails: full.addDetails,
        bpjsDetails: full.bpjsDetails,
        detailsLoaded: true,
      };
    }),
  }));
};

// Seluruh kolom data pengurus (Database + BPJS + ADD) untuk satu baris
// persandingan. Dipakai export tab Perbandingan DAN export tiap tab klasifikasi
// supaya isinya seragam dan hanya ditulis sekali.
const pengurusExportColumns = (item, desaNama = "", kecamatanNama = "") => {
  const db = item.dbDetails || [];
  const bpjs = item.bpjsDetails || [];
  const add = item.addDetails || [];

  return {
        // 17 kolom Database
        "NAMA": joinValues(db.map((d) => d.namaLengkap || d.nama)) || item.dbNama?.join("; ") || "",
        "NIK": joinValues(db.map((d) => d.nik)),
        "JENIS KELAMIN": joinValues(db.map((d) => d.jenisKelamin)),
        "TEMPAT LAHIR": joinValues(db.map((d) => d.tempatLahir)),
        "TANGGAL LAHIR": joinValues(db.map((d) => d.tglLahir)),
        "JABATAN": joinValues(db.map((d) => d.jabatan)),
        "STATUS JABATAN": joinValues(db.map((d) => STATUS_JABATAN_CONFIG[d.statusJabatan]?.label || d.statusJabatan)),
        "NOMOR RW": joinValues(db.map((d) => d.rwNomor)) || item.rwNomor || "",
        "NOMOR RT": joinValues(db.map((d) => d.rtNomor)) || item.rtNomor || "",
        "ALAMAT": joinValues(db.map((d) => d.alamat)),
        "DESA": desaNama,
        "KECAMATAN": kecamatanNama,
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
  };
};

// Kolom yang sudah pasti ada di export tab klasifikasi, jadi tidak diulang.
const KOLOM_PENGURUS_DILEWATI = ["NOMOR RW", "NOMOR RT"];

const buildExportRows = (filteredData) => {
  const rows = [];
  filteredData.forEach((desa) => {
    desa.items.forEach((item) => {
      rows.push(pengurusExportColumns(item, desa.desaNama, desa.kecamatanNama));
    });
  });
  return rows;
};

const RtrwComparisonPage = () => {
  const [rawData, setRawData] = useState(null);
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
  // Bawaan: Database + BPJS. ADD tidak diikutkan karena insentif ADD bukan acuan
  // utama persandingan — nyalakan manual bila memang mau disandingkan.
  const [sources, setSources] = useState({ db: true, bpjs: true, add: false });
  const [showOnlyDiscrepancy, setShowOnlyDiscrepancy] = useState(false);
  const [expandedDesa, setExpandedDesa] = useState(new Set());
  const [listModal, setListModal] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const { user } = useAuth();
  const canImport = IMPORT_ROLES.includes(String(user?.role || "").trim().toLowerCase())
    || IMPORT_BIDANG_IDS.includes(Number(user?.bidang_id));

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
        setRawData(response.data.data);
      } else {
        throw new Error(response.data.message || "Gagal memuat data");
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Gagal memuat data");
    } finally {
      if (!keepLoading) setLoading(false);
    }
  };

  // Status "lengkap" menurut sumber yang dipilih (3 sumber -> all_three).
  const fullStatus = statusFromSources(sources.db, sources.add, sources.bpjs);
  const allSourcesOn = sources.db && sources.add && sources.bpjs;
  const selectedSourceLabels = SOURCE_DEFS.filter((def) => sources[def.key]).map((def) => def.label);

  // Semua turunan halaman (kartu, tab, tabel, export) memakai data yang sudah
  // dipersempit ini — bukan respons mentah. Harus dideklarasikan sebelum memo
  // mana pun yang memakainya.
  const data = useMemo(() => rescopeData(rawData, sources), [rawData, sources]);

  const kecamatanList = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.comparison.map((desa) => desa.kecamatanNama))].sort();
  }, [data]);

  const toggleSource = (key) => {
    const next = { ...sources, [key]: !sources[key] };
    if (!SOURCE_DEFS.some((def) => next[def.key])) return; // minimal satu sumber
    setSources(next);
    // Status terpilih bisa jadi mustahil pada kombinasi baru -> reset agar tabel tak kosong tanpa sebab.
    if (filterStatus && !(STATUS_SOURCES[filterStatus] || []).every((src) => next[src])) setFilterStatus("");
    // Tab aktif bisa ikut hilang (pool-nya butuh sumber yang baru dilepas).
    const activePool = POOLS.find((pool) => poolTabs(pool).includes(activeTab));
    if (activePool && !poolAvailable(activePool, next)) selectTab("comparison");
  };

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
        return desa.items.some((item) => item.status !== fullStatus || item.nikMismatch || item.bpjsTangkilSuspect);
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
  }, [data, filterKecamatan, filterStatus, searchTerm, showOnlyDiscrepancy, fullStatus]);

  const filteredSummary = useMemo(() => {
    const countStatus = (status) => filteredData.reduce(
      (sum, desa) => sum + desa.items.filter((item) => item.status === status).length,
      0,
    );

    return {
      totalDesa: filteredData.length,
      totalAllThree: countStatus(fullStatus),
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
  }, [filteredData, fullStatus]);

  const classification = useMemo(() => buildClassification(data), [data]);

  const tabCounts = useMemo(() => ({
    db_bpjs: classification.dbBpjs.length,
    nik_berbeda: classification.nikBerbeda.length,
    desa_berbeda: classification.desaBerbeda.length,
    bpjs_nik_invalid: classification.nikInvalid.length,
    bpjs_unmappable: classification.bpjsUnmappable.length,
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
    status_aktif: classification.statusAktif.length,
    status_non_aktif: classification.statusNonAktif.length,
    status_baru: classification.statusBaru.length,
    status_selisih: classification.statusSelisih.length,
  }), [classification]);

  const activeTabDef = TAB_DEFS.find((tab) => tab.id === activeTab);
  const activePoolDef = POOLS.find((pool) => poolTabs(pool).includes(activeTab)) || POOLS[0];
  const visiblePools = POOLS.filter((pool) => poolAvailable(pool, sources));
  // Kartu ringkasan: 1 kartu "Cocok" + kartu per sumber (BPJS membawa 2: master & status).
  const summaryCardCount = 1 + (sources.db ? 1 : 0) + (sources.add ? 1 : 0) + (sources.bpjs ? 2 : 0);

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Persandingan Data RT/RW</h1>
          <p className="mt-1 text-gray-500">
            Perbandingan Ketua RT/RW dari Database, penerima insentif ADD, dan peserta BPJS
          </p>
        </div>
        {canImport && (
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
          >
            <LuUpload className="h-3.5 w-3.5" />
            Import Excel
          </button>
        )}
      </div>

      {/* Pemilih sumber: berlaku untuk seluruh halaman — kartu, tab, dan tabel. */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3">
        <span className="text-sm font-semibold text-gray-700">Data yang disandingkan</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {SOURCE_DEFS.map((def) => (
            <button
              key={def.key}
              type="button"
              onClick={() => toggleSource(def.key)}
              aria-pressed={sources[def.key]}
              title={sources[def.key] ? `Klik untuk mengeluarkan ${def.label}` : `Klik untuk menyertakan ${def.label}`}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ring-1 ring-inset transition-colors ${
                sources[def.key] ? `${def.on} shadow-sm` : `bg-white ${def.off}`
              }`}
            >
              {def.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">
          {allSourcesOn
            ? "Semua sumber disandingkan. Nonaktifkan salah satu untuk menyandingkan sebagian saja."
            : `Hanya ${selectedSourceLabels.join(" + ")} yang disandingkan — seluruh kartu, tab, dan tabel di bawah mengikuti pilihan ini (minimal satu sumber).`}
        </span>
      </div>

      <div className={`grid gap-3 auto-rows-fr ${SUMMARY_GRID_COLS[summaryCardCount] || SUMMARY_GRID_COLS[5]}`}>
        {sources.db && <SummaryCard
          icon={<LuDatabase />}
          label="Database"
          value={data.summary.totalDbPengurus}
          color="gray"
          subtitle={`${data.summary.totalDbDesa} desa · ${data.summary.totalDbAktif ?? 0} aktif${data.summary.totalDbNonAktif ? ` · ${data.summary.totalDbNonAktif} non-aktif` : ""}`}
          extraInfo={data.summary.desaWithoutDb?.length ? {
            label: emptyLabel(data.summary.desaWithoutDb),
            onClick: () => setListModal({ title: "Wilayah Tanpa Data Database", list: data.summary.desaWithoutDb }),
          } : null}
        />}
        {sources.add && <SummaryCard
          icon={<LuFileSpreadsheet />}
          label="ADD"
          value={data.summary.totalAddPenerima}
          color="blue"
          subtitle={`${data.summary.totalAddRows} baris transaksi`}
          extraInfo={data.summary.desaWithoutAdd?.length ? {
            label: emptyLabel(data.summary.desaWithoutAdd),
            onClick: () => setListModal({ title: "Wilayah Tanpa Data ADD", list: data.summary.desaWithoutAdd }),
          } : null}
        />}
        {sources.bpjs && <SummaryCard
          icon={<LuShieldCheck />}
          label="BPJS"
          value={data.summary.totalBpjsPenerima}
          color="amber"
          subtitle={`${data.summary.totalBpjsDesa} desa`}
          extraInfo={data.summary.desaWithoutBpjs?.length ? {
            label: emptyLabel(data.summary.desaWithoutBpjs),
            onClick: () => setListModal({ title: "Wilayah Tanpa Data BPJS", list: data.summary.desaWithoutBpjs }),
          } : null}
        />}
        {sources.bpjs && <SummaryCard
          icon={<LuShieldCheck />}
          label="Status BPJS"
          value={(data.summary.totalStatusAktif || 0) + (data.summary.totalStatusNonAktif || 0) + (data.summary.totalBaru || 0)}
          color="sky"
          subtitle={`${(data.summary.totalStatusAktif || 0).toLocaleString("id-ID")} aktif · ${(data.summary.totalStatusNonAktif || 0).toLocaleString("id-ID")} non-aktif · ${(data.summary.totalBaru || 0).toLocaleString("id-ID")} baru`}
        />}
        <SummaryCard
          icon={<LuCircleCheck />}
          label={selectedSourceLabels.length > 1 ? "Cocok" : "Baris"}
          value={data.summary.totalAllThree}
          color="green"
          subtitle={data.summary.totalNikMismatch
            ? `${data.summary.totalNikMismatch} NIK berbeda`
            : `${selectedSourceLabels.length} sumber: ${selectedSourceLabels.join(" + ")}`}
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-gray-700">Rincian Persandingan</h3>
        <div className="grid grid-cols-1 gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {sources.db && sources.add && <InfoRow label="DB + ADD" value={data.summary.totalDbAdd} />}
          {sources.db && sources.bpjs && <InfoRow label="DB + BPJS" value={data.summary.totalDbBpjs} />}
          {sources.add && sources.bpjs && <InfoRow label="ADD + BPJS" value={data.summary.totalAddBpjs} />}
          {sources.db && fullStatus !== "only_db" && <InfoRow label="Hanya DB" value={data.summary.totalOnlyDb} />}
          {sources.add && fullStatus !== "only_add" && <InfoRow label="Hanya ADD" value={data.summary.totalOnlyAdd} />}
          {sources.bpjs && fullStatus !== "only_bpjs" && <InfoRow label="Hanya BPJS" value={data.summary.totalOnlyBpjs} />}
          {sources.db && sources.bpjs && <InfoRow label="NIK Berbeda" value={data.summary.totalNikMismatch} valueClass="text-red-600" />}
          {sources.bpjs && <InfoRow
            label="BPJS Tangkil ✓ (dikonfirmasi)"
            value={data.summary.totalBpjsTangkilConfirmed}
            hint={`${data.summary.totalBpjsTangkilPool || 0} pool Tangkil`}
            valueClass="text-green-600"
          />}
          {sources.bpjs && <InfoRow
            label="BPJS Tangkil ? (tidak terselesaikan)"
            value={data.summary.totalBpjsTangkilUnresolved}
            valueClass="text-violet-600"
            onClick={data.summary.totalBpjsTangkilUnresolved ? () => selectTab("bpjs_no_db") : null}
          />}
          {sources.bpjs && data.summary.statusOverlayAvailable && (
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

      {showImport && (
        <RtrwImportModal
          onClose={() => setShowImport(false)}
          onImported={fetchData}
        />
      )}

      {/* Kolom mengikuti jumlah kartu (lihat POOL_GRID_COLS) dan auto-rows-fr
          menyamakan tinggi antar kartu, jadi tidak ada sel sisa atau ujung ragged. */}
      <div className={`grid gap-3 auto-rows-fr ${POOL_GRID_COLS[visiblePools.length] || POOL_GRID_COLS[3]}`}>
        {visiblePools.map((pool) => {
          const count = pool.count(tabCounts, data.summary);
          const poolActive = activePoolDef.id === pool.id;
          const color = pool.color;
          const mainActive = poolActive && activeTab === pool.mainTab;
          return (
            <div
              key={pool.id}
              className={`flex h-full flex-col rounded-2xl border p-4 shadow-sm transition-all ${poolActive
                ? TAB_ACTIVE_CLASS[color]
                : "border-slate-200 bg-white hover:border-slate-300 hover:shadow"}`}
            >
              <button onClick={() => selectTab(pool.mainTab)} className="block text-left">
                <span className="block text-[11px] font-semibold uppercase tracking-wider leading-tight text-slate-500">{pool.label}</span>
                <CountUp
                  value={count}
                  className={`mt-1.5 block text-3xl font-bold tracking-tight tabular-nums ${mainActive ? TAB_VALUE_CLASS[color] : "text-slate-900"}`}
                />
              </button>

              {pool.showWilayahSplit && (
                <span className="mt-auto block pt-2 text-[11px] text-slate-500">
                  {wilayahSplit.desa.toLocaleString("id-ID")} Desa
                  {wilayahSplit.kelurahan > 0
                    ? ` · ${wilayahSplit.kelurahan.toLocaleString("id-ID")} Kelurahan`
                    : " (kelurahan dikecualikan)"}
                </span>
              )}

              {pool.subtitle && (
                <span className={`block text-[11px] leading-snug text-slate-500 ${pool.subTabs.length > 0 ? "mt-1" : "mt-auto pt-2"}`}>{pool.subtitle}</span>
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
                      title={label}
                      className={`flex min-w-[118px] flex-1 items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-left text-[11px] transition-all ${subActive
                        ? `${TAB_ACTIVE_CLASS[subColor]} font-semibold`
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"}`}
                    >
                      <span className="flex min-w-0 items-center gap-1.5 leading-tight">
                        {accent && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${accent.dot}`} />}
                        <span className="truncate">{label}</span>
                      </span>
                      <CountUp
                        value={tabCounts[tabId]}
                        className={`shrink-0 text-sm font-bold tabular-nums ${subActive ? TAB_VALUE_CLASS[subColor] : "text-slate-800"}`}
                      />
                    </button>
                  );
                };
                const baseTabs = pool.subTabs.filter((t) => !SUBTAB_SECOND_ROW.has(t) && !SUBTAB_THIRD_ROW.has(t));
                const secondTabs = pool.subTabs.filter((t) => SUBTAB_SECOND_ROW.has(t));
                const thirdTabs = pool.subTabs.filter((t) => SUBTAB_THIRD_ROW.has(t));
                return (
                  <div className="mt-3 flex flex-1 flex-col gap-2">
                    {baseTabs.length > 0 && (
                      <div className="flex flex-1 flex-wrap gap-2">{baseTabs.map(renderSubTab)}</div>
                    )}
                    {secondTabs.length > 0 && (
                      <div className="flex flex-1 flex-wrap gap-2 border-t border-slate-100 pt-2">{secondTabs.map(renderSubTab)}</div>
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
          // Tab yang tidak berbasis wilayah (mis. Tidak Terpetakan) menurunkan
          // daftar grupnya dari baris itu sendiri, bukan dari daftar kecamatan.
          kecamatanList={activeTabDef.groupAllLabel
            ? [...new Set((classification[activeTabDef.bucket] || []).map((row) => row.kecamatanNama))].sort()
            : kecamatanList}
          groupAllLabel={activeTabDef.groupAllLabel}
          searchPlaceholder={activeTabDef.searchPlaceholder}
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
                {Object.entries(STATUS_CONFIG)
                  .filter(([key]) => (STATUS_SOURCES[key] || []).every((src) => sources[src]))
                  .map(([key, cfg]) => (
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
              <span className="text-green-600">
                {filteredSummary.totalAllThree}
                {" "}
                {selectedSourceLabels.length > 1 ? `cocok ${selectedSourceLabels.join(" + ")}` : `baris ${selectedSourceLabels[0]}`}
              </span>
              {allSourcesOn && <span className="text-teal-600">{filteredSummary.totalDbAdd} DB+ADD</span>}
              {allSourcesOn && <span className="text-emerald-600">{filteredSummary.totalDbBpjs} DB+BPJS</span>}
              {allSourcesOn && <span className="text-indigo-600">{filteredSummary.totalAddBpjs} ADD+BPJS</span>}
              {sources.db && fullStatus !== "only_db" && <span className="text-gray-600">{filteredSummary.totalOnlyDb} hanya DB</span>}
              {sources.add && fullStatus !== "only_add" && <span className="text-blue-600">{filteredSummary.totalOnlyAdd} hanya ADD</span>}
              {sources.bpjs && fullStatus !== "only_bpjs" && <span className="text-amber-600">{filteredSummary.totalOnlyBpjs} hanya BPJS</span>}
              {sources.db && sources.bpjs && <span className="text-red-600">{filteredSummary.totalNikMismatch} NIK berbeda</span>}
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
                  sources={sources}
                  fullStatus={fullStatus}
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
            <p className="text-xs text-gray-500">
              {desa.length} desa{kelurahan.length > 0 ? ` · ${kelurahan.length} kelurahan` : ""}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <LuX className="h-5 w-5 text-gray-500" />
          </button>
        </div>
        <div className="flex flex-1 gap-4 overflow-y-auto px-4 py-3">
          <Column heading="Desa" items={desa} accent="bg-gray-100 text-gray-600" />
          {kelurahan.length > 0 && (
            <Column heading="Kelurahan" items={kelurahan} accent="bg-blue-100 text-blue-700" />
          )}
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

// Mengikuti gaya kartu bidang (components/bidang/BidangUI.jsx): sudut 2xl,
// label kapital kecil, angka tabular. Melebar mengisi baris supaya tidak ada
// sel kosong saat sebagian sumber tidak dipilih.
const SummaryCard = ({ icon, label, value, color, subtitle, extraInfo }) => {
  const colorMap = {
    gray: "bg-slate-50 text-slate-600 border-slate-200",
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    amber: "bg-amber-50 text-amber-600 border-amber-200",
    green: "bg-green-50 text-green-600 border-green-200",
    teal: "bg-teal-50 text-teal-600 border-teal-200",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-200",
    red: "bg-red-50 text-red-600 border-red-200",
    violet: "bg-violet-50 text-violet-600 border-violet-200",
    sky: "bg-sky-50 text-sky-600 border-sky-200",
  };

  return (
    <div className={`flex h-full flex-col rounded-2xl border p-4 shadow-sm ${colorMap[color] || colorMap.gray}`}>
      <div className="flex items-center gap-2">
        {icon && <span className="text-lg">{icon}</span>}
        <span className="text-[11px] font-semibold uppercase tracking-wider opacity-75">{label}</span>
      </div>
      <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums"><CountUp value={value} /></p>
      {subtitle && <p className="mt-1 text-xs leading-snug opacity-70">{subtitle}</p>}
      <div className="flex-1" />
      {extraInfo && (
        <button onClick={extraInfo.onClick} className="mt-auto pt-1 text-left text-[10px] underline opacity-60 hover:opacity-100">
          {extraInfo.label}
        </button>
      )}
    </div>
  );
};

const DesaRow = ({ desa, expanded, onToggle, sources = { db: true, add: true, bpjs: true }, fullStatus = "all_three" }) => {
  const hasDiscrepancy = desa.items.some((item) => item.status !== fullStatus || item.nikMismatch || item.bpjsTangkilSuspect);
  // Kolom sumber yang tidak dikomparasi disembunyikan (ADD membawa kolom Nilai ADD).
  const colCount = 3 + (sources.db ? 1 : 0) + (sources.bpjs ? 1 : 0) + (sources.add ? 2 : 0);

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
          {sources.db && <Badge count={desa.totalDb} label="DB" variant="gray" />}
          {sources.add && <Badge count={desa.totalAdd} label="ADD" variant="blue" />}
          {sources.bpjs && <Badge count={desa.totalBpjs} label="BPJS" variant="amber" />}
        </div>
        <div className="hidden shrink-0 items-center gap-1.5 lg:flex">
          <Badge count={desa.allThree} label={fullStatus === "all_three" ? "Lengkap" : "Cocok"} variant="green" />
          {sources.add && fullStatus !== "only_add" && <Badge count={desa.onlyAdd} label="Hanya ADD" variant="blue" />}
          {sources.bpjs && fullStatus !== "only_bpjs" && <Badge count={desa.onlyBpjs} label="Hanya BPJS" variant="amber" />}
          {sources.db && sources.bpjs && <Badge count={desa.nikMismatch} label="NIK beda" variant="red" />}
          {sources.bpjs && <Badge count={desa.bpjsTangkilSuspect} label="BPJS ?" variant="violet" />}
          {sources.bpjs && <Badge count={desa.bpjsTangkilConfirmed} label="BPJS DB" variant="green" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-xs uppercase text-gray-500">
                  <th className="w-12 px-4 py-2 text-left font-medium">No</th>
                  {sources.db && <th className="px-4 py-2 text-left font-medium">Database</th>}
                  {sources.add && <th className="px-4 py-2 text-left font-medium">ADD</th>}
                  {sources.bpjs && <th className="px-4 py-2 text-left font-medium">BPJS</th>}
                  <th className="w-32 px-4 py-2 text-left font-medium">RT/RW</th>
                  <th className="w-40 px-4 py-2 text-left font-medium">Status</th>
                  {sources.add && <th className="w-36 px-4 py-2 text-right font-medium">Nilai ADD</th>}
                </tr>
              </thead>
              <tbody>
                {desa.items.length === 0 ? (
                  <tr>
                    <td colSpan={colCount} className="px-4 py-6 text-center text-gray-400">Tidak ada data RT/RW</td>
                  </tr>
                ) : (
                  desa.items.map((item, index) => (
                    <RtrwItemRow key={`${item.key}-${index}`} item={item} index={index} desaKode={desa.desaKode} sources={sources} colCount={colCount} />
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

const RtrwItemRow = ({ item, index, desaKode, sources = { db: true, add: true, bpjs: true }, colCount = 7 }) => {
  const pengurusHref = usePengurusHref();
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
      // Hanya detail yang diambil dari server; sisanya tetap item hasil pemilihan sumber.
      setDetailItem({
        ...item,
        dbDetails: loadedItem.dbDetails,
        addDetails: loadedItem.addDetails,
        bpjsDetails: loadedItem.bpjsDetails,
        detailsLoaded: true,
      });
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
        {sources.db && <SourceCell names={item.dbNama} refs={item.dbRefs} hrefOf={pengurusHref} />}
        {sources.add && <SourceCell names={item.addNama} />}
        {sources.bpjs && <SourceCell names={item.bpjsNama} nik={item.nik} kpj={item.bpjsKpj} suspect={item.bpjsTangkilSuspect} confirmed={item.bpjsTangkilDbConfirmed} suspectText={bpjsSuspectText || bpjsConfirmedText} />}
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
        {sources.add && (
          <td className="px-4 py-2 text-right text-gray-600">
            {item.addNilai ? formatCurrency(item.addNilai) : "-"}
          </td>
        )}
      </tr>
      {expanded && (
        <tr>
          <td colSpan={colCount} className="bg-slate-50 px-4 py-3">
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

const SourceCell = ({ names, nik, kpj, refs, hrefOf, suspect, confirmed, suspectText }) => (
  <td className="px-4 py-2">
    {names && names.length > 0 ? (
      <div>
        <span className="inline-flex items-center gap-1 font-medium text-gray-900">
          {refs?.length ? <PengurusLinks refs={refs} fallback={names.join(", ")} hrefOf={hrefOf} /> : names.join(", ")}
          {suspect && (
            <LuCircleHelp title={suspectText} className="h-4 w-4 shrink-0 text-violet-600" />
          )}
          {confirmed && (
            <LuCircleCheck title={suspectText} className="h-4 w-4 shrink-0 text-green-500" />
          )}
        </span>
        {nik?.length > 0 && <p className="mt-0.5 text-[11px] text-gray-400">NIK: {nik.join(", ")}</p>}
        {kpj?.length > 0 && <p className="mt-0.5 text-[11px] text-gray-400">KPJ: {kpj.join(", ")}</p>}
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

const renderClassifiedCell = (col, row, hrefOf) => {
  const value = row[col.key];
  // Kolom nama dari Database ditautkan ke halaman detail pengurusnya.
  const namaDbCol = (col.nameKey || col.key) === "namaDb";
  switch (col.type) {
    case "nameNik":
      return (
        <div className="min-w-[11rem]">
          <div className="font-medium text-gray-800">
            {namaDbCol
              ? <PengurusLinks refs={row.dbRefs} fallback={row[col.nameKey] || "-"} hrefOf={hrefOf} />
              : (row[col.nameKey] || "-")}
          </div>
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
    case "statusJabatan": {
      const cfg = statusJabatanConfig(value);
      if (!cfg) return <span className="italic text-gray-300">-</span>;
      return (
        <span title={[row.jabatanDb, value].filter(Boolean).join(" — ") || undefined} className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor}`} />
          {cfg.label}
        </span>
      );
    }
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
      if (namaDbCol) {
        return (
          <span className="text-gray-700">
            <PengurusLinks refs={row.dbRefs} fallback={value} hrefOf={hrefOf} />
          </span>
        );
      }
      return <span className="text-gray-700">{value || <span className="italic text-gray-300">-</span>}</span>;
  }
};

const ClassifiedTable = ({ title, description, rows, columns, kecamatanList, filenameBase, detailType,
  // Tab "Tidak Terpetakan" memakai tabel ini tapi datanya tidak punya desa;
  // pengelompokan dua tingkatnya dipakai ulang untuk sebab -> ID_PEGAWAI.
  groupAllLabel = "Semua Kecamatan", searchPlaceholder = "Cari desa, nama, atau NIK..." }) => {
  const [search, setSearch] = useState("");
  const [kecamatan, setKecamatan] = useState("");
  const [openKec, setOpenKec] = useState(() => new Set());
  const [openDesa, setOpenDesa] = useState(() => new Set());
  const [detailRow, setDetailRow] = useState(null);
  const [exporting, setExporting] = useState(false);
  const pengurusHref = usePengurusHref();

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

  // Baris yang berasal dari persandingan memakai kunci `<kode desa>::<key item>`;
  // baris tab lain (Data Baru, Status BPJS, Tidak Terpetakan) tidak, jadi detail
  // pengurus hanya diambil bila memang ada yang bisa dicocokkan.
  const KUNCI_ITEM = /^\d{2}\.\d{2}\.\d{2}\.\d{4}::/;

  const exportTab = async () => {
    if (!filtered.length || exporting) return;
    setExporting(true);
    try {
      await exportTabRows();
    } catch (err) {
      console.error("Export Excel gagal:", err);
      alert(err?.response?.data?.message || err?.message || "Gagal mengekspor Excel");
    } finally {
      setExporting(false);
    }
  };

  const exportTabRows = async () => {
    // Detail pengurus (Database/BPJS/ADD) tidak ikut di response ringkas, jadi
    // diambil sekali di sini supaya tiap baris bisa dilengkapi.
    const itemMap = filtered.some((row) => KUNCI_ITEM.test(row.key || ""))
      ? await fetchDetailItemMap()
      : new Map();

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
              : col.type === "statusJabatan"
                ? (statusJabatanConfig(value)?.label || "")
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

      // Lengkapi dengan seluruh data pengurus (Database) + data BPJS/ADD bila
      // barisnya memang hasil persandingan. Kolom milik tab tidak ditimpa.
      const item = itemMap.get(row.key);
      if (item) {
        Object.entries(pengurusExportColumns(item, row.desaNama, row.kecamatanNama)).forEach(([key, value]) => {
          if (key in out || KOLOM_PENGURUS_DILEWATI.includes(key)) return;
          out[key] = value;
        });
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
            disabled={filtered.length === 0 || exporting}
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

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
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
            <option value="">{groupAllLabel}</option>
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
                                  {renderClassifiedCell(col, row, pengurusHref)}
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
            <p className="mt-0.5 text-xs text-gray-500">
            {row.desaNama} · {row.kecamatanNama} · {row.matchType === "nik" ? "cocok via NIK" : row.matchType === "nama" ? "cocok via nama" : "tidak ada padanan di Database"}
          </p>
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
