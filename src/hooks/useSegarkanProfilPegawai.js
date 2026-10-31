import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import { normalisasiStatus } from "../utils/presensi";

/**
 * Menyegarkan data kepegawaian di sesi dari /auth/profile.
 *
 * Sesi aplikasi ini tidak pernah kedaluwarsa, jadi data user di sesi adalah
 * salinan saat login — bisa berbulan-bulan lalu. Kalau admin baru mengisi atau
 * mengubah status kepegawaian setelah itu, menu Presensi tidak pernah muncul
 * (atau tetap muncul padahal sudah tidak berhak) sampai pegawai logout sendiri.
 * Hook ini menyegarkannya sekali per pemuatan halaman dan setiap kali aplikasi
 * kembali dibuka setelah ditinggal cukup lama.
 */

const JEDA_MS = 10 * 60 * 1000;
let terakhir = 0;

const BIDANG = ["status_kepegawaian", "jabatan", "pegawai_id", "bidang_id", "bidang_name", "sub_bidang", "nip", "name"];

export function useSegarkanProfilPegawai() {
	const { user, updateUser } = useAuth();
	const userId = user?.id;
	// updateUser dibuat ulang setiap render; cukup pegang versi terbarunya.
	const perbarui = useRef(updateUser);
	useEffect(() => {
		perbarui.current = updateUser;
	});

	useEffect(() => {
		if (!userId) return;
		let batal = false;

		const segarkan = async () => {
			if (Date.now() - terakhir < JEDA_MS) return;
			terakhir = Date.now();
			try {
				const res = await api.get("/auth/profile");
				const profil = res?.data?.data;
				// Profil milik akun lain (cache perangkat bersama) tidak boleh dipakai.
				if (batal || String(profil?.id) !== String(userId)) return;
				const patch = {};
				for (const k of BIDANG) if (k in profil) patch[k] = profil[k];
				patch.status_kepegawaian = normalisasiStatus(profil.status_kepegawaian);
				perbarui.current(patch);
				// Layout membaca salinan user dari localStorage; beri tahu agar ikut segar.
				setTimeout(() => window.dispatchEvent(new Event("userProfileUpdated")), 0);
			} catch {
				// Jaringan putus: pakai data sesi apa adanya, coba lagi lain kali.
				terakhir = 0;
			}
		};

		segarkan();
		const saatTerlihat = () => document.visibilityState === "visible" && segarkan();
		document.addEventListener("visibilitychange", saatTerlihat);
		return () => {
			batal = true;
			document.removeEventListener("visibilitychange", saatTerlihat);
		};
	}, [userId]);
}

/** Dipanggil saat logout supaya akun berikutnya langsung disegarkan. */
export const resetSegarkanProfilPegawai = () => {
	terakhir = 0;
};
