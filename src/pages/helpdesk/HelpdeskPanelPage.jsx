import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
	ArrowLeft, ArrowUpRight, ChartColumn, ChevronDown, Copy, CornerDownLeft, Flame, Hourglass, Inbox, Lightbulb, LoaderCircle,
	MessageCircleReply, MessageSquareText, MessagesSquare, Pencil, Plus, RefreshCw, Route, Search, Send, Settings, Siren, Smile,
	Sparkles, Star, Ticket, Timer, Trash2, TriangleAlert, User, WandSparkles, X, Zap,
} from "lucide-react";
import api from "../../api";
import { IKON_KATEGORI, LABEL_TINGKAT, STATUS_TIKET, ikonKategori, pesanGalat, waktu } from "../../components/helpdesk/ikonHelpdesk";

/**
 * Panel Helpdesk untuk petugas: kecamatan (tiket wilayahnya), staf bidang
 * (tiket bidangnya), dan pimpinan DPMD (semua tiket). Cakupan ditentukan
 * server dari akun. Pimpinan DPMD dan Kepala Bidang juga mengelola basis
 * pengetahuan bot: FAQ, pertanyaan yang belum terjawab, dan — khusus pimpinan
 * — kategori beserta rute penanggung jawabnya serta pengaturan.
 */

const AUDIENS = { semua: "Semua", publik: "Hanya tamu", akun: "Hanya akun desa/kecamatan" };
const INPUT = "w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition";
const PILIH = "pl-3 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl";
const KARTU = "bg-white rounded-2xl ring-1 ring-slate-200";
const TOMBOL = "inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-sm font-bold rounded-xl transition-colors disabled:opacity-50";

// Tiket & percakapan diperbarui diam-diam supaya balasan pelapor dan tiket
// baru muncul tanpa menekan muat ulang.
const SEGAR_DAFTAR_MS = 45 * 1000;
const SEGAR_DETAIL_MS = 30 * 1000;
// Batas yang sama dengan "Lewat 24 jam" di statistik server.
const JAM_TERLAMBAT = 24;
const JAM_WASPADA = 4;

