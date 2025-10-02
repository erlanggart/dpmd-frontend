import React, { useState } from 'react';
import { FaPlus, FaChartBar, FaUserEdit } from 'react-icons/fa';
import './bumdes.css';

function BumdesAppSimple() {
    const [view, setView] = useState('info');

    const renderContent = () => {
        switch (view) {
            case 'form':
                return (
                    <div style={{ padding: '20px' }}>
                        <h3>Form Input BUMDes</h3>
                        <p>Form component akan dimuat di sini.</p>
                    </div>
                );
            case 'statistik':
                return (
                    <div style={{ padding: '20px' }}>
                        <h3>Dashboard Statistik</h3>
                        <p>Chart dan statistik akan dimuat di sini.</p>
                    </div>
                );
            case 'info':
            default:
                return (
                    <div style={{ padding: '20px' }}>
                        <h3>Informasi BUMDes</h3>
                        <p>Selamat datang di aplikasi pengelolaan data BUMDes!</p>
                        <p>Gunakan menu navigasi di atas untuk mengakses fitur-fitur yang tersedia.</p>
                    </div>
                );
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
                </div>

                <div className="nav-buttons-container">
                    <button
                        onClick={() => setView('info')}
                        className={`nav-button ${view === 'info' ? 'active' : ''}`}
                    >
                        Info
                    </button>
                    <button
                        onClick={() => setView('form')}
                        className={`nav-button ${view === 'form' ? 'active' : ''}`}
                    >
                        <FaPlus className="nav-icon" /> Formulir
                    </button>
                    <button
                        onClick={() => setView('statistik')}
                        className={`nav-button ${view === 'statistik' ? 'active' : ''}`}
                    >
                        <FaChartBar className="nav-icon" /> Statistik
                    </button>
                </div>

                <div className="content-card">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}

export default BumdesAppSimple;