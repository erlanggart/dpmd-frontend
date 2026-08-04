// Dropdown custom Core Dashboard.
//
// Dibuat sendiri (bukan <select> native) karena panel pilihan pada <select>
// digambar oleh sistem operasi dan tidak bisa ditata sama sekali — itulah kotak
// putih dengan sorot biru bawaan browser.
//
// Yang tetap dijaga dari perilaku native:
//  - navigasi keyboard penuh (panah, Home/End, Enter, Esc, ketik untuk lompat)
//  - peran ARIA combobox/listbox supaya terbaca screen reader
//  - panel dipasang lewat portal + posisi fixed, jadi tidak terpotong kartu
//    yang ter-scroll dan otomatis membuka ke atas kalau ruang bawah sempit
//  - di layar sempit panel tampil sebagai lembar bawah yang enak disentuh
import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search, X } from 'lucide-react';

const PANEL_MAX_HEIGHT = 288;
const SEARCH_THRESHOLD = 8; // daftar panjang otomatis dapat kolom pencarian

const isMobile = () => typeof window !== 'undefined' && window.innerWidth < 640;

const SelectBox = ({
  value,
  onChange,
  options = [], // [{ value, label, hint? }]
  placeholder = 'Pilih…',
  label,
  disabled = false,
  size = 'md', // 'sm' | 'md'
  invert = false, // tampilan gelap saat sedang terfilter
  searchable, // paksa aktif/nonaktif; default mengikuti jumlah opsi
  emptyText = 'Tidak ada pilihan',
  className = '',
  id,
  name,
}) => {
  const generatedId = useId();
  const selectId = id || generatedId;
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);
  const typeaheadRef = useRef({ text: '', timer: null });

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(-1);
  const [rect, setRect] = useState(null);
  const [sheet, setSheet] = useState(false);

  const selected = useMemo(
    () => options.find((o) => String(o.value) === String(value)) || null,
    [options, value]
  );

  const withSearch = searchable ?? options.length > SEARCH_THRESHOLD;

  const visible = useMemo(() => {
    if (!withSearch || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((o) => String(o.label).toLowerCase().includes(q));
  }, [options, query, withSearch]);

  // Posisi panel dihitung dari kotak pemicu; dipakai bersama position: fixed.
  const measure = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const below = window.innerHeight - r.bottom;
    const above = r.top;
    const flip = below < Math.min(PANEL_MAX_HEIGHT, 220) && above > below;
    setRect({
      left: r.left,
      width: r.width,
      top: flip ? undefined : r.bottom + 6,
      bottom: flip ? window.innerHeight - r.top + 6 : undefined,
      maxHeight: Math.min(PANEL_MAX_HEIGHT, (flip ? above : below) - 16),
    });
  }, []);

  const openPanel = useCallback(() => {
    if (disabled) return;
    const asSheet = isMobile();
    setSheet(asSheet);
    if (!asSheet) measure();
    setQuery('');
    setHighlight(options.findIndex((o) => String(o.value) === String(value)));
    setOpen(true);
  }, [disabled, measure, options, value]);

  const closePanel = useCallback(
    (refocus = true) => {
      setOpen(false);
      setQuery('');
      if (refocus) triggerRef.current?.focus();
    },
    []
  );

  const pick = useCallback(
    (option) => {
      onChange?.(option.value);
      closePanel();
    },
    [onChange, closePanel]
  );

  // Tutup saat klik di luar, dan ikuti scroll/resize selagi terbuka.
  useEffect(() => {
    if (!open) return undefined;

    const onPointerDown = (e) => {
      if (panelRef.current?.contains(e.target) || triggerRef.current?.contains(e.target)) return;
      closePanel(false);
    };
    const onReposition = () => {
      if (isMobile()) return;
      measure();
    };

    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    window.addEventListener('scroll', onReposition, true);
    window.addEventListener('resize', onReposition);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('scroll', onReposition, true);
      window.removeEventListener('resize', onReposition);
    };
  }, [open, closePanel, measure]);

  useEffect(() => {
    if (open && withSearch && !sheet) searchRef.current?.focus();
  }, [open, withSearch, sheet]);

  // Jaga agar opsi tersorot selalu terlihat.
  useEffect(() => {
    if (!open || highlight < 0) return;
    const node = panelRef.current?.querySelector(`[data-index="${highlight}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [open, highlight]);

  const moveHighlight = (delta) => {
    if (!visible.length) return;
    setHighlight((prev) => {
      const start = prev < 0 ? (delta > 0 ? -1 : visible.length) : prev;
      return (start + delta + visible.length) % visible.length;
    });
  };

  const onTriggerKeyDown = (e) => {
    if (disabled) return;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openPanel();
      }
      return;
    }
    handlePanelKeys(e);
  };

  const handlePanelKeys = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        moveHighlight(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        moveHighlight(-1);
        break;
      case 'Home':
        e.preventDefault();
        setHighlight(0);
        break;
      case 'End':
        e.preventDefault();
        setHighlight(visible.length - 1);
        break;
      case 'Enter':
        e.preventDefault();
        if (visible[highlight]) pick(visible[highlight]);
        break;
      case 'Escape':
        e.preventDefault();
        closePanel();
        break;
      case 'Tab':
        closePanel(false);
        break;
      default:
        // Ketik huruf untuk melompat, seperti <select> native.
        if (!withSearch && e.key.length === 1) {
          const ta = typeaheadRef.current;
          clearTimeout(ta.timer);
          ta.text += e.key.toLowerCase();
          ta.timer = setTimeout(() => { ta.text = ''; }, 700);
          const idx = visible.findIndex((o) => String(o.label).toLowerCase().startsWith(ta.text));
          if (idx >= 0) setHighlight(idx);
        }
    }
  };

  const sizeClass = size === 'sm' ? 'h-9 pl-3 pr-9 text-[13px]' : 'h-11 pl-3.5 pr-10 text-sm';
  const toneClass = invert
    ? 'border-slate-900 bg-slate-900 text-white hover:border-slate-700'
    : 'border-slate-200 bg-white text-slate-900 hover:border-slate-300';

  const list = (
    <>
      {withSearch && (
        <div className="border-b border-slate-100 p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setHighlight(0); }}
              onKeyDown={handlePanelKeys}
              placeholder="Cari…"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-8 pr-8 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(''); searchRef.current?.focus(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-900"
                aria-label="Bersihkan pencarian"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      <ul
        role="listbox"
        aria-labelledby={`${selectId}-trigger`}
        className="max-h-full overflow-y-auto overscroll-contain p-1.5"
      >
        {visible.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-slate-400">{emptyText}</li>
        )}
        {visible.map((option, index) => {
          const isSelected = String(option.value) === String(value);
          const isActive = index === highlight;
          return (
            <li key={`${option.value}-${index}`} data-index={index}>
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => pick(option)}
                onMouseEnter={() => setHighlight(index)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  isSelected
                    ? 'bg-slate-900 font-semibold text-white'
                    : isActive
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-700'
                }`}
              >
                <span className="min-w-0 flex-1 truncate">
                  {option.label}
                  {option.hint && (
                    <span
                      className={`ml-1.5 text-xs font-normal ${
                        isSelected ? 'text-slate-400' : 'text-slate-400'
                      }`}
                    >
                      {option.hint}
                    </span>
                  )}
                </span>
                {isSelected && <Check className="h-4 w-4 flex-shrink-0" />}
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );

  return (
    <div className={`min-w-0 ${className}`}>
      {label && (
        <label
          htmlFor={`${selectId}-trigger`}
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600"
        >
          {label}
        </label>
      )}

      <button
        id={`${selectId}-trigger`}
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={() => (open ? closePanel() : openPanel())}
        onKeyDown={onTriggerKeyDown}
        className={`flex w-full items-center justify-between gap-2 rounded-xl border font-medium shadow-sm transition-[border-color,box-shadow,background-color] duration-150 focus:outline-none focus:ring-2 focus:ring-slate-900/10 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 ${sizeClass} ${toneClass} ${
          open ? 'border-slate-900 ring-2 ring-slate-900/10' : ''
        }`}
      >
        <span className={`min-w-0 flex-1 truncate text-left ${selected ? '' : 'text-slate-400'}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          } ${invert ? 'text-white' : 'text-slate-400'}`}
        />
      </button>

      {/* nilai ikut terkirim kalau dipakai di dalam <form> biasa */}
      {name && <input type="hidden" name={name} value={value ?? ''} />}

      {open &&
        createPortal(
          sheet ? (
            <div className="fixed inset-0 z-[100] flex items-end sm:hidden">
              <div
                className="absolute inset-0 bg-slate-950/40"
                onClick={() => closePanel(false)}
                aria-hidden="true"
              />
              <div
                ref={panelRef}
                onKeyDown={handlePanelKeys}
                className="relative flex max-h-[70vh] w-full flex-col overflow-hidden rounded-t-2xl border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl"
              >
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-semibold text-slate-900">{label || 'Pilih'}</p>
                  <button
                    type="button"
                    onClick={() => closePanel()}
                    className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
                    aria-label="Tutup"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex min-h-0 flex-1 flex-col">{list}</div>
              </div>
            </div>
          ) : (
            <div
              ref={panelRef}
              onKeyDown={handlePanelKeys}
              style={{
                position: 'fixed',
                left: rect?.left,
                width: rect?.width,
                top: rect?.top,
                bottom: rect?.bottom,
                maxHeight: rect?.maxHeight,
              }}
              className="z-[100] flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10"
            >
              {list}
            </div>
          ),
          document.body
        )}
    </div>
  );
};

export default SelectBox;
