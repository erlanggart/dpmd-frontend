import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SuratMasuk from './SuratMasuk';
import KepalaDinas from './KepalaDinas';
import SekretarisDinas from './SekretarisDinas';
import KepalaBidang from './KepalaBidang';
import './disposisi.css';

const DisposisiPersuratan = () => {
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUserRole();
  }, []);

  const fetchUserRole = async () => {
    try {
      // Ambil role user dari API atau localStorage
      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/');
        return;
      }

      // Bisa dari API call atau dari decoded token
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUserRole(userData.role);
        
        // Redirect otomatis ke dashboard role-specific
        switch (userData.role) {
          case 'kepala_dinas':
            navigate('/kepala-dinas/disposisi', { replace: true });
            break;
          case 'sekretaris_dinas':
            navigate('/sekretaris-dinas/disposisi', { replace: true });
            break;
          case 'kepala_bidang':
          case 'kepala_bidang_pemerintahan':
          case 'kepala_bidang_kesra':
          case 'kepala_bidang_ekonomi':
          case 'kepala_bidang_fisik':
            navigate('/kepala-bidang/disposisi', { replace: true });
            break;
          case 'ketua_tim':
            navigate('/ketua-tim/disposisi', { replace: true });
            break;
          case 'pegawai':
            navigate('/pegawai/disposisi', { replace: true });
            break;
          default:
            // Untuk staff sekretariat atau role lain yang bisa input surat
            navigate('/sekretariat/disposisi', { replace: true });
            break;
        }
      } else {
        // Fallback ke localStorage atau role default
        const userDataStr = localStorage.getItem('userData');
        if (userDataStr) {
          const userData = JSON.parse(userDataStr);
          setUserRole(userData.role || 'staff');
        } else {
          setUserRole('staff');
        }
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      // Fallback ke role default
      setUserRole('staff');
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    // Tampilkan komponen berdasarkan role
    switch (userRole) {
      case 'kepala_dinas':
        return <KepalaDinas />;
      case 'sekretaris_dinas':
        return <SekretarisDinas />;
      case 'kepala_bidang_pemerintahan':
      case 'kepala_bidang_kesra':
      case 'kepala_bidang_ekonomi':
      case 'kepala_bidang_fisik':
        return <KepalaBidang />;
      case 'staff':
      default:
        return <SuratMasuk />;
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Memuat dashboard...</p>
      </div>
    );
  }

  return (
    <div className="disposisi-container">
      {/* Header */}
      <div className="disposisi-header">
        <h2 className="disposisi-title">
          <i className="fas fa-file-alt"></i>
          Disposisi Persuratan
        </h2>
        <p className="disposisi-subtitle">
          Sistem manajemen disposisi surat masuk - {getRoleDisplay(userRole)}
        </p>
      </div>

      {/* Content */}
      <div className="disposisi-content">
        {renderContent()}
      </div>
    </div>
  );
};

const getRoleDisplay = (role) => {
  switch (role) {
    case 'kepala_dinas':
      return 'Dashboard Kepala Dinas';
    case 'sekretaris_dinas':
      return 'Dashboard Sekretaris Dinas';
    case 'kepala_bidang_pemerintahan':
      return 'Dashboard Kepala Bidang Pemerintahan';
    case 'kepala_bidang_kesra':
      return 'Dashboard Kepala Bidang Kesejahteraan Rakyat';
    case 'kepala_bidang_ekonomi':
      return 'Dashboard Kepala Bidang Ekonomi';
    case 'kepala_bidang_fisik':
      return 'Dashboard Kepala Bidang Fisik dan Prasarana';
    case 'staff':
    default:
      return 'Input Surat Masuk';
  }
};

export default DisposisiPersuratan;
