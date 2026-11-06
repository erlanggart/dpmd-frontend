// Warna & label peran, dipakai sidebar user online dan monitornya.
export const ROLE_COLORS = {
  superadmin: 'bg-rose-100 text-rose-700',
  kepala_dinas: 'bg-blue-100 text-blue-700',
  sekretaris_dinas: 'bg-indigo-100 text-indigo-700',
  kepala_bidang: 'bg-emerald-100 text-emerald-700',
  ketua_tim: 'bg-teal-100 text-teal-700',
  pegawai: 'bg-slate-100 text-slate-700',
  desa: 'bg-green-100 text-green-700',
  kecamatan: 'bg-violet-100 text-violet-700',
  dinas_terkait: 'bg-amber-100 text-amber-700',
  verifikator_dinas: 'bg-orange-100 text-orange-700',
};

export const ROLE_LABELS = {
  superadmin: 'Super Admin',
  kepala_dinas: 'Kepala Dinas',
  sekretaris_dinas: 'Sekretaris',
  kepala_bidang: 'Kabid',
  ketua_tim: 'Ketua Tim',
  pegawai: 'Pegawai',
  desa: 'Desa',
  kecamatan: 'Kecamatan',
  dinas_terkait: 'Dinas',
  verifikator_dinas: 'Verifikator',
};

export const timeAgo = (dateStr) => {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m lalu`;
  const diffHour = Math.floor(diffMin / 60);
  return `${diffHour}j lalu`;
};
