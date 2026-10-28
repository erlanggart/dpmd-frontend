import React, { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { LuChevronDown, LuChevronLeft, LuChevronRight, LuChevronsLeft, LuChevronsRight, LuLoader } from "react-icons/lu";
import kelembagaanApi from "../../../api/kelembagaan";
import { persen } from "./warnaLembaga";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const formatTanggal = (iso, opsi = { day: "numeric", month: "short" }) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("id-ID", opsi);

const angka = (n) => n.toLocaleString("id-ID");

const warnaBar = (p) => (p === 100 ? "bg-green-500" : p >= 75 ? "bg-emerald-500" : p >= 50 ? "bg-amber-500" : "bg-red-500");

const Statistik = ({ label, nilai, keterangan }) => (
  <div className="rounded-lg bg-slate-50 px-4 py-3">
    <div className="text-xs text-slate-500">{label}</div>
    <div className="text-lg font-bold text-slate-900">{nilai}</div>
    {keterangan && <div className="text-xs text-slate-400">{keterangan}</div>}
  </div>
);

// Garis vertikal penanda hari yang dipilih
const penandaHari = {
  id: "penandaHari",
  afterDatasetsDraw(chart, _args, opsi) {
    if (opsi.index == null) return;
    const x = chart.scales.x.getPixelForValue(opsi.index);
    const { top, bottom } = chart.chartArea;
    const ctx = chart.ctx;
    ctx.save();
    ctx.strokeStyle = "#e11d48";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(x, bottom);
    ctx.stroke();
    ctx.restore();
  },
};

const KartuKecamatan = ({ kec, sampai, terbuka, onToggle, onDesaClick }) => {
  const sudah = (d) => d.tanggal_masuk && d.tanggal_masuk <= sampai;
  const masuk = kec.desa.filter(sudah).length;
  const p = persen(masuk, kec.desa.length);
  return (
    <div className="border border-slate-200 rounded-lg bg-white">
      <button type="button" onClick={onToggle} aria-expanded={terbuka} className="w-full text-left p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="font-semibold text-sm text-slate-800 truncate">{kec.nama}</span>
          <LuChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${terbuka ? "rotate-180" : ""}`} />
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className={`h-full rounded-full ${warnaBar(p)}`} style={{ width: `${p}%` }} />
          </div>
          <span className="text-xs font-semibold text-slate-700 w-9 text-right">{p}%</span>
        </div>
        <div className="text-xs text-slate-500 mt-1">
          {masuk}/{kec.desa.length} desa sudah masuk
        </div>
      </button>
      {terbuka && (
        <ul className="border-t border-slate-100 max-h-72 overflow-y-auto divide-y divide-slate-50">
          {kec.desa.map((d) => (
            <li key={d.id} className="px-3 py-1.5 text-xs flex items-start gap-2">
              <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${sudah(d) ? "bg-green-500" : "bg-slate-300"}`} />
              <div className="min-w-0 flex-1">
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
                <div className="text-slate-400">
                  {d.tanggal_masuk
                    ? `Masuk ${formatTanggal(d.tanggal_masuk, { day: "numeric", month: "short", year: "numeric" })}`
                    : d.lembaga
                      ? "Belum ada pengurus"
                      : "Belum ada data"}
                  {" · "}
                  {angka(d.lembaga)} lembaga · {angka(d.pengurus)} pengurus
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const CapaianDataMasuk = ({ onDesaClick }) => {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [terbuka, setTerbuka] = useState(() => new Set());
  const [hariDipilih, setHariDipilih] = useState(null); // indeks tanggal; null = hari ini

  useEffect(() => {
    kelembagaanApi
      .getCapaianDataMasuk()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || "Gagal memuat capaian data masuk"));
  }, []);

  const kecamatan = useMemo(() => {
    if (!data) return [];
    const map = new Map();
    data.desa.forEach((d) => {
      if (!d.kecamatan_id) return;
      if (!map.has(d.kecamatan_id)) map.set(d.kecamatan_id, { id: d.kecamatan_id, nama: d.kecamatan, desa: [] });
      map.get(d.kecamatan_id).desa.push(d);
    });
    return [...map.values()].sort((a, b) => a.nama.localeCompare(b.nama));
  }, [data]);

  if (error) return <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-sm text-red-600">{error}</div>;
  if (!data)
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-10 flex items-center justify-center gap-2 text-slate-500">
        <LuLoader className="h-5 w-5 animate-spin" />
        <span className="text-sm">Memuat capaian data masuk...</span>
      </div>
    );

  const akhir = data.tanggal.length - 1;
  const n = hariDipilih ?? akhir;
  const sampai = data.tanggal[n];
  const labelHari = formatTanggal(sampai, { day: "numeric", month: "long", year: "numeric" });
  const totalDesa = data.desa.length;
  const pilihHari = (i) => setHariDipilih(i >= akhir ? null : Math.max(0, i));
  // Hari ada desa baru masuk = hari progress bar kecamatan berubah
  const adaMasuk = (i) => data.desa_masuk[i] > (i > 0 ? data.desa_masuk[i - 1] : 0);
  let masukSebelum = -1;
  for (let i = n - 1; i >= 0; i--) if (adaMasuk(i)) { masukSebelum = i; break; }
  let masukSesudah = -1;
  for (let i = n + 1; i <= akhir; i++) if (adaMasuk(i)) { masukSesudah = i; break; }
  const desaMasuk = data.desa_masuk[n] || 0;
  const toggle = (id) =>
    setTerbuka((s) => {
      const baru = new Set(s);
      baru.has(id) ? baru.delete(id) : baru.add(id);
      return baru;
    });

  const garis = (label, nilai, warna, yAxisID) => ({
    label,
    data: nilai,
    borderColor: warna,
    backgroundColor: `${warna}1a`,
    fill: yAxisID === "y1",
    pointRadius: 0,
    borderWidth: 2,
    tension: 0.2,
    yAxisID,
  });

  const chartData = {
    labels: data.tanggal.map((t) => formatTanggal(t)),
    datasets: [
      garis("Desa sudah masuk", data.desa_masuk, "#4f46e5", "y1"),
      garis("Lembaga", data.lembaga, "#0ea5e9", "y"),
      garis("Pengurus", data.pengurus, "#f59e0b", "y"),
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    onClick: (_evt, elemen) => elemen.length && setHariDipilih(elemen[0].index === akhir ? null : elemen[0].index),
    onHover: (evt, elemen) => (evt.native.target.style.cursor = elemen.length ? "pointer" : "default"),
    plugins: {
      penandaHari: { index: hariDipilih },
      legend: { position: "bottom", labels: { usePointStyle: true, boxWidth: 12, padding: 16 } },
      tooltip: {
        callbacks: {
          title: (items) => formatTanggal(data.tanggal[items[0].dataIndex], { day: "numeric", month: "long", year: "numeric" }),
          label: (item) => `${item.dataset.label}: ${angka(item.parsed.y)}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
      y: { beginAtZero: true, title: { display: true, text: "Lembaga & pengurus" } },
      y1: {
        beginAtZero: true,
        max: totalDesa,
        position: "right",
        grid: { drawOnChartArea: false },
        title: { display: true, text: "Desa" },
      },
    },
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-slate-900">Capaian Data Masuk</h3>
          <p className="text-sm text-slate-500">
            Pertumbuhan kumulatif lembaga dan pengurus aktif yang dimasukkan desa sejak{" "}
            {formatTanggal(data.tanggal[0], { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Statistik label="Desa sudah masuk" nilai={`${desaMasuk} / ${totalDesa}`} keterangan={`${persen(desaMasuk, totalDesa)}% desa`} />
          <Statistik label="Belum masuk" nilai={totalDesa - desaMasuk} keterangan="desa" />
          <Statistik label="Lembaga aktif" nilai={angka(data.lembaga[n] || 0)} />
          <Statistik label="Pengurus aktif" nilai={angka(data.pengurus[n] || 0)} />
        </div>

        <div className="h-80">
          <Line data={chartData} options={chartOptions} plugins={[penandaHari]} />
        </div>

        <p className="text-xs text-slate-400 mt-3">
          Klik titik hari pada grafik untuk melihat progres kecamatan per tanggal tersebut.
          Desa dihitung masuk setelah punya minimal satu lembaga aktif dan satu pengurus aktif. {angka(data.lembaga_tanpa_tanggal)}{" "}
          lembaga tanpa tanggal input (data awal) dihitung sejak hari pertama grafik.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Progres per Kecamatan</h3>
            <p className="text-sm text-slate-500">Klik kecamatan untuk melihat desanya</p>
          </div>
          <div className="flex items-center gap-1 ml-auto">
            {[
              { ikon: LuChevronsLeft, label: "Tanggal data masuk sebelumnya", ke: masukSebelum, aktif: masukSebelum >= 0 },
              { ikon: LuChevronLeft, label: "Hari sebelumnya", ke: n - 1, aktif: n > 0 },
              { ikon: LuChevronRight, label: "Hari berikutnya", ke: n + 1, aktif: n < akhir },
              { ikon: LuChevronsRight, label: "Tanggal data masuk berikutnya", ke: masukSesudah, aktif: masukSesudah >= 0 },
            ].map(({ ikon: Ikon, label, ke, aktif }, i) => (
              <React.Fragment key={label}>
              {i === 2 && (
                <span
                  className={`px-2 text-sm font-medium whitespace-nowrap min-w-[8.5rem] text-center ${
                    hariDipilih != null ? "text-rose-600" : "text-slate-700"
                  }`}
                >
                  {labelHari}
                </span>
              )}
              <button
                type="button"
                title={label}
                aria-label={label}
                disabled={!aktif}
                onClick={() => pilihHari(ke)}
                className="p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent"
              >
                <Ikon className="w-4 h-4" />
              </button>
              </React.Fragment>
            ))}
            {hariDipilih != null && (
              <button
                type="button"
                onClick={() => setHariDipilih(null)}
                className="ml-2 px-3 py-1.5 rounded-md border border-rose-200 text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                Kembali ke hari ini
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setTerbuka(terbuka.size ? new Set() : new Set(kecamatan.map((k) => k.id)))}
            className="px-3 py-1.5 rounded-md border border-indigo-200 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
          >
            {terbuka.size ? "Tutup semua" : "Buka semua"}
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-start">
          {kecamatan.map((k) => (
            <KartuKecamatan
              key={k.id}
              kec={k}
              sampai={sampai}
              terbuka={terbuka.has(k.id)}
              onToggle={() => toggle(k.id)}
              onDesaClick={onDesaClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CapaianDataMasuk;
