import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Landing page sebagai dek slide (pola Simpaskor): satu layar satu bagian, dan
 * perpindahannya transisi, bukan gulir. Sumber kebenarannya nomor slide aktif,
 * jadi navbar, papan ketik, roda tetikus, dan usapan jari bicara ke hal yang sama.
 *
 * Bagian yang lebih tinggi dari layar boleh bergulir di dalam slide-nya
 * (penanda data-dek-gulir): dek baru pindah setelah isinya sampai ujung.
 * Elemen yang memakai roda/usapan sendiri (peta interaktif) diberi penanda
 * data-dek-abaikan dan tidak pernah memindahkan slide.
 */

/** Harus sama dengan durasi transisi .dek-slide di dek.css. */
export const DURASI_SLIDE = 900;
const AMBANG_USAP = 55;
const AMBANG_RODA = 8;

function masihBisaDigulir(el, arah) {
	const overflow = getComputedStyle(el).overflowY;
	if (overflow !== "auto" && overflow !== "scroll") return false;
	if (arah > 0) return el.scrollHeight - el.clientHeight - el.scrollTop > 1;
	return el.scrollTop > 1;
}

const cari = (target, atribut) => (target instanceof Element ? target.closest(`[${atribut}]`) : null);

/**
 * @param aktifkan dek hanya untuk desktop. Di ponsel semua penangkap input tidak
 * dipasang sama sekali: penangkap roda memanggil preventDefault dan akan
 * membekukan gulir halaman.
 */
export function useDek(jumlah, aktifkan = true) {
	const [aktif, setAktif] = useState(0);
	const wadahRef = useRef(null);
	const terkunci = useRef(false);
	const timer = useRef(null);
	const jumlahRef = useRef(jumlah);
	jumlahRef.current = jumlah;

	const kunci = () => {
		// Satu putaran roda atau tombol panah yang ditahan tidak boleh melompati
		// beberapa slide sekaligus.
		terkunci.current = true;
		clearTimeout(timer.current);
		timer.current = setTimeout(() => { terkunci.current = false; }, DURASI_SLIDE + 60);
	};

	const keSlide = useCallback((i) => {
		if (i < 0 || i >= jumlahRef.current) return;
		setAktif((kini) => {
			if (kini === i) return kini;
			kunci();
			return i;
		});
	}, []);

	const langkah = useCallback((arah) => {
		setAktif((kini) => {
			const tujuan = kini + arah;
			if (tujuan < 0 || tujuan >= jumlahRef.current) return kini;
			kunci();
			return tujuan;
		});
	}, []);

	useEffect(() => () => clearTimeout(timer.current), []);

	// roda tetikus / trackpad
	useEffect(() => {
		const wadah = wadahRef.current;
		if (!wadah || !aktifkan) return undefined;
		const onWheel = (e) => {
			if (cari(e.target, "data-dek-abaikan")) return;
			if (Math.abs(e.deltaY) < AMBANG_RODA) return;
			const arah = e.deltaY > 0 ? 1 : -1;
			const penggulir = cari(e.target, "data-dek-gulir");
			if (penggulir && masihBisaDigulir(penggulir, arah)) return;
			e.preventDefault();
			if (!terkunci.current) langkah(arah);
		};
		wadah.addEventListener("wheel", onWheel, { passive: false });
		return () => wadah.removeEventListener("wheel", onWheel);
	}, [langkah, aktifkan]);

	// papan ketik
	useEffect(() => {
		if (!aktifkan) return undefined;
		const onKey = (e) => {
			const t = e.target;
			// jangan rampas tombol dari kolom isian; spasi pada tombol/tautan tetap menekannya
			if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
			if (e.key === " " && t && /^(BUTTON|A)$/.test(t.tagName)) return;
			if (cari(t, "data-dek-abaikan")) return;
			const penggulir = cari(document.activeElement, "data-dek-gulir") || document.querySelector(".dek-slide.is-active [data-dek-gulir]");
			const turun = e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ";
			const naik = e.key === "ArrowUp" || e.key === "PageUp";
			if ((turun || naik) && penggulir && masihBisaDigulir(penggulir, turun ? 1 : -1)) return;
			if (turun) { e.preventDefault(); if (!terkunci.current) langkah(1); }
			else if (naik) { e.preventDefault(); if (!terkunci.current) langkah(-1); }
			else if (e.key === "Home") { e.preventDefault(); keSlide(0); }
			else if (e.key === "End") { e.preventDefault(); keSlide(jumlahRef.current - 1); }
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [langkah, keSlide, aktifkan]);

	// usapan jari (tablet berlayar lebar)
	useEffect(() => {
		const wadah = wadahRef.current;
		if (!wadah || !aktifkan) return undefined;
		let y0 = 0, x0 = 0, penggulir = null, abaikan = false;
		const mulai = (e) => {
			const t = e.touches[0];
			if (!t) return;
			y0 = t.clientY; x0 = t.clientX;
			penggulir = cari(e.target, "data-dek-gulir");
			abaikan = Boolean(cari(e.target, "data-dek-abaikan"));
		};
		const selesai = (e) => {
			const t = e.changedTouches[0];
			if (!t || abaikan) return;
			const dy = y0 - t.clientY, dx = x0 - t.clientX;
			if (Math.abs(dx) > Math.abs(dy) || Math.abs(dy) < AMBANG_USAP) return; // usapan mendatar milik karusel
			const arah = dy > 0 ? 1 : -1;
			if (penggulir && masihBisaDigulir(penggulir, arah)) return;
			if (!terkunci.current) langkah(arah);
		};
		wadah.addEventListener("touchstart", mulai, { passive: true });
		wadah.addEventListener("touchend", selesai, { passive: true });
		return () => {
			wadah.removeEventListener("touchstart", mulai);
			wadah.removeEventListener("touchend", selesai);
		};
	}, [langkah, aktifkan]);

	return { aktif, keSlide, wadahRef };
}
