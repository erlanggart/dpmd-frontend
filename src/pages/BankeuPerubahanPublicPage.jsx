// Public transparency page for Bankeu Perubahan
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, MapPin, Building2, CheckCircle2, DollarSign, BarChart3 } from 'lucide-react';
import { API_ENDPOINTS } from '../config/apiConfig';

const formatRupiah = (val) => {
  if (!val) return 'Rp 0';
  return 'Rp ' + Number(val).toLocaleString('id-ID');
};

const formatRupiahShort = (val) => {
  if (!val) return 'Rp 0';
  const n = Number(val);
  if (n >= 1e9) return `Rp ${(n / 1e9).toFixed(2)} M`;
  if (n >= 1e6) return `Rp ${(n / 1e6).toFixed(1)} Jt`;
  return formatRupiah(n);
};

const BankeuPerubahanPublicPage = () => {
  const navigate = useNavigate();
  const [tahun, setTahun] = useState(new Date().getFullYear());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState([]);

  const baseUrl = API_ENDPOINTS.EXPRESS_BASE;

  const fetchYears = async () => {
    try {
      const res = await axios.get(`${baseUrl}/public/bankeu-perubahan/available-years`);
      const list = res.data?.data || [];
      setYears(list.length > 0 ? list : [new Date().getFullYear()]);
    } catch (err) {
      console.error('Years fetch error:', err);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${baseUrl}/public/bankeu-perubahan/tracking-summary`, {
        params: { tahun_anggaran: tahun }
      });
      setData(res.data?.data || null);
    } catch (err) {
      console.error('Tracking fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchYears(); }, []);
  useEffect(() => { fetchData(); }, [tahun]);

  const summary = data?.summary || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 py-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali ke Beranda
          </button>
          <h1 className="text-2xl md:text-3xl font-bold">Transparansi Bankeu Perubahan</h1>
          <p className="text-orange-100 mt-1">Dashboard Publik - Bantuan Keuangan Perubahan Desa</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Year Selector */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-5 flex items-center gap-3">
          <label className="text-sm font-semibold text-gray-700">Tahun Anggaran:</label>
          <select
            value={tahun}
            onChange={e => setTahun(parseInt(e.target.value))}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            {years.map(y => <option key={y} value={y}>TA {y}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
            Memuat data...
          </div>
        ) : !data ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
            Tidak ada data tersedia
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
              <StatBox
                label="Total Proposal"
                value={summary.total || 0}
                icon={BarChart3}
                gradient="from-blue-500 to-indigo-600"
              />
              <StatBox
                label="Disetujui Kecamatan"
                value={summary.approved_kecamatan || 0}
                icon={Building2}
                gradient="from-amber-500 to-orange-600"
              />
              <StatBox
                label="Diterima DPMD"
                value={summary.submitted_to_dpmd || 0}
                icon={CheckCircle2}
                gradient="from-emerald-500 to-teal-600"
              />
              <StatBox
                label="Total Anggaran"
                value={formatRupiahShort(summary.total_anggaran)}
                icon={DollarSign}
                gradient="from-purple-500 to-pink-600"
                isMoney
              />
            </div>

            {/* Per Kecamatan */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-5">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-600" /> Per Kecamatan
              </h2>
              {data.per_kecamatan?.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">Belum ada data</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">Kecamatan</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">Total Desa</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">Total Proposal</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">Diterima DPMD</th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">Total Anggaran</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.per_kecamatan?.map(k => (
                        <tr key={k.kecamatan_id} className="hover:bg-orange-50">
                          <td className="px-3 py-2 font-semibold text-gray-800">{k.kecamatan_nama}</td>
                          <td className="px-3 py-2 text-right text-gray-700">{k.total_desa}</td>
                          <td className="px-3 py-2 text-right text-gray-700">{k.total_proposals}</td>
                          <td className="px-3 py-2 text-right text-emerald-700 font-semibold">{k.diterima_dpmd}</td>
                          <td className="px-3 py-2 text-right text-gray-700">{formatRupiahShort(k.total_anggaran)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Per Kategori (Wajib / Pilihan Infrastruktur / Pilihan Non-Infrastruktur) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-lg font-bold text-gray-800 mb-4">Per Kategori Kegiatan</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(data.per_kategori || []).map(j => {
                  const labels = {
                    wajib: { label: 'Wajib', color: 'from-red-500 to-rose-600' },
                    pilihan_infrastruktur: { label: 'Pilihan Infrastruktur', color: 'from-orange-500 to-amber-600' },
                    pilihan_non_infrastruktur: { label: 'Pilihan Non-Infrastruktur', color: 'from-blue-500 to-indigo-600' },
                  };
                  const meta = labels[j.kategori] || { label: j.kategori, color: 'from-gray-500 to-gray-600' };
                  return (
                    <div key={j.kategori} className="border border-gray-200 rounded-xl p-4">
                      <div className={`inline-block px-2 py-0.5 bg-gradient-to-r ${meta.color} text-white text-xs font-bold rounded mb-2`}>
                        {meta.label}
                      </div>
                      <div className="text-2xl font-bold text-gray-800">{j.total} proposal</div>
                      <div className="text-xs text-emerald-700 mt-1">{j.diterima} diterima DPMD</div>
                      {j.total_anggaran && (
                        <div className="text-xs text-gray-600 mt-1">
                          Anggaran: {formatRupiahShort(j.total_anggaran)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const StatBox = ({ label, value, icon: Icon, gradient, isMoney }) => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow">
    <div className={`inline-flex h-10 w-10 bg-gradient-to-br ${gradient} rounded-xl items-center justify-center mb-3`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div className="text-xs font-semibold text-gray-500">{label}</div>
    <div className="text-2xl font-bold text-gray-800 mt-1">{value}</div>
  </div>
);

export default BankeuPerubahanPublicPage;
