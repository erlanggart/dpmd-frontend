// src/pages/kepala-dinas/components/TrendChart.jsx
import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Calendar } from 'lucide-react';

const COLORS = {
  bumdes: '#3B82F6',    // Blue
  perjadin: '#F59E0B',  // Orange
  add: '#10B981',       // Green
  bhprd: '#8B5CF6',     // Purple
  dd: '#EF4444',        // Red
  bankeu: '#06B6D4'     // Cyan
};

const TrendChart = ({ trends }) => {
  // Prepare trends data for line chart
  const trendsData = (trends || []).map(item => ({
    month: item.month,
    BUMDes: item.bumdes_count,
    Perjadin: item.perjadin_count,
    ADD: item.add_count,
    BHPRD: item.bhprd_count,
    DD: item.dd_count,
    Bankeu: item.bankeu_count
  }));

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Calendar className="w-5 h-5 text-purple-600" />
        <h2 className="text-xl font-bold text-gray-800">
          Trend Bulanan Semua Program (6 Bulan Terakhir)
        </h2>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={trendsData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '8px',
              border: '1px solid #E5E7EB'
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="BUMDes"
            stroke={COLORS.bumdes}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="Perjadin"
            stroke={COLORS.perjadin}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="ADD"
            stroke={COLORS.add}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="BHPRD"
            stroke={COLORS.bhprd}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="DD"
            stroke={COLORS.dd}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="Bankeu"
            stroke={COLORS.bankeu}
            strokeWidth={2}
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;
