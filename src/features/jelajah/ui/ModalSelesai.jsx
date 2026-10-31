import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import confetti from "canvas-confetti";
import { FiAward, FiLogIn } from "react-icons/fi";

export default function ModalSelesai({ onTutup }) {
	const tombol = useRef(null);

	useEffect(() => {
		tombol.current?.focus();
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ["#1f6b50", "#b8862b", "#ffffff", "#db2777"] });
	}, []);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
			<section
				role="dialog"
				aria-modal="true"
				aria-labelledby="judul-selesai"
				className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-2xl"
			>
				<div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
					<FiAward className="h-7 w-7" />
				</div>
				<h2 id="judul-selesai" className="mt-4 text-xl font-bold text-slate-900">
					Semua ruang sudah Anda kunjungi!
				</h2>
				<p className="mt-2 text-sm leading-relaxed text-slate-600">
					Kini Anda mengenal ketujuh bidang DPMD Kabupaten Bogor beserta layanannya. Layanan publik bisa langsung dibuka,
					sedangkan layanan desa dan pegawai dipakai lewat akun masing-masing.
				</p>
				<div className="mt-6 grid gap-2">
					<Link
						to="/login"
						className="inline-flex items-center justify-center gap-2 rounded-xl bg-[rgb(var(--color-primary))] px-4 py-3 text-sm font-semibold text-white"
					>
						<FiLogIn /> Masuk ke Sistem
					</Link>
					<Link
						to="/bantuan-keuangan"
						className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
					>
						Lihat data bantuan keuangan
					</Link>
					<button ref={tombol} onClick={onTutup} className="rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-slate-50">
						Lanjut menjelajah
					</button>
				</div>
			</section>
		</div>
	);
}
