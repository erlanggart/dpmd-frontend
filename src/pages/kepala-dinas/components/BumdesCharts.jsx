// src/pages/kepala-dinas/components/BumdesCharts.jsx
import React from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { MapPin, TrendingUp } from 'lucide-react';

const COLORS = {
  primary: '#0f172a', // hitam navy — warna dominan
  secondary: '#059669', // aktif (makna data, bukan aksen)
  danger: '#94a3b8' // non-aktif: netral, bukan "salah"
};

const BumdesCharts = ({ bumdes }) => {
  // Prepare BUMDes by Kecamatan data (semua)
  const bumdesByKecamatan = (bumdes?.by_kecamatan || [])
    .sort((a, b) => b.total - a.total)
    .map(item => ({
      name: item.kecamatan || 'Tidak Ada',
      total: item.total
    }));

  // Prepare BUMDes by Status for pie chart
  const bumdesByStatus = [
    { name: 'Aktif', value: bumdes?.aktif || 0, color: COLORS.secondary },
    { name: 'Non-Aktif', value: bumdes?.non_aktif || 0, color: COLORS.danger }
  ];

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* BUMDes per Kecamatan - Bar Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="h-4 w-1 rounded-full bg-slate-900" />
          <MapPin className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">
            BUMDes per Kecamatan
          </h2>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={bumdesByKecamatan}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="name"
              angle={-45}
              textAnchor="end"
              height={100}
              tick={{ fontSize: 11 }}
            />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '8px',
                border: '1px solid #E5E7EB'
              }}
            />
            <Bar dataKey="total" fill={COLORS.primary} radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* BUMDes Status - Pie Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="h-4 w-1 rounded-full bg-slate-900" />
          <TrendingUp className="h-4 w-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">
            Status BUMDes
          </h2>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={bumdesByStatus}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) =>
                `${name}: ${(percent * 100).toFixed(0)}%`
              }
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {bumdesByStatus.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '8px',
                border: '1px solid #E5E7EB'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="mt-4 flex justify-center gap-6">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
            <span className="text-sm text-slate-600">
              Aktif: <span className="font-semibold text-slate-900">{bumdes?.aktif || 0}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            <span className="text-sm text-slate-600">
              Non-Aktif: <span className="font-semibold text-slate-900">{bumdes?.non_aktif || 0}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BumdesCharts;
