// Ekspor Excel Rekap Pegawai dengan konsep yang sama seperti PDF-nya: pita judul, dua
// grafik, lalu tabel kalender berwarna. Dipakai exceljs, bukan xlsx: xlsx versi komunitas
// tidak menulis warna maupun gambar. Dimuat malas karena hanya perlu saat tombol ditekan.

const WARNA = {
  pita: "FFC2410C", aksen: "FFF59E0B", pitaLembut: "FFFFEDD5", putih: "FFFFFFFF",
  garis: "FFE2E8F0", selang: "FFF8FAFC", teks: "FF334155", kosong: "FFCBD5E1",
  tepat: "FF047857", telat: "FFDC2626", masuk: "FF059669", tidak: "FFD97706",
  kakiLatar: "FFFFF7ED", kakiTeks: "FF9A3412", catatan: "FF94A3B8",
};
const isi = (argb) => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const garis = { style: "thin", color: { argb: WARNA.garis } };
const bingkai = { top: garis, left: garis, bottom: garis, right: garis };

const LEBAR_NAMA = 30;
const LEBAR_HARI = 7;
const LEBAR_TOTAL = 8;
const BARIS_GRAFIK = 12;
const TINGGI_BARIS_GRAFIK = 20;
// lebar kolom Excel dalam karakter -> piksel, untuk menaruh gambar selebar tabel
const kePiksel = (karakter) => karakter * 7 + 5;

const pitaJudul = (ws, kolomAkhir, { judul, periode, dicetak }) => {
  const tengah = Math.max(2, Math.ceil(kolomAkhir * 0.6));
  ws.getRow(1).height = 6;
  for (let c = 1; c <= kolomAkhir; c++) ws.getCell(1, c).fill = isi(WARNA.aksen);
  [2, 3].forEach((r) => {
    ws.getRow(r).height = r === 2 ? 26 : 20;
    for (let c = 1; c <= kolomAkhir; c++) ws.getCell(r, c).fill = isi(WARNA.pita);
    ws.mergeCells(r, 1, r, tengah);
    ws.mergeCells(r, tengah + 1, r, kolomAkhir);
  });
  const tulis = (r, c, value, font, horizontal) => {
    const sel = ws.getCell(r, c);
    sel.value = value;
    sel.font = font;
    sel.alignment = { vertical: "middle", horizontal, indent: 1 };
  };
  tulis(2, 1, judul, { bold: true, size: 14, color: { argb: WARNA.putih } }, "left");
  tulis(3, 1, "Dinas Pemberdayaan Masyarakat dan Desa", { size: 9, color: { argb: WARNA.pitaLembut } }, "left");
  tulis(2, tengah + 1, `Periode: ${periode}`, { bold: true, size: 9, color: { argb: WARNA.putih } }, "right");
  tulis(3, tengah + 1, `Dicetak: ${dicetak}`, { size: 8, color: { argb: WARNA.pitaLembut } }, "right");
};

