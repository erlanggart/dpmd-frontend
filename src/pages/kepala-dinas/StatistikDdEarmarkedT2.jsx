import StatistikTahapanPage from '../../components/statistik/StatistikTahapanPage';
import { TrendingUp } from 'lucide-react';

const StatistikDdEarmarkedT2 = () => (
  <StatistikTahapanPage
    title="Statistik DD Earmarked Tahap 2"
    subtitle="Dana Desa"
    icon={TrendingUp}
    cacheKey="statistik-dd-earmarked-t2"
    endpoint="/dd-earmarked-t2/data"
    vpnEndpoint="/vpn-core/dd-earmarked-t2/data"
    exportSheetName="Statistik DD Earmarked Tahap 2"
    exportFileName="Statistik_DD Earmarked Tahap 2"
    valueLabel="Alokasi"
    showDetailTable
  />
);

export default StatistikDdEarmarkedT2;
