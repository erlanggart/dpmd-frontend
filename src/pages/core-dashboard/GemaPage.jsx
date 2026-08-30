// src/pages/core-dashboard/GemaPage.jsx
//
// Gema — asisten suara Core Dashboard. Purwarupa.
//
// CARA KERJANYA SEPERTI SIRI: tidak ada tombol yang harus ditekan. Begitu izin
// mikrofon diberikan, Gema siaga terus dan menunggu kata bangun "Halo Gema".
// Sekali diizinkan, kunjungan berikutnya langsung siaga sendiri.
//
// SATU BATAS YANG TIDAK BISA DILEWATI: peramban wajib meminta izin mikrofon
// sekali, dan izin itu hanya bisa diminta lewat tindakan pengguna. Jadi ada satu
// ketukan di kunjungan pertama saja — sesudah itu tidak pernah lagi.
//
// EMPAT HAL YANG DIPILIH SEJAK AWAL, karena sulit diubah belakangan:
//
// 1. SUARANYA MEMAKAI KEMAMPUAN BAWAAN PERAMBAN — SpeechRecognition untuk
//    mendengar, speechSynthesis untuk menjawab. Tanpa pustaka, tanpa kunci API.
//    Konsekuensinya jujur: pengenalan suara baru ada di Chrome dan Edge, dan di
//    Chrome audionya diproses di server Google. Peramban lain TIDAK
//    ditinggalkan — kotak ketik menempuh jalur yang sama persis.
//
// 2. GEMA BERHENTI MENDENGAR SAAT DIRINYA BICARA. Tanpa itu ia menangkap
//    suaranya sendiri, mengira ada perintah baru, lalu menjawab lagi — berputar
//    tanpa henti.
//
// 3. AMPLITUDO DITULIS KE CSS VARIABLE, BUKAN KE STATE REACT. Siaga berarti
//    gelung ini hidup terus; enam puluh render per detik akan membuat halaman
//    yang dibuka seharian jadi berat. Nilainya masuk lewat ref, nol render.
//
// 4. SIAGA BERHENTI SAAT TAB TIDAK TERLIHAT. Mikrofon dan gelung animasi tidak
//    boleh jalan di latar belakang; keduanya hidup lagi begitu tabnya dibuka.
//
// Jawabannya SELALU dari basis data lewat /api/gema/tanya. Gema tidak pernah
// mengarang: di luar cakupan, ia bilang tidak tahu.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Keyboard, Sparkles, AlertCircle, Volume2, Loader2, Send, Ear, Check } from 'lucide-react';
import api from '../../api';

/* ----------------------------------------------------------------- utilitas -- */

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
 * Ambang deteksi selesai bicara.
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
 * meletus di tengah kalimat orang yang sedang bertanya: fase turun ke siaga,
 * ucapannya selesai tanpa kata bangun, lalu dibuang diam-diam. Akibatnya
 * setiap pertanyaan lanjutan harus diawali "Halo Gema" lagi.
 */
const JEDA_PERINTAH = 15000;   // ms HENING di fase perintah = kembali siaga

/**
 * Pengingat mikrofon menganggur.
 *
 * Halaman ini bisa ditinggal terbuka di komputer meja sementara orangnya rapat
 * di ruangan yang sama. Mikrofon yang menyala tanpa disadari itu mengganggu —
 * dan lampu mikrofon di bilah alamat peramban terlalu kecil untuk disadari.
 *
 * Setelah diam, Gema bertanya. Kalau pertanyaannya pun tidak dijawab, mikrofon
 * dimatikan sendiri: tidak ada yang di depan layar, dan membiarkannya menyala
 * adalah pilihan yang lebih buruk daripada mematikannya.
 */
const DIAM_TANYA = 60000;       // ms tanpa suara = munculkan pengingat
const DIAM_TANYA_LAGI = 300000; // ms, setelah pengguna memilih tetap menyalakan
const HITUNG_MUNDUR = 30;       // detik sebelum mikrofon dimatikan sendiri

