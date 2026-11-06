import { useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiArrowRight, FiGrid, FiUser, FiUsers } from "react-icons/fi";
import { AVATAR, WARNA_KULIT, bacaProfil, penampilanAvatar, rapikanNama, simpanProfil } from "../avatar";

// Pratinjau avatar sederhana (SVG) supaya layar pembuka tidak perlu memuat three.js.
function GambarAvatar({ profil, className }) {
	const p = penampilanAvatar(profil);
	return (
		<svg viewBox="0 0 60 96" className={className} aria-hidden="true">
			<ellipse cx="30" cy="92" rx="16" ry="3" fill="rgba(0,0,0,.18)" />
			{p.rok ? (
				<path d="M17 52 L43 52 L47 88 L13 88 Z" fill={p.celana} />
			) : (
				<>
					<rect x="19" y="52" width="10" height="36" rx="3" fill={p.celana} />
					<rect x="31" y="52" width="10" height="36" rx="3" fill={p.celana} />
				</>
			)}
			<rect x="18" y="86" width="11" height="5" rx="2" fill="#141414" />
			<rect x="31" y="86" width="11" height="5" rx="2" fill="#141414" />
			<rect x="10" y="30" width="7" height="24" rx="3.5" fill={p.baju} />
			<rect x="43" y="30" width="7" height="24" rx="3.5" fill={p.baju} />
			<circle cx="13.5" cy="55" r="3.2" fill={p.kulit} />
			<circle cx="46.5" cy="55" r="3.2" fill={p.kulit} />
			<rect x="15" y="27" width="30" height="28" rx="8" fill={p.baju} />
			{p.jilbab ? (
				<>
					<path d="M13 34 Q30 20 47 34 L43 40 Q30 32 17 40 Z" fill={p.jilbab} />
					<circle cx="30" cy="16" r="12.5" fill={p.jilbab} />
					<ellipse cx="30" cy="17" rx="8" ry="9" fill={p.kulit} />
				</>
			) : (
				<>
					{p.perempuan && <rect x="19" y="12" width="22" height="20" rx="6" fill={p.rambut} />}
					<circle cx="30" cy="16" r="10" fill={p.kulit} />
					<path d="M19.5 15 Q20 4 30 5 Q40 4 40.5 15 Q36 9 30 10 Q24 9 19.5 15 Z" fill={p.rambut} />
				</>
			)}
			<circle cx="26.5" cy="17" r="1.2" fill="#151515" />
			<circle cx="33.5" cy="17" r="1.2" fill="#151515" />
			{p.kacamata && (
				<g fill="none" stroke="#1a1a1a" strokeWidth="1">
					<circle cx="26.5" cy="17" r="2.6" />
					<circle cx="33.5" cy="17" r="2.6" />
					<path d="M29 17 L31 17" />
				</g>
			)}
			<path d="M27.5 21.5 Q30 23 32.5 21.5" stroke="#8d4a3e" strokeWidth="1" fill="none" />
		</svg>
	);
}

const FOKUS = "outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] focus-visible:ring-offset-2";
const TOMBOL_UTAMA = `inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-[rgb(var(--color-secondary))] px-4 text-base font-bold text-slate-950 transition hover:brightness-110 ${FOKUS}`;
const LABEL = "text-xs font-medium text-slate-500";

function Segmen({ label, nilai, opsi, onPilih }) {
	return (
		<div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
			{opsi.map(([kode, teks, Ikon]) => (
				<button
					type="button"
					key={kode}
					role="radio"
					aria-checked={nilai === kode}
					onClick={() => onPilih(kode)}
					className={`flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-xs font-semibold transition min-[360px]:text-sm ${FOKUS} ${
						nilai === kode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"
					}`}
				>
					{Ikon && <Ikon className="h-4 w-4" />}
					{teks}
				</button>
			))}
		</div>
	);
}

const KONTROL_DESKTOP = [
	["W A S D / panah", "berjalan"],
	["Shift", "berlari"],
	["Seret mouse", "memutar kamera"],
	["Klik lantai", "berjalan ke titik itu"],
	["E", "bicara, duduk, naik kendaraan, sapa tamu"],
	["Enter · 1–5", "chat · emote ke tamu lain"],
];
const KONTROL_SENTUH = [
	["Joystick kiri", "berjalan (dorong penuh untuk berlari)"],
	["Seret layar", "memutar kamera"],
	["Ketuk lantai", "berjalan ke titik itu"],
	["Tombol aksi", "bicara, duduk, naik kendaraan, sapa tamu"],
	["Tombol 💬 🙂", "chat · emote ke tamu lain"],
];

