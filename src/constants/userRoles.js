// src/constants/userRoles.js
// Nama tampil dan warna penanda tiap peran pengguna.
//
// Warna dipakai sebagai TITIK di samping label, bukan sebagai warna huruf atau
// latar gradien: nama peran harus tetap terbaca, dan halaman tidak perlu
// menjelma jadi pelangi hanya untuk membedakan dua belas peran.
export const ROLE_LABEL = {
	superadmin: 'Super Admin',
	kepala_dinas: 'Kepala Dinas',
	sekretaris_dinas: 'Sekretaris Dinas',
	kepala_bidang: 'Kepala Bidang',
	ketua_tim: 'Ketua Tim',
	bendahara: 'Bendahara',
	pegawai: 'Pegawai',
	admin_desa: 'Admin Desa',
	desa: 'Operator Desa',
	kecamatan: 'Admin Kecamatan',
	dinas_terkait: 'Dinas Terkait',
	verifikator_dinas: 'Verifikator Dinas',
	bpjs: 'BPJS',
};

export const ROLE_DOT = {
	superadmin: '#e34948',
	kepala_dinas: '#4a3aa7',
	sekretaris_dinas: '#2a78d6',
	kepala_bidang: '#1baf7a',
	ketua_tim: '#0891b2',
	bendahara: '#0ca30c',
	pegawai: '#898781',
	admin_desa: '#1baf7a',
	desa: '#65a30d',
	kecamatan: '#8b5cf6',
	dinas_terkait: '#eda100',
	verifikator_dinas: '#eb6834',
	bpjs: '#0d9488',
};

export const getRoleInfo = (role) => ({
	label: ROLE_LABEL[role] || role,
	dot: ROLE_DOT[role] || '#898781',
});
