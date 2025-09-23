// BumdesApp.js
import React, { useState, useEffect } from 'react';
import { FaPlus, FaChartBar, FaUserEdit, FaSignOutAlt } from 'react-icons/fa';
import api from '../../../services/api.js';
import BumdesForm from './BumdesForm';
import BumdesDashboard from './BumdesDashboard';
import BumdesDashboardModern from './BumdesDashboardModern';
import Login from './Login';
import BumdesEditDashboard from './BumdesEditDashboard';
import './bumdes.css';

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
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

export default BumdesApp;