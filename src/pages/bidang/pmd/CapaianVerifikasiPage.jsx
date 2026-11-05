import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  LuArrowLeft,
  LuChartBar,
  LuTrendingUp,
  LuUserCheck,
  LuMapPin,
  LuBuilding2,
  LuLoader,
  LuShieldCheck,
  LuTriangleAlert,
  LuDatabase,
} from "react-icons/lu";
import kelembagaanApi from "../../../api/kelembagaan";
import useStatistikTahunan from "../../../hooks/useStatistikTahunan";
import TrenVerifikasiHarian from "../../../components/kelembagaan/capaian/TrenVerifikasiHarian";
import AktivitasVerifikator from "../../../components/kelembagaan/capaian/AktivitasVerifikator";
import CapaianPerDesa from "../../../components/kelembagaan/capaian/CapaianPerDesa";
import CapaianPerKecamatan from "../../../components/kelembagaan/capaian/CapaianPerKecamatan";
import PermasalahanDesa from "../../../components/kelembagaan/capaian/PermasalahanDesa";
import CapaianDataMasuk from "../../../components/kelembagaan/capaian/CapaianDataMasuk";
import TombolEkspor from "../../../components/shared/TombolEkspor";
import BarCapaian from "../../../components/kelembagaan/capaian/BarCapaian";
import ToggleMode from "../../../components/kelembagaan/capaian/ToggleMode";
import { MODE, WARNA_LEMBAGA, angkaCapaian, persen } from "../../../components/kelembagaan/capaian/warnaLembaga";

const TABS = [
  { key: "lembaga", label: "Capaian per Lembaga", icon: LuChartBar },
  { key: "kecamatan", label: "Capaian per Kecamatan", icon: LuBuilding2 },
  { key: "desa", label: "Capaian per Desa", icon: LuMapPin },
  { key: "tren", label: "Tren Harian", icon: LuTrendingUp },
  { key: "data-masuk", label: "Capaian Data Masuk", icon: LuDatabase },
  { key: "permasalahan", label: "Permasalahan Desa", icon: LuTriangleAlert },
  { key: "verifikator", label: "Aktivitas Verifikator", icon: LuUserCheck },
];

const KartuAngka = ({ label, nilai, keterangan, kelas = "text-slate-900" }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-4">
    <div className="text-xs font-medium text-slate-500">{label}</div>
    <div className={`text-2xl font-bold mt-1 ${kelas}`}>{nilai}</div>
    {keterangan && <div className="text-xs text-slate-400 mt-0.5">{keterangan}</div>}
  </div>
);

const Memuat = ({ teks }) => (
  <div className="bg-white rounded-xl border border-slate-200 p-10 flex items-center justify-center gap-2 text-slate-500">
    <LuLoader className="h-5 w-5 animate-spin" />
    <span className="text-sm">{teks}</span>
  </div>
);

const Galat = ({ teks }) => (
  <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center text-sm text-red-600">{teks}</div>
);

// Jumlah desa yang datanya (seluruhnya atau satu jenis lembaga) sudah terverifikasi semua
const hitungDesaTuntas = (desa, key, mode = "lembaga") => {
  let punya = 0;
  let tuntas = 0;
  desa.forEach((d) => {
    const { verified, total } = angkaCapaian(d, mode, key);
    if (total > 0) {
      punya++;
      if (verified === total) tuntas++;
    }
  });
  return { punya, tuntas };
};

// Total pengurus aktif per jenis lembaga, dijumlahkan dari data per desa: statistik
// tahunan hanya menghitung lembaga, bukan pengurusnya.
const totalPengurus = (desa, key) =>
  desa.reduce(
    (a, d) => {
      const v = angkaCapaian(d, "pengurus", key);
      a.total += v.total;
      a.verified += v.verified;
      a.ditolak += v.ditolak;
      return a;
    },
    { total: 0, verified: 0, ditolak: 0 }
  );

