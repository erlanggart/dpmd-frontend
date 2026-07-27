import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";

/**
 * Hak akses fitur untuk akun operasional desa (role `desa`).
 *
 * Sumber utamanya adalah `user.desa_permissions` dari sesi login, tapi sekali per
 * pemuatan halaman kita segarkan dari `/auth/profile` supaya perubahan izin oleh
 * Admin Desa langsung terasa tanpa harus logout.
 */

// Cukup sekali per page load; navigasi antar rute tidak perlu memanggil ulang.
let refreshedThisPageLoad = false;

export const useDesaPermissions = () => {
	const { user, updateUser } = useAuth();
	const role = user?.role;
	const stored = user?.desa_permissions;

	// Akun non-desa tidak memakai mekanisme ini, jadi langsung dianggap siap.
	const [isReady, setIsReady] = useState(role !== "desa" || Array.isArray(stored));

	useEffect(() => {
		if (role !== "desa") {
			setIsReady(true);
			return;
		}

		if (refreshedThisPageLoad) {
			setIsReady(Array.isArray(stored));
			return;
		}

		let cancelled = false;
		refreshedThisPageLoad = true;

		(async () => {
			try {
				const res = await api.get("/auth/profile");
				const permissions = res?.data?.data?.desa_permissions;
				if (!cancelled && Array.isArray(permissions)) {
					updateUser({ desa_permissions: permissions });
				}
			} catch (error) {
				console.error("[DesaPermissions] Gagal menyegarkan hak akses:", error);
				// Biarkan memakai izin dari sesi; backend tetap jadi penjaga terakhir.
				refreshedThisPageLoad = false;
			} finally {
				if (!cancelled) setIsReady(true);
			}
		})();

		return () => {
			cancelled = true;
		};
	}, [role, stored, updateUser]);

	const permissions = Array.isArray(stored) ? stored : [];

	const hasPermission = useCallback(
		(key) => {
			if (role !== "desa") return true;
			if (!key) return true;
			return permissions.includes(key);
		},
		[role, permissions],
	);

	return { permissions, hasPermission, isReady };
};

/** Dipanggil saat logout supaya sesi berikutnya menyegarkan izin lagi. */
export const resetDesaPermissionRefresh = () => {
	refreshedThisPageLoad = false;
};
