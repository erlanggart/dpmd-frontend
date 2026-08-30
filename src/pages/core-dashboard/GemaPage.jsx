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
import { Mic, MicOff, Keyboard, Sparkles, AlertCircle, Volume2, Loader2, Send, Ear } from 'lucide-react';
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

const BALASAN_SAPAAN = [
	'Ya, saya dengar. Mau cari data apa?',
	'Halo! Sebutkan datanya, saya carikan.',
	'Siap. Data apa yang dicari?',
];

/** Ucapkan teks dengan suara Indonesia bila tersedia. */
const ucapkan = (teks, saatSelesai) => {
	if (typeof window === 'undefined' || !window.speechSynthesis || !teks) {
		saatSelesai?.();
		return;
	}
	window.speechSynthesis.cancel();

	const suara = new SpeechSynthesisUtterance(teks);
	suara.lang = 'id-ID';
	suara.rate = 1.02;

	const indo = window.speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith('id'));
	if (indo) suara.voice = indo;

	suara.onend = () => saatSelesai?.();
	suara.onerror = () => saatSelesai?.();
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
	perintah: 'Misalnya: “cari data desa berstatus mandiri”.',
	berpikir: 'Sedang membaca data sistem…',
	menjawab: 'Ketuk lingkaran untuk menghentikan suara.',
};

const GemaPage = () => {
	const [fase, setFase] = useState('mati');
	const [transkrip, setTranskrip] = useState('');
	const [jawaban, setJawaban] = useState(null);
	const [galat, setGalat] = useState(null);
	const [saran, setSaran] = useState([]);
	const [modeKetik, setModeKetik] = useState(false);
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

	const didukung = useMemo(() => Boolean(AmbilPengenalSuara()), []);

	const setFasa = useCallback((f) => { faseRef.current = f; setFase(f); }, []);

	useEffect(() => {
		api.get('/gema/kemampuan')
			.then((r) => setSaran((r.data?.data || []).map((k) => k.contoh)))
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
				// Akar kuadrat menaikkan bisikan tanpa membuat teriakan meledak.
				const nilai = Math.min(1, Math.sqrt(Math.sqrt(jumlah / buffer.length) * 4));
				// Hanya tulis kalau berubah cukup berarti — hemat kerja tata letak.
				if (Math.abs(nilai - terakhir) > 0.01) { tulisTenaga(nilai); terakhir = nilai; }
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
		setRiwayat((r) => [{ peran: 'orang', teks: bersih, waktu: Date.now() }, ...r].slice(0, 8));
		setFasa('berpikir');
		setGalat(null);

		// Gema tidak boleh mendengar suaranya sendiri.
		jedaRef.current = true;

		const selesaiBicara = () => {
			jedaRef.current = false;
			setFasa(siagaRef.current ? 'siaga' : 'mati');
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
			setTranskrip((final || sementara).trim());
			if (!final) return;

			const teks = final.trim();

			if (faseRef.current === 'siaga') {
				if (!KATA_BANGUN.test(teks)) return; // bukan untuk Gema; abaikan
				// "Halo Gema, cari data desa mandiri" — sisanya langsung jadi perintah.
				const sisa = teks.replace(KATA_BANGUN, '').replace(/^[\s,.]+/, '').trim();
				if (sisa.length >= 3) tanyakan(sisa);
				else sapaBalik();
				return;
			}

			if (faseRef.current === 'perintah') {
				const sisa = teks.replace(KATA_BANGUN, '').replace(/^[\s,.]+/, '').trim();
				if (sisa.length >= 3) tanyakan(sisa);
			}
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
	}, [hentikanAudio, sapaBalik, setFasa, tanyakan]);

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
		try { localStorage.setItem(KUNCI_SIAGA, '1'); } catch { /* abaikan */ }

		setFasa('siaga');
		try { pengenalRef.current?.start(); } catch { /* sudah jalan */ }
	}, [didukung, mulaiAmplitudo, pasangPengenal, setFasa]);

	const matikanSiaga = useCallback(() => {
		siagaRef.current = false;
		try { localStorage.removeItem(KUNCI_SIAGA); } catch { /* abaikan */ }
		try { pengenalRef.current?.stop(); } catch { /* sudah berhenti */ }
		window.speechSynthesis?.cancel();
		hentikanAudio();
		setTranskrip('');
		setFasa('mati');
	}, [hentikanAudio, setFasa]);

	// Kunjungan berikutnya: kalau izin mikrofonnya sudah diberikan dan siaga
	// pernah dinyalakan, Gema hidup sendiri tanpa ketukan apa pun.
	useEffect(() => {
		let batal = false;
		(async () => {
			if (!didukung) return;
			let pernah = false;
			try { pernah = localStorage.getItem(KUNCI_SIAGA) === '1'; } catch { /* abaikan */ }
			if (!pernah) return;

			// Hanya menyalakan sendiri bila izinnya memang sudah 'granted';
			// kalau belum, memanggil getUserMedia di sini cuma memunculkan
			// permintaan izin yang tidak diminta pengguna.
			try {
				const izin = await navigator.permissions?.query({ name: 'microphone' });
				if (izin && izin.state !== 'granted') return;
			} catch { /* peramban tanpa Permissions API — coba saja */ }

			if (!batal) nyalakanSiaga();
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
		if (fase === 'mati') nyalakanSiaga();
		else if (fase === 'menjawab') {
			window.speechSynthesis?.cancel();
			jedaRef.current = false;
			setFasa(siagaRef.current ? 'siaga' : 'mati');
		}
	};

	/* ------------------------------------------------------------ render -- */

	return (
		<div className="min-h-screen bg-slate-50 p-4 pt-20 sm:p-6 lg:p-8 lg:pt-8">
			<div className="mx-auto max-w-5xl">
				<section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white">
					<div className="flex flex-col items-center px-5 py-10 sm:py-14">
						<div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
							<Sparkles className="h-3.5 w-3.5" />
							Gema · Purwarupa
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
							Yang sudah bisa ditanyakan
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
									<p className="text-base font-semibold leading-snug text-slate-900">
										{jawaban.kalimat}
									</p>
									{jawaban.total > 0 && (
										<p className="mt-1 text-xs text-slate-500">
											{jawaban.baris.length < jawaban.total
												? `Menampilkan ${jawaban.baris.length} dari ${jawaban.total} baris`
												: `${jawaban.total} baris`}
										</p>
									)}
								</div>
							</div>

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
