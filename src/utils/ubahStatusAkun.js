import Swal from "sweetalert2";
import api from "../api";
import escapeHtml from "./escapeHtml";

/**
 * Nonaktifkan / aktifkan kembali akun dari halaman manajemen user superadmin.
 *
 * Akun tidak pernah dihapus: FK log aktivitas, proposal/LPJ bankeu, dll. ke
 * users memakai ON DELETE CASCADE, jadi hapus akun = hapus seluruh jejaknya.
 * Mengembalikan true bila status berhasil diubah.
 */
export const ubahStatusAkun = async (user) => {
	const nonaktifkan = user.is_active !== false;
	const konfirmasi = await Swal.fire({
		title: nonaktifkan ? "Nonaktifkan akun?" : "Aktifkan kembali akun?",
		html: `<b>${escapeHtml(user.name)}</b><br/><span style="font-size:13px">${escapeHtml(user.email)}</span>${
			nonaktifkan
				? '<p style="font-size:13px;margin-top:12px">Akun tidak bisa login lagi, tetapi riwayat aktivitas dan datanya tetap tersimpan.</p>'
				: ""
		}`,
		icon: "warning",
		showCancelButton: true,
		confirmButtonColor: nonaktifkan ? "#d33" : "#059669",
		confirmButtonText: nonaktifkan ? "Ya, Nonaktifkan" : "Ya, Aktifkan",
		cancelButtonText: "Batal",
	});
	if (!konfirmasi.isConfirmed) return false;

	try {
		if (nonaktifkan) {
			await api.delete(`/users/${user.id}`);
		} else {
			await api.put(`/users/${user.id}`, { is_active: true });
		}
		Swal.fire({
			icon: "success",
			title: nonaktifkan ? "Akun dinonaktifkan" : "Akun diaktifkan",
			timer: 1500,
			showConfirmButton: false,
		});
		return true;
	} catch (err) {
		Swal.fire("Gagal", err.response?.data?.message || "Status akun tidak dapat diubah.", "error");
		return false;
	}
};
