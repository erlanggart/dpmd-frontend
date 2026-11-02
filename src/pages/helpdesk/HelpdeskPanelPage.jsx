import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
	ArrowUpRight, ChartColumn, Clock, Flame, Inbox, Lightbulb, LoaderCircle, MapPin, MessageSquareText, Pencil,
	Plus, Route, Send, Settings, Siren, Smile, Sparkles, Star, Ticket, Timer, Trash2, TriangleAlert, User, WandSparkles,
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

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ TIKET ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function DetailTiket({ id, onBerubah }) {
	const [t, setT] = useState(null);
	const [balas, setBalas] = useState("");
	const [statusBalas, setStatusBalas] = useState("dijawab");
	const [alasan, setAlasan] = useState("");
	const [bidangTujuan, setBidangTujuan] = useState("");
	const [teruskanBuka, setTeruskanBuka] = useState(false);
	const [sibuk, setSibuk] = useState(false);
	const [menyusun, setMenyusun] = useState(false);

	const muat = useCallback(async () => {
		try {
			const { data } = await api.get(`/helpdesk/petugas/tiket/${id}`);
			setT(data.data);
		} catch (err) {
			toast.error(pesanGalat(err, "memuat tiket"));
		}
	}, [id]);
	useEffect(() => { muat(); }, [muat]);

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
		e.preventDefault();
		if (!balas.trim()) return;
		if (await jalankan(() => api.post(`/helpdesk/petugas/tiket/${id}/balas`, { pesan: balas, status: statusBalas }))) setBalas("");
	};

	/* Draf AI hanya mengisi kotak balasan — petugas tetap membaca dan menyunting. */
	const susunDraf = async () => {
		setMenyusun(true);
		try {
			const { data } = await api.post(`/helpdesk/petugas/tiket/${id}/draf`);
			setBalas(data.data.draf);
			toast.success("Draf siap — periksa dan lengkapi bagian [lengkapi: …] sebelum dikirim");
		} catch (err) {
			toast.error(pesanGalat(err, "menyusun draf"));
		} finally {
			setMenyusun(false);
		}
	};

	if (!t) return <div className={`${KARTU} p-10 text-center text-sm text-slate-400`}>Memuat tiket…</div>;

	return (
		<div className={`${KARTU} flex min-h-[520px] flex-col`}>
			<div className="space-y-2 border-b border-slate-100 p-4">
				<div className="flex flex-wrap items-center gap-2">
					<span className="font-mono text-xs font-bold text-slate-500">{t.code}</span>
					<Lencana status={t.status} />
					{t.priority === "tinggi" && <LencanaMendesak />}
					<span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{t.category_name || "Tanpa kategori"} · di {tujuanTiket(t)}</span>
					{t.rating && <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200"><Star size={11} className="fill-amber-400 text-amber-400" />{t.rating}/5</span>}
				</div>
				<h3 className="m-0 text-base font-bold text-slate-900">{t.subject}</h3>
				<div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
					<span className="inline-flex items-center gap-1"><User size={12} />{t.reporter_name}{t.user_id ? " (akun)" : " (tamu)"}</span>
					{(t.desa_nama || t.kecamatan_nama) && <span className="inline-flex items-center gap-1"><MapPin size={12} />{[t.desa_nama, t.kecamatan_nama && `Kec. ${t.kecamatan_nama}`].filter(Boolean).join(", ")}</span>}
					<span className="inline-flex items-center gap-1"><Clock size={12} />{waktu(t.created_at)}</span>
					{t.handled_by_name && <span>Ditangani: {t.handled_by_name}</span>}
				</div>
				{t.rating_note && <p className="m-0 rounded-xl bg-amber-50/60 px-3 py-2 text-xs text-amber-800">Catatan penilaian: “{t.rating_note}”</p>}
				<div className="flex flex-wrap gap-2 pt-1">
					{t.reporter_whatsapp_url && (
						<a href={t.reporter_whatsapp_url} target="_blank" rel="noopener noreferrer" className={`${TOMBOL} bg-[#25D366] text-white no-underline hover:brightness-95`}>
							<ArrowUpRight size={14} />WhatsApp pelapor
						</a>
					)}
					<select className={PILIH} value={t.status} disabled={sibuk} onChange={(e) => jalankan(() => api.patch(`/helpdesk/petugas/tiket/${id}/status`, { status: e.target.value }))}>
						{Object.entries(STATUS_TIKET).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
					</select>
					<button type="button" disabled={sibuk} onClick={() => jalankan(() => api.patch(`/helpdesk/petugas/tiket/${id}/prioritas`, { prioritas: t.priority === "tinggi" ? "normal" : "tinggi" }))}
						className={`${TOMBOL} ${t.priority === "tinggi" ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-rose-50 text-rose-700 hover:bg-rose-100"}`}>
						<Siren size={14} />{t.priority === "tinggi" ? "Mendesak" : "Tandai mendesak"}
					</button>
					{(t.teruskan_ke || t.bisa_alihkan_bidang) && (
						<button type="button" onClick={() => setTeruskanBuka((b) => !b)} className={`${TOMBOL} bg-slate-100 text-slate-700 hover:bg-slate-200`}>
							<Route size={14} />Teruskan / alihkan
						</button>
					)}
				</div>
				{teruskanBuka && (
					<div className="space-y-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
						{t.bisa_alihkan_bidang && (
							<select className={PILIH} value={bidangTujuan} onChange={(e) => setBidangTujuan(e.target.value)}>
								<option value="">{t.teruskan_ke ? `Tingkat berikutnya: ${t.teruskan_ke.nama}` : "Pilih bidang tujuan"}</option>
								{t.bidang.map((b) => <option key={b.id} value={b.id}>Alihkan ke {b.nama}</option>)}
							</select>
						)}
						{!t.bisa_alihkan_bidang && t.teruskan_ke && <p className="m-0 text-xs text-slate-600">Diteruskan ke <b>{t.teruskan_ke.nama}</b>.</p>}
						<div className="flex gap-2">
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

			<div className="max-h-[460px] flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
				{t.pesan.map((m) => (
					m.sender_type === "sistem" ? (
						<p key={m.id} className="m-0 whitespace-pre-line rounded-xl bg-white px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-200">{m.body}</p>
					) : (
						<div key={m.id} className={m.sender_type === "petugas" ? "flex justify-end" : "flex"}>
							<div className={`max-w-[80%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm ${m.sender_type === "petugas" ? "rounded-br-md bg-emerald-600 text-white" : "rounded-bl-md bg-white text-slate-800 ring-1 ring-slate-200"}`}>
								<p className={`m-0 mb-0.5 text-[11px] font-bold ${m.sender_type === "petugas" ? "text-emerald-100" : "text-slate-500"}`}>{m.sender_name}</p>
								{m.body}
								<p className={`m-0 mt-1 text-[10px] ${m.sender_type === "petugas" ? "text-emerald-100" : "text-slate-400"}`}>{waktu(m.created_at)}</p>
							</div>
						</div>
					)
				))}
			</div>

			<form onSubmit={kirimBalas} className="space-y-2 border-t border-slate-100 p-4">
				<div className="flex items-center justify-between gap-2">
					<span className="text-xs font-semibold text-slate-600">Balasan</span>
					<button type="button" onClick={susunDraf} disabled={menyusun || sibuk}
						className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:brightness-110 disabled:opacity-50">
						{menyusun ? <LoaderCircle size={13} className="animate-spin" /> : <WandSparkles size={13} />}{menyusun ? "Menyusun…" : "Draf dengan AI"}
					</button>
				</div>
				<textarea className={`${INPUT} min-h-[120px]`} value={balas} onChange={(e) => setBalas(e.target.value)} placeholder="Tulis balasan untuk pelapor, atau klik Draf dengan AI…" maxLength={4000} />
				<div className="flex flex-wrap items-center justify-between gap-2">
					<p className="m-0 text-[11px] text-slate-500">
						{t.user_id ? "Pelapor menerima notifikasi dan melihat balasan di widget Helpdesk." : "Pelapor adalah tamu — ia melihat balasan saat membuka tiketnya; hubungi juga lewat WhatsApp bila mendesak."}
					</p>
					<div className="flex gap-2">
						<select className={PILIH} value={statusBalas} onChange={(e) => setStatusBalas(e.target.value)}>
							<option value="dijawab">Tandai dijawab</option>
							<option value="diproses">Tandai diproses</option>
							<option value="selesai">Tandai selesai</option>
						</select>
						<button type="submit" disabled={sibuk || !balas.trim()} className={`${TOMBOL} bg-emerald-600 text-white hover:bg-emerald-700`}><Send size={14} />Kirim</button>
					</div>
				</div>
			</form>
		</div>
	);
}

function TabTiket({ awalId }) {
	const [data, setData] = useState(null);
	const [status, setStatus] = useState("terbuka");
	const [tingkat, setTingkat] = useState("");
	const [bidang, setBidang] = useState("");
	const [prioritas, setPrioritas] = useState("");
	const [cari, setCari] = useState("");
	const [pilih, setPilih] = useState(awalId || null);

	const muat = useCallback(async () => {
		try {
			const { data: r } = await api.get("/helpdesk/petugas/tiket", { params: { status, tingkat, bidang, prioritas, cari } });
			setData(r.data);
		} catch (err) {
			toast.error(pesanGalat(err, "memuat tiket"));
			setData({ items: [] });
		}
	}, [status, tingkat, bidang, prioritas, cari]);
	useEffect(() => {
		const t = setTimeout(muat, 250);
		return () => clearTimeout(t);
	}, [muat]);

	const dpmd = data?.cakupan?.tingkat === "dpmd";
	return (
		<div className="grid items-start gap-4 lg:grid-cols-[400px_1fr]">
			<div className={`${KARTU} space-y-3 p-3`}>
				{data?.cakupan && <p className="m-0 px-1 text-xs text-slate-500">Tiket untuk <b className="text-slate-800">{data.cakupan.nama}</b></p>}
				<input className={INPUT} value={cari} onChange={(e) => setCari(e.target.value)} placeholder="Cari kode, judul, nama, atau desa…" />
				<div className="flex flex-wrap gap-1.5">
					{[["terbuka", "Belum selesai"], ["", "Semua"], ...Object.entries(STATUS_TIKET).map(([k, v]) => [k, v.label])].map(([k, l]) => (
						<button key={k || "semua"} type="button" onClick={() => setStatus(k)} className={`rounded-full px-3 py-1 text-xs font-bold ${status === k ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}>{l}</button>
					))}
					<button type="button" onClick={() => setPrioritas((p) => (p ? "" : "tinggi"))} className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${prioritas ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700 hover:bg-rose-100"}`}><Siren size={11} />Mendesak</button>
				</div>
				{dpmd && (
					<div className="grid grid-cols-2 gap-2">
						<select className={PILIH} value={tingkat} onChange={(e) => setTingkat(e.target.value)}>
							<option value="">Semua tingkat</option>
							{Object.entries(LABEL_TINGKAT).map(([k, v]) => <option key={k} value={k}>Di {v}</option>)}
						</select>
						<select className={PILIH} value={bidang} onChange={(e) => setBidang(e.target.value)}>
							<option value="">Semua bidang</option>
							{(data?.bidang || []).map((b) => <option key={b.id} value={b.id}>{b.nama}</option>)}
						</select>
					</div>
				)}
				<div className="max-h-[620px] space-y-1.5 overflow-y-auto">
					{data === null && <p className="m-0 py-6 text-center text-sm text-slate-400">Memuat…</p>}
					{data?.items?.length === 0 && <p className="m-0 py-6 text-center text-sm text-slate-400">Tidak ada tiket.</p>}
					{data?.items?.map((t) => (
						<button key={t.id} type="button" onClick={() => setPilih(t.id)}
							className={`w-full rounded-xl p-3 text-left ring-1 transition-colors ${pilih === t.id ? "bg-emerald-50/50 ring-emerald-400" : "ring-slate-200 hover:ring-emerald-200"}`}>
							<div className="flex items-center justify-between gap-2">
								<span className="font-mono text-[11px] text-slate-500">{t.code}</span>
								<span className="flex items-center gap-1">{t.priority === "tinggi" && <Siren size={13} className="text-rose-600" />}<Lencana status={t.status} /></span>
							</div>
							<p className="m-0 mt-1 line-clamp-2 text-sm font-semibold text-slate-900">{t.subject}</p>
							<p className="m-0 mt-0.5 text-[11px] text-slate-500">
								{t.reporter_name}{t.desa_nama ? ` · ${t.desa_nama}` : ""} · {t.category_name || "Umum"}{dpmd ? ` · ${tujuanTiket(t)}` : ""} · {waktu(t.last_message_at)}
							</p>
						</button>
					))}
				</div>
			</div>
			{pilih
				? <DetailTiket key={pilih} id={pilih} onBerubah={muat} />
				: <div className={`${KARTU} p-10 text-center text-sm text-slate-400`}><Inbox size={32} className="mx-auto mb-2" />Pilih tiket untuk melihat percakapan.</div>}
		</div>
	);
}

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

	/* Hak kelola dibaca dari server (pimpinan DPMD atau Kepala Bidang). */
	useEffect(() => {
		api.get("/helpdesk/petugas/tiket", { params: { status: "baru" } })
			.then((r) => setBolehKelola(Boolean(r.data.data?.cakupan?.kelola)))
			.catch(() => {});
	}, []);

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

	const tabs = [
		{ key: "tiket", label: "Tiket", Ikon: Ticket },
		{ key: "statistik", label: "Statistik", Ikon: ChartColumn },
		...(bolehKelola ? [
			{ key: "faq", label: "FAQ", Ikon: Lightbulb },
			{ key: "tak_terjawab", label: "Belum Terjawab", Ikon: MessageSquareText },
			{ key: "kategori", label: "Kategori & Rute", Ikon: Route },
		] : []),
		...(kelola?.pimpinan ? [{ key: "pengaturan", label: "Pengaturan", Ikon: Settings }] : []),
	];

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h2 className="m-0 flex items-center gap-2 text-xl font-extrabold text-slate-900"><Flame size={20} className="text-emerald-600" />Helpdesk</h2>
					<p className="m-0 mt-0.5 text-sm text-slate-500">Pertanyaan masyarakat, desa, dan kecamatan yang diteruskan chatbot ke petugas sesuai kategori dan wilayah.</p>
				</div>
			</div>
			<div className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-slate-200/80 bg-slate-100 p-1">
				{tabs.map(({ key, label, Ikon }) => (
					<button key={key} type="button" onClick={() => pilihTab(key)}
						className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-bold ${tab === key ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>
						<Ikon size={14} />{label}
					</button>
				))}
			</div>

			{tab === "tiket" && <TabTiket awalId={tiketAwal} />}
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
