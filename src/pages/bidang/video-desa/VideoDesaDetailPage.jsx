import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
	AlertTriangle, ArrowLeft, Check, Download, Film, Link2, Loader2, MapPin, Phone, Play, Search, Settings2, Trash2, X, XCircle, RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import {
	getPermintaan, getTautanVideo, hapusKiriman, tinjauKiriman, ubahPermintaan,
} from "../../../api/videoDesaApi";
import PengaturanPermintaan from "./PengaturanPermintaan";
import {
	LABEL_ORIENTASI, LABEL_STATUS_KIRIMAN, catatanKesesuaian, salinTautanUnggah, formatDurasi, formatUkuran, formatWaktu,
} from "./videoDesaUtils";

const SARINGAN = [
	{ kunci: "semua", label: "Semua" },
	{ kunci: "masuk", label: "Belum ditinjau" },
	{ kunci: "disetujui", label: "Disetujui" },
	{ kunci: "ditolak", label: "Ditolak" },
];

const GAYA_STATUS = {
	masuk: "border-amber-200 bg-amber-50 text-amber-700",
	disetujui: "border-emerald-200 bg-emerald-50 text-emerald-700",
	ditolak: "border-rose-200 bg-rose-50 text-rose-700",
};

/** Pemutar di tengah layar. Sumbernya tautan bertanda tangan, jadi bisa digeser. */
const Pemutar = ({ video, onTutup }) => {
	useEffect(() => {
		const k = (e) => e.key === "Escape" && onTutup();
		document.addEventListener("keydown", k);
		return () => document.removeEventListener("keydown", k);
	}, [onTutup]);

	return (
		<div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/90 p-4" onClick={onTutup}>
			<div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
				<div className="mb-2 flex items-center justify-between gap-3 text-white">
					<p className="truncate text-sm font-medium">Desa {video.desa} · {video.nama_berkas}</p>
					<button onClick={onTutup} className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Tutup">
						<X className="h-5 w-5" />
					</button>
				</div>
				<video src={video.src} controls autoPlay className="max-h-[80vh] w-full rounded-lg bg-black" />
				{video.mkv && (
					<p className="mt-2 text-xs text-white/60">Format MKV sering tidak bisa diputar di browser — unduh lalu putar dengan VLC.</p>
				)}
			</div>
		</div>
	);
};

const KartuKiriman = ({ k, permintaan, onPutar, onUnduh, onTinjau, onHapus, sibuk }) => {
	const catatan = catatanKesesuaian(k, permintaan);
	const durasi = formatDurasi(k.durasi_detik);
	return (
		<div className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold text-slate-900">
						{k.status_pemerintahan === "kelurahan" ? "Kelurahan" : "Desa"} {k.desa || "?"}
					</p>
					<p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
						<MapPin className="h-3 w-3 flex-shrink-0" /> Kec. {k.kecamatan || "?"}
					</p>
				</div>
				<span className={`inline-flex flex-shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${GAYA_STATUS[k.status]}`}>
					{LABEL_STATUS_KIRIMAN[k.status]}
				</span>
			</div>

			<button
				onClick={onPutar}
				className="group mt-3 flex aspect-video w-full items-center justify-center rounded-lg bg-slate-900 text-white transition-colors hover:bg-slate-800"
			>
				<span className="flex flex-col items-center gap-1.5">
					<span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:scale-110">
						<Play className="ml-0.5 h-5 w-5" />
					</span>
					<span className="text-[11px] text-white/70">
						{[durasi, k.lebar && k.tinggi ? `${k.lebar}×${k.tinggi}` : null, formatUkuran(k.ukuran)].filter(Boolean).join(" · ")}
					</span>
				</span>
			</button>

			{catatan.length > 0 && (
				<div className="mt-2 space-y-1">
					{catatan.map((c) => (
						<p key={c} className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700">
							<AlertTriangle className="h-3 w-3 flex-shrink-0" /> {c}
						</p>
					))}
				</div>
			)}

			<div className="mt-3 space-y-1 text-xs text-slate-600">
				<p className="truncate" title={k.nama_berkas}><Film className="mr-1 inline h-3 w-3 text-slate-400" />{k.nama_berkas}</p>
				<p>
					{k.nama_pengirim}
					{k.no_hp && (
						<a href={`https://wa.me/${k.no_hp.replace(/^0/, "62").replace(/^\+/, "")}`} target="_blank" rel="noreferrer" className="ml-1.5 inline-flex items-center gap-0.5 text-emerald-700 hover:underline">
							<Phone className="h-3 w-3" /> {k.no_hp}
						</a>
					)}
				</p>
				<p className="text-slate-400">Dikirim {formatWaktu(k.created_at)}</p>
				{k.keterangan && <p className="line-clamp-3 rounded-md bg-slate-50 px-2 py-1.5 text-slate-600">{k.keterangan}</p>}
				{k.catatan && <p className="rounded-md bg-rose-50 px-2 py-1.5 text-rose-700">Catatan bidang: {k.catatan}</p>}
			</div>

			<div className="mt-auto flex flex-wrap items-center gap-1 border-t border-slate-100 pt-3">
				{k.status !== "disetujui" && (
					<button disabled={sibuk} onClick={() => onTinjau("disetujui")} className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
						<Check className="h-3.5 w-3.5" /> Setujui
					</button>
				)}
				{k.status !== "ditolak" && (
					<button disabled={sibuk} onClick={() => onTinjau("ditolak")} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50">
						<XCircle className="h-3.5 w-3.5" /> Tolak
					</button>
				)}
				{k.status !== "masuk" && (
					<button disabled={sibuk} onClick={() => onTinjau("masuk")} className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50">
						<RotateCcw className="h-3.5 w-3.5" /> Batalkan
					</button>
				)}
				<button onClick={onUnduh} className="ml-auto inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100">
					<Download className="h-3.5 w-3.5" /> Unduh
				</button>
				<button onClick={onHapus} className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label="Hapus video">
					<Trash2 className="h-3.5 w-3.5" />
				</button>
			</div>
		</div>
	);
};

