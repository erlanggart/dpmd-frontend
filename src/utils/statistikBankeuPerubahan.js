// src/utils/statistikBankeuPerubahan.js
//
// Perhitungan statistik Bantuan Keuangan Perubahan yang dipakai BERSAMA oleh
// halaman SPKED (DpmdBankeuPerubahanVerificationPage) dan halaman dinas
// pelihat (DLH). Grafiknya pun sama (StatisticsTab & PartisipasiTab milik
// halaman SPKED), jadi angka di kedua halaman tidak bisa menyimpang.

export const KATEGORI_KEYS_PERUBAHAN = ['wajib', 'pilihan_infrastruktur', 'pilihan_non_infrastruktur'];

/** Desa sudah/belum mengajukan, per kecamatan. */
export const hitungPartisipasi = (allDesa = [], allKecamatan = [], trackingData = []) => {
  const submittedDesaIds = new Set(trackingData.filter(p => p.submitted_to_kecamatan).map(p => Number(p.desa_id)));
  const kecNameById = new Map(allKecamatan.map(k => [Number(k.id), k.nama]));
  const byKec = {};
  allKecamatan.forEach(k => { byKec[k.nama] = { sudah: [], belum: [] }; });
  allDesa.forEach(d => {
    const kecName = kecNameById.get(Number(d.kecamatan_id)) || 'Tanpa Kecamatan';
    if (!byKec[kecName]) byKec[kecName] = { sudah: [], belum: [] };
    (submittedDesaIds.has(Number(d.id)) ? byKec[kecName].sudah : byKec[kecName].belum).push(d.nama);
  });
  let totalSudah = 0, totalBelum = 0;
  // Statistik per-kecamatan (untuk grafik & identifikasi kecamatan yang tertinggal).
  const kecStats = Object.entries(byKec).map(([nama, v]) => {
    const sudah = v.sudah.length, belum = v.belum.length, total = sudah + belum;
    totalSudah += sudah; totalBelum += belum;
    return { nama, sudah, belum, total, pct: total ? Math.round((sudah / total) * 100) : 0 };
  });
  const total = totalSudah + totalBelum;
  const pct = total ? Math.round((totalSudah / total) * 100) : 0;
  const kecTuntas = kecStats.filter(k => k.total > 0 && k.belum === 0).length;
  return { byKec, totalSudah, totalBelum, total, pct, kecStats, kecTuntas, totalKec: kecStats.length };
};

/** Funnel lintas-tahap Desa → Kecamatan → DPMD → Selesai. */
export const hitungFunnel = (trackingData = []) => {
  const f = { total: trackingData.length, desa: 0, kecamatan: 0, dpmd: 0, selesai: 0 };
  trackingData.forEach(p => {
    // Revisi/penolakan kecamatan mengembalikan proposal ke desa (submitted_to_kecamatan=FALSE)
    // namun secara tahap masih milik Kecamatan — kenali via kecamatan_status agar tidak
    // salah dihitung sebagai "Masih di Desa".
    const kecReturned = !p.submitted_to_dpmd && ['revision', 'rejected'].includes(p.kecamatan_status);
    if (kecReturned) f.kecamatan += 1;
    else if (!p.submitted_to_kecamatan) f.desa += 1;
    else if (!p.submitted_to_dpmd) f.kecamatan += 1;
    else if (p.dpmd_status === 'approved') f.selesai += 1;
    else f.dpmd += 1;
  });
  return f;
};

export const hitungPerKategori = (trackingData = []) => {
  const out = {};
  KATEGORI_KEYS_PERUBAHAN.forEach(k => { out[k] = { count: 0, anggaran: 0 }; });
  trackingData.forEach(p => {
    if (!out[p.jenis_kegiatan]) return;
    out[p.jenis_kegiatan].count += 1;
    out[p.jenis_kegiatan].anggaran += Number(p.anggaran_usulan || 0);
  });
  return out;
};

export const hitungPerKecamatan = (trackingData = []) => {
  const map = new Map();
  trackingData.forEach(p => {
    const nama = p.kecamatan_nama || '-';
    const cur = map.get(nama) || { count: 0, anggaran: 0 };
    cur.count += 1; cur.anggaran += Number(p.anggaran_usulan || 0);
    map.set(nama, cur);
  });
  return Array.from(map.entries()).map(([nama, v]) => ({ nama, ...v })).sort((a, b) => b.count - a.count);
};

/**
 * Rekapitulasi anggaran per kegiatan (1 proposal = 1 kegiatan). Hanya proposal
 * yang SUDAH MASUK DPMD — pemanggil yang menyaringnya.
 */
export const hitungPerKegiatan = (proposalsDiDpmd = []) => {
  const map = new Map(); // id -> { id, nama, kategori, desaSet, proposalCount, anggaran }
  proposalsDiDpmd.forEach(p => {
    const primary = (p.kegiatan_list && p.kegiatan_list[0])
      ? { id: String(p.kegiatan_list[0].id), nama: p.kegiatan_list[0].nama_kegiatan, kategori: p.kegiatan_list[0].kategori || p.jenis_kegiatan }
      : (p.kegiatan_id ? { id: String(p.kegiatan_id), nama: p.kegiatan_nama, kategori: p.jenis_kegiatan } : null);
    if (!primary || !primary.id) return;
    if (!map.has(primary.id)) {
      map.set(primary.id, { id: primary.id, nama: primary.nama || '-', kategori: primary.kategori, desaSet: new Set(), proposalCount: 0, anggaran: 0 });
    }
    const e = map.get(primary.id);
    e.proposalCount += 1;
    e.anggaran += Number(p.anggaran_usulan || 0);
    if (p.desa_id != null) e.desaSet.add(Number(p.desa_id));
  });
  return Array.from(map.values())
    .map(e => ({ id: e.id, nama: e.nama, kategori: e.kategori, desaCount: e.desaSet.size, proposalCount: e.proposalCount, anggaran: e.anggaran }))
    .sort((a, b) => b.anggaran - a.anggaran);
};

/** Proposal yang sudah sampai DPMD — definisi sama dengan statistik DPMD. */
export const sudahDiDpmd = (p) => Boolean(p.submitted_to_dpmd || p.submitted_to_dpmd_at || p.dpmd_verified_at);

/**
 * Setara GET /dpmd/bankeu-perubahan/statistics (getStatistics di backend),
 * dihitung di klien untuk halaman yang tidak boleh memanggil endpoint DPMD.
 */
export const hitungStatsDpmd = (rows = []) => {
  const s = { total: 0, pending: 0, approved: 0, rejected: 0, revision: 0, total_anggaran: 0 };
  rows.filter(sudahDiDpmd).forEach(p => {
    s.total += 1;
    if (['pending', 'approved', 'rejected', 'revision'].includes(p.dpmd_status)) s[p.dpmd_status] += 1;
    s.total_anggaran += Number(p.anggaran_usulan || 0);
  });
  return s;
};
