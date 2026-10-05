// src/layouts/TenagaAhliLayout.jsx
//
// Kerangka halaman untuk akun Tenaga Ahli.
//
// Dibuat sebagai layout TERSENDIRI, bukan dengan menumpang DPMDStaffLayout lalu
// menyembunyikan menunya. Menu yang disembunyikan tetap punya rute, dan akun
// luar yang menebak alamat akan sampai ke halaman yang tidak pernah dimaksudkan
// untuknya. Di sini yang ada di sidebar adalah seluruh yang bisa dibuka — tidak
// ada menu tersembunyi, karena tidak ada rute lain di bawah /tenaga-ahli.
//
// Tiga pintu saja, jadi tidak ada sub-menu dan tidak ada status terbuka/tertutup
// yang perlu diingat antar halaman.
import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FiChevronDown, FiLogOut, FiMenu, FiX } from 'react-icons/fi';
import { LuBuilding2, LuChartPie, LuHandshake, LuUserCog } from 'react-icons/lu';
import { useAuth } from '../context/AuthContext';

const MENU = [
	{ id: 'ikhtisar', label: 'Ikhtisar', path: '/tenaga-ahli/ikhtisar', icon: LuChartPie },
	{ id: 'bumdes', label: 'BUM Desa', path: '/tenaga-ahli/bumdes', icon: LuBuilding2 },
	{ id: 'kerjasama', label: 'Kerja Sama Desa', path: '/tenaga-ahli/kerjasama', icon: LuHandshake },
];

