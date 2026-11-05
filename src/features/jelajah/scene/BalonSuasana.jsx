import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { kirimUcap } from "../multipemain";
import { tenaga } from "../tenaga";
import { kabarBalon as kabar, sapaBalon, useBalon } from "./balonKata";

// Di bawah tenaga ini tokoh mulai mengeluh lapar (sebelum lemas di TENAGA_LARI).
const BATAS_LAPAR = 35;
const JEDA_LAPAR = 45000;
const KELUHAN_LAPAR = [
	"Waduh, perut udah konser nih 🎶 Makan dulu yuk!",
	"Lapar euy... mie ayam kayaknya enak 🍜",
	"Cacing di perut mulai demo, nih 😅",
	"Isi bensin dulu ah, perut keroncongan 🍚",
	"Kayaknya aku butuh pecel ayam sekarang juga 🍗",
];

// `pemain`: posisi tokoh sendiri ({ x, y, z }, kantor atau dunia kecamatan), asal balon lapar.
export default function BalonSuasana({ pemain }) {
	const sprite = useRef();
	const balon = useBalon();
	const laparLagi = useRef(0);
	useFrame(() => {
		const kini = performance.now();
		if (tenaga.nilai > 0 && tenaga.nilai < BATAS_LAPAR && kini > laparLagi.current && !pemain.kend) {
			laparLagi.current = kini + JEDA_LAPAR;
			const teks = KELUHAN_LAPAR[Math.floor(Math.random() * KELUHAN_LAPAR.length)];
			// saat main bareng balonnya lewat server, supaya teman ikut membaca
			if (!kirimUcap(teks)) sapaBalon(teks, pemain);
		}
		const sp = sprite.current;
		sp.visible = kini < kabar.sampai;
		if (!sp.visible) return;
		if (kabar.baru) {
			kabar.baru = false;
			balon.tulis({ ucapan: kabar.teks });
		}
		sp.position.set(kabar.sumber.x, (pemain.yTampil ?? pemain.y ?? 0) + 2.9, kabar.sumber.z);
	});
	return (
		<sprite ref={sprite} scale={[2.8, 1.4, 1]} visible={false} renderOrder={10}>
			<spriteMaterial map={balon.tekstur} transparent depthTest={false} />
		</sprite>
	);
}
