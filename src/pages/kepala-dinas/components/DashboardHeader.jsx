// src/pages/kepala-dinas/components/DashboardHeader.jsx
import React from 'react';
import { Activity } from 'lucide-react';

const DashboardHeader = () => {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-3 bg-white rounded-lg shadow-md">
          <Activity className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">
            Dashboard Kepala Dinas
          </h1>
          <p className="text-gray-600">Statistik Keseluruhan DPMD Kabupaten Bogor</p>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;
