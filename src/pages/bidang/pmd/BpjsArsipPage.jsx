import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  LuArrowDownRight, LuArrowUpRight, LuCircleAlert, LuCircleCheck, LuChevronLeft, LuChevronRight,
  LuGitMerge, LuMapPin, LuSearch, LuUpload, LuUserMinus, LuUserPlus, LuUsers, LuWallet, LuX,
} from "react-icons/lu";
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import api from "../../../api";
import { useAuth } from "../../../context/AuthContext";
import RtrwImportModal from "./RtrwImportModal";
import { canImportRtrw } from "./rtrwImportAccess";

const LIMIT = 50;

// Warna menurut tugasnya: satu seri jumlah = biru; masuk/keluar = biru vs oranye
// dengan "tetap" abu-abu netral; warna status hanya untuk kualitas data (+ ikon).
const C = {
  seri: "#257de0",
  seriRedup: "#bfd7f5",
  masuk: "#257de0",
  keluar: "#f47230",
  netral: "#cbd5e1",
  grid: "#eef2f6",
  sumbu: "#94a3b8",
};

const bulanLabel = (periode, pendek = false) => {
  if (!periode) return "-";
  const [y, m] = periode.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: pendek ? "short" : "long", year: "numeric" });
};
const angka = (v) => Number(v || 0).toLocaleString("id-ID");
const ringkas = (v) => new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(Number(v || 0));
const persen = (a, b) => (b ? `${((a / b) * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 })}%` : "-");
const waktu = (v) => (v ? new Date(v).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }) : "-");
const USIA_URUT = ["< 30", "30–39", "40–49", "50–59", "≥ 60", "Tidak diketahui"];

const Kartu = ({ judul, keterangan, kanan, children, className = "" }) => (
  <section className={`rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 ${className}`}>
    <div className="mb-3 flex items-start justify-between gap-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{judul}</h2>
        {keterangan && <p className="mt-0.5 text-xs text-slate-500">{keterangan}</p>}
      </div>
      {kanan}
    </div>
    {children}
  </section>
);

const Selisih = ({ nilai, satuan = "" }) => {
  if (nilai === null || nilai === undefined) return <span className="text-xs text-slate-400">tidak ada pembanding</span>;
  if (nilai === 0) return <span className="text-xs text-slate-500">sama dengan bulan lalu</span>;
  const naik = nilai > 0;
  const Ikon = naik ? LuArrowUpRight : LuArrowDownRight;
  return (
    <span className="inline-flex items-center gap-0.5 text-xs font-medium text-slate-600">
      <Ikon className="h-3.5 w-3.5" aria-hidden />
      {naik ? "+" : "−"}{angka(Math.abs(nilai))}{satuan} dari bulan lalu
    </span>
  );
};

const Stat = ({ ikon: Ikon, label, nilai, bawah, onClick, aktif }) => {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      onClick={onClick}
      className={`flex flex-col rounded-2xl border bg-white p-4 text-left transition-colors ${
        aktif ? "border-blue-400 ring-1 ring-blue-400" : "border-slate-200"
      } ${onClick ? "hover:border-slate-300" : ""}`}
    >
      <span className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Ikon className="h-4 w-4 text-slate-400" aria-hidden /> {label}
      </span>
      <span className="mt-2 text-2xl font-bold tabular-nums leading-none text-slate-900">{nilai}</span>
      <span className="mt-2">{bawah}</span>
    </Tag>
  );
};

const TipKotak = ({ judul, baris }) => (
  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
    <p className="mb-1 font-semibold text-slate-900">{judul}</p>
    {baris.map(([k, v]) => (
      <p key={k} className="flex justify-between gap-4 text-slate-600">
        <span>{k}</span><span className="font-semibold tabular-nums text-slate-900">{v}</span>
      </p>
    ))}
  </div>
);

