import React, { useEffect, useState } from "react";

// Bar capaian bersama (tab per Lembaga & per Kecamatan). Lebar mulai dari 0 lalu
// diisi satu frame kemudian, supaya bar tumbuh saat pertama tampil — bukan hanya
// saat angkanya berubah. motion-reduce mematikan animasi bagi yang memintanya.
const BarCapaian = ({ persen = 0, warna, tinggi = "h-2.5" }) => {
  const [lebar, setLebar] = useState(0);

  useEffect(() => {
    const id = requestAnimationFrame(() => setLebar(persen));
    return () => cancelAnimationFrame(id);
  }, [persen]);

  return (
    <div className={`flex-1 bg-slate-100 rounded-full ${tinggi} overflow-hidden`}>
      <div
        className="h-full rounded-full transition-[width,background-color] duration-700 ease-out motion-reduce:transition-none"
        style={{ width: `${lebar}%`, backgroundColor: warna }}
      />
    </div>
  );
};

export default BarCapaian;
