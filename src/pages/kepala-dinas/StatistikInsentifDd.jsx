import StatistikTahapanPage from '../../components/statistik/StatistikTahapanPage';
import { TrendingUp } from 'lucide-react';

const StatistikInsentifDd = () => (
  <StatistikTahapanPage
    title="Statistik Insentif DD"
    subtitle="Dana Desa"
    icon={TrendingUp}
    cacheKey="statistik-insentif-dd"
    endpoint="/insentif-dd/data"
    vpnEndpoint="/vpn-core/insentif-dd/data"
    exportSheetName="Statistik Insentif DD"
    exportFileName="Statistik_Insentif DD"
    valueLabel="Alokasi"
    showDetailTable
  />
);

export default StatistikInsentifDd;
