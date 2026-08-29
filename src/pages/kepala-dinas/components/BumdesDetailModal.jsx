// Detail satu BUMDes, di TENGAH halaman.
//
// Sebelumnya berupa panel yang menempel di tepi kanan: lebarnya dipatok 36rem
// sementara isinya dua kolom angka, jadi setiap baris terpotong dan seluruh
// bacaan jadi satu kolom panjang yang harus digulir jauh. Di tengah, kartu ini
// boleh selebar 64rem dan isinya bisa dibaca berdampingan.
//
// DINAMIS TERHADAP ISIAN. Tidak ada baris "—". Baris dirakit sebagai data lalu
// disaring: yang kosong tidak pernah sampai ke DOM, dan bagian yang seluruh
// barisnya kosong ikut hilang. Yang tampil hanya yang benar-benar diisi desa,
// ditambah satu meteran yang menyatakan seberapa lengkap isian BUMDes ini —
// itu informasi tersendiri bagi dinas, bukan ruang kosong.
import React, { useEffect, useMemo, useState } from 'react';
import {
  X, Building2, MapPin, Phone, Mail, User, FileText, Wallet, ScrollText,
  ExternalLink, HandHeart, BadgeCheck, FolderOpen, Inbox,
} from 'lucide-react';
import { LencanaStatus, LencanaPeringkat } from './BumdesLencana';
import DokumenViewer from './DokumenViewer';
import {
  DOKUMEN_INTI, PERINGKAT_KOSONG, isAktif, omsetTerbaru, peringkatResmi,
} from './bumdesFilter';
import { nf, rupiah, rupiahRingkas, teksAtauNull } from './bumdesFormat';

/* ---------------------------------------------------------------- potongan -- */

