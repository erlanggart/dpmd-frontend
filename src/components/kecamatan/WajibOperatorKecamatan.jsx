// src/components/kecamatan/WajibOperatorKecamatan.jsx
//
// Popup untuk akun UTAMA kecamatan yang belum punya satu pun akun operator.
//
// Sengaja tidak bisa ditutup: setiap kecamatan harus punya operator supaya
// verifikasi tercatat atas nama petugasnya, bukan atas nama akun bersama.
// Isinya langsung formulir — membuat satu akun tidak sampai semenit, jadi
// pekerjaan yang sedang mendesak tidak tertahan lama. Halaman Akun Operator
// sendiri dikecualikan supaya tidak muncul di atas formulir yang sama.

import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import api from "../../api";
import { useAuth } from "../../context/AuthContext";
import { useKecamatanPermissions } from "../../hooks/useKecamatanPermissions";
import FormOperatorKecamatan from "./FormOperatorKecamatan";
import { KartuKredensialOperator, ModalOperatorKecamatan } from "./ModalOperatorKecamatan";

const HALAMAN_DIKECUALIKAN = ["/kecamatan/akun-operator", "/kecamatan/change-password"];

const WajibOperatorKecamatan = () => {
	const { user } = useAuth();
	const { isOperator, isReady } = useKecamatanPermissions();
	const location = useLocation();
	const [perlu, setPerlu] = useState(false);
	const [hasil, setHasil] = useState(null);
	const [menyimpan, setMenyimpan] = useState(false);

	useEffect(() => {
		if (!isReady || isOperator) return undefined;
		let batal = false;
		(async () => {
			try {
				const res = await api.get("/kecamatan-admin/meta");
				if (!batal) setPerlu((res.data?.data?.total_operator ?? 1) === 0);
			} catch {
				// Gagal memeriksa → jangan menghalangi pekerjaan.
			}
		})();
		return () => {
			batal = true;
		};
	}, [isReady, isOperator]);

	const simpan = async (payload) => {
		setMenyimpan(true);
		try {
			await api.post("/kecamatan-admin/users", payload);
			setHasil({ email: payload.email.toLowerCase(), sandi: payload.password });
		} catch (error) {
			Swal.fire({
				icon: "error",
				title: "Gagal membuat akun",
				text: error?.response?.data?.message || "Terjadi kesalahan.",
			});
		} finally {
			setMenyimpan(false);
		}
	};

	// Layar wajib ganti sandi didahulukan; popup ini menyusul sesudahnya.
	if (user?.must_change_password) return null;
	if (!perlu || HALAMAN_DIKECUALIKAN.some((p) => location.pathname.startsWith(p))) return null;

	return (
		<ModalOperatorKecamatan
			judul={hasil ? "Akun operator dibuat" : "Buat akun operator kecamatan"}
			keterangan={
				hasil
					? null
					: "Kecamatan Anda belum punya akun operator. Buat minimal satu untuk petugas yang mengurus aplikasi ini — akun lain bisa ditambah nanti di menu Akun Operator."
			}
		>
			{hasil ? (
				<KartuKredensialOperator
					email={hasil.email}
					sandi={hasil.sandi}
					onSelesai={() => {
						setHasil(null);
						setPerlu(false);
					}}
				/>
			) : (
				<FormOperatorKecamatan onSimpan={simpan} menyimpan={menyimpan} />
			)}
		</ModalOperatorKecamatan>
	);
};

export default WajibOperatorKecamatan;
