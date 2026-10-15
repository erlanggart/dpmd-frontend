import React, { useMemo, useState } from "react";
import { LuSearch } from "react-icons/lu";
import TombolEkspor from "../../shared/TombolEkspor";
import { persen } from "./warnaLembaga";

const STATUS_FILTER = [
  { value: "semua", label: "Semua status" },
  { value: "belum", label: "Belum ada yang diverifikasi" },
  { value: "sebagian", label: "Sebagian terverifikasi" },
  { value: "tuntas", label: "Tuntas 100%" },
  { value: "kosong", label: "Belum ada lembaga" },
];

// Label pendek untuk sel berkas ekspor; STATUS_FILTER terlalu panjang sebagai isi kolom.
const LABEL_STATUS = {
  tuntas: "Tuntas",
  sebagian: "Sebagian",
  belum: "Belum diverifikasi",
  kosong: "Belum ada lembaga",
};

const URUTAN = [
  { value: "persen-desc", label: "Persentase tertinggi" },
  { value: "persen-asc", label: "Persentase terendah" },
  { value: "belum-desc", label: "Sisa belum diverifikasi terbanyak" },
  { value: "nama", label: "Kecamatan & nama desa" },
];

// Warna sel menurut capaian
const kelasCapaian = (verified, total) => {
  if (total === 0) return "text-slate-300";
  const p = persen(verified, total);
  if (p === 100) return "bg-green-50 text-green-700";
  if (p >= 50) return "bg-amber-50 text-amber-700";
  if (p > 0) return "bg-orange-50 text-orange-700";
  return "bg-red-50 text-red-600";
};

const SelCapaian = ({ verified, total }) => (
  <td className="px-1.5 py-1.5">
    <div className={`rounded-md px-2 py-1 text-center text-xs whitespace-nowrap ${kelasCapaian(verified, total)}`}>
      {total === 0 ? (
        "—"
      ) : (
        <>
          <div className="font-semibold">{persen(verified, total)}%</div>
          <div className="opacity-75">
            {verified}/{total}
          </div>
        </>
      )}
    </div>
  </td>
);

const statusDesa = (d, key) => {
  const { verified, total } = key === "semua" ? d : d.lembaga[key];
  if (total === 0) return "kosong";
  if (verified === 0) return "belum";
  return verified === total ? "tuntas" : "sebagian";
};

