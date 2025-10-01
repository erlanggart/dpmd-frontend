import React, { useState, useEffect } from "react";
import api from "../../api";
import { 
    FiCheckCircle, 
    FiXCircle, 
    FiUsers, 
    FiBarChart2,
    FiDownload,
    FiEye,
    FiRefreshCw
} from "react-icons/fi";

const MusdesusMonitoringPage = () => {
    const [monitoringData, setMonitoringData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedKecamatan, setSelectedKecamatan] = useState("all");
    const [selectedStatus, setSelectedStatus] = useState("all");
    const [refreshing, setRefreshing] = useState(false);

    const fetchMonitoringData = async () => {
        try {
            setRefreshing(true);
            const response = await api.get('/admin/musdesus/monitoring/dashboard');
            setMonitoringData(response.data.data);
        } catch (error) {
            console.error('Error fetching monitoring data:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchMonitoringData();
    }, []);

    const getFilteredData = () => {
        if (!monitoringData) return [];
        
        let filtered = monitoringData.detail_monitoring;
        
        if (selectedKecamatan !== "all") {
            filtered = filtered.filter(item => item.nama_kecamatan === selectedKecamatan);
        }
        
        if (selectedStatus !== "all") {
            if (selectedStatus === "uploaded") {
                filtered = filtered.filter(item => item.total_uploads > 0);
            } else if (selectedStatus === "not_uploaded") {
                filtered = filtered.filter(item => item.total_uploads === 0);
            }
        }
        
        return filtered;
    };

    const getStatusBadge = (totalUploads) => {
        if (totalUploads > 0) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <FiCheckCircle className="w-3 h-3 mr-1" />
                    Sudah Upload ({totalUploads})
                </span>
            );
        }
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                <FiXCircle className="w-3 h-3 mr-1" />
                Belum Upload
            </span>
        );
    };

    const formatDate = (dateString) => {
        if (!dateString) return "-";
        return new Date(dateString).toLocaleDateString("id-ID", {
            day: "2-digit",
            month: "short", 
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const filteredData = getFilteredData();
    const kecamatanList = monitoringData?.statistik_kecamatan || [];

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">
                            Monitoring Musdesus
                        </h1>
                        <p className="text-gray-600 mt-1">
                            Monitoring status upload 37 desa target Musdesus
                        </p>
                    </div>
                    <button
                        onClick={fetchMonitoringData}
                        disabled={refreshing}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        <FiRefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Statistik Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <FiUsers className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                            <h3 className="text-sm font-medium text-gray-600">Total Desa Target</h3>
                            <p className="text-2xl font-bold text-gray-900">
                                {monitoringData?.ringkasan.total_desa_target || 0}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <FiCheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                            <h3 className="text-sm font-medium text-gray-600">Sudah Upload</h3>
                            <p className="text-2xl font-bold text-green-600">
                                {monitoringData?.ringkasan.desa_sudah_upload || 0}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <FiXCircle className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="ml-4">
                            <h3 className="text-sm font-medium text-gray-600">Belum Upload</h3>
                            <p className="text-2xl font-bold text-red-600">
                                {monitoringData?.ringkasan.desa_belum_upload || 0}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <FiBarChart2 className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="ml-4">
                            <h3 className="text-sm font-medium text-gray-600">Persentase</h3>
                            <p className="text-2xl font-bold text-purple-600">
                                {monitoringData?.ringkasan.persentase_upload || 0}%
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Desa Lists */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Desa Sudah Upload */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <FiCheckCircle className="w-5 h-5 text-green-600 mr-2" />
                            Desa Sudah Upload ({filteredData.filter(item => item.total_uploads > 0).length})
                        </h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {filteredData.filter(item => item.total_uploads > 0).length === 0 ? (
                            <div className="p-6 text-center text-gray-500">
                                Tidak ada desa yang sudah upload
                            </div>
                        ) : (
                            filteredData.filter(item => item.total_uploads > 0).map((item, index) => (
                                <div key={index} className="p-4 border-b border-gray-100 last:border-b-0">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-gray-900">{item.nama_desa}</h4>
                                            <p className="text-sm text-gray-600">Kec. {item.nama_kecamatan}</p>
                                            <p className="text-sm text-blue-600 font-medium">
                                                Petugas: {item.nama_petugas}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                {item.total_uploads} file
                                            </span>
                                            <p className="text-xs text-gray-500 mt-1">
                                                {formatDate(item.latest_upload)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Desa Belum Upload */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    <div className="p-6 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                            <FiXCircle className="w-5 h-5 text-red-600 mr-2" />
                            Desa Belum Upload ({filteredData.filter(item => item.total_uploads === 0).length})
                        </h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {filteredData.filter(item => item.total_uploads === 0).length === 0 ? (
                            <div className="p-6 text-center text-gray-500">
                                Semua desa sudah upload
                            </div>
                        ) : (
                            filteredData.filter(item => item.total_uploads === 0).map((item, index) => (
                                <div key={index} className="p-4 border-b border-gray-100 last:border-b-0">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h4 className="font-medium text-gray-900">{item.nama_desa}</h4>
                                            <p className="text-sm text-gray-600">Kec. {item.nama_kecamatan}</p>
                                            <p className="text-sm text-blue-600 font-medium">
                                                Petugas: {item.nama_petugas}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                Belum Upload
                                            </span>
                                            <p className="text-xs text-gray-500 mt-1">
                                                -
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border mb-6">
                <div className="flex flex-wrap gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Kecamatan
                        </label>
                        <select
                            value={selectedKecamatan}
                            onChange={(e) => setSelectedKecamatan(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Semua Kecamatan</option>
                            {kecamatanList.map((kec) => (
                                <option key={kec.nama_kecamatan} value={kec.nama_kecamatan}>
                                    {kec.nama_kecamatan} ({kec.sudah_upload}/{kec.total_desa})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Status Upload
                        </label>
                        <select
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Semua Status</option>
                            <option value="uploaded">Sudah Upload</option>
                            <option value="not_uploaded">Belum Upload</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                <div className="p-4 border-b bg-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Detail Monitoring ({filteredData.length} desa)
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    No
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Desa
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Kecamatan
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Petugas Monitoring
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Upload Terakhir
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Aksi
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredData.map((item, index) => (
                                <tr key={item.petugas_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {index + 1}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {item.nama_desa}
                                        </div>
                                        {item.desa_nama_actual && item.desa_nama_actual !== item.nama_desa && (
                                            <div className="text-xs text-gray-500">
                                                Actual: {item.desa_nama_actual}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {item.nama_kecamatan}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {item.nama_petugas}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(item.total_uploads)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {formatDate(item.latest_upload)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                        <button className="text-blue-600 hover:text-blue-900 mr-3">
                                            <FiEye className="w-4 h-4" />
                                        </button>
                                        {item.total_uploads > 0 && (
                                            <button className="text-green-600 hover:text-green-900">
                                                <FiDownload className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                
                {filteredData.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        Tidak ada data yang sesuai dengan filter
                    </div>
                )}
            </div>
        </div>
    );
};

export default MusdesusMonitoringPage;