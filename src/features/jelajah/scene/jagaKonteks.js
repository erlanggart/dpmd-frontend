// Konteks biasanya pulih sendiri (three.js menanganinya); yang dijaga kasus tidak pulih, misalnya HP kehabisan memori GPU.
export function jagaKonteks(gl, onHilang, tunggu = 6000) {
	const k = gl.domElement;
	let t;
	k.addEventListener("webglcontextlost", () => {
		t = setTimeout(onHilang, tunggu);
	});
	k.addEventListener("webglcontextrestored", () => clearTimeout(t));
}
