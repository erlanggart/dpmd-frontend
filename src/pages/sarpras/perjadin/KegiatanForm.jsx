import React, { useState, useEffect } from 'react';
import api from '../../../api';
import Swal from 'sweetalert2';
import './kegiatan.css';

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
        const bidangRes = await api.get('/bidang');
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
            const personilRes = await api.get(`/personil/${bidangId}`);
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
        const personilRes = await api.get(`/personil/${e.target.value}`);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.tanggal_mulai > formData.tanggal_selesai) {
      Swal.fire('Peringatan', 'Tanggal selesai tidak boleh lebih awal dari tanggal mulai.', 'warning');
      return;
    }

    try {
      let response;
      if (initialKegiatan) {
        response = await api.put(`/kegiatan/${initialKegiatan.id_kegiatan}`, formData);
      } else {
        response = await api.post('/kegiatan', formData);
      }
      
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
    <div id="form-container" className="form-container">
      <h3 className="list-heading">Formulir Kegiatan</h3>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="nama_kegiatan" className="form-label"><i className="fas fa-pen-nib" style={{color: '#3b82f6', marginRight: '8px'}}></i> Nama Kegiatan</label>
          <input type="text" id="nama_kegiatan" name="nama_kegiatan" value={formData.nama_kegiatan} onChange={(e) => setFormData({...formData, nama_kegiatan: e.target.value})} className="form-input" required />
        </div>
        <div className="form-group">
          <label htmlFor="nomor_sp" className="form-label"><i className="fas fa-file-alt" style={{color: '#3b82f6', marginRight: '8px'}}></i> Nomor SP</label>
          <input type="text" id="nomor_sp" name="nomor_sp" value={formData.nomor_sp} onChange={(e) => setFormData({...formData, nomor_sp: e.target.value})} className="form-input" required />
        </div>
        <div className="form-group" style={{display: 'grid', gridTemplateColumns: '1fr', gap: '1rem'}}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr', gap: '1rem'}}>
            <div>
              <label htmlFor="tanggal_mulai" className="form-label"><i className="fas fa-calendar-alt" style={{color: '#3b82f6', marginRight: '8px'}}></i> Tanggal Mulai</label>
              <input type="date" id="tanggal_mulai" name="tanggal_mulai" value={formData.tanggal_mulai} onChange={(e) => setFormData({...formData, tanggal_mulai: e.target.value})} className="form-input" required />
            </div>
            <div>
              <label htmlFor="tanggal_selesai" className="form-label"><i className="fas fa-calendar-check" style={{color: '#3b82f6', marginRight: '8px'}}></i> Tanggal Selesai</label>
              <input type="date" id="tanggal_selesai" name="tanggal_selesai" value={formData.tanggal_selesai} onChange={(e) => setFormData({...formData, tanggal_selesai: e.target.value})} className="form-input" required />
            </div>
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="lokasi" className="form-label"><i className="fas fa-map-marker-alt" style={{color: '#3b82f6', marginRight: '8px'}}></i> Tempat Kegiatan</label>
          <input type="text" id="lokasi" name="lokasi" value={formData.lokasi} onChange={(e) => setFormData({...formData, lokasi: e.target.value})} className="form-input" required />
        </div>
        <div className="form-group">
          <label className="form-label"><i className="fas fa-users-cog" style={{color: '#3b82f6', marginRight: '8px'}}></i> Bidang & Personil</label>
          <div id="bidang-container" style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
            {formData.personil_bidang_list.map((item, index) => (
              <div key={index} style={{backgroundColor: '#f9fafb', padding: '1rem', borderRadius: '0.5rem', border: '1px solid #e5e7eb', marginBottom: '1rem', position: 'relative'}}>
                {formData.personil_bidang_list.length > 1 && (
                  <button type="button" onClick={() => removeBidangGroup(index)} style={{position: 'absolute', top: '0.5rem', right: '0.5rem', color: '#ef4444', fontWeight: 'bold', border: 'none', background: 'transparent', cursor: 'pointer'}} title="Hapus Bidang">
                    <i className="fas fa-times"></i>
                  </button>
                )}
                <div className="form-group">
                  <label className="form-label">Bidang</label>
                  <select
                    name="id_bidang"
                    className="form-select"
                    value={item.id_bidang}
                    onChange={(e) => handleBidangChange(index, e)}
                    required
                  >
                    <option value="">Pilih Bidang</option>
                    {allBidangList.map(b => (
                      <option key={b.id} value={b.id}>{b.nama}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Personil</label>
                  <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
                    {item.personil.map((personilName, personilIndex) => (
                      <div key={personilIndex} style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                        <select
                          name="personil"
                          className="form-select"
                          value={personilName}
                          onChange={(e) => handlePersonilChange(index, personilIndex, e)}
                          required
                        >
                          <option value="">Pilih Personil</option>
                          {allPersonilByBidang[item.id_bidang] && allPersonilByBidang[item.id_bidang].map(p => (
                            <option key={p.id_personil} value={p.nama_personil}>{p.nama_personil}</option>
                          ))}
                        </select>
                        {item.personil.length > 1 && (
                          <button type="button" onClick={() => removePersonilSelect(index, personilIndex)} className="btn-remove-personil">
                            <i className="fas fa-times"></i>
                          </button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => addPersonilSelect(index)} className="btn-add-personil">
                      <i className="fas fa-plus"></i> Tambah Personil
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={addBidangGroup} className="btn-add-personil" style={{marginTop: '0.5rem'}}>
            <i className="fas fa-plus-circle"></i> Tambah Bidang
          </button>
        </div>
        <div className="form-group">
          <label htmlFor="keterangan" className="form-label"><i className="fas fa-info-circle" style={{color: '#3b82f6', marginRight: '8px'}}></i> Keterangan</label>
          <textarea id="keterangan" placeholder="Dihadiri Kepala Dinas" name="keterangan" value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} className="form-textarea"></textarea>
        </div>
        <div className="form-actions">
          <button type="button" onClick={onClose} className="btn-cancel">
            Batal
          </button>
          <button type="submit" className="btn-submit">
            {initialKegiatan ? 'Perbarui Kegiatan' : 'Simpan Kegiatan'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default KegiatanForm;