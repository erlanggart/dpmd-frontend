// ADD — Alokasi Dana Desa. Live from SIPANDA, bulanan (Jan–Des).
import { DollarSign } from 'lucide-react';
import PenyaluranDashboard from '../PenyaluranDashboard';

export default function AddDashboard(props) {
  return (
    <PenyaluranDashboard
      {...props}
      sumberDana="ADD"
      title="Alokasi Dana Desa"
      short="ADD"
      subtitle="Penyaluran & pencairan ADD per desa se-Kabupaten Bogor, dirinci per bulan."
      accent="emerald"
      dimField="periode"
      dimLabel="Bulan"
      icon={DollarSign}
    />
  );
}
