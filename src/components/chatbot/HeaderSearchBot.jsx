import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiX, FiChevronRight, FiLoader } from 'react-icons/fi';
import api from '../../api';

const CATEGORY_COLORS = {
  desa: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  kecamatan: 'bg-blue-50 text-blue-700 border-blue-200',
  pegawai: 'bg-orange-50 text-orange-700 border-orange-200',
  aparatur_desa: 'bg-purple-50 text-purple-700 border-purple-200',
  kelembagaan: 'bg-teal-50 text-teal-700 border-teal-200',
  bumdes: 'bg-amber-50 text-amber-700 border-amber-200',
  produk_hukum: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  berita: 'bg-pink-50 text-pink-700 border-pink-200',
  kegiatan: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  perjadin: 'bg-violet-50 text-violet-700 border-violet-200',
  bankeu: 'bg-lime-50 text-lime-700 border-lime-200',
  surat_masuk: 'bg-rose-50 text-rose-700 border-rose-200',
  disposisi: 'bg-red-50 text-red-700 border-red-200',
  profil_desa: 'bg-green-50 text-green-700 border-green-200',
  user: 'bg-slate-50 text-slate-700 border-slate-200',
  absensi: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  informasi: 'bg-sky-50 text-sky-700 border-sky-200',
  notifikasi: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
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

const HeaderSearchBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [results, setResults] = useState(null);
  const [expandedResult, setExpandedResult] = useState(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const containerRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  // Load categories on first open
  useEffect(() => {
    if (isOpen && categories.length === 0) {
      api.get('/chatbot/categories')
        .then(res => { if (res.data.success) setCategories(res.data.data); })
        .catch(() => {});
    }
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const performSearch = useCallback(async (query, category = null) => {
    if (!query && !category) return;
    setIsLoading(true);
    try {
      const response = await api.post('/chatbot/search', {
        query: query || ' ',
        category: category || undefined,
      });
      if (response.data.success) {
        setResults(response.data.data);
      }
    } catch {
      setResults({ results: [], totalResults: 0 });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputValue.trim() && !selectedCategory) return;
    performSearch(inputValue.trim(), selectedCategory);
  };

  const handleQuickSearch = (qs) => {
    if (qs.query) {
      setInputValue(qs.query);
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

  const handleFocus = () => {
    setIsOpen(true);
  };

  const clearSearch = () => {
    setInputValue('');
    setResults(null);
    setSelectedCategory(null);
    setExpandedResult(null);
    inputRef.current?.focus();
  };

  const renderResultCard = (result, index) => {
    const isExpanded = expandedResult === index;
    const colorClass = CATEGORY_COLORS[result.type] || 'bg-gray-50 text-gray-700 border-gray-200';

    return (
      <button
        key={index}
        onClick={() => setExpandedResult(isExpanded ? null : index)}
        className="w-full text-left"
      >
        <div className={`relative overflow-hidden rounded-xl border transition-all duration-200 ${
          isExpanded
            ? 'bg-white border-blue-200 shadow-md ring-1 ring-blue-100'
            : 'bg-white border-gray-100 hover:border-gray-200 hover:shadow-sm'
        }`}>
          <div className="flex items-center gap-2.5 px-3 py-2.5">
            <span className="text-lg flex-shrink-0">{result.icon}</span>
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-800 text-sm truncate">{result.title}</h4>
              {result.subtitle && (
                <p className="text-xs text-gray-500 truncate mt-0.5">{result.subtitle}</p>
              )}
            </div>
            <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${colorClass}`}>
              {result.label}
            </span>
            <FiChevronRight className={`flex-shrink-0 w-3.5 h-3.5 text-gray-300 transition-transform duration-200 ${
              isExpanded ? 'rotate-90 text-blue-500' : ''
            }`} />
          </div>
          <AnimatePresence>
            {isExpanded && result.details && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <div className="px-3 pb-2.5 pt-0">
                  <div className="border-t border-gray-100 pt-2 space-y-1">
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
    );
  };

  return (
    <div className="relative" ref={containerRef}>
      {/* Search Input Field */}
      <div className="relative">
        <div className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200/70 focus-within:bg-white rounded-xl px-3 py-2 transition-all duration-200 border border-slate-200 focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-100 w-72 xl:w-96">
          <FiSearch className="w-4 h-4 text-slate-400 flex-shrink-0" />
          {selectedCategory && (
            <span className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${CATEGORY_COLORS[selectedCategory] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
              {categories.find(c => c.id === selectedCategory)?.icon}
              {categories.find(c => c.id === selectedCategory)?.label}
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedCategory(null); }}
                className="ml-0.5 hover:opacity-70"
              >
                <FiX className="w-3 h-3" />
              </button>
            </span>
          )}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onFocus={handleFocus}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(e); }}
            placeholder="Cari data... (Ctrl+K)"
            className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
          />
          {(inputValue || results) && (
            <button onClick={clearSearch} className="text-slate-400 hover:text-slate-600">
              <FiX className="w-4 h-4" />
            </button>
          )}
          {isLoading && <FiLoader className="w-4 h-4 text-slate-400 animate-spin" />}
        </div>
      </div>

      {/* Dropdown Results */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl shadow-black/15 border border-gray-200 overflow-hidden z-50 w-[480px]"
          >
            {/* Category filter bar */}
            {categories.length > 0 && (
              <div className="border-b border-gray-100 bg-gray-50/80">
                <div className="flex gap-1 px-3 py-2 overflow-x-auto scrollbar-none">
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleCategoryClick(cat.id)}
                      className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                        selectedCategory === cat.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                          : 'bg-white text-gray-500 border-gray-200 hover:border-blue-200 hover:text-blue-600'
                      }`}
                    >
                      <span>{cat.icon}</span>
                      <span>{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Results or Welcome */}
            <div className="max-h-[420px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
              {results ? (
                <div className="p-3">
                  {results.totalResults > 0 ? (
                    <>
                      <p className="text-xs text-gray-500 mb-2 px-1">
                        Ditemukan <strong className="text-gray-700">{results.totalResults}</strong> hasil
                        {results.totalResults > 50 && ' (menampilkan 50 teratas)'}
                        {results.summary && <span className="ml-1">· {results.summary}</span>}
                      </p>
                      <div className="space-y-1.5">
                        {results.results.map((result, index) => renderResultCard(result, index))}
                      </div>
                    </>
                  ) : (
                    <div className="py-8 text-center">
                      <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-100">
                        <FiSearch className="w-5 h-5 text-gray-400" />
                      </div>
                      <p className="text-sm text-gray-500 font-medium">Tidak ada hasil</p>
                      <p className="text-xs text-gray-400 mt-1">Coba kata kunci yang lebih pendek</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Cari cepat</p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_SEARCHES.map((qs, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickSearch(qs)}
                        className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all"
                      >
                        {qs.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 text-center">
                    <p className="text-xs text-gray-400">Ketik untuk mencari data apapun <span className="text-gray-300">·</span> Fuzzy search didukung</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 bg-gray-50 px-4 py-2 flex items-center justify-between">
              <span className="text-[10px] text-gray-400">DPMD Smart Search</span>
              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                <span className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-500 font-mono">Enter</span>
                <span>cari</span>
                <span className="px-1.5 py-0.5 bg-gray-200 rounded text-gray-500 font-mono">Esc</span>
                <span>tutup</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HeaderSearchBot;
