import React, { useState, Suspense, lazy } from 'react';
import { FiHome, FiBarChart2, FiTrendingUp, FiPlus, FiList } from 'react-icons/fi';

// Lazy load komponen untuk performa yang lebih baik dengan memoization
const Dashboard = lazy(() => import('./Dashboard'));
const Statistik = lazy(() => import('./Statistik'));
const KegiatanForm = lazy(() => import('./KegiatanForm'));
const KegiatanList = lazy(() => import('./KegiatanList'));
const DetailLengkap = lazy(() => import('./DetailLengkap'));

// Memoized wrapper components to prevent unnecessary re-renders
const MemoizedDashboard = React.memo(Dashboard);
const MemoizedStatistik = React.memo(Statistik);
const MemoizedKegiatanForm = React.memo(KegiatanForm);
const MemoizedKegiatanList = React.memo(KegiatanList);
const MemoizedDetailLengkap = React.memo(DetailLengkap);

// Enhanced Loading Fallback untuk komponen
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[500px]">
    <div className="text-center space-y-6">
      {/* Animated Loading Spinner */}
      <div className="relative">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200 mx-auto"></div>
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-700 border-t-transparent absolute top-0 left-1/2 transform -translate-x-1/2"></div>
      </div>
      
      {/* Loading Text with Animation */}
      <div className="space-y-2">
        <p className="text-slate-700 font-semibold text-lg">Memuat Komponen</p>
        <div className="flex items-center justify-center gap-1">
          <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
          <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
          <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
        </div>
      </div>
      
      {/* Progress Bar */}
      <div className="w-64 mx-auto">
        <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-600 to-slate-800 h-full rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  </div>
);

