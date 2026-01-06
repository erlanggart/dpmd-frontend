import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import {
  LuChevronDown,
  LuChevronUp,
  LuBuilding2,
  LuHouse,
  LuUsers,
  LuMapPin,
  LuShield,
  LuHeart,
  LuUserCheck,
  LuCheck,
  LuX,
  LuLoader,
  LuLock,
  LuLockOpen,
  LuHeartHandshake,
  LuUser,
} from "react-icons/lu";
import { useAuth } from "../../../context/AuthContext";
import { useEditMode } from "../../../context/EditModeContext";
import kelembagaanApi from "../../../api/kelembagaan";
import StatistikKelembagaanSummary from "../../../components/kelembagaan/StatistikKelembagaanSummary";

// Reusable Notched Card Component
const NotchedCard = ({ icon: Icon, title, value, subtitle, color }) => {
  return (
    <div
      className="relative rounded-2xl p-4 hover:translate-y-[-4px] transition-all duration-300 overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color}, ${color})`,
        boxShadow: `0 10px 30px ${color}40, 0 4px 12px ${color}30`,
        transition: "all 0.3s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 15px 40px ${color}60, 0 8px 16px ${color}40`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = `0 10px 30px ${color}40, 0 4px 12px ${color}30`;
      }}
    >
      {/* White box that borders with notch */}
      <div className="absolute left-0 top-0 bottom-0 right-4 bg-white ">
        {/* Middle Notch - colored with rounded left full */}
        <div
          className="absolute right-[0%] top-[30%] h-[40%] w-3 rounded-l-full z-10"
          style={{ backgroundColor: `${color}` }}
        ></div>
      </div>

      {/* Top Notch - white for cutout effect */}
      <div className="absolute right-0 top-0 h-[30%] w-4 bg-white rounded-br-full z-10"></div>

      {/* Bottom Notch - white for cutout effect */}
      <div className="absolute right-0 bottom-0 h-[30%] w-4 bg-white rounded-tr-full z-10"></div>

      <div className="flex items-center justify-center relative z-20 mr-5 mb-3">
        <div
          className="p-3 rounded-xl shadow-sm"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="h-5 w-5" style={{ color: color }} />
        </div>
      </div>

      <div className="text-xs text-gray-500 font-medium mb-1 relative z-20 text-center">
        {title}
      </div>
      <div className="text-2xl font-bold text-gray-900 mb-1 relative z-20 text-center">
        {value}
      </div>
      {subtitle && (
        <div className="text-xs text-gray-400 relative z-20 text-center">{subtitle}</div>
      )}
    </div>
  );
};

