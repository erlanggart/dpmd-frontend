import React, { useState, useEffect } from 'react';
import api from '../../../services/api.js';
import { Bar, Doughnut, Pie } from 'react-chartjs-2';
import 'chart.js/auto';
import { FaSearch, FaFilter, FaRedoAlt } from 'react-icons/fa';

// Komponen Card Ringkasan yang Dapat Digunakan Ulang
const SummaryCard = ({ title, data, itemsPerPage }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const totalItems = Object.keys(data).length;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = Object.entries(data).slice(indexOfFirstItem, indexOfLastItem);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    return (
        <div className="summary-card-item">
            <h4 className="summary-card-title">{title}</h4>
            <div className="summary-content">
                {currentItems.map(([key, value]) => (
                    <div key={key} className="summary-item">
                        <strong>{key}</strong>
                        <span>{value}</span>
                    </div>
                ))}
            </div>
            {totalItems > itemsPerPage && (
                <div className="pagination-summary">
                    <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
                        Prev
                    </button>
                    <span>
                        Page {currentPage} of {totalPages}
                    </span>
                    <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages}>
                        Next
                    </button>
                </div>
            )}
        </div>
    );
};

function BumdesDashboard() {
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState({ search: '', kecamatan: '' });
    const [kecamatanList, setKecamatanList] = useState([]);
    const [modal, setModal] = useState(null);
    
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                console.log('🔄 Dashboard: Fetching BUMDes data...');
                const response = await api.get('/bumdes');
                console.log('📊 Dashboard: API Response:', response);
                console.log('📊 Dashboard: Response data:', response.data);
                
                // Perbaikan utama: Periksa apakah response.data dan response.data.data ada sebelum memprosesnya
                const apiData = response.data && Array.isArray(response.data.data) ? response.data.data : [];
                console.log('📊 Dashboard: Processed data count:', apiData.length);

                setData(apiData);
                setFilteredData(apiData);
                const uniqueKecamatan = [...new Set(apiData.map(item => item.kecamatan).filter(Boolean))];
                setKecamatanList(uniqueKecamatan.sort());
                console.log('✅ Dashboard: Data loaded successfully');
            } catch (error) {
                console.error('❌ Dashboard: Error fetching data:', error);
                console.error('❌ Dashboard: Error details:', {
                    message: error.message,
                    status: error.response?.status,
                    url: error.config?.url
                });
                setError('Gagal memuat data dari server. 😔');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        // Perbaikan: Pastikan `data` adalah array sebelum memanggil `.filter()`
        if (Array.isArray(data)) {
            let temp = data.filter(item => {
                const matchesSearch = (item.namabumdesa?.toLowerCase().includes(filter.search.toLowerCase()) || item.desa?.toLowerCase().includes(filter.search.toLowerCase()));
                const matchesKecamatan = !filter.kecamatan || item.kecamatan === filter.kecamatan;
                return matchesSearch && matchesKecamatan;
            });
            setFilteredData(temp);
        } else {
            setFilteredData([]); // Atur ulang ke array kosong jika data tidak valid
        }
        setCurrentPage(1);
    }, [filter, data]);

    const getChartData = (key) => {
        // Perbaikan: Pastikan `filteredData` adalah array
        const counts = Array.isArray(filteredData) ? filteredData.reduce((acc, item) => {
            const value = item[key] || 'Tidak Diketahui';
            acc[value] = (acc[value] || 0) + 1;
            return acc;
        }, {}) : {};
        
        const generateColors = (count) => {
            const colors = [];
            const baseHue = 200;
            for (let i = 0; i < count; i++) {
                const hue = (baseHue + (360 / count) * i) % 360;
                colors.push(`hsl(${hue}, 70%, 60%)`);
            }
            return colors;
        };

        const labels = Object.keys(counts);
        const values = Object.values(counts);
        const colors = generateColors(labels.length);

        return {
            labels: labels,
            datasets: [{
                label: `Jumlah BUMDes`,
                data: values,
                backgroundColor: colors,
                hoverBackgroundColor: colors.map(c => c.replace('70%', '80%')),
                borderColor: colors.map(c => c.replace('70%', '50%')),
                borderWidth: 1,
            }],
        };
    };

    const getSummaryData = (key) => {
        // Perbaikan: Pastikan `filteredData` adalah array
        const counts = Array.isArray(filteredData) ? filteredData.reduce((acc, item) => {
            const value = item[key] || 'Tidak Diketahui';
            acc[value] = (acc[value] || 0) + 1;
            return acc;
        }, {}) : {};
        return counts;
    };

    const showDetails = (bumdes) => {
        setModal(bumdes);
    };

    const closeDetails = () => {
        setModal(null);
    };

    const dataTableLastItem = currentPage * itemsPerPage;
    const dataTableFirstItem = dataTableLastItem - itemsPerPage;
    // Perbaikan: Gunakan `Array.isArray` sebelum memanggil `.slice()`
    const currentItems = Array.isArray(filteredData) ? filteredData.slice(dataTableFirstItem, dataTableLastItem) : [];
    const totalPages = Array.isArray(filteredData) ? Math.ceil(filteredData.length / itemsPerPage) : 0;

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    const renderPageNumbers = () => {
        const pageNumbers = [];
        const maxPagesToShow = 5;
        const startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        const endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
        
        for (let i = startPage; i <= endPage; i++) {
            pageNumbers.push(i);
        }

        const paginationItems = [];
        if (pageNumbers[0] > 1) {
            paginationItems.push(<button key={1} onClick={() => paginate(1)} className={1 === currentPage ? 'active' : ''}>1</button>);
            if (pageNumbers[0] > 2) paginationItems.push(<span key="elipsis-start" className="pagination-ellipsis">...</span>);
        }
        pageNumbers.forEach(number => {
            paginationItems.push(
                <button key={number} onClick={() => paginate(number)} className={number === currentPage ? 'active' : ''}>
                    {number}
                </button>
            );
        });
        if (pageNumbers[pageNumbers.length - 1] < totalPages) {
            if (pageNumbers[pageNumbers.length - 1] < totalPages - 1) paginationItems.push(<span key="elipsis-end" className="pagination-ellipsis">...</span>);
            paginationItems.push(<button key={totalPages} onClick={() => paginate(totalPages)} className={totalPages === currentPage ? 'active' : ''}>{totalPages}</button>);
        }
        return paginationItems;
    };

    const handleReset = () => {
        setFilter({ search: '', kecamatan: '' });
        setCurrentPage(1);
    };

    if (loading) return <div className="loading-message">Memuat data... 🔄</div>;
    if (error) return <div className="error-message">{error}</div>;

    const statusSummary = getSummaryData('status');
    const jenisUsahaSummary = getSummaryData('JenisUsaha');
    const badanHukumSummary = getSummaryData('badanhukum');

    return (
        <div className="dashboard-container">
            <h2 className="dashboard-title">Dashboard Statistik BUMDes</h2>
            
            <div className="chart-grid">
                <div className="chart-card-item">
                    <h3 className="chart-title-item">Status BUMDes</h3>
                    {Array.isArray(filteredData) && <Bar data={getChartData('status')} />}
                </div>
                <div className="chart-card-item">
                    <h3 className="chart-title-item">Jenis Usaha</h3>
                    {Array.isArray(filteredData) && <Doughnut data={getChartData('JenisUsaha')} />}
                </div>
                <div className="chart-card-item">
                    <h3 className="chart-title-item">Status Badan Hukum</h3>
                    {Array.isArray(filteredData) && <Pie data={getChartData('badanhukum')} />}
                </div>
            </div>

            <div className="summary-grid">
                <SummaryCard title="Ringkasan Status BUMDes" data={statusSummary} itemsPerPage={5} />
                <SummaryCard title="Ringkasan Jenis Usaha" data={jenisUsahaSummary} itemsPerPage={5} />
                <SummaryCard title="Ringkasan Badan Hukum" data={badanHukumSummary} itemsPerPage={5} />
            </div>
            
            <div className="data-table-card">
                <div className="filter-container">
                    <div className="input-with-icon">
                        <FaSearch className="icon" />
                        <input
                            type="text"
                            placeholder="Cari Nama BUMDes atau Desa..."
                            value={filter.search}
                            onChange={e => setFilter({ ...filter, search: e.target.value })}
                            className="filter-input"
                        />
                    </div>
                    
                    <div className="dropdown-container">
                        <div 
                            className="dropdown-toggle"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <FaFilter className="icon" />
                            <span>{filter.kecamatan || 'Semua Kecamatan'}</span>
                        </div>
                        {isDropdownOpen && (
                            <div className="dropdown-menu">
                                <div
                                    className="dropdown-item"
                                    onClick={() => {
                                        setFilter({ ...filter, kecamatan: '' });
                                        setIsDropdownOpen(false);
                                    }}
                                >
                                    Semua Kecamatan
                                </div>
                                {kecamatanList.map(kec => (
                                    <div
                                        key={kec}
                                        className="dropdown-item"
                                        onClick={() => {
                                            setFilter({ ...filter, kecamatan: kec });
                                            setIsDropdownOpen(false);
                                        }}
                                    >
                                        {kec}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={handleReset} className="reset-button">
                        <FaRedoAlt className="icon" /> Reset
                    </button>
                </div>
                
                <div className="bumdes-card-grid">
                    {currentItems.length > 0 ? (
                        currentItems.map(bumdes => (
                            <div className="bumdes-card-item" key={bumdes.id} onClick={() => showDetails(bumdes)}>
                                <h3 className="bumdes-card-title">{bumdes.namabumdesa || 'Nama Tidak Tersedia'}</h3>
                                <p><strong>Desa:</strong> {bumdes.desa || '-'}</p>
                                <p><strong>Kecamatan:</strong> {bumdes.kecamatan || '-'}</p>
                                <p><strong>Status:</strong> <span className={bumdes.status === 'aktif' ? 'status-active' : 'status-inactive'}>{bumdes.status || '-'}</span></p>
                            </div>
                        ))
                    ) : (
                        <div className="no-data-message">Tidak ada data yang ditemukan.</div>
                    )}
                </div>

                {filteredData.length > itemsPerPage && (
                    <div className="pagination-wrapper">
                        <div className="pagination">
                            <button
                                onClick={() => paginate(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="pagination-nav-button"
                            >
                                &laquo; Sebelumnya
                            </button>
                            {renderPageNumbers()}
                            <button
                                onClick={() => paginate(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="pagination-nav-button"
                            >
                                Selanjutnya &raquo;
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {modal && (
                <div className="overlay" onClick={closeDetails}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="modal-close-button" onClick={closeDetails}>&times;</button>
                        <h3 className="modal-title">Detail BUMDes - {modal.namabumdesa || '-'}</h3>
                        <div className="modal-details-grid">
                            {Object.entries(modal).map(([key, value]) => {
                                if (key.includes('id') || key.includes('_id')) return null;
                                const label = key.replace(/([A-Z])/g, ' $1').trim().replace(/_/g, ' ');
                                return (
                                    <div key={key} className="detail-item">
                                        <span className="detail-label">{label}:</span>
                                        <span className="detail-value">{value || '-'}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BumdesDashboard;