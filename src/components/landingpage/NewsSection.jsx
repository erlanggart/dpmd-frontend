// src/components/landingpage/NewsSection.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import NewsCarousel from './NewsCarousel';

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api'
};

const NewsSection = () => {
  const [beritaList, setBeritaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dummy data untuk testing (10 berita)
  const dummyBerita = [
    {
      id_berita: 1,
      slug: 'pembinaan-bumdes-kabupaten-bogor',
      judul: 'Pembinaan BUMDes Kabupaten Bogor',
      ringkasan: 'Kegiatan pembinaan dan pelatihan manajemen BUMDes se-Kabupaten Bogor untuk meningkatkan kualitas pengelolaan.',
      gambar: null,
      views: 245,
      tanggal_publish: '2025-11-12',
      created_at: '2025-11-12'
    },
    {
      id_berita: 2,
      slug: 'penyaluran-hibah-pkk-2025',
      judul: 'Penyaluran Hibah PKK Kabupaten Bogor Tahun 2025',
      ringkasan: 'Dinas DPMD menyalurkan hibah kepada PKK se-Kabupaten Bogor untuk mendukung program pemberdayaan masyarakat.',
      gambar: null,
      views: 189,
      tanggal_publish: '2025-11-11',
      created_at: '2025-11-11'
    },
    {
      id_berita: 3,
      slug: 'pelatihan-manajemen-bumdes',
      judul: 'Pelatihan Manajemen BUMDes se-Kabupaten Bogor',
      ringkasan: 'Workshop manajemen keuangan dan pemasaran produk BUMDes untuk meningkatkan daya saing usaha desa.',
      gambar: null,
      views: 312,
      tanggal_publish: '2025-11-10',
      created_at: '2025-11-10'
    },
    {
      id_berita: 4,
      slug: 'musdesus-perencanaan-pembangunan-desa',
      judul: 'Musdesus Perencanaan Pembangunan Desa 2026',
      ringkasan: 'Musyawarah desa khusus membahas rencana pembangunan dan alokasi dana desa untuk tahun anggaran 2026.',
      gambar: null,
      views: 421,
      tanggal_publish: '2025-11-09',
      created_at: '2025-11-09'
    },
    {
      id_berita: 5,
      slug: 'monitoring-perjadin-kecamatan',
      judul: 'Monitoring Perjalanan Dinas Tingkat Kecamatan',
      ringkasan: 'Tim DPMD melakukan monitoring dan evaluasi pelaksanaan perjalanan dinas di seluruh kecamatan.',
      gambar: null,
      views: 167,
      tanggal_publish: '2025-11-08',
      created_at: '2025-11-08'
    },
    {
      id_berita: 6,
      slug: 'sosialisasi-program-desa-digital',
      judul: 'Sosialisasi Program Desa Digital',
      ringkasan: 'Pengenalan dan sosialisasi transformasi digital untuk desa-desa di Kabupaten Bogor menuju smart village.',
      gambar: null,
      views: 534,
      tanggal_publish: '2025-11-07',
      created_at: '2025-11-07'
    },
    {
      id_berita: 7,
      slug: 'launching-produk-unggulan-bumdes',
      judul: 'Launching Produk Unggulan BUMDes Bogor',
      ringkasan: 'Peluncuran produk-produk unggulan dari berbagai BUMDes di Kabupaten Bogor dalam pameran regional.',
      gambar: null,
      views: 678,
      tanggal_publish: '2025-11-06',
      created_at: '2025-11-06'
    },
    {
      id_berita: 8,
      slug: 'rapat-koordinasi-kepala-desa',
      judul: 'Rapat Koordinasi Kepala Desa Se-Kabupaten',
      ringkasan: 'Pertemuan koordinasi membahas implementasi program prioritas dan tantangan pembangunan desa.',
      gambar: null,
      views: 289,
      tanggal_publish: '2025-11-05',
      created_at: '2025-11-05'
    },
    {
      id_berita: 9,
      slug: 'festival-desa-wisata-2025',
      judul: 'Festival Desa Wisata Kabupaten Bogor 2025',
      ringkasan: 'Gelaran festival desa wisata menampilkan potensi wisata dan budaya dari desa-desa di Kabupaten Bogor.',
      gambar: null,
      views: 892,
      tanggal_publish: '2025-11-04',
      created_at: '2025-11-04'
    },
    {
      id_berita: 10,
      slug: 'evaluasi-bumdes-triwulan-3',
      judul: 'Evaluasi Kinerja BUMDes Triwulan III 2025',
      ringkasan: 'Hasil evaluasi kinerja dan laporan keuangan BUMDes se-Kabupaten Bogor untuk periode triwulan ketiga.',
      gambar: null,
      views: 445,
      tanggal_publish: '2025-11-03',
      created_at: '2025-11-03'
    }
  ];

  useEffect(() => {
    fetchBerita();
  }, []);

  const fetchBerita = async () => {
    try {
      setLoading(true);
      const params = {
        limit: 10,
        status: 'published'
      };

      const response = await axios.get(`${API_CONFIG.BASE_URL}/berita/public`, { params });

      if (response.data.status === 'success') {
        // Jika ada data dari API, gunakan itu, jika tidak gunakan dummy
        const beritaData = response.data.data && response.data.data.length > 0 
          ? response.data.data 
          : dummyBerita;
        setBeritaList(beritaData);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching berita:', err);
      // Jika error, gunakan dummy data
      setBeritaList(dummyBerita);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="berita" className="py-20 bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      <div className="container max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            📰 Berita & Informasi
          </h2>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Dapatkan informasi terbaru seputar kegiatan dan program Dinas Pemberdayaan Masyarakat dan Desa
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Memuat berita...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="text-center py-12">
            <div className="text-red-500 text-5xl mb-4">⚠️</div>
            <p className="text-gray-600">{error}</p>
            <button
              onClick={fetchBerita}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Berita Carousel */}
        {!loading && !error && (
          <>
            {beritaList.length > 0 ? (
              <NewsCarousel beritaList={beritaList} />
            ) : (
              <div className="text-center py-12 text-gray-500">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-xl">Belum ada berita untuk kategori ini</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default NewsSection;
