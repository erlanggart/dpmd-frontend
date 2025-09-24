import React, { useState, useEffect, useRef } from 'react';
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

  @keyframes slideInRight {
    0% {
      opacity: 0;
      transform: translateX(30px);
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

  .animate-fade-in {
    animation: fadeInUp 0.6s ease-out;
  }

  .animate-slide-in-right {
    animation: slideInRight 0.8s ease-out;
  }

  .animate-pulse-hover:hover {
    animation: pulse 0.6s ease-in-out;
  }

  .gradient-dark-blue {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
  }

  .gradient-light-blue {
    background: linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 50%, #81d4fa 100%);
  }

  .gradient-darker-blue {
    background: linear-gradient(135deg, #0c1420 0%, #1e293b 50%, #475569 100%);
  }

  .dark-blue-shadow {
    box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.3), 0 10px 10px -5px rgba(15, 23, 42, 0.1);
  }

  .scrollbar-thin::-webkit-scrollbar {
    display: none;
  }

  .scrollbar-thin {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  /* Optimasi untuk Video Tron */
  .video-tron-optimized {
    font-size: 0.75rem;
    line-height: 1.2;
  }

  .compact-layout {
    padding: 0.25rem;
    margin: 0.125rem;
  }
`;

// Inject styles
const styleSheet = document.createElement("style");
styleSheet.textContent = styles;
document.head.appendChild(styleSheet);

const Dashboard = ({ onFilterClick }) => {
  const [data, setData] = useState({
    mingguan: 0,
    bulanan: 0,
    per_bidang: [],
  });
  const [weeklySchedule, setWeeklySchedule] = useState([]);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0); 
  const [activeActivityIndex, setActiveActivityIndex] = useState(0);
  const [isActivityTransitioning, setIsActivityTransitioning] = useState(false);
  const [isDayTransitioning, setIsDayTransitioning] = useState(false);

  const activityCarouselIntervalRef = useRef(null);
  const dayTransitionIntervalRef = useRef(null);

  const activityTransitionDuration = 500; // Durasi animasi per kegiatan
  const dayTransitionDuration = 500; // Durasi animasi per hari
  const activityDisplayDuration = 5000; // Waktu tampil per kegiatan
  const extraDelay = 1500; // Jeda tambahan sebelum transisi hari

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/perjadin/dashboard');
        setData(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        // Set default data as fallback
        setData({
          mingguan: 0,
          bulanan: 0,
          per_bidang: [],
        });
        // Only show error if it's not a timeout
        if (error.code !== 'ECONNABORTED') {
          Swal.fire('Error', 'Gagal memuat data dashboard.', 'error');
        }
      }
    };
    fetchDashboardData();
  }, []);
  
  useEffect(() => {
    const fetchWeeklySchedule = async () => {
      try {
        const response = await api.get('/perjadin/dashboard/weekly-schedule');
        setWeeklySchedule(response.data);
      } catch (error) {
        console.error('Failed to fetch weekly schedule', error);
        // Set empty array as fallback
        setWeeklySchedule([]);
      }
    };
    fetchWeeklySchedule();
  }, []);

  // Logika carousel kegiatan
  useEffect(() => {
    if (activityCarouselIntervalRef.current) {
      clearInterval(activityCarouselIntervalRef.current);
    }
    const selectedDay = weeklySchedule[selectedDayIndex];
    if (selectedDay && selectedDay.kegiatan && selectedDay.kegiatan.length > 1) {
      activityCarouselIntervalRef.current = setInterval(() => {
        setIsActivityTransitioning(true);
        setTimeout(() => {
          setActiveActivityIndex(prevIndex => (prevIndex + 1) % selectedDay.kegiatan.length);
          setIsActivityTransitioning(false);
        }, activityTransitionDuration);
      }, activityDisplayDuration); 
    } else {
      setActiveActivityIndex(0);
      setIsActivityTransitioning(false);
    }

    return () => {
      if (activityCarouselIntervalRef.current) {
        clearInterval(activityCarouselIntervalRef.current);
      }
    };
  }, [weeklySchedule, selectedDayIndex]);

  // Logika transisi hari otomatis
  useEffect(() => {
    if (dayTransitionIntervalRef.current) {
      clearInterval(dayTransitionIntervalRef.current);
    }

    const selectedDay = weeklySchedule[selectedDayIndex];
    if (selectedDay && weeklySchedule.length > 1) {
      const totalActivities = selectedDay.kegiatan.length;
      const totalTimeForDay = (totalActivities > 0 ? totalActivities : 1) * activityDisplayDuration;

      dayTransitionIntervalRef.current = setInterval(() => {
        setIsDayTransitioning(true);
        setTimeout(() => {
          setSelectedDayIndex(prevIndex => (prevIndex + 1) % weeklySchedule.length);
          setActiveActivityIndex(0);
          setIsDayTransitioning(false);
        }, dayTransitionDuration);
      }, totalTimeForDay + extraDelay);
    }

    return () => {
      if (dayTransitionIntervalRef.current) {
        clearInterval(dayTransitionIntervalRef.current);
      }
    };
  }, [weeklySchedule, selectedDayIndex]);

  const renderPersonilList = (personilString) => {
    if (!personilString) return <p className="text-gray-600 text-sm">Tidak ada personel.</p>;
    
    const personilNames = personilString.split(',').map(name => name.trim()).filter(Boolean);

    return (
      <ul className="list-disc list-inside">
        {personilNames.map((person, index) => (
          <li key={index}>{person}</li>
        ))}
      </ul>
    );
  };

  const selectedDay = weeklySchedule[selectedDayIndex];

  return (
    <div className="animate-fade-in min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl mb-6">
            <i className="fas fa-tachometer-alt text-3xl text-white"></i>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">
            Dashboard Perjadin
          </h1>
          <div className="w-32 h-1 bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 mx-auto rounded-full"></div>
          <p className="text-gray-600 mt-4 text-lg flex items-center justify-center gap-2">
            <i className="fas fa-chart-bar text-slate-600"></i>
            Ringkasan dan Jadwal Kegiatan Perjalanan Dinas
          </p>
        </div>
        
        {/* Dashboard Summary Grid - Card Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mb-8">
          {/* Card Gabungan Minggu & Bulan Ini */}
          <div className="relative bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200">
            <div className="absolute inset-0 gradient-darker-blue opacity-90 rounded-xl"></div>
            <div className="relative z-10 p-4 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="bg-white/20 backdrop-blur-sm p-2 rounded-lg border border-white/10">
                    <i className="fas fa-calendar-alt text-base text-white"></i>
                  </div>
                  <h4 className="text-sm font-bold text-white">
                    Statistik Kegiatan
                  </h4>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Minggu Ini */}
                <div 
                  className="bg-white/10 backdrop-blur-sm rounded-lg p-3 cursor-pointer hover:bg-white/20 transition-all duration-200"
                  onClick={() => onFilterClick('mingguan')}
                >
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <i className="fas fa-calendar-week text-lg text-white/80"></i>
                    </div>
                    <p className="text-2xl font-bold mb-1">{data.mingguan}</p>
                    <p className="text-xs text-slate-300 font-medium">Minggu Ini</p>
                  </div>
                </div>

                {/* Bulan Ini */}
                <div 
                  className="bg-white/10 backdrop-blur-sm rounded-lg p-3 cursor-pointer hover:bg-white/20 transition-all duration-200"
                  onClick={() => onFilterClick('bulanan')}
                >
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      <i className="fas fa-calendar text-lg text-white/80"></i>
                    </div>
                    <p className="text-2xl font-bold mb-1">{data.bulanan}</p>
                    <p className="text-xs text-slate-300 font-medium">Bulan Ini</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card Per Bidang - Diperkecil */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
            <div className="gradient-darker-blue p-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <div className="bg-white/20 backdrop-blur-sm p-1 rounded border border-white/10">
                  <i className="fas fa-sitemap text-white text-xs"></i>
                </div>
                <span className="flex items-center gap-2">
                  Kegiatan Per Bidang
                </span>
              </h4>
            </div>
            <div className="p-3" style={{ height: 'auto', maxHeight: 'none', overflow: 'visible' }}>
              <div className="space-y-1">
                {data.per_bidang.map((b, index) => (
                  <div 
                    key={b.id_bidang} 
                    className="group flex items-center justify-between p-2 bg-gradient-to-r from-slate-50 to-slate-100 hover:from-slate-100 hover:to-slate-200 rounded-lg transition-all duration-300 cursor-pointer border border-slate-200 hover:border-slate-300 hover:shadow-sm transform hover:scale-[1.01]"
                    onClick={() => onFilterClick('', b.id_bidang)}
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-br from-slate-600 to-slate-800 rounded flex items-center justify-center shadow-sm">
                        <i className="fas fa-building text-white text-xs"></i>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-gray-800 group-hover:text-slate-800 transition-colors duration-300 text-xs leading-tight">
                          {b.nama_bidang}
                        </span>
                        <span className="text-xs text-gray-600">
                          Bidang Kerja
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white px-2 py-1 rounded text-xs font-bold shadow-sm group-hover:from-slate-800 group-hover:to-slate-900 transition-all duration-300 flex items-center gap-1">
                        <i className="fas fa-clipboard-check text-xs"></i>
                        {b.total}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Jadwal Mingguan dan Carousel Kegiatan */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Bagian Kalender - diperkecil */}
          <div className="xl:col-span-1 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden animate-slide-in-right">
            <div className="gradient-darker-blue p-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <div className="bg-white/20 backdrop-blur-sm p-1 rounded border border-white/10">
                  <i className="fas fa-calendar-alt text-white text-xs"></i>
                </div>
                <span className="flex items-center gap-2">
                  Kalender Mingguan
                </span>
              </h4>
            </div>
            <div className="p-3">
              <div className="space-y-1 max-h-72 overflow-y-auto scrollbar-thin"
                   style={{
                     maxHeight: 'none',
                     height: 'auto'
                   }}>
                {weeklySchedule.length > 0 ? weeklySchedule.map((day, index) => (
                  <div 
                    key={day.tanggal} 
                    className={`group p-2 rounded-md cursor-pointer transition-all duration-300 border transform hover:scale-[1.01] ${
                      selectedDayIndex === index 
                        ? 'gradient-darker-blue text-white border-slate-600 shadow-md scale-[1.01]' 
                        : 'bg-gradient-to-r from-gray-50 to-slate-50 hover:from-slate-50 hover:to-slate-100 border-gray-200 hover:border-slate-300 hover:shadow-sm'
                    }`}
                    onClick={() => {
                      setSelectedDayIndex(index);
                      setActiveActivityIndex(0); 
                      clearInterval(activityCarouselIntervalRef.current);
                      clearInterval(dayTransitionIntervalRef.current);
                      setIsActivityTransitioning(false);
                      setIsDayTransitioning(false);
                    }}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1">
                        <div className={`w-6 h-6 rounded flex items-center justify-center ${
                          selectedDayIndex === index 
                            ? 'bg-white/20 backdrop-blur-sm' 
                            : 'bg-slate-100 group-hover:bg-slate-200'
                        }`}>
                          <i className={`fas fa-calendar-day text-xs ${
                            selectedDayIndex === index ? 'text-white' : 'text-slate-700'
                          }`}></i>
                        </div>
                        <div className="flex flex-col">
                          <div className={`font-bold text-xs ${selectedDayIndex === index ? 'text-white' : 'text-gray-800'}`}>
                            {day.hari}
                          </div>
                          <div className={`text-xs ${selectedDayIndex === index ? 'text-slate-200' : 'text-gray-600'}`}>
                            {new Date(day.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                          </div>
                        </div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 ${
                        selectedDayIndex === index 
                          ? 'bg-white/20 text-white' 
                          : 'bg-gradient-to-r from-slate-700 to-slate-900 text-white group-hover:from-slate-800'
                      }`}>
                        <span>{day.kegiatan?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-4">
                    <i className="fas fa-calendar-times text-lg text-gray-400 mb-1"></i>
                    <p className="text-gray-600 text-xs font-medium">Tidak ada jadwal tersedia</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Bagian Kegiatan - diperbesar */}
          <div className="xl:col-span-2 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="gradient-darker-blue p-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <div className="bg-white/20 backdrop-blur-sm p-1 rounded border border-white/10">
                  <i className="fas fa-clipboard-list text-white text-xs"></i>
                </div>
                <span className="flex items-center gap-2">
                  Detail Kegiatan
                </span>
              </h4>
            </div>
            <div className="p-4" style={{ height: 'auto', minHeight: 'fit-content' }}>
              {selectedDay ? (
                <div className={`transition-all duration-500 ${isDayTransitioning ? 'opacity-0 transform translate-y-4' : 'opacity-100 transform translate-y-0'}`}>
                  <div className="mb-3 p-2 bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-slate-200">
                    <h5 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                      <div className="w-5 h-5 bg-gradient-to-br from-slate-600 to-slate-800 rounded flex items-center justify-center">
                        <i className="fas fa-calendar-check text-white text-xs"></i>
                      </div>
                      <span className="text-xs">
                        {selectedDay.hari}, {new Date(selectedDay.tanggal).toLocaleDateString('id-ID', { 
                          day: '2-digit', 
                          month: 'long', 
                          year: 'numeric' 
                        })}
                      </span>
                    </h5>
                  </div>
                  
                  {/* Kontainer Carousel Kegiatan dengan Auto Height */}
                  <div className="relative mb-3" style={{ height: 'auto', minHeight: 'auto' }}>
                    {selectedDay.kegiatan && selectedDay.kegiatan.length > 0 ? (
                      selectedDay.kegiatan.map((keg, index) => (
                          <div 
                            key={keg.id_kegiatan || index}
                            className="w-full transition-all duration-500"
                            style={{
                              opacity: index === activeActivityIndex && !isActivityTransitioning ? 1 : 0,
                              display: index === activeActivityIndex && !isActivityTransitioning ? 'block' : 'none'
                            }}
                          >
                            <div className="gradient-darker-blue text-white p-3 rounded-lg shadow-lg relative overflow-hidden"
                                 style={{ height: 'auto', minHeight: 'auto' }}>
                              <div className="absolute top-1 right-1 w-8 h-8 bg-white/10 rounded-full blur-lg"></div>
                              <div className="absolute bottom-1 left-1 w-6 h-6 bg-white/10 rounded-full blur-md"></div>
                              
                              <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="bg-white/20 backdrop-blur-sm p-1 rounded border border-white/10">
                                    <i className="fas fa-briefcase text-xs"></i>
                                  </div>
                                  <h5 className="text-sm font-bold leading-tight">
                                    {keg.nama_kegiatan}
                                  </h5>
                                </div>
                                
                                <div className="bg-white/10 backdrop-blur-sm p-2 rounded mb-2 border border-white/10">
                                  <p className="text-slate-200 flex items-center gap-1 text-xs">
                                    <i className="fas fa-map-marker-alt text-xs"></i> 
                                    {keg.lokasi}
                                  </p>
                                </div>
                                
                                <div className="space-y-1">
                                  <h6 className="text-xs font-semibold text-slate-200 border-b border-white/20 pb-1">
                                    Peserta Kegiatan:
                                  </h6>
                                  <div className="max-h-none" style={{ height: 'auto' }}>
                                    {keg.details && keg.details.length > 0 ? (
                                      keg.details.map((detail, detailIndex) => (
                                        <div key={detailIndex} className="bg-white/10 backdrop-blur-sm p-1 rounded mb-1 border border-white/10">
                                          <div className="flex items-center gap-1 mb-1">
                                            <div className="w-2 h-2 bg-white rounded-full"></div>
                                            <span className="font-bold text-slate-200 text-xs">
                                              {detail.nama_bidang}
                                            </span>
                                          </div>
                                          <div className="ml-3 text-xs">
                                            {renderPersonilList(detail.personil)}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="bg-white/10 backdrop-blur-sm p-2 rounded text-center border border-white/10">
                                        <i className="fas fa-user-slash text-sm text-slate-300 mb-1"></i>
                                        <p className="text-slate-200 italic text-xs">Belum ada peserta terdaftar</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="flex items-center justify-center py-8">
                          <div className="text-center">
                            <i className="fas fa-clipboard text-xl text-gray-400 mb-2"></i>
                            <p className="text-gray-600 text-xs font-medium">Tidak ada kegiatan pada hari ini</p>
                          </div>
                        </div>
                      )}
                    </div>
                  
                  {/* Titik Carousel */}
                  {selectedDay?.kegiatan?.length > 1 && (
                    <div className="flex justify-center gap-1 mt-2">
                      {selectedDay.kegiatan.map((_, dotIndex) => (
                        <button 
                          key={dotIndex} 
                          className={`w-2 h-2 rounded-full transition-all duration-300 ${
                            activeActivityIndex === dotIndex 
                              ? 'bg-slate-700 shadow-md' 
                              : 'bg-gray-300 hover:bg-gray-400'
                          }`}
                          onClick={() => {
                            setIsActivityTransitioning(true);
                            setTimeout(() => {
                              setActiveActivityIndex(dotIndex);
                              setIsActivityTransitioning(false);
                            }, activityTransitionDuration);
                            clearInterval(activityCarouselIntervalRef.current);
                            clearInterval(dayTransitionIntervalRef.current);
                          }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-48">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mb-3 mx-auto shadow-lg">
                      <i className="fas fa-calendar-plus text-lg text-slate-600"></i>
                    </div>
                    <h6 className="text-sm font-bold text-gray-800 mb-1">
                      Pilih Tanggal
                    </h6>
                    <p className="text-gray-600 text-xs">
                      Pilih hari di kalender untuk melihat detail kegiatan
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;