/**
 * Tab Peta Sebaran.
 *
 * TIGA TINGKAT KEDALAMAN, bukan satu. Sebaran ribuan titik keluarga menjawab
 * "di mana persisnya", tetapi pada zoom kabupaten titik-titik itu menumpuk jadi
 * gumpalan gelap yang tidak bisa dibandingkan antar wilayah. Gelembung per
 * kecamatan menjawab "wilayah mana yang tertinggal". Keduanya dibutuhkan, jadi
 * keduanya disediakan dan bisa ditukar tanpa memuat ulang data.
 *
 * Peta digambar di atas kanvas (`preferCanvas`), bukan SVG. Dengan beberapa ribu
 * penanda, SVG membuat satu elemen DOM per titik dan panning-nya tersendat
 * sampai peta terasa rusak; kanvas menggambarnya sebagai satu lapisan.
 */

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip as TooltipPeta, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { ExternalLink, MapPinOff, Maximize2 } from 'lucide-react';
import { Galat, Kosong, Legenda, Memuat, Panel } from './ui';
import {
  SEBARAN,
  angka,
  peringkatStatus,
  persen,
  rapikanLabel,
  tanggalSingkat,
  warnaSebaran,
  warnaStatus
} from './warna';

const PUSAT_BOGOR = [-6.5971, 106.806];

// Batas jumlah titik yang digambar sekaligus. Di atas angka ini peta tetap bisa
// digambar, tetapi interaksinya mulai terasa berat di laptop kantor — dan peta
// yang macet lebih buruk daripada peta yang jujur mengatakan ia menampilkan
// sebagian. Penyaring kecamatan adalah jalan keluarnya.
const BATAS_TITIK = 6000;

