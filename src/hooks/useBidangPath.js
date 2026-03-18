import { useLocation } from 'react-router-dom';

/**
 * Hook to generate correct navigation paths for bidang pages.
 * When accessed from superadmin layout, paths are prefixed with /superadmin/bidang.
 */
export function useBidangPath() {
  const location = useLocation();
  const isSuperadmin = location.pathname.startsWith('/superadmin');

  const getPath = (path) => {
    if (!isSuperadmin) return path;

    // /bidang/pmd/... → /superadmin/bidang/pmd/...
    if (path.startsWith('/bidang/')) {
      return `/superadmin${path}`;
    }
    // /sekretariat/..., /kkd/..., /pemdes/... → /superadmin/bidang/...
    return `/superadmin/bidang${path}`;
  };

  return { getPath, isSuperadmin };
}
