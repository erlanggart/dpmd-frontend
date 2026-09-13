/**
 * Tab Petugas & Pengguna.
 *
 * Dua sudut pandang yang sengaja disandingkan: DAFTAR AKUN (siapa yang punya
 * hak masuk, dengan peran apa) dan PRODUKTIVITAS (siapa yang benar-benar
 * mendata). Keduanya berbeda dan perbedaannya itu yang berguna — akun surveyor
 * yang terdaftar tetapi tidak muncul di daftar produktivitas adalah akun yang
 * belum pernah menghasilkan satu baris sensus pun, dan itu hanya terlihat kalau
 * kedua daftar dibaca berdampingan.
 */

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, ShieldCheck, UserCheck, UserRound, Users } from 'lucide-react';
import { DaftarBatang, Galat, KartuAngka, Kosong, Lencana, Memuat, Panel } from './ui';
import { useAstaDesa } from './useAstaDesa';
import { SERI, angka, persen, rapikanLabel } from './warna';

/** Nilai pertama yang ada — nama kolom di ASTA DESA tidak dijamin seragam. */
const ambilSalah1 = (obj, kunci) => {
  for (const k of kunci) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
};

/**
 * Peran-peran seorang pengguna, sebagai daftar nama.
 *
 * Kolomnya bernama `roles` (jamak) dan berisi ARRAY — `["super_admin"]` — sebab
 * peran di ASTA DESA dikelola Spatie dan satu akun boleh punya lebih dari satu.
 * Sebelumnya kolom ini dibaca sebagai `role` tunggal, yang tidak ada, sehingga
 * kolom Peran di tabel selalu bertuliskan "—" untuk setiap akun.
 *
 * Anggota array-nya bisa berupa string atau objek `{name}`, tergantung versi
 * serialisasi di sana; keduanya diterima.
 */
const daftarPeran = (u) => {
  const mentah = u?.roles ?? u?.role ?? u?.peran;
  const daftar = Array.isArray(mentah) ? mentah : mentah ? [mentah] : [];
  return daftar
    .map((r) => (typeof r === 'object' ? r?.name || r?.nama : r))
    .filter((r) => r !== null && r !== undefined && r !== '')
    .map(String);
};

