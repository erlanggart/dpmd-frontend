import { createContext, useContext } from "react";

/*
 * Apakah slide yang memuat komponen ini sedang tampil. Di dek desktop slide
 * yang tidak aktif tetap ter-mount (hanya disembunyikan), jadi relief 3D dan
 * animasi Remotion memakai ini untuk berhenti. Di luar dek (ponsel) selalu true.
 */
export const KonteksSlide = createContext(true);
export const useSlideAktif = () => useContext(KonteksSlide);
