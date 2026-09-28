// BUMDes di wilayah akun kecamatan — lihat saja.
//
// Memakai halaman Statistik BUMDes Core Dashboard apa adanya, hanya dengan
// lingkup kecamatan: server sudah menyaring barisnya, dan halaman itu otomatis
// menutup seluruh jalur tambah/ubah/kelola dokumen bila diberi lingkup.
import React from 'react';
import StatistikBumdes from '../../kepala-dinas/StatistikBumdes';

const LINGKUP_KECAMATAN = {
  endpoint: '/kecamatan/bumdes',
  cacheKey: 'kecamatan-bumdes-daftar',
  kicker: 'Akun Kecamatan',
  perDesa: true,
};

const KecamatanBumdesPage = () => <StatistikBumdes lingkup={LINGKUP_KECAMATAN} />;

export default KecamatanBumdesPage;