/** Lembar utama: tampilannya mengikuti halaman PDF. */
const lembarKalender = (wb, { periode, dicetak, hari, baris, total, grafik }) => {
  const kolomAkhir = hari.length + 3;
  const ws = wb.addWorksheet("Rekap Absensi", {
    views: [{ state: "frozen", xSplit: 1, showGridLines: false }],
    pageSetup: {
      paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      margins: { left: 0.3, right: 0.3, top: 0.3, bottom: 0.45, header: 0.1, footer: 0.2 },
    },
  });
  ws.headerFooter.oddFooter = "&L&8Dinas Pemberdayaan Masyarakat dan Desa&R&8Halaman &P";
  ws.columns = [
    { width: LEBAR_NAMA },
    ...hari.map(() => ({ width: LEBAR_HARI })),
    { width: LEBAR_TOTAL },
    { width: LEBAR_TOTAL },
  ];
  pitaJudul(ws, kolomAkhir, { judul: "REKAP ABSENSI PEGAWAI", periode, dicetak });

  // baris 4 pemisah, lalu ruang grafik; tanpa grafik tabel langsung naik
  const adaGrafik = grafik.trendImg || grafik.doughImg;
  const barisTabel = adaGrafik ? 5 + BARIS_GRAFIK + 1 : 5;
  if (adaGrafik) {
    for (let r = 5; r < 5 + BARIS_GRAFIK; r++) ws.getRow(r).height = TINGGI_BARIS_GRAFIK;
    const lebarTabel = kePiksel(LEBAR_NAMA) + hari.length * kePiksel(LEBAR_HARI) + 2 * kePiksel(LEBAR_TOTAL);
    const tinggi = BARIS_GRAFIK * TINGGI_BARIS_GRAFIK * (4 / 3);
    const taruh = (dataUrl, kolom, lebar) => {
      const id = wb.addImage({ base64: dataUrl, extension: "png" });
      ws.addImage(id, { tl: { col: kolom, row: 4 }, ext: { width: lebar, height: tinggi } });
    };
    if (grafik.trendImg) taruh(grafik.trendImg, 0, lebarTabel * 0.62);
    if (grafik.doughImg) {
      // kolom pertama sesudah 64% lebar tabel; lebarnya dihitung dari situ supaya rata tepi kanan tabel
      const kolom = 1 + Math.ceil(Math.max(0, (lebarTabel * 0.64 - kePiksel(LEBAR_NAMA)) / kePiksel(LEBAR_HARI)));
      taruh(grafik.doughImg, kolom, lebarTabel - kePiksel(LEBAR_NAMA) - (kolom - 1) * kePiksel(LEBAR_HARI));
    }
  }

  const kepala = ws.getRow(barisTabel);
  kepala.values = ["Nama Pegawai", ...hari.map((d) => d.kepala), "Masuk", "Tdk\nMasuk"];
  kepala.height = 30;
  kepala.eachCell({ includeEmpty: true }, (sel, c) => {
    sel.fill = isi(WARNA.pita);
    sel.font = { bold: true, size: 9, color: { argb: WARNA.putih } };
    sel.alignment = { vertical: "middle", horizontal: c === 1 ? "left" : "center", wrapText: true, indent: c === 1 ? 1 : 0 };
    sel.border = bingkai;
  });
  ws.pageSetup.printTitlesRow = `${barisTabel}:${barisTabel}`;

  baris.forEach((b, i) => {
    const row = ws.getRow(barisTabel + 1 + i);
    row.values = [b.nama, ...b.sel.map((s) => s.teks), b.masuk, b.tidakMasuk];
    row.height = 30;
    row.eachCell({ includeEmpty: true }, (sel, c) => {
      sel.border = bingkai;
      if (i % 2) sel.fill = isi(WARNA.selang);
      sel.alignment = { vertical: "middle", horizontal: c === 1 ? "left" : "center", wrapText: true, indent: c === 1 ? 1 : 0 };
      sel.font = { size: 8, color: { argb: WARNA.teks } };
      if (c === 1) sel.font = { size: 9, bold: true, color: { argb: WARNA.teks } };
      else if (c <= hari.length + 1) {
        const s = b.sel[c - 2];
        const argb = s.teks === "-" ? WARNA.kosong : s.telat ? WARNA.telat : WARNA.tepat;
        sel.font = { size: 8, bold: s.teks !== "-", color: { argb } };
      } else sel.font = { size: 10, bold: true, color: { argb: c === hari.length + 2 ? WARNA.masuk : WARNA.tidak } };
    });
  });

  const kaki = ws.getRow(barisTabel + 1 + baris.length);
  kaki.values = ["TOTAL", ...hari.map(() => ""), total.masuk, total.tidakMasuk];
  kaki.height = 22;
  kaki.eachCell({ includeEmpty: true }, (sel, c) => {
    sel.fill = isi(WARNA.kakiLatar);
    sel.font = { bold: true, size: 10, color: { argb: WARNA.kakiTeks } };
    sel.alignment = { vertical: "middle", horizontal: c === 1 ? "left" : "center", indent: c === 1 ? 1 : 0 };
    sel.border = bingkai;
  });

  const nomorCatatan = barisTabel + baris.length + 3;
  ws.mergeCells(nomorCatatan, 1, nomorCatatan, kolomAkhir);
  const catatan = ws.getCell(nomorCatatan, 1);
  catatan.value = "Format jam: baris atas = jam masuk, baris bawah = jam pulang. Jam merah menandakan terlambat.";
  catatan.font = { size: 8, italic: true, color: { argb: WARNA.catatan } };
};

