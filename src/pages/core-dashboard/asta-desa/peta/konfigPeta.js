/**
 * Tetapan dan gaya untuk Peta Sebaran — replika panel super admin ASTA DESA.
 *
 * SELURUH ANGKA DI BERKAS INI DISALIN PERSIS dari panel asalnya
 * (resources/views/filament/pages/map.blade.php di proyek ASTA DESA). Radius,
 * jarak cluster, warna, durasi animasi, dan pusat peta bukan pilihan selera yang
 * bisa "dirapikan" — begitu salah satunya berubah, peta ini berhenti bisa
 * disandingkan dengan panel sebagai bukti bahwa keduanya menampilkan hal yang
 * sama. Perubahan apa pun di sini harus berpasangan dengan perubahan di sana.
 *
 * Acuan: docs/PETA_SEBARAN_ASTA_DESA.md
 */

import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import TileWMS from 'ol/source/TileWMS';
import XYZ from 'ol/source/XYZ';
import OSM from 'ol/source/OSM';
import GeoJSON from 'ol/format/GeoJSON';
import { Circle as CircleStyle, Fill, Icon, Stroke, Style, Text } from 'ol/style';

/** Pusat peta: Kabupaten Bogor. Urutan [bujur, lintang], seperti OpenLayers. */
export const PUSAT = [106.8456, -6.5971];
export const ZOOM_AWAL = 12;
/** Tombol "home" memakai zoom 14, bukan zoom awal 12 — memang beda di panel. */
export const ZOOM_HOME = 14;
export const ZOOM_TITIK = 16;

/** Jarak penggabungan cluster, dalam piksel. */
export const JARAK_CLUSTER = 40;
export const DURASI_ANIMASI_CLUSTER = 700;

/** Abu-abu slate — warna tunggal seluruh penanda data di panel. */
export const WARNA_DATA = '#64748b';
const WARNA_SOROT = 'rgba(217, 119, 6, 0.8)';
const WARNA_SOROT_ISI = 'rgba(217, 119, 6, 0.1)';

/** Urutan grup layer di panel. Tetap, tidak diurutkan menurut abjad. */
export const GRUP_LAYER = [
  { nama: 'tematik', label: 'Tematik' },
  { nama: 'administrasi', label: 'Administrasi' },
  { nama: 'rencana', label: 'Rencana' },
  { nama: 'foto_udara', label: 'Foto Udara' }
];

/** Id layer semu berisi titik kuesioner. Nama historis, isinya data sensus. */
export const ID_LAYER_TITIK = 'tanaman_kehati';
export const NAMA_LAYER_TITIK = 'Data Kuesioner';

export const BASEMAP = [
  { id: 'osm', nama: 'Standard' },
  { id: 'satellite', nama: 'Satellite' },
  { id: 'hybrid', nama: 'Hybrid' },
  { id: 'esri', nama: 'Terrain' }
];

/**
 * Sumber tile satu basemap.
 *
 * Basemap diganti dengan `baseLayer.setSource(...)`, BUKAN dengan menambah layer
 * baru. Menambah layer membuat basemap lama tetap tergambar di bawahnya: pada
 * basemap semi-transparan hasilnya dua peta bertumpuk, dan setiap pergantian
 * menambah satu lapisan lagi yang tidak pernah dibuang.
 */
