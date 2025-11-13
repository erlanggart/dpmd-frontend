// src/pages/BeritaDetailPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiArrowLeft, FiCalendar, FiUser, FiEye, FiTag } from 'react-icons/fi';

const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api'
};

const BeritaDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [berita, setBerita] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:3001/api';
  const STORAGE_BASE = API_BASE.replace('/api', '');

  useEffect(() => {
    fetchBeritaDetail();
  }, [slug]);

  const fetchBeritaDetail = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_CONFIG.BASE_URL}/berita/public/${slug}`);
      
      if (response.data.status === 'success') {
        setBerita(response.data.data);
        setError(null);
      }
    } catch (err) {
      console.error('Error fetching berita detail:', err);
      setError('Gagal memuat detail berita');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getKategoriColor = (kategori) => {
    const colors = {
      pengumuman: 'from-red-500 to-orange-500',
      bumdes: 'from-blue-500 to-cyan-500',
      perjadin: 'from-orange-500 to-amber-500',
      musdesus: 'from-purple-500 to-pink-500',
      umum: 'from-gray-500 to-slate-500'
    };
    return colors[kategori] || colors.umum;
  };

  const getKategoriLabel = (kategori) => {
    const labels = {
      pengumuman: 'Pengumuman',
      bumdes: 'BUMDes',
      perjadin: 'Perjalanan Dinas',
      musdesus: 'Musdesus',
      umum: 'Umum'
    };
    return labels[kategori] || 'Umum';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-gray-600 text-lg">Memuat berita...</p>
        </div>
      </div>
    );
  }

  if (error || !berita) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Berita Tidak Ditemukan</h2>
          <p className="text-gray-600 mb-6">{error || 'Berita yang Anda cari tidak tersedia'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiArrowLeft className="inline mr-2" />
            Kembali ke Beranda
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Header with Back Button */}
      <div className="bg-white shadow-md">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold transition-colors"
          >
            <FiArrowLeft className="w-5 h-5" />
            Kembali ke Beranda
          </button>
        </div>
      </div>

      {/* Article Content */}
      <article className="container max-w-4xl mx-auto px-4 py-12">
        {/* Featured Image */}
        <div className="mb-8 rounded-3xl overflow-hidden shadow-2xl">
          <img
            src={berita.gambar ? `${STORAGE_BASE}/storage/uploads/berita/${berita.gambar}` : '/placeholder-news.jpg'}
            alt={berita.judul}
            className="w-full h-[500px] object-cover"
            onError={(e) => {
              e.target.src = '/placeholder-news.jpg';
            }}
          />
        </div>

        {/* Article Header */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8">
          {/* Kategori Badge */}
          <div className="mb-4">
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-bold bg-gradient-to-r ${getKategoriColor(berita.kategori)} shadow-lg`}>
              <FiTag className="w-4 h-4" />
              {getKategoriLabel(berita.kategori)}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {berita.judul}
          </h1>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-6 text-gray-600 border-t border-b border-gray-200 py-4">
            <div className="flex items-center gap-2">
              <FiCalendar className="w-5 h-5 text-blue-600" />
              <span className="font-medium">{formatDate(berita.tanggal_publish || berita.created_at)}</span>
            </div>
            {berita.penulis && (
              <div className="flex items-center gap-2">
                <FiUser className="w-5 h-5 text-purple-600" />
                <span className="font-medium">{berita.penulis}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <FiEye className="w-5 h-5 text-green-600" />
              <span className="font-medium">{berita.views || 0} views</span>
            </div>
          </div>

          {/* Ringkasan */}
          {berita.ringkasan && (
            <div className="mt-6 p-6 bg-blue-50 border-l-4 border-blue-600 rounded-r-xl">
              <p className="text-lg text-gray-700 leading-relaxed italic">
                {berita.ringkasan}
              </p>
            </div>
          )}
        </div>

        {/* Article Body */}
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <div 
            className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-blue-600 prose-strong:text-gray-900"
            dangerouslySetInnerHTML={{ __html: berita.konten }}
          />
        </div>

        {/* Share Section */}
        <div className="mt-8 bg-white rounded-3xl shadow-xl p-6 text-center">
          <p className="text-gray-600 mb-4">Bagikan artikel ini:</p>
          <div className="flex justify-center gap-4">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
              Facebook
            </button>
            <button className="px-6 py-3 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors font-semibold">
              Twitter
            </button>
            <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold">
              WhatsApp
            </button>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            <FiArrowLeft className="w-5 h-5" />
            Kembali ke Beranda
          </button>
        </div>
      </article>
    </div>
  );
};

export default BeritaDetailPage;