const CapaianPerDesa = ({ data, onDesaClick }) => {
  const [cari, setCari] = useState("");
  const [kecamatan, setKecamatan] = useState("");
  const [lembaga, setLembaga] = useState("semua");
  const [status, setStatus] = useState("semua");
  const [urutan, setUrutan] = useState("persen-desc");

  const kecamatanList = useMemo(() => {
    const map = new Map();
    data.desa.forEach((d) => d.kecamatan_id && map.set(d.kecamatan_id, d.kecamatan));
    return [...map].sort((a, b) => a[1].localeCompare(b[1]));
  }, [data]);

  const rows = useMemo(() => {
    const q = cari.trim().toLowerCase();
    const angka = (d) => (lembaga === "semua" ? d : d.lembaga[lembaga]);
    const hasil = data.desa.filter(
      (d) =>
        (!q || d.nama.toLowerCase().includes(q)) &&
        (!kecamatan || d.kecamatan_id === kecamatan) &&
        (status === "semua" || statusDesa(d, lembaga) === status)
    );
    const p = (d) => (angka(d).total ? angka(d).verified / angka(d).total : -1);
    const sorter = {
      "persen-desc": (a, b) => p(b) - p(a) || angka(b).verified - angka(a).verified,
      "persen-asc": (a, b) => p(a) - p(b) || angka(b).total - angka(a).total,
      "belum-desc": (a, b) => angka(b).total - angka(b).verified - (angka(a).total - angka(a).verified),
      nama: (a, b) => (a.kecamatan || "").localeCompare(b.kecamatan || "") || a.nama.localeCompare(b.nama),
    }[urutan];
    return [...hasil].sort(sorter);
  }, [data, cari, kecamatan, lembaga, status, urutan]);

  const ringkas = useMemo(() => {
    const r = { tuntas: 0, sebagian: 0, belum: 0, kosong: 0 };
    rows.forEach((d) => r[statusDesa(d, lembaga)]++);
    return r;
  }, [rows, lembaga]);

  const labelLembaga =
    lembaga === "semua" ? "semua lembaga" : data.lembaga.find((l) => l.key === lembaga)?.label || lembaga;

  // Tiap jenis lembaga jadi dua kolom (terverifikasi & total), bukan satu kolom
  // "3/5": angka yang digabung jadi teks tidak bisa dijumlahkan maupun
  // dijadikan pivot di Excel, dan itu alasan orang memintanya.
  const kolomEkspor = useMemo(() => {
    const kolom = [
      { label: "Kecamatan", nilai: (d) => d.kecamatan },
      { label: "Desa/Kelurahan", nilai: (d) => d.nama },
      { label: "Status", nilai: (d) => (d.status_pemerintahan === "kelurahan" ? "Kelurahan" : "Desa") },
    ];
    data.lembaga.forEach((l) => {
      kolom.push({ label: `${l.label} Terverifikasi`, nilai: (d) => d.lembaga[l.key].verified });
      kolom.push({ label: `${l.label} Total`, nilai: (d) => d.lembaga[l.key].total });
      kolom.push({
        label: `${l.label} (%)`,
        nilai: (d) => (d.lembaga[l.key].total ? persen(d.lembaga[l.key].verified, d.lembaga[l.key].total) : ""),
      });
    });
    kolom.push(
      { label: "Total Terverifikasi", nilai: (d) => d.verified },
      { label: "Total Lembaga", nilai: (d) => d.total },
      { label: "Capaian (%)", nilai: (d) => (d.total ? persen(d.verified, d.total) : "") },
      { label: `Status Capaian (${labelLembaga})`, nilai: (d) => LABEL_STATUS[statusDesa(d, lembaga)] },
    );
    return kolom;
  }, [data.lembaga, lembaga, labelLembaga]);

  // Penyaring aktif ditulis ke berkas supaya lampiran yang beredar tidak
  // disalahpahami sebagai data seluruh kabupaten.
  const subjudulEkspor = [
    kecamatan ? `Kecamatan ${kecamatanList.find(([id]) => id === kecamatan)?.[1] || kecamatan}` : "Seluruh kecamatan",
    `Lembaga acuan: ${labelLembaga}`,
    `Status: ${STATUS_FILTER.find((s) => s.value === status)?.label}`,
    cari.trim() && `Pencarian: "${cari.trim()}"`,
  ]
    .filter(Boolean)
    .join(" · ");

  const pilihan = "border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white";

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Capaian Verifikasi per Desa</h3>
          <p className="text-sm text-slate-500">
            Persentase lembaga terverifikasi di tiap desa, dirinci per jenis lembaga
            {onDesaClick && ". Klik nama desa untuk membuka data kelembagaannya"}.
          </p>
        </div>
        <TombolEkspor
          kolom={kolomEkspor}
          baris={rows}
          namaBerkas="capaian-verifikasi-per-desa"
          judul="Capaian Verifikasi per Desa"
          subjudul={subjudulEkspor}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-3">
        <div className="relative lg:col-span-1">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari desa..."
            aria-label="Cari desa"
            className={`${pilihan} w-full pl-9`}
          />
        </div>
        <select value={kecamatan} onChange={(e) => setKecamatan(e.target.value)} aria-label="Kecamatan" className={pilihan}>
          <option value="">Semua kecamatan</option>
          {kecamatanList.map(([id, nama]) => (
            <option key={id} value={id}>
              {nama}
            </option>
          ))}
        </select>
        <select value={lembaga} onChange={(e) => setLembaga(e.target.value)} aria-label="Lembaga acuan" className={pilihan}>
          <option value="semua">Semua lembaga</option>
          {data.lembaga.map((l) => (
            <option key={l.key} value={l.key}>
              {l.label}
            </option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status capaian" className={pilihan}>
          {STATUS_FILTER.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select value={urutan} onChange={(e) => setUrutan(e.target.value)} aria-label="Urutan" className={pilihan}>
          {URUTAN.map((u) => (
            <option key={u.value} value={u.value}>
              {u.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mb-3">
        <span>{rows.length} desa</span>
        <span className="text-green-700">{ringkas.tuntas} tuntas</span>
        <span className="text-amber-700">{ringkas.sebagian} sebagian</span>
        <span className="text-red-600">{ringkas.belum} belum diverifikasi</span>
        <span>{ringkas.kosong} tanpa lembaga</span>
      </div>

      <div className="overflow-auto max-h-[70vh] border border-slate-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50">
            <tr className="text-xs text-slate-600">
              <th className="text-left font-semibold px-3 py-2 w-10">No</th>
              <th className="text-left font-semibold px-3 py-2 min-w-[180px]">Desa</th>
              {data.lembaga.map((l) => (
                <th
                  key={l.key}
                  className={`text-center font-semibold px-1.5 py-2 ${lembaga === l.key ? "text-indigo-700" : ""}`}
                >
                  {l.label}
                </th>
              ))}
              <th className="text-center font-semibold px-1.5 py-2">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((d, i) => (
              <tr key={d.id} className="hover:bg-slate-50/60">
                <td className="px-3 py-1.5 text-xs text-slate-400">{i + 1}</td>
                <td className="px-3 py-1.5">
                  {onDesaClick ? (
                    <button
                      type="button"
                      onClick={() => onDesaClick(d.id)}
                      className="font-medium text-slate-800 hover:text-indigo-700 hover:underline text-left"
                    >
                      {d.nama}
                    </button>
                  ) : (
                    <span className="font-medium text-slate-800">{d.nama}</span>
                  )}
                  <div className="text-xs text-slate-400">
                    Kec. {d.kecamatan}
                    {d.status_pemerintahan === "kelurahan" && " · Kelurahan"}
                  </div>
                </td>
                {data.lembaga.map((l) => (
                  <SelCapaian key={l.key} {...d.lembaga[l.key]} />
                ))}
                <SelCapaian verified={d.verified} total={d.total} />
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={data.lembaga.length + 3} className="text-center text-sm text-slate-500 py-8">
                  Tidak ada desa yang cocok dengan filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CapaianPerDesa;
