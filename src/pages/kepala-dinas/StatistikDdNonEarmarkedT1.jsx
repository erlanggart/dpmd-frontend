import StatistikTahapanPage from '../../components/statistik/StatistikTahapanPage';
import { TrendingUp } from 'lucide-react';

const StatistikDdNonEarmarkedT1 = () => (
  <StatistikTahapanPage
    title="Statistik DD Non-Earmarked Tahap 1"
    subtitle="Dana Desa"
    icon={TrendingUp}
    cacheKey="statistik-dd-nonearmarked-t1"
    endpoint="/dd-nonearmarked-t1/data"
    vpnEndpoint="/vpn-core/dd-nonearmarked-t1/data"
    exportSheetName="Statistik DD Non-Earmarked Tahap 1"
    exportFileName="Statistik_DD Non-Earmarked Tahap 1"
    valueLabel="Alokasi"
    showDetailTable
  />
);

export default StatistikDdNonEarmarkedT1;
