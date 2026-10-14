import React, { useEffect, useState } from "react";
import { LuLoader, LuChevronLeft, LuChevronRight, LuX } from "react-icons/lu";
import kelembagaanApi from "../../../api/kelembagaan";

const RENTANG = [
  { hari: 7, label: "7 hari" },
  { hari: 30, label: "30 hari" },
  { hari: 90, label: "90 hari" },
  { hari: 0, label: "Semua" },
];

// Log lembaga memakai kunci tipe (rw, karang-taruna), log pengurus memakai nama tabel (rws, karang_tarunas)
const LABEL_TIPE = {
  rw: "RW", rws: "RW",
  rt: "RT", rts: "RT",
  posyandu: "Posyandu", posyandus: "Posyandu",
  "karang-taruna": "Karang Taruna", karang_tarunas: "Karang Taruna",
  lpm: "LPM", lpms: "LPM",
  pkk: "PKK", pkks: "PKK",
  satlinmas: "Satlinmas",
  "lembaga-lainnya": "Lembaga Lainnya", lembaga_lainnyas: "Lembaga Lainnya",
};

const STATUS = {
  verified: { label: "Diverifikasi", kelas: "bg-green-50 text-green-700" },
  ditolak: { label: "Ditolak", kelas: "bg-red-50 text-red-700" },
  dibatalkan: { label: "Dibatalkan", kelas: "bg-slate-100 text-slate-600" },
};

const formatWaktu = (ms) =>
  ms
    ? new Date(ms).toLocaleString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "-";

const LIMIT = 20;

