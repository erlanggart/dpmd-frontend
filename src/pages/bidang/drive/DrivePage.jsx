import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
	ArrowLeft,
	ChevronRight,
	Download,
	Folder,
	FolderPlus,
	Grid2x2,
	HardDrive,
	List,
	Loader2,
	MoreVertical,
	Pencil,
	RotateCcw,
	Search,
	Share2,
	Trash2,
	Upload,
	Users,
	X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import {
	bagikan,
	buatFolder,
	cabutBerbagi,
	getDaftarBerbagi,
	getDibagikanKeSaya,
	getIsiDrive,
	getIsiFolderDibagikan,
	getSampah,
	keSampah,
	pulihkan,
	ubahNama,
	unduhBerkas,
	unggahBerkas,
} from "../../../api/driveApi";
import api from "../../../api";
import {
	BIDANG_DRIVE,
	bisaDipratinjau,
	formatTanggal,
	formatUkuran,
	jenisBerkas,
} from "./driveUtils";

const TAB = [
	{ key: "drive", label: "Drive", icon: HardDrive },
	{ key: "dibagikan", label: "Dibagikan ke saya", icon: Users },
	{ key: "sampah", label: "Sampah", icon: Trash2 },
];

// ============================================================
// Potongan UI
// ============================================================
const BilahKuota = ({ kuota }) => {
	if (!kuota) return null;
	const persen = Math.min(kuota.persen ?? 0, 100);
	// Warna hanya muncul saat perlu tindakan; keadaan normal tetap netral.
	const warna = persen >= 90 ? "bg-rose-500" : persen >= 75 ? "bg-brand-500" : "bg-slate-900";

	return (
		<div className="w-full sm:w-64">
			<div className="flex items-center justify-between text-xs">
				<span className="font-medium text-slate-500">Kuota terpakai</span>
				<span className="font-semibold tabular-nums text-slate-900">{persen}%</span>
			</div>
			<div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
				<div className={`h-full rounded-full transition-all ${warna}`} style={{ width: `${persen}%` }} />
			</div>
			<p className="mt-1 text-[11px] text-slate-400">
				{formatUkuran(kuota.terpakai_bytes)} dari {formatUkuran(kuota.batas_bytes)}
			</p>
		</div>
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
			{buka && (
				<div className="absolute right-0 top-full z-20 mt-1 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
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

const KartuFolder = ({ folder, onBuka, aksi, tampilan }) => {
	if (tampilan === "list") {
		return (
			<div
				onDoubleClick={onBuka}
				className="group flex cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-2.5 transition-colors last:border-0 hover:bg-slate-50"
			>
				<Folder className="h-5 w-5 flex-shrink-0 fill-slate-200 text-slate-400" />
				<button onClick={onBuka} className="min-w-0 flex-1 truncate text-left text-sm font-medium text-slate-900">
					{folder.nama}
				</button>
				<span className="hidden w-24 flex-shrink-0 text-xs text-slate-400 sm:block">Folder</span>
				<span className="hidden w-28 flex-shrink-0 text-xs text-slate-400 md:block">
					{formatTanggal(folder.updated_at || folder.created_at)}
				</span>
				{aksi?.length > 0 && <MenuAksi aksi={aksi} />}
			</div>
		);
	}

	return (
		<div
			onDoubleClick={onBuka}
			className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm"
		>
			<div className="flex items-start justify-between gap-2">
				<Folder className="h-9 w-9 fill-slate-200 text-slate-400" />
				{aksi?.length > 0 && <MenuAksi aksi={aksi} />}
			</div>
			<button onClick={onBuka} className="mt-3 block w-full truncate text-left text-sm font-semibold text-slate-900">
				{folder.nama}
			</button>
			{/* Di tab "Dibagikan ke saya" asal bidangnya lebih penting daripada
			    tanggal: itu yang membedakan folder bernama sama. */}
			<p className="mt-0.5 truncate text-xs text-slate-400">
				{folder.pemilik_nama ? `Dari ${folder.pemilik_nama}` : formatTanggal(folder.updated_at || folder.created_at)}
			</p>
		</div>
	);
};

const KartuBerkas = ({ berkas, onBuka, aksi, tampilan }) => {
	const jenis = jenisBerkas(berkas.nama);
	const Ikon = jenis.icon;

	if (tampilan === "list") {
		return (
			<div
				onDoubleClick={onBuka}
				className="group flex cursor-pointer items-center gap-3 border-b border-slate-100 px-4 py-2.5 transition-colors last:border-0 hover:bg-slate-50"
			>
				<Ikon className={`h-5 w-5 flex-shrink-0 ${jenis.warna}`} />
				<button onClick={onBuka} className="min-w-0 flex-1 truncate text-left text-sm font-medium text-slate-900">
					{berkas.nama}
				</button>
				<span className="hidden w-24 flex-shrink-0 text-xs text-slate-400 sm:block">
					{formatUkuran(berkas.ukuran)}
				</span>
				<span className="hidden w-28 flex-shrink-0 text-xs text-slate-400 md:block">
					{formatTanggal(berkas.created_at)}
				</span>
				{aksi?.length > 0 && <MenuAksi aksi={aksi} />}
			</div>
		);
	}

	return (
		<div
			onDoubleClick={onBuka}
			className="group cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-slate-300 hover:shadow-sm"
		>
			<div className="flex items-start justify-between gap-2">
				<Ikon className={`h-9 w-9 ${jenis.warna}`} />
				{aksi?.length > 0 && <MenuAksi aksi={aksi} />}
			</div>
			<button onClick={onBuka} className="mt-3 block w-full truncate text-left text-sm font-semibold text-slate-900">
				{berkas.nama}
			</button>
			<p className="mt-0.5 truncate text-xs text-slate-400">
				{formatUkuran(berkas.ukuran)} ·{" "}
				{berkas.pemilik_nama ? `dari ${berkas.pemilik_nama}` : formatTanggal(berkas.created_at)}
			</p>
		</div>
	);
};

const KeadaanKosong = ({ judul, keterangan, ikon: Ikon = Folder }) => (
	<div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
		<div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100">
			<Ikon className="h-6 w-6 text-slate-400" />
		</div>
		<p className="text-sm font-semibold text-slate-900">{judul}</p>
		<p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">{keterangan}</p>
	</div>
);

// ============================================================
// Modal berbagi
// ============================================================
const ModalBerbagi = ({ objek, onTutup }) => {
	const [daftarBidang, setDaftarBidang] = useState([]);
	const [penerima, setPenerima] = useState("");
	const [izin, setIzin] = useState("lihat");
	const [menyimpan, setMenyimpan] = useState(false);
	const [akses, setAkses] = useState([]);
	const [memuatAkses, setMemuatAkses] = useState(true);

	useEffect(() => {
		api
			.get("/bidang")
			.then((r) => setDaftarBidang((r.data.data || []).filter((b) => Number(b.id) !== Number(objek.bidang_id))))
			.catch(() => setDaftarBidang([]));
	}, [objek.bidang_id]);

	// Daftar akses yang sudah berjalan. Tanpa ini pemilik tidak pernah tahu
	// objeknya sedang dibagikan ke siapa — dan tidak bisa mencabutnya.
	const muatAkses = useCallback(async () => {
		setMemuatAkses(true);
		try {
			const r = await getDaftarBerbagi(objek.tipe, objek.id);
			setAkses(r.data.data || []);
		} catch {
			setAkses([]);
		} finally {
			setMemuatAkses(false);
		}
	}, [objek.tipe, objek.id]);

	useEffect(() => {
		muatAkses();
	}, [muatAkses]);

	const simpan = async () => {
		if (!penerima) return;
		setMenyimpan(true);
		try {
			await bagikan(objek.tipe, objek.id, "bidang", Number(penerima), izin);
			toast.success("Akses dibagikan.");
			setPenerima("");
			await muatAkses();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal membagikan.");
		} finally {
			setMenyimpan(false);
		}
	};

	const cabut = async (share) => {
		const konfirmasi = await Swal.fire({
			title: "Cabut akses?",
			text: `${share.penerima_nama} tidak lagi bisa membuka "${objek.nama}".`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Cabut",
			cancelButtonText: "Batal",
			confirmButtonColor: "#e11d48",
		});
		if (!konfirmasi.isConfirmed) return;

		try {
			await cabutBerbagi(share.id);
			toast.success("Akses dicabut.");
			muatAkses();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal mencabut akses.");
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div className="fixed inset-0 bg-black/50" onClick={onTutup} />
			<div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
				<div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
					<h3 className="text-base font-semibold text-slate-900">Bagikan</h3>
					<button onClick={onTutup} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900">
						<X className="h-5 w-5" />
					</button>
				</div>

				<div className="space-y-4 px-5 py-4">
					<p className="truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
						{objek.nama}
					</p>

					<div>
						<label className="mb-1.5 block text-sm font-medium text-slate-700">Bagikan ke bidang</label>
						<select
							value={penerima}
							onChange={(e) => setPenerima(e.target.value)}
							className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
						>
							<option value="">Pilih bidang</option>
							{daftarBidang.map((b) => (
								<option key={b.id} value={b.id}>
									{b.nama}
								</option>
							))}
						</select>
					</div>

					<div>
						<label className="mb-1.5 block text-sm font-medium text-slate-700">Izin</label>
						<div className="flex gap-2">
							{[
								{ v: "lihat", l: "Hanya lihat" },
								{ v: "ubah", l: "Bisa ubah" },
							].map((o) => (
								<button
									key={o.v}
									onClick={() => setIzin(o.v)}
									className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
										izin === o.v
											? "border-slate-900 bg-slate-900 text-white"
											: "border-slate-200 text-slate-600 hover:bg-slate-50"
									}`}
								>
									{o.l}
								</button>
							))}
						</div>
					</div>

					{objek.tipe === "folder" && (
						<p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
							Membagikan folder otomatis memberi akses ke seluruh isinya, termasuk berkas yang ditambahkan
							kemudian.
						</p>
					)}

					<div className="border-t border-slate-100 pt-4">
						<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Punya akses</p>
						{memuatAkses ? (
							<div className="flex items-center gap-2 py-3 text-sm text-slate-400">
								<Loader2 className="h-4 w-4 animate-spin" />
								Memuat…
							</div>
						) : akses.length === 0 ? (
							<p className="py-3 text-sm text-slate-400">Belum dibagikan ke siapa pun.</p>
						) : (
							<ul className="mt-2 space-y-1.5">
								{akses.map((a) => (
									<li
										key={a.id}
										className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
									>
										<span className="min-w-0 flex-1 truncate text-sm text-slate-700">{a.penerima_nama}</span>
										<span className="flex-shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
											{a.izin === "ubah" ? "Bisa ubah" : "Hanya lihat"}
										</span>
										<button
											onClick={() => cabut(a)}
											className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
											aria-label={`Cabut akses ${a.penerima_nama}`}
										>
											<X className="h-4 w-4" />
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>

				<div className="flex gap-2 border-t border-slate-200 px-5 py-4">
					<button
						onClick={onTutup}
						className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
					>
						Tutup
					</button>
					<button
						onClick={simpan}
						disabled={!penerima || menyimpan}
						className="flex-1 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
					>
						{menyimpan ? "Membagikan..." : "Bagikan"}
					</button>
				</div>
			</div>
		</div>
	);
};

// ============================================================
// Halaman
// ============================================================
const DrivePage = ({ bidangId }) => {
	const navigate = useNavigate();
	const infoBidang = BIDANG_DRIVE[bidangId] || { nama: `Bidang ${bidangId}` };

	const [tab, setTab] = useState("drive");
	const [memuat, setMemuat] = useState(true);
	const [folderAktif, setFolderAktif] = useState(null);
	const [breadcrumb, setBreadcrumb] = useState([]);
	// Remah jejak khusus tab "Dibagikan ke saya". Dipisah dari `breadcrumb`
	// karena isinya folder milik bidang lain — leluhurnya di sisi pemilik tidak
	// boleh ikut terlihat, hanya jalur yang benar-benar ditelusuri di sini.
	const [jejakBagi, setJejakBagi] = useState([]);
	const [folders, setFolders] = useState([]);
	const [files, setFiles] = useState([]);
	const [kuota, setKuota] = useState(null);
	const [cari, setCari] = useState("");
	const [tampilan, setTampilan] = useState("grid");
	const [mengunggah, setMengunggah] = useState(false);
	const [progres, setProgres] = useState(0);
	const [seret, setSeret] = useState(false);
	const [modalBagi, setModalBagi] = useState(null);
	const [pratinjau, setPratinjau] = useState(null);

	const inputBerkas = useRef(null);

	const muat = useCallback(async () => {
		setMemuat(true);
		try {
			if (tab === "sampah") {
				const r = await getSampah(bidangId);
				setFolders(r.data.data.folders || []);
				setFiles(r.data.data.files || []);
				setBreadcrumb([]);
			} else if (tab === "dibagikan") {
				const dibuka = jejakBagi[jejakBagi.length - 1];
				const r = dibuka ? await getIsiFolderDibagikan(dibuka.id) : await getDibagikanKeSaya();
				setFolders(r.data.data.folders || []);
				setFiles(r.data.data.files || []);
				setBreadcrumb([]);
			} else {
				const r = await getIsiDrive(bidangId, folderAktif);
				setFolders(r.data.data.folders || []);
				setFiles(r.data.data.files || []);
				setBreadcrumb(r.data.data.breadcrumb || []);
				setKuota(r.data.data.kuota);
			}
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal memuat Drive.");
		} finally {
			setMemuat(false);
		}
	}, [bidangId, folderAktif, jejakBagi, tab]);

	useEffect(() => {
		muat();
	}, [muat]);

	// Pencarian hanya menyaring isi folder yang sedang dibuka — bukan seluruh
	// Drive. Dibuat begitu supaya hasilnya selalu bisa ditelusuri balik lewat
	// remah jejak, tidak memunculkan berkas entah dari mana.
	const folderTersaring = useMemo(
		() => folders.filter((f) => f.nama.toLowerCase().includes(cari.toLowerCase())),
		[folders, cari]
	);
	const berkasTersaring = useMemo(
		() => files.filter((f) => f.nama.toLowerCase().includes(cari.toLowerCase())),
		[files, cari]
	);

	const kosong = folderTersaring.length === 0 && berkasTersaring.length === 0;

	// ---------- aksi ----------
	const aksiBuatFolder = async () => {
		const { value: nama } = await Swal.fire({
			title: "Folder baru",
			input: "text",
			inputPlaceholder: "Nama folder",
			showCancelButton: true,
			confirmButtonText: "Buat",
			cancelButtonText: "Batal",
			confirmButtonColor: "#0f172a",
			inputValidator: (v) => (!v?.trim() ? "Nama folder wajib diisi" : undefined),
		});
		if (!nama) return;

		try {
			await buatFolder(bidangId, nama.trim(), folderAktif);
			toast.success("Folder dibuat.");
			muat();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal membuat folder.");
		}
	};

	const aksiUnggah = async (daftar) => {
		const berkas = Array.from(daftar || []);
		if (!berkas.length) return;

		const kebesaran = berkas.filter((f) => f.size > 100 * 1024 * 1024);
		if (kebesaran.length) {
			toast.error(`${kebesaran.length} berkas melebihi 100 MB dan tidak diunggah.`);
		}
		const layak = berkas.filter((f) => f.size <= 100 * 1024 * 1024);
		if (!layak.length) return;

		setMengunggah(true);
		setProgres(0);
		try {
			await unggahBerkas(bidangId, layak, folderAktif, setProgres);
			toast.success(`${layak.length} berkas diunggah.`);
			muat();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal mengunggah.");
		} finally {
			setMengunggah(false);
			setProgres(0);
			if (inputBerkas.current) inputBerkas.current.value = "";
		}
	};

	const aksiUbahNama = async (tipe, item) => {
		const { value: nama } = await Swal.fire({
			title: "Ubah nama",
			input: "text",
			inputValue: item.nama,
			showCancelButton: true,
			confirmButtonText: "Simpan",
			cancelButtonText: "Batal",
			confirmButtonColor: "#0f172a",
			inputValidator: (v) => (!v?.trim() ? "Nama wajib diisi" : undefined),
		});
		if (!nama || nama === item.nama) return;

		try {
			await ubahNama(tipe, item.id, nama.trim());
			toast.success("Nama diubah.");
			muat();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal mengubah nama.");
		}
	};

	const aksiHapus = async (tipe, item) => {
		const konfirmasi = await Swal.fire({
			title: tipe === "folder" ? "Pindahkan folder ke sampah?" : "Pindahkan berkas ke sampah?",
			text:
				tipe === "folder"
					? `"${item.nama}" beserta seluruh isinya masuk sampah dan dihapus permanen setelah 30 hari.`
					: `"${item.nama}" masuk sampah dan dihapus permanen setelah 30 hari.`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Pindahkan",
			cancelButtonText: "Batal",
			confirmButtonColor: "#e11d48",
		});
		if (!konfirmasi.isConfirmed) return;

		try {
			await keSampah(tipe, item.id);
			toast.success("Dipindahkan ke sampah.");
			muat();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal menghapus.");
		}
	};

	const aksiPulihkan = async (tipe, item) => {
		try {
			await pulihkan(tipe, item.id);
			toast.success("Dipulihkan.");
			muat();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal memulihkan.");
		}
	};

	const bukaBerkas = async (berkas) => {
		if (bisaDipratinjau(berkas)) {
			try {
				const url = await unduhBerkas(berkas.id, berkas.nama, true);
				setPratinjau({ url, berkas });
			} catch {
				toast.error("Gagal membuka pratinjau.");
			}
			return;
		}
		try {
			await unduhBerkas(berkas.id, berkas.nama);
		} catch {
			toast.error("Gagal mengunduh berkas.");
		}
	};

	const tutupPratinjau = () => {
		if (pratinjau?.url) URL.revokeObjectURL(pratinjau.url);
		setPratinjau(null);
	};

	// ---------- penelusuran folder ----------
	const bukaFolder = (folder) => {
		if (tab === "drive") setFolderAktif(folder.id);
		else if (tab === "dibagikan") setJejakBagi((j) => [...j, { id: folder.id, nama: folder.nama }]);
	};

	const keAkar = () => {
		setFolderAktif(null);
		setJejakBagi([]);
	};

	const jejak = tab === "dibagikan" ? jejakBagi : breadcrumb;
	const bukaJejak = (item, urutan) => {
		if (tab === "dibagikan") setJejakBagi((j) => j.slice(0, urutan + 1));
		else setFolderAktif(item.id);
	};

	// ---------- daftar aksi per item ----------
	// Di tab "Dibagikan ke saya" aksinya mengikuti izin yang diberikan pemilik:
	// menawarkan tombol yang pasti ditolak server hanya membingungkan.
	const aksiFolder = (folder) => {
		if (tab === "sampah") {
			return [{ label: "Pulihkan", icon: RotateCcw, onClick: () => aksiPulihkan("folder", folder) }];
		}
		if (tab === "dibagikan") {
			return folder.izin === "ubah"
				? [{ label: "Ubah nama", icon: Pencil, onClick: () => aksiUbahNama("folder", folder) }]
				: [];
		}
		return [
			{ label: "Ubah nama", icon: Pencil, onClick: () => aksiUbahNama("folder", folder) },
			{ label: "Bagikan", icon: Share2, onClick: () => setModalBagi({ tipe: "folder", ...folder }) },
			{ label: "Pindah ke sampah", icon: Trash2, bahaya: true, onClick: () => aksiHapus("folder", folder) },
		];
	};

	const aksiBerkas = (berkas) => {
		if (tab === "sampah") {
			return [{ label: "Pulihkan", icon: RotateCcw, onClick: () => aksiPulihkan("file", berkas) }];
		}
		const unduh = { label: "Unduh", icon: Download, onClick: () => unduhBerkas(berkas.id, berkas.nama) };
		if (tab === "dibagikan") {
			return berkas.izin === "ubah"
				? [unduh, { label: "Ubah nama", icon: Pencil, onClick: () => aksiUbahNama("file", berkas) }]
				: [unduh];
		}
		return [
			unduh,
			{ label: "Ubah nama", icon: Pencil, onClick: () => aksiUbahNama("file", berkas) },
			{ label: "Bagikan", icon: Share2, onClick: () => setModalBagi({ tipe: "file", ...berkas }) },
			{ label: "Pindah ke sampah", icon: Trash2, bahaya: true, onClick: () => aksiHapus("file", berkas) },
		];
	};

	const bolehUnggah = tab === "drive";

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
								<HardDrive className="h-5 w-5" />
								<span className="absolute -bottom-0.5 left-1/2 h-1 w-5 -translate-x-1/2 rounded-full bg-brand-500" />
							</div>
							<div className="min-w-0">
								<p className="truncate text-xs font-semibold uppercase tracking-wide text-brand-600">
									{infoBidang.nama}
								</p>
								<h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">Drive Bidang</h1>
								<p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
									Penyimpanan berkas internal bidang. Isinya hanya terlihat oleh pegawai bidang ini kecuali
									dibagikan.
								</p>
							</div>
						</div>
						<BilahKuota kuota={kuota} />
					</div>

					{/* Tab */}
					<div className="mt-5 flex flex-wrap gap-1 border-t border-slate-100 pt-5">
						{TAB.map((t) => (
							<button
								key={t.key}
								onClick={() => {
									setTab(t.key);
									keAkar();
									setCari("");
								}}
								className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
									tab === t.key
										? "bg-slate-900 text-white"
										: "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
								}`}
							>
								<t.icon className="h-4 w-4" />
								{t.label}
							</button>
						))}
					</div>
				</div>

				{/* ---------- Bilah alat ---------- */}
				<div className="rounded-xl border border-slate-200 bg-white p-4">
					<div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
						{/* Remah jejak */}
						<div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto text-sm">
							<button
								onClick={keAkar}
								className={`flex-shrink-0 rounded-lg px-2 py-1 font-medium transition-colors hover:bg-slate-100 ${
									jejak.length === 0 ? "text-slate-900" : "text-slate-500"
								}`}
							>
								{tab === "sampah" ? "Sampah" : tab === "dibagikan" ? "Dibagikan ke saya" : "Drive"}
							</button>
							{jejak.map((b, i) => (
								<React.Fragment key={b.id}>
									<ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-slate-300" />
									<button
										onClick={() => bukaJejak(b, i)}
										className="flex-shrink-0 truncate rounded-lg px-2 py-1 font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
									>
										{b.nama}
									</button>
								</React.Fragment>
							))}
						</div>

						<div className="flex flex-wrap items-center gap-2">
							<div className="relative flex-1 sm:flex-none">
								<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
								<input
									value={cari}
									onChange={(e) => setCari(e.target.value)}
									placeholder="Cari di folder ini…"
									className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 sm:w-56"
								/>
							</div>

							<div className="flex items-center gap-1 rounded-lg border border-slate-200 p-1">
								{[
									{ v: "grid", icon: Grid2x2 },
									{ v: "list", icon: List },
								].map((o) => (
									<button
										key={o.v}
										onClick={() => setTampilan(o.v)}
										aria-label={o.v === "grid" ? "Tampilan petak" : "Tampilan daftar"}
										className={`rounded-md p-1.5 transition-colors ${
											tampilan === o.v ? "bg-slate-900 text-white" : "text-slate-400 hover:bg-slate-100"
										}`}
									>
										<o.icon className="h-4 w-4" />
									</button>
								))}
							</div>

							{bolehUnggah && (
								<>
									<button
										onClick={aksiBuatFolder}
										className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
									>
										<FolderPlus className="h-4 w-4" />
										<span className="hidden sm:inline">Folder</span>
									</button>
									<button
										onClick={() => inputBerkas.current?.click()}
										disabled={mengunggah}
										className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:bg-slate-300"
									>
										<Upload className="h-4 w-4" />
										Unggah
									</button>
								</>
							)}
						</div>
					</div>

					{mengunggah && (
						<div className="mt-3">
							<div className="mb-1 flex items-center justify-between text-xs text-slate-500">
								<span>Mengunggah…</span>
								<span className="tabular-nums">{progres}%</span>
							</div>
							<div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
								<div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progres}%` }} />
							</div>
						</div>
					)}
				</div>

				<input
					ref={inputBerkas}
					type="file"
					multiple
					className="hidden"
					onChange={(e) => aksiUnggah(e.target.files)}
				/>

				{/* ---------- Isi ---------- */}
				<div
					onDragOver={(e) => {
						if (!bolehUnggah) return;
						e.preventDefault();
						setSeret(true);
					}}
					onDragLeave={() => setSeret(false)}
					onDrop={(e) => {
						if (!bolehUnggah) return;
						e.preventDefault();
						setSeret(false);
						aksiUnggah(e.dataTransfer.files);
					}}
					className={`relative rounded-xl transition-all ${
						seret ? "ring-2 ring-brand-500 ring-offset-2" : ""
					}`}
				>
					{seret && (
						<div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/90">
							<div className="text-center">
								<Upload className="mx-auto h-8 w-8 text-brand-600" />
								<p className="mt-2 text-sm font-semibold text-slate-900">Lepaskan untuk mengunggah</p>
							</div>
						</div>
					)}

					{memuat ? (
						<div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-20">
							<Loader2 className="h-6 w-6 animate-spin text-slate-900" />
						</div>
					) : kosong ? (
						<KeadaanKosong
							ikon={tab === "sampah" ? Trash2 : tab === "dibagikan" ? Users : Folder}
							judul={
								cari
									? "Tidak ada yang cocok"
									: tab === "sampah"
										? "Sampah kosong"
										: // Hanya di akar tab ini yang berarti "belum ada yang dibagikan";
											// begitu masuk ke dalamnya, yang kosong adalah foldernya.
											tab === "dibagikan" && jejak.length === 0
											? "Belum ada yang dibagikan"
											: "Folder ini masih kosong"
							}
							keterangan={
								cari
									? `Tidak ditemukan "${cari}" di folder ini.`
									: tab === "sampah"
										? "Berkas yang dibuang akan muncul di sini dan dihapus permanen setelah 30 hari."
										: tab === "dibagikan" && jejak.length === 0
											? "Folder dan berkas yang dibagikan bidang lain kepada Anda akan muncul di sini."
											: bolehUnggah
												? "Seret berkas ke sini, atau gunakan tombol Unggah."
												: "Folder ini belum berisi apa pun."
							}
						/>
					) : tampilan === "grid" ? (
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
							{folderTersaring.map((f) => (
								<KartuFolder
									key={`f${f.id}`}
									folder={f}
									tampilan="grid"
									onBuka={() => bukaFolder(f)}
									aksi={aksiFolder(f)}
								/>
							))}
							{berkasTersaring.map((b) => (
								<KartuBerkas
									key={`b${b.id}`}
									berkas={b}
									tampilan="grid"
									onBuka={() => bukaBerkas(b)}
									aksi={aksiBerkas(b)}
								/>
							))}
						</div>
					) : (
						<div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
							<div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-slate-500">
								<span className="w-5" />
								<span className="flex-1">Nama</span>
								<span className="hidden w-24 sm:block">Ukuran</span>
								<span className="hidden w-28 md:block">Tanggal</span>
								<span className="w-7" />
							</div>
							{folderTersaring.map((f) => (
								<KartuFolder
									key={`f${f.id}`}
									folder={f}
									tampilan="list"
									onBuka={() => bukaFolder(f)}
									aksi={aksiFolder(f)}
								/>
							))}
							{berkasTersaring.map((b) => (
								<KartuBerkas
									key={`b${b.id}`}
									berkas={b}
									tampilan="list"
									onBuka={() => bukaBerkas(b)}
									aksi={aksiBerkas(b)}
								/>
							))}
						</div>
					)}
				</div>

				{tab === "sampah" && !kosong && (
					<p className="text-center text-xs text-slate-400">
						Isi sampah dihapus permanen otomatis setelah 30 hari.
					</p>
				)}
			</div>

			{/* ---------- Modal ---------- */}
			{modalBagi && (
				<ModalBerbagi objek={{ ...modalBagi, bidang_id: bidangId }} onTutup={() => setModalBagi(null)} />
			)}

			{pratinjau && (
				<div className="fixed inset-0 z-50 flex flex-col bg-slate-950/95">
					<div className="flex items-center justify-between px-4 py-3">
						<p className="min-w-0 flex-1 truncate text-sm font-medium text-white">{pratinjau.berkas.nama}</p>
						<div className="flex items-center gap-2">
							<button
								onClick={() => unduhBerkas(pratinjau.berkas.id, pratinjau.berkas.nama)}
								className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
							>
								<Download className="h-4 w-4" />
								<span className="hidden sm:inline">Unduh</span>
							</button>
							<button
								onClick={tutupPratinjau}
								className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
								aria-label="Tutup pratinjau"
							>
								<X className="h-5 w-5" />
							</button>
						</div>
					</div>
					<div className="flex flex-1 items-center justify-center overflow-auto p-4">
						{pratinjau.berkas.mime === "application/pdf" ? (
							<iframe title={pratinjau.berkas.nama} src={pratinjau.url} className="h-full w-full rounded-lg bg-white" />
						) : (
							<img src={pratinjau.url} alt={pratinjau.berkas.nama} className="max-h-full max-w-full object-contain" />
						)}
					</div>
				</div>
			)}
		</div>
	);
};

export default DrivePage;
