import api from "../api";

/**
 * Drive per bidang.
 *
 * Berkasnya TIDAK bisa diambil lewat URL statis seperti modul unggahan lain —
 * penyimpanannya di luar direktori yang disajikan express.static. Satu-satunya
 * jalan adalah `unduhUrl()` di bawah, yang memeriksa izin lebih dulu di server.
 */

export const getIsiDrive = (bidangId, folderId = null) =>
	api.get(`/drive/${bidangId}`, {
		params: folderId ? { folder_id: folderId } : {},
	});

export const getSampah = (bidangId) => api.get(`/drive/${bidangId}/sampah`);

export const getDibagikanKeSaya = () => api.get("/drive/dibagikan");

/**
 * Isi folder yang didapat lewat berbagi.
 *
 * Tidak memakai `getIsiDrive`: endpoint itu terikat bidang pemilik, sedangkan
 * folder yang dibagikan justru milik bidang lain.
 */
export const getIsiFolderDibagikan = (folderId) => api.get(`/drive/folder/${folderId}/isi`);

/** Siapa saja yang sudah diberi akses ke sebuah objek (khusus pemilik). */
export const getDaftarBerbagi = (tipe, id) => api.get(`/drive/${tipe}/${id}/berbagi`);

export const buatFolder = (bidangId, nama, parentId = null) =>
	api.post(`/drive/${bidangId}/folder`, { nama, parent_id: parentId });

export const ubahNama = (tipe, id, nama) =>
	api.patch(`/drive/${tipe}/${id}/nama`, { nama });

export const keSampah = (tipe, id) => api.delete(`/drive/${tipe}/${id}`);

export const pulihkan = (tipe, id) => api.post(`/drive/${tipe}/${id}/pulihkan`);

export const bagikan = (tipe, id, penerimaTipe, penerimaId, izin = "lihat") =>
	api.post(`/drive/${tipe}/${id}/bagikan`, {
		penerima_tipe: penerimaTipe,
		penerima_id: penerimaId,
		izin,
	});

export const cabutBerbagi = (shareId) => api.delete(`/drive/berbagi/${shareId}`);

/**
 * @param {File[]} files
 * @param {(persen:number)=>void} onProgress dipanggil saat unggahan berjalan
 */
export const unggahBerkas = (bidangId, files, folderId = null, onProgress) => {
	const form = new FormData();
	files.forEach((f) => form.append("files", f));
	if (folderId) form.append("folder_id", folderId);

	return api.post(`/drive/${bidangId}/unggah`, form, {
		headers: { "Content-Type": "multipart/form-data" },
		onUploadProgress: (e) => {
			if (onProgress && e.total) {
				onProgress(Math.round((e.loaded * 100) / e.total));
			}
		},
	});
};

/**
 * Unduh/pratinjau berkas.
 *
 * Memakai blob, bukan <a href> langsung: endpoint-nya butuh header Authorization
 * sedangkan navigasi browser biasa tidak mengirimkannya.
 */
export const unduhBerkas = async (fileId, namaBerkas, inline = false) => {
	const res = await api.get(`/drive/file/${fileId}/unduh`, {
		params: inline ? { inline: 1 } : {},
		responseType: "blob",
	});

	const url = URL.createObjectURL(res.data);

	if (inline) return url; // pemanggil yang bertanggung jawab me-revoke

	const a = document.createElement("a");
	a.href = url;
	a.download = namaBerkas;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
	return null;
};
