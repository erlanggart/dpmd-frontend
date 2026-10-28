/**
 * Capaian target KK — persen keluarga terinput terhadap target yang dipasang
 * operator desa di ASTA DESA, plus laju hariannya.
 *
 * Angkanya TIDAK dihitung di sini. Endpoint `/asta-desa/target-kk` meneruskan
 * `/admin/target-kk` ASTA DESA, yang memakai hitungan yang sama dengan kartu
 * "Capaian Target KK" di dasbor super admin mereka. Dua hal yang perlu diingat
 * pembaca, dan karena itu ditulis di keterangan panel:
 *
 *   • Yang dihitung hanya kuesioner dari desa yang SUDAH memasang target. Desa
 *     yang belum memasang tidak ikut menambah pembilang maupun penyebut —
 *     kalau ikut, persennya bisa ratusan selama baru sedikit desa yang mengisi.
 *   • Patokannya waktu input (kalender WIB) tahun berjalan, bukan tanggal
 *     pendataan yang diketik enumerator.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarClock, Flag, Target, TrendingUp, Trophy } from 'lucide-react';
import { Galat, KartuAngka, Kosong, Memuat, Panel } from './ui';
import { useAstaDesa } from './useAstaDesa';
import { GAYA_SUMBU, KEADAAN, SERI, angka, tanggalSingkat } from './warna';

const desimal = (n) => Number(n ?? 0).toLocaleString('id-ID', { maximumFractionDigits: 1 });

const HARI_PENDEK = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

/**
 * Cincin capaian. Busurnya digambar dari 0 ke nilai sebenarnya saat pertama
 * tampil (transisi CSS pada stroke-dashoffset), dan bergeser halus setiap kali
 * pembaruan otomatis membawa angka baru.
 */
const Cincin = ({ nilai }) => {
  const r = 52;
  const keliling = 2 * Math.PI * r;
  const [tampil, setTampil] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setTampil(Math.min(100, nilai)));
    return () => cancelAnimationFrame(id);
  }, [nilai]);
  const warna = nilai >= 100 ? KEADAAN.baik : SERI[0];

  return (
    <div className="relative h-40 w-40 flex-shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="11" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={warna}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={keliling}
          strokeDashoffset={keliling * (1 - tampil / 100)}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">{desimal(nilai)}%</span>
        <span className="mt-0.5 text-[11px] font-medium text-slate-500">dari target</span>
      </div>
    </div>
  );
};

const TooltipHarian = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const h = payload[0].payload;
  return (
    <div className="rounded-xl border border-slate-200 bg-white/97 px-3 py-2 shadow-lg backdrop-blur">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{tanggalSingkat(h.tanggal)}</p>
      <p className="mt-1 text-xs text-slate-700">
        <span className="font-semibold tabular-nums text-slate-900">+{angka(h.jumlah)} KK</span> ·{' '}
        <span className="tabular-nums">{desimal(h.persen)}% dari target</span>
      </p>
    </div>
  );
};

