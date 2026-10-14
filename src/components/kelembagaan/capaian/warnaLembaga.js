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
