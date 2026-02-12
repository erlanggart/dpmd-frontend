import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { MapContainer, TileLayer, Polygon, CircleMarker, Tooltip, useMap } from 'react-leaflet';
import { Delaunay } from 'd3-delaunay';
import {
  FiMapPin, FiSearch, FiX, FiMaximize2, FiMinimize2,
  FiNavigation, FiLayers, FiChevronRight, FiHome, FiGrid,
  FiImage, FiUsers
} from 'react-icons/fi';
import 'leaflet/dist/leaflet.css';

// ======================= DATA =======================

const KECAMATAN_DATA = [
  { name: 'Nanggung', lat: -6.6612, lng: 106.5371, desa: 11, kelurahan: 0 },
  { name: 'Leuwiliang', lat: -6.6291, lng: 106.6143, desa: 11, kelurahan: 0 },
  { name: 'Leuwisadeng', lat: -6.5719, lng: 106.5835, desa: 8, kelurahan: 0 },
  { name: 'Pamijahan', lat: -6.6894, lng: 106.6568, desa: 15, kelurahan: 0 },
  { name: 'Cibungbulang', lat: -6.5777, lng: 106.6631, desa: 15, kelurahan: 0 },
  { name: 'Ciampea', lat: -6.5549, lng: 106.6972, desa: 13, kelurahan: 0 },
  { name: 'Tenjolaya', lat: -6.6489, lng: 106.7083, desa: 7, kelurahan: 0 },
  { name: 'Dramaga', lat: -6.5755, lng: 106.7381, desa: 10, kelurahan: 0 },
  { name: 'Ciomas', lat: -6.6026, lng: 106.7653, desa: 10, kelurahan: 1 },
  { name: 'Tamansari', lat: -6.6451, lng: 106.7656, desa: 8, kelurahan: 0 },
  { name: 'Cijeruk', lat: -6.6830, lng: 106.7861, desa: 9, kelurahan: 0 },
  { name: 'Cigombong', lat: -6.7468, lng: 106.7965, desa: 9, kelurahan: 0 },
  { name: 'Caringin', lat: -6.7346, lng: 106.8649, desa: 12, kelurahan: 0 },
  { name: 'Ciawi', lat: -6.6977, lng: 106.8845, desa: 13, kelurahan: 0 },
  { name: 'Cisarua', lat: -6.6958, lng: 106.9510, desa: 9, kelurahan: 1 },
  { name: 'Megamendung', lat: -6.6759, lng: 106.8937, desa: 12, kelurahan: 0 },
  { name: 'Sukaraja', lat: -6.5721, lng: 106.8403, desa: 13, kelurahan: 0 },
  { name: 'Babakan Madang', lat: -6.5794, lng: 106.8926, desa: 9, kelurahan: 0 },
  { name: 'Sukamakmur', lat: -6.5831, lng: 107.0222, desa: 10, kelurahan: 0 },
  { name: 'Cariu', lat: -6.5237, lng: 107.1360, desa: 10, kelurahan: 0 },
  { name: 'Tanjungsari', lat: -6.6118, lng: 107.1382, desa: 10, kelurahan: 0 },
  { name: 'Jonggol', lat: -6.5031, lng: 107.0452, desa: 14, kelurahan: 0 },
  { name: 'Cileungsi', lat: -6.4070, lng: 107.0031, desa: 12, kelurahan: 0 },
  { name: 'Klapanunggal', lat: -6.4765, lng: 106.9612, desa: 9, kelurahan: 0 },
  { name: 'Gunung Putri', lat: -6.3925, lng: 106.9347, desa: 10, kelurahan: 0 },
  { name: 'Citeureup', lat: -6.5196, lng: 106.8928, desa: 12, kelurahan: 2 },
  { name: 'Cibinong', lat: -6.4806, lng: 106.8338, desa: 0, kelurahan: 13 },
  { name: 'Bojonggede', lat: -6.4840, lng: 106.7997, desa: 8, kelurahan: 1 },
  { name: 'Kemang', lat: -6.5031, lng: 106.7351, desa: 8, kelurahan: 1 },
  { name: 'Rancabungur', lat: -6.5199, lng: 106.7119, desa: 7, kelurahan: 0 },
  { name: 'Parung', lat: -6.4331, lng: 106.7099, desa: 9, kelurahan: 0 },
  { name: 'Ciseeng', lat: -6.4630, lng: 106.6824, desa: 10, kelurahan: 0 },
  { name: 'Gunung Sindur', lat: -6.3881, lng: 106.6919, desa: 10, kelurahan: 0 },
  { name: 'Rumpin', lat: -6.4565, lng: 106.6294, desa: 14, kelurahan: 0 },
  { name: 'Cigudeg', lat: -6.4997, lng: 106.5440, desa: 15, kelurahan: 0 },
  { name: 'Sukajaya', lat: -6.6271, lng: 106.4702, desa: 11, kelurahan: 0 },
  { name: 'Jasinga', lat: -6.4657, lng: 106.4579, desa: 16, kelurahan: 0 },
  { name: 'Tenjo', lat: -6.3783, lng: 106.4806, desa: 9, kelurahan: 0 },
  { name: 'Parung Panjang', lat: -6.3700, lng: 106.5546, desa: 11, kelurahan: 0 },
  { name: 'Tajurhalang', lat: -6.4713, lng: 106.7583, desa: 7, kelurahan: 0 },
];

