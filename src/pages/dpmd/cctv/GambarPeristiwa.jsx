import React, { useEffect, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import api from "../../../api";

/**
 * Snapshot peristiwa CCTV. Endpoint-nya butuh header Authorization, yang tidak
 * bisa dikirim lewat <img src>, jadi gambar diambil lewat API lalu ditampilkan
 * sebagai blob.
 */
const GambarPeristiwa = ({ id, className = "" }) => {
	const [url, setUrl] = useState(null);
	const [galat, setGalat] = useState(false);

	useEffect(() => {
		let hidup = true;
		let objek = null;
		setUrl(null);
		setGalat(false);
		api
			.get(`/smart-cctv/events/${id}/snapshot`, { responseType: "blob" })
			.then((r) => {
				if (!hidup) return;
				objek = URL.createObjectURL(r.data);
				setUrl(objek);
			})
			.catch(() => hidup && setGalat(true));
		return () => {
			hidup = false;
			if (objek) URL.revokeObjectURL(objek);
		};
	}, [id]);

	if (galat)
		return (
			<div className={`flex aspect-video flex-col items-center justify-center gap-2 bg-slate-50 text-sm text-slate-400 ${className}`}>
				<ImageOff className="h-6 w-6" />
				Snapshot tidak tersedia
			</div>
		);
	if (!url)
		return (
			<div className={`flex aspect-video items-center justify-center bg-slate-50 text-slate-300 ${className}`}>
				<Loader2 className="h-6 w-6 animate-spin" />
			</div>
		);
	return <img src={url} alt="Snapshot peristiwa" className={className} />;
};

export default GambarPeristiwa;
