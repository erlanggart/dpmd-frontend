import React, { useState } from "react";
import {
  LuChevronDown,
  LuChevronUp,
  LuBuilding2,
  LuUsers,
  LuShield,
  LuHeart,
  LuUser,
  LuCircleCheckBig,
  LuLoader,
} from "react-icons/lu";

const UnverifiedKelembagaanList = ({ kecamatanData, onDesaClick }) => {
  const [expanded, setExpanded] = useState(true);

  // Kumpulkan semua kelembagaan yang unverified
  const unverifiedList = [];
  
  kecamatanData.forEach((kecamatan) => {
    kecamatan.desas.forEach((desa) => {
      // RW unverified
      const rwUnverified = (desa.kelembagaan?.rw || 0) - (desa.verifiedKelembagaan?.rw || 0);
      if (rwUnverified > 0) {
        unverifiedList.push({
          type: 'RW',
          count: rwUnverified,
          desa: desa.nama,
          desaId: desa.id,
          kecamatan: kecamatan.nama,
          icon: LuUsers,
          color: 'blue-700'
        });
      }

      // RT unverified
      const rtUnverified = (desa.kelembagaan?.rt || 0) - (desa.verifiedKelembagaan?.rt || 0);
      if (rtUnverified > 0) {
        unverifiedList.push({
          type: 'RT',
          count: rtUnverified,
          desa: desa.nama,
          desaId: desa.id,
          kecamatan: kecamatan.nama,
          icon: LuUser,
          color: 'blue-500'
        });
      }

      // Posyandu unverified
      const posyanduUnverified = (desa.kelembagaan?.posyandu || 0) - (desa.verifiedKelembagaan?.posyandu || 0);
      if (posyanduUnverified > 0) {
        unverifiedList.push({
          type: 'Posyandu',
          count: posyanduUnverified,
          desa: desa.nama,
          desaId: desa.id,
          kecamatan: kecamatan.nama,
          icon: LuHeart,
          color: 'purple-600'
        });
      }

      // Karang Taruna, LPM, PKK, Satlinmas (status based)
      const statusTypes = [
        { key: 'karangTaruna', label: 'Karang Taruna', icon: LuUsers, color: 'blue-600' },
        { key: 'lpm', label: 'LPM', icon: LuBuilding2, color: 'indigo-600' },
        { key: 'pkk', label: 'PKK', icon: LuHeart, color: 'pink-600' },
        { key: 'satlinmas', label: 'Satlinmas', icon: LuShield, color: 'orange-600' }
      ];

      statusTypes.forEach(({ key, label, icon, color }) => {
        const status = desa.kelembagaan?.[key];
        const verifiedStatus = desa.verifiedKelembagaan?.[key];
        
        if (status === 'Terbentuk' && verifiedStatus !== 'Terbentuk') {
          unverifiedList.push({
            type: label,
            count: 1,
            desa: desa.nama,
            desaId: desa.id,
            kecamatan: kecamatan.nama,
            icon: icon,
            color: color
          });
        }
      });
    });
  });

  if (unverifiedList.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center">
          <LuCircleCheckBig className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-800 mb-1">Semua Terverifikasi</h3>
          <p className="text-sm text-gray-600">Tidak ada kelembagaan yang menunggu verifikasi</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-amber-50 border-b border-amber-200 hover:bg-amber-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 bg-amber-500 rounded-lg flex items-center justify-center">
            <LuLoader className="h-4 w-4 text-white" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-800">Menunggu Verifikasi</h3>
            <p className="text-xs text-gray-600">{unverifiedList.length} kelembagaan</p>
          </div>
        </div>
        {expanded ? (
          <LuChevronUp className="h-4 w-4 text-gray-500" />
        ) : (
          <LuChevronDown className="h-4 w-4 text-gray-500" />
        )}
      </button>

      {/* List */}
      {expanded && (
        <div className="max-h-96 overflow-y-auto">
          {unverifiedList.map((item, index) => {
            const Icon = item.icon;
            return (
              <div
                key={index}
                onClick={() => onDesaClick(item.desaId)}
                className="flex items-center gap-3 p-3 border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors group"
              >
                <div className={`h-8 w-8 bg-${item.color} bg-opacity-10 rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`h-4 w-4 text-${item.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800">{item.type}</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      {item.count}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {item.desa} • Kec. {item.kecamatan}
                  </p>
                </div>
                <LuChevronUp className="h-4 w-4 text-gray-400 group-hover:text-blue-600 transform rotate-90" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default UnverifiedKelembagaanList;
