/**
 * Peta Sebaran ASTA DESA — replika panel super admin, di dalam Core Dashboard.
 *
 * MENGAPA HALAMAN PENUH, BUKAN TAB. Tab "Peta Sebaran" di halaman Asta Desa
 * menjawab pertanyaan perencana: wilayah mana yang tertinggal, dibaca sebagai
 * gelembung agregat dan tabel peringkat. Halaman ini menjawab pertanyaan yang
 * lain — "apa isi titik ini, layer apa yang berlaku di atasnya, bagaimana
 * cetakannya" — dan itu butuh panel selebar 384 px, empat tumpukan kontrol
 * mengapung, serta peta sebesar layar. Dipaksakan ke dalam kotak tab setinggi
 * 560 px, panelnya saja sudah menutupi sepertiga petanya. Keduanya disimpan;
 * yang ringkas tetap jadi pintu masuk, yang penuh dibuka dari sana.
 *
 * MENGAPA OPENLAYERS, BUKAN LEAFLET YANG SUDAH ADA DI PROYEK INI. Tugasnya bukan
 * "menggambar peta" melainkan "menggambar peta yang sama": cluster beranimasi dan
 * pembukaan cluster berbentuk spiral datang dari ol-ext, legenda dan identifikasi
 * fitur datang dari WMS GeoServer lewat `getFeatureInfoUrl`, dan panel asalnya
 * memakai OpenLayers 8.2.0. Menyusun ulang semuanya di atas Leaflet berarti
 * menebak-nebak sampai mirip, bukan memastikan sama. Leaflet tetap dipakai tab
 * ringkas dan halaman lain — keduanya hidup berdampingan tanpa berebut.
 *
 * PERBEDAAN YANG SUDAH DIKETAHUI dengan panel super admin didaftar di
 * docs/PETA_SEBARAN_ASTA_DESA.md bagian "Batas paritas". Yang terpenting: titik
 * di sini memakai koordinat `lokasi_*`, sedangkan panel memakai `rumah_*`.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
// Dinamai ulang: `Map` dari OpenLayers akan menutupi `Map` bawaan JavaScript di
// seluruh berkas ini, dan berkas sepanjang ini pasti suatu saat butuh yang bawaan.
import OlMap from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Cluster from 'ol/source/Cluster';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Geometry from 'ol/geom/Geometry';
import GeoJSON from 'ol/format/GeoJSON';
import { fromLonLat, toLonLat } from 'ol/proj';
import AnimatedCluster from 'ol-ext/layer/AnimatedCluster';
import SelectCluster from 'ol-ext/interaction/SelectCluster';
import 'ol/ol.css';
import 'ol-ext/dist/ol-ext.css';
import {
  ArrowLeft,
  Crosshair,
  Layers as LayersIcon,
  Loader2,
  MapPin,
  Menu,
  Minus,
  Plus,
  Printer,
  Search
} from 'lucide-react';
import { Galat, Memuat } from '../ui';
// Panel detail 104 kolom + daftar anggota keluarga sudah ada dan sudah teruji di
// tab Data Sensus. Dipakai ulang di sini, bukan ditulis kembali: tombol "Detail
// Aset" di panel super admin pun hanya membuka halaman detail sensus.
import { PanelDetail } from '../SensusTab';
import PanelPeta from './PanelPeta';
import {
  BASEMAP,
  DURASI_ANIMASI_CLUSTER,
  GRUP_LAYER,
  ID_LAYER_TITIK,
  JARAK_CLUSTER,
  NAMA_LAYER_TITIK,
  PUSAT,
  ZOOM_AWAL,
  ZOOM_HOME,
  ZOOM_TITIK,
  atributTitik,
  buatLayer,
  fotoRumah,
  gayaCluster,
  gayaGps,
  gayaHaloGps,
  gayaTitikTerpilih,
  hitungSkala,
  layerPenandaKlik,
  layerSorot,
  sumberBasemap,
  urlLegenda
} from './konfigPeta';
import {
  ambilCuaca,
  ambilDesa,
  ambilDetailSensus,
  ambilGeometriWilayah,
  useDataPeta
} from './usePetaSebaran';

/**
 * Gaya yang tidak bisa ditulis sebagai kelas Tailwind.
 *
 * Dua hal yang memang butuh CSS sungguhan: aturan @media print (Tailwind tidak
 * bisa menata ulang tata letak cetak selembar A3 dari kelas utilitas) dan bentuk
 * thumb/track slider bawaan peramban. Disuntikkan dari komponen, bukan ditaruh di
 * index.css global, supaya seluruh peta ini tetap satu berkas yang bisa dicabut
 * tanpa meninggalkan sisa.
 */
