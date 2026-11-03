import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, History, Loader2, Search, X } from "lucide-react";
import toast from "react-hot-toast";
import { aturAkses, aturAksesMassal, getDaftarAkses, getRiwayatAkses } from "../../../api/smartCctvApi";

/**
 * Akses Pengguna Smart CCTV (khusus superadmin).
 *
 * Superadmin menentukan siapa memakai bagian mana:
 *   Lihat       — live monitoring & playback rekaman
 *   Peringatan  — peringatan, riwayat, analitik, tindak lanjut, notifikasi di aplikasi
 *   Kamera      — tambah/ubah/hapus perangkat
 *   Wajah       — data wajah terdaftar (biometrik)
 * Perubahan per baris langsung tersimpan; beberapa pegawai bisa diatur sekaligus
 * dengan preset. Setiap perubahan tercatat di riwayat.
 */

const IZIN = [
	{ id: "lihat", label: "Lihat", ket: "Live & playback" },
	{ id: "peringatan", label: "Peringatan", ket: "Peringatan, riwayat, analitik" },
	{ id: "kamera", label: "Kamera", ket: "Kelola perangkat" },
	{ id: "wajah", label: "Wajah", ket: "Data biometrik" },
];
const PRESET = [
	{ label: "Lihat saja", izin: ["lihat"] },
	{ label: "Petugas jaga", izin: ["lihat", "peringatan"] },
	{ label: "Operator", izin: ["lihat", "peringatan", "kamera"] },
	{ label: "Penuh", izin: ["lihat", "peringatan", "kamera", "wajah"] },
	{ label: "Cabut akses", izin: [] },
];
const PERAN = {
	kepala_dinas: "Kepala Dinas",
	sekretaris_dinas: "Sekretaris",
	kepala_bidang: "Kepala Bidang",
	ketua_tim: "Ketua Tim",
	bendahara: "Bendahara",
	pegawai: "Pegawai",
	superadmin: "Superadmin",
};

const tglPendek = (v) => (v ? new Date(v).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "");
const keInputTanggal = (v) => (v ? new Date(v).toISOString().slice(0, 10) : "");
const akhirHari = (s) => (s ? new Date(`${s}T23:59:59+07:00`).toISOString() : null);
const pesanGalat = (e, cadangan) => e?.response?.data?.message || cadangan;

function Sakelar({ aktif, onClick, disabled, label }) {
	return (
		<button
			type="button"
			role="switch"
			aria-checked={aktif}
			aria-label={label}
			disabled={disabled}
			onClick={onClick}
			className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${aktif ? "bg-slate-900" : "bg-slate-200"}`}
		>
			<span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${aktif ? "translate-x-[18px]" : "translate-x-0.5"}`} />
		</button>
	);
}

