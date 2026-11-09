import React, { useEffect, useMemo, useState } from "react";
import kelembagaanApi from "../../api/kelembagaan";
import ToggleMode from "./capaian/ToggleMode";
import BarCapaian from "./capaian/BarCapaian";
import { MODE, angkaCapaian, persen } from "./capaian/warnaLembaga";

// Jumlah lembaga aktif (atau pengurus aktif di lembaga aktif) yang sudah terverifikasi,
// dijumlahkan per kecamatan dari data per desa. status: "desa" | "kelurahan"; kosong = semua.
const JumlahPerKecamatan = ({ status }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("lembaga");
  const [lembaga, setLembaga] = useState("");

  useEffect(() => {
    kelembagaanApi
      .getCapaianVerifikasiPerDesa()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Gagal memuat data per kecamatan"));
  }, []);

  const rows = useMemo(() => {
    if (!data) return [];
    const map = new Map();
    data.desa.forEach((d) => {
      if (status && d.status_pemerintahan !== status) return;
      const id = d.kecamatan_id || "-";
      const k = map.get(id) || { id, nama: d.kecamatan || "(tanpa kecamatan)", verified: 0, total: 0 };
      const a = angkaCapaian(d, mode, lembaga || undefined);
      k.verified += a.verified;
      k.total += a.total;
      map.set(id, k);
    });
    return [...map.values()].sort((a, b) => b.verified - a.verified || a.nama.localeCompare(b.nama));
  }, [data, status, mode, lembaga]);

  const totalVerified = rows.reduce((s, k) => s + k.verified, 0);
  const total = rows.reduce((s, k) => s + k.total, 0);
  const labelLembaga = data?.lembaga.find((l) => l.key === lembaga)?.label;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 xl:sticky xl:top-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Per Kecamatan</h3>
          <p className="text-sm text-slate-500">
            {labelLembaga ? `${MODE[mode].label} ${labelLembaga}` : MODE[mode].label} terverifikasi & aktif
          </p>
        </div>
        <ToggleMode mode={mode} onChange={setMode} />
      </div>

      <select
        value={lembaga}
        onChange={(e) => setLembaga(e.target.value)}
        disabled={!data}
        aria-label="Pilih lembaga"
        className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
      >
        <option value="">Semua lembaga</option>
        {data?.lembaga.map((l) => (
          <option key={l.key} value={l.key}>
            {l.label}
          </option>
        ))}
      </select>

      {error ? (
        <p className="mt-4 text-sm text-red-600">{error}</p>
      ) : !data ? (
        <div className="mt-4 space-y-2 animate-pulse">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded" />
          ))}
        </div>
      ) : (
        <>
          <Baris nama="Kabupaten Bogor" verified={totalVerified} total={total} tebal />
          <ol className="max-h-[70vh] overflow-y-auto pr-1">
            {rows.map((k) => (
              <li key={k.id}>
                <Baris nama={k.nama} verified={k.verified} total={k.total} />
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
};

// Kiri: nama, angka terverifikasi + badge persen, batang. Kanan: total.
const Baris = ({ nama, verified, total, tebal }) => {
  const p = persen(verified, total);
  return (
    <div className={`flex items-center gap-4 py-3 border-b ${tebal ? "border-slate-300" : "border-slate-100"}`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`flex-1 min-w-0 truncate text-sm ${tebal ? "font-bold text-slate-900" : "font-medium text-slate-700"}`}>
            {nama}
          </span>
          <span className="text-sm font-semibold tabular-nums text-slate-900">
            {verified.toLocaleString("id-ID")}
          </span>
          <span className="w-12 shrink-0 rounded-md border border-blue-200 bg-blue-50 py-0.5 text-center text-xs font-semibold tabular-nums text-blue-700">
            {p}%
          </span>
        </div>
        <div className="flex">
          <BarCapaian persen={p} warna="#2563eb" tinggi="h-2" />
        </div>
      </div>
      <span
        className={`w-20 shrink-0 text-right tabular-nums text-slate-900 ${tebal ? "text-2xl font-bold" : "text-xl font-semibold"}`}
      >
        {total.toLocaleString("id-ID")}
      </span>
    </div>
  );
};

export default JumlahPerKecamatan;
