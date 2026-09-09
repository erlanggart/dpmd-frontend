// src/pages/core-dashboard/GemaPage.jsx
//
// Gema — asisten suara Core Dashboard. Purwarupa.
//
// DUA CARA PAKAI, DIPILIH SENDIRI MENURUT PERANGKATNYA:
//
//   SIAGA (komputer meja/laptop) — seperti Siri: tidak ada tombol yang harus
//   ditekan. Sekali izin mikrofon diberikan, Gema siaga terus menunggu kata
//   bangun "Halo Gema".
//
//   KETUK (HP dan tablet) — ketuk lingkaran, bicara, selesai. Tanpa kata
//   bangun, tanpa mikrofon yang menyala terus.
//
// KENAPA HP DAN TABLET TIDAK BOLEH MEMAKAI JALUR SIAGA. Bukan pilihan gaya;
// jalur siaga MEMANG TIDAK BEKERJA di sana, dan itu persis keluhan yang
// membuat berkas ini ditulis ulang. Tiga sebabnya, semuanya di luar kendali
// kita:
//
//   1. MIKROFONNYA DIREBUT. Jalur siaga membuka getUserMedia untuk mengukur
//      amplitudo suara, sementara SpeechRecognition juga butuh mikrofon. Di
//      komputer keduanya bisa berbagi. Di Android tidak: yang belakangan
//      meminta akan gagal diam-diam — tanpa galat, tanpa hasil, mikrofon
//      menyala tapi tidak ada satu kata pun yang pernah dikenali. Jadi di HP
//      analisis amplitudo TIDAK DINYALAKAN SAMA SEKALI, dan cincinnya
//      digerakkan denyut buatan.
//
//   2. `continuous` TIDAK ADA DI SAFARI iOS. Pengenalan berhenti sendiri
//      sesudah satu ucapan, dan menyalakannya lagi dari onend butuh tindakan
//      pengguna. Kata bangun yang menunggu selamanya mustahil di sana.
//
//   3. MENYALAKAN ULANG TERUS-MENERUS ITU MAHAL DI BATERAI, dan di Android
//      tiap kali mulai ada nada "tut" dari sistem. Halaman yang berbunyi tiap
//      lima detik tidak akan pernah dipakai orang.
//
// SATU SEBAB LAGI YANG PALING SERING TERJADI SAAT UJI COBA: HALAMANNYA DIBUKA
// LEWAT http:// DI ALAMAT IP. Peramban hanya memberi mikrofon kepada
// "secure context" — https, atau localhost. Di laptop, alamatnya localhost,
// jadi jalan. Di HP yang membuka http://192.168.x.x, `navigator.mediaDevices`
// bahkan TIDAK ADA, dan pengenalan suara ditolak sebelum sempat mulai. Itu
// sebabnya "cuma jalan di laptop". Keadaan ini sekarang dikenali dan
// dijelaskan apa adanya, bukan dibiarkan tampak seperti kerusakan.
//
// EMPAT HAL LAIN YANG DIPILIH SEJAK AWAL:
//
// 1. SUARANYA MEMAKAI KEMAMPUAN BAWAAN PERAMBAN — SpeechRecognition untuk
//    mendengar, speechSynthesis untuk menjawab. Tanpa pustaka, tanpa kunci API.
//    Peramban tanpa pengenalan suara TIDAK ditinggalkan — kotak ketik menempuh
//    jalur yang sama persis.
//
// 2. GEMA BERHENTI MENDENGAR SAAT DIRINYA BICARA. Tanpa itu ia menangkap
//    suaranya sendiri, mengira ada perintah baru, lalu menjawab lagi.
//
// 3. AMPLITUDO DITULIS KE CSS VARIABLE, BUKAN KE STATE REACT. Enam puluh
//    render per detik akan membuat halaman yang dibuka seharian jadi berat.
//
// 4. SIAGA BERHENTI SAAT TAB TIDAK TERLIHAT.
//
// Jawabannya SELALU dari basis data lewat /api/gema/tanya. Gema tidak pernah
// mengarang: di luar cakupan, ia bilang tidak tahu.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	Mic, MicOff, Keyboard, Sparkles, AlertCircle, Volume2, Loader2, Send, Ear,
	Check, ShieldAlert, KeyRound, RotateCcw, Lock, Hand,
} from 'lucide-react';
import api from '../../api';

const AmbilPengenalSuara = () =>
	(typeof window !== 'undefined'
		? window.SpeechRecognition || window.webkitSpeechRecognition
		: null);

/**
 * Kata bangun. Ditulis longgar karena pengenalan suara sering meleset tipis:
 * "halo gema" kerap terdengar "halo gemma", "hallo gema", bahkan "alo gema".
 */
const KATA_BANGUN = /\b(h?a?l+o+|hai|hei|hey|oke|ok)\s*,?\s*(gema|gemma|gima|jema)\b/i;

const KUNCI_SIAGA = 'gema-siaga';

/**
 * Ambang deteksi selesai bicara (khusus jalur siaga).
 *
 * Menunggu SpeechRecognition menyatakan hasilnya final terasa lambat — Chrome
 * kadang menahannya satu sampai dua detik setelah orangnya berhenti. Padahal
 * amplitudo mikrofon sudah tahu lebih dulu. Jadi akhir ucapan ditentukan dari
 * hening, dan hasil sementara langsung dicari; jalur `isFinal` tetap dipasang
 * sebagai cadangan, mana yang lebih dulu datang.
 */
const RMS_BICARA = 0.022;      // di atas ini dianggap ada suara orang
const HENING_SELESAI = 850;    // ms hening berturut-turut = ucapan selesai

/**
 * Berapa lama Gema tetap menunggu perintah lanjutan setelah menjawab.
 *
 * Dihitung dari HENING TERAKHIR, bukan dari saat fase dimulai — dan itu
 * pembedaan yang menentukan. Versi pertama memasang penjaga waktu sekali
 * saat fase dimulai dan tidak pernah menyetelnya ulang, sehingga penjaga itu
 * meletus di tengah kalimat orang yang sedang bertanya.
 */
const JEDA_PERINTAH = 15000;   // ms HENING di fase perintah = kembali siaga

/**
 * Batas jalur KETUK.
 *
 * Di HP tidak ada pengukur amplitudo yang bisa memberi tahu kapan orangnya
 * berhenti bicara (lihat catatan mikrofon direbut di kepala berkas), jadi
 * akhirnya ditentukan dua penjaga waktu: sekian lama tanpa kata baru berarti
 * selesai, dan ada batas keras supaya mikrofon tidak pernah tertinggal menyala.
 */
const KETUK_HENING = 1600;     // ms tanpa kata baru = ucapan selesai
const KETUK_MAKS = 15000;      // ms batas keras satu sesi dengar
// Jeda sebelum kata PERTAMA harus lebih longgar daripada jeda antar kata:
// orang biasanya mengangkat HP dulu, atau berpikir sebentar, sebelum mulai
// bicara. Memakai KETUK_HENING di sini membuat sesinya mati sebelum sempat
// dipakai — ketuk, diam sedetik setengah, tertutup.
const KETUK_MULAI = 6000;      // ms menunggu kata pertama

/**
 * Pengingat mikrofon menganggur (hanya jalur siaga).
 *
 * Halaman ini bisa ditinggal terbuka di komputer meja sementara orangnya rapat
 * di ruangan yang sama. Mikrofon yang menyala tanpa disadari itu mengganggu.
 * Di jalur ketuk pengingat ini tidak ada gunanya — mikrofonnya memang tidak
 * pernah menyala lama.
 */
const DIAM_TANYA = 60000;       // ms tanpa suara = munculkan pengingat
const DIAM_TANYA_LAGI = 300000; // ms, setelah pengguna memilih tetap menyalakan
const HITUNG_MUNDUR = 30;       // detik sebelum mikrofon dimatikan sendiri

/**
 * Model bahasa boleh berpikir lama; batas 30 detik bawaan klien api terlalu
 * pendek untuk pertanyaan yang butuh beberapa pencarian sekaligus, dan
 * putusnya terbaca pengguna sebagai "Gema rusak" padahal jawabannya sedang
 * disusun.
 */
const SABAR_MS = 90000;

const BALASAN_SAPAAN = [
	'Ya, saya dengar. Mau cari data apa?',
	'Halo! Sebutkan datanya, saya carikan.',
	'Siap. Data apa yang dicari?',
];

/* --------------------------------------------------------- lingkungan -- */

/**
 * Periksa apa yang benar-benar bisa dilakukan peramban INI, di alamat INI.
 *
 * Dipisah jadi fungsi sendiri karena hasilnya menentukan hampir semua perilaku
 * halaman — dan karena tiap pemeriksaannya menjawab satu keluhan nyata.
 */
