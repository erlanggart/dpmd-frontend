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
// Role yang datanya perlu dilengkapi dari /auth/profile.
const ROLE_DINAS = ["dinas_terkait", "verifikator_dinas"];
const ROLE_BUTUH_PROFIL = ["desa", "admin_desa", ...ROLE_DINAS];

export const useUserProfile = () => {
	const { user, updateUser } = useAuth();
	// Cukup sekali per pemasangan komponen. Tanpa ini efeknya bisa berputar terus
	// untuk akun desa yang `desa_id`-nya kosong: syarat `!user.desa` tidak akan
	// pernah terpenuhi sehingga request diulang tiap render.
	const sudahDiambilRef = useRef(false);

	useEffect(() => {
		if (!user || sudahDiambilRef.current) return;
		if (!ROLE_BUTUH_PROFIL.includes(user.role)) return;
		// Akun desa butuh relasi desa; akun dinas butuh identitas dinas (dipakai
		// antara lain untuk mengenali akun BPKAD yang berperan pelihat). Sesi di
		// aplikasi ini tidak pernah kedaluwarsa, jadi akun lama hanya menerima
		// data baru ini lewat /auth/profile, bukan lewat response login.
		const relasiSudahAda = ROLE_DINAS.includes(user.role) ? !!user.dinas : !!user.desa;
		if (relasiSudahAda) return;

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
