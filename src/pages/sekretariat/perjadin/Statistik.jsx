import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import api from '../../../api';
import './kegiatan.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Statistik = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('minggu');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [dashboardData, setDashboardData] = useState({
    mingguan: 0,
    bulanan: 0,
    per_bidang: []
  });
  const [statistikData, setStatistikData] = useState({
    totalPerjalanan: 0,
    totalBidang: 0,
    totalPersonil: 0,
    grafikData: [],
    topBidang: [],
    personilPerBidang: []
  });

  // Fetch data dashboard yang sama dengan Dashboard.jsx
  const fetchDashboardData = async () => {
    try {
      const response = await api.get('/perjadin/dashboard');
      console.log('Dashboard data:', response.data);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      // Set default data as fallback
      setDashboardData({
        mingguan: 0,
        bulanan: 0,
        per_bidang: []
      });
    }
  };

  // Fetch data statistik
  const fetchStatistikData = async () => {
    setIsLoading(true);
    try {
      const params = {
        period: selectedPeriod,
        year: selectedYear,
        ...(selectedPeriod === 'minggu' && { month: selectedMonth })
      };

      const response = await api.get('/perjadin/statistik-perjadin', { params });
      console.log('Statistik data:', response.data);
      setStatistikData(response.data);
    } catch (error) {
      console.error('Error fetching statistik data:', error);
      // Set default data jika error
      setStatistikData({
        totalPerjalanan: 0,
        totalBidang: 0,
        totalPersonil: 0,
        grafikData: [],
        topBidang: [],
        personilPerBidang: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch dashboard data once on mount
    fetchDashboardData();
  }, []);

  useEffect(() => {
    // Fetch statistik data on mount and when filters change
    fetchStatistikData();
  }, [selectedPeriod, selectedYear, selectedMonth]);

  return (
    <div className="kegiatan-container relative">


      {/* Header Section */}
      <div className="dashboard-header">
        <h3 className="dashboard-heading">
          <i className="fas fa-chart-line"></i>
          Perjalanan Dinas - Statistik
        </h3>
        <p>Analisis data dan statistik perjalanan dinas berdasarkan periode dan bidang</p>
      </div>

      {/* Filter Controls */}
      <div className="base-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ minWidth: '150px' }}>
            <label className="form-label">Periode:</label>
            <select 
              value={selectedPeriod} 
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="form-select"
            >
              <option value="minggu">Per Minggu</option>
              <option value="bulan">Per Bulan</option>
              <option value="tahun">Per Tahun</option>
            </select>
          </div>

          <div className="form-group" style={{ minWidth: '120px' }}>
            <label className="form-label">Tahun:</label>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="form-select"
            >
              {[2021, 2022, 2023, 2024, 2025].map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {selectedPeriod === 'minggu' && (
            <div className="form-group" style={{ minWidth: '150px' }}>
              <label className="form-label">Bulan:</label>
              <select 
                value={selectedMonth} 
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="form-select"
              >
                {[
                  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
                  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
                ].map((month, index) => (
                  <option key={index + 1} value={index + 1}>{month}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="base-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h6 style={{ margin: 0, color: 'var(--color-primary)', fontWeight: '600' }}>Kegiatan Minggu Ini</h6>
            <i className="fas fa-calendar-week" style={{ color: 'var(--color-primary)' }}></i>
          </div>
          <h3 style={{ margin: '0.25rem 0', color: 'var(--color-primary)' }}>{dashboardData.mingguan}</h3>
          <small style={{ color: 'rgba(3, 15, 49, 0.6)' }}>Total kegiatan aktif</small>
        </div>
        
        <div className="base-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h6 style={{ margin: 0, color: 'var(--color-primary)', fontWeight: '600' }}>Kegiatan Bulan Ini</h6>
            <i className="fas fa-calendar-alt" style={{ color: 'var(--color-primary)' }}></i>
          </div>
          <h3 style={{ margin: '0.25rem 0', color: 'var(--color-primary)' }}>{dashboardData.bulanan}</h3>
          <small style={{ color: 'rgba(3, 15, 49, 0.6)' }}>Total kegiatan bulan ini</small>
        </div>
        
        <div className="base-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h6 style={{ margin: 0, color: 'var(--color-primary)', fontWeight: '600' }}>Total Bidang</h6>
            <i className="fas fa-building" style={{ color: 'var(--color-primary)' }}></i>
          </div>
          <h3 style={{ margin: '0.25rem 0', color: 'var(--color-primary)' }}>{dashboardData.per_bidang.length}</h3>
          <small style={{ color: 'rgba(3, 15, 49, 0.6)' }}>Bidang yang terlibat</small>
        </div>
        
        <div className="base-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h6 style={{ margin: 0, color: 'var(--color-primary)', fontWeight: '600' }}>Total Personil</h6>
            <i className="fas fa-users" style={{ color: 'var(--color-primary)' }}></i>
          </div>
          <h3 style={{ margin: '0.25rem 0', color: 'var(--color-primary)' }}>{statistikData.totalPersonil}</h3>
          <small style={{ color: 'rgba(3, 15, 49, 0.6)' }}>Personil terlibat</small>
        </div>
      </div>

      {/* Main Chart */}
      <div className="base-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h5 style={{ margin: 0, color: 'var(--color-primary)', fontWeight: '600' }}>
            <i className="fas fa-chart-bar" style={{ marginRight: '0.5rem' }}></i>
            Perjalanan Dinas {
              selectedPeriod === 'minggu' ? `Mingguan - ${['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][selectedMonth]} ${selectedYear}` :
              selectedPeriod === 'bulan' ? `Bulanan - ${selectedYear}` :
              'Tahunan'
            }
          </h5>
        </div>
        
        <div style={{ height: '350px', position: 'relative' }}>
          {isLoading && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '12px',
              zIndex: 10
            }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '20px',
                  height: '20px',
                  border: '2px solid #e5e7eb',
                  borderTop: '2px solid #6366f1',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 8px'
                }}></div>
                <small style={{ color: '#6b7280' }}>Memuat data...</small>
              </div>
            </div>
          )}
          <Bar
            data={{
              labels: statistikData.grafikData.map(item => item.label),
              datasets: [{
                label: 'Jumlah Perjalanan',
                data: statistikData.grafikData.map(item => item.value),
                backgroundColor: 'var(--color-primary)',
                borderColor: 'var(--color-primary)',
                borderWidth: 0,
                borderRadius: 8,
                borderSkipped: false,
              }]
            }}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: {
                  display: false
                },
                tooltip: {
                  backgroundColor: 'var(--color-primary)',
                  titleColor: 'white',
                  bodyColor: 'white',
                  borderColor: 'var(--color-primary)',
                  borderWidth: 1,
                  cornerRadius: 8,
                  callbacks: {
                    label: function(context) {
                      return `${context.parsed.y} perjalanan`;
                    }
                  }
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  grid: {
                    color: 'rgba(3, 15, 49, 0.1)',
                    drawBorder: false,
                  },
                  ticks: {
                    color: 'var(--color-primary)',
                    font: {
                      size: 12,
                      weight: 500
                    }
                  }
                },
                x: {
                  grid: {
                    display: false
                  },
                  ticks: {
                    color: 'var(--color-primary)',
                    font: {
                      size: 12,
                      weight: 500
                    }
                  }
                }
              }
            }}
          />
        </div>
      </div>

      {/* Bottom Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
        {/* Distribusi per Bidang */}
        <div className="base-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h5 style={{ margin: 0, color: 'var(--color-primary)', fontWeight: '600' }}>
              <i className="fas fa-building" style={{ marginRight: '0.5rem' }}></i>
              Distribusi per Bidang
            </h5>
          </div>
          
          <div>
            {dashboardData.per_bidang.map((bidang, index) => {
              const maxValue = Math.max(...dashboardData.per_bidang.map(b => b.total), 1);
              const percentage = Math.max((bidang.total / maxValue) * 100, 5);
              
              return (
                <div key={index} style={{ marginBottom: '1rem', padding: '0.75rem', border: '1px solid rgba(3, 15, 49, 0.1)', borderRadius: '8px', backgroundColor: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h6 style={{ margin: 0, color: 'var(--color-primary)' }}>{bidang.nama_bidang}</h6>
                    <span style={{ backgroundColor: 'var(--color-primary)', color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                      {bidang.total}
                    </span>
                  </div>
                  <div style={{ backgroundColor: 'rgba(3, 15, 49, 0.1)', borderRadius: '8px', height: '6px', overflow: 'hidden', marginBottom: '0.25rem' }}>
                    <div 
                      style={{ 
                        background: 'linear-gradient(90deg, var(--color-primary) 0%, rgba(3, 15, 49, 0.8) 100%)',
                        height: '100%',
                        borderRadius: '8px',
                        width: `${percentage}%`,
                        transition: 'width 0.6s ease'
                      }}
                    ></div>
                  </div>
                  <small style={{ color: 'rgba(3, 15, 49, 0.6)' }}>{bidang.total} kegiatan</small>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart Doughnut untuk Top Bidang */}
        <div className="base-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h5 style={{ margin: 0, color: 'var(--color-primary)', fontWeight: '600' }}>
              <i className="fas fa-chart-pie" style={{ marginRight: '0.5rem' }}></i>
              Top 5 Bidang Aktif
            </h5>
          </div>
          
          <div style={{ height: '300px' }}>
            {statistikData.topBidang.length > 0 ? (
              <Doughnut
                data={{
                  labels: statistikData.topBidang.slice(0, 5).map(bidang => bidang.nama),
                  datasets: [{
                    data: statistikData.topBidang.slice(0, 5).map(bidang => bidang.jumlah),
                    backgroundColor: [
                      'var(--color-primary)',
                      'rgba(3, 15, 49, 0.8)',
                      'rgba(3, 15, 49, 0.6)',
                      'rgba(3, 15, 49, 0.4)',
                      'rgba(3, 15, 49, 0.2)',
                    ],
                    borderColor: [
                      'var(--color-primary)',
                      'var(--color-primary)',
                      'var(--color-primary)',
                      'var(--color-primary)',
                      'var(--color-primary)',
                    ],
                    borderWidth: 2,
                    hoverBorderWidth: 3,
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        usePointStyle: true,
                        padding: 15,
                        color: 'var(--color-primary)',
                        font: {
                          size: 11,
                          weight: 500
                        }
                      }
                    },
                    tooltip: {
                      backgroundColor: 'var(--color-primary)',
                      titleColor: 'white',
                      bodyColor: 'white',
                      borderColor: 'var(--color-primary)',
                      borderWidth: 1,
                      cornerRadius: 8,
                      callbacks: {
                        label: function(context) {
                          const total = context.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = ((context.parsed / total) * 100).toFixed(1);
                          return `${context.parsed} perjalanan (${percentage}%)`;
                        }
                      }
                    }
                  }
                }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(3, 15, 49, 0.6)' }}>
                <p>Tidak ada data untuk ditampilkan</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Statistik;
