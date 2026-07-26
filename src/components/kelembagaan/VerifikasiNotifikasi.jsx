import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LuBell,
  LuBuilding2,
  LuChevronRight,
  LuCircleCheckBig,
  LuHeart,
  LuShield,
  LuUser,
  LuUsers,
  LuX,
} from "react-icons/lu";

// Kelembagaan berbasis status (bukan jumlah)
const STATUS_TYPES = [
  { key: "karangTaruna", label: "Karang Taruna", icon: LuUsers, color: "#2563eb" },
  { key: "lpm", label: "LPM", icon: LuBuilding2, color: "#4f46e5" },
  { key: "pkk", label: "PKK", icon: LuHeart, color: "#ec4899" },
  { key: "satlinmas", label: "Satlinmas", icon: LuShield, color: "#ea580c" },
];

const COUNT_TYPES = [
  { key: "rw", label: "RW", icon: LuUsers, color: "#9333ea" },
  { key: "rt", label: "RT", icon: LuUser, color: "#16a34a" },
  { key: "posyandu", label: "Posyandu", icon: LuHeart, color: "#dc2626" },
];

const buildLists = (kecamatanData) => {
  const menunggu = [];
  const ditolak = [];

  kecamatanData.forEach((kecamatan) => {
    kecamatan.desas.forEach((desa) => {
      const base = { desa: desa.nama, desaId: desa.id, kecamatan: kecamatan.nama };

      COUNT_TYPES.forEach(({ key, label, icon, color }) => {
        const jumlahDitolak = desa.ditolakKelembagaan?.[key] || 0;
        const jumlahMenunggu =
          (desa.kelembagaan?.[key] || 0) -
          (desa.verifiedKelembagaan?.[key] || 0) -
          jumlahDitolak;

        if (jumlahMenunggu > 0)
          menunggu.push({ ...base, type: label, count: jumlahMenunggu, icon, color });
        if (jumlahDitolak > 0)
          ditolak.push({ ...base, type: label, count: jumlahDitolak, icon, color: "#dc2626" });
      });

      STATUS_TYPES.forEach(({ key, label, icon, color }) => {
        if (desa.kelembagaan?.[key] !== "Terbentuk") return;

        if (desa.ditolakKelembagaan?.[key] === "Terbentuk") {
          ditolak.push({ ...base, type: label, count: 1, icon, color: "#dc2626" });
        } else if (desa.verifiedKelembagaan?.[key] !== "Terbentuk") {
          menunggu.push({ ...base, type: label, count: 1, icon, color });
        }
      });
    });
  });

  return { menunggu, ditolak };
};

const VerifikasiNotifikasi = ({ kecamatanData = [], onDesaClick }) => {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("menunggu");
  const containerRef = useRef(null);

  const { menunggu, ditolak } = useMemo(() => buildLists(kecamatanData), [kecamatanData]);
  const total = menunggu.length + ditolak.length;
  const items = tab === "menunggu" ? menunggu : ditolak;

  useEffect(() => {
    if (!open) return undefined;
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
        aria-label="Notifikasi verifikasi kelembagaan"
      >
        <LuBell className="h-4 w-4" />
        <span className="hidden sm:inline">Verifikasi</span>
        {total > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-[calc(100vw-2rem)] sm:w-96 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-800">Notifikasi Verifikasi</h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label="Tutup notifikasi"
            >
              <LuX className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 border-b border-gray-200">
            {[
              { id: "menunggu", label: "Menunggu", count: menunggu.length, active: "border-amber-500 text-amber-600" },
              { id: "ditolak", label: "Ditolak", count: ditolak.length, active: "border-red-500 text-red-600" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`flex items-center justify-center gap-2 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === item.id
                    ? item.active
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {item.label}
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                  {item.count}
                </span>
              </button>
            ))}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-8 text-center">
                <LuCircleCheckBig className="h-10 w-10 text-green-500 mx-auto mb-3" />
                <p className="text-sm text-gray-600">
                  {tab === "menunggu"
                    ? "Tidak ada kelembagaan yang menunggu verifikasi"
                    : "Tidak ada kelembagaan yang ditolak"}
                </p>
              </div>
            ) : (
              items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <button
                    key={`${item.desaId}-${item.type}-${index}`}
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onDesaClick(item.desaId);
                    }}
                    className="w-full flex items-center gap-3 p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors text-left group"
                  >
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${item.color}1a` }}
                    >
                      <Icon className="h-4 w-4" style={{ color: item.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-800">{item.type}</span>
                        <span
                          className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${
                            tab === "menunggu"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.count}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">
                        {item.desa} • Kec. {item.kecamatan}
                      </p>
                    </div>
                    <LuChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifikasiNotifikasi;
