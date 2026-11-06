import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LuActivity, LuFileText, LuGlobe, LuLogIn, LuMapPin, LuMonitor, LuPencil, LuSearch, LuSmartphone, LuTablet, LuUser, LuWifi, LuX } from "react-icons/lu";
import api from "../../api";
import { getAvatarUrl } from "../../utils/avatarUtils";
import { ROLE_COLORS, ROLE_LABELS, timeAgo } from "./peranPengguna";

// rrweb hanya diunduh saat superadmin benar-benar menonton
const CerminLayarPanel = lazy(() => import("./CerminLayarPanel"));

const SELANG_AKTIVITAS_MS = 3000;
const SELANG_USER_MS = 15000;
const BATAS_FEED = 300;

const IKON_PERANGKAT = { desktop: LuMonitor, mobile: LuSmartphone, tablet: LuTablet };
const JENIS = {
	login: { ikon: LuLogIn, warna: "bg-sky-100 text-sky-700" },
	halaman: { ikon: LuFileText, warna: "bg-slate-100 text-slate-500" },
	ubah: { ikon: LuPencil, warna: "bg-amber-100 text-amber-700" },
};
const SARINGAN = [
	["semua", "Semua"],
	["ubah", "Perubahan"],
	["halaman", "Halaman"],
	["login", "Login"],
];

const jam = (iso) => new Date(iso).toLocaleTimeString("id-ID", { hour12: false });
// "/core-dashboard/asta-desa/:id" -> "Core dashboard › Asta desa"
const labelHalaman = (path) =>
	path
		.split("/")
		.filter((s) => s && s !== ":id")
		.map((s) => {
			const kata = s.replace(/[-_]/g, " ");
			return kata[0].toUpperCase() + kata.slice(1);
		})
		.join(" › ") || "Beranda";
const wilayahUser = (u) => u.desa?.nama || u.kecamatan?.nama || u.dinas?.nama_dinas || null;

function Avatar({ user }) {
	const url = getAvatarUrl(user.avatar);
	const [gagal, setGagal] = useState(false);
	return (
		<span className="relative shrink-0">
			{url && !gagal ? (
				<img src={url} alt="" onError={() => setGagal(true)} className="h-9 w-9 rounded-xl object-cover" />
			) : (
				<span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-sm font-bold text-white">
					{user.name?.charAt(0)?.toUpperCase() || "U"}
				</span>
			)}
			<span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
		</span>
	);
}

/**
 * Popup superadmin: semua user online dan aktivitas mereka secara langsung.
 * Aktivitas ditarik tiap 3 detik selama popup terbuka dan tab terlihat, jadi
 * tidak ada beban sama sekali saat popup tertutup.
 */
