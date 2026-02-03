import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api";
import Swal from "sweetalert2";
import {
  LuEye, LuCheck, LuX, LuRefreshCw, LuClock, LuArrowLeft,
  LuChevronDown, LuChevronRight, LuDownload, LuClipboardList,
  LuMapPin, LuPackage, LuDollarSign, LuInfo,
  LuShield, LuFileText
} from "react-icons/lu";

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

// Komponen Status Tracking Timeline - Level Desa
const StatusTracking = ({ proposals }) => {
  const getTrackingSteps = () => {
    const steps = [
      { id: 1, label: 'Desa', status: 'pending', icon: LuClock, color: 'gray' },
      { id: 2, label: 'Review Dinas Terkait', status: 'pending', icon: LuClock, color: 'gray' },
      { id: 3, label: 'Review Kecamatan', status: 'pending', icon: LuClock, color: 'gray' },
      { id: 4, label: 'Review DPMD', status: 'pending', icon: LuClock, color: 'gray' },
      { id: 5, label: 'Review BPKAD', status: 'pending', icon: LuClock, color: 'gray' },
      { id: 6, label: 'Terbit SP2D', status: 'pending', icon: LuClock, color: 'gray' }
    ];

    if (!proposals || proposals.length === 0) {
      return steps;
    }

    const submittedProposals = proposals.filter(p => p.submitted_to_kecamatan);
    if (submittedProposals.length === 0) {
      steps[0].status = 'active';
      steps[0].icon = LuClock;
      steps[0].color = 'blue';
      steps[0].label = 'Desa (Belum dikirim)';
      return steps;
    }

    // Desa step completed (sudah submit)
    steps[0].status = 'completed';
    steps[0].icon = LuCheck;
    steps[0].color = 'green';

    // Check dinas status
    const hasDinasApproved = submittedProposals.some(p => p.dinas_status === 'approved');
    const hasDinasRejected = submittedProposals.some(p => p.dinas_status === 'rejected' || p.dinas_status === 'revision');
    const hasDinasPending = submittedProposals.some(p => !p.dinas_status || p.dinas_status === 'pending');

    if (hasDinasPending) {
      steps[1].status = 'active';
      steps[1].icon = LuClock;
      steps[1].color = 'blue';
      steps[1].label = 'Sedang direview Dinas';
      return steps;
    }

    if (hasDinasRejected) {
      steps[1].status = 'rejected';
      steps[1].icon = LuX;
      steps[1].color = 'red';
      steps[1].label = 'Ditolak Dinas - Kembali ke Desa';
      return steps;
    }

    if (hasDinasApproved) {
      steps[1].status = 'completed';
      steps[1].icon = LuCheck;
      steps[1].color = 'green';
      steps[1].label = 'Disetujui Dinas';
    }

    // Check kecamatan status
    const pendingProposals = submittedProposals.filter(p => p.status === 'pending');
    const rejectedProposals = submittedProposals.filter(p => p.status === 'revision' || p.status === 'rejected');
    const verifiedProposals = submittedProposals.filter(p => p.status === 'verified');

    if (pendingProposals.length > 0) {
      steps[2].status = 'active';
      steps[2].icon = LuClock;
      steps[2].color = 'blue';
      steps[2].label = 'Sedang direview Kecamatan';
      return steps;
    }

    if (rejectedProposals.length > 0) {
      steps[2].status = 'rejected';
      steps[2].icon = LuX;
      steps[2].color = 'red';
      steps[2].label = 'Ditolak - Kembali ke Desa';
      return steps;
    }

    if (verifiedProposals.length > 0 && rejectedProposals.length === 0 && pendingProposals.length === 0) {
      steps[2].status = 'completed';
      steps[2].icon = LuCheck;
      steps[2].color = 'green';
      steps[2].label = 'Disetujui Kecamatan';
      steps[3].status = 'active';
      steps[3].icon = LuClock;
      steps[3].color = 'blue';
      steps[3].label = 'Sedang direview DPMD';
    }

    return steps;
  };

  const steps = getTrackingSteps();

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center flex-1">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all
                ${step.status === 'completed' ? 'bg-green-500 text-white shadow-lg' : ''}
                ${step.status === 'active' ? 'bg-blue-500 text-white shadow-lg animate-pulse' : ''}
                ${step.status === 'rejected' ? 'bg-red-500 text-white shadow-lg' : ''}
                ${step.status === 'pending' ? 'bg-gray-300 text-gray-600' : ''}
              `}>
                <step.icon className="w-5 h-5" />
              </div>
              <span className={`text-xs font-medium text-center leading-tight ${
                step.status === 'completed' ? 'text-green-700' :
                step.status === 'active' ? 'text-blue-700' :
                step.status === 'rejected' ? 'text-red-700' :
                'text-gray-500'
              }`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`h-0.5 flex-1 mx-2 ${
                steps[index + 1].status === 'completed' ? 'bg-green-500' :
                steps[index + 1].status === 'active' ? 'bg-blue-500' :
                'bg-gray-300'
              }`} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const BankeuVerificationDetailPage = () => {
  const { desaId } = useParams();
  const navigate = useNavigate();
  const [desa, setDesa] = useState(null);
  const [masterKegiatan, setMasterKegiatan] = useState([]);
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedInfra, setExpandedInfra] = useState(true);
  const [expandedNonInfra, setExpandedNonInfra] = useState(true);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);

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
      let allKegiatan = [];
      
      if (masterData.infrastruktur && Array.isArray(masterData.infrastruktur)) {
        allKegiatan.push(...masterData.infrastruktur);
      }
      if (masterData.non_infrastruktur && Array.isArray(masterData.non_infrastruktur)) {
        allKegiatan.push(...masterData.non_infrastruktur);
      }
      
      // Deduplikasi berdasarkan ID kegiatan (safety net)
      const uniqueKegiatan = allKegiatan.filter((kegiatan, index, self) => 
        index === self.findIndex(k => parseInt(k.id) === parseInt(kegiatan.id))
      );
      
      setMasterKegiatan(uniqueKegiatan);
      
      // Filter proposals for this desa ONLY (per-desa review)
      const desaIdNum = parseInt(desaId);
      const allProposals = proposalsRes.data.data;
      const desaProposals = allProposals.filter(p => {
        const pDesaId = parseInt(p.desa_id);
        return pDesaId === desaIdNum;
      });
      
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

  const handleViewPdf = (proposal, kegiatanNama) => {
    // Construct full API URL with proper path
    const apiBaseUrl = imageBaseUrl.replace(/\/api$/, ''); // Remove /api suffix if exists
    
    const pdfData = {
      kegiatanName: kegiatanNama,
      status: proposal.status,
      anggaran: proposal.anggaran_usulan,
      proposal: proposal // Include full proposal data
    };

    // Check if Kecamatan pernah reject sebelumnya
    // Multiple view HANYA muncul jika:
    // 1. Kecamatan pernah reject (ada kecamatan_catatan atau kecamatan_status pernah rejected/revision)
    // 2. Desa sudah upload ulang (proposal.verified_at not null - artinya pernah diverifikasi)
    // 3. Ada file referensi (dinas_reviewed_file ada) - otomatis tersimpan ketika upload ulang
    const kecamatanPrevRejected = proposal.kecamatan_catatan || 
                                   proposal.kecamatan_status === 'rejected' || 
                                   proposal.kecamatan_status === 'revision';
    const desaSudahUploadUlang = proposal.verified_at !== null;
    
    // DEBUG LOG untuk troubleshooting tombol Bandingkan
    console.log('🔍 DEBUG Tombol Bandingkan - Proposal ID:', proposal.id);
    console.log('  ├─ kecamatan_status:', proposal.kecamatan_status);
    console.log('  ├─ kecamatan_catatan:', proposal.kecamatan_catatan);
    console.log('  ├─ verified_at:', proposal.verified_at);
    console.log('  ├─ dinas_reviewed_file:', proposal.dinas_reviewed_file);
    console.log('  ├─ kecamatanPrevRejected:', kecamatanPrevRejected);
    console.log('  ├─ desaSudahUploadUlang:', desaSudahUploadUlang);
    console.log('  └─ SHOW DUAL VIEW?', kecamatanPrevRejected && desaSudahUploadUlang && proposal.dinas_reviewed_file);
    
    if (kecamatanPrevRejected && desaSudahUploadUlang && proposal.dinas_reviewed_file) {
      // Multiple view: Bandingkan file lama (referensi) vs file baru (upload ulang desa)
      pdfData.files = [
        {
          type: 'reference',
          label: 'File Referensi (Disetujui Dinas)',
          url: `${apiBaseUrl}/storage/uploads/bankeu_reference/${proposal.dinas_reviewed_file}`,
          reviewedAt: proposal.dinas_reviewed_at
        },
        {
          type: 'current',
          label: 'File Upload Ulang (Desa)',
          url: `${apiBaseUrl}/storage/uploads/bankeu/${proposal.file_proposal}`,
          reviewedAt: null
        }
      ];
    } else if (proposal.dinas_reviewed_file && !kecamatanPrevRejected) {
      // Single view: File dari Dinas (jika Kecamatan belum pernah reject)
      pdfData.url = `${apiBaseUrl}/storage/uploads/bankeu_reference/${proposal.dinas_reviewed_file}`;
    } else {
      // Single file view: File dari Desa (normal flow)
      pdfData.url = `${apiBaseUrl}/storage/uploads/bankeu/${proposal.file_proposal}`;
    }

    console.log('📄 Opening PDF:', pdfData); // Debug log
    setSelectedPdf(pdfData);
    setShowPdfModal(true);
  };

  const handleClosePdfModal = () => {
    setShowPdfModal(false);
    setSelectedPdf(null);
  };

  const handleVerify = async (proposalId, status) => {
    const isApprove = status === "verified";
    
    // Jika approve, langsung proses tanpa popup
    if (isApprove) {
      try {
        const response = await api.patch(`/kecamatan/bankeu/proposals/${proposalId}/verify`, {
          action: 'approved',
          catatan: ''
        });

        // Toast notification singkat
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Proposal disetujui',
          showConfirmButton: false,
          timer: 1500,
          timerProgressBar: true
        });

        // Refresh data untuk update state lengkap
        await fetchData();
      } catch (error) {
        console.error("Error verifying proposal:", error);
        Swal.fire({
          icon: 'error',
          title: 'Gagal!',
          text: error.response?.data?.message || 'Terjadi kesalahan saat memproses verifikasi',
        });
      }
      return;
    }
    
    // Jika tolak, tampilkan modal untuk input catatan
    const result = await Swal.fire({
      title: '',
      html: `
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-rose-100 mb-4">
            <svg class="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </div>
          
          <h3 class="text-2xl font-bold text-red-700 mb-2">
            Tandai untuk Revisi
          </h3>
          
          <p class="text-gray-600 mb-6">
            Proposal akan ditolak dan dikembalikan ke <strong>Desa</strong> untuk diperbaiki.
          </p>
          
          <div class="text-left space-y-4">
            <div>
              <label class="block text-sm font-semibold text-gray-700 mb-2">
                Alasan Penolakan *
              </label>
              <textarea 
                id="catatan-verifikasi" 
                rows="4"
                placeholder="Jelaskan alasan penolakan dan hal yang perlu diperbaiki..."
                class="w-full px-4 py-3 border-2 border-red-200 focus:border-red-500 rounded-xl focus:outline-none focus:ring-4 focus:ring-red-100 transition-all duration-200 resize-none"
                style="font-family: inherit;"
              ></textarea>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: `<span class="flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
        Ya, Tolak
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
        confirmButton: 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border-0 flex-1',
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
        
        if (!catatan.trim()) {
          Swal.showValidationMessage("Alasan penolakan wajib diisi");
          return false;
        }
        
        return { catatan };
      }
    });

    if (result.isConfirmed) {
      try {
        const response = await api.patch(`/kecamatan/bankeu/proposals/${proposalId}/verify`, {
          action: status,
          catatan: result.value.catatan || ''
        });

        // Toast notification untuk revision
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'warning',
          title: 'Proposal dikembalikan ke Desa',
          showConfirmButton: false,
          timer: 2000,
          timerProgressBar: true
        });

        // Refresh data untuk update state lengkap
        await fetchData();
      } catch (error) {
        console.error("Error verifying proposal:", error);
        Swal.fire({
          icon: 'error',
          title: 'Gagal!',
          text: error.response?.data?.message || 'Terjadi kesalahan saat memproses verifikasi',
        });
      }
    }
  };

  // Memoize review status untuk menghindari re-calculation berkali-kali
  const reviewStatus = useMemo(() => {
    // Check if all uploaded proposals for THIS DESA ONLY have been reviewed
    // proposals state already filtered by desaId in fetchData()
    // HANYA hitung proposal yang MASIH di kecamatan (submitted_to_kecamatan = TRUE)
    const uploadedProposals = proposals.filter(p => p && p.submitted_to_kecamatan);
    const pendingProposals = uploadedProposals.filter(p => p.status === 'pending');
    const rejectedProposals = uploadedProposals.filter(p => p.status === 'revision');
    const verifiedProposals = uploadedProposals.filter(p => p.status === 'verified');
    
    return {
      allReviewed: pendingProposals.length === 0 && uploadedProposals.length > 0,
      hasRejected: rejectedProposals.length > 0,
      totalUploaded: uploadedProposals.length,
      totalPending: pendingProposals.length,
      totalVerified: verifiedProposals.length,
      totalRejected: rejectedProposals.length
    };
  }, [proposals, desaId, desa?.nama]);

  const handleSubmitReview = async () => {
    
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
              ? `Terdapat <strong>${reviewStatus.totalRejected} proposal</strong> dari <strong>Desa ${desa?.nama}</strong> yang ditandai untuk revisi. Kembalikan ke desa untuk diperbaiki?`
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
                href="${imageBaseUrl}${response.data.data.file_path}"
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
      revision: { icon: LuRefreshCw, text: "Perlu Revisi", color: "bg-orange-100 text-orange-700" }
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

  // Group kegiatan by type - dengan useMemo untuk menghindari re-calculation
  const infrastruktur = useMemo(() => {
    return masterKegiatan
      .filter(k => k.jenis_kegiatan === 'infrastruktur')
      // Deduplicate by kegiatan id
      .filter((kegiatan, index, self) => 
        index === self.findIndex(k => parseInt(k.id) === parseInt(kegiatan.id))
      )
      .map(kegiatan => {
        // Many-to-many: Find proposals yang include kegiatan ini di kegiatan_list
        const proposal = proposals.find(p => 
          p.kegiatan_list?.some(k => parseInt(k.id) === parseInt(kegiatan.id))
        );
        return { kegiatan, proposal: proposal || null };
      });
  }, [masterKegiatan, proposals]);

  const nonInfrastruktur = useMemo(() => {
    return masterKegiatan
      .filter(k => k.jenis_kegiatan === 'non_infrastruktur')
      // Deduplicate by kegiatan id
      .filter((kegiatan, index, self) => 
        index === self.findIndex(k => parseInt(k.id) === parseInt(kegiatan.id))
      )
      .map(kegiatan => {
        // Many-to-many: Find proposals yang include kegiatan ini di kegiatan_list
        const proposal = proposals.find(p => 
          p.kegiatan_list?.some(k => parseInt(k.id) === parseInt(kegiatan.id))
        );
        return { kegiatan, proposal: proposal || null };
      });
  }, [masterKegiatan, proposals]);



  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-500 rounded-full animate-pulse"></div>
          </div>
        </div>
        <div className="text-lg font-semibold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent animate-pulse">
          Memuat data...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 space-y-6 pb-8">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <button
            onClick={() => navigate('/kecamatan/bankeu')}
            className="flex items-center gap-2 text-gray-600 hover:text-violet-600 mb-4 transition-colors duration-200"
          >
            <LuArrowLeft className="w-5 h-5" />
            <span className="font-medium">Kembali ke Daftar Desa</span>
          </button>
          
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Verifikasi Proposal</h1>
              <p className="text-gray-600">Desa <span className="font-semibold text-violet-600">{desa?.nama}</span></p>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Review Status Indicator */}
              {(() => {
                const allReviewed = reviewStatus.allReviewed;
                const hasRejected = reviewStatus.hasRejected;
                const totalPending = reviewStatus.totalPending;
                const totalRejected = reviewStatus.totalRejected;
                
                if (!allReviewed && totalPending > 0) {
                  return (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-2 border-amber-200 rounded-lg">
                      <LuClock className="w-5 h-5 text-amber-600" />
                      <span className="font-semibold text-amber-800 text-sm">
                        {totalPending} proposal belum direview
                      </span>
                    </div>
                  );
                } else if (allReviewed && hasRejected) {
                  return (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border-2 border-orange-200 rounded-lg">
                      <LuRefreshCw className="w-5 h-5 text-orange-600" />
                      <span className="font-semibold text-orange-800 text-sm">
                        {totalRejected} proposal perlu revisi
                      </span>
                    </div>
                  );
                } else if (allReviewed && !hasRejected) {
                  return (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border-2 border-green-200 rounded-lg">
                      <LuCheck className="w-5 h-5 text-green-600" />
                      <span className="font-semibold text-green-800 text-sm">
                        Semua proposal disetujui
                      </span>
                    </div>
                  );
                }
                
                return null;
              })()}
              
              <button
                onClick={handleGenerateBeritaAcara}
                disabled={!reviewStatus.allReviewed}
                className={`flex items-center gap-2 px-4 py-2.5 border-2 rounded-lg font-semibold transition-all duration-200 ${
                  reviewStatus.allReviewed
                    ? 'bg-white border-violet-600 text-violet-600 hover:bg-violet-50'
                    : 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                }`}
              >
                <LuDownload className="w-5 h-5" />
                <span>Berita Acara</span>
              </button>
              
              {/* Tombol Final Action - hanya muncul jika semua sudah direview */}
              {reviewStatus.allReviewed && (
                <button
                  onClick={handleSubmitReview}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold transition-all duration-200 shadow-lg ${
                    reviewStatus.hasRejected
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white'
                      : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
                  }`}
                >
                  {reviewStatus.hasRejected ? (
                    <>
                      <LuRefreshCw className="w-5 h-5" />
                      <span>Kembalikan ke Desa</span>
                    </>
                  ) : (
                    <>
                      <LuCheck className="w-5 h-5" />
                      <span>Kirim ke DPMD</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Tracking - Level Desa */}
      <div className="max-w-7xl mx-auto px-6 mb-4">
        <StatusTracking proposals={proposals} />
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-4">

      {/* Infrastruktur */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => setExpandedInfra(!expandedInfra)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100">
              {expandedInfra ? <LuChevronDown className="w-6 h-6 text-blue-600" /> : <LuChevronRight className="w-6 h-6 text-blue-600" />}
            </div>
            <div className="text-left">
              <h3 className="text-xl font-bold text-gray-900">Infrastruktur</h3>
              <p className="text-sm text-gray-500">Pembangunan fisik dan sarana prasarana</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-sm font-semibold">
              {infrastruktur.filter(i => i.proposal).length}
            </span>
            <span className="text-gray-400">/</span>
            <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-semibold">
              {infrastruktur.length}
            </span>
          </div>
        </button>
        
        {expandedInfra && (
          <div className="border-t border-gray-200">
            {infrastruktur.map((item, index) => (
              <ProposalRow
                key={`infra-${item.kegiatan.id}`}
                kegiatan={item.kegiatan}
                proposal={item.proposal}
                index={index}
                onVerify={handleVerify}
                onViewPdf={handleViewPdf}
                getStatusBadge={getStatusBadge}
                imageBaseUrl={imageBaseUrl}
              />
            ))}
          </div>
        )}
      </div>

      {/* Non-Infrastruktur */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <button
          onClick={() => setExpandedNonInfra(!expandedNonInfra)}
          className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-100">
              {expandedNonInfra ? <LuChevronDown className="w-6 h-6 text-purple-600" /> : <LuChevronRight className="w-6 h-6 text-purple-600" />}
            </div>
            <div className="text-left">
              <h3 className="text-xl font-bold text-gray-900">Non-Infrastruktur</h3>
              <p className="text-sm text-gray-500">Pemberdayaan dan pengembangan masyarakat</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm font-semibold">
              {nonInfrastruktur.filter(i => i.proposal).length}
            </span>
            <span className="text-gray-400">/</span>
            <span className="px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm font-semibold">
              {nonInfrastruktur.length}
            </span>
          </div>
        </button>
        
        {expandedNonInfra && (
          <div className="border-t border-gray-200">
            {nonInfrastruktur.map((item, index) => (
              <ProposalRow
                key={`non-infra-${item.kegiatan.id}`}
                kegiatan={item.kegiatan}
                proposal={item.proposal}
                index={index}
                onVerify={handleVerify}
                onViewPdf={handleViewPdf}
                getStatusBadge={getStatusBadge}
                imageBaseUrl={imageBaseUrl}
              />
            ))}
          </div>
        )}
      </div>
      </div>

      {/* Modal PDF Viewer */}
      {showPdfModal && selectedPdf && (
        <PdfViewerModal
          show={showPdfModal}
          onClose={handleClosePdfModal}
          pdfData={selectedPdf}
        />
      )}
    </div>
  );
};

// Proposal Row Component
const ProposalRow = ({ kegiatan, proposal, index, onVerify, onViewPdf, getStatusBadge, imageBaseUrl }) => {
  return (
    <div className={`p-3 border-b border-gray-100 hover:bg-gray-50 transition-colors duration-150 ${index === 0 ? '' : ''}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          <h4 className="text-sm font-medium text-gray-500 leading-snug">{kegiatan.nama_kegiatan}</h4>
          
          {proposal ? (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">
                  <LuCheck className="w-3 h-3" />
                  Sudah Upload
                </span>
                {getStatusBadge(proposal.kecamatan_status || proposal.status)}
              </div>
              
              {/* Judul Proposal */}
              <div className="text-sm font-semibold text-gray-900">
                {proposal.judul_proposal}
              </div>

              {/* Tampilkan semua kegiatan dalam proposal ini (many-to-many) */}
              {proposal.kegiatan_list && proposal.kegiatan_list.length > 1 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {proposal.kegiatan_list.map((k) => (
                    <span 
                      key={k.id}
                      className={`px-2 py-0.5 rounded text-xs font-medium ${
                        k.jenis_kegiatan === 'infrastruktur' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}
                    >
                      {k.nama_kegiatan.substring(0, 30)}{k.nama_kegiatan.length > 30 ? '...' : ''}
                    </span>
                  ))}
                </div>
              )}
              
              {/* Detail kegiatan yang di-input desa */}
              {proposal.nama_kegiatan_spesifik && (
                <div className="text-xs text-gray-600 italic">
                  {proposal.nama_kegiatan_spesifik}
                </div>
              )}
              {proposal.volume && (
                <div className="flex items-center gap-1.5 text-xs text-gray-700">
                  <LuPackage className="w-3.5 h-3.5 text-blue-600" />
                  <span className="font-medium">Volume:</span> {proposal.volume}
                </div>
              )}
              {proposal.lokasi && (
                <div className="flex items-center gap-1.5 text-xs text-gray-700">
                  <LuMapPin className="w-3.5 h-3.5 text-red-600" />
                  <span className="font-medium">Lokasi:</span> {proposal.lokasi}
                </div>
              )}
              
              <div className="flex items-center gap-1.5 text-xs text-gray-900">
                <LuDollarSign className="w-3.5 h-3.5 text-green-600" />
                <span className="font-medium">Anggaran:</span>{' '}
                {new Intl.NumberFormat("id-ID", {
                  style: "currency",
                  currency: "IDR",
                  minimumFractionDigits: 0
                }).format(proposal.anggaran_usulan)}
              </div>
              
              {/* Catatan dari berbagai level verifikasi */}
              {proposal.dinas_catatan && (
                <div className={`p-3 rounded-lg border ${
                  proposal.dinas_reviewed_file 
                    ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-start gap-2">
                    <LuInfo className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-semibold text-blue-800 text-xs mb-1">
                        💬 Catatan dari Dinas Terkait
                        {proposal.dinas_status === 'approved' && ' (Disetujui)'}
                        {proposal.dinas_status === 'revision' && ' (Perlu Revisi)'}
                        {proposal.dinas_status === 'rejected' && ' (Ditolak)'}
                      </p>
                      <p className="text-blue-700 text-xs leading-relaxed">{proposal.dinas_catatan}</p>
                      {proposal.dinas_reviewed_file && (
                        <p className="text-blue-600 text-xs mt-2 flex items-center gap-1">
                          <LuShield className="w-3 h-3" />
                          File referensi tersimpan untuk perbandingan
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {proposal.kecamatan_catatan && (
                <div className="p-2 bg-purple-50 border-l-2 border-purple-400 rounded text-xs">
                  <span className="font-medium text-purple-800">Catatan Kecamatan: </span>
                  <span className="text-purple-700">{proposal.kecamatan_catatan}</span>
                </div>
              )}
              
              {proposal.catatan_verifikasi && (
                <div className="p-2 bg-amber-50 border-l-2 border-amber-400 rounded text-xs">
                  <span className="font-medium text-amber-800">Catatan Verifikasi: </span>
                  <span className="text-amber-700">{proposal.catatan_verifikasi}</span>
                </div>
              )}
            </div>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
              <LuX className="w-3 h-3" />
              Belum Upload
            </span>
          )}
        </div>

        {proposal && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Badge untuk indicate ada file referensi dari Dinas - hanya tampil jika Kecamatan pernah reject */}
            {(() => {
              const kecamatanPrevRejected = proposal.kecamatan_catatan || 
                                             proposal.kecamatan_status === 'rejected' || 
                                             proposal.kecamatan_status === 'revision';
              const desaSudahUploadUlang = proposal.verified_at !== null;
              const showDualView = kecamatanPrevRejected && desaSudahUploadUlang && proposal.dinas_reviewed_file;
              
              return (
                <>
                  {showDualView && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-purple-50 border border-purple-200 rounded-lg">
                      <LuShield className="w-3.5 h-3.5 text-purple-600" />
                      <span className="text-xs font-semibold text-purple-700">Ref. Dinas</span>
                    </div>
                  )}
                  
                  <button
                    onClick={() => onViewPdf(proposal, kegiatan.nama_kegiatan)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                      showDualView
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                    title={showDualView ? 'Lihat dan Bandingkan 2 File' : 'Lihat Proposal'}
                  >
                    <LuEye className="w-3.5 h-3.5" />
                    {showDualView ? 'Bandingkan' : 'Lihat'}
                  </button>
                </>
              );
            })()}

            {/* Show action buttons - Kecamatan bisa review jika belum final approved
                Logika: Selama kecamatan_status bukan 'approved', tampilkan tombol
                Ini independen dari dinas_status, karena file referensi dari Dinas 
                hanya untuk perbandingan, bukan mempengaruhi flow review Kecamatan
            */}
            {proposal.kecamatan_status !== 'approved' && (
              <>
                <button
                  onClick={() => onVerify(proposal.id, "verified")}
                  className="p-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-150 shadow-sm"
                  title="Setujui"
                >
                  <LuCheck className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onVerify(proposal.id, "revision")}
                  className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-150 shadow-sm"
                  title="Tandai untuk Revisi"
                >
                  <LuX className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// PdfViewerModal Component
const PdfViewerModal = ({ show, onClose, pdfData }) => {
  const [activeTab, setActiveTab] = React.useState(0);
  
  if (!show || !pdfData) return null;

  // Check if dual file view (with reference file from Dinas)
  const isDualView = pdfData.files && pdfData.files.length > 1;
  const currentFile = isDualView ? pdfData.files[activeTab] : { url: pdfData.url };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background Overlay */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-900 bg-opacity-75"
          onClick={onClose}
        />

        {/* Modal Panel */}
        <div className="inline-block w-full my-4 sm:my-8 overflow-hidden text-left align-middle transition-all transform bg-white rounded-lg shadow-2xl sm:max-w-7xl sm:w-full relative z-10">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 border-b border-blue-800">
            <div className="flex-1 min-w-0">
              <h3 className="text-sm sm:text-lg font-semibold text-white truncate">
                {pdfData.kegiatanName}
              </h3>
              {isDualView ? (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-500 bg-opacity-40 rounded-lg border border-blue-400">
                    <LuShield className="w-3.5 h-3.5 text-white" />
                    <span className="text-xs font-semibold text-white">Mode Perbandingan</span>
                  </div>
                  <p className="text-xs text-blue-100 hidden sm:block">
                    Desa telah upload ulang setelah review Dinas
                  </p>
                </div>
              ) : (
                <p className="text-xs sm:text-sm text-blue-200 mt-1">
                  Review proposal dari Desa
                </p>
              )}
            </div>
            
            <button
              onClick={onClose}
              className="absolute top-2 right-2 sm:relative sm:top-0 sm:right-0 p-2 text-white hover:bg-blue-800 rounded-lg transition-colors flex-shrink-0"
              title="Tutup"
            >
              <LuX className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Tab Navigation for Dual View */}
          {isDualView && (
            <div className="bg-white border-b border-gray-200 px-4 sm:px-6">
              <div className="flex gap-2 sm:gap-4 -mb-px">
                {pdfData.files.map((file, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveTab(index)}
                    className={`flex-1 px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 transition-all ${
                      activeTab === index
                        ? file.type === 'reference'
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-amber-600 bg-amber-50'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2">
                      <div className="flex items-center gap-1.5">
                        {file.type === 'reference' ? (
                          <LuShield className={`w-4 h-4 ${activeTab === index ? 'text-blue-600' : 'text-gray-500'}`} />
                        ) : (
                          <LuFileText className={`w-4 h-4 ${activeTab === index ? 'text-amber-600' : 'text-gray-500'}`} />
                        )}
                        <span className={activeTab === index ? (file.type === 'reference' ? 'text-blue-700' : 'text-amber-700') : 'text-gray-600'}>
                          {file.label}
                        </span>
                      </div>
                      {file.reviewedAt && (
                        <div className={`text-xs ${activeTab === index ? 'text-blue-600' : 'text-gray-500'} mt-0.5 sm:mt-0`}>
                          {new Date(file.reviewedAt).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Info Banner for Reference File */}
          {isDualView && activeTab === 0 && (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 px-4 sm:px-6 py-3">
              <div className="flex items-start gap-2">
                <LuShield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs sm:text-sm text-blue-900">
                  <p className="font-bold mb-1">📋 File Referensi (Disetujui Dinas Terkait)</p>
                  <p className="text-blue-700">
                    Ini adalah file <strong>asli yang disetujui</strong> oleh Dinas pada{' '}
                    {new Date(pdfData.files[0].reviewedAt).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}.
                    File ini <strong>tidak akan berubah</strong> meskipun Desa mengupload file baru.
                  </p>
                </div>
              </div>
            </div>
          )}

          {isDualView && activeTab === 1 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200 px-4 sm:px-6 py-3">
              <div className="flex items-start gap-2">
                <LuInfo className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs sm:text-sm text-amber-900">
                  <p className="font-bold mb-1">🔄 File Terbaru (Upload Ulang dari Desa)</p>
                  <p className="text-amber-700">
                    Ini adalah file yang <strong>baru saja diupload</strong> oleh Desa setelah mendapat revisi dari Dinas.
                    Silakan <strong>bandingkan dengan file referensi</strong> untuk memastikan kesesuaian dan kelengkapan revisi.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* PDF Viewer */}
          <div className="relative bg-gray-100" style={{ height: '80vh' }}>
            <iframe
              src={currentFile.url}
              className="w-full h-full border-0"
              title="PDF Viewer"
            />
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
              <div className="space-y-1">
                <p className="text-xs sm:text-sm text-gray-600">
                  <span className="font-medium">Status:</span>{' '}
                  <span className={`font-semibold ${
                    pdfData.status === 'approved' ? 'text-green-600' :
                    pdfData.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                  }`}>
                    {pdfData.status === 'approved' ? 'Disetujui' :
                     pdfData.status === 'rejected' ? 'Ditolak' : 'Menunggu Verifikasi'}
                  </span>
                </p>
                <p className="text-xs sm:text-sm text-gray-600">
                  <span className="font-medium">Anggaran:</span>{' '}
                  <span className="font-semibold text-blue-600">
                    Rp {pdfData.anggaran?.toLocaleString('id-ID') || 0}
                  </span>
                </p>
              </div>
              
              <button
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm font-medium"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BankeuVerificationDetailPage;