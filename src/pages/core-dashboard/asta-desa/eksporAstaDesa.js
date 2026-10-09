/**
 * Ekspor halaman Asta Desa ke Excel (.xlsx) dan PDF.
 *
 * DUA BERKAS, SATU SUMBER ANGKA. Keduanya dibangun dari muatan yang sama
 * (`/demografi/wilayah` dan `/sensus/ekspor`), lewat fungsi penyusun baris yang
 * sama, supaya "Excel bilang 1.204 tapi PDF bilang 1.198" mustahil terjadi.
 * Pembagian isinya yang berbeda, bukan angkanya:
 *
 *   - Excel = bahan untuk diolah lagi. Bentuk PANJANG (satu baris = satu nilai
 *     di satu wilayah) pada rincian sensus, karena itulah satu-satunya bentuk
 *     yang bisa langsung dijadikan pivot. Seluruh 400-an desa ikut.
 *   - PDF = dokumen untuk dibaca dan dilampirkan. Rekap per kecamatan dan per
 *     desa ikut utuh, tetapi rincian ~80 kolom sensus hanya untuk wilayah yang
 *     sedang dipilih. Tabel 139 ribu baris di kertas A4 bukan dokumen, dan
 *     tidak ada pembaca yang pernah membukanya.
 *
 * Pustakanya (`xlsx`, `jspdf`, `jspdf-autotable`) dimuat SAAT TOMBOL DITEKAN,
 * bukan saat halaman dibuka — pola yang sama dengan `utils/eksporTabel.js` dan
 * `formulirEkspor.js`. Ketiganya berjumlah ratusan kilobyte, sementara
 * sebagian besar kunjungan ke tab Demografi hanya membaca grafiknya.
 *
 * KESEGARAN DATA BUKAN URUSAN BERKAS INI. Backend yang menolak melayani ekspor
 * selama potretnya belum selaras dengan hitungan ASTA DESA saat ini; di sini
 * `kesiapan` hanya DITULISKAN ke dalam berkas, supaya siapa pun yang memegang
 * lampirannya tahu potret kapan yang sedang dibacanya.
 */

import { angka } from './warna';

const INSTANSI = 'DINAS PEMBERDAYAAN MASYARAKAT DAN DESA KABUPATEN BOGOR';

/**
 * Pagar batas baris satu lembar Excel.
 *
 * Bukan batas Excel (1.048.576), melainkan batas kewarasan tab browser:
 * rincian sensus seluruh desa bisa mencapai ±140 ribu baris x 11 kolom, dan
 * merakitnya di memori perangkat pembaca punya ujungnya. Begitu terlampaui,
 * lembarnya DILEWATI dan alasannya ditulis di lembar Ringkasan beserta jalan
 * keluarnya — menyaring satu kecamatan lalu mengekspor lagi — bukan dibiarkan
 * menggantung sampai tabnya mati.
 */
const BATAS_BARIS_LEMBAR = 300000;

/** Maksimal baris sensus yang dirinci di PDF; sisanya diarahkan ke Excel. */
const BATAS_RINCIAN_PDF = 3000;

const KELOMPOK_ANAK = ['0–4', '5–14'];
const KELOMPOK_PRODUKTIF = ['15–24', '25–39', '40–54', '55–64'];
const KELOMPOK_LANSIA = ['65+'];

// ── Penolong umum ───────────────────────────────────────────────────────────

const bersihkanNama = (teks) =>
  String(teks || 'asta-desa')
    // Yang dilarang Windows pada nama berkas, lalu koma/titik yang hanya
    // menghasilkan nama seperti "desa-pabuaran,-kec.-cibinong".
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/[,.]+/g, '')
    .replace(/\s+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase()
    .slice(0, 70);

/**
 * `<dasar>-20261009-1842` — tanggal dan jam ekspor ikut ke nama berkas.
 *
 * Diambil dari cap yang sama dengan yang ditulis di dalam berkas, bukan dari
 * `new Date()` kedua: nama berkas dan isinya harus menyebut jam yang sama,
 * terutama karena nama berkas inilah yang terbaca di lampiran surel.
 */
const namaBerkasBertanggal = (dasar, cap) => {
  const bagian = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta'
  })
    .format(cap.pada)
    .replace(/[^\d]/g, '');
  return `${bersihkanNama(dasar)}-${bagian.slice(0, 8)}-${bagian.slice(8, 12)}`;
};

/**
 * Cap waktu untuk ditulis ke dalam berkas.
 *
 * ZONANYA DIPATOK Asia/Jakarta, bukan zona perangkat yang mengekspor. Berkas
 * ini beredar sebagai lampiran: yang membukanya belum tentu duduk di zona yang
 * sama dengan yang mengunduhnya, dan "08.15" tanpa keterangan zona adalah cap
 * waktu yang tidak bisa dipakai membandingkan dua berkas. Labelnya ditulis
 * tegas "WIB" karena itulah zona yang dipakai seluruh pelaporan di sini.
 *
 * Detiknya ikut: dua ekspor pada menit yang sama bukan hal aneh saat orang
 * menyaring ulang lalu mengunduh lagi, dan tanpa detik keduanya tampak sebagai
 * berkas yang sama.
 */
const waktuPanjang = (nilai) => {
  if (!nilai) return '—';
  const d = new Date(nilai);
  if (Number.isNaN(d.getTime())) return String(nilai);
  return `${d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jakarta'
  })} WIB`;
};

/** Hanya tanggalnya, mis. "9 Oktober 2026 (Kamis)". */
const tanggalSaja = (nilai) => {
  const d = nilai ? new Date(nilai) : new Date();
  return d.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta'
  });
};

