// src/App.jsx
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
  Outlet,
} from "react-router-dom";
import { Suspense, lazy, useEffect, useState } from "react";
import { Toaster, toast } from "react-hot-toast";
import { useAuth } from "./context/AuthContext";
import { useThemeColor } from "./hooks/useThemeColor";
import { useDesaPermissions } from "./hooks/useDesaPermissions";
import { DataCacheProvider } from "./context/DataCacheContext";
import { EditModeProvider } from "./context/EditModeContext.jsx";
import { AlertProvider } from "./components/AlertPopup";
import PushNotificationInitializer from "./components/PushNotificationInitializer";
import ForceChangePasswordModal from "./components/ForceChangePasswordModal";
import CompleteDesaProfileModal from "./components/CompleteDesaProfileModal";
import {
  registerServiceWorker,
  subscribeToPushNotifications,
} from "./utils/pushNotifications";
import {
  backupSessionToIndexedDB,
  initSessionPersistence,
  setupPeriodicBackup,
  syncSessionAcrossTabs,
} from "./utils/sessionPersistence";
import {
  setupPeriodicVersionCheck,
  forceUpdate,
  dismissUpdate,
} from "./utils/versionCheck";
import UpdateNotificationModal from "./components/UpdateNotificationModal";
import { NetworkProvider } from "./context/NetworkContext";
import NetworkStatusIndicator from "./components/ui/NetworkStatusIndicator";

// Halaman utama di-import langsung untuk performa awal yang lebih cepat
import LoginPage from "./pages/LoginPage";
import LandingPage from "./pages/LandingPage";
import BeritaDetailPage from "./pages/BeritaDetailPage";
import BankeuPublicPage from "./pages/BankeuPublicPage";
import BankeuPerubahanPublicPage from "./pages/BankeuPerubahanPublicPage";
import NotFound from "./pages/NotFound";
import Forbidden from "./pages/Forbidden";
import Spinner from "./components/ui/Spinner";


// Lazy load DPMDStaffLayout once at module level
const DPMDStaffLayout = lazy(() => import("./layouts/DPMDStaffLayout"));

// HomeRedirect component - smart redirect based on user state and navigation context
function HomeRedirect() {
  const { user, isCheckingSession } = useAuth();
  const location = useLocation();
  const token = localStorage.getItem("expressToken");

  // Hide splash screen once session check is done
  useEffect(() => {
    if (!isCheckingSession) {
      const splash = document.getElementById('splash-screen');
      if (splash) {
        splash.classList.add('hide');
        setTimeout(() => splash.remove(), 500);
      }
    }
  }, [isCheckingSession]);

  // Wait for session restore before deciding
  if (isCheckingSession) {
    return null; // Splash screen in index.html handles this
  }

  // Not logged in, always show landing page
  if (!token || !user) {
    return <LandingPage />;
  }

  // Check if user explicitly navigated to home (e.g., clicked "Back to Home" button)
  const isExplicitNavigation = location.state?.fromNavigation === true;

  if (isExplicitNavigation) {
    // User wants to see landing page even if logged in
    return <LandingPage />;
  }

  // User is logged in and accessing root - redirect to appropriate dashboard
  if (user && user.role) {
    // Map role to dashboard path
    const roleDashboardMap = {
      superadmin: "/superadmin/dashboard",
      kepala_dinas: "/dpmd/dashboard",
      sekretaris_dinas: "/dpmd/dashboard",
      kepala_bidang: "/dpmd/dashboard",
      ketua_tim: "/dpmd/dashboard",
      bendahara: "/dpmd/dashboard",
      pegawai: "/dpmd/dashboard",
      desa: "/desa/dashboard",
      admin_desa: "/admin-desa/akun",
      kecamatan: "/kecamatan/dashboard",
      dinas_terkait: "/dinas/dashboard",
      verifikator_dinas: "/dinas/dashboard",
      bpjs: "/bpjs/dashboard",
    };

    const dashboardPath = roleDashboardMap[user.role] || "/dashboard";
    return <Navigate to={dashboardPath} replace />;
  }

  // Fallback: show landing page
  return <LandingPage />;
}

// Redirect component for /dashboard/disposisi/:id to correct role-based route
function DisposisiRedirect() {
  const { id } = useParams();
  const { user } = useAuth();
  
  // Role-based disposisi path mapping
  const roleDisposisiMap = {
    superadmin: "/dpmd/disposisi",
    kepala_dinas: "/dpmd/disposisi",
    sekretaris_dinas: "/dpmd/disposisi",
    kepala_bidang: "/dpmd/disposisi",
    ketua_tim: "/dpmd/disposisi",
    pegawai: "/dpmd/disposisi",
  };
  
  const basePath = roleDisposisiMap[user?.role] || "/dpmd/disposisi";
  const targetPath = id ? `${basePath}/${id}` : basePath;
  
  return <Navigate to={targetPath} replace />;
}

// Role constants for better maintainability
const ROLES = {
  SUPERADMIN: "superadmin",
  PMD: "pemberdayaan_masyarakat",
  PMD_ALT: "pmd",
  DESA: "desa",
  KECAMATAN: "kecamatan",
};

// Role groups
const ADMIN_ROLES = [ROLES.SUPERADMIN, ROLES.PMD, ROLES.PMD_ALT];


// Komponen lain di-lazy load untuk code-splitting
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const MainLayout = lazy(() => import("./layouts/MainLayout"));
const HeroGalleryManagement = lazy(
  () => import("./pages/dashboard/HeroGalleryManagement"),
);
const BeritaManagement = lazy(
  () => import("./pages/dashboard/BeritaManagement"),
);
// Bidang apps
const BumdesApp = lazy(() => import("./pages/bidang/spked/bumdes"));
const Kelembagaan = lazy(() => import("./pages/bidang/pmd/Kelembagaan"));
const KelembagaanLainnyaPage = lazy(() => import("./pages/bidang/pmd/KelembagaanLainnyaPage"));
const PengurusDashboardPage = lazy(() => import("./pages/bidang/pmd/PengurusDashboardPage"));
const PengurusImportPage = lazy(() => import("./pages/bidang/pmd/PengurusImportPage"));
const PosyanduComparisonPage = lazy(() => import("./pages/bidang/pmd/PosyanduComparisonPage"));
const RtrwComparisonPage = lazy(() => import("./pages/bidang/pmd/RtrwComparisonPage"));
const BpjsLayout = lazy(() => import("./layouts/BpjsLayout"));
const BpjsDashboardPage = lazy(() => import("./pages/bpjs/BpjsDashboardPage"));
const DisposisiRouter = lazy(
  () => import("./pages/bidang/sekretariat/disposisi/DisposisiRouter"),
);
const JadwalKegiatanPage = lazy(
  () => import("./pages/bidang/sekretariat/JadwalKegiatanPage"),
);
const KelolaNotifikasiPage = lazy(
  () => import("./pages/bidang/sekretariat/KelolaNotifikasiPage"),
);
const InformasiManagement = lazy(
  () => import("./pages/sekretariat/InformasiManagement"),
);
const VideoMeetingListPage = lazy(
  () => import("./pages/video-meeting/VideoMeetingListPage"),
);
const VideoMeetingPage = lazy(
  () => import("./pages/video-meeting/VideoMeetingPage"),
);
const PublicMeetingPage = lazy(
  () => import("./pages/video-meeting/PublicMeetingPage"),
);
const WatchPage = lazy(
  () => import("./pages/video-meeting/WatchPage"),
);
const PerjadinMain = lazy(
  () => import("./pages/pegawai/perjadin/PerjadinMain"),
);
const PerjadinDetail = lazy(
  () => import("./pages/pegawai/perjadin/PerjadinDetail"),
);
const DesaLayout = lazy(() => import("./layouts/DesaLayout"));
const DesaDashboard = lazy(() => import("./pages/desa/DesaDashboardPage"));
const AdminDesaLayout = lazy(() => import("./layouts/AdminDesaLayout"));
const ManajemenAkunPage = lazy(
  () => import("./pages/admin-desa/ManajemenAkunPage"),
);
const BumdesDesaPage = lazy(() => import("./pages/desa/bumdes/BumdesDesaPage"));

