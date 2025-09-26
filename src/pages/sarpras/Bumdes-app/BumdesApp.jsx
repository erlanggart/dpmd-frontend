// BumdesApp.js
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { FaPlus, FaChartBar, FaUserEdit, FaSignOutAlt } from 'react-icons/fa';
import api from '../../../services/api.js';
import './bumdes.css';

// Lazy load komponen untuk performa yang lebih baik
const BumdesForm = lazy(() => import('./BumdesForm'));
const BumdesDashboard = lazy(() => import('./BumdesDashboard'));
const BumdesDashboardModern = lazy(() => import('./BumdesDashboardModern'));
const Login = lazy(() => import('./Login'));
const BumdesEditDashboard = lazy(() => import('./BumdesEditDashboard'));

// Modern Loading Fallback Component
const ModernLoadingFallback = () => (
    <div className="lazy-loading-container">
        <div className="lazy-loading-content">
            <div className="lazy-spinner-container">
                <svg className="lazy-spinner" viewBox="0 0 50 50">
                    <circle className="lazy-spinner-path" cx="25" cy="25" r="20" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeDasharray="31.416" strokeDashoffset="31.416">
                        <animate attributeName="stroke-array" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                        <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
                    </circle>
                </svg>
            </div>
            <div className="lazy-loading-text">
                <h3>Memuat Komponen...</h3>
                <p>Mohon tunggu sebentar</p>
            </div>
        </div>
    </div>
);

function BumdesApp() {
    // State untuk mengelola tampilan dan data sesi
    const [view, setView] = useState('statistik'); // Tampilan default
    const [loggedIn, setLoggedIn] = useState(false);
    const [bumdesData, setBumdesData] = useState(null);

    // Cek sesi login di localStorage saat komponen pertama kali dimuat
    useEffect(() => {
        const storedBumdesData = localStorage.getItem('bumdesData');
        if (storedBumdesData) {
            const data = JSON.parse(storedBumdesData);
            setLoggedIn(true);
            setBumdesData(data);
            // Set view ke 'edit' jika data sudah ada
            setView('edit'); 
        }
    }, []);

    // Fungsi untuk menangani login berhasil
    const handleLoginSuccess = (data) => {
        // Simpan data di localStorage untuk mempertahankan sesi
        localStorage.setItem('bumdesData', JSON.stringify(data));
        setLoggedIn(true);
        setBumdesData(data);
        setView('edit');
    };

    // Fungsi untuk menangani logout
    const handleLogout = () => {
        // Hapus data dari localStorage
        localStorage.removeItem('bumdesData');
        setLoggedIn(false);
        setBumdesData(null);
        setView('login');
    };

    // Fungsi untuk berpindah navigasi
    const handleNavClick = (newView) => {
        setView(newView);
    };

    const renderContent = () => {
        switch (view) {
            case 'form':
                return <BumdesForm />;
            case 'statistik':
                return <BumdesDashboardModern />;
            case 'login':
                // Teruskan fungsi handleLoginSuccess ke komponen Login
                return <Login onLoginSuccess={handleLoginSuccess} />;
            case 'edit':
                if (!loggedIn || !bumdesData) {
                    // Jika data tidak ada, arahkan kembali ke login
                    return <Login onLoginSuccess={handleLoginSuccess} />;
                }
                // Teruskan data dan fungsi logout ke BumdesEditDashboard
                return <BumdesEditDashboard initialData={bumdesData} onLogout={handleLogout} />;
            default:
                return <BumdesDashboardModern />;
        }
    };

    return (
        <div className="app-container">
            <div className="main-content-wrapper">
                <div className="header-card">
                    <div className="header-content">
                        <div>
                            <h1 className="header-title">Data BUMDes</h1>
                            <p className="header-subtitle">Aplikasi Pengelolaan Data BUMDes</p>
                        </div>
                    </div>
                    {loggedIn && (
                        <button onClick={handleLogout} className="logout-button">
                            <FaSignOutAlt /> Keluar
                        </button>
                    )}
                </div>

                <div className="nav-buttons-container">
                    <button
                        onClick={() => handleNavClick('form')}
                        className={`nav-button ${view === 'form' ? 'active' : ''}`}
                    >
                        <FaPlus className="nav-icon" /> Formulir
                    </button>
                    <button
                        onClick={() => handleNavClick('statistik')}
                        className={`nav-button ${view === 'statistik' ? 'active' : ''}`}
                    >
                        <FaChartBar className="nav-icon" /> Statistik
                    </button>
                    <button
                        onClick={() => handleNavClick(loggedIn ? 'edit' : 'login')}
                        className={`nav-button ${view === 'login' || view === 'edit' ? 'active' : ''}`}
                    >
                        <FaUserEdit className="nav-icon" /> {loggedIn ? 'Edit Data' : 'Login & Edit'}
                    </button>
                </div>

                <div className="content-card">
                    <Suspense fallback={<ModernLoadingFallback />}>
                        {renderContent()}
                    </Suspense>
                </div>
            </div>
        </div>
    );
}

export default BumdesApp;