/** Hanya jamnya, mis. "18.42.07 WIB". */
const jamSaja = (nilai) => {
  const d = nilai ? new Date(nilai) : new Date();
  return `${d.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jakarta'
  })} WIB`;
};

/**
 * Saat ekspor dijalankan, DIBEKUKAN SEKALI per berkas.
 *
 * Satu berkas PDF menuliskan capnya di kepala halaman pertama dan di kaki
 * SETIAP halaman; memanggil `new Date()` di tiap tempat membuat halaman 1 dan
 * halaman 40 membawa jam yang berbeda, dan pembacanya tidak punya cara tahu
 * mana yang benar.
 */
const capEkspor = () => {
  const pada = new Date();
  return {
    pada,
    tanggal: tanggalSaja(pada),
    jam: jamSaja(pada),
    penuh: waktuPanjang(pada)
  };
};

/** Persen sebagai ANGKA (bukan teks): di Excel kolom ini masih harus bisa diurutkan. */
const persenAngka = (bagian, total) => (total ? Math.round((bagian / total) * 1000) / 10 : 0);

const jumlah = (deret) => (deret || []).reduce((a, b) => a + (Number(b) || 0), 0);

/**
 * Nama wilayah yang sedang dipilih, untuk judul berkas dan subjudul dokumen.
 * Satu tempat, supaya nama berkas dan isi dokumennya tidak pernah bercerita
 * tentang wilayah yang berbeda.
 */
export const labelLingkup = (filter = {}) => {
  if (filter.desa) return `Desa ${filter.desa}, Kec. ${filter.kecamatan}`;
  if (filter.kecamatan) return `Kecamatan ${filter.kecamatan}`;
  return 'Seluruh Kabupaten Bogor';
};

/**
 * Potong muatan per wilayah mengikuti penyaring halaman.
 *
 * Penyaringnya dikerjakan DI SINI, bukan dengan memanggil ulang server:
 * muatannya sudah berisi seluruh kecamatan dan desa, dan satu permintaan yang
 * sama tidak perlu diulang hanya untuk membuang baris yang tidak diminta.
 */
const saring = (data, filter = {}) => {
  const kec = filter.kecamatan || null;
  const desa = filter.desa || null;
  if (!kec && !desa) return { kecamatan: data.per_kecamatan, desa: data.per_desa };
  return {
    kecamatan: data.per_kecamatan.filter((w) => !kec || w.kecamatan === kec),
    desa: data.per_desa.filter((w) => (!kec || w.kecamatan === kec) && (!desa || w.desa === desa))
  };
};

/**
 * Ringkasan kesiapan data, dalam satu kalimat yang bisa dibaca di berkas.
 *
 * "Data disusun" SENGAJA dipisahkan dari "Diekspor". Keduanya hampir selalu
 * berbeda — potret di server disusun tiap TTL, ekspornya kapan saja sesudah
 * itu — dan menyatukannya menjadi satu "tanggal laporan" adalah cara tercepat
 * membuat orang mengira datanya sebaru jam cetaknya.
 *
 * Yang menjembatani keduanya adalah penyusulan: baris yang masuk ke ASTA DESA
 * setelah potret disusun ditarik saat tombol ditekan dan IKUT ke dalam berkas.
 * Jumlahnya ditulis di sini supaya pembaca tahu berkasnya memang memuat
 * pendataan terbaru, bukan hanya potret setengah jam lalu.
 */
const kalimatKesiapan = (kesiapan) => {
  const k = kesiapan?.keluarga || kesiapan || {};
  const bagian = [`Potret data disusun ${waktuPanjang(k.disusun_pada)}`];

  if (k.baris_susulan) {
    bagian.push(`+${angka(k.baris_susulan)} baris terbaru disusul langsung dari ASTA DESA saat ekspor`);
  } else if (k.baris_susulan === 0) {
    bagian.push('tidak ada baris baru di ASTA DESA yang belum ikut');
  }

  if (k.baris_tercakup !== null && k.baris_tercakup !== undefined && k.total_hidup) {
    bagian.push(
      `${angka(k.baris_tercakup)} dari ${angka(k.total_hidup)} baris menurut ASTA DESA` +
        (k.selisih ? ` (selisih ${angka(k.selisih)}, dari baris yang tergeser keluar paginasi saat penyusuran)` : ' (tanpa selisih)')
    );
  }

  if (kesiapan?.dipaksa) bagian.push('DIEKSPOR TANPA MENUNGGU PENYEGARAN — angka di atas belum tentu terpenuhi');
  if (k.sebagian) bagian.push('PEMBACAAN SEBAGIAN — bacalah proporsinya, bukan jumlah mutlaknya');
  return bagian.join(' · ');
};

/** Baris-baris kesegaran untuk lembar Ringkasan, terpisah supaya bisa diurutkan. */
const barisKesegaran = (kesiapan) => {
  const k = kesiapan?.keluarga || kesiapan || {};
  const baris = [['Potret data disusun', waktuPanjang(k.disusun_pada)]];
  if (k.baris_susulan !== null && k.baris_susulan !== undefined) {
    baris.push(['Baris terbaru disusul saat ekspor', k.baris_susulan]);
  }
  if (k.baris_tercakup !== null && k.baris_tercakup !== undefined) {
    baris.push(['Baris tercakup', k.baris_tercakup]);
  }
  if (k.total_hidup !== null && k.total_hidup !== undefined) {
    baris.push(['Baris menurut ASTA DESA saat ekspor', k.total_hidup]);
  }
  if (k.selisih !== null && k.selisih !== undefined) baris.push(['Selisih', k.selisih]);
  return baris;
};

// ── Excel: penolong lembar ──────────────────────────────────────────────────

