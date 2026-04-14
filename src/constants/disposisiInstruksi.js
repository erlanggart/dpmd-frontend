/**
 * Daftar instruksi disposisi sesuai aturan kantor DPMD Kab. Bogor
 */
export const INSTRUKSI_OPTIONS = [
  { value: 'pedomani', label: 'Pedomani' },
  { value: 'tindaklanjuti', label: 'Tindaklanjuti/Proses Sesuai Ketentuan' },
  { value: 'fasilitasi', label: 'Fasilitasi' },
  { value: 'wakili', label: 'Wakili' },
  { value: 'hadiri_tugaskan', label: 'Hadiri/Tugaskan' },
  { value: 'tugaskan_staff', label: 'Tugaskan Staff' },
  { value: 'jadwalkan', label: 'Jadwalkan' },
  { value: 'catat_ingatkan', label: 'Catat/Ingatkan' },
  { value: 'klarifikasi', label: 'Klarifikasi' },
  { value: 'menghadapi_jelaskan', label: 'Menghadapi/Jelaskan' },
  { value: 'laksanakan', label: 'Laksanakan' },
  { value: 'ikuti_monitor', label: 'Ikuti/Monitor' },
  { value: 'kaji_pelajari', label: 'Kaji/Pelajari' },
  { value: 'koordinasikan', label: 'Koordinasikan Lebih Lanjut' },
  { value: 'siapkan_bahan', label: 'Siapkan Bahan/Materi' },
  { value: 'sikapi', label: 'Sikapi' },
  { value: 'persiapkan', label: 'Persiapkan' },
  { value: 'udk', label: 'UDK' },
  { value: 'ump', label: 'UMP' },
  { value: 'perhatikan_limit_waktu', label: 'Perhatikan Limit Waktu' },
  { value: 'monitor_hasilnya', label: 'Monitor Hasilnya' },
  { value: 'lapor_hasilnya', label: 'Lapor Hasilnya' },
];

export const INSTRUKSI_BADGES = {
  pedomani: { bg: 'bg-blue-100', text: 'text-blue-700' },
  tindaklanjuti: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  fasilitasi: { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  wakili: { bg: 'bg-purple-100', text: 'text-purple-700' },
  hadiri_tugaskan: { bg: 'bg-orange-100', text: 'text-orange-700' },
  tugaskan_staff: { bg: 'bg-amber-100', text: 'text-amber-700' },
  jadwalkan: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  catat_ingatkan: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  klarifikasi: { bg: 'bg-rose-100', text: 'text-rose-700' },
  menghadapi_jelaskan: { bg: 'bg-pink-100', text: 'text-pink-700' },
  laksanakan: { bg: 'bg-green-100', text: 'text-green-700' },
  ikuti_monitor: { bg: 'bg-sky-100', text: 'text-sky-700' },
  kaji_pelajari: { bg: 'bg-violet-100', text: 'text-violet-700' },
  koordinasikan: { bg: 'bg-teal-100', text: 'text-teal-700' },
  siapkan_bahan: { bg: 'bg-lime-100', text: 'text-lime-700' },
  sikapi: { bg: 'bg-red-100', text: 'text-red-700' },
  persiapkan: { bg: 'bg-fuchsia-100', text: 'text-fuchsia-700' },
  udk: { bg: 'bg-slate-100', text: 'text-slate-700' },
  ump: { bg: 'bg-stone-100', text: 'text-stone-700' },
  perhatikan_limit_waktu: { bg: 'bg-orange-100', text: 'text-orange-800' },
  monitor_hasilnya: { bg: 'bg-blue-100', text: 'text-blue-800' },
  lapor_hasilnya: { bg: 'bg-indigo-100', text: 'text-indigo-800' },
};

const safeParseInstruksi = (value) => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [value];
  } catch(e) {
    return value.includes(',') ? value.split(',').map(s=>s.trim()) : [value];
  }
};

export const getInstruksiLabel = (value) => {
  const arr = safeParseInstruksi(value);
  if (arr.length === 0) return '-';
  const labels = arr.map(v => {
    const opt = INSTRUKSI_OPTIONS.find(o => o.value === v);
    return opt ? opt.label : (v || '-').replace(/_/g, ' ');
  });
  return labels.join(' • ');
};

export const getInstruksiBadgeClass = (value) => {
  const arr = safeParseInstruksi(value);
  const first = arr[0] || 'laksanakan';
  return INSTRUKSI_BADGES[first] || { bg: 'bg-gray-100', text: 'text-gray-700' };
};
