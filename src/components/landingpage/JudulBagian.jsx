/* Judul bagian landing page: judul besar rata kiri, keterangan di sampingnya. */
export default function JudulBagian({ judul, keterangan, className = "" }) {
	return (
		<div className={`mx-auto grid max-w-6xl gap-5 lg:grid-cols-[1fr_1.1fr] lg:items-end ${className}`}>
			<h2 className="m-0 text-[clamp(2.25rem,4.5vw,3.75rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-[#eef2f7]">{judul}</h2>
			{keterangan && <p className="m-0 max-w-xl text-[17px] leading-relaxed text-[#94a3b8]">{keterangan}</p>}
		</div>
	);
}