const TenagaAhliLayout = () => {
	const { user, logout } = useAuth();
	const navigate = useNavigate();
	const [sidebarTerbuka, setSidebarTerbuka] = useState(true);
	const [dropdownTerbuka, setDropdownTerbuka] = useState(false);
	const acuanDropdown = useRef(null);

	useEffect(() => {
		const tutupDiLuar = (e) => {
			if (acuanDropdown.current && !acuanDropdown.current.contains(e.target)) {
				setDropdownTerbuka(false);
			}
		};
		document.addEventListener('mousedown', tutupDiLuar);
		return () => document.removeEventListener('mousedown', tutupDiLuar);
	}, []);

	const keluar = () => {
		logout();
		navigate('/', { replace: true });
	};

	const nama = user?.name || 'Tenaga Ahli';
	const inisial = nama.charAt(0).toUpperCase();

	return (
		<div className="flex h-screen bg-slate-50">
			{/* Bilah atas — hanya layar kecil */}
			<div className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm lg:hidden">
				<button
					onClick={() => setSidebarTerbuka(true)}
					className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-cyan-50 hover:text-cyan-700"
					aria-label="Buka menu"
				>
					<FiMenu className="text-2xl" />
				</button>
				<div className="flex items-center gap-2">
					<div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-teal-600 shadow-sm">
						<LuUserCog className="h-5 w-5 text-white" />
					</div>
					<span className="font-bold text-slate-800">Tenaga Ahli</span>
				</div>
				<div className="w-10" />
			</div>

			{/* Sidebar */}
			<aside
				className={`fixed left-0 top-0 z-40 h-full overflow-hidden border-r border-slate-200 bg-white text-slate-800 shadow-lg transition-all duration-300 ${
					sidebarTerbuka ? 'w-64 translate-x-0 sm:w-72' : '-translate-x-full lg:w-20 lg:translate-x-0'
				}`}
			>
				<div className="flex h-full flex-col">
					<div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-br from-cyan-50 via-teal-50 to-cyan-50 px-4 py-5">
						<div className="flex min-w-0 flex-1 items-center gap-3">
							<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-md">
								<LuUserCog className="h-6 w-6 text-white" />
							</div>
							{sidebarTerbuka && (
								<div className="min-w-0">
									<p className="text-sm font-bold leading-tight text-slate-800">Tenaga Ahli</p>
									<p className="mt-0.5 text-[10px] leading-tight text-slate-500">DPMD Kab. Bogor</p>
								</div>
							)}
						</div>
						<button
							onClick={() => setSidebarTerbuka(false)}
							className="shrink-0 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 lg:hidden"
							aria-label="Tutup menu"
						>
							<FiX className="text-xl" />
						</button>
					</div>

					{sidebarTerbuka && (
						<div className="mx-4 my-4 rounded-xl border border-cyan-100 bg-gradient-to-br from-cyan-50 to-teal-50 p-4">
							<div className="flex items-center gap-3">
								<div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 font-bold text-white shadow-sm">
									{inisial}
								</div>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-semibold text-slate-800">{nama}</p>
									{/* Disebut terang-terangan supaya tidak ada yang mencari tombol
									    simpan yang memang tidak ada di halaman mana pun. */}
									<p className="truncate text-[11px] font-medium text-cyan-700">
										Akses lihat &amp; ekspor
									</p>
								</div>
							</div>
						</div>
					)}

					<nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
						{MENU.map((item) => {
							const Ikon = item.icon;
							return (
								<NavLink
									key={item.id}
									to={item.path}
									onClick={() => {
										// Di layar kecil sidebar menutupi isi halaman; membiarkannya
										// terbuka setelah memilih menu berarti tujuan yang baru dibuka
										// tidak terlihat sama sekali.
										if (window.innerWidth < 1024) setSidebarTerbuka(false);
									}}
									className={({ isActive }) =>
										`flex items-center gap-3 rounded-xl px-4 py-3 transition-all duration-200 ${
											isActive
												? 'bg-gradient-to-r from-cyan-500 to-teal-600 text-white shadow-md shadow-cyan-200'
												: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
										} ${!sidebarTerbuka ? 'lg:justify-center lg:px-2' : ''}`
									}
								>
									<Ikon className="shrink-0 text-xl" />
									{sidebarTerbuka && <span className="text-sm font-medium">{item.label}</span>}
								</NavLink>
							);
						})}
					</nav>

					<div className="border-t border-slate-100 p-3">
						<button
							onClick={keluar}
							className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-slate-600 transition-all duration-200 hover:bg-red-50 hover:text-red-600 ${
								!sidebarTerbuka ? 'lg:justify-center lg:px-2' : ''
							}`}
						>
							<FiLogOut className="shrink-0 text-xl" />
							{sidebarTerbuka && <span className="text-sm font-medium">Keluar</span>}
						</button>
					</div>
				</div>
			</aside>

			{/* Area isi */}
			<div
				className={`mt-16 flex flex-1 flex-col transition-all duration-300 lg:mt-0 ${
					sidebarTerbuka ? 'lg:ml-72' : 'ml-0 lg:ml-20'
				}`}
			>
				<header className="hidden items-center justify-between border-b border-slate-200 bg-white px-6 py-3 lg:flex">
					<div className="flex items-center gap-2">
						<button
							onClick={() => setSidebarTerbuka((t) => !t)}
							className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-cyan-50 hover:text-cyan-700"
							aria-label="Buka atau tutup sidebar"
						>
							<FiMenu className="text-xl" />
						</button>
						<span className="text-sm text-slate-500">Portal Tenaga Ahli</span>
					</div>

					<div className="relative" ref={acuanDropdown}>
						<button
							onClick={() => setDropdownTerbuka((t) => !t)}
							className="flex items-center gap-2 rounded-lg px-3 py-1.5 transition-colors hover:bg-slate-50"
						>
							<div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 text-sm font-bold text-white">
								{inisial}
							</div>
							<span className="max-w-[160px] truncate text-sm font-medium text-slate-700">{nama}</span>
							<FiChevronDown
								className={`text-slate-400 transition-transform ${dropdownTerbuka ? 'rotate-180' : ''}`}
							/>
						</button>

						{dropdownTerbuka && (
							<div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
								<div className="border-b border-slate-100 bg-gradient-to-br from-cyan-50 to-teal-50 px-4 py-3">
									<p className="truncate text-sm font-semibold text-slate-800">{nama}</p>
									<p className="truncate text-xs text-slate-500">{user?.email || '—'}</p>
								</div>
								<button
									onClick={keluar}
									className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
								>
									<FiLogOut className="text-base" />
									Keluar
								</button>
							</div>
						)}
					</div>
				</header>

				<main className="flex-1 overflow-y-auto">
					<div className="p-3 sm:p-4 md:p-6">
						<Outlet />
					</div>
				</main>
			</div>

			{sidebarTerbuka && (
				<div
					className="fixed inset-0 z-30 bg-black/50 lg:hidden"
					onClick={() => setSidebarTerbuka(false)}
				/>
			)}
		</div>
	);
};

export default TenagaAhliLayout;
