import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { BackSide, Color, ShaderMaterial, SphereGeometry, Vector2, Vector3 } from "three";
import { SUDUT_UTARA } from "./kawasanData";
import { suasana } from "./suasana";
import { langit } from "./warnaLangit";

// Langit kawasan kantor dalam satu kubah (satu draw call, tanpa tekstur): gradasi mengikuti jam,
// matahari, awan prosedural yang diterangi arah matahari, punggungan gunung di cakrawala, bintang
// dan bulan. Warna & arah dari SiangMalam.jsx. Dunia kecamatan punya langit sendiri.
//
// Kubah digambar SETELAH benda padat (renderOrder 1, depth test tetap jalan), supaya awan yang
// lumayan berat hanya dihitung di piksel langit yang benar-benar terlihat.

const JARI = 390; // di dalam far kamera kantor (400)
const GEO = new SphereGeometry(JARI, 32, 16);

// Arah di adegan (sin a, cos a); selaras dengan arahPeta di ui/MinimapKabupaten.jsx.
const SELATAN = -SUDUT_UTARA + Math.PI;

const VERTEX = /* glsl */ `
varying vec3 vArah;
void main() {
	vArah = position;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;

const FRAGMENT = /* glsl */ `
precision highp float;
varying vec3 vArah;
uniform vec3 uAtas, uCakrawala, uKabut, uCahaya, uArah;
uniform vec2 uAngin, uSalak, uGede;
uniform float uHujan, uMalam;

float acak(vec2 p) {
	p = fract(p * vec2(123.34, 456.21));
	p += dot(p, p + 45.32);
	return fract(p.x * p.y);
}
float derau(vec2 p) {
	vec2 i = floor(p), f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(acak(i), acak(i + vec2(1.0, 0.0)), f.x), mix(acak(i + vec2(0.0, 1.0)), acak(i + vec2(1.0, 1.0)), f.x), f.y);
}
const mat2 PUTAR = mat2(1.6, 1.2, -1.2, 1.6);
float fbm5(vec2 p) {
	float s = 0.0, a = 0.5;
	for (int i = 0; i < 5; i++) { s += a * derau(p); p = PUTAR * p; a *= 0.5; }
	return s;
}
float fbm3(vec2 p) {
	float s = 0.0, a = 0.5;
	for (int i = 0; i < 3; i++) { s += a * derau(p); p = PUTAR * p; a *= 0.5; }
	return s / 0.875;
}
// puncak berbahu lebar: sudut datar (lewat kosinus, jadi tanpa sambungan di ±180°)
float puncak(vec2 datar, vec2 arah, float tinggi, float lebar) {
	float d = 1.0 - dot(datar, arah);
	return tinggi * exp(-d / lebar);
}