const Lencana = ({ status }) => {
	const s = STATUS_TIKET[status] || STATUS_TIKET.baru;
	return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ${s.kelas}`}>{s.label}</span>;
};
const LencanaMendesak = () => (
	<span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 ring-1 ring-rose-200"><Siren size={11} />Mendesak</span>
);
const tujuanTiket = (t) => (t.target_level === "kecamatan" ? `Kecamatan ${t.kecamatan_nama || ""}` : t.target_level === "bidang" ? t.bidang_nama || "Bidang" : "DPMD");
const durasi = (menit) => {
	if (menit == null) return "—";
	if (menit < 60) return `${Math.round(menit)} mnt`;
	if (menit < 60 * 24) return `${(menit / 60).toFixed(1)} jam`;
	return `${(menit / 1440).toFixed(1)} hari`;
};

/** "baru saja", "12 mnt", "3 jam", "2 hari" — tanggal penuh setelah seminggu. */
const relatif = (s) => {
	if (!s) return "";
	const menit = (Date.now() - new Date(s).getTime()) / 60000;
	if (menit < 1) return "baru saja";
	if (menit < 60) return `${Math.floor(menit)} mnt`;
	if (menit < 60 * 24) return `${Math.floor(menit / 60)} jam`;
	if (menit < 60 * 24 * 7) return `${Math.floor(menit / 1440)} hari`;
	return new Date(s).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
};

/**
 * Seberapa lama tiket menunggu petugas. Hanya tiket berstatus "baru" yang
 * menunggu: balasan pelapor mengembalikan status ke "baru", jadi tiket yang
 * pernah ditanggapi lalu dibalas lagi ikut terhitung — dan ditandai.
 */
const tungguTiket = (t) => {
	if (t.status !== "baru") return null;
	const jam = (Date.now() - new Date(t.last_message_at || t.created_at).getTime()) / 3600000;
	return {
		jam,
		nada: jam >= JAM_TERLAMBAT ? "terlambat" : jam >= JAM_WASPADA ? "waspada" : "segar",
		// Pelapor menulis lagi setelah ditanggapi. Diteruskan juga mengembalikan
		// status ke baru, jadi pengirim terakhir yang memastikan.
		balasanPelapor: Boolean(t.first_response_at) && t.pengirim_terakhir === 'pelapor',
	};
};

const inisial = (nama = "") => String(nama).trim().split(/\s+/).slice(0, 2).map((k) => k[0] || "").join("").toUpperCase() || "?";

/** Pemisah tanggal di percakapan: "Hari ini", "Kemarin", atau tanggal. */
const labelHari = (s) => {
	const d = new Date(s);
	const hari = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
	const selisih = Math.round((hari(new Date()) - hari(d)) / 86400000);
	if (selisih === 0) return "Hari ini";
	if (selisih === 1) return "Kemarin";
	return d.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
};
const jam = (s) => new Date(s).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

/** Huruf yang diketik ke kolom isian bukan pintasan. */
const sedangMengetik = (el) => Boolean(el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)));

// Kalimat yang paling sering diketik petugas. {nama} diganti nama pelapor.
const BALASAN_CEPAT = [
	{ label: "Sudah diterima", teks: "Halo {nama}, terima kasih. Pertanyaan Anda sudah kami terima dan sedang kami pelajari. Kami kabari kembali secepatnya." },
	{ label: "Minta kelengkapan", teks: "Halo {nama}, agar dapat kami tindak lanjuti, mohon lengkapi informasi berikut:\n1. \n2. " },
	{ label: "Sedang diproses", teks: "Halo {nama}, permohonan Anda sedang kami proses bersama bidang terkait. Mohon ditunggu, kami kabari perkembangannya di tiket ini." },
	{ label: "Selesai", teks: "Halo {nama}, permasalahan Anda sudah kami tindak lanjuti. Bila masih ada kendala, silakan balas tiket ini. Terima kasih." },
];

const NADA_TUNGGU = {
	terlambat: "bg-rose-50 text-rose-700 ring-rose-200",
	waspada: "bg-amber-50 text-amber-700 ring-amber-200",
	segar: "bg-slate-50 text-slate-600 ring-slate-200",
};

const ChipTunggu = ({ tunggu }) => {
	if (!tunggu) return null;
	const teks = tunggu.jam < 1 ? `${Math.max(1, Math.round(tunggu.jam * 60))} mnt` : tunggu.jam < 48 ? `${Math.floor(tunggu.jam)} jam` : `${Math.floor(tunggu.jam / 24)} hari`;
	return (
		<span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold ring-1 ${NADA_TUNGGU[tunggu.nada]}`} title="Lama menunggu tanggapan petugas">
			<Hourglass size={10} />{teks}
		</span>
	);
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ TIKET ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function DetailTiket({ id, onBerubah, onKembali }) {
	const [t, setT] = useState(null);
	const [balas, setBalas] = useState("");
	const [statusBalas, setStatusBalas] = useState("dijawab");
	const [alasan, setAlasan] = useState("");
	const [bidangTujuan, setBidangTujuan] = useState("");
	const [teruskanBuka, setTeruskanBuka] = useState(false);
	const [infoBuka, setInfoBuka] = useState(false);
	const [sibuk, setSibuk] = useState(false);
	const [menyusun, setMenyusun] = useState(false);
	const ujungPesan = useRef(null);
	const kotakBalas = useRef(null);
	const jumlahPesan = useRef(0);

	const muat = useCallback(async ({ senyap = false } = {}) => {
		try {
			const { data } = await api.get(`/helpdesk/petugas/tiket/${id}`);
			setT(data.data);
		} catch (err) {
			if (!senyap) toast.error(pesanGalat(err, "memuat tiket"));
		}
	}, [id]);
	useEffect(() => { muat(); }, [muat]);
	useEffect(() => {
		const jeda = setInterval(() => { if (!document.hidden) muat({ senyap: true }); }, SEGAR_DETAIL_MS);
		return () => clearInterval(jeda);
	}, [muat]);

	// Gulir ke pesan terbaru saat dibuka dan setiap ada pesan baru.
	useEffect(() => {
		const n = t?.pesan?.length || 0;
		if (n && n !== jumlahPesan.current) ujungPesan.current?.scrollIntoView({ block: "end", behavior: jumlahPesan.current ? "smooth" : "auto" });
		jumlahPesan.current = n;
	}, [t?.pesan?.length]);

	const jalankan = async (aksi, sukses) => {
		setSibuk(true);
		try {
			const { data } = await aksi();
			toast.success(data.message || sukses);
			await muat();
			onBerubah();
			return true;
		} catch (err) {
			toast.error(pesanGalat(err, "menyimpan"));
			return false;
		} finally {
			setSibuk(false);
		}
	};

	const kirimBalas = async (e) => {
		e?.preventDefault();
		if (!balas.trim() || sibuk) return;
		if (await jalankan(() => api.post(`/helpdesk/petugas/tiket/${id}/balas`, { pesan: balas, status: statusBalas }))) setBalas("");
	};

	/* Draf AI hanya mengisi kotak balasan — petugas tetap membaca dan menyunting. */
	const susunDraf = async () => {
		setMenyusun(true);
		try {
			const { data } = await api.post(`/helpdesk/petugas/tiket/${id}/draf`);
			setBalas(data.data.draf);
			kotakBalas.current?.focus();
			toast.success("Draf siap — periksa dan lengkapi bagian [lengkapi: …] sebelum dikirim");
		} catch (err) {
			toast.error(pesanGalat(err, "menyusun draf"));
		} finally {
			setMenyusun(false);
		}
	};

	const pakaiTemplat = (teks) => {
		const isi = teks.replace("{nama}", t?.reporter_name || "Bapak/Ibu");
		setBalas((lama) => (lama.trim() ? `${lama.trimEnd()}\n\n${isi}` : isi));
		requestAnimationFrame(() => kotakBalas.current?.focus());
	};

	const salinKode = () => {
		navigator.clipboard?.writeText(t.code).then(() => toast.success(`Kode ${t.code} disalin`), () => {});
	};

	// Pesan dikelompokkan per hari supaya percakapan panjang tetap terbaca.
	const kelompok = useMemo(() => {
		const hasil = [];
		for (const m of t?.pesan || []) {
			const label = labelHari(m.created_at);
			if (!hasil.length || hasil[hasil.length - 1].label !== label) hasil.push({ label, pesan: [] });
			hasil[hasil.length - 1].pesan.push(m);
		}
		return hasil;
	}, [t?.pesan]);

	if (!t) {
		return (
			<div className={`${KARTU} flex h-full min-h-[420px] items-center justify-center text-sm text-slate-400`}>
				<LoaderCircle size={18} className="mr-2 animate-spin" />Memuat tiket…
			</div>
		);
	}

	const tunggu = tungguTiket(t);
	const IkonKat = ikonKategori(t.category_icon);

	return (
		<div className={`${KARTU} flex h-full min-h-[70vh] flex-col overflow-hidden lg:min-h-0`}>
			{/* ---------- Kepala ---------- */}
			<div className="border-b border-slate-100 p-3 sm:p-4">
				<div className="flex items-start gap-3">
					{onKembali && (
						<button type="button" onClick={onKembali} className="-ml-1 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden" aria-label="Kembali ke daftar">
							<ArrowLeft size={18} />
						</button>
					)}
					<div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 sm:flex"><IkonKat size={18} /></div>
					<div className="min-w-0 flex-1">
						<div className="flex flex-wrap items-center gap-1.5">
							<button type="button" onClick={salinKode} title="Salin kode tiket" className="inline-flex items-center gap-1 rounded-md font-mono text-xs font-bold text-slate-500 hover:text-slate-900">
								{t.code}<Copy size={11} />
							</button>
							<Lencana status={t.status} />
							{t.priority === "tinggi" && <LencanaMendesak />}
							<ChipTunggu tunggu={tunggu} />
							{t.rating && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200"><Star size={11} className="fill-amber-400 text-amber-400" />{t.rating}/5</span>}
						</div>
						<h3 className="m-0 mt-1 text-base font-bold leading-snug text-slate-900">{t.subject}</h3>
						<button type="button" onClick={() => setInfoBuka((b) => !b)} className="mt-1 inline-flex max-w-full items-center gap-1 text-left text-xs text-slate-500 hover:text-slate-800">
							<User size={12} className="shrink-0" />
							<span className="truncate">
								{t.reporter_name}{t.user_id ? " · akun" : " · tamu"}{t.desa_nama ? ` · ${t.desa_nama}` : ""} · {t.category_name || "Tanpa kategori"}
							</span>
							<ChevronDown size={12} className={`shrink-0 transition-transform ${infoBuka ? "rotate-180" : ""}`} />
						</button>
					</div>
				</div>

				{infoBuka && (
					<dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl bg-slate-50 p-3 text-xs sm:grid-cols-3">
						{[
							["Pelapor", `${t.reporter_name}${t.user_id ? " (akun)" : " (tamu)"}`],
							["Wilayah", [t.desa_nama, t.kecamatan_nama && `Kec. ${t.kecamatan_nama}`].filter(Boolean).join(", ") || "—"],
							["Kategori", t.category_name || "Tanpa kategori"],
							["Ditujukan ke", tujuanTiket(t)],
							["Dibuat", waktu(t.created_at)],
							["Tanggapan pertama", t.first_response_at ? `${waktu(t.first_response_at)} (${durasi((new Date(t.first_response_at) - new Date(t.created_at)) / 60000)})` : "Belum"],
							["Ditangani", t.handled_by_name || "—"],
							["Pesan", `${t.pesan?.length || 0}`],
						].map(([l, v]) => (
							<div key={l} className="min-w-0">
								<dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{l}</dt>
								<dd className="m-0 truncate font-medium text-slate-800" title={v}>{v}</dd>
							</div>
						))}
						{t.rating_note && <p className="col-span-full m-0 rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-800">Catatan penilaian: “{t.rating_note}”</p>}
					</dl>
				)}

				{/* Bilah aksi */}
				<div className="mt-3 flex flex-wrap items-center gap-2">
					<div className="inline-flex rounded-xl bg-slate-100 p-0.5" role="group" aria-label="Status tiket">
						{Object.entries(STATUS_TIKET).map(([k, v]) => (
							<button key={k} type="button" disabled={sibuk || t.status === k}
								onClick={() => jalankan(() => api.patch(`/helpdesk/petugas/tiket/${id}/status`, { status: k }))}
								className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${t.status === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>
								{v.label}
							</button>
						))}
					</div>
					<button type="button" disabled={sibuk} onClick={() => jalankan(() => api.patch(`/helpdesk/petugas/tiket/${id}/prioritas`, { prioritas: t.priority === "tinggi" ? "normal" : "tinggi" }))}
						className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-colors disabled:opacity-50 ${t.priority === "tinggi" ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-rose-50 text-rose-700 hover:bg-rose-100"}`}>
						<Siren size={13} />{t.priority === "tinggi" ? "Mendesak" : "Tandai mendesak"}
					</button>
					{(t.teruskan_ke || t.bisa_alihkan_bidang) && (
						<button type="button" onClick={() => setTeruskanBuka((b) => !b)} className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-colors ${teruskanBuka ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}>
							<Route size={13} />Teruskan
						</button>
					)}
					{t.reporter_whatsapp_url && (
						<a href={t.reporter_whatsapp_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-xl bg-[#25D366] px-2.5 py-1.5 text-xs font-bold text-white no-underline hover:brightness-95">
							<ArrowUpRight size={13} />WhatsApp
						</a>
					)}
				</div>

				{teruskanBuka && (
					<div className="mt-3 space-y-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
						{t.bisa_alihkan_bidang && (
							<select className={`${PILIH} w-full`} value={bidangTujuan} onChange={(e) => setBidangTujuan(e.target.value)}>
								<option value="">{t.teruskan_ke ? `Tingkat berikutnya: ${t.teruskan_ke.nama}` : "Pilih bidang tujuan"}</option>
								{t.bidang.map((b) => <option key={b.id} value={b.id}>Alihkan ke {b.nama}</option>)}
							</select>
						)}
						{!t.bisa_alihkan_bidang && t.teruskan_ke && <p className="m-0 text-xs text-slate-600">Diteruskan ke <b>{t.teruskan_ke.nama}</b>.</p>}
						<div className="flex flex-col gap-2 sm:flex-row">
							<input className={INPUT} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Catatan untuk penerima (opsional)" maxLength={500} />
							<button type="button" disabled={sibuk || (!t.teruskan_ke && !bidangTujuan)}
								onClick={async () => {
									if (await jalankan(() => api.post(`/helpdesk/petugas/tiket/${id}/teruskan`, { alasan, bidang_id: bidangTujuan ? Number(bidangTujuan) : null }))) {
										setTeruskanBuka(false);
										setAlasan("");
										setBidangTujuan("");
									}
								}}
								className={`${TOMBOL} whitespace-nowrap bg-slate-900 text-white hover:bg-slate-700`}>
								Teruskan
							</button>
						</div>
					</div>
				)}
			</div>

			{/* ---------- Percakapan ---------- */}
			<div className="min-h-[240px] flex-1 overflow-y-auto bg-slate-50/70 px-3 py-4 sm:px-4">
				{kelompok.map((g) => (
					<div key={g.label} className="space-y-3">
						<div className="sticky top-0 z-10 flex justify-center py-1">
							<span className="rounded-full bg-white/90 px-3 py-0.5 text-[11px] font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200 backdrop-blur">{g.label}</span>
						</div>
						{g.pesan.map((m) => (
							m.sender_type === "sistem" ? (
								<p key={m.id} className="mx-auto m-0 max-w-md whitespace-pre-line rounded-xl bg-white/80 px-3 py-2 text-center text-[11px] text-slate-500 ring-1 ring-slate-200">{m.body}</p>
							) : (
								<div key={m.id} className={`flex items-end gap-2 ${m.sender_type === "petugas" ? "flex-row-reverse" : ""}`}>
									<span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${m.sender_type === "petugas" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
										{inisial(m.sender_name)}
									</span>
									<div className={`max-w-[85%] whitespace-pre-line break-words rounded-2xl px-3.5 py-2.5 text-sm shadow-sm sm:max-w-[75%] ${m.sender_type === "petugas" ? "rounded-br-md bg-emerald-600 text-white" : "rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200"}`}>
										<p className={`m-0 mb-0.5 text-[11px] font-bold ${m.sender_type === "petugas" ? "text-emerald-100" : "text-slate-500"}`}>{m.sender_name}</p>
										{m.body}
										<p className={`m-0 mt-1 text-right text-[10px] ${m.sender_type === "petugas" ? "text-emerald-100" : "text-slate-400"}`}>{jam(m.created_at)}</p>
									</div>
								</div>
							)
						))}
					</div>
				))}
				<div ref={ujungPesan} />
			</div>

			{/* ---------- Penulis balasan ---------- */}
			<form onSubmit={kirimBalas} className="space-y-2 border-t border-slate-100 bg-white p-3 sm:p-4">
				<div className="-mx-1 flex items-center gap-1.5 overflow-x-auto px-1 pb-0.5">
					<Zap size={13} className="shrink-0 text-amber-500" />
					{BALASAN_CEPAT.map((b) => (
						<button key={b.label} type="button" onClick={() => pakaiTemplat(b.teks)}
							className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:bg-emerald-50 hover:text-emerald-700">
							{b.label}
						</button>
					))}
					<button type="button" onClick={susunDraf} disabled={menyusun || sibuk}
						className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 py-1 text-[11px] font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50">
						{menyusun ? <LoaderCircle size={12} className="animate-spin" /> : <WandSparkles size={12} />}{menyusun ? "Menyusun…" : "Draf AI"}
					</button>
				</div>
				<div className="relative">
					<textarea ref={kotakBalas} className={`${INPUT} min-h-[96px] resize-y pb-6`} value={balas} onChange={(e) => setBalas(e.target.value)}
						onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) kirimBalas(e); }}
						placeholder="Tulis balasan untuk pelapor…" maxLength={4000} />
					<span className={`pointer-events-none absolute bottom-2 right-3 text-[10px] tabular-nums ${balas.length > 3800 ? "text-rose-500" : "text-slate-400"}`}>{balas.length}/4000</span>
				</div>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<p className="m-0 hidden max-w-md text-[11px] leading-snug text-slate-500 sm:block">
						{t.user_id ? "Pelapor menerima notifikasi dan melihat balasan di widget Helpdesk." : "Pelapor tamu melihat balasan saat membuka tiketnya — hubungi juga lewat WhatsApp bila mendesak."}
					</p>
					<div className="flex w-full items-center gap-2 sm:w-auto">
						<select className={`${PILIH} flex-1 sm:flex-none`} value={statusBalas} onChange={(e) => setStatusBalas(e.target.value)} aria-label="Status setelah dibalas">
							<option value="dijawab">Lalu: Dijawab</option>
							<option value="diproses">Lalu: Diproses</option>
							<option value="selesai">Lalu: Selesai</option>
						</select>
						<button type="submit" disabled={sibuk || !balas.trim()} className={`${TOMBOL} bg-emerald-600 text-white hover:bg-emerald-700`} title="Kirim (Ctrl + Enter)">
							{sibuk ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}Kirim
							<kbd className="ml-1 hidden rounded bg-emerald-700/60 px-1 text-[10px] font-semibold lg:inline-flex lg:items-center"><CornerDownLeft size={10} /></kbd>
						</button>
					</div>
				</div>
			</form>
		</div>
	);
}

const PILIHAN_STATUS = [["terbuka", "Belum selesai"], ...Object.entries(STATUS_TIKET).map(([k, v]) => [k, v.label]), ["", "Semua"]];

function TabTiket({ awalId, saring, setSaring }) {
	const [data, setData] = useState(null);
	const [memuat, setMemuat] = useState(false);
	const [pilih, setPilih] = useState(awalId || null);
	const [cariKetik, setCariKetik] = useState(saring.cari);
	const idLama = useRef(null);
	const kolomCari = useRef(null);
	const simpulDaftar = useRef({});
	const kotakDetail = useRef(null);
	const { status, tingkat, bidang, prioritas, cari, menunggu } = saring;
	const ubah = (kunci, nilai) => setSaring((s) => ({ ...s, [kunci]: nilai }));

	useEffect(() => {
		const jeda = setTimeout(() => setSaring((s) => (s.cari === cariKetik ? s : { ...s, cari: cariKetik })), 300);
		return () => clearTimeout(jeda);
	}, [cariKetik, setSaring]);

	const muat = useCallback(async ({ senyap = false } = {}) => {
		if (!senyap) setMemuat(true);
		try {
			const { data: r } = await api.get("/helpdesk/petugas/tiket", { params: { status, tingkat, bidang, prioritas, cari } });
			// Tiket yang belum pernah terlihat pada penyegaran diam-diam = tiket baru masuk.
			if (senyap && idLama.current) {
				const baru = r.data.items.filter((x) => !idLama.current.has(x.id));
				if (baru.length) toast(`${baru.length} tiket baru masuk`, { icon: "📥" });
			}
			idLama.current = new Set(r.data.items.map((x) => x.id));
			setData(r.data);
		} catch (err) {
			if (!senyap) {
				toast.error(pesanGalat(err, "memuat tiket"));
				setData({ items: [] });
			}
		} finally {
			if (!senyap) setMemuat(false);
		}
	}, [status, tingkat, bidang, prioritas, cari]);
	useEffect(() => { idLama.current = null; muat(); }, [muat]);
	useEffect(() => {
		const jeda = setInterval(() => { if (!document.hidden) muat({ senyap: true }); }, SEGAR_DAFTAR_MS);
		return () => clearInterval(jeda);
	}, [muat]);

	// "Lewat 24 jam" dari kartu ringkasan disaring di sini: server tidak punya
	// penyaring umur, dan seluruh tiket cakupan sudah dimuat (maks. 300).
	const items = useMemo(() => {
		const semua = data?.items || [];
		return menunggu ? semua.filter((x) => tungguTiket(x)?.nada === "terlambat") : semua;
	}, [data, menunggu]);

	// Pintasan: ↑/↓ atau J/K pindah tiket, / ke kolom cari.
	useEffect(() => {
		const dengar = (e) => {
			if (e.ctrlKey || e.metaKey || e.altKey || sedangMengetik(e.target)) return;
			if (e.key === "/") {
				e.preventDefault();
				kolomCari.current?.focus();
				return;
			}
			const arah = ["ArrowDown", "j"].includes(e.key) ? 1 : ["ArrowUp", "k"].includes(e.key) ? -1 : 0;
			if (!arah || !items.length) return;
			e.preventDefault();
			const i = items.findIndex((x) => x.id === pilih);
			const tujuan = items[Math.min(Math.max(i + arah, 0), items.length - 1)];
			if (tujuan) {
				setPilih(tujuan.id);
				simpulDaftar.current[tujuan.id]?.scrollIntoView({ block: "nearest" });
			}
		};
		window.addEventListener("keydown", dengar);
		return () => window.removeEventListener("keydown", dengar);
	}, [items, pilih]);

	useEffect(() => {
		if (pilih && window.innerWidth < 1024) kotakDetail.current?.scrollIntoView({ block: "start", behavior: "smooth" });
	}, [pilih]);

	const dpmd = data?.cakupan?.tingkat === "dpmd";
	const adaSaring = Boolean(tingkat || bidang || prioritas || cari || menunggu || status !== "terbuka");

	return (
		<div className="grid items-stretch gap-4 lg:h-[calc(100vh-17rem)] lg:min-h-[560px] lg:grid-cols-[minmax(320px,400px)_1fr]">
			{/* ---------- Daftar ---------- */}
			<div className={`${KARTU} flex min-h-0 flex-col overflow-hidden ${pilih ? "hidden lg:flex" : "flex"}`}>
				<div className="space-y-2.5 border-b border-slate-100 p-3">
					<div className="relative">
						<Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
						<input ref={kolomCari} className={`${INPUT} pl-9 pr-9`} value={cariKetik} onChange={(e) => setCariKetik(e.target.value)} placeholder="Cari kode, judul, nama, desa…  ( / )" />
						{cariKetik && (
							<button type="button" onClick={() => setCariKetik("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700" aria-label="Hapus pencarian"><X size={14} /></button>
						)}
					</div>
					<div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
						{PILIHAN_STATUS.map(([k, l]) => (
							<button key={k || "semua"} type="button" onClick={() => ubah("status", k)} className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-colors ${status === k ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{l}</button>
						))}
					</div>
					<div className="flex flex-wrap items-center gap-1.5">
						<button type="button" onClick={() => ubah("prioritas", prioritas ? "" : "tinggi")} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${prioritas ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"}`}><Siren size={11} />Mendesak</button>
						<button type="button" onClick={() => ubah("menunggu", !menunggu)} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold transition-colors ${menunggu ? "bg-amber-500 text-white" : "bg-amber-50 text-amber-700 hover:bg-amber-100"}`}><Hourglass size={11} />Lewat {JAM_TERLAMBAT} jam</button>
						{dpmd && (
							<>
								<select className={`${PILIH} py-1 text-xs`} value={tingkat} onChange={(e) => ubah("tingkat", e.target.value)} aria-label="Tingkat">
									<option value="">Semua tingkat</option>
									{Object.entries(LABEL_TINGKAT).map(([k, v]) => <option key={k} value={k}>Di {v}</option>)}
								</select>
								<select className={`${PILIH} py-1 text-xs`} value={bidang} onChange={(e) => ubah("bidang", e.target.value)} aria-label="Bidang">
									<option value="">Semua bidang</option>
									{(data?.bidang || []).map((b) => <option key={b.id} value={b.id}>{b.nama}</option>)}
								</select>
							</>
						)}
					</div>
					<div className="flex items-center justify-between text-[11px] text-slate-500">
						<span>
							{data?.cakupan && <>Tiket <b className="text-slate-700">{data.cakupan.nama}</b> · </>}
							{items.length} tiket
						</span>
						<span className="flex items-center gap-2">
							{adaSaring && <button type="button" onClick={() => { setCariKetik(""); setSaring(SARING_TIKET_AWAL); }} className="font-semibold hover:text-slate-800">Reset</button>}
							<button type="button" onClick={() => muat()} title="Muat ulang" className="rounded p-0.5 hover:text-slate-800"><RefreshCw size={12} className={memuat ? "animate-spin" : ""} /></button>
						</span>
					</div>
				</div>

				<div className="min-h-[50vh] flex-1 overflow-y-auto lg:min-h-0">
					{data === null && Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className="flex gap-3 border-b border-slate-100 p-3">
							<div className="h-9 w-9 animate-pulse rounded-xl bg-slate-100" />
							<div className="flex-1 space-y-2"><div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" /><div className="h-2.5 w-1/2 animate-pulse rounded bg-slate-100" /></div>
						</div>
					))}
					{data && items.length === 0 && (
						<div className="flex flex-col items-center px-6 py-14 text-center">
							<Inbox size={30} className="text-slate-300" />
							<p className="m-0 mt-2 text-sm font-semibold text-slate-700">{adaSaring ? "Tidak ada tiket yang cocok" : "Tidak ada tiket"}</p>
							<p className="m-0 mt-0.5 text-xs text-slate-500">{adaSaring ? "Coba longgarkan saringan." : "Semua pertanyaan sudah tertangani."}</p>
						</div>
					)}
					{items.map((t) => {
						const tunggu = tungguTiket(t);
						const IkonKat = ikonKategori(t.category_icon);
						const aktif = pilih === t.id;
						return (
							<button key={t.id} ref={(el) => { simpulDaftar.current[t.id] = el; }} type="button" onClick={() => setPilih(t.id)}
								className={`relative flex w-full gap-3 border-b border-slate-100 p-3 text-left transition-colors ${aktif ? "bg-emerald-50/70" : "hover:bg-slate-50"}`}>
								{aktif && <span className="absolute inset-y-0 left-0 w-1 bg-emerald-500" />}
								<span className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${t.priority === "tinggi" ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"}`}>
									<IkonKat size={16} />
									{tunggu && <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-white ${tunggu.nada === "terlambat" ? "bg-rose-500" : "bg-amber-400"}`} />}
								</span>
								<span className="min-w-0 flex-1">
									<span className="flex items-baseline justify-between gap-2">
										<span className={`truncate text-sm ${t.status === "baru" ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>{t.subject}</span>
										<span className="shrink-0 text-[10px] text-slate-400">{relatif(t.last_message_at)}</span>
									</span>
									<span className="mt-0.5 block truncate text-[11px] text-slate-500">
										{t.reporter_name}{t.desa_nama ? ` · ${t.desa_nama}` : ""}{dpmd ? ` · ${tujuanTiket(t)}` : ""}
									</span>
									<span className="mt-1.5 flex flex-wrap items-center gap-1">
										<Lencana status={t.status} />
										{t.priority === "tinggi" && <Siren size={12} className="text-rose-600" />}
										<ChipTunggu tunggu={tunggu} />
										{tunggu?.balasanPelapor && (
											<span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold text-violet-700 ring-1 ring-violet-200"><MessageCircleReply size={10} />Pelapor membalas</span>
										)}
										<span className="ml-auto inline-flex items-center gap-0.5 text-[10px] text-slate-400"><MessagesSquare size={10} />{t.jumlah_pesan}</span>
									</span>
								</span>
							</button>
						);
					})}
				</div>
				<p className="m-0 hidden border-t border-slate-100 px-3 py-1.5 text-[10px] text-slate-400 lg:block">
					<kbd className="font-sans font-semibold">↑</kbd> <kbd className="font-sans font-semibold">↓</kbd> pindah tiket · <kbd className="font-sans font-semibold">/</kbd> cari · <kbd className="font-sans font-semibold">Ctrl+Enter</kbd> kirim
				</p>
			</div>

			{/* ---------- Percakapan ---------- */}
			<div ref={kotakDetail} className={`min-h-0 scroll-mt-20 ${pilih ? "block" : "hidden lg:block"}`}>
				{pilih ? (
					<DetailTiket key={pilih} id={pilih} onBerubah={() => muat({ senyap: true })} onKembali={() => setPilih(null)} />
				) : (
					<div className={`${KARTU} flex h-full min-h-[420px] flex-col items-center justify-center p-10 text-center`}>
						<div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-500"><MessagesSquare size={26} /></div>
						<p className="m-0 mt-3 text-sm font-semibold text-slate-700">Pilih tiket untuk membuka percakapan</p>
						<p className="m-0 mt-1 text-xs text-slate-500">Tiket yang menunggu paling lama ditandai merah.</p>
					</div>
				)}
			</div>
		</div>
	);
}

/** Kartu angka di kepala halaman — sekaligus jalan pintas ke saringan tiket. */
const KartuRingkas = ({ Ikon, label, nilai, nada = "text-slate-900", aksen = "bg-slate-100 text-slate-500", onClick, aktif }) => (
	<button type="button" onClick={onClick} disabled={!onClick}
		className={`flex w-[11.5rem] min-w-0 shrink-0 items-center gap-3 rounded-2xl bg-white/90 p-3 text-left ring-1 transition-all sm:w-auto ${aktif ? "ring-2 ring-emerald-500" : "ring-slate-200"} ${onClick ? "hover:-translate-y-0.5 hover:shadow-md" : "cursor-default"}`}>
		<span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${aksen}`}><Ikon size={17} /></span>
		<span className="min-w-0">
			<span className={`block text-xl font-extrabold leading-tight tabular-nums ${nada}`}>{nilai}</span>
			<span className="block truncate text-[11px] font-medium text-slate-500">{label}</span>
		</span>
	</button>
);

const SARING_TIKET_AWAL = { status: "terbuka", tingkat: "", bidang: "", prioritas: "", cari: "", menunggu: false };

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ STATISTIK ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function TabStatistik() {
	const [hari, setHari] = useState(30);
	const [d, setD] = useState(null);
	useEffect(() => {
		api.get("/helpdesk/petugas/statistik", { params: { hari } })
			.then((r) => setD(r.data.data))
			.catch((err) => { toast.error(pesanGalat(err, "memuat statistik")); setD({ kategori: [], tren: [] }); });
	}, [hari]);

	if (!d) return <p className="m-0 py-10 text-center text-sm text-slate-400">Memuat…</p>;
	const maksKat = Math.max(1, ...d.kategori.map((k) => k.jumlah));
	const maksTren = Math.max(1, ...d.tren.map((k) => k.jumlah));
	const kartu = [
		[Ticket, "Tiket masuk", d.total ?? 0, "text-slate-900"],
		[Inbox, "Menunggu jawaban", d.baru ?? 0, "text-amber-600"],
		[TriangleAlert, "Lewat 24 jam", d.terlambat ?? 0, d.terlambat ? "text-rose-600" : "text-slate-900"],
		[Siren, "Mendesak terbuka", d.mendesak ?? 0, d.mendesak ? "text-rose-600" : "text-slate-900"],
		[Timer, "Rata-rata tanggapan pertama", durasi(d.menit_tanggap), "text-sky-700"],
		[Smile, `Kepuasan (${d.jumlah_rating || 0} penilaian)`, d.rating ? `${Number(d.rating).toFixed(1)} / 5` : "—", "text-amber-600"],
	];
	return (
		<div className="space-y-4">
			<div className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
				{[7, 30, 90, 365].map((h) => (
					<button key={h} type="button" onClick={() => setHari(h)} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${hari === h ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600"}`}>{h === 365 ? "1 tahun" : `${h} hari`}</button>
				))}
			</div>
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
				{kartu.map(([Ikon, l, v, warna]) => (
					<div key={l} className={`${KARTU} p-4`}>
						<p className="m-0 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500"><Ikon size={13} />{l}</p>
						<p className={`m-0 mt-1 text-2xl font-extrabold ${warna}`}>{v}</p>
					</div>
				))}
			</div>
			<div className="grid gap-4 lg:grid-cols-2">
				<div className={`${KARTU} p-4`}>
					<p className="m-0 mb-3 text-sm font-bold text-slate-900">Kategori teramai</p>
					{d.kategori.length === 0 && <p className="m-0 text-sm text-slate-400">Belum ada tiket.</p>}
					<div className="space-y-2">
						{d.kategori.map((k) => (
							<div key={k.nama}>
								<div className="flex justify-between text-xs text-slate-600"><span>{k.nama}</span><b>{k.jumlah}</b></div>
								<div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${(k.jumlah / maksKat) * 100}%` }} /></div>
							</div>
						))}
					</div>
				</div>
				<div className={`${KARTU} p-4`}>
					<p className="m-0 mb-3 text-sm font-bold text-slate-900">Tiket masuk 14 hari terakhir</p>
					{d.tren.length === 0 ? <p className="m-0 text-sm text-slate-400">Belum ada tiket.</p> : (
						<div className="flex h-36 items-end gap-1.5">
							{d.tren.map((x) => (
								<div key={x.tanggal} className="flex flex-1 flex-col items-center gap-1" title={`${String(x.tanggal).slice(0, 10)}: ${x.jumlah} tiket`}>
									<span className="text-[10px] font-bold text-slate-600">{x.jumlah}</span>
									<div className="w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-teal-400" style={{ height: `${Math.max(6, (x.jumlah / maksTren) * 100)}px` }} />
									<span className="text-[9px] text-slate-400">{String(x.tanggal).slice(8, 10)}</span>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ KELOLA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const FAQ_KOSONG = { id: null, category_id: "", question: "", answer: "", keywords: "", audience: "semua", action_label: "", action_url: "", is_active: true, dari_log: [] };

function TabFaq({ data, muat, draf, setDraf }) {
	const [filter, setFilter] = useState("");
	const [sibuk, setSibuk] = useState(false);
	const kategoriBoleh = data.kategori.filter((k) => k.boleh_ubah);

	const simpan = async (e) => {
		e.preventDefault();
		setSibuk(true);
		try {
			const body = { ...draf, category_id: Number(draf.category_id) };
			if (draf.id) await api.put(`/helpdesk/petugas/faq/${draf.id}`, body);
			else await api.post("/helpdesk/petugas/faq", body);
			toast.success("FAQ disimpan");
			setDraf(null);
			muat();
		} catch (err) {
			toast.error(pesanGalat(err, "menyimpan FAQ"));
		} finally {
			setSibuk(false);
		}
	};

	const hapus = async (f) => {
		if (!window.confirm(`Hapus FAQ "${f.question}"?`)) return;
		try {
			await api.delete(`/helpdesk/petugas/faq/${f.id}`);
			toast.success("FAQ dihapus");
			muat();
		} catch (err) {
			toast.error(pesanGalat(err, "menghapus FAQ"));
		}
	};

	const ubah = (k) => (e) => setDraf((d) => ({ ...d, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
	const daftar = data.faq.filter((f) => !filter || f.category_id === Number(filter));

	return (
		<div className="space-y-4">
			<div className={`${KARTU} p-4 text-xs leading-relaxed text-slate-600`}>
				<Lightbulb size={14} className="mr-1.5 inline text-amber-500" />
				Bot <b>hanya</b> menjawab dari FAQ dan data resmi — semakin lengkap FAQ, semakin tepat jawabannya. Isi <b>kata kunci</b> dengan ungkapan yang biasa diketik orang (pisahkan koma), misalnya <i>proposal ditolak, revisi bankeu, kirim ulang</i>.
				{!data.pimpinan && " Anda dapat mengelola FAQ untuk kategori bidang Anda."}
			</div>

			{draf && (
				<form onSubmit={simpan} className={`${KARTU} space-y-3 p-4`}>
					<p className="m-0 text-sm font-bold text-slate-900">{draf.id ? "Ubah FAQ" : "FAQ Baru"}</p>
					<div className="grid gap-3 sm:grid-cols-2">
						<select className={INPUT} value={draf.category_id} onChange={ubah("category_id")} required>
							<option value="">Pilih kategori</option>
							{kategoriBoleh.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
						</select>
						<select className={INPUT} value={draf.audience} onChange={ubah("audience")}>
							{Object.entries(AUDIENS).map(([k, v]) => <option key={k} value={k}>Tampil ke: {v}</option>)}
						</select>
					</div>
					<input className={INPUT} value={draf.question} onChange={ubah("question")} required maxLength={500} placeholder="Pertanyaan" />
					<textarea className={`${INPUT} min-h-[120px]`} value={draf.answer} onChange={ubah("answer")} required maxLength={5000} placeholder="Jawaban resmi (boleh **tebal**, daftar 1. 2. 3., atau butir -)" />
					<input className={INPUT} value={draf.keywords} onChange={ubah("keywords")} maxLength={500} placeholder="Kata kunci, dipisah koma" />
					<div className="grid gap-3 sm:grid-cols-[1fr_1.4fr]">
						<input className={INPUT} value={draf.action_label || ""} onChange={ubah("action_label")} maxLength={60} placeholder="Teks tombol (opsional), mis. Buka Bankeu Perubahan" />
						<input className={INPUT} value={draf.action_url || ""} onChange={ubah("action_url")} maxLength={255} placeholder="Tautan tombol, mis. /desa/bankeu-perubahan atau https://…" />
					</div>
					<label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={draf.is_active} onChange={ubah("is_active")} />Aktif</label>
					<div className="flex gap-2">
						<button type="submit" disabled={sibuk} className={`${TOMBOL} bg-emerald-600 text-white hover:bg-emerald-700`}>Simpan</button>
						<button type="button" onClick={() => setDraf(null)} className={`${TOMBOL} bg-slate-100 text-slate-700 hover:bg-slate-200`}>Batal</button>
					</div>
				</form>
			)}

			<div className="flex flex-wrap items-center gap-2">
				<select className={PILIH} value={filter} onChange={(e) => setFilter(e.target.value)}>
					<option value="">Semua kategori ({data.faq.length})</option>
					{kategoriBoleh.map((k) => <option key={k.id} value={k.id}>{k.name}</option>)}
				</select>
				{!draf && kategoriBoleh.length > 0 && (
					<button type="button" onClick={() => setDraf({ ...FAQ_KOSONG })} className={`${TOMBOL} bg-emerald-600 text-white hover:bg-emerald-700`}><Plus size={14} />Tambah FAQ</button>
				)}
			</div>

			<div className="space-y-2">
				{daftar.map((f) => (
					<div key={f.id} className={`${KARTU} p-4 ${f.is_active ? "" : "opacity-60"}`}>
						<div className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<p className="m-0 text-[11px] font-semibold text-emerald-700">{f.category_name} · {AUDIENS[f.audience]} · dipakai {f.hits}×{f.is_active ? "" : " · nonaktif"}</p>
								<p className="m-0 mt-0.5 text-sm font-bold text-slate-900">{f.question}</p>
								<p className="m-0 mt-1 whitespace-pre-line text-sm text-slate-600">{f.answer}</p>
								{f.keywords && <p className="m-0 mt-1.5 text-[11px] text-slate-400">Kata kunci: {f.keywords}</p>}
							</div>
							<div className="flex shrink-0 gap-1">
								<button type="button" onClick={() => setDraf({ ...FAQ_KOSONG, ...f, keywords: f.keywords || "", action_label: f.action_label || "", action_url: f.action_url || "" })} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" title="Ubah"><Pencil size={14} /></button>
								<button type="button" onClick={() => hapus(f)} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50" title="Hapus"><Trash2 size={14} /></button>
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

const KATEGORI_KOSONG = { id: null, name: "", description: "", icon: "tanya", target_level: "dpmd", bidang_id: "", keywords: "", sort_order: 0, is_active: true };

function TabKategori({ data, muat }) {
	const [draf, setDraf] = useState(null);
	const namaBidang = (id) => data.bidang.find((b) => Number(b.id) === Number(id))?.nama;

	const simpan = async (e) => {
		e.preventDefault();
		try {
			const body = { ...draf, bidang_id: draf.bidang_id ? Number(draf.bidang_id) : null };
			if (draf.id) await api.put(`/helpdesk/petugas/kategori/${draf.id}`, body);
			else await api.post("/helpdesk/petugas/kategori", body);
			toast.success("Kategori disimpan");
			setDraf(null);
			muat();
		} catch (err) {
			toast.error(pesanGalat(err, "menyimpan kategori"));
		}
	};

	const hapus = async (k) => {
		if (!window.confirm(`Hapus kategori "${k.name}"?`)) return;
		try {
			const { data: r } = await api.delete(`/helpdesk/petugas/kategori/${k.id}`);
			toast.success(r.message);
			muat();
		} catch (err) {
			toast.error(pesanGalat(err, "menghapus kategori"));
		}
	};

	const ubah = (k) => (e) => setDraf((d) => ({ ...d, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

	return (
		<div className="space-y-4">
			<div className={`${KARTU} p-4 text-xs leading-relaxed text-slate-600`}>
				<Route size={14} className="mr-1.5 inline text-emerald-600" />
				<b>Penanggung jawab awal</b> menentukan ke mana pertanyaan diarahkan: <b>Kecamatan</b> penanya, <b>Bidang DPMD</b> yang dipilih, atau <b>DPMD</b> (sekretaris dinas). Bila kecamatan belum punya petugas, tiket otomatis naik ke bidang kategori, lalu ke DPMD. Bidang juga menjadi tujuan saat petugas kecamatan meneruskan tiket.
			</div>
			{draf ? (
				<form onSubmit={simpan} className={`${KARTU} space-y-3 p-4`}>
					<p className="m-0 text-sm font-bold text-slate-900">{draf.id ? "Ubah Kategori" : "Kategori Baru"}</p>
					<div className="grid gap-3 sm:grid-cols-2">
						<input className={INPUT} value={draf.name} onChange={ubah("name")} required maxLength={100} placeholder="Nama kategori" />
						<input className={INPUT} value={draf.description || ""} onChange={ubah("description")} maxLength={255} placeholder="Deskripsi singkat" />
						<select className={INPUT} value={draf.target_level} onChange={ubah("target_level")}>
							{Object.entries(LABEL_TINGKAT).map(([k, v]) => <option key={k} value={k}>Penanggung jawab awal: {v}</option>)}
						</select>
						<select className={INPUT} value={draf.bidang_id || ""} onChange={ubah("bidang_id")}>
							<option value="">Bidang: Sekretariat (bawaan)</option>
							{data.bidang.map((b) => <option key={b.id} value={b.id}>Bidang: {b.nama}</option>)}
						</select>
						<div className="sm:col-span-2">
							<span className="text-xs font-semibold text-slate-600">Ikon</span>
							<div className="mt-1 flex flex-wrap gap-1.5">
								{data.ikon.map((kunci) => {
									const Ikon = IKON_KATEGORI[kunci] || ikonKategori(kunci);
									return (
										<button key={kunci} type="button" title={kunci} aria-label={kunci} aria-pressed={draf.icon === kunci} onClick={() => setDraf((d) => ({ ...d, icon: kunci }))}
											className={`flex h-9 w-9 items-center justify-center rounded-xl ring-1 transition-colors ${draf.icon === kunci ? "bg-emerald-600 text-white ring-emerald-600" : "bg-slate-50 text-slate-600 ring-slate-200 hover:ring-emerald-300"}`}>
											<Ikon size={16} />
										</button>
									);
								})}
							</div>
						</div>
						<input className={INPUT} type="number" value={draf.sort_order} onChange={ubah("sort_order")} placeholder="Urutan" />
						<label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={draf.is_active} onChange={ubah("is_active")} />Aktif</label>
					</div>
					<input className={INPUT} value={draf.keywords || ""} onChange={ubah("keywords")} maxLength={500} placeholder="Kata kunci penebak kategori, dipisah koma" />
					<div className="flex gap-2">
						<button type="submit" className={`${TOMBOL} bg-emerald-600 text-white hover:bg-emerald-700`}>Simpan</button>
						<button type="button" onClick={() => setDraf(null)} className={`${TOMBOL} bg-slate-100 text-slate-700 hover:bg-slate-200`}>Batal</button>
					</div>
				</form>
			) : data.pimpinan && (
				<button type="button" onClick={() => setDraf({ ...KATEGORI_KOSONG })} className={`${TOMBOL} bg-emerald-600 text-white hover:bg-emerald-700`}><Plus size={14} />Tambah Kategori</button>
			)}
			<div className={`${KARTU} divide-y divide-slate-100`}>
				{data.kategori.map((k) => {
					const Ikon = ikonKategori(k.icon);
					return (
						<div key={k.id} className={`flex items-center gap-3 p-4 ${k.is_active ? "" : "opacity-50"}`}>
							<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Ikon size={16} /></div>
							<div className="min-w-0 flex-1">
								<p className="m-0 text-sm font-bold text-slate-900">{k.name}{k.is_active ? "" : " (nonaktif)"}</p>
								<p className="m-0 truncate text-xs text-slate-500">{k.description}</p>
							</div>
							<span className="hidden rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 sm:inline">
								{LABEL_TINGKAT[k.target_level]}{k.target_level !== "dpmd" ? ` → ${namaBidang(k.bidang_id) || "Sekretariat"}` : ""}
							</span>
							{data.pimpinan && (
								<>
									<button type="button" onClick={() => setDraf({ ...KATEGORI_KOSONG, ...k, bidang_id: k.bidang_id || "" })} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" title="Ubah"><Pencil size={14} /></button>
									<button type="button" onClick={() => hapus(k)} className="flex h-8 w-8 items-center justify-center rounded-lg text-rose-500 hover:bg-rose-50" title="Hapus"><Trash2 size={14} /></button>
								</>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
}

function TabTakTerjawab({ onJadikanFaq }) {
	const [items, setItems] = useState(null);
	const muat = useCallback(() => {
		api.get("/helpdesk/petugas/tak-terjawab").then((r) => setItems(r.data.data || [])).catch(() => setItems([]));
	}, []);
	useEffect(() => { muat(); }, [muat]);

	const abaikan = async (ids) => {
		try {
			await api.post("/helpdesk/petugas/tak-terjawab/tinjau", { ids });
			muat();
		} catch (err) {
			toast.error(pesanGalat(err, "menyimpan"));
		}
	};

	return (
		<div className="space-y-3">
			<div className={`${KARTU} p-4 text-xs leading-relaxed text-slate-600`}>
				<MessageSquareText size={14} className="mr-1.5 inline text-sky-600" />
				Pertanyaan yang belum bisa dijawab bot, atau dijawab tetapi dinilai tidak membantu. Jadikan FAQ agar pertanyaan serupa terjawab berikutnya, atau abaikan bila tidak relevan.
			</div>
			{items?.length > 0 && <button type="button" onClick={() => abaikan(items.map((i) => i.id))} className="text-xs font-semibold text-slate-500 hover:text-slate-800">Abaikan semua ({items.length})</button>}
			{items === null && <p className="m-0 py-6 text-center text-sm text-slate-400">Memuat…</p>}
			{items?.length === 0 && <p className="m-0 py-6 text-center text-sm text-slate-400">Tidak ada pertanyaan yang menunggu. 🎉</p>}
			<div className={`${KARTU} divide-y divide-slate-100 ${items?.length ? "" : "hidden"}`}>
				{items?.map((l) => (
					<div key={l.id} className="flex items-start gap-3 p-4">
						<div className="min-w-0 flex-1">
							<p className="m-0 text-sm text-slate-900">{l.question}</p>
							<p className="m-0 mt-0.5 text-[11px] text-slate-400">
								{Number(l.helpful) === 0 && Number(l.answered) === 1
									? <span className="mr-1 rounded-full bg-rose-50 px-1.5 py-0.5 font-bold text-rose-600">👎 Tidak membantu{l.faq_question ? ` · FAQ: ${l.faq_question}` : ""}</span>
									: <span className="mr-1 rounded-full bg-amber-50 px-1.5 py-0.5 font-bold text-amber-700">Belum terjawab</span>}
								{l.category_name || "Kategori tidak diketahui"} · {waktu(l.created_at)}
							</p>
						</div>
						<button type="button" onClick={() => onJadikanFaq(l)} className={`${TOMBOL} bg-emerald-50 text-xs text-emerald-700 hover:bg-emerald-100`}>Jadikan FAQ</button>
						<button type="button" onClick={() => abaikan([l.id])} className={`${TOMBOL} bg-slate-100 text-xs text-slate-600 hover:bg-slate-200`}>Abaikan</button>
					</div>
				))}
			</div>
		</div>
	);
}

function TabPengaturan({ data, muat }) {
	const [form, setForm] = useState({ salam: "", dpmd_nama: "", dpmd_whatsapp: "", dpmd_profil: "", ...data.pengaturan });
	const [sibuk, setSibuk] = useState(false);
	const r = data.ringkasan;
	const isi = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

	const simpan = async (e) => {
		e.preventDefault();
		setSibuk(true);
		try {
			await api.put("/helpdesk/petugas/pengaturan", form);
			toast.success("Pengaturan disimpan");
			muat();
		} catch (err) {
			toast.error(pesanGalat(err, "menyimpan pengaturan"));
		} finally {
			setSibuk(false);
		}
	};

	return (
		<div className="grid items-start gap-4 lg:grid-cols-2">
			<form onSubmit={simpan} className={`${KARTU} space-y-3 p-4`}>
				<p className="m-0 text-sm font-bold text-slate-900">Pengaturan Helpdesk</p>
				<label className="block"><span className="text-xs font-semibold text-slate-600">Salam pembuka bot</span>
					<textarea className={`${INPUT} mt-1 min-h-[72px]`} value={form.salam} onChange={isi("salam")} maxLength={500} /></label>
				<label className="block"><span className="text-xs font-semibold text-slate-600">Nama kontak DPMD</span>
					<input className={`${INPUT} mt-1`} value={form.dpmd_nama} onChange={isi("dpmd_nama")} maxLength={100} /></label>
				<label className="block"><span className="text-xs font-semibold text-slate-600">Nomor WhatsApp layanan DPMD</span>
					<input className={`${INPUT} mt-1`} value={form.dpmd_whatsapp} onChange={isi("dpmd_whatsapp")} placeholder="081234567890" inputMode="tel" /></label>
				<div className="space-y-2 rounded-xl bg-slate-50 p-3">
					<p className="m-0 text-xs font-semibold text-slate-600">Nomor WhatsApp per bidang (opsional)</p>
					<p className="m-0 text-[11px] text-slate-500">Bila kosong, tombol WhatsApp memakai nomor HP akun Kepala Bidang / staf bidang.</p>
					{data.bidang.map((b) => (
						<label key={b.id} className="block"><span className="text-[11px] text-slate-500">{b.nama}</span>
							<input className={`${INPUT} mt-0.5`} value={form[`wa_bidang_${b.id}`] || ""} onChange={isi(`wa_bidang_${b.id}`)} placeholder="081234567890" inputMode="tel" /></label>
					))}
				</div>
				<label className="block"><span className="text-xs font-semibold text-slate-600">Profil DPMD untuk bot</span>
					<textarea className={`${INPUT} mt-1 min-h-[120px]`} value={form.dpmd_profil} onChange={isi("dpmd_profil")} maxLength={3000}
						placeholder={"Alamat kantor: ...\nJam layanan: Senin–Jumat 08.00–16.00\nEmail: ...\nInstagram: ..."} />
					<span className="text-[11px] text-slate-400">Fakta resmi yang boleh disampaikan bot. Yang tidak ditulis di sini tidak akan dikarang.</span></label>
				<button type="submit" disabled={sibuk} className={`${TOMBOL} bg-emerald-600 text-white hover:bg-emerald-700`}>Simpan</button>
			</form>

			<div className="space-y-4">
				<div className={`${KARTU} p-4`}>
					<p className="m-0 flex items-center gap-1.5 text-sm font-bold text-slate-900"><Sparkles size={15} className="text-violet-600" />Mesin AI</p>
					{data.ai.aktif
						? <p className="m-0 mt-1 text-sm text-emerald-700">Aktif · model <code>{data.ai.model}</code></p>
						: <p className="m-0 mt-1 text-sm text-amber-700">Belum aktif — bot menjawab dari pencocokan FAQ dan data resmi saja. Isi <code>ANTHROPIC_API_KEY</code> di .env server.</p>}
				</div>
				<div className={`${KARTU} p-4`}>
					<p className="m-0 mb-3 text-sm font-bold text-slate-900">Chatbot 30 hari terakhir</p>
					<div className="grid grid-cols-2 gap-3">
						{[
							["Pertanyaan", r.total],
							["Terjawab", r.total ? `${Math.round((r.terjawab / r.total) * 100)}%` : "—"],
							["Disusun AI", r.lewat_ai],
							["Dari data akun", r.lewat_akun],
							["Dari data resmi", r.lewat_data],
							["Dinilai membantu", r.membantu + r.tidak_membantu ? `${Math.round((r.membantu / (r.membantu + r.tidak_membantu)) * 100)}%` : "—"],
						].map(([l, v]) => (
							<div key={l} className="rounded-xl bg-slate-50 p-3">
								<p className="m-0 text-[11px] text-slate-500">{l}</p>
								<p className="m-0 text-xl font-extrabold text-slate-900">{v}</p>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ HALAMAN ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

export default function HelpdeskPanelPage() {
	const [params] = useSearchParams();
	const tiketAwal = Number(params.get("tiket")) || null;
	const [tab, setTab] = useState("tiket");
	const [bolehKelola, setBolehKelola] = useState(false);
	const [kelola, setKelola] = useState(null);
	const [drafFaq, setDrafFaq] = useState(null);
	const [saringTiket, setSaringTiket] = useState(SARING_TIKET_AWAL);
	const [ringkas, setRingkas] = useState(null);

	/* Hak kelola dibaca dari server (pimpinan DPMD atau Kepala Bidang). */
	useEffect(() => {
		api.get("/helpdesk/petugas/tiket", { params: { status: "baru" } })
			.then((r) => setBolehKelola(Boolean(r.data.data?.cakupan?.kelola)))
			.catch(() => {});
	}, []);

	// Angka kepala halaman: jumlah menunggu (sepanjang waktu) + statistik 30 hari.
	const muatRingkas = useCallback(async () => {
		try {
			const [baru, stat] = await Promise.all([
				api.get("/helpdesk/petugas/tiket-baru"),
				api.get("/helpdesk/petugas/statistik", { params: { hari: 30 } }),
			]);
			setRingkas({ menunggu: baru.data.data?.jumlah ?? 0, ...stat.data.data });
		} catch {
			/* kepala halaman tetap tampil tanpa angka */
		}
	}, []);
	useEffect(() => {
		muatRingkas();
		const jeda = setInterval(() => { if (!document.hidden) muatRingkas(); }, SEGAR_DAFTAR_MS);
		return () => clearInterval(jeda);
	}, [muatRingkas]);

	const muatKelola = useCallback(async () => {
		try {
			const { data } = await api.get("/helpdesk/petugas/kelola");
			setKelola(data.data);
		} catch (err) {
			toast.error(pesanGalat(err, "memuat data Helpdesk"));
		}
	}, []);
	const pilihTab = (key) => {
		setTab(key);
		if (["faq", "kategori", "tak_terjawab", "pengaturan"].includes(key) && !kelola) muatKelola();
	};

	// Kartu ringkasan = jalan pintas: buka tab tiket dengan saringan yang sesuai.
	const saringCepat = (perubahan) => {
		setSaringTiket({ ...SARING_TIKET_AWAL, ...perubahan });
		setTab("tiket");
	};

	const tabs = [
		{ key: "tiket", label: "Tiket", Ikon: Ticket, angka: ringkas?.menunggu },
		{ key: "statistik", label: "Statistik", Ikon: ChartColumn },
		...(bolehKelola ? [
			{ key: "faq", label: "FAQ", Ikon: Lightbulb },
			{ key: "tak_terjawab", label: "Belum Terjawab", Ikon: MessageSquareText },
			{ key: "kategori", label: "Kategori & Rute", Ikon: Route },
		] : []),
		...(kelola?.pimpinan ? [{ key: "pengaturan", label: "Pengaturan", Ikon: Settings }] : []),
	];

	const s = saringTiket;
	return (
		<div className="space-y-4">
			<section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-4 ring-1 ring-emerald-100 sm:p-5">
				<div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-200/40 blur-3xl" />
				<div className="relative flex flex-wrap items-start justify-between gap-3">
					<div className="flex items-start gap-3">
						<span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/25"><Flame size={22} /></span>
						<div>
							<h2 className="m-0 text-xl font-extrabold tracking-tight text-slate-900">Helpdesk</h2>
							<p className="m-0 mt-0.5 hidden max-w-xl text-sm text-slate-600 sm:block">Pertanyaan masyarakat, desa, dan kecamatan yang diteruskan chatbot ke petugas sesuai kategori dan wilayah.</p>
						</div>
					</div>
					<span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
						<span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" /></span>
						Diperbarui otomatis
					</span>
				</div>

				<div className="relative -mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-5">
					<KartuRingkas Ikon={Inbox} label="Menunggu jawaban" nilai={ringkas ? ringkas.menunggu : "…"} nada={ringkas?.menunggu ? "text-amber-600" : "text-slate-900"} aksen="bg-amber-50 text-amber-600"
						onClick={() => saringCepat({ status: "baru" })} aktif={tab === "tiket" && s.status === "baru" && !s.menunggu && !s.prioritas} />
					<KartuRingkas Ikon={TriangleAlert} label={`Lewat ${JAM_TERLAMBAT} jam`} nilai={ringkas ? ringkas.terlambat ?? 0 : "…"} nada={ringkas?.terlambat ? "text-rose-600" : "text-slate-900"} aksen="bg-rose-50 text-rose-600"
						onClick={() => saringCepat({ status: "baru", menunggu: true })} aktif={tab === "tiket" && s.menunggu} />
					<KartuRingkas Ikon={Siren} label="Mendesak terbuka" nilai={ringkas ? ringkas.mendesak ?? 0 : "…"} nada={ringkas?.mendesak ? "text-rose-600" : "text-slate-900"} aksen="bg-rose-50 text-rose-600"
						onClick={() => saringCepat({ prioritas: "tinggi" })} aktif={tab === "tiket" && s.prioritas === "tinggi" && !s.menunggu} />
					<KartuRingkas Ikon={Timer} label="Tanggapan pertama (30 hr)" nilai={ringkas ? durasi(ringkas.menit_tanggap) : "…"} nada="text-sky-700" aksen="bg-sky-50 text-sky-600" />
					<KartuRingkas Ikon={Smile} label={`Kepuasan (${ringkas?.jumlah_rating || 0} nilai)`} nilai={ringkas?.rating ? `${Number(ringkas.rating).toFixed(1)}/5` : "—"} nada="text-amber-600" aksen="bg-amber-50 text-amber-500" />
				</div>
			</section>

			<div className="-mx-1 overflow-x-auto px-1">
				<div className="inline-flex items-center gap-1 rounded-2xl bg-white p-1 ring-1 ring-slate-200">
					{tabs.map(({ key, label, Ikon, angka }) => (
						<button key={key} type="button" onClick={() => pilihTab(key)}
							className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-bold transition-colors ${tab === key ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
							<Ikon size={15} />{label}
							{angka > 0 && <span className={`rounded-full px-1.5 text-[10px] tabular-nums ${tab === key ? "bg-white/25 text-white" : "bg-amber-100 text-amber-700"}`}>{angka}</span>}
						</button>
					))}
				</div>
			</div>

			{tab === "tiket" && <TabTiket awalId={tiketAwal} saring={saringTiket} setSaring={setSaringTiket} />}
			{tab === "statistik" && <TabStatistik />}
			{tab !== "tiket" && tab !== "statistik" && !kelola && <p className="m-0 py-10 text-center text-sm text-slate-400">Memuat…</p>}
			{kelola && tab === "faq" && <TabFaq data={kelola} muat={muatKelola} draf={drafFaq} setDraf={setDrafFaq} />}
			{kelola && tab === "kategori" && <TabKategori data={kelola} muat={muatKelola} />}
			{kelola && tab === "tak_terjawab" && (
				<TabTakTerjawab onJadikanFaq={(l) => { setDrafFaq({ ...FAQ_KOSONG, question: l.question, category_id: l.category_id || "", dari_log: [l.id] }); setTab("faq"); }} />
			)}
			{kelola?.pimpinan && tab === "pengaturan" && <TabPengaturan data={kelola} muat={muatKelola} />}
		</div>
	);
}
