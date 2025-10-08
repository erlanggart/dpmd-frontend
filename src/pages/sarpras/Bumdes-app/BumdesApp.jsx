// BumdesApp.jsx - Modern Tailwind Design
import React, { useState, Suspense, lazy } from 'react';
import { FaPlus, FaChartBar, FaBuilding } from 'react-icons/fa';
import { FiFileText } from 'react-icons/fi';
import { HiSparkles } from 'react-icons/hi';

// Lazy load komponen untuk performa yang lebih baik
const BumdesForm = lazy(() => import('./BumdesForm'));
const BumdesDashboardModern = lazy(() => import('./BumdesDashboardModern'));
const BumdesDokumenManager = lazy(() => import('./BumdesDokumenManager'));

// Modern Loading Fallback Component with Tailwind
const ModernLoadingFallback = () => (
    <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-12 shadow-2xl border border-white/20 max-w-md mx-4">
            <div className="flex flex-col items-center space-y-6">
                {/* Animated Spinner */}
                <div className="relative">
                    <div className="w-16 h-16 border-4 border-white rounded-full"></div>
                    <div className="w-16 h-16 border-4 border-slate-800 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <FaBuilding className="text-slate-800 text-xl animate-pulse" />
                    </div>
                </div>
                
                {/* Loading Text */}
                <div className="text-center">
                    <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <HiSparkles className="text-slate-800" />
                        Memuat Komponen...
                    </h3>
                    <p className="text-slate-800">Mohon tunggu sebentar</p>
                </div>
                
                {/* Progress Dots */}
                <div className="flex space-x-2">
                    <div className="w-2 h-2 bg-slate-800 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-800 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                    <div className="w-2 h-2 bg-slate-800 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
            </div>
        </div>
    </div>
);

function BumdesApp() {
    // State untuk mengelola tampilan
    const [view, setView] = useState('statistik'); // Tampilan default

    // Fungsi untuk berpindah navigasi
    const handleNavClick = (newView) => {
        setView(newView);
    };

    const renderContent = () => {
        switch (view) {
            case 'form':
                return <BumdesForm onSwitchToDashboard={() => setView('statistik')} />;
            case 'statistik':
                return <BumdesDashboardModern />;
            case 'dokumen':
                return <BumdesDokumenManager />;
            default:
                return <BumdesDashboardModern />;
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <div className="container mx-auto px-3 py-8 max-w-8xl">
                {/* Enhanced Header Section */}
                <div className="relative mb-8">
                    <div className="bg-slate-800 rounded-3xl shadow-2xl p-8 overflow-hidden">
                        {/* Background Pattern */}
                        <div className="absolute inset-0 opacity-5">
                            <svg className="w-full h-full" viewBox="0 0 100 100" fill="none">
                                <defs>
                                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="1"/>
                                    </pattern>
                                </defs>
                                <rect width="100" height="100" fill="url(#grid)" />
                            </svg>
                        </div>
                        
                        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                            <div className="flex items-center gap-4">
                                {/* Icon dengan navy background */}
                                <div className="relative">
                                    <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center shadow-lg">
                                        <FaBuilding className="text-white text-2xl" />
                                    </div>
                                    <div className="absolute -top-1 -right-1">
                                        <HiSparkles className="text-white text-lg animate-pulse" />
                                    </div>
                                </div>
                                
                                <div>
                                    <h1 className="text-4xl font-bold text-white mb-2">
                                        Data BUMDes
                                    </h1>
                                    <p className="text-white text-lg font-medium">
                                        Aplikasi Pengelolaan Data BUMDes Kabupaten Bogor
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Enhanced Navigation Buttons */}
                <div className="mb-8">
                    <div className="bg-white rounded-2xl p-2 shadow-xl border border-white">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <button
                                onClick={() => handleNavClick('form')}
                                className={`group relative overflow-hidden rounded-xl px-6 py-4 font-semibold transition-all duration-300 transform hover:scale-105 ${
                                    view === 'form' 
                                        ? 'bg-slate-800 text-white shadow-lg' 
                                        : 'bg-white text-slate-800 hover:bg-white hover:shadow-md'
                                }`}
                            >
                                <div className="flex items-center justify-center gap-3">
                                    <FaPlus className={`text-xl transition-transform duration-300 ${view === 'form' ? 'rotate-90' : 'group-hover:rotate-90'}`} />
                                    <span className="text-lg">Formulir Input</span>
                                </div>
                            </button>
                            
                            <button
                                onClick={() => handleNavClick('statistik')}
                                className={`group relative overflow-hidden rounded-xl px-6 py-4 font-semibold transition-all duration-300 transform hover:scale-105 ${
                                    view === 'statistik' 
                                        ? 'bg-slate-800 text-white shadow-lg' 
                                        : 'bg-white text-slate-800 hover:bg-white hover:shadow-md'
                                }`}
                            >
                                <div className="flex items-center justify-center gap-3">
                                    <FaChartBar className={`text-xl transition-transform duration-300 ${view === 'statistik' ? 'scale-110' : 'group-hover:scale-110'}`} />
                                    <span className="text-lg">Dashboard Statistik</span>
                                </div>
                            </button>

                            <button
                                onClick={() => handleNavClick('dokumen')}
                                className={`group relative overflow-hidden rounded-xl px-6 py-4 font-semibold transition-all duration-300 transform hover:scale-105 ${
                                    view === 'dokumen' 
                                        ? 'bg-slate-800 text-white shadow-lg' 
                                        : 'bg-white text-slate-800 hover:bg-white hover:shadow-md'
                                }`}
                            >
                                <div className="flex items-center justify-center gap-3">
                                    <FiFileText className={`text-xl transition-transform duration-300 ${view === 'dokumen' ? 'scale-110' : 'group-hover:scale-110'}`} />
                                    <span className="text-lg">Kelola Dokumen</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Enhanced Content Container */}
                <div className="bg-white rounded-3xl shadow-xl border border-white min-h-[600px] overflow-hidden">
                    <Suspense fallback={<ModernLoadingFallback />}>
                        {renderContent()}
                    </Suspense>
                </div>
            </div>
        </div>
    );
}

export default BumdesApp;