void main() {
	vec3 d = normalize(vArah);
	float naik = max(d.y, 0.0);
	vec3 w = mix(uCakrawala, uAtas, pow(naik, 0.42));
	// tone mapping meredupkan warna: langit atas diangkat, cakrawala tetap sama dengan kabut gedung
	w *= 1.0 + 0.55 * smoothstep(0.02, 0.5, naik);

	// matahari: cakram & pendar, memudar saat mendung dan di bawah cakrawala
	float m = max(dot(d, uArah), 0.0);
	float tampak = (1.0 - uHujan) * smoothstep(-0.07, 0.03, uArah.y);
	float rendah = 1.0 - smoothstep(0.0, 0.35, uArah.y); // makin rendah makin lebar & jingga
	w += uCahaya * (pow(m, 90.0) * 0.55 + pow(m, 7.0) * (0.14 + rendah * 0.42)) * tampak;
	w += uCahaya * rendah * exp(-naik * 8.0) * 0.4 * (1.0 - uHujan) * smoothstep(-0.2, 0.0, uArah.y); // sabuk jingga sepanjang cakrawala
	w = mix(w, vec3(4.0, 3.5, 2.6) * mix(vec3(1.0), uCahaya, rendah), smoothstep(0.99925, 0.99965, m) * tampak);

	// bintang & bulan
	float gelap = smoothstep(0.45, 1.0, uMalam) * (1.0 - uHujan);
	if (gelap > 0.01 && d.y > 0.0) {
		vec2 g = d.xz / (d.y + 0.5) * 150.0;
		vec2 id = floor(g);
		float r = acak(id);
		w += vec3(0.9, 0.93, 1.0) * step(0.982, r) * smoothstep(0.2, 0.04, length(fract(g) - 0.5)) * (r - 0.982) * 110.0 * gelap * smoothstep(0.03, 0.25, d.y);
		float b = dot(d, -uArah);
		w = mix(w, vec3(0.92, 0.94, 0.9) * (0.85 + 0.15 * derau(d.xz * 90.0)), smoothstep(0.99905, 0.9994, b) * gelap);
		w += vec3(0.55, 0.62, 0.8) * pow(max(b, 0.0), 180.0) * 0.28 * gelap;
	}

	// awan: lapisan datar berperspektif; sisi menghadap matahari lebih terang
	if (d.y > 0.004) {
		vec2 uv = d.xz / (d.y + 0.2) * 1.5 + uAngin;
		uv += vec2(derau(uv * 0.5), derau(uv * 0.5 + 7.3)) * 0.8; // gumpalan tidak seragam
		// massa awan besar dipahat oleh rincian halus: tepi berbunga seperti kumulus
		float massa = derau(uv * 0.42 + 3.7);
		float n = fbm5(uv) * 0.72 + massa * 0.38;
		float ambang = mix(0.56, 0.3, uHujan);
		float tebal = smoothstep(ambang, ambang + 0.13, n);
		if (tebal > 0.002) {
			float depan = fbm3(uv + normalize(uArah.xz + vec2(0.001)) * 0.2);
			// dasar awan yang tebal lebih gelap, sisi menghadap matahari terang
			float terang = clamp((n - depan) * 2.6 + 0.78 - smoothstep(ambang + 0.1, ambang + 0.34, n) * 0.5, 0.0, 1.0);
			vec3 sinarAwan = mix(vec3(1.0), uCahaya * vec3(1.2, 1.0, 0.92), rendah * (1.0 - uMalam) * 0.9);
			vec3 awanTerang = mix(sinarAwan * mix(2.4, 1.35, rendah) * (1.0 - uHujan * 0.65), vec3(0.2, 0.25, 0.35), uMalam);
			vec3 awanGelap = mix(mix(uAtas, uCakrawala, 0.6) * 0.95, vec3(0.08, 0.1, 0.15), uMalam * 0.7);
			vec3 warna = mix(awanGelap, awanTerang, terang);
			warna = mix(warna, mix(vec3(0.3, 0.33, 0.38), vec3(0.06, 0.07, 0.1), uMalam), uHujan * 0.75);
			warna += uCahaya * pow(m, 18.0) * 0.45 * tampak; // tepi bercahaya di dekat matahari
			w = mix(w, warna, tebal * 0.96 * smoothstep(0.004, 0.14, d.y));
		}
	}

	// gunung: punggungan berlapis kabut, Salak & Gede-Pangrango di selatan, bukit rendah di utara
	vec2 datar = normalize(d.xz + vec2(0.0001));
	vec2 dn = datar * 5.0;
	float kasar = fbm3(dn + 3.1);
	float halus = derau(datar * 34.0) * 0.5 + derau(datar * 71.0) * 0.5;
	float selatan = dot(datar, normalize(uSalak + uGede)) * 0.5 + 0.5;
	float jauh = puncak(datar, uSalak, 0.082, 0.05) + puncak(datar, uGede, 0.092, 0.06) + 0.012 + 0.03 * selatan * kasar + 0.005 * halus;
	float dekat = 0.006 + selatan * 0.024 * fbm3(dn * 1.9 + 11.0) + (1.0 - selatan) * 0.012 * kasar + 0.003 * halus;
	float aa = 0.0016;
	if (d.y < jauh + aa) {
		// di kaki gunung warnanya melebur ke kabut cakrawala
		vec3 warna = mix(uKabut, uAtas * vec3(0.72, 0.8, 0.82), 0.58);
		warna = mix(uKabut, warna, smoothstep(0.0, 0.05, d.y) * 0.45 + 0.55);
		warna *= 0.97 + 0.06 * halus;
		w = mix(w, warna, smoothstep(jauh + aa, jauh - aa, d.y));
	}
	if (d.y < dekat + aa) {
		vec3 warna = mix(uKabut, uAtas * vec3(0.5, 0.62, 0.55), 0.78);
		warna = mix(uKabut, warna, smoothstep(0.0, 0.02, d.y));
		warna *= 0.95 + 0.1 * derau(datar * 90.0);
		w = mix(w, warna, smoothstep(dekat + aa, dekat - aa, d.y));
	}
	if (d.y < 0.0) w = uKabut;

	gl_FragColor = vec4(w, 1.0);
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`;

function buatBahan() {
	return new ShaderMaterial({
		vertexShader: VERTEX,
		fragmentShader: FRAGMENT,
		side: BackSide,
		depthWrite: false,
		fog: false,
		uniforms: {
			uAtas: { value: new Color() },
			uCakrawala: { value: new Color() },
			uKabut: { value: new Color() },
			uCahaya: { value: new Color() },
			uArah: { value: new Vector3(0, 1, 0) },
			uAngin: { value: new Vector2() },
			uSalak: { value: new Vector2(Math.sin(SELATAN - 0.6), Math.cos(SELATAN - 0.6)) },
			uGede: { value: new Vector2(Math.sin(SELATAN + 0.52), Math.cos(SELATAN + 0.52)) },
			uHujan: { value: 0 },
			uMalam: { value: 0 },
		},
	});
}

export default function Langit() {
	const ref = useRef();
	const bahan = useMemo(buatBahan, []);
	useEffect(() => () => bahan.dispose(), [bahan]);

	useFrame(({ camera }, dt) => {
		const u = bahan.uniforms;
		u.uAtas.value.copy(langit.atas);
		u.uCakrawala.value.copy(langit.cakrawala);
		u.uKabut.value.copy(langit.kabut);
		u.uCahaya.value.copy(langit.cahaya);
		u.uArah.value.copy(langit.arah);
		u.uHujan.value = suasana.hujan;
		u.uMalam.value = suasana.malam;
		// angin berembus pelan, lebih kencang saat hujan
		u.uAngin.value.x += dt * 0.007 * (1 + suasana.hujan * 1.5);
		u.uAngin.value.y += dt * 0.0025 * (1 + suasana.hujan * 1.5);
		ref.current.position.copy(camera.position);
	});

	return <mesh ref={ref} geometry={GEO} material={bahan} frustumCulled={false} renderOrder={1} />;
}
