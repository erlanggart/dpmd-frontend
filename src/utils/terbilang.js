// Convert angka → terbilang (Indonesian)
// Contoh: 1473000 → "Satu Juta Empat Ratus Tujuh Puluh Tiga Ribu"

const ANGKA = [
  '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima',
  'Enam', 'Tujuh', 'Delapan', 'Sembilan',
];

function terbilangRecursive(n) {
  if (n < 12) return ANGKA[n];
  if (n < 20) return terbilangRecursive(n - 10) + ' Belas';
  if (n < 100) {
    const puluh = Math.floor(n / 10);
    const sisa = n % 10;
    return ANGKA[puluh] + ' Puluh' + (sisa ? ' ' + ANGKA[sisa] : '');
  }
  if (n < 200) return 'Seratus' + (n - 100 ? ' ' + terbilangRecursive(n - 100) : '');
  if (n < 1000) {
    const ratus = Math.floor(n / 100);
    const sisa = n % 100;
    return ANGKA[ratus] + ' Ratus' + (sisa ? ' ' + terbilangRecursive(sisa) : '');
  }
  if (n < 2000) return 'Seribu' + (n - 1000 ? ' ' + terbilangRecursive(n - 1000) : '');
  if (n < 1_000_000) {
    const ribu = Math.floor(n / 1000);
    const sisa = n % 1000;
    return terbilangRecursive(ribu) + ' Ribu' + (sisa ? ' ' + terbilangRecursive(sisa) : '');
  }
  if (n < 1_000_000_000) {
    const juta = Math.floor(n / 1_000_000);
    const sisa = n % 1_000_000;
    return terbilangRecursive(juta) + ' Juta' + (sisa ? ' ' + terbilangRecursive(sisa) : '');
  }
  if (n < 1_000_000_000_000) {
    const milyar = Math.floor(n / 1_000_000_000);
    const sisa = n % 1_000_000_000;
    return terbilangRecursive(milyar) + ' Milyar' + (sisa ? ' ' + terbilangRecursive(sisa) : '');
  }
  // Triliun
  const triliun = Math.floor(n / 1_000_000_000_000);
  const sisa = n % 1_000_000_000_000;
  return terbilangRecursive(triliun) + ' Triliun' + (sisa ? ' ' + terbilangRecursive(sisa) : '');
}

export function terbilang(angka) {
  const n = Math.abs(Math.floor(Number(angka) || 0));
  if (n === 0) return 'Nol Rupiah';
  return terbilangRecursive(n).replace(/\s+/g, ' ').trim() + ' Rupiah';
}

export function terbilangKapital(angka) {
  return terbilang(angka)
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default terbilang;