/** Sesuaikan bingkai peta dengan titik yang benar-benar tampil. */
const IkutiTitik = ({ titik }) => {
  const map = useMap();
  React.useEffect(() => {
    if (!titik.length) return;
    map.fitBounds(
      titik.map((t) => [t.lat, t.lng]),
      { padding: [36, 36], maxZoom: 13 }
    );
    // Sengaja hanya bergantung pada jumlah & kunci penyaring: bergantung pada
    // array titik membuat peta melompat balik ke bingkai awal setiap render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titik.length, map]);
  return null;
};

/** Radius gelembung dari akar jumlah — luas lingkaran yang sebanding, bukan jarinya. */
const radiusGelembung = (nilai, maks) => {
  if (!maks) return 6;
  return 7 + Math.sqrt(nilai / maks) * 23;
};

const PetaTab = ({ data, memuat, galat, onUlang }) => {
  const [mode, setMode] = useState('kecamatan'); // kecamatan | desa | titik
  const [filterKecamatan, setFilterKecamatan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Dibungkus useMemo: `data?.titik || []` menghasilkan array BARU tiap render
  // saat data masih null, dan itu membuat seluruh useMemo di bawahnya menghitung
  // ulang agregat ribuan titik pada setiap ketikan di kotak penyaring.
  const titikSemua = useMemo(() => data?.titik || [], [data?.titik]);

  const daftarKecamatan = useMemo(
    () => Array.from(new Set(titikSemua.map((t) => t.kecamatan))).sort((a, b) => a.localeCompare(b)),
    [titikSemua]
  );

  const daftarStatus = useMemo(
    () =>
      Array.from(new Set(titikSemua.map((t) => t.status))).sort(
        (a, b) => peringkatStatus(a) - peringkatStatus(b)
      ),
    [titikSemua]
  );

  const tersaring = useMemo(
    () =>
      titikSemua.filter(
        (t) =>
          (!filterKecamatan || t.kecamatan === filterKecamatan) &&
          (!filterStatus || t.status === filterStatus)
      ),
    [titikSemua, filterKecamatan, filterStatus]
  );

  // Rekap per desa dihitung di browser: backend hanya mengirim rekap per
  // kecamatan, dan tingkat desa harus ikut penyaring status yang sedang aktif.
  const perDesa = useMemo(() => {
    const ember = new Map();
    tersaring.forEach((t) => {
      const kunci = `${t.kecamatan}|${t.desa}`;
      const e = ember.get(kunci) || { kecamatan: t.kecamatan, desa: t.desa, total: 0, sumLat: 0, sumLng: 0 };
      e.total += 1;
      e.sumLat += t.lat;
      e.sumLng += t.lng;
      ember.set(kunci, e);
    });
    return Array.from(ember.values()).map((e) => ({
      ...e,
      lat: e.sumLat / e.total,
      lng: e.sumLng / e.total
    }));
  }, [tersaring]);

  const perKecamatan = useMemo(() => {
    const ember = new Map();
    tersaring.forEach((t) => {
      const e = ember.get(t.kecamatan) || { kecamatan: t.kecamatan, total: 0, sumLat: 0, sumLng: 0, desa: new Set() };
      e.total += 1;
      e.sumLat += t.lat;
      e.sumLng += t.lng;
      e.desa.add(t.desa);
      ember.set(t.kecamatan, e);
    });
    return Array.from(ember.values()).map((e) => ({
      kecamatan: e.kecamatan,
      total: e.total,
      total_desa: e.desa.size,
      lat: e.sumLat / e.total,
      lng: e.sumLng / e.total
    }));
  }, [tersaring]);

  const gelembung = mode === 'desa' ? perDesa : perKecamatan;
  const maksGelembung = useMemo(() => Math.max(1, ...gelembung.map((g) => g.total)), [gelembung]);

  const titikTampil = useMemo(() => tersaring.slice(0, BATAS_TITIK), [tersaring]);
  const titikDipotong = tersaring.length - titikTampil.length;

  // Kunci untuk memaksa peta memasang ulang saat mode berubah. Lapisan kanvas
  // Leaflet tidak selalu membuang penanda lama dengan bersih ketika seluruh
  // isinya berganti jenis, dan sisa penanda lama terbaca sebagai data hantu.
  const kunciPeta = `${mode}|${filterKecamatan}|${filterStatus}`;

  if (galat) return <Galat pesan={galat} onUlang={onUlang} />;
  if (memuat && !data) return <Memuat pesan="Menyusun titik sebaran…" />;
  if (!data) return <Kosong pesan="Belum ada data sebaran." />;

  const totalBaris = data.total_baris || 0;

  return (
    <div className="space-y-4">
      {/* Kelengkapan koordinat — ditulis lebih dulu, sebelum petanya.
          Peta yang mewakili 40% data tetap tampak meyakinkan, dan pembaca yang
          tidak diberi tahu porsinya akan membaca lubang di peta sebagai "tidak
          ada keluarga di sana" padahal artinya "koordinatnya belum diisi". */}
      {data.tanpa_koordinat > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-900/[0.03]">
          <MapPinOff className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
          <p className="text-xs leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-900">
              {angka(data.tanpa_koordinat)} dari {angka(totalBaris)} baris sensus
            </span>{' '}
            ({persen(data.tanpa_koordinat, totalBaris)}) tidak punya koordinat yang bisa dipetakan, jadi tidak muncul
            di peta ini. Angka pada tab Ringkasan tetap menghitungnya utuh — ini soal kelengkapan koordinat, bukan soal
            keluarganya belum terdata.
          </p>
        </div>
      )}

      {/* Koordinat di luar Kabupaten Bogor. Dipisahkan dari banner di atas
          karena tindak lanjutnya berbeda: yang ini BUKAN data yang belum
          lengkap, melainkan baris yang koordinatnya salah dan bisa dibetulkan
          di ASTA DESA. Dibiarkan masuk peta, satu baris seperti ini saja sudah
          membentangkan bingkai peta sampai luar Jawa. */}
      {data.di_luar_wilayah > 0 && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
          <MapPinOff className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed text-slate-700">
            <span className="font-semibold text-slate-900">
              {angka(data.di_luar_wilayah)} baris berkoordinat di luar Kabupaten Bogor
            </span>{' '}
            tidak digambar di peta ini — koordinatnya kemungkinan salah isi atau sisa data uji coba. Barisnya tetap
            terhitung di tab Ringkasan dan tetap muncul di tab Data Sensus, jadi masih bisa ditelusuri dan dibetulkan
            di ASTA DESA.
          </p>
        </div>
      )}

      <Panel
        judul="Peta sebaran pendataan"
        keterangan={
          mode === 'titik'
            ? `${angka(titikTampil.length)} titik keluarga${titikDipotong > 0 ? ` dari ${angka(tersaring.length)}` : ''}`
            : `${angka(gelembung.length)} ${mode === 'desa' ? 'desa/kelurahan' : 'kecamatan'} · ${angka(tersaring.length)} keluarga`
        }
        padat
        aksi={
          <>
            <div className="flex rounded-lg bg-slate-100 p-0.5">
              {[
                { k: 'kecamatan', l: 'Kecamatan' },
                { k: 'desa', l: 'Desa' },
                { k: 'titik', l: 'Titik' }
              ].map((m) => (
                <button
                  key={m.k}
                  type="button"
                  onClick={() => setMode(m.k)}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    mode === m.k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {m.l}
                </button>
              ))}
            </div>

            {/* Pintu ke peta penuh. Tab ini menjawab "wilayah mana yang
                tertinggal"; yang di balik tombol ini menjawab "apa isi titik
                ini" — lengkap dengan layer WMS, legenda, dan cetakan A3, persis
                seperti panel super admin ASTA DESA. */}
            <Link
              to="/core-dashboard/asta-desa/peta-sebaran"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-slate-800"
            >
              <ExternalLink className="h-3 w-3" />
              Buka peta penuh
            </Link>
          </>
        }
      >
        {/* Penyaring satu baris di atas peta — tidak tersebar di sisi-sisi. */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3 sm:px-5">
          <select
            value={filterKecamatan}
            onChange={(e) => setFilterKecamatan(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition-colors focus:border-slate-400 sm:max-w-[220px]"
          >
            <option value="">Semua kecamatan ({daftarKecamatan.length})</option>
            {daftarKecamatan.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 outline-none transition-colors focus:border-slate-400 sm:max-w-[220px]"
          >
            <option value="">Semua tahap verifikasi</option>
            {daftarStatus.map((s) => (
              <option key={s} value={s}>
                {rapikanLabel(s)}
              </option>
            ))}
          </select>
          {(filterKecamatan || filterStatus) && (
            <button
              type="button"
              onClick={() => {
                setFilterKecamatan('');
                setFilterStatus('');
              }}
              className="rounded-lg border border-slate-200 px-2.5 py-2 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-slate-50"
            >
              Bersihkan
            </button>
          )}
          <span className="ml-auto hidden items-center gap-1.5 text-[11px] font-medium text-slate-400 sm:flex">
            <Maximize2 className="h-3 w-3" />
            Gulir untuk memperbesar
          </span>
        </div>

        <div className="relative h-[440px] w-full sm:h-[560px]">
          {tersaring.length === 0 ? (
            <Kosong
              ikon={MapPinOff}
              pesan="Tidak ada titik yang cocok dengan penyaring ini. Coba longgarkan pilihan kecamatan atau tahap verifikasi."
            />
          ) : (
            <>
              <MapContainer
                key={kunciPeta}
                center={PUSAT_BOGOR}
                zoom={10}
                scrollWheelZoom
                preferCanvas
                className="h-full w-full"
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <IkutiTitik titik={mode === 'titik' ? titikTampil : gelembung} />

                {mode === 'titik'
                  ? titikTampil.map((t, i) => (
                      <CircleMarker
                        key={t.id ?? `${t.lat},${t.lng},${i}`}
                        center={[t.lat, t.lng]}
                        radius={4}
                        pathOptions={{
                          color: '#ffffff',
                          weight: 1,
                          fillColor: warnaStatus(t.status),
                          fillOpacity: 0.85
                        }}
                      >
                        <Popup>
                          <div className="min-w-[190px]">
                            <p className="text-sm font-bold text-slate-900">{t.kk_nama || 'Tanpa nama KK'}</p>
                            <p className="text-xs text-slate-500">
                              {t.desa}, Kec. {t.kecamatan}
                            </p>
                            <dl className="mt-2 space-y-1 text-xs">
                              <div className="flex justify-between gap-3">
                                <dt className="text-slate-500">Tahap</dt>
                                <dd className="font-semibold text-slate-900">{rapikanLabel(t.status)}</dd>
                              </div>
                              <div className="flex justify-between gap-3">
                                <dt className="text-slate-500">Petugas</dt>
                                <dd className="font-semibold text-slate-900">{t.petugas || '—'}</dd>
                              </div>
                              <div className="flex justify-between gap-3">
                                <dt className="text-slate-500">Didata</dt>
                                <dd className="font-semibold text-slate-900">{tanggalSingkat(t.tanggal)}</dd>
                              </div>
                            </dl>
                          </div>
                        </Popup>
                      </CircleMarker>
                    ))
                  : gelembung.map((g) => {
                      const warna = warnaSebaran(g.total, maksGelembung);
                      return (
                        <CircleMarker
                          key={`${g.kecamatan}|${g.desa || ''}`}
                          center={[g.lat, g.lng]}
                          radius={radiusGelembung(g.total, maksGelembung)}
                          pathOptions={{
                            // Cincin putih 2px memisahkan gelembung yang
                            // bertumpuk; tanpa itu dua wilayah bertetangga
                            // terbaca sebagai satu gelembung besar.
                            color: '#ffffff',
                            weight: 2,
                            fillColor: warna,
                            fillOpacity: 0.82
                          }}
                        >
                          <TooltipPeta direction="top" offset={[0, -4]} opacity={1}>
                            <span className="text-[11px] font-semibold">
                              {g.desa ? `${g.desa}, ` : ''}
                              {g.kecamatan} — {angka(g.total)}
                            </span>
                          </TooltipPeta>
                          <Popup>
                            <div className="min-w-[180px]">
                              <p className="text-sm font-bold text-slate-900">
                                {g.desa || `Kec. ${g.kecamatan}`}
                              </p>
                              {g.desa && <p className="text-xs text-slate-500">Kec. {g.kecamatan}</p>}
                              <dl className="mt-2 space-y-1 text-xs">
                                <div className="flex justify-between gap-3">
                                  <dt className="text-slate-500">Keluarga terdata</dt>
                                  <dd className="font-semibold text-slate-900">{angka(g.total)}</dd>
                                </div>
                                {g.total_desa !== undefined && (
                                  <div className="flex justify-between gap-3">
                                    <dt className="text-slate-500">Desa tercakup</dt>
                                    <dd className="font-semibold text-slate-900">{angka(g.total_desa)}</dd>
                                  </div>
                                )}
                                <div className="flex justify-between gap-3">
                                  <dt className="text-slate-500">Porsi</dt>
                                  <dd className="font-semibold text-slate-900">
                                    {persen(g.total, tersaring.length)}
                                  </dd>
                                </div>
                              </dl>
                            </div>
                          </Popup>
                        </CircleMarker>
                      );
                    })}
              </MapContainer>

              {/* Legenda menempel di peta, bukan di bawahnya: pembaca butuh arti
                  warna saat matanya masih di peta. */}
              <div className="pointer-events-none absolute bottom-4 left-4 z-[400] max-w-[calc(100%-2rem)] rounded-xl border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur">
                {mode === 'titik' ? (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Tahap verifikasi
                    </p>
                    <div className="mt-1.5">
                      <Legenda
                        item={daftarStatus.slice(0, 5).map((s) => ({
                          label: rapikanLabel(s),
                          warna: warnaStatus(s)
                        }))}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Keluarga terdata
                    </p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {SEBARAN.map((w) => (
                        <span key={w} className="h-2.5 w-6 rounded-sm" style={{ backgroundColor: w }} />
                      ))}
                    </div>
                    <div className="mt-1 flex justify-between text-[10px] font-medium text-slate-500">
                      <span>1</span>
                      <span>{angka(maksGelembung)}</span>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        {titikDipotong > 0 && mode === 'titik' && (
          <p className="border-t border-slate-100 px-4 py-2.5 text-[11px] leading-relaxed text-slate-500 sm:px-5">
            Peta menggambar {angka(BATAS_TITIK)} titik pertama dari {angka(tersaring.length)} yang cocok, agar tetap
            lancar digeser. Pilih satu kecamatan untuk melihat seluruh titiknya, atau pakai mode Kecamatan/Desa yang
            menghitung semuanya.
          </p>
        )}
      </Panel>

      {/* Tabel pendamping peta. Peta menjawab "di mana"; angka berurut menjawab
          "berapa dan siapa yang tertinggal" — dan bisa dibaca tanpa warna sama
          sekali, yang membuat halaman ini tetap terpakai saat dicetak. */}
      <Panel
        judul={mode === 'desa' ? 'Rincian per desa' : 'Rincian per kecamatan'}
        keterangan="Urut dari terbanyak. Angka mengikuti penyaring di atas."
        padat
      >
        <div className="max-h-[360px] overflow-auto">
          <table className="w-full min-w-[420px] text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
              <tr className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-2.5 sm:px-5">#</th>
                <th className="px-3 py-2.5">{mode === 'desa' ? 'Desa / Kelurahan' : 'Kecamatan'}</th>
                {mode === 'desa' && <th className="px-3 py-2.5">Kecamatan</th>}
                {mode !== 'desa' && <th className="px-3 py-2.5 text-right">Desa</th>}
                <th className="px-3 py-2.5 text-right">Keluarga</th>
                <th className="px-4 py-2.5 text-right sm:px-5">Porsi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...gelembung]
                .sort((a, b) => b.total - a.total)
                .map((g, i) => (
                  <tr key={`${g.kecamatan}|${g.desa || ''}`} className="transition-colors hover:bg-slate-50">
                    <td className="px-4 py-2.5 tabular-nums text-slate-400 sm:px-5">{i + 1}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-900">{g.desa || g.kecamatan}</td>
                    {mode === 'desa' && <td className="px-3 py-2.5 text-slate-600">{g.kecamatan}</td>}
                    {mode !== 'desa' && (
                      <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{angka(g.total_desa)}</td>
                    )}
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">
                      {angka(g.total)}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-500 sm:px-5">
                      {persen(g.total, tersaring.length)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
};

export default PetaTab;
