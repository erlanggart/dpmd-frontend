import React, { useEffect, useMemo, useState } from "react";
import { LuLoader, LuSearch, LuChevronDown, LuArrowUpRight } from "react-icons/lu";
import kelembagaanApi from "../../../api/kelembagaan";

// Urutan = urutan tampil. tingkat menentukan warna & prioritas pengurutan desa.
const MASALAH = {
  tanpa_produk_hukum: { label: "Belum punya produk hukum", satuan: "desa", tingkat: "berat", ket: "Desa belum mengunggah produk hukum apa pun" },
  tanpa_sk_kades: { label: "Belum punya SK Kepala Desa", satuan: "desa", tingkat: "berat", ket: "Ada produk hukum, tetapi belum ada Keputusan Kepala Desa" },
  tanpa_lembaga: { label: "Belum ada data lembaga", satuan: "desa", tingkat: "berat", ket: "Belum ada RW, RT, Posyandu, Karang Taruna, LPM, maupun PKK aktif" },
  ditolak: { label: "Lembaga ditolak", satuan: "lembaga", tingkat: "berat", ket: "Verifikasinya ditolak dan menunggu perbaikan desa" },
  tanpa_sk: { label: "Lembaga belum terhubung SK", satuan: "lembaga", tingkat: "sedang", ket: "Lembaga aktif yang belum dihubungkan ke produk hukum" },
  tanpa_pengurus: { label: "Lembaga tanpa pengurus", satuan: "lembaga", tingkat: "sedang", ket: "Lembaga aktif tanpa satu pun pengurus aktif" },
  tanpa_ketua: { label: "Lembaga tanpa ketua", satuan: "lembaga", tingkat: "sedang", ket: "Punya pengurus aktif, tetapi tidak ada yang berjabatan ketua" },
  belum_ada_lembaga: { label: "Jenis lembaga belum dibentuk", satuan: "jenis", tingkat: "sedang", ket: "Desa punya lembaga, tetapi ada jenis yang belum ada sama sekali" },
  ketua_ganda: { label: "Ketua lebih dari satu", satuan: "lembaga", tingkat: "ringan", ket: "Lembaga dengan lebih dari satu ketua aktif" },
  rw_tanpa_rt: { label: "RW tanpa RT", satuan: "RW", tingkat: "ringan", ket: "RW aktif yang tidak membawahi RT aktif" },
  pengurus_tanpa_sk: { label: "Pengurus belum terhubung SK", satuan: "pengurus", tingkat: "ringan", ket: "Pengurus aktif yang belum dihubungkan ke produk hukum" },
};
const KODE = Object.keys(MASALAH);

const WARNA = {
  berat: { chip: "bg-red-50 text-red-700 border-red-200", aktif: "ring-red-400 bg-red-50" },
  sedang: { chip: "bg-amber-50 text-amber-800 border-amber-200", aktif: "ring-amber-400 bg-amber-50" },
  ringan: { chip: "bg-slate-50 text-slate-700 border-slate-200", aktif: "ring-slate-400 bg-slate-100" },
};
const BOBOT = { berat: 100, sedang: 10, ringan: 1 };

const KOLOM_RINCIAN = [
  { key: "aktif", label: "Lembaga aktif" },
  { key: "tanpa_sk", label: "Belum terhubung SK", masalah: true },
  { key: "ditolak", label: "Ditolak", masalah: true },
  { key: "tanpa_pengurus", label: "Tanpa pengurus", masalah: true },
  { key: "tanpa_ketua", label: "Tanpa ketua", masalah: true },
  { key: "ketua_ganda", label: "Ketua ganda", masalah: true },
];

const skor = (d) => d.masalah.reduce((s, m) => s + BOBOT[MASALAH[m.kode]?.tingkat || "ringan"], 0);