// Pegawai routes - Using unified DPMDStaffLayout
const PegawaiLayout = lazy(() =>
  import("./layouts/DPMDStaffLayout").then((m) => ({
    default: m.PegawaiLayout,
  })),
);
const PegawaiDashboard = lazy(() => import("./pages/pegawai/PegawaiDashboard"));
const AbsensiPage = lazy(() => import("./pages/pegawai/AbsensiPage"));
const MessagingPage = lazy(() => import("./pages/messaging/MessagingPage"));
const AbsensiManagementPage = lazy(() => import("./pages/bidang/sekretariat/AbsensiManagementPage"));
const AnggaranPage = lazy(() => import("./pages/bidang/sekretariat/anggaran/AnggaranPage"));
const ProgramKegiatanPage = lazy(() => import("./pages/bidang/sekretariat/anggaran/ProgramKegiatanPage"));
const ItemAnggaranPage = lazy(() => import("./pages/bidang/sekretariat/anggaran/ItemAnggaranPage"));
const ShtPage = lazy(() => import("./pages/bidang/sekretariat/anggaran/ShtPage"));
const DetailSubKegiatanPage = lazy(() => import("./pages/bidang/sekretariat/anggaran/DetailSubKegiatanPage"));
const RekeningRefPage = lazy(() => import("./pages/bidang/sekretariat/anggaran/RekeningRefPage"));
const PencairanAtkListPage = lazy(() => import("./pages/bidang/sekretariat/pencairan/PencairanAtkListPage"));
const PencairanAtkFormPage = lazy(() => import("./pages/bidang/sekretariat/pencairan/PencairanAtkFormPage"));
const PencairanAtkDetailPage = lazy(() => import("./pages/bidang/sekretariat/pencairan/PencairanAtkDetailPage"));
const PenyediaPage = lazy(() => import("./pages/bidang/sekretariat/pencairan/PenyediaPage"));
const ArsipBarangPage = lazy(() => import("./pages/bidang/sekretariat/arsip-barang/ArsipBarangPage"));
const ArsipBarangFormPage = lazy(() => import("./pages/bidang/sekretariat/arsip-barang/ArsipBarangFormPage"));
const ArsipBarangDetailPage = lazy(() => import("./pages/bidang/sekretariat/arsip-barang/ArsipBarangDetailPage"));
const ArsipBarangQrPage = lazy(() => import("./pages/bidang/sekretariat/arsip-barang/ArsipBarangQrPage"));

// Bidang pages
const SekretariatPage = lazy(() => import("./pages/bidang/SekretariatPage"));
const SpkedPage = lazy(() => import("./pages/bidang/SpkedPage"));
const KKDPage = lazy(() => import("./pages/bidang/KKDPage"));
const PMDPage = lazy(() => import("./pages/bidang/PMDPage"));
const PemdesPage = lazy(() => import("./pages/bidang/PemdesPage"));
const PemdesAparaturDesaPage = lazy(() => import("./pages/bidang/pemdes/AparaturDesaPage"));
const PemdesProfilDesaPage = lazy(() => import("./pages/bidang/pemdes/ProfilDesaDashboardPage"));
const PemdesProfilDesaDetailPage = lazy(() => import("./pages/bidang/pemdes/ProfilDesaDetailPage"));
const ProdukHukumPemdesPage = lazy(() => import("./pages/bidang/pemdes/ProdukHukumPage"));
const ProdukHukumDetailPemdesPage = lazy(() => import("./pages/bidang/pemdes/ProdukHukumDetailPage"));

