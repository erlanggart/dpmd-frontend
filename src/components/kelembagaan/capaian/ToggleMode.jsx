import React from "react";
import { LuBuilding2, LuUsers } from "react-icons/lu";
import { MODE } from "./warnaLembaga";

const IKON = { lembaga: LuBuilding2, pengurus: LuUsers };

const ToggleMode = ({ mode, onChange }) => (
  <div className="inline-flex rounded-lg border border-slate-200 p-0.5" role="group" aria-label="Sudut pandang capaian">
    {Object.entries(MODE).map(([key, { label }]) => {
      const Ikon = IKON[key];
      return (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          aria-pressed={mode === key}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
            mode === key ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Ikon className="w-4 h-4" />
          {label}
        </button>
      );
    })}
  </div>
);

export default ToggleMode;
