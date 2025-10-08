import React, { useState, useEffect, useMemo } from 'react';
import { FiFile, FiLink, FiX, FiFilter, FiSearch, FiRefreshCw } from 'react-icons/fi';
import { useNotification } from '../../../context/NotificationContext';

const DocumentManagement = () => {
  const [documents, setDocuments] = useState([]);
  const [bumdesData, setBumdesData] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [linkingDocument, setLinkingDocument] = useState(null);
  const { showNotification } = useNotification();

  // Filter states
  const [filters, setFilters] = useState({
    kecamatan: '',
    desa: '',
    search: '',
    documentType: ''
  });

  // Get available locations from bumdesData
  const availableKecamatan = useMemo(() => {
    return [...new Set(bumdesData.map(b => b.kecamatan))].sort();
  }, [bumdesData]);

  const availableDesa = useMemo(() => {
    const desaSet = new Set();
    bumdesData.forEach(bumdes => {
      if (bumdes.desa) {
        // Extract desa name from format like "DESA SUKAMAJU (012345)"
        const match = bumdes.desa.match(/^DESA\s+(.+?)\s+\(/);
        if (match) {
          desaSet.add(match[1]);
        } else {
          desaSet.add(bumdes.desa);
        }
      }
    });
    return [...desaSet].sort();
  }, [bumdesData]);

  // Parse desa info utility
  const parseDesaInfo = (desaString) => {
    if (!desaString) return { namaDesa: '', kodeDesa: '' };
    
    const match = desaString.match(/^DESA\s+(.+?)\s+\((\d+)\)$/);
    if (match) {
      return {
        namaDesa: match[1],
        kodeDesa: match[2]
      };
    }
    return { namaDesa: desaString, kodeDesa: '' };
  };

  // Available BUMDes for linking based on filters
  const availableBumdes = useMemo(() => {
    return bumdesData.filter(bumdes => {
      if (filters.kecamatan && bumdes.kecamatan !== filters.kecamatan) return false;
      if (filters.desa) {
        const { namaDesa } = parseDesaInfo(bumdes.desa);
        if (namaDesa !== filters.desa) return false;
      }
      return true;
    });
  }, [bumdesData, filters.kecamatan, filters.desa]);

  // Filtered documents
  const filteredDocuments = useMemo(() => {
    return documents.filter(doc => {
      // Search filter
      const matchesSearch = !filters.search || 
        doc.filename.toLowerCase().includes(filters.search.toLowerCase());

      // Document type filter
      const matchesType = !filters.documentType || doc.type === filters.documentType;

      return matchesSearch && matchesType;
    });
  }, [documents, filters]);

  // Fetch documents
  const fetchDocuments = async () => {
    setDocumentsLoading(true);
    try {
      const [docsResponse, laporanResponse] = await Promise.all([
        fetch('http://localhost:8000/api/bumdes/dokumen-badan-hukum'),
        fetch('http://localhost:8000/api/bumdes/laporan-keuangan')
      ]);

      if (!docsResponse.ok || !laporanResponse.ok) {
        throw new Error('Failed to fetch documents');
      }

      const [docsData, laporanData] = await Promise.all([
        docsResponse.json(),
        laporanResponse.json()
      ]);

      const allDocs = [
        ...(docsData.data || []).map(doc => ({ ...doc, type: 'dokumen_badan_hukum' })),
        ...(laporanData.data || []).map(doc => ({ ...doc, type: 'laporan_keuangan' }))
      ];

      setDocuments(allDocs);
    } catch (error) {
      console.error('Error fetching documents:', error);
      showNotification('Gagal memuat dokumen', 'error');
    } finally {
      setDocumentsLoading(false);
    }
  };

  // Fetch BUMDes data
  const fetchBumdesData = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/bumdes');
      if (!response.ok) throw new Error('Failed to fetch BUMDes data');
      
      const data = await response.json();
      setBumdesData(data.data || []);
    } catch (error) {
      console.error('Error fetching BUMDes data:', error);
      showNotification('Gagal memuat data BUMDes', 'error');
    }
  };

  // Link document to BUMDes
  const linkDocumentToBumdes = async (filename, bumdesId, documentType) => {
    setLinkingDocument(filename);
    try {
      const response = await fetch('http://localhost:8000/api/bumdes/link-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename,
          bumdes_id: bumdesId,
          document_type: documentType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to link document');
      }

      const result = await response.json();
      showNotification(result.message || 'Dokumen berhasil dikaitkan!', 'success');
      
      // Refresh BUMDes data to show updated documents
      await fetchBumdesData();
    } catch (error) {
      console.error('Error linking document:', error);
      showNotification('Gagal mengaitkan dokumen', 'error');
    } finally {
      setLinkingDocument(null);
    }
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      kecamatan: '',
      desa: '',
      search: '',
      documentType: ''
    });
  };

  useEffect(() => {
    fetchDocuments();
    fetchBumdesData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Kelola Dokumen</h1>
              <p className="text-gray-600 mt-2">
                Kaitkan dokumen yang belum terhubung dengan BUMDes yang sesuai
              </p>
            </div>
            <button
              onClick={() => {
                fetchDocuments();
                fetchBumdesData();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FiRefreshCw className="text-sm" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <FiFilter className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filter Dokumen</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kecamatan
              </label>
              <select
                value={filters.kecamatan}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  kecamatan: e.target.value,
                  desa: '' // Reset desa when kecamatan changes
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Semua Kecamatan</option>
                {availableKecamatan.map(kec => (
                  <option key={kec} value={kec}>{kec}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Desa
              </label>
              <select
                value={filters.desa}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  desa: e.target.value
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!filters.kecamatan}
              >
                <option value="">Semua Desa</option>
                {availableDesa
                  .filter(desa => {
                    if (!filters.kecamatan) return true;
                    const matchingBumdes = bumdesData.filter(b => 
                      b.kecamatan === filters.kecamatan &&
                      parseDesaInfo(b.desa).namaDesa === desa
                    );
                    return matchingBumdes.length > 0;
                  })
                  .map(desa => (
                    <option key={desa} value={desa}>{desa}</option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jenis Dokumen
              </label>
              <select
                value={filters.documentType}
                onChange={(e) => setFilters(prev => ({
                  ...prev,
                  documentType: e.target.value
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Semua Jenis</option>
                <option value="dokumen_badan_hukum">Dokumen Badan Hukum</option>
                <option value="laporan_keuangan">Laporan Keuangan</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cari Dokumen
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({
                    ...prev,
                    search: e.target.value
                  }))}
                  placeholder="Cari nama file..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Reset Filter
              </button>
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
          <div className="p-6 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">
                Dokumen Tersedia ({filteredDocuments.length})
              </h2>
              {(filters.kecamatan || filters.desa) && (
                <div className="text-sm text-gray-600">
                  BUMDes tersedia untuk linking: {availableBumdes.length}
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            {documentsLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Memuat dokumen...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDocuments.map((doc, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3 mb-4">
                      <FiFile className={`mt-1 flex-shrink-0 ${
                        doc.type === 'dokumen_badan_hukum' ? 'text-blue-500' : 'text-green-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 mb-1 break-words">
                          {doc.filename}
                        </h4>
                        <p className="text-xs text-gray-500 mb-1">
                          {doc.type === 'dokumen_badan_hukum' ? 'Dokumen Badan Hukum' : 'Laporan Keuangan'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {doc.file_size_formatted}
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <button
                        onClick={() => window.open(doc.download_url, '_blank')}
                        className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        Lihat Dokumen
                      </button>
                      
                      {availableBumdes.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-xs text-gray-600 font-medium">Kaitkan ke BUMDes:</p>
                          <div className="max-h-32 overflow-y-auto space-y-1">
                            {availableBumdes.map(bumdes => (
                              <button
                                key={bumdes.id}
                                onClick={() => linkDocumentToBumdes(doc.filename, bumdes.id, doc.type)}
                                disabled={linkingDocument === doc.filename}
                                className="w-full px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors disabled:opacity-50 text-left"
                              >
                                {linkingDocument === doc.filename ? (
                                  <span className="flex items-center gap-1">
                                    <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                                    Menghubungkan...
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1">
                                    <FiLink className="flex-shrink-0" />
                                    <span className="truncate">{bumdes.name}</span>
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 text-center py-2 bg-gray-50 rounded">
                          Pilih kecamatan/desa untuk melihat BUMDes
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {filteredDocuments.length === 0 && !documentsLoading && (
              <div className="text-center py-12">
                <FiFile className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Tidak ada dokumen
                </h3>
                <p className="text-gray-500">
                  {filters.search || filters.documentType
                    ? 'Tidak ada dokumen yang sesuai dengan filter'
                    : 'Belum ada dokumen yang tersedia'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentManagement;
