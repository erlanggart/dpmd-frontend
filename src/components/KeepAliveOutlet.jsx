// src/components/KeepAliveOutlet.jsx
// Outlet "keep-alive": halaman tab yang sudah pernah dibuka TIDAK di-unmount saat
// pindah tab — cukup disembunyikan (display:none) lalu ditampilkan lagi saat kembali.
//
// Efeknya:
//  - Kembali ke tab = instan. Tidak ada spinner "Memuat...", tidak fetch ulang,
//    dan tidak ada freeze akibat komponen berat (mis. DPMDDashboard) yang
//    remount + render besar secara sinkron saat transisi route.
//  - State internal halaman (posisi scroll, filter, tab aktif) ikut terjaga.
//
// Hanya route "tab utama" (KEEP_ALIVE_PATHS) yang di-keep-alive. Route lain
// (detail, form, dsb.) tetap mount/unmount normal supaya memori tidak menumpuk.
import React, { useRef } from "react";
import { useOutlet, useLocation } from "react-router-dom";

// Path tab yang dipertahankan hidup (harus persis, bukan sub-path).
const KEEP_ALIVE_PATHS = [
	"/dpmd/dashboard",
	"/dpmd/jadwal-kegiatan",
	"/dpmd/perjadin",
	"/dpmd/disposisi",
	"/dpmd/video-meeting",
	"/dpmd/pesan",
	"/dpmd/bank-surat",
];

const KeepAliveOutlet = ({ context }) => {
	const location = useLocation();
	const outlet = useOutlet(context);
	const cacheRef = useRef(new Map());

	const path = location.pathname;
	const isKeepAlive = KEEP_ALIVE_PATHS.includes(path);

	// Simpan / perbarui elemen route tab aktif ke cache.
	if (outlet && isKeepAlive) {
		cacheRef.current.set(path, outlet);
	}

	const cachedEntries = Array.from(cacheRef.current.entries());
	const currentIsCached = isKeepAlive && cacheRef.current.has(path);

	return (
		<>
			{/* Semua tab yang pernah dibuka tetap ter-mount; yang non-aktif disembunyikan. */}
			{cachedEntries.map(([p, el]) => (
				<div key={p} style={{ display: p === path ? "contents" : "none" }}>
					{el}
				</div>
			))}

			{/* Route non keep-alive (detail/form/dll) dirender normal, tanpa disimpan. */}
			{!currentIsCached && outlet && <div style={{ display: "contents" }}>{outlet}</div>}
		</>
	);
};

export default KeepAliveOutlet;
