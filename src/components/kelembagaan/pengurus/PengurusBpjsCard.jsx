import React, { useEffect, useState } from "react";
import { FaShieldAlt, FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from "react-icons/fa";
import { getPengurusBpjs } from "../../../services/pengurus";

const namaBulan = (ym) =>
	ym ? new Date(`${ym}-01T00:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" }) : "-";

const rupiah = (n) => (n == null ? "-" : `Rp ${Number(n).toLocaleString("id-ID")}`);

/**
 * Status kepesertaan BPJS bulan berjalan. Hanya tampil untuk Ketua RT/RW
 * (backend mengembalikan eligible=false untuk selain itu → kartu tidak dirender).
 */
const PengurusBpjsCard = ({ pengurusId, nik }) => {
	const [data, setData] = useState(null);

	useEffect(() => {
		let aktif = true;
		getPengurusBpjs(pengurusId)
			.then((res) => aktif && setData(res?.data?.data || null))
			.catch(() => aktif && setData(null));
		return () => {
			aktif = false;
		};
		// nik ikut agar status dicek ulang setelah NIK diubah
	}, [pengurusId, nik]);

	if (!data?.eligible) return null;

	let status;
	if (data.nik_kosong) {
		status = { tone: "amber", icon: FaExclamationTriangle, title: "Tidak dapat dicek", desc: "NIK pengurus belum diisi." };
	} else if (data.tercover) {
		status = { tone: "green", icon: FaCheckCircle, title: "Tercover BPJS", desc: `Terdaftar pada iuran ${namaBulan(data.bulan)}.` };
	} else if (!data.data_bulan_ini_tersedia) {
		status = {
			tone: "amber",
			icon: FaExclamationTriangle,
			title: "Data bulan ini belum tersedia",
			desc: `Data BPJS terbaru adalah ${namaBulan(data.periode_data)}.${data.terdaftar ? " Pengurus tercatat di periode tersebut." : ""}`,
		};
	} else {
		status = {
			tone: "red",
			icon: FaTimesCircle,
			title: "Belum tercover BPJS",
			desc: `NIK tidak ditemukan pada data iuran ${namaBulan(data.bulan)}.`,
		};
	}

	const TONE = {
		green: "bg-green-50 border-green-200 text-green-700",
		red: "bg-red-50 border-red-200 text-red-700",
		amber: "bg-amber-50 border-amber-200 text-amber-700",
	};
	const Icon = status.icon;

	return (
		<div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
			<div className="flex items-center gap-3 px-5 py-4 bg-emerald-50/70">
				<div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm bg-emerald-500">
					<FaShieldAlt className="text-white w-4 h-4" />
				</div>
				<div>
					<h3 className="text-lg font-bold text-gray-900">BPJS Ketenagakerjaan</h3>
					<p className="text-xs text-gray-500">Status kepesertaan {namaBulan(data.bulan)}</p>
				</div>
			</div>
			<div className="p-5 space-y-3">
				<div className={`flex items-start gap-3 rounded-xl border p-3 ${TONE[status.tone]}`}>
					<Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
					<div>
						<p className="text-sm font-bold">{status.title}</p>
						<p className="text-xs mt-0.5 opacity-90">{status.desc}</p>
					</div>
				</div>

				{data.peserta && (
					<dl className="grid grid-cols-2 gap-3 text-sm">
						<div>
							<dt className="text-xs text-gray-500">Nama di BPJS</dt>
							<dd className="font-medium text-gray-900 break-words">{data.peserta.nama}</dd>
						</div>
						<div>
							<dt className="text-xs text-gray-500">No. KPJ</dt>
							<dd className="font-mono text-gray-900">{data.peserta.kpj || "-"}</dd>
						</div>
						<div>
							<dt className="text-xs text-gray-500">Upah</dt>
							<dd className="font-medium text-gray-900">{rupiah(data.peserta.upah)}</dd>
						</div>
						<div>
							<dt className="text-xs text-gray-500">Status Desk BPJS</dt>
							<dd className="font-medium text-gray-900 capitalize">{data.status_desk?.status?.replace(/_/g, " ") || "-"}</dd>
						</div>
					</dl>
				)}
			</div>
		</div>
	);
};

export default PengurusBpjsCard;
