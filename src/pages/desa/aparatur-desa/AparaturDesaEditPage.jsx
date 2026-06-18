import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AparaturDesaForm from "../../../components/aparatur-desa/AparaturDesaForm";
import {
	getAparaturDesaById,
	getProdukHukumList,
	updateAparaturDesa,
} from "../../../api/aparaturDesaApi";

const AparaturDesaEditPage = () => {
	const { id } = useParams();
	const nav = useNavigate();
	const [initialData, setInitialData] = useState(null);
	const [produkHukum, setProdukHukum] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		const load = async () => {
			try {
				setLoading(true);
				const [detailRes, phRes] = await Promise.all([
					getAparaturDesaById(id),
					getProdukHukumList({ all: true }),
				]);
				setInitialData(detailRes.data.data);
				const data = phRes.data.data;
				setProdukHukum(Array.isArray(data) ? data : data?.data || []);
			} catch (e) {
				console.error("Error loading edit data:", e);
				setError("Gagal memuat data edit aparatur.");
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [id]);

	const handleSubmit = async (payload) => {
		try {
			let dataToSend = payload;
			// If payload is a plain object (fallback), convert to FormData
			if (!(payload instanceof FormData)) {
				const fd = new FormData();
				const fileKeys = new Set([
					"file_bpjs_kesehatan",
					"file_bpjs_ketenagakerjaan",
					"file_pas_foto",
					"file_ktp",
					"file_kk",
					"file_akta_kelahiran",
					"file_ijazah_terakhir",
				]);
				Object.entries(payload || {}).forEach(([k, v]) => {
					if (fileKeys.has(k)) return; // add below only if Blob
					if (v === undefined) return;
					fd.append(k, v === null ? "" : v);
				});
				fileKeys.forEach((k) => {
					const v = payload?.[k];
					if (
						v &&
						typeof v === "object" &&
						(v instanceof File || v instanceof Blob)
					) {
						fd.append(k, v);
					}
				});
				dataToSend = fd;
			}
			await updateAparaturDesa(id, dataToSend);
			nav(`/desa/aparatur-desa/${id}`);
		} catch (e) {
			console.error("Error updating aparatur:", e);
			setError("Gagal menyimpan perubahan.");
		}
	};

	if (loading) {
		return (
			<div className="flex min-h-64 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-500">
				Memuat data aparatur...
			</div>
		);
	}
	if (error) {
		return (
			<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
				{error}
			</div>
		);
	}
	if (!initialData) {
		return (
			<div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm font-medium text-slate-500">
				Data tidak ditemukan.
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
						Aparatur Desa
					</p>
					<h1 className="mt-1 text-2xl font-bold text-slate-900">Ubah Aparatur Desa</h1>
				</div>
				<button
					className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
					onClick={() => nav(`/desa/aparatur-desa/${id}`)}
				>
					Kembali
				</button>
			</div>
			<AparaturDesaForm
				onSubmit={handleSubmit}
				initialData={initialData}
				produkHukumList={produkHukum}
				onCancel={() => nav(`/desa/aparatur-desa/${id}`)}
			/>
		</div>
	);
};

export default AparaturDesaEditPage;
