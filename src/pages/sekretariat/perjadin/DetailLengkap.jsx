import React, { useState, useEffect } from 'react';
import { FiArrowLeft, FiUser, FiUsers, FiBriefcase, FiCalendar, FiMapPin } from 'react-icons/fi';
import api from '../../../api';

const DetailLengkap = ({ perjadinId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailData, setDetailData] = useState(null);

  // Helper function to format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString; // fallback to original string if parsing fails
    }
  };

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
      
      if (response.data?.status === 'success') {
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
              bidang: 'Bidang Test 1'
            },
            {
              nama: 'Jane Smith',
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-center space-y-4">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-slate-700"></div>
            </div>
            <p className="text-center text-slate-600 mt-4">Memuat data detail...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Terjadi Kesalahan</h3>
              <p className="text-slate-600 mb-6">{error}</p>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors duration-200"
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
        <div className="container mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <div className="text-slate-400 text-6xl mb-4">📄</div>
              <h3 className="text-xl font-semibold text-slate-800 mb-2">Data Tidak Ditemukan</h3>
              <p className="text-slate-600 mb-6">Data perjalanan dinas tidak dapat ditemukan</p>
              <button
                onClick={onBack}
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-700 text-white rounded-lg hover:bg-slate-800 transition-colors duration-200"
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200">
      <div className="container mx-auto px-4 py-8">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 bg-white rounded-lg shadow-sm border border-slate-200 hover:border-slate-300 transition-all duration-200 mb-6"
        >
          <FiArrowLeft className="w-4 h-4" />
          Kembali ke Daftar
        </button>

        {/* Main Detail Container */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-8 py-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-white/20 p-2 rounded-lg">
                <FiBriefcase className="w-6 h-6" />
              </div>
              <h1 className="text-2xl font-bold">Detail Perjalanan Dinas</h1>
            </div>
            <p className="text-slate-200">{detailData.nomor_surat || 'Nomor surat belum tersedia'}</p>
          </div>

          {/* Content - All in One Container */}
          <div className="p-8 space-y-8">
            
            {/* Informasi Kegiatan */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
                <FiCalendar className="w-5 h-5 text-slate-700" />
                Informasi Kegiatan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">Nama Kegiatan</label>
                  <p className="text-slate-800 font-medium bg-slate-50 p-3 rounded-lg">{detailData.nama_kegiatan || '-'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">Lokasi</label>
                  <p className="text-slate-800 bg-slate-50 p-3 rounded-lg flex items-center gap-2">
                    <FiMapPin className="w-4 h-4 text-slate-600" />
                    {detailData.lokasi || '-'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">Tanggal Mulai</label>
                  <p className="text-slate-800 bg-slate-50 p-3 rounded-lg">{formatDate(detailData.tanggal_mulai)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-500 mb-2">Tanggal Selesai</label>
                  <p className="text-slate-800 bg-slate-50 p-3 rounded-lg">{formatDate(detailData.tanggal_selesai)}</p>
                </div>
              </div>
            </div>

            {/* Bidang Terkait */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
                <FiBriefcase className="w-5 h-5 text-slate-700" />
                Bidang Terkait ({detailData.bidang ? detailData.bidang.length : 0} bidang)
              </h3>
              {detailData.bidang && detailData.bidang.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {detailData.bidang.map((bidang, index) => (
                    <div key={index} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-slate-600 rounded-full"></div>
                        <span className="text-slate-800 font-medium">{bidang.nama_bidang || 'Nama tidak tersedia'}</span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">Status: {bidang.status || 'Aktif'}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <div className="text-slate-400 text-4xl mb-2">🏢</div>
                  <p className="text-slate-500">Belum ada bidang yang terkait dengan kegiatan ini</p>
                </div>
              )}
            </div>

            {/* Personil Yang Terlibat */}
            <div>
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
                <FiUsers className="w-5 h-5 text-slate-700" />
                Personil Yang Terlibat ({detailData.personil ? detailData.personil.length : 0} orang)
              </h3>
              {detailData.personil && detailData.personil.length > 0 ? (
                <div className="space-y-3">
                  {detailData.personil.map((person, index) => (
                    <div key={index} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-slate-600 text-white p-2 rounded-full">
                            <FiUser className="w-4 h-4" />
                          </div>
                          <span className="font-semibold text-slate-800">{person.nama || 'Nama tidak tersedia'}</span>
                        </div>
                        <span className="inline-flex px-3 py-1 rounded-full text-sm font-medium bg-slate-600 text-white">
                          {person.bidang || 'Bidang tidak diketahui'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-lg">
                  <div className="text-slate-400 text-4xl mb-2">👥</div>
                  <p className="text-slate-500">Belum ada personil yang ditugaskan untuk kegiatan ini</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailLengkap;