export default function MonitorUserOnline({ awal = null, onTutup }) {
	const [users, setUsers] = useState([]);
	const [memuat, setMemuat] = useState(true);
	const [gagal, setGagal] = useState(false);
	const [feed, setFeed] = useState([]);
	const [pilih, setPilih] = useState(awal);
	const [cari, setCari] = useState("");
	const [peran, setPeran] = useState("");
	const [saring, setSaring] = useState("semua");
	const [tab, setTab] = useState(awal ? "aktivitas" : "online");
	const [tonton, setTonton] = useState(false);
	const terakhir = useRef(0);
	const tutupRef = useRef(null);
	const pilihId = pilih?.id || null;

	const muatUsers = useCallback(async () => {
		try {
			const res = await api.get("/settings/online-users", { params: { limit: 500, minutes: 5 } });
			setUsers(res.data.data.users);
			setGagal(false);
		} catch {
			setGagal(true);
		} finally {
			setMemuat(false);
		}
	}, []);

	useEffect(() => {
		let batal = false;
		const tarik = async () => {
			if (document.visibilityState !== "visible") return;
			try {
				const res = await api.get("/settings/online-activity", {
					params: { setelah: terakhir.current, batas: 200, ...(pilihId ? { user_id: pilihId } : {}) },
				});
				const baru = res.data.data;
				if (batal || !baru.length) return;
				terakhir.current = baru[0].id;
				setFeed((f) => [...baru, ...f].slice(0, BATAS_FEED));
			} catch {
				// putaran berikutnya mencoba lagi; daftar user yang menampilkan galatnya
			}
		};
		terakhir.current = 0;
		setFeed([]);
		tarik();
		const t = setInterval(tarik, SELANG_AKTIVITAS_MS);
		return () => {
			batal = true;
			clearInterval(t);
		};
	}, [pilihId]);

	useEffect(() => {
		muatUsers();
		const t = setInterval(() => document.visibilityState === "visible" && muatUsers(), SELANG_USER_MS);
		return () => clearInterval(t);
	}, [muatUsers]);

	useEffect(() => {
		const tombol = (e) => e.key === "Escape" && onTutup();
		document.addEventListener("keydown", tombol);
		const luapan = document.body.style.overflow;
		document.body.style.overflow = "hidden";
		tutupRef.current?.focus();
		return () => {
			document.removeEventListener("keydown", tombol);
			document.body.style.overflow = luapan;
		};
	}, [onTutup]);

	const daftarPeran = useMemo(() => [...new Set(users.map((u) => u.role))].sort(), [users]);
	const jumlahBisaDitonton = users.filter((u) => u.bisa_ditonton).length;
	const tampil = useMemo(() => {
		const q = cari.trim().toLowerCase();
		return users.filter(
			(u) => (!peran || u.role === peran) && (!q || [u.name, u.email, wilayahUser(u)].some((t) => t?.toLowerCase().includes(q))),
		);
	}, [users, cari, peran]);
	const feedTampil = saring === "semua" ? feed : feed.filter((a) => a.jenis === saring);
	const dipilih = pilihId ? users.find((u) => u.id === pilihId) || pilih : null;
	const Perangkat = IKON_PERANGKAT[dipilih?.last_login?.device_type] || LuGlobe;

	const pilihUser = (u) => {
		setPilih(pilihId === u.id ? null : u);
		setTonton(false);
		setTab("aktivitas");
	};

	return createPortal(
		<div className="fixed inset-0 z-[100] flex items-stretch justify-center bg-slate-900/50 backdrop-blur-sm sm:items-center sm:p-4" onClick={onTutup}>
			<section
				role="dialog"
				aria-modal="true"
				aria-label="Monitor user online"
				onClick={(e) => e.stopPropagation()}
				className="flex h-full w-full max-w-7xl flex-col overflow-hidden bg-white shadow-2xl sm:h-[88vh] sm:rounded-3xl"
			>
				<header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
					<div className="flex min-w-0 items-center gap-3">
						<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
							<LuWifi className="h-5 w-5" />
						</span>
						<div className="min-w-0">
							<h2 className="m-0 truncate text-base font-bold text-slate-900">Monitor User Online</h2>
							<p className="m-0 flex items-center gap-1.5 text-xs text-slate-500">
								<span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
								{users.length} pengguna online · {jumlahBisaDitonton} bisa ditonton
							</p>
						</div>
					</div>
					<button ref={tutupRef} type="button" onClick={onTutup} aria-label="Tutup" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
						<LuX className="h-5 w-5" />
					</button>
				</header>

				{/* HP: dua kolom tidak muat, jadi bergantian lewat tab */}
				<div role="tablist" aria-label="Tampilan monitor" className="grid shrink-0 grid-cols-2 gap-1 border-b border-slate-100 p-2 lg:hidden">
					{[
						["online", `Online (${users.length})`],
						["aktivitas", "Aktivitas"],
					].map(([kode, teks]) => (
						<button
							key={kode}
							type="button"
							role="tab"
							aria-selected={tab === kode}
							onClick={() => setTab(kode)}
							className={`rounded-lg py-2 text-sm font-semibold ${tab === kode ? "bg-slate-900 text-white" : "text-slate-500"}`}
						>
							{teks}
						</button>
					))}
				</div>

				<div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
					<div className={`min-h-0 flex-col border-slate-100 lg:flex lg:border-r ${tab === "online" ? "flex" : "hidden"}`}>
						<div className="flex shrink-0 gap-2 p-3">
							<label className="relative min-w-0 flex-1">
								<LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<input
									type="search"
									value={cari}
									onChange={(e) => setCari(e.target.value)}
									placeholder="Cari nama, email, wilayah"
									aria-label="Cari user online"
									className="h-10 w-full rounded-xl bg-slate-100 pl-9 pr-3 text-sm text-slate-900 outline-none focus:bg-white focus:ring-2 focus:ring-slate-900"
								/>
							</label>
							<select
								value={peran}
								onChange={(e) => setPeran(e.target.value)}
								aria-label="Saring peran"
								className="h-10 w-28 shrink-0 rounded-xl bg-slate-100 px-2 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-slate-900"
							>
								<option value="">Semua</option>
								{daftarPeran.map((r) => (
									<option key={r} value={r}>
										{ROLE_LABELS[r] || r}
									</option>
								))}
							</select>
						</div>
						<div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
							{gagal ? (
								<p className="p-6 text-center text-sm text-rose-600">Gagal memuat user online. Mencoba lagi otomatis.</p>
							) : memuat ? (
								<p className="p-6 text-center text-sm text-slate-400">Memuat…</p>
							) : tampil.length === 0 ? (
								<div className="p-8 text-center text-slate-400">
									<LuUser className="mx-auto mb-2 h-9 w-9" />
									<p className="m-0 text-sm">{users.length ? "Tidak ada yang cocok" : "Tidak ada user online"}</p>
								</div>
							) : (
								tampil.map((u) => (
									<button
										key={u.id}
										type="button"
										onClick={() => pilihUser(u)}
										aria-pressed={pilihId === u.id}
										className={`flex w-full items-start gap-3 rounded-xl p-2.5 text-left transition ${pilihId === u.id ? "bg-slate-900 text-white" : "hover:bg-slate-50"}`}
									>
										<Avatar user={u} />
										<span className="min-w-0 flex-1">
											<span className="flex items-center justify-between gap-2">
												<span className="flex min-w-0 items-center gap-1.5">
													<span className="truncate text-sm font-semibold">{u.name}</span>
													{u.bisa_ditonton && <LuMonitor className={`h-3.5 w-3.5 shrink-0 ${pilihId === u.id ? "text-emerald-300" : "text-emerald-600"}`} title="Layar bisa ditonton" aria-label="Layar bisa ditonton" />}
												</span>
												<span className={`shrink-0 text-[11px] ${pilihId === u.id ? "text-white/60" : "text-slate-400"}`}>{timeAgo(u.last_active_at)}</span>
											</span>
											<span className="mt-0.5 flex items-center gap-1.5">
												<span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${ROLE_COLORS[u.role] || "bg-gray-100 text-gray-700"}`}>{ROLE_LABELS[u.role] || u.role}</span>
												{wilayahUser(u) && <span className={`truncate text-[11px] ${pilihId === u.id ? "text-white/70" : "text-slate-500"}`}>{wilayahUser(u)}</span>}
											</span>
											{u.halaman_kini && <span className={`mt-0.5 block truncate text-[11px] ${pilihId === u.id ? "text-white/70" : "text-slate-400"}`}>{labelHalaman(u.halaman_kini)}</span>}
										</span>
									</button>
								))
							)}
						</div>
					</div>

					<div className={`min-h-0 flex-col lg:flex ${tab === "aktivitas" ? "flex" : "hidden"}`}>
						{dipilih && (
							<div className="flex shrink-0 items-start gap-3 border-b border-slate-100 bg-slate-50 p-3">
								<Avatar user={dipilih} />
								<div className="min-w-0 flex-1">
									<p className="m-0 truncate text-sm font-bold text-slate-900">{dipilih.name}</p>
									<p className="m-0 truncate text-xs text-slate-500">{dipilih.email}</p>
									<div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
										{dipilih.last_login && (
											<span className="flex items-center gap-1">
												<Perangkat className="h-3 w-3" /> {dipilih.last_login.browser} · {dipilih.last_login.os}
											</span>
										)}
										{dipilih.last_login?.ip_address && <span className="font-mono">{dipilih.last_login.ip_address}</span>}
										{wilayahUser(dipilih) && (
											<span className="flex items-center gap-1">
												<LuMapPin className="h-3 w-3" /> {wilayahUser(dipilih)}
											</span>
										)}
									</div>
								</div>
								<div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
									{dipilih.role !== "superadmin" && (
										<button type="button" onClick={() => setTonton((v) => !v)} aria-pressed={tonton} className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${tonton ? "bg-slate-200 text-slate-800" : "bg-slate-900 text-white hover:bg-slate-700"}`}>
											<LuMonitor className="h-3.5 w-3.5" /> {tonton ? "Tutup layar" : "Tonton layar"}
										</button>
									)}
									<button type="button" onClick={() => { setPilih(null); setTonton(false); }} className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200">
										Semua user
									</button>
								</div>
							</div>
						)}
						{tonton && dipilih ? (
							<Suspense fallback={<p className="p-8 text-center text-sm text-slate-400">Memuat…</p>}>
								<CerminLayarPanel key={dipilih.id} user={dipilih} />
							</Suspense>
						) : (
						<>
						<div className="flex shrink-0 flex-wrap items-center justify-between gap-2 p-3">
							<h3 className="m-0 flex items-center gap-2 text-sm font-bold text-slate-900">
								<LuActivity className="h-4 w-4 text-emerald-600" /> Aktivitas langsung
							</h3>
							<div role="radiogroup" aria-label="Saring aktivitas" className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
								{SARINGAN.map(([kode, teks]) => (
									<button
										key={kode}
										type="button"
										role="radio"
										aria-checked={saring === kode}
										onClick={() => setSaring(kode)}
										className={`rounded-md px-2 py-1 text-xs font-semibold ${saring === kode ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"}`}
									>
										{teks}
									</button>
								))}
							</div>
						</div>
						<ol className="m-0 min-h-0 flex-1 list-none overflow-y-auto px-3 pb-3" aria-live="off">
							{feedTampil.length === 0 ? (
								<li className="p-8 text-center text-sm text-slate-400">Menunggu aktivitas baru…</li>
							) : (
								feedTampil.map((a) => {
									const j = JENIS[a.jenis] || JENIS.ubah;
									const Ikon = j.ikon;
									return (
										<li key={a.id} className="flex items-start gap-3 border-b border-slate-50 py-2">
											<span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${j.warna}`}>
												<Ikon className="h-3.5 w-3.5" />
											</span>
											<div className="min-w-0 flex-1">
												<p className="m-0 text-[13px] leading-snug text-slate-800">
													{!pilihId && <b className="font-semibold">{a.nama} </b>}
													{a.jenis === "halaman" ? `membuka ${labelHalaman(a.path)}` : a.teks}
													{a.status >= 400 && <span className="ml-1.5 rounded bg-rose-100 px-1 py-px text-[10px] font-bold text-rose-700">gagal {a.status}</span>}
												</p>
												<p className="m-0 mt-0.5 truncate font-mono text-[11px] text-slate-400">
													{[a.path, a.ip].filter(Boolean).join(" · ")}
												</p>
											</div>
											<time dateTime={a.waktu} className="mt-0.5 shrink-0 font-mono text-[11px] tabular-nums text-slate-400">
												{jam(a.waktu)}
											</time>
										</li>
									);
								})
							)}
						</ol>
						</>
						)}
					</div>
				</div>
			</section>
		</div>,
		document.body,
	);
}
