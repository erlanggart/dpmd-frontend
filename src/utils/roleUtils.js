// utils/roleUtils.js - Utility functions untuk role-based access

export const getUserRole = () => {
  try {
    // Coba ambil dari localStorage dulu
    const userDataStr = localStorage.getItem('userData');
    if (userDataStr) {
      const userData = JSON.parse(userDataStr);
      let role = userData.role || 'staff';
      
      // Mapping admin sekretariat ke staff untuk disposisi
      if (role === 'sekretariat') {
        role = 'staff';
      }
      
      return role;
    }
    
    // Fallback ke token parsing jika ada
    const token = localStorage.getItem('authToken');
    if (token) {
      // Bisa implement JWT parsing di sini jika diperlukan
      // const payload = parseJWT(token);
      // return payload.role;
    }
    
    return 'staff';
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'staff';
  }
};

export const getDisposisiMenuPath = (role) => {
  switch (role) {
    case 'kepala_dinas':
      return '/dashboard/disposisi/kepala-dinas';
    case 'sekretaris_dinas':
      return '/dashboard/disposisi/sekretaris-dinas';
    case 'kepala_bidang_pemerintahan':
    case 'kepala_bidang_kesra':
    case 'kepala_bidang_ekonomi':
    case 'kepala_bidang_fisik':
      return '/dashboard/disposisi/kepala-bidang';
    case 'staff':
    default:
      return '/dashboard/disposisi-persuratan';
  }
};

export const getDisposisiMenuLabel = (role) => {
  switch (role) {
    case 'kepala_dinas':
      return 'Disposisi - Kepala Dinas';
    case 'sekretaris_dinas':
      return 'Disposisi - Sekretaris';
    case 'kepala_bidang_pemerintahan':
      return 'Disposisi - Bid. Pemerintahan';
    case 'kepala_bidang_kesra':
      return 'Disposisi - Bid. Kesra';
    case 'kepala_bidang_ekonomi':
      return 'Disposisi - Bid. Ekonomi';
    case 'kepala_bidang_fisik':
      return 'Disposisi - Bid. Fisik';
    case 'staff':
    default:
      return 'Disposisi Persuratan';
  }
};

export const hasDisposisiAccess = (role) => {
  const allowedRoles = [
    'kepala_dinas',
    'sekretaris_dinas', 
    'kepala_bidang_pemerintahan',
    'kepala_bidang_kesra',
    'kepala_bidang_ekonomi',
    'kepala_bidang_fisik',
    'staff'
  ];
  
  return allowedRoles.includes(role);
};

export const canAccessRole = (userRole, requiredRole) => {
  // Kepala dinas bisa akses semua
  if (userRole === 'kepala_dinas') {
    return true;
  }
  
  // Role lain hanya bisa akses dashboard mereka sendiri
  return userRole === requiredRole;
};

export const getRoleDisplayName = (role) => {
  switch (role) {
    case 'kepala_dinas':
      return 'Kepala Dinas';
    case 'sekretaris_dinas':
      return 'Sekretaris Dinas';
    case 'kepala_bidang_pemerintahan':
      return 'Kepala Bidang Pemerintahan';
    case 'kepala_bidang_kesra':
      return 'Kepala Bidang Kesejahteraan Rakyat';
    case 'kepala_bidang_ekonomi':
      return 'Kepala Bidang Ekonomi';
    case 'kepala_bidang_fisik':
      return 'Kepala Bidang Fisik dan Prasarana';
    case 'staff':
      return 'Staff Sekretariat';
    default:
      return 'User';
  }
};

export const getBidangFromRole = (role) => {
  switch (role) {
    case 'kepala_bidang_pemerintahan':
      return 'pemerintahan';
    case 'kepala_bidang_kesra':
      return 'kesra';
    case 'kepala_bidang_ekonomi':
      return 'ekonomi';
    case 'kepala_bidang_fisik':
      return 'fisik';
    default:
      return null;
  }
};