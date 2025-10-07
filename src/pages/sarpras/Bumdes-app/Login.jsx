// Login.js
import React, { useState } from 'react';
import api from '../../../services/api.js';
import { FaSignInAlt, FaSpinner, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';


function Login({ onLoginSuccess }) {
    const [desa, setDesa] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState({ text: '', type: '' });

    const showMessagePopup = (text, type) => {
        setPopupMessage({ text, type });
        setShowPopup(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setShowPopup(false);

        try {
            const response = await api.post('/login/desa', { desa });
            // Panggil fungsi onLoginSuccess dari parent
            onLoginSuccess(response.data);
            showMessagePopup("Login Berhasil!", 'success');
        } catch (err) {
            console.error('Login error:', err);
            const errorMessage = err.response?.data?.message || 'Gagal masuk. Nama desa tidak ditemukan atau terjadi kesalahan server.';
            showMessagePopup(errorMessage, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container-wrapper">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-icon"><FaSignInAlt /></div>
                    <h1 className="login-title">Login BUMDesa</h1>
                    <p className="login-subtitle">Masuk untuk mengelola data BUMDesa Anda</p>
                </div>
                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label className="input-label">Nama Desa:</label>
                        <div className="input-with-icon">
                            <input 
                                type="text" 
                                className="form-input" 
                                value={desa} 
                                onChange={(e) => setDesa(e.target.value)} 
                                placeholder="Masukkan nama desa"
                                required 
                            />
                        </div>
                    </div>
                    <button type="submit" className="login-button" disabled={loading}>
                        {loading ? (
                            <>
                                <FaSpinner className="spinner" />
                                <span>Memuat...</span>
                            </>
                        ) : (
                            <>
                                <FaSignInAlt />
                                <span>Masuk</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
            {showPopup && (
                <div className="popup-overlay">
                    <div className={`popup-content ${popupMessage.type}`}>
                        <div className="popup-icon">
                            {popupMessage.type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
                        </div>
                        <p className="popup-text">{popupMessage.text}</p>
                        <button onClick={() => setShowPopup(false)} className="close-popup-btn">
                            Tutup
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Login;