const AktivitasVerifikator = ({ onDesaClick }) => {
  const [hari, setHari] = useState(30);
  const [userId, setUserId] = useState(null);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let batal = false;
    setLoading(true);
    setError(null);
    kelembagaanApi
      .getAktivitasVerifikator({ hari, page, limit: LIMIT, ...(userId ? { user_id: userId } : {}) })
      .then((res) => !batal && setData(res.data))
      .catch((err) => !batal && setError(err.response?.data?.message || "Gagal memuat aktivitas verifikator"))
      .finally(() => !batal && setLoading(false));
    return () => {
      batal = true;
    };
  }, [hari, userId, page]);

  const gantiRentang = (h) => {
    setHari(h);
    setPage(1);
  };
  const pilihVerifikator = (id) => {
    setUserId((cur) => (cur === id ? null : id));
    setPage(1);
  };

  const verifikator = data?.verifikator || [];
  const riwayat = data?.riwayat || [];
  const totalHalaman = data ? Math.max(1, Math.ceil(data.pagination.total / LIMIT)) : 1;
  const namaTerpilih = verifikator.find((v) => v.user_id === userId)?.nama;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Aktivitas Verifikator</h3>
            <p className="text-sm text-slate-500">
              Seluruh tindakan verifikasi lembaga & pengurus. Klik baris untuk melihat riwayat verifikator tersebut.
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
            {RENTANG.map((r) => (
              <button
                key={r.hari}
                type="button"
                onClick={() => gantiRentang(r.hari)}
                aria-pressed={hari === r.hari}
                className={`px-3 py-1 text-sm rounded-md font-medium transition-colors ${
                  hari === r.hari ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="text-sm text-red-600 text-center py-6">{error}</p>
        ) : !data ? (
          <div className="flex items-center justify-center gap-2 text-slate-500 py-10">
            <LuLoader className="h-5 w-5 animate-spin" />
            <span className="text-sm">Memuat aktivitas...</span>
          </div>
        ) : verifikator.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-6">Belum ada aktivitas verifikasi pada rentang ini.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-200">
                  <th className="text-left font-medium py-2 pr-3">Verifikator</th>
                  <th className="text-right font-medium py-2 px-2">Total</th>
                  <th className="text-right font-medium py-2 px-2">Lembaga</th>
                  <th className="text-right font-medium py-2 px-2">Pengurus</th>
                  <th className="text-right font-medium py-2 px-2">Diverifikasi</th>
                  <th className="text-right font-medium py-2 px-2">Ditolak</th>
                  <th className="text-right font-medium py-2 px-2">Dibatalkan</th>
                  <th className="text-right font-medium py-2 px-2">Hari aktif</th>
                  <th className="text-right font-medium py-2 px-2">Rata-rata/hari</th>
                  <th className="text-right font-medium py-2 pl-2">Terakhir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {verifikator.map((v) => (
                  <tr
                    key={v.user_id}
                    onClick={() => pilihVerifikator(v.user_id)}
                    className={`cursor-pointer transition-colors ${
                      userId === v.user_id ? "bg-indigo-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-2.5 pr-3">
                      <div className="font-medium text-slate-800">{v.nama || "Tanpa nama"}</div>
                      <div className="text-xs text-slate-400">{v.role}</div>
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-slate-900">{v.total}</td>
                    <td className="py-2.5 px-2 text-right">{v.lembaga}</td>
                    <td className="py-2.5 px-2 text-right">{v.pengurus}</td>
                    <td className="py-2.5 px-2 text-right text-green-700">{v.verified}</td>
                    <td className="py-2.5 px-2 text-right text-red-600">{v.ditolak}</td>
                    <td className="py-2.5 px-2 text-right text-slate-500">{v.dibatalkan}</td>
                    <td className="py-2.5 px-2 text-right">{v.hari_aktif}</td>
                    <td className="py-2.5 px-2 text-right">
                      {v.hari_aktif ? (v.total / v.hari_aktif).toFixed(1) : "-"}
                    </td>
                    <td className="py-2.5 pl-2 text-right text-xs text-slate-500 whitespace-nowrap">
                      {formatWaktu(v.terakhir)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-bold text-slate-900">
            Riwayat Verifikasi
            {data && (
              <span className="ml-2 text-sm font-normal text-slate-500">({data.pagination.total} aktivitas)</span>
            )}
          </h3>
          {userId && (
            <button
              type="button"
              onClick={() => pilihVerifikator(userId)}
              className="flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-full"
            >
              {namaTerpilih || "Verifikator"}
              <LuX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className={`divide-y divide-slate-100 ${loading ? "opacity-50" : ""}`}>
          {riwayat.length === 0 && !loading && (
            <p className="text-sm text-slate-500 text-center py-6">Tidak ada riwayat.</p>
          )}
          {riwayat.map((r) => {
            const st = STATUS[r.status];
            return (
              <div key={r.id} className="py-3 flex flex-wrap items-start gap-x-4 gap-y-1">
                <div className="w-36 shrink-0 text-xs text-slate-500 pt-0.5">{formatWaktu(r.waktu)}</div>
                <div className="flex-1 min-w-[200px]">
                  <div className="text-sm text-slate-800">
                    <span className="font-medium">{r.user_name}</span>{" "}
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${st.kelas}`}>
                      {st.label}
                    </span>{" "}
                    {r.jenis === "pengurus" ? "pengurus " : ""}
                    <span className="font-medium">{r.entity_name}</span>
                    {r.jenis === "pengurus" && r.kelembagaan_nama && (
                      <span className="text-slate-500"> — {r.kelembagaan_nama}</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {LABEL_TIPE[r.kelembagaan_type] || r.kelembagaan_type}
                    {r.desa && (
                      <>
                        {" · "}
                        {onDesaClick ? (
                          <button
                            type="button"
                            onClick={() => onDesaClick(r.desa_id)}
                            className="text-indigo-600 hover:underline"
                          >
                            {r.desa}
                          </button>
                        ) : (
                          r.desa
                        )}
                        {r.kecamatan && `, Kec. ${r.kecamatan}`}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {totalHalaman > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              <LuChevronLeft className="w-4 h-4" /> Sebelumnya
            </button>
            <span className="text-sm text-slate-500">
              Halaman {page} dari {totalHalaman}
            </span>
            <button
              type="button"
              disabled={page >= totalHalaman || loading}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
            >
              Berikutnya <LuChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AktivitasVerifikator;
