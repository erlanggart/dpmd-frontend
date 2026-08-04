import StatistikTahapanPage from '../../components/statistik/StatistikTahapanPage';
import { Landmark } from 'lucide-react';

const StatistikBhprdT2 = () => (
  <StatistikTahapanPage
    title="Statistik BHPRD — Tahap 2"
    subtitle="Bagi Hasil Pajak & Retribusi Daerah"
    icon={Landmark}
    cacheKey="statistik-bhprd-t2"
    endpoint="/bhprd/data"
    vpnEndpoint="/vpn-core/bhprd-t2/data"
    exportSheetName="Statistik BHPRD"
    exportFileName="Statistik_BHPRD_Tahap_2"
    valueLabel="Realisasi"
    desaCount="unique"
    showCairBreakdown
  />
);

export default StatistikBhprdT2;