const BOGOR_CENTER = [-6.55, 106.75];
const DEFAULT_ZOOM = 10;

const BOGOR_BOUNDARY = [
  [-6.30, 106.42], [-6.29, 106.50], [-6.30, 106.56], [-6.32, 106.62],
  [-6.33, 106.66], [-6.34, 106.70], [-6.37, 106.73], [-6.39, 106.76],
  [-6.42, 106.78], [-6.43, 106.82], [-6.44, 106.86], [-6.42, 106.89],
  [-6.38, 106.90], [-6.35, 106.93], [-6.34, 106.96], [-6.35, 107.00],
  [-6.36, 107.04], [-6.39, 107.07], [-6.42, 107.09], [-6.46, 107.11],
  [-6.48, 107.14], [-6.49, 107.17], [-6.50, 107.20], [-6.55, 107.21],
  [-6.60, 107.20], [-6.65, 107.19], [-6.68, 107.16], [-6.67, 107.10],
  [-6.64, 107.04], [-6.63, 107.00], [-6.64, 106.97], [-6.68, 106.97],
  [-6.72, 106.97], [-6.74, 106.94], [-6.76, 106.90], [-6.78, 106.87],
  [-6.79, 106.84], [-6.80, 106.80], [-6.80, 106.77], [-6.78, 106.75],
  [-6.74, 106.77], [-6.72, 106.75], [-6.72, 106.72], [-6.74, 106.69],
  [-6.75, 106.65], [-6.74, 106.62], [-6.72, 106.59], [-6.71, 106.55],
  [-6.71, 106.51], [-6.69, 106.47], [-6.66, 106.43], [-6.61, 106.40],
  [-6.54, 106.38], [-6.48, 106.38], [-6.44, 106.39], [-6.40, 106.40],
  [-6.36, 106.41], [-6.33, 106.42], [-6.30, 106.42],
];

const MASK_OUTER = [[-90, -180], [-90, 180], [90, 180], [90, -180]];
const MAX_BOUNDS = [[-6.88, 106.28], [-6.20, 107.30]];