const KelembagaanDesaPage = lazy(
  () => import("./pages/desa/kelembagaan/KelembagaanDesaPage"),
);
const KelembagaanList = lazy(
  () => import("./components/kelembagaan/KelembagaanList"),
);
const KelembagaanDetailPage = lazy(
  () => import("./components/kelembagaan/KelembagaanDetailPage"),
);
const AdminKelembagaanDetailPage = lazy(
  () => import("./pages/bidang/pmd/AdminKelembagaanDetailPage"),
);
const PengurusDetailPage = lazy(
  () => import("./components/kelembagaan/pengurus/PengurusDetailPage"),
);
const ProdukHukum = lazy(() => import("./pages/desa/produk-hukum/ProdukHukum"));
const ProdukHukumDetail = lazy(
  () => import("./pages/desa/produk-hukum/ProdukHukumDetail"),
);
const PengurusEditPage = lazy(
  () => import("./components/kelembagaan/pengurus/PengurusEditPage"),
);
const SettingsPage = lazy(() => import("./pages/dashboard/SettingsPage"));
const DisposisiSurat = lazy(
  () => import("./pages/dashboard/DisposisiSurat.modern"),
);
const DisposisiDetail = lazy(() => import("./pages/dashboard/DisposisiDetail"));
const BankSuratPage = lazy(() => import("./pages/dashboard/BankSuratPage"));
const PhotoBoothPage = lazy(() => import("./pages/pegawai/PhotoBoothPage"));
const EventAttendancePublicPage = lazy(() => import("./pages/event/EventAttendancePublicPage"));
const CoreDashboardPublic = lazy(
  () => import("./pages/public/CoreDashboardPublic"),
);
const AparaturDesaPage = lazy(
  () => import("./pages/desa/aparatur-desa/AparaturDesaPage"),
);
const AparaturDesaDetailPage = lazy(
  () => import("./pages/desa/aparatur-desa/AparaturDesaDetailPage"),
);
const AparaturDesaEditPage = lazy(
  () => import("./pages/desa/aparatur-desa/AparaturDesaEditPage"),
);
const DesaAparaturExternalPage = lazy(
  () => import("./pages/desa/aparatur-desa-external/AparaturDesaExternalPage"),
);
const ProfilDesaPage = lazy(() => import("./pages/desa/ProfilDesaPage"));
const DesaSettings = lazy(() => import("./pages/desa/DesaSettings"));
const DesaBankeuPage = lazy(() => import("./pages/desa/bankeu/DesaBankeuPage"));
const DesaBankeuPerubahanPage = lazy(() => import("./pages/desa/bankeu-perubahan/DesaBankeuPerubahanPage"));
const DesaBantuanProvinsiLpjPage = lazy(() => import("./pages/desa/bantuan-provinsi/DesaBantuanProvinsiLpjPage"));
// Leadership layouts removed - all internal roles use unified DPMDStaffLayout
const SuperadminLayout = lazy(
  () => import("./layouts/SuperadminLayout"),
);
const SuperadminDashboard = lazy(
  () => import("./pages/superadmin/SuperadminDashboard"),
);
const KepegawaianPage = lazy(
  () => import("./pages/superadmin/KepegawaianPage"),
);
const PegawaiDetailPage = lazy(
  () => import("./pages/superadmin/PegawaiDetailPage"),
);
const BidangNavigationPage = lazy(
  () => import("./pages/superadmin/BidangNavigationPage"),
);
const ActivityLogsPage = lazy(
  () => import("./pages/superadmin/ActivityLogsPage"),
);
const KecamatanDashboardPage = lazy(
  () => import("./pages/kecamatan/KecamatanDashboardPage"),
);
const KecamatanLayout = lazy(() => import("./layouts/KecamatanLayout"));
const DinasLayout = lazy(() => import("./layouts/DinasLayout"));
const KecamatanBankeuPage = lazy(
  () => import("./pages/kecamatan/bankeu/KecamatanBankeuPage"),
);
const KecamatanBankeuPerubahanPage = lazy(
  () => import("./pages/kecamatan/bankeu-perubahan/KecamatanBankeuPerubahanPage"),
);
const BankeuVerificationPage = lazy(
  () => import("./pages/kecamatan/bankeu/BankeuVerificationPage"),
);
const BankeuVerificationDetailPage = lazy(
  () => import("./pages/kecamatan/bankeu/BankeuVerificationDetailPage"),
);
const KecamatanTimVerifikasiPage = lazy(
  () => import("./pages/kecamatan/bankeu/KecamatanTimVerifikasiPage"),
);
const KecamatanPerubahanTimProposalPage = lazy(
  () => import("./pages/kecamatan/bankeu-perubahan/KecamatanPerubahanTimProposalPage"),
);
const KecamatanSettings = lazy(
  () => import("./pages/kecamatan/KecamatanSettings"),
);
const KecamatanKelembagaanPage = lazy(
  () => import("./pages/kecamatan/kelembagaan/KecamatanKelembagaanPage"),
);
const KecamatanChangePasswordPage = lazy(
  () => import("./pages/kecamatan/KecamatanChangePasswordPage"),
);
const DinasBankeuPage = lazy(() => import("./pages/dinas/DinasBankeuPage"));
const DinasBankeuPerubahanArsipPage = lazy(
  () => import("./pages/dinas/DinasBankeuPerubahanArsipPage"),
);
const DinasVerificationPage = lazy(
  () => import("./pages/dinas/DinasVerificationPage"),
);
const DinasVerificationDetailPage = lazy(
  () => import("./pages/dinas/DinasVerificationDetailPage"),
);
const DinasConfigPage = lazy(() => import("./pages/dinas/DinasConfigPage"));
const DinasVerifikatorPage = lazy(
  () => import("./pages/dinas/DinasVerifikatorPage"),
);
const VerifikatorProfilePage = lazy(
  () => import("./pages/dinas/VerifikatorProfilePage"),
);
const DinasDashboardPage = lazy(
  () => import("./pages/dinas/DinasDashboardPage"),
);
const DinasChangePasswordPage = lazy(
  () => import("./pages/dinas/DinasChangePasswordPage"),
);
const CoreDashboardLayout = lazy(() => import("./layouts/CoreDashboardLayout"));
const WelcomeDashboard = lazy(
  () => import("./pages/core-dashboard/WelcomeDashboard"),
);
// Unified DPMD Dashboard - menggantikan dashboard terpisah per role
const DPMDDashboard = lazy(
  () => import("./pages/dpmd/DPMDDashboard"),
);
const InformasiPage = lazy(
  () => import("./pages/dpmd/InformasiPage"),
);
// Legacy individual dashboards (masih digunakan di beberapa tempat)
const KepalaDinasDashboard = lazy(
  () => import("./pages/kepala-dinas/KepalaDinasDashboard"),
);
const ProfilePage = lazy(() => import("./pages/common/ProfilePage"));
const KepalaBidangDashboard = lazy(
  () => import("./pages/kepala-bidang/KepalaBidangDashboard"),
);
const SekretarisDinasDashboard = lazy(
  () => import("./pages/sekretaris-dinas/SekretarisDinasDashboard"),
);
const DashboardOverview = lazy(
  () => import("./pages/kepala-dinas/DashboardOverview"),
);
const LaporanDesa = lazy(() => import("./pages/kepala-dinas/LaporanDesa"));
const StatistikBumdes = lazy(
  () => import("./pages/kepala-dinas/StatistikBumdes"),
);
const StatistikKelembagaan = lazy(
  () => import("./pages/core-dashboard/StatistikKelembagaan"),
);
const StatistikAdd = lazy(() => import("./pages/kepala-dinas/StatistikAdd"));
// DD Statistik Sub-categories
const StatistikDdDashboard = lazy(
  () => import("./pages/kepala-dinas/StatistikDdDashboard"),
);
const TrendsPage = lazy(() => import("./pages/kepala-dinas/TrendsPage"));
const BankeuDashboard = lazy(
  () => import("./pages/bidang/spked/bankeu/BankeuDashboard"),
);
const StatistikBankeuDashboard = lazy(
  () => import("./pages/kepala-dinas/StatistikBankeuDashboard"),
);
const StatistikPerjadinDashboard = lazy(
  () => import("./pages/kepala-dinas/StatistikPerjadinDashboard"),
);
// KKD Unified Dashboard (ADD + BHPRD + DD)
const StatistikKKDDashboard = lazy(
  () => import("./pages/core-dashboard/StatistikKKDDashboard"),
);
const AddDashboard = lazy(() => import("./pages/bidang/kkd/add/AddDashboard"));
const BhprdDashboard = lazy(() => import("./pages/bidang/kkd/BhprdDashboard"));
// DD Sub-categories
const DdDashboard = lazy(() => import("./pages/bidang/kkd/dd/DdDashboard"));
const KkdBankeuDashboard = lazy(() => import("./pages/bidang/kkd/BankeuDashboard"));
const KkdBpDashboard = lazy(() => import("./pages/bidang/kkd/BpDashboard"));
// Statistik untuk Core Dashboard
const StatistikAddDashboard = lazy(
  () => import("./pages/kepala-dinas/StatistikAddDashboard"),
);
// BHPRD Submenu Components
const StatistikBhprdT1 = lazy(
  () => import("./pages/kepala-dinas/StatistikBhprdT1"),
);
const StatistikBhprdT2 = lazy(
  () => import("./pages/kepala-dinas/StatistikBhprdT2"),
);
const StatistikBhprdT3 = lazy(
  () => import("./pages/kepala-dinas/StatistikBhprdT3"),
);
// DD Submenu Components
const StatistikDdEarmarkedT1 = lazy(
  () => import("./pages/kepala-dinas/StatistikDdEarmarkedT1"),
);
const StatistikDdEarmarkedT2 = lazy(
  () => import("./pages/kepala-dinas/StatistikDdEarmarkedT2"),
);
const StatistikDdNonEarmarkedT1 = lazy(
  () => import("./pages/kepala-dinas/StatistikDdNonEarmarkedT1"),
);
const StatistikDdNonEarmarkedT2 = lazy(
  () => import("./pages/kepala-dinas/StatistikDdNonEarmarkedT2"),
);
const StatistikInsentifDd = lazy(
  () => import("./pages/kepala-dinas/StatistikInsentifDd"),
);
const UserManagementPage = lazy(
  () => import("./pages/dashboard/UserManagementPage"),
);

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem("expressToken");
  const { isCheckingSession } = useAuth();
  const location = useLocation();

  // CRITICAL: Wait for session restore (IndexedDB) before deciding to redirect
  if (isCheckingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/30 border-t-white mx-auto mb-4"></div>
          <p className="text-white/80 text-sm font-medium">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    // Simpan lokasi yang dituju agar bisa redirect kembali setelah login
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
};

const RoleProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isCheckingSession } = useAuth();
  const location = useLocation();

  const getStoredUser = () => {
    try {
      const session = JSON.parse(localStorage.getItem("authSession") || "null");
      if (session?.user) return session.user;
    } catch {
      // Fall back to legacy user storage below.
    }

    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  };

  // CRITICAL: Wait for session restore (IndexedDB) before deciding to redirect
  if (isCheckingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-white/30 border-t-white mx-auto mb-4"></div>
          <p className="text-white/80 text-sm font-medium">Memuat...</p>
        </div>
      </div>
    );
  }

  const token = localStorage.getItem("expressToken");

  if (!token) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Check if user role is allowed
  if (allowedRoles) {
    const isImpersonating = localStorage.getItem("isImpersonating") === "true";
    const storedUser = isImpersonating ? getStoredUser() : null;
    const activeUser = storedUser || user;
    const userRole = activeUser?.role ? String(activeUser.role).trim() : "";
    const normalizedAllowedRoles = allowedRoles.map((role) => String(role).trim());

    // Check if user role is in allowed roles
    const hasAccess = userRole && normalizedAllowedRoles.includes(userRole);

    if (!hasAccess) {
      // Access denied - redirect to forbidden page
      return <Navigate to="/forbidden" replace />;
    }
  }

  return children || <Outlet />;
};

// Pagar hak akses fitur untuk akun operasional desa.
// Menu yang tidak diizinkan Admin Desa tidak boleh dibuka lewat URL langsung.
// Backend tetap penjaga terakhir; ini hanya supaya UX-nya jelas.
const DesaPermissionRoute = ({ permission, children }) => {
  const { hasPermission, isReady } = useDesaPermissions();

  if (!isReady) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-200 border-t-slate-800"></div>
      </div>
    );
  }

  if (!hasPermission(permission)) {
    return <Navigate to="/forbidden" replace />;
  }

  return children || <Outlet />;
};

