// Warna per lembaga — samakan dengan CapaianVerifikasiLembaga.jsx & ChartVerifikasiTahunan.jsx
export const WARNA_LEMBAGA = {
  rw: "#2563eb",
  rt: "#0891b2",
  posyandu: "#db2777",
  karangTaruna: "#f59e0b",
  lpm: "#7c3aed",
  pkk: "#16a34a",
};

export const persen = (verified, total) => (total > 0 ? Math.round((verified / total) * 100) : 0);

// Dua sudut pandang yang sama datanya: lembaga, atau pengurus aktif di lembaga itu.
export const MODE = {
  lembaga: { label: "Lembaga", satuan: "lembaga" },
  pengurus: { label: "Pengurus", satuan: "pengurus aktif" },
};

const NOL = { total: 0, verified: 0, ditolak: 0 };

// Satu pintu ambil angka capaian: key = jenis lembaga, tanpa key = total desa.
// Aman kalau respons lama (sebelum pengurus ikut dikirim) masih tersimpan di cache.
export const angkaCapaian = (d, mode, key) => {
  const pengurus = mode === "pengurus";
  const nilai = key ? (pengurus ? d.pengurus : d.lembaga)?.[key] : pengurus ? d.pengurus_totals : d;
  return nilai || NOL;
};
