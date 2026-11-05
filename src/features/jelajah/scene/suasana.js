// Keadaan suasana siang–malam bersama (lihat SiangMalam.jsx).
// `suasana.malam` (0 siang … 1 malam) dibaca komponen lain tiap frame.
// paksa: null (ikuti jam) | "siang" | "senja" | "malam"; cuaca: "otomatis" | "cerah" | "hujan";
// hujan: 0 cerah … 1 hujan lebat (dihaluskan Cuaca.jsx); teduh: pemain di dalam ruangan / bawah tenda
export const suasana = { malam: 0, paksa: null, cuaca: "otomatis", hujan: 0, teduh: false };

export function malamMenurutJam(d = new Date()) {
	const j = ((d.getUTCHours() + 7) % 24) + d.getUTCMinutes() / 60;
	if (j >= 6 && j <= 17.5) return 0;
	if (j > 17.5 && j < 18.5) return j - 17.5;
	if (j > 5 && j < 6) return 6 - j;
	return 1;
}
