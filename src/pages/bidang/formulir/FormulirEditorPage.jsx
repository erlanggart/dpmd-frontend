import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	ArrowLeft,
	BarChart3,
	Check,
	ChevronDown,
	Copy,
	Eye,
	GripVertical,
	Link2,
	Loader2,
	Plus,
	Save,
	Settings,
	Trash2,
	X,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import {
	getFormulir,
	simpanPertanyaan,
	tautanFormulir,
	ubahFormulir,
} from "../../../api/formulirApi";
import PertanyaanIsian from "./PertanyaanIsian";
import {
	LABEL_STATUS,
	TIPE_PERTANYAAN,
	TIPE_PILIHAN,
	infoTipe,
	keInputWaktuLokal,
} from "./formulirUtils";

const ISIAN =
	"w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900";

// Kunci lokal untuk pertanyaan yang belum punya id dari server. Dipakai sebagai
// React key supaya menyisipkan pertanyaan di tengah tidak membuat React memakai
// ulang state kolom isian milik pertanyaan lain.
let penghitungKunci = 0;
const kunciBaru = () => {
	penghitungKunci += 1;
	return `baru-${penghitungKunci}`;
};

const pertanyaanBaru = (tipe = "jawaban_singkat") => ({
	kunci: kunciBaru(),
	id: null,
	tipe,
	label: tipe === "bagian" ? "Judul bagian" : "Pertanyaan tanpa judul",
	deskripsi: "",
	wajib: false,
	opsi: TIPE_PILIHAN.includes(tipe) ? ["Opsi 1"] : [],
	pengaturan: tipe === "skala_linier" ? { min: 1, maks: 5, label_min: "", label_maks: "" } : {},
});

