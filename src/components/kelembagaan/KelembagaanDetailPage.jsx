import React, { useCallback, useEffect, useState, useRef } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useEditMode } from "../../context/EditModeContext";
import {
  getRw,
  getRt,
  updateRw,
  updateRt,
  listRt,
  createRt,
  getPosyandu,
  updatePosyandu,
  listKarangTaruna,
  updateKarangTaruna,
  listLpm,
  updateLpm,
  listPkk,
  updatePkk,
  listSatlinmas,
  updateSatlinmas,
  toggleKelembagaanStatus,
  toggleKelembagaanVerification,
} from "../../services/kelembagaan";
import { getProdukHukums } from "../../services/api";
import { getPengurusByKelembagaan } from "../../services/pengurus";
import PengurusKelembagaan from "./PengurusKelembagaan";
import SearchableProdukHukumSelect from "../shared/SearchableProdukHukumSelect";
import ProfilCard from "./ProfilCard";
import AnakLembagaCard from "./AnakLembagaCard";
import AktivitasLog from "./AktivitasLog";
import { FaArrowLeft, FaHome, FaChevronRight } from "react-icons/fa";
import { LuLock, LuLockOpen } from "react-icons/lu";
import {
  showSuccessAlert,
  showErrorAlert,
  showLoadingAlert,
  showConfirmAlert,
} from "../../utils/sweetAlert";

// Helper function to get display name for kelembagaan type
const getDisplayName = (type) => {
  const mapping = {
    rw: "RW",
    rt: "RT",
    posyandu: "Posyandu",
    "karang-taruna": "Karang Taruna",
    lpm: "LPM",
    pkk: "PKK",
    satlinmas: "Satlinmas",
  };
  return mapping[type] || type.toUpperCase();
};

