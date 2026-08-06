import { formatWaktu, jawabanKeTeks, labelTitikSkala } from "./formulirUtils";
import { SKALA_DIVERGEN, bolehDivergen, keRgb } from "./responsWarna";

/**
 * Ekspor respons formulir ke Excel dan PDF.
 *
 * Keduanya dibuat di browser dari data yang memang sudah dimuat halaman respons,
 * bukan lewat endpoint baru: server sudah mengirimkan seluruh jawaban ke layar
 * ini, jadi membuat berkasnya lagi di sana hanya menggandakan aturan bentuk
 * kolom di dua tempat yang pasti akan berbeda pelan-pelan.
 *
 * Pustakanya (`xlsx`, `jspdf`) dimuat saat tombol ditekan, bukan saat halaman
 * dibuka. Keduanya berat, sementara sebagian besar kunjungan ke halaman ini
 * hanya membaca ringkasan tanpa pernah mengunduh apa pun.
 *
 * Pembagian isi yang disengaja:
 * - Excel = data mentah untuk diolah lagi (satu baris satu responden) + sebaran
 *   dalam bentuk panjang supaya bisa langsung dijadikan pivot.
 * - PDF = dokumen untuk dibaca dan dilampirkan: ringkasan bergrafik lebih dulu,
 *   rincian per responden menyusul. Tabel 25 kolom di kertas A4 tidak terbaca
 *   siapa pun, jadi bentuk itu sengaja tidak dibuat.
 */

const INSTANSI = "Dinas Pemberdayaan Masyarakat dan Desa Kabupaten Bogor";

/** Maksimal responden yang dirinci di PDF; sisanya diarahkan ke Excel. */
const BATAS_RINCIAN_PDF = 60;

