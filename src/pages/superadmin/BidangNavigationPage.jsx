// src/pages/superadmin/BidangNavigationPage.jsx
// Pintu masuk ke lima bidang DPMD.
//
// Identitas bidang (nama, urutan, warna) tidak ditulis di sini — diambil dari
// `constants/bidang.js`, sumber yang sama dengan pengelompokan output Prolap,
// supaya satu bidang selalu berwarna sama di seluruh aplikasi.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutGrid, FileText, Hammer, Wallet, Users2, Landmark, ArrowUpRight } from 'lucide-react';
import { BIDANG } from '../../constants/bidang';
import { jumlahOutputBidang } from '../../constants/prolapOutputs';

// Ikon dipetakan per slug, bukan disimpan di konstanta bidang: pustaka ikon
// adalah urusan tampilan, bukan bagian dari identitas bidang.
const IKON = {
	sekretariat: FileText,
	spked: Hammer,
	kkd: Wallet,
	pmd: Users2,
	pemdes: Landmark,
};

const KartuBidang = ({ bidang, onClick }) => {
	const Icon = IKON[bidang.slug] || LayoutGrid;
	const output = jumlahOutputBidang(bidang.slug);
	return (
		<button
			onClick={onClick}
			style={{ '--aksen': bidang.accent }}
			className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white text-left shadow-sm ring-1 ring-slate-200/80 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/[0.06] hover:ring-[color:var(--aksen)]/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
		>
			{/* Kepala berwarna bidang: nama besar sebagai elemen utama, ikon jadi
			    cap air raksasa di belakangnya. Warna dipakai sebagai bidang penuh,
			    bukan sekadar kotak ikon kecil — itu yang membedakannya dari kartu
			    dasbor kebanyakan. */}
			<div
				className="relative isolate overflow-hidden px-6 pb-5 pt-6"
				style={{ backgroundColor: `${bidang.accent}12` }}
			>
				<Icon
					aria-hidden="true"
					className="pointer-events-none absolute -bottom-6 -right-5 h-32 w-32 -z-10 opacity-[0.13] transition-transform duration-500 ease-out group-hover:-translate-y-1 group-hover:rotate-3 group-hover:scale-110"
					style={{ color: bidang.accent }}
				/>

				<div className="flex items-start justify-between gap-3">
					<div className="min-w-0">
						<span
							className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-600 backdrop-blur-sm"
						>
							<span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: bidang.accent }} />
							Bidang
						</span>
						<h2 className="mt-2.5 truncate text-2xl font-bold tracking-tight text-slate-900">{bidang.short}</h2>
					</div>

					{/* Tombol panah membalik warna saat kartu disorot. */}
					<span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 text-slate-500 shadow-sm transition-all duration-300 group-hover:bg-[color:var(--aksen)] group-hover:text-white">
						<ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
					</span>
				</div>
			</div>

			{/* Badan putih: nama panjang + penjelasan. */}
			<div className="flex flex-1 flex-col px-6 pb-6 pt-5">
				<p className="text-[11px] font-semibold uppercase leading-relaxed tracking-wider text-slate-400">
					{bidang.label}
				</p>
				<p className="mt-2 flex-1 text-sm leading-relaxed text-slate-500">{bidang.description}</p>

				<div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
					<span className="text-xs font-medium text-slate-400">
						{output > 0 ? (
							<>
								<span className="font-bold tabular-nums text-slate-700">{output}</span> output Prolap
							</>
						) : (
							'Belum ada output Prolap'
						)}
					</span>
					<span className="text-xs font-semibold text-slate-400 transition-colors duration-300 group-hover:text-slate-900">
						Buka bidang
					</span>
				</div>
			</div>
		</button>
	);
};

const BidangNavigationPage = () => {
	const navigate = useNavigate();

	return (
		<div className="min-h-screen bg-slate-50">
			<div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
				{/* ---------- Kepala ---------- */}
				<div className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
							DPMD Kabupaten Bogor
						</p>
						<h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">Bidang &amp; Program</h1>
						<p className="mt-2 max-w-xl text-sm text-slate-500">
							Pilih bidang untuk membuka modul dan datanya.
						</p>
					</div>
					<div className="rounded-2xl bg-white px-4 py-2.5 shadow-sm ring-1 ring-slate-200/80">
						<p className="text-xl font-bold leading-none tabular-nums text-slate-900">{BIDANG.length}</p>
						<p className="mt-1 text-[11px] font-medium text-slate-500">Bidang aktif</p>
					</div>
				</div>

				{/* ---------- Kartu bidang ---------- */}
				<div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
					{BIDANG.map((bidang) => (
						<KartuBidang
							key={bidang.id}
							bidang={bidang}
							onClick={() => navigate(`/superadmin/bidang/${bidang.slug}`)}
						/>
					))}
				</div>
			</div>
		</div>
	);
};

export default BidangNavigationPage;
