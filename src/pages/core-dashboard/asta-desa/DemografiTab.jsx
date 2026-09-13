/**
 * Tab Demografi — agregat anggota keluarga dari seluruh sensus.
 *
 * Piramida usianya digambar sebagai batang mendatar bercabang dua arah, bentuk
 * baku demografi: sumbu kiri laki-laki, kanan perempuan, satu kelompok usia per
 * baris. Bentuk ini dipilih bukan karena tradisi — ia satu-satunya yang membuat
 * ketimpangan antar jenis kelamin pada SATU kelompok usia terbaca langsung,
 * tanpa pembaca harus membandingkan dua batang yang berjauhan.
 *
 * Nilai laki-laki disimpan negatif hanya demi arah gambarnya; setiap label dan
 * tooltip memakai nilai mutlaknya, sehingga tidak ada tempat di halaman ini yang
 * memperlihatkan "-1.204 orang".
 */

import React, { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { AlertTriangle, Baby, GraduationCap, HeartHandshake, Users2 } from 'lucide-react';
import { DaftarBatang, Galat, KartuAngka, Kosong, Legenda, Memuat, Panel, Tooltip1 } from './ui';
import { GAYA_SUMBU, SERI, angka, persen, rapikanLabel } from './warna';

const WARNA_L = SERI[0];
const WARNA_P = SERI[1];

const DemografiTab = ({ data, memuat, galat, onUlang, totalKeluarga }) => {
  const piramida = useMemo(
    () =>
      (data?.piramida || []).map((k) => ({
        label: k.label,
        L: -Math.abs(k.L || 0),
        P: k.P || 0,
        lain: k.lain || 0,
        total: k.total || 0
      })),
    [data?.piramida]
  );

  const adaIsiPiramida = piramida.some((k) => k.total > 0);

  const jk = useMemo(() => {
    const d = data?.per_jenis_kelamin || [];
    const cari = (nama) => d.find((x) => x.label === nama)?.total || 0;
    return { L: cari('Laki-laki'), P: cari('Perempuan'), lain: cari('Tidak diketahui') };
  }, [data?.per_jenis_kelamin]);

  const pendidikan = useMemo(
    () => (data?.per_pendidikan || []).map((p) => ({ label: rapikanLabel(p.label), total: p.total })),
    [data?.per_pendidikan]
  );
  const pekerjaan = useMemo(
    () => (data?.per_pekerjaan || []).map((p) => ({ label: rapikanLabel(p.label), total: p.total })),
    [data?.per_pekerjaan]
  );
  const hubungan = useMemo(
    () => (data?.per_hubungan || []).map((p) => ({ label: rapikanLabel(p.label), total: p.total })),
    [data?.per_hubungan]
  );
  const disabilitas = useMemo(
    () => (data?.per_disabilitas || []).map((p) => ({ label: rapikanLabel(p.label), total: p.total })),
    [data?.per_disabilitas]
  );

  if (galat) return <Galat pesan={galat} onUlang={onUlang} />;
  if (memuat && !data) return <Memuat pesan="Menghitung demografi anggota keluarga…" />;
  if (!data) return <Kosong pesan="Belum ada data anggota keluarga." />;

  const total = data.total_anggota || 0;
  // Usia produktif 15–64, mengikuti pengelompokan pada piramida.
  const produktif = (data.piramida || [])
    .filter((k) => ['15–24', '25–39', '40–54', '55–64'].includes(k.label))
    .reduce((a, k) => a + (k.total || 0), 0);
  const anak = (data.piramida || [])
    .filter((k) => ['0–4', '5–14'].includes(k.label))
    .reduce((a, k) => a + (k.total || 0), 0);
  const lansia = (data.piramida || []).filter((k) => k.label === '65+').reduce((a, k) => a + (k.total || 0), 0);

  return (
    <div className="space-y-4">
      {data.sebagian && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed text-slate-700">
            <span className="font-semibold text-slate-900">Angka demografi ini sebagian.</span> Pembacaan anggota
            keluarga berhenti di pagar batas baris sebelum seluruh data terbaca, jadi bacalah proporsinya — bukan
            jumlah mutlaknya.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KartuAngka
          icon={Users2}
          label="Anggota tercatat"
          nilai={total}
          keterangan={
            totalKeluarga ? `≈ ${(total / Math.max(1, totalKeluarga)).toFixed(1).replace('.', ',')} orang/keluarga` : null
          }
        />
        <KartuAngka
          icon={Baby}
          label="Usia 0–14"
          nilai={anak}
          warna={SERI[2]}
          keterangan={`${persen(anak, total)} dari seluruh anggota`}
        />
        <KartuAngka
          icon={HeartHandshake}
          label="Usia produktif 15–64"
          nilai={produktif}
          warna={SERI[1]}
          keterangan={`${persen(produktif, total)} dari seluruh anggota`}
        />
        <KartuAngka
          icon={GraduationCap}
          label="Usia 65+"
          nilai={lansia}
          warna={SERI[3]}
          keterangan={`${persen(lansia, total)} dari seluruh anggota`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel
          judul="Piramida usia"
          keterangan={
            data.tanpa_usia
              ? `${angka(data.tanpa_usia)} anggota tidak punya usia/tanggal lahir yang bisa dibaca dan tidak masuk piramida.`
              : 'Kiri laki-laki, kanan perempuan.'
          }
          className="xl:col-span-2"
          aksi={
            <Legenda
              item={[
                { label: 'Laki-laki', warna: WARNA_L },
                { label: 'Perempuan', warna: WARNA_P }
              ]}
            />
          }
        >
          {!adaIsiPiramida ? (
            <Kosong pesan="Kolom usia maupun tanggal lahir tidak ditemukan pada data anggota keluarga." />
          ) : (
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={piramida}
                  layout="vertical"
                  stackOffset="sign"
                  margin={{ top: 4, right: 12, left: 4, bottom: 0 }}
                  barGap={2}
                >
                  <CartesianGrid stroke="#eef2f6" horizontal={false} />
                  <XAxis
                    type="number"
                    {...GAYA_SUMBU}
                    tickFormatter={(v) => angka(Math.abs(v))}
                  />
                  <YAxis type="category" dataKey="label" {...GAYA_SUMBU} width={46} />
                  <Tooltip content={<Tooltip1 satuan="orang" />} cursor={{ fill: '#f1f5f9' }} />
                  {/* radius 4px hanya di ujung data (menjauhi garis nol) — ujung
                      yang menempel garis tengah dibiarkan lurus agar kedua sisi
                      bertemu rapat. */}
                  <Bar dataKey="L" name="Laki-laki" fill={WARNA_L} radius={[4, 0, 0, 4]} barSize={14} />
                  <Bar dataKey="P" name="Perempuan" fill={WARNA_P} radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Panel>

        <Panel judul="Jenis kelamin" keterangan="Nilai dari sumber yang tidak seragam disatukan.">
          <div className="space-y-4">
            <div>
              <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-full">
                <div style={{ width: `${(jk.L / Math.max(1, total)) * 100}%`, backgroundColor: WARNA_L }} />
                <div style={{ width: `${(jk.P / Math.max(1, total)) * 100}%`, backgroundColor: WARNA_P }} />
                {jk.lain > 0 && (
                  <div style={{ width: `${(jk.lain / Math.max(1, total)) * 100}%`, backgroundColor: '#cbd5e1' }} />
                )}
              </div>
            </div>
            <DaftarBatang
              baris={[
                { label: 'Laki-laki', total: jk.L },
                { label: 'Perempuan', total: jk.P },
                ...(jk.lain ? [{ label: 'Tidak diketahui', total: jk.lain }] : [])
              ]}
              total={total}
              warna={(b) => (b.label === 'Laki-laki' ? WARNA_L : b.label === 'Perempuan' ? WARNA_P : '#cbd5e1')}
              batas={3}
            />
            {/* Rasio jenis kelamin: jumlah laki-laki per 100 perempuan. Satu
                angka yang langsung bisa dibandingkan dengan angka BPS. */}
            {jk.P > 0 && (
              <p className="rounded-xl bg-slate-50 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
                Rasio jenis kelamin{' '}
                <span className="font-semibold text-slate-900">{Math.round((jk.L / jk.P) * 100)}</span> laki-laki per
                100 perempuan.
              </p>
            )}
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel judul="Pendidikan terakhir" keterangan={`${pendidikan.length} kategori terbaca`}>
          <DaftarBatang baris={pendidikan} total={total} warna={SERI[2]} batas={10} />
        </Panel>
        {/* Panel ketiga menyesuaikan kolom yang benar-benar ada. Per hari ini
            `sensus_anggotas` ASTA DESA TIDAK punya kolom pekerjaan tetapi punya
            `disabilitas`, jadi menampilkan panel "Pekerjaan" yang selamanya
            kosong hanya membuat halaman tampak rusak. Begitu mereka menambahkan
            kolom pekerjaan, panelnya muncul sendiri tanpa perubahan kode. */}
        {pekerjaan.length > 0 ? (
          <Panel judul="Pekerjaan" keterangan="20 terbanyak">
            <DaftarBatang baris={pekerjaan} total={total} warna={SERI[3]} batas={10} />
          </Panel>
        ) : (
          <Panel
            judul="Disabilitas"
            keterangan={`${disabilitas.length} kategori terbaca`}
          >
            <DaftarBatang baris={disabilitas} total={total} warna={SERI[3]} batas={10} />
          </Panel>
        )}
        <Panel judul="Hubungan dalam keluarga" keterangan={`${hubungan.length} kategori terbaca`}>
          <DaftarBatang baris={hubungan} total={total} warna={SERI[4]} batas={10} />
        </Panel>
      </div>
    </div>
  );
};

export default DemografiTab;