const TILE_LAYERS = {
  dark: { url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', label: 'Gelap' },
  light: { url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', label: 'Terang' },
  satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', label: 'Satelit' },
};

// ======================= GEOMETRY UTILS =======================

function computeSignedArea(poly) {
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const j = (i + 1) % poly.length;
    area += poly[i][0] * poly[j][1] - poly[j][0] * poly[i][1];
  }
  return area / 2;
}

function cross2d(a, b, p) {
  return (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
}

function lineIntersect(p1, p2, p3, p4) {
  const d = (p1[0] - p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0] - p4[0]);
  if (Math.abs(d) < 1e-12) return null;
  const t = ((p1[0] - p3[0]) * (p3[1] - p4[1]) - (p1[1] - p3[1]) * (p3[0] - p4[0])) / d;
  return [p1[0] + t * (p2[0] - p1[0]), p1[1] + t * (p2[1] - p1[1])];
}

// Sutherland-Hodgman polygon clipping (clip polygon must be CCW)
function clipPolygon(subject, clip) {
  let output = [...subject];
  for (let i = 0; i < clip.length; i++) {
    if (output.length === 0) return [];
    const input = output;
    output = [];
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    for (let j = 0; j < input.length; j++) {
      const p = input[j];
      const q = input[(j + 1) % input.length];
      const pIn = cross2d(a, b, p) >= 0;
      const qIn = cross2d(a, b, q) >= 0;
      if (qIn) {
        if (!pIn) {
          const ix = lineIntersect(p, q, a, b);
          if (ix) output.push(ix);
        }
        output.push(q);
      } else if (pIn) {
        const ix = lineIntersect(p, q, a, b);
        if (ix) output.push(ix);
      }
    }
  }
  return output;
}

// ======================= VORONOI COMPUTATION =======================

function computeKecamatanRegions() {
  // Convert boundary [lat, lng] → [lng, lat] for geometry operations
  const clipBdy = BOGOR_BOUNDARY.map(([lat, lng]) => [lng, lat]);
  // Ensure CCW winding for Sutherland-Hodgman
  if (computeSignedArea(clipBdy) < 0) clipBdy.reverse();

  const centers = KECAMATAN_DATA.map(k => [k.lng, k.lat]);
  const delaunay = Delaunay.from(centers);
  const voronoi = delaunay.voronoi([106.25, -6.90, 107.35, -6.15]);

  return KECAMATAN_DATA.map((_, i) => {
    const cell = voronoi.cellPolygon(i);
    if (!cell) return [];
    // cellPolygon returns closed ring (first == last), remove duplicate
    const openCell = cell.slice(0, -1);
    const clipped = clipPolygon(openCell, clipBdy);
    // Convert back to [lat, lng] for Leaflet
    return clipped.map(([lng, lat]) => [lat, lng]);
  });
}

const KECAMATAN_REGIONS = computeKecamatanRegions();

// ======================= STYLING UTILS =======================

function getRegionHue(total) {
  const min = 7, max = 16;
  const t = Math.min(1, Math.max(0, (total - min) / (max - min)));
  return 145 - t * 100; // green(145) → amber(45)
}

function getRegionColor(total, isDark) {
  const h = getRegionHue(total);
  return isDark ? `hsl(${h}, 70%, 45%)` : `hsl(${h}, 55%, 42%)`;
}

function getRegionBorder(total, isDark) {
  const h = getRegionHue(total);
  return isDark ? `hsl(${h}, 80%, 60%)` : `hsl(${h}, 65%, 30%)`;
}

function getPlaceholderGradient(index) {
  const h = (index * 137.5) % 360;
  return `linear-gradient(135deg, hsl(${h}, 50%, 28%) 0%, hsl(${h + 40}, 55%, 16%) 100%)`;
}

// ======================= SUB-COMPONENTS =======================

const RecenterMap = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 1.2, easeLinearity: 0.25 });
  }, [center, zoom, map]);
  return null;
};

const KecamatanPhoto = ({ kec, index }) => (
  <div
    className="relative w-full aspect-[16/10] rounded-xl overflow-hidden"
    style={{ background: getPlaceholderGradient(index) }}
  >
    <div className="absolute inset-0 opacity-[0.06]" style={{
      backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(255,255,255,0.15) 8px, rgba(255,255,255,0.15) 9px)',
    }} />
    <div className="absolute inset-0 flex flex-col items-center justify-center text-white/40">
      <svg className="w-11 h-11 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
        <path d="M3 21h18M5 21V7l8-4v18M13 21V3l6 3v15M9 7v.01M9 11v.01M9 15v.01M17 8v.01M17 12v.01M17 16v.01" />
      </svg>
      <p className="text-[10px] font-medium uppercase tracking-[0.15em]">Kantor Kecamatan</p>
      <p className="text-base font-bold mt-0.5 text-white/60">{kec.name}</p>
    </div>
    <div className="absolute top-2 right-2 bg-white/10 backdrop-blur-sm rounded-lg px-2 py-1">
      <FiImage className="w-3 h-3 text-white/30" />
    </div>
  </div>
);

// ======================= MAIN COMPONENT =======================