/**
 * Lebar kolom dihitung dari 200 baris pertama saja.
 *
 * Mengukur seluruh 139 ribu baris hanya untuk menebak lebar kolom memakan
 * waktu lebih lama daripada menulis berkasnya, dan 200 baris sudah cukup
 * mewakili — nama desa terpanjang di Kabupaten Bogor pasti muncul di antaranya.
 */
const lebarKolom = (aoa) => {
  if (!aoa.length) return [];
  const contoh = aoa.slice(0, 200);
  return aoa[0].map((_, i) => ({
    wch: Math.min(
      Math.max(...contoh.map((r) => String(r?.[i] ?? '').length), 4) + 2,
      48
    )
  }));
};

/**
 * Cap waktu ke properti berkas Excel.
 *
 * Lembar Ringkasan sudah menuliskannya, tetapi berkas ini sering diteruskan
 * dan dibuka langsung di lembar datanya. Properti berkas membuat jawabannya
 * tetap ada di Info/Properties tanpa pembacanya perlu tahu lembar mana yang
 * harus dicari.
 */
const tandaiBuku = (buku, judul, cap, kesiapan) => {
  buku.Props = {
    Title: judul,
    Subject: `Diekspor ${cap.penuh}`,
    Author: INSTANSI,
    Company: INSTANSI,
    Comments: `Diekspor ${cap.penuh}. ${kalimatKesiapan(kesiapan)}`,
    CreatedDate: cap.pada
  };
};

const tambahLembar = (XLSX, buku, nama, aoa) => {
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  sheet['!cols'] = lebarKolom(aoa);
  // Nama lembar Excel maksimal 31 karakter; lebih dari itu berkasnya ditolak
  // saat dibuka, bukan saat ditulis — jadi dipangkas di sini.
  XLSX.utils.book_append_sheet(buku, sheet, nama.slice(0, 31));
};

// ── Demografi: penyusun baris (dipakai Excel DAN PDF) ───────────────────────

/** Indeks kelompok usia yang termasuk satu himpunan label. */
const indeksUsia = (kelompok, labelDicari) =>
  kelompok.map((l, i) => (labelDicari.includes(l) ? i : -1)).filter((i) => i >= 0);

/**
 * Satu baris rekap wilayah: keluarga, anggota, jenis kelamin, tiga kelompok usia.
 *
 * `anggota` boleh null — artinya rincian anggota untuk wilayah itu belum bisa
 * dilacak (lihat `anggota.per_wilayah_siap` pada muatan). Yang ditulis
 * kemudian adalah tanda pisah, BUKAN nol: nol akan terbaca sebagai "tidak ada
 * penduduk di desa ini".
 */
const barisRekapWilayah = (w, kelompok) => {
  const a = w.anggota;
  if (!a) return [w.total_keluarga, null, null, null, null, null, null, null, null, null, null];

  const anak = jumlah(indeksUsia(kelompok, KELOMPOK_ANAK).map((i) => a.usia[i]?.[3]));
  const produktif = jumlah(indeksUsia(kelompok, KELOMPOK_PRODUKTIF).map((i) => a.usia[i]?.[3]));
  const lansia = jumlah(indeksUsia(kelompok, KELOMPOK_LANSIA).map((i) => a.usia[i]?.[3]));
  const [L, P, lain] = a.jk;

  return [
    w.total_keluarga,
    a.total,
    w.total_keluarga ? Math.round((a.total / w.total_keluarga) * 100) / 100 : 0,
    L,
    P,
    lain,
    P ? Math.round((L / P) * 100) : null,
    anak,
    produktif,
    lansia,
    a.tanpa_usia
  ];
};

const KEPALA_REKAP = [
  'Keluarga terdata',
  'Anggota tercatat',
  'Anggota/keluarga',
  'Laki-laki',
  'Perempuan',
  'Tidak diketahui',
  'Rasio JK (L per 100 P)',
  'Usia 0–14',
  'Usia 15–64',
  'Usia 65+',
  'Tanpa usia'
];

const rekapKecamatan = (wilayah, kelompok) => ({
  kepala: ['No', 'Kecamatan', 'Jumlah desa', ...KEPALA_REKAP],
  isi: wilayah.map((w, i) => [i + 1, w.kecamatan, w.total_desa, ...barisRekapWilayah(w, kelompok)])
});

const rekapDesa = (wilayah, kelompok) => ({
  kepala: ['No', 'Kecamatan', 'Desa/Kelurahan', ...KEPALA_REKAP],
  isi: wilayah.map((w, i) => [i + 1, w.kecamatan, w.desa, ...barisRekapWilayah(w, kelompok)])
});

/** Piramida usia bentuk panjang: satu baris = satu kelompok usia di satu wilayah. */
const piramidaPanjang = (wilayah, kelompok, kunciNama) => {
  const isi = [];
  wilayah.forEach((w) => {
    if (!w.anggota) return;
    kelompok.forEach((label, i) => {
      const [L, P, lain, total] = w.anggota.usia[i] || [0, 0, 0, 0];
      isi.push([...kunciNama(w), label, L, P, lain, total, persenAngka(total, w.anggota.total)]);
    });
  });
  return isi;
};

/**
 * Sebaran satu sifat anggota (pendidikan/hubungan/disabilitas) dalam bentuk
 * LEBAR: satu baris per wilayah, satu kolom per nilai.
 *
 * Bentuk lebar dipilih di sini — berbeda dari rincian sensus yang panjang —
 * karena jumlah nilainya belasan dan tetap, sehingga tabelnya langsung bisa
 * dibaca mata tanpa pivot dulu.
 */