const BALASAN_SAPAAN = [
	'Ya, saya dengar. Mau cari data apa?',
	'Halo! Sebutkan datanya, saya carikan.',
	'Siap. Data apa yang dicari?',
];

/**
 * Pilih suara terbaik yang tersedia untuk bahasa Indonesia.
 *
 * Daftar suara peramban terisi ASINKRON: pemanggilan pertama sering
 * mengembalikan array kosong, dan itulah sebabnya kalimat pertama kerap terdengar
 * memakai suara Inggris. Karena itu daftarnya dibaca ulang tiap kali, bukan
 * disimpan sekali di awal.
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
 * Ucapkan teks.
 *
 * Dua penyakit speechSynthesis yang ditangani di sini:
 *
 *  1. Kalimat panjang terpotong di tengah. Chrome menghentikan pengucapan
 *     sekitar lima belas detik; penawarnya memanggil resume() berkala selama
 *     masih berbicara.
 *  2. onend kadang tidak pernah datang bila pengucapan gagal diam-diam. Ada
 *     penjaga waktu yang menutup jalur itu supaya Gema tidak tersangkut selamanya
 *     di fase "menjawab" dan berhenti mendengar.
 */
const ucapkan = (teks, saatSelesai) => {
	if (typeof window === 'undefined' || !window.speechSynthesis || !teks) {
		saatSelesai?.();
		return;
	}
	window.speechSynthesis.cancel();

	const suara = new SpeechSynthesisUtterance(teks);
	suara.lang = 'id-ID';
	suara.rate = 1.03;
	suara.pitch = 1;

	const terpilih = pilihSuara();
	if (terpilih) suara.voice = terpilih;

	let selesai = false;
	const tutup = () => {
		if (selesai) return;
		selesai = true;
		clearInterval(penjagaJeda);
		clearTimeout(penjagaWaktu);
		saatSelesai?.();
	};

	const penjagaJeda = setInterval(() => {
		if (window.speechSynthesis.speaking) window.speechSynthesis.resume();
		else tutup();
	}, 4000);

	// Perkiraan kasar: ~13 huruf per detik, ditambah margin lebar.
	const perkiraanMs = Math.min(30000, 2500 + (teks.length / 13) * 1000);
	const penjagaWaktu = setTimeout(tutup, perkiraanMs);

	suara.onend = tutup;
	suara.onerror = tutup;
	window.speechSynthesis.speak(suara);
};

/* -------------------------------------------------------------- lingkaran -- */

/**
 * Lingkaran Gema. Cincinnya digerakkan variabel CSS `--tenaga` (0–1) yang
 * ditulis langsung ke DOM dari gelung amplitudo — bukan lewat state, supaya
 * siaga panjang tidak berarti render tanpa henti.
 */
