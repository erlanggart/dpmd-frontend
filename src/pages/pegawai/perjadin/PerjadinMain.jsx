import { useState, lazy, Suspense, useCallback } from 'react';
import { LayoutDashboard, List, TrendingUp, PlusCircle, Menu, X } from 'lucide-react';

// Lazy load tab components
const PerjadinDashboard = lazy(() => import('./PerjadinDashboard'));
const PerjadinList = lazy(() => import('./PerjadinList'));
const PerjadinForm = lazy(() => import('./PerjadinForm'));

function PerjadinMain() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingKegiatan, setEditingKegiatan] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedBidangId, setSelectedBidangId] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const tabs = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard
    },
    {
      id: 'statistik',
      label: 'Statistik',
      icon: TrendingUp
    },
    {
      id: 'form',
      label: 'Form Kegiatan',
      icon: PlusCircle
    },
    {
      id: 'list',
      label: 'List Kegiatan',
      icon: List
    }
  ];

  const LoadingSpinner = () => (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
        <p className="text-gray-500">Memuat konten...</p>
      </div>
    </div>
  );

  const handleAddNew = useCallback(() => {
    setEditingKegiatan(null);
    setActiveTab('form');
  }, []);

  const handleEdit = useCallback((kegiatan) => {
    setEditingKegiatan(kegiatan);
    setActiveTab('form');
  }, []);

  const handleFormSuccess = useCallback(() => {
    setEditingKegiatan(null);
    setRefreshKey(prev => prev + 1);
    setActiveTab('list');
  }, []);

  const handleFormCancel = useCallback(() => {
    setEditingKegiatan(null);
    setActiveTab('list');
  }, []);

  const handleBidangClick = useCallback((bidangId) => {
    console.log('handleBidangClick called with bidangId:', bidangId);
    setSelectedBidangId(bidangId);
    setActiveTab('list');
  }, []);

  const handleMenuToggle = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Sidebar Overlay */}
      <div
        className={`md:hidden fixed inset-0 z-50 transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Sidebar Panel */}
          <div className={`absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <div className="p-5">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-200">
                <h2 className="text-gray-800 text-lg font-bold flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center shadow-lg">
                    <LayoutDashboard className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span>Perjadin</span>
                    <p className="text-xs text-gray-500 font-normal">Perjalanan Dinas</p>
                  </div>
                </h2>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setSidebarOpen(false);
                      }}
                      className={`
                        w-full flex items-center gap-3 px-4 py-3.5 font-medium text-sm transition-all rounded-xl
                        ${isActive
                          ? 'bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-lg shadow-slate-500/30'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                        }
                      `}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                      <span className="flex-1 text-left">{tab.label}</span>
                      {isActive && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

      {/* Sidebar Navigation - Desktop Only */}
      <div className="hidden md:block w-64 bg-white shadow-2xl min-h-screen sticky top-0 border-r border-gray-200 flex-shrink-0">
        <div className="p-6">
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h2 className="text-gray-800 text-xl font-bold flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-slate-700 to-slate-900 rounded-lg flex items-center justify-center shadow-lg">
                <LayoutDashboard className="w-6 h-6 text-white" />
              </div>
              <span>Perjadin</span>
            </h2>
            <p className="text-xs text-gray-500 mt-2 ml-13">Perjalanan Dinas</p>
          </div>
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3.5 font-medium text-sm transition-all rounded-xl
                    ${isActive
                      ? 'bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-lg shadow-slate-500/30'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }
                  `}
                >
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  <span className="flex-1 text-left">{tab.label}</span>
                  {isActive && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <Suspense fallback={<LoadingSpinner />}>
            {activeTab === 'dashboard' && (
              <PerjadinDashboard 
                key={`dashboard-${refreshKey}`} 
                onBidangClick={handleBidangClick}
                onMenuToggle={handleMenuToggle}
              />
            )}
            {activeTab === 'statistik' && (
              <div>
                <div className="bg-[#2C3E50] px-4 md:px-6 py-3 md:py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleMenuToggle}
                      className="md:hidden p-1.5 -ml-1 rounded-lg hover:bg-white/10 transition"
                    >
                      <Menu className="w-5 h-5 text-white" />
                    </button>
                    <TrendingUp className="w-5 h-5 text-white" />
                    <h2 className="text-lg md:text-xl font-bold text-white">Statistik</h2>
                  </div>
                </div>
                <div className="p-4 md:p-6">
                  <div className="bg-white rounded-xl shadow-md p-12 text-center">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <TrendingUp className="w-10 h-10 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-700 mb-2">Statistik</h3>
                    <p className="text-gray-500">Fitur statistik akan segera hadir</p>
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'form' && (
              <PerjadinForm
                key={editingKegiatan?.id_kegiatan || 'new'}
                editData={editingKegiatan}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
                onMenuToggle={handleMenuToggle}
              />
            )}
            {activeTab === 'list' && (
              <PerjadinList
                key={`list-${refreshKey}-${selectedBidangId}`}
                onAddNew={handleAddNew}
                onEdit={handleEdit}
                initialBidangFilter={selectedBidangId}
                onBidangFilterChange={setSelectedBidangId}
                onMenuToggle={handleMenuToggle}
              />
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default PerjadinMain;
