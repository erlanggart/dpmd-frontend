/**
 * useCctvAlerts — peringatan deteksi CCTV secara langsung lewat socket.io.
 *
 * Berbeda dengan useUnreadMessages (satu koneksi per pemakaian), hook ini
 * memakai SATU koneksi socket bersama di tingkat modul: halaman Peringatan dan
 * lencana di shell bisa dipasang bersamaan, dan keduanya menerima event yang
 * sama tanpa membuka dua koneksi.
 *
 * Server mengirim event `cctv_alert` berisi:
 *   { id, event_uuid, camera_id, kamera, lokasi, type, severity, nama,
 *     similarity, occurred_at, snapshot_url }
 *
 * `type` dikenal: known | unknown | fall | fall_warning | immobility | other.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { asalSocket } from "../utils/asalServer";

const MAKS_DAFTAR = 100;

// Koneksi & daftar bersama antar-pemakai hook.
let socket = null;
let penyimpat = new Set();
let daftarBersama = [];
let jumlahBersama = 0;

const sebar = () => {
	for (const fn of penyimpat) {
		fn({ daftar: daftarBersama, jumlah: jumlahBersama });
	}
};

const sambungkan = () => {
	if (socket) return socket;
	const token = localStorage.getItem("expressToken");
	if (!token) return null;
	socket = io(asalSocket(), { auth: { token }, transports: ["polling", "websocket"] });

	socket.on("cctv_alert", (peristiwa) => {
		daftarBersama = [peristiwa, ...daftarBersama].slice(0, MAKS_DAFTAR);
		jumlahBersama += 1;
		sebar();
	});

	socket.on("disconnect", () => {
		// Biarkan socket.io reconnect sendiri; daftar terakhir tetap tampil.
	});

	return socket;
};

const putuskanBilaKosong = () => {
	if (penyimpat.size > 0 || !socket) return;
	socket.disconnect();
	socket = null;
	daftarBersama = [];
	jumlahBersama = 0;
};

/**
 * @returns {{
 *   peristiwa: Array,
 *   jumlahBelumDibaca: number,
 *   tersambung: boolean,
 *   tandaiDibaca: () => void,
 *   reset: () => void,
 * }}
 */
export function useCctvAlerts() {
	const [state, setState] = useState({ daftar: daftarBersama, jumlah: jumlahBersama });
	const [tersambung, setTersambung] = useState(false);
	const fnRef = useRef(null);

	fnRef.current = (s) => setState({ daftar: s.daftar, jumlah: s.jumlah });

	useEffect(() => {
		const fn = (s) => fnRef.current(s);
		penyimpat.add(fn);
		const s = sambungkan();
		if (s) {
			setTersambung(s.connected);
			s.on("connect", () => setTersambung(true));
			s.on("disconnect", () => setTersambung(false));
		}
		return () => {
			penyimpat.delete(fn);
			if (s) {
				s.off("connect");
				s.off("disconnect");
			}
			putuskanBilaKosong();
		};
	}, []);

	const tandaiDibaca = useCallback(() => {
		jumlahBersama = 0;
		sebar();
	}, []);

	const reset = useCallback(() => {
		daftarBersama = [];
		jumlahBersama = 0;
		sebar();
	}, []);

	return {
		peristiwa: state.daftar,
		jumlahBelumDibaca: state.jumlah,
		tersambung,
		tandaiDibaca,
		reset,
	};
}