const MapSection = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedKec, setSelectedKec] = useState(null);
  const [hoveredKec, setHoveredKec] = useState(null);
  const [mapCenter, setMapCenter] = useState(BOGOR_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [isExpanded, setIsExpanded] = useState(false);
  const [tileMode, setTileMode] = useState('dark');
  const [showPanel, setShowPanel] = useState(true);
  const { ref, inView } = useInView({ threshold: 0.1, triggerOnce: true });
  const mapRef = useRef(null);

  const isDark = tileMode === 'dark' || tileMode === 'satellite';

  const filteredKecamatan = useMemo(() => {
    const list = [...KECAMATAN_DATA].sort((a, b) => a.name.localeCompare(b.name));
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase();
    return list.filter(k => k.name.toLowerCase().includes(q));
  }, [searchQuery]);

  const totalDesa = KECAMATAN_DATA.reduce((s, k) => s + k.desa, 0);
  const totalKelurahan = KECAMATAN_DATA.reduce((s, k) => s + k.kelurahan, 0);

  const handleKecSelect = useCallback((kec) => {
    setSelectedKec(kec);
    setHoveredKec(null);
    setMapCenter([kec.lat, kec.lng]);
    setMapZoom(13);
    setSearchQuery('');
  }, []);

  const handleReset = useCallback(() => {
    setSelectedKec(null);
    setHoveredKec(null);
    setMapCenter(BOGOR_CENTER);
    setMapZoom(DEFAULT_ZOOM);
    setSearchQuery('');
  }, []);

  const maskFill = isDark
    ? { fillColor: '#0a1628', fillOpacity: 0.97, stroke: false, interactive: false }
    : { fillColor: '#f0f4f8', fillOpacity: 0.94, stroke: false, interactive: false };

  const outerBorder = isDark
    ? { color: '#c6a73d', weight: 2, fillOpacity: 0, opacity: 0.5, dashArray: '8, 4', interactive: false }
    : { color: '#112642', weight: 2.5, fillOpacity: 0, opacity: 0.6, interactive: false };

  return (
    <section ref={ref} className="relative py-0 overflow-hidden">
      <div className="relative bg-[rgb(var(--color-primary))]">
        {/* Background effects */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(198,167,61,0.15) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59,130,246,0.1) 0%, transparent 50%)',
        }} />
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />

        <div className="relative z-10 max-w-[1600px] mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7 }}
            className="text-center pt-20 pb-10 px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="inline-flex items-center space-x-2 bg-white/[0.06] border border-white/10 rounded-full px-5 py-2 mb-6 backdrop-blur-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[rgb(var(--color-secondary))] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[rgb(var(--color-secondary))]" />
              </span>
              <span className="text-white/80 text-sm font-medium tracking-wide">Peta Interaktif</span>
            </motion.div>
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
              Wilayah <span className="bg-gradient-to-r from-[rgb(var(--color-secondary))] to-amber-400 bg-clip-text text-transparent">Kabupaten Bogor</span>
            </h2>
            <p className="text-white/50 max-w-xl mx-auto text-base md:text-lg leading-relaxed">
              Jelajahi 40 kecamatan, {totalDesa} desa dan {totalKelurahan} kelurahan secara interaktif
            </p>
          </motion.div>

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
            <div className="flex h-[620px] md:h-[680px]" style={isExpanded ? { height: '100vh' } : {}}>

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
                            <KecamatanPhoto
                              kec={selectedKec}
                              index={KECAMATAN_DATA.findIndex(k => k.name === selectedKec.name)}
                            />

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
                                {kec.desa > 0 && kec.kelurahan > 0 && ' · '}
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

                    <div className="flex bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden">
                      {Object.entries(TILE_LAYERS).map(([key, { label }]) => (
                        <button
                          key={key}
                          onClick={() => setTileMode(key)}
                          className={`px-3 py-2.5 text-[11px] font-medium transition-all ${
                            tileMode === key
                              ? 'bg-[rgb(var(--color-secondary))] text-[rgb(var(--color-primary))]'
                              : 'text-white/50 hover:text-white/80'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {selectedKec && (
                      <button
                        onClick={handleReset}
                        className="p-2.5 bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-black/60 transition-all"
                        title="Reset peta"
                      >
                        <FiNavigation className="w-4 h-4" />
                      </button>
                    )}

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
                        <p className="text-[11px] text-white/40">{selectedKec.desa} desa · {selectedKec.kelurahan} kel</p>
                      </div>
                      <button onClick={handleReset} className="text-white/30 hover:text-white p-1"><FiX className="w-4 h-4" /></button>
                    </div>
                  </div>
                )}

                {/* Legend */}
                <div className="absolute bottom-4 right-4 z-[1000]">
                  <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-xl p-3">
                    <p className="text-[9px] text-white/30 uppercase tracking-widest font-semibold mb-2.5">Wilayah Kecamatan</p>
                    <div className="space-y-1.5">
                      {[
                        { total: 16, label: '14+ desa/kel' },
                        { total: 11, label: '10–13 desa/kel' },
                        { total: 7, label: '< 10 desa/kel' },
                      ].map((item) => (
                        <div key={item.label} className="flex items-center gap-2">
                          <span className="w-4 h-3 rounded-sm shrink-0" style={{
                            backgroundColor: getRegionColor(item.total, isDark), opacity: 0.7,
                          }} />
                          <span className="text-[10px] text-white/50">{item.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-white border-2 border-white/60 shrink-0" />
                      <span className="text-[10px] text-white/40">Kantor Kecamatan</span>
                    </div>
                  </div>
                </div>

                {/* ========= LEAFLET MAP ========= */}
                <div className="w-full h-full">
                  {inView && (
                    <MapContainer
                      ref={mapRef}
                      center={BOGOR_CENTER}
                      zoom={DEFAULT_ZOOM}
                      scrollWheelZoom={true}
                      className="w-full h-full z-0"
                      zoomControl={false}
                      minZoom={10}
                      maxZoom={17}
                      maxBounds={MAX_BOUNDS}
                      maxBoundsViscosity={1.0}
                      style={{ background: isDark ? '#0a1628' : '#f0f4f8' }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                        url={TILE_LAYERS[tileMode].url}
                        key={tileMode}
                      />
                      <RecenterMap center={mapCenter} zoom={mapZoom} />

                      {/* Mask outside Bogor */}
                      <Polygon positions={[MASK_OUTER, BOGOR_BOUNDARY]} pathOptions={maskFill} />

                      {/* Outer boundary */}
                      <Polygon positions={BOGOR_BOUNDARY} pathOptions={outerBorder} />

                      {/* === KECAMATAN REGION POLYGONS === */}
                      {KECAMATAN_DATA.map((kec, i) => {
                        const region = KECAMATAN_REGIONS[i];
                        if (!region || region.length < 3) return null;

                        const total = kec.desa + kec.kelurahan;
                        const isActive = selectedKec?.name === kec.name;
                        const isHover = hoveredKec?.name === kec.name;

                        const fillColor = isActive ? '#c6a73d' : getRegionColor(total, isDark);
                        const borderColor = isActive
                          ? '#fbbf24'
                          : isHover
                            ? getRegionBorder(total, isDark)
                            : isDark ? 'rgba(255,255,255,0.15)' : 'rgba(17,38,66,0.2)';

                        return (
                          <Polygon
                            key={kec.name}
                            positions={region}
                            pathOptions={{
                              fillColor,
                              fillOpacity: isActive ? 0.55 : isHover ? 0.45 : 0.3,
                              color: borderColor,
                              weight: isActive ? 3 : isHover ? 2 : 1,
                              opacity: isActive ? 1 : isHover ? 0.8 : 0.5,
                            }}
                            eventHandlers={{
                              click: () => handleKecSelect(kec),
                              mouseover: () => setHoveredKec(kec),
                              mouseout: () => setHoveredKec(null),
                            }}
                          >
                            <Tooltip direction="center" className="map-region-tooltip" permanent={false}>
                              <div className="text-center">
                                <p className="font-bold text-xs">{kec.name}</p>
                                <p className="text-[10px] opacity-60">{total} desa/kel</p>
                              </div>
                            </Tooltip>
                          </Polygon>
                        );
                      })}

                      {/* === KANTOR KECAMATAN MARKERS === */}
                      {KECAMATAN_DATA.map((kec) => {
                        const isActive = selectedKec?.name === kec.name;
                        const isHover = hoveredKec?.name === kec.name;

                        return (
                          <CircleMarker
                            key={`dot-${kec.name}`}
                            center={[kec.lat, kec.lng]}
                            radius={isActive ? 6 : isHover ? 5 : 3.5}
                            pathOptions={{
                              color: isActive ? '#fbbf24' : isDark ? '#fff' : '#112642',
                              fillColor: isActive ? '#fbbf24' : '#fff',
                              fillOpacity: isActive ? 1 : 0.9,
                              weight: isActive ? 2.5 : 1.5,
                            }}
                            eventHandlers={{
                              click: () => handleKecSelect(kec),
                              mouseover: () => setHoveredKec(kec),
                              mouseout: () => setHoveredKec(null),
                            }}
                          >
                            <Tooltip direction="top" offset={[0, -8]} className="map-tooltip-custom">
                              <div className="text-center">
                                <p className="font-semibold text-[11px]">Kantor Kec. {kec.name}</p>
                              </div>
                            </Tooltip>
                          </CircleMarker>
                        );
                      })}
                    </MapContainer>
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