/** Bagian hanya dirender kalau ada barisnya. */
const Bagian = ({ icon: Icon, judul, baris }) => {
  if (!baris.length) return null;
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {judul}
      </h3>
      <div className="mt-1 divide-y divide-slate-100">
        {baris.map(({ icon: Ikon, label, nilai }) => (
          <div key={label} className="flex gap-3 py-2.5">
            {Ikon && <Ikon className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />}
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-0.5 break-words text-sm text-slate-800">{nilai}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

/** Angka besar di kepala kartu — hanya muncul kalau memang terisi. */
const Sorotan = ({ label, nilai }) => {
  if (nilai === null || nilai === undefined) return null;
  return (
    <div className="min-w-0" title={rupiah(nilai) || undefined}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-0.5 truncate text-lg font-semibold tracking-tight text-slate-900">
        {rupiahRingkas(nilai)}
      </p>
    </div>
  );
};

/* ------------------------------------------------------------------ utama -- */

const LABEL_DOKUMEN = {
  perdes: 'Perdes',
  anggaran_dasar: 'Anggaran Dasar',
  anggaran_rumah_tangga: 'Anggaran Rumah Tangga',
  program_kerja: 'Program Kerja',
  sk_bum_desa: 'SK BUM Desa',
  profil: 'Profil BUM Desa',
  berita_acara: 'Berita Acara',
};

/** Kolom yang dihitung untuk meteran kelengkapan di kepala kartu. */
const ISIAN_DIPANTAU = [
  'tahun_pendirian', 'jenis_usaha_utama', 'direktur', 'hp_direktur', 'tenaga_kerja',
  'alamat', 'telepon', 'email', 'badan_hukum', 'nomor_perdes', 'nib', 'npwp', 'lkpp',
  'aset', 'omset_2025', 'laba_2025', 'pades_2025',
];

const adaAngka = (v) => v !== null && v !== undefined && !Number.isNaN(v);

const BumdesDetailModal = ({ item, onClose }) => {
  const [tampil, setTampil] = useState(false);
  const [berkasDibuka, setBerkasDibuka] = useState(null);

  useEffect(() => {
    const t = requestAnimationFrame(() => setTampil(true));
    const onKey = (e) => {
      // Esc menutup pratinjau dulu, baru kartunya — kalau satu tekanan menutup
      // keduanya, konteks yang belum selesai dibaca ikut terbuang.
      if (e.key === 'Escape' && !berkasDibuka) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, berkasDibuka]);

  const d = useMemo(() => {
    if (!item) return null;

    const kelas = peringkatResmi(item);
    const saringTeks = (baris) =>
      baris
        .map((b) => ({ ...b, nilai: teksAtauNull(b.nilai) }))
        .filter((b) => b.nilai !== null);

    return {
      kelas,
      persenIsian: Math.round(
        (ISIAN_DIPANTAU.filter((k) => (typeof item[k] === 'number' ? true : teksAtauNull(item[k]) !== null)).length
          / ISIAN_DIPANTAU.length) * 100
      ),
      terisi: ISIAN_DIPANTAU.filter((k) => (typeof item[k] === 'number' ? true : teksAtauNull(item[k]) !== null)).length,

      profil: saringTeks([
        { icon: Building2, label: 'Tahun pendirian', nilai: item.tahun_pendirian },
        { icon: Wallet, label: 'Jenis usaha utama', nilai: item.jenis_usaha_utama },
        { icon: Wallet, label: 'Jenis usaha', nilai: item.jenis_usaha },
        {
          icon: User,
          label: 'Direktur',
          nilai: teksAtauNull(item.direktur)
            ? `${item.direktur}${item.hp_direktur ? ` · ${item.hp_direktur}` : ''}`
            : null,
        },
        { icon: User, label: 'Tenaga kerja', nilai: item.tenaga_kerja ? `${nf.format(item.tenaga_kerja)} orang` : null },
        { icon: MapPin, label: 'Alamat', nilai: item.alamat },
        { icon: Phone, label: 'Telepon', nilai: item.telepon },
        { icon: Mail, label: 'Email', nilai: item.email },
      ]),

      legalitas: saringTeks([
        { icon: ScrollText, label: 'Status badan hukum', nilai: item.badan_hukum },
        {
          icon: ScrollText,
          label: 'Kelas penilaian 2024 — dipakai grafik & penyaring',
          nilai: kelas === PERINGKAT_KOSONG ? null : kelas,
        },
        { icon: ScrollText, label: 'Kelas penilaian 2026 (masih berjalan)', nilai: item.pemeringkatan_2026 },
        { icon: FileText, label: 'Nomor Perdes', nilai: item.nomor_perdes },
        { icon: FileText, label: 'NIB', nilai: item.nib },
        { icon: FileText, label: 'NPWP', nilai: item.npwp },
        { icon: FileText, label: 'LKPP', nilai: item.lkpp },
      ]),

      program: saringTeks([
        { label: 'Ketahanan pangan 2025', nilai: item.ketahanan_pangan },
        { label: 'Desa wisata', nilai: item.desa_wisata },
        { label: 'Makan Bergizi Gratis', nilai: item.peran_mbg },
      ]),

      keuangan: [
        { label: 'Nilai aset', nilai: item.aset },
        { label: 'Penyertaan modal', nilai: item.total_penyertaan_modal },
        { label: 'Omset 2025', nilai: item.omset_2025 },
        { label: 'Laba 2025', nilai: item.laba_2025 },
        { label: 'Omset 2024', nilai: item.omset_2024 },
        { label: 'Laba 2024', nilai: item.laba_2024 },
        { label: 'PADes 2025', nilai: item.pades_2025 },
        { label: 'PADes 2024', nilai: item.pades_2024 },
      ].filter((a) => adaAngka(a.nilai)),

      berkas: item.berkas || [],
      belumUnggah: DOKUMEN_INTI.filter((k) => !item.dokumen?.[k]),
    };
  }, [item]);

  if (!item || !d) return null;

  return (
    <>
      {/* z-[60]+ wajib: bilah navigasi bawah memakai z-50 dan akan menelan klik. */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-6">
        <button
          type="button"
          aria-label="Tutup detail"
          onClick={onClose}
          className={`absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] transition-opacity duration-200 ${
            tampil ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Detail ${item.nama}`}
          className={`relative flex h-full w-full max-w-5xl flex-col overflow-hidden bg-slate-50 shadow-2xl transition duration-200 sm:h-auto sm:max-h-[90vh] sm:rounded-2xl ${
            tampil ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.98] opacity-0'
          }`}
        >
          {/* Kepala */}
          <header className="flex-shrink-0 border-b border-slate-200 bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <LencanaStatus status={item.status} />
                  {d.kelas !== PERINGKAT_KOSONG && <LencanaPeringkat item={item} />}
                  {teksAtauNull(item.badan_hukum) && (
                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {item.badan_hukum}
                    </span>
                  )}
                </div>
                <h2 className="mt-2 text-lg font-semibold leading-tight text-slate-900">
                  {item.nama}
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {[item.desa && `Desa ${item.desa}`, item.kecamatan && `Kec. ${item.kecamatan}`]
                    .filter(Boolean).join(' · ')}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="flex-shrink-0 rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {!isAktif(item.status) && teksAtauNull(item.keterangan_tidak_aktif) && (
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-100">
                {item.keterangan_tidak_aktif}
              </p>
            )}

            {/* Sorotan angka — hanya yang terisi yang muncul, jadi barisnya
                menyesuaikan isian tiap BUMDes. */}
            <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
              <Sorotan label="Nilai aset" nilai={item.aset} />
              <Sorotan label="Omset terbaru" nilai={omsetTerbaru(item)} />
              <Sorotan label="Laba 2025" nilai={item.laba_2025} />
              <Sorotan label="PADes 2025" nilai={item.pades_2025} />

              <div className="ml-auto min-w-[9rem]">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Kelengkapan isian
                </p>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-1.5 rounded-full bg-slate-900 motion-safe:transition-[width] motion-safe:duration-700"
                    style={{
                      width: `${d.persenIsian}%`,
                      transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
                    }}
                  />
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {d.terisi} dari {ISIAN_DIPANTAU.length} kolom terisi
                </p>
              </div>
            </div>
          </header>

          {/* Isi */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
              <div className="space-y-4 lg:col-span-3">
                <Bagian icon={Building2} judul="Profil" baris={d.profil} />
                <Bagian icon={BadgeCheck} judul="Legalitas" baris={d.legalitas} />
                <Bagian icon={HandHeart} judul="Peran dalam program pemerintah" baris={d.program} />
              </div>

              <div className="space-y-4 lg:col-span-2">
                {/* Dokumen naik ke atas: ini yang paling sering dicari saat
                    membuka satu BUMDes. */}
                <section className="rounded-xl border border-slate-200 bg-white p-4">
                  <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <FolderOpen className="h-3.5 w-3.5" />
                    Dokumen
                    {d.berkas.length > 0 && (
                      <span className="ml-auto rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                        {d.berkas.length}
                      </span>
                    )}
                  </h3>

                  {d.berkas.length > 0 ? (
                    <div className="mt-3 space-y-1.5">
                      {d.berkas.map((b) => (
                        <button
                          key={`${b.jenis}-${b.nama}`}
                          type="button"
                          onClick={() => setBerkasDibuka(b)}
                          className="flex w-full items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50"
                        >
                          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                            {b.sumber === 'produk_hukum'
                              ? <ScrollText className="h-4 w-4" />
                              : <FileText className="h-4 w-4" />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-slate-800">
                              {b.label}
                            </span>
                            <span className="block truncate text-[11px] text-slate-500" title={b.nama}>
                              {b.sumber === 'produk_hukum' ? 'Arsip Produk Hukum · ' : ''}
                              {b.keterangan || b.nama}
                            </span>
                          </span>
                          <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-3 flex flex-col items-center rounded-lg bg-slate-50 px-4 py-6 text-center">
                      <Inbox className="h-7 w-7 text-slate-300" />
                      <p className="mt-2 text-sm font-medium text-slate-700">Belum ada dokumen</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Desa belum mengunggah berkas apa pun untuk BUM Desa ini.
                      </p>
                    </div>
                  )}

                  {d.belumUnggah.length > 0 && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <p className="text-[11px] text-slate-500">
                        Belum terunggah ({d.belumUnggah.length} dari {DOKUMEN_INTI.length} dokumen inti):
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {d.belumUnggah.map((k) => (
                          <span
                            key={k}
                            className="inline-flex rounded-full bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-400 ring-1 ring-slate-200"
                          >
                            {LABEL_DOKUMEN[k]}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </section>

                {d.keuangan.length > 0 && (
                  <section className="rounded-xl border border-slate-200 bg-white p-4">
                    <h3 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      <Wallet className="h-3.5 w-3.5" />
                      Keuangan
                    </h3>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {d.keuangan.map((a) => (
                        <div key={a.label} className="rounded-lg bg-slate-50 px-3 py-2.5">
                          <p className="text-[11px] font-medium text-slate-500">{a.label}</p>
                          <p className="mt-0.5 text-sm font-semibold text-slate-900">{rupiah(a.nilai)}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {berkasDibuka && (
        <DokumenViewer berkas={berkasDibuka} onClose={() => setBerkasDibuka(null)} />
      )}
    </>
  );
};

export default BumdesDetailModal;
