import { useCallback } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Hook to generate correct navigation paths for bidang pages.
 * When accessed from superadmin layout, paths are prefixed with /superadmin/bidang.
 */
export function useBidangPath() {
  const location = useLocation();
  const isSuperadmin = location.pathname.startsWith('/superadmin');

  // useCallback wajib: tanpa ini getPath jadi fungsi baru tiap render, sehingga
  // useEffect/useCallback yang memakainya sebagai dependency ikut berubah tiap
  // render dan memicu fetch berulang tanpa henti.
  const getPath = useCallback(
    (path) => {
      if (!isSuperadmin) return path;

      // /bidang/pmd/... → /superadmin/bidang/pmd/...
      if (path.startsWith('/bidang/')) {
        return `/superadmin${path}`;
      }
      // /sekretariat/..., /kkd/..., /pemdes/... → /superadmin/bidang/...
      return `/superadmin/bidang${path}`;
    },
    [isSuperadmin]
  );

  return { getPath, isSuperadmin };
}
