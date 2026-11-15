import ProdukHukumDetailPage from '../../bidang/pemdes/ProdukHukumDetailPage';
import { useDesaPermissions } from '../../../hooks/useDesaPermissions';

const ProdukHukumDetail = () => {
	const { hasPermission } = useDesaPermissions();
	const kelola = hasPermission('produk-hukum');
	return (
		<ProdukHukumDetailPage
			apiPrefix="/produk-hukum"
			editable={kelola}
			backPath={kelola ? '/desa/produk-hukum' : undefined}
			basisRute="/desa"
			bolehKelembagaan={hasPermission('kelembagaan')}
		/>
	);
};

export default ProdukHukumDetail;
