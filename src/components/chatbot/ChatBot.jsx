import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiX, FiChevronRight, FiMessageCircle, FiLoader } from 'react-icons/fi';
import api from '../../api';

// Category chip colors
const CATEGORY_COLORS = {
  desa: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  kecamatan: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  pegawai: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
  aparatur_desa: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
  kelembagaan: 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100',
  bumdes: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  produk_hukum: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
  berita: 'bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100',
  kegiatan: 'bg-cyan-50 text-cyan-700 border-cyan-200 hover:bg-cyan-100',
  perjadin: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
  bankeu: 'bg-lime-50 text-lime-700 border-lime-200 hover:bg-lime-100',
  surat_masuk: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100',
  disposisi: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
  profil_desa: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
  user: 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100',
  absensi: 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100',
  informasi: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
  notifikasi: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-100',
};

const QUICK_SEARCHES = [
  { label: '🧑‍💼 Kepala Desa', query: 'kepala desa', category: 'aparatur_desa' },
  { label: '🏘️ Data Desa', query: '', category: 'desa' },
  { label: '👤 Pegawai', query: '', category: 'pegawai' },
  { label: '🏪 BUMDes', query: '', category: 'bumdes' },
  { label: '📜 Produk Hukum', query: '', category: 'produk_hukum' },
  { label: '📅 Kegiatan', query: '', category: 'kegiatan' },
  { label: '📬 Surat Masuk', query: '', category: 'surat_masuk' },
  { label: '🏛️ Kecamatan', query: '', category: 'kecamatan' },
];