// Component wrapper untuk theme color hook
const ThemeColorWrapper = ({ children }) => {
  const location = useLocation();
  const { user } = useAuth();
  useThemeColor();

  // Dismiss all toasts on route change to prevent stuck toasts
  useEffect(() => {
    toast.dismiss();
  }, [location.pathname]);

  // Initialize PWA and Push Notifications on mount (only for logged in users)
  useEffect(() => {
    let isInitialized = false;

    const initPWA = async () => {
      if (isInitialized) return;
      isInitialized = true;

      try {
        // Register service worker
        await registerServiceWorker();

        // Message handler function
        const handleServiceWorkerMessage = (event) => {
          // Handle push notification received (from SW push event)
          if (event.data && event.data.type === "PUSH_NOTIFICATION_RECEIVED") {
            const notifData = event.data.payload;

            // Sound and toast notifications disabled - browser notification already shown by service worker

            // Trigger notification event for layouts to refresh notification count
            window.dispatchEvent(
              new CustomEvent("newNotification", { detail: notifData }),
            );
          }

          // Handle notification click navigation
          if (event.data && event.data.type === "NOTIFICATION_CLICK_NAVIGATE") {
            const { url, notificationData } = event.data;
            const notifType = notificationData?.type || "";

            // Smart routing based on notification type and user role
            if (
              notifType.includes("disposisi") ||
              notifType === "new_disposisi" ||
              notifType === "disposisi_update"
            ) {
              // Get user role from localStorage to determine correct disposisi route
              const storedUser = JSON.parse(
                localStorage.getItem("user") || "{}",
              );
              const userRole = storedUser.role || "";

              const roleRouteMap = {
                kepala_dinas: "/dpmd/disposisi",
                sekretaris_dinas: "/dpmd/disposisi",
                kepala_bidang: "/dpmd/disposisi",
                ketua_tim: "/dpmd/disposisi",
                pegawai: "/dpmd/disposisi",
                superadmin: "/dpmd/disposisi",
              };

              let targetUrl = roleRouteMap[userRole] || "/dpmd/disposisi";

              // If notification has a specific disposisi ID, navigate to detail
              if (notificationData?.disposisi_id) {
                targetUrl = `${targetUrl}/${notificationData.disposisi_id}`;
              }

              console.log(
                `[App] Navigating to disposisi: ${targetUrl} (role: ${userRole})`,
              );
              window.location.href = targetUrl;
            } else if (
              notifType === "today_schedule" ||
              notifType === "tomorrow_schedule" ||
              notifType === "upcoming_jadwal" ||
              notifType === "new_jadwal" ||
              notifType === "update_jadwal"
            ) {
              const targetDate = notificationData?.targetDate || '';
              const dateParam = targetDate ? `?tanggal=${targetDate}` : '';
              console.log(`[App] Navigating to jadwal-kegiatan (type: ${notifType}, date: ${targetDate})`);
              window.location.href = `/dpmd/jadwal-kegiatan${dateParam}`;
            } else if (url && url !== "/") {
              window.location.href = url;
            } else {
              // Default fallback: redirect to user's dashboard home based on role
              const storedUser = JSON.parse(
                localStorage.getItem("user") || "{}",
              );
              const userRole = storedUser.role || "";

              const roleDashboardMap = {
                superadmin: "/superadmin/dashboard",
                kepala_dinas: "/dpmd/dashboard",
                sekretaris_dinas: "/dpmd/dashboard",
                kepala_bidang: "/dpmd/dashboard",
                ketua_tim: "/dpmd/dashboard",
                pegawai: "/dpmd/dashboard",
                desa: "/desa/dashboard",
                admin_desa: "/admin-desa/akun",
                kecamatan: "/kecamatan/dashboard",
                dinas_terkait: "/dinas/dashboard",
                verifikator_dinas: "/dinas/dashboard",
              };

              const dashboardPath = roleDashboardMap[userRole] || "/dpmd/dashboard";
              console.log(`[App] Notification click - redirecting to dashboard: ${dashboardPath} (role: ${userRole})`);
              window.location.href = dashboardPath;
            }
          }

          // Legacy handler for backward compatibility
          if (event.data && event.data.type === "NEW_NOTIFICATION") {
            const notifData = event.data.payload;

            // Play notification sound
            try {
              const audio = new Audio("/dpmd.mp3");
              audio.volume = 1.0; // Full volume
              const playPromise = audio.play();
              if (playPromise !== undefined) {
                playPromise
                  .then(() =>
                    console.log("🔊 Legacy notification sound played"),
                  )
                  .catch((err) =>
                    console.warn("⚠️ Could not play sound:", err.message),
                  );
              }
            } catch (err) {
              console.error("❌ Error creating audio:", err);
            }

            // Show toast only if app is visible (foreground)
            if (document.visibilityState === "visible") {
              toast.success(
                <div className="flex flex-col gap-1">
                  <div className="font-bold">
                    {notifData.title || "Notifikasi Baru"}
                  </div>
                  <div className="text-sm">
                    {notifData.body || "Anda memiliki notifikasi baru"}
                  </div>
                </div>,
                {
                  duration: 5000,
                  icon: "🔔",
                  style: {
                    background: "#1e40af",
                    color: "#fff",
                    maxWidth: "400px",
                  },
                },
              );
            }
          }
        };

        // Listen for messages from service worker (untuk auto-refresh data)
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.addEventListener(
            "message",
            handleServiceWorkerMessage,
          );
        }

        // Auto-initialize push notifications for logged in users
        if (user && localStorage.getItem("expressToken")) {
          // Wait a bit for SW to be ready
          setTimeout(async () => {
            const permission = Notification.permission;

            // Only auto-init if already granted (from login page)
            if (permission === "granted") {
              try {
                await subscribeToPushNotifications();
              } catch (err) {
                console.error("Background push subscription failed:", err);
              }
            }
          }, 1000);
        }
      } catch (error) {
        console.error("Error initializing PWA:", error);
      }
    };

    initPWA();
  }, [user]);

  return children;
};

const ImpersonationReturnBanner = () => {
  const [impersonatedUser, setImpersonatedUser] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("isImpersonating") !== "true") return;

    try {
      const storedUser = localStorage.getItem("impersonatedUser");
      const parsedUser = storedUser ? JSON.parse(storedUser) : null;
      setImpersonatedUser(parsedUser || { name: "user lain" });
    } catch {
      setImpersonatedUser({ name: "user lain" });
    }
  }, []);

  const handleReturn = () => {
    setIsRestoring(true);

    try {
      const savedSession = localStorage.getItem("superadminReturnSession");
      const savedToken = localStorage.getItem("superadminReturnToken");
      const savedUser = localStorage.getItem("superadminReturnUser");

      if (savedSession) {
        localStorage.setItem("authSession", savedSession);
      } else if (savedToken && savedUser) {
        localStorage.setItem("authSession", JSON.stringify({
          user: JSON.parse(savedUser),
          token: savedToken,
          lastActivity: Date.now(),
        }));
      }

      if (savedToken) localStorage.setItem("expressToken", savedToken);
      if (savedUser) localStorage.setItem("user", savedUser);

      localStorage.removeItem("isImpersonating");
      localStorage.removeItem("impersonatedUser");
      localStorage.removeItem("superadminReturnSession");
      localStorage.removeItem("superadminReturnToken");
      localStorage.removeItem("superadminReturnUser");

      backupSessionToIndexedDB().catch((error) => {
        console.warn("[Impersonate] Backup sesi superadmin gagal:", error);
      });
      window.location.replace("/superadmin/users");
    } catch (error) {
      console.error("[Impersonate] Gagal kembali ke superadmin:", error);
      localStorage.removeItem("isImpersonating");
      window.location.replace("/");
    }
  };

  if (!impersonatedUser) return null;

  return (
    <div className="fixed left-1/2 top-3 z-[9999] w-[calc(100%-1.5rem)] max-w-xl -translate-x-1/2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 shadow-lg shadow-amber-900/10 md:top-4 md:px-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Mode superadmin
          </p>
          <p className="truncate text-sm font-medium text-amber-950">
            Sedang masuk sebagai {impersonatedUser.name || "user lain"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleReturn}
          disabled={isRestoring}
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-amber-700 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isRestoring ? "Mengembalikan..." : "Kembali Superadmin"}
        </button>
      </div>
    </div>
  );
};

