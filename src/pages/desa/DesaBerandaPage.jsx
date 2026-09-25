// src/pages/desa/DesaBerandaPage.jsx
//
// Dashboard akun desa. Operator yang HANYA memegang fitur BUMDes (mis. hasil
// generate massal dari tab BUMDes) tidak berurusan dengan ringkasan modul desa
// lain, jadi dashboard-nya adalah Katalog Produk BUMDes se-kabupaten. Akun
// desa lain tetap melihat dashboard desa biasa.
import React, { lazy } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isOperatorBumdes } from '../../constants/desaPermissions';

const DesaDashboardPage = lazy(() => import('./DesaDashboardPage'));
const KatalogProdukBumdesPage = lazy(() => import('./bumdes/KatalogProdukBumdesPage'));

const DesaBerandaPage = () => {
	const { user } = useAuth();
	return isOperatorBumdes(user) ? <KatalogProdukBumdesPage /> : <DesaDashboardPage />;
};

export default DesaBerandaPage;
