import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";

/**
 * Hak akses fitur untuk akun kecamatan.
 *
 * Akun UTAMA kecamatan membuka semua fitur; hanya OPERATOR kecamatan
 * (`user.operator_kecamatan`) yang dibatasi `user.kecamatan_permissions`.
 *
 * Seperti hak akses desa, sekali per pemuatan halaman nilainya disegarkan dari
 * /auth/profile — sesi aplikasi ini tidak pernah kedaluwarsa, jadi tanpa
 * penyegaran, perubahan izin oleh akun utama baru terasa setelah logout. Sesi
 * lama yang belum membawa `operator_kecamatan` juga terisi dari sini.
 */

let refreshedThisPageLoad = false;

export const useKecamatanPermissions = () => {
	const { user, updateUser } = useAuth();
	const role = user?.role;
	const userId = user?.id;
	const sudahDimuat = typeof user?.operator_kecamatan === "boolean";

	const [isReady, setIsReady] = useState(role !== "kecamatan" || (sudahDimuat && refreshedThisPageLoad));

	useEffect(() => {
		if (role !== "kecamatan") {
			setIsReady(true);
			return;
		}

		if (refreshedThisPageLoad) {
			setIsReady(true);
			return;
		}

		let cancelled = false;
		refreshedThisPageLoad = true;

		(async () => {
			try {
				const res = await api.get("/auth/profile");
				const profil = res?.data?.data;
				// Profil milik akun lain (mis. tersaji dari cache perangkat bersama)
				// tidak boleh menentukan hak akses sesi ini.
				if (String(profil?.id) !== String(userId)) return;
				if (!cancelled) {
					updateUser({
						operator_kecamatan: Boolean(profil?.operator_kecamatan),
						kecamatan_permissions: Array.isArray(profil?.kecamatan_permissions)
							? profil.kecamatan_permissions
							: [],
					});
				}
			} catch (error) {
				console.error("[KecamatanPermissions] Gagal menyegarkan hak akses:", error);
				// Pakai nilai dari sesi; backend tetap penjaga terakhir.
				refreshedThisPageLoad = false;
			} finally {
				if (!cancelled) setIsReady(true);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [role, userId, updateUser]);

	const isOperator = role === "kecamatan" && user?.operator_kecamatan === true;
	const tersimpan = user?.kecamatan_permissions;
	const permissions = useMemo(() => (Array.isArray(tersimpan) ? tersimpan : []), [tersimpan]);

	const hasPermission = useCallback(
		(key) => {
			if (!isOperator || !key) return true;
			return permissions.includes(key);
		},
		[isOperator, permissions],
	);

	return { isOperator, permissions, hasPermission, isReady };
};

/** Dipanggil saat logout supaya sesi berikutnya menyegarkan izin lagi. */
export const resetKecamatanPermissionRefresh = () => {
	refreshedThisPageLoad = false;
};