const LingkaranGema = React.forwardRef(({ fase, onKlik, bisaDiketuk }, ref) => {
	const mendengar = fase === 'siaga' || fase === 'perintah';
	const menunggu = fase === 'perintah';
	const sibuk = fase === 'berpikir';
	const bicara = fase === 'menjawab';

	return (
		<div
			ref={ref}
			className="relative flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72"
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
					fase === 'mati' ? 'Aktifkan Gema' : menunggu ? 'Gema menunggu perintah' : 'Gema siaga'
				}
				className={`relative flex h-32 w-32 items-center justify-center rounded-full text-white shadow-xl outline-none transition-[background-color,box-shadow,transform] duration-300 focus-visible:ring-4 focus-visible:ring-slate-900/20 sm:h-36 sm:w-36 ${
					fase === 'mati'
						? 'bg-slate-400 hover:-translate-y-0.5 hover:bg-slate-500'
						: 'bg-slate-900 shadow-slate-900/25'
				} ${bisaDiketuk ? 'cursor-pointer' : 'cursor-default'}`}
				style={{ transform: mendengar ? 'scale(calc(1 + var(--tenaga) * 0.05))' : undefined }}
			>
				{sibuk ? <Loader2 className="h-11 w-11 animate-spin" />
					: bicara ? <Volume2 className="h-11 w-11" />
					: menunggu ? <Ear className="h-11 w-11" />
					: fase === 'mati' ? <MicOff className="h-11 w-11" />
					: <Mic className="h-12 w-12" />}
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
 * tombol yang alasannya sudah dibaca lebih dulu — pola yang sama dipakai aplikasi
 * sebelum meminta izin lokasi.
 *
 * Karena itu popup ini muncul SENDIRI saat halaman dibuka, bukan setelah ditekan.
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
		// z-[60]+: bilah navigasi bawah PegawaiLayout memakai z-50 dan akan menelan
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
				className={`w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl transition duration-300 ease-out sm:rounded-3xl ${
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
						className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
					>
						Nanti saja
					</button>
					<button
						type="button"
						onClick={onIzinkan}
						disabled={sedangMeminta}
						className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
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
 * mungkin: tidak ada orang di depan layar. Kalau memang ada, satu ketukan
 * membatalkannya dan Gema tidak bertanya lagi selama lima menit.
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
				className={`w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl transition duration-300 ease-out sm:rounded-3xl ${
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
						className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
					>
						Tetap nyalakan
					</button>
					<button
						type="button"
						onClick={onMatikan}
						className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
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

const CATATAN_FASE = {
	mati: 'Sekali diizinkan, Gema langsung siaga sendiri di kunjungan berikutnya.',
	siaga: 'Gema siaga. Tidak perlu menekan apa pun.',
	perintah: 'Berhenti bicara sebentar, Gema langsung mencari. Mis. “cari data desa berstatus mandiri”.',
	berpikir: 'Sedang membaca data sistem…',
	menjawab: 'Ketuk lingkaran untuk menghentikan suara.',
};

const GemaPage = () => {
	const [fase, setFase] = useState('mati');
	const [transkrip, setTranskrip] = useState('');
	const [jawaban, setJawaban] = useState(null);
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

	const lingkaranRef = useRef(null);
	const pengenalRef = useRef(null);
	const streamRef = useRef(null);
	const audioRef = useRef(null);
	const rafRef = useRef(0);

	// Penangan SpeechRecognition dipasang sekali dan hidup lama, jadi tidak boleh
	// membaca state langsung — nilainya akan terkunci di render pertama.
	const faseRef = useRef('mati');
	const siagaRef = useRef(false);
	const jedaRef = useRef(false); // true selama Gema bicara

	// Dipakai deteksi selesai bicara. Semuanya ref karena dibaca di dalam gelung
	// requestAnimationFrame yang tidak pernah dipasang ulang.
	const transkripRef = useRef('');       // ucapan terbaru, termasuk yang belum final
	const pernahBicaraRef = useRef(false); // sudah ada suara di ucapan ini?
	const heningSejakRef = useRef(0);      // kapan hening mulai
	const abaikanFinalRef = useRef(false); // sudah ditangani lewat hening

	// Pengingat mikrofon menganggur.
	const aktivitasRef = useRef(Date.now());     // kapan terakhir ada suara/perintah
	const ambangDiamRef = useRef(DIAM_TANYA);    // memanjang setelah "tetap nyalakan"
	const popupDiamRef = useRef(false);

	const didukung = useMemo(() => Boolean(AmbilPengenalSuara()), []);

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

	const mulaiAmplitudo = useCallback(async () => {
		if (audioRef.current) return true;
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;

			const Konteks = window.AudioContext || window.webkitAudioContext;
			const konteks = new Konteks();
			audioRef.current = konteks;

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
			// Kembali MENUNGGU PERINTAH, bukan ke kata bangun: pertanyaan lanjutan
			// ("kalau yang maju berapa?") jadi wajar tanpa menyapa ulang. Tidak
			// menggantung — penjaga waktu JEDA_PERINTAH mengembalikannya ke siaga.
			setFasa(siagaRef.current ? 'perintah' : 'mati');
		};

		try {
			const r = await api.post('/gema/tanya', { teks: bersih });
			const d = r.data?.data;
			setJawaban(d);
			setRiwayat((h) => [{ peran: 'gema', teks: d?.kalimat, waktu: Date.now() }, ...h].slice(0, 8));
			setFasa('menjawab');
			ucapkan(d?.kalimat, selesaiBicara);
		} catch (e) {
			const pesan = e.response?.data?.message || 'Gema gagal mengambil datanya';
			setGalat(pesan);
			setFasa('menjawab');
			ucapkan(pesan, selesaiBicara);
		}
	}, [setFasa]);

	/**
	 * Satu-satunya pintu masuk ucapan, dipakai dua jalur sekaligus: deteksi
	 * hening dan hasil final dari peramban. Mana pun yang datang lebih dulu
	 * menang; yang belakangan diabaikan lewat `abaikanFinalRef`.
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

	/* ------------------------------------------------------- pengenalan -- */

	// Isi sebenarnya dari prosesUcapan. Ditaruh di ref supaya penangan
	// SpeechRecognition dan gelung rAF — yang keduanya dipasang sekali dan hidup
	// lama — selalu memanggil versi terbaru, bukan yang terkunci di render awal.
	useEffect(() => {
		prosesUcapanRef.current = (teks) => {
			const ucapan = String(teks || '').trim();
			if (!ucapan || jedaRef.current) return;

			// Ada ucapan = jendela perintah diperpanjang. Pengawas satu detik
			// membaca penanda yang sama, jadi cukup disetel di sini.
			aktivitasRef.current = Date.now();

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
	}, [sapaBalik, tanyakan]);

	// Penanda deteksi hening dinolkan tiap pergantian fase; tanpa ini sisa
	// ucapan lama bisa langsung memicu pencarian begitu fase berganti.
	//
	// Penjaga waktu fase perintah TIDAK dipasang di sini. Sebelumnya iya, dan
	// itulah sumber bug "harus bilang Halo Gema lagi": penjaga waktu sekali
	// pasang meletus di tengah kalimat penanya. Sekarang batas waktunya diperiksa
	// pengawas satu detik sekali terhadap HENING TERAKHIR, jadi selama orangnya
	// masih bicara jendelanya tidak pernah tertutup.
	useEffect(() => {
		pernahBicaraRef.current = false;
		heningSejakRef.current = 0;
		transkripRef.current = '';
		// Masuk fase perintah = titik nol hitungan hening.
		if (fase === 'perintah') aktivitasRef.current = Date.now();
	}, [fase]);

	const pasangPengenal = useCallback(() => {
		const Pengenal = AmbilPengenalSuara();
		if (!Pengenal) return null;

		const pengenal = new Pengenal();
		pengenal.lang = 'id-ID';
		pengenal.continuous = true;
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

			if (!final) return;

			// Sudah ditangani deteksi hening lebih dulu — jangan dikerjakan dua kali.
			if (abaikanFinalRef.current) { abaikanFinalRef.current = false; return; }

			transkripRef.current = '';
			pernahBicaraRef.current = false;
			heningSejakRef.current = 0;
			prosesUcapanRef.current(final.trim());
		};

		pengenal.onerror = (ev) => {
			if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
				siagaRef.current = false;
				try { localStorage.removeItem(KUNCI_SIAGA); } catch { /* abaikan */ }
				hentikanAudio();
				setFasa('mati');
				setGalat('Akses mikrofon ditolak peramban. Izinkan di setelan situs, lalu aktifkan lagi.');
			}
			// 'no-speech' dan 'aborted' wajar terjadi saat siaga panjang —
			// onend yang akan menyalakannya kembali.
		};

		// Chrome menghentikan pengenalan sendiri setelah sunyi cukup lama. Selama
		// siaga masih menyala, dinyalakan lagi — inilah yang membuatnya terasa
		// "selalu mendengar".
		pengenal.onend = () => {
			if (!siagaRef.current) return;
			setTimeout(() => {
				if (!siagaRef.current) return;
				try { pengenal.start(); } catch { /* sudah jalan */ }
			}, 350);
		};

		return pengenal;
		// sapaBalik dan tanyakan tidak lagi disebut di sini: keduanya dipanggil
		// lewat prosesUcapanRef, yang selalu memegang versi terbaru.
	}, [hentikanAudio, setFasa]);

	const nyalakanSiaga = useCallback(async () => {
		if (!didukung) { setModeKetik(true); return; }
		setGalat(null);

		const dapatMik = await mulaiAmplitudo();
		if (!dapatMik) {
			setGalat('Mikrofon tidak bisa diakses. Periksa izin situs di peramban.');
			return;
		}

		if (!pengenalRef.current) pengenalRef.current = pasangPengenal();
		siagaRef.current = true;
		// Menyalakan ulang berarti mulai dari nol: ambang tegur kembali satu menit,
		// bukan lima menit warisan pilihan "tetap nyalakan" sebelumnya.
		ambangDiamRef.current = DIAM_TANYA;
		aktivitasRef.current = Date.now();
		try { localStorage.setItem(KUNCI_SIAGA, '1'); } catch { /* abaikan */ }

		setFasa('siaga');
		try { pengenalRef.current?.start(); } catch { /* sudah jalan */ }
	}, [didukung, mulaiAmplitudo, pasangPengenal, setFasa]);

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

	// Saat halaman dibuka, jalurnya ditentukan oleh keadaan izin mikrofon:
	//
	//   granted → Gema langsung siaga, tanpa apa pun yang perlu diketuk.
	//   prompt  → popup izin dimunculkan sendiri. Popup INILAH tindakan
	//             penggunanya; peramban tidak mengizinkan permintaan izin
	//             mikrofon muncul tanpa satu ketukan, jadi ketukan itu
	//             dipindahkan ke tombol "Izinkan" yang sudah menjelaskan
	//             alasannya — bukan ke lingkaran mikrofon yang tidak
	//             menjelaskan apa-apa.
	//   denied  → tidak ada gunanya bertanya lagi; peramban akan menolak diam-
	//             diam. Yang ditampilkan cara menyalakannya kembali.
	useEffect(() => {
		let batal = false;
		(async () => {
			if (!didukung) return;

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
	}, [didukung, nyalakanSiaga]);

	// Tab tersembunyi: mikrofon dan gelung animasi dihentikan, dinyalakan lagi
	// saat kembali terlihat.
	useEffect(() => {
		const saatBerubah = () => {
			if (document.hidden) {
				if (siagaRef.current) {
					try { pengenalRef.current?.stop(); } catch { /* abaikan */ }
					cancelAnimationFrame(rafRef.current);
					rafRef.current = 0;
					tulisTenaga(0);
				}
			} else if (siagaRef.current && !rafRef.current) {
				mulaiAmplitudo();
				try { pengenalRef.current?.start(); } catch { /* sudah jalan */ }
			}
		};
		document.addEventListener('visibilitychange', saatBerubah);
		return () => document.removeEventListener('visibilitychange', saatBerubah);
	}, [mulaiAmplitudo]);

	// Meninggalkan halaman: mikrofon dan suara tidak boleh terus hidup.
	useEffect(() => () => {
		siagaRef.current = false;
		try { pengenalRef.current?.abort(); } catch { /* abaikan */ }
		hentikanAudio();
		window.speechSynthesis?.cancel();
	}, [hentikanAudio]);

	const ketukLingkaran = () => {
		if (fase === 'mati') setMintaIzin(true);
		else if (fase === 'menjawab') {
			window.speechSynthesis?.cancel();
			jedaRef.current = false;
			setFasa(siagaRef.current ? 'siaga' : 'mati');
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
	// Sekali dipasang, hidup selama halaman terbuka; kerjanya ringan.
	useEffect(() => {
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
	}, [setFasa]);

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
		// izin karena dipanggil dari sini.
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

	/* ------------------------------------------------------------ render -- */

	return (
		<div className="min-h-screen bg-slate-50 p-4 pt-20 sm:p-6 lg:p-8 lg:pt-8">
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
					<div className="flex flex-col items-center px-5 py-10 sm:py-14">
						<div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
							<Sparkles className="h-3.5 w-3.5" />
							Gema · Purwarupa
							{modelAktif && (
								<span className="ml-1 text-slate-400">· paham kalimat bebas</span>
							)}
							{fase !== 'mati' && (
								<span className="ml-1 flex items-center gap-1 text-emerald-600">
									<span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
									Siaga
								</span>
							)}
						</div>

						<p
							aria-live="polite"
							className={`mt-5 min-h-[3.5rem] max-w-2xl text-center text-xl font-semibold leading-snug tracking-tight sm:text-2xl ${
								transkrip ? 'text-slate-900' : 'text-slate-400'
							}`}
						>
							{transkrip || JUDUL_FASE[fase]}
						</p>

						<LingkaranGema
							ref={lingkaranRef}
							fase={fase}
							onKlik={ketukLingkaran}
							bisaDiketuk={fase === 'mati' || fase === 'menjawab'}
						/>

						<p className="mt-1 max-w-md text-center text-sm text-slate-500">
							{CATATAN_FASE[fase]}
						</p>

						<div className="mt-5 flex flex-wrap items-center justify-center gap-2">
							{fase !== 'mati' && (
								<button
									type="button"
									onClick={matikanSiaga}
									className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
								>
									<MicOff className="h-3.5 w-3.5" />
									Matikan mikrofon
								</button>
							)}
							<button
								type="button"
								onClick={() => setModeKetik((v) => !v)}
								className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
							>
								<Keyboard className="h-3.5 w-3.5" />
								{modeKetik ? 'Sembunyikan kotak ketik' : 'Ketik saja'}
							</button>
						</div>

						{modeKetik && (
							<form
								onSubmit={(e) => { e.preventDefault(); tanyakan(ketikan); setKetikan(''); }}
								className="mt-3 flex w-full max-w-xl gap-2"
							>
								<input
									value={ketikan}
									onChange={(e) => setKetikan(e.target.value)}
									placeholder="mis. cari data desa berstatus mandiri"
									className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-slate-900"
								/>
								<button
									type="submit"
									className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
								>
									<Send className="h-4 w-4" />
									Tanya
								</button>
							</form>
						)}

						{!didukung && (
							<p className="mt-4 max-w-xl text-center text-xs leading-relaxed text-slate-500">
								Peramban ini belum mendukung pengenalan suara — kemampuan itu baru ada di
								Chrome dan Edge. Kotak ketik di atas menempuh jalur yang sama persis.
							</p>
						)}
					</div>
				</section>

				{galat && (
					<div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
						<AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
						<p className="text-sm text-amber-800">{galat}</p>
					</div>
				)}

				{saran.length > 0 && !jawaban && (
					<div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
							{modelAktif ? 'Coba tanyakan apa saja, misalnya' : 'Yang sudah bisa ditanyakan'}
						</p>
						<div className="mt-3 flex flex-wrap gap-2">
							{saran.map((s) => (
								<button
									key={s}
									type="button"
									onClick={() => tanyakan(s)}
									className="rounded-full border border-slate-200 px-3.5 py-1.5 text-sm text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
								>
									{s}
								</button>
							))}
						</div>
					</div>
				)}

				{jawaban && (
					<div className="mt-5 space-y-4">
						<div className="rounded-2xl border border-slate-200 bg-white p-5">
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
								<div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">
									{jawaban.saran.map((s) => (
										<button
											key={s}
											type="button"
											onClick={() => tanyakan(s)}
											className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-700 transition-colors hover:bg-slate-50"
										>
											{s}
										</button>
									))}
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
					<div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Percakapan</p>
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
