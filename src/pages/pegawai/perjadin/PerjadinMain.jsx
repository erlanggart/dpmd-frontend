import { useState, lazy, Suspense, useCallback } from 'react';
import { LayoutDashboard, List, TrendingUp, PlusCircle } from 'lucide-react';

// Lazy load tab components
const PerjadinDashboard = lazy(() => import('./PerjadinDashboard'));
const PerjadinList = lazy(() => import('./PerjadinList'));
const PerjadinForm = lazy(() => import('./PerjadinForm'));

function PerjadinMain() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingKegiatan, setEditingKegiatan] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedBidangId, setSelectedBidangId] = useState('');

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'statistik', label: 'Statistik', icon: TrendingUp },
    { id: 'form', label: 'Form Kegiatan', icon: PlusCircle },
    { id: 'list', label: 'List Kegiatan', icon: List }
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
    setSelectedBidangId(bidangId);
    setActiveTab('list');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 whitespace-nowrap
                    ${isActive
                      ? 'bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-lg shadow-slate-500/25'
                      : 'bg-white text-gray-600 hover:text-gray-800 hover:shadow-md border border-gray-200'
                    }
                  `}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
          <Suspense fallback={<LoadingSpinner />}>
            {activeTab === 'dashboard' && (
              <PerjadinDashboard 
                key={`dashboard-${refreshKey}`} 
                onBidangClick={handleBidangClick}
              />
            )}
            {activeTab === 'statistik' && (
              <div className="p-4 md:p-6">
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-700 mb-2">Statistik</h3>
                  <p className="text-gray-500">Fitur statistik akan segera hadir</p>
                </div>
              </div>
            )}
            {activeTab === 'form' && (
              <PerjadinForm
                key={editingKegiatan?.id_kegiatan || 'new'}
                editData={editingKegiatan}
                onSuccess={handleFormSuccess}
                onCancel={handleFormCancel}
              />
            )}
            {activeTab === 'list' && (
              <PerjadinList
                key={`list-${refreshKey}-${selectedBidangId}`}
                onAddNew={handleAddNew}
                onEdit={handleEdit}
                initialBidangFilter={selectedBidangId}
                onBidangFilterChange={setSelectedBidangId}
              />
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
}

export default PerjadinMain;