/** Dua batang bertumpuk: bulan lalu (tetap + keluar) → bulan ini (tetap + baru). */
const AlurMutasi = ({ sebelumnya, periode, tetap, keluar, baru, onPilih }) => {
  const maks = Math.max(tetap + keluar, tetap + baru, 1);
  const Baris = ({ label, segmen }) => (
    <div>
      <div className="mb-1 flex justify-between text-xs text-slate-600">
        <span className="font-medium">{label}</span>
        <span className="tabular-nums">{angka(segmen.reduce((s, x) => s + x.n, 0))}</span>
      </div>
      <div className="flex h-7 gap-[2px]">
        {segmen.filter((x) => x.n > 0).map((x) => (
          <button
            key={x.k}
            title={`${x.k}: ${angka(x.n)}`}
            onClick={x.banding !== undefined ? () => onPilih(x.banding) : undefined}
            className="h-full first:rounded-l last:rounded-r hover:opacity-80"
            style={{ width: `${(x.n / maks) * 100}%`, background: x.warna, minWidth: 4 }}
          />
        ))}
      </div>
    </div>
  );
  return (
    <div className="space-y-3">
      <Baris label={bulanLabel(sebelumnya)} segmen={[
        { k: "Tetap", n: tetap, warna: C.netral },
        { k: "Keluar", n: keluar, warna: C.keluar, banding: "keluar" },
      ]} />
      <Baris label={bulanLabel(periode)} segmen={[
        { k: "Tetap", n: tetap, warna: C.netral },
        { k: "Baru masuk", n: baru, warna: C.masuk, banding: "baru" },
      ]} />
      <ul className="flex flex-wrap gap-x-4 gap-y-1 pt-1 text-xs text-slate-600">
        {[["Tetap", C.netral, tetap], ["Baru masuk", C.masuk, baru], ["Keluar", C.keluar, keluar]].map(([k, w, n]) => (
          <li key={k} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: w }} />
            {k} <span className="font-semibold tabular-nums text-slate-900">{angka(n)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Halaman Data BPJS: infografis + arsip bulanan di database + import Excel BPJS.
 * Tiap import tersimpan per bulan BLTH, jadi bulan-bulan lalu tetap bisa dilihat & dibandingkan.
 */
const BpjsArsipPage = () => {
  const { user } = useAuth();
  const canImport = canImportRtrw(user);
  const [showImport, setShowImport] = useState(false);
  const [reload, setReload] = useState(0);
  const [periodeList, setPeriodeList] = useState(null);
  const [periode, setPeriode] = useState("");
  const [ringkasan, setRingkasan] = useState(null);
  const [semuaKec, setSemuaKec] = useState(false);
  const [banding, setBanding] = useState("");
  const [cari, setCari] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const tabelRef = useRef(null);

  // pilihTerbaru: setelah import, langsung tampilkan bulan terbaru.
  const loadPeriode = useCallback((pilihTerbaru) => {
    api.get("/kelembagaan/bpjs-arsip")
      .then((res) => {
        const list = res.data?.data || [];
        setPeriodeList(list);
        setPeriode((cur) => (pilihTerbaru || !cur ? list[0]?.periode || "" : cur));
        setPage(1);
        setReload((n) => n + 1);
      })
      .catch((err) => setError(err.response?.data?.message || "Gagal memuat daftar periode"));
  }, []);

  useEffect(() => { loadPeriode(false); }, [loadPeriode]);

  useEffect(() => {
    if (!periode) return undefined;
    let batal = false;
    setRingkasan(null);
    api.get(`/kelembagaan/bpjs-arsip/${periode}/ringkasan`)
      .then((res) => { if (!batal) setRingkasan(res.data?.data || null); })
      .catch((err) => { if (!batal) setError(err.response?.data?.message || "Gagal memuat ringkasan"); });
    return () => { batal = true; };
  }, [periode, reload]);

  // Pencarian ditunda 400 ms agar tidak menembak API tiap ketukan.
  useEffect(() => {
    const t = setTimeout(() => { setQ(cari.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [cari]);

  useEffect(() => {
    if (!periode) return undefined;
    let batal = false;
    setLoading(true);
    api.get(`/kelembagaan/bpjs-arsip/${periode}`, { params: { q, banding, page, limit: LIMIT } })
      .then((res) => { if (!batal) setData(res.data?.data || null); })
      .catch((err) => { if (!batal) setError(err.response?.data?.message || "Gagal memuat data peserta"); })
      .finally(() => { if (!batal) setLoading(false); });
    return () => { batal = true; };
  }, [periode, banding, q, page, reload]);

  const keTabel = (perubahan) => {
    perubahan();
    setPage(1);
    tabelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const info = periodeList?.find((p) => p.periode === periode);
  const infoLalu = periodeList?.find((p) => p.periode === ringkasan?.sebelumnya);
  const sebelumnya = ringkasan?.sebelumnya || data?.sebelumnya;
  const mutasi = ringkasan?.mutasi;
  const totalHalaman = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  const tren = [...(periodeList || [])].reverse().map((p) => ({
    periode: p.periode, label: bulanLabel(p.periode, true), peserta: p.total_baris, desa: p.total_desa, upah: Number(p.total_upah),
  }));
  const kec = ringkasan?.perKecamatan || [];
  const kecTampil = semuaKec ? kec : kec.slice(0, 10);
  const usia = USIA_URUT.map((k) => ({ kelompok: k, peserta: ringkasan?.usia.find((u) => u.kelompok === k)?.peserta || 0 }))
    .filter((u) => u.kelompok !== "Tidak diketahui" || u.peserta > 0);
  const usiaTotal = usia.reduce((s, u) => s + u.peserta, 0);
  const cak = ringkasan?.cakupan;
  const kual = ringkasan?.kualitas;
  const cekKualitas = kual ? [
    { label: "Kode desa tidak dikenal", n: kual.desa_tidak_dikenal },
    { label: "NIK tidak 16 digit", n: kual.nik_tidak_valid },
    { label: "NIK ganda dalam bulan ini", n: kual.nik_ganda },
    { label: "KPJ kosong", n: kual.kpj_kosong },
    { label: "Tanggal lahir kosong/tidak terbaca", n: kual.tgl_lahir_kosong },
  ] : [];

  const tabs = [
    { id: "", label: "Semua peserta" },
    { id: "baru", label: "Baru masuk" },
    { id: "keluar", label: "Keluar" },
  ];

  return (
    <div className="space-y-4 bg-slate-50/60 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Data BPJS Ketenagakerjaan</h1>
          <p className="text-sm text-slate-500">
            Peserta Ketua RT/RW per bulan iuran (BLTH). Setiap bulan yang diimport tersimpan permanen.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="../rtrw-comparison"
            relative="path"
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <LuGitMerge className="h-3.5 w-3.5" />
            Persandingan RT/RW
          </Link>
          {canImport && (
            <button
              onClick={() => setShowImport(true)}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-blue-700"
            >
              <LuUpload className="h-3.5 w-3.5" />
              Import Excel BPJS
            </button>
          )}
        </div>
      </div>

      {showImport && (
        <RtrwImportModal jenisOnly="bpjs" onClose={() => setShowImport(false)} onImported={() => loadPeriode(true)} />
      )}

      {error && (
        <p className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <LuCircleAlert className="h-4 w-4 shrink-0" /> {error}
        </p>
      )}
      {!periodeList && !error && <p className="text-sm text-slate-500">Memuat data...</p>}

      {periodeList && periodeList.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Belum ada data. {canImport ? "Klik Import Excel BPJS untuk memasukkan data bulan ini." : "Data akan muncul setelah bidang PM mengimport Excel BPJS."}
        </div>
      )}

      {periodeList?.length > 0 && (
        <>
          {/* Pemilih bulan + asal data */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              Bulan
              <select
                value={periode}
                onChange={(e) => { setPeriode(e.target.value); setPage(1); setBanding(""); }}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-900"
              >
                {periodeList.map((p) => (
                  <option key={p.periode} value={p.periode}>{bulanLabel(p.periode)}</option>
                ))}
              </select>
            </label>
            {info && (
              <p className="text-xs text-slate-500">
                File <span className="font-medium text-slate-700">{info.nama_file}</span> · diimport {waktu(info.imported_at)}
                {info.imported_by_name ? ` oleh ${info.imported_by_name}` : ""}
                {sebelumnya ? ` · dibandingkan dengan ${bulanLabel(sebelumnya)}` : " · bulan pertama di arsip"}
              </p>
            )}
          </div>

          {/* Angka utama */}
          {info && (
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
              <Stat ikon={LuUsers} label="Peserta" nilai={angka(info.total_baris)}
                bawah={<Selisih nilai={infoLalu ? info.total_baris - infoLalu.total_baris : null} />} />
              <Stat ikon={LuMapPin} label="Desa tercakup" nilai={cak ? `${angka(cak.desa_terdaftar)}/${angka(cak.total_desa)}` : angka(info.total_desa)}
                bawah={<span className="text-xs text-slate-500">{cak ? `${persen(cak.desa_terdaftar, cak.total_desa)} desa di Kab. Bogor` : ""}</span>} />
              <Stat ikon={LuWallet} label="Total upah dilaporkan" nilai={`Rp ${ringkas(info.total_upah)}`}
                bawah={<span className="text-xs text-slate-500">rata-rata Rp {angka(Math.round(Number(info.total_upah) / (info.total_baris || 1)))}/orang</span>} />
              <Stat ikon={LuUserPlus} label="Baru masuk" nilai={mutasi ? angka(mutasi.baru) : "-"}
                aktif={banding === "baru"}
                onClick={mutasi ? () => keTabel(() => setBanding("baru")) : undefined}
                bawah={<span className="text-xs text-slate-500">{mutasi ? "klik untuk lihat daftar" : "tidak ada pembanding"}</span>} />
              <Stat ikon={LuUserMinus} label="Keluar" nilai={mutasi ? angka(mutasi.keluar) : "-"}
                aktif={banding === "keluar"}
                onClick={mutasi ? () => keTabel(() => setBanding("keluar")) : undefined}
                bawah={<span className="text-xs text-slate-500">{mutasi ? "klik untuk lihat daftar" : "tidak ada pembanding"}</span>} />
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <Kartu judul="Tren peserta per bulan" keterangan="Hanya bulan yang sudah diimport. Klik batang untuk membuka bulan itu." className="lg:col-span-2">
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tren} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={C.grid} />
                    <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: C.netral }} tick={{ fontSize: 11, fill: "#475569" }} />
                    <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 11, fill: C.sumbu }} tickFormatter={ringkas} />
                    <Tooltip
                      cursor={{ fill: "#f1f5f9" }}
                      content={({ active, payload }) => active && payload?.[0] ? (
                        <TipKotak judul={bulanLabel(payload[0].payload.periode)} baris={[
                          ["Peserta", angka(payload[0].payload.peserta)],
                          ["Desa", angka(payload[0].payload.desa)],
                          ["Total upah", `Rp ${ringkas(payload[0].payload.upah)}`],
                        ]} />
                      ) : null}
                    />
                    <Bar dataKey="peserta" radius={[4, 4, 0, 0]} maxBarSize={48} cursor="pointer"
                      onClick={(d) => { setPeriode(d.periode); setPage(1); setBanding(""); }}>
                      {tren.map((t) => <Cell key={t.periode} fill={t.periode === periode ? C.seri : C.seriRedup} />)}
                      <LabelList dataKey="peserta" position="top" formatter={angka} style={{ fontSize: 11, fill: "#334155" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Kartu>

            <Kartu judul="Mutasi peserta" keterangan={sebelumnya ? `${bulanLabel(sebelumnya)} → ${bulanLabel(periode)}` : "Belum ada bulan pembanding"}>
              {mutasi && info ? (
                <AlurMutasi
                  sebelumnya={sebelumnya}
                  periode={periode}
                  tetap={info.total_baris - mutasi.baru}
                  keluar={mutasi.keluar}
                  baru={mutasi.baru}
                  onPilih={(b) => keTabel(() => setBanding(b))}
                />
              ) : (
                <p className="py-8 text-center text-xs text-slate-400">
                  {ringkasan ? "Import data bulan lain untuk melihat siapa yang masuk dan keluar." : "Memuat..."}
                </p>
              )}
            </Kartu>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Kartu
              judul="Peserta per kecamatan"
              keterangan="Klik batang untuk menyaring tabel ke kecamatan itu."
              className="lg:col-span-2"
              kanan={kec.length > 10 && (
                <button onClick={() => setSemuaKec((v) => !v)} className="shrink-0 text-xs font-medium text-blue-600 hover:underline">
                  {semuaKec ? "10 teratas" : `Semua ${kec.length}`}
                </button>
              )}
            >
              <div style={{ height: Math.max(200, kecTampil.length * 26 + 20) }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={kecTampil} layout="vertical" margin={{ top: 0, right: 48, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="kecamatan" width={130} tickLine={false} axisLine={false}
                      tick={{ fontSize: 11, fill: "#475569" }} interval={0} />
                    <Tooltip
                      cursor={{ fill: "#f1f5f9" }}
                      content={({ active, payload }) => active && payload?.[0] ? (
                        <TipKotak judul={payload[0].payload.kecamatan} baris={[
                          ["Peserta", angka(payload[0].payload.peserta)],
                          ["Desa", angka(payload[0].payload.desa)],
                          ["Porsi", persen(payload[0].payload.peserta, info?.total_baris)],
                        ]} />
                      ) : null}
                    />
                    <Bar dataKey="peserta" radius={[0, 4, 4, 0]} barSize={14} cursor="pointer"
                      onClick={(d) => d.kecamatan !== "Kode tidak dikenal" && keTabel(() => { setBanding(""); setCari(d.kecamatan); })}>
                      {kecTampil.map((k) => <Cell key={k.kecamatan} fill={k.kecamatan === "Kode tidak dikenal" ? C.netral : C.seri} />)}
                      <LabelList dataKey="peserta" position="right" formatter={angka} style={{ fontSize: 11, fill: "#334155" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Kartu>

            <div className="space-y-4">
              <Kartu judul="Usia peserta" keterangan={`Dihitung per 1 ${bulanLabel(periode)}`}>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={usia} margin={{ top: 18, right: 4, left: 4, bottom: 0 }}>
                      <XAxis dataKey="kelompok" tickLine={false} axisLine={{ stroke: C.netral }} tick={{ fontSize: 10, fill: "#475569" }} interval={0} />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ fill: "#f1f5f9" }}
                        content={({ active, payload }) => active && payload?.[0] ? (
                          <TipKotak judul={`Usia ${payload[0].payload.kelompok}`} baris={[
                            ["Peserta", angka(payload[0].payload.peserta)],
                            ["Porsi", persen(payload[0].payload.peserta, usiaTotal)],
                          ]} />
                        ) : null}
                      />
                      <Bar dataKey="peserta" fill={C.seri} radius={[4, 4, 0, 0]} maxBarSize={36}>
                        <LabelList dataKey="peserta" position="top" formatter={(v) => persen(v, usiaTotal)} style={{ fontSize: 10, fill: "#334155" }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Kartu>

              <Kartu judul="Cakupan desa">
                {cak ? (
                  <>
                    <div className="flex items-baseline justify-between text-xs text-slate-600">
                      <span><span className="text-lg font-bold tabular-nums text-slate-900">{angka(cak.desa_terdaftar)}</span> dari {angka(cak.total_desa)} desa</span>
                      <span className="font-semibold tabular-nums text-slate-900">{persen(cak.desa_terdaftar, cak.total_desa)}</span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100" role="meter"
                      aria-valuemin={0} aria-valuemax={cak.total_desa} aria-valuenow={cak.desa_terdaftar} aria-label="Cakupan desa">
                      <div className="h-full rounded-full" style={{ width: `${(cak.desa_terdaftar / (cak.total_desa || 1)) * 100}%`, background: C.seri }} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {cak.total_desa - cak.desa_terdaftar > 0
                        ? `${angka(cak.total_desa - cak.desa_terdaftar)} desa belum punya peserta bulan ini.`
                        : "Semua desa punya peserta bulan ini."}
                    </p>
                  </>
                ) : <p className="text-xs text-slate-400">Memuat...</p>}
              </Kartu>

              <Kartu judul="Kualitas data" keterangan="Baris Excel yang perlu dicek ke BPJS/desa">
                <ul className="space-y-1.5">
                  {cekKualitas.map((c) => (
                    <li key={c.label} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-1.5 text-slate-700">
                        {c.n > 0
                          ? <LuCircleAlert className="h-4 w-4 text-amber-600" aria-label="Perlu dicek" />
                          : <LuCircleCheck className="h-4 w-4 text-emerald-600" aria-label="Aman" />}
                        {c.label}
                      </span>
                      <span className={`font-semibold tabular-nums ${c.n > 0 ? "text-slate-900" : "text-slate-400"}`}>{angka(c.n)}</span>
                    </li>
                  ))}
                  {!kual && <li className="text-xs text-slate-400">Memuat...</li>}
                </ul>
              </Kartu>
            </div>
          </div>

          {/* Tabel peserta */}
          <section ref={tabelRef} className="scroll-mt-4 rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 p-3">
              <div className="flex rounded-lg bg-slate-100 p-0.5">
                {tabs.map((t) => (
                  <button
                    key={t.id || "semua"}
                    onClick={() => { setBanding(t.id); setPage(1); }}
                    disabled={Boolean(t.id && !sebelumnya)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 ${
                      banding === t.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="relative ml-auto w-full sm:w-72">
                <LuSearch className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  value={cari}
                  onChange={(e) => setCari(e.target.value)}
                  placeholder="Cari nama, NIK, KPJ, desa, kecamatan"
                  className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-8 text-sm"
                />
                {cari && (
                  <button onClick={() => setCari("")} className="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600" aria-label="Hapus pencarian">
                    <LuX className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {banding && sebelumnya && (
              <p className="border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {banding === "baru"
                  ? `Ada di ${bulanLabel(periode)}, tidak ada di ${bulanLabel(sebelumnya)}.`
                  : `Ada di ${bulanLabel(sebelumnya)}, tidak ada lagi di ${bulanLabel(periode)}. Data yang tampil dari ${bulanLabel(sebelumnya)}.`}
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50 text-left font-semibold text-slate-600">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Nama</th>
                    <th className="px-3 py-2">NIK</th>
                    <th className="px-3 py-2">KPJ</th>
                    <th className="px-3 py-2">Desa / Kecamatan</th>
                    <th className="px-3 py-2">Tgl lahir</th>
                    <th className="px-3 py-2 text-right">Upah</th>
                    <th className="px-3 py-2">BLTH</th>
                  </tr>
                </thead>
                <tbody className={`divide-y divide-slate-100 ${loading ? "opacity-50" : ""}`}>
                  {data?.rows.map((r, i) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 tabular-nums text-slate-400">{(page - 1) * LIMIT + i + 1}</td>
                      <td className="px-3 py-2 font-medium text-slate-900">{r.nama_lengkap || "-"}</td>
                      <td className="px-3 py-2 font-mono">{r.nik || "-"}</td>
                      <td className="px-3 py-2 font-mono">{r.kpj || "-"}</td>
                      <td className="px-3 py-2">
                        {r.desa_nama || <span className="text-amber-700">{r.desa_kode || "kode kosong"} (tidak dikenal)</span>}
                        {r.kecamatan_nama && <span className="block text-slate-400">{r.kecamatan_nama}</span>}
                      </td>
                      <td className="px-3 py-2">{r.tgl_lahir || "-"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{angka(r.upah)}</td>
                      <td className="px-3 py-2">{r.blth || "-"}</td>
                    </tr>
                  ))}
                  {data && data.rows.length === 0 && (
                    <tr><td colSpan={8} className="px-3 py-8 text-center text-slate-500">Tidak ada data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {data && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-3 py-2.5 text-xs text-slate-600">
                <span>
                  {angka(data.total)} peserta · total upah Rp {angka(data.totalUpah)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page <= 1 || loading}
                    className="rounded-lg border border-slate-300 p-1.5 disabled:opacity-40"
                    aria-label="Halaman sebelumnya"
                  >
                    <LuChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="tabular-nums">{page} / {totalHalaman}</span>
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= totalHalaman || loading}
                    className="rounded-lg border border-slate-300 p-1.5 disabled:opacity-40"
                    aria-label="Halaman berikutnya"
                  >
                    <LuChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default BpjsArsipPage;
