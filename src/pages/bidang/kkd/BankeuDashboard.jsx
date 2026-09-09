// BANKEU — Bantuan Keuangan Desa. Live from SIPANDA, per Tahap.
//
// Sumber dananya DICOCOKKAN LEWAT AWALAN, bukan nama persis. Di SIPANDA pos ini
// berganti nama antar tahun anggaran: sebelumnya "BANKEU INFRAS DESA", pada 2026
// menjadi "BANKEU AKSELERASI PEDESAAN". Nama persis yang dipatok di kode membuat
// halaman ini tampil rapi tetapi kosong sama sekali — tanpa galat, tanpa
// peringatan, cuma angka nol di semua tempat.
import { Building2 } from 'lucide-react';
import PenyaluranDashboard from './PenyaluranDashboard';

export default function BankeuDashboard(props) {
  return (
    <PenyaluranDashboard
      {...props}
      sumberDana="BANKEU"
      cocokSumber={(s) => s.toUpperCase().startsWith('BANKEU')}
      title="Bantuan Keuangan Desa"
      short="BANKEU"
      subtitle="Penyaluran Bantuan Keuangan Desa per desa se-Kabupaten Bogor, dirinci per tahap."
      accent="amber"
      dimField="nm_tahap"
      dimLabel="Tahap"
      icon={Building2}
    />
  );
}
