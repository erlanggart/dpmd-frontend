import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import KegiatanCard from './KegiatanCard';
import { FiActivity, FiDollarSign, FiUsers, FiTrendingUp } from 'react-icons/fi';

const KegiatanSection = () => {
  const { ref, inView } = useInView({ threshold: 0.15, triggerOnce: true });

  const kegiatanPrograms = [
    {
      slug: 'bantuan-keuangan-infrastruktur-2025',
      title: 'Bantuan Keuangan Infrastruktur Desa 2025',
      description: 'Program bantuan keuangan untuk pembangunan dan perbaikan infrastruktur desa meliputi jalan, jembatan, saluran irigasi, dan infrastruktur pendukung lainnya.',
      year: '2025',
      icon: <FiDollarSign />,
      color: 'from-amber-500 to-orange-600',
      lightColor: 'bg-amber-50 text-amber-700 border-amber-200',
    },
    {
      slug: 'bimtek-bumdes-2025',
      title: 'Bimbingan Teknis Pengelolaan BUMDes',
      description: 'Program pelatihan dan pendampingan teknis untuk meningkatkan kapasitas pengelola BUMDes dalam manajemen keuangan dan pengembangan usaha.',
      year: '2025',
      icon: <FiUsers />,
      color: 'from-blue-500 to-indigo-600',
      lightColor: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      slug: 'pelatihan-aparatur-desa-2025',
      title: 'Pelatihan Aparatur Desa',
      description: 'Program peningkatan kompetensi aparatur desa melalui pelatihan administrasi pemerintahan, pelayanan publik, dan tata kelola desa.',
      year: '2025',
      icon: <FiTrendingUp />,
      color: 'from-emerald-500 to-teal-600',
      lightColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      slug: 'pengembangan-produk-unggulan-desa',
      title: 'Pengembangan Produk Unggulan Desa',
      description: 'Pendampingan dan pembinaan produk unggulan desa untuk meningkatkan ekonomi masyarakat dan daya saing produk lokal.',
      year: '2025',
      icon: <FiActivity />,
      color: 'from-purple-500 to-violet-600',
      lightColor: 'bg-purple-50 text-purple-700 border-purple-200',
    }
  ];

  return (
    <section ref={ref} className="relative py-24 bg-white overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-blue-50 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-amber-50 to-transparent rounded-full translate-y-1/2 -translate-x-1/3" />

      <div className="container max-w-7xl mx-auto px-4 md:px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center space-x-2 bg-[rgb(var(--color-primary))]/5 border border-[rgb(var(--color-primary))]/10 rounded-full px-5 py-2 mb-6">
            <FiActivity className="text-[rgb(var(--color-secondary))]" />
            <span className="text-[rgb(var(--color-primary))] text-sm font-semibold tracking-wide">Program & Kegiatan</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Kegiatan Unggulan DPMD
          </h2>
          <p className="text-gray-500 max-w-2xl mx-auto text-lg leading-relaxed">
            Program strategis pemberdayaan masyarakat dan desa untuk kemajuan Kabupaten Bogor
          </p>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {kegiatanPrograms.map((program, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: index * 0.12 }}
            >
              <KegiatanCard
                title={program.title}
                description={program.description}
                icon={program.icon}
                slug={program.slug}
                year={program.year}
                color={program.color}
                lightColor={program.lightColor}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default KegiatanSection;