// Simple Modal for editing alamat and name/nomor
const EditModal = ({
  title,
  isOpen,
  onClose,
  children,
  onSubmit,
  submitLabel = "Simpan",
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        <div className="space-y-3">{children}</div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="px-3 py-2 bg-gray-100 rounded" onClick={onClose}>
            Batal
          </button>
          <button
            className="px-3 py-2 bg-indigo-600 text-white rounded"
            onClick={onSubmit}
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function KelembagaanDetailPage({
  isAdminView: propIsAdminView,
}) {
  const { user, isKelembagaanAdmin } = useAuth();
  const { isEditMode } = useEditMode();
  const { type, id, desaId: routeDesaId } = useParams();
  const navigate = useNavigate();
  const aktivitasLogRef = useRef(null);

  // Auto-detect admin mode
  const isAdmin = propIsAdminView ?? isKelembagaanAdmin();
  const targetDesaId = routeDesaId || user?.desa_id;

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    nama: "",
    nomor: "",
    alamat: "",
    produk_hukum_id: "",
  });
  const [produkHukumList, setProdukHukumList] = useState([]);
  const [anak, setAnak] = useState([]);
  const [pengurusCount, setPengurusCount] = useState(0);

  const loadDetail = useCallback(async () => {
    setLoading(true);
    try {
      let data = null;
      if (type === "rw") {
        const res = await getRw(id);
        data = res?.data?.data;

        // RT data already included in RW response, no need for separate fetch
        if (data?.rts) {
          setAnak(data.rts);
          
        }
      } else if (type === "rt") {
        const res = await getRt(id);
        data = res?.data?.data;
      } else if (type === "posyandu") {
        // try get single if available, else list and find
        if (typeof getPosyandu === "function") {
          try {
            const res = await getPosyandu(id);
            data = res?.data?.data;
          } catch (error) {
            // Silent catch for fallback
            console.warn(
              "Failed to get single posyandu, falling back to list:",
              error
            );
          }
        }
        if (!data) {
          const svc = await import("../../services/kelembagaan");
          const res = await svc.listPosyandu();
          data = (res?.data?.data || []).find(
            (p) => String(p.id) === String(id)
          );
        }
      } else if (["karang-taruna", "lpm", "pkk", "satlinmas"].includes(type)) {
        // fetch list and pick by id
        await import("../../services/kelembagaan");
        let res;
        if (type === "karang-taruna") res = await listKarangTaruna();
        if (type === "lpm") res = await listLpm();
        if (type === "pkk") res = await listPkk();
        if (type === "satlinmas") res = await listSatlinmas();
        data =
          (res?.data?.data || []).find((x) => String(x.id) === String(id)) ||
          (res?.data?.data || [])[0] ||
          null;
      }
      setDetail(data);
    } catch (err) {
      console.error("Gagal memuat detail kelembagaan:", err);
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [type, id]);

  // Fetch produk hukum list for the dropdown
  const fetchProdukHukumList = useCallback(async () => {
    try {
      const res = await getProdukHukums(1, ""); // Get all produk hukum
      const allData = res?.data?.data || [];
      setProdukHukumList(allData.data || []);
    } catch (err) {
      console.error("Gagal memuat daftar produk hukum:", err);
      setProdukHukumList([]);
    }
  }, []);

  // Fetch pengurus count
  const fetchPengurusCount = useCallback(async () => {
    if (!detail?.id || !type) {
      return;
    }

    try {
      // Use targetDesaId from component state
      const adminDesaId = isAdmin ? targetDesaId : null;

      const res = await getPengurusByKelembagaan(type, detail.id, adminDesaId);

      const pengurusList = res?.data?.data || [];

      setPengurusCount(pengurusList.length);
    } catch (err) {
      console.error("Error fetching pengurus count:", err);
      setPengurusCount(0);
    }
  }, [detail, type, isAdmin, targetDesaId]);

  useEffect(() => {
    loadDetail();
    fetchProdukHukumList();
  }, [loadDetail, fetchProdukHukumList]);

  // Load pengurus count when detail is available
  useEffect(() => {
    if (detail?.id && type) {
      fetchPengurusCount();
    }
  }, [fetchPengurusCount, detail?.id, type]);

  const handleOpenEdit = () => {
    setEditForm({
      nama: detail?.nama || detail?.nama_lembaga || "",
      nomor: detail?.nomor || "",
      alamat: detail?.alamat || "",
      produk_hukum_id: detail?.produk_hukum_id || "",
    });
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      // Show loading alert
      showLoadingAlert("Menyimpan Data...", "Mohon tunggu sebentar");

      const payload = { ...detail };
      // Update only allowed fields for now
      if (type === "rw" || type === "rt") payload.nomor = editForm.nomor;
      if (type !== "rw" && type !== "rt")
        payload.nama = editForm.nama || payload.nama;
      payload.alamat = editForm.alamat;
      payload.produk_hukum_id = editForm.produk_hukum_id || null;

      if (type === "rw") await updateRw(detail.id, payload);
      else if (type === "rt") await updateRt(detail.id, payload);
      else if (type === "posyandu") await updatePosyandu(detail.id, payload);
      else if (type === "karang-taruna")
        await updateKarangTaruna(detail.id, payload);
      else if (type === "lpm") await updateLpm(detail.id, payload);
      else if (type === "pkk") await updatePkk(detail.id, payload);
      else if (type === "satlinmas") await updateSatlinmas(detail.id, payload);

      // Update local state with new data
      setDetail((prevDetail) => ({
        ...prevDetail,
        nomor: editForm.nomor || prevDetail.nomor,
        nama: editForm.nama || prevDetail.nama,
        nama_lembaga: editForm.nama || prevDetail.nama_lembaga,
        alamat: editForm.alamat,
        produk_hukum_id: editForm.produk_hukum_id || null,
      }));

      setIsEditOpen(false);

      // Show success alert
      showSuccessAlert("Berhasil!", "Data kelembagaan berhasil disimpan");
    } catch (err) {

      const errorMessage = err.response?.data?.message || err.message;

      // Show error alert
      showErrorAlert("Gagal!", `Gagal menyimpan perubahan: ${errorMessage}`);
    }
  };

  const handleToggleStatus = async (kelembagaanId, currentStatus) => {
    const newStatus = currentStatus === "aktif" ? "nonaktif" : "aktif";

    // Show confirmation alert
    const result = await showConfirmAlert(
      "Konfirmasi Perubahan Status",
      `Apakah Anda yakin ingin mengubah status menjadi ${
        newStatus === "aktif" ? "Aktif" : "Tidak Aktif"
      }?`,
      "warning"
    );

    if (!result.isConfirmed) return;

    try {
      // Show loading alert
      showLoadingAlert("Mengubah Status...", "Mohon tunggu sebentar");

      // Menggunakan function toggle khusus
      await toggleKelembagaanStatus(type, kelembagaanId, newStatus);

      // Update local state instead of reloading
      setDetail((prevDetail) => ({
        ...prevDetail,
        status_kelembagaan: newStatus,
      }));

      // Show success alert first
      showSuccessAlert(
        "Berhasil!",
        `Status kelembagaan berhasil diubah menjadi ${
          newStatus === "aktif" ? "Aktif" : "Tidak Aktif"
        }`
      );

      // Refresh activity logs after a short delay to ensure backend has logged
      setTimeout(() => {
        if (aktivitasLogRef.current) {
          aktivitasLogRef.current.refresh();
        }
      }, 500);
    } catch (err) {

      const errorMessage =
        err.response?.data?.message || err.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(", ")
          : err.message;

      // Show error alert
      showErrorAlert(
        "Gagal!",
        `Gagal mengubah status kelembagaan: ${errorMessage}`
      );
    }
  };

  const handleToggleVerification = async (kelembagaanId, currentStatus) => {
    const newStatus = currentStatus === "verified" ? "unverified" : "verified";

    // Show confirmation alert
    const result = await showConfirmAlert(
      "Konfirmasi Verifikasi",
      `Apakah Anda yakin ingin ${
        newStatus === "verified" ? "memverifikasi" : "membatalkan verifikasi"
      } kelembagaan ini?`,
      "warning"
    );

    if (!result.isConfirmed) return;

    try {
      // Show loading alert
      showLoadingAlert("Mengubah Verifikasi...", "Mohon tunggu sebentar");

      // Menggunakan function toggle khusus
      await toggleKelembagaanVerification(type, kelembagaanId, newStatus);

      // Update local state instead of reloading
      setDetail((prevDetail) => ({
        ...prevDetail,
        status_verifikasi: newStatus,
      }));

      // Show success alert first
      showSuccessAlert(
        "Berhasil!",
        `Status verifikasi berhasil diubah menjadi ${
          newStatus === "verified" ? "Terverifikasi" : "Belum Diverifikasi"
        }`
      );

      // Refresh activity logs after a short delay to ensure backend has logged
      setTimeout(() => {
        if (aktivitasLogRef.current) {
          aktivitasLogRef.current.refresh();
        }
      }, 500);
    } catch (err) {

      const errorMessage =
        err.response?.data?.message || err.response?.data?.errors
          ? Object.values(err.response.data.errors).flat().join(", ")
          : err.message;

      // Show error alert
      showErrorAlert(
        "Gagal!",
        `Gagal mengubah status verifikasi: ${errorMessage}`
      );
    }
  };

  const handleAddRT = async (nomorRT) => {
    try {
      // Show loading alert
      showLoadingAlert("Menambah RT...", "Mohon tunggu sebentar");

      const payload = {
        nomor: nomorRT,
        rw_id: detail.id,
        desa_id: user.desa_id || detail.desa_id,
        alamat: detail.alamat || "", // Use RW address as default
      };

      await createRt(payload);

      // Reload anak data to show new RT
      const rts = await listRt();
      const list = (rts?.data?.data || []).filter(
        (r) => String(r.rw_id) === String(detail.id)
      );
      setAnak(list);

      // Show success alert
      showSuccessAlert("Berhasil!", `RT ${nomorRT} berhasil ditambahkan`);
    } catch (error) {

      const errorMessage = error.response?.data?.message || error.message;

      // Show error alert
      showErrorAlert("Gagal!", `Gagal menambah RT: ${errorMessage}`);

      throw error;
    }
  };

  if (loading) return <p className="p-6 text-center">Memuat...</p>;
  if (!detail)
    return (
      <p className="p-6 text-center text-red-500">Data tidak ditemukan.</p>
    );

  return (
    <div className="min-h-full">
      {/* Breadcrumb */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4 px-4 py-3">
        <div className="flex items-center justify-between gap-4">
        

          {/* Breadcrumb */}
          <nav className="flex items-center space-x-2 text-sm flex-1 overflow-x-auto">
          <Link
            to={isAdmin ? "/bidang/pmd/kelembagaan" : "/desa/dashboard"}
            className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors"
          >
            <FaHome className="mr-1" />
            Dashboard
          </Link>
          <FaChevronRight className="text-gray-400 text-xs" />
          <Link
            to={isAdmin ? `/bidang/pmd/kelembagaan` : `/desa/kelembagaan`}
            className="text-gray-500 hover:text-indigo-600 transition-colors"
          >
            Kelembagaan
          </Link>
          <FaChevronRight className="text-gray-400 text-xs" />
          
          {/* Admin: Show Desa name and link */}
          {isAdmin && detail?.desa_id && (
            <>
              <Link
                to={`/bidang/pmd/kelembagaan/admin/${detail.desa_id}`}
                className="text-gray-500 hover:text-indigo-600 transition-colors"
              >
                {detail?.desas?.nama || detail?.desa?.nama || "Desa"}
              </Link>
              <FaChevronRight className="text-gray-400 text-xs" />
            </>
          )}
          
          {type === "rt" && detail?.rw ? (
            <>
              <Link
                to={
                  isAdmin
                    ? `/bidang/pmd/kelembagaan/rw`
                    : `/desa/kelembagaan/rw`
                }
                className="text-gray-500 hover:text-indigo-600 transition-colors"
              >
                RW
              </Link>
              <FaChevronRight className="text-gray-400 text-xs" />
              <Link
                to={
                  isAdmin
                    ? `/bidang/pmd/kelembagaan/rw/${detail.rw_id}`
                    : `/desa/kelembagaan/rw/${detail.rw_id}`
                }
                className="text-gray-500 hover:text-indigo-600 transition-colors"
              >
                RW {detail.rw?.nomor || ""}
              </Link>
              <FaChevronRight className="text-gray-400 text-xs" />
              <span className="text-gray-900 font-medium">
                RT {detail?.nomor || "Detail"}
              </span>
            </>
          ) : ["satlinmas", "karang-taruna", "lpm", "pkk"].includes(type) ? (
            <>
              <span className="text-gray-900 font-medium">
                {getDisplayName(type)}
              </span>
            </>
          ) : (
            <>
              <Link
                to={
                  isAdmin
                    ? `/bidang/pmd/kelembagaan/${type}`
                    : `/desa/kelembagaan/${type}`
                }
                className="text-gray-500 hover:text-indigo-600 transition-colors"
              >
                {getDisplayName(type)}
              </Link>
              <FaChevronRight className="text-gray-400 text-xs" />
              <span className="text-gray-900 font-medium">
                {detail?.nama || detail?.nomor || "Detail"}
              </span>
            </>
          )}
          </nav>

		    {/* Status Badge */}
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
              isEditMode
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-red-100 text-red-700 border border-red-300"
            }`}
          >
            {isEditMode ? (
              <>
                <LuLockOpen className="w-3 h-3" />
                <span>Aplikasi Dibuka</span>
              </>
            ) : (
              <>
                <LuLock className="w-3 h-3" />
                <span>Aplikasi Ditutup</span>
              </>
            )}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="col-span-1 lg:col-span-2 space-y-4">
          <ProfilCard
            profil={detail}
            type={type}
            onEdit={handleOpenEdit}
            rtCount={type === "rw" ? anak.length : 0}
            pengurusCount={pengurusCount}
            onToggleStatus={handleToggleStatus}
            onToggleVerification={handleToggleVerification}
            produkHukumList={produkHukumList}
          />

          <PengurusKelembagaan
            kelembagaanType={type}
            kelembagaanId={detail.id}
            desaId={detail.desa_id}
            onPengurusCountChange={setPengurusCount}
          />
        </div>
        <div className="space-y-4">
          {type === "rw" && (
            <AnakLembagaCard
              list={anak}
              label="Daftar RT"
              onClickItem={(rt) =>
                navigate(
                  isAdmin
                    ? `/bidang/pmd/kelembagaan/rt/${rt.id}`
                    : `/desa/kelembagaan/rt/${rt.id}`
                )
              }
              onAddRT={handleAddRT}
              rwId={detail.id}
            />
          )}
          <AktivitasLog
            ref={aktivitasLogRef}
            lembagaType={type}
            lembagaId={id}
          />
        </div>
      </div>{" "}
      <EditModal
        title="Edit Kelembagaan"
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSubmit={handleSaveEdit}
      >
        {type !== "rw" && type !== "rt" ? (
          <div>
            <label className="block text-sm font-medium">Nama</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={editForm.nama}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, nama: e.target.value }))
              }
              placeholder="Nama lembaga"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium">Nomor</label>
            <input
              className="mt-1 w-full border rounded px-3 py-2"
              value={editForm.nomor}
              onChange={(e) =>
                setEditForm((f) => ({ ...f, nomor: e.target.value }))
              }
              placeholder="Nomor"
            />
          </div>
        )}
        <div>
          <label className="block text-sm font-medium">Alamat</label>
          <input
            className="mt-1 w-full border rounded px-3 py-2"
            value={editForm.alamat}
            onChange={(e) =>
              setEditForm((f) => ({ ...f, alamat: e.target.value }))
            }
            placeholder="Alamat"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            SK Pembentukan Lembaga
          </label>
          <SearchableProdukHukumSelect
            value={editForm.produk_hukum_id}
            onChange={(id) =>
              setEditForm((f) => ({ ...f, produk_hukum_id: id }))
            }
            produkHukumList={produkHukumList}
          />
          <p className="text-xs text-gray-500 mt-1">
            Pilih produk hukum sebagai dasar pembentukan lembaga ini
          </p>
        </div>
      </EditModal>
    </div>
  );
}
