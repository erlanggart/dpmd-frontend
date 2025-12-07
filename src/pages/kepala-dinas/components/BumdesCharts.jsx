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
  primary: '#3B82F6',
  secondary: '#10B981',
  danger: '#EF4444'
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* BUMDes per Kecamatan - Bar Chart */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-800">
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
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <h2 className="text-xl font-bold text-gray-800">
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
        <div className="flex justify-center gap-6 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500"></div>
            <span className="text-sm text-gray-700">
              Aktif: {bumdes?.aktif || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500"></div>
            <span className="text-sm text-gray-700">
              Non-Aktif: {bumdes?.non_aktif || 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BumdesCharts;
