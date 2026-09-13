/**
 * Tab Layer & Pesan — dua daftar pendukung dari ASTA DESA.
 *
 * Keduanya bukan angka yang dianalisis, melainkan daftar yang sesekali perlu
 * dicek: layer peta apa saja yang terdaftar di sana, dan lalu lintas pesan
 * terakhir. Jadi tampilannya memang daftar, bukan grafik — memaksakan grafik
 * pada isi seperti ini hanya menambah tinta tanpa menambah jawaban.
 */

import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Layers, MapPin, MessageSquare } from 'lucide-react';
import { Galat, Kosong, Lencana, Memuat, Panel } from './ui';
import { useAstaDesa } from './useAstaDesa';
import { SERI, angka, rapikanLabel, waktuSingkat } from './warna';

/** Nilai pertama yang ada dari sederet nama kolom yang mungkin. */
const salahSatu = (obj, kunci) => {
  for (const k of kunci) {
    const v = obj?.[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
};

const LayerPesanTab = () => {
  const [halamanPesan, setHalamanPesan] = useState(1);

  const layer = useAstaDesa('/layer');
  const pesan = useAstaDesa('/pesan', { page: halamanPesan, per_page: 25 });

  // Lihat catatan yang sama di PetaTab: array literal baru tiap render membuat
  // useMemo di bawahnya tidak pernah benar-benar menyimpan hasilnya.
  const daftarLayer = useMemo(() => layer.data || [], [layer.data]);
  const daftarPesan = pesan.data || [];
  const halamanAkhir = pesan.meta?.last_page ?? 1;

  // Kolom apa pun yang dikirim untuk sebuah layer ditampilkan; kita tidak tahu
  // skema layer mereka, dan menyembunyikan kolom yang tidak dikenali berarti
  // membuang justru bagian yang ingin dilihat pengelola peta.
  const kolomLayer = useMemo(() => {
    const kunci = new Set();
    daftarLayer.forEach((l) =>
      Object.entries(l || {}).forEach(([k, v]) => {
        if (v !== null && v !== undefined && typeof v !== 'object') kunci.add(k);
      })
    );
    ['id', 'name', 'nama', 'created_at', 'updated_at'].forEach((k) => kunci.delete(k));
    return Array.from(kunci).slice(0, 6);
  }, [daftarLayer]);

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <Panel
        judul="Layer peta"
        keterangan={daftarLayer.length ? `${angka(daftarLayer.length)} layer terdaftar` : 'Layer yang terdaftar di ASTA DESA'}
      >
        {layer.galat ? (
          <Galat pesan={layer.galat} onUlang={layer.ambil} />
        ) : layer.memuat && !layer.data ? (
          <Memuat tinggi="py-10" pesan="Memuat layer…" />
        ) : !daftarLayer.length ? (
          <Kosong ikon={Layers} pesan="Belum ada layer peta yang terdaftar." />
        ) : (
          <ul className="space-y-2.5">
            {daftarLayer.map((l, i) => (
              <li
                key={l.id ?? i}
                className="rounded-xl border border-slate-200 px-3.5 py-3 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {salahSatu(l, ['name', 'nama', 'title', 'judul']) || `Layer #${l.id ?? i + 1}`}
                    </p>
                    {salahSatu(l, ['description', 'deskripsi', 'keterangan']) && (
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                        {salahSatu(l, ['description', 'deskripsi', 'keterangan'])}
                      </p>
                    )}
                  </div>
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                    <MapPin className="h-3.5 w-3.5" />
                  </span>
                </div>
                {kolomLayer.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {kolomLayer
                      .filter((k) => l[k] !== null && l[k] !== undefined && l[k] !== '')
                      .map((k) => (
                        <Lencana key={k} warna={SERI[2]}>
                          {rapikanLabel(k)}: {String(l[k])}
                        </Lencana>
                      ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        judul="Riwayat pesan"
        keterangan={
          pesan.meta?.total
            ? `${angka(pesan.meta.total)} pesan · halaman ${pesan.meta.current_page ?? halamanPesan} dari ${angka(halamanAkhir)}`
            : 'Lalu lintas pesan di ASTA DESA'
        }
        padat
      >
        {pesan.galat ? (
          <div className="p-4 sm:p-5">
            <Galat pesan={pesan.galat} onUlang={pesan.ambil} />
          </div>
        ) : pesan.memuat && !pesan.data ? (
          <Memuat tinggi="py-10" pesan="Memuat pesan…" />
        ) : !daftarPesan.length ? (
          <Kosong ikon={MessageSquare} pesan="Belum ada pesan." />
        ) : (
          <>
            <ul className="max-h-[520px] divide-y divide-slate-100 overflow-y-auto">
              {daftarPesan.map((p, i) => (
                <li key={p.id ?? i} className="px-4 py-3 transition-colors hover:bg-slate-50 sm:px-5">
                  <div className="flex items-baseline justify-between gap-3">
                    {/* Tabel `messages` di ASTA DESA hanya menyimpan sender_id
                        dan receiver_id — tidak ada nama pengirim yang ikut
                        dikirim. Menampilkan nomor akunnya masih menjawab "dari
                        siapa ke siapa", sedangkan "Tanpa pengirim" di setiap
                        baris membuat daftar ini tampak rusak padahal utuh. */}
                    <p className="min-w-0 truncate text-xs font-semibold text-slate-900">
                      {salahSatu(p, ['sender', 'pengirim', 'user_name', 'name']) ||
                        (salahSatu(p, ['sender_id'])
                          ? `Akun #${salahSatu(p, ['sender_id'])}${
                              salahSatu(p, ['receiver_id']) ? ` → #${salahSatu(p, ['receiver_id'])}` : ''
                            }`
                          : 'Tanpa pengirim')}
                    </p>
                    <span className="flex-shrink-0 text-[11px] text-slate-400">
                      {waktuSingkat(salahSatu(p, ['created_at', 'tanggal', 'waktu', 'sent_at']))}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    {salahSatu(p, ['body', 'message', 'pesan', 'isi', 'text']) || '—'}
                  </p>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 sm:px-5">
              <p className="text-[11px] text-slate-500">
                Menampilkan {angka(daftarPesan.length)} pesan terakhir
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={halamanPesan <= 1}
                  onClick={() => setHalamanPesan((h) => Math.max(1, h - 1))}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                  Sebelumnya
                </button>
                <button
                  type="button"
                  disabled={halamanPesan >= halamanAkhir}
                  onClick={() => setHalamanPesan((h) => h + 1)}
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

export default LayerPesanTab;