const PerjalananDinas = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dateFilter, setDateFilter] = useState('');
  const [bidangFilter, setBidangFilter] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedPerjadinId, setSelectedPerjadinId] = useState(null);
  const [mountedTabs, setMountedTabs] = useState(new Set(['dashboard'])); // Track mounted components

  const handleFilterClick = (date, bidang) => {
    setDateFilter(date);
    setBidangFilter(bidang);
    setActiveTab('kegiatan-list');
    // Mark tab as mounted
    setMountedTabs(prev => new Set([...prev, 'kegiatan-list']));
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Mark tab as mounted when first accessed
    setMountedTabs(prev => new Set([...prev, tabId]));
  };

  // Function to trigger refresh of all components
  const triggerDataRefresh = () => {
    console.log('🔄 Main: Triggering data refresh for all components');
    setRefreshTrigger(prev => prev + 1);
  };

  // Handle successful form submission
  const handleFormSuccess = () => {
    console.log('✅ Main: Form submitted successfully, switching to list and refreshing data');
    setActiveTab('kegiatan-list');
    triggerDataRefresh(); // Refresh all data
  };

  // Handle detail view navigation
  const handleDetailView = (perjadinId) => {
    setSelectedPerjadinId(perjadinId);
    setActiveTab('detail-lengkap');
    setMountedTabs(prev => new Set([...prev, 'detail-lengkap']));
  };

  // Handle back from detail view
  const handleBackFromDetail = () => {
    setActiveTab('kegiatan-list');
    setSelectedPerjadinId(null);
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: FiHome, gradient: 'from-slate-700 to-slate-900' },
    { id: 'statistik', label: 'Statistik', icon: FiTrendingUp, gradient: 'from-slate-600 to-slate-800' },
    { id: 'kegiatan-form', label: 'Form Kegiatan', icon: FiPlus, gradient: 'from-slate-700 to-slate-900' },
    { id: 'kegiatan-list', label: 'List Kegiatan', icon: FiList, gradient: 'from-slate-600 to-slate-800' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
      {/* Enhanced Header */}
      <div className="bg-white shadow-lg border-b border-slate-200/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl shadow-xl">
                  <FiBarChart2 className="text-white text-2xl" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Perjalanan Dinas
                </h1>
                <p className="text-slate-600 text-base mt-1 font-medium">Sistem Manajemen Perjalanan Dinas Terpadu</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-slate-500">Online</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-slate-500">Status Sistem</p>
                <p className="text-xl font-bold text-slate-800">Online</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Navigation Tabs - Removed sticky positioning */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex" aria-label="Tabs">
            {tabs.map((tab, index) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`group relative flex-1 flex items-center justify-center gap-3 py-4 px-6 text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  {/* Active Tab Background */}
                  {isActive && (
                    <div className={`absolute inset-0 bg-gradient-to-r ${tab.gradient} shadow-lg transform scale-105 rounded-t-xl`}></div>
                  )}
                  
                  {/* Tab Content */}
                  <div className="relative flex items-center gap-3">
                    <div className={`p-2 rounded-lg transition-all duration-300 ${
                      isActive 
                        ? 'bg-white/20 shadow-inner' 
                        : 'bg-slate-100 group-hover:bg-slate-200'
                    }`}>
                      <IconComponent className={`w-5 h-5 transition-all duration-300 ${
                        isActive ? 'text-white' : 'text-slate-600 group-hover:text-slate-800'
                      }`} />
                    </div>
                    <span className="font-medium">{tab.label}</span>
                  </div>

                  {/* Tab Indicator */}
                  {isActive && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-white rounded-t-full"></div>
                  )}

                  {/* Hover Effect */}
                  {!isActive && (
                    <div className="absolute inset-0 bg-slate-200/0 group-hover:bg-slate-200/50 transition-all duration-300 rounded-t-xl"></div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Enhanced Content Area */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white/60 backdrop-blur-sm rounded-2xl shadow-xl border border-slate-200/50 overflow-hidden">
          {/* Content Header */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-900 px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse"></div>
                <h2 className="text-xl font-bold text-white">
                  {tabs.find(tab => tab.id === activeTab)?.label || 'Content'}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <div className="px-3 py-1 bg-white/20 rounded-full text-white text-sm font-medium">
                  Aktif
                </div>
              </div>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-8">
            <Suspense fallback={<LoadingFallback />}>
              <div className="transition-all duration-500 ease-in-out">
                {/* Keep components alive but hide inactive ones to prevent re-mounting and re-fetching */}
                
                {/* Dashboard - Always mounted as default */}
                <div className={`${activeTab === 'dashboard' ? 'animate-fadeIn' : 'hidden'}`}>
                  <MemoizedDashboard 
                    onFilterClick={handleFilterClick} 
                    refreshTrigger={refreshTrigger}
                  />
                </div>

                {/* Statistik - Mount once and keep alive */}
                {mountedTabs.has('statistik') && (
                  <div className={`${activeTab === 'statistik' ? 'animate-fadeIn' : 'hidden'}`}>
                    <MemoizedStatistik refreshTrigger={refreshTrigger} />
                  </div>
                )}

                {/* Kegiatan Form - Mount once and keep alive */}
                {mountedTabs.has('kegiatan-form') && (
                  <div className={`${activeTab === 'kegiatan-form' ? 'animate-fadeIn' : 'hidden'}`}>
                    <MemoizedKegiatanForm 
                      onSuccess={handleFormSuccess}
                    />
                  </div>
                )}

                {/* Kegiatan List - Mount once and keep alive */}
                {mountedTabs.has('kegiatan-list') && (
                  <div className={`${activeTab === 'kegiatan-list' ? 'animate-fadeIn' : 'hidden'}`}>
                    <MemoizedKegiatanList 
                      initialDateFilter={dateFilter}
                      initialBidangFilter={bidangFilter}
                      onAddNew={() => handleTabChange('kegiatan-form')}
                      onDetailView={handleDetailView}
                      refreshTrigger={refreshTrigger}
                    />
                  </div>
                )}

                {/* Detail Lengkap - Mount once and keep alive */}
                {mountedTabs.has('detail-lengkap') && (
                  <div className={`${activeTab === 'detail-lengkap' ? 'animate-fadeIn' : 'hidden'}`}>
                    <MemoizedDetailLengkap 
                      perjadinId={selectedPerjadinId}
                      onBack={handleBackFromDetail}
                    />
                  </div>
                )}
              </div>
            </Suspense>
          </div>
        </div>

        {/* Bottom Decoration */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full shadow-lg border border-slate-200/50">
            <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
            <span className="text-slate-600 text-sm font-medium">Perjalanan Dinas Management System</span>
            <div className="w-2 h-2 bg-slate-600 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>
    </div>
  );
};

export default PerjalananDinas;
