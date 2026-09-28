// src/pages/desa/kerjasama/KerjasamaDesaPage.jsx
//
// Kerja Sama Desa — halaman desa.
//
// Urutannya mengikuti urutan kerja, bukan urutan tabel: legalitas dulu (Perdes
// payung, sekali seumur), baru daftar kegiatan yang bisa bertambah tanpa batas.
// Panel legalitas sengaja berada di paling atas dan berubah rupa saat belum
// terisi — selama Perdes-nya belum ada, seluruh kerja sama di bawahnya berdiri
// tanpa dasar hukum, dan itu harus terlihat sebelum petugas mulai mengetik.
//
// Katalog bidang, jenis, dan dokumen wajib TIDAK ditulis di sini. Semuanya
// datang dari /desa/kerjasama/meta yang membacanya dari config/kerjasamaDesa.js
// di server, supaya aturan "KAD perlu Permakades + SK BKD" hanya hidup di satu
// tempat dan tidak menyimpang antara layar dan pemeriksaan server.
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import api from "../../../api";
import {
	LuBuilding2,
	LuCheck,
	LuChevronRight,
	LuCircleAlert,
	LuFileText,
	LuLoader,
	LuPencil,
	LuPlus,
	LuScale,
	LuSearch,
	LuTrash2,
	LuUpload,
	LuX,
} from "react-icons/lu";

const BASIS_BERKAS = import.meta.env.VITE_IMAGE_BASE_URL || "http://127.0.0.1:3001";
// Dokumen kegiatan tinggal di storage/uploads (dilayani /uploads), sedangkan
// Perdes payung di storage/produk_hukum (dilayani /storage) — dua folder yang
// berbeda karena dua modul yang berbeda pemiliknya.
const urlDokumen = (berkas) => `${BASIS_BERKAS}/uploads/kerjasama_desa/${encodeURIComponent(berkas)}`;
const urlPerdes = (berkas) => `${BASIS_BERKAS}/storage/produk_hukum/${encodeURIComponent(berkas)}`;

const PANEL = "overflow-hidden rounded-2xl border border-slate-200 bg-white";
const KEPALA = "flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-5 py-4";
const KICKER = "text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400";
const INPUT =
	"w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 disabled:cursor-not-allowed disabled:bg-slate-50";
const TOMBOL_UTAMA =
	"inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60";
const TOMBOL_HALUS =
	"inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60";

const formKosong = {
	tahun: String(new Date().getFullYear()),
	jenis: "",
	bidang: "",
	sub_bidang: "",
	mitra: "",
	ruang_lingkup: "",
	tanggal_mulai: "",
	tanggal_selesai: "",
	pelaksanaan: "",
};

const pesanGalat = (error, cadangan) =>
	error?.response?.data?.message || error?.message || cadangan;

const BATAS_BERKAS = 10 * 1024 * 1024;

/** Pesan penolakan berkas dokumen kegiatan, atau null bila berkasnya layak. */
const cekBerkas = (berkas) => {
	if (berkas.type !== "application/pdf") return "Modul ini hanya menerima PDF.";
	if (berkas.size > BATAS_BERKAS) return "Ukuran maksimal 10MB.";
	return null;
};

const tanggalSingkat = (nilai) =>
	nilai
		? new Date(nilai).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
		: null;

/** Satu label kecil beserta titik status. Dipakai untuk penanda dokumen. */
const Penanda = ({ ada, anak }) => (
	<span
		title={ada ? "Sudah diunggah" : "Belum diunggah"}
		className={`inline-flex items-center gap-1.5 text-[11.5px] ${ada ? "font-medium text-slate-700" : "text-slate-400"}`}
	>
		<span className={`h-1.5 w-1.5 rounded-full ${ada ? "bg-slate-900" : "border border-slate-300"}`} />
		{anak}
	</span>
);

// ── Panel legalitas ─────────────────────────────────────────────────────────

