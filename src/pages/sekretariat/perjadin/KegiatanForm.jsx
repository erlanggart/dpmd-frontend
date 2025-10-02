import React, { useState, useEffect } from 'react';
import api from '../../../api';
import Swal from 'sweetalert2';

// Custom CSS for animations
const styles = `
  @keyframes fadeInUp {
    0% {
      opacity: 0;
      transform: translateY(20px);
    }
    100% {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in-up {
    animation: fadeInUp 0.6s ease-out;
  }

  .gradient-dark-blue {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
  }

  .gradient-darker-blue {
    background: linear-gradient(135deg, #0c1420 0%, #1e293b 50%, #475569 100%);
  }
`;

// Inject styles
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

const KegiatanForm = ({ kegiatan: initialKegiatan, onClose, onSuccess }) => {
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

  useEffect(() => {
    const fetchMasterData = async () => {
      try {
        const bidangRes = await api.get('/perjadin/bidang');
        setAllBidangList(bidangRes.data);
      } catch (error) {
        Swal.fire('Error', 'Gagal memuat data master (bidang).', 'error');
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

  const handleBidangChange = async (index, e) => {
    const newPersonilBidangList = [...formData.personil_bidang_list];
    newPersonilBidangList[index].id_bidang = e.target.value;
    newPersonilBidangList[index].personil = [''];
    setFormData({ ...formData, personil_bidang_list: newPersonilBidangList });

    // Fetch personil untuk bidang yang dipilih
    if (e.target.value && !allPersonilByBidang[e.target.value]) {
      try {
        const personilRes = await api.get(`/perjadin/personil/${e.target.value}`);
        setAllPersonilByBidang(prev => ({
          ...prev,
          [e.target.value]: personilRes.data
        }));
      } catch (error) {
        console.error('Error fetching personil:', error);
        Swal.fire('Error', 'Gagal memuat data personil.', 'error');
      }
    }
  };

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
        const response = await api.get(`/personil/${idBidang}`);
        setAllPersonilByBidang(prev => ({ ...prev, [idBidang]: response.data }));
      } catch (error) {
        console.error('Failed to fetch personil:', error);
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

  // Fungsi untuk mengecek konflik personil pada tanggal yang sama
  const checkPersonnelConflict = async (personnelList, startDate, endDate) => {
    try {
      const conflictCheckPromises = personnelList.map(async (personName) => {
        const response = await api.get(`/perjadin/check-personnel-conflict`, {
          params: {
            personnel_name: personName,
            start_date: startDate,
            end_date: endDate,
            exclude_id: initialKegiatan?.id_kegiatan || null
          }
        });
        return { name: personName, conflicts: response.data.conflicts || [] };
      });

      const conflictResults = await Promise.all(conflictCheckPromises);
      const conflictedPersonnel = conflictResults.filter(result => result.conflicts.length > 0);
      
      return conflictedPersonnel;
    } catch (error) {
      console.error('Error checking personnel conflict:', error);
      return [];
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.tanggal_mulai > formData.tanggal_selesai) {
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
      const conflictedPersonnel = await checkPersonnelConflict(
        allSelectedPersonnel, 
        formData.tanggal_mulai, 
        formData.tanggal_selesai
      );

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
        return; // Stop form submission
      }
    }

    try {
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
      
      if (response.data.status === 'success') {
        Swal.fire('Berhasil!', response.data.message, 'success');
        onSuccess();
      } else {
        Swal.fire('Gagal!', response.data.message, 'error');
      }
    } catch (error) {
      if (error.response && error.response.status === 409) {
        Swal.fire('Gagal!', error.response.data.message, 'warning');
      } else {
        console.error('Error:', error);
        Swal.fire('Oops...', 'Terjadi kesalahan saat menyimpan data.', 'error');
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl shadow-2xl">
          <i className="fas fa-edit text-3xl text-white"></i>
        </div>
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-4">
            {initialKegiatan ? 'Edit Kegiatan' : 'Form Kegiatan Baru'}
          </h1>
          <p className="text-slate-600 text-lg max-w-2xl mx-auto">
            {initialKegiatan ? 'Perbarui informasi kegiatan perjalanan dinas' : 'Isi formulir untuk menambah kegiatan perjalanan dinas baru'}
          </p>
          <div className="w-32 h-1 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 mx-auto rounded-full mt-4"></div>
        </div>
      </div>

      {/* Enhanced Form Container */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <i className="fas fa-form text-white"></i>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Formulir Kegiatan</h3>
              <p className="text-slate-300 text-sm">Lengkapi semua informasi yang diperlukan</p>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-8 space-y-8">
        {/* Basic Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Nama Kegiatan */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <i className="fas fa-pen-nib text-slate-600 mr-2"></i>
              Nama Kegiatan
            </label>
            <input 
              type="text" 
              value={formData.nama_kegiatan} 
              onChange={(e) => setFormData({...formData, nama_kegiatan: e.target.value})} 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white shadow-sm transition-all duration-200" 
              placeholder="Masukkan nama kegiatan"
              required 
            />
          </div>

          {/* Nomor SP */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <i className="fas fa-file-alt text-slate-600 mr-2"></i>
              Nomor SP
            </label>
            <input 
              type="text" 
              value={formData.nomor_sp} 
              onChange={(e) => setFormData({...formData, nomor_sp: e.target.value})} 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white shadow-sm transition-all duration-200" 
              placeholder="Nomor Surat Perintah"
              required 
            />
          </div>

          {/* Lokasi */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <i className="fas fa-map-marker-alt text-slate-600 mr-2"></i>
              Tempat Kegiatan
            </label>
            <input 
              type="text" 
              value={formData.lokasi} 
              onChange={(e) => setFormData({...formData, lokasi: e.target.value})} 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white shadow-sm transition-all duration-200" 
              placeholder="Lokasi kegiatan"
              required 
            />
          </div>

          {/* Tanggal */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <i className="fas fa-calendar-alt text-slate-600 mr-2"></i>
              Tanggal Mulai
            </label>
            <input 
              type="date" 
              value={formData.tanggal_mulai} 
              onChange={(e) => setFormData({...formData, tanggal_mulai: e.target.value})} 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white shadow-sm transition-all duration-200" 
              required 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <i className="fas fa-calendar-check text-slate-600 mr-2"></i>
              Tanggal Selesai
            </label>
            <input 
              type="date" 
              value={formData.tanggal_selesai} 
              onChange={(e) => setFormData({...formData, tanggal_selesai: e.target.value})} 
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-slate-500 focus:border-slate-500 bg-white shadow-sm transition-all duration-200" 
              required 
            />
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
                    <i className="fas fa-times"></i>
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
                        {allBidangList.map(b => (
                          <option key={b.id} value={b.id}>{b.nama}</option>
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
                              {allPersonilByBidang[item.id_bidang] && allPersonilByBidang[item.id_bidang].map(p => (
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
                            >
                              <i className="fas fa-times"></i>
                            </button>
                          )}
                        </div>
                      ))}
                      <button 
                        type="button" 
                        onClick={() => addPersonilSelect(index)} 
                        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
                      >
                        <i className="fas fa-plus"></i>
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
            onClick={onClose} 
            className="flex-1 sm:flex-none px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <i className="fas fa-times mr-2"></i>
            Batal
          </button>
          <button 
            type="submit" 
            className="flex-1 px-8 py-3 bg-gradient-to-r from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
          >
            <i className="fas fa-save mr-2"></i>
            {initialKegiatan ? 'Perbarui Kegiatan' : 'Simpan Kegiatan'}
          </button>
        </div>
        </form>
      </div>
    </div>
  );
};

export default KegiatanForm;