const periksaLingkungan = () => {
	if (typeof window === 'undefined') {
		return { mode: 'ketik', alasan: 'tak-didukung', seluler: false, iOS: false };
	}

	const ua = navigator.userAgent || '';
	// iPadOS 13+ menyamar sebagai Mac. Satu-satunya pembedanya layar sentuh.
	const iOS = /iPad|iPhone|iPod/.test(ua)
		|| (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
	const android = /Android/i.test(ua);
	// Sentuh + layar sempit = perangkat genggam. Laptop layar sentuh tidak ikut
	// tertangkap karena lebarnya lolos batas.
	const sentuh = window.matchMedia?.('(pointer: coarse)')?.matches === true;
	const seluler = iOS || android || (sentuh && window.innerWidth < 1024);

	const konteksAman = window.isSecureContext === true;
	const adaPengenal = Boolean(AmbilPengenalSuara());
	const adaMik = Boolean(navigator.mediaDevices?.getUserMedia);

	// Urutan pemeriksaan ini penting: konteks tidak aman harus dilaporkan LEBIH
	// DULU, karena di situ semua kemampuan lain ikut hilang dan pesan "peramban
	// tidak mendukung" akan menyesatkan — perambannya mendukung, alamatnyalah
	// yang salah.
	if (!konteksAman) return { mode: 'ketik', alasan: 'tak-aman', seluler, iOS };
	if (!adaPengenal) return { mode: 'ketik', alasan: 'tak-didukung', seluler, iOS };
	if (seluler || !adaMik) return { mode: 'ketuk', alasan: null, seluler, iOS };
	return { mode: 'siaga', alasan: null, seluler, iOS };
};

/** Terjemahkan kode galat SpeechRecognition jadi kalimat yang bisa ditindaki. */
const jelaskanGalat = (kode) => {
	switch (kode) {
		case 'not-allowed':
		case 'service-not-allowed':
			return 'Akses mikrofon ditolak peramban. Izinkan di setelan situs, lalu coba lagi.';
		case 'audio-capture':
			return 'Mikrofon tidak terbaca. Pastikan tidak sedang dipakai aplikasi lain.';
		case 'network':
			return 'Pengenalan suara butuh internet dan sedang tidak bisa dihubungi. '
				+ 'Coba lagi, atau pakai kotak ketik di bawah.';
		case 'language-not-supported':
			return 'Peramban ini belum punya pengenalan suara bahasa Indonesia. Pakai kotak ketik ya.';
		default:
			return null; // 'no-speech' dan 'aborted' wajar, tidak perlu ditampilkan
	}
};

/* ------------------------------------------------------------- suara -- */

/**
 * Pilih suara terbaik yang tersedia untuk bahasa Indonesia.
 *
 * Daftar suara peramban terisi ASINKRON: pemanggilan pertama sering
 * mengembalikan array kosong, dan itulah sebabnya kalimat pertama kerap
 * terdengar memakai suara Inggris. Karena itu daftarnya dibaca ulang tiap kali.
 */
const pilihSuara = () => {
	const daftar = window.speechSynthesis?.getVoices?.() || [];
	if (!daftar.length) return null;
	return (
		daftar.find((v) => v.lang === 'id-ID' && v.localService)
		|| daftar.find((v) => v.lang === 'id-ID')
		|| daftar.find((v) => v.lang?.toLowerCase().startsWith('id'))
		|| null
	);
};

/**
 * Buka kunci pengucapan.
 *
 * INI PERBAIKAN HP YANG PALING MUDAH TERLEWAT. Android dan iOS menolak
 * speechSynthesis.speak() yang tidak berasal dari sentuhan pengguna — tanpa
 * galat apa pun, jawabannya cuma bisu. Karena Gema baru bicara SETELAH
 * menunggu balasan server, saat itu sentuhannya sudah lama lewat dan
 * pengucapannya diblokir.
 *
 * Penawarnya: pada sentuhan pertama, ucapkan sepotong kosong tanpa volume.
 * Sesudah itu peramban menganggap halaman ini sudah berhak bersuara, dan
 * jawaban berikutnya terdengar.
 */
const bukaKunciSuara = (sudah) => {
	if (sudah.current) return;
	const mesin = window.speechSynthesis;
	if (!mesin) return;
	try {
		const kosong = new SpeechSynthesisUtterance(' ');
		kosong.volume = 0;
		kosong.lang = 'id-ID';
		mesin.speak(kosong);
		sudah.current = true;
	} catch { /* peramban yang tidak mengizinkan pun tidak apa-apa */ }
};

/**
 * Ucapkan teks.
 *
 * Tiga penyakit speechSynthesis yang ditangani di sini:
 *
 *  1. Kalimat panjang terpotong di tengah. Chrome menghentikan pengucapan
 *     sekitar lima belas detik; penawarnya memanggil resume() berkala.
 *  2. onend kadang tidak pernah datang bila pengucapan gagal diam-diam. Ada
 *     penjaga waktu yang menutup jalur itu supaya Gema tidak tersangkut.
 *  3. Di iOS, cancel() yang langsung disusul speak() kadang membuat keduanya
 *     hilang. Karena itu speak() ditunda satu putaran.
 */
const ucapkan = (teks, saatSelesai) => {
	if (typeof window === 'undefined' || !window.speechSynthesis || !teks) {
		saatSelesai?.();
		return;
	}
	const mesin = window.speechSynthesis;
	mesin.cancel();

	const suara = new SpeechSynthesisUtterance(teks);
	suara.lang = 'id-ID';
	suara.rate = 1.03;
	suara.pitch = 1;

	const terpilih = pilihSuara();
	if (terpilih) suara.voice = terpilih;

	let selesai = false;
	// Ditandai true begitu speak() benar-benar dipanggil. Penjaga jeda tidak
	// boleh menyimpulkan "sudah selesai" dari mesin yang belum mulai bicara.
	let mulai = false;

	const tutup = () => {
		if (selesai) return;
		selesai = true;
		clearInterval(penjagaJeda);
		clearTimeout(penjagaWaktu);
		saatSelesai?.();
	};

	const penjagaJeda = setInterval(() => {
		if (mesin.speaking) mesin.resume();
		else if (mulai) tutup();
	}, 4000);

	// Perkiraan kasar: ~13 huruf per detik, ditambah margin lebar.
	const perkiraanMs = Math.min(30000, 2500 + (teks.length / 13) * 1000);
	const penjagaWaktu = setTimeout(tutup, perkiraanMs);

	suara.onend = tutup;
	suara.onerror = tutup;

	// Ditunda satu putaran: lihat penyakit nomor tiga di atas.
	setTimeout(() => { mulai = true; try { mesin.speak(suara); } catch { tutup(); } }, 60);
};

/* -------------------------------------------------------------- lingkaran -- */

/**
 * Lingkaran Gema. Cincinnya digerakkan variabel CSS `--tenaga` (0–1) yang
 * ditulis langsung ke DOM dari gelung amplitudo — bukan lewat state, supaya
 * siaga panjang tidak berarti render tanpa henti.
 */
const LingkaranGema = React.forwardRef(({ fase, onKlik, bisaDiketuk, modeKetuk }, ref) => {
	const mendengar = fase === 'siaga' || fase === 'perintah';
	const menunggu = fase === 'perintah';
	const sibuk = fase === 'berpikir';
	const bicara = fase === 'menjawab';

	return (
		<div
			ref={ref}
			className="relative flex h-56 w-56 items-center justify-center sm:h-72 sm:w-72"
			style={{ '--tenaga': 0 }}
		>
			{/* Dua cincin amplitudo. Skalanya dihitung di CSS dari --tenaga. */}
			<span
				aria-hidden="true"
				className="absolute h-full w-full rounded-full bg-slate-900/[0.06] transition-opacity duration-500"
				style={{
					transform: 'scale(calc(0.72 + var(--tenaga) * 0.3))',
					opacity: mendengar ? 1 : 0,
				}}
			/>
			<span
				aria-hidden="true"
				className="absolute h-[78%] w-[78%] rounded-full bg-slate-900/[0.09] transition-opacity duration-500"
				style={{
					transform: 'scale(calc(0.82 + var(--tenaga) * 0.22))',
					opacity: mendengar ? 1 : 0,
				}}
			/>

			{/* Cincin tipis penanda "sedang menunggu perintah" */}
			{menunggu && (
				<span
					aria-hidden="true"
					className="absolute h-[92%] w-[92%] animate-ping rounded-full border border-slate-900/20"
					style={{ animationDuration: '1.8s' }}
				/>
			)}

			{bicara && (
				<span
					aria-hidden="true"
					className="absolute h-[86%] w-[86%] animate-ping rounded-full bg-slate-900/10"
					style={{ animationDuration: '1.6s' }}
				/>
			)}

			{sibuk && (
				<svg
					aria-hidden="true"
					viewBox="0 0 100 100"
					className="absolute h-[88%] w-[88%] animate-spin"
					style={{ animationDuration: '1.1s' }}
				>
					<circle
						cx="50" cy="50" r="46" fill="none"
						stroke="currentColor" strokeWidth="2" strokeLinecap="round"
						strokeDasharray="70 220" className="text-slate-900/40"
					/>
				</svg>
			)}

			<button
				type="button"
				onClick={onKlik}
				disabled={!bisaDiketuk}
				aria-label={
					fase === 'mati'
						? (modeKetuk ? 'Ketuk untuk bicara' : 'Aktifkan Gema')
						: menunggu ? 'Gema mendengarkan' : 'Gema siaga'
				}
				// touch-manipulation membuang tunda 300 ms peramban seluler, dan
				// select-none mencegah teks ikut tersorot saat diketuk cepat.
				className={`relative flex h-28 w-28 touch-manipulation select-none items-center justify-center rounded-full text-white shadow-xl outline-none transition-[background-color,box-shadow,transform] duration-300 focus-visible:ring-4 focus-visible:ring-slate-900/20 sm:h-36 sm:w-36 ${
					fase === 'mati'
						? 'bg-slate-400 hover:bg-slate-500 active:scale-95'
						: 'bg-slate-900 shadow-slate-900/25'
				} ${bisaDiketuk ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
				style={{ transform: mendengar ? 'scale(calc(1 + var(--tenaga) * 0.05))' : undefined }}
			>
				{sibuk ? <Loader2 className="h-10 w-10 animate-spin sm:h-11 sm:w-11" />
					: bicara ? <Volume2 className="h-10 w-10 sm:h-11 sm:w-11" />
					: menunggu ? <Ear className="h-10 w-10 sm:h-11 sm:w-11" />
					: fase === 'mati' && modeKetuk ? <Mic className="h-11 w-11 sm:h-12 sm:w-12" />
					: fase === 'mati' ? <MicOff className="h-10 w-10 sm:h-11 sm:w-11" />
					: <Mic className="h-11 w-11 sm:h-12 sm:w-12" />}
			</button>
		</div>
	);
});
LingkaranGema.displayName = 'LingkaranGema';

/* ------------------------------------------------------------ popup izin -- */

/**
 * Popup izin mikrofon.
 *
 * Peramban TIDAK mengizinkan permintaan izin mikrofon muncul tanpa satu ketukan
 * pengguna. Yang bisa diatur adalah ketukan itu jatuh di mana. Kalau jatuh di
 * lingkaran mikrofon, orang menekan sesuatu yang belum menjelaskan apa-apa, lalu
 * kaget didatangi permintaan izin peramban. Di sini ketukan itu dipindahkan ke
 * tombol yang alasannya sudah dibaca lebih dulu.
 */
const PopupIzinMik = ({ onIzinkan, onNanti, sedangMeminta }) => {
	// Animasi masuknya memakai state + kelas transition, BUKAN `animate-in`.
	// Kelas itu milik tailwindcss-animate, dan plugin tersebut tidak terpasang di
	// proyek ini — dipakai di beberapa berkas lain tapi tidak pernah berefek.
	const [tampil, setTampil] = useState(false);
	useEffect(() => {
		const t = requestAnimationFrame(() => setTampil(true));
		return () => cancelAnimationFrame(t);
	}, []);

	return (
		// z-[60]+: laci navigasi CoreDashboardLayout memakai z-50 dan akan menelan
		// klik pada lapisan yang berada di bawahnya.
		<div
			className={`fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm transition-opacity duration-200 sm:items-center sm:p-4 ${
				tampil ? 'opacity-100' : 'opacity-0'
			}`}
		>
			<div
				role="dialog"
				aria-modal="true"
				aria-labelledby="judul-izin-gema"
				// pb-[env(safe-area-inset-bottom)]: di iPhone, batang beranda
				// menutupi tombol yang menempel di dasar layar.
				className={`w-full max-w-md overflow-hidden rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl transition duration-300 ease-out sm:rounded-3xl sm:pb-0 ${
					tampil ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.98] opacity-0'
				}`}
			>
			<div className="px-6 pb-2 pt-7 text-center">
				<div className="relative mx-auto flex h-20 w-20 items-center justify-center">
					<span aria-hidden="true" className="absolute h-full w-full rounded-full bg-slate-900/[0.06]" />
					<span aria-hidden="true" className="absolute h-[72%] w-[72%] rounded-full bg-slate-900/[0.09]" />
					<span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-white">
						<Mic className="h-7 w-7" />
					</span>
				</div>

				<h2 id="judul-izin-gema" className="mt-5 text-lg font-semibold tracking-tight text-slate-900">
					Izinkan Gema mendengar
				</h2>
				<p className="mt-2 text-sm leading-relaxed text-slate-600">
					Gema perlu akses mikrofon supaya bisa siaga menunggu ucapan
					<span className="font-semibold text-slate-900"> “Halo Gema”</span> — tanpa
					perlu menekan tombol apa pun setiap kali.
				</p>

				<ul className="mt-4 space-y-2 text-left">
					{[
						'Hanya aktif selama halaman ini terbuka',
						'Berhenti sendiri saat tab berpindah',
						'Bisa dimatikan kapan saja lewat tombol di bawah lingkaran',
					].map((t) => (
						<li key={t} className="flex items-start gap-2.5 text-xs text-slate-600">
							<Check className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-600" />
							{t}
						</li>
					))}
				</ul>
			</div>

				<div className="mt-5 flex gap-3 border-t border-slate-200 p-5">
					<button
						type="button"
						onClick={onNanti}
						className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
					>
						Nanti saja
					</button>
					<button
						type="button"
						onClick={onIzinkan}
						disabled={sedangMeminta}
						className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
					>
						{sedangMeminta && <Loader2 className="h-4 w-4 animate-spin" />}
						Izinkan
					</button>
				</div>
			</div>
		</div>
	);
};

/* --------------------------------------------------------- popup diam -- */

/**
 * Pengingat bahwa mikrofon masih menyala padahal sudah lama tidak dipakai.
 *
 * Hitung mundurnya bukan tekanan, melainkan jawaban untuk keadaan yang paling
 * mungkin: tidak ada orang di depan layar.
 */
const PopupDiam = ({ sisaDetik, onMatikan, onTetap }) => {
	const [tampil, setTampil] = useState(false);
	useEffect(() => {
		const t = requestAnimationFrame(() => setTampil(true));
		return () => cancelAnimationFrame(t);
	}, []);

	return (
		<div
			className={`fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm transition-opacity duration-200 sm:items-center sm:p-4 ${
				tampil ? 'opacity-100' : 'opacity-0'
			}`}
		>
			<div
				role="alertdialog"
				aria-modal="true"
				aria-labelledby="judul-diam-gema"
				className={`w-full max-w-md overflow-hidden rounded-t-3xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl transition duration-300 ease-out sm:rounded-3xl sm:pb-0 ${
					tampil ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-4 scale-[0.98] opacity-0'
				}`}
			>
				<div className="px-6 pb-2 pt-7 text-center">
					<div className="relative mx-auto flex h-20 w-20 items-center justify-center">
						{/* Cincin hitung mundur: berkurang searah jarum jam. */}
						<svg viewBox="0 0 100 100" className="absolute h-full w-full -rotate-90" aria-hidden="true">
							<circle cx="50" cy="50" r="46" fill="none" stroke="#f1f5f9" strokeWidth="6" />
							<circle
								cx="50" cy="50" r="46" fill="none"
								stroke="#0f172a" strokeWidth="6" strokeLinecap="round"
								strokeDasharray={2 * Math.PI * 46}
								strokeDashoffset={2 * Math.PI * 46 * (1 - sisaDetik / HITUNG_MUNDUR)}
								className="transition-[stroke-dashoffset] duration-1000 ease-linear"
							/>
						</svg>
						<span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-700">
							<Mic className="h-6 w-6" />
						</span>
					</div>

					<h2 id="judul-diam-gema" className="mt-5 text-lg font-semibold tracking-tight text-slate-900">
						Mikrofon masih menyala
					</h2>
					<p className="mt-2 text-sm leading-relaxed text-slate-600">
						Gema sudah satu menit tidak mendengar apa pun. Kalau kamu sedang tidak
						memakainya, sebaiknya dimatikan supaya tidak mengganggu orang lain di
						ruangan.
					</p>
					<p className="mt-3 text-sm font-medium text-slate-900">
						Dimatikan otomatis dalam {sisaDetik} detik
					</p>
				</div>

				<div className="mt-5 flex gap-3 border-t border-slate-200 p-5">
					<button
						type="button"
						onClick={onTetap}
						className="flex-1 rounded-xl border border-slate-200 py-3 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
					>
						Tetap nyalakan
					</button>
					<button
						type="button"
						onClick={onMatikan}
						className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
					>
						<MicOff className="h-4 w-4" />
						Matikan
					</button>
				</div>
			</div>
		</div>
	);
};

/* ------------------------------------------------------------------ utama -- */

const JUDUL_FASE = {
	mati: 'Aktifkan Gema untuk mulai mendengarkan',
	siaga: 'Ucapkan “Halo Gema”',
	perintah: 'Saya dengar — sebutkan datanya',
	berpikir: 'Mencari datanya…',
	menjawab: 'Gema menjawab',
};

const JUDUL_FASE_KETUK = {
	...JUDUL_FASE,
	mati: 'Ketuk lingkaran, lalu bicara',
	perintah: 'Silakan bicara…',
};

const CATATAN_FASE = {
	mati: 'Sekali diizinkan, Gema langsung siaga sendiri di kunjungan berikutnya.',
	siaga: 'Gema siaga. Tidak perlu menekan apa pun.',
	perintah: 'Berhenti bicara sebentar, Gema langsung mencari. Mis. “cari data desa berstatus mandiri”.',
	berpikir: 'Sedang membaca data sistem…',
	menjawab: 'Ketuk lingkaran untuk menghentikan suara.',
};

const CATATAN_FASE_KETUK = {
	...CATATAN_FASE,
	mati: 'Di HP dan tablet, mikrofon hanya menyala saat diketuk — jadi tidak boros baterai.',
	perintah: 'Berhenti bicara sebentar, Gema langsung mencari. Ketuk lagi untuk berhenti.',
	menjawab: 'Ketuk lingkaran untuk menghentikan suara.',
};

const GemaPage = () => {
	const [fase, setFase] = useState('mati');
	const [transkrip, setTranskrip] = useState('');
	const [jawaban, setJawaban] = useState(null);
	// Tindakan yang mengubah data (sejauh ini: setel ulang sandi akun pegawai)
	// tidak pernah jalan dari ucapan — ia menunggu tombol ini ditekan.
	const [konfirmasiJalan, setKonfirmasiJalan] = useState(false);
	const [galat, setGalat] = useState(null);
	const [saran, setSaran] = useState([]);
	const [modelAktif, setModelAktif] = useState(false);
	const [modeKetik, setModeKetik] = useState(false);
	const [mintaIzin, setMintaIzin] = useState(false);
	const [sedangMeminta, setSedangMeminta] = useState(false);
	const [popupDiam, setPopupDiam] = useState(false);
	const [sisaDetik, setSisaDetik] = useState(HITUNG_MUNDUR);
	const [ketikan, setKetikan] = useState('');
	const [riwayat, setRiwayat] = useState([]);
	// Berapa giliran yang sudah diingat server untuk sesi ini. Dipakai untuk
	// memberi tahu pengguna bahwa Gema masih memegang konteks percakapan.
	const [giliran, setGiliran] = useState(0);

	const lingkaranRef = useRef(null);
	const pengenalRef = useRef(null);
	const streamRef = useRef(null);
	const audioRef = useRef(null);
	const rafRef = useRef(0);
	const suaraDibukaRef = useRef(false);

	/**
	 * Id percakapan. Dibuat sekali per kunjungan halaman dan dikirim di tiap
	 * pertanyaan; server memakainya untuk mengingat giliran sebelumnya, sehingga
	 * "kalau yang maju berapa?" punya rujukan.
	 */
	const sesiRef = useRef(
		(typeof crypto !== 'undefined' && crypto.randomUUID)
			? crypto.randomUUID()
			: `gema-${Date.now()}-${Math.random().toString(36).slice(2)}`
	);

	// Kemampuan perangkat diperiksa SEKALI. Hasilnya menentukan seluruh perilaku
	// halaman, jadi ia tidak boleh berubah-ubah di tengah pemakaian.
	const lingkungan = useMemo(periksaLingkungan, []);
	const modeKetuk = lingkungan.mode === 'ketuk';
	const bisaSuara = lingkungan.mode !== 'ketik';

	// Penangan SpeechRecognition dipasang sekali dan hidup lama, jadi tidak boleh
	// membaca state langsung — nilainya akan terkunci di render pertama.
	const faseRef = useRef('mati');
	const siagaRef = useRef(false);
	const jedaRef = useRef(false); // true selama Gema bicara

	// Dipakai deteksi selesai bicara pada jalur siaga.
	const transkripRef = useRef('');       // ucapan terbaru, termasuk yang belum final
	const pernahBicaraRef = useRef(false); // sudah ada suara di ucapan ini?
	const heningSejakRef = useRef(0);      // kapan hening mulai
	const abaikanFinalRef = useRef(false); // sudah ditangani lewat hening

	// Jalur ketuk: dua penjaga waktu pengganti pengukur amplitudo.
	const ketukHeningRef = useRef(0);
	const ketukMaksRef = useRef(0);
	const dengarKetukRef = useRef(false);

	// Pengingat mikrofon menganggur.
	const aktivitasRef = useRef(Date.now());     // kapan terakhir ada suara/perintah
	const ambangDiamRef = useRef(DIAM_TANYA);    // memanjang setelah "tetap nyalakan"
	const popupDiamRef = useRef(false);

	const setFasa = useCallback((f) => { faseRef.current = f; setFase(f); }, []);

	useEffect(() => {
		api.get('/gema/kemampuan')
			.then((r) => {
				setSaran((r.data?.data || []).map((k) => k.contoh));
				setModelAktif(Boolean(r.data?.model_aktif));
			})
			.catch(() => setSaran([]));
		window.speechSynthesis?.getVoices();
	}, []);

	// Peramban tanpa suara langsung dibukakan kotak ketiknya. Halaman yang cuma
	// menampilkan lingkaran mati dan pesan galat itu jalan buntu; kotak ketik
	// menempuh jalur yang sama persis dan tetap berguna.
	useEffect(() => {
		if (lingkungan.mode !== 'ketik') return;
		setModeKetik(true);
		setGalat(
			lingkungan.alasan === 'tak-aman'
				? 'Halaman ini dibuka lewat koneksi yang tidak aman (http). Peramban hanya '
					+ 'memberikan akses mikrofon di alamat https atau localhost — itulah sebabnya '
					+ 'suara jalan di komputer tapi tidak di HP. Buka lewat alamat https-nya, atau '
					+ 'pakai kotak ketik di bawah; jawabannya sama persis.'
				: 'Peramban ini belum mendukung pengenalan suara. Kotak ketik di bawah menempuh '
					+ 'jalur yang sama persis.'
		);
	}, [lingkungan]);

	/* ------------------------------------------------------- amplitudo -- */

	const tulisTenaga = (v) => {
		lingkaranRef.current?.style.setProperty('--tenaga', String(v));
	};

	const hentikanAudio = useCallback(() => {
		cancelAnimationFrame(rafRef.current);
		rafRef.current = 0;
		tulisTenaga(0);
		streamRef.current?.getTracks?.().forEach((t) => t.stop());
		streamRef.current = null;
		audioRef.current?.close?.().catch(() => {});
		audioRef.current = null;
	}, []);

	/**
	 * Denyut buatan untuk jalur ketuk.
	 *
	 * Di HP kita sengaja TIDAK membuka mikrofon untuk mengukur amplitudo — itu
	 * yang merebut mikrofon dari pengenalan suara. Tapi lingkaran yang diam
	 * membuat orang ragu apakah Gema benar-benar mendengar, jadi cincinnya
	 * digerakkan gelombang halus. Ia jujur menandakan "sedang mendengar", bukan
	 * berpura-pura mengukur suara.
	 */
	const mulaiDenyut = useCallback(() => {
		cancelAnimationFrame(rafRef.current);
		const awal = performance.now();
		const langkah = (kini) => {
			const t = (kini - awal) / 1000;
			tulisTenaga(0.25 + 0.2 * (0.5 + 0.5 * Math.sin(t * 3.2)));
			rafRef.current = requestAnimationFrame(langkah);
		};
		rafRef.current = requestAnimationFrame(langkah);
	}, []);

	const hentikanDenyut = useCallback(() => {
		cancelAnimationFrame(rafRef.current);
		rafRef.current = 0;
		tulisTenaga(0);
	}, []);

	const mulaiAmplitudo = useCallback(async () => {
		if (audioRef.current) return true;
		if (!navigator.mediaDevices?.getUserMedia) return false;
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;

			const Konteks = window.AudioContext || window.webkitAudioContext;
			const konteks = new Konteks();
			audioRef.current = konteks;
			// Konteks audio yang dibuat di luar sentuhan pengguna lahir dalam
			// keadaan 'suspended'; tanpa resume() gelung di bawah membaca nol
			// terus dan deteksi selesai bicara tidak pernah menyala.
			if (konteks.state === 'suspended') await konteks.resume().catch(() => {});

			const penganalisis = konteks.createAnalyser();
			penganalisis.fftSize = 512;
			konteks.createMediaStreamSource(stream).connect(penganalisis);

			const buffer = new Uint8Array(penganalisis.fftSize);
			let terakhir = 0;
			const langkah = () => {
				penganalisis.getByteTimeDomainData(buffer);
				let jumlah = 0;
				for (let i = 0; i < buffer.length; i += 1) {
					const d = (buffer[i] - 128) / 128;
					jumlah += d * d;
				}
				const rms = Math.sqrt(jumlah / buffer.length);

				// Akar kuadrat menaikkan bisikan tanpa membuat teriakan meledak.
				const nilai = Math.min(1, Math.sqrt(rms * 4));
				// Hanya tulis kalau berubah cukup berarti — hemat kerja tata letak.
				if (Math.abs(nilai - terakhir) > 0.01) { tulisTenaga(nilai); terakhir = nilai; }

				// ── Deteksi selesai bicara ──────────────────────────────────
				// Tidak berlaku selama Gema sendiri yang bicara, dan hanya di fase
				// yang memang menunggu ucapan.
				const fasaKini = faseRef.current;
				const menunggu = fasaKini === 'siaga' || fasaKini === 'perintah';
				if (!jedaRef.current && menunggu) {
					const kini = performance.now();
					if (rms >= RMS_BICARA) {
						aktivitasRef.current = Date.now();
						pernahBicaraRef.current = true;
						heningSejakRef.current = 0;
						abaikanFinalRef.current = false;
					} else if (pernahBicaraRef.current) {
						if (!heningSejakRef.current) heningSejakRef.current = kini;
						else if (kini - heningSejakRef.current >= HENING_SELESAI) {
							const ucapan = transkripRef.current.trim();
							pernahBicaraRef.current = false;
							heningSejakRef.current = 0;
							if (ucapan) {
								abaikanFinalRef.current = true;
								transkripRef.current = '';
								prosesUcapanRef.current(ucapan);
							}
						}
					}
				}

				rafRef.current = requestAnimationFrame(langkah);
			};
			rafRef.current = requestAnimationFrame(langkah);
			return true;
		} catch {
			return false;
		}
	}, []);

	/* ------------------------------------------------------------ tanya -- */

	const tanyakan = useCallback(async (teks) => {
		const bersih = String(teks || '').trim();
		if (!bersih) return;

		setTranskrip('');
		aktivitasRef.current = Date.now();
		setRiwayat((r) => [{ peran: 'orang', teks: bersih, waktu: Date.now() }, ...r].slice(0, 8));
		setFasa('berpikir');
		setGalat(null);

		// Gema tidak boleh mendengar suaranya sendiri.
		jedaRef.current = true;

		const selesaiBicara = () => {
			jedaRef.current = false;
			if (modeKetuk) {
				// Di jalur ketuk mikrofonnya memang tidak menyala; kembali menunggu
				// ketukan berikutnya. Menyalakan sendiri di sini akan membuat HP
				// mendengarkan tanpa diminta.
				setFasa('mati');
				return;
			}
			// Kembali MENUNGGU PERINTAH, bukan ke kata bangun: pertanyaan lanjutan
			// ("kalau yang maju berapa?") jadi wajar tanpa menyapa ulang.
			setFasa(siagaRef.current ? 'perintah' : 'mati');
		};

		try {
			const r = await api.post(
				'/gema/tanya',
				{ teks: bersih, sesi: sesiRef.current },
				{ timeout: SABAR_MS },
			);
			const d = r.data?.data;
			setJawaban(d);
			if (typeof d?.giliran === 'number') setGiliran(d.giliran);
			setRiwayat((h) => [{ peran: 'gema', teks: d?.kalimat, waktu: Date.now() }, ...h].slice(0, 8));
			setFasa('menjawab');
			ucapkan(d?.kalimat, selesaiBicara);
		} catch (e) {
			const pesan = e.code === 'ECONNABORTED'
				? 'Gema kelamaan mencarinya. Coba pertanyaan yang lebih sempit ya.'
				: (e.response?.data?.message || 'Gema gagal mengambil datanya');
			setGalat(pesan);
			setFasa('menjawab');
			ucapkan(pesan, selesaiBicara);
		}
	}, [modeKetuk, setFasa]);

	/**
	 * Satu-satunya pintu masuk ucapan, dipakai beberapa jalur sekaligus: deteksi
	 * hening, penjaga waktu ketuk, dan hasil final dari peramban. Mana pun yang
	 * datang lebih dulu menang; yang belakangan diabaikan lewat `abaikanFinalRef`.
	 */
	const prosesUcapanRef = useRef(() => {});

	const sapaBalik = useCallback(() => {
		const balas = BALASAN_SAPAAN[Math.floor(Math.random() * BALASAN_SAPAAN.length)];
		setRiwayat((r) => [{ peran: 'gema', teks: balas, waktu: Date.now() }, ...r].slice(0, 8));
		jedaRef.current = true;
		setFasa('menjawab');
		ucapkan(balas, () => {
			jedaRef.current = false;
			// Setelah menyapa, Gema menunggu perintah — bukan kembali ke kata bangun.
			setFasa(siagaRef.current ? 'perintah' : 'mati');
		});
	}, [setFasa]);

	/**
	 * Langkah kedua tindakan yang mengubah data. Sengaja lewat tombol, bukan
	 * lewat ucapan "ya": salah dengar pada langkah ini tidak bisa dibatalkan.
	 */
	const jalankanKonfirmasi = useCallback(async () => {
		const tiket = jawaban?.konfirmasi;
		if (!tiket || konfirmasiJalan) return;

		setKonfirmasiJalan(true);
		jedaRef.current = true;
		setFasa('berpikir');

		const selesaiBicara = () => {
			jedaRef.current = false;
			setFasa(modeKetuk ? 'mati' : (siagaRef.current ? 'perintah' : 'mati'));
		};

		try {
			const r = await api.post('/gema/konfirmasi', { token: tiket.token, aksi: tiket.aksi });
			const d = r.data?.data;
			setJawaban(d);
			setRiwayat((h) => [{ peran: 'gema', teks: d?.kalimat, waktu: Date.now() }, ...h].slice(0, 8));
			setFasa('menjawab');
			ucapkan(d?.kalimat, selesaiBicara);
		} catch (e) {
			const pesan = e.response?.data?.message || 'Gema gagal menjalankan tindakannya';
			setGalat(pesan);
			setFasa('menjawab');
			ucapkan(pesan, selesaiBicara);
		} finally {
			setKonfirmasiJalan(false);
		}
	}, [jawaban, konfirmasiJalan, modeKetuk, setFasa]);

	const batalkanKonfirmasi = useCallback(() => {
		setJawaban((j) => (j ? { ...j, konfirmasi: null } : j));
	}, []);

	/* ------------------------------------------------------- pengenalan -- */

	// Isi sebenarnya dari prosesUcapan. Ditaruh di ref supaya penangan
	// SpeechRecognition dan gelung rAF — yang keduanya dipasang sekali dan hidup
	// lama — selalu memanggil versi terbaru, bukan yang terkunci di render awal.
	useEffect(() => {
		prosesUcapanRef.current = (teks) => {
			const ucapan = String(teks || '').trim();
			if (!ucapan || jedaRef.current) return;

			// Ada ucapan = jendela perintah diperpanjang.
			aktivitasRef.current = Date.now();

			// Jalur ketuk: mikrofon dibuka justru KARENA orangnya menekan tombol,
			// jadi tidak ada kata bangun yang perlu diperiksa. Apa pun yang
			// terdengar memang ditujukan kepada Gema.
			if (modeKetuk) {
				const sisa = ucapan.replace(KATA_BANGUN, '').replace(/^[\s,.]+/, '').trim();
				if (sisa.length >= 2) tanyakan(sisa);
				else setTranskrip('');
				return;
			}

			if (faseRef.current === 'siaga') {
				// Bukan untuk Gema — halaman ini akan terbuka di ruangan berisi
				// orang mengobrol, jadi diam adalah jawaban yang benar.
				if (!KATA_BANGUN.test(ucapan)) { setTranskrip(''); return; }

				// "Halo Gema, cari data desa mandiri" — sisanya langsung dicari.
				const sisa = ucapan.replace(KATA_BANGUN, '').replace(/^[\s,.]+/, '').trim();
				if (sisa.length >= 3) tanyakan(sisa);
				else sapaBalik();
				return;
			}

			if (faseRef.current === 'perintah') {
				const sisa = ucapan.replace(KATA_BANGUN, '').replace(/^[\s,.]+/, '').trim();
				if (sisa.length >= 3) { tanyakan(sisa); return; }
				// Terlalu pendek untuk jadi perintah; tetap menunggu.
				setTranskrip('');
			}
		};
	}, [modeKetuk, sapaBalik, tanyakan]);

	// Penanda deteksi hening dinolkan tiap pergantian fase; tanpa ini sisa
	// ucapan lama bisa langsung memicu pencarian begitu fase berganti.
	useEffect(() => {
		pernahBicaraRef.current = false;
		heningSejakRef.current = 0;
		transkripRef.current = '';
		if (fase === 'perintah') aktivitasRef.current = Date.now();
	}, [fase]);

	/* ---------------------------------------------------------- ketuk -- */

	/**
	 * Tutup satu sesi dengar di jalur ketuk, lalu kirim apa yang tertangkap.
	 *
	 * Dipanggil dari tiga arah: penjaga waktu hening, batas keras, dan ketukan
	 * kedua pengguna. Ketiganya boleh datang bersamaan, jadi penjaga
	 * `dengarKetukRef` memastikan isinya hanya dikirim sekali.
	 */
	const tutupDengarKetuk = useCallback((kirim = true) => {
		if (!dengarKetukRef.current) return;
		dengarKetukRef.current = false;
		clearTimeout(ketukHeningRef.current);
		clearTimeout(ketukMaksRef.current);
		hentikanDenyut();

		try { pengenalRef.current?.stop(); } catch { /* sudah berhenti */ }

		const ucapan = transkripRef.current.trim();
		transkripRef.current = '';

		if (kirim && ucapan) {
			abaikanFinalRef.current = true;
			prosesUcapanRef.current(ucapan);
		} else if (faseRef.current === 'perintah') {
			setTranskrip('');
			setFasa('mati');
		}
	}, [hentikanDenyut, setFasa]);

	const tundaHeningKetuk = useCallback((jeda = KETUK_HENING) => {
		clearTimeout(ketukHeningRef.current);
		ketukHeningRef.current = setTimeout(() => tutupDengarKetuk(true), jeda);
	}, [tutupDengarKetuk]);

	/* ------------------------------------------------- pasang pengenal -- */

	const pasangPengenal = useCallback(() => {
		const Pengenal = AmbilPengenalSuara();
		if (!Pengenal) return null;

		const pengenal = new Pengenal();
		pengenal.lang = 'id-ID';
		// `continuous` TIDAK dinyalakan di jalur ketuk. Di Safari iOS ia memang
		// tidak didukung, dan di jalur ketuk pun tidak ada gunanya: satu ketukan
		// berarti satu ucapan.
		pengenal.continuous = !modeKetuk;
		pengenal.interimResults = true;
		pengenal.maxAlternatives = 1;

		pengenal.onresult = (ev) => {
			if (jedaRef.current) return;

			let sementara = '';
			let final = '';
			for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
				const potongan = ev.results[i][0].transcript;
				if (ev.results[i].isFinal) final += potongan;
				else sementara += potongan;
			}

			const tampak = (final || sementara).trim();
			setTranskrip(tampak);
			// Disimpan ke ref juga: deteksi hening membacanya dari dalam gelung
			// rAF, dan hasil SEMENTARA sudah cukup untuk dicari.
			if (tampak) transkripRef.current = tampak;

			// Jalur ketuk: tiap kata baru menunda penutupan. Tanpa pengukur
			// amplitudo, kedatangan kata inilah satu-satunya tanda orangnya
			// masih bicara. Di luar sesi dengar yang terbuka, hasil apa pun
			// diabaikan — termasuk hasil final yang menyusul setelah sesi
			// ditutup, yang kalau diteruskan akan mengirim pertanyaan dua kali.
			if (modeKetuk) {
				if (!dengarKetukRef.current) return;
				if (tampak) tundaHeningKetuk();
				if (final.trim()) tutupDengarKetuk(true);
				return;
			}

			if (!final) return;

			// Sudah ditangani deteksi hening lebih dulu — jangan dikerjakan dua kali.
			if (abaikanFinalRef.current) { abaikanFinalRef.current = false; return; }

			transkripRef.current = '';
			pernahBicaraRef.current = false;
			heningSejakRef.current = 0;
			prosesUcapanRef.current(final.trim());
		};

		pengenal.onerror = (ev) => {
			const pesan = jelaskanGalat(ev.error);

			if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
				siagaRef.current = false;
				dengarKetukRef.current = false;
				try { localStorage.removeItem(KUNCI_SIAGA); } catch { /* abaikan */ }
				hentikanAudio();
				hentikanDenyut();
				setFasa('mati');
				setGalat(pesan);
				return;
			}

			// Galat yang tidak bisa diperbaiki dengan mencoba lagi: hentikan, dan
			// tawarkan kotak ketik. Menyalakan ulang terus-menerus di sini hanya
			// menghasilkan lingkaran yang berkedip tanpa pernah mendengar apa pun
			// — persis yang terjadi di HP dengan jaringan buruk.
			if (ev.error === 'network' || ev.error === 'language-not-supported' || ev.error === 'audio-capture') {
				dengarKetukRef.current = false;
				clearTimeout(ketukHeningRef.current);
				clearTimeout(ketukMaksRef.current);
				hentikanDenyut();
				if (modeKetuk) setFasa('mati');
				setGalat(pesan);
				setModeKetik(true);
				return;
			}

			// 'no-speech' dan 'aborted' wajar terjadi saat siaga panjang —
			// onend yang akan menyalakannya kembali.
		};

		// Chrome menghentikan pengenalan sendiri setelah sunyi cukup lama. Di
		// jalur siaga ia dinyalakan lagi — inilah yang membuatnya terasa "selalu
		// mendengar". Di jalur ketuk TIDAK: berhenti memang akhir yang benar,
		// dan menyalakan ulang di HP berarti nada "tut" berulang dan baterai
		// terkuras.
		pengenal.onend = () => {
			if (modeKetuk) {
				// Peramban seluler kerap menutup sendiri begitu orangnya berhenti,
				// sebelum penjaga waktu kita sempat jalan. Kirim yang sudah ada.
				if (dengarKetukRef.current) tutupDengarKetuk(true);
				return;
			}
			if (!siagaRef.current) return;
			setTimeout(() => {
				if (!siagaRef.current) return;
				try { pengenal.start(); } catch { /* sudah jalan */ }
			}, 350);
		};

		return pengenal;
	}, [hentikanAudio, hentikanDenyut, modeKetuk, setFasa, tundaHeningKetuk, tutupDengarKetuk]);

	/* -------------------------------------------------- nyala & matikan -- */

	const nyalakanSiaga = useCallback(async () => {
		if (!bisaSuara) { setModeKetik(true); return; }
		setGalat(null);

		const dapatMik = await mulaiAmplitudo();
		if (!dapatMik) {
			setGalat('Mikrofon tidak bisa diakses. Periksa izin situs di peramban.');
			return;
		}

		if (!pengenalRef.current) pengenalRef.current = pasangPengenal();
		siagaRef.current = true;
		// Menyalakan ulang berarti mulai dari nol: ambang tegur kembali satu menit.
		ambangDiamRef.current = DIAM_TANYA;
		aktivitasRef.current = Date.now();
		try { localStorage.setItem(KUNCI_SIAGA, '1'); } catch { /* abaikan */ }

		setFasa('siaga');
		try { pengenalRef.current?.start(); } catch { /* sudah jalan */ }
	}, [bisaSuara, mulaiAmplitudo, pasangPengenal, setFasa]);

	const matikanSiaga = useCallback(() => {
		siagaRef.current = false;
		// Popup diam tidak boleh tertinggal di layar kalau mikrofonnya dimatikan
		// lewat jalur lain — tombol di bawah lingkaran, misalnya.
		popupDiamRef.current = false;
		setPopupDiam(false);
		try { localStorage.removeItem(KUNCI_SIAGA); } catch { /* abaikan */ }
		try { pengenalRef.current?.stop(); } catch { /* sudah berhenti */ }
		window.speechSynthesis?.cancel();
		hentikanAudio();
		setTranskrip('');
		setFasa('mati');
	}, [hentikanAudio, setFasa]);

	/**
	 * Mulai satu sesi dengar di jalur ketuk.
	 *
	 * Semua yang butuh "tindakan pengguna" di mata peramban dikerjakan DI SINI,
	 * di dalam penangan sentuhan: membuka kunci pengucapan, dan memulai
	 * pengenalan suara. Menundanya ke dalam await mana pun berarti kehilangan
	 * status tindakan pengguna, dan di HP keduanya akan diblokir diam-diam.
	 */
	const mulaiDengarKetuk = useCallback(() => {
		if (dengarKetukRef.current) { tutupDengarKetuk(true); return; }

		bukaKunciSuara(suaraDibukaRef);
		setGalat(null);
		setTranskrip('');
		transkripRef.current = '';

		// PENGENAL BARU TIAP SESI, bukan satu yang dipakai ulang. Peramban
		// seluler — Safari iOS paling parah — sering menolak start() pada objek
		// yang baru saja berhenti, dan ketukan kedua pengguna berakhir tanpa
		// apa-apa. Objek baru selalu bersedia.
		//
		// Penangan objek lama dilepas SEBELUM dibatalkan: abort() memicu onend,
		// dan onend milik objek lama akan menutup sesi baru yang baru saja
		// dibuka kalau ia masih terpasang.
		const lama = pengenalRef.current;
		if (lama) {
			lama.onresult = null;
			lama.onerror = null;
			lama.onend = null;
			try { lama.abort(); } catch { /* sudah berhenti */ }
		}

		pengenalRef.current = pasangPengenal();
		if (!pengenalRef.current) { setModeKetik(true); return; }

		dengarKetukRef.current = true;
		aktivitasRef.current = Date.now();
		setFasa('perintah');
		mulaiDenyut();

		try {
			pengenalRef.current.start();
		} catch {
			// start() dua kali berturut-turut melempar; berarti sudah jalan.
		}

		tundaHeningKetuk(KETUK_MULAI);
		clearTimeout(ketukMaksRef.current);
		ketukMaksRef.current = setTimeout(() => tutupDengarKetuk(true), KETUK_MAKS);
	}, [mulaiDenyut, pasangPengenal, setFasa, tundaHeningKetuk, tutupDengarKetuk]);

	/* --------------------------------------------------- saat halaman buka -- */

	// Jalur SIAGA saja. Keadaan izin mikrofon menentukan:
	//
	//   granted → Gema langsung siaga, tanpa apa pun yang perlu diketuk.
	//   prompt  → popup izin dimunculkan sendiri; ketukan "Izinkan" itulah
	//             tindakan penggunanya.
	//   denied  → tidak ada gunanya bertanya lagi; yang ditampilkan cara
	//             menyalakannya kembali.
	//
	// Jalur KETUK sengaja tidak ikut: di HP, meminta izin mikrofon sebelum
	// orangnya menyatakan mau bicara itu mengganggu, dan izinnya akan diminta
	// peramban sendiri pada ketukan pertama.
	useEffect(() => {
		if (lingkungan.mode !== 'siaga') return undefined;

		let batal = false;
		(async () => {
			let keadaanIzin = null;
			try {
				const izin = await navigator.permissions?.query({ name: 'microphone' });
				keadaanIzin = izin?.state || null;
			} catch { /* peramban tanpa Permissions API untuk microphone */ }
			if (batal) return;

			if (keadaanIzin === 'granted') { nyalakanSiaga(); return; }

			if (keadaanIzin === 'denied') {
				setGalat('Akses mikrofon diblokir peramban. Buka ikon gembok di bilah alamat, izinkan Mikrofon, lalu muat ulang halaman.');
				return;
			}

			// 'prompt' atau tidak diketahui — tawarkan lewat popup.
			setMintaIzin(true);
		})();
		return () => { batal = true; };
	}, [lingkungan, nyalakanSiaga]);

	// Tab tersembunyi: mikrofon dan gelung animasi dihentikan. Di jalur ketuk,
	// sesi dengar yang sedang jalan ditutup — HP yang dimasukkan saku tidak boleh
	// meninggalkan mikrofon menyala.
	useEffect(() => {
		const saatBerubah = () => {
			if (document.hidden) {
				if (dengarKetukRef.current) tutupDengarKetuk(false);
				if (siagaRef.current) {
					try { pengenalRef.current?.stop(); } catch { /* abaikan */ }
					cancelAnimationFrame(rafRef.current);
					rafRef.current = 0;
					tulisTenaga(0);
				}
				window.speechSynthesis?.cancel();
			} else if (siagaRef.current && !rafRef.current) {
				mulaiAmplitudo();
				try { pengenalRef.current?.start(); } catch { /* sudah jalan */ }
			}
		};
		document.addEventListener('visibilitychange', saatBerubah);
		return () => document.removeEventListener('visibilitychange', saatBerubah);
	}, [mulaiAmplitudo, tutupDengarKetuk]);

	// Meninggalkan halaman: mikrofon dan suara tidak boleh terus hidup.
	useEffect(() => () => {
		siagaRef.current = false;
		dengarKetukRef.current = false;
		clearTimeout(ketukHeningRef.current);
		clearTimeout(ketukMaksRef.current);
		try { pengenalRef.current?.abort(); } catch { /* abaikan */ }
		hentikanAudio();
		window.speechSynthesis?.cancel();
	}, [hentikanAudio]);

	const ketukLingkaran = () => {
		// Menghentikan suara selalu jadi arti ketukan saat Gema sedang bicara,
		// di kedua jalur — orang menekan lingkaran justru untuk menyela.
		if (fase === 'menjawab') {
			window.speechSynthesis?.cancel();
			jedaRef.current = false;
			setFasa(modeKetuk ? 'mati' : (siagaRef.current ? 'siaga' : 'mati'));
			return;
		}

		if (modeKetuk) {
			if (fase === 'mati' || fase === 'perintah') mulaiDengarKetuk();
			return;
		}

		if (fase === 'mati') {
			bukaKunciSuara(suaraDibukaRef);
			setMintaIzin(true);
		}
	};

	/* ------------------------------------------------- pengingat diam -- */

	const tandaiAktif = useCallback(() => {
		aktivitasRef.current = Date.now();
		if (popupDiamRef.current) {
			popupDiamRef.current = false;
			setPopupDiam(false);
		}
	}, []);

	// Pengawas: tiap detik memeriksa apakah sudah cukup lama tidak ada suara.
	// Hanya berlaku di jalur siaga — di jalur ketuk mikrofonnya tidak pernah
	// tertinggal menyala, jadi tidak ada yang perlu ditegur.
	useEffect(() => {
		if (modeKetuk) return undefined;

		const jam = setInterval(() => {
			if (!siagaRef.current) return;
			// Selama Gema sibuk atau bicara, jelas sedang dipakai.
			if (jedaRef.current || faseRef.current === 'berpikir') {
				aktivitasRef.current = Date.now();
				return;
			}

			// Jendela perintah lanjutan ditutup hanya setelah benar-benar hening
			// selama JEDA_PERINTAH. Selama masih ada suara, aktivitasRef terus
			// diperbarui gelung amplitudo, jadi jendelanya ikut memanjang sendiri.
			if (faseRef.current === 'perintah'
				&& Date.now() - aktivitasRef.current >= JEDA_PERINTAH) {
				setTranskrip('');
				setFasa('siaga');
				return;
			}
			if (popupDiamRef.current) return;
			if (Date.now() - aktivitasRef.current < ambangDiamRef.current) return;

			popupDiamRef.current = true;
			setSisaDetik(HITUNG_MUNDUR);
			setPopupDiam(true);
		}, 1000);
		return () => clearInterval(jam);
	}, [modeKetuk, setFasa]);

	// Hitung mundur popup. Habis waktunya = tidak ada orang di depan layar,
	// jadi mikrofon dimatikan.
	useEffect(() => {
		if (!popupDiam) return undefined;
		const jam = setInterval(() => {
			setSisaDetik((d) => {
				if (d <= 1) {
					clearInterval(jam);
					popupDiamRef.current = false;
					setPopupDiam(false);
					matikanSiaga();
					return 0;
				}
				return d - 1;
			});
		}, 1000);
		return () => clearInterval(jam);
	}, [popupDiam, matikanSiaga]);

	const matikanDariPopup = () => {
		popupDiamRef.current = false;
		setPopupDiam(false);
		matikanSiaga();
	};

	const tetapNyalakan = () => {
		// Jangan menegur tiap menit setelah dijawab sekali.
		ambangDiamRef.current = DIAM_TANYA_LAGI;
		tandaiAktif();
	};

	const izinkanMik = async () => {
		setSedangMeminta(true);
		// Klik tombol ini yang menjadi tindakan pengguna di mata peramban;
		// getUserMedia di dalam nyalakanSiaga baru boleh memunculkan permintaan
		// izin karena dipanggil dari sini. Pengucapan pun dibuka di sini.
		bukaKunciSuara(suaraDibukaRef);
		await nyalakanSiaga();
		setSedangMeminta(false);
		setMintaIzin(false);
	};

	const tundaIzin = () => {
		setMintaIzin(false);
		// Tanpa mikrofon, kotak ketik langsung dibuka supaya halamannya tetap
		// berguna — bukan layar mati yang menunggu izin.
		setModeKetik(true);
	};

	/** Buang ingatan percakapan dan mulai dari awal. */
	const mulaiPercakapanBaru = useCallback(async () => {
		const lama = sesiRef.current;
		// Id baru dipasang lebih dulu supaya pertanyaan yang dikirim tepat setelah
		// tombol ini ditekan sudah masuk ke percakapan yang bersih, tidak menunggu
		// balasan server.
		sesiRef.current = (typeof crypto !== 'undefined' && crypto.randomUUID)
			? crypto.randomUUID()
			: `gema-${Date.now()}-${Math.random().toString(36).slice(2)}`;

		setRiwayat([]);
		setJawaban(null);
		setGalat(null);
		setGiliran(0);

		try { await api.post('/gema/lupakan', { sesi: lama }); }
		catch { /* server yang lupa sendiri sesudah 30 menit pun tidak apa-apa */ }
	}, []);

	/* ------------------------------------------------------------ render -- */

	const judulFase = modeKetuk ? JUDUL_FASE_KETUK : JUDUL_FASE;
	const catatanFase = modeKetuk ? CATATAN_FASE_KETUK : CATATAN_FASE;
	const sedangDengar = fase === 'siaga' || fase === 'perintah';

	return (
		// pt-20 di layar sempit menyisakan ruang untuk tombol menu melayang milik
		// CoreDashboardLayout (fixed, kiri atas); tanpa itu ia menimpa judul.
		<div className="min-h-screen bg-slate-50 px-3 pb-12 pt-20 sm:px-6 sm:pb-10 lg:px-8 lg:pt-8">
			{mintaIzin && (
				<PopupIzinMik
					onIzinkan={izinkanMik}
					onNanti={tundaIzin}
					sedangMeminta={sedangMeminta}
				/>
			)}

			{popupDiam && (
				<PopupDiam
					sisaDetik={sisaDetik}
					onMatikan={matikanDariPopup}
					onTetap={tetapNyalakan}
				/>
			)}

			<div className="mx-auto max-w-5xl">
				<section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white">
					<div className="flex flex-col items-center px-4 py-8 sm:px-5 sm:py-14">
						<div className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
							<span className="inline-flex items-center gap-2">
								<Sparkles className="h-3.5 w-3.5" />
								Gema · Purwarupa
							</span>
							{modelAktif && (
								<span className="text-slate-400">· paham kalimat bebas</span>
							)}
							{sedangDengar && (
								<span className="flex items-center gap-1 text-emerald-600">
									<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
									{modeKetuk ? 'Mendengar' : 'Siaga'}
								</span>
							)}
						</div>

						<p
							aria-live="polite"
							className={`mt-5 min-h-[3.5rem] max-w-2xl text-center text-lg font-semibold leading-snug tracking-tight sm:text-2xl ${
								transkrip ? 'text-slate-900' : 'text-slate-400'
							}`}
						>
							{transkrip || judulFase[fase]}
						</p>

						<LingkaranGema
							ref={lingkaranRef}
							fase={fase}
							onKlik={ketukLingkaran}
							modeKetuk={modeKetuk}
							bisaDiketuk={
								bisaSuara
								&& (fase === 'mati' || fase === 'menjawab' || (modeKetuk && fase === 'perintah'))
							}
						/>

						<p className="mt-1 max-w-md text-center text-sm text-slate-500">
							{catatanFase[fase]}
						</p>

						<div className="mt-5 flex flex-wrap items-center justify-center gap-2">
							{!modeKetuk && fase !== 'mati' && (
								<button
									type="button"
									onClick={matikanSiaga}
									className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
								>
									<MicOff className="h-3.5 w-3.5" />
									Matikan mikrofon
								</button>
							)}
							{modeKetuk && fase === 'perintah' && (
								<button
									type="button"
									onClick={() => tutupDengarKetuk(true)}
									className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
								>
									<Hand className="h-3.5 w-3.5" />
									Selesai bicara
								</button>
							)}
							<button
								type="button"
								onClick={() => setModeKetik((v) => !v)}
								className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
							>
								<Keyboard className="h-3.5 w-3.5" />
								{modeKetik ? 'Sembunyikan kotak ketik' : 'Ketik saja'}
							</button>
							{giliran > 0 && (
								<button
									type="button"
									onClick={mulaiPercakapanBaru}
									className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
								>
									<RotateCcw className="h-3.5 w-3.5" />
									Percakapan baru
								</button>
							)}
						</div>

						{giliran > 0 && (
							<p className="mt-3 text-center text-xs text-slate-400">
								Gema masih ingat {giliran} pertanyaan sebelumnya — lanjutkan saja dengan
								“kalau yang maju berapa?” atau “bandingkan dengan Jonggol”.
							</p>
						)}

						{modeKetik && (
							<form
								onSubmit={(e) => { e.preventDefault(); tanyakan(ketikan); setKetikan(''); }}
								className="mt-3 flex w-full max-w-xl gap-2"
							>
								<input
									value={ketikan}
									onChange={(e) => setKetikan(e.target.value)}
									placeholder="mis. cari data desa berstatus mandiri"
									// text-base (16px) bukan text-sm: Safari iOS memperbesar
									// seluruh halaman sendiri kalau huruf kotak isian di bawah
									// 16px, dan tata letaknya jadi berantakan.
									className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3.5 py-2.5 text-base outline-none focus:border-slate-900 sm:text-sm"
								/>
								<button
									type="submit"
									className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
								>
									<Send className="h-4 w-4" />
									<span className="hidden sm:inline">Tanya</span>
								</button>
							</form>
						)}

						{modeKetuk && (
							<p className="mt-4 max-w-xl text-center text-xs leading-relaxed text-slate-500">
								Di HP dan tablet, Gema memakai mode ketuk: kata bangun “Halo Gema” tidak
								tersedia karena peramban seluler tidak mengizinkan mikrofon menyala terus.
								Hasil jawabannya sama persis.
							</p>
						)}
					</div>
				</section>

				{galat && (
					<div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
						{lingkungan.alasan === 'tak-aman'
							? <Lock className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
							: <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />}
						<p className="text-sm leading-relaxed text-amber-800">{galat}</p>
					</div>
				)}

				{saran.length > 0 && !jawaban && (
					<div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
							{modelAktif ? 'Coba tanyakan apa saja, misalnya' : 'Yang sudah bisa ditanyakan'}
						</p>
						<div className="mt-3 flex flex-wrap gap-2">
							{saran.map((s) => (
								<button
									key={s}
									type="button"
									onClick={() => { bukaKunciSuara(suaraDibukaRef); tanyakan(s); }}
									className="rounded-full border border-slate-200 px-3.5 py-2 text-sm text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
								>
									{s}
								</button>
							))}
						</div>
					</div>
				)}

				{jawaban && (
					<div className="mt-5 space-y-4">
						<div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
							<div className="flex items-start gap-3">
								<span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
									<Sparkles className="h-4 w-4" />
								</span>
								<div className="min-w-0">
									{jawaban.judul && (
										<p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
											{jawaban.judul}
										</p>
									)}
									<p className="text-base font-semibold leading-snug text-slate-900">
										{jawaban.kalimat}
									</p>
									{/* Pengguna berhak tahu siapa yang menyusun kalimatnya.
									    'mesin-cadangan' artinya model gagal dipanggil dan
									    Gema jatuh ke pencarian deterministik — jawabannya
									    tetap benar, pemahamannya saja yang lebih kaku. */}
									{jawaban.ditenagai === 'mesin-cadangan' && (
										<p className="mt-1 text-xs text-amber-700">
											Model bahasa tidak bisa dihubungi — dijawab pencarian langsung.
										</p>
									)}
									{jawaban.total > 0 && (
										<p className="mt-1 text-xs text-slate-500">
											{jawaban.baris.length < jawaban.total
												? `Menampilkan ${jawaban.baris.length} dari ${jawaban.total} baris`
												: `${jawaban.total} baris`}
										</p>
									)}
								</div>
							</div>

						{/* Tindakan yang mengubah data berhenti di sini sampai ditekan.
						    Ditaruh di atas rincian supaya yang dibaca lebih dulu adalah
						    APA yang akan terjadi, bukan profil orangnya. */}
						{jawaban.konfirmasi && (
							<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
								<div className="flex items-start gap-3">
									<span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
										<ShieldAlert className="h-4 w-4" />
									</span>
									<div className="min-w-0">
										<p className="text-sm font-semibold text-amber-900">Perlu konfirmasi Anda</p>
										<p className="mt-1 text-sm leading-6 text-amber-800">
											{jawaban.konfirmasi.peringatan}
										</p>
										{jawaban.konfirmasi.akun && (
											<p className="mt-1 text-xs text-amber-700">
												{jawaban.konfirmasi.akun.nama} · {jawaban.konfirmasi.akun.email}
											</p>
										)}
									</div>
								</div>
								<div className="mt-3 flex flex-wrap gap-2">
									<button
										type="button"
										onClick={jalankanKonfirmasi}
										disabled={konfirmasiJalan}
										className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-60"
									>
										{konfirmasiJalan
											? <Loader2 className="h-4 w-4 animate-spin" />
											: <KeyRound className="h-4 w-4" />}
										{jawaban.konfirmasi.label || 'Ya, lanjutkan'}
									</button>
									<button
										type="button"
										onClick={batalkanKonfirmasi}
										disabled={konfirmasiJalan}
										className="rounded-lg border border-amber-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-60"
									>
										Batal
									</button>
								</div>
							</div>
						)}

						{/* Jawaban tentang SATU hal — rapor desa atau kecamatan — digambar
						    sebagai daftar rincian, bukan tabel satu baris. */}
						{jawaban.rincian?.length > 0 && (
							<dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-3">
								{jawaban.rincian.map((r) => (
									<div key={r.label}>
										<dt className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
											{r.label}
										</dt>
										<dd className="mt-0.5 text-sm font-medium text-slate-900">{r.nilai}</dd>
									</div>
								))}
							</dl>
						)}

						{jawaban.saran?.length > 0 && (
								<div className="mt-4 border-t border-slate-100 pt-4">
									<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
										Lanjutkan dengan
									</p>
									<div className="mt-2 flex flex-wrap gap-2">
										{jawaban.saran.map((s) => (
											<button
												key={s}
												type="button"
												onClick={() => { bukaKunciSuara(suaraDibukaRef); tanyakan(s); }}
												className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-700 transition-colors hover:bg-slate-50"
											>
												{s}
											</button>
										))}
									</div>
								</div>
							)}
						</div>

						{jawaban.baris?.length > 0 && (
							<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
								<div className="max-h-[28rem] overflow-auto">
									<table className="w-full min-w-[36rem]">
										<thead className="sticky top-0 bg-slate-50">
											<tr className="border-b border-slate-200 text-left">
												{jawaban.kolom.map((k) => (
													<th key={k.kunci} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
														{k.label}
													</th>
												))}
											</tr>
										</thead>
										<tbody className="divide-y divide-slate-100">
											{jawaban.baris.map((b, i) => (
												<tr key={i} className="transition-colors hover:bg-slate-50">
													{jawaban.kolom.map((k) => (
														<td key={k.kunci} className="px-4 py-2.5 text-sm text-slate-700">
															{b[k.kunci] ?? '—'}
														</td>
													))}
												</tr>
											))}
										</tbody>
									</table>
								</div>
							</div>
						)}
					</div>
				)}

				{riwayat.length > 0 && (
					<div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
						<div className="flex items-center justify-between gap-3">
							<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Percakapan</p>
							<button
								type="button"
								onClick={mulaiPercakapanBaru}
								className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900"
							>
								<RotateCcw className="h-3.5 w-3.5" />
								Mulai baru
							</button>
						</div>
						<ul className="mt-3 space-y-2.5">
							{riwayat.map((r) => (
								<li key={r.waktu + r.peran} className="flex gap-2.5 text-sm">
									<span
										className={`mt-0.5 flex-shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
											r.peran === 'gema' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
										}`}
									>
										{r.peran === 'gema' ? 'Gema' : 'Anda'}
									</span>
									<span className="text-slate-700">{r.teks}</span>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>
		</div>
	);
};

export default GemaPage;
