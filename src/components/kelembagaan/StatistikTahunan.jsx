// Barrel export - komponen dipecah menjadi file terpisah
// Gunakan import individual untuk fleksibilitas layout di Kelembagaan.jsx

export { default as ChartVerifikasiTahunan } from "./ChartVerifikasiTahunan";
export { default as TabelVerifikasiTahunan } from "./TabelVerifikasiTahunan";
export { default as CapaianVerifikasiLembaga } from "./CapaianVerifikasiLembaga";
export { default as RingkasanStatusKelembagaan } from "./RingkasanStatusKelembagaan";
export { default as useStatistikTahunan } from "../../hooks/useStatistikTahunan";

// Default export: composed version (backward compatible)
import React from "react";
import useStatistikTahunan from "../../hooks/useStatistikTahunan";
import ChartVerifikasiTahunan from "./ChartVerifikasiTahunan";
import TabelVerifikasiTahunan from "./TabelVerifikasiTahunan";
import CapaianVerifikasiLembaga from "./CapaianVerifikasiLembaga";
import RingkasanStatusKelembagaan from "./RingkasanStatusKelembagaan";

const StatistikTahunan = () => {
  const { data, loading, error } = useStatistikTahunan();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Statistik Kelembagaan Tahunan</h2>
        <p className="text-sm text-slate-500 mt-1">
          Tren perkembangan, verifikasi, dan status kelembagaan dari tahun ke tahun
        </p>
      </div>

      <ChartVerifikasiTahunan data={data} loading={loading} error={error} />
      <TabelVerifikasiTahunan data={data} loading={loading} error={error} />

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="col-span-1 md:col-span-2">
            <CapaianVerifikasiLembaga data={data} loading={loading} error={error} />
          </div>
          <div className="col-span-1">
            <RingkasanStatusKelembagaan data={data} loading={loading} error={error} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatistikTahunan;
