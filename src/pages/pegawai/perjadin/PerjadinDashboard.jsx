import { useState, useEffect, useRef, useCallback } from 'react';
import { CalendarIcon, UsersIcon, BriefcaseIcon, ClockIcon, MapPin, ChevronLeft, ChevronRight, Play, Pause } from 'lucide-react';
import perjadinService from '../../../services/perjadinService';
import toast from 'react-hot-toast';

function PerjadinDashboard({ onBidangClick }) {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [isAutoTransition, setIsAutoTransition] = useState(true);
  const [animating, setAnimating] = useState(false);
  const autoTransitionRef = useRef(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Auto-transition effect for calendar
  useEffect(() => {
    if (isAutoTransition && dashboardData) {
      autoTransitionRef.current = setInterval(() => {
        setAnimating(true);
        setTimeout(() => {
          setSelectedDayIndex(prev => (prev + 1) % 7);
          setAnimating(false);
        }, 300);
      }, 4000);
    }

    return () => {
      if (autoTransitionRef.current) {
        clearInterval(autoTransitionRef.current);
      }
    };
  }, [isAutoTransition, dashboardData]);

  const handleDayClick = useCallback((index) => {
    setIsAutoTransition(false);
    setAnimating(true);
    setTimeout(() => {
      setSelectedDayIndex(index);
      setAnimating(false);
    }, 150);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await perjadinService.getDashboard();

      if (response.data.success) {
        setDashboardData(response.data.data);
      } else {
        throw new Error(response.data.message || 'Gagal memuat data dashboard');
      }
    } catch (err) {
      console.error('Error fetching dashboard:', err);
      setError(err.response?.data?.message || err.message || 'Gagal memuat data dashboard');
      toast.error('Gagal memuat data dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Format upcoming kegiatan by date for calendar
  const getWeekDays = () => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const weekDays = getWeekDays();

  const getKegiatanForDate = (date) => {
    if (!dashboardData?.upcoming_kegiatan) return [];

    return dashboardData.upcoming_kegiatan.filter(k => {
      const kegiatanDate = new Date(k.tanggal_mulai);
      return kegiatanDate.toDateString() === date.toDateString();
    });
  };

  const formatDate = (date) => {
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    return {
      day: days[date.getDay()],
      dayFull: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][date.getDay()],
      date: date.getDate(),
      month: date.getMonth() + 1,
      monthName: months[date.getMonth()],
      year: date.getFullYear()
    };
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const selectedDay = weekDays[selectedDayIndex];
  const selectedDayFormatted = selectedDay ? formatDate(selectedDay) : null;
  const selectedDayKegiatan = selectedDay ? getKegiatanForDate(selectedDay) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <p className="text-gray-700 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Badge */}
      <div className="bg-[#2C3E50] px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <h2 className="text-xl font-bold text-white">Dashboard</h2>
        </div>
        <span className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded">Aktif</span>
      </div>

      <div className="p-3 md:p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
          {/* Total Kegiatan - Dark Blue */}
          <div className="bg-[#3D4E5F] rounded-lg shadow-md p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-[#2C3E50] p-1.5 md:p-2 rounded">
                    <BriefcaseIcon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <span className="text-white text-2xl md:text-4xl font-bold">
                    {dashboardData?.total || 0}
                  </span>
                </div>
                <p className="text-gray-300 text-xs md:text-sm font-medium">Total Kegiatan</p>
                <p className="text-gray-400 text-[10px] md:text-xs mt-1">● Semua periode</p>
              </div>
            </div>
          </div>

          {/* Kegiatan Minggu Ini - Dark Blue */}
          <div className="bg-[#3D4E5F] rounded-lg shadow-md p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-[#2C3E50] p-1.5 md:p-2 rounded">
                    <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <span className="text-white text-2xl md:text-4xl font-bold">
                    {dashboardData?.minggu_ini || 0}
                  </span>
                </div>
                <p className="text-gray-300 text-xs md:text-sm font-medium">Kegiatan Minggu</p>
                <p className="text-gray-400 text-[10px] md:text-xs mt-1">● 7 hari terakhir</p>
              </div>
            </div>
          </div>

          {/* Kegiatan Bulan Ini - Dark Blue */}
          <div className="bg-[#3D4E5F] rounded-lg shadow-md p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-[#2C3E50] p-1.5 md:p-2 rounded">
                    <ClockIcon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <span className="text-white text-2xl md:text-4xl font-bold">
                    {dashboardData?.bulan_ini || 0}
                  </span>
                </div>
                <p className="text-gray-300 text-xs md:text-sm font-medium">Kegiatan Bulanan</p>
                <p className="text-gray-400 text-[10px] md:text-xs mt-1">● 30 hari terakhir</p>
              </div>
            </div>
          </div>

          {/* Total Pegawai - Green */}
          <div className="bg-[#27AE60] rounded-lg shadow-md p-3 md:p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <div className="bg-[#229954] p-1.5 md:p-2 rounded">
                    <UsersIcon className="w-4 h-4 md:w-5 md:h-5 text-white" />
                  </div>
                  <span className="text-white text-2xl md:text-4xl font-bold">
                    {dashboardData?.total_pegawai || 0}
                  </span>
                </div>
                <p className="text-white text-xs md:text-sm font-medium">Total Pegawai</p>
                <p className="text-green-100 text-[10px] md:text-xs mt-1">● Yang terlibat</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Kegiatan Per Bidang */}
          <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-base md:text-lg font-bold text-gray-800">Kegiatan Per Bidang</h2>
              <span className="ml-auto text-xs md:text-sm text-gray-500 hidden sm:block">{dashboardData?.breakdown_per_bidang?.length || 0} Bidang Terlibat</span>
            </div>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {dashboardData?.breakdown_per_bidang && dashboardData.breakdown_per_bidang.length > 0 ? (
                dashboardData.breakdown_per_bidang.map((bidang, index) => (
                  <div 
                    key={index} 
                    onClick={() => {
                      const bidangId = String(bidang.id_bidang);
                      console.log('Bidang clicked:', bidangId, bidang.nama, 'full data:', bidang);
                      onBidangClick && onBidangClick(bidangId);
                    }}
                    className="group hover:bg-gray-50 p-3 rounded-lg transition cursor-pointer"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-[#2C3E50] rounded flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{bidang.nama}</p>
                        <p className="text-xs text-gray-500">Bidang Kerja • {bidang.jumlah} Kegiatan</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="bg-[#2C3E50] text-white px-3 py-1 rounded-full flex items-center gap-1">
                          <span className="text-sm font-bold">{bidang.jumlah}</span>
                        </div>
                        <button className="w-8 h-8 rounded-full bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center transition">
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-40 flex items-center justify-center text-gray-500">
                  <p>Belum ada data kegiatan</p>
                </div>
              )}
            </div>
          </div>

          {/* Kalender Mingguan with Auto-Transition */}
          <div className="bg-white rounded-xl shadow-md p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4 md:mb-6">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center flex-shrink-0">
                <CalendarIcon className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-base md:text-lg font-bold text-gray-800">Kalender Mingguan</h2>
              <div className="ml-auto flex items-center gap-2">
                <button
                  onClick={() => setIsAutoTransition(!isAutoTransition)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    isAutoTransition
                      ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {isAutoTransition ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  <span>{isAutoTransition ? 'Auto' : 'Manual'}</span>
                </button>
              </div>
            </div>

            {/* Week Days Grid with Selection */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-4">
              {weekDays.map((day, index) => {
                const formatted = formatDate(day);
                const kegiatanList = getKegiatanForDate(day);
                const isToday = day.toDateString() === new Date().toDateString();
                const isSelected = index === selectedDayIndex;

                return (
                  <button
                    key={index}
                    onClick={() => handleDayClick(index)}
                    className={`relative text-center p-1.5 sm:p-3 rounded-lg transition-all duration-300 transform ${
                      isSelected
                        ? 'bg-[#2C3E50] text-white scale-105 shadow-lg'
                        : isToday
                        ? 'bg-green-100 border-2 border-green-500 hover:scale-102'
                        : 'bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:scale-102'
                    }`}
                  >
                    <p className={`text-[10px] sm:text-xs font-medium ${
                      isSelected ? 'text-gray-300' : isToday ? 'text-green-700' : 'text-gray-600'
                    }`}>
                      {formatted.day}
                    </p>
                    <p className={`text-sm sm:text-lg font-bold mt-0.5 sm:mt-1 ${
                      isSelected ? 'text-white' : isToday ? 'text-green-700' : 'text-gray-800'
                    }`}>
                      {formatted.date}
                    </p>
                    <p className={`text-[10px] sm:text-xs ${
                      isSelected ? 'text-gray-400' : isToday ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {formatted.monthName}
                    </p>
                    {/* Kegiatan indicator */}
                    {kegiatanList.length > 0 && (
                      <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        isSelected ? 'bg-green-400 text-white' : 'bg-blue-500 text-white'
                      }`}>
                        {kegiatanList.length}
                      </div>
                    )}
                    {/* Today indicator dot */}
                    {isToday && !isSelected && (
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-green-500"></div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Auto-transition progress bar */}
            {isAutoTransition && (
              <div className="mb-4">
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-100"
                    style={{
                      width: '100%',
                      animation: 'shrink 4s linear infinite'
                    }}
                  />
                </div>
                <style>{`
                  @keyframes shrink {
                    from { width: 100%; }
                    to { width: 0%; }
                  }
                `}</style>
              </div>
            )}

            {/* Selected Day's Events */}
            <div className={`border-t pt-4 transition-opacity duration-300 ${animating ? 'opacity-0' : 'opacity-100'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#2C3E50]"></div>
                  <p className="text-sm font-semibold text-gray-700">
                    {selectedDayFormatted?.dayFull}, {selectedDayFormatted?.date} {selectedDayFormatted?.monthName} {selectedDayFormatted?.year}
                  </p>
                </div>
                <div className="flex gap-1">
                  {weekDays.map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full transition-all duration-300 ${
                        i === selectedDayIndex ? 'bg-[#2C3E50] scale-125' : 'bg-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Kegiatan List for Selected Day */}
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {selectedDayKegiatan.length > 0 ? (
                  selectedDayKegiatan.map((kegiatan, idx) => (
                    <div
                      key={kegiatan.id_kegiatan || idx}
                      className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg border-l-4 border-[#2C3E50] hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-gray-800 text-sm truncate">
                            {kegiatan.nama_kegiatan}
                          </h4>
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-3 mt-1">
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{kegiatan.lokasi || 'Lokasi TBD'}</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <ClockIcon className="w-3 h-3" />
                              <span>{formatTime(kegiatan.tanggal_mulai)}</span>
                            </div>
                          </div>
                        </div>
                        <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Aktif
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="h-32 flex flex-col items-center justify-center text-gray-400">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                      <CalendarIcon className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="font-semibold text-gray-600">Tidak Ada Kegiatan</p>
                    <p className="text-xs text-gray-400 mt-1 text-center">
                      Belum ada kegiatan yang dijadwalkan<br />untuk tanggal ini
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PerjadinDashboard;
