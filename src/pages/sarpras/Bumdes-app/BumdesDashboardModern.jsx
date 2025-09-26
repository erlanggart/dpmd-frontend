import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import api from '../../../services/api.js';
import './bumdes.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const BumdesDashboardModern = () => {
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('semua');
  const [selectedKecamatan, setSelectedKecamatan] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  
  const [bumdesData, setBumdesData] = useState([]);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [modal, setModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9;

  // Fetch data dari API
  const fetchBumdesData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/bumdes');
      const apiData = response.data && Array.isArray(response.data.data) ? response.data.data : [];
      
      setBumdesData(apiData);
      
      // Extract unique kecamatan
      const uniqueKecamatan = [...new Set(apiData.map(item => item.kecamatan).filter(Boolean))];
      setKecamatanList(uniqueKecamatan.sort());
      
    } catch (error) {
      console.error('Error fetching Bumdes data:', error);
      setBumdesData([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter data berdasarkan pilihan
  const applyFilters = () => {
    let filtered = bumdesData;

    if (selectedKecamatan) {
      filtered = filtered.filter(item => item.kecamatan === selectedKecamatan);
    }

    if (selectedStatus) {
      filtered = filtered.filter(item => item.status === selectedStatus);
    }

    setFilteredData(filtered);
  };

  // Get statistics dari filtered data
  const getStatistics = () => {
    const totalBumdes = filteredData.length;
    const activeBumdes = filteredData.filter(item => item.status === 'aktif').length;
    const inactiveBumdes = filteredData.filter(item => item.status === 'tidak aktif').length;
    const totalKecamatan = [...new Set(filteredData.map(item => item.kecamatan).filter(Boolean))].length;

    return {
      totalBumdes,
      activeBumdes,
      inactiveBumdes,
      totalKecamatan
    };
  };

  // Get chart data untuk status distribution
  const getStatusChartData = () => {
    const statusCounts = filteredData.reduce((acc, item) => {
      const status = item.status || 'Tidak Diketahui';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return {
      labels: Object.keys(statusCounts),
      datasets: [{
        data: Object.values(statusCounts),
        backgroundColor: [
          '#2C3E50', // Dark Blue Grey
          '#72787EFF', // Dark Slate
          '#5D6D7E', // Steel Blue
          '#566573', // Dark Grey
          '#85929E', // Light Steel
        ],
        borderColor: [
          '#1B2631', // Very Dark Blue
          '#2C3E50', // Dark Blue Grey
          '#424949', // Dark Charcoal
          '#515A5A', // Dark Grey
          '#566573', // Darker Steel
        ],
        borderWidth: 2,
        hoverBorderWidth: 3,
      }]
    };
  };

  // Get chart data untuk jenis usaha
  const getJenisUsahaChartData = () => {
    const jenisUsahaCounts = filteredData.reduce((acc, item) => {
      const jenisUsaha = item.JenisUsaha || 'Tidak Diketahui';
      acc[jenisUsaha] = (acc[jenisUsaha] || 0) + 1;
      return acc;
    }, {});

    return {
      labels: Object.keys(jenisUsahaCounts),
      datasets: [{
        label: 'Jumlah BUMDes',
        data: Object.values(jenisUsahaCounts),
        backgroundColor: [
          '#2C3E50', '#34495E', '#5D6D7E', '#566573', '#85929E',
          '#1B2631', '#424949', '#515A5A', '#717D7E', '#99A3A4'
        ],
        borderColor: '#1B2631',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }]
    };
  };

  // Get distribution per kecamatan
  const getKecamatanDistribution = () => {
    const kecamatanCounts = filteredData.reduce((acc, item) => {
      const kecamatan = item.kecamatan || 'Tidak Diketahui';
      acc[kecamatan] = (acc[kecamatan] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(kecamatanCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10); // Top 10
  };

  // Show modal detail
  const showDetails = (bumdes) => {
    setModal(bumdes);
  };

  // Close modal detail
  const closeDetails = () => {
    setModal(null);
  };

  // Pagination functions
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  useEffect(() => {
    fetchBumdesData();
  }, []);

  useEffect(() => {
    applyFilters();
    setCurrentPage(1); // Reset to first page when filters change
  }, [selectedKecamatan, selectedStatus, bumdesData]);

  if (loading) {
    return (
      <div className="kegiatan-container relative">
        {/* Header Skeleton */}
        <div className="dashboard-header">
          <div className="skeleton-text skeleton-title"></div>
          <div className="skeleton-text skeleton-subtitle"></div>
        </div>

        {/* Filter Skeleton */}
        <div className="base-card" style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div className="skeleton-filter"></div>
            <div className="skeleton-filter"></div>
            <div className="skeleton-filter"></div>
          </div>
        </div>

        {/* Summary Cards Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="base-card">
              <div className="skeleton-card-header">
                <div className="skeleton-text skeleton-card-title"></div>
                <div className="skeleton-icon"></div>
              </div>
              <div className="skeleton-text skeleton-card-value"></div>
              <div className="skeleton-text skeleton-card-desc"></div>
            </div>
          ))}
        </div>

        {/* Main Chart Skeleton */}
        <div className="base-card" style={{ marginBottom: '2rem' }}>
          <div className="skeleton-text skeleton-chart-title" style={{ marginBottom: '1rem' }}></div>
          <div className="skeleton-chart"></div>
        </div>

        {/* Bottom Grid Skeleton */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          <div className="base-card">
            <div className="skeleton-text skeleton-chart-title" style={{ marginBottom: '1rem' }}></div>
            <div className="skeleton-list">
              {[1, 2, 3].map(i => (
                <div key={i} className="skeleton-list-item"></div>
              ))}
            </div>
          </div>
          
          <div className="base-card">
            <div className="skeleton-text skeleton-chart-title" style={{ marginBottom: '1rem' }}></div>
            <div className="skeleton-doughnut"></div>
          </div>
        </div>


      </div>
    );
  }

  const statistics = getStatistics();
  const kecamatanDistribution = getKecamatanDistribution();

  return (
    <div className="kegiatan-container relative">
      {/* Header Section */}
      <div className="dashboard-header">
        <h3 className="dashboard-heading">
          <i className="fas fa-chart-line"></i>
          BUMDes - Statistik & Analisis
        </h3>
        <p>Analisis data dan statistik BUMDes berdasarkan kecamatan, status, dan jenis usaha</p>
      </div>

      {/* Filter Controls */}
      <div className="base-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ minWidth: '150px' }}>
            <label className="form-label">Kecamatan:</label>
            <select 
              value={selectedKecamatan} 
              onChange={(e) => setSelectedKecamatan(e.target.value)}
              className="form-select"
            >
              <option value="">Semua Kecamatan</option>
              {kecamatanList.map(kecamatan => (
                <option key={kecamatan} value={kecamatan}>{kecamatan}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ minWidth: '130px' }}>
            <label className="form-label">Status:</label>
            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="form-select"
            >
              <option value="">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="tidak aktif">Tidak Aktif</option>
            </select>
          </div>

          <button 
            onClick={() => {
              setSelectedKecamatan('');
              setSelectedStatus('');
            }}
            className="btn btn-outline"
            style={{ marginTop: '1.5rem' }}
          >
            <i className="fas fa-redo"></i>
            Reset Filter
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="base-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h6 style={{ margin: 0, color: 'var(--color-primary)', fontWeight: '600' }}>Total BUMDes</h6>
            <i className="fas fa-building" style={{ color: 'var(--color-primary)' }}></i>
          </div>
          <h3 style={{ margin: '0.25rem 0', color: 'var(--color-primary)' }}>{statistics.totalBumdes}</h3>
          <small style={{ color: 'rgba(3, 15, 49, 0.6)' }}>BUMDes terdaftar</small>
        </div>
        
        <div className="base-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h6 style={{ margin: 0, color: 'var(--color-primary)', fontWeight: '600' }}>BUMDes Aktif</h6>
            <i className="fas fa-check-circle" style={{ color: 'var(--color-primary)' }}></i>
          </div>
          <h3 style={{ margin: '0.25rem 0', color: 'var(--color-primary)' }}>{statistics.activeBumdes}</h3>
          <small style={{ color: 'rgba(3, 15, 49, 0.6)' }}>BUMDes beroperasi</small>
        </div>
        
        <div className="base-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h6 style={{ margin: 0, color: 'var(--color-primary)', fontWeight: '600' }}>BUMDes Tidak Aktif</h6>
            <i className="fas fa-times-circle" style={{ color: 'var(--color-primary)' }}></i>
          </div>
          <h3 style={{ margin: '0.25rem 0', color: 'var(--color-primary)' }}>{statistics.inactiveBumdes}</h3>
          <small style={{ color: 'rgba(3, 15, 49, 0.6)' }}>BUMDes belum beroperasi</small>
        </div>
        
        <div className="base-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h6 style={{ margin: 0, color: 'var(--color-primary)', fontWeight: '600' }}>Total Kecamatan</h6>
            <i className="fas fa-map-marker-alt" style={{ color: 'var(--color-primary)' }}></i>
          </div>
          <h3 style={{ margin: '0.25rem 0', color: 'var(--color-primary)' }}>{statistics.totalKecamatan}</h3>
          <small style={{ color: 'rgba(3, 15, 49, 0.6)' }}>Kecamatan terlibat</small>
        </div>
      </div>

      {/* Main Chart */}
      <div className="base-card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h5 style={{ margin: 0, color: 'var(--color-primary)', fontWeight: '600' }}>
            <i className="fas fa-chart-bar" style={{ marginRight: '0.5rem' }}></i>
            Distribusi BUMDes per Jenis Usaha
          </h5>
          {loading && (
            <div className="header-loader">
              <div className="header-spinner"></div>
              <span>Memuat...</span>
            </div>
          )}
        </div>
        
        <div style={{ height: '350px' }}>
          {filteredData.length > 0 ? (
            <Bar
              data={getJenisUsahaChartData()}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false
                  },
                  tooltip: {
                    backgroundColor: '#2C3E50',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: '#34495E',
                    borderWidth: 2,
                    cornerRadius: 8,
                    titleFont: {
                      size: 14,
                      weight: 600
                    },
                    bodyFont: {
                      size: 13,
                      weight: 500
                    }
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: {
                      color: 'rgba(149, 165, 166, 0.2)',
                      drawBorder: false
                    },
                    ticks: {
                      color: '#2C3E50',
                      font: {
                        size: 12,
                        weight: 600
                      },
                      padding: 10
                    }
                  },
                  x: {
                    grid: {
                      display: false
                    },
                    ticks: {
                      color: '#2C3E50',
                      font: {
                        size: 11,
                        weight: 600
                      },
                      maxRotation: 45,
                      padding: 10
                    }
                  }
                },
                elements: {
                  bar: {
                    borderRadius: {
                      topLeft: 8,
                      topRight: 8
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

      {/* Bottom Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
        
        {/* Distribusi per Kecamatan */}
        <div className="base-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h5 style={{ margin: 0, color: 'var(--color-primary)', fontWeight: '600' }}>
              <i className="fas fa-map" style={{ marginRight: '0.5rem' }}></i>
              Top 10 Kecamatan
            </h5>
          </div>
          
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {kecamatanDistribution.map(([kecamatan, jumlah], index) => {
              const maxValue = Math.max(...kecamatanDistribution.map(([,j]) => j), 1);
              const percentage = Math.max((jumlah / maxValue) * 100, 5);
              const colors = ['#2C3E50', '#34495E', '#5D6D7E', '#566573', '#85929E'];
              const color = colors[index % colors.length];
              
              return (
                <div key={index} style={{ marginBottom: '1rem', padding: '0.75rem', border: '1px solid rgba(44, 62, 80, 0.2)', borderRadius: '8px', backgroundColor: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <h6 style={{ margin: 0, color: color, fontWeight: '600' }}>{kecamatan}</h6>
                    <span style={{ backgroundColor: color, color: 'white', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: '600' }}>
                      {jumlah}
                    </span>
                  </div>
                  <div style={{ width: '100%', backgroundColor: 'rgba(44, 62, 80, 0.1)', borderRadius: '6px', height: '8px' }}>
                    <div
                      style={{
                        width: `${percentage}%`,
                        background: `linear-gradient(90deg, ${color} 0%, ${color}CC 100%)`,
                        height: '100%',
                        borderRadius: '6px',
                        transition: 'width 0.3s ease'
                      }}
                    ></div>
                  </div>
                  <small style={{ color: 'rgba(44, 62, 80, 0.7)' }}>{jumlah} BUMDes</small>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Distribution Chart */}
        <div className="base-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h5 style={{ margin: 0, color: 'var(--color-primary)', fontWeight: '600' }}>
              <i className="fas fa-chart-pie" style={{ marginRight: '0.5rem' }}></i>
              Status BUMDes
            </h5>
          </div>
          
          <div style={{ height: '300px' }}>
            {filteredData.length > 0 ? (
              <Doughnut
                data={getStatusChartData()}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        usePointStyle: true,
                        padding: 15,
                        color: '#2C3E50',
                        font: {
                          size: 12,
                          weight: 600
                        }
                      }
                    },
                    tooltip: {
                      backgroundColor: '#2C3E50',
                      titleColor: 'white',
                      bodyColor: 'white',
                      borderColor: '#34495E',
                      borderWidth: 2,
                      cornerRadius: 8,
                      callbacks: {
                        label: function(context) {
                          const total = context.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = ((context.parsed / total) * 100).toFixed(1);
                          return `${context.parsed} BUMDes (${percentage}%)`;
                        }
                      }
                    }
                  }
                }}
              />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(44, 62, 80, 0.6)' }}>
                <p>Tidak ada data untuk ditampilkan</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BUMDes Cards Grid */}
      <div className="base-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h5 style={{ margin: 0, color: 'var(--color-primary)', fontWeight: '600' }}>
            <i className="fas fa-building" style={{ marginRight: '0.5rem' }}></i>
            Daftar BUMDes ({filteredData.length} total)
          </h5>
          <span style={{ color: 'rgba(44, 62, 80, 0.7)', fontSize: '0.875rem' }}>
            Halaman {currentPage} dari {totalPages}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
          {currentItems.length > 0 ? (
            currentItems.map((bumdes, index) => {
              const colors = ['#2C3E50', '#34495E', '#5D6D7E', '#566573', '#85929E'];
              const color = colors[index % colors.length];
              
              return (
                <div 
                  key={bumdes.id} 
                  onClick={() => showDetails(bumdes)}
                  style={{ 
                    background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
                    border: `2px solid ${color}30`,
                    borderRadius: '12px',
                    padding: '1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 4px 15px rgba(0,0,0,0.1)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-5px)';
                    e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.15)';
                    e.target.style.borderColor = color;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                    e.target.style.borderColor = `${color}30`;
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ 
                      width: '40px', 
                      height: '40px', 
                      backgroundColor: color, 
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '1rem'
                    }}>
                      <i className="fas fa-building" style={{ color: 'white', fontSize: '16px' }}></i>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h6 style={{ margin: 0, color: '#2C3E50', fontWeight: '700', fontSize: '1.1rem' }}>
                        {bumdes.namabumdesa || 'Nama Tidak Tersedia'}
                      </h6>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '0.75rem' }}>
                    <p style={{ margin: '0.25rem 0', color: '#34495E', fontSize: '0.9rem' }}>
                      <i className="fas fa-map-marker-alt" style={{ color: color, marginRight: '0.5rem', width: '12px' }}></i>
                      <strong>Desa:</strong> {bumdes.desa || '-'}
                    </p>
                    <p style={{ margin: '0.25rem 0', color: '#34495E', fontSize: '0.9rem' }}>
                      <i className="fas fa-map" style={{ color: color, marginRight: '0.5rem', width: '12px' }}></i>
                      <strong>Kecamatan:</strong> {bumdes.kecamatan || '-'}
                    </p>
                    <p style={{ margin: '0.25rem 0', color: '#34495E', fontSize: '0.9rem' }}>
                      <i className="fas fa-briefcase" style={{ color: color, marginRight: '0.5rem', width: '12px' }}></i>
                      <strong>Jenis Usaha:</strong> {bumdes.JenisUsaha || '-'}
                    </p>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ 
                      backgroundColor: bumdes.status === 'aktif' ? '#4CAF50' : '#F44336',
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}>
                      {bumdes.status === 'aktif' ? '✓ Aktif' : '✗ Tidak Aktif'}
                    </span>
                    <button style={{
                      background: 'none',
                      border: `2px solid ${color}`,
                      color: color,
                      padding: '6px 12px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}>
                      Lihat Detail
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div style={{ 
              gridColumn: '1 / -1',
              textAlign: 'center', 
              padding: '3rem',
              color: 'rgba(44, 62, 80, 0.6)',
              fontSize: '1.1rem'
            }}>
              <i className="fas fa-search" style={{ fontSize: '3rem', marginBottom: '1rem', display: 'block' }}></i>
              Tidak ada data BUMDes yang ditemukan
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                border: '2px solid #4A90E2',
                backgroundColor: currentPage === 1 ? '#f5f5f5' : 'white',
                color: currentPage === 1 ? '#999' : '#4A90E2',
                borderRadius: '6px',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              ← Sebelumnya
            </button>
            
            {[...Array(totalPages)].map((_, index) => {
              const pageNum = index + 1;
              if (totalPages <= 7 || pageNum === 1 || pageNum === totalPages || 
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                return (
                  <button
                    key={pageNum}
                    onClick={() => paginate(pageNum)}
                    style={{
                      padding: '8px 12px',
                      border: '2px solid #4A90E2',
                      backgroundColor: pageNum === currentPage ? '#4A90E2' : 'white',
                      color: pageNum === currentPage ? 'white' : '#4A90E2',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      minWidth: '40px'
                    }}
                  >
                    {pageNum}
                  </button>
                );
              } else if ((pageNum === 2 && currentPage > 4) || 
                        (pageNum === totalPages - 1 && currentPage < totalPages - 3)) {
                return <span key={pageNum} style={{ padding: '8px 4px', color: '#999' }}>...</span>;
              }
              return null;
            })}
            
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px',
                border: '2px solid #4A90E2',
                backgroundColor: currentPage === totalPages ? '#f5f5f5' : 'white',
                color: currentPage === totalPages ? '#999' : '#4A90E2',
                borderRadius: '6px',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontWeight: '600'
              }}
            >
              Selanjutnya →
            </button>
          </div>
        )}
      </div>

      {/* Modal Detail */}
      {modal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '2rem'
        }} onClick={closeDetails}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '80vh',
            overflowY: 'auto',
            position: 'relative',
            boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
          }} onClick={e => e.stopPropagation()}>
            <button 
              onClick={closeDetails}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: '#85929E',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
            
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ color: '#2C3E50', marginBottom: '0.5rem', fontSize: '1.5rem' }}>
                <i className="fas fa-building" style={{ color: '#2C3E50', marginRight: '0.5rem' }}></i>
                {modal.namabumdesa || 'Detail BUMDes'}
              </h3>
              <p style={{ color: '#566573', margin: 0 }}>Informasi lengkap BUMDes</p>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              {Object.entries(modal).map(([key, value]) => {
                if (key.includes('id') || key.includes('_id') || key === 'created_at' || key === 'updated_at') return null;
                
                let label = key.replace(/([A-Z])/g, ' $1').trim().replace(/_/g, ' ');
                label = label.charAt(0).toUpperCase() + label.slice(1);
                
                return (
                  <div key={key} style={{
                    backgroundColor: '#F8F9FA',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid #D5DBDB'
                  }}>
                    <div style={{ 
                      fontSize: '0.85rem', 
                      fontWeight: '600', 
                      color: '#566573', 
                      marginBottom: '0.25rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {label}
                    </div>
                    <div style={{ 
                      fontSize: '1rem', 
                      color: '#2C3E50', 
                      fontWeight: '500',
                      wordBreak: 'break-word'
                    }}>
                      {value || '-'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BumdesDashboardModern;
