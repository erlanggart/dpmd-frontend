// BHPRD — Bagi Hasil Pajak & Retribusi Daerah. Live from SIPANDA, per Tahap.
import { FileCheck } from 'lucide-react';
import PenyaluranDashboard from './PenyaluranDashboard';

export default function BhprdDashboard(props) {
  return (
    <PenyaluranDashboard
      {...props}
      sumberDana="BHPRD"
      title="Bagi Hasil Pajak & Retribusi Daerah"
      short="BHPRD"
      subtitle="Penyaluran BHPRD per desa se-Kabupaten Bogor, dirinci per tahap."
      accent="blue"
      dimField="nm_tahap"
      dimLabel="Tahap"
      icon={FileCheck}
    />
  );
}
