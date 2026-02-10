import React, { useState } from 'react';
import { LuBuilding2 } from 'react-icons/lu';
import DinasVerificationPage from './DinasVerificationPage';

const DinasBankeuPage = () => {
  const [selectedYear, setSelectedYear] = useState(null);

  // Year Selection Screen
  if (!selectedYear) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4 md:p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex h-20 w-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-3xl items-center justify-center mb-6 shadow-2xl shadow-amber-500/30">
              <LuBuilding2 className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-800 via-amber-700 to-orange-600 bg-clip-text text-transparent mb-3">
              Verifikasi Proposal Bankeu
            </h1>
            <p className="text-gray-600 text-lg">
              Pilih tahun anggaran untuk memverifikasi proposal
            </p>
          </div>

          {/* Year Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* TA 2026 */}
            <button
              onClick={() => setSelectedYear(2026)}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border-2 border-gray-200 hover:border-amber-400 p-8 transition-all duration-300 text-center overflow-hidden hover:-translate-y-2"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="h-16 w-16 mx-auto bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-amber-500/25">
                  <span className="text-3xl">📋</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">TA 2026</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Verifikasi Proposal<br/>Tahun Anggaran 2026
                </p>
              </div>
            </button>

            {/* TA 2027 */}
            <button
              onClick={() => setSelectedYear(2027)}
              className="group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl border-2 border-gray-200 hover:border-orange-400 p-8 transition-all duration-300 text-center overflow-hidden hover:-translate-y-2"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-400/5 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative">
                <div className="h-16 w-16 mx-auto bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg shadow-orange-500/25">
                  <span className="text-3xl">📝</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-2">TA 2027</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Verifikasi Proposal<br/>Tahun Anggaran 2027
                </p>
              </div>
            </button>
          </div>

          {/* Info Box */}
          <div className="mt-12 max-w-2xl mx-auto">
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <LuBuilding2 className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-900 mb-1">Informasi Penting</h4>
                  <ul className="text-sm text-amber-800 space-y-1">
                    <li>• Setiap tahun anggaran memiliki proposal yang terpisah</li>
                    <li>• Pastikan memilih tahun yang sesuai dengan periode verifikasi</li>
                    <li>• Data proposal tidak akan tercampur antar tahun anggaran</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show DinasVerificationPage with selected year
  return (
    <div className="relative">
      {/* Year Badge & Back Button */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white py-3 px-4 md:px-8 shadow-lg sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedYear(null)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold transition-all duration-200 text-sm"
            >
              ← Ganti Tahun
            </button>
            <div className="h-8 w-px bg-white/30"></div>
            <div className="flex items-center gap-2">
              <LuBuilding2 className="w-5 h-5" />
              <span className="font-bold text-lg">Tahun Anggaran {selectedYear}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <DinasVerificationPage tahun={selectedYear} />
    </div>
  );
};

export default DinasBankeuPage;
