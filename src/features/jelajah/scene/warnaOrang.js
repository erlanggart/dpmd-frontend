// Palet pakaian & kulit orang ber-instans (keramaian mal, pejalan kaki kawasan).
export const BAJU = ["#e0703a", "#2563eb", "#16a34a", "#db2777", "#f59e0b", "#7c3aed", "#0f766e", "#f8fafc", "#334155", "#b91c1c", "#0ea5e9", "#a16207"];
export const CELANA = ["#1e3a5f", "#111827", "#374151", "#78350f", "#1f2937", "#3f3f46", "#164e63"];
export const KULIT = ["#d9ad85", "#c68d5e", "#b9824f", "#e0b48a", "#a8703f"];
export const RAMBUT = ["#141010", "#20160f", "#2b1d12", "#3b2a1a"];

export function warnaAcak(r = Math.random) {
	const pilih = (d) => d[Math.floor(r() * d.length)];
	return { baju: pilih(BAJU), celana: pilih(CELANA), kulit: pilih(KULIT), rambut: pilih(RAMBUT) };
}
