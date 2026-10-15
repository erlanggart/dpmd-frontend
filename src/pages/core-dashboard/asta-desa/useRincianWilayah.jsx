import React, { useCallback, useState } from 'react';
import ModalRincian from './RincianWilayah';

/**
 * Hook kecil untuk pemakai: `buka(pemilih)` menampilkan pop-up, `modal`
 * dirender di mana saja dalam pohon pemakai.
 */
export const useRincianWilayah = (filter) => {
  const [pemilih, setPemilih] = useState(null);
  const tutup = useCallback(() => setPemilih(null), []);
  const modal = pemilih ? <ModalRincian pemilih={pemilih} filter={filter} onTutup={tutup} /> : null;
  return { buka: setPemilih, modal };
};
