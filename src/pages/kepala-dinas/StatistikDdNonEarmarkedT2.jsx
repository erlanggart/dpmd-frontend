import StatistikTahapanPage from '../../components/statistik/StatistikTahapanPage';
import { TrendingUp } from 'lucide-react';

const StatistikDdNonEarmarkedT2 = () => (
  <StatistikTahapanPage
    title="Statistik DD Non-Earmarked Tahap 2"
    subtitle="Dana Desa"
    icon={TrendingUp}
    cacheKey="statistik-dd-nonearmarked-t2"
    endpoint="/dd-nonearmarked-t2/data"
    vpnEndpoint="/vpn-core/dd-nonearmarked-t2/data"
    exportSheetName="Statistik DD Non-Earmarked Tahap 2"
    exportFileName="Statistik_DD Non-Earmarked Tahap 2"
    valueLabel="Alokasi"
    showDetailTable
  />
);

export default StatistikDdNonEarmarkedT2;