const CapaianPerLembaga = ({ statistik, perDesa }) => {
  const [mode, setMode] = useState("lembaga");
  const keys = Object.keys(WARNA_LEMBAGA);
  const { per_lembaga } = statistik;
  const pengurus = mode === "pengurus";
  const satuan = MODE[mode].satuan;
  const siap = !pengurus || !!perDesa;

  // Satu bentuk baris untuk tabel sekaligus ekspor: angka lembaga dari statistik
  // tahunan, angka pengurus dijumlahkan dari capaian per desa.
  const baris = keys.map((key) => {
    const t = pengurus ? totalPengurus(perDesa?.desa || [], key) : per_lembaga[key]?.totals || {};
    const total = t.total || 0;
    const verified = t.verified || 0;
    const ditolak = t.ditolak || 0;
    const tuntas = perDesa ? hitungDesaTuntas(perDesa.desa, key, mode) : null;
    return {
      key,
      label: per_lembaga[key]?.label || key,
      total,
      verified,
      unverified: pengurus ? total - verified - ditolak : t.unverified || 0,
      ditolak,
      persen: persen(verified, total),
      tuntas: tuntas?.tuntas ?? "",
      punya: tuntas?.punya ?? "",
    };
  });

  const grand = pengurus
    ? (() => {
        const g = baris.reduce(
          (a, b) => {
            a.total += b.total;
            a.verified += b.verified;
            a.unverified += b.unverified;
            a.ditolak += b.ditolak;
            return a;
          },
          { total: 0, verified: 0, unverified: 0, ditolak: 0 }
        );
        return { ...g, persentase_verifikasi: persen(g.verified, g.total) };
      })()
    : statistik.grand_totals;

  const tuntasTotal = perDesa ? hitungDesaTuntas(perDesa.desa, null, mode) : null;

  // Baris "Total" di tabel tidak diikutkan ke berkas: di Excel baris jumlah
  // yang ikut tersaring atau terurut justru merusak hitungan penerimanya.
  const kolomEkspor = [
    { label: MODE[mode].label, nilai: (b) => b.label },
    { label: "Total", nilai: (b) => b.total },
    { label: "Terverifikasi", nilai: (b) => b.verified },
    { label: "Belum", nilai: (b) => b.unverified },
    { label: "Ditolak", nilai: (b) => b.ditolak },
    { label: "Capaian (%)", nilai: (b) => b.persen },
    { label: "Desa Tuntas", nilai: (b) => b.tuntas },
    { label: "Desa Ada Data", nilai: (b) => b.punya },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-900">Capaian Verifikasi per Lembaga</h3>
          <p className="text-sm text-slate-500">
            Rincian status verifikasi {satuan} tiap jenis lembaga dan jumlah desa yang sudah terverifikasi semua
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleMode mode={mode} onChange={setMode} />
          <TombolEkspor
            kolom={kolomEkspor}
            baris={baris}
            namaBerkas={`capaian-verifikasi-${mode}-per-lembaga`}
            judul={`Capaian Verifikasi ${MODE[mode].label} per Lembaga`}
            subjudul={`Total ${grand.total.toLocaleString("id-ID")} ${satuan} · ${grand.persentase_verifikasi}% terverifikasi`}
            keterangan={false}
          />
        </div>
      </div>
      {!siap ? (
        <Memuat teks="Memuat capaian pengurus..." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-200">
                <th className="text-left font-medium py-2 pr-3">Lembaga</th>
                <th className="text-right font-medium py-2 px-2">Total</th>
                <th className="text-right font-medium py-2 px-2">Terverifikasi</th>
                <th className="text-right font-medium py-2 px-2">Belum</th>
                <th className="text-right font-medium py-2 px-2">Ditolak</th>
                <th className="text-left font-medium py-2 px-3 min-w-[200px]">Capaian</th>
                <th className="text-right font-medium py-2 pl-2">Desa tuntas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {baris.map((b) => (
                <tr key={b.key}>
                  <td className="py-3 pr-3 font-medium text-slate-800">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full mr-2"
                      style={{ backgroundColor: WARNA_LEMBAGA[b.key] }}
                    />
                    {b.label}
                  </td>
                  <td className="py-3 px-2 text-right">{b.total.toLocaleString("id-ID")}</td>
                  <td className="py-3 px-2 text-right font-semibold text-green-700">
                    {b.verified.toLocaleString("id-ID")}
                  </td>
                  <td className="py-3 px-2 text-right text-amber-700">{b.unverified.toLocaleString("id-ID")}</td>
                  <td className="py-3 px-2 text-right text-red-600">{b.ditolak.toLocaleString("id-ID")}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <BarCapaian persen={b.persen} warna={WARNA_LEMBAGA[b.key]} />
                      <span
                        className="w-10 text-right text-xs font-semibold"
                        style={{ color: WARNA_LEMBAGA[b.key] }}
                      >
                        {b.persen}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 pl-2 text-right text-slate-700">
                    {b.tuntas === "" ? "-" : `${b.tuntas} / ${b.punya}`}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-200 font-bold text-slate-900">
                <td className="py-3 pr-3">Total</td>
                <td className="py-3 px-2 text-right">{grand.total.toLocaleString("id-ID")}</td>
                <td className="py-3 px-2 text-right text-green-700">{grand.verified.toLocaleString("id-ID")}</td>
                <td className="py-3 px-2 text-right text-amber-700">{grand.unverified.toLocaleString("id-ID")}</td>
                <td className="py-3 px-2 text-right text-red-600">{grand.ditolak.toLocaleString("id-ID")}</td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <BarCapaian persen={grand.persentase_verifikasi} warna="#334155" />
                    <span className="w-10 text-right text-xs">{grand.persentase_verifikasi}%</span>
                  </div>
                </td>
                <td className="py-3 pl-2 text-right">
                  {tuntasTotal ? `${tuntasTotal.tuntas} / ${tuntasTotal.punya}` : "-"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-slate-400 mt-3">
        Desa tuntas = desa yang punya {satuan} jenis tersebut dan semuanya sudah terverifikasi.
        {pengurus
          ? " Mode Pengurus hanya menghitung pengurus berstatus aktif pada lembaga aktif."
          : " Angka lembaga mencakup lembaga aktif maupun nonaktif, sesuai statistik tahunan."}
      </p>
    </div>
  );
};

const CapaianVerifikasiPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = TABS.some((t) => t.key === searchParams.get("tab")) ? searchParams.get("tab") : "lembaga";

  const { data: statistik, loading: statistikLoading, error: statistikError } = useStatistikTahunan();
  const [perDesa, setPerDesa] = useState(null);
  const [perDesaError, setPerDesaError] = useState(null);

  useEffect(() => {
    kelembagaanApi
      .getCapaianVerifikasiPerDesa()
      .then((res) => setPerDesa(res.data))
      .catch((err) => setPerDesaError(err.response?.data?.message || "Gagal memuat capaian per desa"));
  }, []);

  // Halaman kelembagaan per desa hanya ada di bawah /.../kelembagaan, tidak di core-dashboard
  const bukaDesa = useMemo(
    () =>
      location.pathname.includes("/kelembagaan/")
        ? (desaId) => navigate(`../admin/${desaId}`, { relative: "path" })
        : undefined,
    [location.pathname, navigate]
  );

  const tuntas = perDesa ? hitungDesaTuntas(perDesa.desa) : null;
  const g = statistik?.grand_totals;

  return (
    <div className="space-y-6 p-4 lg:p-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <button
          type="button"
          onClick={() => navigate("..", { relative: "path" })}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-3"
        >
          <LuArrowLeft className="w-4 h-4" /> Kembali ke Dashboard Kelembagaan
        </button>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md">
            <LuShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Capaian Verifikasi Kelembagaan</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              RW, RT, Posyandu, Karang Taruna, LPM & PKK yang telah diverifikasi kabupaten
            </p>
          </div>
        </div>
      </div>

      {g && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KartuAngka label="Total Lembaga" nilai={g.total.toLocaleString("id-ID")} />
          <KartuAngka
            label="Terverifikasi"
            nilai={g.verified.toLocaleString("id-ID")}
            keterangan={`${g.persentase_verifikasi}% dari total`}
            kelas="text-green-700"
          />
          <KartuAngka label="Belum Diverifikasi" nilai={g.unverified.toLocaleString("id-ID")} kelas="text-amber-700" />
          <KartuAngka label="Ditolak" nilai={g.ditolak.toLocaleString("id-ID")} kelas="text-red-600" />
          <KartuAngka
            label="Desa Tuntas"
            nilai={tuntas ? tuntas.tuntas.toLocaleString("id-ID") : "-"}
            keterangan={tuntas ? `dari ${tuntas.punya} desa yang punya lembaga` : undefined}
            kelas="text-indigo-700"
          />
        </div>
      )}

      <div role="tablist" className="flex gap-1 overflow-x-auto bg-white rounded-xl border border-slate-200 p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setSearchParams({ tab: key }, { replace: true })}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              tab === key ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "lembaga" &&
        (statistikLoading ? (
          <Memuat teks="Memuat capaian verifikasi..." />
        ) : statistikError || !statistik ? (
          <Galat teks={statistikError || "Data tidak tersedia"} />
        ) : (
          <CapaianPerLembaga statistik={statistik} perDesa={perDesa} />
        ))}

      {tab === "kecamatan" &&
        (perDesaError ? (
          <Galat teks={perDesaError} />
        ) : !perDesa ? (
          <Memuat teks="Memuat capaian per kecamatan..." />
        ) : (
          <CapaianPerKecamatan data={perDesa} />
        ))}

      {tab === "tren" && <TrenVerifikasiHarian />}

      {tab === "verifikator" && <AktivitasVerifikator onDesaClick={bukaDesa} />}

      {tab === "desa" &&
        (perDesaError ? (
          <Galat teks={perDesaError} />
        ) : !perDesa ? (
          <Memuat teks="Memuat capaian per desa..." />
        ) : (
          <CapaianPerDesa data={perDesa} onDesaClick={bukaDesa} />
        ))}

      {tab === "permasalahan" && <PermasalahanDesa onDesaClick={bukaDesa} />}

      {tab === "data-masuk" && <CapaianDataMasuk onDesaClick={bukaDesa} />}
    </div>
  );
};

export default CapaianVerifikasiPage;
