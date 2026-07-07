// Shared fetch for SIPANDA Kab. Bogor penyaluran dana desa.
// One network call is shared across all KKD pages (ADD/DD/BHPRD/BANKEU/BP)
// via a module-level cache, then each page filters by sumber_dana client-side.
import { useState, useEffect, useCallback } from 'react';

export const SIPANDA_URL =
  'https://sipanda-bogorkab.smartvillage.info/2026/index.php/api/DashboardController/dashboard';

let cache = null;     // rows[]
let cachedAt = 0;     // ms
let inflight = null;  // Promise<rows[]>
const TTL = 5 * 60 * 1000; // ponytail: 5-min TTL, bump if data must be fresher

function load(force = false) {
  const fresh = cache && Date.now() - cachedAt < TTL;
  if (!force && fresh) return Promise.resolve(cache);
  if (!force && inflight) return inflight;

  inflight = fetch(SIPANDA_URL, { headers: { Accept: 'application/json' } })
    .then((r) => {
      if (!r.ok) throw new Error(`SIPANDA HTTP ${r.status}`);
      return r.json();
    })
    .then((json) => {
      if (!json || json.status !== true || !Array.isArray(json.data)) {
        throw new Error('Format data SIPANDA tidak valid');
      }
      cache = json.data;
      cachedAt = Date.now();
      inflight = null;
      return cache;
    })
    .catch((err) => {
      inflight = null;
      throw err;
    });
  return inflight;
}

export function useSipanda() {
  const [rows, setRows] = useState(cache || []);
  const [loading, setLoading] = useState(!cache);
  const [error, setError] = useState(null);

  const reload = useCallback((force = false) => {
    setLoading(true);
    setError(null);
    load(force)
      .then((d) => { setRows(d); setLoading(false); })
      .catch((e) => { setError(e.message || 'Gagal memuat data SIPANDA'); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!cache || Date.now() - cachedAt >= TTL) reload();
    else { setRows(cache); setLoading(false); }
  }, [reload]);

  return { rows, loading, error, reload, updatedAt: cachedAt };
}
