import React, { useState, useEffect } from 'react';
import { FiBarChart2, FiList, FiTrendingUp, FiCalendar } from 'react-icons/fi';
import api from "../../../../api";

const PerjadinDashboardModern = () => {
  const [data, setData] = useState({
    mingguan: 0,
    bulanan: 0,
    per_bidang: [],
    tahunan: 0
  });
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/perjadin/dashboard');
        setData({
          ...response.data,
          tahunan: response.data.mingguan * 52
        });
      } catch (err) {
        setError('Gagal memuat data dashboard');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    const fetchWeeklySchedule = async () => {
      try {
        const response = await api.get('/perjadin/dashboard/weekly-schedule');
        setWeeklySchedule(response.data || []);
      } catch (err) {
        console.error('Failed to fetch weekly schedule:', err);
      }
    };

    fetchDashboardData();
    fetchWeeklySchedule();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat data perjalanan dinas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard Perjalanan Dinas</h1>
        <p className="text-gray-600">Sistem Manajemen Perjalanan Dinas</p>
      </div>

      {/* Grid 2x2 Dashboard Layout */}
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Card 1: Statistik Kegiatan */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Statistik Kegiatan</h2>
              <FiBarChart2 className="w-6 h-6 text-blue-600" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{data.mingguan}</div>
                <div className="text-sm text-gray-600">Minggu Ini</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{data.bulanan}</div>
                <div className="text-sm text-gray-600">Bulan Ini</div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{data.tahunan}</div>
                <div className="text-sm text-gray-600">Perkiraan Tahunan</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{data.per_bidang.length}</div>
                <div className="text-sm text-gray-600">Total Bidang</div>
              </div>
            </div>
          </div>

          {/* Card 2: Kegiatan Per Bidang */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Kegiatan Per Bidang</h2>
              <FiTrendingUp className="w-6 h-6 text-green-600" />
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {data.per_bidang.map((bidang, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <span className="font-medium text-gray-700">{bidang.bidang}</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm font-semibold">{bidang.total}</span>
                </div>
              ))}
              {data.per_bidang.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Belum ada data kegiatan per bidang</p>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Kalender Mingguan */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Kalender Mingguan</h2>
              <FiCalendar className="w-6 h-6 text-purple-600" />
            </div>
            
            <div className="space-y-3">
              {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'].map((hari, index) => {
                const hariKegiatan = weeklySchedule.filter(schedule => {
                  const scheduleDay = new Date(schedule.tanggal_mulai).getDay();
                  return scheduleDay === (index + 1) % 7;
                }).length;
                
                return (
                  <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <span className="font-medium text-gray-700">{hari}</span>
                    <span className={`px-2 py-1 rounded-full text-sm font-semibold ${
                      hariKegiatan > 0 ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {hariKegiatan} kegiatan
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Card 4: Detail Kegiatan */}
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">Detail Kegiatan</h2>
              <FiList className="w-6 h-6 text-orange-600" />
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {weeklySchedule.slice(0, 5).map((kegiatan, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{kegiatan.nama_kegiatan || 'Kegiatan tidak tersedia'}</div>
                    <div className="text-sm text-gray-500">{kegiatan.lokasi || 'Lokasi tidak tersedia'}</div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs text-gray-500">
                      {new Date(kegiatan.tanggal_mulai).toLocaleDateString()}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                      {kegiatan.status || 'Status tidak tersedia'}
                    </span>
                  </div>
                </div>
              ))}
              {weeklySchedule.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>Tidak ada kegiatan yang dijadwalkan</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerjadinDashboardModern;
