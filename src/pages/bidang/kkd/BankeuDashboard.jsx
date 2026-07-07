// BANKEU Infrastruktur Desa — Bantuan Keuangan. Live from SIPANDA, per Tahap.
import { Building2 } from 'lucide-react';
import PenyaluranDashboard from './PenyaluranDashboard';

export default function BankeuDashboard() {
  return (
    <PenyaluranDashboard
      sumberDana="BANKEU INFRAS DESA"
      title="Bantuan Keuangan Infrastruktur Desa"
      short="BANKEU"
      subtitle="Penyaluran Bantuan Keuangan Infrastruktur Desa per desa, dirinci per tahap."
      accent="amber"
      dimField="nm_tahap"
      dimLabel="Tahap"
      icon={Building2}
    />
  );
}
