// Menyatukan ejaan jenjang pendidikan aparatur dari dua sumber data (isian
// desa dan arsip Dapur Desa) menjadi satu label. Dipakai halaman Bidang Pemdes
// dan halaman aparatur akun kecamatan, supaya keduanya mengelompokkan sama.
//
// Urutan pengujian penting: yang paling spesifik lebih dulu, kalau tidak
// "STRATA II" akan tertangkap duluan oleh pola "STRATA I".
export const JENJANG = [
	{ label: 'S3', order: 8, match: /^s-?3\b|strata\s*iii\b|doktor/i },
	{ label: 'S2', order: 7, match: /^s-?2\b|strata\s*ii\b|magister|pasca\s*sarjana/i },
	{ label: 'S1 / Diploma IV', order: 6, match: /^s-?1\b|^d-?4\b|strata\s*i\b|diploma\s*iv\b|sarjana/i },
	{ label: 'Diploma III', order: 5, match: /^d-?3\b|diploma\s*iii\b|sarjana\s*muda|s\.\s*muda/i },
	{ label: 'Diploma I-II', order: 4, match: /^d-?[12]\b|diploma\s*i{1,2}\b/i },
	{ label: 'SMA / SMK / Sederajat', order: 3, match: /^(sma|smk|slta|stm|smea|man|ma)\b/i },
	{ label: 'SMP / Sederajat', order: 2, match: /^(smp|sltp|mts)\b/i },
	{ label: 'SD / Sederajat', order: 1, match: /^(sd|mi)\b|sekolah\s*dasar/i },
];

export const jenjangKey = (raw) => {
	const value = String(raw).trim();
	for (const item of JENJANG) {
		if (item.match.test(value)) return item;
	}
	return { label: value, order: 99 };
};
