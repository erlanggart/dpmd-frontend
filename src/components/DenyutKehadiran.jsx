import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { API_ENDPOINTS } from "../config/apiConfig";
import { ambilToken } from "../utils/tokenSesi";

// Di bawah jendela online 5 menit, jadi satu denyut boleh gagal tanpa orangnya tampak offline.
const SELANG_MS = 2 * 60 * 1000;

/**
 * Denyut ke server selama tab benar-benar dilihat. Tanpa ini orang yang membaca satu
 * halaman lama tampak offline di monitor superadmin, karena last_active_at hanya
 * bergerak saat ada panggilan API; tab yang ditinggal di latar tidak ikut dihitung.
 *
 * Sengaja fetch polos, bukan `api`: interceptor 401 di sana bisa melempar tamu bertoken
 * basi dari halaman publik ke login, sedangkan gagalnya denyut tidak penting bagi siapa pun.
 */
export default function DenyutKehadiran() {
	const { pathname } = useLocation();

	useEffect(() => {
		const berdenyut = () => {
			const token = ambilToken();
			if (!token || token === "VPN_ACCESS_TOKEN" || document.visibilityState !== "visible") return;
			fetch(`${API_ENDPOINTS.EXPRESS_BASE}/settings/presence`, {
				method: "POST",
				headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
				body: JSON.stringify({ path: pathname }),
			}).catch(() => {});
		};

		berdenyut();
		const pengatur = setInterval(berdenyut, SELANG_MS);
		document.addEventListener("visibilitychange", berdenyut);
		return () => {
			clearInterval(pengatur);
			document.removeEventListener("visibilitychange", berdenyut);
		};
	}, [pathname]);

	return null;
}
