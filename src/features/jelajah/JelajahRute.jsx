import { Suspense, lazy, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LayarMemuat from "./ui/LayarMemuat";

// Hanya satu tab yang boleh menulis simpanan. JelajahPage baru diimpor setelah kunci didapat,
// jadi tab yang tertahan tidak punya timer yang menulis localStorage.
const JelajahPage = lazy(() => import("./JelajahPage"));
const NAMA = "jelajah-tab";
let lepas = null;
let tundaLepas = null;
let meminta = false; // pasang-ganda StrictMode tidak boleh meminta dua kali: yang kedua dikira tab lain
let kabari = () => {};

function ambil(steal) {
	if (!navigator.locks) return kabari("milik");
	if (meminta) return;
	meminta = true;
	navigator.locks
		.request(NAMA, steal ? { steal: true } : { ifAvailable: true }, (kunci) => {
			meminta = false;
			if (!kunci) return kabari("tertahan");
			kabari("milik");
			return new Promise((r) => {
				lepas = r;
			});
		})
		.catch(() => location.reload()); // kunci dicuri tab lain: muat ulang, lalu tertahan
}

export default function JelajahRute() {
	const [status, setStatus] = useState("cek");

	useEffect(() => {
		clearTimeout(tundaLepas);
		kabari = setStatus;
		// remount StrictMode: kunci masih dipegang, bukan tab lain
		if (lepas) setStatus("milik");
		else ambil(false);
		return () => {
			tundaLepas = setTimeout(() => {
				lepas?.();
				lepas = null;
			}, 200);
		};
	}, []);

	if (status === "cek") return <LayarMemuat />;
	if (status === "tertahan")
		return (
			<main className="flex min-h-screen items-center justify-center bg-slate-900 p-6 text-white">
				<div className="max-w-sm text-center">
					<h1 className="text-xl font-extrabold">Jelajah sudah terbuka di tab lain</h1>
					<p className="mt-2 text-sm text-white/70">Kemajuan hanya tersimpan dari satu tab supaya tidak saling menimpa.</p>
					<button onClick={() => ambil(true)} className="mt-5 w-full rounded-2xl bg-emerald-600 px-5 py-3 font-bold hover:bg-emerald-500">
						Pakai di tab ini
					</button>
					<Link to="/" className="mt-3 block text-sm text-white/70 underline hover:text-white">
						Kembali ke beranda
					</Link>
				</div>
			</main>
		);
	return (
		<Suspense fallback={<LayarMemuat />}>
			<JelajahPage />
		</Suspense>
	);
}
