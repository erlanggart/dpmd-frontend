// Pratinjau dokumen BUMDes di tengah halaman.
//
// Dokumen dibuka DI SINI, bukan di tab baru: berpindah tab memutus alur baca —
// pembaca kehilangan filter, posisi gulir, dan BUMDes yang sedang dibukanya.
// Tab baru tetap tersedia sebagai tombol, jadi yang memang menginginkannya
// tidak kehilangan apa pun.
//
// Berkas disajikan dari /uploads yang terbuka tanpa token, jadi iframe dan img
// bisa memuatnya langsung. Kalau berkasnya tidak ada di server, iframe akan
// menampilkan halaman kosong — karena itu selalu ada jalan keluar berupa
// tombol unduh dan buka di tab baru.
import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Download, FileText, ScrollText, Loader2 } from 'lucide-react';
import { urlBerkas } from './bumdesFormat';

const jenisBerkas = (nama) => {
  const ext = String(nama || '').split('.').pop().toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) return 'gambar';
  return 'lain';
};

const DokumenViewer = ({ berkas, onClose }) => {
  const [tampil, setTampil] = useState(false);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    const t = requestAnimationFrame(() => setTampil(true));
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      cancelAnimationFrame(t);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (!berkas) return null;
  const tipe = jenisBerkas(berkas.nama);
  const url = urlBerkas(berkas);

  return (
    // Di atas modal detail (z-60) dan di atas bilah navigasi bawah.
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-0 sm:p-6">
      <button
        type="button"
        aria-label="Tutup pratinjau"
        onClick={onClose}
        className={`absolute inset-0 bg-slate-900/70 transition-opacity duration-200 ${
          tampil ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Pratinjau ${berkas.label}`}
        className={`relative flex h-full w-full max-w-5xl flex-col overflow-hidden bg-white shadow-2xl transition duration-200 sm:h-[88vh] sm:rounded-2xl ${
          tampil ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-2 scale-[0.98] opacity-0'
        }`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              {berkas.sumber === 'produk_hukum'
                ? <ScrollText className="h-4 w-4" />
                : <FileText className="h-4 w-4" />}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-semibold text-slate-900">{berkas.label}</h2>
              <p className="mt-0.5 truncate text-xs text-slate-500" title={berkas.nama}>
                {berkas.nama}
              </p>
              {berkas.sumber === 'produk_hukum' && (
                <p className="mt-1 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                  Arsip Produk Hukum desa
                  {berkas.keterangan ? ` · ${berkas.keterangan}` : ''}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center gap-1">
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              title="Buka di tab baru"
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            <a
              href={url}
              download={berkas.nama}
              title="Unduh berkas"
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <Download className="h-4 w-4" />
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        <div className="relative flex-1 bg-slate-100">
          {memuat && tipe !== 'lain' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          )}

          {tipe === 'pdf' && (
            <iframe
              title={berkas.label}
              src={url}
              onLoad={() => setMemuat(false)}
              className="relative h-full w-full border-0"
            />
          )}

          {tipe === 'gambar' && (
            <div className="flex h-full w-full items-center justify-center overflow-auto p-4">
              <img
                src={url}
                alt={berkas.label}
                onLoad={() => setMemuat(false)}
                onError={() => setMemuat(false)}
                className="max-h-full max-w-full object-contain"
              />
            </div>
          )}

          {tipe === 'lain' && (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <FileText className="h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm font-medium text-slate-700">
                Jenis berkas ini tidak bisa ditampilkan langsung
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Unduh berkasnya untuk membukanya di aplikasi yang sesuai.
              </p>
              <a
                href={url}
                download={berkas.nama}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              >
                <Download className="h-4 w-4" />
                Unduh {berkas.nama}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DokumenViewer;
