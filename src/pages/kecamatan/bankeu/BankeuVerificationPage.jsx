import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../api";
import Swal from "sweetalert2";
import {
  LuEye, LuCheck, LuX, LuRefreshCw, LuClock, LuFileText,
  LuChevronRight, LuDownload, LuInfo, LuArrowRight, LuSettings
} from "react-icons/lu";
import KecamatanBankeuConfigTab from "../../../components/kecamatan/KecamatanBankeuConfigTab";
import { JABATAN_OPTIONS } from "../../../constants/jabatanOptions";

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const BankeuVerificationPage = () => {
  const navigate = useNavigate();
  const [masterKegiatan, setMasterKegiatan] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [desas, setDesas] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('verifikasi');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [masterRes, proposalsRes, statsRes, desasRes] = await Promise.all([
        api.get("/desa/bankeu/master-kegiatan"),
        api.get("/kecamatan/bankeu/proposals"),
        api.get("/kecamatan/bankeu/statistics"),
        api.get("/desas")
      ]);

      // Handle master kegiatan - extract from nested structure
      const masterData = masterRes.data.data;
      const allKegiatan = [];
      
      if (masterData.infrastruktur && Array.isArray(masterData.infrastruktur)) {
        allKegiatan.push(...masterData.infrastruktur);
      }
      if (masterData.non_infrastruktur && Array.isArray(masterData.non_infrastruktur)) {
        allKegiatan.push(...masterData.non_infrastruktur);
      }
      
      setMasterKegiatan(allKegiatan);
      setProposals(proposalsRes.data.data);
      setStatistics(statsRes.data.data);
      
      const user = JSON.parse(localStorage.getItem("user"));
      const userKecamatanId = parseInt(user?.kecamatan_id);
      
      const filteredDesas = desasRes.data.data.filter(d => {
        return parseInt(d.kecamatan_id) === userKecamatanId;
      });
      
      setDesas(filteredDesas);
    } catch (error) {
      console.error("Error fetching data:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal memuat data"
      });
    } finally {
      setLoading(false);
    }
  };

  // Group data by desa
  const groupByDesa = () => {
    return desas.map(desa => {
      const desaIdNum = parseInt(desa.id);
      const desaProposals = proposals.filter(p => parseInt(p.desa_id) === desaIdNum);
      
      // Separate infrastruktur and non-infrastruktur
      const infrastruktur = masterKegiatan
        .filter(k => k.jenis_kegiatan === 'infrastruktur')
        .map(kegiatan => {
          const proposal = desaProposals.find(p => parseInt(p.kegiatan_id) === parseInt(kegiatan.id));
          return {
            kegiatan,
            proposal: proposal || null
          };
        });
      
      const nonInfrastruktur = masterKegiatan
        .filter(k => k.jenis_kegiatan === 'non_infrastruktur')
        .map(kegiatan => {
          const proposal = desaProposals.find(p => parseInt(p.kegiatan_id) === parseInt(kegiatan.id));
          return {
            kegiatan,
            proposal: proposal || null
          };
        });
      
      const totalProposals = desaProposals.length;
      const totalKegiatan = masterKegiatan.length;
      const percentage = totalKegiatan > 0 ? Math.round((totalProposals / totalKegiatan) * 100) : 0;
      
      // Count by status
      const pending = desaProposals.filter(p => p.status === 'pending').length;
      const verified = desaProposals.filter(p => p.status === 'verified').length;
      const rejected = desaProposals.filter(p => p.status === 'rejected').length;
      const revision = desaProposals.filter(p => p.status === 'revision').length;
      
      return {
        desa,
        infrastruktur,
        nonInfrastruktur,
        totalProposals,
        totalKegiatan,
        percentage,
        pending,
        verified,
        rejected,
        revision
      };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Memuat data...</div>
      </div>
    );
  }

  const desaGroups = groupByDesa();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Bankeu - Verifikasi & Konfigurasi</h1>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md border-b border-gray-200">
        <div className="flex gap-0">
          <button
            onClick={() => setActiveTab('verifikasi')}
            className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-all duration-200 ${
              activeTab === 'verifikasi'
                ? 'border-violet-600 text-violet-600 bg-violet-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <LuFileText className="w-5 h-5" />
            <span>Verifikasi Proposal</span>
          </button>
          <button
            onClick={() => setActiveTab('konfigurasi')}
            className={`flex items-center gap-2 px-6 py-4 font-medium border-b-2 transition-all duration-200 ${
              activeTab === 'konfigurasi'
                ? 'border-violet-600 text-violet-600 bg-violet-50'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <LuSettings className="w-5 h-5" />
            <span>Konfigurasi</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'verifikasi' && (
        <div className="space-y-6">
          {/* Statistics */}
          <div className="bg-white rounded-lg shadow-md p-6">
            {statistics && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Total</div>
                  <div className="text-2xl font-bold text-blue-600">{statistics.total_proposals}</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Pending</div>
                  <div className="text-2xl font-bold text-yellow-600">{statistics.pending}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Disetujui</div>
                  <div className="text-2xl font-bold text-green-600">{statistics.verified}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Ditolak</div>
                  <div className="text-2xl font-bold text-red-600">{statistics.rejected}</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Revisi</div>
                  <div className="text-2xl font-bold text-orange-600">{statistics.revision}</div>
                </div>
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Infrastruktur</div>
                  <div className="text-2xl font-bold text-indigo-600">{statistics.infrastruktur}</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Non-Infrastruktur</div>
                  <div className="text-2xl font-bold text-purple-600">{statistics.non_infrastruktur}</div>
                </div>
              </div>
            )}
          </div>

          {/* Desa List */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Daftar Desa</h2>
            
            {desaGroups.length === 0 ? (
              <div className="text-center py-8 text-gray-500">Belum ada data desa</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {desaGroups.map((group) => (
                  <button
                    key={group.desa.id}
                    onClick={() => navigate(`/kecamatan/bankeu/verifikasi/${group.desa.id}`)}
                    className="bg-gradient-to-r from-violet-50 to-purple-50 hover:from-violet-100 hover:to-purple-100 rounded-lg p-6 transition-all duration-300 border-2 border-violet-200 hover:border-violet-400 shadow-sm hover:shadow-md group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 text-left group-hover:text-violet-700 transition-colors">
                          {group.desa.nama}
                        </h3>
                      </div>
                      <LuArrowRight className="w-6 h-6 text-violet-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                    
                    <div className="space-y-3">
                      {/* Progress Bar */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-gray-600">Progress Upload</span>
                          <span className="text-sm font-bold text-violet-700">{group.percentage}%</span>
                        </div>
                        <div className="bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-violet-600 h-2 rounded-full transition-all duration-500" 
                            style={{width: `${group.percentage}%`}}
                          ></div>
                        </div>
                      </div>
                      
                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="bg-white rounded p-2">
                          <div className="text-gray-600 text-xs">Total Proposal</div>
                          <div className="font-bold text-violet-700">{group.totalProposals} / {group.totalKegiatan}</div>
                        </div>
                        <div className="bg-white rounded p-2">
                          <div className="text-gray-600 text-xs">Status</div>
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {group.pending > 0 && (
                              <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-semibold">
                                {group.pending}
                              </span>
                            )}
                            {group.verified > 0 && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-semibold">
                                {group.verified}
                              </span>
                            )}
                            {group.revision > 0 && (
                              <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs font-semibold">
                                {group.revision}
                              </span>
                            )}
                            {group.rejected > 0 && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-semibold">
                                {group.rejected}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'konfigurasi' && (
        <KecamatanBankeuConfigTab />
      )}
    </div>
  );
};

export default BankeuVerificationPage;
