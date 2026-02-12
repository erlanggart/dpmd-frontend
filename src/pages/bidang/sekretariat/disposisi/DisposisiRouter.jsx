// src/pages/bidang/sekretariat/disposisi/DisposisiRouter.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SuratMasuk from './SuratMasuk';
import KepalaDinas from './KepalaDinas';
import SekretarisDinas from './SekretarisDinas';
import KepalaBidang from './KepalaBidang';
import DashboardSekretaris from './DashboardSekretaris';
import DashboardKepala from './DashboardKepala';
import './disposisi.css';

/**
 * DisposisiRouter - Smart router for disposisi based on user role
 * Digunakan khusus untuk bidang sekretariat
 */
const DisposisiRouter = () => {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = () => {
    try {
      // Get user from localStorage
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const role = userData.role;
      const bidangId = userData.bidang_id;
      
      console.log('[DisposisiRouter] User data:', { role, bidangId, name: userData.name });
      
      if (!role) {
        navigate('/');
        return;
      }

      setUserRole(role);
      setLoading(false);
    } catch (error) {
      console.error('Error checking user role:', error);
      navigate('/');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  // Route based on role
  switch (userRole) {
    case 'kepala_dinas':
      return <KepalaDinas />;
    
    case 'sekretaris_dinas':
      return <SekretarisDinas />;
    
    case 'kepala_bidang':
      return <KepalaBidang />;
    
    case 'pegawai':
      // Pegawai sekretariat (bidang_id = 2) bisa input surat masuk
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      const bidangId = userData.bidang_id;
      
      if (bidangId && parseInt(bidangId) === 2) {
        console.log('[DisposisiRouter] Pegawai Sekretariat - showing SuratMasuk');
        return <SuratMasuk />;
      } else {
        // Pegawai dari bidang lain tidak punya akses
        return (
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Akses Ditolak</h2>
              <p className="text-gray-600 mb-4">Hanya pegawai sekretariat yang dapat mengakses disposisi</p>
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Kembali
              </button>
            </div>
          </div>
        );
      }
    
    case 'superadmin':
      // Superadmin dapat akses penuh, default ke dashboard sekretaris
      return <DashboardSekretaris />;
    
    default:
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Akses Ditolak</h2>
            <p className="text-gray-600 mb-4">Anda tidak memiliki akses ke halaman ini</p>
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Kembali
            </button>
          </div>
        </div>
      );
  }
};

export default DisposisiRouter;
