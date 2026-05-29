import { useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, User } from 'lucide-react';

// ─── Badge per role ───────────────────────────────────────────────────────────
const ROLE_BADGE = {
  kepala_dinas:     { label: 'Kepala Dinas',     cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  sekretaris_dinas: { label: 'Sekretaris Dinas', cls: 'bg-purple-100 text-purple-700 border-purple-200' },
  kepala_bidang:    { label: 'Kepala Bidang',    cls: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  ketua_tim:        { label: 'Ketua Tim',        cls: 'bg-green-100 text-green-700 border-green-200' },
  bendahara:        { label: 'Bendahara',        cls: 'bg-teal-100 text-teal-700 border-teal-200' },
  pegawai:          { label: 'Pegawai',          cls: 'bg-gray-100 text-gray-700 border-gray-200' },
  superadmin:       { label: 'Superadmin',       cls: 'bg-rose-100 text-rose-700 border-rose-200' },
};

export const RoleBadge = ({ role, size = 'sm' }) => {
  const cfg = ROLE_BADGE[role] || { label: role || '—', cls: 'bg-gray-100 text-gray-500 border-gray-200' };
  const sizeCls = size === 'xs'
    ? 'text-[9px] px-1.5 py-0 leading-tight'
    : 'text-[10px] px-1.5 py-0.5';
  return (
    <span className={`inline-flex items-center rounded-full border font-semibold shrink-0 ${cfg.cls} ${sizeCls}`}>
      {cfg.label}
    </span>
  );
};

// ─── Group rendering ──────────────────────────────────────────────────────────
const GroupHeader = ({ label }) => (
  <div className="px-3 py-1.5 text-[9.5px] font-bold uppercase tracking-wider text-gray-400 bg-gray-50 sticky top-0 z-10">
    {label}
  </div>
);

const Option = ({ u, selected, onClick, showNip }) => (
  <button
    type="button"
    onMouseDown={e => e.preventDefault()} // prevent blur on trigger
    onClick={() => onClick(u.user_id)}
    className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 transition ${
      selected ? 'bg-teal-50' : 'hover:bg-gray-50'
    }`}
  >
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[12.5px] font-medium text-gray-800 truncate">{u.name}</span>
        <RoleBadge role={u.role} />
      </div>
      <p className="text-[10.5px] text-gray-500 mt-0.5 truncate">
        {showNip && u.nip ? `NIP. ${u.nip}` : (u.jabatan || u.role || '')}
      </p>
    </div>
    {selected && <Check className="h-3.5 w-3.5 text-teal-600 shrink-0" />}
  </button>
);

// Estimated max dropdown height (px) when there's enough space
const DROPDOWN_MAX_HEIGHT = 320;
const VIEWPORT_PADDING = 12;
const MIN_USABLE_SPACE = 180; // minimum acceptable height before flipping placement

/**
 * PegawaiSelect — dropdown custom dengan grouping + badge role berwarna + search.
 * Uses React Portal + fixed positioning so the menu escapes any `overflow:hidden` parent.
 */
const PegawaiSelect = ({
  value,
  onChange,
  groups,
  placeholder = '— Pilih Pegawai —',
  showNip = false,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0, maxHeight: DROPDOWN_MAX_HEIGHT });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);

  // Flat list untuk lookup selected
  const allPegawai = useMemo(() => [
    ...(groups?.pimpinan || []),
    ...(groups?.bidangThis || []),
    ...(groups?.bidangOther || []),
  ], [groups]);

  const selected = useMemo(
    () => allPegawai.find(u => String(u.user_id) === String(value)) || null,
    [allPegawai, value],
  );

  // ─── Positioning ─────────────────────────────────────────────────────
  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_PADDING;
    const spaceAbove = rect.top - VIEWPORT_PADDING;
    const placeAbove = spaceBelow < MIN_USABLE_SPACE && spaceAbove > spaceBelow;
    const available = placeAbove ? spaceAbove : spaceBelow;
    const maxHeight = Math.max(MIN_USABLE_SPACE, Math.min(DROPDOWN_MAX_HEIGHT, available));
    setPos({
      top: placeAbove ? rect.top - 4 - maxHeight : rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      maxHeight,
    });
  };

  useLayoutEffect(() => {
    if (open) updatePosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = () => updatePosition();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [open]);

  // Click outside (must check both trigger and portalled dropdown)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      const insideTrigger = triggerRef.current?.contains(e.target);
      const insideDropdown = dropdownRef.current?.contains(e.target);
      if (!insideTrigger && !insideDropdown) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus search on open
  useEffect(() => {
    if (open) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [open]);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') { setOpen(false); setSearch(''); } };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // ─── Filter ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const empty = { pimpinan: [], bidangThis: [], bidangOther: [], bidangNama: groups?.bidangNama || '' };
    if (!groups) return empty;
    if (!search) return groups;
    const q = search.toLowerCase();
    const match = (u) =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.nip || '').toLowerCase().includes(q) ||
      (u.jabatan || '').toLowerCase().includes(q) ||
      (ROLE_BADGE[u.role]?.label || '').toLowerCase().includes(q);
    return {
      pimpinan:    (groups.pimpinan    || []).filter(match),
      bidangThis:  (groups.bidangThis  || []).filter(match),
      bidangOther: (groups.bidangOther || []).filter(match),
      bidangNama:  groups.bidangNama || '',
    };
  }, [search, groups]);

  const hasResults =
    filtered.pimpinan.length + filtered.bidangThis.length + filtered.bidangOther.length > 0;

  const handleSelect = (uid) => {
    onChange(String(uid));
    setOpen(false);
    setSearch('');
  };

  // ─── Render dropdown (portalled) ─────────────────────────────────────
  const dropdownMenu = open ? (
    <div
      ref={dropdownRef}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: pos.width,
        maxHeight: pos.maxHeight,
        zIndex: 10000,
      }}
      className="bg-white border border-gray-200 rounded-lg shadow-2xl overflow-hidden flex flex-col"
    >
      {/* Search */}
      <div className="p-2 border-b border-gray-100 bg-gray-50/50 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Cari nama / NIP / jabatan / role…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-xs rounded border border-gray-200 focus:border-teal-400 focus:ring-1 focus:ring-teal-200 outline-none bg-white"
          />
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1">
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => handleSelect('')}
          className="w-full text-left px-3 py-1.5 text-[11px] text-gray-400 hover:bg-gray-50 italic border-b border-gray-100"
        >
          — Hapus pilihan —
        </button>

        {!hasResults ? (
          <div className="py-6 text-center text-xs text-gray-400">
            <User className="h-6 w-6 mx-auto mb-1 opacity-40" />
            Tidak ada pegawai ditemukan
          </div>
        ) : (
          <>
            {filtered.pimpinan.length > 0 && (
              <>
                <GroupHeader label="Pimpinan Dinas" />
                {filtered.pimpinan.map(u => (
                  <Option
                    key={u.user_id}
                    u={u}
                    selected={String(u.user_id) === String(value)}
                    onClick={handleSelect}
                    showNip={showNip}
                  />
                ))}
              </>
            )}
            {filtered.bidangThis.length > 0 && (
              <>
                <GroupHeader label={`Bidang ${filtered.bidangNama} (relevan)`} />
                {filtered.bidangThis.map(u => (
                  <Option
                    key={u.user_id}
                    u={u}
                    selected={String(u.user_id) === String(value)}
                    onClick={handleSelect}
                    showNip={showNip}
                  />
                ))}
              </>
            )}
            {filtered.bidangOther.length > 0 && (
              <>
                <GroupHeader label="Bidang Lain" />
                {filtered.bidangOther.map(u => (
                  <Option
                    key={u.user_id}
                    u={u}
                    selected={String(u.user_id) === String(value)}
                    onClick={handleSelect}
                    showNip={showNip}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  ) : null;

  return (
    <div className={className}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full px-3 py-2 text-left text-sm rounded-lg border border-gray-200 hover:border-teal-300 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition flex items-center justify-between gap-2 bg-white"
      >
        {selected ? (
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-gray-800 truncate">{selected.name}</span>
            <RoleBadge role={selected.role} />
          </div>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <ChevronDown className={`h-4 w-4 text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {dropdownMenu && createPortal(dropdownMenu, document.body)}
    </div>
  );
};

export default PegawaiSelect;
