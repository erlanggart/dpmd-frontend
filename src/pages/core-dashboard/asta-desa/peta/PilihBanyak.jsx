/**
 * Dropdown pilihan ganda untuk bilah atas Peta Sebaran (kecamatan, desa).
 *
 * opsi: [{ kunci, label, sub?, nilai }]; terpilih: Set berisi `kunci`.
 * Kotak cari di dalamnya karena daftarnya panjang (40 kecamatan, ratusan desa).
 */

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const PilihBanyak = ({ label, opsi, terpilih, onToggle, onBersihkan, nonaktif = false, kosong = 'Tidak ada pilihan' }) => {
  const [buka, setBuka] = useState(false);
  const [cari, setCari] = useState('');
  const wadahRef = useRef(null);

  // Tutup saat mengklik di luar.
  useEffect(() => {
    if (!buka) return undefined;
    const tutup = (e) => {
      if (!wadahRef.current?.contains(e.target)) setBuka(false);
    };
    document.addEventListener('mousedown', tutup);
    return () => document.removeEventListener('mousedown', tutup);
  }, [buka]);

  const q = cari.toLowerCase().trim();
  const tampil = q ? opsi.filter((o) => `${o.label} ${o.sub || ''}`.toLowerCase().includes(q)) : opsi;
  const jumlah = terpilih.size;

  return (
    <div ref={wadahRef} className="pointer-events-auto relative flex-shrink-0">
      <button
        type="button"
        disabled={nonaktif}
        onClick={() => setBuka((v) => !v)}
        aria-expanded={buka}
        aria-haspopup="listbox"
        className="flex h-12 items-center gap-2 rounded-2xl border border-white bg-white px-4 text-xs font-bold text-slate-700 shadow-2xl transition-all hover:text-slate-900 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {label}
        {jumlah > 0 && (
          <span className="rounded-full bg-slate-800 px-1.5 py-0.5 text-[10px] leading-none text-white">{jumlah}</span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${buka ? 'rotate-180' : ''}`} />
      </button>

      {buka && (
        <div className="absolute left-0 top-14 z-50 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-100 p-2">
            <input
              autoFocus
              type="text"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder={`Cari ${label.toLowerCase()}…`}
              aria-label={`Cari ${label.toLowerCase()}`}
              className="w-full rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-slate-500/20"
            />
          </div>
          <ul role="listbox" aria-multiselectable="true" className="max-h-72 overflow-y-auto py-1">
            {tampil.length === 0 && <li className="px-4 py-3 text-xs text-slate-400">{kosong}</li>}
            {tampil.map((o) => (
              <li key={o.kunci} role="option" aria-selected={terpilih.has(o.kunci)}>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-2 text-sm hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={terpilih.has(o.kunci)}
                    onChange={() => onToggle(o)}
                    className="h-4 w-4 flex-shrink-0 accent-slate-800"
                  />
                  <span className="min-w-0 flex-1 truncate text-slate-700">{o.label}</span>
                  {o.sub && <span className="flex-shrink-0 text-[11px] text-slate-400">{o.sub}</span>}
                </label>
              </li>
            ))}
          </ul>
          {jumlah > 0 && (
            <button
              type="button"
              onClick={onBersihkan}
              className="w-full border-t border-slate-100 py-2.5 text-xs font-bold text-red-500 transition-colors hover:bg-red-50"
            >
              Bersihkan pilihan
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PilihBanyak;
