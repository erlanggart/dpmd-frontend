/**
 * Perjadin (Perjalanan Dinas) API Service
 */

import api from '../api';

export const perjadinService = {
  /**
   * Get dashboard statistics
   * @returns {Promise} Dashboard data with stats
   */
  getDashboard: () => {
    return api.get('/perjadin/dashboard');
  },

  /**
   * Get all kegiatan with pagination and filters
   * @param {Object} params - Query parameters (page, limit, search, id_bidang, start_date, end_date)
   * @returns {Promise} List of kegiatan dengan pagination
   */
  getAllKegiatan: (params = {}) => {
    return api.get('/perjadin/kegiatan', { params });
  },

  /**
   * Get kegiatan detail by ID
   * @param {number} id - Kegiatan ID
   * @returns {Promise} Kegiatan detail with bidang & pegawai
   */
  getKegiatanById: (id) => {
    return api.get(`/perjadin/kegiatan/${id}`);
  },

  /**
   * Create new kegiatan
   * @param {Object} data - Kegiatan data
   * @param {string} data.nama_kegiatan - Nama kegiatan
   * @param {string} data.nomor_sp - Nomor SP
   * @param {string} data.tanggal_mulai - Tanggal mulai (YYYY-MM-DD)
   * @param {string} data.tanggal_selesai - Tanggal selesai (YYYY-MM-DD)
   * @param {string} data.lokasi - Lokasi kegiatan
   * @param {string} [data.keterangan] - Keterangan (optional)
   * @param {Array} data.bidang - Array of bidang dengan pegawai
   * @param {number} data.bidang[].id_bidang - Bidang ID
   * @param {Array<number>} data.bidang[].pegawai_ids - Array of pegawai IDs
   * @returns {Promise} Created kegiatan
   */
  createKegiatan: (data) => {
    return api.post('/perjadin/kegiatan', data);
  },

  /**
   * Update kegiatan
   * @param {number} id - Kegiatan ID
   * @param {Object} data - Updated kegiatan data (same structure as create)
   * @returns {Promise} Updated kegiatan
   */
  updateKegiatan: (id, data) => {
    return api.put(`/perjadin/kegiatan/${id}`, data);
  },

  /**
   * Delete kegiatan
   * @param {number} id - Kegiatan ID
   * @returns {Promise} Delete confirmation
   */
  deleteKegiatan: (id) => {
    return api.delete(`/perjadin/kegiatan/${id}`);
  },

  /**
   * Export kegiatan to Excel
   * @param {Object} params - Filter parameters (optional)
   * @returns {Promise} Export data
   */
  exportKegiatan: (params = {}) => {
    return api.get('/perjadin/export', { params });
  }
};

export default perjadinService;
