import { useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowLeft, FiBox, FiGrid, FiUser, FiUsers } from "react-icons/fi";
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

export default function LayarAwal({ webglOk, sentuh, sarankan2D, onMulai3D, onMulai2D }) {
	const kontrol = sentuh ? KONTROL_SENTUH : KONTROL_DESKTOP;
	const [profil, setProfil] = useState(() => bacaProfil() || { nama: "", jk: "L", avatar: 0, kulit: 1, mode: "bersama" });
	const [cobaKirim, setCobaKirim] = useState(false);
	const nama = rapikanNama(profil.nama);
	const bersama = profil.mode !== "sendiri";
	// Nama wajib bila bermain bersama (tampil di atas kepala bagi tamu lain).
	const namaOk = !bersama || nama.length >= 2;
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
			<div
				className="pointer-events-none absolute inset-0 opacity-60"
				style={{
					background:
						"radial-gradient(60vmax 40vmax at 15% -10%, rgba(255,255,255,.12), transparent 60%), radial-gradient(50vmax 40vmax at 95% 110%, rgba(245,180,60,.22), transparent 60%)",
				}}
			/>
			<div className="relative mx-auto flex min-h-[100svh] max-w-3xl flex-col px-4 py-6 sm:px-8">
				<Link
					to="/"
					className="inline-flex w-fit items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/20"
				>
					<FiArrowLeft /> Beranda
				</Link>

				<div className="flex flex-1 flex-col justify-center py-10">
					<div className="mb-6 flex items-center gap-3">
						<img src="/logo-bogor.png" alt="" className="h-12 w-auto" />
						<div className="leading-tight">
							<p className="text-sm font-bold tracking-wide">DPMD</p>
							<p className="text-xs text-white/70">Kabupaten Bogor</p>
						</div>
					</div>

					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-[rgb(var(--color-secondary))]">
						Tur interaktif
					</p>
					<h1 className="mt-2 text-4xl font-bold leading-tight sm:text-5xl">Jelajah Kantor DPMD</h1>
					<p className="mt-4 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
						Masuk ke kantor DPMD Kabupaten Bogor, naik-turun dua lantai, berkeliling ke tujuh ruang bidang, dan tanyakan langsung kepada
						petugasnya layanan apa saja yang tersedia.
					</p>

					{webglOk && (
						<form onSubmit={mulai} className="mt-8 rounded-3xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur sm:p-5" noValidate>
							<div role="radiogroup" aria-label="Mode jelajah" className="mb-4 grid grid-cols-2 gap-2 rounded-2xl bg-black/15 p-1">
								{[
									["bersama", FiUsers, "Bersama", "Multiplayer dengan tamu lain"],
									["sendiri", FiUser, "Sendiri", "Single player, tanpa server"],
								].map(([kode, Ikon, judul, ket]) => (
									<button
										type="button"
										key={kode}
										role="radio"
										aria-checked={(kode === "sendiri") === !bersama}
										onClick={() => ubah({ mode: kode })}
										className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition ${
											(kode === "sendiri") === !bersama ? "bg-white text-slate-900 shadow" : "text-white hover:bg-white/10"
										}`}
									>
										<Ikon className="h-5 w-5 shrink-0" />
										<span className="min-w-0">
											<span className="block text-sm font-bold">{judul}</span>
											<span className={`block truncate text-[11px] ${(kode === "sendiri") === !bersama ? "text-slate-500" : "text-white/60"}`}>{ket}</span>
										</span>
									</button>
								))}
							</div>
							<div className="flex items-start gap-4">
								<div className="flex h-28 w-20 shrink-0 items-end justify-center rounded-2xl bg-white/90 pb-1 sm:h-32 sm:w-24">
									<GambarAvatar profil={profil} className="h-24 w-16 sm:h-28 sm:w-20" />
								</div>
								<div className="min-w-0 flex-1 space-y-3">
									<div>
										<label htmlFor="nama-tamu" className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
											Nama tamu{!bersama && <span className="normal-case tracking-normal text-white/45"> (opsional)</span>}
										</label>
										<input
											id="nama-tamu"
											value={profil.nama}
											onChange={(e) => ubah({ nama: e.target.value.slice(0, 24) })}
											maxLength={24}
											autoComplete="nickname"
											placeholder="Tulis nama Anda"
											aria-invalid={cobaKirim && !namaOk}
											aria-describedby="nama-tamu-ket"
											className="mt-1 w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-base font-semibold text-slate-900 shadow-inner outline-none ring-2 ring-transparent placeholder:font-normal placeholder:text-slate-400 focus:ring-[rgb(var(--color-secondary))]"
										/>
										<p id="nama-tamu-ket" className={`mt-1 text-xs ${cobaKirim && !namaOk ? "font-semibold text-amber-300" : "text-white/55"}`}>
											{cobaKirim && !namaOk ? "Isi nama minimal 2 huruf dulu ya." : bersama ? "Tampil di atas kepala avatar Anda, terlihat tamu lain." : "Mode sendiri: tidak terhubung ke tamu lain."}
										</p>
									</div>
									<div role="radiogroup" aria-label="Jenis kelamin" className="grid grid-cols-2 gap-2">
										{[
											["L", "Laki-laki"],
											["P", "Perempuan"],
										].map(([kode, label]) => (
											<button
												type="button"
												key={kode}
												role="radio"
												aria-checked={profil.jk === kode}
												onClick={() => ubah({ jk: kode, avatar: 0 })}
												className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
													profil.jk === kode ? "bg-white text-slate-900 shadow" : "bg-white/10 text-white hover:bg-white/20"
												}`}
											>
												{label}
											</button>
										))}
									</div>
								</div>
							</div>

							<p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Pilih avatar</p>
							<div role="radiogroup" aria-label="Avatar" className="mt-2 grid grid-cols-4 gap-2">
								{AVATAR[profil.jk].map((a, i) => (
									<button
										type="button"
										key={a.nama}
										role="radio"
										aria-checked={profil.avatar === i}
										aria-label={a.nama}
										title={a.nama}
										onClick={() => ubah({ avatar: i })}
										className={`flex h-20 items-end justify-center rounded-2xl pb-1 transition ${
											profil.avatar === i ? "bg-white ring-4 ring-[rgb(var(--color-secondary))]" : "bg-white/75 hover:bg-white/90"
										}`}
									>
										<GambarAvatar profil={{ ...profil, avatar: i }} className="h-[4.25rem] w-11" />
									</button>
								))}
							</div>
							<div className="mt-3 flex items-center gap-3">
								<span className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">Warna kulit</span>
								<div role="radiogroup" aria-label="Warna kulit" className="flex gap-2">
									{WARNA_KULIT.map((w, i) => (
										<button
											type="button"
											key={w}
											role="radio"
											aria-checked={profil.kulit === i}
											aria-label={`Warna kulit ${i + 1}`}
											onClick={() => ubah({ kulit: i })}
											className={`h-8 w-8 rounded-full ring-2 transition ${profil.kulit === i ? "scale-110 ring-white" : "ring-white/30"}`}
											style={{ background: w }}
										/>
									))}
								</div>
							</div>

							<button
								type="submit"
								className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[rgb(var(--color-secondary))] to-amber-500 px-7 py-4 text-base font-bold shadow-lg shadow-amber-500/25 transition-transform hover:-translate-y-0.5"
							>
								<FiBox className="h-5 w-5" /> {bersama ? "Mulai jelajah bersama" : "Mulai jelajah sendiri"}
							</button>
							<p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-white/60">
								{bersama ? <FiUsers /> : <FiUser />}
								{bersama
									? "Tamu lain yang sedang membuka halaman ini akan ikut terlihat dan bisa diajak ngobrol."
									: "Hanya Anda di kantor bersama para pegawai; tidak ada data yang dikirim ke server multiplayer."}
							</p>
						</form>
					)}

					<div className="mt-4 flex flex-col gap-3 sm:flex-row">
						<button
							onClick={onMulai2D}
							className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/25 bg-white/10 px-7 py-4 text-base font-bold hover:bg-white/20"
						>
							<FiGrid className="h-5 w-5" /> Lihat denah 2D
							{(sarankan2D || !webglOk) && (
								<span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">disarankan</span>
							)}
						</button>
					</div>

					{!webglOk && (
						<p className="mt-4 max-w-xl rounded-xl bg-black/20 px-4 py-3 text-sm text-white/80">
							Peramban atau perangkat ini belum mendukung grafis 3D (WebGL 2). Denah 2D berisi informasi yang sama.
						</p>
					)}
					{webglOk && sarankan2D && (
						<p className="mt-4 max-w-xl text-sm text-white/70">
							Perangkat Anda mengurangi animasi atau tergolong ringan, jadi denah 2D mungkin lebih nyaman. Versi 3D tetap
							bisa dicoba.
						</p>
					)}

					{webglOk && (
						<div className="mt-10">
							<p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">Cara bermain</p>
							<dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
								{kontrol.map(([tombol, aksi]) => (
									<div key={tombol} className="flex items-baseline gap-3">
										<dt className="shrink-0 rounded-md bg-white/15 px-2 py-0.5 font-mono text-xs">{tombol}</dt>
										<dd className="text-white/75">{aksi}</dd>
									</div>
								))}
							</dl>
						</div>
					)}
				</div>
			</div>
		</main>
	);
}
