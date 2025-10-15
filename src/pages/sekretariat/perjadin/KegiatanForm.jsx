import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { FiEdit3, FiPlus, FiClipboard, FiCheck, FiX, FiTrash2 } from 'react-icons/fi';
import api from '../../../api';
import Swal from 'sweetalert2';

// Enhanced CSS for modern animations and effects
const styles = `
  @keyframes fadeInUp {
    0% {
      opacity: 0;
      transform: translateY(30px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes slideIn {
    0% {
      opacity: 0;
      transform: translateX(-20px);
    }
    100% {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.05);
    }
  }

  .animate-fade-in-up {
    animation: fadeInUp 0.8s ease-out;
  }

  .animate-slide-in {
    animation: slideIn 0.6s ease-out;
  }

  .animate-pulse-subtle {
    animation: pulse 2s infinite;
  }

  .gradient-slate {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
  }

  .gradient-slate-light {
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 50%, #cbd5e1 100%);
  }

  .glass-effect {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
  }

  .input-focus {
    transition: all 0.3s ease;
  }

  .input-focus:focus {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
  }

  .btn-primary {
    background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
    transition: all 0.3s ease;
  }

  .btn-primary:hover {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  }
`;

// Inject styles
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

const KegiatanForm = ({ kegiatan: initialKegiatan, onClose = () => {}, onSuccess = () => {} }) => {
  const [formData, setFormData] = useState({
    nomor_sp: '',
    nama_kegiatan: '',
    tanggal_mulai: '',
    tanggal_selesai: '',
    lokasi: '',
    keterangan: '',
    personil_bidang_list: [{ id_bidang: '', personil: [''] }],
  });
  const [allBidangList, setAllBidangList] = useState([]);
  const [allPersonilByBidang, setAllPersonilByBidang] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [masterDataCache, setMasterDataCache] = useState({
    bidang: { data: null, timestamp: null },
    personil: { data: {}, timestamp: {} }
  });

  // Cache utility functions
  const isCacheValid = (timestamp, maxAge = 300000) => { // 5 minutes default
    if (!timestamp) return false;
    return (Date.now() - timestamp) < maxAge;
  };

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        // Check if bidang data is cached and valid
        if (masterDataCache.bidang.data && isCacheValid(masterDataCache.bidang.timestamp)) {
          console.log('📋 KegiatanForm: Using cached bidang data');
          setAllBidangList(masterDataCache.bidang.data);
          return;
        }

        console.log('KegiatanForm: Fetching fresh bidang data...');
        const bidangRes = await api.get('/perjadin/bidang');
        
        // Handle API response structure
        const bidangData = bidangRes.data?.success ? bidangRes.data.data : bidangRes.data;
        
        setAllBidangList(bidangData);
        setMasterDataCache(prev => ({
          ...prev,
          bidang: {
            data: bidangData,
            timestamp: Date.now()
          }
        }));
      } catch (error) {
        console.error('KegiatanForm: Error fetching master data:', error);
        
        // Use cached data if available
        if (masterDataCache.bidang.data) {
          console.log('KegiatanForm: Using cached bidang data due to error');
          setAllBidangList(masterDataCache.bidang.data);
        } else {
          Swal.fire('Error', 'Gagal memuat data master (bidang).', 'error');
        }
      }
    };
    fetchMasterData();
  }, []);

  useEffect(() => {
    if (initialKegiatan) {
      setFormData({
        nomor_sp: initialKegiatan.nomor_sp || '',
        nama_kegiatan: initialKegiatan.nama_kegiatan || '',
        tanggal_mulai: initialKegiatan.tanggal_mulai || '',
        tanggal_selesai: initialKegiatan.tanggal_selesai || '',
        lokasi: initialKegiatan.lokasi || '',
        keterangan: initialKegiatan.keterangan || '',
        personil_bidang_list: initialKegiatan.details.map(d => ({
          id_bidang: d.id_bidang.toString(),
          personil: d.personil ? d.personil.split(', ').filter(p => p) : [''],
        })),
      });

      // Preload personil untuk bidang yang sudah dipilih
      const loadPersonilForBidangs = async () => {
        const bidangIds = [...new Set(initialKegiatan.details.map(d => d.id_bidang))];
        const personilPromises = bidangIds.map(async (bidangId) => {
          try {
            const personilRes = await api.get(`/perjadin/personil/${bidangId}`);
            return { bidangId, data: personilRes.data };
          } catch (error) {
            console.error(`Error fetching personil for bidang ${bidangId}:`, error);
            return { bidangId, data: [] };
          }
        });

        const personilResults = await Promise.all(personilPromises);
        const newPersonilByBidang = {};
        personilResults.forEach(({ bidangId, data }) => {
          newPersonilByBidang[bidangId] = data;
        });
        setAllPersonilByBidang(newPersonilByBidang);
      };

      loadPersonilForBidangs();
    } else {
      setFormData({
        nomor_sp: '',
        nama_kegiatan: '',
        tanggal_mulai: '',
        tanggal_selesai: '',
        lokasi: '',
        keterangan: '',
        personil_bidang_list: [{ id_bidang: '', personil: [''] }],
      });
    }
  }, [initialKegiatan]);

  const handleBidangChange = useCallback(async (index, e) => {
    const newPersonilBidangList = [...formData.personil_bidang_list];
    newPersonilBidangList[index].id_bidang = e.target.value;
    newPersonilBidangList[index].personil = [''];
    setFormData({ ...formData, personil_bidang_list: newPersonilBidangList });

    // Fetch personil untuk bidang yang dipilih dengan caching
    if (e.target.value && !allPersonilByBidang[e.target.value]) {
      try {
        // Check if personil data is cached and valid
        const cachedTimestamp = masterDataCache.personil.timestamp[e.target.value];
        const cachedData = masterDataCache.personil.data[e.target.value];
        
        if (cachedData && isCacheValid(cachedTimestamp)) {
          console.log(`📋 KegiatanForm: Using cached personil data for bidang ${e.target.value}`);
          setAllPersonilByBidang(prev => ({
            ...prev,
            [e.target.value]: cachedData
          }));
          return;
        }

        console.log(`KegiatanForm: Fetching fresh personil data for bidang ${e.target.value}...`);
        // Add timeout to prevent long waiting
        const personilRes = await Promise.race([
          api.get(`/perjadin/personil/${e.target.value}`),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Timeout')), 10000) // 10 second timeout
          )
        ]);
        
        // Handle API response structure
        const personilData = personilRes.data?.success ? personilRes.data.data : personilRes.data;
        
        setAllPersonilByBidang(prev => ({
          ...prev,
          [e.target.value]: personilData
        }));

        // Update cache
        setMasterDataCache(prev => ({
          ...prev,
          personil: {
            data: {
              ...prev.personil.data,
              [e.target.value]: personilData
            },
            timestamp: {
              ...prev.personil.timestamp,
              [e.target.value]: Date.now()
            }
          }
        }));
      } catch (error) {
        console.error('KegiatanForm: Error fetching personil:', error);
        
        // Use cached data if available
        const cachedData = masterDataCache.personil.data[e.target.value];
        if (cachedData) {
          console.log(`KegiatanForm: Using cached personil data due to error for bidang ${e.target.value}`);
          setAllPersonilByBidang(prev => ({
            ...prev,
            [e.target.value]: cachedData
          }));
        } else {
          Swal.fire('Error', 'Gagal memuat data personil.', 'error');
        }
      }
    }
  }, [formData.personil_bidang_list, allPersonilByBidang, masterDataCache, isCacheValid]);

  const handlePersonilChange = (groupIndex, personilIndex, e) => {
    const newPersonilBidangList = [...formData.personil_bidang_list];
    newPersonilBidangList[groupIndex].personil[personilIndex] = e.target.value;
    setFormData({ ...formData, personil_bidang_list: newPersonilBidangList });
  };

  const addBidangGroup = () => {
    setFormData({
      ...formData,
      personil_bidang_list: [
        ...formData.personil_bidang_list,
        { id_bidang: '', personil: [''] },
      ],
    });
  };

  const removeBidangGroup = (index) => {
    if (formData.personil_bidang_list.length > 1) {
      const newPersonilBidangList = formData.personil_bidang_list.filter((_, i) => i !== index);
      setFormData({ ...formData, personil_bidang_list: newPersonilBidangList });
    } else {
      Swal.fire('Tidak bisa dihapus', 'Setidaknya harus ada satu bidang.', 'warning');
    }
  };
  
  const addPersonilSelect = (index) => {
    const newPersonilBidangList = [...formData.personil_bidang_list];
    newPersonilBidangList[index].personil.push('');
    setFormData({ ...formData, personil_bidang_list: newPersonilBidangList });
  };
  
  const removePersonilSelect = (groupIndex, personilIndex) => {
    const newPersonilBidangList = [...formData.personil_bidang_list];
    if (newPersonilBidangList[groupIndex].personil.length > 1) {
      newPersonilBidangList[groupIndex].personil.splice(personilIndex, 1);
      setFormData({ ...formData, personil_bidang_list: newPersonilBidangList });
    } else {
      Swal.fire('Tidak bisa dihapus', 'Setidaknya harus ada satu personil per bidang.', 'warning');
    }
  };

  const fetchPersonilByBidang = async (idBidang) => {
    if (!allPersonilByBidang[idBidang]) {
      try {
        console.log(`KegiatanForm: Fetching fresh personil data for bidang ${idBidang}...`);
        const response = await api.get(`/perjadin/personil/${idBidang}`);
        // Handle API response structure
        const personilData = response.data?.success ? response.data.data : response.data;
        setAllPersonilByBidang(prev => ({ ...prev, [idBidang]: personilData }));
        console.log(`KegiatanForm: Successfully fetched personil for bidang ${idBidang}`);
      } catch (error) {
        console.error('KegiatanForm: Failed to fetch personil:', error);
      }
    }
  };

  useEffect(() => {
    formData.personil_bidang_list.forEach(item => {
      if (item.id_bidang) {
        fetchPersonilByBidang(item.id_bidang);
      }
    });
  }, [formData.personil_bidang_list]);

  // Fungsi untuk mengecek konflik personil pada tanggal yang sama - OPTIMIZED
  const checkPersonnelConflict = async (personnelList, startDate, endDate) => {
    try {
      // Use individual checks with limited batch size for better performance
      const batchSize = 3; // Process only 3 at a time to prevent timeout
      const limitedPersonnelList = personnelList.slice(0, batchSize);
      
      const conflictCheckPromises = limitedPersonnelList.map(async (personName) => {
        try {
          const response = await Promise.race([
            api.get(`/perjadin/check-personnel-conflict`, {
              params: {
                personnel_name: personName,
                start_date: startDate,
                end_date: endDate,
                exclude_id: initialKegiatan?.id_kegiatan || null
              }
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Individual conflict check timeout')), 5000)
            )
          ]);
          return { name: personName, conflicts: response.data.conflicts || [] };
        } catch (error) {
          console.warn(`Conflict check failed for ${personName}:`, error);
          return { name: personName, conflicts: [] };
        }
      });

      const conflictResults = await Promise.all(conflictCheckPromises);
      const conflictedPersonnel = conflictResults.filter(result => result.conflicts.length > 0);
      
      // Show warning if we had to limit the check
      if (personnelList.length > batchSize) {
        console.warn(`Conflict check limited to ${batchSize} personnel out of ${personnelList.length} for performance`);
      }
      
      return conflictedPersonnel;
    } catch (error) {
      console.error('Error checking personnel conflicts:', error);
      return [];
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting) return; // Prevent double submission
    
    // Immediately set submitting to prevent double clicks
    setIsSubmitting(true);
    
    if (formData.tanggal_mulai > formData.tanggal_selesai) {
      setIsSubmitting(false);
      Swal.fire('Peringatan', 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.', 'warning');
      return;
    }

    // Validasi konflik personil
    const allSelectedPersonnel = [];
    formData.personil_bidang_list.forEach(group => {
      group.personil.forEach(personName => {
        if (personName && personName.trim()) {
          allSelectedPersonnel.push(personName.trim());
        }
      });
    });

    if (allSelectedPersonnel.length > 0) {
      // Show loading indicator for conflict check
      Swal.fire({
        title: 'Mengecek Konflik Jadwal...',
        text: 'Mohon tunggu sebentar',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      const conflictedPersonnel = await checkPersonnelConflict(
        allSelectedPersonnel, 
        formData.tanggal_mulai, 
        formData.tanggal_selesai
      );

      Swal.close(); // Close conflict check loading

      if (conflictedPersonnel.length > 0) {
        let conflictMessage = '<div style="text-align: left; font-size: 14px; line-height: 1.6;">';
        conflictMessage += '<strong style="color: #dc2626; margin-bottom: 10px; display: block;">⚠️ Konflik Jadwal Ditemukan:</strong>';
        
        conflictedPersonnel.forEach(person => {
          conflictMessage += `<div style="margin-bottom: 12px; padding: 10px; background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 4px;">`;
          conflictMessage += `<strong style="color: #1f2937;">${person.name}</strong><br/>`;
          conflictMessage += '<span style="color: #6b7280; font-size: 12px;">Sudah terjadwal pada:</span><br/>';
          
          person.conflicts.forEach(conflict => {
            const startDate = new Date(conflict.tanggal_mulai).toLocaleDateString('id-ID', {
              day: '2-digit', month: 'short', year: 'numeric'
            });
            const endDate = new Date(conflict.tanggal_selesai).toLocaleDateString('id-ID', {
              day: '2-digit', month: 'short', year: 'numeric'
            });
            
            conflictMessage += `<span style="color: #dc2626; font-weight: 500;">• ${conflict.nama_kegiatan}</span><br/>`;
            conflictMessage += `<span style="color: #6b7280; font-size: 11px;">  ${startDate} - ${endDate}</span><br/>`;
          });
          
          conflictMessage += '</div>';
        });
        
        conflictMessage += '<div style="margin-top: 15px; padding: 10px; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">';
        conflictMessage += '<strong style="color: #92400e;">💡 Solusi:</strong><br/>';
        conflictMessage += '<span style="color: #78716c; font-size: 12px;">• Pilih personil lain yang tersedia<br/>• Ubah tanggal kegiatan<br/>• Koordinasikan dengan kepala bidang</span>';
        conflictMessage += '</div></div>';

        await Swal.fire({
          title: 'Konflik Jadwal Personil',
          html: conflictMessage,
          icon: 'warning',
          confirmButtonText: 'Perbaiki Jadwal',
          confirmButtonColor: '#dc2626',
          customClass: {
            popup: 'swal2-popup-large',
            htmlContainer: 'swal2-html-container-left'
          },
          didOpen: () => {
            const style = document.createElement('style');
            style.textContent = `
              .swal2-popup-large {
                width: 600px !important;
                max-width: 90vw !important;
              }
              .swal2-html-container-left {
                text-align: left !important;
              }
            `;
            document.head.appendChild(style);
          }
        });
        setIsSubmitting(false); // Reset submitting state on conflict
        return; // Stop form submission
      }
    }

    try {
      
      // Show loading indicator
      Swal.fire({
        title: initialKegiatan ? 'Mengupdate Kegiatan...' : 'Menyimpan Kegiatan...',
        text: 'Mohon tunggu sebentar',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      console.log('📤 KegiatanForm: Sending data to API:', {
        formData,
        endpoint: initialKegiatan ? `/perjadin/kegiatan/${initialKegiatan.id_kegiatan}` : '/perjadin/kegiatan',
        method: initialKegiatan ? 'PUT' : 'POST'
      });

      let response;
      if (initialKegiatan) {
        response = await api.put(`/perjadin/kegiatan/${initialKegiatan.id_kegiatan}`, formData);
      } else {
        response = await api.post('/perjadin/kegiatan', formData);
      }
      
      console.log('📥 KegiatanForm: API response:', response.data);
      
      Swal.close(); // Close loading
      
      if (response.data.status === 'success') {
        await Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: response.data.message,
          confirmButtonColor: '#1e293b'
        });
        
        // Reset form state after successful submission
        if (!initialKegiatan) {
          setFormData({
            nomor_sp: '',
            nama_kegiatan: '',
            tanggal_mulai: '',
            tanggal_selesai: '',
            lokasi: '',
            keterangan: '',
            personil_bidang_list: [{ id_bidang: '', personil: [''] }],
          });
        }
        
        // Call success callback and close form
        if (typeof onSuccess === 'function') {
          onSuccess();
        }
        if (typeof onClose === 'function') {
          onClose();
        }
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal!',
          text: response.data.message,
          confirmButtonColor: '#dc2626'
        });
      }
    } catch (error) {
      Swal.close(); // Close loading
      
      if (error.response && error.response.status === 409) {
        Swal.fire({
          icon: 'warning',
          title: 'Konflik Data!',
          text: error.response.data.message,
          confirmButtonColor: '#f59e0b'
        });
      } else {
        console.error('KegiatanForm: Error submitting form:', error);
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: error.response?.data?.message || 'Terjadi kesalahan saat menyimpan data.',
          confirmButtonColor: '#dc2626'
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Enhanced Header with Modern Design */}
      <div className="text-center space-y-8 animate-fade-in-up">
        <div className="relative inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 rounded-3xl shadow-2xl animate-pulse-subtle">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-3xl"></div>
          {initialKegiatan ? (
            <FiEdit3 className="text-4xl text-white relative z-10" />
          ) : (
            <FiPlus className="text-4xl text-white relative z-10" />
          )}
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
            <FiCheck className="text-white text-xs" />
          </div>
        </div>
        <div className="space-y-6">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-900 bg-clip-text text-transparent mb-4 tracking-tight">
              {initialKegiatan ? 'Edit Kegiatan' : 'Form Kegiatan Baru'}
            </h1>
            <p className="text-slate-600 text-xl max-w-3xl mx-auto leading-relaxed font-medium">
              {initialKegiatan ? 'Perbarui informasi kegiatan perjalanan dinas dengan detail terbaru' : 'Isi formulir lengkap untuk menambah kegiatan perjalanan dinas baru'}
            </p>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-3 h-3 bg-slate-700 rounded-full animate-pulse"></div>
            <div className="w-16 h-1 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 rounded-full"></div>
            <div className="w-3 h-3 bg-slate-800 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-16 h-1 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-700 rounded-full"></div>
            <div className="w-3 h-3 bg-slate-900 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
          </div>
        </div>
      </div>

      {/* Enhanced Form Container with Glass Effect */}
      <div className="glass-effect rounded-3xl shadow-2xl border border-slate-200/30 overflow-hidden animate-slide-in">
        <div className="bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 px-8 py-6 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent"></div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/10">
              <FiClipboard className="text-white text-xl" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-white mb-1">Formulir Kegiatan</h3>
              <p className="text-slate-300 text-base font-medium">Lengkapi semua informasi yang diperlukan dengan detail</p>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" style={{animationDelay: '0.3s'}}></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{animationDelay: '0.6s'}}></div>
            </div>
          </div>
        </div>

        {/* Enhanced Form Content */}
        <form onSubmit={handleSubmit} className="p-10 space-y-10">
        {/* Basic Information Section */}
        <div className="space-y-8">
          <div className="border-l-4 border-slate-700 pl-6">
            <h2 className="text-2xl font-bold text-slate-800 mb-2 flex items-center gap-3">
              <i className="fas fa-info-circle text-slate-700"></i>
              Informasi Dasar
            </h2>
            <p className="text-slate-600 text-lg">Data utama kegiatan perjalanan dinas</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Nama Kegiatan */}
            <div className="lg:col-span-2">
              <label className="block text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                <div className="p-1 bg-slate-100 rounded-lg">
                  <i className="fas fa-pen-nib text-slate-700 text-sm"></i>
                </div>
                Nama Kegiatan
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={formData.nama_kegiatan} 
                  onChange={(e) => setFormData({...formData, nama_kegiatan: e.target.value})} 
                  className="w-full px-5 py-4 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-500/20 focus:border-slate-500 bg-white shadow-lg transition-all duration-300 input-focus text-lg font-medium" 
                  placeholder="Masukkan nama kegiatan lengkap"
                  required 
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <i className="fas fa-edit text-slate-400"></i>
                </div>
              </div>
            </div>

            {/* Nomor SP */}
            <div>
              <label className="block text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                <div className="p-1 bg-slate-100 rounded-lg">
                  <i className="fas fa-file-alt text-slate-700 text-sm"></i>
                </div>
                Nomor SP
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={formData.nomor_sp} 
                  onChange={(e) => setFormData({...formData, nomor_sp: e.target.value})} 
                  className="w-full px-5 py-4 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-500/20 focus:border-slate-500 bg-white shadow-lg transition-all duration-300 input-focus text-lg font-medium" 
                  placeholder="Nomor Surat Perintah"
                  required 
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <i className="fas fa-hashtag text-slate-400"></i>
                </div>
              </div>
            </div>

            {/* Lokasi */}
            <div>
              <label className="block text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                <div className="p-1 bg-slate-100 rounded-lg">
                  <i className="fas fa-map-marker-alt text-slate-700 text-sm"></i>
                </div>
                Tempat Kegiatan
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type="text" 
                  value={formData.lokasi} 
                  onChange={(e) => setFormData({...formData, lokasi: e.target.value})} 
                  className="w-full px-5 py-4 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-500/20 focus:border-slate-500 bg-white shadow-lg transition-all duration-300 input-focus text-lg font-medium" 
                  placeholder="Lokasi kegiatan"
                  required 
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  <i className="fas fa-location-dot text-slate-400"></i>
                </div>
              </div>
            </div>

            {/* Tanggal Mulai */}
            <div>
              <label className="block text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                <div className="p-1 bg-slate-100 rounded-lg">
                  <i className="fas fa-calendar-alt text-slate-700 text-sm"></i>
                </div>
                Tanggal Mulai
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type="date" 
                  value={formData.tanggal_mulai} 
                  onChange={(e) => setFormData({...formData, tanggal_mulai: e.target.value})} 
                  className="w-full px-5 py-4 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-500/20 focus:border-slate-500 bg-white shadow-lg transition-all duration-300 input-focus text-lg font-medium" 
                  required 
                />
              </div>
            </div>

            <div>
              <label className="block text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
                <div className="p-1 bg-slate-100 rounded-lg">
                  <i className="fas fa-calendar-check text-slate-700 text-sm"></i>
                </div>
                Tanggal Selesai
                <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input 
                  type="date" 
                  value={formData.tanggal_selesai} 
                  onChange={(e) => setFormData({...formData, tanggal_selesai: e.target.value})} 
                  className="w-full px-5 py-4 border-2 border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-500/20 focus:border-slate-500 bg-white shadow-lg transition-all duration-300 input-focus text-lg font-medium" 
                  required 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Bidang & Personil Section */}
        <div className="bg-gradient-to-r from-slate-50 to-blue-50 p-6 rounded-2xl border border-gray-200">
          <label className="block text-lg font-bold text-gray-700 mb-4">
            <i className="fas fa-users-cog text-slate-600 mr-2"></i>
            Bidang & Personil
          </label>
          
          <div className="space-y-6">
            {formData.personil_bidang_list.map((item, index) => (
              <div key={index} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm relative">
                {/* Remove Button */}
                {formData.personil_bidang_list.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => removeBidangGroup(index)} 
                    className="absolute top-4 right-4 bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-all duration-200"
                    title="Hapus Bidang"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Bidang Selection */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      <i className="fas fa-building text-slate-600 mr-2"></i>
                      Bidang
                    </label>
                    <div className="relative">
                      <select
                        value={item.id_bidang}
                        onChange={(e) => handleBidangChange(index, e)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white shadow-sm transition-all duration-200 appearance-none"
                        required
                      >
                        <option value="">Pilih Bidang</option>
                        {Array.isArray(allBidangList) && allBidangList.map(b => (
                          <option key={b.id_bidang || b.id} value={b.id_bidang || b.id}>
                            {b.nama_bidang || b.nama}
                          </option>
                        ))}
                      </select>
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <i className="fas fa-chevron-down text-gray-400"></i>
                      </div>
                    </div>
                  </div>

                  {/* Personil Selection */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      <i className="fas fa-users text-slate-600 mr-2"></i>
                      Personil ({item.personil.length} orang)
                    </label>
                    <div className="space-y-3">
                      {item.personil.map((personilName, personilIndex) => (
                        <div key={personilIndex} className="flex items-center gap-3">
                          <div className="flex-1 relative">
                            <select
                              value={personilName}
                              onChange={(e) => handlePersonilChange(index, personilIndex, e)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white shadow-sm transition-all duration-200 appearance-none"
                              required
                            >
                              <option value="">Pilih Personil</option>
                              {Array.isArray(allPersonilByBidang[item.id_bidang]) && allPersonilByBidang[item.id_bidang].map(p => (
                                <option key={p.id_personil} value={p.nama_personil}>{p.nama_personil}</option>
                              ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                              <i className="fas fa-chevron-down text-gray-400"></i>
                            </div>
                          </div>
                          {item.personil.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => removePersonilSelect(index, personilIndex)} 
                              className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-lg transition-all duration-200"
                              title="Hapus Personil"
                            >
                              <FiTrash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button 
                        type="button" 
                        onClick={() => addPersonilSelect(index)} 
                        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
                      >
                        <FiPlus className="w-4 h-4" />
                        <span>Tambah Personil</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <button 
            type="button" 
            onClick={addBidangGroup} 
            className="mt-6 flex items-center gap-2 bg-slate-700 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <i className="fas fa-plus-circle"></i>
            <span>Tambah Bidang</span>
          </button>
        </div>

        {/* Keterangan */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            <i className="fas fa-info-circle text-slate-600 mr-2"></i>
            Keterangan
          </label>
          <textarea 
            value={formData.keterangan} 
            onChange={(e) => setFormData({...formData, keterangan: e.target.value})} 
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white shadow-sm transition-all duration-200" 
            rows="4"
            placeholder="Tambahkan keterangan kegiatan (opsional)"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
          <button 
            type="button" 
            onClick={() => {
              if (typeof onClose === 'function') {
                onClose();
              }
            }}
            className="flex-1 sm:flex-none px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <i className="fas fa-times mr-2"></i>
            Batal
          </button>
          <button 
            type="submit" 
            disabled={isSubmitting}
            onDoubleClick={(e) => e.preventDefault()}
            style={{ pointerEvents: isSubmitting ? 'none' : 'auto' }}
            className={`flex-1 px-8 py-3 font-bold rounded-xl shadow-lg transition-all duration-300 ${
              isSubmitting 
                ? 'bg-gray-400 cursor-not-allowed opacity-70' 
                : 'bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 hover:shadow-xl transform hover:-translate-y-1'
            } text-white`}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent inline-block mr-2"></div>
                {initialKegiatan ? 'Memperbarui...' : 'Menyimpan...'}
              </>
            ) : (
              <>
                <i className="fas fa-save mr-2"></i>
                {initialKegiatan ? 'Perbarui Kegiatan' : 'Simpan Kegiatan'}
              </>
            )}
          </button>
        </div>
        </form>
      </div>
    </div>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(KegiatanForm);