const VideoDesaDetailPage = () => {
	const { id } = useParams();
	const navigate = useNavigate();
	const [data, setData] = useState(null);
	const [memuat, setMemuat] = useState(true);
	const [saringan, setSaringan] = useState("semua");
	const [cari, setCari] = useState("");
	const [pengaturan, setPengaturan] = useState(false);
	const [diputar, setDiputar] = useState(null);
	const [sibuk, setSibuk] = useState(null);

	const muat = useCallback(async () => {
		try {
			const r = await getPermintaan(id);
			setData(r.data.data);
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal memuat permintaan video.");
		} finally {
			setMemuat(false);
		}
	}, [id]);

	useEffect(() => {
		muat();
	}, [muat]);

	const kiriman = useMemo(() => {
		if (!data) return [];
		const kata = cari.trim().toLowerCase();
		return data.kiriman.filter(
			(k) =>
				(saringan === "semua" || k.status === saringan) &&
				(!kata || [k.desa, k.kecamatan, k.nama_pengirim, k.nama_berkas].filter(Boolean).join(" ").toLowerCase().includes(kata))
		);
	}, [data, saringan, cari]);

	const hitung = useMemo(() => {
		const h = { semua: 0, masuk: 0, disetujui: 0, ditolak: 0 };
		(data?.kiriman || []).forEach((k) => { h.semua += 1; h[k.status] += 1; });
		return h;
	}, [data]);

	const putar = async (k) => {
		try {
			const t = await getTautanVideo(k.id);
			setDiputar({ ...k, src: t.putar, mkv: /\.mkv$/i.test(k.nama_berkas) });
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal membuka video.");
		}
	};

	const unduh = async (k) => {
		try {
			const t = await getTautanVideo(k.id);
			// Navigasi biasa, bukan blob: video ratusan MB tidak boleh ditampung di memori.
			const a = document.createElement("a");
			a.href = t.unduh;
			document.body.appendChild(a);
			a.click();
			a.remove();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal mengunduh video.");
		}
	};

	const tinjau = async (k, status) => {
		let catatan;
		if (status === "ditolak") {
			const r = await Swal.fire({
				title: "Tolak video ini?",
				input: "textarea",
				inputLabel: "Alasan (dibaca bidang; sampaikan juga ke desa lewat WhatsApp)",
				inputPlaceholder: "mis. Suara tidak jelas, video goyang, orientasi salah",
				showCancelButton: true,
				confirmButtonText: "Tolak",
				cancelButtonText: "Batal",
				confirmButtonColor: "#e11d48",
			});
			if (!r.isConfirmed) return;
			catatan = r.value || "";
		}
		setSibuk(k.id);
		try {
			await tinjauKiriman(k.id, status, catatan);
			await muat();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal menyimpan tinjauan.");
		} finally {
			setSibuk(null);
		}
	};

	const hapus = async (k) => {
		const r = await Swal.fire({
			title: "Hapus video?",
			text: `Video dari Desa ${k.desa} (${formatUkuran(k.ukuran)}) dihapus permanen dari server.`,
			icon: "warning",
			showCancelButton: true,
			confirmButtonText: "Hapus",
			cancelButtonText: "Batal",
			confirmButtonColor: "#e11d48",
		});
		if (!r.isConfirmed) return;
		try {
			await hapusKiriman(k.id);
			toast.success("Video dihapus.");
			muat();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal menghapus video.");
		}
	};

	const simpanPengaturan = async (isi) => {
		try {
			await ubahPermintaan(id, isi);
			toast.success("Pengaturan disimpan.");
			muat();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal menyimpan.");
			throw e;
		}
	};

	const alihStatus = async () => {
		const tutup = !data.tertutup;
		try {
			await ubahPermintaan(id, tutup ? { status: "ditutup" } : { status: "dibuka", ...(data.tutup_pada && new Date(data.tutup_pada) < new Date() ? { tutup_pada: null } : {}) });
			toast.success(tutup ? "Permintaan ditutup." : "Permintaan dibuka kembali.");
			muat();
		} catch (e) {
			toast.error(e.response?.data?.message || "Gagal mengubah status.");
		}
	};

	if (memuat) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-slate-50">
				<Loader2 className="h-6 w-6 animate-spin text-slate-900" />
			</div>
		);
	}
	if (!data) {
		return (
			<div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 p-6 text-center">
				<p className="text-sm text-slate-600">Permintaan video tidak ditemukan atau Anda tidak berhak membukanya.</p>
				<button onClick={() => navigate(-1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700">Kembali</button>
			</div>
		);
	}

	const totalUkuran = data.kiriman.reduce((n, k) => n + (k.ukuran || 0), 0);
	const jumlahDesa = new Set(data.kiriman.map((k) => k.desa_id)).size;

	return (
		<div className="min-h-screen bg-slate-50">
			<div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6 lg:px-8">
				<div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
					<button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900">
						<ArrowLeft className="h-4 w-4" /> Kembali
					</button>
					<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div className="min-w-0">
							<div className="flex flex-wrap items-center gap-2">
								<h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{data.judul}</h1>
								<span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${data.tertutup ? "border-slate-200 bg-slate-100 text-slate-500" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
									{data.tertutup ? "Ditutup" : "Menerima video"}
								</span>
							</div>
							<p className="mt-1 text-sm text-slate-500">
								{LABEL_ORIENTASI[data.orientasi]}
								{data.maks_durasi_detik ? ` · maks ${formatDurasi(data.maks_durasi_detik)}` : ""}
								{` · ${data.maks_per_desa} video/desa`}
								{data.tutup_pada ? ` · batas ${formatWaktu(data.tutup_pada)}` : ""}
							</p>
							{data.tertutup && <p className="mt-1 text-xs text-slate-500">{data.tertutup}</p>}
							{data.deskripsi && <p className="mt-3 max-w-3xl whitespace-pre-line rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">{data.deskripsi}</p>}
						</div>
						<div className="flex flex-shrink-0 flex-wrap gap-2">
							<button onClick={() => salinTautanUnggah(data.token)} className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white hover:bg-slate-800">
								<Link2 className="h-4 w-4" /> Salin tautan desa
							</button>
							<button onClick={() => setPengaturan(true)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
								<Settings2 className="h-4 w-4" /> Pengaturan
							</button>
							<button onClick={alihStatus} className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
								{data.tertutup ? "Buka lagi" : "Tutup"}
							</button>
						</div>
					</div>
					<div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
						{[
							[jumlahDesa, "desa mengirim"],
							[hitung.semua, "video masuk"],
							[hitung.disetujui, "disetujui"],
							[formatUkuran(totalUkuran), "di server"],
						].map(([n, l]) => (
							<div key={l}>
								<p className="text-xl font-semibold tabular-nums text-slate-900">{n}</p>
								<p className="text-xs text-slate-500">{l}</p>
							</div>
						))}
					</div>
				</div>

				<div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
					<div className="flex flex-wrap gap-1">
						{SARINGAN.map((s) => (
							<button
								key={s.kunci}
								onClick={() => setSaringan(s.kunci)}
								className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${saringan === s.kunci ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}
							>
								{s.label} <span className="ml-0.5 tabular-nums opacity-60">{hitung[s.kunci]}</span>
							</button>
						))}
					</div>
					<div className="relative">
						<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
						<input value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari desa, kecamatan, pengirim…" className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 sm:w-72" />
					</div>
				</div>

				{kiriman.length === 0 ? (
					<div className="rounded-xl border border-dashed border-slate-300 bg-white py-16 text-center">
						<Film className="mx-auto h-8 w-8 text-slate-300" />
						<p className="mt-3 text-sm font-semibold text-slate-900">{hitung.semua ? "Tidak ada yang cocok" : "Belum ada video masuk"}</p>
						<p className="mx-auto mt-1 max-w-sm text-sm text-slate-500">
							{hitung.semua ? "Ubah saringan atau kata kunci." : "Salin tautan desa lalu bagikan ke grup WhatsApp operator desa."}
						</p>
					</div>
				) : (
					<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
						{kiriman.map((k) => (
							<KartuKiriman
								key={k.id}
								k={k}
								permintaan={data}
								sibuk={sibuk === k.id}
								onPutar={() => putar(k)}
								onUnduh={() => unduh(k)}
								onTinjau={(s) => tinjau(k, s)}
								onHapus={() => hapus(k)}
							/>
						))}
					</div>
				)}
			</div>

			<PengaturanPermintaan buka={pengaturan} awal={data} onTutup={() => setPengaturan(false)} onSimpan={simpanPengaturan} />
			{diputar && <Pemutar video={diputar} onTutup={() => setDiputar(null)} />}
		</div>
	);
};

export default VideoDesaDetailPage;
