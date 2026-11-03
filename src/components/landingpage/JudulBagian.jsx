/* Judul bagian landing page: judul besar rata kiri, keterangan di sampingnya.
   Kata-kata judul naik dari balik garis saat slide didatangi (lihat dek.css). */
export function KataNaik({ teks, mulai = 0 }) {
	return String(teks).split(" ").map((k, i, semua) => (
		<span key={i} className="inline-block overflow-hidden pb-[0.1em] align-bottom">
			<span data-masuk="kata" style={{ "--urut": mulai + i }}>{k}{i < semua.length - 1 ? " " : ""}</span>
		</span>
	));
}

export default function JudulBagian({ judul, keterangan, className = "" }) {
	return (
		<div className={`mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_1.1fr] lg:items-end ${className}`}>
			<h2 className="m-0 text-[clamp(2.25rem,4.5vw,3.75rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-[#eef2f7]"><KataNaik teks={judul} /></h2>
			{keterangan && <p data-masuk style={{ "--urut": 3 }} className="m-0 max-w-xl text-[17px] leading-relaxed text-[#94a3b8]">{keterangan}</p>}
		</div>
	);
}
