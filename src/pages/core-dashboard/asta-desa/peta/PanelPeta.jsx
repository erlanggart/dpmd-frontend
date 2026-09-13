/**
 * Panel mengapung Peta Sebaran — tiga tab: Layer, Info, Filter.
 *
 * Bentuknya meniru panel super admin ASTA DESA: lebar 384 px, latar putih
 * semi-transparan berlatar-blur, sudut membulat, label sangat kecil berhuruf
 * kapital berspasi lebar. Lihat docs/PETA_SEBARAN_ASTA_DESA.md untuk padanan
 * tiap angkanya.
 *
 * SENGAJA TANPA VARIAN `dark:`. Panel asalnya punya mode gelap karena Filament
 * punya sakelar temanya; Core Dashboard DPMD seluruhnya terang. Di Tailwind v4
 * tanpa setelan `dark` berbasis kelas, `dark:` jatuh ke `prefers-color-scheme` —
 * jadi menyalinnya apa adanya akan membuat panel ini menggelap sendiri di laptop
 * bertema gelap sementara sisa halaman tetap putih.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Info, Loader2, X } from 'lucide-react';
import { urlLegenda } from './konfigPeta';

/** Label kecil khas panel ini: 9–10 px, hitam tebal, kapital, berspasi lebar. */
const LabelKecil = ({ children, className = '' }) => (
  <span className={`text-[9px] font-black uppercase tracking-widest text-slate-400 ${className}`}>
    {children}
  </span>
);

