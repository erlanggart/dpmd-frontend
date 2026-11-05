import { Color, Vector3 } from "three";

// Keadaan langit kantor saat ini, sudah termasuk mendung; ditulis SiangMalam.jsx tiap frame, dibaca
// Langit.jsx. `arah` menuju matahari (y < 0 = di bawah cakrawala).
export const langit = { atas: new Color(), cakrawala: new Color(), kabut: new Color(), cahaya: new Color(), arah: new Vector3(0, 1, 0) };
