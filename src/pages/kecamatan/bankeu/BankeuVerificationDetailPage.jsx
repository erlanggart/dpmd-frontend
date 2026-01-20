import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api";
import Swal from "sweetalert2";
import {
  LuEye, LuCheck, LuX, LuRefreshCw, LuClock, LuArrowLeft,
  LuChevronDown, LuChevronRight, LuDownload
} from "react-icons/lu";

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const BankeuVerificationDetailPage = () => {
  const { desaId } = useParams();
  const navigate = useNavigate();
  const [desa, setDesa] = useState(null);
  const [masterKegiatan, setMasterKegiatan] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedInfra, setExpandedInfra] = useState(true);
  const [expandedNonInfra, setExpandedNonInfra] = useState(true);

  useEffect(() => {
    fetchData();
  }, [desaId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [desaRes, masterRes, proposalsRes] = await Promise.all([
        api.get(`/desas/${desaId}`),
        api.get("/desa/bankeu/master-kegiatan"),
        api.get("/kecamatan/bankeu/proposals")
      ]);

      // Set desa
      setDesa(desaRes.data.data);

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
      
      // Filter proposals for this desa ONLY (per-desa review)
      const desaIdNum = parseInt(desaId);
      const allProposals = proposalsRes.data.data;
      const desaProposals = allProposals.filter(p => {
        const pDesaId = parseInt(p.desa_id);
        return pDesaId === desaIdNum;
      });
      
      console.log('=== Fetch Data ===');
      console.log('Target Desa ID:', desaIdNum);
      console.log('All proposals from API:', allProposals.length);
      console.log('Filtered proposals for this desa:', desaProposals.length);
      console.log('==================');
      
      setProposals(desaProposals);
      
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

  const handleVerify = async (proposalId, status) => {
    const isApprove = status === "verified";
    
    const result = await Swal.fire({
      title: '',
      html: `
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center w-20 h-20 rounded-full ${isApprove ? 'bg-gradient-to-br from-green-100 to-emerald-100' : 'bg-gradient-to-br from-red-100 to-rose-100'} mb-4">
            <svg class="w-12 h-12 ${isApprove ? 'text-green-600' : 'text-red-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              ${isApprove 
                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'
                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>'
              }
            </svg>
          </div>
          
          <h3 class="text-2xl font-bold ${isApprove ? 'text-green-700' : 'text-red-700'} mb-2">
            ${isApprove ? 'Setujui Proposal' : 'Tolak Proposal'}
          </h3>
          
          <p class="text-gray-600 mb-6">
            ${isApprove 
              ? 'Proposal akan disetujui dan dapat dilanjutkan ke tahap berikutnya' 
              : 'Proposal akan ditolak dan dikembalikan untuk revisi'
            }
          </p>
          
          <div class="text-left">
            <label class="block text-sm font-semibold text-gray-700 mb-2">
              ${isApprove ? 'Catatan (opsional)' : 'Alasan Penolakan *'}
            </label>
            <textarea 
              id="catatan-verifikasi" 
              rows="4"
              placeholder="${isApprove ? 'Tambahkan catatan jika diperlukan...' : 'Jelaskan alasan penolakan dan hal yang perlu diperbaiki...'}"
              class="w-full px-4 py-3 border-2 ${isApprove ? 'border-green-200 focus:border-green-500' : 'border-red-200 focus:border-red-500'} rounded-xl focus:outline-none focus:ring-4 ${isApprove ? 'focus:ring-green-100' : 'focus:ring-red-100'} transition-all duration-200 resize-none"
              style="font-family: inherit;"
            ></textarea>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: `<span class="flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          ${isApprove 
            ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>'
            : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>'
          }
        </svg>
        ${isApprove ? 'Ya, Setujui' : 'Ya, Tolak'}
      </span>`,
      cancelButtonText: `<span class="flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        Batal
      </span>`,
      customClass: {
        popup: 'rounded-2xl shadow-2xl',
        actions: 'gap-3 w-full',
        confirmButton: `${isApprove ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700' : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700'} text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border-0 flex-1`,
        cancelButton: 'bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all duration-200 border-0 flex-1'
      },
      buttonsStyling: false,
      showClass: {
        popup: 'animate__animated animate__zoomIn animate__faster'
      },
      hideClass: {
        popup: 'animate__animated animate__zoomOut animate__faster'
      },
      preConfirm: () => {
        const catatan = document.getElementById("catatan-verifikasi").value;
        if (!isApprove && !catatan.trim()) {
          Swal.showValidationMessage("Alasan penolakan wajib diisi");
          return false;
        }
        return catatan;
      }
    });

    if (result.isConfirmed) {
      try {
        await api.patch(`/kecamatan/bankeu/proposals/${proposalId}/verify`, {
          status,
          catatan_verifikasi: result.value
        });

        // Update state langsung tanpa refresh
        setProposals(prevProposals => 
          prevProposals.map(p => 
            p.id === proposalId 
              ? { ...p, status, catatan_verifikasi: result.value, verified_at: new Date().toISOString() }
              : p
          )
        );

        Swal.fire({
          title: '',
          html: `
            <div class="text-center py-4">
              <div class="mx-auto flex items-center justify-center w-20 h-20 rounded-full ${status === "verified" ? 'bg-gradient-to-br from-green-100 to-emerald-100' : 'bg-gradient-to-br from-orange-100 to-amber-100'} mb-4">
                <svg class="w-12 h-12 ${status === "verified" ? 'text-green-600' : 'text-orange-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 class="text-2xl font-bold ${status === "verified" ? 'text-green-700' : 'text-orange-700'} mb-2">
                Berhasil!
              </h3>
              <p class="text-gray-600">
                Proposal berhasil ${status === "verified" ? "disetujui" : "ditolak untuk revisi"}
              </p>
            </div>
          `,
          customClass: {
            popup: 'rounded-2xl shadow-2xl'
          },
          showConfirmButton: false,
          timer: 2500,
          showClass: {
            popup: 'animate__animated animate__bounceIn animate__faster'
          },
          hideClass: {
            popup: 'animate__animated animate__fadeOut animate__faster'
          }
        });
      } catch (error) {
        console.error("Error verifying proposal:", error);
        Swal.fire({
          title: '',
          html: `
            <div class="text-center py-4">
              <div class="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-rose-100 mb-4">
                <svg class="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-red-700 mb-2">
                Gagal!
              </h3>
              <p class="text-gray-600">
                ${error.response?.data?.message || "Gagal memverifikasi proposal"}
              </p>
            </div>
          `,
          customClass: {
            popup: 'rounded-2xl shadow-2xl',
            confirmButton: 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 border-0'
          },
          buttonsStyling: false,
          confirmButtonText: 'Tutup'
        });
      }
    }
  };

  const checkReviewCompletion = () => {
    // Check if all uploaded proposals for THIS DESA ONLY have been reviewed
    // proposals state already filtered by desaId in fetchData()
    const uploadedProposals = proposals.filter(p => p); // proposals that exist
    const pendingProposals = uploadedProposals.filter(p => p.status === 'pending');
    const rejectedProposals = uploadedProposals.filter(p => p.status === 'revision');
    const verifiedProposals = uploadedProposals.filter(p => p.status === 'verified');
    
    console.log('=== Review Status for Desa', desaId, desa?.nama, '===');
    console.log('Total proposals in state:', proposals.length);
    console.log('Uploaded proposals:', uploadedProposals.length);
    console.log('Pending:', pendingProposals.length, pendingProposals.map(p => `${p.id}: ${p.kegiatan_nama}`));
    console.log('Rejected/Revision:', rejectedProposals.length);
    console.log('Verified:', verifiedProposals.length);
    
    // Check for duplicates
    const kegiatanIds = uploadedProposals.map(p => p.kegiatan_id);
    const duplicates = kegiatanIds.filter((id, index) => kegiatanIds.indexOf(id) !== index);
    if (duplicates.length > 0) {
      console.warn('⚠️ DUPLICATE kegiatan_id found:', duplicates);
      console.log('Duplicate proposals:', uploadedProposals.filter(p => duplicates.includes(p.kegiatan_id)).map(p => ({
        proposal_id: p.id,
        kegiatan_id: p.kegiatan_id,
        kegiatan_nama: p.kegiatan_nama,
        status: p.status
      })));
    }
    console.log('=================================');
    
    return {
      allReviewed: pendingProposals.length === 0 && uploadedProposals.length > 0,
      hasRejected: rejectedProposals.length > 0,
      totalUploaded: uploadedProposals.length,
      totalPending: pendingProposals.length,
      totalVerified: verifiedProposals.length,
      totalRejected: rejectedProposals.length
    };
  };

  const handleSubmitReview = async () => {
    const reviewStatus = checkReviewCompletion();
    
    // Validation: must have uploaded proposals
    if (reviewStatus.totalUploaded === 0) {
      Swal.fire({
        title: '',
        html: `
          <div class="text-center py-4">
            <div class="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 mb-4">
              <svg class="w-12 h-12 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <h3 class="text-2xl font-bold text-gray-700 mb-2">
              Tidak Ada Proposal
            </h3>
            <p class="text-gray-600">
              Desa <strong>${desa?.nama}</strong> belum mengupload proposal
            </p>
          </div>
        `,
        customClass: {
          popup: 'rounded-2xl shadow-2xl',
          confirmButton: 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 border-0'
        },
        buttonsStyling: false,
        confirmButtonText: 'Mengerti'
      });
      return;
    }
    
    if (!reviewStatus.allReviewed) {
      Swal.fire({
        title: '',
        html: `
          <div class="text-center py-4">
            <div class="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 mb-4">
              <svg class="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
              </svg>
            </div>
            <h3 class="text-2xl font-bold text-orange-700 mb-2">
              Review Belum Selesai
            </h3>
            <p class="text-gray-600">
              Desa <strong>${desa?.nama}</strong> masih ada <strong>${reviewStatus.totalPending} proposal</strong> yang belum direview
            </p>
          </div>
        `,
        customClass: {
          popup: 'rounded-2xl shadow-2xl',
          confirmButton: 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 border-0'
        },
        buttonsStyling: false,
        confirmButtonText: 'Mengerti'
      });
      return;
    }

    // Determine action based on rejected proposals
    const action = reviewStatus.hasRejected ? 'return' : 'submit';
    const actionText = action === 'return' ? 'Kembalikan ke Desa' : 'Kirim ke DPMD';
    const actionColor = action === 'return' ? 'orange' : 'green';
    
    const result = await Swal.fire({
      title: '',
      html: `
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-${actionColor}-100 to-${actionColor === 'orange' ? 'amber' : 'emerald'}-100 mb-4">
            <svg class="w-12 h-12 text-${actionColor}-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              ${action === 'return' 
                ? '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>'
                : '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>'
              }
            </svg>
          </div>
          
          <h3 class="text-2xl font-bold text-${actionColor}-700 mb-2">
            ${actionText}
          </h3>
          
          <p class="text-gray-600 mb-4">
            ${action === 'return' 
              ? `Terdapat proposal <strong>Desa ${desa?.nama}</strong> yang ditolak. Proposal akan dikembalikan ke desa untuk diperbaiki.`
              : `Semua proposal <strong>Desa ${desa?.nama}</strong> telah disetujui. Kirim hasil verifikasi ke DPMD?`
            }
          </p>
          
          <div class="bg-gray-50 rounded-lg p-4 text-left">
            <div class="text-sm font-semibold text-gray-700 mb-2">📋 Ringkasan Desa ${desa?.nama}:</div>
            <div class="mt-2 space-y-1">
              <div class="flex justify-between text-sm">
                <span>Total Proposal:</span>
                <span class="font-semibold">${reviewStatus.totalUploaded}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span>Disetujui:</span>
                <span class="font-semibold text-green-600">${reviewStatus.totalVerified}</span>
              </div>
              ${reviewStatus.hasRejected ? `
              <div class="flex justify-between text-sm">
                <span>Ditolak/Revisi:</span>
                <span class="font-semibold text-orange-600">${reviewStatus.totalRejected}</span>
              </div>
              ` : ''}
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: `<span class="flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Ya, ${actionText}
      </span>`,
      cancelButtonText: `<span class="flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        Batal
      </span>`,
      customClass: {
        popup: 'rounded-2xl shadow-2xl',
        actions: 'gap-3 w-full',
        confirmButton: `bg-gradient-to-r from-${actionColor}-600 to-${actionColor === 'orange' ? 'amber' : 'emerald'}-600 hover:from-${actionColor}-700 hover:to-${actionColor === 'orange' ? 'amber' : 'emerald'}-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border-0 flex-1`,
        cancelButton: 'bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all duration-200 border-0 flex-1'
      },
      buttonsStyling: false,
      showClass: {
        popup: 'animate__animated animate__zoomIn animate__faster'
      },
      hideClass: {
        popup: 'animate__animated animate__zoomOut animate__faster'
      }
    });

    if (result.isConfirmed) {
      try {
        await api.post(`/kecamatan/bankeu/desa/${desaId}/submit-review`, {
          action // 'submit' or 'return'
        });

        Swal.fire({
          title: '',
          html: `
            <div class="text-center py-4">
              <div class="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 mb-4">
                <svg class="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-green-700 mb-2">
                Berhasil!
              </h3>
              <p class="text-gray-600">
                Review Desa <strong>${desa?.nama}</strong> telah ${action === 'return' ? 'dikembalikan ke desa' : 'dikirim ke DPMD'}
              </p>
            </div>
          `,
          customClass: {
            popup: 'rounded-2xl shadow-2xl'
          },
          showConfirmButton: false,
          timer: 2500,
          showClass: {
            popup: 'animate__animated animate__bounceIn animate__faster'
          },
          hideClass: {
            popup: 'animate__animated animate__fadeOut animate__faster'
          }
        }).then(() => {
          navigate('/kecamatan/bankeu');
        });
      } catch (error) {
        console.error('Error submitting review:', error);
        Swal.fire({
          title: '',
          html: `
            <div class="text-center py-4">
              <div class="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-rose-100 mb-4">
                <svg class="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-red-700 mb-2">
                Gagal!
              </h3>
              <p class="text-gray-600">
                ${error.response?.data?.message || 'Gagal mengirim hasil review'}
              </p>
            </div>
          `,
          customClass: {
            popup: 'rounded-2xl shadow-2xl',
            confirmButton: 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 border-0'
          },
          buttonsStyling: false,
          confirmButtonText: 'Tutup'
        });
      }
    }
  };

  const handleGenerateBeritaAcara = async () => {
    const result = await Swal.fire({
      title: '',
      html: `
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 mb-4">
            <svg class="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          
          <h3 class="text-2xl font-bold text-purple-700 mb-2">
            Buat Berita Acara
          </h3>
          
          <p class="text-gray-600">
            Berita Acara akan berisi semua proposal dari desa <strong>${desa?.nama}</strong> yang telah diverifikasi. Lanjutkan?
          </p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: `<span class="flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Ya, Buat
      </span>`,
      cancelButtonText: `<span class="flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        Batal
      </span>`,
      customClass: {
        popup: 'rounded-2xl shadow-2xl',
        actions: 'gap-3 w-full',
        confirmButton: 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border-0 flex-1',
        cancelButton: 'bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all duration-200 border-0 flex-1'
      },
      buttonsStyling: false,
      showClass: {
        popup: 'animate__animated animate__zoomIn animate__faster'
      },
      hideClass: {
        popup: 'animate__animated animate__zoomOut animate__faster'
      }
    });

    if (result.isConfirmed) {
      try {
        const response = await api.post(`/kecamatan/bankeu/desa/${desaId}/berita-acara`);
        
        await fetchData();

        Swal.fire({
          title: '',
          html: `
            <div class="text-center py-4">
              <div class="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 mb-4">
                <svg class="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-green-700 mb-2">
                Berhasil!
              </h3>
              <p class="text-gray-600 mb-4">
                Berita Acara berhasil dibuat
              </p>
              <a
                href="${imageBaseUrl}/storage/uploads/${response.data.data.file_path}"
                target="_blank"
                class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Download Berita Acara
              </a>
            </div>
          `,
          customClass: {
            popup: 'rounded-2xl shadow-2xl'
          },
          showConfirmButton: false,
          showClass: {
            popup: 'animate__animated animate__bounceIn animate__faster'
          }
        });
      } catch (error) {
        console.error("Error generating berita acara:", error);
        Swal.fire({
          title: '',
          html: `
            <div class="text-center py-4">
              <div class="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-rose-100 mb-4">
                <svg class="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-red-700 mb-2">
                Gagal!
              </h3>
              <p class="text-gray-600">
                ${error.response?.data?.message || "Gagal membuat Berita Acara"}
              </p>
            </div>
          `,
          customClass: {
            popup: 'rounded-2xl shadow-2xl',
            confirmButton: 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 border-0'
          },
          buttonsStyling: false,
          confirmButtonText: 'Tutup'
        });
      }
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { icon: LuClock, text: "Menunggu", color: "bg-yellow-100 text-yellow-700" },
      verified: { icon: LuCheck, text: "Disetujui", color: "bg-green-100 text-green-700" },
      rejected: { icon: LuX, text: "Ditolak", color: "bg-red-100 text-red-700" },
      revision: { icon: LuRefreshCw, text: "Revisi", color: "bg-orange-100 text-orange-700" }
    };

    const badge = badges[status] || badges.pending;
    const Icon = badge.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${badge.color}`}>
        <Icon className="w-4 h-4" />
        {badge.text}
      </span>
    );
  };

  // Group kegiatan by type
  const infrastruktur = masterKegiatan
    .filter(k => k.jenis_kegiatan === 'infrastruktur')
    .map(kegiatan => {
      const proposal = proposals.find(p => parseInt(p.kegiatan_id) === parseInt(kegiatan.id));
      return { kegiatan, proposal: proposal || null };
    });

  const nonInfrastruktur = masterKegiatan
    .filter(k => k.jenis_kegiatan === 'non_infrastruktur')
    .map(kegiatan => {
      const proposal = proposals.find(p => parseInt(p.kegiatan_id) === parseInt(kegiatan.id));
      return { kegiatan, proposal: proposal || null };
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Memuat data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <button
          onClick={() => navigate('/kecamatan/bankeu')}
          className="flex items-center gap-2 text-violet-600 hover:text-violet-700 mb-4 transition-colors"
        >
          <LuArrowLeft className="w-5 h-5" />
          <span className="font-medium">Kembali ke Daftar Desa</span>
        </button>
        
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Verifikasi Proposal - {desa?.nama}</h1>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleGenerateBeritaAcara}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <LuDownload className="w-5 h-5" />
              <span>Buat Berita Acara</span>
            </button>
            
            <button
              onClick={handleSubmitReview}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <LuCheck className="w-5 h-5" />
              <span>Selesai Review</span>
            </button>
          </div>
        </div>
        <p className="text-gray-600 mt-2">Review dan verifikasi proposal bantuan keuangan dari desa {desa?.nama}</p>
      </div>

      {/* Infrastruktur */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <button
          onClick={() => setExpandedInfra(!expandedInfra)}
          className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 transition-all"
        >
          <div className="flex items-center gap-3">
            {expandedInfra ? <LuChevronDown className="w-5 h-5 text-blue-600" /> : <LuChevronRight className="w-5 h-5 text-blue-600" />}
            <h3 className="text-xl font-bold text-gray-900">Infrastruktur</h3>
            <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-semibold shadow-md">
              {infrastruktur.filter(i => i.proposal).length} / {infrastruktur.length}
            </span>
          </div>
        </button>
        
        {expandedInfra && (
          <div className="divide-y divide-gray-100 max-h-[10000px] opacity-100 transition-all duration-500">
            {infrastruktur.map((item, index) => (
              <ProposalRow
                key={item.kegiatan.id}
                kegiatan={item.kegiatan}
                proposal={item.proposal}
                index={index}
                onVerify={handleVerify}
                getStatusBadge={getStatusBadge}
                imageBaseUrl={imageBaseUrl}
              />
            ))}
          </div>
        )}
      </div>

      {/* Non-Infrastruktur */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
        <button
          onClick={() => setExpandedNonInfra(!expandedNonInfra)}
          className="w-full px-6 py-4 flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 transition-all"
        >
          <div className="flex items-center gap-3">
            {expandedNonInfra ? <LuChevronDown className="w-5 h-5 text-purple-600" /> : <LuChevronRight className="w-5 h-5 text-purple-600" />}
            <h3 className="text-xl font-bold text-gray-900">Non-Infrastruktur</h3>
            <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm font-semibold shadow-md">
              {nonInfrastruktur.filter(i => i.proposal).length} / {nonInfrastruktur.length}
            </span>
          </div>
        </button>
        
        {expandedNonInfra && (
          <div className="divide-y divide-gray-100 max-h-[10000px] opacity-100 transition-all duration-500">
            {nonInfrastruktur.map((item, index) => (
              <ProposalRow
                key={item.kegiatan.id}
                kegiatan={item.kegiatan}
                proposal={item.proposal}
                index={index}
                onVerify={handleVerify}
                getStatusBadge={getStatusBadge}
                imageBaseUrl={imageBaseUrl}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Proposal Row Component
const ProposalRow = ({ kegiatan, proposal, index, onVerify, getStatusBadge, imageBaseUrl }) => {
  return (
    <div className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} p-4 hover:bg-blue-50 transition-colors`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-gray-900 text-sm mb-2">{kegiatan.nama_kegiatan}</h4>
          
          {proposal ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                  <LuCheck className="w-3 h-3" />
                  Sudah Upload
                </span>
                {getStatusBadge(proposal.status)}
              </div>
              
              <div>
                <div className="font-medium text-gray-900 text-sm">{proposal.judul_proposal}</div>
                {proposal.deskripsi && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">{proposal.deskripsi}</div>
                )}
              </div>
              
              <div className="text-sm font-medium text-gray-900">
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  minimumFractionDigits: 0
                }).format(proposal.anggaran_usulan)}
              </div>
              
              {proposal.catatan_verifikasi && (
                <div className="p-2 bg-yellow-50 border-l-4 border-yellow-400 rounded text-xs">
                  <span className="font-medium text-yellow-800">Catatan:</span>
                  <span className="text-yellow-700"> {proposal.catatan_verifikasi}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                <LuX className="w-3 h-3" />
                Belum Upload
              </span>
            </div>
          )}
        </div>

        {proposal && (
          <div className="flex items-center gap-2">
            <a
              href={`${imageBaseUrl}/storage/uploads/${proposal.file_proposal}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-xs font-medium transition-colors"
            >
              <LuEye className="w-3.5 h-3.5" />
              Lihat
            </a>

            {proposal.status === "pending" && (
              <>
                <button
                  onClick={() => onVerify(proposal.id, "verified")}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-xs font-medium transition-colors"
                  title="Setujui"
                >
                  <LuCheck className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => onVerify(proposal.id, "revision")}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-1 text-xs font-medium transition-colors"
                  title="Tolak"
                >
                  <LuX className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default BankeuVerificationDetailPage;
