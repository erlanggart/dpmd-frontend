// Konteks biasanya pulih sendiri (three.js menanganinya); yang dijaga kasus tidak pulih, misalnya HP kehabisan memori GPU.
export function jagaKonteks(gl, onHilang, tunggu = 6000) {
	const k = gl.domElement;
	let t;
	k.addEventListener("webglcontextlost", () => {
		// R3F sengaja menghapus konteks saat Canvas dibongkar (pindah ke dunia kecamatan & kembali): itu bukan kegagalan
		t = setTimeout(() => k.isConnected && onHilang(), tunggu);
	});
	k.addEventListener("webglcontextrestored", () => clearTimeout(t));
}
