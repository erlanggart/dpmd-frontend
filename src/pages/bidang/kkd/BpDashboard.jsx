// BP — Bantuan Provinsi. Live from SIPANDA, per Tahap.
import { Landmark } from 'lucide-react';
import PenyaluranDashboard from './PenyaluranDashboard';

export default function BpDashboard() {
  return (
    <PenyaluranDashboard
      sumberDana="BP"
      title="Bantuan Provinsi"
      short="BP"
      subtitle="Penyaluran Bantuan Provinsi (BP) per desa se-Kabupaten Bogor, dirinci per tahap."
      accent="rose"
      dimField="nm_tahap"
      dimLabel="Tahap"
      icon={Landmark}
    />
  );
}
