import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";

/**
 * Melengkapi data user sesi dengan relasi desa/kecamatan dari `/auth/profile`.
 *
 * Dua hal yang wajib dijaga di sini:
 *
 * 1. Response `/auth/profile` boleh saja milik akun lain. Endpoint ini pernah
 *    (dan di klien lama masih bisa) disajikan dari cache service worker yang
 *    kuncinya hanya URL, tanpa memperhitungkan header Authorization. Karena itu
 *    `id`-nya dicocokkan dulu dengan user yang sedang login; kalau beda, data
 *    dibuang. Tanpa penjagaan ini identitas user tertukar dan flag seperti
 *    `must_change_password` ikut terbawa dari akun sebelumnya.
 *
 * 2. Datanya digabung dengan `updateUser`, bukan ditimpa lewat `login`. `login`
 *    mengganti seluruh objek user, sehingga field yang tidak ada di response
 *    profil akan hilang dari sesi.
 */
export const useUserProfile = () => {
	const { user, updateUser } = useAuth();
	// Cukup sekali per pemasangan komponen. Tanpa ini efeknya bisa berputar terus
	// untuk akun desa yang `desa_id`-nya kosong: syarat `!user.desa` tidak akan
	// pernah terpenuhi sehingga request diulang tiap render.
	const sudahDiambilRef = useRef(false);

	useEffect(() => {
		if (!user || sudahDiambilRef.current) return;
		if (user.role !== "desa" && user.role !== "admin_desa") return;
		if (user.desa) return;

		sudahDiambilRef.current = true;

		api
			.get("/auth/profile")
			.then((response) => {
				const profileData = response.data?.data;
				if (!response.data?.success || !profileData) return;

				// Profil milik akun lain — jangan sentuh sesi yang sedang berjalan.
				if (String(profileData.id) !== String(user.id)) {
					console.warn("[Profile] Profil bukan milik user aktif, diabaikan");
					return;
				}

				updateUser(profileData);
			})
			.catch((error) => {
				console.error("Failed to fetch user profile:", error);
				// Boleh dicoba lagi saat halaman dibuka berikutnya.
				sudahDiambilRef.current = false;
			});
	}, [user, updateUser]);

	return user;
};
