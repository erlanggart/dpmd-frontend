import React, { useMemo, useState } from "react";
import {
  LuChevronDown,
  LuChevronUp,
  LuBuilding2,
  LuHouse,
  LuSearch,
  LuUsers,
  LuHeart,
  LuCheck,
  LuX,
  LuHeartHandshake,
  LuUser,
} from "react-icons/lu";

const SummaryChip = ({ icon: Icon, title, value, color }) => {
  const iconElement = Icon
    ? React.createElement(Icon, {
        className: "h-4 w-4",
        style: { color },
      })
    : null;

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 hover:border-gray-200 transition-colors">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}12` }}
      >
        {iconElement}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 leading-none mb-0.5">{title}</p>
        <p className="text-lg font-bold leading-none" style={{ color }}>{value || 0}</p>
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
  const [searchKecamatan, setSearchKecamatan] = useState("");
  const [searchDesa, setSearchDesa] = useState("");

  const normalizedSearchKecamatan = searchKecamatan.trim().toLowerCase();
  const normalizedSearchDesa = searchDesa.trim().toLowerCase();
  const isSearching = Boolean(normalizedSearchKecamatan || normalizedSearchDesa);

  const filteredKecamatanData = useMemo(() => {
    return kecamatanData
      .map((kecamatan) => {
        const matchesKecamatan =
          !normalizedSearchKecamatan ||
          kecamatan.nama?.toLowerCase().includes(normalizedSearchKecamatan);

        if (!matchesKecamatan) {
          return null;
        }

        const filteredDesas = !normalizedSearchDesa
          ? kecamatan.desas
          : kecamatan.desas.filter((desa) =>
              desa.nama?.toLowerCase().includes(normalizedSearchDesa)
            );

        if (normalizedSearchDesa && filteredDesas.length === 0) {
          return null;
        }

        return {
          ...kecamatan,
          desas: filteredDesas,
        };
      })
      .filter(Boolean);
  }, [kecamatanData, normalizedSearchDesa, normalizedSearchKecamatan]);

  const visibleDesaCount = useMemo(
    () => filteredKecamatanData.reduce((total, kecamatan) => total + kecamatan.desas.length, 0),
    [filteredKecamatanData]
  );

  const toggleKecamatan = (kecamatanId) => {
    setExpandedKecamatan((prev) => ({
      ...prev,
      [kecamatanId]: !prev[kecamatanId],
    }));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-md">
          <LuBuilding2 className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">Data Kecamatan & Desa</h2>
          <p className="text-sm text-gray-500">
            {isSearching
              ? `${filteredKecamatanData.length} Kecamatan • ${visibleDesaCount} Desa/Kelurahan ditemukan`
              : `${kecamatanData.length} Kecamatan — Klik untuk melihat detail kelembagaan`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="relative">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchKecamatan}
            onChange={(e) => setSearchKecamatan(e.target.value)}
            placeholder="Cari nama kecamatan..."
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-10 py-3 text-sm text-gray-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          {searchKecamatan && (
            <button
              type="button"
              onClick={() => setSearchKecamatan("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Reset pencarian kecamatan"
            >
              <LuX className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="relative">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchDesa}
            onChange={(e) => setSearchDesa(e.target.value)}
            placeholder="Cari nama desa/kelurahan..."
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-10 py-3 text-sm text-gray-700 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          {searchDesa && (
            <button
              type="button"
              onClick={() => setSearchDesa("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Reset pencarian desa"
            >
              <LuX className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {filteredKecamatanData.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
            <LuSearch className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold text-gray-800">Data tidak ditemukan</h3>
          <p className="mt-1 text-sm text-gray-500">
            Coba ubah kata kunci pencarian kecamatan atau desa.
          </p>
        </div>
      ) : (

      filteredKecamatanData.map((kecamatan) => {
        const isExpanded = isSearching || expandedKecamatan[kecamatan.id];

        return (
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
              <div className="hidden md:flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1.5 bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg">
                  <span className="font-bold">{kecamatan.verifiedKelembagaan?.rw || 0}</span>
                  <span className="text-purple-500 text-xs">RW</span>
                </div>
                <div className="flex items-center gap-1.5 bg-green-50 text-green-700 px-2.5 py-1 rounded-lg">
                  <span className="font-bold">{kecamatan.verifiedKelembagaan?.rt || 0}</span>
                  <span className="text-green-500 text-xs">RT</span>
                </div>
                <div className="flex items-center gap-1.5 bg-red-50 text-red-700 px-2.5 py-1 rounded-lg">
                  <span className="font-bold">{kecamatan.verifiedKelembagaan?.posyandu || 0}</span>
                  <span className="text-red-500 text-xs">Posyandu</span>
                </div>
              </div>
              {isExpanded ? (
                <LuChevronUp className="h-5 w-5 text-gray-500" />
              ) : (
                <LuChevronDown className="h-5 w-5 text-gray-500" />
              )}
            </div>
          </button>

          {/* Kecamatan Content */}
          {isExpanded && (
            <div className="border-t border-gray-200">
              {/* Summary Table for Kecamatan */}
              <div className="p-5 bg-gray-50/80">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">
                  Kelembagaan Terverifikasi
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  <SummaryChip icon={LuUsers} title="RW" value={kecamatan.verifiedKelembagaan?.rw} color="#9333ea" />
                  <SummaryChip icon={LuUser} title="RT" value={kecamatan.verifiedKelembagaan?.rt} color="#16a34a" />
                  <SummaryChip icon={LuHeartHandshake} title="Posyandu" value={kecamatan.verifiedKelembagaan?.posyandu} color="#dc2626" />
                  <SummaryChip icon={LuUsers} title="Karang Taruna" value={kecamatan.verifiedKelembagaan?.karangTaruna} color="#2563eb" />
                  <SummaryChip icon={LuBuilding2} title="LPM" value={kecamatan.verifiedKelembagaan?.lpm} color="#4f46e5" />
                  <SummaryChip icon={LuHeart} title="PKK" value={kecamatan.verifiedKelembagaan?.pkk} color="#ec4899" />
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
      );
      })
      )}
    </div>
  );
};

export default KecamatanAccordion;
