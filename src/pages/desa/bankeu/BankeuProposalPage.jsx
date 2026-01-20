import React, { useEffect, useState } from "react";
import api from "../../../api";
import Swal from "sweetalert2";
import {
  LuUpload, LuEye, LuClock, LuCheck, LuX, LuRefreshCw, 
  LuChevronDown, LuChevronRight, LuSend, LuTrash2, LuInfo
} from "react-icons/lu";

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

// Fungsi untuk mengkonversi angka ke terbilang
const angkaTerbilang = (angka) => {
  const bilangan = [
    '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'
  ];

  if (angka < 12) {
    return bilangan[angka];
  } else if (angka < 20) {
    return bilangan[angka - 10] + ' Belas';
  } else if (angka < 100) {
    return bilangan[Math.floor(angka / 10)] + ' Puluh ' + bilangan[angka % 10];
  } else if (angka < 200) {
    return 'Seratus ' + angkaTerbilang(angka - 100);
  } else if (angka < 1000) {
    return bilangan[Math.floor(angka / 100)] + ' Ratus ' + angkaTerbilang(angka % 100);
  } else if (angka < 2000) {
    return 'Seribu ' + angkaTerbilang(angka - 1000);
  } else if (angka < 1000000) {
    return angkaTerbilang(Math.floor(angka / 1000)) + ' Ribu ' + angkaTerbilang(angka % 1000);
  } else if (angka < 1000000000) {
    return angkaTerbilang(Math.floor(angka / 1000000)) + ' Juta ' + angkaTerbilang(angka % 1000000);
  } else if (angka < 1000000000000) {
    return angkaTerbilang(Math.floor(angka / 1000000000)) + ' Miliar ' + angkaTerbilang(angka % 1000000000);
  } else if (angka < 1000000000000000) {
    return angkaTerbilang(Math.floor(angka / 1000000000000)) + ' Triliun ' + angkaTerbilang(angka % 1000000000000);
  } else {
    return 'Angka Terlalu Besar';
  }
};

