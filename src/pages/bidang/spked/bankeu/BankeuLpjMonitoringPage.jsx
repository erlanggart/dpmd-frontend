import React, { useState, useEffect } from 'react';
import { FileText, Download, Search, ChevronDown, ChevronUp, Eye, CheckCircle2, XCircle, BarChart3, MapPin, Loader2, ShieldCheck, ShieldX, RotateCcw, MessageSquare, Clock, X, Trash2 } from 'lucide-react';
import api from '../../../../api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import ChatDrawer from '../../../../components/shared/ChatDrawer';

const STATUS_CONFIG = {
  pending: { label: 'Menunggu', color: 'amber', bgBadge: 'bg-amber-100 text-amber-700', icon: Clock },
  approved: { label: 'Disetujui', color: 'green', bgBadge: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  rejected: { label: 'Ditolak', color: 'red', bgBadge: 'bg-red-100 text-red-700', icon: XCircle },
  revision: { label: 'Revisi', color: 'orange', bgBadge: 'bg-orange-100 text-orange-700', icon: RotateCcw },
};

const BankeuLpjMonitoringPage = ({ tahun = 2025 }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedKecamatan, setExpandedKecamatan] = useState({});
  const [filterStatus, setFilterStatus] = useState('all'); // all, uploaded, belum, pending, approved, rejected, revision
  const [verifyModal, setVerifyModal] = useState(null); // { lpj, desa_nama }
  const [verifyAction, setVerifyAction] = useState('');
  const [verifyCatatan, setVerifyCatatan] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [deletingLpj, setDeletingLpj] = useState(null);
  const [chatLpjId, setChatLpjId] = useState(null);
  const [chatTargetUserId, setChatTargetUserId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [tahun]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/dpmd/bankeu-lpj?tahun=${tahun}`);
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching LPJ data:', error);
      toast.error('Gagal memuat data LPJ');
    } finally {
      setLoading(false);
    }
  };

  const toggleKecamatan = (kecId) => {
    setExpandedKecamatan(prev => ({ ...prev, [kecId]: !prev[kecId] }));
  };

  const expandAll = () => {
    if (!data?.kecamatan) return;
    const all = {};
    data.kecamatan.forEach(k => { all[k.kecamatan_id] = true; });
    setExpandedKecamatan(all);
  };

  const collapseAll = () => {
    setExpandedKecamatan({});
  };

  const getFileUrl = (filePath) => {
    const baseUrl = api.defaults.baseURL?.replace('/api', '') || '';
    return `${baseUrl}/storage/uploads/bankeu_lpj/${filePath}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getFilteredKecamatan = () => {
    if (!data?.kecamatan) return [];

    return data.kecamatan
      .map(kec => {
        let filteredDesa = kec.desa_list;

        // Filter by status
        if (filterStatus === 'uploaded') {
          filteredDesa = filteredDesa.filter(d => d.has_lpj);
        } else if (filterStatus === 'belum') {
          filteredDesa = filteredDesa.filter(d => !d.has_lpj);
        } else if (['pending', 'approved', 'rejected', 'revision'].includes(filterStatus)) {
          filteredDesa = filteredDesa.filter(d => d.has_lpj && d.lpj_files?.some(f => f.status === filterStatus));
        }

        // Filter by search term
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase();
          filteredDesa = filteredDesa.filter(d =>
            d.desa_nama.toLowerCase().includes(term)
          );
        }

        return { ...kec, desa_list: filteredDesa };
      })
      .filter(kec => {
        // Also filter kecamatan name if searching
        if (searchTerm.trim()) {
          return kec.desa_list.length > 0 || kec.kecamatan_nama.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return kec.desa_list.length > 0;
      });
  };

  const openVerifyModal = (lpj, desa_nama) => {
    setVerifyModal({ lpj, desa_nama });
    setVerifyAction('');
    setVerifyCatatan('');
  };

  const handleVerify = async () => {
    if (!verifyAction) {
      toast.error('Pilih tindakan verifikasi');
      return;
    }
    if (['rejected', 'revision'].includes(verifyAction) && !verifyCatatan.trim()) {
      toast.error('Catatan wajib diisi untuk penolakan atau revisi');
      return;
    }
    try {
      setVerifying(true);
      const res = await api.put(`/dpmd/bankeu-lpj/${verifyModal.lpj.id}/verify`, {
        action: verifyAction,
        catatan: verifyCatatan.trim() || null
      });
      if (res.data.success) {
        toast.success(res.data.message);
        setVerifyModal(null);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memverifikasi LPJ');
    } finally {
      setVerifying(false);
    }
  };

  const handleAdminDelete = async (lpj, desaNama) => {
    const result = await Swal.fire({
      title: 'Hapus LPJ Desa?',
      html: `
        <div style="text-align:left; font-size:14px; color:#4B5563;">
          <p style="margin-bottom:8px;">File LPJ berikut akan dihapus:</p>
          <div style="background:#FEF2F2; border:1px solid #FECACA; border-radius:8px; padding:12px; margin-bottom:8px;">
            <p style="font-weight:600; color:#991B1B;">📄 ${lpj.nama_file}</p>
            <p style="font-size:12px; color:#6B7280;">Desa ${desaNama}</p>
          </div>
          <p style="color:#DC2626; font-size:13px;">⚠️ Tindakan ini tidak dapat dibatalkan.</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DC2626',
      cancelButtonColor: '#6B7280',
      confirmButtonText: '🗑️ Ya, Hapus',
      cancelButtonText: 'Batal',
      reverseButtons: true
    });

    if (!result.isConfirmed) return;

    try {
      setDeletingLpj(lpj.id);
      const res = await api.delete(`/dpmd/bankeu-lpj/${lpj.id}`);
      if (res.data.success) {
        toast.success(res.data.message);
        fetchData();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus LPJ');
    } finally {
      setDeletingLpj(null);
    }
  };

  const handleExportExcel = () => {
    if (!data?.kecamatan) return;

    const rows = [];
    data.kecamatan.forEach(kec => {
      kec.desa_list.forEach(desa => {
        if (desa.has_lpj && desa.lpj_files?.length > 0) {
          desa.lpj_files.forEach((lpj, idx) => {
            rows.push({
              'Kecamatan': kec.kecamatan_nama,
              'Desa': desa.desa_nama,
              'File Ke': idx + 1,
              'Status LPJ': 'Sudah Upload',
              'Status Verifikasi': STATUS_CONFIG[lpj.status || 'pending']?.label || '-',
              'Nama File': lpj.nama_file || '-',
              'Ukuran File': formatFileSize(lpj.file_size),
              'Tanggal Upload': formatDate(lpj.created_at),
              'Diupload Oleh': lpj.uploaded_by_name || '-',
              'Catatan DPMD': lpj.dpmd_catatan || '-',
              'Diverifikasi Oleh': lpj.verified_by_name || '-',
              'Keterangan': lpj.keterangan || '-'
            });
          });
        } else {
          rows.push({
            'Kecamatan': kec.kecamatan_nama,
            'Desa': desa.desa_nama,
            'File Ke': '-',
            'Status LPJ': 'Belum Upload',
            'Status Verifikasi': '-',
            'Nama File': '-',
            'Ukuran File': '-',
            'Tanggal Upload': '-',
            'Diupload Oleh': '-',
            'Catatan DPMD': '-',
            'Diverifikasi Oleh': '-',
            'Keterangan': '-'
          });
        }
      });
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `LPJ Bankeu ${tahun}`);
    XLSX.writeFile(wb, `LPJ_Bantuan_Keuangan_${tahun}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Data berhasil diekspor ke Excel');
  };

  if (loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500 mx-auto" />
          <p className="mt-3 text-gray-500">Memuat data LPJ Bantuan Keuangan...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <XCircle className="h-12 w-12 text-red-400 mx-auto mb-3" />
        <p className="text-gray-600">Gagal memuat data</p>
        <button onClick={fetchData} className="mt-3 text-blue-600 hover:underline text-sm">Coba lagi</button>
      </div>
    );
  }

  const summary = data.summary;
  const filteredKecamatan = getFilteredKecamatan();

  return (
    <div className="p-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div
          onClick={() => setFilterStatus('all')}
          className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${filterStatus === 'all' ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <MapPin className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{summary.total_desa}</p>
              <p className="text-xs text-gray-500">Total Desa</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => setFilterStatus('uploaded')}
          className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${filterStatus === 'uploaded' ? 'border-green-400 ring-2 ring-green-100' : 'border-gray-200'}`}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-700">{summary.total_uploaded}</p>
              <p className="text-xs text-gray-500">Sudah Upload</p>
            </div>
          </div>
        </div>

        <div
          onClick={() => setFilterStatus('belum')}
          className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${filterStatus === 'belum' ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200'}`}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{summary.total_belum}</p>
              <p className="text-xs text-gray-500">Belum Upload</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-700">{summary.persentase}%</p>
              <p className="text-xs text-gray-500">Persentase</p>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Status Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {[
          { key: 'pending', label: `Menunggu (${summary.total_pending || 0})`, activeClass: 'bg-amber-500 text-white shadow-sm', inactiveClass: 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200' },
          { key: 'approved', label: `Disetujui (${summary.total_approved || 0})`, activeClass: 'bg-green-500 text-white shadow-sm', inactiveClass: 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200' },
          { key: 'rejected', label: `Ditolak (${summary.total_rejected || 0})`, activeClass: 'bg-red-500 text-white shadow-sm', inactiveClass: 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200' },
          { key: 'revision', label: `Revisi (${summary.total_revision || 0})`, activeClass: 'bg-orange-500 text-white shadow-sm', inactiveClass: 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(prev => prev === f.key ? 'all' : f.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              filterStatus === f.key ? f.activeClass : f.inactiveClass
            }`}
          >
            {React.createElement(STATUS_CONFIG[f.key].icon, { className: 'h-3.5 w-3.5' })}
            {f.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari desa atau kecamatan..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Expand Semua
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Collapse Semua
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export Excel
          </button>
          <button
            onClick={fetchData}
            className="px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Kecamatan Accordion */}
      <div className="space-y-3">
        {filteredKecamatan.map((kec) => {
          const isExpanded = expandedKecamatan[kec.kecamatan_id];
          const uploadedCount = kec.desa_list.filter(d => d.has_lpj).length;
          const totalFiltered = kec.desa_list.length;

          return (
            <div key={kec.kecamatan_id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Kecamatan Header */}
              <button
                onClick={() => toggleKecamatan(kec.kecamatan_id)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center">
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-gray-800">{kec.kecamatan_nama}</h4>
                    <p className="text-xs text-gray-500">
                      {uploadedCount}/{totalFiltered} desa sudah upload
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Progress bar */}
                  <div className="hidden sm:block w-32">
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all"
                        style={{ width: `${totalFiltered > 0 ? (uploadedCount / totalFiltered) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-gray-600">
                    {totalFiltered > 0 ? Math.round((uploadedCount / totalFiltered) * 100) : 0}%
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </button>

              {/* Desa List */}
              {isExpanded && (
                <div className="border-t border-gray-100">
                  <div className="divide-y divide-gray-100">
                    {kec.desa_list.map((desa) => (
                      <div key={desa.desa_id} className="px-4 py-3">
                        <div className="flex items-center gap-3 mb-1">
                          {desa.has_lpj ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                          )}
                          <p className={`font-medium text-sm ${desa.has_lpj ? 'text-gray-800' : 'text-gray-500'}`}>
                            {desa.desa_nama}
                          </p>
                          {desa.has_lpj && (
                            <span className="text-xs text-gray-400">({desa.lpj_files?.length || 0} file)</span>
                          )}
                        </div>

                        {/* Multiple LPJ files */}
                        {desa.has_lpj && desa.lpj_files?.map((lpj) => {
                          const status = lpj.status || 'pending';
                          const cfg = STATUS_CONFIG[status];
                          const Icon = cfg.icon;
                          return (
                            <div key={lpj.id} className={`ml-8 mt-2 rounded-lg border p-3 ${
                              status === 'approved' ? 'bg-green-50/50 border-green-200' :
                              status === 'rejected' ? 'bg-red-50/50 border-red-200' :
                              status === 'revision' ? 'bg-orange-50/50 border-orange-200' :
                              'bg-amber-50/30 border-amber-200'
                            }`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <Icon className={`h-4 w-4 flex-shrink-0 ${
                                    status === 'approved' ? 'text-green-500' :
                                    status === 'rejected' ? 'text-red-500' :
                                    status === 'revision' ? 'text-orange-500' :
                                    'text-amber-500'
                                  }`} />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium text-gray-700 truncate">{lpj.nama_file}</p>
                                    <p className="text-[10px] text-gray-400">
                                      {formatFileSize(lpj.file_size)} • {formatDate(lpj.created_at)}
                                    </p>
                                  </div>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${cfg.bgBadge}`}>
                                    {cfg.label}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                                  <a
                                    href={getFileUrl(lpj.file_path)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-[10px] font-medium transition-colors"
                                  >
                                    <Eye className="h-3 w-3" />
                                    Lihat
                                  </a>
                                  <button
                                    onClick={() => openVerifyModal(lpj, desa.desa_nama)}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${
                                      status === 'approved'
                                        ? 'bg-green-50 text-green-600 hover:bg-green-100'
                                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                                    }`}
                                  >
                                    <ShieldCheck className="h-3 w-3" />
                                    {status === 'approved' ? 'Ubah' : 'Verifikasi'}
                                  </button>
                                  <button
                                    onClick={() => handleAdminDelete(lpj, desa.desa_nama)}
                                    disabled={deletingLpj === lpj.id}
                                    className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-[10px] font-medium transition-colors"
                                    title="Hapus LPJ"
                                  >
                                    {deletingLpj === lpj.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                                    Hapus
                                  </button>
                                </div>
                              </div>
                              {lpj.dpmd_catatan && ['rejected', 'revision'].includes(status) && (
                                <div className="flex items-center gap-2 mt-1.5 ml-6">
                                  <p className="text-[10px] text-red-500 flex items-center gap-1 flex-1">
                                    <MessageSquare className="h-3 w-3" />
                                    {lpj.dpmd_catatan}
                                  </p>
                                  {status === 'revision' && (
                                    <button onClick={() => { setChatLpjId(lpj.id); setChatTargetUserId(lpj.uploaded_by); }}
                                      className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-[10px] font-medium hover:bg-green-700 transition-colors flex-shrink-0">
                                      <MessageSquare className="h-3 w-3" /> Chat
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredKecamatan.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Search className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Tidak ada data yang cocok dengan pencarian</p>
          </div>
        )}
      </div>

      {/* Verify Modal */}
      {verifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setVerifyModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-800">Verifikasi LPJ</h3>
                <p className="text-sm text-gray-500">Desa {verifyModal.desa_nama}</p>
              </div>
              <button onClick={() => setVerifyModal(null)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* File Info */}
              <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                <FileText className="h-8 w-8 text-red-400 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{verifyModal.lpj.nama_file}</p>
                  <p className="text-xs text-gray-400">{formatFileSize(verifyModal.lpj.file_size)} • {formatDate(verifyModal.lpj.created_at)}</p>
                </div>
                <a href={getFileUrl(verifyModal.lpj.file_path)} target="_blank" rel="noopener noreferrer"
                  className="ml-auto px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> Lihat
                </a>
              </div>

              {/* Current Status */}
              {verifyModal.lpj.status && verifyModal.lpj.status !== 'pending' && (
                <div className="text-xs text-gray-500">
                  Status saat ini: <span className={`font-semibold ${STATUS_CONFIG[verifyModal.lpj.status]?.bgBadge} px-2 py-0.5 rounded-full`}>
                    {STATUS_CONFIG[verifyModal.lpj.status]?.label}
                  </span>
                  {verifyModal.lpj.verified_by_name && (
                    <span className="ml-1">oleh {verifyModal.lpj.verified_by_name}</span>
                  )}
                </div>
              )}

              {/* Action Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tindakan</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setVerifyAction('approved')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium ${
                      verifyAction === 'approved'
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:border-green-300 text-gray-600'
                    }`}
                  >
                    <ShieldCheck className="h-5 w-5" />
                    Setujui
                  </button>
                  <button
                    onClick={() => setVerifyAction('revision')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium ${
                      verifyAction === 'revision'
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-200 hover:border-orange-300 text-gray-600'
                    }`}
                  >
                    <RotateCcw className="h-5 w-5" />
                    Revisi
                  </button>
                  <button
                    onClick={() => setVerifyAction('rejected')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-medium ${
                      verifyAction === 'rejected'
                        ? 'border-red-500 bg-red-50 text-red-700'
                        : 'border-gray-200 hover:border-red-300 text-gray-600'
                    }`}
                  >
                    <ShieldX className="h-5 w-5" />
                    Tolak
                  </button>
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Catatan {['rejected', 'revision'].includes(verifyAction) && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={verifyCatatan}
                  onChange={e => setVerifyCatatan(e.target.value)}
                  placeholder={
                    verifyAction === 'rejected' ? 'Alasan penolakan LPJ...'
                    : verifyAction === 'revision' ? 'Tuliskan apa yang perlu direvisi...'
                    : 'Catatan opsional...'
                  }
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 p-5 border-t border-gray-100">
              <button
                onClick={() => setVerifyModal(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleVerify}
                disabled={!verifyAction || verifying}
                className={`flex-1 px-4 py-2.5 rounded-xl font-medium text-sm transition-all text-white ${
                  !verifyAction || verifying
                    ? 'bg-gray-300 cursor-not-allowed'
                    : verifyAction === 'approved' ? 'bg-green-600 hover:bg-green-700'
                    : verifyAction === 'revision' ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {verifying ? 'Memproses...' :
                  verifyAction === 'approved' ? 'Setujui LPJ' :
                  verifyAction === 'revision' ? 'Minta Revisi' :
                  verifyAction === 'rejected' ? 'Tolak LPJ' : 'Pilih Tindakan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contextual Chat Drawer */}
      {chatLpjId && (
        <ChatDrawer
          referenceType="bankeu_lpj"
          referenceId={chatLpjId}
          targetUserId={chatTargetUserId}
          floating={false}
          isOpen={!!chatLpjId}
          onClose={() => { setChatLpjId(null); setChatTargetUserId(null); }}
          title="Chat LPJ Bankeu"
        />
      )}
    </div>
  );
};

export default BankeuLpjMonitoringPage;
