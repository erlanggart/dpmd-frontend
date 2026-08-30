// src/pages/core-dashboard/GemaPage.jsx
//
// Gema — asisten suara Core Dashboard. Purwarupa.
//
// TIGA HAL YANG DIPILIH SEJAK AWAL, karena akan sulit diubah belakangan:
//
// 1. SUARANYA MEMAKAI KEMAMPUAN BAWAAN PERAMBAN — SpeechRecognition untuk
//    mendengar, speechSynthesis untuk menjawab. Tanpa pustaka, tanpa kunci API,
//    tanpa suara yang dikirim ke luar. Konsekuensinya jujur: pengenalan suara
//    baru ada di Chrome dan Edge. Peramban lain TIDAK ditinggalkan — kotak
//    ketik selalu tersedia dan menempuh jalur yang sama persis.
//
// 2. ANIMASINYA DIGERAKKAN AMPLITUDO SUNGGUHAN, bukan gerak berulang yang
//    kebetulan mirip. Cincin membesar karena orangnya memang bicara lebih
//    keras — itu yang membuat alat ini terasa mendengarkan, bukan berpura-pura.
//
// 3. GELUNG ANIMASINYA BERHENTI SAAT TIDAK MENDENGAR. Halaman ini akan dibuka
//    lama di layar dinas; animasi yang berputar selamanya pernah membekukan
//    dasbor di ponsel kelas bawah.
//
// Jawabannya SELALU datang dari basis data lewat /api/gema/tanya. Gema tidak
// pernah mengarang: kalau pertanyaannya di luar cakupan, ia bilang tidak tahu.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Mic, Square, Keyboard, Sparkles, AlertCircle, Volume2, Loader2, Send } from 'lucide-react';
import api from '../../api';

/* ----------------------------------------------------------------- utilitas -- */

const AmbilPengenalSuara = () =>
	(typeof window !== 'undefined'
		? window.SpeechRecognition || window.webkitSpeechRecognition
		: null);

const SAPAAN = /\b(halo|hallo|hai|hei)\s*gema\b/i;

const BALASAN_SAPAAN = [
	'Halo! Gema siap. Mau cari data apa?',
	'Ya, saya dengar. Silakan sebutkan data yang dicari.',
	'Halo! Sebutkan saja datanya, saya carikan.',
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
	suara.pitch = 1;

	const daftar = window.speechSynthesis.getVoices();
	const indo = daftar.find((v) => v.lang?.toLowerCase().startsWith('id'));
	if (indo) suara.voice = indo;

	suara.onend = () => saatSelesai?.();
	suara.onerror = () => saatSelesai?.();
	window.speechSynthesis.speak(suara);
};

/* -------------------------------------------------------------- lingkaran -- */

/**
 * Tombol mikrofon. `tenaga` 0–1 datang dari amplitudo mikrofon dan menggerakkan
 * dua cincin luar; saat diam nilainya 0 dan cincinnya benar-benar berhenti.
 */
