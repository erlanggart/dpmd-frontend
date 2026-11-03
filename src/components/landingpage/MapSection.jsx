import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import {
  FiMapPin, FiSearch, FiX, FiMaximize2, FiMinimize2,
  FiNavigation, FiLayers, FiChevronRight, FiHome, FiGrid,
  FiImage, FiUsers, FiMinus, FiPlus, FiCompass, FiCrosshair
} from 'react-icons/fi';
import { KECAMATAN_DATA, BOGOR_BOUNDARY } from './dataWilayah';
import { bangunGeometri, useGeoWilayah } from './petaWilayah';
import { useSlideAktif } from './dek/slideAktif';
import JudulBagian from './JudulBagian';

// ======================= DATA =======================
// Data wilayah ada di dataWilayah.js (dipakai juga oleh relief 3D hero).

const SVG_WIDTH = 1120;
const SVG_HEIGHT = 740;
const MIN_SCALE = 1;
const MAX_SCALE = 7;

// ======================= GEOMETRY UTILS =======================

const SVG_BOUNDS = (() => {
  const lats = BOGOR_BOUNDARY.map(([lat]) => lat);
  const lngs = BOGOR_BOUNDARY.map(([, lng]) => lng);
  const latPad = (Math.max(...lats) - Math.min(...lats)) * 0.08;
  const lngPad = (Math.max(...lngs) - Math.min(...lngs)) * 0.08;
  return {
    minLat: Math.min(...lats) - latPad,
    maxLat: Math.max(...lats) + latPad,
    minLng: Math.min(...lngs) - lngPad,
    maxLng: Math.max(...lngs) + lngPad,
  };
})();

function projectLatLng([lat, lng]) {
  const x = ((lng - SVG_BOUNDS.minLng) / (SVG_BOUNDS.maxLng - SVG_BOUNDS.minLng)) * SVG_WIDTH;
  const y = ((SVG_BOUNDS.maxLat - lat) / (SVG_BOUNDS.maxLat - SVG_BOUNDS.minLat)) * SVG_HEIGHT;
  return [x, y];
}

// ======================= STYLING UTILS =======================

// Navy-slate: makin banyak desa/kelurahan, makin terang (serasi dengan tema landing)
function kepadatan(total) {
  return Math.min(1, Math.max(0, (total - 7) / (16 - 7)));
}

function getRegionColor(total) {
  return `hsl(${216 - kepadatan(total) * 8}, ${34 + kepadatan(total) * 14}%, ${30 + kepadatan(total) * 22}%)`;
}

function getRegionBorder() {
  return '#e3b23c';
}


const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

// ======================= SUB-COMPONENTS =======================


// ======================= MAIN COMPONENT =======================

