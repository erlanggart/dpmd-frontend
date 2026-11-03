import api from "../api";
import { API_ENDPOINTS } from "../config/apiConfig";
import { ASAL_SERVER } from "../utils/asalServer";

/**
 * Smart CCTV — jembatan frontend ke /api/smart-cctv.
 *
 * Semua panggilan memakai `api` biasa (sudah membawa Bearer token + interceptor
 * 401). URL stream langsung ke go2rtc (/go2rtc/...) dan ke mesin AI (/ai/...)
 * tidak lewat instance ini: keduanya disajikan oleh proxy dev/nginx sebagai
 * same-origin, bukan oleh Express.
 */

// ---------- Kamera ----------
export const getKamera = () => api.get("/smart-cctv/kamera");
export const getKameraDetail = (id) => api.get(`/smart-cctv/kamera/${id}`);
export const buatKamera = (data) => api.post("/smart-cctv/kamera", data);
export const ubahKamera = (id, data) => api.patch(`/smart-cctv/kamera/${id}`, data);
export const hapusKamera = (id) => api.delete(`/smart-cctv/kamera/${id}`);
export const toggleKamera = (id, aktif) => api.post(`/smart-cctv/kamera/${id}/toggle`, { aktif });
export const testKoneksiKamera = (id) => api.post(`/smart-cctv/kamera/${id}/test`);
export const getStreamUrl = (id) => api.get(`/smart-cctv/kamera/stream-url/${id}`);

// ---------- Peristiwa ----------
export const getPeristiwa = (params) => api.get("/smart-cctv/events", { params });
export const getPeristiwaDetail = (id) => api.get(`/smart-cctv/events/${id}`);
export const ackPeristiwa = (id) => api.patch(`/smart-cctv/events/${id}/ack`);
export const resolvePeristiwa = (id) => api.patch(`/smart-cctv/events/${id}/resolve`);
export const ackSemuaPeristiwa = () => api.post("/smart-cctv/events/ack-all");
export const getStatistik = () => api.get("/smart-cctv/stats");

// ---------- Wajah ----------
export const getWajah = () => api.get("/smart-cctv/faces");
export const buatWajah = (data) => api.post("/smart-cctv/faces", data);
export const ubahWajah = (id, data) => api.patch(`/smart-cctv/faces/${id}`, data);
export const hapusWajah = (id) => api.delete(`/smart-cctv/faces/${id}`);
export const tambahFotoWajah = (id, berkas) => {
  const fd = new FormData();
  fd.append("foto", berkas);
  return api.post(`/smart-cctv/faces/${id}/photos`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
export const recomputeEmbeddings = (id) =>
  api.post(`/smart-cctv/faces/${id}/recompute-embeddings`);

// ---------- Playback DVR ----------
// Catatan: response Playback dari Express (smartCctv.service.js) SUDAH
// menambahkan awalan "/ai" pada stream_url. Pakai apa adanya — jangan
// membungkusnya lagi dengan "/ai" (menyebabkan /ai/ai/... → 404).
export const buatSesiPlayback = (data) => api.post("/smart-cctv/playback/session", data);
export const seekSesiPlayback = (sid, data) =>
  api.post(`/smart-cctv/playback/session/${encodeURIComponent(sid)}/seek`, data);
export const stopSesiPlayback = (sid) =>
  api.post(`/smart-cctv/playback/session/${encodeURIComponent(sid)}/stop`);
export const getKetersediaanPlayback = (params) =>
  api.get("/smart-cctv/playback/availability", { params });

// ---------- URL media (same-origin lewat proxy/nginx) ----------
/** Snapshot peristiwa — perlu Authorization, jadi lewat Express. */
export const urlSnapshotPeristiwa = (id) =>
  `${API_ENDPOINTS.EXPRESS_BASE}/smart-cctv/events/${id}/snapshot`;

/** Snapshot langsung dari mesin AI (tanpa token — dipakai tile live). */
export const urlSnapshotAI = (cameraId) => `/ai/cameras/${cameraId}/stream?fps=1`;

/** MJPEG langsung dari mesin AI (fps opsional; tanpa fps = STREAM_FPS server). */
export const urlMjpegAI = (cameraId, fps) =>
  `/ai/cameras/${cameraId}/stream${fps ? `?fps=${fps}` : ""}`;

/** WebRTC lewat go2rtc (butuh signaling POST dari pemutar). */
export const urlWebRtcGo2rtc = (src) => `/go2rtc/api/webrtc?src=${encodeURIComponent(src)}`;

/** Asal absolut — hanya untuk keperluan yang butuh origin penuh. */
export const asalServerCctv = ASAL_SERVER;

// ---------- Hak akses Smart CCTV (diatur superadmin) ----------
export const getAksesSaya = () => api.get("/smart-cctv/akses/saya");
export const getDaftarAkses = () => api.get("/smart-cctv/akses");
export const aturAkses = (userId, data) => api.put(`/smart-cctv/akses/${userId}`, data);
export const aturAksesMassal = (data) => api.put("/smart-cctv/akses", data);
export const getRiwayatAkses = () => api.get("/smart-cctv/akses/riwayat");
