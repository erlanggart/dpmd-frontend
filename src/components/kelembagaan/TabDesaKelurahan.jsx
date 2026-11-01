const TABS = [
  { id: "desa", label: "Desa" },
  { id: "kelurahan", label: "Kelurahan" },
  { id: "semua", label: "Semua" },
];

const TabDesaKelurahan = ({ value, onChange }) => (
  <div role="tablist" className="inline-flex rounded-xl border border-gray-200 bg-gray-100 p-1">
    {TABS.map((tab) => (
      <button
        key={tab.id}
        type="button"
        role="tab"
        aria-selected={value === tab.id}
        onClick={() => onChange(tab.id)}
        className={`rounded-lg px-5 py-2 text-sm font-semibold transition-colors ${
          value === tab.id ? "bg-white text-blue-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
        }`}
      >
        {tab.label}
      </button>
    ))}
  </div>
);

export default TabDesaKelurahan;