const Kelembagaan = () => {
  const { user } = useAuth();
  const { isEditMode, toggleEditMode } = useEditMode();
  const [kecamatanData, setKecamatanData] = useState([]);
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [expandedKecamatan, setExpandedKecamatan] = useState({});
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

  const toggleKecamatan = (kecamatanId) => {
    setExpandedKecamatan((prev) => ({
      ...prev,
      [kecamatanId]: !prev[kecamatanId],
    }));
  };

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
      Swal.fire({
        icon: "error",
        title: "Gagal!",
        text:
          error.response?.data?.message ||
          error.message ||
          "Gagal mengubah mode edit. Silakan coba lagi.",
        confirmButtonColor: "#3b82f6",
      });
    }
  };

  // Render status badge
  const StatusBadge = ({ status }) => {
    const isFormed = status === "Terbentuk";
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
          isFormed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        }`}
      >
        {isFormed ? (
          <LuCheck className="h-3 w-3" />
        ) : (
          <LuX className="h-3 w-3" />
        )}
        {status}
      </span>
    );
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <LuBuilding2 className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Data Kelembagaan Desa
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {/* Toggle Edit Mode Button - Only for superadmin/pemberdayaan_masyarakat */}
            {canToggleEdit && (
              <button
                onClick={handleToggleEditMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 font-medium ${
                  isEditMode
                    ? "bg-green-600 text-white hover:bg-green-700 shadow-md"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {isEditMode ? (
                  <>
                    <LuLockOpen className="h-4 w-4" />
                    <span className="hidden  md:block">Mode Edit: ON</span>
                  </>
                ) : (
                  <>
                    <LuLock className="h-4 w-4" />
                    <span className="hidden  md:block">Mode Edit: OFF</span>
                  </>
                )}
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <LuLoader
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              <span className="hidden  md:block">{refreshing ? "Memuat..." : "Refresh"}</span>
            </button>
          </div>
        </div>
        <p className="text-gray-600">
          Informasi lengkap kelembagaan di setiap desa meliputi RW, RT,
          Posyandu, Karang Taruna, LPM, dan Satlinmas (hanya kelembagaan dan
          pengurus yang aktif)
        </p>
        {canToggleEdit && (
          <div
            className={`mt-3 p-3 rounded-lg border ${
              isEditMode
                ? "bg-green-50 border-green-200"
                : "bg-gray-50 border-gray-200"
            }`}
          >
            <p className="text-sm font-medium">
              {isEditMode ? (
                <span className="text-green-700">
                  ✓ Mode Edit Aktif - Desa dapat menambah dan mengedit data
                  kelembagaan & pengurus
                </span>
              ) : (
                <span className="text-gray-700">
                  ⚠ Mode Edit Nonaktif - Tombol tambah dan edit tidak akan
                  ditampilkan untuk desa
                </span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <StatistikKelembagaanSummary
        summaryData={summaryData}
        loading={loading}
      />

	  {console.log('kecamatanData:', kecamatanData)}

      {/* Kecamatan Accordion */}
      <div className="space-y-4">
        {kecamatanData.map((kecamatan) => (
          <div
            key={kecamatan.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200"
          >
            {/* Kecamatan Header */}
            <button
              onClick={() => toggleKecamatan(kecamatan.id)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <LuBuilding2 className="h-5 w-5 text-blue-600" />
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Kecamatan {kecamatan.nama}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {kecamatan.desas.length} Desa/Kelurahan
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                {/* Summary Stats */}
                <div className="hidden md:grid grid-cols-3 items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <LuUsers className="h-6 w-6 bg-blue-700 text-white p-1 rounded" />
                    <span>RW : <strong className="text-blue-700">{kecamatan.totalKelembagaan.rw}</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <LuUser className="h-6 w-6 bg-blue-500 text-white p-1 rounded" />
                    <span>RT : <strong className="text-blue-500">{kecamatan.totalKelembagaan.rt}</strong></span>
                  </div>
                  <div className="flex items-center gap-1">
                    <LuHeart className="h-6 w-6 bg-purple-600 text-white p-1 rounded" />
                    <span>Posyandu : <strong className="text-purple-600">{kecamatan.totalKelembagaan.posyandu}</strong></span>
                  </div>
                </div>
                {expandedKecamatan[kecamatan.id] ? (
                  <LuChevronUp className="h-5 w-5 text-gray-500" />
                ) : (
                  <LuChevronDown className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </button>

            {/* Kecamatan Content */}
            {expandedKecamatan[kecamatan.id] && (
              <div className="border-t border-gray-200">
                {/* Summary Table for Kecamatan */}
                <div className="p-6 bg-gray-50">
                  <h4 className="text-md font-semibold text-gray-800 mb-4">
                    Ringkasan Kelembagaan Kecamatan
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
                    <NotchedCard
                      icon={LuUsers}
                      title="RW"
                      value={kecamatan.totalKelembagaan.rw}
                      subtitle={
                        kecamatan.totalPengurus &&
                        `${kecamatan.totalPengurus.rw} Pengurus`
                      }
                      color="#9333ea"
                    />
                    <NotchedCard
                      icon={LuUser}
                      title="RT"
                      value={kecamatan.totalKelembagaan.rt}
                      subtitle={
                        kecamatan.totalPengurus &&
                        `${kecamatan.totalPengurus.rt} Pengurus`
                      }
                      color="#16a34a"
                    />
                    <NotchedCard
                      icon={LuHeartHandshake}
                      title="Posyandu"
                      value={kecamatan.totalKelembagaan.posyandu}
                      subtitle={
                        kecamatan.totalPengurus &&
                        `${kecamatan.totalPengurus.posyandu} Pengurus`
                      }
                      color="#dc2626"
                    />
                    <NotchedCard
                      icon={LuUsers}
                      title="Karang Taruna"
                      value={kecamatan.totalKelembagaan.karangTaruna}
                      subtitle={
                        kecamatan.totalPengurus &&
                        `${kecamatan.totalPengurus.karangTaruna} Pengurus`
                      }
                      color="#2563eb"
                    />
                    <NotchedCard
                      icon={LuBuilding2}
                      title="LPM"
                      value={kecamatan.totalKelembagaan.lpm}
                      subtitle={
                        kecamatan.totalPengurus &&
                        `${kecamatan.totalPengurus.lpm} Pengurus`
                      }
                      color="#4f46e5"
                    />
                    <NotchedCard
                      icon={LuHeart}
                      title="PKK"
                      value={kecamatan.totalKelembagaan.pkk}
                      subtitle={
                        kecamatan.totalPengurus &&
                        `${kecamatan.totalPengurus.pkk} Pengurus`
                      }
                      color="#ec4899"
                    />
                    <NotchedCard
                      icon={LuShield}
                      title="Satlinmas"
                      value={kecamatan.totalKelembagaan.satlinmas}
                      subtitle={
                        kecamatan.totalPengurus &&
                        `${kecamatan.totalPengurus.satlinmas} Pengurus`
                      }
                      color="#f97316"
                    />
                  </div>
                </div>

                {/* Desa Table */}
                <div className="p-6">
                  <h4 className="text-md font-semibold text-gray-800 mb-4">
                    Detail Per Desa/Kelurahan
                  </h4>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-800">
                            Desa/Kelurahan
                          </th>
                          <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-800">
                            Status
                          </th>
                          <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-800">
                            RW
                          </th>
                          <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-800">
                            RT
                          </th>
                          <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-800">
                            Posyandu
                          </th>
                          <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-800">
                            Karang Taruna
                          </th>
                          <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-800">
                            LPM
                          </th>
                          <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-800">
                            {" "}
                            PKK
                          </th>
                          <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-800">
                            {" "}
                            Satlinmas
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {kecamatan.desas.map((desa) => (
                          <tr
                            key={desa.id}
                            className="hover:bg-blue-50 cursor-pointer transition-colors"
                            onClick={() => handleDesaClick(desa.id)}
                            title={`Klik untuk melihat detail kelembagaan ${desa.nama}`}
                          >
                            <td className="border border-gray-300 px-4 py-3">
                              <div className="flex items-center gap-2">
                                <LuHouse className="h-4 w-4 text-gray-500" />
                                <span className="font-medium text-blue-600 hover:text-blue-800">
                                  {desa.nama}
                                </span>
                              </div>
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center">
                              <span
                                className={`px-2 py-1 text-xs rounded-full ${
                                  desa.status === "kelurahan"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-green-100 text-green-800"
                                }`}
                              >
                                {desa.status === "kelurahan"
                                  ? "Kelurahan"
                                  : "Desa"}
                              </span>
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center font-semibold text-purple-600">
                              {desa.kelembagaan?.rw || 0}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center font-semibold text-green-600">
                              {desa.kelembagaan?.rt || 0}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center font-semibold text-red-600">
                              {desa.kelembagaan?.posyandu || 0}
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center">
                              <StatusBadge
                                status={
                                  desa.kelembagaan?.karangTaruna ||
                                  "Belum Terbentuk"
                                }
                              />
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center">
                              <StatusBadge
                                status={
                                  desa.kelembagaan?.lpm || "Belum Terbentuk"
                                }
                              />
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center">
                              {" "}
                              <StatusBadge
                                status={
                                  desa.kelembagaan?.pkk || "Belum Terbentuk"
                                }
                              />
                            </td>
                            <td className="border border-gray-300 px-4 py-3 text-center">
                              {" "}
                              <StatusBadge
                                status={
                                  desa.kelembagaan?.satlinmas ||
                                  "Belum Terbentuk"
                                }
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Kelembagaan;