const sebaranLebar = (wilayah, label, kunciNama, kepalaWilayah, ambil) => ({
  kepala: [...kepalaWilayah, 'Anggota tercatat', ...label],
  isi: wilayah
    .filter((w) => w.anggota)
    .map((w) => [...kunciNama(w), w.anggota.total, ...(ambil(w.anggota) || []).map((v) => v || 0)])
});

/**
 * Rincian kolom sensus bentuk PANJANG: satu baris = satu nilai satu kolom di
 * satu wilayah. Kolom bertipe angka dilewati — statistiknya punya lembar sendiri.
 */
const sensusPanjang = (wilayah, kolom, kunciNama) => {
  const isi = [];
  wilayah.forEach((w) => {
    kolom.forEach((def, i) => {
      if (def.jenis === 'angka') return;
      const sel = w.kolom[i];
      if (!sel || !sel.n) return;
      def.nilai.forEach((nilai, j) => {
        const n = sel.n[j] || 0;
        if (!n) return; // nilai yang tidak dipilih siapa pun di wilayah ini
        isi.push([
          ...kunciNama(w),
          def.kategori_label,
          def.label,
          def.kunci,
          def.jenis === 'pilihan_ganda' ? 'Pilihan ganda' : 'Kategori',
          nilai,
          n,
          // Penyebutnya berbeda per jenis, mengikuti aturan yang dipakai
          // halamannya: kategori dibagi yang MENJAWAB kolom itu, pilihan ganda
          // dibagi SELURUH keluarga — sebab satu keluarga bisa memilih beberapa.
          def.jenis === 'pilihan_ganda' ? persenAngka(n, w.total_keluarga) : persenAngka(n, sel.t),
          sel.t,
          w.total_keluarga
        ]);
      });
    });
  });
  return isi;
};

/** Berapa baris yang akan dihasilkan `sensusPanjang` — dihitung tanpa merakitnya. */
const perkiraanBarisSensus = (wilayah, kolom) => {
  let n = 0;
  wilayah.forEach((w) => {
    kolom.forEach((def, i) => {
      if (def.jenis === 'angka') return;
      const sel = w.kolom[i];
      if (!sel || !sel.n) return;
      for (const v of sel.n) if (v) n += 1;
    });
  });
  return n;
};

/** Statistik kolom bertipe angka, satu baris per kolom per wilayah. */
const angkaPanjang = (wilayah, kolom, kunciNama) => {
  const isi = [];
  wilayah.forEach((w) => {
    kolom.forEach((def, i) => {
      if (def.jenis !== 'angka') return;
      const sel = w.kolom[i];
      if (!sel || !sel.s) return;
      isi.push([
        ...kunciNama(w),
        def.kategori_label,
        def.label,
        def.kunci,
        sel.t,
        sel.s.rata_rata,
        sel.s.median,
        sel.s.min,
        sel.s.maks
      ]);
    });
  });
  return isi;
};

// ── Demografi: Excel ────────────────────────────────────────────────────────

