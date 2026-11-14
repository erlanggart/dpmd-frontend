import React, { useEffect, useRef, useState } from "react";
import { FaApple, FaGooglePlay } from "react-icons/fa";
import api from "../../api";
import {
	FiAlertCircle,
	FiArrowLeft,
	FiCheck,
	FiCopy,
	FiLoader,
	FiShield,
	FiSmartphone,
} from "react-icons/fi";

const URL_PLAY_STORE = "https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2";
const URL_APP_STORE = "https://apps.apple.com/app/google-authenticator/id388497605";

const kelasTombolUtama =
	"flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[rgb(var(--color-primary))] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:opacity-65";
const kelasTombolKecil =
	"inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50";
// fa•••@domain.go.id: cukup untuk dikenali pemilik, tidak membocorkan seluruh alamat.
const samarkanEmail = (email = "") => {
	const [lokal, domain] = email.split("@");
	if (!domain) return email;
	return `${lokal.slice(0, 2)}•••@${domain}`;
};

// Masuk halus (opacity + geser kecil); dimatikan otomatis bila pengguna memilih gerak minimal.
const Muncul = ({ children }) => {
	const [tampil, setTampil] = useState(false);
	useEffect(() => {
		const id = setTimeout(() => setTampil(true), 30);
		return () => clearTimeout(id);
	}, []);
	return (
		<div
			className={`mt-6 motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-out ${
				tampil ? "opacity-100 motion-safe:translate-y-0" : "opacity-0 motion-safe:translate-y-3"
			}`}
		>
			{children}
		</div>
	);
};

const KotakGalat = ({ pesan }) =>
	pesan ? (
		<div role="alert" className="animate-shake rounded-2xl border border-red-200 bg-red-50 p-4">
			<div className="flex items-start gap-3">
				<FiAlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
				<p className="text-sm leading-5 text-red-700">{pesan}</p>
			</div>
		</div>
	) : null;

const Kepala = ({ judul, subjudul, onKembali }) => (
	<div>
		{onKembali && (
			<button
				type="button"
				onClick={onKembali}
				className="mb-5 inline-flex items-center gap-1.5 rounded-lg py-1 text-sm font-medium text-slate-500 transition hover:text-slate-900"
			>
				<FiArrowLeft className="h-4 w-4" />
				Kembali
			</button>
		)}
		<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[rgb(var(--color-primary))] text-white shadow-lg shadow-slate-950/20">
			<FiShield className="h-6 w-6" />
		</div>
		<h3 className="mt-4 text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">{judul}</h3>
		{subjudul && <p className="mt-2 text-sm leading-6 text-slate-600">{subjudul}</p>}
	</div>
);

// Enam kotak OTP yang digerakkan SATU input asli di atasnya, supaya tempel,
// hapus, dan isi-otomatis SMS/keyboard tetap bekerja seperti input biasa.
const KotakOtp = ({ id, nilai, setNilai, onSelesai, loading, salah, getar, autoFokus }) => {
	const ref = useRef(null);
	const pernahFokus = useRef(false);
	const [fokus, setFokus] = useState(false);

	// Setelah verifikasi selesai (mis. kode salah), kembalikan fokus supaya bisa langsung mengetik lagi.
	useEffect(() => {
		if (!loading && (autoFokus || pernahFokus.current)) ref.current?.focus();
	}, [loading, autoFokus, getar]);

	const ubah = (e) => {
		const baru = e.target.value.replace(/\D/g, "").slice(0, 6);
		setNilai(baru);
		if (baru.length === 6 && !loading) onSelesai(baru);
	};

	const posisiAktif = Math.min(nilai.length, 5);
	return (
		<div key={getar} className={`relative mx-auto w-full max-w-sm ${salah ? "animate-shake" : ""}`}>
			<div className="flex justify-center gap-1.5 sm:gap-2.5" aria-hidden="true">
				{Array.from({ length: 6 }, (_, i) => {
					const aktif = fokus && i === posisiAktif;
					const warna = salah
						? "border-red-400 bg-red-50 text-red-700"
						: aktif
							? `border-[rgb(var(--color-primary))] bg-white text-slate-950 ring-4 ring-slate-200`
							: nilai[i]
								? "border-slate-300 bg-white text-slate-950"
								: "border-slate-200 bg-slate-50 text-slate-950";
					return (
						<div
							key={i}
							className={`flex h-14 min-w-0 flex-1 items-center justify-center rounded-2xl border-2 text-2xl font-bold tabular-nums transition sm:h-16 sm:w-14 sm:flex-none ${warna}`}
						>
							{nilai[i] ||
								(aktif && <span className="h-6 w-0.5 rounded bg-slate-400 motion-safe:animate-pulse" />)}
						</div>
					);
				})}
			</div>
			<input
				ref={ref}
				id={id}
				name={id}
				type="text"
				inputMode="numeric"
				autoComplete="one-time-code"
				autoFocus={autoFokus}
				maxLength={6}
				aria-label="Kode verifikasi 6 digit"
				className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent opacity-0 outline-none"
				value={nilai}
				onChange={ubah}
				onFocus={() => {
					pernahFokus.current = true;
					setFokus(true);
				}}
				onBlur={() => setFokus(false)}
				readOnly={loading}
				required
			/>
		</div>
	);
};