const BankeuProposalPage = () => {
  const [masterKegiatan, setMasterKegiatan] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedInfra, setExpandedInfra] = useState(true);
  const [expandedNonInfra, setExpandedNonInfra] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [uploadForms, setUploadForms] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [masterRes, proposalsRes] = await Promise.all([
        api.get("/desa/bankeu/master-kegiatan"),
        api.get("/desa/bankeu/proposals")
      ]);

      // Flatten master kegiatan
      const masterData = masterRes.data.data;
      const allKegiatan = [];
      
      if (masterData.infrastruktur && Array.isArray(masterData.infrastruktur)) {
        allKegiatan.push(...masterData.infrastruktur);
      }
      if (masterData.non_infrastruktur && Array.isArray(masterData.non_infrastruktur)) {
        allKegiatan.push(...masterData.non_infrastruktur);
      }
      
      setMasterKegiatan(allKegiatan);
      setProposals(proposalsRes.data.data);
      
      // Check if already submitted to kecamatan
      const submittedProposal = proposalsRes.data.data.find(p => p.submitted_to_kecamatan);
      setIsSubmitted(!!submittedProposal);
    } catch (error) {
      console.error("Error fetching data:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: "Gagal memuat data"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (kegiatan, file) => {
    const formData = uploadForms[kegiatan.id];
    
    console.log("=== DEBUG UPLOAD ===");
    console.log("Kegiatan:", kegiatan);
    console.log("File:", file);
    console.log("Form Data:", formData);
    
    // Validation
    if (!formData?.anggaran?.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Anggaran usulan wajib diisi terlebih dahulu"
      });
      return;
    }
    if (!file) {
      console.log("File tidak ada!");
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Silakan pilih file PDF terlebih dahulu"
      });
      return;
    }
    if (file.type !== "application/pdf") {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "File harus berformat PDF"
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Ukuran file maksimal 10MB"
      });
      return;
    }

    try {
      Swal.fire({
        title: 'Mengupload...',
        text: 'Mohon tunggu',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("jenis_kegiatan", kegiatan.jenis_kegiatan);
      formDataUpload.append("kegiatan_id", kegiatan.id);
      formDataUpload.append("kegiatan_nama", kegiatan.nama_kegiatan);
      formDataUpload.append("judul_proposal", kegiatan.nama_kegiatan);
      formDataUpload.append("deskripsi", kegiatan.nama_kegiatan);
      formDataUpload.append("anggaran_usulan", formData.anggaran.replace(/\D/g, ""));

      console.log("=== FORM DATA YANG DIKIRIM ===");
      for (let pair of formDataUpload.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      console.log("Mengirim request ke API...");
      const response = await api.post("/desa/bankeu/proposals", formDataUpload, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      console.log("=== RESPONSE LENGKAP ===", response);
      console.log("Response data:", response.data);
      console.log("Response status:", response.status);
      console.log("Response data.data:", response.data?.data);

      // Clear form
      setUploadForms(prev => {
        const newForms = { ...prev };
        delete newForms[kegiatan.id];
        return newForms;
      });

      // Karena response tidak mengembalikan proposal lengkap, 
      // kita perlu fetch data ulang
      console.log("Response tidak valid, melakukan fetch data...");
      
      // Fetch data baru
      await fetchData();
      
      // Simpan kegiatan ID untuk scroll nanti
      const uploadedKegiatanId = kegiatan.id;

      await Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Proposal berhasil diupload",
        timer: 2000,
        showConfirmButton: false
      });
      
      // Setelah popup tutup, scroll ke kegiatan yang baru diupload
      setTimeout(() => {
        // Cari elemen kegiatan yang baru diupload (bisa pakai attribute atau struktur DOM)
        const kegiatanElements = document.querySelectorAll('[data-kegiatan-id]');
        const targetElement = Array.from(kegiatanElements).find(
          el => el.getAttribute('data-kegiatan-id') === String(uploadedKegiatanId)
        );
        
        if (targetElement) {
          targetElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          console.log("Scrolled to kegiatan:", uploadedKegiatanId);
        } else {
          console.log("Element kegiatan tidak ditemukan:", uploadedKegiatanId);
        }
      }, 100);
    } catch (error) {
      console.error("Error saat upload:", error);
      console.error("Error response:", error.response);
      Swal.fire({
        icon: "error",
        title: "Gagal Upload",
        text: error.response?.data?.message || error.message || "Gagal mengupload proposal",
        confirmButtonText: "OK"
      });
    }
  };

  const updateUploadForm = (kegiatanId, field, value) => {
    setUploadForms(prev => ({
      ...prev,
      [kegiatanId]: {
        ...prev[kegiatanId],
        [field]: value
      }
    }));
  };

  const formatRupiah = (value) => {
    if (!value) return "";
    const number = value.replace(/\D/g, "");
    return new Intl.NumberFormat("id-ID").format(number);
  };

  const handleSubmitToKecamatan = async () => {
    const result = await Swal.fire({
      title: "Kirim ke Kecamatan?",
      html: "Semua proposal akan dikirim ke kecamatan untuk diverifikasi.<br><strong>Proses ini tidak dapat dibatalkan!</strong>",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Kirim!",
      cancelButtonText: "Batal"
    });

    if (result.isConfirmed) {
      try {
        await api.post("/desa/bankeu/submit-to-kecamatan");
        await fetchData();

        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Semua proposal berhasil dikirim ke kecamatan",
          timer: 2000,
          showConfirmButton: false
        });
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: error.response?.data?.message || "Gagal mengirim proposal"
        });
      }
    }
  };

  const handleDelete = async (proposalId) => {
    const result = await Swal.fire({
      title: "Hapus Proposal?",
      text: "Proposal akan dihapus dan harus diupload ulang",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Hapus!",
      cancelButtonText: "Batal"
    });

    if (result.isConfirmed) {
      try {
        await api.delete(`/desa/bankeu/proposals/${proposalId}`);
        await fetchData();

        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: "Proposal berhasil dihapus",
          timer: 2000,
          showConfirmButton: false
        });
      } catch (error) {
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: error.response?.data?.message || "Gagal menghapus proposal"
        });
      }
    }
  };

  // Merge kegiatan dengan proposal
  const mergeKegiatanWithProposals = (jenis) => {
    const kegiatanList = masterKegiatan.filter(k => k.jenis_kegiatan === jenis);
    
    return kegiatanList.map(kegiatan => {
      const proposal = proposals.find(p => p.kegiatan_id === kegiatan.id);
      return {
        kegiatan,
        proposal: proposal || null
      };
    });
  };

  const infrastrukturData = mergeKegiatanWithProposals('infrastruktur');
  const nonInfrastrukturData = mergeKegiatanWithProposals('non_infrastruktur');
  
  const totalKegiatan = masterKegiatan.length;
  
  // Hitung per status
  const verifiedProposals = proposals.filter(p => p.status === 'verified');
  const pendingProposals = proposals.filter(p => p.status === 'pending');
  const revisionProposals = proposals.filter(p => p.status === 'revision' || p.status === 'rejected');
  
  const verifiedCount = verifiedProposals.length;
  const pendingCount = pendingProposals.length;
  const revisionCount = revisionProposals.length;
  
  // Total sudah terisi = verified + pending + revision
  const filledCount = verifiedCount + pendingCount + revisionCount;
  
  // Progress percentage
  const percentage = totalKegiatan > 0 ? Math.round((filledCount / totalKegiatan) * 100) : 0;
  
  // Complete jika semua kegiatan sudah ada proposal (tidak peduli statusnya)
  const isComplete = filledCount >= totalKegiatan && totalKegiatan > 0;
  
  // Kegiatan yang perlu diisi/diperbaiki
  const kegiatanPerluDiisi = totalKegiatan - filledCount;

  const getStatusBadge = (status) => {
    const badges = {
      pending: { icon: LuClock, text: "Menunggu Verifikasi", color: "bg-yellow-100 text-yellow-700" },
      verified: { icon: LuCheck, text: "Disetujui", color: "bg-green-100 text-green-700" },
      rejected: { icon: LuX, text: "Ditolak", color: "bg-red-100 text-red-700" },
      revision: { icon: LuRefreshCw, text: "Perlu Revisi", color: "bg-orange-100 text-orange-700" }
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Memuat data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Progress */}
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg p-8 border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <LuUpload className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Proposal Bantuan Keuangan</h1>
            <p className="text-sm text-gray-600">Kelola proposal kegiatan desa Anda</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Progress Upload */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-700">Progress Upload</span>
                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold">
                  {filledCount} / {totalKegiatan}
                </span>
              </div>
              <span className="text-2xl font-bold text-gray-900">{percentage}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden shadow-inner">
              <div 
                className={`h-4 rounded-full transition-all duration-500 ${isComplete ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}
                style={{width: `${percentage}%`}}
              ></div>
            </div>
            {isComplete ? (
              <div className="flex items-center gap-2 mt-3 text-green-600">
                <LuCheck className="w-4 h-4" />
                <p className="text-sm font-medium">Semua kegiatan telah terisi</p>
              </div>
            ) : (
              <p className="text-sm text-gray-600 mt-3">
                {kegiatanPerluDiisi > 0 && (
                  <>Masih ada <span className="font-bold text-gray-900">{kegiatanPerluDiisi}</span> kegiatan yang perlu diisi</>
                )}
              </p>
            )}
          </div>

          {/* Total Anggaran Usulan */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">Total Anggaran Usulan</span>
              <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold">
                Realtime
              </span>
            </div>
            
            {(() => {
              // Hitung total dari proposals yang sudah terupload dengan Number untuk handle angka besar
              const uploadedTotal = proposals.reduce((sum, p) => {
                const anggaran = Number(p.anggaran_usulan) || 0;
                return sum + anggaran;
              }, 0);
              
              // Get list of kegiatan IDs yang sudah punya proposal
              const uploadedKegiatanIds = proposals.map(p => p.kegiatan_id);
              
              // Hitung total dari form yang sedang diisi (belum upload)
              // Hanya hitung form untuk kegiatan yang BELUM punya proposal
              const formTotal = Object.entries(uploadForms).reduce((sum, [kegiatanId, form]) => {
                // Skip jika kegiatan ini sudah punya proposal
                if (uploadedKegiatanIds.includes(parseInt(kegiatanId))) {
                  return sum;
                }
                const anggaran = Number(form.anggaran) || 0;
                return sum + anggaran;
              }, 0);
              
              const grandTotal = uploadedTotal + formTotal;
              
              return (
                <>
                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-100">
                      <p className="text-xs text-gray-600 mb-1">Total Keseluruhan</p>
                      <p className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent break-words">
                        {new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }).format(grandTotal)}
                      </p>
                      {grandTotal > 0 && (
                        <p className="text-xs text-gray-600 mt-2 italic leading-relaxed">
                          ({angkaTerbilang(grandTotal).trim()} Rupiah)
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-600 px-1">
                      <span>Terupload</span>
                      <span className="font-bold text-gray-900 text-right break-words">
                        {new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0
                        }).format(uploadedTotal)}
                      </span>
                    </div>
                    
                    {formTotal > 0 && (
                      <div className="flex items-center justify-between text-xs text-gray-600 px-1">
                        <span>Draft (belum upload)</span>
                        <span className="font-bold text-orange-600 text-right break-words">
                          {new Intl.NumberFormat("id-ID", {
                            style: "currency",
                            currency: "IDR",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0
                          }).format(formTotal)}
                        </span>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Monitoring Status */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-700">Status Verifikasi</span>
              {isSubmitted && (
                <span className="px-2 py-1 bg-green-50 text-green-700 rounded-lg text-xs font-bold">
                  Terkirim
                </span>
              )}
            </div>
            
            {isSubmitted ? (
              <div className="space-y-3">
                {(() => {
                  const statusCount = {
                    pending: proposals.filter(p => p.status === 'pending').length,
                    verified: proposals.filter(p => p.status === 'verified').length,
                    rejected: proposals.filter(p => p.status === 'rejected').length,
                    revision: proposals.filter(p => p.status === 'revision').length
                  };
                  
                  return (
                    <>
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <LuClock className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm text-gray-700">Menunggu Verifikasi</span>
                        </div>
                        <span className="text-lg font-bold text-yellow-600">{statusCount.pending}</span>
                      </div>
                      
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <LuCheck className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-gray-700">Disetujui</span>
                        </div>
                        <span className="text-lg font-bold text-green-600">{statusCount.verified}</span>
                      </div>
                      
                      <div className="flex items-center justify-between py-2 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <LuRefreshCw className="w-4 h-4 text-orange-600" />
                          <span className="text-sm text-gray-700">Perlu Revisi</span>
                        </div>
                        <span className="text-lg font-bold text-orange-600">{statusCount.revision}</span>
                      </div>
                      
                      <div className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-2">
                          <LuX className="w-4 h-4 text-red-600" />
                          <span className="text-sm text-gray-700">Ditolak</span>
                        </div>
                        <span className="text-lg font-bold text-red-600">{statusCount.rejected}</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 text-gray-400">
                <div className="text-center">
                  <LuClock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Belum ada data verifikasi</p>
                </div>
              </div>
            )}
            
            {/* Button Kirim ke Kecamatan */}
            {!isSubmitted && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSubmitToKecamatan}
                  disabled={!isComplete}
                  className={`w-full px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-md transition-all ${
                    isComplete
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <LuSend className="w-5 h-5" />
                  <span>Kirim ke Kecamatan</span>
                </button>
                {!isComplete && (
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Upload semua kegiatan untuk mengirim
                  </p>
                )}
              </div>
            )}
          </div>
        </div>


      </div>

      {/* List Kegiatan */}
      <div className="space-y-4">
        {/* Infrastruktur */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <button
              onClick={() => setExpandedInfra(!expandedInfra)}
              className="w-full px-6 py-5 flex items-center justify-between bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 hover:from-blue-100 hover:via-indigo-100 hover:to-blue-100 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  {expandedInfra ? <LuChevronDown className="w-5 h-5 text-white" /> : <LuChevronRight className="w-5 h-5 text-white" />}
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-bold text-gray-900">Infrastruktur</h3>
                  <p className="text-sm text-gray-600">{infrastrukturData.filter(d => d.proposal).length} dari {infrastrukturData.length} kegiatan</p>
                </div>
              </div>
              <div className="px-4 py-2 bg-white rounded-xl shadow-md border border-gray-100">
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {infrastrukturData.filter(d => d.proposal).length}/{infrastrukturData.length}
                </span>
              </div>
            </button>
          
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
              expandedInfra ? 'max-h-[10000px] opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="divide-y divide-gray-100">
                {infrastrukturData.map((item, index) => (
                  <KegiatanRow
                    key={item.kegiatan.id}
                    item={item}
                    index={index}
                    onUpload={handleUpload}
                    onDelete={handleDelete}
                    getStatusBadge={getStatusBadge}
                    imageBaseUrl={imageBaseUrl}
                    isSubmitted={isSubmitted}
                    uploadForms={uploadForms}
                    updateUploadForm={updateUploadForm}
                    formatRupiah={formatRupiah}
                  />
                ))}
              </div>
            </div>
          </div>

        {/* Non-Infrastruktur */}
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
            <button
              onClick={() => setExpandedNonInfra(!expandedNonInfra)}
              className="w-full px-6 py-5 flex items-center justify-between bg-gradient-to-r from-purple-50 via-fuchsia-50 to-purple-50 hover:from-purple-100 hover:via-fuchsia-100 hover:to-purple-100 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  {expandedNonInfra ? <LuChevronDown className="w-5 h-5 text-white" /> : <LuChevronRight className="w-5 h-5 text-white" />}
                </div>
                <div className="text-left">
                  <h3 className="text-xl font-bold text-gray-900">Non-Infrastruktur</h3>
                  <p className="text-sm text-gray-600">{nonInfrastrukturData.filter(d => d.proposal).length} dari {nonInfrastrukturData.length} kegiatan</p>
                </div>
              </div>
              <div className="px-4 py-2 bg-white rounded-xl shadow-md border border-gray-100">
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                  {nonInfrastrukturData.filter(d => d.proposal).length}/{nonInfrastrukturData.length}
                </span>
              </div>
            </button>
          
            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
              expandedNonInfra ? 'max-h-[10000px] opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="divide-y divide-gray-100">
                {nonInfrastrukturData.map((item, index) => (
                <KegiatanRow
                  key={item.kegiatan.id}
                  item={item}
                  index={index}
                  onUpload={handleUpload}
                  onDelete={handleDelete}
                  getStatusBadge={getStatusBadge}
                  imageBaseUrl={imageBaseUrl}
                  isSubmitted={isSubmitted}
                  uploadForms={uploadForms}
                  updateUploadForm={updateUploadForm}
                  formatRupiah={formatRupiah}
                />
              ))}
              </div>
            </div>
        </div>
      </div>
    </div>
  );
};

