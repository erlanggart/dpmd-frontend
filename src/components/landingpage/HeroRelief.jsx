import { Component, Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { KECAMATAN_DATA } from "./dataWilayah";
import { KataNaik } from "./JudulBagian";

const ReliefBogor = lazy(() => import("./ReliefBogor"));

const JUMLAH = KECAMATAN_DATA.reduce((t, k) => ({ desa: t.desa + k.desa, kelurahan: t.kelurahan + k.kelurahan }), { desa: 0, kelurahan: 0 });

/* Tanpa WebGL (atau bila relief gagal dimuat) hero tetap utuh tanpa peta. */
class PenjagaRelief extends Component {
	state = { gagal: false };
	static getDerivedStateFromError() { return { gagal: true }; }
	render() { return this.state.gagal ? null : this.props.children; }
}

export default function HeroRelief() {
	return (
		<div className="relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[#0a1220] text-[#eef2f7] lg:block">
			<PenjagaRelief>
				<Suspense fallback={null}>
					<ReliefBogor className="relative order-last h-[44svh] min-h-[300px] lg:absolute lg:inset-y-0 lg:right-0 lg:left-[calc(max(0px,50%-40rem)+36rem)] lg:h-full" />
				</Suspense>
			</PenjagaRelief>

			<div className="pointer-events-none relative mx-auto flex w-full max-w-7xl flex-col px-5 pb-4 pt-28 lg:min-h-[100svh] lg:px-8 lg:pb-10 lg:pt-40">
				<div className="pointer-events-auto max-w-[35rem]">
					<p data-masuk style={{ "--urut": 0 }} className="m-0 text-[15px] text-[#eef2f7]/75">Dinas Pemberdayaan Masyarakat dan Desa, Kabupaten Bogor</p>
					<h1 className="m-0 mt-4 text-[clamp(3rem,7.2vw,6.4rem)] font-extrabold leading-[0.94] tracking-[-0.045em]">
						<KataNaik teks="Membangun Bogor dari desa." mulai={1} />
					</h1>
					<p data-masuk style={{ "--urut": 5 }} className="m-0 mt-6 max-w-[30rem] text-[17px] leading-relaxed text-[#eef2f7]/80">
						Sistem informasi untuk {JUMLAH.desa} desa dan {JUMLAH.kelurahan} kelurahan di {KECAMATAN_DATA.length} kecamatan.
						Data aparatur, kelembagaan, BUMDes, sampai bantuan keuangan dikelola di satu tempat.
					</p>
					<div data-masuk style={{ "--urut": 6 }} className="mt-9 flex flex-wrap items-center gap-3">
						<Link to="/login" className="rounded-md bg-[#e3b23c] px-5 py-3 text-[15px] font-bold text-[#0a1220] transition hover:bg-[#edc35a] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e3b23c]">
							Masuk ke sistem
						</Link>
						<Link to="/bantuan-keuangan" className="rounded-md border border-[#eef2f7]/30 px-5 py-3 text-[15px] font-semibold transition hover:border-[#eef2f7]/70 hover:bg-[#eef2f7]/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#eef2f7]">
							Lihat bantuan keuangan
						</Link>
						<Link to="/jelajah" className="px-2 py-3 text-[15px] font-semibold text-[#eef2f7]/85 underline decoration-[#e3b23c] decoration-2 underline-offset-[6px] transition hover:text-white">
							Jelajahi kantor 3D
						</Link>
					</div>
				</div>

				<div data-masuk style={{ "--urut": 8 }} className="mt-auto hidden items-end justify-between gap-6 text-[12.5px] text-[#eef2f7]/55 lg:flex">
					<p className="m-0">Arahkan kursor ke peta untuk melihat kecamatan.</p>
					<ul className="m-0 flex list-none gap-5 p-0">
						<li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#f4c753]" />Desa</li>
						<li className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[#f8fafc]" />Kelurahan</li>
						<li className="flex items-center gap-2"><span className="h-px w-4 bg-[#cbd5e1]/70" />Batas kecamatan</li>
						<li className="flex items-center gap-2"><span className="h-px w-4 bg-[#e3b23c]" />Kontur tiap 100 m</li>
					</ul>
				</div>
			</div>
		</div>
	);
}