/** Lembar kedua: daftar yang bisa disaring dan diurutkan, memuat NIP & jabatan yang tidak muat di kalender. */
const lembarRingkasan = (wb, { periode, dicetak, baris, total }) => {
  const ws = wb.addWorksheet("Ringkasan Pegawai", {
    views: [{ showGridLines: false }],
    pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });
  const kolom = [["No", 5], ["Nama Pegawai", 32], ["NIP", 22], ["Jabatan", 26], ["Masuk", 9], ["Tidak Masuk", 9], ["Telat", 8], ["Total", 8]];
  ws.columns = kolom.map(([, width]) => ({ width }));
  pitaJudul(ws, kolom.length, { judul: "RINGKASAN ABSENSI PEGAWAI", periode, dicetak });

  const barisKepala = 5;
  const kepala = ws.getRow(barisKepala);
  kepala.values = kolom.map(([nama]) => nama);
  kepala.height = 30;
  kepala.eachCell((sel, c) => {
    sel.fill = isi(WARNA.pita);
    sel.font = { bold: true, size: 9, color: { argb: WARNA.putih } };
    sel.alignment = { vertical: "middle", horizontal: c === 2 || c === 4 ? "left" : "center", wrapText: true };
    sel.border = bingkai;
  });
  baris.forEach((b, i) => {
    const row = ws.getRow(barisKepala + 1 + i);
    row.values = [i + 1, b.nama, b.nip, b.jabatan, b.masuk, b.tidakMasuk, b.telat, b.totalCatatan];
    row.height = 20;
    row.eachCell({ includeEmpty: true }, (sel, c) => {
      sel.border = bingkai;
      if (i % 2) sel.fill = isi(WARNA.selang);
      sel.font = { size: 9, color: { argb: WARNA.teks }, bold: c === 2 };
      sel.alignment = { vertical: "middle", horizontal: c === 2 || c === 4 ? "left" : "center" };
      if (c === 5) sel.font = { size: 9, bold: true, color: { argb: WARNA.masuk } };
      if (c === 6) sel.font = { size: 9, bold: true, color: { argb: WARNA.tidak } };
      if (c === 7 && b.telat > 0) sel.font = { size: 9, bold: true, color: { argb: WARNA.telat } };
    });
  });
  const kaki = ws.getRow(barisKepala + 1 + baris.length);
  kaki.values = ["", "TOTAL", "", "", total.masuk, total.tidakMasuk, total.telat, total.catatan];
  kaki.eachCell({ includeEmpty: true }, (sel, c) => {
    sel.fill = isi(WARNA.kakiLatar);
    sel.font = { bold: true, size: 9, color: { argb: WARNA.kakiTeks } };
    sel.alignment = { vertical: "middle", horizontal: c === 2 ? "left" : "center" };
    sel.border = bingkai;
  });
  ws.autoFilter = { from: { row: barisKepala, column: 1 }, to: { row: barisKepala, column: kolom.length } };
};

/**
 * @param data { periode, dicetak, hari: [{ kepala }], grafik: { trendImg, doughImg },
 *   baris: [{ nama, nip, jabatan, sel: [{ teks, telat }], masuk, tidakMasuk, telat, totalCatatan }],
 *   total: { masuk, tidakMasuk, telat, catatan } }
 * @returns nama berkas yang diunduh
 */
export async function eksporRekapExcel(data) {
  const modul = await import("exceljs");
  const ExcelJS = modul.default ?? modul;
  const wb = new ExcelJS.Workbook();
  wb.creator = "DPMD Kabupaten Bogor";
  lembarKalender(wb, data);
  lembarRingkasan(wb, data);

  const buffer = await wb.xlsx.writeBuffer();
  const namaBerkas = `Rekap_Absensi_${String(data.periode).replace(/\s+/g, "_")}.xlsx`;
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = namaBerkas;
  a.click();
  URL.revokeObjectURL(url);
  return namaBerkas;
}