const RincianDesa = ({ desa, lembaga, onDesaClick }) => (
  <div className="bg-slate-50 border-t border-slate-200 px-4 py-4 space-y-3">
    <div className="overflow-x-auto">
      <table className="w-full text-xs bg-white rounded-lg border border-slate-200">
        <thead>
          <tr className="text-slate-500 border-b border-slate-200">
            <th className="text-left font-medium px-3 py-2">Lembaga</th>
            {KOLOM_RINCIAN.map((k) => (
              <th key={k.key} className="text-right font-medium px-3 py-2">
                {k.label}
              </th>
            ))}
            <th className="text-right font-medium px-3 py-2">Pengurus belum terhubung SK</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {lembaga.map((l) => {
            const r = desa.lembaga[l.key];
            return (
              <tr key={l.key}>
                <td className="px-3 py-2 font-medium text-slate-800">{l.label}</td>
                {KOLOM_RINCIAN.map((k) => (
                  <td
                    key={k.key}
                    className={`px-3 py-2 text-right ${
                      k.masalah && r[k.key] > 0 ? "font-semibold text-red-600" : "text-slate-500"
                    }`}
                  >
                    {k.key === "aktif" && r.aktif === 0 ? <span className="text-amber-700">Belum ada</span> : r[k.key]}
                  </td>
                ))}
                <td className={`px-3 py-2 text-right ${r.pengurus_tanpa_sk > 0 ? "text-slate-800" : "text-slate-500"}`}>
                  {r.pengurus_tanpa_sk} / {r.pengurus}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
      <span>
        Produk hukum desa: {desa.produk_hukum.total} dokumen, {desa.produk_hukum.sk_kades} SK Kepala Desa
        {desa.rw_tanpa_rt > 0 && ` · ${desa.rw_tanpa_rt} RW tanpa RT`}
      </span>
      {onDesaClick && (
        <button
          type="button"
          onClick={() => onDesaClick(desa.id)}
          className="flex items-center gap-1 font-semibold text-indigo-700 hover:underline"
        >
          Buka data kelembagaan desa <LuArrowUpRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  </div>
);

const PermasalahanDesa = ({ onDesaClick }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState(null);
  const [cari, setCari] = useState("");
  const [kecamatan, setKecamatan] = useState("");
  const [terbuka, setTerbuka] = useState(null);

  useEffect(() => {
    kelembagaanApi
      .getPermasalahanDesa()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Gagal memuat permasalahan desa"));
  }, []);

  const rekap = useMemo(() => {
    const r = Object.fromEntries(KODE.map((k) => [k, { desa: 0, jumlah: 0 }]));
    data?.desa.forEach((d) =>
      d.masalah.forEach((m) => {
        if (!r[m.kode]) return;
        r[m.kode].desa++;
        r[m.kode].jumlah += m.jumlah;
      })
    );
    return r;
  }, [data]);

  const kecamatanList = useMemo(() => {
    const map = new Map();
    data?.desa.forEach((d) => d.kecamatan_id && map.set(d.kecamatan_id, d.kecamatan));
    return [...map].sort((a, b) => a[1].localeCompare(b[1]));
  }, [data]);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = cari.trim().toLowerCase();
    const jumlahFilter = (d) => d.masalah.find((m) => m.kode === filter)?.jumlah || 0;
    return data.desa
      .filter(
        (d) =>
          (!q || d.nama.toLowerCase().includes(q)) &&
          (!kecamatan || d.kecamatan_id === kecamatan) &&
          (!filter || jumlahFilter(d) > 0)
      )
      .sort((a, b) => (filter ? jumlahFilter(b) - jumlahFilter(a) : 0) || skor(b) - skor(a) || a.nama.localeCompare(b.nama));
  }, [data, cari, kecamatan, filter]);

  if (error) {
    return <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-sm text-red-600">{error}</div>;
  }
  if (!data) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 flex items-center justify-center gap-2 text-slate-500">
        <LuLoader className="h-5 w-5 animate-spin" />
        <span className="text-sm">Memeriksa data desa...</span>
      </div>
    );
  }

  const pilihan = "border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white";

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-lg font-bold text-slate-900">Permasalahan Data Desa</h3>
        <p className="text-sm text-slate-500 mb-4">
          {data.desa.length} dari {data.total_desa} desa memiliki minimal satu permasalahan. Klik kartu untuk
          menyaring desa.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {KODE.map((kode) => {
            const m = MASALAH[kode];
            const r = rekap[kode];
            const aktif = filter === kode;
            return (
              <button
                key={kode}
                type="button"
                onClick={() => setFilter(aktif ? null : kode)}
                aria-pressed={aktif}
                disabled={r.desa === 0}
                title={m.ket}
                className={`text-left rounded-lg border p-3 transition-all disabled:opacity-50 ${
                  aktif ? `ring-2 ${WARNA[m.tingkat].aktif} border-transparent` : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      m.tingkat === "berat" ? "bg-red-500" : m.tingkat === "sedang" ? "bg-amber-500" : "bg-slate-400"
                    }`}
                  />
                  <span className="text-xs font-medium text-slate-600">{m.label}</span>
                </div>
                <div className="mt-1.5 text-xl font-bold text-slate-900">
                  {r.desa.toLocaleString("id-ID")} <span className="text-sm font-normal text-slate-500">desa</span>
                </div>
                {m.satuan !== "desa" && (
                  <div className="text-xs text-slate-500">
                    {r.jumlah.toLocaleString("id-ID")} {m.satuan}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{rows.length}</span> desa
            {filter && (
              <>
                {" "}dengan masalah <span className="font-semibold">{MASALAH[filter].label.toLowerCase()}</span>
                <button type="button" onClick={() => setFilter(null)} className="ml-2 text-indigo-700 hover:underline">
                  Hapus saringan
                </button>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Cari desa..."
                aria-label="Cari desa"
                className={`${pilihan} pl-9`}
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
          </div>
        </div>

        <div className="border border-slate-200 rounded-lg divide-y divide-slate-200 max-h-[75vh] overflow-y-auto">
          {rows.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-8">Tidak ada desa yang cocok dengan saringan.</p>
          )}
          {rows.map((d) => {
            const buka = terbuka === d.id;
            return (
              <div key={d.id}>
                <button
                  type="button"
                  onClick={() => setTerbuka(buka ? null : d.id)}
                  aria-expanded={buka}
                  className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-start gap-3"
                >
                  <div className="w-48 shrink-0">
                    <div className="font-medium text-slate-800">{d.nama}</div>
                    <div className="text-xs text-slate-400">
                      Kec. {d.kecamatan}
                      {d.status_pemerintahan === "kelurahan" && " · Kelurahan"}
                    </div>
                  </div>
                  <div className="flex-1 flex flex-wrap gap-1.5">
                    {KODE.map((kode) => {
                      const m = d.masalah.find((x) => x.kode === kode);
                      if (!m) return null;
                      const def = MASALAH[kode];
                      const rincian = m.rincian.map((r) => (def.satuan === "jenis" ? r.label : `${r.label} ${r.jumlah}`)).join(", ");
                      return (
                        <span
                          key={kode}
                          title={rincian || def.ket}
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs ${
                            WARNA[def.tingkat].chip
                          } ${filter === kode ? "ring-1 ring-current" : ""}`}
                        >
                          {def.label}
                          {def.satuan === "jenis" ? `: ${rincian}` : def.satuan !== "desa" && <b>{m.jumlah}</b>}
                        </span>
                      );
                    })}
                  </div>
                  <LuChevronDown className={`w-4 h-4 mt-1 shrink-0 text-slate-400 transition-transform ${buka ? "rotate-180" : ""}`} />
                </button>
                {buka && <RincianDesa desa={d} lembaga={data.lembaga} onDesaClick={onDesaClick} />}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-3">
          Hanya lembaga & pengurus berstatus aktif yang diperiksa. Ketua dikenali dari jabatan berawalan "Ketua" (tidak
          termasuk Ketua Bidang/Pokja). Produk hukum desa tidak diperiksa untuk kelurahan.
        </p>
      </div>
    </div>
  );
};

export default PermasalahanDesa;
