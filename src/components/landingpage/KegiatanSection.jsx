// src/components/landingpage/KegiatanSection.jsx
import React from 'react';
import KegiatanCard from './KegiatanCard';
import { FiActivity, FiDollarSign, FiUsers, FiTrendingUp } from 'react-icons/fi';

const KegiatanSection = () => {
  // Data kegiatan/program (bisa dipindah ke API nanti)
  const kegiatanPrograms = [
    {
      slug: 'bantuan-keuangan-infrastruktur-2025',
      title: 'Program Bantuan Keuangan Infrastruktur Desa 2025',
      description: 'Program bantuan keuangan untuk pembangunan dan perbaikan infrastruktur desa di seluruh Kabupaten Bogor tahun 2025. Meliputi pembangunan jalan, jembatan, saluran irigasi, dan infrastruktur pendukung lainnya.',
      year: '2025',
      icon: <FiDollarSign />,
      dataFile: 'bankeu2025.json'
    },
    {
      slug: 'bimtek-bumdes-2025',
      title: 'Bimbingan Teknis Pengelolaan BUMDes',
      description: 'Program pelatihan dan pendampingan teknis untuk meningkatkan kapasitas pengelola BUMDes dalam manajemen keuangan, administrasi, dan pengembangan usaha desa.',
      year: '2025',
      icon: <FiUsers />,
      dataFile: null // Belum ada data
    },
    {
      slug: 'pelatihan-aparatur-desa-2025',
      title: 'Pelatihan Aparatur Desa',
      description: 'Program peningkatan kompetensi aparatur desa melalui pelatihan administrasi pemerintahan, pelayanan publik, dan tata kelola desa yang baik.',
      year: '2025',
      icon: <FiTrendingUp />,
      dataFile: null
    },
    {
      slug: 'pengembangan-produk-unggulan-desa',
      title: 'Program Pengembangan Produk Unggulan Desa',
      description: 'Pendampingan dan pembinaan pengembangan produk unggulan desa untuk meningkatkan ekonomi masyarakat dan daya saing produk lokal.',
      year: '2025',
      icon: <FiActivity />,
      dataFile: null
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50 overflow-x-hidden">
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center space-x-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-semibold mb-4">
            <FiActivity className="text-lg" />
            <span>Program & Kegiatan</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Kegiatan DPMD Kabupaten Bogor
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            Berbagai program dan kegiatan pemberdayaan masyarakat dan desa untuk mendukung kemajuan desa di Kabupaten Bogor
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {kegiatanPrograms.map((program, index) => (
            <KegiatanCard
              key={index}
              title={program.title}
              description={program.description}
              icon={program.icon}
              slug={program.slug}
              year={program.year}
              image={program.image}
            />
          ))}
        </div>

        {/* Info Banner */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 text-center">
          <p className="text-gray-700">
            <span className="font-semibold text-blue-700">Info:</span> Klik pada setiap program untuk melihat detail lengkap kegiatan dan progres pelaksanaan
          </p>
        </div>
      </div>
    </section>
  );
};

export default KegiatanSection;
