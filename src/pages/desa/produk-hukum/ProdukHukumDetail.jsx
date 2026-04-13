import ProdukHukumDetailPage from '../../bidang/pemdes/ProdukHukumDetailPage';

const ProdukHukumDetail = () => {
	return (
		<ProdukHukumDetailPage
			apiPrefix="/produk-hukum"
			editable={true}
			backPath="/desa/produk-hukum"
		/>
	);
};

export default ProdukHukumDetail;
