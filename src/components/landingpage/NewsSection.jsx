// src/components/landingpage/NewsSection.jsx
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import axios from 'axios';
import NewsCarousel from './NewsCarousel';
import { FiRss } from 'react-icons/fi';

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api'
};

const NewsSection = () => {
  const [beritaList, setBeritaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });

  const dummyBerita = [
    { id_berita: 1, slug: 'pembinaan-bumdes-kabupaten-bogor', judul: 'Pembinaan BUMDes Kabupaten Bogor', ringkasan: 'Kegiatan pembinaan dan pelatihan manajemen BUMDes se-Kabupaten Bogor untuk meningkatkan kualitas pengelolaan.', gambar: null, views: 245, tanggal_publish: '2025-11-12', created_at: '2025-11-12' },
    { id_berita: 2, slug: 'penyaluran-hibah-pkk-2025', judul: 'Penyaluran Hibah PKK Kabupaten Bogor Tahun 2025', ringkasan: 'Dinas DPMD menyalurkan hibah kepada PKK se-Kabupaten Bogor untuk mendukung program pemberdayaan masyarakat.', gambar: null, views: 189, tanggal_publish: '2025-11-11', created_at: '2025-11-11' },
    { id_berita: 3, slug: 'pelatihan-manajemen-bumdes', judul: 'Pelatihan Manajemen BUMDes se-Kabupaten Bogor', ringkasan: 'Workshop manajemen keuangan dan pemasaran produk BUMDes untuk meningkatkan daya saing usaha desa.', gambar: null, views: 312, tanggal_publish: '2025-11-10', created_at: '2025-11-10' },
    { id_berita: 4, slug: 'musdesus-perencanaan-pembangunan-desa', judul: 'Musdesus Perencanaan Pembangunan Desa 2026', ringkasan: 'Musyawarah desa khusus membahas rencana pembangunan dan alokasi dana desa untuk tahun anggaran 2026.', gambar: null, views: 421, tanggal_publish: '2025-11-09', created_at: '2025-11-09' },
    { id_berita: 5, slug: 'monitoring-perjadin-kecamatan', judul: 'Monitoring Perjalanan Dinas Tingkat Kecamatan', ringkasan: 'Tim DPMD melakukan monitoring dan evaluasi pelaksanaan perjalanan dinas di seluruh kecamatan.', gambar: null, views: 167, tanggal_publish: '2025-11-08', created_at: '2025-11-08' },
    { id_berita: 6, slug: 'sosialisasi-program-desa-digital', judul: 'Sosialisasi Program Desa Digital', ringkasan: 'Pengenalan dan sosialisasi transformasi digital untuk desa-desa di Kabupaten Bogor menuju smart village.', gambar: null, views: 534, tanggal_publish: '2025-11-07', created_at: '2025-11-07' },
    { id_berita: 7, slug: 'launching-produk-unggulan-bumdes', judul: 'Launching Produk Unggulan BUMDes Bogor', ringkasan: 'Peluncuran produk-produk unggulan dari berbagai BUMDes di Kabupaten Bogor dalam pameran regional.', gambar: null, views: 678, tanggal_publish: '2025-11-06', created_at: '2025-11-06' },
    { id_berita: 8, slug: 'rapat-koordinasi-kepala-desa', judul: 'Rapat Koordinasi Kepala Desa Se-Kabupaten', ringkasan: 'Pertemuan koordinasi membahas implementasi program prioritas dan tantangan pembangunan desa.', gambar: null, views: 289, tanggal_publish: '2025-11-05', created_at: '2025-11-05' },
    { id_berita: 9, slug: 'festival-desa-wisata-2025', judul: 'Festival Desa Wisata Kabupaten Bogor 2025', ringkasan: 'Gelaran festival desa wisata menampilkan potensi wisata dan budaya dari desa-desa di Kabupaten Bogor.', gambar: null, views: 892, tanggal_publish: '2025-11-04', created_at: '2025-11-04' },
    { id_berita: 10, slug: 'evaluasi-bumdes-triwulan-3', judul: 'Evaluasi Kinerja BUMDes Triwulan III 2025', ringkasan: 'Hasil evaluasi kinerja dan laporan keuangan BUMDes se-Kabupaten Bogor untuk periode triwulan ketiga.', gambar: null, views: 445, tanggal_publish: '2025-11-03', created_at: '2025-11-03' }
  ];

  useEffect(() => {
    fetchBerita();
  }, []);

  const fetchBerita = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_CONFIG.BASE_URL}/berita/public`, {
        params: { limit: 10, status: 'published' }
      });
      if (response.data.status === 'success') {
        const beritaData = response.data.data && response.data.data.length > 0 
          ? response.data.data 
          : dummyBerita;
        setBeritaList(beritaData);
        setError(null);
      }
    } catch (err) {
      setBeritaList(dummyBerita);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section ref={ref} className="relative py-24 bg-[rgb(var(--color-primary))] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 1px)`,
        backgroundSize: '32px 32px'
      }} />
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[rgb(var(--color-secondary))]/20 to-transparent" />
      <div className="absolute -top-40 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px]" />
      <div className="absolute -bottom-40 left-0 w-96 h-96 bg-[rgb(var(--color-secondary))]/5 rounded-full blur-[120px]" />

      <div className="container max-w-7xl mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center space-x-2 bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] rounded-full px-5 py-2 mb-6">
            <FiRss className="text-[rgb(var(--color-secondary))] w-3.5 h-3.5" />
            <span className="text-white/70 text-sm font-medium tracking-wider uppercase">Berita Terkini</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Berita & Informasi
          </h2>
          <p className="text-white/50 text-lg max-w-2xl mx-auto leading-relaxed">
            Informasi terbaru seputar kegiatan dan program Dinas Pemberdayaan Masyarakat dan Desa
          </p>
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-3 border-white/20 border-t-[rgb(var(--color-secondary))] rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-12">
            <p className="text-white/60 mb-4">{error}</p>
            <button
              onClick={fetchBerita}
              className="px-6 py-2.5 bg-white/10 backdrop-blur-sm border border-white/15 text-white rounded-xl hover:bg-white/20 transition-all font-medium"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Carousel */}
        {!loading && !error && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            {beritaList.length > 0 ? (
              <NewsCarousel beritaList={beritaList} />
            ) : (
              <div className="text-center py-16">
                <p className="text-white/40 text-lg">Belum ada berita tersedia</p>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default NewsSection;