const PanelLegalitas = ({ legalitas, onUnggah, onSimpanNomor, menyimpan }) => {
	const lengkap = Boolean(legalitas?.lengkap);

	return (
		<section className={PANEL}>
			<div className={KEPALA}>
				<div>
					<p className={KICKER}>Bagian 1 · Sekali di awal</p>
					<h2 className="mt-1 text-[15px] font-bold tracking-tight text-slate-900">
						Legalitas Kerja Sama Desa
					</h2>
				</div>
				<span
					className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11.5px] font-semibold ${
						lengkap ? "bg-slate-900 text-white" : "bg-amber-50 text-amber-700"
					}`}
				>
					{lengkap ? <LuCheck className="h-3.5 w-3.5" /> : <LuCircleAlert className="h-3.5 w-3.5" />}
					{lengkap ? "Perdes terdaftar" : "Perdes belum ada"}
				</span>
			</div>

			<div className="px-5 py-4">
				{lengkap ? (
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div className="flex items-start gap-3">
							<LuScale className="mt-0.5 h-[18px] w-[18px] shrink-0 text-slate-400" strokeWidth={1.75} />
							<div className="min-w-0">
								<p className="text-[13.5px] font-semibold text-slate-900">
									{legalitas.produk_hukum?.judul || "Peraturan Desa tentang Kerja Sama Desa"}
								</p>
								<p className="mt-1 text-[12px] text-slate-500">
									Nomor {legalitas.nomor_perdes || legalitas.produk_hukum?.nomor || "—"}
									{legalitas.tahun_perdes ? ` Tahun ${legalitas.tahun_perdes}` : ""}
									{legalitas.produk_hukum?.tanggal_penetapan
										? ` · ditetapkan ${tanggalSingkat(legalitas.produk_hukum.tanggal_penetapan)}`
										: ""}
								</p>
								<p className="mt-1.5 text-[11.5px] text-slate-400">
									Dokumen ini juga tercatat di menu Produk Hukum Desa.
								</p>
							</div>
						</div>
						<div className="flex gap-2">
							{legalitas.produk_hukum?.file && (
								<a
									href={urlPerdes(legalitas.produk_hukum.file)}
									target="_blank"
									rel="noreferrer"
									className={TOMBOL_HALUS}
								>
									<LuFileText className="h-4 w-4" />
									Lihat
								</a>
							)}
							<button onClick={onUnggah} className={TOMBOL_HALUS} disabled={menyimpan}>
								<LuUpload className="h-4 w-4" />
								Ganti
							</button>
						</div>
					</div>
				) : (
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div className="flex items-start gap-3">
							<LuCircleAlert className="mt-0.5 h-[18px] w-[18px] shrink-0 text-amber-500" strokeWidth={1.75} />
							<div className="min-w-0 max-w-xl">
								<p className="text-[13.5px] font-semibold text-slate-900">
									Perdes payung kerja sama belum terdaftar
								</p>
								<p className="mt-1 text-[12px] leading-relaxed text-slate-500">
									Unggah sekali saja di awal. Seluruh kerja sama desa — baik antardesa maupun dengan pihak
									ketiga — bersandar pada Perdes ini.
									{legalitas?.nomor_perdes
										? ` Nomor ${legalitas.nomor_perdes} sudah tercatat, berkasnya yang belum masuk.`
										: ""}
								</p>
							</div>
						</div>
						<div className="flex gap-2">
							<button onClick={onSimpanNomor} className={TOMBOL_HALUS} disabled={menyimpan}>
								Catat nomor saja
							</button>
							<button onClick={onUnggah} className={TOMBOL_UTAMA} disabled={menyimpan}>
								<LuUpload className="h-4 w-4" />
								Unggah Perdes
							</button>
						</div>
					</div>
				)}
			</div>
		</section>
	);
};

// ── Baris kerja sama ────────────────────────────────────────────────────────

const BarisKerjasama = ({ entri, petaJenis, petaBidang, onUbah, onHapus, onUnggahDokumen }) => {
	const jenis = petaJenis.get(entri.jenis);
	const bidang = petaBidang.get(entri.bidang);

	return (
		<div className="bg-white px-5 py-4 transition-colors hover:bg-slate-50/70">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="min-w-0 flex-1">
					<div className="flex flex-wrap items-center gap-2">
						<span className="rounded-md bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-white">
							{jenis?.kode || entri.jenis}
						</span>
						<span className="text-[14px] font-semibold text-slate-900">{entri.mitra}</span>
						<span className="text-[11.5px] tabular-nums text-slate-400">{entri.tahun}</span>
					</div>

					<p className="mt-1 text-[12px] text-slate-500">
						{bidang ? `${bidang.nomor}. ${bidang.label}` : entri.bidang}
						{entri.sub_bidang ? ` · ${entri.sub_bidang}` : ""}
					</p>

					{(entri.tanggal_mulai || entri.tanggal_selesai) && (
						<p className="mt-1 text-[11.5px] text-slate-400">
							{tanggalSingkat(entri.tanggal_mulai) || "—"} s.d. {tanggalSingkat(entri.tanggal_selesai) || "—"}
						</p>
					)}

					<div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5">
						{entri.dokumen.map((d) => (
							<span key={d.field} className="inline-flex items-center gap-2">
								<Penanda ada={Boolean(d.file)}>{d.singkat}</Penanda>
								{d.file ? (
									<a
										href={urlDokumen(d.file)}
										target="_blank"
										rel="noreferrer"
										className="text-[11px] font-medium text-slate-500 underline underline-offset-2 hover:text-slate-900"
									>
										lihat
									</a>
								) : null}
								<button
									onClick={() => onUnggahDokumen(entri, d)}
									className="text-[11px] font-medium text-slate-500 underline underline-offset-2 hover:text-slate-900"
								>
									{d.file ? "ganti" : "unggah"}
								</button>
							</span>
						))}
					</div>
				</div>

				<div className="flex shrink-0 gap-1.5">
					<button
						onClick={() => onUbah(entri)}
						title="Ubah"
						className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
					>
						<LuPencil className="h-3.5 w-3.5" />
					</button>
					<button
						onClick={() => onHapus(entri)}
						title="Hapus"
						className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
					>
						<LuTrash2 className="h-3.5 w-3.5" />
					</button>
				</div>
			</div>
		</div>
	);
};

// ── Halaman ─────────────────────────────────────────────────────────────────

const KerjasamaDesaPage = () => {
	const [meta, setMeta] = useState(null);
	const [memuatAwal, setMemuatAwal] = useState(true);
	const [galatAwal, setGalatAwal] = useState(null);

	const [daftar, setDaftar] = useState([]);
	const [memuatDaftar, setMemuatDaftar] = useState(false);

	const [saring, setSaring] = useState({ tahun: "", jenis: "", bidang: "", q: "" });

	const [modalTerbuka, setModalTerbuka] = useState(false);
	const [entriDiubah, setEntriDiubah] = useState(null);
	const [form, setForm] = useState(formKosong);
	const [menyimpan, setMenyimpan] = useState(false);
	// Berkas yang dipilih di formulir, per kolom dokumen ({ file_sk_bkd: File }).
	// Tidak wajib: dikirim sesudah entri tersimpan, karena unggahan butuh id-nya.
	const [berkasForm, setBerkasForm] = useState({});

	// Satu input berkas dipakai bergantian oleh semua tombol unggah; sasarannya
	// disimpan di ref supaya tidak perlu satu <input> per dokumen per baris.
	const inputBerkas = useRef(null);
	const sasaranUnggah = useRef(null);

	const petaJenis = useMemo(() => new Map((meta?.jenis || []).map((j) => [j.key, j])), [meta]);
	const petaBidang = useMemo(() => new Map((meta?.bidang || []).map((b) => [b.key, b])), [meta]);

	const muatMeta = useCallback(async () => {
		const res = await api.get("/desa/kerjasama/meta");
		setMeta(res.data?.data || null);
	}, []);

	useEffect(() => {
		(async () => {
			try {
				await muatMeta();
			} catch (error) {
				setGalatAwal(pesanGalat(error, "Tidak dapat memuat data kerja sama desa."));
			} finally {
				setMemuatAwal(false);
			}
		})();
	}, [muatMeta]);

	const muatDaftar = useCallback(async () => {
		setMemuatDaftar(true);
		try {
			const params = {};
			if (saring.tahun) params.tahun = saring.tahun;
			if (saring.jenis) params.jenis = saring.jenis;
			if (saring.bidang) params.bidang = saring.bidang;
			if (saring.q.trim()) params.q = saring.q.trim();

			const res = await api.get("/desa/kerjasama", { params });
			setDaftar(res.data?.data || []);
		} catch (error) {
			Swal.fire("Gagal memuat", pesanGalat(error, "Terjadi kesalahan."), "error");
		} finally {
			setMemuatDaftar(false);
		}
	}, [saring]);

	useEffect(() => {
		if (memuatAwal || galatAwal) return;
		// Ditunda sebentar supaya mengetik di kotak cari tidak memicu permintaan
		// per huruf.
		const timer = setTimeout(muatDaftar, saring.q ? 400 : 0);
		return () => clearTimeout(timer);
	}, [muatDaftar, memuatAwal, galatAwal, saring.q]);

	// ── Legalitas ─────────────────────────────────────────────────────────────

	const unggahPerdes = async () => {
		const { value: isian } = await Swal.fire({
			title: "Unggah Perdes Kerja Sama",
			html:
				`<div style="text-align:left;font-size:13px">` +
				`<label style="display:block;margin-bottom:4px;font-weight:600">Nomor Perdes</label>` +
				`<input id="kd-nomor" class="swal2-input" style="margin:0 0 10px;width:100%" placeholder="Contoh: 05">` +
				`<label style="display:block;margin-bottom:4px;font-weight:600">Tahun</label>` +
				`<input id="kd-tahun" type="number" class="swal2-input" style="margin:0 0 10px;width:100%" value="${new Date().getFullYear()}">` +
				`<label style="display:block;margin-bottom:4px;font-weight:600">Tanggal Penetapan</label>` +
				`<input id="kd-tanggal" type="date" class="swal2-input" style="margin:0 0 10px;width:100%" value="${new Date().toISOString().slice(0, 10)}">` +
				`<label style="display:block;margin-bottom:4px;font-weight:600">Berkas PDF</label>` +
				`<input id="kd-file" type="file" accept="application/pdf" class="swal2-file" style="width:100%">` +
				`<p style="margin:10px 0 0;color:#64748b;font-size:11.5px">Dokumen ini sekalian tercatat di menu Produk Hukum Desa, jadi tidak perlu diunggah dua kali.</p>` +
				`</div>`,
			showCancelButton: true,
			confirmButtonText: "Simpan",
			cancelButtonText: "Batal",
			confirmButtonColor: "#0f172a",
			focusConfirm: false,
			preConfirm: () => {
				const nomor = document.getElementById("kd-nomor").value.trim();
				const tahun = document.getElementById("kd-tahun").value;
				const tanggal = document.getElementById("kd-tanggal").value;
				const berkas = document.getElementById("kd-file").files?.[0];
				if (!nomor) return Swal.showValidationMessage("Nomor Perdes wajib diisi");
				if (!tahun) return Swal.showValidationMessage("Tahun wajib diisi");
				if (!tanggal) return Swal.showValidationMessage("Tanggal penetapan wajib diisi");
				if (!berkas) return Swal.showValidationMessage("Berkas PDF wajib dipilih");
				if (berkas.type !== "application/pdf") return Swal.showValidationMessage("Berkas harus PDF");
				return { nomor, tahun, tanggal, berkas };
			},
		});
		if (!isian) return;

		setMenyimpan(true);
		try {
			const fd = new FormData();
			fd.append("file", isian.berkas);
			fd.append("nomor_perdes", isian.nomor);
			fd.append("tahun_perdes", isian.tahun);
			fd.append("tanggal_penetapan", isian.tanggal);

			await api.post("/desa/kerjasama/legalitas/perdes", fd, {
				headers: { "Content-Type": "multipart/form-data" },
			});
			await muatMeta();
			Swal.fire({ icon: "success", title: "Perdes tersimpan", timer: 1800, showConfirmButton: false });
		} catch (error) {
			Swal.fire("Gagal menyimpan", pesanGalat(error, "Terjadi kesalahan."), "error");
		} finally {
			setMenyimpan(false);
		}
	};

	const catatNomorSaja = async () => {
		const { value: isian } = await Swal.fire({
			title: "Catat Nomor Perdes",
			html:
				`<div style="text-align:left;font-size:13px">` +
				`<label style="display:block;margin-bottom:4px;font-weight:600">Nomor Perdes</label>` +
				`<input id="kd-nomor2" class="swal2-input" style="margin:0 0 10px;width:100%" value="${meta?.legalitas?.nomor_perdes || ""}">` +
				`<label style="display:block;margin-bottom:4px;font-weight:600">Tahun</label>` +
				`<input id="kd-tahun2" type="number" class="swal2-input" style="margin:0;width:100%" value="${meta?.legalitas?.tahun_perdes || new Date().getFullYear()}">` +
				`<p style="margin:10px 0 0;color:#64748b;font-size:11.5px">Berkasnya bisa menyusul. Selama berkasnya belum ada, legalitas desa ini masih terhitung belum lengkap.</p>` +
				`</div>`,
			showCancelButton: true,
			confirmButtonText: "Simpan",
			cancelButtonText: "Batal",
			confirmButtonColor: "#0f172a",
			focusConfirm: false,
			preConfirm: () => {
				const nomor = document.getElementById("kd-nomor2").value.trim();
				if (!nomor) return Swal.showValidationMessage("Nomor Perdes wajib diisi");
				return { nomor, tahun: document.getElementById("kd-tahun2").value };
			},
		});
		if (!isian) return;

		setMenyimpan(true);
		try {
			await api.put("/desa/kerjasama/legalitas", {
				nomor_perdes: isian.nomor,
				tahun_perdes: isian.tahun,
			});
			await muatMeta();
			Swal.fire({ icon: "success", title: "Nomor tercatat", timer: 1500, showConfirmButton: false });
		} catch (error) {
			Swal.fire("Gagal menyimpan", pesanGalat(error, "Terjadi kesalahan."), "error");
		} finally {
			setMenyimpan(false);
		}
	};

	// ── Kegiatan ──────────────────────────────────────────────────────────────

	const bukaTambah = () => {
		setEntriDiubah(null);
		setForm({ ...formKosong, jenis: meta?.jenis?.[0]?.key || "" });
		setBerkasForm({});
		setModalTerbuka(true);
	};

	const bukaUbah = (entri) => {
		setEntriDiubah(entri);
		setForm({
			tahun: String(entri.tahun ?? ""),
			jenis: entri.jenis || "",
			bidang: entri.bidang || "",
			sub_bidang: entri.sub_bidang || "",
			mitra: entri.mitra || "",
			ruang_lingkup: entri.ruang_lingkup || "",
			tanggal_mulai: entri.tanggal_mulai ? String(entri.tanggal_mulai).slice(0, 10) : "",
			tanggal_selesai: entri.tanggal_selesai ? String(entri.tanggal_selesai).slice(0, 10) : "",
			pelaksanaan: entri.pelaksanaan || "",
		});
		setBerkasForm({});
		setModalTerbuka(true);
	};

	const simpan = async (e) => {
		e?.preventDefault?.();
		if (menyimpan) return;

		if (!form.jenis) return Swal.fire("Belum lengkap", "Pilih jenis kerja sama.", "warning");
		if (!form.bidang) return Swal.fire("Belum lengkap", "Pilih bidang kerja sama.", "warning");
		if (!form.mitra.trim()) return Swal.fire("Belum lengkap", "Isi mitra kerja sama.", "warning");

		setMenyimpan(true);
		let id;
		try {
			if (entriDiubah) {
				await api.put(`/desa/kerjasama/${entriDiubah.id}`, form);
				id = entriDiubah.id;
			} else {
				const res = await api.post("/desa/kerjasama", form);
				id = res.data?.data?.id;
			}
		} catch (error) {
			setMenyimpan(false);
			return Swal.fire("Gagal menyimpan", pesanGalat(error, "Terjadi kesalahan."), "error");
		}

		// Entri sudah tersimpan; berkas yang dipilih menyusul satu per satu. Hanya
		// dokumen milik jenis yang dipilih terakhir — pilihan dari jenis lain yang
		// sempat diklik sebelumnya diabaikan. Kegagalan unggah tidak membatalkan
		// entri: berkasnya masih bisa diunggah dari baris daftar.
		const antrean = (petaJenis.get(form.jenis)?.dokumen || []).filter((d) => berkasForm[d.field]);
		const gagal = [];
		for (const d of antrean) {
			try {
				const fd = new FormData();
				fd.append("file", berkasForm[d.field]);
				fd.append("field_name", d.field);
				await api.post(`/desa/kerjasama/${id}/dokumen`, fd, {
					headers: { "Content-Type": "multipart/form-data" },
				});
			} catch (error) {
				gagal.push(`${d.singkat}: ${pesanGalat(error, "gagal")}`);
			}
		}

		setModalTerbuka(false);
		setBerkasForm({});
		setMenyimpan(false);
		await Promise.all([muatDaftar(), muatMeta()]).catch(() => {});

		if (gagal.length) {
			return Swal.fire({
				icon: "warning",
				title: "Data tersimpan, sebagian dokumen gagal",
				html: `${gagal.join("<br/>")}<br/><span style="font-size:12px;color:#64748b">Unggah ulang lewat tautan di baris daftar.</span>`,
			});
		}
		const belumAda = (petaJenis.get(form.jenis)?.dokumen || []).some((d) => {
			const sudah = entriDiubah?.dokumen?.find((x) => x.field === d.field)?.file;
			return !sudah && !berkasForm[d.field];
		});
		Swal.fire({
			icon: "success",
			title: entriDiubah ? "Kerja sama diperbarui" : "Kerja sama tersimpan",
			text: belumAda ? "Dokumen yang belum ada bisa diunggah nanti lewat tautan di baris daftar." : undefined,
			timer: belumAda ? 2600 : 1500,
			showConfirmButton: false,
		});
	};

	const pilihBerkasForm = (field, berkas) => {
		if (!berkas) return;
		const galat = cekBerkas(berkas);
		if (galat) return Swal.fire("Berkas tidak dapat dipakai", galat, "warning");
		setBerkasForm((lama) => ({ ...lama, [field]: berkas }));
	};

	const hapus = async (entri) => {
		const konfirmasi = await Swal.fire({
			icon: "warning",
			title: "Hapus kerja sama ini?",
			html: `<b>${entri.mitra}</b><br/><span style="font-size:13px">Dokumen yang sudah diunggah ikut terhapus.</span>`,
			showCancelButton: true,
			confirmButtonText: "Ya, hapus",
			cancelButtonText: "Batal",
			confirmButtonColor: "#dc2626",
		});
		if (!konfirmasi.isConfirmed) return;

		try {
			await api.delete(`/desa/kerjasama/${entri.id}`);
			await Promise.all([muatDaftar(), muatMeta()]);
		} catch (error) {
			Swal.fire("Gagal menghapus", pesanGalat(error, "Terjadi kesalahan."), "error");
		}
	};

	const mintaBerkas = (entri, dokumen) => {
		sasaranUnggah.current = { entri, dokumen };
		inputBerkas.current?.click();
	};

	const kirimBerkas = async (event) => {
		const berkas = event.target.files?.[0];
		event.target.value = "";
		const sasaran = sasaranUnggah.current;
		if (!berkas || !sasaran) return;

		const galat = cekBerkas(berkas);
		if (galat) return Swal.fire("Berkas tidak dapat dipakai", galat, "warning");

		try {
			const fd = new FormData();
			fd.append("file", berkas);
			fd.append("field_name", sasaran.dokumen.field);
			await api.post(`/desa/kerjasama/${sasaran.entri.id}/dokumen`, fd, {
				headers: { "Content-Type": "multipart/form-data" },
			});
			await muatDaftar();
			Swal.fire({
				icon: "success",
				title: `${sasaran.dokumen.singkat} tersimpan`,
				timer: 1500,
				showConfirmButton: false,
			});
		} catch (error) {
			Swal.fire("Gagal mengunggah", pesanGalat(error, "Terjadi kesalahan."), "error");
		}
	};

	// ── Render ────────────────────────────────────────────────────────────────

	if (memuatAwal) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center text-slate-500">
				<LuLoader className="mr-2 h-5 w-5 animate-spin" />
				<span className="text-sm font-medium">Memuat kerja sama desa…</span>
			</div>
		);
	}

	if (galatAwal) {
		return (
			<div className="mx-auto mt-10 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
				<LuCircleAlert className="mx-auto h-8 w-8 text-amber-500" />
				<p className="mt-3 font-semibold text-amber-900">Halaman tidak dapat dibuka</p>
				<p className="mt-1 text-sm text-amber-800">{galatAwal}</p>
			</div>
		);
	}

	const adaSaring = saring.tahun || saring.jenis || saring.bidang || saring.q.trim();

	return (
		<div className="w-full space-y-5 px-4 py-6 sm:px-6 lg:px-8">
			<input ref={inputBerkas} type="file" accept="application/pdf" onChange={kirimBerkas} className="hidden" />

			<header>
				<p className={KICKER}>Kerja Sama Desa</p>
				<h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
					{meta?.desa?.nama ? `Kerja Sama ${meta.desa.status_pemerintahan === "kelurahan" ? "Kelurahan" : "Desa"} ${meta.desa.nama}` : "Kerja Sama Desa"}
				</h1>
				<p className="mt-1.5 max-w-3xl text-sm text-slate-500">
					Kerja sama antardesa (KAD) dan kerja sama desa dengan pihak ketiga (KDPK), beserta dokumennya.
					{meta?.desa?.kecamatan ? ` Kecamatan ${meta.desa.kecamatan}.` : ""}
				</p>
			</header>

			<PanelLegalitas
				legalitas={meta?.legalitas}
				onUnggah={unggahPerdes}
				onSimpanNomor={catatNomorSaja}
				menyimpan={menyimpan}
			/>

			<section className={PANEL}>
				<div className={KEPALA}>
					<div>
						<p className={KICKER}>Bagian 2 · Tanpa batas</p>
						<h2 className="mt-1 text-[15px] font-bold tracking-tight text-slate-900">
							Daftar Kerja Sama
							{daftar.length > 0 && (
								<span className="ml-2 text-[12px] font-medium tabular-nums text-slate-400">
									{daftar.length} entri
								</span>
							)}
						</h2>
					</div>
					<button onClick={bukaTambah} className={TOMBOL_UTAMA}>
						<LuPlus className="h-4 w-4" />
						Tambah Kerja Sama
					</button>
				</div>

				<div className="flex flex-wrap gap-2.5 border-b border-slate-100 bg-slate-50/60 px-5 py-3">
					<div className="relative min-w-[200px] flex-1">
						<LuSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
						<input
							type="text"
							value={saring.q}
							onChange={(e) => setSaring((s) => ({ ...s, q: e.target.value }))}
							placeholder="Cari mitra atau sub-bidang…"
							className={`${INPUT} pl-9`}
						/>
					</div>
					<input
						type="number"
						value={saring.tahun}
						onChange={(e) => setSaring((s) => ({ ...s, tahun: e.target.value }))}
						placeholder="Tahun"
						className={`${INPUT} w-[110px]`}
					/>
					<select
						value={saring.jenis}
						onChange={(e) => setSaring((s) => ({ ...s, jenis: e.target.value }))}
						className={`${INPUT} w-[170px]`}
					>
						<option value="">Semua jenis</option>
						{(meta?.jenis || []).map((j) => (
							<option key={j.key} value={j.key}>
								{j.kode} — {j.label}
							</option>
						))}
					</select>
					<select
						value={saring.bidang}
						onChange={(e) => setSaring((s) => ({ ...s, bidang: e.target.value }))}
						className={`${INPUT} w-[240px]`}
					>
						<option value="">Semua bidang</option>
						{(meta?.bidang || []).map((b) => (
							<option key={b.key} value={b.key}>
								{b.nomor}. {b.label}
							</option>
						))}
					</select>
					{adaSaring && (
						<button
							onClick={() => setSaring({ tahun: "", jenis: "", bidang: "", q: "" })}
							className="text-[12px] font-semibold text-slate-500 underline-offset-2 hover:text-slate-900 hover:underline"
						>
							Bersihkan
						</button>
					)}
				</div>

				{memuatDaftar ? (
					<div className="flex items-center justify-center gap-2 py-16 text-slate-500">
						<LuLoader className="h-5 w-5 animate-spin" />
						<span className="text-sm">Memuat…</span>
					</div>
				) : daftar.length === 0 ? (
					<div className="px-6 py-16 text-center">
						<LuBuilding2 className="mx-auto h-8 w-8 text-slate-300" strokeWidth={1.5} />
						<p className="mt-3 text-sm font-semibold text-slate-700">
							{adaSaring ? "Tidak ada yang cocok dengan penyaring" : "Belum ada kerja sama tercatat"}
						</p>
						<p className="mx-auto mt-1 max-w-sm text-[12.5px] text-slate-500">
							{adaSaring
								? "Ubah atau bersihkan penyaring di atas."
								: "Tambahkan kerja sama antardesa atau dengan pihak ketiga lewat tombol di atas."}
						</p>
					</div>
				) : (
					<div className="grid gap-px bg-slate-200">
						{daftar.map((entri) => (
							<BarisKerjasama
								key={entri.id}
								entri={entri}
								petaJenis={petaJenis}
								petaBidang={petaBidang}
								onUbah={bukaUbah}
								onHapus={hapus}
								onUnggahDokumen={mintaBerkas}
							/>
						))}
					</div>
				)}
			</section>

			{/* ── Modal tambah/ubah ────────────────────────────────────────────── */}
			{modalTerbuka && (
				<div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
					<div
						className="flex w-full max-h-[92vh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-2xl"
						style={{ maxHeight: "92dvh" }}
					>
						<div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
							<div>
								<p className={KICKER}>{entriDiubah ? "Ubah entri" : "Entri baru"}</p>
								<h2 className="mt-1 font-bold text-slate-900">
									{entriDiubah ? "Ubah Kerja Sama" : "Tambah Kerja Sama"}
								</h2>
							</div>
							<button
								onClick={() => setModalTerbuka(false)}
								className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
								aria-label="Tutup"
							>
								<LuX className="h-5 w-5" />
							</button>
						</div>

						<form onSubmit={simpan} className="flex min-h-0 flex-1 flex-col">
							<div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
								<div>
									<p className={KICKER}>Informasi umum</p>
									<div className="mt-3 grid gap-4 sm:grid-cols-2">
										<div>
											<label className="mb-1.5 block text-sm font-semibold text-slate-700">
												Tahun Kerja Sama <span className="text-rose-500">*</span>
											</label>
											<input
												type="number"
												value={form.tahun}
												onChange={(e) => setForm({ ...form, tahun: e.target.value })}
												className={INPUT}
											/>
										</div>
										<div>
											<label className="mb-1.5 block text-sm font-semibold text-slate-700">
												Jenis Kerja Sama <span className="text-rose-500">*</span>
											</label>
											<div className="grid grid-cols-2 gap-2">
												{(meta?.jenis || []).map((j) => {
													const dipilih = form.jenis === j.key;
													return (
														<button
															key={j.key}
															type="button"
															onClick={() => setForm({ ...form, jenis: j.key })}
															className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
																dipilih
																	? "border-slate-900 bg-slate-900/[0.04]"
																	: "border-slate-200 hover:bg-slate-50"
															}`}
														>
															<span className="block text-[12.5px] font-bold text-slate-900">{j.kode}</span>
															<span className="block text-[11px] text-slate-500">{j.label}</span>
														</button>
													);
												})}
											</div>
										</div>
									</div>

									{/* Dokumen yang akan diminta ditampilkan sejak jenis dipilih,
									    supaya petugas tahu berkas apa yang perlu disiapkan sebelum
									    menutup formulir. */}
									{form.jenis && (
										<p className="mt-2 text-[11.5px] text-slate-500">
											Dokumen untuk jenis ini:{" "}
											<span className="font-medium text-slate-700">
												{(petaJenis.get(form.jenis)?.dokumen || []).map((d) => d.label).join(" + ")}
											</span>
										</p>
									)}
								</div>

								<div>
									<div className="grid gap-4 sm:grid-cols-2">
										<div>
											<label className="mb-1.5 block text-sm font-semibold text-slate-700">
												Bidang Kerja Sama <span className="text-rose-500">*</span>
											</label>
											<select
												value={form.bidang}
												onChange={(e) => setForm({ ...form, bidang: e.target.value })}
												className={INPUT}
											>
												<option value="">— Pilih bidang —</option>
												{(meta?.bidang || []).map((b) => (
													<option key={b.key} value={b.key}>
														{b.nomor}. {b.label}
													</option>
												))}
											</select>
										</div>
										<div>
											<label className="mb-1.5 block text-sm font-semibold text-slate-700">
												Detail Sub-bidang
											</label>
											<input
												type="text"
												value={form.sub_bidang}
												onChange={(e) => setForm({ ...form, sub_bidang: e.target.value })}
												placeholder="Contoh: Jalan penghubung antardesa"
												className={INPUT}
											/>
										</div>
									</div>
								</div>

								<div>
									<p className={KICKER}>Mitra kerja sama</p>
									<div className="mt-3">
										<label className="mb-1.5 block text-sm font-semibold text-slate-700">
											Nama Mitra <span className="text-rose-500">*</span>
										</label>
										<input
											type="text"
											value={form.mitra}
											onChange={(e) => setForm({ ...form, mitra: e.target.value })}
											placeholder={
												form.jenis === "antar_desa" ? "Contoh: Desa Sukamaju" : "Contoh: PT Hokkan Indonesia"
											}
											className={INPUT}
										/>
									</div>
									<div className="mt-4 grid gap-4 sm:grid-cols-2">
										<div>
											<label className="mb-1.5 block text-sm font-semibold text-slate-700">Tanggal Mulai</label>
											<input
												type="date"
												value={form.tanggal_mulai}
												onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })}
												className={INPUT}
											/>
										</div>
										<div>
											<label className="mb-1.5 block text-sm font-semibold text-slate-700">
												Tanggal Selesai
											</label>
											<input
												type="date"
												value={form.tanggal_selesai}
												onChange={(e) => setForm({ ...form, tanggal_selesai: e.target.value })}
												className={INPUT}
											/>
										</div>
									</div>
									<div className="mt-4">
										<label className="mb-1.5 block text-sm font-semibold text-slate-700">Ruang Lingkup</label>
										<textarea
											rows={2}
											value={form.ruang_lingkup}
											onChange={(e) => setForm({ ...form, ruang_lingkup: e.target.value })}
											placeholder="Objek yang dikerjasamakan"
											className={`${INPUT} resize-none`}
										/>
									</div>
								</div>

								<div>
									<p className={KICKER}>Pelaksanaan & evaluasi</p>
									<textarea
										rows={3}
										value={form.pelaksanaan}
										onChange={(e) => setForm({ ...form, pelaksanaan: e.target.value })}
										placeholder="Perkembangan pelaksanaan, hasil, atau catatan evaluasi"
										className={`${INPUT} mt-3 resize-none`}
									/>
								</div>

								{form.jenis && (
									<div>
										<p className={KICKER}>
											Dokumen <span className="normal-case tracking-normal text-slate-400">· opsional</span>
										</p>
										<div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
											{(petaJenis.get(form.jenis)?.dokumen || []).map((d) => {
												const dipilih = berkasForm[d.field];
												const lama = entriDiubah?.dokumen?.find((x) => x.field === d.field)?.file;
												return (
													<div key={d.field} className="flex flex-wrap items-center gap-3 px-4 py-3">
														<LuFileText
															className={`h-4 w-4 shrink-0 ${dipilih || lama ? "text-emerald-600" : "text-slate-400"}`}
														/>
														<div className="min-w-0 flex-1">
															<p className="text-[13px] font-semibold text-slate-800">{d.label}</p>
															<p className="truncate text-[11.5px] text-slate-500">
																{dipilih ? (
																	<>
																		{dipilih.name}{" "}
																		<span className="text-slate-400">
																			· {(dipilih.size / 1024 / 1024).toFixed(1)} MB · diunggah saat disimpan
																		</span>
																	</>
																) : lama ? (
																	<a
																		href={urlDokumen(lama)}
																		target="_blank"
																		rel="noreferrer"
																		className="underline underline-offset-2 hover:text-slate-900"
																	>
																		Sudah diunggah — lihat
																	</a>
																) : (
																	"Belum ada berkas"
																)}
															</p>
														</div>
														{dipilih && (
															<button
																type="button"
																onClick={() => setBerkasForm((lama) => ({ ...lama, [d.field]: undefined }))}
																className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
																aria-label={`Batalkan ${d.singkat}`}
															>
																<LuX className="h-4 w-4" />
															</button>
														)}
														<label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition-colors hover:bg-slate-50">
															<LuUpload className="h-3.5 w-3.5" />
															{dipilih || lama ? "Ganti" : "Pilih PDF"}
															<input
																type="file"
																accept="application/pdf"
																className="hidden"
																onChange={(e) => {
																	pilihBerkasForm(d.field, e.target.files?.[0]);
																	e.target.value = "";
																}}
															/>
														</label>
													</div>
												);
											})}
										</div>
										<p className="mt-2 text-[11.5px] leading-relaxed text-slate-500">
											PDF, maks. 10MB. Boleh dikosongkan — entri tetap tersimpan dan berkasnya bisa diunggah nanti
											dari baris daftar.
										</p>
									</div>
								)}
							</div>

							<div
								className="flex shrink-0 gap-3 border-t border-slate-100 bg-white px-5 py-3"
								style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
							>
								<button type="button" onClick={() => setModalTerbuka(false)} className={`flex-1 ${TOMBOL_HALUS}`}>
									Batal
								</button>
								<button type="submit" disabled={menyimpan} className={`flex-1 ${TOMBOL_UTAMA}`}>
									{menyimpan ? "Menyimpan…" : entriDiubah ? "Simpan Perubahan" : "Simpan"}
									{!menyimpan && <LuChevronRight className="h-4 w-4" />}
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	);
};

export default KerjasamaDesaPage;
