// Util frontend untuk blokir "tanggal merah" (weekend / libur nasional)
// pada date picker generate Berita Acara & Surat Pengantar.
import api from '../api';

const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

// Cache sederhana per tahun agar tidak fetch berulang dalam satu sesi
const _cache = new Map();

/**
 * Ambil daftar hari libur (Map tanggal 'YYYY-MM-DD' -> keterangan).
 * @param {number} [tahun]
 * @returns {Promise<Map<string,string>>}
 */
export async function fetchHariLibur(tahun) {
  const key = tahun || 'all';
  if (_cache.has(key)) return _cache.get(key);
  try {
    const res = await api.get('/hari-libur', { params: tahun ? { tahun } : {} });
    const map = new Map();
    (res.data?.data || []).forEach((h) => map.set(h.tanggal, h.keterangan));
    _cache.set(key, map);
    return map;
  } catch (e) {
    console.error('Gagal memuat hari libur:', e);
    return new Map();
  }
}

/** Hapus cache (panggil setelah admin mengubah data hari libur). */
export function clearHariLiburCache() {
  _cache.clear();
}

function isWeekend(ymd) {
  if (!ymd) return false;
  const day = new Date(`${ymd}T00:00:00`).getDay();
  return day === 0 || day === 6;
}

/**
 * Cek apakah sebuah tanggal merupakan tanggal merah.
 * @param {string} ymd 'YYYY-MM-DD'
 * @param {Map<string,string>} liburMap
 * @returns {{merah: boolean, alasan: string|null}}
 */
export function cekTanggalMerah(ymd, liburMap) {
  if (!ymd) return { merah: false, alasan: null };
  if (isWeekend(ymd)) {
    const day = new Date(`${ymd}T00:00:00`).getDay();
    return { merah: true, alasan: `Hari ${HARI[day]} (akhir pekan)` };
  }
  if (liburMap && liburMap.has(ymd)) {
    return { merah: true, alasan: `Hari libur: ${liburMap.get(ymd)}` };
  }
  return { merah: false, alasan: null };
}

/**
 * Pasang guard pada <input type="date"> di dalam dialog SweetAlert:
 * - menampilkan peringatan inline & mengosongkan input bila tanggal merah dipilih.
 * Mengembalikan fungsi validator untuk dipakai di preConfirm.
 * @param {string} inputId id elemen input
 * @param {Map<string,string>} liburMap
 * @param {string} [labelDok] label dokumen untuk pesan (mis. "Berita Acara")
 * @returns {() => {valid: boolean, value: string, alasan: string|null}}
 */
export function attachTanggalMerahGuard(inputId, liburMap, labelDok = 'dokumen') {
  const input = document.getElementById(inputId);
  if (!input) return () => ({ valid: true, value: '', alasan: null });

  // Sisipkan elemen peringatan tepat di bawah input
  let warn = document.getElementById(`${inputId}-warn`);
  if (!warn) {
    warn = document.createElement('p');
    warn.id = `${inputId}-warn`;
    warn.style.cssText = 'color:#dc2626;font-size:12px;margin-top:6px;text-align:left;display:none;';
    input.insertAdjacentElement('afterend', warn);
  }

  const evaluate = () => {
    const val = input.value;
    const { merah, alasan } = cekTanggalMerah(val, liburMap);
    if (merah) {
      warn.textContent = `⚠ Tanggal ${labelDok} tidak boleh tanggal merah (${alasan}). Pilih hari kerja.`;
      warn.style.display = 'block';
      input.style.borderColor = '#dc2626';
    } else {
      warn.style.display = 'none';
      input.style.borderColor = '';
    }
    return { merah, alasan, val };
  };

  input.addEventListener('change', evaluate);
  // Evaluasi nilai default saat dibuka
  evaluate();

  return () => {
    const { merah, alasan, val } = evaluate();
    return { valid: !merah, value: val, alasan };
  };
}
