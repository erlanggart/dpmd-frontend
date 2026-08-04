import StatistikTahapanPage from '../../components/statistik/StatistikTahapanPage';
import { TrendingUp } from 'lucide-react';

const StatistikDdEarmarkedT1 = () => (
  <StatistikTahapanPage
    title="Statistik DD Earmarked Tahap 1"
    subtitle="Dana Desa"
    icon={TrendingUp}
    cacheKey="statistik-dd-earmarked-t1"
    endpoint="/dd-earmarked-t1/data"
    vpnEndpoint="/vpn-core/dd-earmarked-t1/data"
    exportSheetName="Statistik DD Earmarked Tahap 1"
    exportFileName="Statistik_DD Earmarked Tahap 1"
    valueLabel="Alokasi"
    showDetailTable
  />
);

export default StatistikDdEarmarkedT1;
