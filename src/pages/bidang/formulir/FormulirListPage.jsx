import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	ArrowLeft,
	BarChart3,
	Copy,
	ExternalLink,
	FileText,
	Link2,
	Loader2,
	MoreVertical,
	Pencil,
	Plus,
	Search,
	Send,
	Square,
	Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import {
	buatFormulir,
	duplikatFormulir,
	getDaftarFormulir,
	hapusFormulir,
	tautanFormulir,
	ubahFormulir,
} from "../../../api/formulirApi";
import { BIDANG_DRIVE } from "../drive/driveUtils";
import { LABEL_STATUS, formatWaktu } from "./formulirUtils";

const SARINGAN = [
	{ kunci: "semua", label: "Semua" },
	{ kunci: "terbit", label: "Menerima respons" },
	{ kunci: "draf", label: "Draf" },
	{ kunci: "ditutup", label: "Ditutup" },
];

const LencanaStatus = ({ status }) => {
	// Hanya status yang menuntut perhatian yang diberi warna; sisanya slate.
	const gaya =
		status === "terbit"
			? "border-emerald-200 bg-emerald-50 text-emerald-700"
			: status === "ditutup"
				? "border-slate-200 bg-slate-100 text-slate-500"
				: "border-amber-200 bg-amber-50 text-amber-700";

	return (
		<span className={`inline-flex flex-shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${gaya}`}>
			{LABEL_STATUS[status] || status}
		</span>
	);
};

