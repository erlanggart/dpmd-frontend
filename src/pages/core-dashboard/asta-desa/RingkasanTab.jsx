/**
 * Tab Ringkasan — jawaban atas empat pertanyaan pertama yang selalu ditanyakan
 * soal pendataan ASTA DESA: sudah berapa, sebarannya merata atau tidak, lajunya
 * naik atau melambat, dan siapa yang mengerjakan.
 */

import React, { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  AlertTriangle,
  BadgeCheck,
  CalendarDays,
  MapPin,
  Users,
  UserSquare2
} from 'lucide-react';
import { DaftarBatang, Galat, KartuAngka, Kosong, Legenda, Memuat, Panel, Tooltip1 } from './ui';
import {
  GAYA_SUMBU,
  SERI,
  angka,
  peringkatStatus,
  persen,
  rapikanLabel,
  tanggalSingkat,
  warnaStatus
} from './warna';

const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/**
 * Kumpulkan tren harian menjadi satuan yang masih terbaca.
 *
 * Tren pendataan sensus membentang bertahun; menggambar setiap hari sebagai satu
 * titik menghasilkan pagar 700 batang yang sumbu tanggalnya tidak mungkin
 * dilabeli. Jadi satuannya menyesuaikan rentang data, bukan dipatok.
 */
const kelompokkanTren = (tren, satuan) => {
  if (!tren?.length) return [];
  if (satuan === 'hari') return tren.map((t) => ({ ...t, label: tanggalSingkat(t.tanggal) }));

  const ember = new Map();
  tren.forEach((t) => {
    const d = new Date(t.tanggal);
    if (Number.isNaN(d.getTime())) return;
    const kunci =
      satuan === 'bulan'
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        : String(d.getFullYear());
    const label =
      satuan === 'bulan' ? `${BULAN_PENDEK[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` : String(d.getFullYear());
    const ada = ember.get(kunci) || { kunci, label, total: 0 };
    ada.total += t.total;
    ember.set(kunci, ada);
  });
  return Array.from(ember.values()).sort((a, b) => a.kunci.localeCompare(b.kunci));
};

