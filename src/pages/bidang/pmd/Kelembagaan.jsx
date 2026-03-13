import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  LuBuilding2,
  LuCheck,
  LuX,
  LuLoader,
  LuLock,
  LuLockOpen,
} from "react-icons/lu";
import { useAuth } from "../../../context/AuthContext";
import { useEditMode } from "../../../context/EditModeContext";
import kelembagaanApi from "../../../api/kelembagaan";
import StatistikLKD from "../../../components/kelembagaan/StatistikLKD";
import UnverifiedKelembagaanList from "../../../components/kelembagaan/UnverifiedKelembagaanList";
import KecamatanAccordion from "../../../components/kelembagaan/KecamatanAccordion";
import KelembagaanActivityList from "../../../components/kelembagaan/KelembagaanActivityList";

const Kelembagaan = () => {
  const { user } = useAuth();
  const { isEditMode, toggleEditMode } = useEditMode();
  const [kecamatanData, setKecamatanData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Check if user can toggle edit mode
  const canToggleEdit =
    ["superadmin"].includes(user?.role) ||
    (user?.role === "kepala_bidang" && user?.bidang_id === 5);

  // Fetch data kecamatan dan desa dengan kelembagaan menggunakan service API
  const fetchKelembagaanData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch data kelembagaan dan summary secara bersamaan menggunakan service API
      const results = await Promise.allSettled([
        kelembagaanApi.getKelembagaanData(),
        kelembagaanApi.getSummary(),
      ]);

      // Handle kelembagaan response
      const kelembagaanResult = results[0];
      if (
        kelembagaanResult.status === "fulfilled" &&
        kelembagaanResult.value.success
      ) {
        setKecamatanData(kelembagaanResult.value.data || []);
      } else {
        const errorMsg =
          kelembagaanResult.status === "rejected"
            ? kelembagaanResult.reason.message
            : kelembagaanResult.value?.message ||
              "Gagal mengambil data kelembagaan";
        throw new Error(errorMsg);
      }

      // Handle summary response
      const summaryResult = results[1];
      if (summaryResult.status === "fulfilled" && summaryResult.value.success) {
        setSummaryData(summaryResult.value.data);
      } else {
        console.warn(
          "Gagal mengambil summary data:",
          summaryResult.status === "rejected"
            ? summaryResult.reason.message
            : summaryResult.value?.message || "Error tidak dikenal"
        );
        // Summary error tidak menghentikan aplikasi
      }
    } catch (err) {
      console.error("Error fetching kelembagaan data:", err);
      setError(
        err.message || "Gagal mengambil data kelembagaan. Silakan coba lagi."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKelembagaanData();
  }, []);

  const handleDesaClick = (desaId) => {
    // Navigate ke admin kelembagaan detail dengan list RW/kelembagaan
    navigate(`/bidang/pmd/kelembagaan/admin/${desaId}`);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchKelembagaanData();
    } finally {
      setRefreshing(false);
    }
  };

  const handleToggleEditMode = async () => {
    try {
      // Show loading
      Swal.fire({
        title: "Memproses...",
        text: "Mengubah mode edit",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        },
      });

      await toggleEditMode();

      // Show success
      Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: `Mode edit ${!isEditMode ? "diaktifkan" : "dinonaktifkan"}`,
        timer: 2000,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("Error toggling edit mode:", error);
      
      // Ambil error message dari backend
      const errorMessage = error.response?.data?.message || error.message || "Gagal mengubah mode edit. Silakan coba lagi.";
      const debugInfo = error.response?.data?.debug;
      
      // Tampilkan error dengan detail
      let errorHtml = `<p class="text-gray-700">${errorMessage}</p>`;
      
      // Tambahkan debug info jika ada
      if (debugInfo) {
        errorHtml += `<div class="mt-3 p-3 bg-gray-100 rounded text-left text-sm">
          <p class="font-semibold text-gray-800 mb-2">Detail:</p>
          ${debugInfo.userRole ? `<p><span class="font-medium">Role Anda:</span> ${debugInfo.userRole}</p>` : ''}
          ${debugInfo.userBidangId ? `<p><span class="font-medium">Bidang ID:</span> ${debugInfo.userBidangId}</p>` : ''}
          ${debugInfo.required ? `<p><span class="font-medium">Yang Diperlukan:</span> ${debugInfo.required}</p>` : ''}
        </div>`;
      }
      
      Swal.fire({
        icon: "error",
        title: "Tidak Dapat Mengubah Mode Edit",
        html: errorHtml,
        confirmButtonColor: "#3b82f6",
        confirmButtonText: "Mengerti"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex items-center gap-2">
          <LuLoader className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600">Memuat data kelembagaan...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <LuX className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error</h3>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-6">
      {/* Header - Minimalist Design */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Top Section */}
        <div className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Title Section */}
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
                <LuBuilding2 className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Data Kelembagaan
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  Lembaga Kemasyarakatan Desa
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Toggle Edit Mode Button */}
              {canToggleEdit && (
                <button
                  onClick={handleToggleEditMode}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 font-medium text-sm ${
                    isEditMode
                      ? "bg-green-600 text-white hover:bg-green-700 shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300"
                  }`}
                >
                  {isEditMode ? (
                    <>
                      <LuLockOpen className="h-4 w-4" />
                      <span className="hidden sm:inline">Edit ON</span>
                    </>
                  ) : (
                    <>
                      <LuLock className="h-4 w-4" />
                      <span className="hidden sm:inline">Edit OFF</span>
                    </>
                  )}
                </button>
              )}
              
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
              >
                <LuLoader
                  className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
                />
                <span className="hidden sm:inline">
                  {refreshing ? "Memuat..." : "Refresh"}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Edit Mode Status Banner */}
        {canToggleEdit && (
          <div
            className={`px-4 sm:px-6 py-3 border-t ${
              isEditMode
                ? "bg-green-50 border-green-200"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <div className="flex items-start gap-2">
              <div className="flex-shrink-0 mt-0.5">
                {isEditMode ? (
                  <LuCheck className="h-4 w-4 text-green-600" />
                ) : (
                  <LuX className="h-4 w-4 text-gray-500" />
                )}
              </div>
              <p className={`text-sm font-medium ${
                isEditMode ? "text-green-700" : "text-gray-600"
              }`}>
                {isEditMode ? (
                  <>
                    <span className="font-semibold">Modul Aktif</span> - 
                    Desa dapat menambah dan mengedit data kelembagaan & pengurus
                  </>
                ) : (
                  <>
                    <span className="font-semibold">Modul Nonaktif</span> - 
                    Desa Tidak dapat menambah atau mengedit data kelembagaan & pengurus, hanya dapat melihat data yang sudah ada
                  </>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <StatistikLKD summaryData={summaryData} loading={loading} />
        </div>

        <div>
          <KelembagaanActivityList />
        </div>
        
      </div>

<div className="grid grid-cols-4 gap-6">
  <div className="col-span-3">

      {/* Kecamatan Accordion */}
      <KecamatanAccordion 
        kecamatanData={kecamatanData}
        onDesaClick={handleDesaClick}
      />
  </div>
<div>
          <UnverifiedKelembagaanList 
            kecamatanData={kecamatanData}
            onDesaClick={handleDesaClick}
          />
        </div>
</div>
    </div>
  );
};

export default Kelembagaan;