function App() {
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  // Initialize session persistence on app start
  useEffect(() => {
    // Initialize IndexedDB for session backup
    initSessionPersistence();

    // Setup periodic backup to IndexedDB (every 5 minutes + before unload)
    setupPeriodicBackup();

    // Sync session across tabs
    syncSessionAcrossTabs();
  }, []);

  // Setup version checking
  useEffect(() => {
    // Setup periodic version check
    const cleanup = setupPeriodicVersionCheck(() => {
      // New version detected
      setShowUpdateModal(true);
    });

    return cleanup;
  }, []);

  const handleUpdate = async () => {
    // User initiated update
    setShowUpdateModal(false);
    await forceUpdate();
  };

  const handleDismissUpdate = () => {
    // User dismissed update - don't re-show for 24 hours
    setShowUpdateModal(false);
    dismissUpdate();
  };

  return (
    <Router>
      <AlertProvider>
      <DataCacheProvider>
        <EditModeProvider>
          <ThemeColorWrapper>
            <NetworkProvider>
            {/* Push Notification Initializer: ensures permission prompt and auto-subscribe */}
            <PushNotificationInitializer />
            {/* Popup wajib ganti password default — global untuk semua role */}
            <ForceChangePasswordModal />
            {/* Popup wajib lengkapi identitas — khusus Admin Desa */}
            <CompleteDesaProfileModal />
            <ImpersonationReturnBanner />
            <Suspense
              fallback={
                <div className="flex h-screen items-center justify-center">
                  <Spinner />
                </div>
              }
            >
              <Routes>
                {/* Rute yang di-load secara statis */}
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/berita/:slug" element={<BeritaDetailPage />} />
                <Route
                  path="/bantuan-keuangan"
                  element={<BankeuPublicPage />}
                />
                <Route
                  path="/bantuan-keuangan-perubahan"
                  element={<BankeuPerubahanPublicPage />}
                />
                <Route
                  path="/public-dashboard"
                  element={<CoreDashboardPublic />}
                />
                <Route path="/login" element={<LoginPage />} />
                
                {/* Redirect routes for legacy/notification URLs */}
                <Route path="/dashboard/disposisi" element={<DisposisiRedirect />} />
                <Route path="/dashboard/disposisi/:id" element={<DisposisiRedirect />} />
                
                {/* Public Meeting Join - No auth required */}
                <Route path="/join/:roomId" element={<PublicMeetingPage />} />

                {/* Penonton Webinar (HLS, view-only) - No auth required */}
                <Route path="/watch/:roomId" element={<WatchPage />} />


                {/* Rute Desa - Exclusive untuk role: desa */}
                <Route
                  path="/desa"
                  element={
                    <RoleProtectedRoute allowedRoles={["desa"]}>
                      <DesaLayout />
                    </RoleProtectedRoute>
                  }
                >
                  {/* Dashboard & Pengaturan selalu terbuka untuk semua akun desa */}
                  <Route path="dashboard" element={<DesaDashboard />} />
                  <Route path="settings" element={<DesaSettings />} />

                  {/* Sisanya mengikuti hak akses yang diberikan Admin Desa */}
                  <Route element={<DesaPermissionRoute permission="profil-desa" />}>
                    <Route path="profil-desa" element={<ProfilDesaPage />} />
                  </Route>

                  <Route element={<DesaPermissionRoute permission="bumdes" />}>
                    <Route path="bumdes" element={<BumdesDesaPage />} />
                  </Route>

                  <Route element={<DesaPermissionRoute permission="kelembagaan" />}>
                    <Route path="kelembagaan" element={<KelembagaanDesaPage />} />
                    <Route
                      path="kelembagaan/:type"
                      element={<KelembagaanList />}
                    />
                    <Route
                      path="kelembagaan/:type/:id"
                      element={<KelembagaanDetailPage />}
                    />
                    <Route path="pengurus/:id" element={<PengurusDetailPage />} />
                    <Route
                      path="pengurus/:id/edit"
                      element={<PengurusEditPage />}
                    />
                  </Route>

                  <Route element={<DesaPermissionRoute permission="aparatur-desa" />}>
                    <Route path="aparatur-desa" element={<AparaturDesaPage />} />
                    <Route
                      path="aparatur-desa/:id"
                      element={<AparaturDesaDetailPage />}
                    />
                    <Route
                      path="aparatur-desa/:id/edit"
                      element={<AparaturDesaEditPage />}
                    />
                    <Route path="aparatur-desa-external" element={<DesaAparaturExternalPage />} />
                  </Route>

                  <Route element={<DesaPermissionRoute permission="produk-hukum" />}>
                    <Route path="produk-hukum" element={<ProdukHukum />} />
                    <Route
                      path="produk-hukum/:id"
                      element={<ProdukHukumDetail />}
                    />
                  </Route>

                  <Route element={<DesaPermissionRoute permission="bankeu" />}>
                    <Route path="bankeu" element={<DesaBankeuPage />} />
                  </Route>

                  <Route element={<DesaPermissionRoute permission="bankeu-perubahan" />}>
                    <Route path="bankeu-perubahan" element={<DesaBankeuPerubahanPage />} />
                  </Route>

                  <Route element={<DesaPermissionRoute permission="bantuan-provinsi-lpj" />}>
                    <Route path="bantuan-provinsi-lpj" element={<DesaBantuanProvinsiLpjPage />} />
                  </Route>

                  <Route element={<DesaPermissionRoute permission="pesan" />}>
                    <Route path="pesan" element={<MessagingPage />} />
                  </Route>
                </Route>

                {/* Rute Admin Desa - pengelola akun di satu desa, tanpa fitur operasional */}
                <Route
                  path="/admin-desa"
                  element={
                    <RoleProtectedRoute allowedRoles={["admin_desa"]}>
                      <AdminDesaLayout />
                    </RoleProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="akun" replace />} />
                  <Route path="akun" element={<ManajemenAkunPage />} />
                  <Route path="pesan" element={<MessagingPage />} />
                  <Route path="settings" element={<DesaSettings />} />
                </Route>
                {/* ============================================ */}
                {/* DPMD INTERNAL STAFF ROUTES - Unified Single Route */}
                {/* All internal staff use /dpmd/* with auto role detection */}
                {/* ============================================ */}
                <Route
                  path="/dpmd"
                  element={
                    <RoleProtectedRoute
                      allowedRoles={[
                        "pegawai",
                        "ketua_tim",
                        "kepala_bidang",
                        "kepala_dinas",
                        "sekretaris_dinas",
                        "bendahara",
                        "superadmin"
                      ]}
                    >
                      <DPMDStaffLayout />
                    </RoleProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="dashboard" replace />} />
                  
                  {/* Dashboard pages - role-specific */}
                  <Route path="dashboard" element={<DPMDDashboard />} />
                  
                  {/* Common routes for all DPMD staff */}
                  <Route path="profile" element={<ProfilePage />} />
                  <Route path="disposisi" element={<DisposisiSurat />} />
                  <Route path="disposisi/:id" element={<DisposisiDetail />} />
                  <Route path="jadwal-kegiatan" element={<JadwalKegiatanPage />} />
                  <Route path="perjadin" element={<PerjadinMain />} />
                  <Route path="perjadin/detail/:id" element={<PerjadinDetail />} />
                  <Route path="informasi" element={<InformasiPage />} />
                  <Route path="video-meeting" element={<VideoMeetingListPage />} />
                  <Route path="absensi" element={<AbsensiPage />} />
                  <Route path="pesan" element={<MessagingPage />} />
                  <Route path="bank-surat" element={<BankSuratPage />} />
                </Route>

                {/* Photo Booth - full screen tanpa sidebar (di luar DPMDStaffLayout) */}
                <Route
                  path="/dpmd/photo-booth"
                  element={
                    <RoleProtectedRoute
                      allowedRoles={[
                        "pegawai",
                        "ketua_tim",
                        "kepala_bidang",
                        "kepala_dinas",
                        "sekretaris_dinas",
                        "bendahara",
                        "superadmin",
                      ]}
                    >
                      <PhotoBoothPage />
                    </RoleProtectedRoute>
                  }
                />

                {/* Rute Bidang - Accessible by pegawai/kepala_bidang/ketua_tim (their own bidang) & kepala_dinas/superadmin (all) */}
                <Route
                  path="/bidang"
                  element={
                    <RoleProtectedRoute
                      allowedRoles={[
                        "pegawai",
                        "kepala_bidang",
                        "ketua_tim",
                        "kepala_dinas",
                        "sekretaris_dinas",
                        "bendahara",
                        "superadmin",
                      ]}
                    >
                      <PegawaiLayout />
                    </RoleProtectedRoute>
                  }
                >
                  {/* Sekretariat */}
                  <Route path="sekretariat" element={<SekretariatPage />} />

                  {/* SPKED (Sarana Prasarana Kewilayahan dan Ekonomi Desa) */}
                  <Route path="spked" element={<SpkedPage />} />

                  {/* KKD (Kekayaan dan Keuangan Desa) */}
                  <Route path="kkd" element={<KKDPage />} />

                  {/* Pemdes (Pemerintahan Desa) */}
                  <Route path="pemdes" element={<PemdesPage />} />
                  <Route path="pemdes/profil-desa" element={<PemdesProfilDesaPage />} />
                  <Route path="pemdes/profil-desa/:desaId" element={<PemdesProfilDesaDetailPage />} />
                  <Route path="pemdes/aparatur-desa" element={<PemdesAparaturDesaPage />} />
                  <Route path="pemdes/produk-hukum" element={<ProdukHukumPemdesPage detailBasePath="/bidang/pemdes/produk-hukum" />} />
                  <Route path="pemdes/produk-hukum/:id" element={<ProdukHukumDetailPemdesPage backPath="/bidang/pemdes/produk-hukum" />} />

                  {/* Detail Disposisi - Accessible dari semua bidang */}
                  <Route path="disposisi/:id" element={<DisposisiDetail />} />
                </Route>

                {/* Rute Bidang PMD - Menggunakan MainLayout (dipisah dari bidang lainnya) */}
                <Route
                  path="/bidang/pmd"
                  element={
                    <RoleProtectedRoute
                      allowedRoles={[
                        "pegawai",
                        "kepala_bidang",
                        "ketua_tim",
                        "kepala_dinas",
                        "bendahara",
                        "superadmin",
                      ]}
                    >
                      <PegawaiLayout />
                    </RoleProtectedRoute>
                  }
                >
                  {/* PMD (Pemberdayaan Masyarakat Desa) */}
                  <Route index element={<PMDPage />} />
                  <Route path="core-dashboard" element={<WelcomeDashboard />} />
                  <Route path="kelembagaan" element={<Kelembagaan />} />
                  <Route path="kelembagaan/lainnya" element={<KelembagaanLainnyaPage />} />
                  <Route path="kelembagaan/posyandu-comparison" element={<PosyanduComparisonPage />} />
                  <Route path="kelembagaan/rtrw-comparison" element={<RtrwComparisonPage />} />
                  <Route
                    path="kelembagaan/admin/:desaId"
                    element={<AdminKelembagaanDetailPage />}
                  />
                  <Route
                    path="kelembagaan/admin/:desaId/:type"
                    element={<KelembagaanList />}
                  />
                  <Route
                    path="kelembagaan/:type"
                    element={<KelembagaanList />}
                  />
                  <Route
                    path="kelembagaan/:type/:id"
                    element={<KelembagaanDetailPage />}
                  />
                  <Route path="pengurus" element={<PengurusDashboardPage />} />
                  <Route path="pengurus/import" element={<PengurusImportPage />} />
                  <Route path="pengurus/:id" element={<PengurusDetailPage />} />
                  <Route
                    path="pengurus/:id/edit"
                    element={<PengurusEditPage />}
                  />
                  <Route path="produk-hukum" element={<ProdukHukumPemdesPage detailBasePath="/bidang/pmd/produk-hukum" />} />
                  <Route path="produk-hukum/:id" element={<ProdukHukumDetailPemdesPage backPath="/bidang/pmd/produk-hukum" />} />
                </Route>{" "}

                {/* Routes KKD - Nested under /kkd */}
                <Route
                  path="/kkd"
                  element={
                    <RoleProtectedRoute
                      allowedRoles={[
                        "pegawai",
                        "kepala_bidang",
                        "ketua_tim",
                        "kepala_dinas",
                        "superadmin",
                      ]}
                    >
                      <PegawaiLayout />
                    </RoleProtectedRoute>
                  }
                >
                  <Route path="add" element={<AddDashboard />} />
                  <Route path="bhprd" element={<BhprdDashboard />} />
                  <Route path="dd" element={<DdDashboard />} />
                </Route>
                {/* Routes Pemdes - Nested under /pemdes */}
                <Route
                  path="/pemdes"
                  element={
                    <RoleProtectedRoute
                      allowedRoles={[
                        "pegawai",
                        "kepala_bidang",
                        "ketua_tim",
                        "kepala_dinas",
                        "superadmin",
                      ]}
                    >
                      <PegawaiLayout />
                    </RoleProtectedRoute>
                  }
                >
                  <Route path="profil-desa" element={<PemdesProfilDesaPage />} />
                  <Route path="profil-desa/:desaId" element={<PemdesProfilDesaDetailPage />} />
                  <Route path="aparatur-desa" element={<PemdesAparaturDesaPage />} />
                  <Route path="produk-hukum" element={<ProdukHukumPemdesPage />} />
                  <Route path="produk-hukum/:id" element={<ProdukHukumDetailPemdesPage />} />
                </Route>

                {/* Routes Sekretariat - Nested under /sekretariat (moved from /pegawai) */}
                <Route
                  path="/sekretariat"
                  element={
                    <RoleProtectedRoute
                      allowedRoles={[
                        "pegawai",
                        "kepala_bidang",
                        "ketua_tim",
                        "kepala_dinas",
                        "superadmin",
                        "sekretaris_dinas",
                        "bendahara",
                      ]}
                    >
                      <PegawaiLayout />
                    </RoleProtectedRoute>
                  }
                >
                  <Route path="disposisi" element={<DisposisiRouter />} />
                  <Route path="disposisi/:id" element={<DisposisiDetail />} />
                  <Route path="pegawai" element={<UserManagementPage />} />
                  <Route
                    path="jadwal-kegiatan"
                    element={<JadwalKegiatanPage />}
                  />
                  <Route path="perjadin" element={<PerjadinMain />} />
                  <Route
                    path="perjadin/detail/:id"
                    element={<PerjadinDetail />}
                  />
                  <Route path="notifikasi" element={<KelolaNotifikasiPage />} />
                  <Route path="informasi" element={<InformasiManagement />} />
                  <Route path="berita" element={<BeritaManagement />} />
                  <Route path="absensi-management" element={<AbsensiManagementPage />} />
                  <Route path="video-meeting" element={<VideoMeetingListPage />} />
                  <Route path="anggaran" element={<RoleProtectedRoute allowedRoles={["bendahara", "superadmin"]}><AnggaranPage /></RoleProtectedRoute>} />
                  <Route path="anggaran/program-kegiatan" element={<RoleProtectedRoute allowedRoles={["bendahara", "superadmin"]}><ProgramKegiatanPage /></RoleProtectedRoute>} />
                  <Route path="anggaran/item-rka" element={<RoleProtectedRoute allowedRoles={["bendahara", "superadmin"]}><ItemAnggaranPage /></RoleProtectedRoute>} />
                  <Route path="anggaran/sht" element={<RoleProtectedRoute allowedRoles={["bendahara", "superadmin"]}><ShtPage /></RoleProtectedRoute>} />
                  <Route path="anggaran/detail-sub-kegiatan" element={<RoleProtectedRoute allowedRoles={["bendahara", "superadmin"]}><DetailSubKegiatanPage /></RoleProtectedRoute>} />
                  <Route path="anggaran/rekening-ref" element={<RoleProtectedRoute allowedRoles={["bendahara", "superadmin"]}><RekeningRefPage /></RoleProtectedRoute>} />
                  <Route path="pencairan/atk" element={<RoleProtectedRoute allowedRoles={["bendahara", "superadmin"]}><PencairanAtkListPage /></RoleProtectedRoute>} />
                  <Route path="pencairan/atk/new" element={<RoleProtectedRoute allowedRoles={["bendahara", "superadmin"]}><PencairanAtkFormPage /></RoleProtectedRoute>} />
                  <Route path="pencairan/atk/:id" element={<RoleProtectedRoute allowedRoles={["bendahara", "superadmin"]}><PencairanAtkDetailPage /></RoleProtectedRoute>} />
                  <Route path="pencairan/atk/:id/edit" element={<RoleProtectedRoute allowedRoles={["bendahara", "superadmin"]}><PencairanAtkFormPage /></RoleProtectedRoute>} />
                  <Route path="pencairan/penyedia" element={<RoleProtectedRoute allowedRoles={["bendahara", "superadmin"]}><PenyediaPage /></RoleProtectedRoute>} />

                  {/* Arsip Barang — tujuan QR label ada di "arsip-barang/qr/:token" */}
                  <Route path="arsip-barang" element={<ArsipBarangPage />} />
                  <Route path="arsip-barang/baru" element={<ArsipBarangFormPage />} />
                  <Route path="arsip-barang/qr/:token" element={<ArsipBarangQrPage />} />
                  <Route path="arsip-barang/:id" element={<ArsipBarangDetailPage />} />
                  <Route path="arsip-barang/:id/edit" element={<ArsipBarangFormPage />} />
                </Route>

                {/* Video Meeting Room - MAINTENANCE */}
                <Route
                  path="/meet/:roomId"
                  element={<VideoMeetingPage />}
                />

                <Route path="/hari-jadi-bogor-544" element={<EventAttendancePublicPage mode="scan" />} />
                <Route path="/hari-jadi-bogor-544/form" element={<EventAttendancePublicPage mode="form" />} />

                {/* Rute Superadmin - Full System Control */}
                <Route
                  path="/superadmin"
                  element={
                    <RoleProtectedRoute allowedRoles={["superadmin"]}>
                      <SuperadminLayout />
                    </RoleProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<SuperadminDashboard />} />
                  <Route path="users" element={<UserManagementPage />} />
                  <Route path="kepegawaian" element={<KepegawaianPage />} />
                  <Route path="kepegawaian/:id" element={<PegawaiDetailPage />} />
                  {/* Role Management removed - already in User Management tabs */}
                  <Route path="bidang" element={<BidangNavigationPage />} />
                  <Route path="activity-logs" element={<ActivityLogsPage />} />
                  <Route path="berita" element={<BeritaManagement />} />
                  <Route
                    path="hero-gallery"
                    element={<HeroGalleryManagement />}
                  />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="profile" element={<ProfilePage />} />

                  {/* Bidang landing pages - tetap di SuperadminLayout */}
                  <Route path="bidang/sekretariat" element={<SekretariatPage />} />
                  <Route path="bidang/spked" element={<SpkedPage />} />
                  <Route path="bidang/kkd" element={<KKDPage />} />
                  <Route path="bidang/pmd" element={<PMDPage />} />
                  <Route path="bidang/pemdes" element={<PemdesPage />} />

                  {/* Sekretariat sub-routes */}
                  <Route path="bidang/sekretariat/disposisi" element={<DisposisiRouter />} />
                  <Route path="bidang/sekretariat/disposisi/:id" element={<DisposisiDetail />} />
                  <Route path="bidang/sekretariat/pegawai" element={<UserManagementPage />} />
                  <Route path="bidang/sekretariat/jadwal-kegiatan" element={<JadwalKegiatanPage />} />
                  <Route path="bidang/sekretariat/perjadin" element={<PerjadinMain />} />
                  <Route path="bidang/sekretariat/perjadin/detail/:id" element={<PerjadinDetail />} />
                  <Route path="bidang/sekretariat/notifikasi" element={<KelolaNotifikasiPage />} />
                  <Route path="bidang/sekretariat/informasi" element={<InformasiManagement />} />
                  <Route path="bidang/sekretariat/berita" element={<BeritaManagement />} />
                  <Route path="bidang/sekretariat/absensi-management" element={<AbsensiManagementPage />} />
                  <Route path="bidang/sekretariat/video-meeting" element={<VideoMeetingListPage />} />
                  <Route path="bidang/sekretariat/anggaran" element={<RoleProtectedRoute allowedRoles={["bendahara", "superadmin"]}><AnggaranPage /></RoleProtectedRoute>} />
                  <Route path="bidang/sekretariat/anggaran/program-kegiatan" element={<RoleProtectedRoute allowedRoles={["bendahara", "superadmin"]}><ProgramKegiatanPage /></RoleProtectedRoute>} />
                  <Route path="bidang/sekretariat/anggaran/item-rka" element={<RoleProtectedRoute allowedRoles={["bendahara", "superadmin"]}><ItemAnggaranPage /></RoleProtectedRoute>} />
                  <Route path="bidang/sekretariat/anggaran/sht" element={<RoleProtectedRoute allowedRoles={["bendahara", "superadmin"]}><ShtPage /></RoleProtectedRoute>} />
                  <Route path="bidang/sekretariat/anggaran/detail-sub-kegiatan" element={<RoleProtectedRoute allowedRoles={["bendahara", "superadmin"]}><DetailSubKegiatanPage /></RoleProtectedRoute>} />
                  <Route path="bidang/sekretariat/anggaran/rekening-ref" element={<RoleProtectedRoute allowedRoles={["bendahara", "superadmin"]}><RekeningRefPage /></RoleProtectedRoute>} />
                  <Route path="bidang/sekretariat/pencairan/atk" element={<RoleProtectedRoute allowedRoles={["bendahara", "superadmin"]}><PencairanAtkListPage /></RoleProtectedRoute>} />
                  <Route path="bidang/sekretariat/pencairan/atk/new" element={<RoleProtectedRoute allowedRoles={["bendahara", "superadmin"]}><PencairanAtkFormPage /></RoleProtectedRoute>} />
                  <Route path="bidang/sekretariat/pencairan/atk/:id" element={<RoleProtectedRoute allowedRoles={["bendahara", "superadmin"]}><PencairanAtkDetailPage /></RoleProtectedRoute>} />
                  <Route path="bidang/sekretariat/pencairan/atk/:id/edit" element={<RoleProtectedRoute allowedRoles={["bendahara", "superadmin"]}><PencairanAtkFormPage /></RoleProtectedRoute>} />
                  <Route path="bidang/sekretariat/pencairan/penyedia" element={<RoleProtectedRoute allowedRoles={["bendahara", "superadmin"]}><PenyediaPage /></RoleProtectedRoute>} />

                  {/* Arsip Barang */}
                  <Route path="bidang/sekretariat/arsip-barang" element={<ArsipBarangPage />} />
                  <Route path="bidang/sekretariat/arsip-barang/baru" element={<ArsipBarangFormPage />} />
                  <Route path="bidang/sekretariat/arsip-barang/qr/:token" element={<ArsipBarangQrPage />} />
                  <Route path="bidang/sekretariat/arsip-barang/:id" element={<ArsipBarangDetailPage />} />
                  <Route path="bidang/sekretariat/arsip-barang/:id/edit" element={<ArsipBarangFormPage />} />

                  {/* KKD sub-routes */}
                  <Route path="bidang/kkd/add" element={<AddDashboard />} />
                  <Route path="bidang/kkd/bhprd" element={<BhprdDashboard />} />
                  <Route path="bidang/kkd/dd" element={<DdDashboard />} />
                  <Route path="bidang/kkd/bankeu" element={<KkdBankeuDashboard />} />
                  <Route path="bidang/kkd/bp" element={<KkdBpDashboard />} />

                  {/* PMD sub-routes */}
                  <Route path="bidang/pmd/kelembagaan" element={<Kelembagaan />} />
                  <Route path="bidang/pmd/kelembagaan/lainnya" element={<KelembagaanLainnyaPage />} />
                  <Route path="bidang/pmd/kelembagaan/posyandu-comparison" element={<PosyanduComparisonPage />} />
                  <Route path="bidang/pmd/kelembagaan/rtrw-comparison" element={<RtrwComparisonPage />} />
                  <Route path="bidang/pmd/kelembagaan/admin/:desaId" element={<AdminKelembagaanDetailPage />} />
                  <Route path="bidang/pmd/kelembagaan/admin/:desaId/:type" element={<KelembagaanList />} />
                  <Route path="bidang/pmd/kelembagaan/:type" element={<KelembagaanList />} />
                  <Route path="bidang/pmd/kelembagaan/:type/:id" element={<KelembagaanDetailPage />} />
                  <Route path="bidang/pmd/pengurus" element={<PengurusDashboardPage />} />
                  <Route path="bidang/pmd/pengurus/import" element={<PengurusImportPage />} />
                  <Route path="bidang/pmd/pengurus/:id" element={<PengurusDetailPage />} />
                  <Route path="bidang/pmd/pengurus/:id/edit" element={<PengurusEditPage />} />
                  <Route path="bidang/pmd/produk-hukum" element={<ProdukHukumPemdesPage />} />
                  <Route path="bidang/pmd/produk-hukum/:id" element={<ProdukHukumDetailPemdesPage />} />

                  {/* Pemdes sub-routes */}
                  <Route path="bidang/pemdes/profil-desa" element={<PemdesProfilDesaPage />} />
                  <Route path="bidang/pemdes/profil-desa/:desaId" element={<PemdesProfilDesaDetailPage />} />
                  <Route path="bidang/pemdes/aparatur-desa" element={<PemdesAparaturDesaPage />} />
                  <Route path="bidang/pemdes/produk-hukum" element={<ProdukHukumPemdesPage />} />
                  <Route path="bidang/pemdes/produk-hukum/:id" element={<ProdukHukumDetailPemdesPage />} />
                  <Route path="pesan" element={<MessagingPage />} />
                </Route>

                {/* Rute Kecamatan - Exclusive untuk Admin Kecamatan */}
                <Route
                  path="/kecamatan"
                  element={
                    <RoleProtectedRoute allowedRoles={["kecamatan"]}>
                      <KecamatanLayout />
                    </RoleProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route
                    path="dashboard"
                    element={<KecamatanDashboardPage />}
                  />
                  <Route path="bankeu" element={<KecamatanBankeuPage />} />
                  <Route path="bankeu-perubahan" element={<KecamatanBankeuPerubahanPage />} />
                  <Route
                    path="bankeu/verifikasi/:desaId"
                    element={<BankeuVerificationDetailPage />}
                  />
                  <Route
                    path="bankeu/tim-verifikasi/:desaId"
                    element={<KecamatanTimVerifikasiPage />}
                  />
                  <Route
                    path="bankeu-perubahan/tim-verifikasi/:desaId"
                    element={<KecamatanPerubahanTimProposalPage />}
                  />
                  <Route path="kelembagaan" element={<KecamatanKelembagaanPage />} />
                  <Route
                    path="kelembagaan/:desaId/:type"
                    element={<KelembagaanList />}
                  />
                  <Route
                    path="kelembagaan/:desaId/:type/:id"
                    element={<KelembagaanDetailPage />}
                  />
                  <Route path="pengurus/:id" element={<PengurusDetailPage />} />
                  <Route path="settings" element={<KecamatanSettings />} />
                  <Route path="change-password" element={<KecamatanChangePasswordPage />} />
                  <Route path="pesan" element={<MessagingPage />} />
                </Route>

                {/* Rute Dinas Terkait - Untuk verifikasi teknis */}
                <Route
                  path="/dinas"
                  element={
                    <RoleProtectedRoute
                      allowedRoles={["dinas_terkait", "verifikator_dinas"]}
                    >
                      <DinasLayout />
                    </RoleProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<DinasDashboardPage />} />
                  <Route path="bankeu" element={<DinasBankeuPage />} />
                  <Route
                    path="bankeu-perubahan"
                    element={<DinasBankeuPerubahanArsipPage />}
                  />
                  <Route
                    path="bankeu/verifikasi/:proposalId"
                    element={<DinasVerificationDetailPage />}
                  />
                  <Route path="konfigurasi" element={<DinasConfigPage />} />
                  <Route
                    path="verifikator"
                    element={<DinasVerifikatorPage />}
                  />
                  <Route path="profil" element={<VerifikatorProfilePage />} />
                  <Route path="ganti-password" element={<DinasChangePasswordPage />} />
                  <Route path="pesan" element={<MessagingPage />} />
                </Route>

                {/* Rute BPJS - Akses terbatas hanya ke RT/RW Comparison */}
                <Route
                  path="/bpjs"
                  element={
                    <RoleProtectedRoute allowedRoles={["bpjs"]}>
                      <BpjsLayout />
                    </RoleProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<BpjsDashboardPage />} />
                  <Route path="rtrw-comparison" element={<RtrwComparisonPage />} />
                  <Route path="*" element={<Navigate to="dashboard" replace />} />
                </Route>

                {/* Rute Core Dashboard - DPMD Internal Only */}
                {/* HANYA untuk: Super Admin, Kepala Dinas, Sekretaris Dinas, Kepala Bidang, Ketua Tim, Pegawai */}
                {/* TIDAK BOLEH diakses oleh: desa, kecamatan */}
                <Route
                  path="/core-dashboard"
                  element={
                    <RoleProtectedRoute
                      allowedRoles={[
                        "superadmin",
                        "kepala_dinas",
                        "sekretaris_dinas",
                        "kepala_bidang",
                        "ketua_tim",
                        "pegawai",
                      ]}
                    >
                      <CoreDashboardLayout />
                    </RoleProtectedRoute>
                  }
                >
                  <Route index element={<Navigate to="dashboard" replace />} />
                  <Route path="dashboard" element={<WelcomeDashboard />} />
                  <Route path="laporan-desa" element={<LaporanDesa />} />
                  <Route
                    path="statistik-bumdes"
                    element={<StatistikBumdes />}
                  />
                  <Route
                    path="statistik-kelembagaan"
                    element={<StatistikKelembagaan />}
                  />
                  <Route
                    path="statistik-profil-desa"
                    element={
                      <PemdesProfilDesaPage
                        backPath="/core-dashboard/dashboard"
                        backLabel="Kembali ke Core Dashboard"
                        detailBasePath="/core-dashboard/statistik-profil-desa"
                      />
                    }
                  />
                  <Route
                    path="statistik-profil-desa/:desaId"
                    element={
                      <PemdesProfilDesaDetailPage
                        listPath="/core-dashboard/statistik-profil-desa"
                        backLabel="Kembali ke Statistik Profil Desa"
                      />
                    }
                  />
                  <Route
                    path="statistik-produk-hukum"
                    element={
                      <ProdukHukumPemdesPage
                        detailBasePath="/core-dashboard/statistik-produk-hukum"
                      />
                    }
                  />
                  <Route
                    path="statistik-produk-hukum/:id"
                    element={
                      <ProdukHukumDetailPemdesPage
                        backPath="/core-dashboard/statistik-produk-hukum"
                      />
                    }
                  />
                  <Route
                    path="statistik-aparatur-desa"
                    element={
                      <PemdesAparaturDesaPage
                        mode="core-dashboard"
                        allowedTabs={["database", "external"]}
                      />
                    }
                  />
                  <Route
                    path="statistik-bankeu"
                    element={<StatistikBankeuDashboard />}
                  />
                  <Route
                    path="statistik-perjadin"
                    element={<StatistikPerjadinDashboard />}
                  />
                  <Route
                    path="statistik-kkd"
                    element={<StatistikKKDDashboard />}
                  />
                  <Route
                    path="statistik-add"
                    element={<StatistikAddDashboard />}
                  />
                  <Route path="statistik-bhprd" element={<BhprdDashboard />} />
                  {/* BHPRD Submenu Routes */}
                  <Route
                    path="statistik-bhprd-tahap1"
                    element={<StatistikBhprdT1 />}
                  />
                  <Route
                    path="statistik-bhprd-tahap2"
                    element={<StatistikBhprdT2 />}
                  />
                  <Route
                    path="statistik-bhprd-tahap3"
                    element={<StatistikBhprdT3 />}
                  />
                  <Route
                    path="statistik-dd"
                    element={<StatistikDdDashboard />}
                  />
                  {/* DD Submenu Routes */}
                  <Route
                    path="statistik-dd-earmarked-tahap1"
                    element={<StatistikDdEarmarkedT1 />}
                  />
                  <Route
                    path="statistik-dd-earmarked-tahap2"
                    element={<StatistikDdEarmarkedT2 />}
                  />
                  <Route
                    path="statistik-dd-nonearmarked-tahap1"
                    element={<StatistikDdNonEarmarkedT1 />}
                  />
                  <Route
                    path="statistik-dd-nonearmarked-tahap2"
                    element={<StatistikDdNonEarmarkedT2 />}
                  />
                  <Route
                    path="statistik-insentif-dd"
                    element={<StatistikInsentifDd />}
                  />
                  <Route path="trends" element={<TrendsPage />} />
                  
                  
                </Route>

                {/* Error Pages */}
                <Route path="/forbidden" element={<Forbidden />} />
                <Route path="/404" element={<NotFound />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>


            <Toaster
              position="top-right"
              reverseOrder={false}
              gutter={8}
              containerClassName=""
              containerStyle={{}}
              toastOptions={{
                // Define default options
                className: "",
                duration: 4000,
                style: {
                  background: "#363636",
                  color: "#fff",
                },
                // Default options for specific types
                success: {
                  duration: 3000,
                  theme: {
                    primary: "green",
                    secondary: "black",
                  },
                },
                error: {
                  duration: 4000,
                },
              }}
            />

            {/* Network Status Indicator */}
            <NetworkStatusIndicator />

            {/* Update Notification Modal */}
            <UpdateNotificationModal
              isOpen={showUpdateModal}
              onUpdate={handleUpdate}
              onDismiss={handleDismissUpdate}
            />
            </NetworkProvider>
          </ThemeColorWrapper>
        </EditModeProvider>
      </DataCacheProvider>
      </AlertProvider>
    </Router>
  );
}

export default App;
