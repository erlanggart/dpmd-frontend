import React, { useState, useRef } from 'react';

/**
 * MultiSelectDropdown
 * @param {string} label - Label untuk dropdown
 * @param {Array<{label: string, value: string|number}>} options - Pilihan dropdown
 * @param {Array<string|number>} value - Nilai terpilih (array)
 * @param {function} onChange - Callback saat nilai berubah
 * @param {string} placeholder - Placeholder jika belum ada pilihan
 * @param {string} name - Nama field (optional)
 * @param {boolean} disabled - Disable dropdown
 */
const MultiSelectDropdown = ({
  label,
  options = [],
  value = [],
  onChange,
  placeholder = 'Pilih...',
  name,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown jika klik di luar
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    if (value.includes(option.value)) {
      onChange(value.filter((v) => v !== option.value));
    } else {
      onChange([...value, option.value]);
    }
  };

  const handleRemove = (val) => {
    onChange(value.filter((v) => v !== val));
  };

  return (
    <div className="w-full" ref={dropdownRef}>
      {label && <label className="block mb-1 text-sm font-semibold text-gray-700">{label}</label>}
      <div
        className={`relative bg-white border-2 rounded-xl px-3 py-2 flex flex-wrap gap-1 items-center min-h-[44px] cursor-pointer focus-within:ring-2 focus-within:ring-blue-200 focus-within:border-blue-500 transition-all ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:border-blue-400 border-gray-200'}`}
        tabIndex={0}
        onClick={() => !disabled && setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {value.length === 0 && (
          <span className="text-gray-400 text-sm">{placeholder}</span>
        )}
        {value.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {value.map((val) => {
              const opt = options.find((o) => o.value === val);
              return (
                <span key={val} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-lg text-xs flex items-center gap-1">
                  {opt ? opt.label : val}
                  <button
                    type="button"
                    className="ml-1 text-blue-400 hover:text-red-500 focus:outline-none"
                    onClick={(e) => { e.stopPropagation(); handleRemove(val); }}
                    tabIndex={-1}
                  >
                    &times;
                  </button>
                </span>
              );
            })}
          </div>
        )}
        <span className="ml-auto text-gray-400">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" d="M6 9l6 6 6-6"/></svg>
        </span>
        {open && !disabled && (
          <ul className="absolute left-0 top-full z-20 mt-1 w-full bg-white border border-blue-100 rounded-xl shadow-lg max-h-56 overflow-auto animate-fade-in">
            {options.length === 0 && (
              <li className="px-4 py-2 text-gray-400 text-sm">Tidak ada pilihan</li>
            )}
            {options.map((option) => (
              <li
                key={option.value}
                className={`px-4 py-2 cursor-pointer text-sm hover:bg-blue-50 flex items-center gap-2 ${value.includes(option.value) ? 'bg-blue-100 text-blue-700 font-semibold' : ''}`}
                onClick={(e) => { e.stopPropagation(); handleSelect(option); }}
                aria-selected={value.includes(option.value)}
                role="option"
              >
                <input
                  type="checkbox"
                  checked={value.includes(option.value)}
                  readOnly
                  className="accent-blue-500 mr-2"
                  tabIndex={-1}
                />
                {option.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default MultiSelectDropdown;
