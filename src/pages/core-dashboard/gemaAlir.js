// Klien SSE untuk /gema/tanya-alir: jawaban Gema mengalir per token.
// Header meniru interceptor di src/api.js (Authorization dari ambilToken).
import { API_ENDPOINTS } from '../../config/apiConfig';
import { ambilToken } from '../../utils/tokenSesi';

const cadangan = (pesan) => Object.assign(new Error(pesan), { cadangan: true });

/**
 * Resolve dengan objek hasil lengkap (event `selesai`).
 * Galat bertanda `cadangan` = alir tidak tersedia, pemanggil boleh jatuh ke /gema/tanya.
 */
export const tanyaAlir = async ({ teks, sesi, onToken, onReset, signal }) => {
	const headers = { 'Content-Type': 'application/json', Accept: 'text/event-stream' };
	const token = ambilToken();
	if (token && token !== 'VPN_ACCESS_TOKEN') headers.Authorization = `Bearer ${token}`;

	let respons;
	try {
		respons = await fetch(`${API_ENDPOINTS.EXPRESS_BASE}/gema/tanya-alir`, {
			method: 'POST',
			headers,
			body: JSON.stringify({ teks, sesi }),
			signal,
		});
	} catch (e) {
		if (signal?.aborted) throw e; // dibatalkan/timeout, bukan alasan untuk cadangan
		throw cadangan('Gema tidak terhubung');
	}
	if (!respons.ok || !(respons.headers.get('content-type') || '').includes('text/event-stream') || !respons.body) {
		throw cadangan(`Alir tidak tersedia (${respons.status})`);
	}

	const pembaca = respons.body.getReader();
	const dekoder = new TextDecoder();
	let sisa = '';
	let adaEvent = false;

	// Mengembalikan hasil bila event `selesai` tiba, selain itu undefined.
	const proses = (blok) => {
		let nama = 'message';
		const data = [];
		for (const baris of blok.split(/\r?\n/)) {
			if (!baris || baris.startsWith(':')) continue;
			if (baris.startsWith('event:')) nama = baris.slice(6).trim();
			else if (baris.startsWith('data:')) data.push(baris.slice(5).replace(/^ /, ''));
		}
		if (!data.length) return undefined;
		adaEvent = true;
		let isi = {};
		try { isi = JSON.parse(data.join('\n')); } catch { /* data rusak: anggap kosong */ }
		if (nama === 'token') onToken?.(isi.t || '');
		else if (nama === 'reset') onReset?.();
		else if (nama === 'galat') throw Object.assign(new Error(isi.message || 'Gema gagal menjawab'), { dariServer: true });
		else if (nama === 'selesai') return { hasil: isi };
		return undefined;
	};

	try {
		for (;;) {
			const { done, value } = await pembaca.read();
			if (done) break;
			sisa += dekoder.decode(value, { stream: true });
			const blok = sisa.split(/\r?\n\r?\n/);
			sisa = blok.pop();
			for (const b of blok) {
				const h = proses(b);
				if (h) return h.hasil;
			}
		}
	} catch (e) {
		if (e.dariServer || signal?.aborted) throw e;
		if (!adaEvent) throw cadangan('Alir terputus');
		throw new Error('Koneksi Gema terputus');
	} finally {
		pembaca.cancel().catch(() => {});
	}
	throw adaEvent ? new Error('Koneksi Gema terputus') : cadangan('Alir kosong');
};