/** Satu baris layer: sakelar, lalu kontrol transparansi & legenda yang mengembang. */
const BarisLayer = ({ layer, onToggle, onOpacity }) => {
  const [terbuka, setTerbuka] = useState(false);
  const [subTab, setSubTab] = useState('opacity');
  const [legendaGagal, setLegendaGagal] = useState(false);

  return (
    <div className="space-y-4">
      <div className="group/item flex items-center justify-between">
        <button
          type="button"
          onClick={() => setTerbuka((v) => !v)}
          className="flex flex-1 items-center gap-3 text-left"
        >
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-400 transition-all group-hover/item:bg-slate-200 group-hover/item:text-slate-600">
            <ChevronRight
              className={`h-3 w-3 transition-transform duration-300 ${terbuka ? 'rotate-90' : ''}`}
              strokeWidth={3}
            />
          </span>
          <span className="min-w-0 truncate text-[13px] font-bold text-slate-600" title={layer.nama}>
            {layer.nama}
          </span>
        </button>

        {/* Sakelar. Dibuat dari <button role="switch"> dan bukan <input
            type="checkbox"> karena bentuk jalur+knop di panel asalnya bersandar
            pada `peer-checked` milik Tailwind di dalam <label>; di React,
            tombol dengan aria-checked lebih jujur dan tetap terbaca pembaca
            layar. */}
        <button
          type="button"
          role="switch"
          aria-checked={layer.visible}
          aria-label={`Tampilkan layer ${layer.nama}`}
          onClick={() => onToggle(layer)}
          className="relative inline-flex h-[22px] w-10 flex-shrink-0 items-center rounded-full shadow-inner transition-colors"
          style={{ backgroundColor: layer.visible ? '#475569' : '#e2e8f0' }}
        >
          <span
            className={`absolute left-1 h-3.5 w-3.5 rounded-full bg-white shadow-lg transition-transform ${
              layer.visible ? 'translate-x-[18px]' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {terbuka && (
        <div className="ml-4 space-y-4 border-l border-slate-100 pb-2 pl-11">
          <div className="flex max-w-fit rounded-xl border border-slate-100 bg-slate-50 p-1">
            {[
              { k: 'opacity', l: 'Opacity' },
              { k: 'legend', l: 'Legenda' }
            ].map((t) => (
              <button
                key={t.k}
                type="button"
                onClick={() => setSubTab(t.k)}
                className={`rounded-lg px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all ${
                  subTab === t.k ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {t.l}
              </button>
            ))}
          </div>

          {subTab === 'opacity' ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <LabelKecil className="tracking-[0.15em]">Transparansi</LabelKecil>
                <span className="text-[9px] font-bold text-slate-600">
                  {Math.round(layer.opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={layer.opacity}
                onChange={(e) => onOpacity(layer, Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-100 accent-slate-600"
                aria-label={`Transparansi layer ${layer.nama}`}
              />
            </div>
          ) : (
            <div className="flex min-h-[40px] items-center rounded-2xl border border-slate-100 bg-white/50 p-2">
              {!layer.visible ? (
                <span className="text-[10px] font-medium italic text-slate-400">
                  Aktifkan layer untuk melihat legenda
                </span>
              ) : layer.tipe === 'geoserver' || layer.tipe === 'wms' ? (
                legendaGagal ? (
                  <span className="text-[10px] font-medium italic text-slate-400">Legenda tidak tersedia</span>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <img
                      src={urlLegenda(layer)}
                      alt={`Legenda ${layer.nama}`}
                      className="max-w-none mix-blend-multiply"
                      onError={() => setLegendaGagal(true)}
                    />
                  </div>
                )
              ) : (
                <div className="flex items-center gap-3">
                  <span className="h-4 w-4 rounded-md border-2 border-slate-500 bg-slate-500/20 shadow-[0_0_10px_rgba(100,116,139,0.3)]" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Data Vektor
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/** Kartu cuaca BMKG — empat metrik, sama dengan panel super admin. */
const KartuCuaca = ({ cuaca }) => {
  const c = cuaca?.weather;
  const l = cuaca?.location;
  if (!c) return null;

  const metrik = [
    ['Temperatur', c.t !== undefined && c.t !== null ? `${c.t}°C` : '—', true],
    ['Kondisi', c.weather_desc || '—', false],
    ['Kelembaban', c.hu !== undefined && c.hu !== null ? `${c.hu}%` : '—', false],
    ['Angin', c.ws !== undefined && c.ws !== null ? `${c.ws} km/h ${c.wd || ''}`.trim() : '—', false]
  ];

  return (
    <div className="rounded-3xl border border-blue-100/70 bg-blue-50/50 p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600/70">Cuaca (BMKG)</h4>
          {l && (
            <p className="truncate text-[11px] font-bold text-slate-700">
              {[l.desa, l.kecamatan].filter(Boolean).join(', ') || '—'}
            </p>
          )}
        </div>
        {c.image && <img src={c.image} alt={c.weather_desc || 'Cuaca'} className="h-12 w-12 flex-shrink-0" />}
      </div>
      <div className="grid grid-cols-2 gap-4">
        {metrik.map(([label, nilai, besar]) => (
          <div key={label} className="space-y-1">
            <LabelKecil>{label}</LabelKecil>
            <p className={`font-bold text-slate-700 ${besar ? 'text-xl' : 'text-[11px]'}`}>{nilai}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Akordion atribut satu fitur. Yang pertama terbuka, seperti di panel. */
const KartuFitur = ({ fitur, indeks, onBukaDetail }) => {
  const [terbuka, setTerbuka] = useState(indeks === 0);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white/50 shadow-sm">
      <button
        type="button"
        onClick={() => setTerbuka((v) => !v)}
        className="flex w-full items-center justify-between p-4 text-left transition-colors hover:bg-slate-50"
      >
        <span className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-slate-500 shadow-[0_0_8px_rgba(100,116,139,0.5)]" />
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-700">
            {fitur.namaLayer}
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-slate-400 transition-transform duration-300 ${
            terbuka ? 'rotate-180' : ''
          }`}
        />
      </button>

      {terbuka && (
        <div className="px-4 pb-4">
          {fitur.memuat && (
            <p className="flex items-center gap-2 pb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Mengambil atribut lengkap…
            </p>
          )}

          {fitur.foto && (
            <div className="group relative mb-4 overflow-hidden rounded-xl border border-slate-100 bg-slate-100">
              <div className="aspect-[16/10]">
                <img
                  src={fitur.foto}
                  alt="Foto rumah"
                  loading="lazy"
                  className="h-full w-full transform object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <span className="absolute bottom-3 right-3 rounded-lg bg-black/40 px-2 py-1 text-[8px] font-black uppercase tracking-widest text-white opacity-0 backdrop-blur-md transition-opacity group-hover:opacity-100">
                Foto Lapangan
              </span>
            </div>
          )}

          <div className="space-y-1">
            {fitur.atribut.map(([kunci, nilai]) => (
              <div
                key={kunci}
                className="flex items-start gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-slate-50"
              >
                <div className="w-2/5 flex-shrink-0">
                  <LabelKecil className="inline-block leading-snug">{kunci}</LabelKecil>
                </div>
                <div className="flex-1">
                  <span className="inline-block text-[11px] font-semibold leading-snug text-slate-800">
                    {nilai || '-'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {fitur.id && onBukaDetail && (
            <button
              type="button"
              onClick={() => onBukaDetail(fitur.id)}
              className="mt-4 block w-full rounded-xl bg-slate-900 py-3 text-center text-[10px] font-black uppercase leading-none tracking-widest text-white shadow-lg transition-all hover:scale-[1.02] active:scale-95"
            >
              Detail Aset
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const GAYA_SELECT =
  'w-full rounded-2xl border-none bg-slate-100 px-4 py-3.5 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-slate-500/20';

const PanelPeta = ({
  terbuka,
  onTutup,
  tab,
  setTab,
  grupLayer,
  onToggleLayer,
  onOpacity,
  fiturTerpilih,
  memuatInfo,
  cuaca,
  filter,
  setFilter,
  daftarKecamatan,
  daftarDesa,
  daftarEnumerator,
  koordinat,
  onBersihkanFilter,
  onBukaDetail
}) => {
  const adaFilter = Boolean(filter.search || filter.kecamatan || filter.desa || filter.user);

  return (
    <section
      aria-label="Panel peta"
      className={`absolute bottom-6 left-6 top-24 z-30 flex w-[min(384px,calc(100vw-3rem))] flex-col overflow-hidden rounded-lg border border-white bg-white/80 shadow-2xl backdrop-blur-3xl transition-all duration-500 ${
        terbuka ? 'translate-x-0 opacity-100' : 'pointer-events-none -translate-x-[120%] opacity-0'
      }`}
    >
      <div className="p-8 pb-4">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Peta Sebaran</h2>
          <button
            type="button"
            onClick={onTutup}
            aria-label="Tutup panel"
            className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-4 flex gap-2 rounded-2xl bg-slate-100/80 p-1.5 shadow-inner">
          {[
            { k: 'layer', l: 'Layer' },
            { k: 'info', l: 'Info' },
            { k: 'filter', l: 'Filter' }
          ].map((t) => (
            <button
              key={t.k}
              type="button"
              onClick={() => setTab(t.k)}
              className={`flex-1 rounded-xl py-2 text-[11px] uppercase tracking-wider transition-all ${
                tab === t.k
                  ? 'bg-white font-black text-slate-600 shadow-md'
                  : 'font-bold text-slate-500 hover:text-slate-700'
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Layer */}
      {tab === 'layer' && (
        <div className="custom-scrollbar flex-1 space-y-8 overflow-y-auto px-8 pb-8">
          {grupLayer.length === 0 && (
            <p className="text-[11px] leading-relaxed text-slate-400">
              Belum ada layer aktif di ASTA DESA, jadi hanya titik data kuesioner yang tergambar.
            </p>
          )}
          {grupLayer.map((grup) => (
            <div key={grup.nama}>
              <h3 className="mb-5 px-1 text-[10px] uppercase tracking-[0.2em] text-slate-400">{grup.label}</h3>
              <div className="space-y-5">
                {grup.layers.map((layer) => (
                  <BarisLayer key={layer.id} layer={layer} onToggle={onToggleLayer} onOpacity={onOpacity} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab Info */}
      {tab === 'info' && (
        <div className="custom-scrollbar flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-4 pt-2">
            {memuatInfo && (
              <div className="flex animate-pulse items-center gap-4 rounded-3xl border border-slate-100/70 bg-slate-50/50 p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-500/20">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
                </span>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600/70">
                    Mencari Data…
                  </p>
                  <p className="text-[9px] font-medium text-slate-400">Menghubungi Server</p>
                </div>
              </div>
            )}

            <KartuCuaca cuaca={cuaca} />

            {fiturTerpilih.map((fitur, i) => (
              <KartuFitur key={`${fitur.namaLayer}-${i}`} fitur={fitur} indeks={i} onBukaDetail={onBukaDetail} />
            ))}

            {!memuatInfo && fiturTerpilih.length === 0 && !cuaca && (
              <div className="mt-12 flex h-full flex-col items-center justify-center px-6 text-center opacity-30">
                <Info className="mb-4 h-16 w-16 text-slate-400" strokeWidth={1.2} />
                <p className="text-[11px] font-black uppercase leading-relaxed tracking-[0.15em]">
                  Klik fitur pada peta
                  <br />
                  untuk informasi atribut
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab Filter */}
      {tab === 'filter' && (
        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto px-8 pb-8">
          <div>
            <label htmlFor="f-kecamatan" className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Kecamatan
            </label>
            <select
              id="f-kecamatan"
              value={filter.kecamatan}
              onChange={(e) => setFilter({ ...filter, kecamatan: e.target.value, desa: '' })}
              className={GAYA_SELECT}
            >
              <option value="">Semua Kecamatan</option>
              {daftarKecamatan.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          {filter.kecamatan && (
            <div>
              <label htmlFor="f-desa" className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-400">
                Kelurahan/Desa
              </label>
              <select
                id="f-desa"
                value={filter.desa}
                onChange={(e) => setFilter({ ...filter, desa: e.target.value })}
                className={GAYA_SELECT}
              >
                <option value="">Semua Kelurahan/Desa</option>
                {daftarDesa.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="f-enumerator" className="mb-3 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Enumerator
            </label>
            <select
              id="f-enumerator"
              value={filter.user}
              onChange={(e) => setFilter({ ...filter, user: e.target.value })}
              className={GAYA_SELECT}
            >
              <option value="">Semua Enumerator</option>
              {daftarEnumerator.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          {adaFilter && (
            <button
              type="button"
              onClick={onBersihkanFilter}
              className="w-full rounded-xl border border-red-500/20 bg-red-500/10 py-3 text-[10px] font-black uppercase leading-none tracking-widest text-red-500 transition-all hover:bg-red-500 hover:text-white"
            >
              Bersihkan Filter
            </button>
          )}
        </div>
      )}

      {/* Footer: koordinat kursor */}
      <div className="mt-auto border-t border-slate-100 bg-slate-50/50 p-6">
        <div className="flex items-center justify-between text-[10px] font-black">
          <span className="uppercase tracking-widest text-slate-400">Koordinat</span>
          <span className="font-mono text-slate-800">{koordinat}</span>
        </div>
      </div>
    </section>
  );
};

export default PanelPeta;