export const sumberBasemap = (id) => {
  switch (id) {
    case 'satellite':
      return new XYZ({ url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}' });
    case 'hybrid':
      return new XYZ({ url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}' });
    case 'esri':
      return new XYZ({
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
      });
    default:
      return new OSM({ attributions: [] });
  }
};

/**
 * Gaya satu fitur cluster.
 *
 * Gaya cluster di-cache per jumlah anggota (`simpanan`), seperti di panel. Tanpa
 * cache, setiap gambar ulang peta membuat objek Style baru untuk tiap cluster —
 * dan pada beberapa ribu titik, pembuatan objek itulah yang membuat panning
 * tersendat, bukan penggambarannya.
 */
export const gayaCluster = (simpanan) => (feature) => {
  const anggota = feature.get('features');
  const jumlah = anggota ? anggota.length : 1;

  if (jumlah > 1) {
    if (simpanan[jumlah]) return simpanan[jumlah];
    const gaya = new Style({
      image: new CircleStyle({
        radius: 12 + Math.min(jumlah / 10, 8),
        stroke: new Stroke({ color: '#fff', width: 2 }),
        fill: new Fill({ color: WARNA_DATA })
      }),
      text: new Text({
        text: String(jumlah),
        fill: new Fill({ color: '#fff' }),
        font: 'bold 10px Inter, sans-serif'
      })
    });
    simpanan[jumlah] = gaya;
    return gaya;
  }

  return new Style({
    image: new CircleStyle({
      radius: 6,
      fill: new Fill({ color: WARNA_DATA }),
      stroke: new Stroke({ color: '#fff', width: 2 })
    })
  });
};

/** Gaya titik setelah sebuah cluster dibuka — sedikit lebih besar (8 px). */
export const gayaTitikTerpilih = () =>
  new Style({
    image: new CircleStyle({
      radius: 8,
      fill: new Fill({ color: WARNA_DATA }),
      stroke: new Stroke({ color: '#fff', width: 2 })
    })
  });

/** Layer sorot batas wilayah — oranye amber, di bawah titik (zIndex 10). */
export const layerSorot = (source) =>
  new VectorLayer({
    source,
    style: new Style({
      stroke: new Stroke({ color: WARNA_SOROT, width: 3 }),
      fill: new Fill({ color: WARNA_SOROT_ISI })
    }),
    zIndex: 10
  });

/**
 * Penanda klik — pin merah yang menempel ke fitur terdekat.
 *
 * SVG ditulis sebagai data-URI, bukan berkas: satu penanda tidak pantas menjadi
 * satu permintaan jaringan lagi, dan pin yang belum termuat saat peta diklik
 * membuat klik pertama terasa tidak direspons.
 */
const PIN_MERAH =
  'data:image/svg+xml;utf8,<svg width="24" height="24" viewBox="0 0 24 24" fill="%23ef4444" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C7.58 0 4 3.58 4 8C4 13.5 12 24 12 24C12 24 20 13.5 20 8C20 3.58 16.42 0 12 0ZM12 11C10.34 11 9 9.66 9 8C9 6.34 10.34 5 12 5C13.66 5 15 6.34 15 8C15 9.66 13.66 11 12 11Z"/></svg>';

export const layerPenandaKlik = (source) =>
  new VectorLayer({
    source,
    style: new Style({ image: new Icon({ anchor: [0.5, 1], src: PIN_MERAH, scale: 1 }) }),
    zIndex: 999
  });

/** Titik GPS: bulatan biru pekat. Digambar DI ATAS halonya. */
export const gayaGps = () =>
  new Style({
    image: new CircleStyle({
      radius: 7,
      fill: new Fill({ color: '#2563eb' }),
      stroke: new Stroke({ color: '#ffffff', width: 2 })
    })
  });

/** Halo GPS: lingkaran lebar semi-transparan di sekeliling titik. */
export const gayaHaloGps = () =>
  new Style({
    image: new CircleStyle({
      radius: 24,
      fill: new Fill({ color: 'rgba(37, 99, 235, 0.15)' }),
      stroke: new Stroke({ color: 'rgba(37, 99, 235, 0.5)', width: 1 })
    })
  });

/**
 * Layer OpenLayers untuk satu baris tabel `layers` ASTA DESA.
 *
 * `tipe: 'database'` sengaja mengembalikan null — panel asalnya pun tidak punya
 * cabang untuk itu, jadi layer bertipe demikian tidak tergambar di sana maupun
 * di sini. Mengarang penanganannya akan membuat kedua peta berbeda.
 *
 * `opacity` tidak ada di tabel `layers`; panel selalu mulai dari 1 dan
 * menyimpannya sebagai state klien saja.
 */
export const buatLayer = (layer) => {
  if (layer.tipe === 'geoserver' || layer.tipe === 'wms') {
    return new TileLayer({
      name: layer.nama,
      source: new TileWMS({
        url: layer.url,
        params: { LAYERS: layer.kode, TILED: true },
        serverType: 'geoserver',
        // Tile WMS digambar sebagai <img>, jadi tidak butuh CORS. Tanpa
        // crossOrigin, tile dari GeoServer yang tidak mengirim header CORS tetap
        // tampil — sedangkan dengan crossOrigin:'anonymous' justru gagal senyap.
        crossOrigin: undefined
      }),
      visible: layer.visible,
      opacity: 1,
      zIndex: layer.urutan || 0
    });
  }

  if (layer.tipe === 'geojson') {
    return new VectorLayer({
      name: layer.nama,
      source: new VectorSource({ url: layer.url, format: new GeoJSON() }),
      visible: layer.visible,
      opacity: 1,
      zIndex: layer.urutan || 0
    });
  }

  return null;
};

/** URL legenda WMS. Parameternya persis seperti di panel, termasuk font. */
export const urlLegenda = (layer, { lebar = 20, tinggi = 20, warnaFont = '0x64748b' } = {}) =>
  `${layer.url}?SERVICE=WMS&VERSION=1.1.0&REQUEST=GetLegendGraphic&FORMAT=image/png` +
  `&LAYER=${encodeURIComponent(layer.kode || '')}&STYLE=&WIDTH=${lebar}&HEIGHT=${tinggi}` +
  `&legend_options=fontName:Inter;fontSize:${lebar > 15 ? 10 : 9};fontColor:${warnaFont};fontAntiAliasing:true`;

/**
 * Skala peta sebagai penyebut "1 : n".
 *
 * Rumusnya disalin apa adanya dari panel — termasuk angka 39,37 (inci per meter)
 * dan 90 (dpi yang diasumsikan). Bukan rumus skala yang paling benar secara
 * kartografi, tetapi mencocokkannya adalah intinya: cetakan dari dua aplikasi
 * harus menuliskan skala yang sama.
 */
export const hitungSkala = (resolution, metersPerUnit) =>
  Math.round(resolution * metersPerUnit * 39.37 * 90);

/**
 * NIK/no. KK yang disamarkan: 6 digit pertama, sisanya bintang.
 *
 * Panel super admin menyamarkannya, jadi halaman ini pun menyamarkannya. Bentuk
 * aslinya memang tersedia utuh dari endpoint detail — justru karena itu
 * penyamarannya harus ditulis di sini dan tidak bergantung pada kemurahan hati
 * API: yang membuka peta sebaran tidak pernah butuh NIK lengkap.
 */
export const samarkan = (nilai) => {
  const s = nilai === null || nilai === undefined ? '' : String(nilai).trim();
  if (!s) return null;
  return `${s.slice(0, 6)}**********`;
};

const KOSONG = '-';

/** Tanggal YYYY-MM-DD dari bentuk tanggal apa pun. */
const keHari = (nilai) => {
  if (!nilai) return null;
  const cocok = String(nilai).match(/^(\d{4}-\d{2}-\d{2})/);
  if (cocok) return cocok[1];
  const d = new Date(nilai);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
};

const daftarKe = (nilai) => {
  if (Array.isArray(nilai)) return nilai.filter(Boolean).join(', ') || KOSONG;
  return nilai || KOSONG;
};

/**
 * Atribut satu titik, dalam urutan dan penamaan yang sama dengan panel.
 *
 * URUTAN DAN PILIHAN KOLOMNYA BUKAN SEMBARANG. Panel super admin menyusun 14
 * baris ini di PHP (getViewData() pada app/Filament/Pages/Map.php) lalu
 * menyembunyikan kunci id/lat/lng/foto/nama/nik/tanggal/user saat menggambarnya.
 * Hasil akhirnya yang ditiru di sini — termasuk "N Orang" pada jumlah anggota
 * dan "-" untuk nilai kosong, bukan string kosong.
 *
 * @param titik  baris ringkas dari /asta-desa/sebaran
 * @param detail objek `sensus` lengkap dari /asta-desa/sensus/:id (boleh null)
 */
export const atributTitik = (titik, detail) => {
  const d = detail || {};
  const jumlahAnggota =
    d.anggotas_count ?? d.jumlah_anggota ?? (Array.isArray(d.anggotas) ? d.anggotas.length : null);

  return [
    ['Nama KK', d.kk_nama || titik.kk_nama || KOSONG],
    // `titik.nik` sudah tersamar dari backend; dipakai sebagai cadangan agar
    // barisnya tetap terisi selama detail masih diambil — atau bila gagal.
    ['NIK KK', samarkan(d.kk_nik) || titik.nik || KOSONG],
    ['Alamat', d.kk_alamat || KOSONG],
    ['Kecamatan', d.kecamatan || titik.kecamatan || KOSONG],
    ['Desa', d.desa || titik.desa || KOSONG],
    ['Tanggal Pendataan', keHari(d.tanggal_pendataan) || keHari(titik.tanggal) || KOSONG],
    ['Jumlah Anggota', jumlahAnggota === null || jumlahAnggota === undefined ? KOSONG : `${jumlahAnggota} Orang`],
    ['Status Rumah', d.spp_status_kepemilikan_rumah || KOSONG],
    ['Jenis Bangunan', d.spp_jenis_bangunan || KOSONG],
    ['Daya Listrik', d.spp_daya_listrik || KOSONG],
    ['Sumber Air', d.spp_sumber_air_minum || KOSONG],
    ['Bantuan Sosial', daftarKe(d.sosial_program_bansos)],
    ['Enumerator', titik.petugas || d.nama_petugas || 'Anonim'],
    ['Koordinat', `${titik.lat}, ${titik.lng}`]
  ];
};

/**
 * Foto rumah pertama dari detail sensus.
 *
 * Media Library ASTA DESA mengirim URL absolut, jadi gambarnya dimuat langsung
 * dari sana. Kolom `foto_rumah` bisa berupa array nama berkas (cast 'array' di
 * model) ATAU daftar URL, tergantung jalan mana datanya masuk — yang bukan URL
 * diabaikan daripada menampilkan gambar rusak.
 */
export const fotoRumah = (detail) => {
  const kandidat = [detail?.foto_rumah_urls, detail?.rumah_foto, detail?.foto_rumah];
  for (const k of kandidat) {
    const daftar = Array.isArray(k) ? k : k ? [k] : [];
    const url = daftar.find((v) => typeof v === 'string' && /^https?:\/\//.test(v));
    if (url) return url;
  }
  return null;
};