export const eksporDemografiExcel = async (data, filter = {}) => {
  const XLSX = await import('xlsx');
  const buku = XLSX.utils.book_new();
  const cap = capEkspor();

  const { kecamatan: wKec, desa: wDesa } = saring(data, filter);
  const kelompok = data.anggota.kelompok_usia;
  const label = data.anggota.label;
  const lingkup = labelLingkup(filter);
  const siapAnggota = data.anggota.per_wilayah_siap;

  const namaKec = (w) => [w.kecamatan];
  const namaDesa = (w) => [w.kecamatan, w.desa];
  const kepalaKec = ['Kecamatan'];
  const kepalaDesa = ['Kecamatan', 'Desa/Kelurahan'];

  // Rincian sensus seluruh desa bisa berjumlah ratusan ribu baris. Diukur
  // lebih dulu, bukan dirakit lalu disesali.
  const perkiraanDesa = perkiraanBarisSensus(wDesa, data.kolom);
  const sensusDesaIkut = perkiraanDesa <= BATAS_BARIS_LEMBAR;

  // ── Lembar 1: Ringkasan ────────────────────────────────────────────────
  const anggotaTersaring = wDesa.reduce((a, w) => a + (w.anggota?.total || 0), 0);
  const keluargaTersaring = wDesa.reduce((a, w) => a + w.total_keluarga, 0);

  const ringkasan = [
    ['REKAP DEMOGRAFI ASTA DESA'],
    [INSTANSI],
    [],
    ['Lingkup', lingkup],
    ['Kecamatan tercakup', wKec.length],
    ['Desa/kelurahan tercakup', wDesa.length],
    ['Keluarga terdata', keluargaTersaring],
    ['Anggota keluarga tercatat', siapAnggota ? anggotaTersaring : data.anggota.total],
    ['Kolom sensus terbaca', data.kolom.length],
    [],
    ['DIEKSPOR TANGGAL', cap.tanggal],
    ['DIEKSPOR JAM', cap.jam],
    [],
    ['Kesegaran data'],
    ...barisKesegaran(data.kesiapan),
    ['Ringkas', kalimatKesiapan(data.kesiapan)],
    []
  ];

  if (!siapAnggota) {
    ringkasan.push([
      'CATATAN',
      'Rincian anggota keluarga per kecamatan/desa belum tersedia: server belum berhasil memetakan anggota ke keluarganya. ' +
        `Angka anggota pada berkas ini berlaku se-kabupaten (${angka(data.anggota.total)} orang), bukan per wilayah.`
    ]);
  } else if (data.anggota.tanpa_wilayah) {
    ringkasan.push([
      'CATATAN',
      `${angka(data.anggota.tanpa_wilayah)} dari ${angka(data.anggota.total)} anggota keluarga tidak bisa ditempatkan ke desa mana pun ` +
        '(keluarganya tidak ditemukan saat penyusunan) dan TIDAK ikut dalam rekap per wilayah.'
    ]);
  }

  if (!sensusDesaIkut) {
    ringkasan.push([
      'CATATAN',
      `Lembar "Sensus Desa" dilewati: rinciannya mencapai ${angka(perkiraanDesa)} baris, di atas batas ${angka(BATAS_BARIS_LEMBAR)} baris per lembar. ` +
        'Pilih satu kecamatan pada penyaring wilayah lalu ekspor ulang untuk mendapatkan rincian per desanya.'
    ]);
  }

  ringkasan.push(
    [],
    ['Keterangan kolom'],
    ['Rasio JK', 'Jumlah laki-laki per 100 perempuan.'],
    ['Usia 15–64', 'Usia produktif, mengikuti pengelompokan piramida usia di halaman Demografi.'],
    ['% (kategori)', 'Dari keluarga yang MENJAWAB kolom itu — jumlah seluruh nilai satu kolom = 100%.'],
    ['% (pilihan ganda)', 'Dari SELURUH keluarga di wilayah itu, sebab satu keluarga bisa memilih beberapa nilai.'],
    ['Sel kosong pada kolom anggota', 'Rincian anggota untuk wilayah itu tidak terlacak — bukan bernilai nol.']
  );
  tambahLembar(XLSX, buku, 'Ringkasan', ringkasan);

  // ── Rekap per wilayah ──────────────────────────────────────────────────
  const rk = rekapKecamatan(wKec, kelompok);
  tambahLembar(XLSX, buku, 'Rekap Kecamatan', [rk.kepala, ...rk.isi]);
  const rd = rekapDesa(wDesa, kelompok);
  tambahLembar(XLSX, buku, 'Rekap Desa', [rd.kepala, ...rd.isi]);

  // ── Piramida usia ──────────────────────────────────────────────────────
  if (siapAnggota) {
    const kepalaPiramida = ['Kelompok usia', 'Laki-laki', 'Perempuan', 'Tidak diketahui', 'Total', '% dari anggota'];
    tambahLembar(XLSX, buku, 'Piramida Kecamatan', [
      [...kepalaKec, ...kepalaPiramida],
      ...piramidaPanjang(wKec, kelompok, namaKec)
    ]);
    tambahLembar(XLSX, buku, 'Piramida Desa', [
      [...kepalaDesa, ...kepalaPiramida],
      ...piramidaPanjang(wDesa, kelompok, namaDesa)
    ]);

    const sebaran = [
      ['Pendidikan', label.pendidikan, (a) => a.pendidikan],
      ['Hubungan', label.hubungan, (a) => a.hubungan],
      ['Disabilitas', label.disabilitas, (a) => a.disabilitas],
      ['Pekerjaan', label.pekerjaan, (a) => a.pekerjaan]
    ];
    sebaran.forEach(([nama, daftarLabel, ambil]) => {
      // Kolom pekerjaan belum ada di `sensus_anggotas`; lembarnya tidak dibuat
      // selama daftarnya kosong, ketimbang menyelipkan lembar kosong yang
      // membuat berkasnya tampak rusak.
      if (!daftarLabel?.length) return;
      const k = sebaranLebar(wKec, daftarLabel, namaKec, kepalaKec, ambil);
      tambahLembar(XLSX, buku, `${nama} Kecamatan`, [k.kepala, ...k.isi]);
      const d = sebaranLebar(wDesa, daftarLabel, namaDesa, kepalaDesa, ambil);
      tambahLembar(XLSX, buku, `${nama} Desa`, [d.kepala, ...d.isi]);
    });
  }

  // ── Rincian kolom sensus ───────────────────────────────────────────────
  const kepalaSensus = [
    'Kategori',
    'Pertanyaan',
    'Kunci kolom',
    'Jenis',
    'Nilai',
    'Jumlah keluarga',
    '%',
    'Keluarga menjawab',
    'Keluarga di wilayah'
  ];
  tambahLembar(XLSX, buku, 'Sensus Kecamatan', [
    [...kepalaKec, ...kepalaSensus],
    ...sensusPanjang(wKec, data.kolom, namaKec)
  ]);
  if (sensusDesaIkut) {
    tambahLembar(XLSX, buku, 'Sensus Desa', [
      [...kepalaDesa, ...kepalaSensus],
      ...sensusPanjang(wDesa, data.kolom, namaDesa)
    ]);
  }

  const kepalaAngka = ['Kategori', 'Pertanyaan', 'Kunci kolom', 'Keluarga menjawab', 'Rata-rata', 'Median', 'Terendah', 'Tertinggi'];
  const angkaKec = angkaPanjang(wKec, data.kolom, namaKec);
  if (angkaKec.length) {
    tambahLembar(XLSX, buku, 'Angka Kecamatan', [[...kepalaKec, ...kepalaAngka], ...angkaKec]);
    tambahLembar(XLSX, buku, 'Angka Desa', [
      [...kepalaDesa, ...kepalaAngka],
      ...angkaPanjang(wDesa, data.kolom, namaDesa)
    ]);
  }

  // Properti berkas ikut membawa capnya, supaya Excel sendiri bisa menjawab
  // "kapan ini dibuat" lewat Info berkas — termasuk bagi orang yang menerima
  // berkasnya tanpa pernah membuka lembar Ringkasan.
  tandaiBuku(buku, `Demografi ASTA DESA — ${lingkup}`, cap, data.kesiapan);
  XLSX.writeFile(buku, `${namaBerkasBertanggal(`demografi-asta-desa-${lingkup}`, cap)}.xlsx`);
};

// ── PDF: penolong ───────────────────────────────────────────────────────────