const RingkasanTab = ({ data, memuat, galat, onUlang }) => {
  const [satuanTren, setSatuanTren] = useState(null); // null = pilih otomatis
  const [semuaKecamatan, setSemuaKecamatan] = useState(false);

  const satuanOtomatis = useMemo(() => {
    const n = data?.tren?.length || 0;
    if (n <= 70) return 'hari';
    if (n <= 900) return 'bulan';
    return 'tahun';
  }, [data?.tren]);

  const satuan = satuanTren || satuanOtomatis;
  const tren = useMemo(() => kelompokkanTren(data?.tren, satuan), [data?.tren, satuan]);

  const status = useMemo(() => {
    const daftar = data?.per_status || [];
    return [...daftar].sort((a, b) => peringkatStatus(a.status) - peringkatStatus(b.status));
  }, [data?.per_status]);

  const kecamatan = useMemo(
    () => (data?.per_kecamatan || []).map((k) => ({ label: k.kecamatan, total: k.total, ...k })),
    [data?.per_kecamatan]
  );

  const petugas = useMemo(
    () => (data?.petugas || []).map((p) => ({ label: p.nama, total: p.total })),
    [data?.petugas]
  );
  const maksPetugas = useMemo(() => Math.max(1, ...petugas.map((p) => p.total)), [petugas]);

  // Laju 30 hari terakhir dibanding 30 hari sebelumnya. Angka tunggal "total
  // sensus" tidak memberi tahu apakah pendataan masih berjalan atau sudah
  // berhenti tiga bulan lalu — perbandingan inilah yang memberitahunya.
  const laju = useMemo(() => {
    const harian = data?.tren || [];
    if (harian.length < 2) return null;
    const kini = Date.now();
    const hari = (n) => kini - n * 24 * 3600 * 1000;
    let baru = 0;
    let sebelum = 0;
    harian.forEach((t) => {
      const w = new Date(t.tanggal).getTime();
      if (Number.isNaN(w)) return;
      if (w >= hari(30)) baru += t.total;
      else if (w >= hari(60)) sebelum += t.total;
    });
    if (!baru && !sebelum) return null;
    return { baru, sebelum, selisih: sebelum ? Math.round(((baru - sebelum) / sebelum) * 100) : null };
  }, [data?.tren]);

  if (galat) return <Galat pesan={galat} onUlang={onUlang} />;
  if (memuat && !data) return <Memuat />;
  if (!data) return <Kosong pesan="Belum ada data ringkasan." />;

  const total = data.total_sensus || 0;

  return (
    <div className="space-y-4">
      {data.sebagian && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed text-slate-700">
            <span className="font-semibold text-slate-900">Angka di halaman ini sebagian.</span> Penyusuran data
            berhenti di pagar batas baris (ASTADESA_MAX_ROWS) sebelum seluruh sensus terbaca. Naikkan batas itu di{' '}
            <code className="rounded bg-white px-1 py-0.5 text-[11px]">backend/.env</code> bila seluruh baris memang
            perlu dihitung.
          </p>
        </div>
      )}

      {/* Kartu angka */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
        <KartuAngka
          icon={Users}
          label="Keluarga terdata"
          nilai={total}
          keterangan={
            data.summary?.sensuses && data.summary.sensuses !== total
              ? `ASTA DESA melaporkan ${angka(data.summary.sensuses)}`
              : 'Baris sensus terbaca'
          }
        />
        <KartuAngka
          icon={MapPin}
          label="Kecamatan tercakup"
          nilai={data.total_kecamatan}
          warna={SERI[2]}
          keterangan={`${angka(data.total_desa)} desa/kelurahan`}
        />
        <KartuAngka
          icon={UserSquare2}
          label="Petugas mendata"
          nilai={data.total_petugas}
          warna={SERI[1]}
          keterangan={
            data.total_petugas
              ? `Rata-rata ${angka(Math.round(total / data.total_petugas))} keluarga/petugas`
              : null
          }
        />
        <KartuAngka
          icon={BadgeCheck}
          label="Berkoordinat"
          nilai={data.berkoordinat}
          warna={SERI[3]}
          keterangan={`${persen(data.berkoordinat, total)} bisa dipetakan`}
        />
        <KartuAngka
          icon={CalendarDays}
          label="30 hari terakhir"
          nilai={laju ? laju.baru : '—'}
          warna={SERI[4]}
          keterangan={
            laju?.selisih === null || laju?.selisih === undefined
              ? 'Tidak ada pembanding periode sebelumnya'
              : `${laju.selisih >= 0 ? '+' : ''}${laju.selisih}% dari 30 hari sebelumnya`
          }
        />
      </div>

      {/* Tren */}
      <Panel
        judul="Laju pendataan"
        keterangan={`Jumlah keluarga terdata per ${satuan}. Satuannya menyesuaikan rentang data.`}
        aksi={
          <div className="flex rounded-lg bg-slate-100 p-0.5">
            {['hari', 'bulan', 'tahun'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSatuanTren(s)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold capitalize transition-colors ${
                  satuan === s ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        }
      >
        {tren.length === 0 ? (
          <Kosong pesan="Tidak ada tanggal pendataan yang bisa dibaca dari data sensus." />
        ) : (
          <div className="h-[260px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tren} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradTren" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={SERI[0]} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={SERI[0]} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#eef2f6" vertical={false} />
                <XAxis dataKey="label" {...GAYA_SUMBU} minTickGap={24} />
                <YAxis {...GAYA_SUMBU} width={56} tickFormatter={(v) => angka(v)} />
                <Tooltip
                  content={<Tooltip1 satuan="keluarga" />}
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1, strokeDasharray: '3 3' }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  name="Keluarga terdata"
                  stroke={SERI[0]}
                  strokeWidth={2}
                  fill="url(#gradTren)"
                  activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </Panel>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        {/* Status verifikasi */}
        <Panel
          judul="Tahap verifikasi"
          keterangan="Warna makin gelap berarti tahapnya makin jauh."
          className="xl:col-span-1"
        >
          {status.length === 0 ? (
            <Kosong pesan="Kolom status tidak ditemukan pada data sensus." />
          ) : (
            <>
              {/* Satu batang utuh: porsi tiap tahap terhadap keseluruhan. Celah
                  2px antar ruas dibiarkan agar dua tahap bertetangga tidak
                  menyatu menjadi satu bidang warna. */}
              <div className="mb-4 flex h-2.5 gap-[2px] overflow-hidden rounded-full">
                {status.map((s) => (
                  <div
                    key={s.status}
                    title={`${rapikanLabel(s.status)} — ${angka(s.total)}`}
                    style={{
                      width: `${(s.total / Math.max(1, total)) * 100}%`,
                      backgroundColor: warnaStatus(s.status)
                    }}
                  />
                ))}
              </div>
              <DaftarBatang
                baris={status.map((s) => ({ label: rapikanLabel(s.status), total: s.total, status: s.status }))}
                total={total}
                warna={(b) => warnaStatus(b.status)}
                batas={8}
              />
            </>
          )}
        </Panel>

        {/* Peringkat kecamatan */}
        <Panel
          judul="Sebaran per kecamatan"
          keterangan={`${angka(kecamatan.length)} kecamatan terdata`}
          className="xl:col-span-2"
          aksi={
            kecamatan.length > 10 && (
              <button
                type="button"
                onClick={() => setSemuaKecamatan((v) => !v)}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
              >
                {semuaKecamatan ? 'Tampilkan 10 teratas' : `Tampilkan semua (${kecamatan.length})`}
              </button>
            )
          }
        >
          <div className={semuaKecamatan ? 'max-h-[420px] overflow-y-auto pr-1' : ''}>
            <DaftarBatang baris={kecamatan} total={total} batas={semuaKecamatan ? 0 : 10} />
          </div>
        </Panel>
      </div>

      {/* Petugas */}
      <Panel
        judul="Petugas paling produktif"
        keterangan="Dihitung dari nama petugas pada baris sensus, bukan dari daftar akun."
      >
        <div className="mb-3">
          <Legenda item={[{ label: 'Jumlah keluarga didata', warna: SERI[1] }]} />
        </div>
        {/* Dua kolom memakai SATU skala (`maks` yang sama). Tanpa itu, batang
            terpanjang di kolom kanan tampak sepanjang batang terpanjang kolom
            kiri padahal nilainya bisa separuh — dua skala berdampingan adalah
            cara tercepat membuat peringkat berbohong. */}
        <div className="grid grid-cols-1 gap-x-8 gap-y-2.5 md:grid-cols-2">
          <DaftarBatang baris={petugas.slice(0, 8)} total={total} warna={SERI[1]} maks={maksPetugas} batas={8} />
          {petugas.length > 8 && (
            <DaftarBatang
              baris={petugas.slice(8, 16)}
              total={total}
              warna={SERI[1]}
              maks={maksPetugas}
              batas={8}
            />
          )}
        </div>
      </Panel>
    </div>
  );
};

export default RingkasanTab;
