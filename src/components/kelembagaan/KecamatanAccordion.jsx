import React, { useState } from "react";
import {
  LuChevronDown,
  LuChevronUp,
  LuBuilding2,
  LuHouse,
  LuUsers,
  LuShield,
  LuHeart,
  LuCheck,
  LuX,
  LuHeartHandshake,
  LuUser,
} from "react-icons/lu";

// Reusable Notched Card Component
const NotchedCard = ({ icon: Icon, title, value, color }) => {
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

      <div className="text-xs text-gray-500 font-medium mb-2 relative z-20 text-center">
        {title}
      </div>
      
      {/* Verified Badge */}
      <div className="flex items-center justify-center gap-1.5 relative z-20 mb-1">
        <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md">
          <span className="text-sm font-semibold text-gray-800">{value || 0}</span>
        </div>
      </div>
    </div>
  );
};

const VerifiedStatusBadge = ({ status, verifiedStatus }) => {
  if (status === "Belum Terbentuk") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
        <LuX className="h-3 w-3" />
        Belum Terbentuk
      </span>
    );
  }

  const isVerified = verifiedStatus === "Terbentuk";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
        isVerified ? "bg-blue-100 text-blue-700" : "bg-amber-50 text-amber-600"
      }`}
    >
      {isVerified && <LuCheck className="h-3 w-3" />}
      Terbentuk
    </span>
  );
};

const KecamatanAccordion = ({ kecamatanData, onDesaClick }) => {
  const [expandedKecamatan, setExpandedKecamatan] = useState({});

  const toggleKecamatan = (kecamatanId) => {
    setExpandedKecamatan((prev) => ({
      ...prev,
      [kecamatanId]: !prev[kecamatanId],
    }));
  };

  return (
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
              {/* Summary Stats - Verified Only */}
              <div className="hidden md:grid grid-cols-3 items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <LuUsers className="h-6 w-6 bg-blue-700 text-white p-1 rounded flex-shrink-0" />
                  <div className="flex items-center gap-1">
                    <span className="text-gray-700">RW:</span>
                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md">
                      <span className="text-sm font-semibold text-gray-800">{kecamatan.verifiedKelembagaan?.rw || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <LuUser className="h-6 w-6 bg-blue-500 text-white p-1 rounded flex-shrink-0" />
                  <div className="flex items-center gap-1">
                    <span className="text-gray-700">RT:</span>
                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md">
                      <span className="text-sm font-semibold text-gray-800">{kecamatan.verifiedKelembagaan?.rt || 0}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <LuHeart className="h-6 w-6 bg-purple-600 text-white p-1 rounded flex-shrink-0" />
                  <div className="flex items-center gap-1">
                    <span className="text-gray-700">Posyandu:</span>
                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-md">
                      <span className="text-sm font-semibold text-gray-800">{kecamatan.verifiedKelembagaan?.posyandu || 0}</span>
                    </div>
                  </div>
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
                  Ringkasan Kelembagaan Terverifikasi
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <NotchedCard
                    icon={LuUsers}
                    title="RW"
                    value={kecamatan.verifiedKelembagaan?.rw}
                    color="#9333ea"
                  />
                  <NotchedCard
                    icon={LuUser}
                    title="RT"
                    value={kecamatan.verifiedKelembagaan?.rt}
                    color="#16a34a"
                  />
                  <NotchedCard
                    icon={LuHeartHandshake}
                    title="Posyandu"
                    value={kecamatan.verifiedKelembagaan?.posyandu}
                    color="#dc2626"
                  />
                  <NotchedCard
                    icon={LuUsers}
                    title="Karang Taruna"
                    value={kecamatan.verifiedKelembagaan?.karangTaruna}
                    color="#2563eb"
                  />
                  <NotchedCard
                    icon={LuBuilding2}
                    title="LPM"
                    value={kecamatan.verifiedKelembagaan?.lpm}
                    color="#4f46e5"
                  />
                  <NotchedCard
                    icon={LuHeart}
                    title="PKK"
                    value={kecamatan.verifiedKelembagaan?.pkk}
                    color="#ec4899"
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
                          PKK
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {kecamatan.desas.map((desa) => (
                        <tr
                          key={desa.id}
                          className="hover:bg-blue-50 cursor-pointer transition-colors"
                          onClick={() => onDesaClick(desa.id)}
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
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <span className="text-sm font-semibold text-gray-800">
                              {desa.verifiedKelembagaan?.rw || 0}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <span className="text-sm font-semibold text-gray-800">
                              {desa.verifiedKelembagaan?.rt || 0}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <span className="text-sm font-semibold text-gray-800">
                              {desa.verifiedKelembagaan?.posyandu || 0}
                            </span>
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <VerifiedStatusBadge
                              status={
                                desa.kelembagaan?.karangTaruna ||
                                "Belum Terbentuk"
                              }
                              verifiedStatus={
                                desa.verifiedKelembagaan?.karangTaruna ||
                                "Belum Terbentuk"
                              }
                            />
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <VerifiedStatusBadge
                              status={
                                desa.kelembagaan?.lpm || "Belum Terbentuk"
                              }
                              verifiedStatus={
                                desa.verifiedKelembagaan?.lpm || "Belum Terbentuk"
                              }
                            />
                          </td>
                          <td className="border border-gray-300 px-4 py-3 text-center">
                            <VerifiedStatusBadge
                              status={
                                desa.kelembagaan?.pkk || "Belum Terbentuk"
                              }
                              verifiedStatus={
                                desa.verifiedKelembagaan?.pkk || "Belum Terbentuk"
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
  );
};

export default KecamatanAccordion;