const CctvAksesPage = () => {
	const [data, setData] = useState(null);
	const [cari, setCari] = useState("");
	const [saring, setSaring] = useState("semua"); // semua | berakses | belum
	const [pilih, setPilih] = useState(new Set());
	const [sampaiMassal, setSampaiMassal] = useState("");
	const [simpan, setSimpan] = useState(new Set()); // id yang sedang disimpan
	const [riwayat, setRiwayat] = useState(null);

	const muat = useCallback(async () => {
		try {
			const r = await getDaftarAkses();
			setData(r.data);
		} catch (e) {
			toast.error(pesanGalat(e, "Gagal memuat daftar akses"));
		}
	}, []);
	useEffect(() => {
		muat();
	}, [muat]);

	const staf = useMemo(() => {
		if (!data) return [];
		const q = cari.trim().toLowerCase();
		return data.data.filter((u) => {
			if (q && !`${u.nama} ${u.email} ${u.bidang || ""} ${PERAN[u.role] || u.role}`.toLowerCase().includes(q)) return false;
			if (saring === "berakses") return u.superadmin || u.izin.length > 0;
			if (saring === "belum") return !u.superadmin && u.izin.length === 0;
			return true;
		});
	}, [data, cari, saring]);
	const bisaDipilih = staf.filter((u) => !u.superadmin);

	const terapkanLokal = (id, izin, berlaku_sampai) =>
		setData((d) => ({ ...d, data: d.data.map((u) => (u.id === id ? { ...u, izin, berlaku_sampai, diberi_pada: new Date().toISOString(), diberi_oleh: "Anda" } : u)) }));

	const simpanBaris = async (u, izin, berlakuSampai) => {
		const lama = { izin: u.izin, berlaku_sampai: u.berlaku_sampai };
		terapkanLokal(u.id, izin, izin.length ? berlakuSampai : null);
		setSimpan((s) => new Set(s).add(u.id));
		try {
			await aturAkses(u.id, { izin, berlaku_sampai: izin.length ? berlakuSampai : null });
		} catch (e) {
			terapkanLokal(u.id, lama.izin, lama.berlaku_sampai);
			toast.error(pesanGalat(e, `Gagal menyimpan akses ${u.nama}`));
		} finally {
			setSimpan((s) => {
				const n = new Set(s);
				n.delete(u.id);
				return n;
			});
			setRiwayat(null);
		}
	};

	const ubahIzin = (u, id) => simpanBaris(u, u.izin.includes(id) ? u.izin.filter((i) => i !== id) : [...u.izin, id], u.berlaku_sampai);
	const ubahSampai = (u, tgl) => simpanBaris(u, u.izin, akhirHari(tgl));

	const terapkanPreset = async (izin) => {
		const ids = [...pilih];
		if (!ids.length) return;
		try {
			const r = await aturAksesMassal({ user_ids: ids, izin, berlaku_sampai: izin.length ? akhirHari(sampaiMassal) : null });
			toast.success(r.data?.message || "Akses diperbarui");
			setPilih(new Set());
			setSampaiMassal("");
			setRiwayat(null);
			muat();
		} catch (e) {
			toast.error(pesanGalat(e, "Gagal menyimpan akses"));
		}
	};

	const bukaRiwayat = async () => {
		if (riwayat) return setRiwayat(null);
		try {
			const r = await getRiwayatAkses();
			setRiwayat(r.data.data || []);
		} catch (e) {
			toast.error(pesanGalat(e, "Gagal memuat riwayat"));
		}
	};

	if (!data)
		return (
			<div className="flex justify-center py-16 text-slate-400">
				<Loader2 className="h-6 w-6 animate-spin" />
			</div>
		);

	const r = data.ringkasan;
	const semuaTerpilih = bisaDipilih.length > 0 && bisaDipilih.every((u) => pilih.has(u.id));

	return (
		<div className="space-y-4">
			<section className="rounded-xl border border-slate-200 bg-white">
				<div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h2 className="text-base font-semibold text-slate-900">Akses pengguna</h2>
						<p className="mt-0.5 text-sm text-slate-500">
							{r.berakses} dari {r.total} pegawai berakses
							<span className="text-slate-300"> · </span>
							{IZIN.map((i, n) => (
								<span key={i.id}>
									{n > 0 && <span className="text-slate-300"> · </span>}
									{i.label} {r[i.id]}
								</span>
							))}
						</p>
					</div>
					<button onClick={bukaRiwayat} className="inline-flex items-center gap-1.5 self-start rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 sm:self-auto">
						<History className="h-4 w-4" />
						{riwayat ? "Tutup riwayat" : "Riwayat perubahan"}
					</button>
				</div>

				{riwayat && (
					<ol className="max-h-72 divide-y divide-slate-100 overflow-y-auto border-b border-slate-100 bg-slate-50/60 px-5 text-sm">
						{riwayat.length === 0 && <li className="py-3 text-slate-500">Belum ada perubahan akses.</li>}
						{riwayat.map((l) => (
							<li key={l.id} className="flex flex-col gap-0.5 py-2.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
								<span className="text-slate-700">{l.description}</span>
								<span className="flex-shrink-0 text-xs text-slate-400">{new Date(l.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}</span>
							</li>
						))}
					</ol>
				)}

				<div className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center">
					<label className="relative flex-1">
						<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
						<input
							value={cari}
							onChange={(e) => setCari(e.target.value)}
							placeholder="Cari nama, email, bidang, atau jabatan"
							className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-slate-400"
						/>
					</label>
					<div className="inline-flex rounded-lg border border-slate-200 p-0.5 text-sm">
						{[
							["semua", "Semua"],
							["berakses", "Berakses"],
							["belum", "Belum berakses"],
						].map(([id, label]) => (
							<button key={id} onClick={() => setSaring(id)} className={`rounded-md px-3 py-1.5 ${saring === id ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
								{label}
							</button>
						))}
					</div>
				</div>

				{pilih.size > 0 && (
					<div className="flex flex-wrap items-center gap-2 border-y border-slate-200 bg-slate-50 px-5 py-2.5 text-sm">
						<span className="mr-1 font-medium text-slate-900">{pilih.size} dipilih</span>
						{PRESET.map((p) => (
							<button
								key={p.label}
								onClick={() => terapkanPreset(p.izin)}
								className={`rounded-lg border px-3 py-1 ${p.izin.length ? "border-slate-300 bg-white text-slate-700 hover:border-slate-400" : "border-red-200 bg-white text-red-600 hover:bg-red-50"}`}
							>
								{p.label}
							</button>
						))}
						<label className="ml-auto flex items-center gap-2 text-slate-500">
							Berlaku sampai
							<input type="date" value={sampaiMassal} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setSampaiMassal(e.target.value)} className="rounded-md border border-slate-200 px-2 py-1 text-slate-700" />
						</label>
						<button onClick={() => setPilih(new Set())} className="rounded-md p-1 text-slate-400 hover:text-slate-700" aria-label="Batalkan pilihan">
							<X className="h-4 w-4" />
						</button>
					</div>
				)}

				{/* tabel (layar lebar) */}
				<div className="hidden overflow-x-auto md:block">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-y border-slate-100 bg-slate-50/70 text-left text-xs font-medium text-slate-500">
								<th className="w-10 py-2.5 pl-5">
									<input
										type="checkbox"
										checked={semuaTerpilih}
										onChange={() => setPilih(semuaTerpilih ? new Set() : new Set(bisaDipilih.map((u) => u.id)))}
										aria-label="Pilih semua"
									/>
								</th>
								<th className="py-2.5 pr-4">Pegawai</th>
								{IZIN.map((i) => (
									<th key={i.id} className="px-3 py-2.5 text-center" title={i.ket}>
										{i.label}
									</th>
								))}
								<th className="px-3 py-2.5">Berlaku sampai</th>
								<th className="py-2.5 pl-3 pr-5">Terakhir diubah</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-slate-100">
							{staf.map((u) => (
								<tr key={u.id} className={pilih.has(u.id) ? "bg-slate-50" : ""}>
									<td className="py-3 pl-5">
										{!u.superadmin && (
											<input
												type="checkbox"
												checked={pilih.has(u.id)}
												onChange={() =>
													setPilih((s) => {
														const n = new Set(s);
														if (n.has(u.id)) n.delete(u.id);
														else n.add(u.id);
														return n;
													})
												}
												aria-label={`Pilih ${u.nama}`}
											/>
										)}
									</td>
									<td className="py-3 pr-4">
										<p className="font-medium text-slate-900">{u.nama}</p>
										<p className="text-xs text-slate-500">
											{PERAN[u.role] || u.role}
											{u.bidang ? ` · ${u.bidang}` : ""}
										</p>
									</td>
									{IZIN.map((i) => (
										<td key={i.id} className="px-3 py-3 text-center">
											{u.superadmin ? (
												<Check className="mx-auto h-4 w-4 text-slate-400" aria-label="Selalu" />
											) : (
												<Sakelar aktif={u.izin.includes(i.id)} disabled={simpan.has(u.id)} onClick={() => ubahIzin(u, i.id)} label={`${i.label} untuk ${u.nama}`} />
											)}
										</td>
									))}
									<td className="px-3 py-3">
										{u.superadmin ? (
											<span className="text-xs text-slate-400">Selalu penuh</span>
										) : u.izin.length ? (
											<input
												type="date"
												value={keInputTanggal(u.berlaku_sampai)}
												min={new Date().toISOString().slice(0, 10)}
												onChange={(e) => ubahSampai(u, e.target.value)}
												className="w-36 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700"
												title="Kosongkan untuk tanpa batas waktu"
											/>
										) : (
											<span className="text-xs text-slate-300">—</span>
										)}
									</td>
									<td className="py-3 pl-3 pr-5 text-xs text-slate-500">
										{simpan.has(u.id) ? (
											<span className="inline-flex items-center gap-1 text-slate-400">
												<Loader2 className="h-3 w-3 animate-spin" />
												Menyimpan
											</span>
										) : u.diberi_pada ? (
											<>
												{tglPendek(u.diberi_pada)}
												{u.diberi_oleh ? <span className="block text-slate-400">oleh {u.diberi_oleh}</span> : null}
											</>
										) : (
											"—"
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				{/* daftar (ponsel) */}
				<ul className="divide-y divide-slate-100 border-t border-slate-100 md:hidden">
					{staf.map((u) => (
						<li key={u.id} className="px-4 py-3">
							<div className="flex items-start gap-3">
								{!u.superadmin && (
									<input
										type="checkbox"
										className="mt-1"
										checked={pilih.has(u.id)}
										onChange={() =>
											setPilih((s) => {
												const n = new Set(s);
												if (n.has(u.id)) n.delete(u.id);
												else n.add(u.id);
												return n;
											})
										}
										aria-label={`Pilih ${u.nama}`}
									/>
								)}
								<div className="min-w-0 flex-1">
									<p className="font-medium text-slate-900">{u.nama}</p>
									<p className="text-xs text-slate-500">
										{PERAN[u.role] || u.role}
										{u.bidang ? ` · ${u.bidang}` : ""}
									</p>
								</div>
								{simpan.has(u.id) && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
							</div>
							{u.superadmin ? (
								<p className="mt-2 text-xs text-slate-400">Superadmin selalu berakses penuh</p>
							) : (
								<div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5">
									{IZIN.map((i) => (
										<label key={i.id} className="flex items-center justify-between gap-2 text-sm text-slate-700">
											{i.label}
											<Sakelar aktif={u.izin.includes(i.id)} disabled={simpan.has(u.id)} onClick={() => ubahIzin(u, i.id)} label={`${i.label} untuk ${u.nama}`} />
										</label>
									))}
								</div>
							)}
						</li>
					))}
				</ul>
				{staf.length === 0 && <p className="px-5 py-10 text-center text-sm text-slate-500">Tidak ada pegawai yang cocok.</p>}
			</section>

			<section className="grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-4">
				{IZIN.map((i) => (
					<div key={i.id} className="bg-white px-4 py-3">
						<p className="text-sm font-medium text-slate-900">{i.label}</p>
						<p className="mt-0.5 text-xs leading-5 text-slate-500">{i.ket}</p>
					</div>
				))}
			</section>
		</div>
	);
};

export default CctvAksesPage;