const GAYA_TABEL = {
  styles: { fontSize: 7.5, cellPadding: 1.6, overflow: 'linebreak' },
  headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 7.5 },
  alternateRowStyles: { fillColor: [248, 250, 252] }
};

const kepalaDokumen = (doc, { judul, subjudul, catatan, cap }) => {
  const lebar = doc.internal.pageSize.getWidth();
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(judul, 14, 14);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(INSTANSI, 14, 19.5);
  if (subjudul) doc.text(subjudul, 14, 24.5);
  // Waktu ekspor DAN waktu penyusunan data, keduanya di kepala halaman
  // pertama. Berkas ini beredar sebagai lampiran rapat; pembacanya perlu tahu
  // potret kapan yang dipegangnya tanpa menggulir ke halaman mana pun.
  doc.setFont('helvetica', 'bold');
  doc.text(`Diekspor ${cap.tanggal}`, lebar - 14, 19.5, { align: 'right' });
  doc.text(`pukul ${cap.jam}`, lebar - 14, 24, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  if (catatan) {
    doc.setFontSize(7.5);
    const potong = doc.splitTextToSize(catatan, lebar - 28);
    doc.text(potong, 14, subjudul ? 29.5 : 24.5);
    doc.setFontSize(9);
    doc.setTextColor(0);
    return (subjudul ? 29.5 : 24.5) + potong.length * 3.4 + 2;
  }
  doc.setTextColor(0);
  return subjudul ? 29 : 24;
};

const judulBagian = (doc, teks, y) => {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text(teks, 14, y);
  doc.setFont('helvetica', 'normal');
  return y + 3;
};

/**
 * Kaki setiap halaman: cap waktu ekspor di kiri, nomor halaman di kanan.
 *
 * Capnya diulang di SETIAP halaman, bukan hanya di halaman pertama. Dokumen
 * seperti ini dicetak lalu halamannya dipisah, difotokopi sebagian, atau
 * dilampirkan selembar ke notula — dan selembar tanpa cap waktu adalah angka
 * tanpa tanggal.
 *
 * Digambar SETELAH seluruh tabel selesai, dalam lintasan sendiri: di dalam
 * `didDrawPage`, `getNumberOfPages()` baru menghitung halaman yang sudah
 * digambar, sehingga halaman pertama dari lima tertulis "1 dari 1".
 */
const kakiHalaman = (doc, cap) => {
  const lebar = doc.internal.pageSize.getWidth();
  const tinggi = doc.internal.pageSize.getHeight();
  const total = doc.internal.getNumberOfPages();
  for (let h = 1; h <= total; h += 1) {
    doc.setPage(h);
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text(`Diekspor ${cap.penuh} · ${INSTANSI}`, 14, tinggi - 8);
    doc.text(`Halaman ${h} dari ${total}`, lebar - 14, tinggi - 8, { align: 'right' });
  }
  doc.setTextColor(0);
};

/** Teks untuk sel PDF: null jadi tanda pisah, bukan "null". */
const selPdf = (v) => (v === null || v === undefined ? '—' : typeof v === 'number' ? angka(v) : String(v));

const tabelPdf = (autoTable, doc, { kepala, isi, mulaiY }) => {
  autoTable(doc, {
    head: [kepala],
    body: isi.map((r) => r.map(selPdf)),
    startY: mulaiY,
    margin: { left: 14, right: 14, top: 16 },
    ...GAYA_TABEL,
    columnStyles: { 0: { cellWidth: 9, halign: 'right' } }
  });
  return doc.lastAutoTable.finalY + 7;
};

// ── Demografi: PDF ──────────────────────────────────────────────────────────

export const eksporDemografiPdf = async (data, filter = {}) => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);

  const { kecamatan: wKec, desa: wDesa } = saring(data, filter);
  const kelompok = data.anggota.kelompok_usia;
  const label = data.anggota.label;
  const lingkup = labelLingkup(filter);
  const siapAnggota = data.anggota.per_wilayah_siap;

  const cap = capEkspor();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  let y = kepalaDokumen(doc, {
    judul: 'Demografi ASTA DESA',
    subjudul: `${lingkup} · ${wKec.length} kecamatan · ${wDesa.length} desa/kelurahan`,
    catatan: kalimatKesiapan(data.kesiapan),
    cap
  });

  if (!siapAnggota) {
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9);
    const pesan = doc.splitTextToSize(
      'Rincian anggota keluarga per kecamatan/desa belum tersedia — kolom anggota pada tabel di bawah sengaja dikosongkan. ' +
        `Angka anggota se-kabupaten: ${angka(data.anggota.total)} orang.`,
      doc.internal.pageSize.getWidth() - 28
    );
    doc.text(pesan, 14, y + 1);
    y += pesan.length * 3.4 + 4;
    doc.setTextColor(0);
  }

  y = judulBagian(doc, 'Rekap per kecamatan', y + 1);
  const rk = rekapKecamatan(wKec, kelompok);
  y = tabelPdf(autoTable, doc, { kepala: rk.kepala, isi: rk.isi, mulaiY: y });

  y = judulBagian(doc, 'Rekap per desa/kelurahan', y);
  const rd = rekapDesa(wDesa, kelompok);
  y = tabelPdf(autoTable, doc, { kepala: rd.kepala, isi: rd.isi, mulaiY: y });

  if (siapAnggota) {
    y = judulBagian(doc, 'Piramida usia per kecamatan', y);
    const kepalaUsia = ['No', 'Kecamatan', ...kelompok.flatMap((l) => [`${l} L`, `${l} P`]), 'Tanpa usia'];
    const isiUsia = wKec.map((w, i) => [
      i + 1,
      w.kecamatan,
      ...kelompok.flatMap((_, j) => [w.anggota?.usia[j]?.[0] ?? null, w.anggota?.usia[j]?.[1] ?? null]),
      w.anggota?.tanpa_usia ?? null
    ]);
    y = tabelPdf(autoTable, doc, { kepala: kepalaUsia, isi: isiUsia, mulaiY: y });

    if (label.pendidikan?.length) {
      y = judulBagian(doc, 'Pendidikan terakhir per kecamatan', y);
      const p = sebaranLebar(wKec, label.pendidikan, (w) => [w.kecamatan], ['Kecamatan'], (a) => a.pendidikan);
      y = tabelPdf(autoTable, doc, {
        kepala: ['No', ...p.kepala],
        isi: p.isi.map((r, i) => [i + 1, ...r]),
        mulaiY: y
      });
    }
  }

  // Rincian kolom sensus: HANYA untuk lingkup yang sedang dipilih.
  //
  // Tanpa penyaring wilayah, tabel ini berisi ~80 kolom x 400-an desa dan
  // berjumlah puluhan ribu baris — ratusan halaman A4 yang tidak akan pernah
  // dibaca siapa pun. Yang dicetak adalah agregat lingkupnya; rincian per desa
  // ada di berkas Excel, dan halaman ini mengatakannya.
  const lingkupWilayah = filter.desa
    ? wDesa
    : filter.kecamatan
      ? wKec
      : null;

  y = judulBagian(doc, `Rincian kolom sensus — ${lingkup}`, y);
  if (lingkupWilayah && lingkupWilayah.length) {
    const isi = sensusPanjang(lingkupWilayah, data.kolom, () => []).map((r, i) => [i + 1, ...r]);
    y = tabelPdf(autoTable, doc, {
      kepala: ['No', 'Kategori', 'Pertanyaan', 'Kunci kolom', 'Jenis', 'Nilai', 'Keluarga', '%', 'Menjawab', 'Total'],
      isi,
      mulaiY: y
    });
  } else {
    // Se-kabupaten: definisi kolom sudah membawa hitungan kabupatennya sendiri.
    const isi = [];
    data.kolom.forEach((def, iKolom) => {
      if (def.jenis === 'angka') {
        isi.push([
          isi.length + 1,
          def.kategori_label,
          def.label,
          'Angka',
          `rata-rata ${def.statistik.rata_rata} · median ${def.statistik.median} · ${def.statistik.min}–${def.statistik.maks}`,
          def.terisi,
          null
        ]);
        return;
      }
      def.nilai.forEach((nilai, j) => {
        // Hitungan kabupaten per nilai tidak ikut di `kolom` (hanya labelnya),
        // jadi dijumlahkan dari deret per kecamatan — sumber yang sama dengan
        // yang dipakai lembar Excel, sehingga angkanya mustahil berbeda.
        const n = wKec.reduce((a, w) => a + (w.kolom[iKolom]?.n?.[j] || 0), 0);
        if (!n) return;
        isi.push([
          isi.length + 1,
          def.kategori_label,
          def.label,
          def.jenis === 'pilihan_ganda' ? 'Pilihan ganda' : 'Kategori',
          nilai,
          n,
          persenAngka(n, def.terisi)
        ]);
      });
    });
    y = tabelPdf(autoTable, doc, {
      kepala: ['No', 'Kategori', 'Pertanyaan', 'Jenis', 'Nilai', 'Keluarga', '% dari menjawab'],
      isi,
      mulaiY: y
    });
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text(
      'Rincian kolom sensus per kecamatan dan per desa ada di berkas Excel. Untuk mencetaknya di PDF, pilih satu kecamatan atau desa pada penyaring wilayah lebih dulu.',
      14,
      Math.min(y, doc.internal.pageSize.getHeight() - 14)
    );
    doc.setTextColor(0);
  }

  kakiHalaman(doc, cap);
  doc.save(`${namaBerkasBertanggal(`demografi-asta-desa-${lingkup}`, cap)}.pdf`);
};