const BarisKecamatan = ({ k }) => {
  const p = k.persen ?? 0;
  return (
    <tr className="border-t border-slate-100">
      <td className="py-2 pr-3 text-xs font-medium text-slate-800">{k.kecamatan}</td>
      <td className="py-2 pr-3 text-right text-xs tabular-nums text-slate-500">
        {angka(k.desa_bertarget)}/{angka(k.jumlah_desa)}
      </td>
      <td className="py-2 pr-3 text-right text-xs tabular-nums text-slate-700">
        {k.desa_bertarget ? angka(k.target) : '—'}
      </td>
      <td className="py-2 pr-3 text-right text-xs tabular-nums text-slate-700">
        {k.desa_bertarget ? angka(k.terkumpul) : '—'}
      </td>
      <td className="py-2 pr-3 text-right text-xs tabular-nums">
        {k.hari_ini > 0 ? (
          <span className="font-semibold text-emerald-600">+{angka(k.hari_ini)}</span>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="w-[34%] py-2">
        {k.persen === null || k.persen === undefined ? (
          <span className="text-[11px] font-medium text-amber-600">Belum ada desa bertarget</span>
        ) : (
          <div className="flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full transition-[width] duration-700"
                style={{ width: `${Math.min(100, p)}%`, backgroundColor: p >= 100 ? KEADAAN.baik : SERI[0] }}
              />
            </div>
            <span className="w-12 text-right text-xs font-semibold tabular-nums text-slate-800">{desimal(p)}%</span>
          </div>
        )}
      </td>
    </tr>
  );
};

const CapaianTargetKk = ({ aktif = true }) => {
  const [semua, setSemua] = useState(false);
  // Sekali semenit, sama dengan umur cache endpoint ini di backend dan di ASTA
  // DESA — lebih sering hanya mengambil jawaban yang sama.
  const { data, memuat, galat, ambil } = useAstaDesa('/target-kk', { hari: 30 }, { aktif, segarkanTiapMs: 60 * 1000 });

  const harian = useMemo(
    () =>
      (data?.harian || []).map((h, i, arr) => {
        const d = new Date(`${h.tanggal}T00:00:00`);
        return {
          ...h,
          label: i === arr.length - 1 ? 'Hari ini' : `${HARI_PENDEK[d.getDay()]} ${d.getDate()}`,
          hariIni: i === arr.length - 1
        };
      }),
    [data?.harian]
  );

  const kecamatan = useMemo(
    () =>
      [...(data?.per_kecamatan || [])].sort(
        (a, b) => (b.persen ?? -1) - (a.persen ?? -1) || a.kecamatan.localeCompare(b.kecamatan)
      ),
    [data?.per_kecamatan]
  );

  if (galat) return <Galat pesan={galat} onUlang={ambil} />;
  if (memuat && !data) return <Memuat pesan="Memuat capaian target KK…" tinggi="py-10" />;
  if (!data) return null;

  const r = data.ringkasan || {};
  const judul = `Capaian target KK ${data.tahun}`;

  if (!r.desa_bertarget) {
    return (
      <Panel judul={judul} keterangan="Target dipasang operator desa di ASTA DESA.">
        <Kosong pesan="Belum ada desa yang memasang target KK tahun ini." ikon={Flag} />
      </Panel>
    );
  }

  return (
    <Panel
      judul={judul}
      keterangan={`Sama dengan dasbor super admin ASTA DESA. Dihitung dari kuesioner yang diinput tahun ${data.tahun} di ${angka(
        r.desa_bertarget
      )} desa yang sudah memasang target; "hari ini" mengikuti kalender WIB.`}
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.2fr)] xl:items-center">
        <div className="flex items-center gap-4">
          <Cincin nilai={r.persen ?? 0} />
          <div className="xl:hidden">
            <p className="text-sm font-semibold text-slate-900 tabular-nums">
              {angka(r.terkumpul)} dari {angka(r.target)} KK
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <KartuAngka
            icon={TrendingUp}
            label="Hari ini"
            nilai={r.hari_ini > 0 ? `+${angka(r.hari_ini)}` : '0'}
            satuan="KK"
            warna={KEADAAN.baik}
            keterangan={`${r.hari_ini > 0 ? '+' : ''}${desimal(r.persen_hari_ini)}% dari target`}
          />
          <KartuAngka
            icon={Target}
            label="Terkumpul"
            nilai={r.terkumpul}
            satuan="KK"
            keterangan={`Sisa ${angka(r.sisa)} dari ${angka(r.target)} KK`}
          />
          <KartuAngka
            icon={CalendarClock}
            label="Laju dibutuhkan"
            nilai={r.sisa > 0 ? `±${angka(r.kejar_per_hari)}` : 'Tercapai'}
            satuan={r.sisa > 0 ? 'KK/hari' : undefined}
            warna={SERI[3]}
            keterangan={r.sisa > 0 ? `Agar target tercapai 31 Desember (${angka(r.sisa_hari)} hari lagi)` : null}
          />
          <KartuAngka
            icon={Trophy}
            label="Desa bertarget"
            nilai={r.desa_bertarget}
            warna={SERI[2]}
            keterangan={`dari ${angka(r.jumlah_desa)} desa · ${angka(r.desa_tembus)} sudah 100%`}
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold text-slate-700">
            Capaian per hari <span className="font-normal text-slate-400">(30 hari terakhir, % dari target)</span>
          </p>
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={harian} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                <CartesianGrid stroke="#eef2f6" vertical={false} />
                <XAxis dataKey="label" {...GAYA_SUMBU} interval="preserveStartEnd" minTickGap={18} />
                <YAxis {...GAYA_SUMBU} width={48} tickFormatter={(v) => `${desimal(v)}%`} />
                <Tooltip content={<TooltipHarian />} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="persen" name="Capaian" radius={[4, 4, 0, 0]} animationDuration={900}>
                  {harian.map((h) => (
                    <Cell key={h.tanggal} fill={h.hariIni ? KEADAAN.baik : SERI[0]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-slate-700">Capaian per kecamatan</p>
          {kecamatan.length > 10 && (
            <button
              type="button"
              onClick={() => setSemua((v) => !v)}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              {semua ? 'Tampilkan 10 teratas' : `Tampilkan semua (${kecamatan.length})`}
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="pb-2 pr-3">Kecamatan</th>
                <th className="pb-2 pr-3 text-right">Desa bertarget</th>
                <th className="pb-2 pr-3 text-right">Target</th>
                <th className="pb-2 pr-3 text-right">Terkumpul</th>
                <th className="pb-2 pr-3 text-right">Hari ini</th>
                <th className="pb-2">Capaian</th>
              </tr>
            </thead>
            <tbody>
              {(semua ? kecamatan : kecamatan.slice(0, 10)).map((k) => (
                <BarisKecamatan key={k.kecamatan} k={k} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Panel>
  );
};

export default CapaianTargetKk;
