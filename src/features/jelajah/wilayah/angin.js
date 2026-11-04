import { MeshStandardMaterial } from "three";

/*
 * Bahan yang bergoyang tertiup angin (padi, rumput, daun). Puncak geometri
 * (y lokal tinggi) bergeser, pangkal diam; fase mengikuti posisi dunia supaya
 * hamparan bergelombang seperti padi di sawah. Satu seragam waktu untuk semua.
 */
export const waktuAngin = { value: 0 };
export const kuatAngin = { value: 1 };

/** @param tinggi tinggi geometri (pangkal di -tinggi/2 bila `tengah`, di 0 bila tidak) */
export function bahanAngin(param, { kuat = 0.12, tinggi = 1, tengah = true } = {}) {
	const m = new MeshStandardMaterial(param);
	m.onBeforeCompile = (sh) => {
		sh.uniforms.uAngin = waktuAngin;
		sh.uniforms.uKuat = kuatAngin;
		sh.vertexShader = "uniform float uAngin;\nuniform float uKuat;\n" + sh.vertexShader.replace(
			"#include <begin_vertex>",
			`#include <begin_vertex>
			{
				vec3 dasarA = vec3(0.0);
				#ifdef USE_INSTANCING
					dasarA = instanceMatrix[3].xyz;
				#endif
				vec4 duniaA = modelMatrix * vec4(dasarA, 1.0);
				float hA = clamp((position.y ${tengah ? `+ ${(tinggi / 2).toFixed(3)}` : ""}) / ${tinggi.toFixed(3)}, 0.0, 1.0);
				hA = hA * hA;
				float gA = sin(uAngin * 1.6 + duniaA.x * 0.31 + duniaA.z * 0.17) * 0.65 + sin(uAngin * 3.1 + duniaA.x * 0.9 - duniaA.z * 0.4) * 0.35;
				transformed.x += gA * hA * ${kuat.toFixed(3)} * uKuat;
				transformed.z += (gA * 0.5 + 0.25) * hA * ${kuat.toFixed(3)} * 0.6 * uKuat;
			}`,
		);
	};
	m.customProgramCacheKey = () => `angin-${kuat}-${tinggi}-${tengah}`;
	return m;
}