// ── Data Sensus: penyusun baris ─────────────────────────────────────────────

const KEPALA_SENSUS = [
  'No',
  'ID',
  'Kepala keluarga',
  'NIK',
  'Nomor KK',
  'Kecamatan',
  'Desa/Kelurahan',
  'Tahap verifikasi',
  'Petugas',
  'Tanggal pendataan',
  'Jumlah anggota',
  'Lintang',
  'Bujur'
];

const barisSensus = (baris) =>
  baris.map((r, i) => [
    i + 1,
    r.id,
    r.kk_nama || '',
    r.kk_nik || '',
    r.kk_no_kk || '',
    r.kecamatan,
    r.desa,
    r.status,
    r.petugas || '',
    r.tanggal || '',
    r.jumlah_anggota ?? null,
    r.lat,
    r.lng
  ]);

/** Kalimat yang menerangkan penyaring mana yang sedang berlaku. */
const kalimatPenyaring = (filter = {}) => {
  const bagian = [];
  if (filter.search) bagian.push(`pencarian "${filter.search}"`);
  if (filter.kecamatan) bagian.push(`Kec. ${filter.kecamatan}`);
  if (filter.desa) bagian.push(`Desa ${filter.desa}`);
  if (filter.status) bagian.push(`tahap ${filter.status}`);
  if (filter.dari || filter.sampai) bagian.push(`${filter.dari || '…'} s.d. ${filter.sampai || '…'}`);
  return bagian.length ? bagian.join(' · ') : 'tanpa penyaring (seluruh kabupaten)';
};

// ── Data Sensus: Excel ──────────────────────────────────────────────────────

