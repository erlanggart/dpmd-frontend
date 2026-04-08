import React, { useState, useEffect } from 'react';
import { FileText, Download, Search, ChevronDown, ChevronUp, Eye, CheckCircle2, XCircle, BarChart3, MapPin, Loader2 } from 'lucide-react';
import api from '../../../../api';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const BankeuLpjMonitoringPage = ({ tahun = 2025 }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedKecamatan, setExpandedKecamatan] = useState({});
  const [filterStatus, setFilterStatus] = useState('all'); // all, uploaded, belum

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

  const handleExportExcel = () => {
    if (!data?.kecamatan) return;

    const rows = [];
    data.kecamatan.forEach(kec => {
      kec.desa_list.forEach(desa => {
        rows.push({
          'Kecamatan': kec.kecamatan_nama,
          'Desa': desa.desa_nama,
          'Status LPJ': desa.has_lpj ? 'Sudah Upload' : 'Belum Upload',
          'Nama File': desa.lpj?.nama_file || '-',
          'Ukuran File': desa.lpj ? formatFileSize(desa.lpj.file_size) : '-',
          'Tanggal Upload': desa.lpj ? formatDate(desa.lpj.created_at) : '-',
          'Diupload Oleh': desa.lpj?.uploaded_by_name || '-',
          'Keterangan': desa.lpj?.keterangan || '-'
        });
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
                      <div
                        key={desa.desa_id}
                        className={`flex items-center justify-between px-4 py-3 ${
                          desa.has_lpj ? 'bg-green-50/50' : 'bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {desa.has_lpj ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-5 w-5 text-gray-300 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className={`font-medium text-sm ${desa.has_lpj ? 'text-gray-800' : 'text-gray-500'}`}>
                              {desa.desa_nama}
                            </p>
                            {desa.has_lpj && desa.lpj && (
                              <p className="text-xs text-gray-400 truncate">
                                {desa.lpj.nama_file} • {formatFileSize(desa.lpj.file_size)} • {formatDate(desa.lpj.created_at)}
                              </p>
                            )}
                          </div>
                        </div>

                        {desa.has_lpj && desa.lpj && (
                          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            {desa.lpj.keterangan && (
                              <span className="hidden md:inline-block text-xs text-gray-400 max-w-[200px] truncate" title={desa.lpj.keterangan}>
                                {desa.lpj.keterangan}
                              </span>
                            )}
                            <a
                              href={getFileUrl(desa.lpj.file_path)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors"
                              title="Lihat / Download file"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Lihat</span>
                            </a>
                            <a
                              href={getFileUrl(desa.lpj.file_path)}
                              download={desa.lpj.nama_file}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg text-xs font-medium transition-colors"
                              title="Download file"
                            >
                              <Download className="h-3.5 w-3.5" />
                              <span className="hidden sm:inline">Download</span>
                            </a>
                          </div>
                        )}
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
    </div>
  );
};

export default BankeuLpjMonitoringPage;
