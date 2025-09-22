import React, { useState, useEffect, useRef } from 'react';
import api from '../../../api';
import Swal from 'sweetalert2';
import './kegiatan.css';

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
        const response = await api.get('/dashboard');
        setData(response.data);
      } catch (error) {
        Swal.fire('Error', 'Gagal memuat data dashboard.', 'error');
      }
    };
    fetchDashboardData();
  }, []);
  
  useEffect(() => {
    const fetchWeeklySchedule = async () => {
      try {
        const response = await api.get('/dashboard/weekly-schedule');
        setWeeklySchedule(response.data);
      } catch (error) {
        console.error('Failed to fetch weekly schedule', error);
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
    <div className="fade-in custom-container">
      <h3 className="dashboard-heading">Ringkasan Kegiatan</h3>
      <div className="dashboard-summary-grid">
        <div className="dashboard-card" onClick={() => onFilterClick('mingguan')}>
          <div className="dashboard-card-header">
            <i className="fas fa-calendar-week dashboard-card-icon"></i>
            <h4 className="dashboard-card-title">Minggu Ini</h4>
          </div>
          <p className="dashboard-card-value">{data.mingguan}</p>
          <p className="dashboard-card-label">Kegiatan</p>
        </div>
        <div className="dashboard-card" onClick={() => onFilterClick('bulanan')}>
          <div className="dashboard-card-header">
            <i className="fas fa-calendar-day dashboard-card-icon"></i>
            <h4 className="dashboard-card-title">Bulan Ini</h4>
          </div>
          <p className="dashboard-card-value">{data.bulanan}</p>
          <p className="dashboard-card-label">Kegiatan</p>
        </div>
        <div className="dashboard-bidang-card">
          <h4 className="dashboard-bidang-header"><i className="fas fa-project-diagram"></i> Per Bidang</h4>
          <ul className="dashboard-bidang-list">
            {data.per_bidang.map(b => (
              <li key={b.id_bidang} className="dashboard-bidang-item" onClick={() => onFilterClick('', b.id_bidang)}>
                {b.nama_bidang}
                <span>{b.total}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <h3 className="weekly-schedule-heading">Jadwal Mingguan</h3>
      <div className="weekly-schedule-container">
        <div className="calendar-card">
          <h4 className="calendar-header"><i className="fas fa-calendar-alt"></i> Kalender Mingguan</h4>
          <div className="calendar-list">
            {weeklySchedule.length > 0 ? weeklySchedule.map((day, index) => (
              <div 
                key={day.tanggal} 
                className={`calendar-day-item ${selectedDayIndex === index ? 'active' : ''}`}
                onClick={() => {
                  setSelectedDayIndex(index);
                  setActiveActivityIndex(0); 
                  clearInterval(activityCarouselIntervalRef.current);
                  clearInterval(dayTransitionIntervalRef.current);
                  setIsActivityTransitioning(false);
                  setIsDayTransitioning(false);
                }}
              >
                <div className="calendar-day-info">
                  <div className="day-name">{day.hari}</div>
                  <div className="day-date-text">{new Date(day.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</div>
                </div>
                <div className="calendar-day-count">{day.kegiatan?.length || 0} kegiatan</div>
              </div>
            )) : (
              <p className="no-activity-message">Tidak ada jadwal.</p>
            )}
          </div>
        </div>

        <div className={`activity-card-container ${isDayTransitioning ? 'fade-out-down' : 'fade-in-up'}`}>
          {selectedDay ? (
            <>
              <h4 className="activity-card-header">
                <i className="fas fa-clipboard-list"></i>
                Kegiatan pada {selectedDay.hari}, {new Date(selectedDay.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
              </h4>
              <div className="activity-carousel-wrapper">
                {selectedDay.kegiatan && selectedDay.kegiatan.length > 0 ? (
                  selectedDay.kegiatan.map((keg, index) => (
                    <div 
                      key={index} 
                      className={`activity-card-new ${index === activeActivityIndex && !isActivityTransitioning ? 'fade-in-up' : 'fade-out-down-hidden'}`}
                      style={{ transitionDuration: `${activityTransitionDuration}ms` }}
                    >
                      <h5>
                        <i className="fas fa-clipboard-list"></i>{keg.nama_kegiatan}
                      </h5>
                      <p className="location">
                        <i className="fas fa-map-marker-alt"></i> {keg.lokasi}
                      </p>
                      <div className="activity-card-details">
                        {keg.details && keg.details.length > 0 ? (
                          keg.details.map((detail, detailIndex) => (
                            <div key={detailIndex} className="activity-card-detail-item">
                              <span>{detail.nama_bidang}:</span>
                              {renderPersonilList(detail.personil)}
                            </div>
                          ))
                        ) : (
                          <p className="no-activity-message">Tidak ada personel.</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-activity-message">Tidak ada kegiatan pada hari ini.</p>
                )}
              </div>
              {selectedDay?.kegiatan?.length > 1 && (
                <div className="carousel-dots">
                  {selectedDay.kegiatan.map((_, dotIndex) => (
                    <span 
                      key={dotIndex} 
                      className={`dot ${activeActivityIndex === dotIndex ? 'active' : ''}`}
                      onClick={() => {
                        setIsActivityTransitioning(true);
                        setTimeout(() => {
                          setActiveActivityIndex(dotIndex);
                          setIsActivityTransitioning(false);
                        }, activityTransitionDuration);
                        clearInterval(activityCarouselIntervalRef.current);
                        clearInterval(dayTransitionIntervalRef.current);
                      }}
                    ></span>
                  ))}
                </div>
              )}
            </>
          ) : (
            <p className="no-activity-message" style={{ marginTop: '5rem', fontSize: '1.25rem' }}>Pilih hari di kalender untuk melihat kegiatan.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;