const Sakelar = ({ nyala, onUbah, label, keterangan, mati = false }) => (
	<button
		type="button"
		onClick={() => !mati && onUbah(!nyala)}
		className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
			mati ? "cursor-not-allowed border-slate-100 bg-slate-50" : "border-slate-200 hover:bg-slate-50"
		}`}
	>
		<span
			className={`mt-0.5 flex h-5 w-9 flex-shrink-0 items-center rounded-full p-0.5 transition-colors ${
				nyala ? "bg-slate-900" : "bg-slate-200"
			}`}
		>
			<span
				className={`h-4 w-4 rounded-full bg-white transition-transform ${nyala ? "translate-x-4" : ""}`}
			/>
		</span>
		<span className="min-w-0">
			<span className="block text-sm font-medium text-slate-900">{label}</span>
			{keterangan && <span className="mt-0.5 block text-xs leading-5 text-slate-500">{keterangan}</span>}
		</span>
	</button>
);

// ============================================================
// Pemilih tipe pertanyaan
// ============================================================
const PilihTipe = ({ nilai, onUbah }) => {
	const [buka, setBuka] = useState(false);
	const ref = useRef(null);
	const aktif = infoTipe(nilai);

	useEffect(() => {
		if (!buka) return undefined;
		const tutup = (e) => {
			if (ref.current && !ref.current.contains(e.target)) setBuka(false);
		};
		document.addEventListener("mousedown", tutup);
		return () => document.removeEventListener("mousedown", tutup);
	}, [buka]);

	return (
		<div className="relative w-full sm:w-52" ref={ref}>
			<button
				type="button"
				onClick={() => setBuka((v) => !v)}
				className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
			>
				<aktif.icon className="h-4 w-4 flex-shrink-0 text-slate-400" />
				<span className="min-w-0 flex-1 truncate text-left">{aktif.label}</span>
				<ChevronDown className="h-4 w-4 flex-shrink-0 text-slate-400" />
			</button>
			{buka && (
				<div className="absolute right-0 top-full z-[60] mt-1 w-full min-w-[13rem] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
					{TIPE_PERTANYAAN.map((t) => (
						<button
							key={t.kunci}
							type="button"
							onClick={() => {
								setBuka(false);
								onUbah(t.kunci);
							}}
							className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
						>
							<t.icon className="h-4 w-4 flex-shrink-0 text-slate-400" />
							<span className="flex-1">{t.label}</span>
							{t.kunci === nilai && <Check className="h-4 w-4 text-slate-900" />}
						</button>
					))}
				</div>
			)}
		</div>
	);
};

// ============================================================
// Satu kartu pertanyaan
// ============================================================
const KartuPertanyaan = ({
	pertanyaan: p,
	terpilih,
	onPilih,
	onUbah,
	onHapus,
	onDuplikat,
	onSeretMulai,
	onSeretAtas,
	onLepas,
	sedangDiseret,
}) => {
	const [bolehSeret, setBolehSeret] = useState(false);
	const punyaOpsi = TIPE_PILIHAN.includes(p.tipe);
	const set = p.pengaturan || {};

	const ubahOpsi = (i, nilai) => onUbah({ opsi: p.opsi.map((o, j) => (j === i ? nilai : o)) });
	const tambahOpsi = () => onUbah({ opsi: [...p.opsi, `Opsi ${p.opsi.length + 1}`] });
	const hapusOpsi = (i) => onUbah({ opsi: p.opsi.filter((_, j) => j !== i) });
	const ubahSetelan = (tambahan) => onUbah({ pengaturan: { ...set, ...tambahan } });

	return (
		<div
			draggable={bolehSeret}
			onDragStart={onSeretMulai}
			onDragEnd={() => setBolehSeret(false)}
			onDragOver={(e) => {
				e.preventDefault();
				onSeretAtas();
			}}
			onDrop={(e) => {
				e.preventDefault();
				onLepas();
			}}
			onClick={onPilih}
			className={`rounded-xl border bg-white transition-all ${
				sedangDiseret ? "opacity-40" : ""
			} ${terpilih ? "border-slate-900 shadow-sm" : "border-slate-200 hover:border-slate-300"}`}
		>
			{/* Pegangan seret. draggable baru dinyalakan saat pegangan ditekan supaya
			    menyeret teks di dalam kolom isian tidak ikut memindahkan kartunya. */}
			<div
				onMouseDown={() => setBolehSeret(true)}
				onMouseUp={() => setBolehSeret(false)}
				className="flex cursor-grab justify-center py-1.5 text-slate-300 hover:text-slate-400 active:cursor-grabbing"
				aria-label="Geser untuk memindahkan"
			>
				<GripVertical className="h-4 w-4 rotate-90" />
			</div>

			<div className="px-4 pb-4 sm:px-5">
				{/* ---------- Baris judul + tipe ---------- */}
				<div className="flex flex-col gap-3 sm:flex-row sm:items-start">
					<div className="min-w-0 flex-1 space-y-2">
						<input
							value={p.label}
							onChange={(e) => onUbah({ label: e.target.value })}
							placeholder={p.tipe === "bagian" ? "Judul bagian" : "Pertanyaan"}
							className={`${ISIAN} font-medium`}
						/>
						{(terpilih || p.deskripsi) && (
							<input
								value={p.deskripsi || ""}
								onChange={(e) => onUbah({ deskripsi: e.target.value })}
								placeholder="Keterangan (opsional)"
								className={`${ISIAN} text-slate-600`}
							/>
						)}
					</div>
					{terpilih && <PilihTipe nilai={p.tipe} onUbah={(tipe) => onUbah({ tipe })} />}
				</div>

				{/* ---------- Pilihan jawaban ---------- */}
				{punyaOpsi && (
					<div className="mt-3 space-y-2">
						{p.opsi.map((o, i) => (
							<div key={i} className="flex items-center gap-2">
								<span className="flex-shrink-0 text-xs text-slate-400">
									{p.tipe === "dropdown" ? `${i + 1}.` : p.tipe === "kotak_centang" ? "☐" : "○"}
								</span>
								<input
									value={o}
									onChange={(e) => ubahOpsi(i, e.target.value)}
									className="min-w-0 flex-1 border-b border-slate-200 py-1.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none"
								/>
								{p.opsi.length > 1 && (
									<button
										type="button"
										onClick={() => hapusOpsi(i)}
										className="flex-shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
										aria-label={`Hapus opsi ${i + 1}`}
									>
										<X className="h-4 w-4" />
									</button>
								)}
							</div>
						))}
						<div className="flex flex-wrap items-center gap-3 pt-1">
							<button
								type="button"
								onClick={tambahOpsi}
								className="text-sm font-semibold text-slate-700 hover:text-slate-900"
							>
								+ Tambah opsi
							</button>
							{p.tipe !== "dropdown" && (
								<label className="flex cursor-pointer items-center gap-2 text-sm text-slate-500">
									<input
										type="checkbox"
										checked={Boolean(set.opsi_lainnya)}
										onChange={(e) => ubahSetelan({ opsi_lainnya: e.target.checked })}
										className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
									/>
									Sertakan "Lainnya"
								</label>
							)}
						</div>
					</div>
				)}

				{/* ---------- Setelan khusus tipe ---------- */}
				{terpilih && p.tipe === "skala_linier" && (
					<div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
						<label className="text-xs font-medium text-slate-500">
							Dari
							<select
								value={set.min ?? 1}
								onChange={(e) => ubahSetelan({ min: Number(e.target.value) })}
								className={`${ISIAN} mt-1`}
							>
								{[0, 1].map((n) => (
									<option key={n} value={n}>
										{n}
									</option>
								))}
							</select>
						</label>
						<label className="text-xs font-medium text-slate-500">
							Sampai
							<select
								value={set.maks ?? 5}
								onChange={(e) => ubahSetelan({ maks: Number(e.target.value) })}
								className={`${ISIAN} mt-1`}
							>
								{[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
									<option key={n} value={n}>
										{n}
									</option>
								))}
							</select>
						</label>
						<label className="text-xs font-medium text-slate-500">
							Label terendah
							<input
								value={set.label_min || ""}
								onChange={(e) => ubahSetelan({ label_min: e.target.value })}
								placeholder="mis. Buruk"
								className={`${ISIAN} mt-1`}
							/>
						</label>
						<label className="text-xs font-medium text-slate-500">
							Label tertinggi
							<input
								value={set.label_maks || ""}
								onChange={(e) => ubahSetelan({ label_maks: e.target.value })}
								placeholder="mis. Sangat baik"
								className={`${ISIAN} mt-1`}
							/>
						</label>
					</div>
				)}

				{terpilih && p.tipe === "kotak_centang" && (
					<div className="mt-3 grid grid-cols-2 gap-3">
						<label className="text-xs font-medium text-slate-500">
							Minimal pilihan
							<input
								type="number"
								min={0}
								value={set.min_pilih || 0}
								onChange={(e) => ubahSetelan({ min_pilih: Number(e.target.value) })}
								className={`${ISIAN} mt-1`}
							/>
						</label>
						<label className="text-xs font-medium text-slate-500">
							Maksimal pilihan
							<input
								type="number"
								min={0}
								value={set.maks_pilih || 0}
								onChange={(e) => ubahSetelan({ maks_pilih: Number(e.target.value) })}
								className={`${ISIAN} mt-1`}
							/>
						</label>
						<p className="col-span-2 text-xs text-slate-400">Isi 0 untuk tanpa batas.</p>
					</div>
				)}

				{terpilih && ["jawaban_singkat", "paragraf"].includes(p.tipe) && (
					<label className="mt-3 block text-xs font-medium text-slate-500">
						Periksa isian
						<select
							value={set.validasi || ""}
							onChange={(e) => ubahSetelan({ validasi: e.target.value })}
							className={`${ISIAN} mt-1 sm:w-56`}
						>
							<option value="">Tanpa pemeriksaan</option>
							<option value="email">Harus alamat email</option>
							<option value="angka">Harus angka</option>
							<option value="url">Harus tautan</option>
						</select>
					</label>
				)}

				{terpilih && p.tipe === "unggah_berkas" && (
					<label className="mt-3 block text-xs font-medium text-slate-500">
						Jumlah berkas maksimal
						<select
							value={set.maks_berkas || 1}
							onChange={(e) => ubahSetelan({ maks_berkas: Number(e.target.value) })}
							className={`${ISIAN} mt-1 sm:w-40`}
						>
							{[1, 2, 3, 4, 5].map((n) => (
								<option key={n} value={n}>
									{n}
								</option>
							))}
						</select>
					</label>
				)}

				{/* ---------- Kaki kartu ---------- */}
				{terpilih && (
					<div className="mt-4 flex flex-wrap items-center justify-end gap-1 border-t border-slate-100 pt-3">
						{p.tipe !== "bagian" && (
							<label className="mr-auto flex cursor-pointer items-center gap-2 text-sm text-slate-600">
								<input
									type="checkbox"
									checked={Boolean(p.wajib)}
									onChange={(e) => onUbah({ wajib: e.target.checked })}
									className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
								/>
								Wajib diisi
							</label>
						)}
						<button
							type="button"
							onClick={onDuplikat}
							className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
							aria-label="Duplikat pertanyaan"
						>
							<Copy className="h-4 w-4" />
						</button>
						<button
							type="button"
							onClick={onHapus}
							className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
							aria-label="Hapus pertanyaan"
						>
							<Trash2 className="h-4 w-4" />
						</button>
					</div>
				)}
			</div>
		</div>
	);
};

// ============================================================
// Panel setelan
// ============================================================
const PanelSetelan = ({ formulir, onUbah, onTutup }) => (
	// z-[100]: bilah navigasi mengambang PegawaiLayout memakai z-50 dan menang di
	// z yang sama, sehingga tombol di kaki panel jadi tidak bisa diklik.
	<div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
		<div className="fixed inset-0 bg-black/50" onClick={onTutup} />
		<div className="relative flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">
			<div className="flex flex-shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
				<h3 className="text-base font-semibold text-slate-900">Setelan formulir</h3>
				<button
					onClick={onTutup}
					className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900"
					aria-label="Tutup"
				>
					<X className="h-5 w-5" />
				</button>
			</div>

			<div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
				<Sakelar
					nyala={formulir.butuh_login}
					onUbah={(v) => onUbah({ butuh_login: v })}
					mati={formulir.satu_respons || formulir.kumpulkan_email}
					label="Wajib masuk akun"
					keterangan={
						formulir.satu_respons || formulir.kumpulkan_email
							? "Tidak bisa dimatikan selama pembatasan satu respons atau pencatatan email menyala."
							: "Hanya pengguna yang sudah login yang bisa mengisi."
					}
				/>
				<Sakelar
					nyala={formulir.satu_respons}
					onUbah={(v) => onUbah({ satu_respons: v, butuh_login: v || formulir.butuh_login })}
					label="Batasi satu respons per orang"
					keterangan="Otomatis menyalakan wajib masuk akun — tanpa identitas, batasan ini tidak bisa ditegakkan."
				/>
				<Sakelar
					nyala={formulir.kumpulkan_email}
					onUbah={(v) => onUbah({ kumpulkan_email: v, butuh_login: v || formulir.butuh_login })}
					label="Catat email responden"
					keterangan="Email diambil dari akun pengisi, bukan diketik ulang."
				/>
				<Sakelar
					nyala={formulir.acak_pertanyaan}
					onUbah={(v) => onUbah({ acak_pertanyaan: v })}
					label="Acak urutan pertanyaan"
					keterangan="Diacak di dalam tiap bagian; judul bagian tetap di tempatnya."
				/>

				<div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
					<label className="text-xs font-medium text-slate-500">
						Tutup otomatis pada
						<input
							type="datetime-local"
							value={keInputWaktuLokal(formulir.tutup_pada)}
							onChange={(e) => onUbah({ tutup_pada: e.target.value || null })}
							className={`${ISIAN} mt-1`}
						/>
					</label>
					<label className="text-xs font-medium text-slate-500">
						Batas jumlah respons
						<input
							type="number"
							min={0}
							value={formulir.batas_respons || ""}
							onChange={(e) => onUbah({ batas_respons: e.target.value ? Number(e.target.value) : null })}
							placeholder="Tanpa batas"
							className={`${ISIAN} mt-1`}
						/>
					</label>
				</div>

				<label className="block text-xs font-medium text-slate-500">
					Pesan setelah mengirim
					<textarea
						rows={3}
						value={formulir.pesan_konfirmasi || ""}
						onChange={(e) => onUbah({ pesan_konfirmasi: e.target.value })}
						placeholder="Terima kasih, jawaban Anda sudah kami terima."
						className={`${ISIAN} mt-1`}
					/>
				</label>
			</div>

			<div className="flex flex-shrink-0 border-t border-slate-200 px-5 py-4">
				<button
					onClick={onTutup}
					className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
				>
					Selesai
				</button>
			</div>
		</div>
	</div>
);

// ============================================================
// Halaman
// ============================================================
const FormulirEditorPage = () => {
	const { id } = useParams();
	const navigate = useNavigate();

	const [memuat, setMemuat] = useState(true);
	const [formulir, setFormulir] = useState(null);
	const [pertanyaan, setPertanyaan] = useState([]);
	const [terpilih, setTerpilih] = useState(null);
	const [kotor, setKotor] = useState(false);
	const [menyimpan, setMenyimpan] = useState(false);
	const [bukaSetelan, setBukaSetelan] = useState(false);
	const [pratinjau, setPratinjau] = useState(false);
	const [jawabanPratinjau, setJawabanPratinjau] = useState({});

	const seretDari = useRef(null);
	const seretKe = useRef(null);
	const [sedangSeret, setSedangSeret] = useState(null);

	useEffect(() => {
		let batal = false;
		(async () => {
			setMemuat(true);
			try {
				const r = await getFormulir(id);
				if (batal) return;
				const d = r.data.data;
				setFormulir(d);
				setPertanyaan(
					(d.pertanyaan || []).map((p) => ({
						kunci: `ada-${p.id}`,
						id: p.id,
						tipe: p.tipe,
						label: p.label,
						deskripsi: p.deskripsi || "",
						wajib: Boolean(p.wajib),
						opsi: p.opsi || [],
						pengaturan: p.pengaturan || {},
					}))
				);
			} catch (e) {
				toast.error(e.response?.data?.message || "Gagal memuat formulir.");
				navigate(-1);
			} finally {
				if (!batal) setMemuat(false);
			}
		})();
		return () => {
			batal = true;
		};
	}, [id, navigate]);

	// Peringatan sebelum menutup tab. Editor ini tidak menyimpan otomatis, dan
	// menutup tab setelah menyusun 20 pertanyaan tanpa peringatan berarti
	// kehilangan semuanya.
	useEffect(() => {
		if (!kotor) return undefined;
		const cegah = (e) => {
			e.preventDefault();
			e.returnValue = "";
		};
		window.addEventListener("beforeunload", cegah);
		return () => window.removeEventListener("beforeunload", cegah);
	}, [kotor]);

	const ubahFormulirLokal = (tambahan) => {
		setFormulir((f) => ({ ...f, ...tambahan }));
		setKotor(true);
	};

	const ubahPertanyaan = (kunci, tambahan) => {
		setPertanyaan((daftar) =>
			daftar.map((p) => {
				if (p.kunci !== kunci) return p;
				const berikut = { ...p, ...tambahan };
				// Berpindah ke tipe berpilihan tanpa opsi membuat pertanyaan tidak
				// bisa disimpan; beri satu opsi awal supaya tidak terjebak.
				if (tambahan.tipe && TIPE_PILIHAN.includes(tambahan.tipe) && !berikut.opsi.length) {
					berikut.opsi = ["Opsi 1"];
				}
				if (tambahan.tipe === "skala_linier" && berikut.pengaturan.min === undefined) {
					berikut.pengaturan = { min: 1, maks: 5, label_min: "", label_maks: "" };
				}
				return berikut;
			})
		);
		setKotor(true);
	};

	const tambahPertanyaan = (tipe = "jawaban_singkat") => {
		const baru = pertanyaanBaru(tipe);
		setPertanyaan((daftar) => {
			const i = daftar.findIndex((p) => p.kunci === terpilih);
			// Pertanyaan baru muncul tepat di bawah yang sedang disunting, seperti
			// Google Forms — bukan di ujung bawah yang jauh dari pandangan.
			if (i === -1) return [...daftar, baru];
			return [...daftar.slice(0, i + 1), baru, ...daftar.slice(i + 1)];
		});
		setTerpilih(baru.kunci);
		setKotor(true);
	};

	const duplikatPertanyaan = (kunci) => {
		setPertanyaan((daftar) => {
			const i = daftar.findIndex((p) => p.kunci === kunci);
			if (i === -1) return daftar;
			const salinan = { ...daftar[i], kunci: kunciBaru(), id: null };
			return [...daftar.slice(0, i + 1), salinan, ...daftar.slice(i + 1)];
		});
		setKotor(true);
	};

	const hapusPertanyaan = async (kunci) => {
		const p = pertanyaan.find((x) => x.kunci === kunci);
		// Pertanyaan yang sudah pernah tersimpan mungkin sudah punya jawaban;
		// menghapusnya ikut membuang jawaban itu, jadi perlu ditanyakan dulu.
		if (p?.id && formulir?.jumlah_respons > 0) {
			const konfirmasi = await Swal.fire({
				title: "Hapus pertanyaan?",
				text: `Jawaban yang sudah masuk untuk "${p.label}" ikut terhapus saat disimpan.`,
				icon: "warning",
				showCancelButton: true,
				confirmButtonText: "Hapus",
				cancelButtonText: "Batal",
				confirmButtonColor: "#e11d48",
			});
			if (!konfirmasi.isConfirmed) return;
		}
		setPertanyaan((daftar) => daftar.filter((x) => x.kunci !== kunci));
		setKotor(true);
	};

	const susunUlang = () => {
		const dari = seretDari.current;
		const ke = seretKe.current;
		seretDari.current = null;
		seretKe.current = null;
		setSedangSeret(null);
		if (dari === null || ke === null || dari === ke) return;

		setPertanyaan((daftar) => {
			const salinan = [...daftar];
			const [dipindah] = salinan.splice(dari, 1);
			salinan.splice(ke, 0, dipindah);
			return salinan;
		});
		setKotor(true);
	};

	const simpan = useCallback(async () => {
		if (!formulir) return false;
		setMenyimpan(true);
		try {
			await ubahFormulir(formulir.id, {
				judul: formulir.judul,
				deskripsi: formulir.deskripsi,
				pesan_konfirmasi: formulir.pesan_konfirmasi,
				butuh_login: formulir.butuh_login,
				satu_respons: formulir.satu_respons,
				kumpulkan_email: formulir.kumpulkan_email,
				acak_pertanyaan: formulir.acak_pertanyaan,
				tutup_pada: formulir.tutup_pada,
				batas_respons: formulir.batas_respons,
			});
			const r = await simpanPertanyaan(
				formulir.id,
				pertanyaan.map((p) => ({
					id: p.id,
					tipe: p.tipe,
					label: p.label,
					deskripsi: p.deskripsi,
					wajib: p.wajib,
					opsi: p.opsi,
					pengaturan: p.pengaturan,
				}))
			);
			// Id dari server dipasang balik supaya penyimpanan berikutnya memperbarui
			// pertanyaan yang sama, bukan membuat duplikat.
			setPertanyaan(
				(r.data.data || []).map((p) => ({
					kunci: `ada-${p.id}`,
					id: p.id,
					tipe: p.tipe,
					label: p.label,
					deskripsi: p.deskripsi || "",
					wajib: Boolean(p.wajib),
					opsi: p.opsi || [],
					pengaturan: p.pengaturan || {},
				}))
			);
			setKotor(false);
			toast.success("Formulir disimpan.");
			return true;
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal menyimpan formulir.");
			return false;
		} finally {
			setMenyimpan(false);
		}
	}, [formulir, pertanyaan]);

	const ubahStatus = async (status) => {
		// Menerbitkan tanpa menyimpan akan menerbitkan susunan LAMA — pengisi
		// langsung melihat formulir yang berbeda dari layar penyusunnya.
		if (kotor) {
			const berhasil = await simpan();
			if (!berhasil) return;
		}
		try {
			const r = await ubahFormulir(formulir.id, { status });
			setFormulir((f) => ({ ...f, status: r.data.data.status }));
			toast.success(status === "terbit" ? "Formulir diterbitkan." : "Formulir ditutup.");
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal mengubah status.");
		}
	};

	const salinTautan = async () => {
		const tautan = tautanFormulir(formulir.token);
		try {
			await navigator.clipboard.writeText(tautan);
			toast.success("Tautan disalin.");
		} catch {
			await Swal.fire({ title: "Tautan formulir", text: tautan, confirmButtonColor: "#0f172a" });
		}
	};

	const kembali = async () => {
		if (kotor) {
			const konfirmasi = await Swal.fire({
				title: "Tinggalkan tanpa menyimpan?",
				text: "Perubahan yang belum disimpan akan hilang.",
				icon: "warning",
				showCancelButton: true,
				confirmButtonText: "Tinggalkan",
				cancelButtonText: "Batal",
				confirmButtonColor: "#e11d48",
			});
			if (!konfirmasi.isConfirmed) return;
		}
		navigate(-1);
	};

	const jumlahDijawab = useMemo(() => pertanyaan.filter((p) => p.tipe !== "bagian").length, [pertanyaan]);

	if (memuat || !formulir) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<Loader2 className="h-6 w-6 animate-spin text-slate-900" />
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-slate-50">
			<div className="mx-auto max-w-3xl space-y-4 px-4 py-6 sm:px-6">
				{/* ---------- Bilah atas ---------- */}
				<div className="rounded-xl border border-slate-200 bg-white p-4">
					<div className="flex flex-wrap items-center gap-2">
						<button
							onClick={kembali}
							className="flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
						>
							<ArrowLeft className="h-4 w-4" />
							Kembali
						</button>

						<span className="ml-auto text-xs text-slate-400">
							{kotor ? "Belum disimpan" : "Tersimpan"} · {jumlahDijawab} pertanyaan ·{" "}
							{LABEL_STATUS[formulir.status]}
						</span>
					</div>

					<div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
						<button
							onClick={() => {
								setJawabanPratinjau({});
								setPratinjau(true);
							}}
							className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
						>
							<Eye className="h-4 w-4" />
							Pratinjau
						</button>
						<button
							onClick={() => setBukaSetelan(true)}
							className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
						>
							<Settings className="h-4 w-4" />
							Setelan
						</button>
						<button
							onClick={salinTautan}
							className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
						>
							<Link2 className="h-4 w-4" />
							<span className="hidden sm:inline">Salin tautan</span>
						</button>
						<button
							onClick={() => navigate(`/formulir/${formulir.id}/respons`)}
							className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
						>
							<BarChart3 className="h-4 w-4" />
							Respons
							{formulir.jumlah_respons > 0 && (
								<span className="rounded-full bg-slate-900 px-1.5 text-[11px] font-semibold text-white">
									{formulir.jumlah_respons}
								</span>
							)}
						</button>

						<div className="ml-auto flex gap-2">
							<button
								onClick={simpan}
								disabled={menyimpan || !kotor}
								className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
							>
								{menyimpan ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
								Simpan
							</button>
							<button
								onClick={() => ubahStatus(formulir.status === "terbit" ? "ditutup" : "terbit")}
								className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
							>
								{formulir.status === "terbit" ? "Tutup" : "Terbitkan"}
							</button>
						</div>
					</div>
				</div>

				{/* ---------- Judul formulir ---------- */}
				<div
					onClick={() => setTerpilih("judul")}
					className={`rounded-xl border-t-4 border-slate-900 bg-white p-5 transition-all sm:p-6 ${
						terpilih === "judul" ? "shadow-sm ring-1 ring-slate-900" : ""
					}`}
				>
					<input
						value={formulir.judul}
						onChange={(e) => ubahFormulirLokal({ judul: e.target.value })}
						placeholder="Judul formulir"
						className="w-full border-b border-transparent pb-1 text-xl font-semibold text-slate-900 focus:border-slate-900 focus:outline-none"
					/>
					<textarea
						rows={2}
						value={formulir.deskripsi || ""}
						onChange={(e) => ubahFormulirLokal({ deskripsi: e.target.value })}
						placeholder="Keterangan formulir (opsional)"
						className="mt-2 w-full resize-none border-b border-transparent text-sm text-slate-600 focus:border-slate-900 focus:outline-none"
					/>
				</div>

				{/* ---------- Daftar pertanyaan ---------- */}
				<div className="space-y-3">
					{pertanyaan.map((p, i) => (
						<KartuPertanyaan
							key={p.kunci}
							pertanyaan={p}
							terpilih={terpilih === p.kunci}
							sedangDiseret={sedangSeret === i}
							onPilih={() => setTerpilih(p.kunci)}
							onUbah={(tambahan) => ubahPertanyaan(p.kunci, tambahan)}
							onHapus={() => hapusPertanyaan(p.kunci)}
							onDuplikat={() => duplikatPertanyaan(p.kunci)}
							onSeretMulai={() => {
								seretDari.current = i;
								setSedangSeret(i);
							}}
							onSeretAtas={() => {
								seretKe.current = i;
							}}
							onLepas={susunUlang}
						/>
					))}
				</div>

				{pertanyaan.length === 0 && (
					<div className="rounded-xl border border-dashed border-slate-300 bg-white py-12 text-center">
						<p className="text-sm font-semibold text-slate-900">Belum ada pertanyaan</p>
						<p className="mt-1 text-sm text-slate-500">Tambahkan pertanyaan pertama di bawah.</p>
					</div>
				)}

				{/* ---------- Tambah ---------- */}
				<div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-white p-4">
					<button
						onClick={() => tambahPertanyaan("jawaban_singkat")}
						className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
					>
						<Plus className="h-4 w-4" />
						Tambah pertanyaan
					</button>
					<button
						onClick={() => tambahPertanyaan("bagian")}
						className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
					>
						<Plus className="h-4 w-4" />
						Tambah bagian
					</button>
				</div>
			</div>

			{bukaSetelan && (
				<PanelSetelan formulir={formulir} onUbah={ubahFormulirLokal} onTutup={() => setBukaSetelan(false)} />
			)}

			{/* ---------- Pratinjau ---------- */}
			{pratinjau && (
				<div className="fixed inset-0 z-[100] flex flex-col bg-slate-950/95">
					<div className="flex flex-shrink-0 items-center justify-between px-4 py-3">
						<p className="text-sm font-medium text-white">Pratinjau — begini tampilan bagi pengisi</p>
						<button
							onClick={() => setPratinjau(false)}
							className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
							aria-label="Tutup pratinjau"
						>
							<X className="h-5 w-5" />
						</button>
					</div>
					<div className="flex-1 overflow-y-auto px-4 pb-8">
						<div className="mx-auto max-w-2xl space-y-3">
							<div className="rounded-xl border-t-4 border-slate-900 bg-white px-5 py-5 sm:px-6">
								<h1 className="text-xl font-semibold text-slate-900">{formulir.judul}</h1>
								{formulir.deskripsi && (
									<p className="mt-2 whitespace-pre-line text-sm text-slate-600">{formulir.deskripsi}</p>
								)}
							</div>
							{pertanyaan.map((p) => (
								<div key={p.kunci} className="overflow-hidden rounded-xl border border-slate-200">
									<PertanyaanIsian
										pertanyaan={{ ...p, id: p.kunci }}
										nilai={jawabanPratinjau[p.kunci] ?? (p.tipe === "kotak_centang" ? [] : "")}
										onUbah={(v) => setJawabanPratinjau((j) => ({ ...j, [p.kunci]: v }))}
										berkas={[]}
										onBerkas={() => {}}
									/>
								</div>
							))}
							<p className="pb-4 text-center text-xs text-white/50">
								Pratinjau tidak menyimpan jawaban.
							</p>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default FormulirEditorPage;
