import StatistikTahapanPage from '../../components/statistik/StatistikTahapanPage';
import { Landmark } from 'lucide-react';

const StatistikBhprdT1 = () => (
  <StatistikTahapanPage
    title="Statistik BHPRD — Tahap 1"
    subtitle="Bagi Hasil Pajak & Retribusi Daerah"
    icon={Landmark}
    cacheKey="statistik-bhprd-t1"
    endpoint="/bhprd-t1/data"
    vpnEndpoint="/vpn-core/bhprd-t1/data"
    exportSheetName="Statistik BHPRD"
    exportFileName="Statistik_BHPRD_Tahap_1"
    valueLabel="Realisasi"
    desaCount="unique"
    showCairBreakdown
  />
);

export default StatistikBhprdT1;