const MapSection = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKec, setSelectedKec] = useState(null);
  const [hoveredKec, setHoveredKec] = useState(null);
  const [hoveredDesa, setHoveredDesa] = useState(null); // { kec, idx }
  // Batas asli kecamatan & desa (ASTA DESA), dimuat terpisah; kosong selama memuat.
  const geo = useGeoWilayah();
  const KEC_GEOM = useMemo(() => bangunGeometri(geo, projectLatLng), [geo]);
  // Kecamatan muncul menyebar dari Cibinong (pusat pemerintahan) saat bagian ini tampil.
  const slideAktif = useSlideAktif();
  const TUNDA_KEC = useMemo(() => {
    const pusat = KEC_GEOM[KECAMATAN_DATA.findIndex((k) => k.name === 'Cibinong')]?.center || [SVG_WIDTH / 2, SVG_HEIGHT / 2];
    return KEC_GEOM.map((g) => Math.round(Math.hypot(g.center[0] - pusat[0], g.center[1] - pusat[1]) * 1.4));
  }, [KEC_GEOM]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showPanel, setShowPanel] = useState(true);
  const [view, setView] = useState({ s: 1, x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });
  const tampilPeta = inView && slideAktif && Boolean(geo);
  const [selesaiMuncul, setSelesaiMuncul] = useState(false);
  useEffect(() => {
    if (!tampilPeta) { setSelesaiMuncul(false); return undefined; }
    const t = setTimeout(() => setSelesaiMuncul(true), 1900);
    return () => clearTimeout(t);
  }, [tampilPeta]);

  const svgRef = useRef(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const rafRef = useRef(null);
  const dragState = useRef(null);
  const draggedRef = useRef(false);

  const filteredKecamatan = useMemo(() => {
    const list = [...KECAMATAN_DATA].sort((a, b) => a.name.localeCompare(b.name));
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(k => k.name.toLowerCase().includes(q));
  }, [searchQuery]);

  const totalDesa = KECAMATAN_DATA.reduce((s, k) => s + k.desa, 0);
  const totalKelurahan = KECAMATAN_DATA.reduce((s, k) => s + k.kelurahan, 0);

  const selectedIndex = selectedKec
    ? KECAMATAN_DATA.findIndex(k => k.name === selectedKec.name)
    : -1;

  // ---------- view helpers ----------
  const clampView = useCallback((v) => {
    const s = clamp(v.s, MIN_SCALE, MAX_SCALE);
    return {
      s,
      x: clamp(v.x, -(s - 1) * SVG_WIDTH, 0),
      y: clamp(v.y, -(s - 1) * SVG_HEIGHT, 0),
    };
  }, []);

  const animateView = useCallback((target, dur = 650) => {
    cancelAnimationFrame(rafRef.current);
    const from = { ...viewRef.current };
    const to = target;
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      const t = Math.min(1, (now - start) / dur);
      const k = ease(t);
      setView({
        s: from.s + (to.s - from.s) * k,
        x: from.x + (to.x - from.x) * k,
        y: from.y + (to.y - from.y) * k,
      });
      if (t < 1) rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const clientToSvg = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const pt = svg.createSVGPoint();
    pt.x = clientX; pt.y = clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const p = pt.matrixTransform(ctm.inverse());
    return [p.x, p.y];
  }, []);

  const focusRegion = useCallback((index) => {
    const bbox = KEC_GEOM[index]?.bbox;
    if (!bbox) return;
    const bw = Math.max(1, bbox.maxX - bbox.minX);
    const bh = Math.max(1, bbox.maxY - bbox.minY);
    const s = clamp(Math.min(SVG_WIDTH / (bw * 1.7), SVG_HEIGHT / (bh * 1.7)), 1.6, MAX_SCALE);
    const cx = (bbox.minX + bbox.maxX) / 2;
    const cy = (bbox.minY + bbox.maxY) / 2;
    animateView(clampView({ s, x: SVG_WIDTH / 2 - cx * s, y: SVG_HEIGHT / 2 - cy * s }));
  }, [animateView, clampView, KEC_GEOM]);

  const handleKecSelect = useCallback((kec) => {
    const idx = KECAMATAN_DATA.findIndex(k => k.name === kec.name);
    setSelectedKec(kec);
    setHoveredKec(null);
    setHoveredDesa(null);
    setSearchQuery('');
    if (idx >= 0) focusRegion(idx);
  }, [focusRegion]);

  const handleReset = useCallback(() => {
    setSelectedKec(null);
    setHoveredKec(null);
    setHoveredDesa(null);
    setSearchQuery('');
    animateView({ s: 1, x: 0, y: 0 });
  }, [animateView]);

  const zoomBy = useCallback((factor) => {
    const cur = viewRef.current;
    const ns = clamp(cur.s * factor, MIN_SCALE, MAX_SCALE);
    const k = ns / cur.s;
    const cx = SVG_WIDTH / 2, cy = SVG_HEIGHT / 2;
    animateView(clampView({ s: ns, x: cx - (cx - cur.x) * k, y: cy - (cy - cur.y) * k }), 260);
  }, [animateView, clampView]);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const p = clientToSvg(e.clientX, e.clientY);
    if (!p) return;
    cancelAnimationFrame(rafRef.current);
    const cur = viewRef.current;
    const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
    const ns = clamp(cur.s * factor, MIN_SCALE, MAX_SCALE);
    const k = ns / cur.s;
    setView(clampView({ s: ns, x: p[0] - (p[0] - cur.x) * k, y: p[1] - (p[1] - cur.y) * k }));
  }, [clientToSvg, clampView]);

  // ---------- drag to pan ----------
  const handlePointerDown = useCallback((e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const p = clientToSvg(e.clientX, e.clientY);
    if (!p) return;
    cancelAnimationFrame(rafRef.current);
    dragState.current = { startX: p[0], startY: p[1], view: { ...viewRef.current } };
    draggedRef.current = false;
    setIsDragging(true);
    // Pointer baru ditangkap saat benar-benar digeser (lihat handlePointerMove): menangkap
    // sejak ditekan membuat klik jatuh ke latar SVG, bukan ke kecamatan yang diklik.
  }, [clientToSvg]);

  const handlePointerMove = useCallback((e) => {
    if (!dragState.current) return;
    const p = clientToSvg(e.clientX, e.clientY);
    if (!p) return;
    const dx = p[0] - dragState.current.startX;
    const dy = p[1] - dragState.current.startY;
    if (!draggedRef.current && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
      draggedRef.current = true;
      e.currentTarget.setPointerCapture?.(e.pointerId);
    }
    setView(clampView({
      s: dragState.current.view.s,
      x: dragState.current.view.x + dx,
      y: dragState.current.view.y + dy,
    }));
  }, [clientToSvg, clampView]);

  const handlePointerUp = useCallback(() => {
    dragState.current = null;
    setIsDragging(false);
    // let the click handler read draggedRef, then clear on next tick
    setTimeout(() => { draggedRef.current = false; }, 0);
  }, []);

  // henti: klik pada kecamatan tidak diteruskan ke latar (yang mereset pilihan)
  const guardClick = useCallback((fn, henti = false) => (e) => {
    if (draggedRef.current || henti) e.stopPropagation();
    if (draggedRef.current) return;
    fn();
  }, []);

  const transform = `translate(${view.x.toFixed(2)} ${view.y.toFixed(2)}) scale(${view.s.toFixed(4)})`;
  const strokeK = 1 / view.s; // keep strokes crisp regardless of zoom

  return (
    <section ref={ref} className="relative py-0 overflow-hidden">
      <div className="relative bg-[rgb(var(--color-primary))]">
        {/* Background effects */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(198,167,61,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59,130,246,0.1) 0%, transparent 50%)',
        }} />
        <div className="relative z-10 max-w-[1600px] mx-auto">
          <div className="px-5 pb-12 pt-20 md:pb-5 md:pt-24 lg:px-8">
            <JudulBagian judul="Peta 40 kecamatan" keterangan={`Pilih kecamatan untuk melihat ${totalDesa} desa dan ${totalKelurahan} kelurahan di dalamnya, lengkap dengan data wilayahnya.`} />
          </div>

          {/* =================== MAP + PANEL =================== */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.2 }}
            className={`relative mx-4 md:mx-8 mb-0 transition-all duration-500 ${
              isExpanded ? 'fixed inset-0 z-[999] m-0 rounded-none' : 'rounded-t-2xl'
            } overflow-hidden`}
            style={{ border: isExpanded ? 'none' : '1px solid rgba(255,255,255,0.08)' }}
          >
            <div data-dek-abaikan className="flex h-[620px] md:h-[max(22rem,calc(100dvh-18rem))]" style={isExpanded ? { height: '100vh' } : {}}>

              {/* ========= SIDE PANEL ========= */}
              <AnimatePresence mode="wait">
                {showPanel && (
                  <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 340, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="relative hidden md:flex flex-col bg-[#0d1b33]/95 backdrop-blur-xl border-r border-white/5 overflow-hidden shrink-0"
                    style={{ width: 340 }}
                  >
                    {/* Search */}
                    <div className="p-4 border-b border-white/5">
                      <div className="relative">
                        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Cari kecamatan..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-9 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[rgb(var(--color-secondary))]/50 focus:border-[rgb(var(--color-secondary))]/50 transition-all"
                        />
                        {searchQuery && (
                          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                            <FiX className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-3 text-xs text-white/30">
                        <span>{filteredKecamatan.length} kecamatan</span>
                        <span>{totalDesa + totalKelurahan} desa/kelurahan</span>
                      </div>
                    </div>

                    {/* Selected Detail with Photo */}
                    <AnimatePresence mode="wait">
                      {selectedKec && (
                        <motion.div
                          key={selectedKec.name}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="border-b border-white/5 overflow-hidden"
                        >
                          <div className="p-4">
                            {/* Kantor Photo */}

                            {/* Info */}
                            <div className="mt-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="font-bold text-white text-lg">Kec. {selectedKec.name}</h4>
                                <button onClick={handleReset} className="text-white/30 hover:text-white/60 transition-colors p-1.5 rounded-lg hover:bg-white/5">
                                  <FiX className="w-4 h-4" />
                                </button>
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <div className="bg-white/[0.04] rounded-xl p-3 text-center border border-white/5">
                                  <FiHome className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                                  <p className="text-xl font-bold text-white">{selectedKec.desa}</p>
                                  <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Desa</p>
                                </div>
                                <div className="bg-white/[0.04] rounded-xl p-3 text-center border border-white/5">
                                  <FiGrid className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                                  <p className="text-xl font-bold text-white">{selectedKec.kelurahan}</p>
                                  <p className="text-[10px] text-white/40 uppercase tracking-wider mt-0.5">Kelurahan</p>
                                </div>
                                <div className="bg-[rgb(var(--color-secondary))]/10 rounded-xl p-3 text-center border border-[rgb(var(--color-secondary))]/20">
                                  <FiUsers className="w-4 h-4 text-[rgb(var(--color-secondary))] mx-auto mb-1" />
                                  <p className="text-xl font-bold text-[rgb(var(--color-secondary))]">{selectedKec.desa + selectedKec.kelurahan}</p>
                                  <p className="text-[10px] text-[rgb(var(--color-secondary))]/60 uppercase tracking-wider mt-0.5">Total</p>
                                </div>
                              </div>
                            </div>

                            {/* Desa/Kelurahan chips (linked to map cells) */}
                            {KEC_GEOM[selectedIndex]?.desa?.length > 0 && (
                              <div className="mt-4">
                                <p className="text-[10px] text-white/30 uppercase tracking-widest font-semibold mb-2">
                                  Batas wilayah ({KEC_GEOM[selectedIndex].desa.length})
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                  {KEC_GEOM[selectedIndex].desa.map((d, idx) => {
                                    const isKel = d.jenis === 'kelurahan';
                                    const label = isKel ? `Kel. ${d.nama}` : d.nama;
                                    const isHov = hoveredDesa?.kec === selectedKec.name && hoveredDesa?.idx === idx;
                                    return (
                                      <button
                                        key={idx}
                                        onMouseEnter={() => setHoveredDesa({ kec: selectedKec.name, idx })}
                                        onMouseLeave={() => setHoveredDesa(null)}
                                        className={`text-[10px] px-2 py-1 rounded-lg border transition-all ${
                                          isHov
                                            ? 'bg-[rgb(var(--color-secondary))]/25 border-[rgb(var(--color-secondary))]/50 text-[rgb(var(--color-secondary))]'
                                            : isKel
                                              ? 'bg-blue-400/10 border-blue-400/20 text-blue-200/70 hover:bg-blue-400/20'
                                              : 'bg-white/[0.04] border-white/10 text-white/50 hover:bg-white/[0.08] hover:text-white/80'
                                        }`}
                                      >
                                        {label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            <p className="text-[11px] text-white/25 mt-3 leading-relaxed">
                              Kecamatan {selectedKec.name} merupakan salah satu dari 40 kecamatan di
                              wilayah Kabupaten Bogor, terdiri dari {selectedKec.desa} desa
                              {selectedKec.kelurahan > 0 ? ` dan ${selectedKec.kelurahan} kelurahan` : ''}.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Kecamatan List */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar dark-scrollbar">
                      {filteredKecamatan.map((kec) => {
                        const total = kec.desa + kec.kelurahan;
                        const isActive = selectedKec?.name === kec.name;
                        const isHov = hoveredKec?.name === kec.name;
                        const color = getRegionColor(total, true);

                        return (
                          <button
                            key={kec.name}
                            onClick={() => handleKecSelect(kec)}
                            onMouseEnter={() => setHoveredKec(kec)}
                            onMouseLeave={() => setHoveredKec(null)}
                            className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-white/[0.03] transition-all duration-200 group ${
                              isActive
                                ? 'bg-[rgb(var(--color-secondary))]/10 border-l-2 border-l-[rgb(var(--color-secondary))]'
                                : isHov ? 'bg-white/[0.04]' : 'hover:bg-white/[0.03]'
                            }`}
                          >
                            <div
                              className="w-4 h-4 rounded shrink-0"
                              style={{
                                backgroundColor: color,
                                opacity: isActive ? 1 : 0.7,
                                boxShadow: isActive ? `0 0 10px ${color}` : 'none',
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium truncate transition-colors ${
                                isActive ? 'text-[rgb(var(--color-secondary))]' : 'text-white/80 group-hover:text-white'
                              }`}>{kec.name}</p>
                              <p className="text-[11px] text-white/25 mt-0.5">
                                {kec.desa > 0 && `${kec.desa} desa`}
                                {kec.desa > 0 && kec.kelurahan > 0 && ' / '}
                                {kec.kelurahan > 0 && `${kec.kelurahan} kel`}
                              </p>
                            </div>
                            <div className={`shrink-0 text-xs font-bold px-2.5 py-1 rounded-lg ${
                              isActive
                                ? 'bg-[rgb(var(--color-secondary))]/20 text-[rgb(var(--color-secondary))]'
                                : 'bg-white/5 text-white/40 group-hover:text-white/60'
                            }`}>{total}</div>
                            <FiChevronRight className={`w-3.5 h-3.5 shrink-0 transition-all ${
                              isActive
                                ? 'text-[rgb(var(--color-secondary))] opacity-100'
                                : 'text-white/10 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                            }`} />
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ========= MAP AREA ========= */}
              <div className="flex-1 relative">
                {/* Controls */}
                <div className="absolute top-4 left-4 right-4 z-[1000] flex items-start justify-between pointer-events-none">
                  {/* Mobile search */}
                  <div className="md:hidden relative pointer-events-auto max-w-[200px]">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-3.5 h-3.5" />
                    <input
                      type="text"
                      placeholder="Cari..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-black/50 backdrop-blur-xl border border-white/10 rounded-xl text-xs text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-[rgb(var(--color-secondary))]/50"
                    />
                    {searchQuery && filteredKecamatan.length > 0 && (
                      <div className="absolute top-full mt-1 w-56 bg-[#0d1b33]/98 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl max-h-40 overflow-y-auto">
                        {filteredKecamatan.slice(0, 8).map((kec) => (
                          <button
                            key={kec.name}
                            onClick={() => handleKecSelect(kec)}
                            className="w-full text-left px-3 py-2 text-xs text-white/70 hover:bg-white/5 hover:text-white transition-colors"
                          >
                            {kec.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right controls */}
                  <div className="flex gap-2 ml-auto pointer-events-auto">
                    <button
                      onClick={() => setShowPanel(!showPanel)}
                      className="hidden md:flex p-2.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-black/60 transition-all"
                      title={showPanel ? 'Tutup panel' : 'Buka panel'}
                    >
                      <FiLayers className="w-4 h-4" />
                    </button>

                    <div className="flex items-center bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
                      <button
                        onClick={() => zoomBy(1 / 1.35)}
                        className="p-2.5 text-white/60 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30"
                        disabled={view.s <= MIN_SCALE + 0.001}
                        title="Perkecil"
                      >
                        <FiMinus className="w-4 h-4" />
                      </button>
                      <span className="min-w-[54px] px-2 text-center text-[11px] font-bold text-white/70 tabular-nums">
                        {Math.round(view.s * 100)}%
                      </span>
                      <button
                        onClick={() => zoomBy(1.35)}
                        className="p-2.5 text-white/60 hover:text-white hover:bg-white/5 transition-all disabled:opacity-30"
                        disabled={view.s >= MAX_SCALE - 0.001}
                        title="Perbesar"
                      >
                        <FiPlus className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      onClick={handleReset}
                      className="p-2.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-black/60 transition-all"
                      title="Reset peta"
                    >
                      <FiNavigation className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="p-2.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-black/60 transition-all"
                    >
                      {isExpanded ? <FiMinimize2 className="w-4 h-4" /> : <FiMaximize2 className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Mobile selected */}
                {selectedKec && (
                  <div className="md:hidden absolute bottom-16 left-4 right-4 z-[1000]">
                    <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-white text-sm">Kec. {selectedKec.name}</h4>
                        <p className="text-[11px] text-white/40">{selectedKec.desa} desa / {selectedKec.kelurahan} kel</p>
                      </div>
                      <button onClick={handleReset} className="text-white/30 hover:text-white p-1"><FiX className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}

                {/* Compass */}
                <div className="absolute top-20 left-4 z-[1000] hidden md:block pointer-events-none">
                  <div className="w-11 h-11 rounded-full bg-black/40 backdrop-blur-xl border border-white/10 flex items-center justify-center relative">
                    <FiCompass className="w-5 h-5 text-white/50" />
                    <span className="absolute top-1 text-[8px] font-bold text-[rgb(var(--color-secondary))]">N</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="absolute bottom-4 right-4 z-[1000]">
                  <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-3">
                    <p className="text-[9px] text-white/30 uppercase tracking-widest font-semibold mb-2.5">Wilayah Kecamatan</p>
                    <div className="space-y-1.5">
                      {[
                        { total: 16, label: '14+ desa/kel' },
                        { total: 11, label: '10-13 desa/kel' },
                        { total: 7, label: '< 10 desa/kel' },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                          <span className="w-4 h-3 rounded-sm shrink-0" style={{
                            backgroundColor: getRegionColor(item.total, true), opacity: 0.7,
                          }} />
                          <span className="text-[10px] text-white/50">{item.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-white/5 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-white border-2 border-white/60 shrink-0" />
                        <span className="text-[10px] text-white/40">Kantor Kecamatan</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-3 shrink-0" style={{
                          backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 3px)',
                        }} />
                        <span className="text-[10px] text-white/40">Batas desa/kelurahan</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Hint */}
                {!selectedKec && (
                  <div className="absolute bottom-4 left-4 z-[1000] hidden md:flex items-center gap-2 bg-black/30 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-2 pointer-events-none">
                    <FiCrosshair className="w-3.5 h-3.5 text-white/40" />
                    <span className="text-[10px] text-white/45">Klik wilayah · seret untuk geser · scroll untuk zoom</span>
                  </div>
                )}

                {/* ========= INTERACTIVE SVG MAP ========= */}
                <div className="w-full h-full overflow-hidden bg-[#081629]">
                  {inView && (
                    <svg
                      ref={svgRef}
                      viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                      preserveAspectRatio="xMidYMid meet"
                      className={`block w-full h-full select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                      role="img"
                      aria-label="Peta interaktif Kabupaten Bogor dengan batas kecamatan dan desa"
                      onWheel={handleWheel}
                      onPointerDown={handlePointerDown}
                      onPointerMove={handlePointerMove}
                      onPointerUp={handlePointerUp}
                      onPointerLeave={handlePointerUp}
                      onClick={guardClick(() => { if (selectedKec) handleReset(); })}
                    >
                      <defs>
                        <linearGradient id="bogorMapBg" x1="0" x2="1" y1="0" y2="1">
                          <stop offset="0%" stopColor="#081629" />
                          <stop offset="60%" stopColor="#102847" />
                          <stop offset="100%" stopColor="#07111f" />
                        </linearGradient>
                        <radialGradient id="mapVignette" cx="50%" cy="45%" r="75%">
                          <stop offset="60%" stopColor="#000000" stopOpacity="0" />
                          <stop offset="100%" stopColor="#000000" stopOpacity="0.45" />
                        </radialGradient>
                        <filter id="mapGlow" x="-20%" y="-20%" width="140%" height="140%">
                          <feDropShadow dx="0" dy="14" stdDeviation="18" floodColor="#000000" floodOpacity="0.35" />
                        </filter>
                        <filter id="regionLift" x="-40%" y="-40%" width="180%" height="180%">
                          <feDropShadow dx="0" dy="0" stdDeviation="7" floodColor="#d6b44a" floodOpacity="0.55" />
                        </filter>
                      </defs>

                      <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#bogorMapBg)" />

                      {/* Everything below pans/zooms together */}
                      <g transform={transform}>
                        {/* graticule */}
                        <g opacity="0.14">
                          {Array.from({ length: 18 }).map((_, i) => (
                            <path key={`grid-h-${i}`} d={`M0 ${70 + i * 34} H${SVG_WIDTH}`} stroke="#ffffff" strokeWidth={0.7 * strokeK} strokeDasharray={`${2 * strokeK} ${12 * strokeK}`} />
                          ))}
                          {Array.from({ length: 22 }).map((_, i) => (
                            <path key={`grid-v-${i}`} d={`M${60 + i * 48} 0 V${SVG_HEIGHT}`} stroke="#ffffff" strokeWidth={0.7 * strokeK} strokeDasharray={`${2 * strokeK} ${12 * strokeK}`} />
                          ))}
                        </g>

                        <g filter="url(#mapGlow)">
                          {/* garis luar kabupaten dari gabungan poligon kecamatan: garis tebal di
                              bawah, lalu isi menutup separuh garis di sisi dalam, jadi yang
                              tersisa hanya tepi luar */}
                          <g pointerEvents="none">
                            {KEC_GEOM.map((g, i) => g.path && (
                              <path key={`luar-${i}`} d={g.path} fill="none" stroke="#d6b44a" strokeWidth="8" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                            ))}
                            {KEC_GEOM.map((g, i) => g.path && (
                              <path key={`isi-${i}`} d={g.path} fillRule="evenodd" fill="#0b1a2e" stroke="#0b1a2e" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                            ))}
                          </g>

                          {KECAMATAN_DATA.map((kec, i) => {
                            const geom = KEC_GEOM[i];
                            if (!geom.path) return null;

                            const total = kec.desa + kec.kelurahan;
                            const isActive = selectedKec?.name === kec.name;
                            const isHover = hoveredKec?.name === kec.name;
                            const isDim = selectedKec && !isActive;
                            const fillColor = isActive ? '#d6b44a' : getRegionColor(total, true);
                            const borderColor = isActive
                              ? '#fde68a'
                              : isHover ? getRegionBorder(total, true) : 'rgba(255,255,255,0.46)';
                            const [cx, cy] = geom.center;

                            return (
                              <g
                                key={kec.name}
                                onClick={guardClick(() => handleKecSelect(kec), true)}
                                onMouseEnter={() => !isDragging && setHoveredKec(kec)}
                                onMouseLeave={() => setHoveredKec(null)}
                                className="cursor-pointer"
                                style={{
                                  transition: 'opacity 0.5s ease, transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)',
                                  transitionDelay: tampilPeta && !selesaiMuncul ? `${TUNDA_KEC[i]}ms` : '0ms',
                                  transformBox: 'fill-box',
                                  transformOrigin: 'center',
                                  transform: tampilPeta ? 'none' : 'scale(0.55)',
                                }}
                                opacity={!tampilPeta ? 0 : isDim ? 0.4 : 1}
                                filter={isActive ? 'url(#regionLift)' : undefined}
                              >
                                <path
                                  d={geom.path}
                                  fillRule="evenodd"
                                  fill={fillColor}
                                  fillOpacity={isActive ? 0.68 : isHover ? 0.58 : 0.4}
                                  stroke={borderColor}
                                  strokeWidth={isActive ? 3.2 : isHover ? 2.4 : 1.4}
                                  strokeLinejoin="round"
                                  vectorEffect="non-scaling-stroke"
                                  style={{ transition: 'fill-opacity 0.3s' }}
                                />

                                {/* desa / kelurahan cells */}
                                {geom.desa.map((desa, di) => {
                                  const isKel = desa.jenis === 'kelurahan';
                                  const desaHover = hoveredDesa?.kec === kec.name && hoveredDesa?.idx === di;
                                  return (
                                    <path
                                      key={di}
                                      d={desa.path}
                                      fillRule="evenodd"
                                      fill={desaHover ? '#fbbf24' : isActive ? (isKel ? 'rgba(96,165,250,0.30)' : 'rgba(255,255,255,0.06)') : 'none'}
                                      fillOpacity={desaHover ? 0.55 : 1}
                                      stroke={desaHover ? '#fde68a' : isActive ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)'}
                                      strokeWidth={desaHover ? 1.6 : 0.72}
                                      strokeLinejoin="round"
                                      vectorEffect="non-scaling-stroke"
                                      onMouseEnter={() => isActive && setHoveredDesa({ kec: kec.name, idx: di })}
                                      onMouseLeave={() => setHoveredDesa(null)}
                                      style={{ pointerEvents: isActive ? 'auto' : 'none', transition: 'fill 0.2s' }}
                                    />
                                  );
                                })}

                                {/* desa hover label */}
                                {isActive && hoveredDesa?.kec === kec.name && geom.desa[hoveredDesa.idx] && (() => {
                                  const d = geom.desa[hoveredDesa.idx];
                                  const [dx, dy] = d.centroid;
                                  const label = `${d.jenis === 'kelurahan' ? 'Kel.' : 'Desa'} ${d.nama}`;
                                  return (
                                    <g pointerEvents="none" transform={`translate(${dx} ${dy}) scale(${strokeK})`}>
                                      <rect x={-label.length * 3.4 - 6} y={-9} width={label.length * 6.8 + 12} height="18" rx="5" fill="rgba(5,12,24,0.9)" stroke="rgba(214,180,74,0.5)" />
                                      <text x="0" y="3.5" textAnchor="middle" fill="#fde68a" fontSize="10" fontWeight="700">{label}</text>
                                    </g>
                                  );
                                })()}

                                {/* office marker */}
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r={isActive ? 6 : isHover ? 5.5 : 4.2}
                                  fill={isActive ? '#fbbf24' : '#ffffff'}
                                  stroke={isActive ? '#fff7ed' : '#0f172a'}
                                  strokeWidth="2"
                                  vectorEffect="non-scaling-stroke"
                                />

                                {/* kecamatan hover tooltip */}
                                {(isHover && !isActive) && (
                                  <g pointerEvents="none" transform={`translate(${cx} ${cy}) scale(${strokeK})`}>
                                    <rect x={10} y={-22} width={Math.max(88, kec.name.length * 7.2 + 28)} height="36" rx="8" fill="rgba(5,12,24,0.9)" stroke="rgba(255,255,255,0.18)" />
                                    <text x={24} y={-7} fill="#ffffff" fontSize="11" fontWeight="700">{kec.name}</text>
                                    <text x={24} y={7} fill="rgba(255,255,255,0.56)" fontSize="9">{total} desa/kel</text>
                                  </g>
                                )}
                                <title>{`Kecamatan ${kec.name} - ${total} desa/kelurahan`}</title>
                              </g>
                            );
                          })}
                        </g>
                      </g>

                      <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#mapVignette)" pointerEvents="none" />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mx-4 md:mx-8"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 border-t border-white/5">
              {[
                { icon: FiGrid, value: '40', label: 'Kecamatan', color: 'text-[rgb(var(--color-secondary))]' },
                { icon: FiHome, value: totalDesa.toString(), label: 'Desa', color: 'text-emerald-400' },
                { icon: FiMapPin, value: totalKelurahan.toString(), label: 'Kelurahan', color: 'text-blue-400' },
                { icon: FiNavigation, value: '2.966,8', label: 'km² Luas Wilayah', color: 'text-[rgb(var(--color-secondary))]' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.5 + i * 0.1 }}
                  className="flex items-center gap-3 p-5 md:p-6 border-r border-white/5 last:border-r-0 group hover:bg-white/[0.02] transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
                    <stat.icon className={`w-4.5 h-4.5 ${stat.color}`} />
                  </div>
                  <div>
                    <p className={`text-xl md:text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-[11px] text-white/30 uppercase tracking-wider">{stat.label}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default MapSection;
