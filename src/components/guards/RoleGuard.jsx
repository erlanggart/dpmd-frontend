import React from 'react';
import { Navigate } from 'react-router-dom';
import { getUserRole, canAccessRole } from '../../utils/roleUtils';

const RoleGuard = ({ children, allowedRoles, requiredRole }) => {
  const userRole = getUserRole();
  
  // Jika menggunakan allowedRoles (array)
  if (allowedRoles && Array.isArray(allowedRoles)) {
    if (!allowedRoles.includes(userRole)) {
      // Redirect ke dashboard utama jika tidak ada akses
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  // Jika menggunakan requiredRole (string spesifik)
  if (requiredRole && !canAccessRole(userRole, requiredRole)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

export default RoleGuard;