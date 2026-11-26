import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { LuLogOut, LuMonitorSmartphone, LuSmartphone, LuDownload, LuShare, LuEllipsisVertical, LuCircleCheckBig } from "react-icons/lu";
import { useAuth } from "../../context/AuthContext";
import { getPlatform, promptPWAInstall } from "../../utils/pwaDetection";
import AbsensiPage from "../pegawai/AbsensiPage";

// Halaman mandiri akun perangkat_desa. Presensi hanya lewat PWA di HP:
// PWA -> presensi; HP biasa -> arahan pasang aplikasi; laptop/PC -> arahan memakai HP.

const isStandalone = () =>
	window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

// iPadOS 13+ mengaku sebagai Mac, dikenali dari layar sentuhnya.
const jenisPerangkat = () => {
	const platform = getPlatform();
	if (platform === "iOS" || platform === "Android") return platform;
	if (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1) return "iOS";
	return "Desktop";
};

const Langkah = ({ no, children }) => (
	<li className="flex gap-3">
		<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">{no}</span>
		<span className="text-sm text-slate-600">{children}</span>
	</li>
);

const KartuPasang = ({ platform }) => {
	const [siapPasang, setSiapPasang] = useState(Boolean(window.deferredPrompt));
	const [terpasang, setTerpasang] = useState(false);

	// Memakai penangkap beforeinstallprompt milik utils/pwaDetection (tanpa listener ganda).
	useEffect(() => {
		const sedia = () => setSiapPasang(true);
		const selesai = () => setTerpasang(true);
		window.addEventListener("pwa-install-available", sedia);
		window.addEventListener("pwa-installed", selesai);
		return () => {
			window.removeEventListener("pwa-install-available", sedia);
			window.removeEventListener("pwa-installed", selesai);
		};
	}, []);

	const pasang = async () => {
		if (await promptPWAInstall()) setTerpasang(true);
		setSiapPasang(Boolean(window.deferredPrompt));
	};

	if (terpasang) {
		return (
			<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
				<LuCircleCheckBig className="mx-auto h-10 w-10 text-emerald-500" />
				<h2 className="mt-3 text-lg font-bold text-slate-800">Aplikasi terpasang</h2>
				<p className="mt-1 text-sm text-slate-600">Buka aplikasi DPMD dari layar utama lalu masuk dengan NIPD.</p>
			</div>
		);
	}

	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<div className="flex items-center gap-3">
				<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
					<LuSmartphone className="h-6 w-6 text-orange-500" />
				</div>
				<div>
					<h2 className="text-lg font-bold text-slate-800">Pasang Aplikasi DPMD</h2>
					<p className="text-xs text-slate-500">Presensi hanya bisa dilakukan lewat aplikasi di HP.</p>
				</div>
			</div>

			{siapPasang && platform !== "iOS" && (
				<button
					onClick={pasang}
					className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-sm active:scale-[0.98]"
				>
					<LuDownload className="h-4 w-4" /> Install
				</button>
			)}

			{(!siapPasang || platform === "iOS") && (
				<div className="mt-5">
					<p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Langkah manual</p>
					{platform === "iOS" ? (
						<ol className="space-y-3">
							<Langkah no={1}>Buka halaman ini di <b>Safari</b>.</Langkah>
							<Langkah no={2}>Ketuk tombol <b>Bagikan</b> <LuShare className="mx-0.5 inline h-4 w-4" />.</Langkah>
							<Langkah no={3}>Pilih <b>Tambah ke Layar Utama</b>, lalu ketuk <b>Tambah</b>.</Langkah>
						</ol>
					) : (
						<ol className="space-y-3">
							<Langkah no={1}>Buka halaman ini di <b>Chrome</b>.</Langkah>
							<Langkah no={2}>Ketuk menu <LuEllipsisVertical className="mx-0.5 inline h-4 w-4" /> di pojok kanan atas.</Langkah>
							<Langkah no={3}>Pilih <b>Instal aplikasi</b> atau <b>Tambahkan ke layar utama</b>.</Langkah>
						</ol>
					)}
				</div>
			)}

			<p className="mt-5 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
				Setelah terpasang, buka aplikasi DPMD dari layar utama lalu masuk dengan NIPD.
			</p>
		</div>
	);
};

const KartuDesktop = () => {
	const alamat = `${window.location.origin}/login`;
	const [qr, setQr] = useState("");

	useEffect(() => {
		let batal = false;
		QRCode.toDataURL(alamat, { width: 224, margin: 1 })
			.then((url) => { if (!batal) setQr(url); })
			.catch((e) => console.error("Gagal membuat QR:", e));
		return () => { batal = true; };
	}, [alamat]);

	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
			<div className="flex items-center gap-3">
				<div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50">
					<LuMonitorSmartphone className="h-6 w-6 text-orange-500" />
				</div>
				<div>
					<h2 className="text-lg font-bold text-slate-800">Presensi hanya lewat HP</h2>
					<p className="text-xs text-slate-500">Presensi tidak tersedia di laptop/PC.</p>
				</div>
			</div>

			<ol className="mt-5 space-y-3">
				<Langkah no={1}>Buka alamat ini di HP Anda: <b className="break-all">{alamat}</b></Langkah>
				<Langkah no={2}>Pasang aplikasi DPMD ke layar utama HP.</Langkah>
				<Langkah no={3}>Masuk dengan <b>NIPD</b> dan sandi Anda.</Langkah>
			</ol>

			<div className="mt-5 flex flex-col items-center gap-2 rounded-xl bg-slate-50 p-4">
				{qr ? <img src={qr} alt="Kode QR alamat aplikasi" className="h-56 w-56" /> : <div className="h-56 w-56 animate-pulse rounded-lg bg-slate-200" />}
				<p className="text-xs text-slate-500">Pindai dengan kamera HP</p>
			</div>
		</div>
	);
};

const PresensiPerangkatDesaPage = () => {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const [pwa] = useState(isStandalone);
	const [platform] = useState(jenisPerangkat);

	const keluar = async () => {
		await logout();
		navigate("/", { replace: true });
	};

	const desa = user?.desa;
	const kecamatan = typeof desa?.kecamatan === "string" ? desa.kecamatan : desa?.kecamatan?.nama;
	const jabatan = user?.jabatan || user?.pegawai?.jabatan;

	return (
		<div className="min-h-[100dvh] bg-slate-50">
			<header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
				<div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-2.5">
					<div className="min-w-0">
						<p className="truncate text-sm font-bold text-slate-800">{user?.name || "Perangkat Desa"}</p>
						<p className="truncate text-[11px] text-slate-500">
							{[jabatan, desa?.nama && `Desa ${desa.nama}`, kecamatan && `Kec. ${kecamatan}`].filter(Boolean).join(" · ")}
						</p>
					</div>
					<button
						onClick={keluar}
						className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
					>
						<LuLogOut className="h-3.5 w-3.5" /> Keluar
					</button>
				</div>
			</header>

			{pwa ? (
				<AbsensiPage kelompok="perangkat_desa" />
			) : (
				<main className="mx-auto max-w-lg px-4 py-6">
					{platform === "Desktop" ? <KartuDesktop /> : <KartuPasang platform={platform} />}
				</main>
			)}
		</div>
	);
};

export default PresensiPerangkatDesaPage;
