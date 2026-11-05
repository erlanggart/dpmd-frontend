import React, { useCallback, useMemo, useState } from "react";
import TombolEkspor from "../../shared/TombolEkspor";
import BarCapaian from "./BarCapaian";
import ToggleMode from "./ToggleMode";
import { MODE, WARNA_LEMBAGA, angkaCapaian, persen } from "./warnaLembaga";

// Kecamatan dijumlahkan dari data per desa yang sudah dimuat halaman, jadi tab ini
// tidak perlu endpoint tersendiri. mode = "lembaga" | "pengurus".
const kumpulkan = (desa, jenis, mode) => {
  const map = new Map();
  desa.forEach((d) => {
    const id = d.kecamatan_id || "-";
    let k = map.get(id);
    if (!k) {
      k = {
        id,
        nama: d.kecamatan || "(tanpa kecamatan)",
        jumlah_desa: 0,
        desa_tuntas: 0,
        desa_punya: 0,
        verified: 0,
        total: 0,
        per: Object.fromEntries(jenis.map((l) => [l.key, { verified: 0, total: 0, tuntas: 0, punya: 0 }])),
      };
      map.set(id, k);
    }
    const agg = angkaCapaian(d, mode);
    k.jumlah_desa++;
    k.verified += agg.verified;
    k.total += agg.total;
    if (agg.total > 0) {
      k.desa_punya++;
      if (agg.verified === agg.total) k.desa_tuntas++;
    }
    jenis.forEach((l) => {
      const s = angkaCapaian(d, mode, l.key);
      const t = k.per[l.key];
      t.verified += s.verified;
      t.total += s.total;
      if (s.total > 0) {
        t.punya++;
        if (s.verified === s.total) t.tuntas++;
      }
    });
  });
  return [...map.values()];
};

// Warna batang menurut capaian, bukan menurut kecamatan: yang dicari pembaca
// adalah siapa yang merah, bukan siapa yang biru.
const warnaCapaian = (p) =>
  p === 100 ? "#16a34a" : p >= 75 ? "#65a30d" : p >= 50 ? "#f59e0b" : p > 0 ? "#f97316" : "#dc2626";

const Kartu = ({ label, nilai, keterangan, kelas = "text-slate-900" }) => (
  <div className="rounded-xl bg-slate-50 px-4 py-3">
    <div className="text-xs font-medium text-slate-500">{label}</div>
    <div className={`text-xl font-bold mt-0.5 ${kelas}`}>{nilai}</div>
    {keterangan && <div className="text-xs text-slate-400 mt-0.5 truncate">{keterangan}</div>}
  </div>
);

// Batang mengikuti gaya tabel Capaian per Lembaga: track bulat + isi berwarna + persen di kanan.
const BarisCapaian = ({ no, nama, keterangan, verified, total, warna }) => {
  const p = persen(verified, total);
  const kosong = total === 0;
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="w-6 shrink-0 text-right text-xs text-slate-400">{no}</span>
      <div className="w-32 sm:w-44 shrink-0 min-w-0">
        <div className="text-sm font-medium text-slate-800 truncate">{nama}</div>
        {keterangan && <div className="text-xs text-slate-400 truncate">{keterangan}</div>}
      </div>
      <BarCapaian persen={kosong ? 0 : p} warna={warna || warnaCapaian(p)} />
      <span
        className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums"
        style={{ color: kosong ? "#94a3b8" : warna || warnaCapaian(p) }}
      >
        {kosong ? "—" : `${p}%`}
      </span>
      <span className="w-20 shrink-0 text-right text-xs tabular-nums text-slate-500">
        {kosong ? "tanpa data" : `${verified}/${total}`}
      </span>
    </div>
  );
};

