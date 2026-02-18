import React, { useEffect, useState, useRef } from "react";
import api from "../../api";
import Swal from "sweetalert2";
import SignatureCanvas from "react-signature-canvas";
import {
  LuSave, LuPencil, LuX, LuCheck, LuCog, LuUsers, LuUpload, LuImage, LuChevronDown, LuPenTool
} from "react-icons/lu";

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const KecamatanBankeuConfigTab = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [openSections, setOpenSections] = useState({
    kopSurat: false,
    penandatanganan: false
  });
  const [formData, setFormData] = useState({
    nama_camat: "",
    nip_camat: "",
    jabatan_penandatangan: "Camat",
    alamat: "",
    telepon: "",
    email: "",
    website: "",
    kode_pos: ""
  });
  const [showCamatSignaturePad, setShowCamatSignaturePad] = useState(false);
  const [uploadingCamatSignature, setUploadingCamatSignature] = useState(false);
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
      
      const configRes = await api.get(`/kecamatan/bankeu/config/${user.kecamatan_id}`);

      setConfig(configRes.data.data);
      setFormData({
        nama_camat: configRes.data.data?.nama_camat || "",
        nip_camat: configRes.data.data?.nip_camat || "",
        jabatan_penandatangan: configRes.data.data?.jabatan_penandatangan || "Camat",
        alamat: configRes.data.data?.alamat || "",
        telepon: configRes.data.data?.telepon || "",
        email: configRes.data.data?.email || "",
        website: configRes.data.data?.website || "",
        kode_pos: configRes.data.data?.kode_pos || ""
      });
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

  const handleSaveSignature = async (memberId) => {
    // Handle camat signature only
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
        setUploadingCamatSignature(true);

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
        setShowCamatSignaturePad(false);

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
        setUploadingCamatSignature(false);
      }
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
                    jabatan_penandatangan: config?.jabatan_penandatangan || "Camat",
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Jabatan Penandatangan
                    </label>
                    <select
                      value={formData.jabatan_penandatangan}
                      onChange={(e) => setFormData({ ...formData, jabatan_penandatangan: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:border-transparent outline-none bg-white"
                    >
                      <option value="Camat">Camat</option>
                      <option value="Plt. Camat">Plt. Camat</option>
                      <option value="Pj. Camat">Pj. Camat</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nama {formData.jabatan_penandatangan || 'Camat'}
                    </label>
                    <input
                      type="text"
                      value={formData.nama_camat}
                      onChange={(e) => setFormData({ ...formData, nama_camat: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:border-transparent outline-none"
                      placeholder={`Masukkan nama ${formData.jabatan_penandatangan || 'camat'}`}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      NIP {formData.jabatan_penandatangan || 'Camat'}
                    </label>
                    <input
                      type="text"
                      value={formData.nip_camat}
                      onChange={(e) => setFormData({ ...formData, nip_camat: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-600 focus:border-transparent outline-none"
                  placeholder={`Masukkan NIP ${formData.jabatan_penandatangan || 'camat'}`}
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
                    {!showCamatSignaturePad ? (
                      <button
                        type="button"
                        onClick={() => setShowCamatSignaturePad(true)}
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
                            onClick={() => setShowCamatSignaturePad(false)}
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
                          setShowCamatSignaturePad(true);
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
                    jabatan_penandatangan: config?.jabatan_penandatangan || "Camat",
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-xs font-semibold text-gray-600 uppercase">Jabatan</label>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {config?.jabatan_penandatangan || "Camat"}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-xs font-semibold text-gray-600 uppercase">Nama {config?.jabatan_penandatangan || "Camat"}</label>
                <p className="text-lg font-semibold text-gray-900 mt-1">
                  {config?.nama_camat || "-"}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <label className="text-xs font-semibold text-gray-600 uppercase">NIP {config?.jabatan_penandatangan || "Camat"}</label>
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

      {/* Info Tim Verifikasi - Redirect ke halaman baru */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <LuUsers className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-bold text-amber-900 mb-2">Tim Verifikasi Kecamatan</h3>
            <p className="text-amber-800 text-sm leading-relaxed mb-4">
              Konfigurasi Tim Verifikasi (Ketua, Sekretaris, dan Anggota) beserta pengisian quisioner verifikasi 
              sudah dipindahkan ke halaman khusus untuk memudahkan proses verifikasi proposal.
            </p>
            <p className="text-amber-700 text-sm mb-4">
              Silakan ke halaman <strong>Verifikasi Proposal</strong>, pilih desa, lalu klik tombol <strong>"Tim Verifikasi"</strong> 
              untuk mengatur tim dan mengisi quisioner.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KecamatanBankeuConfigTab;
