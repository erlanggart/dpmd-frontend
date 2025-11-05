import api from '../api';

const BumdesDesaService = {
  // Get BUMDES data for current desa
  getBumdesData: async () => {
    try {
      const response = await api.get('/desa/bumdes');
      return response.data;
    } catch (error) {
      console.error('Error fetching BUMDES data:', error);
      throw error;
    }
  },

  // Create new BUMDES data
  createBumdes: async (data) => {
    try {
      const response = await api.post('/desa/bumdes', data);
      return response.data;
    } catch (error) {
      console.error('Error creating BUMDES data:', error);
      throw error;
    }
  },

  // Update existing BUMDES data
  updateBumdes: async (id, data) => {
    try {
      const response = await api.put(`/desa/bumdes/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error updating BUMDES data:', error);
      throw error;
    }
  },

  // Delete BUMDES data
  deleteBumdes: async (id) => {
    try {
      const response = await api.delete(`/desa/bumdes/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting BUMDES data:', error);
      throw error;
    }
  },

  // Upload document for BUMDES
  uploadDocument: async (id, file, type) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const response = await api.post(`/desa/bumdes/${id}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  },

  // Create BUMDES with files
  createBumdesWithFiles: async (data, files) => {
    try {
      const formData = new FormData();
      
      // Append all text data
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
          formData.append(key, data[key]);
        }
      });
      
      // Append all files
      Object.keys(files).forEach(key => {
        if (files[key]) {
          formData.append(key, files[key]);
        }
      });

      const response = await api.post('/desa/bumdes', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error creating BUMDES with files:', error);
      throw error;
    }
  },

  // Update BUMDES with files
  updateBumdesWithFiles: async (id, data, files) => {
    try {
      const formData = new FormData();
      
      // Add _method for Laravel PUT spoofing
      formData.append('_method', 'PUT');
      
      // Append all text data
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
          formData.append(key, data[key]);
        }
      });
      
      // Append all files
      Object.keys(files).forEach(key => {
        if (files[key]) {
          formData.append(key, files[key]);
        }
      });

      // Use POST instead of PUT for file uploads
      const response = await api.post(`/desa/bumdes/${id}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error updating BUMDES with files:', error);
      throw error;
    }
  },

  // Get BUMDES statistics for current desa
  getBumdesStatistics: async () => {
    try {
      const response = await api.get('/desa/bumdes/statistics');
      return response.data;
    } catch (error) {
      console.error('Error fetching BUMDES statistics:', error);
      throw error;
    }
  },

  // Get produk hukum options for BUMDES
  getProdukHukumForBumdes: async () => {
    try {
      const response = await api.get('/desa/bumdes/produk-hukum-options');
      return response.data;
    } catch (error) {
      console.error('Error fetching produk hukum options:', error);
      throw error;
    }
  },

  // Validate BUMDES data before submission
  validateBumdesData: (data) => {
    const errors = [];

    // Required fields validation
    if (!data.namabumdesa) {
      errors.push('Nama BUMDes harus diisi');
    }

    if (!data.desa) {
      errors.push('Nama Desa harus diisi');
    }

    if (!data.kecamatan) {
      errors.push('Kecamatan harus diisi');
    }

    // Email validation
    if (data.EmailBumdes && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.EmailBumdes)) {
      errors.push('Format email tidak valid');
    }

    // Phone validation
    if (data.NoHpBumdes && !/^[\d\s\-\+\(\)]+$/.test(data.NoHpBumdes)) {
      errors.push('Format nomor telepon tidak valid');
    }

    // Numeric fields validation
    const numericFields = [
      'TahunPendirian', 'TotalTenagaKerja', 'TenagaKerjaLaki', 'TenagaKerjaPerempuan',
      'ModalAwal', 'ModalSekarang', 'Aset', 'KekayaanBersih',
      'Omzet2022', 'Omzet2023', 'Omzet2024',
      'SHU2022', 'SHU2023', 'SHU2024',
      'Laba2022', 'Laba2023', 'Laba2024',
      'KontribusiPADesRP', 'KontribusiPADesPersen'
    ];

    numericFields.forEach(field => {
      if (data[field] && (isNaN(data[field]) || data[field] < 0)) {
        errors.push(`${field} harus berupa angka positif`);
      }
    });

    // Year validation
    if (data.TahunPendirian) {
      const currentYear = new Date().getFullYear();
      const year = parseInt(data.TahunPendirian);
      if (year < 1900 || year > currentYear) {
        errors.push(`Tahun pendirian harus antara 1900 - ${currentYear}`);
      }
    }

    // Percentage validation
    if (data.KontribusiPADesPersen && (data.KontribusiPADesPersen < 0 || data.KontribusiPADesPersen > 100)) {
      errors.push('Persentase kontribusi PADes harus antara 0-100');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Format currency for display
  formatCurrency: (value) => {
    if (!value || isNaN(value)) return 'Rp 0';
    return `Rp ${parseInt(value).toLocaleString('id-ID')}`;
  },

  // Format percentage for display
  formatPercentage: (value) => {
    if (!value || isNaN(value)) return '0%';
    return `${parseFloat(value)}%`;
  },

  // Calculate total workforce
  calculateTotalWorkforce: (laki, perempuan) => {
    const lakiLaki = parseInt(laki) || 0;
    const perempuanCount = parseInt(perempuan) || 0;
    return lakiLaki + perempuanCount;
  },

  // Calculate growth percentage
  calculateGrowth: (current, previous) => {
    const currentValue = parseFloat(current) || 0;
    const previousValue = parseFloat(previous) || 0;
    
    if (previousValue === 0) return currentValue > 0 ? 100 : 0;
    
    return ((currentValue - previousValue) / previousValue) * 100;
  },

  // Get upload status text
  getUploadStatusText: (status) => {
    const statusMap = {
      'not_uploaded': 'Belum Diupload',
      'uploaded': 'Sudah Diupload',
      'verified': 'Terverifikasi',
      'rejected': 'Ditolak'
    };
    return statusMap[status] || 'Status Tidak Diketahui';
  },

  // Get upload status color
  getUploadStatusColor: (status) => {
    const colorMap = {
      'not_uploaded': 'text-orange-600 bg-orange-100',
      'uploaded': 'text-blue-600 bg-blue-100',
      'verified': 'text-green-600 bg-green-100',
      'rejected': 'text-red-600 bg-red-100'
    };
    return colorMap[status] || 'text-gray-600 bg-gray-100';
  },

  // Export data to PDF (for reports)
  exportToPDF: async (bumdesData) => {
    try {
      const response = await api.post('/desa/bumdes/export/pdf', {
        data: bumdesData
      }, {
        responseType: 'blob'
      });
      
      // Create blob URL and download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bumdes-${bumdesData.namabumdesa}-${new Date().getTime()}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      throw error;
    }
  },

  // Export data to Excel
  exportToExcel: async (bumdesData) => {
    try {
      const response = await api.post('/desa/bumdes/export/excel', {
        data: bumdesData
      }, {
        responseType: 'blob'
      });
      
      // Create blob URL and download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bumdes-${bumdesData.namabumdesa}-${new Date().getTime()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw error;
    }
  }
};

export default BumdesDesaService;