const ChatBot = ({ isDesktop = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expandedResult, setExpandedResult] = useState(null);
  const [stats, setStats] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Load categories & stats on first open
  useEffect(() => {
    if (isOpen && categories.length === 0) {
      loadInitialData();
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadInitialData = async () => {
    try {
      const [catRes, statsRes] = await Promise.all([
        api.get('/chatbot/categories'),
        api.get('/chatbot/stats'),
      ]);
      if (catRes.data.success) setCategories(catRes.data.data);
      if (statsRes.data.success) setStats(statsRes.data.data);
    } catch (err) {
      console.error('Failed to load chatbot data:', err);
    }
  };

  const performSearch = useCallback(async (query, category = null) => {
    if (!query && !category) return;

    const searchQuery = query || '';
    const displayQuery = searchQuery || (category ? `Semua ${categories.find(c => c.id === category)?.label || category}` : '');

    // Add user message
    setMessages(prev => [...prev, {
      type: 'user',
      text: displayQuery,
      timestamp: new Date(),
    }]);

    setIsLoading(true);
    setInputValue('');

    try {
      const response = await api.post('/chatbot/search', {
        query: searchQuery || ' ',
        category: category || undefined,
      });

      if (response.data.success) {
        const { results, totalResults, summary } = response.data.data;

        let botText;
        if (totalResults > 0) {
          const showingNote = totalResults > 50 ? ' (menampilkan 50 teratas)' : '';
          const summaryNote = summary ? `\n📊 ${summary}` : '';
          botText = `Ditemukan **${totalResults}** hasil${showingNote}:${summaryNote}`;
        } else {
          botText = `Tidak ditemukan hasil untuk "${displayQuery}". 💡 Coba kata kunci yang lebih pendek atau sebagian kata saja, misal "bina" untuk mencari "Bina Teknik".`;
        }

        setMessages(prev => [...prev, {
          type: 'bot',
          text: botText,
          results: results,
          totalResults: totalResults,
          timestamp: new Date(),
        }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, {
        type: 'bot',
        text: 'Maaf, terjadi kesalahan saat mencari data. Silakan coba lagi.',
        isError: true,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [categories]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() && !selectedCategory) return;
    performSearch(inputValue.trim(), selectedCategory);
    setSelectedCategory(null);
  };

  const handleQuickSearch = (qs) => {
    if (qs.query) {
      performSearch(qs.query, qs.category);
    } else {
      setSelectedCategory(qs.category);
      setInputValue('');
      inputRef.current?.focus();
    }
  };

  const handleCategoryClick = (catId) => {
    setSelectedCategory(selectedCategory === catId ? null : catId);
    inputRef.current?.focus();
  };

  const toggleResultExpand = (index) => {
    setExpandedResult(expandedResult === index ? null : index);
  };

  const clearChat = () => {
    setMessages([]);
    setExpandedResult(null);
    setSelectedCategory(null);
  };

  // Render a single search result card
  const renderResultCard = (result, index) => {
    const isExpanded = expandedResult === `${messages.length}-${index}`;
    const colorClass = CATEGORY_COLORS[result.type] || 'bg-gray-50 text-gray-700 border-gray-200';

    return (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.03, 0.3) }}
        className="group"
      >
        <button
          onClick={() => toggleResultExpand(`${messages.length}-${index}`)}
          className="w-full text-left"
        >
          <div className={`relative overflow-hidden rounded-xl border transition-all duration-200 ${
            isExpanded
              ? 'bg-white border-blue-200 shadow-lg shadow-blue-100/50 ring-1 ring-blue-100'
              : 'bg-white/80 border-gray-100 hover:border-gray-200 hover:shadow-md'
          }`}>
            {/* Main row */}
            <div className="flex items-center gap-3 px-3.5 py-3">
              <span className="text-xl flex-shrink-0">{result.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-gray-800 text-sm truncate">{result.title}</h4>
                </div>
                {result.subtitle && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{result.subtitle}</p>
                )}
              </div>
              <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colorClass}`}>
                {result.label}
              </span>
              <FiChevronRight className={`flex-shrink-0 w-4 h-4 text-gray-300 transition-transform duration-200 ${
                isExpanded ? 'rotate-90 text-blue-500' : 'group-hover:text-gray-500'
              }`} />
            </div>

            {/* Expanded details */}
            <AnimatePresence>
              {isExpanded && result.details && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="px-3.5 pb-3 pt-0">
                    <div className="border-t border-gray-100 pt-2.5 space-y-1.5">
                      {result.details.filter(d => d.value && d.value !== '-').map((detail, di) => (
                        <div key={di} className="flex items-start gap-2 text-xs">
                          <span className="text-gray-400 font-medium min-w-[80px] flex-shrink-0">{detail.key}</span>
                          <span className="text-gray-700 font-medium">{detail.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </button>
      </motion.div>
    );
  };

  // Render message
  const renderMessage = (msg, msgIndex) => {
    if (msg.type === 'user') {
      return (
        <motion.div
          key={msgIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex justify-end mb-3"
        >
          <div className="max-w-[85%] bg-gradient-to-br from-blue-500 to-indigo-600 text-white px-4 py-2.5 rounded-2xl rounded-br-md shadow-md">
            <p className="text-sm font-medium">{msg.text}</p>
          </div>
        </motion.div>
      );
    }

    return (
      <motion.div
        key={msgIndex}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex justify-start mb-3"
      >
        <div className="max-w-[95%] w-full">
          {/* Bot avatar + text */}
          <div className="flex items-start gap-2.5 mb-2">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-bold">AI</span>
            </div>
            <div className={`flex-1 ${msg.isError ? 'bg-red-50 border border-red-100' : 'bg-gray-50 border border-gray-100'} px-3.5 py-2.5 rounded-2xl rounded-tl-md`}>
              <p className={`text-sm ${msg.isError ? 'text-red-600' : 'text-gray-700'}`}>
                {msg.text?.split('**').map((part, i) =>
                  i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                )}
              </p>
            </div>
          </div>

          {/* Results */}
          {msg.results && msg.results.length > 0 && (
            <div className="ml-9 space-y-2">
              {msg.results.map((result, index) => renderResultCard(result, index))}
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  // FAB button
  const fabButton = (
    <motion.button
      onClick={() => setIsOpen(!isOpen)}
      className={`relative flex items-center justify-center rounded-full shadow-xl transition-all duration-300 ${
        isOpen
          ? 'bg-gradient-to-br from-gray-700 to-gray-900 w-12 h-12'
          : 'bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 w-14 h-14 hover:scale-110 hover:shadow-2xl hover:shadow-purple-500/30'
      }`}
      whileTap={{ scale: 0.9 }}
      aria-label={isOpen ? 'Tutup chatbot' : 'Buka chatbot pencarian'}
    >
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="close"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <FiX className="w-5 h-5 text-white" />
          </motion.div>
        ) : (
          <motion.div
            key="open"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <FiMessageCircle className="w-6 h-6 text-white" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pulse animation when closed */}
      {!isOpen && (
        <>
          <span className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-20" />
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" />
        </>
      )}
    </motion.button>
  );

  // Chat popup
  const chatPopup = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className={`flex flex-col bg-white overflow-hidden ${
            isDesktop
              ? 'rounded-2xl shadow-2xl shadow-black/10 border border-gray-200/80 w-[420px] h-[600px]'
              : 'fixed inset-x-3 rounded-2xl shadow-2xl shadow-black/10 border border-gray-200/80'
          }`}
          style={!isDesktop ? { bottom: '80px', maxHeight: 'calc(100vh - 120px)' } : {}}
        >
          {/* Header */}
          <div className="relative flex-shrink-0 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 px-5 py-4">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDE4YzMuMzE0IDAgNi0yLjY4NiA2LTZzLTIuNjg2LTYtNi02LTYgMi42ODYtNiA2IDIuNjg2IDYgNiA2ek0zNiA0OGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNi02IDIuNjg2LTYgNiAyLjY4NiA2IDYgNnpNNiAxOGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNi02IDIuNjg2LTYgNiAyLjY4NiA2IDYgNnpNNiA0OGMzLjMxNCAwIDYtMi42ODYgNi02cy0yLjY4Ni02LTYtNi02IDIuNjg2LTYgNiAyLjY4NiA2IDYgNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <FiSearch className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-base tracking-tight">DPMD Smart Search</h3>
                  <p className="text-white/70 text-xs">Pencarian data cerdas &amp; fuzzy matching</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="text-white/60 hover:text-white text-xs font-medium px-2.5 py-1 rounded-lg hover:bg-white/10 transition-colors"
                  >
                    Hapus
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="lg:hidden w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors"
                >
                  <FiX className="w-4 h-4 text-white/80" />
                </button>
              </div>
            </div>
          </div>

          {/* Chat Body */}
          <div
            ref={chatContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-1 bg-gradient-to-b from-gray-50/50 to-white scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent"
          >
            {messages.length === 0 ? (
              // Welcome state
              <div className="flex flex-col items-center justify-center h-full py-4">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.1 }}
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mb-4 shadow-sm"
                >
                  <FiSearch className="w-7 h-7 text-purple-500" />
                </motion.div>
                <h4 className="text-gray-800 font-bold text-lg mb-1">Halo! 👋</h4>
                <p className="text-gray-500 text-sm text-center max-w-[280px] mb-5 leading-relaxed">
                  Cari data apapun dengan cepat. Ketik sebagian kata saja, misal <span className="font-semibold text-purple-600">"bumdes bina"</span> untuk menemukan semua BUMDes yang mengandung kata "bina"
                </p>

                {/* Stats */}
                {stats && (
                  <div className="grid grid-cols-3 gap-2 w-full max-w-[320px] mb-5">
                    {[
                      { label: 'Desa', value: stats.totalDesa, color: 'emerald' },
                      { label: 'Kelurahan', value: stats.totalKelurahan, color: 'teal' },
                      { label: 'Pegawai', value: stats.totalPegawai, color: 'orange' },
                      { label: 'BUMDes', value: stats.totalBumdes, color: 'amber' },
                      { label: 'Aparatur', value: stats.totalAparatur, color: 'purple' },
                      { label: 'Kegiatan', value: stats.totalKegiatan, color: 'cyan' },
                    ].map((s, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + i * 0.1 }}
                        className={`bg-${s.color}-50 border border-${s.color}-100 rounded-xl px-3 py-2.5 text-center`}
                      >
                        <p className={`text-${s.color}-700 font-bold text-lg`}>{s.value || 0}</p>
                        <p className={`text-${s.color}-500 text-[10px] font-semibold uppercase tracking-wide`}>{s.label}</p>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* Quick search chips */}
                <div className="w-full">
                  <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-2 px-1">Cari cepat</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_SEARCHES.map((qs, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 + i * 0.05 }}
                        onClick={() => handleQuickSearch(qs)}
                        className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50 transition-all shadow-sm hover:shadow"
                      >
                        {qs.label}
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Messages
              messages.map((msg, i) => renderMessage(msg, i))
            )}

            {/* Loading indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start mb-3"
              >
                <div className="flex items-start gap-2.5">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                    <span className="text-white text-xs font-bold">AI</span>
                  </div>
                  <div className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-md">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs text-gray-400">Mencari data...</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Category filter bar */}
          {categories.length > 0 && (
            <div className="flex-shrink-0 border-t border-gray-100 bg-gray-50/80">
              <div className="flex gap-1 px-3 py-2 overflow-x-auto scrollbar-none">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.id)}
                    className={`flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-purple-500 text-white border-purple-500 shadow-sm shadow-purple-200'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-purple-200 hover:text-purple-600'
                    }`}
                    title={cat.description}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="flex-shrink-0 border-t border-gray-200 bg-white px-3 py-3">
            {selectedCategory && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-[10px] text-gray-400 font-medium">Filter:</span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${CATEGORY_COLORS[selectedCategory] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                  {categories.find(c => c.id === selectedCategory)?.icon}
                  {categories.find(c => c.id === selectedCategory)?.label}
                  <button
                    onClick={() => setSelectedCategory(null)}
                    className="ml-0.5 hover:opacity-70"
                  >
                    <FiX className="w-3 h-3" />
                  </button>
                </span>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={selectedCategory
                    ? `Cari di ${categories.find(c => c.id === selectedCategory)?.label || 'kategori'}...`
                    : 'Ketik untuk mencari data...'
                  }
                  className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 transition-all"
                  disabled={isLoading}
                />
                {inputValue && (
                  <button
                    type="button"
                    onClick={() => setInputValue('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <FiX className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading || (!inputValue.trim() && !selectedCategory)}
                className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-200 ${
                  isLoading || (!inputValue.trim() && !selectedCategory)
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shadow-purple-200 hover:shadow-lg hover:scale-105 active:scale-95'
                }`}
              >
                {isLoading ? (
                  <FiLoader className="w-4 h-4 animate-spin" />
                ) : (
                  <FiSearch className="w-4 h-4" />
                )}
              </button>
            </form>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      {/* Desktop: Fixed bottom-right */}
      {isDesktop ? (
        <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-3">
          {chatPopup}
          {fabButton}
        </div>
      ) : (
        /* Mobile: Above bottom bar */
        <div className="fixed z-[55]" style={{ bottom: '76px', right: '16px' }}>
          {chatPopup}
          <div className="flex justify-end mt-2">
            {fabButton}
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