const GAYA_PETA = `
#peta-sebaran-asta .custom-scrollbar::-webkit-scrollbar { width: 3px; }
#peta-sebaran-asta .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
#peta-sebaran-asta .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
#peta-sebaran-asta .ol-control { display: none; }
#peta-sebaran-asta input[type=range] { -webkit-appearance: none; background: transparent; }
#peta-sebaran-asta input[type=range]::-webkit-slider-runnable-track {
  width: 100%; height: 6px; cursor: pointer; background: #f1f5f9; border-radius: 10px;
}
#peta-sebaran-asta input[type=range]::-webkit-slider-thumb {
  height: 18px; width: 18px; border-radius: 50%; background: #64748b; cursor: pointer;
  -webkit-appearance: none; margin-top: -6px; border: 2px solid white;
  box-shadow: 0 4px 10px rgba(100, 116, 139, 0.4); transition: all .2s;
}
#peta-sebaran-asta input[type=range]::-webkit-slider-thumb:hover { transform: scale(1.1); }
#peta-sebaran-asta input[type=range]:focus { outline: none; }

@media print {
  @page { size: A3 landscape; margin: 0; }
  body, html {
    width: 420mm !important; height: 297mm !important; background: #fff !important;
    margin: 0 !important; padding: 0 !important; overflow: hidden !important;
  }
  * { transition: none !important; animation: none !important; }

  /* Menyembunyikan sisa aplikasi lewat VISIBILITY, bukan lewat display pada
     anak-anak body. Peta ini bersarang jauh di dalam pohon React (#root > …
     > main > peta), jadi aturan seperti "body > *:not(#peta)" justru akan
     menyembunyikan #root beserta petanya sendiri. Visibility bisa dinyalakan
     kembali pada keturunan, sehingga satu pasang aturan ini cukup tanpa perlu
     tahu bentuk pohonnya — dan tetap benar bila layoutnya suatu saat berubah. */
  body * { visibility: hidden !important; }
  #peta-sebaran-asta, #peta-sebaran-asta * { visibility: visible !important; }

  /* position: fixed melepaskannya dari tata letak induk. Tidak terpotong oleh
     "overflow: hidden" milik CoreDashboardLayout karena elemen fixed hanya
     terpotong oleh leluhur yang ber-transform/filter — dan di jalur ini tidak
     ada. */
  #peta-sebaran-asta {
    position: fixed !important; inset: 0 !important;
    width: 420mm !important; height: 297mm !important;
    background: #fff !important; z-index: 2147483647 !important; overflow: hidden !important;
  }
  #peta-sebaran-asta .sembunyi-cetak,
  #peta-sebaran-asta .sembunyi-cetak * { display: none !important; visibility: hidden !important; }
  #peta-sebaran-asta #peta-kanvas {
    position: absolute !important; top: 2% !important; left: 2% !important;
    width: 73% !important; height: 96% !important;
    border: 2px solid #000 !important; box-sizing: border-box !important;
    z-index: 0 !important; border-radius: 0 !important; overflow: hidden !important;
  }
  #peta-sebaran-asta .ol-viewport, #peta-sebaran-asta .ol-layers,
  #peta-sebaran-asta .ol-layer, #peta-sebaran-asta .ol-layer canvas {
    width: 100% !important; height: 100% !important;
  }
  #peta-sebaran-asta .ol-layer canvas { object-fit: cover !important; object-position: center !important; }
  #peta-sebaran-asta #kertas-cetak {
    display: flex !important; position: absolute !important;
    top: 2% !important; right: 2% !important; width: 21% !important; height: 96% !important;
    background: #fff !important; z-index: 9999 !important; padding: 10px !important;
    box-sizing: border-box !important; border: 2px solid #000 !important; flex-direction: column !important;
  }
}
`;

/**
 * Satu tile contoh sebagai pratinjau basemap.
 *
 * Tile z=10 di atas Kabupaten Bogor (x=822, y=526 pada skema XYZ). Dipakai karena
 * DPMD tidak punya berkas thumbnail seperti ASTA DESA — dan memakai tile sungguhan
 * justru membuat pratinjaunya selalu cocok dengan basemap yang benar-benar tampil,
 * termasuk bila URL sumbernya suatu saat diganti.
 */
const pratinjauBasemap = (id) => {
  switch (id) {
    case 'satellite':
      return 'https://mt1.google.com/vt/lyrs=s&x=822&y=526&z=10';
    case 'hybrid':
      return 'https://mt1.google.com/vt/lyrs=y&x=822&y=526&z=10';
    case 'esri':
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/10/526/822';
    default:
      return 'https://tile.openstreetmap.org/10/822/526.png';
  }
};

/** Tombol bundar mengapung — satu bentuk untuk seluruh kontrol kanan bawah. */
const TombolKontrol = ({ judul, onClick, children, memuat = false }) => (
  <button
    type="button"
    onClick={onClick}
    title={judul}
    aria-label={judul}
    className="relative flex h-14 w-14 items-center justify-center rounded-3xl border border-white bg-white/90 text-slate-600 shadow-2xl backdrop-blur-xl transition-all hover:scale-110 hover:text-slate-900 active:scale-90"
  >
    {memuat && <span className="absolute inset-0 animate-ping rounded-3xl bg-slate-500/20" />}
    {children}
  </button>
);