const CapaianPerKecamatan = ({ data }) => {
  const [lembaga, setLembaga] = useState("semua");
  const [mode, setMode] = useState("lembaga");
  const satuan = MODE[mode].satuan;

  const semua = useMemo(() => kumpulkan(data.desa, data.lembaga, mode), [data, mode]);
  const angka = useCallback((k) => (lembaga === "semua" ? k : k.per[lembaga]), [lembaga]);

  // Satu urutan saja (capaian tertinggi ke terendah): daftar peringkat yang bisa
  // diurutkan sembarang tidak lagi bercerita apa pun.
  const rows = useMemo(() => {
    const p = (k) => (angka(k).total ? angka(k).verified / angka(k).total : -1);
    return [...semua].sort((a, b) => p(b) - p(a) || angka(b).total - angka(a).total);
  }, [semua, angka]);

  const ringkas = useMemo(() => {
    const berdata = rows.filter((k) => angka(k).total > 0);
    const verified = berdata.reduce((s, k) => s + angka(k).verified, 0);
    const total = berdata.reduce((s, k) => s + angka(k).total, 0);
    return {
      jumlah: rows.length,
      berdata: berdata.length,
      tuntas: berdata.filter((k) => angka(k).verified === angka(k).total).length,
      nol: berdata.filter((k) => angka(k).verified === 0).length,
      capaian: persen(verified, total),
      verified,
      total,
      desa_tuntas: rows.reduce((s, k) => s + k.desa_tuntas, 0),
      desa_punya: rows.reduce((s, k) => s + k.desa_punya, 0),
    };
  }, [rows, angka]);

  const labelLembaga =
    lembaga === "semua" ? "semua lembaga" : data.lembaga.find((l) => l.key === lembaga)?.label || lembaga;

  // Tiap jenis lembaga jadi kolom terverifikasi + total + persen, sama seperti
  // ekspor per desa, supaya bisa dijumlahkan/dipivot di Excel.
  const kolomEkspor = useMemo(() => {
    const kolom = [
      { label: "Kecamatan", nilai: (k) => k.nama },
      { label: "Jumlah Desa/Kelurahan", nilai: (k) => k.jumlah_desa },
    ];
    data.lembaga.forEach((l) => {
      kolom.push({ label: `${l.label} Terverifikasi`, nilai: (k) => k.per[l.key].verified });
      kolom.push({ label: `${l.label} Total`, nilai: (k) => k.per[l.key].total });
      kolom.push({
        label: `${l.label} (%)`,
        nilai: (k) => (k.per[l.key].total ? persen(k.per[l.key].verified, k.per[l.key].total) : ""),
      });
    });
    kolom.push(
      { label: "Total Terverifikasi", nilai: (k) => k.verified },
      { label: `Total ${MODE[mode].label}`, nilai: (k) => k.total },
      { label: "Capaian (%)", nilai: (k) => (k.total ? persen(k.verified, k.total) : "") },
      { label: "Desa Tuntas", nilai: (k) => k.desa_tuntas },
      { label: "Desa Punya Lembaga", nilai: (k) => k.desa_punya }
    );
    return kolom;
  }, [data.lembaga, mode]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Capaian Verifikasi per Kecamatan</h3>
          <p className="text-sm text-slate-500">
            Peringkat capaian {satuan} seluruh desa di tiap kecamatan · acuan: {labelLembaga}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleMode mode={mode} onChange={setMode} />
          <select
            value={lembaga}
            onChange={(e) => setLembaga(e.target.value)}
            aria-label="Lembaga acuan"
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="semua">Semua lembaga</option>
            {data.lembaga.map((l) => (
              <option key={l.key} value={l.key}>
                {l.label}
              </option>
            ))}
          </select>
          <TombolEkspor
            kolom={kolomEkspor}
            baris={rows}
            namaBerkas={`capaian-verifikasi-${mode}-per-kecamatan`}
            judul={`Capaian Verifikasi ${MODE[mode].label} per Kecamatan`}
            subjudul={`${rows.length} kecamatan · ${ringkas.capaian}% ${satuan} terverifikasi (acuan: ${labelLembaga})`}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kartu
          label="Capaian kabupaten"
          nilai={`${ringkas.capaian}%`}
          keterangan={`${ringkas.verified.toLocaleString("id-ID")} dari ${ringkas.total.toLocaleString("id-ID")} ${satuan}`}
          kelas="text-indigo-700"
        />
        <Kartu label="Kecamatan" nilai={ringkas.jumlah} keterangan={`${ringkas.berdata} ada datanya`} />
        <Kartu label="Kecamatan tuntas" nilai={ringkas.tuntas} keterangan="capaian 100%" kelas="text-green-700" />
        <Kartu
          label="Belum tersentuh"
          nilai={ringkas.nol}
          keterangan="capaian 0%"
          kelas={ringkas.nol ? "text-red-600" : "text-slate-900"}
        />
        <Kartu
          label="Desa tuntas"
          nilai={ringkas.desa_tuntas}
          keterangan={`dari ${ringkas.desa_punya} desa yang ada datanya`}
          kelas="text-indigo-700"
        />
      </div>

      <div>
        <div className="flex items-end justify-between gap-3 mb-1">
          <div className="text-sm font-semibold text-slate-700">
            Persentase {satuan} terverifikasi per kecamatan
          </div>
          <div className="text-xs text-slate-400">urut dari capaian tertinggi</div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 xl:gap-x-8">
          {rows.map((k, i) => (
            <div key={k.id} className="border-b border-slate-100">
              <BarisCapaian
                no={i + 1}
                nama={k.nama}
                keterangan={`${k.desa_tuntas}/${k.desa_punya} desa tuntas · ${k.jumlah_desa} desa`}
                warna={lembaga === "semua" ? undefined : WARNA_LEMBAGA[lembaga]}
                {...angka(k)}
              />
            </div>
          ))}
        </div>
        <div className="border-t-2 border-slate-200 mt-1">
          <BarisCapaian
            no=""
            nama="Kabupaten Bogor"
            keterangan={`${ringkas.berdata} kecamatan ada datanya`}
            verified={ringkas.verified}
            total={ringkas.total}
            warna="#334155"
          />
        </div>
      </div>

      <p className="text-xs text-slate-400">
        Warna batang mengikuti capaian: hijau 100%, hijau muda ≥75%, kuning ≥50%, oranye &lt;50%, merah 0%. Angka
        rinci per jenis lembaga ada di berkas ekspor. Mode Pengurus hanya menghitung pengurus berstatus aktif
        pada lembaga aktif.
      </p>
    </div>
  );
};

export default CapaianPerKecamatan;