const LingkaranMik = ({ keadaan, tenaga, onKlik }) => {
	const mendengar = keadaan === 'mendengar';
	const sibuk = keadaan === 'berpikir';
	const bicara = keadaan === 'menjawab';

	// Dinaikkan sedikit dengan akar supaya bisikan tetap terlihat bergerak,
	// tapi teriakan tidak membuat cincinnya meledak keluar layar.
	const dorong = mendengar ? Math.min(1, Math.sqrt(tenaga)) : 0;

	return (
		<div className="relative flex h-64 w-64 items-center justify-center sm:h-72 sm:w-72">
			{/* Cincin amplitudo */}
			<span
				aria-hidden="true"
				className="absolute rounded-full bg-slate-900/[0.06] transition-[transform,opacity] duration-100 ease-out"
				style={{
					height: '100%', width: '100%',
					transform: `scale(${0.72 + dorong * 0.28})`,
					opacity: mendengar ? 0.5 + dorong * 0.5 : 0,
				}}
			/>
			<span
				aria-hidden="true"
				className="absolute rounded-full bg-slate-900/[0.09] transition-[transform,opacity] duration-75 ease-out"
				style={{
					height: '78%', width: '78%',
					transform: `scale(${0.8 + dorong * 0.2})`,
					opacity: mendengar ? 0.6 + dorong * 0.4 : 0,
				}}
			/>

			{/* Denyut halus saat menjawab — tidak bergantung mikrofon */}
			{bicara && (
				<span
					aria-hidden="true"
					className="absolute h-[86%] w-[86%] animate-ping rounded-full bg-slate-900/10"
					style={{ animationDuration: '1.6s' }}
				/>
			)}

			{/* Busur berputar saat mencari */}
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
				aria-label={mendengar ? 'Berhenti mendengarkan' : 'Mulai bicara dengan Gema'}
				aria-pressed={mendengar}
				className={`relative flex h-32 w-32 items-center justify-center rounded-full text-white shadow-xl outline-none transition-[transform,background-color,box-shadow] duration-300 focus-visible:ring-4 focus-visible:ring-slate-900/20 sm:h-36 sm:w-36 ${
					mendengar
						? 'bg-slate-900 shadow-slate-900/30'
						: 'bg-slate-900 shadow-slate-900/20 hover:-translate-y-0.5 hover:shadow-2xl'
				}`}
				style={{ transform: mendengar ? `scale(${1 + dorong * 0.06})` : undefined }}
			>
				{sibuk ? (
					<Loader2 className="h-11 w-11 animate-spin" />
				) : bicara ? (
					<Volume2 className="h-11 w-11" />
				) : mendengar ? (
					<Square className="h-9 w-9 fill-current" />
				) : (
					<Mic className="h-12 w-12" />
				)}
			</button>
		</div>
	);
};

/* ------------------------------------------------------------------ utama -- */

const KEADAAN_TEKS = {
	diam: 'Ucapkan “Halo Gema”',
	mendengar: 'Mendengarkan…',
	berpikir: 'Mencari datanya…',
	menjawab: 'Gema menjawab',
};