const MenuAksi = ({ aksi }) => {
	const [buka, setBuka] = useState(false);
	const ref = useRef(null);

	useEffect(() => {
		if (!buka) return undefined;
		const tutup = (e) => {
			if (ref.current && !ref.current.contains(e.target)) setBuka(false);
		};
		document.addEventListener("mousedown", tutup);
		return () => document.removeEventListener("mousedown", tutup);
	}, [buka]);

	return (
		<div className="relative" ref={ref}>
			<button
				onClick={(e) => {
					e.stopPropagation();
					setBuka((v) => !v);
				}}
				className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
				aria-label="Aksi lainnya"
			>
				<MoreVertical className="h-4 w-4" />
			</button>
			{/* z-[60]: bilah navigasi mengambang PegawaiLayout memakai z-50 dan berada
			    setelah konten di DOM, jadi menu pada kartu terbawah akan tertutup. */}
			{buka && (
				<div className="absolute right-0 top-full z-[60] mt-1 w-52 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
					{aksi.map((a) => (
						<button
							key={a.label}
							onClick={(e) => {
								e.stopPropagation();
								setBuka(false);
								a.onClick();
							}}
							className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
								a.bahaya ? "text-rose-600 hover:bg-rose-50" : "text-slate-700"
							}`}
						>
							<a.icon className="h-4 w-4 flex-shrink-0" />
							{a.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
};

const KartuFormulir = ({ formulir, onBuka, aksi }) => (
	<div
		onClick={onBuka}
		className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm"
	>
		<div className="flex items-start justify-between gap-2">
			<div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100">
				<FileText className="h-5 w-5 text-slate-500" />
			</div>
			<MenuAksi aksi={aksi} />
		</div>

		<p className="mt-3 line-clamp-2 text-sm font-semibold text-slate-900">{formulir.judul}</p>
		<div className="mt-2 flex flex-wrap items-center gap-1.5">
			<LencanaStatus status={formulir.status} />
			<span className="text-xs text-slate-400">
				{formulir.jumlah_pertanyaan} pertanyaan · {formulir.jumlah_respons} respons
			</span>
		</div>
		<p className="mt-2 truncate text-[11px] text-slate-400">
			Diubah {formatWaktu(formulir.updated_at || formulir.created_at)}
		</p>
	</div>
);

const FormulirListPage = ({ bidangId }) => {
	const navigate = useNavigate();
	const infoBidang = BIDANG_DRIVE[bidangId] || { nama: `Bidang ${bidangId}` };

	const [memuat, setMemuat] = useState(true);
	const [daftar, setDaftar] = useState([]);
	const [cari, setCari] = useState("");
	const [saringan, setSaringan] = useState("semua");
	const [membuat, setMembuat] = useState(false);

	const muat = useCallback(async () => {
		setMemuat(true);
		try {
			const r = await getDaftarFormulir(bidangId);
			setDaftar(r.data.data || []);
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal memuat daftar formulir.");
		} finally {
			setMemuat(false);
		}
	}, [bidangId]);

	useEffect(() => {
		muat();
	}, [muat]);

	const tersaring = useMemo(
		() =>
			daftar.filter(
				(f) =>
					(saringan === "semua" || f.status === saringan) &&
					f.judul.toLowerCase().includes(cari.toLowerCase())
			),
		[daftar, cari, saringan]
	);

	const aksiBuat = async () => {
		setMembuat(true);
		try {
			const r = await buatFormulir(bidangId, "Formulir tanpa judul");
			// Langsung masuk editor: formulir baru selalu perlu disunting, dan
			// kembali ke daftar hanya untuk mengkliknya lagi jadi langkah kosong.
			navigate(`/formulir/${r.data.data.id}`);
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal membuat formulir.");
		} finally {
			setMembuat(false);
		}
	};

	const salinTautan = async (formulir) => {
		const tautan = tautanFormulir(formulir.token);
		try {
			await navigator.clipboard.writeText(tautan);
			toast.success("Tautan disalin.");
		} catch {
			// clipboard.writeText ditolak di konteks tak aman (http tanpa TLS).
			// Menampilkan tautannya masih lebih berguna daripada pesan gagal.
			await Swal.fire({ title: "Tautan formulir", text: tautan, confirmButtonColor: "#0f172a" });
		}
		if (formulir.status === "draf") {
			toast("Formulir masih draf — tautan belum bisa diisi.", { icon: "ℹ️" });
		}
	};

	const ubahStatus = async (formulir, status) => {
		try {
			await ubahFormulir(formulir.id, { status });
			toast.success(status === "terbit" ? "Formulir diterbitkan." : "Formulir ditutup.");
			muat();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal mengubah status.");
		}
	};

	const aksiDuplikat = async (formulir) => {
		try {
			await duplikatFormulir(formulir.id);
			toast.success("Formulir disalin.");
			muat();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal menyalin formulir.");
		}
	};

	const aksiHapus = async (formulir) => {
		const konfirmasi = await Swal.fire({
			title: "Hapus formulir?",
			text:
				formulir.jumlah_respons > 0
					? `"${formulir.judul}" beserta ${formulir.jumlah_respons} respons yang sudah masuk tidak akan terlihat lagi.`
					: `"${formulir.judul}" akan dihapus dan tautannya berhenti bekerja.`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Hapus",
			cancelButtonText: "Batal",
			confirmButtonColor: "#e11d48",
		});
		if (!konfirmasi.isConfirmed) return;

		try {
			await hapusFormulir(formulir.id);
			toast.success("Formulir dihapus.");
			muat();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal menghapus formulir.");
		}
	};

	const aksiUntuk = (f) => [
		{ label: "Sunting", icon: Pencil, onClick: () => navigate(`/formulir/${f.id}`) },
		{ label: "Lihat respons", icon: BarChart3, onClick: () => navigate(`/formulir/${f.id}/respons`) },
		{ label: "Salin tautan", icon: Link2, onClick: () => salinTautan(f) },
		{ label: "Buka sebagai pengisi", icon: ExternalLink, onClick: () => window.open(tautanFormulir(f.token), "_blank") },
		f.status === "terbit"
			? { label: "Tutup formulir", icon: Square, onClick: () => ubahStatus(f, "ditutup") }
			: { label: "Terbitkan", icon: Send, onClick: () => ubahStatus(f, "terbit") },
		{ label: "Duplikat", icon: Copy, onClick: () => aksiDuplikat(f) },
		{ label: "Hapus", icon: Trash2, bahaya: true, onClick: () => aksiHapus(f) },
	];

	return (
		<div className="min-h-screen bg-slate-50">
			<div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
				{/* ---------- Kepala ---------- */}
				<div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
					<button
						onClick={() => navigate(-1)}
						className="mb-4 flex items-center gap-2 text-sm text-slate-500 transition-colors hover:text-slate-900"
					>
						<ArrowLeft className="h-4 w-4" />
						Kembali
					</button>

					<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
						<div className="flex min-w-0 items-start gap-3.5">
							<div className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
								<FileText className="h-5 w-5" />
								<span className="absolute -bottom-0.5 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full bg-brand-500" />
							</div>
							<div className="min-w-0">
								<p className="truncate text-xs font-semibold uppercase tracking-wide text-brand-600">
									{infoBidang.nama}
								</p>
								<h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Formulir</h1>
								<p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
									Susun formulir sendiri, bagikan tautannya, lalu kumpulkan dan rekap jawabannya di satu
									tempat.
								</p>
							</div>
						</div>

						<button
							onClick={aksiBuat}
							disabled={membuat}
							className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-300"
						>
							{membuat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
							Formulir baru
						</button>
					</div>
				</div>

				{/* ---------- Bilah alat ---------- */}
				<div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex flex-wrap gap-1">
						{SARINGAN.map((s) => (
							<button
								key={s.kunci}
								onClick={() => setSaringan(s.kunci)}
								className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
									saringan === s.kunci
										? "bg-slate-900 text-white"
										: "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
								}`}
							>
								{s.label}
							</button>
						))}
					</div>

					<div className="relative">
						<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
						<input
							value={cari}
							onChange={(e) => setCari(e.target.value)}
							placeholder="Cari formulir…"
							className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 sm:w-64"
						/>
					</div>
				</div>

				{/* ---------- Isi ---------- */}
				{memuat ? (
					<div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-20">
						<Loader2 className="h-6 w-6 animate-spin text-slate-900" />
					</div>
				) : tersaring.length === 0 ? (
					<div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
						<div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100">
							<FileText className="h-6 w-6 text-slate-400" />
						</div>
						<p className="text-sm font-semibold text-slate-900">
							{cari || saringan !== "semua" ? "Tidak ada yang cocok" : "Belum ada formulir"}
						</p>
						<p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
							{cari || saringan !== "semua"
								? "Coba ubah kata kunci atau saringan statusnya."
								: "Buat formulir pertama untuk survei, pendaftaran kegiatan, atau pendataan desa."}
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{tersaring.map((f) => (
							<KartuFormulir
								key={f.id}
								formulir={f}
								onBuka={() => navigate(`/formulir/${f.id}`)}
								aksi={aksiUntuk(f)}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
};

export default FormulirListPage;
