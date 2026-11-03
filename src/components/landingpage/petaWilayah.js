import { useEffect, useState } from "react";
import { KECAMATAN_DATA } from "./dataWilayah";

/*
 * Batas wilayah asli Kabupaten Bogor untuk peta interaktif landing page.
 * Sumber: batas administrasi ASTA DESA (adm_desa), disalin ke
 * public/geo/wilayah-bogor.json: hanya nama dan poligon kecamatan/desa,
 * tanpa data sensus atau titik lokasi rumah. Dimuat terpisah (±130 KB gzip)
 * supaya tidak membebani bundel utama.
 */

const norm = (s) => String(s).toLowerCase().replace(/[^a-z]/g, "");
let cache = null;
let janji = null;

function muat() {
	if (!janji) {
		janji = fetch("/geo/wilayah-bogor.json")
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json();
			})
			.then((j) => (cache = j))
			.catch((e) => {
				janji = null; // boleh dicoba lagi
				throw e;
			});
	}
	return janji;
}

/** Data batas mentah, atau null selama belum termuat. */
export function useGeoWilayah() {
	const [geo, setGeo] = useState(cache);
	useEffect(() => {
		if (geo) return undefined;
		let hidup = true;
		muat().then((j) => hidup && setGeo(j)).catch(() => {});
		return () => { hidup = false; };
	}, [geo]);
	return geo;
}

/* poligon [[cincin [bujur, lintang]...]...] -> path SVG (evenodd untuk lubang) */
function pathPoli(poli, proyeksi) {
	let d = "";
	for (const p of poli) {
		for (const cincin of p) {
			cincin.forEach(([lng, lat], i) => {
				const [x, y] = proyeksi([lat, lng]);
				d += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
			});
			d += "Z";
		}
	}
	return d;
}

function kotakPoli(poli, proyeksi) {
	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	for (const p of poli) for (const [lng, lat] of p[0]) {
		const [x, y] = proyeksi([lat, lng]);
		minX = Math.min(minX, x); maxX = Math.max(maxX, x);
		minY = Math.min(minY, y); maxY = Math.max(maxY, y);
	}
	return { minX, minY, maxX, maxY };
}

/* titik berat cincin luar terbesar (untuk label desa) */
function pusatPoli(poli, proyeksi) {
	let terbaik = null, luasTerbaik = 0;
	for (const p of poli) {
		const t = p[0].map(([lng, lat]) => proyeksi([lat, lng]));
		let a = 0, cx = 0, cy = 0;
		for (let i = 0, j = t.length - 1; i < t.length; j = i++) {
			const f = t[j][0] * t[i][1] - t[i][0] * t[j][1];
			a += f; cx += (t[j][0] + t[i][0]) * f; cy += (t[j][1] + t[i][1]) * f;
		}
		if (Math.abs(a) > luasTerbaik) { luasTerbaik = Math.abs(a); terbaik = [cx / (3 * a), cy / (3 * a)]; }
	}
	return terbaik || [0, 0];
}

/**
 * Geometri siap gambar, sejajar dengan KECAMATAN_DATA:
 * { path, bbox, center, desa: [{ nama, jenis, path, centroid }] }.
 * Desa diurutkan: desa dulu, lalu kelurahan, masing-masing menurut abjad.
 */
export function bangunGeometri(geo, proyeksi) {
	if (!geo) return KECAMATAN_DATA.map((k) => ({ path: "", bbox: null, center: proyeksi([k.lat, k.lng]), desa: [] }));
	return KECAMATAN_DATA.map((k) => {
		const f = geo.kecamatan.find((x) => norm(x.nama) === norm(k.name));
		const desa = geo.desa
			.filter((d) => norm(d.kec) === norm(k.name))
			.sort((a, b) => (a.jenis === b.jenis ? a.nama.localeCompare(b.nama, "id") : a.jenis === "desa" ? -1 : 1))
			.map((d) => ({ nama: d.nama, jenis: d.jenis, path: pathPoli(d.poli, proyeksi), centroid: pusatPoli(d.poli, proyeksi) }));
		return {
			path: f ? pathPoli(f.poli, proyeksi) : "",
			bbox: f ? kotakPoli(f.poli, proyeksi) : null,
			center: proyeksi([k.lat, k.lng]),
			desa,
		};
	});
}
