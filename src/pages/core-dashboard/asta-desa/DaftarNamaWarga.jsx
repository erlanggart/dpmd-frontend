/**
 * Daftar nama warga di satu desa untuk satu titik data Demografi.
 *
 * Dipanggil dari ModalRincian setelah wilayah diturunkan sampai desa. Server
 * yang menyaring (tipe/dim/label/kelompok/sisi); kita hanya meneruskan
 * deskriptor `pemilih` apa adanya. Data pribadi: tanpa ekspor/salin.
 */
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import api from '../../../api';
import { Galat, Kosong, Memuat } from './ui';
import { angka } from './warna';

const DaftarNamaWarga = ({ pemilih, kecamatan, desa, onKembali }) => {
  const [cari, setCari] = useState('');
  const [q, setQ] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [data, setData] = useState(null);
  const [galat, setGalat] = useState(null);
  const [ulangKe, setUlangKe] = useState(0);

  // Debounce kotak cari; pencarian baru selalu kembali ke halaman 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(cari.trim());
      setHalaman(1);
    }, 400);
    return () => clearTimeout(t);
  }, [cari]);

  useEffect(() => {
    let hidup = true;
    setData(null);
    setGalat(null);
    const params = { tipe: pemilih.tipe, kecamatan, desa, halaman };
    if (pemilih.dim) params.dim = pemilih.dim;
    if (pemilih.label) params.label = pemilih.label;
    if (pemilih.kelompok) params.kelompok = pemilih.kelompok.join(',');
    if (pemilih.sisi) params.sisi = pemilih.sisi;
    if (q) params.q = q;
    api
      .get('/asta-desa/demografi/nama', { params })
      .then((r) => hidup && setData(r.data?.data || {}))
      .catch((e) => hidup && setGalat(e.response?.data?.message || e.message || 'Gagal memuat daftar nama.'));
    return () => {
      hidup = false;
    };
  }, [pemilih, kecamatan, desa, q, halaman, ulangKe]);

  const ulang = () => setUlangKe((n) => n + 1);
  const perHalaman = data?.per_halaman || 50;
  const jumlahHalaman = Math.max(1, Math.ceil((data?.total || 0) / perHalaman));
  const items = data?.items || [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-shrink-0 space-y-2 border-b border-slate-100 px-5 py-3">
        <button
          type="button"
          onClick={onKembali}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke daftar desa
        </button>
        <div>
          <p className="text-sm font-semibold text-slate-900">{pemilih.sub || pemilih.judul}</p>
          <p className="text-xs text-slate-500">
            Desa {desa}, Kec. {kecamatan}
            {data && data.siap !== false && data.total !== undefined && (
              <>
                {' '}
                · <span className="font-semibold tabular-nums text-slate-900">{angka(data.total)}</span> orang
              </>
            )}
          </p>
        </div>
        <label className="relative block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama atau nama kepala keluarga…"
            className="h-8 w-full rounded-lg border border-slate-200 pl-8 pr-2 text-xs outline-none focus:border-slate-400"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-2">
        {galat ? (
          <Galat pesan={galat} onUlang={ulang} />
        ) : !data ? (
          <Memuat pesan="Memuat daftar nama…" />
        ) : data.siap === false ? (
          <div className="flex flex-col items-center py-12 text-center">
            <p className="text-sm text-slate-500">Data nama sedang disiapkan, coba lagi beberapa menit.</p>
            <button
              type="button"
              onClick={ulang}
              className="mt-3 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Coba lagi
            </button>
          </div>
        ) : !items.length ? (
          <Kosong pesan="Tidak ada nama yang cocok." />
        ) : (
          <ul>
            {items.map((it, i) => {
              // Baris sekeluarga dirapatkan: pemisah tebal hanya di awal keluarga baru.
              const sama = i > 0 && it.kk_nama && it.kk_nama === items[i - 1].kk_nama;
              const usia = it.usia !== null && it.usia !== undefined ? `${it.usia} th` : null;
              return (
                <li
                  key={`${it.sensus_id ?? ''}-${i}`}
                  className={`flex items-start justify-between gap-3 py-2 ${
                    i === 0 ? '' : sama ? 'border-t border-slate-100' : 'border-t-2 border-slate-200'
                  }`}
                >
                  <div className="min-w-0">
                    <p className={`text-sm ${it.nama ? 'font-semibold text-slate-900' : 'italic text-slate-600'}`}>{it.tampil}</p>
                    {it.keterangan && <p className="text-xs text-slate-500">{it.keterangan}</p>}
                  </div>
                  <span className="flex-shrink-0 text-[11px] tabular-nums text-slate-500">{[it.jk, usia].filter(Boolean).join(' · ')}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex-shrink-0 border-t border-slate-100 px-5 py-2">
        {data && data.siap !== false && jumlahHalaman > 1 && (
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <button
              type="button"
              disabled={halaman <= 1}
              onClick={() => setHalaman((h) => h - 1)}
              className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <span className="text-slate-500">
              Halaman {halaman} dari {jumlahHalaman}
            </span>
            <button
              type="button"
              disabled={halaman >= jumlahHalaman}
              onClick={() => setHalaman((h) => h + 1)}
              className="rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        )}
        <p className="text-[11px] text-slate-400">Data pribadi warga — gunakan hanya untuk keperluan dinas. Setiap akses tercatat.</p>
      </div>
    </div>
  );
};

export default DaftarNamaWarga;