const PenggunaTab = ({ ringkasan }) => {
  const [halaman, setHalaman] = useState(1);
  const [cari, setCari] = useState('');
  const [cariAktif, setCariAktif] = useState('');
  const [role, setRole] = useState('');

  const params = useMemo(
    () => ({
      page: halaman,
      per_page: 25,
      ...(cariAktif ? { search: cariAktif } : {}),
      ...(role ? { role } : {})
    }),
    [halaman, cariAktif, role]
  );

  const { data, meta, rekap, memuat, galat, ambil } = useAstaDesa('/pengguna', params);

  const perRole = useMemo(
    () => (rekap?.per_role || []).map((r) => ({ label: rapikanLabel(r.role), total: r.total, role: r.role })),
    [rekap]
  );

  const petugas = useMemo(
    () => (ringkasan?.petugas || []).map((p) => ({ label: p.nama, total: p.total })),
    [ringkasan?.petugas]
  );

  // Surveyor terdaftar vs surveyor yang sudah menghasilkan sensus.
  const jumlahSurveyor = useMemo(
    () => (rekap?.per_role || []).find((r) => String(r.role).toLowerCase().includes('surveyor'))?.total || 0,
    [rekap]
  );
  const petugasAktif = ringkasan?.total_petugas || 0;

  const totalPengguna = rekap?.total || 0;
  const halamanAkhir = meta?.last_page ?? 1;

  const kirimCari = (e) => {
    e.preventDefault();
    setCariAktif(cari.trim());
    setHalaman(1);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KartuAngka icon={Users} label="Akun terdaftar" nilai={totalPengguna} keterangan="Seluruh peran" />
        <KartuAngka
          icon={UserCheck}
          label="Akun surveyor"
          nilai={jumlahSurveyor}
          warna={SERI[2]}
          keterangan={totalPengguna ? `${persen(jumlahSurveyor, totalPengguna)} dari seluruh akun` : null}
        />
        <KartuAngka
          icon={UserRound}
          label="Petugas menghasilkan data"
          nilai={petugasAktif}
          warna={SERI[1]}
          keterangan={
            jumlahSurveyor
              ? `${persen(petugasAktif, jumlahSurveyor)} dari akun surveyor pernah mendata`
              : 'Dari nama petugas pada baris sensus'
          }
        />
        <KartuAngka
          icon={ShieldCheck}
          label="Jenis peran"
          nilai={perRole.length}
          warna={SERI[3]}
          keterangan={perRole[0] ? `Terbanyak: ${perRole[0].label}` : null}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <Panel judul="Komposisi peran" keterangan="Dihitung dari seluruh akun, bukan halaman ini saja.">
          {memuat && !rekap ? (
            <Memuat tinggi="py-10" pesan="Menghitung peran…" />
          ) : (
            <DaftarBatang baris={perRole} total={totalPengguna} batas={12} />
          )}
        </Panel>

        <Panel
          judul="Produktivitas petugas"
          keterangan="Jumlah keluarga yang didata tiap petugas."
          className="xl:col-span-2"
        >
          {petugas.length === 0 ? (
            <Kosong pesan="Nama petugas tidak terbaca dari data sensus." />
          ) : (
            <div className="grid grid-cols-1 gap-x-8 gap-y-2.5 md:grid-cols-2">
              {/* Satu skala untuk kedua kolom — lihat catatan sama di tab Ringkasan. */}
              <DaftarBatang
                baris={petugas.slice(0, 10)}
                total={ringkasan?.total_sensus}
                warna={SERI[1]}
                maks={petugas[0]?.total}
                batas={10}
              />
              {petugas.length > 10 && (
                <DaftarBatang
                  baris={petugas.slice(10, 20)}
                  total={ringkasan?.total_sensus}
                  warna={SERI[1]}
                  maks={petugas[0]?.total}
                  batas={10}
                />
              )}
            </div>
          )}
        </Panel>
      </div>

      <Panel
        judul="Daftar akun"
        keterangan={
          totalPengguna
            ? `${angka(meta?.total ?? totalPengguna)} akun cocok · halaman ${meta?.current_page ?? halaman} dari ${angka(halamanAkhir)}`
            : 'Cari nama, email, username, NIK, NIP, atau nomor telepon.'
        }
        padat
      >
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3.5 sm:px-5">
          <form onSubmit={kirimCari} className="flex min-w-0 flex-1 items-center gap-2">
            <div className="relative min-w-0 flex-1 sm:min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Nama, email, username, NIK, NIP, telepon…"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs font-medium text-slate-700 outline-none transition-colors placeholder:font-normal placeholder:text-slate-400 focus:border-slate-400"
              />
            </div>
            <button
              type="submit"
              className="flex-shrink-0 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800"
            >
              Cari
            </button>
          </form>
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setHalaman(1);
            }}
            className="min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none focus:border-slate-400 sm:max-w-[200px]"
          >
            <option value="">Semua peran</option>
            {perRole.map((r) => (
              <option key={r.role} value={r.role}>
                {r.label} ({angka(r.total)})
              </option>
            ))}
          </select>
        </div>

        {galat ? (
          <div className="p-4 sm:p-5">
            <Galat pesan={galat} onUlang={ambil} />
          </div>
        ) : memuat && !data ? (
          <Memuat pesan="Memuat daftar akun…" />
        ) : !data?.length ? (
          <Kosong pesan="Tidak ada akun yang cocok." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-slate-50">
                  <tr className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-2.5 sm:px-5">Nama</th>
                    <th className="px-3 py-2.5">Kontak</th>
                    <th className="px-3 py-2.5">Peran</th>
                    <th className="px-3 py-2.5">Wilayah</th>
                    <th className="px-4 py-2.5 sm:px-5">Identitas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((u, i) => {
                    const nama = ambilSalah1(u, ['name', 'nama', 'full_name']) || '—';
                    const peran = daftarPeran(u);
                    return (
                      <tr key={u.id ?? i} className="transition-colors hover:bg-slate-50">
                        <td className="px-4 py-2.5 sm:px-5">
                          <span className="flex items-center gap-2">
                            <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500">
                              {String(nama).charAt(0).toUpperCase()}
                            </span>
                            <span className="font-semibold text-slate-900">{nama}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {ambilSalah1(u, ['email']) || '—'}
                          <span className="block text-[11px] text-slate-400">
                            {ambilSalah1(u, ['no_telp', 'phone', 'telepon']) || ambilSalah1(u, ['username']) || ''}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          {peran.length ? (
                            <span className="flex flex-wrap gap-1">
                              {peran.map((p) => (
                                <Lencana key={p} warna={SERI[2]}>
                                  {rapikanLabel(p)}
                                </Lencana>
                              ))}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-slate-600">
                          {ambilSalah1(u, ['desa', 'nama_desa']) || '—'}
                          <span className="block text-[11px] text-slate-400">
                            {ambilSalah1(u, ['kecamatan', 'nama_kecamatan'])
                              ? `Kec. ${ambilSalah1(u, ['kecamatan', 'nama_kecamatan'])}`
                              : ambilSalah1(u, ['region']) || ''}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 tabular-nums text-slate-500 sm:px-5">
                          {ambilSalah1(u, ['nip']) ? `NIP ${ambilSalah1(u, ['nip'])}` : ''}
                          {ambilSalah1(u, ['nik']) && (
                            <span className="block text-[11px] text-slate-400">
                              NIK •••• {String(ambilSalah1(u, ['nik'])).slice(-4)}
                            </span>
                          )}
                          {!ambilSalah1(u, ['nip']) && !ambilSalah1(u, ['nik']) && '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
              <p className="text-[11px] text-slate-500">
                Menampilkan {angka(data.length)} dari {angka(meta?.total ?? totalPengguna)} akun
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={halaman <= 1}
                  onClick={() => setHalaman((h) => Math.max(1, h - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Sebelumnya
                </button>
                <span className="px-2 text-[11px] font-semibold tabular-nums text-slate-700">
                  {meta?.current_page ?? halaman} / {angka(halamanAkhir)}
                </span>
                <button
                  type="button"
                  disabled={halaman >= halamanAkhir}
                  onClick={() => setHalaman((h) => h + 1)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Berikutnya
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
};

export default PenggunaTab;