// Isian kode 6 digit lengkap dengan tombol kirim.
const IsianKode = ({ id, kode, setKode, loading, onKirim, labelTombol, salah, getar, autoFokus }) => (
	<form
		onSubmit={(e) => {
			e.preventDefault();
			onKirim(kode);
		}}
		className="space-y-4"
	>
		<KotakOtp
			id={id}
			nilai={kode}
			setNilai={setKode}
			onSelesai={onKirim}
			loading={loading}
			salah={salah}
			getar={getar}
			autoFokus={autoFokus}
		/>
		<button type="submit" disabled={loading || kode.length < 6} className={kelasTombolUtama}>
			{loading ? <FiLoader className="h-5 w-5 animate-spin" /> : labelTombol}
		</button>
	</form>
);

// Satu langkah pada stepper vertikal.
const Langkah = ({ nomor, judul, aktif = true, terakhir = false, children }) => (
	<li className="flex gap-4">
		<div className="flex flex-col items-center">
			<span
				className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold transition ${
					aktif ? "bg-[rgb(var(--color-primary))] text-white shadow-md shadow-slate-950/20" : "bg-slate-200 text-slate-500"
				}`}
			>
				{nomor}
			</span>
			{!terakhir && <span className="my-1 w-px flex-1 bg-slate-200" />}
		</div>
		<div className={`min-w-0 flex-1 ${terakhir ? "" : "pb-7"}`}>
			<h4 className={`pt-1 text-sm font-bold ${aktif ? "text-slate-900" : "text-slate-400"}`}>{judul}</h4>
			{children}
		</div>
	</li>
);

const TombolToko = ({ href, Ikon, atas, bawah }) => (
	<a
		href={href}
		target="_blank"
		rel="noopener noreferrer"
		className="flex min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-black px-2.5 py-2 text-white transition hover:bg-slate-800 sm:flex-none sm:min-w-[9.5rem]"
	>
		<Ikon className="h-6 w-6 flex-shrink-0" />
		<span className="flex flex-col leading-tight">
			<span className="text-[10px] text-white/70">{atas}</span>
			<span className="text-sm font-semibold">{bawah}</span>
		</span>
	</a>
);

// Bingkai pemindai: kartu putih dengan empat sudut beraksen.
const BingkaiQr = ({ src }) => {
	const sudut = `absolute h-6 w-6 border-[rgb(var(--color-primary))]`;
	return (
		<div className="relative mx-auto w-fit rounded-2xl bg-white p-5 shadow-xl shadow-slate-950/10 ring-1 ring-slate-200">
			<span className={`${sudut} left-2 top-2 rounded-tl-xl border-l-4 border-t-4`} />
			<span className={`${sudut} right-2 top-2 rounded-tr-xl border-r-4 border-t-4`} />
			<span className={`${sudut} bottom-2 left-2 rounded-bl-xl border-b-4 border-l-4`} />
			<span className={`${sudut} bottom-2 right-2 rounded-br-xl border-b-4 border-r-4`} />
			<img src={src} alt="Kode QR verifikasi 2 langkah" className="h-[200px] w-[200px]" />
		</div>
	);
};

const LangkahDuaFaktor = ({ tahap, deviceId, onBerhasil, onBatal }) => {
	const { tiket, email } = tahap;
	const [jenis, setJenis] = useState(tahap.jenis);
	const [dataPasang, setDataPasang] = useState(null);
	const [kode, setKode] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [salah, setSalah] = useState(false);
	const [getar, setGetar] = useState(0);
	const [kunciTersalin, setKunciTersalin] = useState(false);
	const sudahMeminta = useRef(false);

	// Galat yang membuat tiket tak berguna: kembali ke form sandi dengan pesan server.
	const tanganiGalat = (err, pesanAwal) => {
		const kodeGalat = err.response?.data?.code;
		const pesan = err.response?.data?.message;
		if (kodeGalat === "TIKET_2FA_TIDAK_SAH" || kodeGalat === "AKUN_NONAKTIF") {
			onBatal(pesan);
			return;
		}
		if (kodeGalat === "KODE_2FA_SALAH") {
			setKode("");
			setSalah(true);
			setGetar((n) => n + 1);
			setTimeout(() => setSalah(false), 800);
		}
		setError(pesan || pesanAwal);
	};

	// Jenis 'pasang': minta QR sekali saat tampil.
	useEffect(() => {
		if (jenis !== "pasang" || sudahMeminta.current) return;
		sudahMeminta.current = true;
		api
			.post("/auth/2fa/pasang", { tiket_2fa: tiket })
			.then((res) => setDataPasang(res.data.data))
			.catch((err) => {
				if (err.response?.data?.code === "TFA_SUDAH_AKTIF") {
					setJenis("kode");
					return;
				}
				tanganiGalat(err, "Gagal memuat kode QR. Coba lagi.");
			});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [jenis, tiket]);

	const kirim = async (nilai) => {
		const bersih = nilai.trim();
		if (!bersih || loading) return;
		setLoading(true);
		setError(null);
		try {
			const jalur = jenis === "pasang" ? "/auth/2fa/aktifkan" : "/auth/2fa/verifikasi";
			const res = await api.post(jalur, { tiket_2fa: tiket, kode: bersih, device_id: deviceId });
			onBerhasil(res.data.data);
		} catch (err) {
			tanganiGalat(err, "Gagal memverifikasi. Coba lagi.");
		} finally {
			setLoading(false);
		}
	};

	const salin = async (teks) => {
		try {
			await navigator.clipboard.writeText(teks);
			setKunciTersalin(true);
			setTimeout(() => setKunciTersalin(false), 2000);
		} catch {
			// Clipboard bisa diblokir; pengguna tetap bisa menyalin manual.
		}
	};

	const kembali = () => onBatal();

	// Jenis 'kode': akun sudah punya 2FA.
	if (jenis === "kode") {
		return (
			<Muncul key="kode">
				<div className="space-y-6">
					<Kepala
						judul="Verifikasi 2 langkah"
						subjudul={
							<>
								Buka aplikasi Google Authenticator di HP Anda, lalu masukkan kode 6 digit untuk DPMD Kab Bogor
								{email && <> ({samarkanEmail(email)})</>}.
							</>
						}
						onKembali={kembali}
					/>
					<IsianKode
						id="kode-2fa"
						kode={kode}
						setKode={setKode}
						loading={loading}
						onKirim={kirim}
						labelTombol="Verifikasi"
						salah={salah}
						getar={getar}
						autoFokus
					/>
					<p className="text-center text-xs leading-5 text-slate-500">
						HP hilang atau ganti? Hubungi superadmin untuk mereset verifikasi 2 langkah.
					</p>
					<KotakGalat pesan={error} />
				</div>
			</Muncul>
		);
	}

	// Jenis 'pasang': akun belum punya 2FA.
	const kunci = dataPasang?.rahasia?.replace(/(.{4})/g, "$1 ").trim();
	return (
		<Muncul key="pasang">
			{/* Desktop: langkah di kiri, QR besar di panel kanan supaya halaman tidak memanjang. */}
			<div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-10">
			<div className="space-y-6">
				<Kepala
					judul="Pasang verifikasi 2 langkah"
					subjudul={
						<>
							Akun DPMD{email && <> ({samarkanEmail(email)})</>} wajib memakai verifikasi 2 langkah. Cukup dilakukan sekali.
						</>
					}
					onKembali={kembali}
				/>

				<ol>
					<Langkah nomor={1} judul="Pasang Google Authenticator">
						<div className="mt-3 flex gap-2.5">
							<TombolToko href={URL_PLAY_STORE} Ikon={FaGooglePlay} atas="Unduh di" bawah="Google Play" />
							<TombolToko href={URL_APP_STORE} Ikon={FaApple} atas="Unduh di" bawah="App Store" />
						</div>
						<p className="mt-2.5 text-xs leading-5 text-slate-500">
							Aplikasi lain seperti Microsoft Authenticator atau Passwords di iPhone juga bisa.
						</p>
					</Langkah>

					<Langkah nomor={2} judul="Di aplikasi, ketuk + lalu Pindai kode QR">
						{dataPasang ? (
							<div className="mt-3 flex flex-col gap-4">
								<div className="order-2 sm:order-1 lg:hidden">
									<BingkaiQr src={dataPasang.qr} />
								</div>
								<div className="order-1 space-y-2 sm:order-2 lg:hidden">
									<p className="text-xs text-slate-500">Membuka halaman ini di HP yang sama?</p>
									<a
										href={dataPasang.otpauth_url}
										className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-[rgb(var(--color-primary))] px-5 py-3 text-sm font-bold text-[rgb(var(--color-primary))] transition hover:bg-slate-50"
									>
										<FiSmartphone className="h-5 w-5" />
										Buka di aplikasi Authenticator
									</a>
								</div>
								<p className="hidden text-sm leading-6 text-slate-600 lg:block">Arahkan kamera aplikasi ke kode QR di sebelah kanan.</p>
								<details className="order-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:hidden">
									<summary className="cursor-pointer text-sm font-semibold text-slate-700">
										Tidak bisa memindai? Masukkan kunci manual
									</summary>
									<div className="mt-3 flex flex-wrap items-center gap-2">
										<code className="rounded-xl bg-white px-3 py-2 font-mono text-sm tracking-wider text-slate-900 ring-1 ring-slate-200">
											{kunci}
										</code>
										<button type="button" onClick={() => salin(dataPasang.rahasia)} className={kelasTombolKecil}>
											{kunciTersalin ? <FiCheck className="h-4 w-4" /> : <FiCopy className="h-4 w-4" />}
											{kunciTersalin ? "Tersalin" : "Salin"}
										</button>
									</div>
								</details>
							</div>
						) : (
							!error && (
								<div className="mt-3 flex h-[120px] items-center justify-center rounded-2xl bg-slate-50">
									<FiLoader className="h-6 w-6 animate-spin text-slate-400" aria-label="Memuat kode QR" />
								</div>
							)
						)}
					</Langkah>

					<Langkah nomor={3} judul="Masukkan kode 6 digit yang muncul" aktif={Boolean(dataPasang)} terakhir>
						{dataPasang && (
							<div className="mt-4">
								<IsianKode
									id="kode-2fa"
									kode={kode}
									setKode={setKode}
									loading={loading}
									onKirim={kirim}
									labelTombol="Aktifkan"
									salah={salah}
									getar={getar}
								/>
							</div>
						)}
					</Langkah>
				</ol>
				<KotakGalat pesan={error} />
			</div>
			<aside className="hidden rounded-3xl border border-slate-200 bg-slate-50 p-6 lg:sticky lg:top-6 lg:block">
				{dataPasang ? (
					<div className="space-y-4">
						<p className="text-center text-sm font-bold text-slate-900">Pindai dengan Google Authenticator</p>
						<BingkaiQr src={dataPasang.qr} />
						<details className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
							<summary className="cursor-pointer text-sm font-semibold text-slate-700">Tidak bisa memindai? Kunci manual</summary>
							<div className="mt-3 flex flex-wrap items-center gap-2">
								<code className="rounded-xl bg-slate-50 px-3 py-2 font-mono text-sm tracking-wider text-slate-900 ring-1 ring-slate-200">{kunci}</code>
								<button type="button" onClick={() => salin(dataPasang.rahasia)} className={kelasTombolKecil}>
									{kunciTersalin ? <FiCheck className="h-4 w-4" /> : <FiCopy className="h-4 w-4" />}
									{kunciTersalin ? "Tersalin" : "Salin"}
								</button>
							</div>
						</details>
					</div>
				) : (
					<div className="flex h-[300px] items-center justify-center">
						<FiLoader className="h-6 w-6 animate-spin text-slate-400" aria-label="Memuat kode QR" />
					</div>
				)}
			</aside>
			</div>
		</Muncul>
	);
};

export default LangkahDuaFaktor;