export default function LayarAwal({ webglOk, sentuh, sarankan2D, onMulai3D, onMulai2D, onKodeSimpan }) {
	const kontrol = sentuh ? KONTROL_SENTUH : KONTROL_DESKTOP;
	const [profil, setProfil] = useState(() => bacaProfil() || { nama: "", jk: "L", avatar: 0, kulit: 1, mode: "bersama" });
	const [cobaKirim, setCobaKirim] = useState(false);
	const nama = rapikanNama(profil.nama);
	const bersama = profil.mode !== "sendiri";
	// Nama wajib bila bermain bersama (tampil di atas kepala bagi tamu lain).
	const namaOk = !bersama || nama.length >= 2;
	const namaSalah = cobaKirim && !namaOk;
	const ubah = (patch) => setProfil((p) => ({ ...p, ...patch }));

	const mulai = (e) => {
		e.preventDefault();
		setCobaKirim(true);
		if (!namaOk) return;
		const final = { ...profil, nama: nama || "Tamu" };
		simpanProfil(final);
		onMulai3D(final);
	};

	return (
		<main className="relative min-h-[100svh] overflow-hidden bg-[rgb(var(--color-primary))] text-white">
			{/* kisi tipis bernuansa denah kantor */}
			<div
				className="pointer-events-none absolute inset-0"
				style={{
					backgroundImage:
						"linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)",
					backgroundSize: "48px 48px",
					maskImage: "radial-gradient(90vmax 70vmax at 0% 0%, #000, transparent 75%)",
					WebkitMaskImage: "radial-gradient(90vmax 70vmax at 0% 0%, #000, transparent 75%)",
				}}
			/>
			<div className="relative mx-auto flex min-h-[100svh] max-w-6xl flex-col lg:max-w-[84rem] px-4 py-5 sm:px-8 lg:py-7">
				<header className="flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<img src="/logo-bogor.png" alt="" className="h-10 w-auto" />
						<div className="leading-tight">
							<p className="text-sm font-bold">DPMD</p>
							<p className="text-xs text-white/60">Kabupaten Bogor</p>
						</div>
					</div>
					<Link to="/" className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-medium text-white/70 transition hover:text-white">
						<FiArrowLeft /> Beranda
					</Link>
				</header>

				<div className="grid flex-1 content-center gap-x-16 gap-y-8 py-8 lg:grid-cols-[minmax(0,1fr)_31rem] lg:gap-y-10">
					<section className="lg:self-end">
						<p className="text-sm font-medium text-white/60">Tur interaktif</p>
						<h1 className="mt-2 text-4xl font-bold leading-[1.05] min-[360px]:text-[2.75rem] tracking-tight sm:text-6xl lg:text-7xl xl:text-8xl">
							Jelajah Kantor <span className="text-[rgb(var(--color-secondary))]">DPMD</span>
						</h1>
						<p className="mt-4 max-w-xl text-base leading-relaxed text-white/70 lg:text-lg">
							Naik-turun dua lantai, berkeliling ke tujuh ruang bidang, dan tanyakan langsung kepada petugasnya layanan apa saja yang tersedia.
						</p>
					</section>

					<section className="rounded-3xl bg-white p-4 text-slate-900 shadow-2xl shadow-black/30 sm:p-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
						{webglOk ? (
							<form onSubmit={mulai} className="space-y-4" noValidate>
								<Segmen
									label="Mode jelajah"
									nilai={bersama ? "bersama" : "sendiri"}
									opsi={[
										["bersama", "Bersama", FiUsers],
										["sendiri", "Sendiri", FiUser],
									]}
									onPilih={(mode) => ubah({ mode })}
								/>

								<div className="flex gap-3 sm:gap-4">
									<div className="flex w-20 shrink-0 items-end min-[360px]:w-24 justify-center rounded-2xl bg-slate-100 pb-1.5 sm:w-28">
										<GambarAvatar profil={profil} className="h-32 w-20 sm:h-36 sm:w-[5.5rem]" />
									</div>
									<div className="min-w-0 flex-1 space-y-3">
										<div>
											<label htmlFor="nama-tamu" className={LABEL}>
												Nama tamu{!bersama && " (opsional)"}
											</label>
											<input
												id="nama-tamu"
												value={profil.nama}
												onChange={(e) => ubah({ nama: e.target.value.slice(0, 24) })}
												maxLength={24}
												autoComplete="nickname"
												placeholder="Tulis nama Anda"
												aria-invalid={namaSalah}
												aria-describedby={namaSalah ? "nama-tamu-ket" : undefined}
												className={`mt-1 h-11 w-full rounded-xl bg-slate-100 px-3.5 text-base font-semibold text-slate-900 outline-none ring-2 transition placeholder:font-normal placeholder:text-slate-400 focus:bg-white ${
													namaSalah ? "ring-red-500" : "ring-transparent focus:ring-[rgb(var(--color-primary))]"
												}`}
											/>
											{namaSalah && (
												<p id="nama-tamu-ket" role="alert" className="mt-1 text-xs font-medium text-red-600">
													Isi nama minimal 2 huruf dulu ya.
												</p>
											)}
										</div>
										<Segmen
											label="Jenis kelamin"
											nilai={profil.jk}
											opsi={[
												["L", "Laki-laki"],
												["P", "Perempuan"],
											]}
											onPilih={(jk) => ubah({ jk, avatar: 0 })}
										/>
									</div>
								</div>

								<div>
									<p className={LABEL}>Pilih avatar</p>
									<div role="radiogroup" aria-label="Avatar" className="mt-1.5 grid grid-cols-4 gap-2">
										{AVATAR[profil.jk].map((a, i) => (
											<button
												type="button"
												key={a.nama}
												role="radio"
												aria-checked={profil.avatar === i}
												aria-label={a.nama}
												title={a.nama}
												onClick={() => ubah({ avatar: i })}
												className={`flex h-[4.5rem] items-end justify-center rounded-xl pb-1 ring-2 transition ${FOKUS} ${
													profil.avatar === i ? "bg-white ring-[rgb(var(--color-primary))]" : "bg-slate-100 ring-transparent hover:bg-slate-200"
												}`}
											>
												<GambarAvatar profil={{ ...profil, avatar: i }} className="h-16 w-10" />
											</button>
										))}
									</div>
								</div>

								<div className="flex items-center justify-between gap-3">
									<span className={LABEL}>Warna kulit</span>
									<div role="radiogroup" aria-label="Warna kulit" className="flex gap-2.5">
										{WARNA_KULIT.map((w, i) => (
											<button
												type="button"
												key={w}
												role="radio"
												aria-checked={profil.kulit === i}
												aria-label={`Warna kulit ${i + 1}`}
												onClick={() => ubah({ kulit: i })}
												className={`h-11 w-11 rounded-full ring-offset-2 transition ${FOKUS} ${profil.kulit === i ? "ring-2 ring-[rgb(var(--color-primary))]" : ""}`}
												style={{ background: w }}
											/>
										))}
									</div>
								</div>

								<div>
									<button type="submit" className={TOMBOL_UTAMA}>
										{bersama ? "Mulai jelajah bersama" : "Mulai jelajah sendiri"} <FiArrowRight className="h-5 w-5" />
									</button>
									<p className="mt-2 text-balance text-center text-xs leading-relaxed text-slate-500">
										{bersama ? "Nama Anda terlihat oleh tamu lain, dan Anda bisa saling ngobrol." : "Hanya Anda bersama para pegawai, tanpa terhubung ke server multiplayer."}
									</p>
								</div>
							</form>
						) : (
							<p className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900">
								Peramban atau perangkat ini belum mendukung grafis 3D (WebGL 2). Denah 2D berisi informasi yang sama.
							</p>
						)}

						{webglOk && sarankan2D && (
							<p className="mt-4 text-xs leading-relaxed text-slate-500">
								Perangkat Anda mengurangi animasi atau tergolong ringan, jadi denah 2D mungkin lebih nyaman. Versi 3D tetap bisa dicoba.
							</p>
						)}

						<div className={`mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm font-semibold ${webglOk ? "border-t border-slate-100 pt-4" : ""}`}>
							<button
								type="button"
								onClick={onMulai2D}
								className={webglOk ? `inline-flex items-center gap-2 rounded-lg text-slate-700 transition hover:text-slate-950 ${FOKUS}` : TOMBOL_UTAMA}
							>
								<FiGrid className="h-4 w-4" /> Lihat denah 2D
								{webglOk && sarankan2D && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">disarankan</span>}
							</button>
							{onKodeSimpan && (
								<button type="button" onClick={onKodeSimpan} className={`rounded-lg font-medium text-slate-500 transition hover:text-slate-900 ${FOKUS}`}>
									Punya kode simpan?
								</button>
							)}
						</div>
					</section>

					{webglOk && (
						<section className="lg:self-start">
							<h2 className="text-sm font-medium text-white/60">Cara bermain</h2>
							<dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-2 text-sm">
								{kontrol.map(([tombol, aksi]) => (
									<div key={tombol} className="contents">
										<dt className="w-fit rounded-md border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-xs text-white/90">{tombol}</dt>
										<dd className="text-white/70">{aksi}</dd>
									</div>
								))}
							</dl>
						</section>
					)}
				</div>
			</div>
		</main>
	);
}