// Kegiatan Row Component
const KegiatanRow = ({ item, index, onUpload, onDelete, getStatusBadge, imageBaseUrl, isSubmitted, uploadForms, updateUploadForm, formatRupiah }) => {
  const { kegiatan, proposal } = item;
  const formData = uploadForms[kegiatan.id] || {};

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    console.log("File selected:", file);
    console.log("Kegiatan:", kegiatan);
    console.log("Form data:", formData);
    if (file) {
      onUpload(kegiatan, file);
      // Reset input file setelah upload
      e.target.value = null;
    }
  };

  return (
    <div 
      className="p-6 hover:bg-gray-50 transition-all border-b border-gray-100 last:border-b-0"
      data-kegiatan-id={kegiatan.id}
    >
      {proposal ? (
        // Proposal sudah ada - Horizontal Layout
        <div className="space-y-3">
          {/* Main Info - 1 Baris Horizontal */}
          <div className="flex items-center justify-between gap-4">
            {/* Judul & Tanggal */}
            <div className="flex-1">
              <h4 className="font-bold text-gray-900 text-lg mb-1">{kegiatan.nama_kegiatan}</h4>
              <p className="text-sm text-gray-600">
                Diupload {new Date(proposal.created_at).toLocaleDateString("id-ID", { 
                  day: 'numeric', 
                  month: 'long', 
                  year: 'numeric'
                })}
              </p>
            </div>

            {/* Anggaran */}
            <div className="text-right px-4">
              <span className="text-xs font-bold text-gray-500 uppercase block">Anggaran</span>
              <p className="text-xl font-bold text-green-600">
                Rp {new Intl.NumberFormat("id-ID").format(proposal.anggaran_usulan)}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <a
                href={`${imageBaseUrl}/storage/uploads/${proposal.file_proposal}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 flex items-center gap-2 font-semibold text-sm shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
              >
                <LuEye className="w-4 h-4" />
                Lihat
              </a>

              {!isSubmitted && proposal.status === "pending" && (
                <button
                  onClick={() => onDelete(proposal.id)}
                  className="px-4 py-2 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg hover:from-red-600 hover:to-rose-700 flex items-center gap-2 font-semibold text-sm shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <LuTrash2 className="w-4 h-4" />
                  Hapus
                </button>
              )}
            </div>
          </div>

          {/* Catatan Verifikasi */}
          {proposal.catatan_verifikasi && (
            <div className={`p-3 border-l-4 rounded-lg ${
              proposal.status === 'rejected' 
                ? 'bg-red-50 border-red-400' 
                : 'bg-amber-50 border-amber-400'
            }`}>
              <div className="flex items-start gap-2">
                <LuInfo className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                  proposal.status === 'rejected' ? 'text-red-600' : 'text-amber-600'
                }`} />
                <div>
                  <span className={`text-xs font-bold uppercase ${
                    proposal.status === 'rejected' ? 'text-red-800' : 'text-amber-800'
                  }`}>
                    {proposal.status === 'rejected' ? 'Ditolak' : 'Revisi'}:
                  </span>
                  <span className={`text-sm ml-1 ${
                    proposal.status === 'rejected' ? 'text-red-700' : 'text-amber-700'
                  }`}>
                    {proposal.catatan_verifikasi}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Form Upload Ulang - Horizontal */}
          {!isSubmitted && (proposal.status === "rejected" || proposal.status === "revision") && (
            <div className="bg-gradient-to-r from-orange-50 to-red-50 p-3 rounded-lg border border-orange-200">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <LuRefreshCw className="w-4 h-4 text-orange-600" />
                  <span className="font-semibold text-orange-900 text-sm">Upload Ulang</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="w-48">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600 font-semibold text-xs">Rp</span>
                      <input
                        type="text"
                        value={formatRupiah(formData.anggaran || '')}
                        onChange={(e) => updateUploadForm(kegiatan.id, 'anggaran', e.target.value.replace(/\D/g, ''))}
                        placeholder="Anggaran baru"
                        className="w-full pl-8 pr-3 py-2 text-sm font-bold border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-100 focus:border-orange-500 bg-white transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                      id={`file-revisi-${kegiatan.id}`}
                    />
                    <label
                      htmlFor={`file-revisi-${kegiatan.id}`}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-semibold text-sm shadow-md transition-all cursor-pointer hover:from-orange-600 hover:to-red-700 hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                    >
                      <LuRefreshCw className="w-4 h-4" />
                      Upload
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Form upload - Horizontal dengan judul
        <div className="flex items-center gap-4">
          {/* Judul Kegiatan */}
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 text-lg">{kegiatan.nama_kegiatan}</h4>
          </div>

          {/* Form Input */}
          <div className="flex items-center gap-3">
            {/* Anggaran Input */}
            <div className="w-64">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 font-semibold text-sm">Rp</span>
                <input
                  type="text"
                  value={formatRupiah(formData.anggaran || '')}
                  onChange={(e) => updateUploadForm(kegiatan.id, 'anggaran', e.target.value.replace(/\D/g, ''))}
                  placeholder="Anggaran usulan"
                  disabled={isSubmitted}
                  className="w-full pl-10 pr-4 py-2.5 text-base font-bold border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Upload Button */}
            <div>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                disabled={isSubmitted}
                className="hidden"
                id={`file-${kegiatan.id}`}
              />
              <label
                htmlFor={`file-${kegiatan.id}`}
                className={`flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-semibold text-sm shadow-md transition-all whitespace-nowrap ${
                  isSubmitted ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'hover:from-green-600 hover:to-emerald-700 hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer'
                }`}
              >
                <LuUpload className="w-4 h-4" />
                Upload
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankeuProposalPage;
