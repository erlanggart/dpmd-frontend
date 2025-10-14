import React, { useState, useEffect } from 'react';
import { FiArrowLeft, FiUser, FiUsers, FiBriefcase, FiCalendar, FiMapPin, FiDollarSign } from 'react-icons/fi';
import api from '../../../api';

const DetailLengkap = ({ perjadinId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailData, setDetailData] = useState(null);

  useEffect(() => {
    if (perjadinId) {
      fetchDetailData();
    }
  }, [perjadinId]);

  const fetchDetailData = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching detail data for ID:', perjadinId);
      const response = await api.get(`/perjadin/kegiatan/${perjadinId}`);
      console.log('API Response:', response.data);
      
      if (response.data?.success) {
        const data = response.data.data;
        console.log('Detail data:', data);
        console.log('Bidang data:', data.bidang);
        console.log('Personil data:', data.personil);
        
        // Pastikan bidang dan personil selalu array
        data.bidang = data.bidang || [];
        data.personil = data.personil || [];
        
        setDetailData(data);
      } else {
        setError(response.data?.message || 'Data tidak ditemukan');
      }
    } catch (error) {
      console.error('Error fetching detail data:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Jika ada error, tetap tampilkan form dengan data kosong untuk debug
      if (error.response?.status === 500) {
        setError('Server mengalami masalah. Menampilkan template untuk debug.');
        setDetailData({
          id_kegiatan: perjadinId,
          nama_kegiatan: 'Debug Mode - Kegiatan Test',
          nomor_surat: 'DEBUG-001',
          tanggal_kegiatan: '2025-10-15',
          lokasi: 'Debug Location',
          keterangan: 'Mode debug untuk testing UI',
          status: 'debug',
          total_anggaran: 1000000,
          bidang: [
            {
              id_bidang: 1,
              nama_bidang: 'Bidang Test 1',
              status: 'aktif'
            },
            {
              id_bidang: 2, 
              nama_bidang: 'Bidang Test 2',
              status: 'aktif'
            }
          ],
          personil: [
            {
              nama: 'John Doe',
              jabatan: 'Staff Test',
              nip: '123456789',
              golongan: 'III/a',
              status: 'active',
              bidang: 'Bidang Test 1'
            },
            {
              nama: 'Jane Smith',
              jabatan: 'Coordinator Test',
              nip: '987654321',
              golongan: 'III/b',
              status: 'active',
              bidang: 'Bidang Test 2'
            }
          ]
        });
      } else {
        setError(error.response?.data?.message || 'Gagal memuat data detail');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
            </div>
            <p className="text-center text-slate-600 mt-4">Memuat data detail...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Terjadi Kesalahan</h3>
              <p className="text-slate-600 mb-6">{error}</p>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors duration-200"
              >
                <FiArrowLeft className="w-4 h-4" />
                Kembali
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!detailData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="text-slate-400 text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Data Tidak Ditemukan</h3>
              <p className="text-slate-600 mb-6">Data perjalanan dinas tidak dapat ditemukan</p>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors duration-200"
              >
                <FiArrowLeft className="w-4 h-4" />
                Kembali
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 bg-white rounded-lg shadow-sm border border-slate-200 hover:border-slate-300 transition-all duration-200"
          >
            <FiArrowLeft className="w-4 h-4" />
            Kembali ke Daftar
          </button>
        </div>

        {/* Detail Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header Card */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/20 p-2 rounded-lg">
                <FiBriefcase className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold">Detail Perjalanan Dinas</h1>
            </div>
            <p className="text-blue-100">
              {detailData.nomor_surat || 'Nomor surat belum tersedia'}
            </p>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <FiCalendar className="w-5 h-5 text-blue-600" />
                  Informasi Kegiatan
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Nama Kegiatan</label>
                    <p className="text-slate-800 font-medium">{detailData.nama_kegiatan || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Tanggal Kegiatan</label>
                    <p className="text-slate-800">{detailData.tanggal_kegiatan || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Lokasi</label>
                    <p className="text-slate-800">{detailData.lokasi || '-'}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <FiDollarSign className="w-5 h-5 text-green-600" />
                  Informasi Anggaran
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Total Anggaran</label>
                    <p className="text-slate-800 font-medium">
                      {detailData.total_anggaran ? `Rp ${new Intl.NumberFormat('id-ID').format(detailData.total_anggaran)}` : '-'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">Status</label>
                    <span className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
                      detailData.status === 'approved' ? 'bg-green-100 text-green-800' :
                      detailData.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      detailData.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {detailData.status || 'Belum Ditentukan'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bidang Section */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
                <FiBriefcase className="w-5 h-5 text-purple-600" />
                Bidang Terkait ({detailData.bidang ? detailData.bidang.length : 0} bidang)
              </h3>
              <div className="bg-slate-50 rounded-lg p-4">
                {detailData.bidang && detailData.bidang.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {detailData.bidang.map((bidang, index) => (
                      <div key={index} className="bg-white p-3 rounded-lg border border-slate-200">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                          <span className="text-slate-800 font-medium">{bidang.nama_bidang || 'Nama tidak tersedia'}</span>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          ID: <span className="font-medium">{bidang.id_bidang || '-'}</span>
                        </p>
                        <p className="text-sm text-slate-500">
                          Status: <span className="font-medium">{bidang.status || 'Aktif'}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-slate-400 text-4xl mb-2">🏢</div>
                    <p className="text-slate-500">Belum ada bidang yang terkait dengan kegiatan ini</p>
                    <p className="text-sm text-slate-400 mt-1">Data bidang akan muncul setelah form diisi dengan lengkap</p>
                  </div>
                )}
              </div>
            </div>

            {/* Personil Section */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
                <FiUsers className="w-5 h-5 text-blue-600" />
                Personil Yang Terlibat ({detailData.personil ? detailData.personil.length : 0} orang)
              </h3>
              <div className="bg-slate-50 rounded-lg p-4">
                {detailData.personil && detailData.personil.length > 0 ? (
                  <div className="space-y-3">
                    {detailData.personil.map((person, index) => (
                      <div key={index} className="bg-white p-4 rounded-lg border border-slate-200">
                        <div className="flex items-start gap-4">
                          <div className="bg-blue-100 p-2 rounded-full">
                            <FiUser className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold text-slate-800">{person.nama || 'Nama tidak tersedia'}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                              <div>
                                <p className="text-sm text-slate-500">Jabatan</p>
                                <p className="text-slate-700">{person.jabatan || '-'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-slate-500">NIP</p>
                                <p className="text-slate-700">{person.nip || '-'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-slate-500">Golongan</p>
                                <p className="text-slate-700">{person.golongan || '-'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-slate-500">Bidang</p>
                                <p className="text-slate-700">{person.bidang || '-'}</p>
                              </div>
                              <div>
                                <p className="text-sm text-slate-500">Status</p>
                                <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                                  person.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {person.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-slate-400 text-4xl mb-2">👥</div>
                    <p className="text-slate-500">Belum ada personil yang ditugaskan untuk kegiatan ini</p>
                    <p className="text-sm text-slate-400 mt-1">Data personil akan muncul setelah penugasan dilakukan</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailLengkap;
