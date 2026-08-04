import StatistikTahapanPage from '../../components/statistik/StatistikTahapanPage';
import { Landmark } from 'lucide-react';

const StatistikBhprdT3 = () => (
  <StatistikTahapanPage
    title="Statistik BHPRD — Tahap 3"
    subtitle="Bagi Hasil Pajak & Retribusi Daerah"
    icon={Landmark}
    cacheKey="statistik-bhprd-t3"
    endpoint="/bhprd/data"
    vpnEndpoint="/vpn-core/bhprd-t3/data"
    exportSheetName="Statistik BHPRD"
    exportFileName="Statistik_BHPRD_Tahap_3"
    valueLabel="Realisasi"
    desaCount="unique"
    showCairBreakdown
  />
);

export default StatistikBhprdT3;
