/**
 * Halaman Asta Desa di Core Dashboard.
 *
 * Sumbernya API super admin aplikasi ASTA DESA (astadesa.rmlabs.id), dibaca
 * lewat proxy backend kita di /api/asta-desa. Halaman ini murni baca — tidak ada
 * satu pun tombol di sini yang mengubah data di sana.
 *
 * MENGAPA BERTAB, BUKAN SATU HALAMAN PANJANG. Data ASTA DESA berisi empat hal
 * yang berbeda pembacanya: posisi pendataan (pimpinan), sebaran wilayah
 * (perencana), baris per keluarga (verifikator), dan demografi (perencana
 * program). Menumpuk semuanya dalam satu gulungan membuat siapa pun harus
 * melewati tiga bagian yang bukan urusannya. Tiap tab juga MENUNDA
 * pengambilannya sampai dibuka — agregat demografi menyusuri ribuan baris
 * anggota keluarga di sisi server, dan itu tidak boleh dibayar oleh pembaca yang
 * hanya ingin melihat angka ringkasan.
 */

import React, { useMemo, useState } from 'react';
import {
  Building2,
  Layers,
  Map as MapIcon,
  RefreshCw,
  Table2,
  Users,
  UsersRound,
  Satellite
} from 'lucide-react';
import PageHeader from '../../../components/statistik/PageHeader';
import { LEBAR_CORE } from '../lebarHalaman';
import { Galat, Memuat, Panel } from './ui';
import { segarkanSemua, useAstaDesa } from './useAstaDesa';
import { angka, persen } from './warna';
import RingkasanTab from './RingkasanTab';
import PetaTab from './PetaTab';
import SensusTab from './SensusTab';
import DemografiTab from './DemografiTab';
import PenggunaTab from './PenggunaTab';
import LayerPesanTab from './LayerPesanTab';

const TAB = [
  { kunci: 'ringkasan', label: 'Ringkasan', ikon: Building2 },
  { kunci: 'peta', label: 'Peta Sebaran', ikon: MapIcon },
  { kunci: 'sensus', label: 'Data Sensus', ikon: Table2 },
  { kunci: 'demografi', label: 'Demografi', ikon: UsersRound },
  { kunci: 'pengguna', label: 'Petugas & Akun', ikon: Users },
  { kunci: 'layer', label: 'Layer & Pesan', ikon: Layers }
];

/**
 * Petunjuk pemasangan, ditampilkan menggantikan seluruh isi halaman bila server
 * belum punya kredensial.
 *
 * Ini bukan pesan galat. Yang membuka halaman ini tidak melakukan kesalahan
 * apa pun — servernya memang belum disetel — jadi yang dibutuhkan adalah
 * langkah yang bisa diteruskan ke pengelola server, bukan peringatan merah.
 */
const BelumDisetel = () => (
  <Panel judul="Integrasi ASTA DESA belum disetel" keterangan="Halaman ini akan hidup begitu kredensialnya diisi.">
    <div className="space-y-4 text-sm leading-relaxed text-slate-600">
      <p>
        Data pada halaman ini datang dari API super admin ASTA DESA. Backend perlu satu akun ber-role{' '}
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-800">super_admin</code> di
        sana untuk membacanya — endpoint tersebut menolak peran lain.
      </p>
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <p className="border-b border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700">
          backend/.env
        </p>
        <pre className="overflow-x-auto px-3.5 py-3 text-xs leading-relaxed text-slate-700">
          {`ASTADESA_IDENTITY=<email atau username super_admin>
ASTADESA_PASSWORD=<password>

# Alternatif, bila password tidak ingin disimpan di server:
ASTADESA_TOKEN=<token Sanctum milik akun super_admin>`}
        </pre>
      </div>
      <p className="text-xs text-slate-500">
        Setelah mengisinya, jalankan ulang proses backend. Tokennya disimpan di memori server dan tidak pernah dikirim
        ke browser.
      </p>
    </div>
  </Panel>
);

