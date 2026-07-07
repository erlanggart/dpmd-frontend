// DD — Dana Desa (Reguler). Live from SIPANDA, per Tahap.
import { TrendingUp } from 'lucide-react';
import PenyaluranDashboard from '../PenyaluranDashboard';

export default function DdDashboard() {
  return (
    <PenyaluranDashboard
      sumberDana="DD REGULER"
      title="Dana Desa"
      short="DD"
      subtitle="Penyaluran & realisasi Dana Desa (APBN) per desa, dirinci per tahap."
      accent="violet"
      dimField="nm_tahap"
      dimLabel="Tahap"
      icon={TrendingUp}
    />
  );
}
