// Daftar BUMDes di balik satu batang (mis. "Makan Bergizi Gratis 45").
//
// Angka saja tidak menjawab pertanyaan berikutnya yang selalu muncul: desa
// mana saja? Modal ini menampilkan nama BUMDes, desa, dan kecamatannya, bisa
// dicari, dan tiap barisnya membuka kartu detail yang sama dengan direktori.
// Menyaring seluruh halaman tetap tersedia lewat tombol, bukan efek samping
// klik — sebelumnya klik langsung menyaring, sehingga batangnya sendiri
// melompat ke 100% dan daftarnya tersembunyi jauh di bawah halaman.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Search, Filter, MapPin } from 'lucide-react';
import BumdesDetailModal from './BumdesDetailModal';
import { LencanaStatus } from './BumdesLencana';
import { nf } from './bumdesFormat';

const teks = (v) => (v === null || v === undefined || String(v).trim() === '' ? '—' : String(v));

/**
 * `buka`: { judul, keterangan?, daftar, rincian?(d) => string|null, onSaring? }
 * atau null bila tertutup.
 */
const BumdesDaftarModal = ({ buka, onClose, onUbah }) => {
  const [cari, setCari] = useState('');
  const [dipilih, setDipilih] = useState(null);
  const [tampil, setTampil] = useState(false);
  // Lewat ref supaya membuka detail tidak memasang ulang efek di bawah
  // (yang akan mengosongkan pencarian dan mengulang animasi masuk).
  const dipilihRef = useRef(null);
  dipilihRef.current = dipilih;

  useEffect(() => {
    if (!buka) return undefined;
    setCari('');
    const t = requestAnimationFrame(() => setTampil(true));
    const onKey = (e) => {
      // Selama kartu detail terbuka, Esc miliknya.
      if (e.key === 'Escape' && !dipilihRef.current) onClose();
    };
    document.addEventListener('keydown', onKey);
    const sebelumnya = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = sebelumnya;
      setTampil(false);
    };
  }, [buka, onClose]);

  const hasil = useMemo(() => {
    if (!buka) return [];
    const kata = cari.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return buka.daftar
      .filter((d) => {
        if (!kata.length) return true;
        const isi = [d.nama, d.desa, d.kecamatan].filter(Boolean).join(' ').toLowerCase();
        return kata.every((k) => isi.includes(k));
      })
      .sort((a, b) =>
        String(a.kecamatan ?? '').localeCompare(String(b.kecamatan ?? ''), 'id')
        || String(a.desa ?? '').localeCompare(String(b.desa ?? ''), 'id'));
  }, [buka, cari]);

  if (!buka) return null;

  return (
    <>
      {/* z-[60]+ wajib: bilah navigasi bawah memakai z-50 dan akan menelan klik. */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-6">
        <button
          type="button"
          aria-label="Tutup daftar"
          onClick={onClose}
          className={`absolute inset-0 bg-slate-900/50 backdrop-blur-[2px] transition-opacity duration-200 ${
            tampil ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <div
          role="dialog"
          aria-modal="true"
          aria-label={buka.judul}
          className={`relative flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl transition duration-200 sm:h-auto sm:max-h-[85vh] sm:rounded-2xl ${
            tampil ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-[0.98] opacity-0'
          }`}
        >
          <header className="flex-shrink-0 border-b border-slate-200 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-slate-900">{buka.judul}</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {nf.format(buka.daftar.length)} BUMDes
                  {buka.keterangan ? ` · ${buka.keterangan}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={cari}
                  onChange={(e) => setCari(e.target.value)}
                  placeholder="Cari nama BUMDes, desa, atau kecamatan…"
                  className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none transition-colors focus:border-slate-400"
                />
              </label>
              {buka.onSaring && (
                <button
                  type="button"
                  onClick={() => { buka.onSaring(); onClose(); }}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                >
                  <Filter className="h-4 w-4" />
                  {buka.labelSaring || 'Saring halaman'}
                </button>
              )}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            {hasil.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-slate-500">
                {buka.daftar.length ? 'Tidak ada yang cocok dengan pencarian.' : 'Belum ada BUMDes di kategori ini.'}
              </p>
            ) : (
              <ol className="divide-y divide-slate-100">
                {hasil.map((d, i) => {
                  const rincian = buka.rincian?.(d);
                  return (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => setDipilih(d)}
                        className="flex w-full items-start gap-3 px-5 py-3 text-left transition-colors hover:bg-slate-50 focus:bg-slate-50 focus:outline-none"
                      >
                        <span className="mt-0.5 w-6 flex-shrink-0 text-right text-xs tabular-nums text-slate-400">
                          {i + 1}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-900">
                            Desa {teks(d.desa)}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">Kec. {teks(d.kecamatan)} · {teks(d.nama)}</span>
                          </span>
                          {rincian && (
                            <span className="mt-1 block truncate text-xs text-slate-600">{rincian}</span>
                          )}
                        </span>
                        <LencanaStatus status={d.status} />
                      </button>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </div>

      <BumdesDetailModal item={dipilih} onClose={() => setDipilih(null)} onUbah={onUbah} />
    </>
  );
};

export default BumdesDaftarModal;