const PetaSebaranPage = () => {
  const { titik, rekapSebaran, layer, kecamatan, memuat, galat, ambil } = useDataPeta();

  // ── State tampilan ─────────────────────────────────────────────────────────
  const [panelTerbuka, setPanelTerbuka] = useState(true);
  const [tab, setTab] = useState('layer');
  const [basemapAktif, setBasemapAktif] = useState('osm');
  const [menuBasemap, setMenuBasemap] = useState(false);
  const [koordinat, setKoordinat] = useState('-6.5971, 106.8456');
  const [mencariGps, setMencariGps] = useState(false);

  // Filter. `search` dipisah dari `filter` supaya ketikan tidak memicu
  // penghitungan ulang ribuan titik pada setiap huruf — nilainya disalin ke
  // `filter.search` setelah 500 ms, persis seperti debounce di panel.
  const [ketikan, setKetikan] = useState('');
  const [filter, setFilter] = useState({ search: '', kecamatan: '', desa: '', user: '' });
  const [daftarDesa, setDaftarDesa] = useState([]);
  const [idsSpasial, setIdsSpasial] = useState(null);

  // Panel info
  const [fiturTerpilih, setFiturTerpilih] = useState([]);
  const [memuatInfo, setMemuatInfo] = useState(false);
  const [cuaca, setCuaca] = useState(null);
  const [idDetail, setIdDetail] = useState(null);

  // Layer: salinan yang bisa diubah (visible/opacity) + layer semu titik.
  const [layerUi, setLayerUi] = useState([]);

  // ── Rujukan OpenLayers ─────────────────────────────────────────────────────
  const wadahRef = useRef(null);
  const mapRef = useRef(null);
  const baseRef = useRef(null);
  const sumberTitikRef = useRef(null);
  const sumberSorotRef = useRef(null);
  const sumberPenandaRef = useRef(null);
  const sumberGpsRef = useRef(null);
  const petaLayerRef = useRef({}); // id layer -> layer OL
  const skalaRef = useRef(null);
  const legendaCetakRef = useRef(null);

  // Nilai terbaru yang dibaca di dalam penangan OpenLayers. Penangan dipasang
  // SEKALI saat peta dibuat; tanpa ref, ia akan selamanya membaca state dari
  // render pertama — daftar layer kosong dan titik kosong.
  const layerUiRef = useRef([]);
  layerUiRef.current = layerUi;

  // ── Titik setelah disaring ─────────────────────────────────────────────────
  const daftarEnumerator = useMemo(
    () =>
      Array.from(new Set(titik.map((t) => t.petugas).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, 'id')
      ),
    [titik]
  );

  const titikTersaring = useMemo(() => {
    const cari = filter.search.toLowerCase().trim();
    const kec = filter.kecamatan.trim();
    const desa = filter.desa.trim();
    const user = filter.user.trim();

    return titik.filter((t) => {
      // Pencariannya mengenai tiga kolom, sama dengan panel: nama KK, NIK
      // (tersamar), dan nama enumerator.
      const cocokCari =
        !cari ||
        String(t.kk_nama || '').toLowerCase().includes(cari) ||
        String(t.nik || '').toLowerCase().includes(cari) ||
        String(t.petugas || '').toLowerCase().includes(cari);

      return (
        cocokCari &&
        (!kec || String(t.kecamatan || '').trim() === kec) &&
        (!desa || String(t.desa || '').trim() === desa) &&
        (!user || t.petugas === user) &&
        (idsSpasial === null || idsSpasial.has(t.id))
      );
    });
  }, [titik, filter, idsSpasial]);

  const grupLayer = useMemo(
    () =>
      GRUP_LAYER.map((g) => ({ ...g, layers: layerUi.filter((l) => l.grup === g.nama) })).filter(
        (g) => g.layers.length > 0
      ),
    [layerUi]
  );

  // ── Debounce kotak pencarian ───────────────────────────────────────────────
  useEffect(() => {
    const jam = setTimeout(() => setFilter((f) => (f.search === ketikan ? f : { ...f, search: ketikan })), 500);
    return () => clearTimeout(jam);
  }, [ketikan]);

  // ── Susun daftar layer begitu datanya tiba ─────────────────────────────────
  useEffect(() => {
    setLayerUi([
      ...layer.map((l) => ({ ...l, opacity: 1 })),
      // Layer semu berisi titik kuesioner, persis seperti yang disisipkan panel.
      {
        id: ID_LAYER_TITIK,
        nama: NAMA_LAYER_TITIK,
        grup: 'tematik',
        tipe: 'geojson',
        visible: true,
        opacity: 1
      }
    ]);
  }, [layer]);

  // ── Penangan klik peta ─────────────────────────────────────────────────────
  /**
   * Satu klik mengerjakan lima hal, dalam urutan yang sama dengan panel:
   * menentukan koordinat penanda (menempel ke fitur bila ada), menaruh pin,
   * mengambil cuaca, mengumpulkan atribut fitur vektor, lalu mengidentifikasi
   * layer WMS yang aktif.
   */
  const tanganiKlik = useCallback((evt) => {
    const map = mapRef.current;
    if (!map) return;

    // 1. Koordinat penanda — menempel ke fitur terdekat, bukan titik klik mentah.
    let koordPenanda = evt.coordinate;
    map.forEachFeatureAtPixel(evt.pixel, (feature) => {
      const anggota = feature.get('features');
      if (anggota && anggota.length > 0) {
        koordPenanda = anggota[0].getGeometry().getCoordinates();
        return true;
      }
      const geom = feature.getGeometry();
      if (geom && geom.getType() === 'Point') {
        koordPenanda = geom.getCoordinates();
        return true;
      }
      return false;
    });

    const [lon, lat] = toLonLat(koordPenanda);

    // 2. Pin merah.
    sumberPenandaRef.current.clear();
    sumberPenandaRef.current.addFeature(new Feature({ geometry: new Point(koordPenanda) }));

    // 3. Cuaca. Tidak ditunggu — panel atribut tidak boleh menunggu BMKG.
    setCuaca(null);
    ambilCuaca(lat, lon).then(setCuaca);

    setFiturTerpilih([]);
    setMemuatInfo(true);
    setTab('info');
    setPanelTerbuka(true);

    // 4. Fitur vektor di bawah kursor. Cluster dibongkar jadi beberapa entri.
    const kumpulan = [];
    map.forEachFeatureAtPixel(evt.pixel, (feature, lyr) => {
      const anggota = feature.get('features');
      const namaLayer = (lyr && lyr.get('name')) || 'Fitur Spasial';

      if (anggota && anggota.length > 0) {
        anggota.forEach((f) => {
          const data = f.get('data');
          if (data) kumpulan.push({ jenis: 'titik', namaLayer: NAMA_LAYER_TITIK, data });
        });
        return;
      }

      const data = feature.get('data');
      if (data) {
        kumpulan.push({ jenis: 'titik', namaLayer: NAMA_LAYER_TITIK, data });
        return;
      }

      // Fitur GeoJSON biasa: propertinya dibersihkan dari geometri dan nilai
      // kosong, seperti di panel.
      const props = feature.getProperties();
      const atribut = Object.entries(props).filter(
        ([k, v]) =>
          !['bbox', 'geometry'].includes(k.toLowerCase()) &&
          v !== null &&
          v !== undefined &&
          typeof v !== 'function' &&
          !(v instanceof Geometry)
      );
      if (atribut.length) kumpulan.push({ jenis: 'vektor', namaLayer, atribut });
    });

    // Titik kuesioner: atribut ringkas tampil lebih dulu, versi lengkapnya
    // menyusul dari endpoint detail. Panel menampilkan semuanya seketika karena
    // seluruh kolom sudah di-render server-side; di sini tidak ada gunanya
    // menahan seluruh daftar demi satu baris yang sedang diambil.
    const awal = kumpulan.map((k) =>
      k.jenis === 'titik'
        ? {
            namaLayer: k.namaLayer,
            id: k.data.id,
            atribut: atributTitik(k.data, null),
            foto: null,
            memuat: true
          }
        : { namaLayer: k.namaLayer, atribut: k.atribut, foto: null, memuat: false }
    );
    setFiturTerpilih(awal);

    kumpulan
      .filter((k) => k.jenis === 'titik' && k.data.id)
      .forEach((k) => {
        ambilDetailSensus(k.data.id)
          .then((detail) => {
            const sensus = detail?.sensus || null;
            setFiturTerpilih((lama) =>
              lama.map((f) =>
                f.id === k.data.id
                  ? {
                      ...f,
                      atribut: atributTitik(k.data, sensus),
                      foto: fotoRumah(sensus),
                      memuat: false
                    }
                  : f
              )
            );
          })
          .catch(() => {
            // Detail gagal diambil: atribut ringkas yang sudah tampil tetap
            // berguna, jadi hanya penanda "memuat" yang dimatikan.
            setFiturTerpilih((lama) =>
              lama.map((f) => (f.id === k.data.id ? { ...f, memuat: false } : f))
            );
          });
      });

    // 5. Identifikasi layer WMS yang sedang tampil.
    const view = map.getView();
    const resolusi = view.getResolution();
    const proyeksi = view.getProjection();
    const wms = layerUiRef.current.filter(
      (l) => (l.tipe === 'geoserver' || l.tipe === 'wms') && l.visible
    );

    if (!wms.length) {
      setMemuatInfo(false);
      return;
    }

    Promise.all(
      wms.map((l) => {
        const olLayer = petaLayerRef.current[l.id];
        if (!olLayer) return Promise.resolve([]);
        const url = olLayer
          .getSource()
          .getFeatureInfoUrl(evt.coordinate, resolusi, proyeksi, { INFO_FORMAT: 'application/json' });
        if (!url) return Promise.resolve([]);

        return fetch(url)
          .then((r) => r.json())
          .then((body) => {
            const fitur = Array.isArray(body?.features)
              ? body.features
              : Array.isArray(body?.results)
                ? body.results
                : Array.isArray(body)
                  ? body
                  : [];
            return fitur
              .map((f) => {
                const mentah = f.properties || f.attributes || f;
                if (!mentah || typeof mentah !== 'object') return null;
                const atribut = Object.entries(mentah).filter(
                  ([k, v]) =>
                    !['bbox', 'geometry', 'id', 'type', 'properties', 'attributes'].includes(
                      k.toLowerCase()
                    ) &&
                    v !== null &&
                    typeof v !== 'object' &&
                    typeof v !== 'function'
                );
                return atribut.length ? { namaLayer: l.nama, atribut, foto: null, memuat: false } : null;
              })
              .filter(Boolean);
          })
          // GetFeatureInfo lintas-origin: GeoServer yang tidak mengirim header
          // CORS membuat fetch ini gagal. Layer itu dilewati, bukan menjatuhkan
          // seluruh panel — atribut titik kuesioner tetap terbaca.
          .catch(() => []);
      })
    )
      .then((hasil) => setFiturTerpilih((lama) => [...lama, ...hasil.flat()]))
      .finally(() => setMemuatInfo(false));
  }, []);

  // ── Bangun peta, sekali ────────────────────────────────────────────────────
  useEffect(() => {
    if (!wadahRef.current || mapRef.current) return;

    const base = new TileLayer({ source: sumberBasemap('osm') });
    baseRef.current = base;

    const map = new OlMap({
      target: wadahRef.current,
      layers: [base],
      view: new View({ center: fromLonLat(PUSAT), zoom: ZOOM_AWAL })
    });
    mapRef.current = map;

    sumberSorotRef.current = new VectorSource();
    map.addLayer(layerSorot(sumberSorotRef.current));

    sumberPenandaRef.current = new VectorSource();
    map.addLayer(layerPenandaKlik(sumberPenandaRef.current));

    sumberGpsRef.current = new VectorSource();
    map.addLayer(new VectorLayer({ source: sumberGpsRef.current, zIndex: 1000 }));

    // Cluster titik kuesioner.
    sumberTitikRef.current = new VectorSource();
    const simpananGaya = {};
    const layerCluster = new AnimatedCluster({
      name: NAMA_LAYER_TITIK,
      source: new Cluster({ distance: JARAK_CLUSTER, source: sumberTitikRef.current }),
      animationDuration: DURASI_ANIMASI_CLUSTER,
      zIndex: 100,
      style: gayaCluster(simpananGaya)
    });
    map.addLayer(layerCluster);
    petaLayerRef.current[ID_LAYER_TITIK] = layerCluster;

    // `style` — BUKAN `featureStyle`. Di ol-ext keduanya berbeda: `featureStyle`
    // menata fitur yang tersingkap saat cluster dibuka, sedangkan `style`
    // diteruskan ke interaksi Select di bawahnya. Panel super admin memakai
    // `style`, sehingga kaki-kaki spiralnya memakai gaya bawaan ol-ext. Disalin
    // apa adanya supaya tampilannya sama — jangan dipindahkan ke `featureStyle`
    // tanpa mengubah panel asalnya juga.
    const pilihCluster = new SelectCluster({
      pointRadius: 15,
      animate: true,
      limit: 10,
      spiral: true,
      circleMaxObjects: 10,
      autoCompute: true,
      style: gayaTitikTerpilih
    });
    map.addInteraction(pilihCluster);

    map.on('pointermove', (e) => {
      const c = toLonLat(e.coordinate);
      setKoordinat(`${c[1].toFixed(4)}, ${c[0].toFixed(4)}`);
      const kena = map.hasFeatureAtPixel(map.getEventPixel(e.originalEvent));
      map.getTargetElement().style.cursor = kena ? 'pointer' : '';
    });

    map.on('singleclick', tanganiKlik);

    // OpenLayers harus diukur ulang tepat sebelum dialog cetak membaca tata
    // letaknya; tanpa renderSync, kanvas yang dicetak masih berukuran layar dan
    // petanya tampil terpotong di kertas.
    const sebelumCetak = () => {
      map.updateSize();
      map.renderSync();
    };
    const setelahCetak = () => setTimeout(() => map.updateSize(), 100);
    window.addEventListener('beforeprint', sebelumCetak);
    window.addEventListener('afterprint', setelahCetak);

    return () => {
      window.removeEventListener('beforeprint', sebelumCetak);
      window.removeEventListener('afterprint', setelahCetak);
      map.setTarget(undefined);
      mapRef.current = null;
      petaLayerRef.current = {};
    };
  }, [tanganiKlik]);

  // ── Pasang layer WMS/GeoJSON ───────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    layerUi.forEach((l) => {
      if (l.id === ID_LAYER_TITIK || petaLayerRef.current[l.id]) return;
      const olLayer = buatLayer(l);
      if (!olLayer) return;
      map.addLayer(olLayer);
      petaLayerRef.current[l.id] = olLayer;
    });
  }, [layerUi]);

  // ── Gambar ulang titik setiap kali penyaringnya berubah ────────────────────
  useEffect(() => {
    const sumber = sumberTitikRef.current;
    if (!sumber) return;
    sumber.clear();
    sumber.addFeatures(
      titikTersaring.map(
        (t) =>
          new Feature({
            geometry: new Point(fromLonLat([Number(t.lng), Number(t.lat)])),
            data: t
          })
      )
    );
  }, [titikTersaring]);

  // ── Daftar desa mengikuti kecamatan terpilih ───────────────────────────────
  useEffect(() => {
    if (!filter.kecamatan) {
      setDaftarDesa([]);
      return;
    }
    let aktif = true;
    ambilDesa(filter.kecamatan)
      .then((d) => {
        if (aktif) setDaftarDesa(d);
      })
      .catch(() => {
        if (aktif) setDaftarDesa([]);
      });
    return () => {
      aktif = false;
    };
  }, [filter.kecamatan]);

  // ── Sorot batas wilayah + filter spasial ───────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const sumber = sumberSorotRef.current;
    if (!map || !sumber) return;

    if (!filter.kecamatan) {
      sumber.clear();
      setIdsSpasial(null);
      return;
    }

    let aktif = true;
    // Ditunda 500 ms seperti debounce di panel: berganti kecamatan lewat papan
    // tombol akan melewati beberapa pilihan, dan tiap pilihan yang terlewat
    // tidak perlu jadi satu permintaan geometri.
    const jam = setTimeout(() => {
      ambilGeometriWilayah(filter.kecamatan, filter.desa || null)
        .then((geo) => {
          if (!aktif || !geo) {
            if (aktif) {
              sumber.clear();
              setIdsSpasial(null);
            }
            return;
          }

          sumber.clear();
          const fitur = new GeoJSON().readFeature(geo, {
            dataProjection: 'EPSG:4326',
            featureProjection: 'EPSG:3857'
          });
          sumber.addFeature(fitur);

          // Uji titik-dalam-polygon dilakukan pada koordinat EPSG:3857, bukan
          // pada derajat — sama dengan panel. Hasilnya bisa berbeda di tepi
          // poligon bila dikerjakan pada proyeksi yang lain.
          const geom = fitur.getGeometry();
          const ids = new Set();
          titik.forEach((t) => {
            if (geom.intersectsCoordinate(fromLonLat([Number(t.lng), Number(t.lat)]))) ids.add(t.id);
          });
          setIdsSpasial(ids);

          map.getView().fit(sumber.getExtent(), { padding: [50, 50, 50, 50], duration: 1000 });
        })
        .catch(() => {
          if (aktif) {
            sumber.clear();
            setIdsSpasial(null);
          }
        });
    }, 500);

    return () => {
      aktif = false;
      clearTimeout(jam);
    };
  }, [filter.kecamatan, filter.desa, titik]);

  // ── Aksi kontrol ───────────────────────────────────────────────────────────
  const gantiBasemap = (id) => {
    setBasemapAktif(id);
    setMenuBasemap(false);
    if (baseRef.current) baseRef.current.setSource(sumberBasemap(id));
  };

  const zoom = (delta) => {
    const view = mapRef.current?.getView();
    if (view) view.setZoom(view.getZoom() + delta);
  };

  const keRumah = () => {
    const view = mapRef.current?.getView();
    if (!view) return;
    view.setCenter(fromLonLat(PUSAT));
    view.setZoom(ZOOM_HOME);
  };

  const toggleLayer = (l) => {
    const olLayer = petaLayerRef.current[l.id];
    if (olLayer) olLayer.setVisible(!l.visible);
    setLayerUi((lama) => lama.map((x) => (x.id === l.id ? { ...x, visible: !x.visible } : x)));
  };

  const aturOpacity = (l, nilai) => {
    const olLayer = petaLayerRef.current[l.id];
    if (olLayer) olLayer.setOpacity(nilai);
    setLayerUi((lama) => lama.map((x) => (x.id === l.id ? { ...x, opacity: nilai } : x)));
  };

  /** Temukan lokasi pengguna: titik biru berhalo, lalu zoom 16. */
  const cariLokasiSaya = () => {
    if (!navigator.geolocation) {
      window.alert('Browser Anda tidak mendukung layanan lokasi GPS.');
      return;
    }
    setMencariGps(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        const koord = fromLonLat([lon, lat]);
        const sumber = sumberGpsRef.current;
        sumber.clear();

        // Halo ditambahkan LEBIH DULU agar titik pekatnya tergambar di atasnya.
        const halo = new Feature({ geometry: new Point(koord) });
        halo.setStyle(gayaHaloGps());
        const inti = new Feature({ geometry: new Point(koord) });
        inti.setStyle(gayaGps());
        sumber.addFeature(halo);
        sumber.addFeature(inti);

        mapRef.current?.getView().animate({ center: koord, zoom: ZOOM_TITIK, duration: 1500 });
        ambilCuaca(lat, lon).then(setCuaca);
        setMencariGps(false);
      },
      (err) => {
        let pesan = 'Tidak dapat mengakses GPS Anda.';
        if (err.code === err.PERMISSION_DENIED) pesan = 'Izin akses lokasi ditolak oleh pengguna/browser.';
        else if (err.code === err.POSITION_UNAVAILABLE) pesan = 'Informasi lokasi tidak tersedia.';
        else if (err.code === err.TIMEOUT) pesan = 'Waktu permintaan lokasi habis.';
        window.alert(pesan);
        setMencariGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  /**
   * Siapkan cetakan lalu buka dialog cetak.
   *
   * Skala dan legenda ditulis ke DOM secara imperatif, bukan lewat state: cetak
   * harus dipanggil pada DOM yang SUDAH diperbarui, dan `setState` tidak
   * menjamin itu sebelum `window.print()` berjalan. Jeda 500 ms memberi
   * OpenLayers waktu menggambar ulang kanvas pada ukuran kertas.
   */
  const siapkanCetak = () => {
    const map = mapRef.current;
    if (!map) return;

    const view = map.getView();
    const skala = hitungSkala(view.getResolution(), view.getProjection().getMetersPerUnit());
    if (skalaRef.current) skalaRef.current.textContent = `1 : ${skala.toLocaleString('id-ID')}`;

    const wadah = legendaCetakRef.current;
    if (wadah) {
      wadah.innerHTML = '';

      const basemap = document.createElement('div');
      basemap.className = 'mb-2 break-inside-avoid';
      basemap.innerHTML =
        '<h5 class="font-bold text-[7px] mb-1">Basemap</h5>' +
        '<div class="flex items-center gap-1.5"><div class="w-3 h-3 bg-blue-100 border border-slate-300"></div>' +
        `<span>${BASEMAP.find((b) => b.id === basemapAktif)?.nama || 'Basemap'}</span></div>`;
      wadah.appendChild(basemap);

      layerUi
        .filter((l) => l.visible)
        .forEach((l) => {
          const div = document.createElement('div');
          div.className = 'mb-2 break-inside-avoid w-full';
          const judul = `<h5 class="font-bold text-[7px] mb-1 truncate">${l.nama}</h5>`;

          if (l.tipe === 'geojson') {
            div.innerHTML =
              judul +
              '<div class="flex items-center gap-1.5"><div class="w-3 h-3 rounded-full bg-slate-500 border border-slate-700 flex-shrink-0"></div>' +
              '<span class="truncate">Data Vektor</span></div>';
          } else if (l.tipe === 'geoserver' || l.tipe === 'wms') {
            const src = urlLegenda(l, { lebar: 15, tinggi: 15, warnaFont: '0x000000' });
            div.innerHTML = `${judul}<img src="${src}" class="max-w-full" onerror="this.style.display='none'">`;
          }
          wadah.appendChild(div);
        });
    }

    setTimeout(() => window.print(), 500);
  };

  const bersihkanFilter = () => {
    setKetikan('');
    setFilter({ search: '', kecamatan: '', desa: '', user: '' });
  };

  // ── Keadaan muat & galat ───────────────────────────────────────────────────
  if (galat) {
    return (
      <div className="p-6">
        <Galat pesan={galat} onUlang={ambil} />
      </div>
    );
  }

  return (
    <>
      <style>{GAYA_PETA}</style>

      <div id="peta-sebaran-asta" className="relative h-full w-full overflow-hidden bg-slate-50">
        {/* Peta */}
        <div id="peta-kanvas" ref={wadahRef} className="absolute inset-0 z-0 bg-slate-100 shadow-inner" />

        {/* Bilah atas: kembali, toggle panel, pencarian */}
        <header className="sembunyi-cetak pointer-events-none absolute left-6 right-6 top-6 z-40 flex items-center gap-3">
          <Link
            to="/core-dashboard/asta-desa"
            title="Kembali ke halaman Asta Desa"
            className="pointer-events-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-white bg-white text-slate-600 shadow-2xl transition-all hover:text-slate-900 active:scale-95"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>

          <button
            type="button"
            onClick={() => setPanelTerbuka((v) => !v)}
            aria-label="Buka atau tutup panel"
            className="pointer-events-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-white bg-white text-slate-600 shadow-2xl transition-all hover:text-slate-900 active:scale-95"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="pointer-events-auto flex h-12 max-w-sm flex-1 items-center gap-3 rounded-2xl border border-white bg-white px-5 shadow-2xl transition-all focus-within:ring-2 focus-within:ring-slate-500/20">
            <Search className="h-4 w-4 flex-shrink-0 text-slate-400" />
            <input
              type="text"
              value={ketikan}
              onChange={(e) => setKetikan(e.target.value)}
              placeholder="Cari aset..."
              aria-label="Cari nama KK, NIK, atau enumerator"
              className="w-full border-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Jumlah titik yang sedang tergambar. Tidak ada di panel, tetapi
              halaman ini menyaring di sisi klien dan pembaca berhak tahu berapa
              dari keseluruhan yang sedang ia lihat. */}
          <span className="pointer-events-auto hidden flex-shrink-0 items-center gap-1.5 rounded-2xl border border-white bg-white/90 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-2xl backdrop-blur lg:flex">
            {memuat && <Loader2 className="h-3 w-3 animate-spin" />}
            {titikTersaring.length.toLocaleString('id-ID')} / {titik.length.toLocaleString('id-ID')} titik
          </span>
        </header>

        {/* Panel */}
        <div className="sembunyi-cetak">
          <PanelPeta
            terbuka={panelTerbuka}
            onTutup={() => setPanelTerbuka(false)}
            tab={tab}
            setTab={setTab}
            grupLayer={grupLayer}
            onToggleLayer={toggleLayer}
            onOpacity={aturOpacity}
            fiturTerpilih={fiturTerpilih}
            memuatInfo={memuatInfo}
            cuaca={cuaca}
            filter={filter}
            setFilter={setFilter}
            daftarKecamatan={kecamatan}
            daftarDesa={daftarDesa}
            daftarEnumerator={daftarEnumerator}
            koordinat={koordinat}
            onBersihkanFilter={bersihkanFilter}
            onBukaDetail={setIdDetail}
          />
        </div>

        {/* Pemilih basemap */}
        <div className="sembunyi-cetak absolute right-4 top-6 z-40 lg:right-8">
          <button
            type="button"
            onClick={() => setMenuBasemap((v) => !v)}
            aria-label="Ganti peta dasar"
            className="flex h-14 w-14 items-center justify-center rounded-3xl border border-white bg-white/95 text-slate-600 shadow-2xl backdrop-blur-xl transition-all hover:text-slate-900 active:scale-95"
          >
            <LayersIcon className="h-6 w-6" />
          </button>

          {menuBasemap && (
            <div className="absolute right-0 top-[4.5rem] grid w-[85vw] grid-cols-2 gap-4 rounded-3xl border border-white bg-white/95 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.15)] backdrop-blur-3xl sm:w-[420px] sm:grid-cols-3 sm:gap-5">
              {BASEMAP.map((bm) => (
                <button
                  key={bm.id}
                  type="button"
                  onClick={() => gantiBasemap(bm.id)}
                  className="group/bm flex flex-col items-center gap-2.5"
                >
                  <span
                    className={`relative block aspect-[4/3] w-full overflow-hidden rounded-xl border-2 transition-all group-hover/bm:-translate-y-1 group-hover/bm:scale-105 group-hover/bm:shadow-xl ${
                      basemapAktif === bm.id ? 'border-blue-500' : 'border-transparent'
                    }`}
                  >
                    {/* Pratinjau digambar dari tile asli basemap-nya, bukan dari
                        berkas thumbnail: DPMD tidak punya berkas itu, dan satu
                        tile sudah cukup mewakili tampilannya. */}
                    <img
                      src={pratinjauBasemap(bm.id)}
                      alt=""
                      className="h-full w-full bg-slate-200 object-cover"
                      loading="lazy"
                    />
                    {basemapAktif === bm.id && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-600 text-[10px] font-black text-white shadow-lg">
                        ✓
                      </span>
                    )}
                  </span>
                  <span
                    className={`text-[10px] font-black uppercase tracking-widest transition-colors ${
                      basemapAktif === bm.id ? 'text-blue-500' : 'text-slate-500'
                    }`}
                  >
                    {bm.nama}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Kontrol kanan bawah */}
        <div className="sembunyi-cetak absolute bottom-8 right-4 z-40 flex flex-col gap-4 lg:right-8">
          <div className="flex flex-col overflow-hidden rounded-3xl border border-white bg-white/90 shadow-[0_20px_50px_rgba(0,0,0,0.1)] backdrop-blur-xl">
            <button
              type="button"
              onClick={() => zoom(1)}
              aria-label="Perbesar"
              className="flex h-14 w-14 items-center justify-center border-b border-slate-100 text-slate-600 transition-all hover:bg-slate-600 hover:text-white active:scale-90"
            >
              <Plus className="h-5 w-5" strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => zoom(-1)}
              aria-label="Perkecil"
              className="flex h-14 w-14 items-center justify-center text-slate-600 transition-all hover:bg-slate-600 hover:text-white active:scale-90"
            >
              <Minus className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>

          <TombolKontrol judul="Kembali ke tampilan awal" onClick={keRumah}>
            <MapPin className="h-6 w-6" />
          </TombolKontrol>

          <TombolKontrol judul="Temukan Lokasi Saya (GPS)" onClick={cariLokasiSaya} memuat={mencariGps}>
            {mencariGps ? <Loader2 className="h-6 w-6 animate-spin" /> : <Crosshair className="h-6 w-6" />}
          </TombolKontrol>

          <TombolKontrol judul="Cetak Peta (A3)" onClick={siapkanCetak}>
            <Printer className="h-6 w-6" />
          </TombolKontrol>
        </div>

        {/* Kejujuran data: berapa baris yang tidak tergambar, dan berapa titik
            yang koordinatnya bukan koordinat rumah. Keduanya penjelasan atas
            selisih angka bila halaman ini disandingkan dengan panel super
            admin — tanpa itu, selisihnya hanya bisa ditebak. */}
        {rekapSebaran && (rekapSebaran.tanpa_koordinat > 0 || rekapSebaran.pakai_koordinat_lokasi > 0) && (
          <div className="sembunyi-cetak absolute bottom-8 left-6 z-20 hidden max-w-md space-y-1 rounded-2xl border border-white bg-white/90 px-4 py-2.5 text-[10px] leading-relaxed text-slate-500 shadow-lg backdrop-blur xl:block">
            {rekapSebaran.tanpa_koordinat > 0 && (
              <p>
                {rekapSebaran.tanpa_koordinat.toLocaleString('id-ID')} dari{' '}
                {(rekapSebaran.total_baris || 0).toLocaleString('id-ID')} baris sensus belum punya koordinat
                yang bisa dipetakan, jadi tidak tergambar di sini.
              </p>
            )}
            {rekapSebaran.pakai_koordinat_lokasi > 0 && (
              <p>
                {rekapSebaran.pakai_koordinat_lokasi.toLocaleString('id-ID')} titik memakai koordinat lokasi
                pendataan karena koordinat rumahnya kosong — posisinya bisa sedikit berbeda dari panel ASTA
                DESA.
              </p>
            )}
          </div>
        )}

        {/* Lembar keterangan cetak — tersembunyi di layar, muncul saat dicetak. */}
        <div id="kertas-cetak" className="hidden flex-col font-sans text-black">
          <div className="mb-2 flex flex-col items-center border-b border-black pb-2">
            <img
              src="/logo.png"
              alt=""
              className="mb-1 h-12 w-12 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
            <h1 className="text-center text-[10px] font-black uppercase tracking-tight">
              Pemerintah Kabupaten Bogor
            </h1>
            <h2 className="text-center text-[8px] font-bold uppercase tracking-tighter">
              Dinas Pemberdayaan Masyarakat dan Desa
            </h2>
            <h3 className="mt-1 w-full border-t border-black pt-1 text-center text-[9px] font-black uppercase tracking-tight">
              Peta Sebaran Data Kuesioner Sensus Desa Presisi
            </h3>
          </div>

          <div className="mb-2 flex flex-col items-center border-b border-black pb-2">
            <div className="relative flex h-8 w-6 flex-col items-center justify-center">
              <svg viewBox="0 0 24 24" fill="black" className="h-6 w-6">
                <path d="M12 2L20 22L12 17L4 22L12 2Z" />
              </svg>
              <span className="absolute top-[4px] text-[10px] font-black text-white">U</span>
            </div>
            <h4 className="mt-1 text-[9px] font-bold uppercase">Skala</h4>
            <p className="text-sm font-black" ref={skalaRef}>
              1 : -
            </p>
          </div>

          <div className="mb-2 space-y-0.5 border-b border-black pb-2 text-[7px] leading-tight">
            <p>
              <strong>Proyeksi:</strong> EPSG:4326
            </p>
            <p>
              <strong>Ellipsoid Reference:</strong> WGS 84
            </p>
            <p>
              <strong>Sistem Grid:</strong> Geografi
            </p>
            <p>
              <strong>Sources:</strong> OSM, ASTA DESA
            </p>
            <p>
              <strong>Year:</strong> {new Date().getFullYear()}
            </p>
          </div>

          <div className="mb-2 flex min-h-[150px] flex-1 flex-col overflow-hidden border-b border-black pb-2">
            <h4 className="mb-1 text-[8px] font-bold uppercase">Keterangan:</h4>
            <div ref={legendaCetakRef} className="flex w-full flex-col gap-1 overflow-y-auto text-[7px]" />
          </div>

          <div className="text-[7px]">
            <h4 className="mb-0.5 font-bold uppercase">Sumber Data:</h4>
            <ol className="m-0 list-decimal pl-3">
              <li>Sensus Desa Presisi — ASTA DESA, Kabupaten Bogor</li>
              <li>OpenStreetMap</li>
            </ol>
          </div>
        </div>

        {/* Penanda muat pertama, di atas peta yang masih kosong. */}
        {memuat && titik.length === 0 && (
          <div className="sembunyi-cetak absolute inset-0 z-20 flex items-center justify-center bg-slate-50/70 backdrop-blur-sm">
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-xl">
              <Memuat pesan="Menyusun titik sebaran…" tinggi="py-2" />
            </div>
          </div>
        )}
      </div>

      {/* Detail lengkap satu keluarga — komponen yang sama dengan tab Data Sensus. */}
      {idDetail && <PanelDetail id={idDetail} onTutup={() => setIdDetail(null)} />}
    </>
  );
};

export default PetaSebaranPage;