const GemaPage = () => {
	const [keadaan, setKeadaan] = useState('diam');
	const [tenaga, setTenaga] = useState(0);
	const [transkrip, setTranskrip] = useState('');
	const [jawaban, setJawaban] = useState(null);
	const [galat, setGalat] = useState(null);
	const [saran, setSaran] = useState([]);
	const [modeKetik, setModeKetik] = useState(false);
	const [ketikan, setKetikan] = useState('');
	const [riwayat, setRiwayat] = useState([]);

	const pengenalRef = useRef(null);
	const streamRef = useRef(null);
	const audioRef = useRef(null);
	const rafRef = useRef(0);
	const sengajaBerhentiRef = useRef(false);

	const didukung = useMemo(() => Boolean(AmbilPengenalSuara()), []);

	useEffect(() => {
		api.get('/gema/kemampuan')
			.then((r) => setSaran((r.data?.data || []).map((k) => k.contoh)))
			.catch(() => setSaran([]));
	}, []);

	// Daftar suara peramban baru terisi setelah event ini; tanpa menyentuhnya
	// sekali, pemilihan suara Indonesia sering meleset di pemanggilan pertama.
	useEffect(() => {
		if (typeof window !== 'undefined' && window.speechSynthesis) {
			window.speechSynthesis.getVoices();
		}
	}, []);

	/* ------------------------------------------------------------ mikrofon -- */

	const hentikanAudio = useCallback(() => {
		cancelAnimationFrame(rafRef.current);
		rafRef.current = 0;
		setTenaga(0);
		streamRef.current?.getTracks?.().forEach((t) => t.stop());
		streamRef.current = null;
		audioRef.current?.close?.().catch(() => {});
		audioRef.current = null;
	}, []);

	/** Baca amplitudo mikrofon dan alirkan ke animasi, hanya selama mendengar. */
	const mulaiPantauAmplitudo = useCallback(async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			streamRef.current = stream;

			const Konteks = window.AudioContext || window.webkitAudioContext;
			const konteks = new Konteks();
			audioRef.current = konteks;

			const sumber = konteks.createMediaStreamSource(stream);
			const penganalisis = konteks.createAnalyser();
			penganalisis.fftSize = 512;
			sumber.connect(penganalisis);

			const buffer = new Uint8Array(penganalisis.fftSize);
			const langkah = () => {
				penganalisis.getByteTimeDomainData(buffer);
				// RMS terhadap titik tengah 128 — ukuran kenyaringan, bukan cuma puncak.
				let jumlah = 0;
				for (let i = 0; i < buffer.length; i += 1) {
					const d = (buffer[i] - 128) / 128;
					jumlah += d * d;
				}
				const rms = Math.sqrt(jumlah / buffer.length);
				setTenaga(Math.min(1, rms * 4));
				rafRef.current = requestAnimationFrame(langkah);
			};
			rafRef.current = requestAnimationFrame(langkah);
		} catch {
			// Izin mikrofon ditolak: pengenalan suara tetap dicoba, hanya
			// animasinya yang diam. Bukan alasan untuk menggagalkan semuanya.
			setTenaga(0);
		}
	}, []);

	/* -------------------------------------------------------------- tanya -- */

	const tanyakan = useCallback(async (teks) => {
		const bersih = String(teks || '').trim();
		if (!bersih) return;

		setRiwayat((r) => [{ peran: 'orang', teks: bersih, waktu: Date.now() }, ...r].slice(0, 8));

		// Sapaan dijawab tanpa menyentuh server — tidak ada data yang perlu dicari.
		if (SAPAAN.test(bersih) && bersih.replace(SAPAAN, '').trim().length < 3) {
			const balas = BALASAN_SAPAAN[Math.floor(Math.random() * BALASAN_SAPAAN.length)];
			setKeadaan('menjawab');
			setRiwayat((r) => [{ peran: 'gema', teks: balas, waktu: Date.now() }, ...r].slice(0, 8));
			ucapkan(balas, () => setKeadaan('diam'));
			return;
		}

		setKeadaan('berpikir');
		setGalat(null);
		try {
			const r = await api.post('/gema/tanya', { teks: bersih });
			const d = r.data?.data;
			setJawaban(d);
			setRiwayat((h) => [{ peran: 'gema', teks: d?.kalimat, waktu: Date.now() }, ...h].slice(0, 8));
			setKeadaan('menjawab');
			ucapkan(d?.kalimat, () => setKeadaan('diam'));
		} catch (e) {
			const pesan = e.response?.data?.message || 'Gema gagal mengambil datanya';
			setGalat(pesan);
			setKeadaan('menjawab');
			ucapkan(pesan, () => setKeadaan('diam'));
		}
	}, []);

	/* ---------------------------------------------------------- pengenalan -- */

	const berhenti = useCallback(() => {
		sengajaBerhentiRef.current = true;
		try { pengenalRef.current?.stop(); } catch { /* sudah berhenti */ }
		hentikanAudio();
		setKeadaan((k) => (k === 'mendengar' ? 'diam' : k));
	}, [hentikanAudio]);

	const mulai = useCallback(async () => {
		const Pengenal = AmbilPengenalSuara();
		if (!Pengenal) { setModeKetik(true); return; }

		setGalat(null);
		setTranskrip('');
		sengajaBerhentiRef.current = false;

		const pengenal = new Pengenal();
		pengenal.lang = 'id-ID';
		pengenal.continuous = false;
		pengenal.interimResults = true;
		pengenal.maxAlternatives = 1;

		pengenal.onresult = (ev) => {
			let sementara = '';
			let final = '';
			for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
				const potongan = ev.results[i][0].transcript;
				if (ev.results[i].isFinal) final += potongan;
				else sementara += potongan;
			}
			setTranskrip(final || sementara);
			if (final) {
				sengajaBerhentiRef.current = true;
				try { pengenal.stop(); } catch { /* abaikan */ }
				hentikanAudio();
				tanyakan(final);
			}
		};

		pengenal.onerror = (ev) => {
			hentikanAudio();
			setKeadaan('diam');
			if (ev.error === 'no-speech') setGalat('Tidak ada suara yang tertangkap. Coba lagi.');
			else if (ev.error === 'not-allowed') setGalat('Akses mikrofon ditolak peramban. Izinkan dulu di setelan situs.');
			else if (ev.error !== 'aborted') setGalat(`Pengenalan suara gagal (${ev.error}).`);
		};

		pengenal.onend = () => {
			hentikanAudio();
			// Berhenti sendiri tanpa hasil apa pun — kembalikan ke keadaan diam.
			setKeadaan((k) => (k === 'mendengar' ? 'diam' : k));
		};

		pengenalRef.current = pengenal;
		setKeadaan('mendengar');
		mulaiPantauAmplitudo();
		try {
			pengenal.start();
		} catch {
			setKeadaan('diam');
			setGalat('Mikrofon sedang dipakai proses lain.');
		}
	}, [hentikanAudio, mulaiPantauAmplitudo, tanyakan]);

	// Bersih-bersih saat halaman ditinggalkan: mikrofon dan suara tidak boleh
	// terus hidup setelah penggunanya pindah halaman.
	useEffect(() => () => {
		try { pengenalRef.current?.abort(); } catch { /* abaikan */ }
		hentikanAudio();
		window.speechSynthesis?.cancel();
	}, [hentikanAudio]);

	const tekanMik = () => {
		if (keadaan === 'mendengar') berhenti();
		else if (keadaan === 'diam') mulai();
		else if (keadaan === 'menjawab') { window.speechSynthesis?.cancel(); setKeadaan('diam'); }
	};

	/* -------------------------------------------------------------- render -- */

	const petunjuk = transkrip || KEADAAN_TEKS[keadaan];

	return (
		<div className="min-h-screen bg-slate-50 p-4 pt-20 sm:p-6 lg:p-8 lg:pt-8">
			<div className="mx-auto max-w-5xl">
				{/* Panggung */}
				<section className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white">
					<div className="flex flex-col items-center px-5 py-10 sm:py-14">
						<div className="mb-1 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
							<Sparkles className="h-3.5 w-3.5" />
							Gema · Purwarupa
						</div>

						<p
							aria-live="polite"
							className={`mt-5 min-h-[3.5rem] max-w-2xl text-center text-xl font-semibold leading-snug tracking-tight transition-colors sm:text-2xl ${
								transkrip ? 'text-slate-900' : 'text-slate-400'
							}`}
						>
							{petunjuk}
						</p>

						<div className="mt-2">
							<LingkaranMik keadaan={keadaan} tenaga={tenaga} onKlik={tekanMik} />
						</div>

						<p className="mt-1 text-center text-sm text-slate-500">
							{keadaan === 'diam' && 'Ketuk mikrofon, lalu sebutkan data yang dicari.'}
							{keadaan === 'mendengar' && 'Ketuk sekali lagi untuk berhenti.'}
							{keadaan === 'berpikir' && 'Sedang membaca data sistem…'}
							{keadaan === 'menjawab' && 'Ketuk untuk menghentikan suara.'}
						</p>

						<button
							type="button"
							onClick={() => setModeKetik((v) => !v)}
							className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
						>
							<Keyboard className="h-3.5 w-3.5" />
							{modeKetik ? 'Sembunyikan kotak ketik' : 'Ketik saja'}
						</button>

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

				{/* Contoh perintah */}
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

				{/* Jawaban */}
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
													<th
														key={k.kunci}
														className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-slate-500"
													>
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

				{/* Percakapan */}
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