const bersihkanNama = (teks) =>
	String(teks || "Formulir")
		.replace(/[\\/:*?"<>|]+/g, "-")
		.replace(/\s+/g, " ")
		.trim()
		.slice(0, 70);

const capTanggal = () => {
	const d = new Date();
	const p = (n) => String(n).padStart(2, "0");
	return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`;
};

const persen = (bagian, total) => (total ? Math.round((bagian / total) * 100) : 0);

/**
 * Satu baris per responden, kolomnya mengikuti urutan pertanyaan.
 * Diurutkan dari yang paling lama: nomor 1 pada rekap berarti responden pertama.
 */
const tabelJawaban = (isi) => {
	const pertanyaan = isi.pertanyaan.filter((p) => p.tipe !== "bagian");
	const respons = [...isi.respons].reverse();

	const kepala = ["No", "Waktu kirim", "Nama", "Email", ...pertanyaan.map((p) => p.label)];
	const baris = respons.map((r, i) => [
		i + 1,
		formatWaktu(r.dikirim_pada),
		r.nama_responden || "",
		r.email || "",
		...pertanyaan.map((p) => {
			const lampiran = r.berkas?.[p.id] || [];
			return lampiran.length ? lampiran.map((b) => b.nama).join(", ") : jawabanKeTeks(r.jawaban?.[p.id]);
		}),
	]);

	return { pertanyaan, respons, kepala, baris };
};

// ============================================================
// Excel
// ============================================================

export const eksporExcel = async (isi, ringkasan) => {
	const XLSX = await import("xlsx");
	const { pertanyaan, kepala, baris } = tabelJawaban(isi);
	const total = ringkasan.total_respons;
	const buku = XLSX.utils.book_new();

	// ---------- Lembar 1: ringkasan ----------
	const ringkas = [
		["Rekap Respons Formulir"],
		[],
		["Judul", isi.formulir.judul],
		["Instansi", INSTANSI],
		["Total respons", total],
		["Jumlah pertanyaan", pertanyaan.length],
		["Diekspor pada", formatWaktu(new Date().toISOString())],
		[],
		["Pertanyaan", "Tipe", "Menjawab", "Rata-rata"],
	];
	for (const p of ringkasan.pertanyaan) {
		ringkas.push([p.label, p.tipe, p.jumlah_jawab, p.rata_rata ?? ""]);
	}
	const wsRingkas = XLSX.utils.aoa_to_sheet(ringkas);
	wsRingkas["!cols"] = [{ wch: 60 }, { wch: 18 }, { wch: 12 }, { wch: 12 }];
	XLSX.utils.book_append_sheet(buku, wsRingkas, "Ringkasan");

	// ---------- Lembar 2: jawaban mentah ----------
	const wsJawaban = XLSX.utils.aoa_to_sheet([kepala, ...baris]);
	wsJawaban["!cols"] = kepala.map((k, i) => {
		if (i === 0) return { wch: 5 };
		if (i === 1) return { wch: 20 };
		if (i <= 3) return { wch: 24 };
		return { wch: Math.min(Math.max(String(k).length + 4, 16), 46) };
	});
	XLSX.utils.book_append_sheet(buku, wsJawaban, "Jawaban");

	// ---------- Lembar 3: sebaran bentuk panjang ----------
	// Bentuk panjang (satu baris = satu opsi) supaya bisa langsung ditarik jadi
	// PivotTable; bentuk lebar terlihat rapi tapi mentok begitu mau diolah.
	const sebaran = [["Pertanyaan", "Tipe", "Jawaban", "Jumlah", "Persen"]];
	for (const p of ringkasan.pertanyaan) {
		if (!p.sebaran) continue;
		for (const d of p.sebaran) {
			sebaran.push([p.label, p.tipe, d.label, d.jumlah, persen(d.jumlah, p.jumlah_jawab) / 100]);
		}
	}
	if (sebaran.length > 1) {
		const wsSebaran = XLSX.utils.aoa_to_sheet(sebaran);
		wsSebaran["!cols"] = [{ wch: 60 }, { wch: 16 }, { wch: 30 }, { wch: 10 }, { wch: 10 }];
		// Kolom persen diberi format persen supaya tidak terbaca sebagai 0,75 butir.
		for (let r = 1; r < sebaran.length; r += 1) {
			const sel = wsSebaran[XLSX.utils.encode_cell({ r, c: 4 })];
			if (sel) sel.z = "0%";
		}
		XLSX.utils.book_append_sheet(buku, wsSebaran, "Sebaran");
	}

	XLSX.writeFile(buku, `Respons - ${bersihkanNama(isi.formulir.judul)} - ${capTanggal()}.xlsx`);
};

// ============================================================
// PDF
// ============================================================

const SLATE_900 = [15, 23, 42];
const SLATE_500 = [100, 116, 139];
const SLATE_400 = [148, 163, 184];
const SLATE_200 = [226, 232, 240];
const SLATE_100 = [241, 245, 249];

export const eksporPdf = async (isi, ringkasan) => {
	const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
		import("jspdf"),
		import("jspdf-autotable"),
	]);

	const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
	const lebarHalaman = doc.internal.pageSize.getWidth();
	const tinggiHalaman = doc.internal.pageSize.getHeight();
	const tepi = 14;
	const lebarIsi = lebarHalaman - tepi * 2;
	const total = ringkasan.total_respons;
	const { pertanyaan, respons } = tabelJawaban(isi);

	let y = 0;

	const halamanBaru = () => {
		doc.addPage();
		y = 18;
	};

	/** Pindah halaman sebelum menggambar sesuatu yang tidak muat lagi. */
	const sediakan = (tinggi) => {
		if (y + tinggi > tinggiHalaman - 16) halamanBaru();
	};

	const tulis = (teks, { ukuran = 9.5, warna = SLATE_900, tebal = false, lebar = lebarIsi, jarak = 4.6 } = {}) => {
		doc.setFont("helvetica", tebal ? "bold" : "normal");
		doc.setFontSize(ukuran);
		doc.setTextColor(...warna);
		const baris = doc.splitTextToSize(String(teks), lebar);
		sediakan(baris.length * jarak);
		doc.text(baris, tepi, y);
		y += baris.length * jarak;
		return baris.length;
	};

	// ---------- Kepala dokumen ----------
	doc.setFillColor(...SLATE_900);
	doc.rect(0, 0, lebarHalaman, 40, "F");

	doc.setFont("helvetica", "bold");
	doc.setFontSize(15);
	doc.setTextColor(255, 255, 255);
	const judul = doc.splitTextToSize(isi.formulir.judul, lebarIsi - 34);
	doc.text(judul.slice(0, 2), tepi, 16);

	doc.setFont("helvetica", "normal");
	doc.setFontSize(8.5);
	doc.setTextColor(203, 213, 225);
	doc.text(INSTANSI.toUpperCase(), tepi, judul.length > 1 ? 29 : 24);
	doc.text(`Diekspor ${formatWaktu(new Date().toISOString())}`, tepi, judul.length > 1 ? 34 : 29);

	// Angka utama di kanan kepala — yang pertama dicari pembaca laporan.
	doc.setFont("helvetica", "bold");
	doc.setFontSize(22);
	doc.setTextColor(255, 255, 255);
	doc.text(String(total), lebarHalaman - tepi, 20, { align: "right" });
	doc.setFont("helvetica", "normal");
	doc.setFontSize(7.5);
	doc.setTextColor(148, 163, 184);
	doc.text("RESPONS", lebarHalaman - tepi, 25, { align: "right" });

	y = 52;

	// ---------- Ringkasan per pertanyaan ----------
	tulis("Ringkasan jawaban", { ukuran: 12, tebal: true });
	y += 3;

	for (const p of ringkasan.pertanyaan) {
		sediakan(24);
		const asal = pertanyaan.find((q) => q.id === p.id);

		tulis(p.label, { ukuran: 9.5, tebal: true, jarak: 4.4 });
		tulis(`${p.jumlah_jawab} dari ${total} responden menjawab${p.rata_rata != null ? ` · rata-rata ${p.rata_rata}` : ""}`, {
			ukuran: 8,
			warna: SLATE_400,
			jarak: 4.2,
		});
		y += 1.5;

		if (p.sebaran && bolehDivergen(p.sebaran.length) && p.tipe === "skala_linier") {
			// Skala 1–4: satu batang bertumpuk divergen, merah ke biru.
			sediakan(14);
			const tinggi = 6;
			let x = tepi;
			for (let i = 0; i < p.sebaran.length; i += 1) {
				const bagian = p.jumlah_jawab ? (p.sebaran[i].jumlah / p.jumlah_jawab) * lebarIsi : 0;
				if (bagian <= 0) continue;
				doc.setFillColor(...keRgb(SKALA_DIVERGEN[i]));
				doc.rect(x, y, bagian, tinggi, "F");
				x += bagian;
			}
			y += tinggi + 3.5;

			doc.setFont("helvetica", "normal");
			doc.setFontSize(7.5);
			const namaTitik = labelTitikSkala(asal?.pengaturan, p.sebaran);
			let xl = tepi;
			for (let i = 0; i < p.sebaran.length; i += 1) {
				const label = `${namaTitik[i].slice(0, 28)}: ${p.sebaran[i].jumlah} (${persen(
					p.sebaran[i].jumlah,
					p.jumlah_jawab
				)}%)`;
				doc.setFillColor(...keRgb(SKALA_DIVERGEN[i]));
				doc.rect(xl, y - 2, 2.4, 2.4, "F");
				doc.setTextColor(...SLATE_500);
				doc.text(label, xl + 3.6, y);
				xl += doc.getTextWidth(label) + 10;
			}
			y += 6;
		} else if (p.sebaran) {
			// Sebaran pilihan: batang mendatar satu warna, angka di ujung kanan.
			for (const d of p.sebaran) {
				sediakan(7);
				const puncak = Math.max(...p.sebaran.map((s) => s.jumlah), 1);
				const lebarLabel = 62;
				const lebarBatang = lebarIsi - lebarLabel - 24;

				doc.setFont("helvetica", "normal");
				doc.setFontSize(8);
				doc.setTextColor(...SLATE_900);
				const teks = doc.splitTextToSize(d.label, lebarLabel - 3)[0];
				doc.text(teks, tepi, y + 2.6);

				doc.setFillColor(...SLATE_100);
				doc.roundedRect(tepi + lebarLabel, y, lebarBatang, 3.4, 1.7, 1.7, "F");
				if (d.jumlah > 0) {
					doc.setFillColor(...SLATE_900);
					doc.roundedRect(tepi + lebarLabel, y, (d.jumlah / puncak) * lebarBatang, 3.4, 1.7, 1.7, "F");
				}

				doc.setTextColor(...SLATE_500);
				doc.text(`${d.jumlah} (${persen(d.jumlah, p.jumlah_jawab)}%)`, lebarHalaman - tepi, y + 2.6, {
					align: "right",
				});
				y += 6;
			}
			y += 2;
		} else if (p.jawaban) {
			const contoh = p.jawaban.slice(0, 10);
			if (!contoh.length) {
				tulis("Belum ada jawaban.", { ukuran: 8, warna: SLATE_400, jarak: 4.2 });
			}
			for (const j of contoh) {
				tulis(`• ${String(j).slice(0, 220)}`, { ukuran: 8, warna: SLATE_500, jarak: 4.2 });
			}
			if (p.jawaban.length > contoh.length) {
				tulis(`+${p.jawaban.length - contoh.length} jawaban lain — lihat rincian atau berkas Excel.`, {
					ukuran: 7.5,
					warna: SLATE_400,
					jarak: 4.2,
				});
			}
			y += 2;
		} else {
			tulis(`${p.jumlah_jawab} berkas terkumpul — hanya bisa diunduh dari aplikasi.`, {
				ukuran: 8,
				warna: SLATE_400,
				jarak: 4.2,
			});
			y += 2;
		}

		doc.setDrawColor(...SLATE_200);
		doc.setLineWidth(0.1);
		sediakan(6);
		doc.line(tepi, y, lebarHalaman - tepi, y);
		y += 6;
	}

	// ---------- Rincian per responden ----------
	if (respons.length) {
		halamanBaru();
		tulis("Rincian per responden", { ukuran: 12, tebal: true });
		if (respons.length > BATAS_RINCIAN_PDF) {
			tulis(
				`Menampilkan ${BATAS_RINCIAN_PDF} responden pertama dari ${respons.length}. Rekap lengkapnya ada di berkas Excel.`,
				{ ukuran: 8, warna: SLATE_400 }
			);
		}
		y += 2;

		respons.slice(0, BATAS_RINCIAN_PDF).forEach((r, i) => {
			const isiBaris = pertanyaan
				.map((p) => {
					const lampiran = r.berkas?.[p.id] || [];
					const nilai = lampiran.length
						? lampiran.map((b) => b.nama).join(", ")
						: jawabanKeTeks(r.jawaban?.[p.id]);
					return [p.label, nilai || "—"];
				})
				.filter(Boolean);

			autoTable(doc, {
				startY: y,
				head: [[`#${i + 1} · ${r.nama_responden || "Tanpa nama"}`, formatWaktu(r.dikirim_pada)]],
				body: isiBaris,
				theme: "grid",
				margin: { left: tepi, right: tepi, top: 18 },
				styles: { fontSize: 8, cellPadding: 1.8, lineColor: SLATE_200, lineWidth: 0.1, textColor: SLATE_900 },
				headStyles: { fillColor: SLATE_900, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8.5 },
				columnStyles: {
					0: { cellWidth: 66, textColor: SLATE_500 },
					1: { cellWidth: "auto" },
				},
			});
			y = doc.lastAutoTable.finalY + 5;
		});
	}

	// ---------- Nomor halaman ----------
	const jumlahHalaman = doc.internal.getNumberOfPages();
	for (let h = 1; h <= jumlahHalaman; h += 1) {
		doc.setPage(h);
		doc.setFont("helvetica", "normal");
		doc.setFontSize(7.5);
		doc.setTextColor(...SLATE_400);
		doc.text(INSTANSI, tepi, tinggiHalaman - 8);
		doc.text(`Halaman ${h} dari ${jumlahHalaman}`, lebarHalaman - tepi, tinggiHalaman - 8, { align: "right" });
	}

	doc.save(`Respons - ${bersihkanNama(isi.formulir.judul)} - ${capTanggal()}.pdf`);
};
