import { useLayoutEffect, useRef } from "react";
import { Color, Object3D } from "three";

const kosong = new Object3D();

/** banyak benda sama dalam satu draw call; titik = [x, y, z, skala, putarY, skalaY?] */
export default function Banyak({ titik, children, warna, material, bayangan = true }) {
	const ref = useRef();
	useLayoutEffect(() => {
		if (!titik.length) return;
		const c = new Color();
		titik.forEach(([x, y, z, s = 1, ry = 0, sy], i) => {
			kosong.position.set(x, y, z);
			kosong.rotation.set(0, ry, 0);
			kosong.scale.set(s, sy ?? s, s);
			kosong.updateMatrix();
			ref.current.setMatrixAt(i, kosong.matrix);
			if (warna) ref.current.setColorAt(i, c.set(warna[i % warna.length]));
		});
		ref.current.instanceMatrix.needsUpdate = true;
		if (ref.current.instanceColor) ref.current.instanceColor.needsUpdate = true;
		ref.current.computeBoundingSphere();
	}, [titik, warna]);
	if (!titik.length) return null;
	return <instancedMesh ref={ref} args={[null, material || null, titik.length]} castShadow={bayangan} receiveShadow>{children}</instancedMesh>;
}