export const eksporSensusExcel = async (data) => {
  const XLSX = await import('xlsx');
  const buku = XLSX.utils.book_new();
  const cap = capEkspor();
  const f = data.filter || {};

  const ringkasan = [
    ['DATA SENSUS KELUARGA — ASTA DESA'],
    [INSTANSI],
    [],
    ['Penyaring', kalimatPenyaring(f)],
    ['Baris cocok', data.total_cocok],
    ['Baris pada berkas ini', data.total_terkirim],
    ['NIK & nomor KK', data.nomor_lengkap ? 'LENGKAP' : 'Disamarkan (6 digit pertama)'],
    [],
    ['DIEKSPOR TANGGAL', cap.tanggal],
    ['DIEKSPOR JAM', cap.jam],
    [],
    ['Kesegaran data'],
    ...barisKesegaran(data.kesiapan),
    ['Ringkas', kalimatKesiapan(data.kesiapan)]
  ];
  if (data.dibatasi) {
    ringkasan.push([], [
      'CATATAN',
      `Hanya ${angka(data.total_terkirim)} dari ${angka(data.total_cocok)} baris yang cocok ikut dalam berkas ini (batas ${angka(data.batas)} baris). ` +
        'Persempit penyaring wilayah, tahap, atau tanggal untuk mendapatkan sisanya.'
    ]);
  }
  tambahLembar(XLSX, buku, 'Ringkasan', ringkasan);

  tambahLembar(XLSX, buku, 'Data Sensus', [KEPALA_SENSUS, ...barisSensus(data.baris)]);

  const rekap = data.rekap || {};
  const lembarRekap = [
    ['Rekap Kecamatan', ['Kecamatan', 'Keluarga'], rekap.per_kecamatan],
    ['Rekap Desa', ['Kecamatan / Desa', 'Keluarga'], rekap.per_desa],
    ['Rekap Tahap', ['Tahap verifikasi', 'Keluarga'], rekap.per_status]
  ];
  lembarRekap.forEach(([nama, kepala, daftar]) => {
    if (!daftar?.length) return;
    tambahLembar(XLSX, buku, nama, [
      ['No', ...kepala, '% dari baris pada berkas'],
      ...daftar.map((d, i) => [i + 1, d.nama, d.total, persenAngka(d.total, data.total_terkirim)])
    ]);
  });
  if (rekap.per_hari?.length) {
    tambahLembar(XLSX, buku, 'Rekap Harian', [
      ['No', 'Tanggal', 'Keluarga didata'],
      ...rekap.per_hari.map((d, i) => [i + 1, d.hari, d.total])
    ]);
  }

  tandaiBuku(buku, 'Data Sensus Keluarga ASTA DESA', cap, data.kesiapan);
  XLSX.writeFile(buku, `${namaBerkasBertanggal('data-sensus-asta-desa', cap)}.xlsx`);
};

// ── Data Sensus: PDF ────────────────────────────────────────────────────────

export const eksporSensusPdf = async (data) => {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable')
  ]);
  const f = data.filter || {};
  const cap = capEkspor();
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  let y = kepalaDokumen(doc, {
    judul: 'Data Sensus Keluarga — ASTA DESA',
    subjudul: `${angka(data.total_cocok)} baris cocok · ${kalimatPenyaring(f)}`,
    catatan: kalimatKesiapan(data.kesiapan),
    cap
  });

  const rekap = data.rekap || {};
  if (rekap.per_kecamatan?.length) {
    y = judulBagian(doc, 'Rekap per kecamatan', y + 1);
    y = tabelPdf(autoTable, doc, {
      kepala: ['No', 'Kecamatan', 'Keluarga', '%'],
      isi: rekap.per_kecamatan.map((d, i) => [i + 1, d.nama, d.total, persenAngka(d.total, data.total_terkirim)]),
      mulaiY: y
    });
  }
  if (rekap.per_status?.length) {
    y = judulBagian(doc, 'Rekap per tahap verifikasi', y);
    y = tabelPdf(autoTable, doc, {
      kepala: ['No', 'Tahap verifikasi', 'Keluarga', '%'],
      isi: rekap.per_status.map((d, i) => [i + 1, d.nama, d.total, persenAngka(d.total, data.total_terkirim)]),
      mulaiY: y
    });
  }

  // Rincian baris dibatasi. Di atas beberapa ribu baris, PDF berhenti menjadi
  // dokumen dan menjadi berkas yang tidak bisa dibuka — sementara Excel memang
  // dibuat untuk itu, dan tombolnya ada di sebelahnya.
  const dirinci = data.baris.slice(0, BATAS_RINCIAN_PDF);
  y = judulBagian(
    doc,
    `Rincian baris${data.baris.length > dirinci.length ? ` (${angka(dirinci.length)} pertama dari ${angka(data.baris.length)})` : ''}`,
    y
  );
  tabelPdf(autoTable, doc, {
    // Koordinat tidak ikut di PDF: dua kolom angka panjang yang tidak pernah
    // dibaca di atas kertas, dan ia memakan ruang yang dibutuhkan nama desa.
    kepala: KEPALA_SENSUS.slice(0, 11),
    isi: barisSensus(dirinci).map((r) => r.slice(0, 11)),
    mulaiY: y
  });

  if (data.baris.length > dirinci.length) {
    const tinggi = doc.internal.pageSize.getHeight();
    doc.setFontSize(7.5);
    doc.setTextColor(120);
    doc.text(
      `Sisa ${angka(data.baris.length - dirinci.length)} baris tidak dicetak di PDF — gunakan tombol Excel untuk seluruh barisnya.`,
      14,
      tinggi - 8
    );
    doc.setTextColor(0);
  }

  kakiHalaman(doc, cap);
  doc.save(`${namaBerkasBertanggal('data-sensus-asta-desa', cap)}.pdf`);
};
