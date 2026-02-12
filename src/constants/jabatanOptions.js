// Opsi jabatan untuk tim verifikasi
export const JABATAN_OPTIONS = [
  { value: 'ketua', label: 'Ketua Tim', color: 'red' },
  { value: 'sekretaris', label: 'Sekretaris', color: 'blue' },
  { value: 'anggota', label: 'Anggota', color: 'green' }
];

export const getJabatanLabel = (jabatan) => {
  const option = JABATAN_OPTIONS.find(opt => opt.value === jabatan);
  return option ? option.label : jabatan;
};

export const getJabatanColor = (jabatan) => {
  const option = JABATAN_OPTIONS.find(opt => opt.value === jabatan);
  return option ? option.color : 'gray';
};

export const getJabatanBgColor = (jabatan) => {
  const color = getJabatanColor(jabatan);
  const colorMap = {
    red: 'bg-red-100 text-red-700',
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    gray: 'bg-gray-100 text-gray-700'
  };
  return colorMap[color] || colorMap.gray;
};
