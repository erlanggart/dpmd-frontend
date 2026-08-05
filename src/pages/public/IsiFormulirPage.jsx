import React, { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, FileText, Loader2, Lock, LogIn, Send, XCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getFormulirPublik, kirimFormulir } from "../../api/formulirApi";
import PertanyaanIsian from "../bidang/formulir/PertanyaanIsian";
import { NILAI_LAINNYA, formatWaktu, jawabanKosong } from "../bidang/formulir/formulirUtils";

/**
 * Halaman pengisian formulir — dibuka lewat tautan /f/:token, TANPA login.
 *
 * Validasi di sini menyalin aturan yang sama dengan server. Bukan pengaman
 * (server tetap memeriksa ulang), melainkan supaya kesalahan ketik ditandai di
 * kolomnya masing-masing, bukan dibalas satu pesan setelah seluruh isian —
 * termasuk lampiran — telanjur terkirim.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const Bingkai = ({ children }) => (
	<div className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 sm:py-10">
		<div className="mx-auto max-w-2xl space-y-3">{children}</div>
	</div>
);

const Pemberitahuan = ({ ikon: Ikon, judul, keterangan, aksi }) => (
	<Bingkai>
		<div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
			<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100">
				<Ikon className="h-6 w-6 text-slate-500" />
			</div>
			<h1 className="text-lg font-semibold text-slate-900">{judul}</h1>
			{keterangan && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{keterangan}</p>}
			{aksi}
		</div>
	</Bingkai>
);

const IsiFormulirPage = () => {
	const { token } = useParams();
	const navigate = useNavigate();

	const [memuat, setMemuat] = useState(true);
	const [data, setData] = useState(null);
	const [galatMuat, setGalatMuat] = useState(null);
	const [jawaban, setJawaban] = useState({});
	const [berkas, setBerkas] = useState({});
	const [namaResponden, setNamaResponden] = useState("");
	const [galat, setGalat] = useState({});
	const [mengirim, setMengirim] = useState(false);
	const [terkirim, setTerkirim] = useState(null);

	const wadah = useRef(null);

	const muat = useCallback(async () => {
		setMemuat(true);
		setGalatMuat(null);
		try {
			const r = await getFormulirPublik(token);
			const d = r.data.data;
			setData(d);
			if (d.pertanyaan) {
				setJawaban(
					Object.fromEntries(
						d.pertanyaan.filter((p) => p.tipe !== "bagian").map((p) => [p.id, jawabanKosong(p.tipe)])
					)
				);
			}
			setBerkas({});
			setGalat({});
		} catch (e) {
			setGalatMuat(e.response?.data?.message || "Formulir tidak dapat dibuka.");
		} finally {
			setMemuat(false);
		}
	}, [token]);

	useEffect(() => {
		muat();
	}, [muat]);

	// Judul tab ikut nama formulir: tautan ini sering dibuka bersama belasan tab
	// lain, dan "Vite App" tidak membantu siapa pun menemukannya kembali.
	useEffect(() => {
		if (data?.judul) document.title = `${data.judul} — Formulir DPMD`;
	}, [data?.judul]);

	const ubahJawaban = (id, nilai) => {
		setJawaban((j) => ({ ...j, [id]: nilai }));
		setGalat((g) => {
			if (!g[id]) return g;
			const { [id]: _dibuang, ...sisa } = g;
			return sisa;
		});
	};

	/** Bersihkan penanda "Lainnya" yang dicentang tapi teksnya kosong. */
	const rapikanNilai = (p, nilai) => {
		if (p.tipe === "kotak_centang") {
			return (Array.isArray(nilai) ? nilai : []).filter((v) => v && v !== NILAI_LAINNYA);
		}
		return nilai;
	};

	const periksa = () => {
		const temuan = {};
		for (const p of data.pertanyaan) {
			if (p.tipe === "bagian") continue;
			const set = p.pengaturan || {};
			const nilai = rapikanNilai(p, jawaban[p.id]);
			const lampiran = berkas[p.id] || [];

			if (p.tipe === "unggah_berkas") {
				if (p.wajib && !lampiran.length) temuan[p.id] = "Berkas wajib dilampirkan.";
				continue;
			}

			const kosong = Array.isArray(nilai) ? nilai.length === 0 : !String(nilai ?? "").trim();
			if (kosong) {
				if (p.wajib) temuan[p.id] = "Pertanyaan ini wajib diisi.";
				continue;
			}

			if (p.tipe === "kotak_centang") {
				if (set.min_pilih && nilai.length < set.min_pilih) {
					temuan[p.id] = `Pilih minimal ${set.min_pilih} jawaban.`;
				} else if (set.maks_pilih && nilai.length > set.maks_pilih) {
					temuan[p.id] = `Pilih maksimal ${set.maks_pilih} jawaban.`;
				}
				continue;
			}

			const teks = String(nilai).trim();
			if (set.validasi === "email" && !EMAIL_RE.test(teks)) {
				temuan[p.id] = "Masukkan alamat email yang benar.";
			} else if (set.validasi === "angka" && !Number.isFinite(Number(teks))) {
				temuan[p.id] = "Masukkan angka.";
			} else if (set.validasi === "url" && !/^https?:\/\/\S+$/i.test(teks)) {
				temuan[p.id] = "Masukkan tautan yang diawali http:// atau https://";
			}
		}
		return temuan;
	};

	const kirim = async () => {
		const temuan = periksa();
		setGalat(temuan);
		if (Object.keys(temuan).length) {
			// Gulir ke kesalahan pertama: pada formulir panjang, pesan di bawah layar
			// terbaca sebagai "tombol kirim tidak berfungsi".
			const pertamaId = data.pertanyaan.find((p) => temuan[p.id])?.id;
			wadah.current
				?.querySelector(`[data-pertanyaan="${pertamaId}"]`)
				?.scrollIntoView({ behavior: "smooth", block: "center" });
			return;
		}

		setMengirim(true);
		try {
			const muatan = {};
			for (const p of data.pertanyaan) {
				if (p.tipe === "bagian" || p.tipe === "unggah_berkas") continue;
				const nilai = rapikanNilai(p, jawaban[p.id]);
				const kosong = Array.isArray(nilai) ? nilai.length === 0 : !String(nilai ?? "").trim();
				if (!kosong) muatan[p.id] = nilai;
			}

			const r = await kirimFormulir(token, muatan, berkas, namaResponden);
			setTerkirim(r.data.data);
			window.scrollTo({ top: 0, behavior: "smooth" });
		} catch (e) {
			const pesan = e.response?.data?.message || "Gagal mengirim jawaban. Coba lagi.";
			setGalat({ _umum: pesan });
			// Formulir yang ditutup atau kuotanya penuh di tengah pengisian perlu
			// dimuat ulang supaya layarnya menjelaskan keadaan sebenarnya.
			if ([409, 401].includes(e.response?.status)) muat();
		} finally {
			setMengirim(false);
		}
	};

	// ---------- Keadaan khusus ----------
	if (memuat) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-100">
				<Loader2 className="h-6 w-6 animate-spin text-slate-900" />
			</div>
		);
	}

	if (galatMuat) {
		return <Pemberitahuan ikon={XCircle} judul="Formulir tidak ditemukan" keterangan={galatMuat} />;
	}

	if (terkirim) {
		return (
			<Bingkai>
				<div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
					<div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-50">
						<CheckCircle2 className="h-6 w-6 text-emerald-600" />
					</div>
					<h1 className="text-lg font-semibold text-slate-900">{data.judul}</h1>
					<p className="mx-auto mt-2 max-w-md whitespace-pre-line text-sm leading-6 text-slate-600">
						{terkirim.pesan_konfirmasi || "Terima kasih, jawaban Anda sudah kami terima."}
					</p>
					<p className="mt-3 text-xs text-slate-400">Terkirim {formatWaktu(terkirim.dikirim_pada)}</p>
					<button
						onClick={() => {
							setTerkirim(null);
							muat();
						}}
						className="mt-6 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
					>
						Kirim jawaban lain
					</button>
				</div>
			</Bingkai>
		);
	}

	if (data.perlu_masuk) {
		return (
			<Pemberitahuan
				ikon={Lock}
				judul={data.judul}
				keterangan={data.alasan}
				aksi={
					<button
						onClick={() => navigate(`/login?redirect=${encodeURIComponent(`/f/${token}`)}`)}
						className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
					>
						<LogIn className="h-4 w-4" />
						Masuk untuk mengisi
					</button>
				}
			/>
		);
	}

	if (data.sudah_mengisi) {
		return (
			<Pemberitahuan
				ikon={CheckCircle2}
				judul={data.judul}
				keterangan={`${data.alasan} Dikirim ${formatWaktu(data.dikirim_pada)}.`}
			/>
		);
	}

	if (data.tertutup) {
		return <Pemberitahuan ikon={Lock} judul={data.judul} keterangan={data.alasan} />;
	}

	// ---------- Formulir ----------
	const adaWajib = data.pertanyaan.some((p) => p.wajib);

	return (
		<Bingkai>
			<div ref={wadah} className="space-y-3">
				<div className="rounded-xl border-t-4 border-slate-900 bg-white px-5 py-5 sm:px-6 sm:py-6">
					<div className="flex items-start gap-3">
						<div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
							<FileText className="h-4 w-4" />
						</div>
						<div className="min-w-0">
							<h1 className="text-xl font-semibold tracking-tight text-slate-900">{data.judul}</h1>
							<p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">
								Dinas Pemberdayaan Masyarakat dan Desa Kabupaten Bogor
							</p>
						</div>
					</div>
					{data.deskripsi && (
						<p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{data.deskripsi}</p>
					)}
					{data.responden && (
						<p className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
							Mengisi sebagai <span className="font-semibold text-slate-700">{data.responden.nama}</span>
							{data.kumpulkan_email && data.responden.email ? ` (${data.responden.email})` : ""}
						</p>
					)}
					{adaWajib && <p className="mt-3 text-xs font-medium text-rose-600">* Wajib diisi</p>}
				</div>

				{/* Nama pengisi hanya ditanyakan bila formulirnya terbuka untuk umum;
				    kalau wajib login, namanya sudah pasti dari akun. */}
				{!data.butuh_login && (
					<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
						<div className="border-l-4 border-transparent px-5 py-4 sm:px-6">
							<p className="text-sm font-medium text-slate-900">Nama Anda</p>
							<p className="mt-1 text-sm text-slate-500">Opsional, untuk memudahkan kami menindaklanjuti.</p>
							<input
								value={namaResponden}
								onChange={(e) => setNamaResponden(e.target.value)}
								placeholder="Nama"
								className="mt-3 w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
							/>
						</div>
					</div>
				)}

				{data.pertanyaan.map((p) => (
					<div
						key={p.id}
						data-pertanyaan={p.id}
						className="overflow-hidden rounded-xl border border-slate-200 bg-white"
					>
						<PertanyaanIsian
							pertanyaan={p}
							nilai={jawaban[p.id] ?? jawabanKosong(p.tipe)}
							onUbah={(v) => ubahJawaban(p.id, v)}
							berkas={berkas[p.id] || []}
							onBerkas={(daftar) => {
								setBerkas((b) => ({ ...b, [p.id]: daftar }));
								setGalat((g) => {
									if (!g[p.id]) return g;
									const { [p.id]: _dibuang, ...sisa } = g;
									return sisa;
								});
							}}
							galat={galat[p.id]}
						/>
					</div>
				))}

				{galat._umum && (
					<div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-medium text-rose-700">
						{galat._umum}
					</div>
				)}

				<div className="flex flex-col gap-3 pb-10 sm:flex-row sm:items-center sm:justify-between">
					<button
						onClick={kirim}
						disabled={mengirim}
						className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-300"
					>
						{mengirim ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
						{mengirim ? "Mengirim…" : "Kirim"}
					</button>
					<p className="text-xs text-slate-400">
						Jangan pernah mengirimkan kata sandi melalui formulir ini.
					</p>
				</div>
			</div>
		</Bingkai>
	);
};

export default IsiFormulirPage;
