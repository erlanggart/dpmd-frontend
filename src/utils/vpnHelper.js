// Helper to check if user is VPN access
export const isVpnUser = () => {
  const token = localStorage.getItem('expressToken');
  return token === 'VPN_ACCESS_TOKEN';
};

// Get API base path based on user type
export const getApiBasePath = () => {
  return isVpnUser() ? '/vpn-core' : '';
};

// Create axios instance with VPN-aware configuration
import axios from 'axios';

export const createApiClient = () => {
  const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api';
  const basePath = getApiBasePath();
  
  return axios.create({
    baseURL: `${baseURL}${basePath}`,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
};
