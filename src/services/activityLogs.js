import api from './api';

/**
 * Get activity logs untuk list page (hanya aktivitas lembaga)
 * Khusus untuk RW, RT, Posyandu
 */
export const getListActivityLogs = async (type, desaId, limit = 20) => {
  try {
    const response = await api.get('/kelembagaan/activity-logs/list', {
      params: {
        type,
        desa_id: desaId,
        limit
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching list activity logs:', error);
    throw error;
  }
};

/**
 * Get activity logs untuk detail page (semua aktivitas termasuk pengurus)
 */
export const getDetailActivityLogs = async (type, kelembagaanId, limit = 50) => {
  try {
    const response = await api.get(`/kelembagaan/activity-logs/detail/${type}/${kelembagaanId}`, {
      params: { limit }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching detail activity logs:', error);
    throw error;
  }
};

/**
 * Get all activity logs dengan filter (untuk admin)
 */
export const getAllActivityLogs = async (filters = {}) => {
  try {
    const response = await api.get('/kelembagaan/activity-logs', {
      params: filters
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching all activity logs:', error);
    throw error;
  }
};
