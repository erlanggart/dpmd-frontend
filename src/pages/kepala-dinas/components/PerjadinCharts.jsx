// src/pages/kepala-dinas/components/PerjadinCharts.jsx
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Briefcase } from 'lucide-react';

const COLORS = {
  accent: '#F59E0B'
};

const PerjadinCharts = ({ perjalanan_dinas }) => {
  // Prepare Perjalanan Dinas by Lokasi
  const perjadinByLokasi = (perjalanan_dinas?.by_lokasi || [])
    .slice(0, 10)
    .map(item => ({
      name: item.lokasi || 'Tidak Ada',
      total: item.total
    }));

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="w-5 h-5 text-orange-600" />
        <h2 className="text-xl font-bold text-gray-800">
          Perjalanan Dinas per Lokasi (Top 10)
        </h2>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={perjadinByLokasi}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fontSize: 12 }}
          />
          <YAxis />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '8px',
              border: '1px solid #E5E7EB'
            }}
          />
          <Bar dataKey="total" fill={COLORS.accent} radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PerjadinCharts;
