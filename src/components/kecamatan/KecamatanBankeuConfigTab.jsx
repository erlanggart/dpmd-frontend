import React, { useEffect, useState, useRef } from "react";
import api from "../../api";
import Swal from "sweetalert2";
import SignatureCanvas from "react-signature-canvas";
import {
  LuSave, LuPencil, LuX, LuCheck, LuCog, LuUsers, LuUpload, LuImage, LuChevronDown, LuPenTool
} from "react-icons/lu";
import { JABATAN_OPTIONS, getJabatanBgColor } from "../../constants/jabatanOptions";

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const KecamatanBankeuConfigTab = () => {
  const [config, setConfig] = useState(null);
  const [timVerifikasi, setTimVerifikasi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editingTeam, setEditingTeam] = useState(false);
  const [openSections, setOpenSections] = useState({
    kopSurat: false,
    penandatanganan: false,
    timVerifikasi: false
  });
  const [formData, setFormData] = useState({
    nama_camat: "",
    nip_camat: "",
    alamat: "",
    telepon: "",
    email: "",
    website: "",
    kode_pos: ""
  });
  const [newTeamMember, setNewTeamMember] = useState({
    jabatan: "anggota",
    nama: "",
    nip: "",
    jabatan_label: ""
  });
  const [uploadingSignatures, setUploadingSignatures] = useState({});
  const [signaturePads, setSignaturePads] = useState({});
  const sigCanvasRefs = useRef({});
  const camatSigCanvasRef = useRef(null);

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem("user"));
      
      const [configRes, timRes] = await Promise.all([
        api.get(`/kecamatan/bankeu/config/${user.kecamatan_id}`),
        api.get(`/kecamatan/bankeu/tim-verifikasi/${user.kecamatan_id}`)
      ]);

      setConfig(configRes.data.data);
      setFormData({
        nama_camat: configRes.data.data?.nama_camat || "",
        nip_camat: configRes.data.data?.nip_camat || "",
        alamat: configRes.data.data?.alamat || "",
        telepon: configRes.data.data?.telepon || "",
        email: configRes.data.data?.email || "",
        website: configRes.data.data?.website || "",
        kode_pos: configRes.data.data?.kode_pos || ""
      });
      setTimVerifikasi(timRes.data.data || []);
    } catch (error) {
      console.error("Error fetching config:", error);
      if (error.response?.status !== 404) {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: "Gagal memuat konfigurasi"
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      
      const response = await api.post(`/kecamatan/bankeu/config/${user.kecamatan_id}`, formData);
      
      setConfig(response.data.data);
      setEditing(false);
      
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Konfigurasi kecamatan berhasil disimpan",
        timer: 2000
      });
    } catch (error) {
      console.error("Error saving config:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.response?.data?.message || "Gagal menyimpan konfigurasi"
      });
    }
  };

  const handleAddTeamMember = async () => {
    if (!newTeamMember.nama || !newTeamMember.nip) {
      Swal.fire({
        icon: "warning",
        title: "Data Tidak Lengkap",
        text: "Nama dan NIP wajib diisi"
      });
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      
      const response = await api.post(
        `/kecamatan/bankeu/tim-verifikasi/${user.kecamatan_id}`,
        newTeamMember
      );

      setTimVerifikasi([...timVerifikasi, response.data.data]);
      setNewTeamMember({
        jabatan: "anggota",
        nama: "",
        nip: "",
        jabatan_label: ""
      });
      setEditingTeam(false);

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Anggota tim verifikasi berhasil ditambahkan",
        timer: 2000
      });
    } catch (error) {
      console.error("Error adding team member:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.response?.data?.message || "Gagal menambahkan anggota tim"
      });
    }
  };

  const handleRemoveTeamMember = async (id) => {
    const result = await Swal.fire({
      title: "Hapus Anggota",
      text: "Apakah Anda yakin ingin menghapus anggota tim ini?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus",
      cancelButtonText: "Batal"
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/kecamatan/bankeu/tim-verifikasi/${id}`);
        setTimVerifikasi(timVerifikasi.filter(t => t.id !== id));
        
        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Anggota tim verifikasi berhasil dihapus",
          timer: 2000
        });
      } catch (error) {
        console.error("Error removing team member:", error);
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: error.response?.data?.message || "Gagal menghapus anggota tim"
        });
      }
    }
  };

  const handleUploadSignature = async (memberId, file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: "error",
        title: "Format File Salah",
        text: "Hanya file gambar yang diizinkan (PNG, JPG, dst)"
      });
      return;
    }

    try {
      setUploadingSignatures({ ...uploadingSignatures, [memberId]: true });

      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post(
        `/kecamatan/bankeu/tim-verifikasi/${memberId}/upload-signature`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setTimVerifikasi(
        timVerifikasi.map(t =>
          t.id === memberId ? { ...t, ttd_path: response.data.data.ttd_path } : t
        )
      );

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Tanda tangan berhasil diupload",
        timer: 2000
      });
    } catch (error) {
      console.error("Error uploading signature:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.response?.data?.message || "Gagal mengupload tanda tangan"
      });
    } finally {
      setUploadingSignatures({ ...uploadingSignatures, [memberId]: false });
    }
  };

  const handleSaveSignature = async (memberId) => {
    // Handle camat signature
    if (memberId === 'camat') {
      const sigCanvas = camatSigCanvasRef.current;
      if (!sigCanvas || sigCanvas.isEmpty()) {
        Swal.fire({
          icon: "warning",
          title: "Tanda Tangan Kosong",
          text: "Silakan gambar tanda tangan terlebih dahulu"
        });
        return;
      }

      try {
        setUploadingSignatures({ ...uploadingSignatures, camat: true });

        // Convert canvas to blob
        const dataUrl = sigCanvas.toDataURL();
        const blob = await fetch(dataUrl).then(res => res.blob());
        
        const formData = new FormData();
        formData.append("file", blob, "signature.png");

        const response = await api.post(
          `/kecamatan/bankeu/config/${config.kecamatan_id}/upload-camat-signature`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        setConfig({
          ...config,
          ttd_camat_path: response.data.data.ttd_camat_path
        });

        // Close signature pad
        setSignaturePads({ ...signaturePads, camat: false });

        Swal.fire({
          icon: "success",
          title: "Berhasil",
          text: "Tanda tangan camat berhasil disimpan",
          timer: 2000
        });
        fetchConfig();
      } catch (error) {
        console.error("Error saving camat signature:", error);
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: error.response?.data?.message || "Gagal menyimpan tanda tangan"
        });
      } finally {
        setUploadingSignatures({ ...uploadingSignatures, camat: false });
      }
      return;
    }

    // Handle tim verifikasi signature
    const sigCanvas = sigCanvasRefs.current[memberId];
    if (!sigCanvas || sigCanvas.isEmpty()) {
      Swal.fire({
        icon: "warning",
        title: "Tanda Tangan Kosong",
        text: "Silakan gambar tanda tangan terlebih dahulu"
      });
      return;
    }

    try {
      setUploadingSignatures({ ...uploadingSignatures, [memberId]: true });

      // Convert canvas to blob
      const dataUrl = sigCanvas.toDataURL();
      const blob = await fetch(dataUrl).then(res => res.blob());
      
      const formData = new FormData();
      formData.append("file", blob, "signature.png");

      const response = await api.post(
        `/kecamatan/bankeu/tim-verifikasi/${memberId}/upload-signature`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setTimVerifikasi(
        timVerifikasi.map(t =>
          t.id === memberId ? { ...t, ttd_path: response.data.data.ttd_path } : t
        )
      );

      // Close signature pad
      setSignaturePads({ ...signaturePads, [memberId]: false });

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Tanda tangan berhasil disimpan",
        timer: 2000
      });
    } catch (error) {
      console.error("Error saving signature:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.response?.data?.message || "Gagal menyimpan tanda tangan"
      });
    } finally {
      setUploadingSignatures({ ...uploadingSignatures, [memberId]: false });
    }
  };

  const handleDeleteCamatSignature = async () => {
    try {
      await api.delete(`/kecamatan/bankeu/config/${config.kecamatan_id}/delete-camat-signature`);
      setConfig({
        ...config,
        ttd_camat_path: null
      });
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Tanda tangan camat berhasil dihapus",
        timer: 2000
      });
      fetchConfig();
    } catch (error) {
      console.error("Error deleting camat signature:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.response?.data?.message || "Gagal menghapus tanda tangan"
      });
    }
  };

  const handleUploadCamatSignature = async (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      Swal.fire({
        icon: "error",
        title: "Format File Salah",
        text: "Hanya file gambar yang diizinkan (PNG, JPG, dst)"
      });
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post(
        `/kecamatan/bankeu/config/${user.kecamatan_id}/upload-camat-signature`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setConfig(response.data.data);

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Tanda tangan camat berhasil diupload",
        timer: 2000
      });
    } catch (error) {
      console.error("Error uploading camat signature:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.response?.data?.message || "Gagal mengupload tanda tangan camat"
      });
    }
  };

  const handleUploadStempel = async (file) => {
    if (!file) return;

    // Validate file type - must be PNG for transparency
    if (file.type !== 'image/png') {
      Swal.fire({
        icon: "error",
        title: "Format File Salah",
        text: "Stempel harus berformat PNG transparan"
      });
      return;
    }

    try {
      const user = JSON.parse(localStorage.getItem("user"));
      
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post(
        `/kecamatan/bankeu/config/${user.kecamatan_id}/upload-stempel`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setConfig(response.data.data);

      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Stempel berhasil diupload",
        timer: 2000
      });
    } catch (error) {
      console.error("Error uploading stempel:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.response?.data?.message || "Gagal mengupload stempel"
      });
    }
  };

  const handleDeleteStempel = async () => {
    try {
      await api.delete(`/kecamatan/bankeu/config/${config.kecamatan_id}/delete-stempel`);
      setConfig({
        ...config,
        stempel_path: null
      });
      Swal.fire({
        icon: "success",
        title: "Berhasil",
        text: "Stempel berhasil dihapus",
        timer: 2000
      });
      fetchConfig();
    } catch (error) {
      console.error("Error deleting stempel:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.response?.data?.message || "Gagal menghapus stempel"
      });
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Memuat konfigurasi...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Konfigurasi Kop Surat */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <button
          onClick={() => toggleSection('kopSurat')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <LuImage className="w-6 h-6 text-blue-600" />
            Konfigurasi Kop Surat
          </h2>
          <LuChevronDown 
            className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${
              openSections.kopSurat ? 'rotate-180' : ''
            }`}
          />
        </button>

        <div 
          className={`transition-all duration-300 ease-in-out ${
            openSections.kopSurat ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          } overflow-hidden`}
        >
          <div className="px-6 pb-6 pt-2 border-t">
            {!editing && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <LuPencil className="w-4 h-4" />
                  Edit
                </button>
              </div>
            )}

        {editing ? (
          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alamat Kantor Kecamatan
                </label>
                <textarea
                  value={formData.alamat}
                  onChange={(e) => setFormData({ ...formData, alamat: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                  placeholder="Masukkan alamat kantor kecamatan"
                />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telepon
                  </label>
                  <input
                    type="text"
                    value={formData.telepon}
                    onChange={(e) => setFormData({ ...formData, telepon: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                    placeholder="Contoh: (0274) 123456"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                  placeholder="email@kecamatan.go.id"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="text"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                  placeholder="www.kecamatan.go.id"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kode Pos
                </label>
                <input
                  type="text"
                  value={formData.kode_pos}
                  onChange={(e) => setFormData({ ...formData, kode_pos: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none"
                  placeholder="55xxx"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setFormData({
                    nama_camat: config?.nama_camat || "",
                    nip_camat: config?.nip_camat || "",
                    alamat: config?.alamat || "",
                    telepon: config?.telepon || "",
                    email: config?.email || "",
                    website: config?.website || "",
                    kode_pos: config?.kode_pos || ""
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <LuX className="w-4 h-4" />
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <LuSave className="w-4 h-4" />
                Simpan
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="text-xs font-semibold text-gray-600 uppercase">Alamat Kantor</label>
              <p className="text-gray-900 mt-1 whitespace-pre-wrap">
                {config?.alamat || "-"}
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-xs font-semibold text-gray-600 uppercase">Telepon</label>
                <p className="text-gray-900 mt-1">
                  {config?.telepon || "-"}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-xs font-semibold text-gray-600 uppercase">Email</label>
                <p className="text-gray-900 mt-1">
                  {config?.email || "-"}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-xs font-semibold text-gray-600 uppercase">Website</label>
                <p className="text-gray-900 mt-1">
                  {config?.website || "-"}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-xs font-semibold text-gray-600 uppercase">Kode Pos</label>
                <p className="text-gray-900 mt-1">
                  {config?.kode_pos || "-"}
                </p>
              </div>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Konfigurasi Penandatanganan */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <button
          onClick={() => toggleSection('penandatanganan')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <LuCog className="w-6 h-6 text-violet-600" />
            Konfigurasi Penandatanganan
          </h2>
          <LuChevronDown 
            className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${
              openSections.penandatanganan ? 'rotate-180' : ''
            }`}
          />
        </button>

        <div 
          className={`transition-all duration-300 ease-in-out ${
            openSections.penandatanganan ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          } overflow-hidden`}
        >
          <div className="px-6 pb-6 pt-2 border-t">
            {!editing && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  <LuPencil className="w-4 h-4" />
                  Edit
                </button>
              </div>
            )}

            {editing ? (
              <form className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nama Camat
                    </label>
                    <input
                      type="text"
                      value={formData.nama_camat}
                      onChange={(e) => setFormData({ ...formData, nama_camat: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:border-transparent outline-none"
                      placeholder="Masukkan nama camat"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      NIP Camat
                    </label>
                    <input
                      type="text"
                      value={formData.nip_camat}
                      onChange={(e) => setFormData({ ...formData, nip_camat: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:border-transparent outline-none"
                  placeholder="Masukkan NIP camat"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 space-y-4">
              {/* Tanda Tangan Camat dengan Canvas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Tanda Tangan Camat
                </label>
                
                {!config?.ttd_camat_path ? (
                  <div>
                    {!signaturePads.camat ? (
                      <button
                        type="button"
                        onClick={() => setSignaturePads({ ...signaturePads, camat: true })}
                        className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2"
                      >
                        <LuPenTool className="w-4 h-4" />
                        Gambar Tanda Tangan
                      </button>
                    ) : (
                      <div className="border-2 border-violet-300 rounded-lg p-3 bg-white">
                        <SignatureCanvas
                          ref={camatSigCanvasRef}
                          canvasProps={{
                            className: 'signature-canvas w-full h-32 border border-gray-300 rounded',
                            style: { width: '100%', height: '128px' }
                          }}
                        />
                        <div className="flex gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => handleSaveSignature('camat')}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                          >
                            <LuCheck className="w-4 h-4" />
                            Simpan
                          </button>
                          <button
                            type="button"
                            onClick={() => camatSigCanvasRef.current?.clear()}
                            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={() => setSignaturePads({ ...signaturePads, camat: false })}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex gap-4 items-start">
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 mb-2">Tanda Tangan Saat Ini</p>
                      <img 
                        src={`${imageBaseUrl}/storage/uploads/${config.ttd_camat_path}`}
                        alt="Tanda Tangan Camat"
                        className="h-20 border border-gray-200 rounded p-2 bg-gray-50"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Hapus tanda tangan yang ada dan gambar ulang?')) {
                          handleDeleteCamatSignature();
                          setSignaturePads({ ...signaturePads, camat: true });
                        }
                      }}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Gambar Ulang
                    </button>
                  </div>
                )}
              </div>

              {/* Stempel Kecamatan */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Stempel Kecamatan (PNG Transparan)
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Upload stempel dalam format PNG transparan untuk ditampilkan di berita acara
                </p>
                
                {config?.stempel_path ? (
                  <div className="flex gap-4 items-start">
                    <div className="flex-1">
                      <p className="text-xs text-gray-600 mb-2">Stempel Saat Ini</p>
                      <div className="bg-gray-50 p-4 border border-gray-200 rounded inline-block">
                        <img 
                          src={`${imageBaseUrl}/storage/uploads/${config.stempel_path}`}
                          alt="Stempel Kecamatan"
                          className="h-24 w-24 object-contain"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="relative cursor-pointer">
                        <input
                          type="file"
                          accept="image/png"
                          onChange={(e) => handleUploadStempel(e.target.files?.[0])}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={(e) => e.currentTarget.parentElement.querySelector('input').click()}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
                        >
                          <LuUpload className="w-4 h-4" />
                          Ganti Stempel
                        </button>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Hapus stempel ini?')) {
                            handleDeleteStempel();
                          }
                        }}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                      >
                        <LuX className="w-4 h-4" />
                        Hapus
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="relative cursor-pointer">
                    <input
                      type="file"
                      accept="image/png"
                      onChange={(e) => handleUploadStempel(e.target.files?.[0])}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={(e) => e.currentTarget.parentElement.querySelector('input').click()}
                      className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors flex items-center gap-2"
                    >
                      <LuImage className="w-4 h-4" />
                      Upload Stempel (PNG)
                    </button>
                  </label>
                )}
              </div>


            </div>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setFormData({
                    nama_camat: config?.nama_camat || "",
                    nip_camat: config?.nip_camat || "",
                    alamat: config?.alamat || "",
                    telepon: config?.telepon || "",
                    email: config?.email || "",
                    website: config?.website || "",
                    kode_pos: config?.kode_pos || ""
                  });
                }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <LuX className="w-4 h-4" />
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
              >
                <LuSave className="w-4 h-4" />
                Simpan
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-xs font-semibold text-gray-600 uppercase">Nama Camat</label>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {config?.nama_camat || "-"}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-xs font-semibold text-gray-600 uppercase">NIP Camat</label>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {config?.nip_camat || "-"}
                </p>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="text-xs font-semibold text-gray-600 uppercase mb-3 block">Tanda Tangan Camat</label>
              {config?.ttd_camat_path ? (
                <img 
                  src={`${imageBaseUrl}/storage/uploads/${config.ttd_camat_path}`}
                  alt="Tanda Tangan Camat"
                  className="h-24 border border-gray-300 rounded p-2 bg-white"
                />
              ) : (
                <p className="text-gray-500 italic">Belum ada tanda tangan yang diupload</p>
              )}
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <label className="text-xs font-semibold text-gray-600 uppercase mb-3 block">Stempel Kecamatan</label>
              {config?.stempel_path ? (
                <div className="bg-white p-4 border border-gray-200 rounded inline-block">
                  <img 
                    src={`${imageBaseUrl}/storage/uploads/${config.stempel_path}`}
                    alt="Stempel Kecamatan"
                    className="h-24 w-24 object-contain"
                  />
                </div>
              ) : (
                <p className="text-gray-500 italic">Belum ada stempel yang diupload</p>
              )}
            </div>
          </div>
        )}
          </div>
        </div>
      </div>

      {/* Tim Verifikasi */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <button
          onClick={() => toggleSection('timVerifikasi')}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <LuUsers className="w-6 h-6 text-violet-600" />
            Tim Verifikasi Kecamatan
          </h2>
          <LuChevronDown 
            className={`w-5 h-5 text-gray-600 transition-transform duration-300 ${
              openSections.timVerifikasi ? 'rotate-180' : ''
            }`}
          />
        </button>

        <div 
          className={`transition-all duration-300 ease-in-out ${
            openSections.timVerifikasi ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
          } overflow-hidden`}
        >
          <div className="px-6 pb-6 pt-2 border-t">
            {!editingTeam && (
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setEditingTeam(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  <LuPencil className="w-4 h-4" />
                  Tambah Anggota
                </button>
              </div>
            )}

            {editingTeam && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Tambah Anggota Tim Verifikasi</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jabatan
                </label>
                <select
                  value={newTeamMember.jabatan}
                  onChange={(e) => setNewTeamMember({ 
                    ...newTeamMember, 
                    jabatan: e.target.value,
                    jabatan_label: e.target.value === 'anggota' ? '' : null 
                  })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:border-transparent outline-none"
                >
                  {JABATAN_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {newTeamMember.jabatan === 'anggota' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Label Jabatan Anggota
                  </label>
                  <input
                    type="text"
                    value={newTeamMember.jabatan_label || ''}
                    onChange={(e) => setNewTeamMember({ ...newTeamMember, jabatan_label: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:border-transparent outline-none"
                    placeholder="Contoh: Unsur Perangkat Daerah, Tim P3MD, dll"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama
                </label>
                <input
                  type="text"
                  value={newTeamMember.nama}
                  onChange={(e) => setNewTeamMember({ ...newTeamMember, nama: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:border-transparent outline-none"
                  placeholder="Masukkan nama anggota"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  NIP
                </label>
                <input
                  type="text"
                  value={newTeamMember.nip}
                  onChange={(e) => setNewTeamMember({ ...newTeamMember, nip: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:border-transparent outline-none"
                  placeholder="Masukkan NIP"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTeam(false);
                    setNewTeamMember({
                      jabatan: "anggota",
                      nama: "",
                      nip: "",
                      jabatan_label: ""
                    });
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <LuX className="w-4 h-4" />
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleAddTeamMember}
                  className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                >
                  <LuCheck className="w-4 h-4" />
                  Tambah
                </button>
              </div>
            </div>
          </div>
        )}

        {timVerifikasi.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Belum ada anggota tim verifikasi
          </div>
        ) : (
          <div className="space-y-6">
            <h3 className="font-bold text-gray-900 text-center mb-4">TIM VERIFIKASI KECAMATAN</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {timVerifikasi
                .sort((a, b) => {
                  const order = { ketua: 1, sekretaris: 2, anggota: 3 };
                  return (order[a.jabatan] || 4) - (order[b.jabatan] || 4);
                })
                .map((member, index) => {
                  // Tentukan label berdasarkan jabatan dan urutan
                  let positionLabel = '';
                  if (member.jabatan === 'ketua') {
                    positionLabel = 'Sekretaris Kecamatan';
                  } else if (member.jabatan === 'sekretaris') {
                    positionLabel = 'Kepala Seksi Ekbang';
                  } else if (member.jabatan === 'anggota') {
                    // Gunakan jabatan_label jika ada, fallback ke default
                    positionLabel = member.jabatan_label || 'Anggota';
                  }

                  return (
                    <div
                      key={member.id}
                      className="bg-gray-50 rounded-lg border border-gray-200 p-4"
                    >
                      <div className="text-center space-y-3">
                        {/* Nomor dan Jabatan */}
                        <div className="flex items-start gap-2">
                          <span className="font-semibold text-gray-700 min-w-[20px]">
                            {index + 1}.
                          </span>
                          <div className="flex-1 text-left">
                            <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getJabatanBgColor(member.jabatan)} mb-2`}>
                              {JABATAN_OPTIONS.find(opt => opt.value === member.jabatan)?.label || member.jabatan}
                            </div>
                            <p className="text-sm text-gray-600 font-medium">{positionLabel}</p>
                          </div>
                        </div>

                        {/* Area Tanda Tangan */}
                        <div className="space-y-2">
                          {!member.id ? (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-100 min-h-[120px] flex items-center justify-center">
                              <p className="text-gray-400 text-sm italic text-center">Simpan anggota terlebih dahulu untuk menambahkan tanda tangan</p>
                            </div>
                          ) : signaturePads[member.id] ? (
                            <div className="space-y-2">
                              <div className="border-2 border-violet-300 rounded-lg bg-white">
                                <SignatureCanvas
                                  ref={(ref) => {
                                    if (ref) sigCanvasRefs.current[member.id] = ref;
                                  }}
                                  penColor="black"
                                  canvasProps={{
                                    className: 'w-full h-[150px]',
                                    style: { touchAction: 'none' }
                                  }}
                                />
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => sigCanvasRefs.current[member.id]?.clear()}
                                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                  <LuX className="w-4 h-4" />
                                  Clear
                                </button>
                                <button
                                  onClick={() => handleSaveSignature(member.id)}
                                  disabled={uploadingSignatures[member.id]}
                                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                                >
                                  <LuCheck className="w-4 h-4" />
                                  Simpan
                                </button>
                              </div>
                              <button
                                onClick={() => setSignaturePads({ ...signaturePads, [member.id]: false })}
                                className="w-full px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-white min-h-[120px] flex items-center justify-center">
                                {member.ttd_path ? (
                                  <img 
                                    src={`${imageBaseUrl}/storage/uploads/${member.ttd_path}`}
                                    alt="Tanda Tangan"
                                    className="max-h-[100px] max-w-full object-contain"
                                  />
                                ) : (
                                  <p className="text-gray-400 text-sm italic">Belum ada tanda tangan</p>
                                )}
                              </div>
                              
                              {/* Tombol Tanda Tangan - Hanya Gambar TTD */}
                              <button
                                onClick={() => setSignaturePads({ ...signaturePads, [member.id]: true })}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition-colors"
                              >
                                <LuPencil className="w-4 h-4" />
                                Gambar TTD
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Nama dan NIP */}
                        <div className="border-t pt-3">
                          <p className="font-bold text-gray-900">{member.nama}</p>
                          <p className="text-sm text-gray-600">NIP. {member.nip}</p>
                        </div>

                        {/* Tombol Hapus */}
                        <div className="flex items-center justify-center pt-2">
                          <button
                            onClick={() => handleRemoveTeamMember(member.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Hapus anggota"
                          >
                            <LuX className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KecamatanBankeuConfigTab;
