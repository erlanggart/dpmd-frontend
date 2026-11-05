// urutan nyala 12 jendela, sengaja acak supaya terasa gedung yang mulai hidup
const URUTAN_JENDELA = Array.from({ length: 12 }, (_, i) => (i * 5) % 12);

// Tampil sampai bingkai 3D pertama selesai. Animasinya hanya boleh memakai opacity/transform:
// saat adegan disusun main thread terkunci berdetik-detik, hanya compositor yang tetap jalan.
export default function LayarMemuat({ selesai = false }) {
	return (
		<div
			data-layar-memuat
			role="status"
			className={`fixed inset-0 z-[70] flex flex-col items-center justify-center gap-6 bg-[rgb(var(--color-primary))] px-6 text-center text-white transition-[opacity,visibility] duration-500 ${selesai ? "invisible opacity-0" : ""}`}
		>
			<style>{"@keyframes jendela-nyala{0%,100%{opacity:.12}45%,60%{opacity:1}}"}</style>
			<div aria-hidden="true" className="flex flex-col items-center">
				<div className="h-0 w-0 border-x-[76px] border-b-[26px] border-x-transparent border-b-[rgb(var(--color-secondary))]" />
				<div className="grid w-32 grid-cols-4 gap-2 bg-white/10 p-3">
					{URUTAN_JENDELA.map((urut) => (
						<span
							key={urut}
							className="h-5 rounded-sm bg-[rgb(var(--color-secondary))] animate-[jendela-nyala_1.9s_ease-in-out_infinite] motion-reduce:animate-none"
							style={{ animationDelay: `-${urut * 0.16}s` }}
						/>
					))}
				</div>
				<div className="h-1 w-40 rounded-full bg-white/30" />
			</div>
			<div>
				<p className="font-semibold">Sedang menyiapkan jelajah…</p>
				<p className="mt-1 text-xs text-white/70">Butuh beberapa saat, mohon tunggu</p>
			</div>
		</div>
	);
}
