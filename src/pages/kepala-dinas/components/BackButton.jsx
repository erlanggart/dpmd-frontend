// src/pages/kepala-dinas/components/BackButton.jsx
import React from 'react';

const BackButton = ({ onClick }) => {
  return (
    <div className="mb-6">
      <button
        onClick={onClick}
        className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-all duration-200"
      >
        <span className="text-gray-600">←</span>
        <span className="text-gray-700 font-medium">Kembali ke Ringkasan</span>
      </button>
    </div>
  );
};

export default BackButton;
