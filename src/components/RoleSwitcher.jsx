// components/RoleSwitcher.jsx - Komponen untuk testing role (hanya untuk development)

import React from 'react';
import { getUserRole } from '../utils/roleUtils';

const RoleSwitcher = () => {
  const currentRole = getUserRole();
  
  const roles = [
    { value: 'staff', label: 'Staff Sekretariat' },
    { value: 'kepala_dinas', label: 'Kepala Dinas' },
    { value: 'sekretaris_dinas', label: 'Sekretaris Dinas' },
    { value: 'kepala_bidang_pemerintahan', label: 'Kepala Bidang Pemerintahan' },
    { value: 'kepala_bidang_kesra', label: 'Kepala Bidang Kesra' },
    { value: 'kepala_bidang_ekonomi', label: 'Kepala Bidang Ekonomi' },
    { value: 'kepala_bidang_fisik', label: 'Kepala Bidang Fisik' }
  ];

  const switchRole = (newRole) => {
    const userData = {
      role: newRole,
      name: `User ${newRole}`,
      id: 1
    };
    
    localStorage.setItem('userData', JSON.stringify(userData));
    
    // Reload halaman untuk menerapkan role baru
    window.location.reload();
  };

  // Hanya tampilkan di development mode
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'white',
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: '12px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      zIndex: 9999,
      minWidth: '200px'
    }}>
      <div style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '12px' }}>
        🔧 Role Switcher (Dev Only)
      </div>
      <div style={{ marginBottom: '8px', fontSize: '11px', color: '#666' }}>
        Current: {currentRole}
      </div>
      <select 
        value={currentRole} 
        onChange={(e) => switchRole(e.target.value)}
        style={{
          width: '100%',
          padding: '4px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '11px'
        }}
      >
        {roles.map(role => (
          <option key={role.value} value={role.value}>
            {role.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default RoleSwitcher;