const AstaDesaPage = () => {
  const [tab, setTab] = useState('ringkasan');
  const [menyegarkan, setMenyegarkan] = useState(false);

  const status = useAstaDesa('/status');
  const siap = status.data?.terkonfigurasi;

  // Ringkasan diambil begitu integrasinya siap: selain mengisi tab pertama,
  // daftar kecamatan dan tahap verifikasinya dipakai sebagai isi penyaring di
  // tab Data Sensus, dan angka petugasnya dipakai tab Petugas & Akun.
  const ringkasan = useAstaDesa('/ringkasan', {}, { aktif: Boolean(siap) });
  const sebaran = useAstaDesa('/sebaran', {}, { aktif: Boolean(siap) && tab === 'peta' });
  const demografi = useAstaDesa('/demografi', {}, { aktif: Boolean(siap) && tab === 'demografi' });

  const muatUlang = async () => {
    setMenyegarkan(true);
    await segarkanSemua();
    await Promise.all([
      ringkasan.ambil(true),
      tab === 'peta' ? sebaran.ambil(true) : Promise.resolve(),
      tab === 'demografi' ? demografi.ambil(true) : Promise.resolve()
    ]);
    setMenyegarkan(false);
  };

  const r = ringkasan.data;
  const statHeader = useMemo(() => {
    if (!r) return [];
    return [
      { label: 'Keluarga terdata', value: angka(r.total_sensus) },
      { label: 'Kecamatan', value: angka(r.total_kecamatan) },
      { label: 'Desa/kelurahan', value: angka(r.total_desa) },
      { label: 'Berkoordinat', value: persen(r.berkoordinat, r.total_sensus) }
    ];
  }, [r]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <div className={`mx-auto ${LEBAR_CORE} space-y-4`}>
        <PageHeader
          icon={Satellite}
          title="Asta Desa"
          subtitle="Pendataan keluarga se-Kabupaten Bogor dari aplikasi ASTA DESA — posisi pendataan, sebaran wilayah, dan demografi. Halaman ini hanya membaca."
          stats={statHeader}
          actions={
            <button
              type="button"
              onClick={muatUlang}
              disabled={menyegarkan || !siap}
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3.5 py-2 text-xs font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${menyegarkan ? 'animate-spin' : ''}`} />
              {menyegarkan ? 'Memuat…' : 'Muat ulang'}
            </button>
          }
        />

        {status.galat ? (
          <Galat pesan={status.galat} onUlang={status.ambil} />
        ) : status.memuat && !status.data ? (
          <Memuat pesan="Memeriksa sambungan ke ASTA DESA…" />
        ) : !siap ? (
          <BelumDisetel />
        ) : (
          <>
            {/* Tab. Di layar sempit berubah jadi baris yang bisa digeser
                mendatar — bukan menyusut jadi teks mungil yang tak terbaca, dan
                bukan menumpuk jadi enam baris yang mengusir isi halaman ke
                bawah lipatan. */}
            <nav className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
              <div className="inline-flex min-w-full gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm shadow-slate-900/[0.03]">
                {TAB.map((t) => {
                  const Ikon = t.ikon;
                  const aktif = tab === t.kunci;
                  return (
                    <button
                      key={t.kunci}
                      type="button"
                      onClick={() => setTab(t.kunci)}
                      className={`inline-flex flex-shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                        aktif
                          ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/20'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <Ikon className="h-3.5 w-3.5" strokeWidth={aktif ? 2.3 : 2} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </nav>

            {tab === 'ringkasan' && (
              <RingkasanTab
                data={ringkasan.data}
                memuat={ringkasan.memuat}
                galat={ringkasan.galat}
                onUlang={ringkasan.ambil}
              />
            )}
            {tab === 'peta' && (
              <PetaTab data={sebaran.data} memuat={sebaran.memuat} galat={sebaran.galat} onUlang={sebaran.ambil} />
            )}
            {tab === 'sensus' && <SensusTab ringkasan={ringkasan.data} />}
            {tab === 'demografi' && (
              <DemografiTab
                data={demografi.data}
                memuat={demografi.memuat}
                galat={demografi.galat}
                onUlang={demografi.ambil}
                totalKeluarga={ringkasan.data?.total_sensus}
              />
            )}
            {tab === 'pengguna' && <PenggunaTab ringkasan={ringkasan.data} />}
            {tab === 'layer' && <LayerPesanTab />}

            <p className="px-1 pb-2 text-[11px] leading-relaxed text-slate-400">
              Sumber: API super admin ASTA DESA ({status.data?.base_url}). Data disimpan sementara di server hingga{' '}
              {Math.round((status.data?.ttl_ms || 0) / 60000)} menit; tekan <span className="font-semibold">Muat ulang</span>{' '}
              untuk menarik data terbaru.
              {r?.diambil_pada && (
                <> Terakhir diambil {new Date(r.diambil_pada).toLocaleString('id-ID')}.</>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AstaDesaPage;
