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

	if (loading) return <p>Memuat...</p>;
	if (error) return <p className="text-red-600">{error}</p>;
	if (!initialData) return <p>Data tidak ditemukan.</p>;

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-bold">Ubah Aparatur Desa</h1>
				<button
					className="px-3 py-1.5 rounded border"
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
