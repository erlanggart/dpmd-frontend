import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api";
import Swal from "sweetalert2";
import {
  LuEye, LuCheck, LuX, LuRefreshCw, LuClock, LuArrowLeft,
  LuChevronDown, LuChevronRight, LuDownload, LuClipboardList,
  LuMapPin, LuPackage, LuDollarSign, LuInfo,
  LuShield, LuFileText, LuTriangleAlert
} from "react-icons/lu";

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const BankeuVerificationDetailPage = () => {
  const { desaId } = useParams();
  const navigate = useNavigate();
  const [desa, setDesa] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [surat, setSurat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedInfra, setExpandedInfra] = useState(false);
  const [expandedNonInfra, setExpandedNonInfra] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [timCompletionStatus, setTimCompletionStatus] = useState({});
  const [submissionOpen, setSubmissionOpen] = useState(true);

  useEffect(() => {
    fetchData();
    fetchSubmissionSetting();
  }, [desaId]);

  const fetchSubmissionSetting = async () => {
    try {
      const res = await api.get('/app-settings/bankeu_submission_kecamatan').catch(() => ({ data: { data: { value: true } } }));
      setSubmissionOpen(res.data?.data?.value ?? true);
    } catch (error) {
      console.error('Error fetching submission setting:', error);
      setSubmissionOpen(true);
    }
  };

  // Fungsi untuk check completion status semua tim verifikasi
  const checkTimCompletion = async (proposalId, kecamatanId) => {
    try {
      const response = await api.get(
        `/bankeu/questionnaire/${proposalId}/kecamatan/check-all?kecamatan_id=${kecamatanId}`
      );
      // Extract data from response and map to frontend format
      const data = response.data?.data || {};
      console.log(`Tim completion for proposal ${proposalId}:`, data);
      return {
        all_complete: data.is_complete || false,
        tim_status: data.member_status || [],
        completion_issues: data.completion_issues || [],
        total_members: data.total_members || 0,
        complete_members: data.complete_members || 0
      };
    } catch (error) {
      console.error("Error checking tim completion:", error);
      return { all_complete: false, tim_status: [], completion_issues: [] };
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [desaRes, proposalsRes, suratRes] = await Promise.all([
        api.get(`/desas/${desaId}`),
        api.get("/kecamatan/bankeu/proposals"),
        api.get("/kecamatan/bankeu/surat", { params: { tahun: 2026 } }).catch(() => ({ data: { data: [] } }))
      ]);

      // Set desa
      const desaData = desaRes.data.data;
      setDesa(desaData);
      
      // Filter proposals for this desa ONLY (per-desa review)
      const desaIdNum = parseInt(desaId);
      const allProposals = proposalsRes.data.data;
      const desaProposals = allProposals.filter(p => {
        const pDesaId = parseInt(p.desa_id);
        return pDesaId === desaIdNum;
      });
      
      setProposals(desaProposals);
      
      // Get surat for this desa
      const suratList = suratRes.data.data || [];
      const desaSurat = suratList.find(s => parseInt(s.desa_id) === desaIdNum);
      setSurat(desaSurat || null);

      // Check tim completion untuk setiap proposal
      if (desaProposals.length > 0 && desaData?.kecamatan_id) {
        const completionChecks = await Promise.all(
          desaProposals.map(async (proposal) => {
            const status = await checkTimCompletion(proposal.id, desaData.kecamatan_id);
            return { proposalId: proposal.id, status };
          })
        );

        // Store completion status dalam object dengan proposalId sebagai key
        const statusMap = {};
        completionChecks.forEach(({ proposalId, status }) => {
          statusMap[proposalId] = status;
        });
        setTimCompletionStatus(statusMap);
      }
      
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
    
    // Check if already submitted to DPMD
    const isSubmittedToDpmd = uploadedProposals.length > 0 && uploadedProposals.every(p => p.submitted_to_dpmd);
    const submittedToDpmdAt = uploadedProposals.find(p => p.submitted_to_dpmd_at)?.submitted_to_dpmd_at;
    
    // PERBAIKAN: Cek kecamatan_status, bukan status global
    const pendingProposals = uploadedProposals.filter(p => 
      p.kecamatan_status === 'pending' || !p.kecamatan_status
    );
    const rejectedProposals = uploadedProposals.filter(p => 
      p.kecamatan_status === 'rejected' || p.kecamatan_status === 'revision'
    );
    const verifiedProposals = uploadedProposals.filter(p => 
      p.kecamatan_status === 'verified' || p.kecamatan_status === 'approved'
    );
    
    // Check berita acara dan surat pengantar kecamatan
    const proposalsMissingBeritaAcara = uploadedProposals.filter(p => 
      !p.berita_acara_path || p.berita_acara_path === ''
    );
    const proposalsMissingSuratPengantar = uploadedProposals.filter(p => 
      !p.surat_pengantar || p.surat_pengantar === ''
    );
    
    // Check surat pengantar dan surat permohonan dari desa
    const hasSuratPengantarDesa = surat && surat.surat_pengantar;
    const hasSuratPermohonanDesa = surat && surat.surat_permohonan;
    
    return {
      allReviewed: pendingProposals.length === 0 && uploadedProposals.length > 0,
      hasRejected: rejectedProposals.length > 0,
      totalUploaded: uploadedProposals.length,
      totalPending: pendingProposals.length,
      totalVerified: verifiedProposals.length,
      totalRejected: rejectedProposals.length,
      // DPMD status
      isSubmittedToDpmd,
      submittedToDpmdAt,
      // Berita Acara & Surat Pengantar Kecamatan status
      hasAllBeritaAcara: proposalsMissingBeritaAcara.length === 0 && uploadedProposals.length > 0,
      hasAllSuratPengantar: proposalsMissingSuratPengantar.length === 0 && uploadedProposals.length > 0,
      missingBeritaAcara: proposalsMissingBeritaAcara.length,
      missingSuratPengantar: proposalsMissingSuratPengantar.length,
      // Surat dari Desa
      hasSuratPengantarDesa,
      hasSuratPermohonanDesa
    };
  }, [proposals, desaId, desa?.nama, surat]);

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
    
    // If submitting to DPMD (not returning to desa), check submission setting first
    if (action === 'submit') {
      // Check if submission is open
      if (!submissionOpen) {
        Swal.fire({
          title: '',
          html: `
            <div class="text-center py-4">
              <div class="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-rose-100 mb-4">
                <svg class="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-red-700 mb-2">
                Pengajuan Ditutup
              </h3>
              <p class="text-gray-600 mb-2">
                DPMD sedang menutup laju pengajuan proposal untuk sementara waktu.
              </p>
              <p class="text-sm text-red-600">
                Silakan hubungi DPMD untuk informasi lebih lanjut mengenai jadwal pembukaan pengajuan berikutnya.
              </p>
            </div>
          `,
          customClass: {
            popup: 'rounded-2xl shadow-2xl',
            confirmButton: 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 border-0'
          },
          buttonsStyling: false,
          confirmButtonText: 'Mengerti'
        });
        return;
      }

      // Check Berita Acara
      if (!reviewStatus.hasAllBeritaAcara) {
        Swal.fire({
          title: '',
          html: `
            <div class="text-center py-4">
              <div class="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-violet-100 mb-4">
                <svg class="w-12 h-12 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-purple-700 mb-2">
                Berita Acara Belum Lengkap
              </h3>
              <p class="text-gray-600">
                Masih ada <strong>${reviewStatus.missingBeritaAcara} proposal</strong> dari Desa <strong>${desa?.nama}</strong> yang belum memiliki Berita Acara.
              </p>
              <p class="text-gray-500 text-sm mt-2">
                Generate Berita Acara terlebih dahulu untuk setiap proposal sebelum mengirim ke DPMD.
              </p>
            </div>
          `,
          customClass: {
            popup: 'rounded-2xl shadow-2xl',
            confirmButton: 'bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 border-0'
          },
          buttonsStyling: false,
          confirmButtonText: 'Mengerti'
        });
        return;
      }
      
      // Check Surat Pengantar
      if (!reviewStatus.hasAllSuratPengantar) {
        Swal.fire({
          title: '',
          html: `
            <div class="text-center py-4">
              <div class="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 mb-4">
                <svg class="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-blue-700 mb-2">
                Surat Pengantar Belum Lengkap
              </h3>
              <p class="text-gray-600">
                Masih ada <strong>${reviewStatus.missingSuratPengantar} proposal</strong> dari Desa <strong>${desa?.nama}</strong> yang belum memiliki Surat Pengantar.
              </p>
              <p class="text-gray-500 text-sm mt-2">
                Generate Surat Pengantar terlebih dahulu untuk setiap proposal sebelum mengirim ke DPMD.
              </p>
            </div>
          `,
          customClass: {
            popup: 'rounded-2xl shadow-2xl',
            confirmButton: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 border-0'
          },
          buttonsStyling: false,
          confirmButtonText: 'Mengerti'
        });
        return;
      }
      
      // Check Surat Pengantar dari Desa
      if (!reviewStatus.hasSuratPengantarDesa) {
        Swal.fire({
          title: '',
          html: `
            <div class="text-center py-4">
              <div class="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-100 to-amber-100 mb-4">
                <svg class="w-12 h-12 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-orange-700 mb-2">
                Surat Pengantar Desa Belum Ada
              </h3>
              <p class="text-gray-600">
                Desa <strong>${desa?.nama}</strong> belum mengunggah Surat Pengantar Desa.
              </p>
              <p class="text-gray-500 text-sm mt-2">
                Hubungi desa untuk mengunggah Surat Pengantar terlebih dahulu sebelum mengirim ke DPMD.
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
      
      // Check Surat Permohonan dari Desa
      if (!reviewStatus.hasSuratPermohonanDesa) {
        Swal.fire({
          title: '',
          html: `
            <div class="text-center py-4">
              <div class="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-rose-100 mb-4">
                <svg class="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-red-700 mb-2">
                Surat Permohonan Desa Belum Ada
              </h3>
              <p class="text-gray-600">
                Desa <strong>${desa?.nama}</strong> belum mengunggah Surat Permohonan Desa.
              </p>
              <p class="text-gray-500 text-sm mt-2">
                Hubungi desa untuk mengunggah Surat Permohonan terlebih dahulu sebelum mengirim ke DPMD.
              </p>
            </div>
          `,
          customClass: {
            popup: 'rounded-2xl shadow-2xl',
            confirmButton: 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-200 border-0'
          },
          buttonsStyling: false,
          confirmButtonText: 'Mengerti'
        });
        return;
      }
    }
    
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
              : `Semua proposal <strong>Desa ${desa?.nama}</strong> telah diverifikasi. Kirim hasil verifikasi ke DPMD?`
            }
          </p>
          
          <div class="bg-gray-50 rounded-lg p-4 text-left">
            <div class="text-sm font-semibold text-gray-700 mb-2">📋 Ringkasan Desa ${desa?.nama}:</div>
            <div class="mt-2 space-y-2">
              <div class="flex justify-between text-sm">
                <span>Total Proposal:</span>
                <span class="font-semibold">${reviewStatus.totalUploaded}</span>
              </div>
              ${action !== 'return' ? `
              <div class="border-t border-gray-200 pt-2 mt-2">
                <div class="text-xs font-semibold text-gray-500 mb-1">📄 Dokumen dari Desa:</div>
                <div class="flex justify-between text-sm">
                  <span>Surat Pengantar Desa:</span>
                  <span class="font-semibold ${reviewStatus.hasSuratPengantarDesa ? 'text-green-600' : 'text-red-600'}">
                    ${reviewStatus.hasSuratPengantarDesa ? '✓ Ada' : '✗ Belum'}
                  </span>
                </div>
                <div class="flex justify-between text-sm">
                  <span>Surat Permohonan Desa:</span>
                  <span class="font-semibold ${reviewStatus.hasSuratPermohonanDesa ? 'text-green-600' : 'text-red-600'}">
                    ${reviewStatus.hasSuratPermohonanDesa ? '✓ Ada' : '✗ Belum'}
                  </span>
                </div>
              </div>
              <div class="border-t border-gray-200 pt-2 mt-2">
                <div class="text-xs font-semibold text-gray-500 mb-1">📋 Dokumen Kecamatan:</div>
                <div class="flex justify-between text-sm">
                  <span>Berita Acara:</span>
                  <span class="font-semibold ${reviewStatus.hasAllBeritaAcara ? 'text-green-600' : 'text-red-600'}">
                    ${reviewStatus.hasAllBeritaAcara ? '✓ Lengkap' : `✗ ${reviewStatus.missingBeritaAcara} belum`}
                  </span>
                </div>
                <div class="flex justify-between text-sm">
                  <span>Surat Pengantar:</span>
                  <span class="font-semibold ${reviewStatus.hasAllSuratPengantar ? 'text-green-600' : 'text-red-600'}">
                    ${reviewStatus.hasAllSuratPengantar ? '✓ Lengkap' : `✗ ${reviewStatus.missingSuratPengantar} belum`}
                  </span>
                </div>
              </div>
              ` : ''}
              ${reviewStatus.hasRejected ? `
              <div class="border-t border-gray-200 pt-2 mt-2">
                <div class="flex justify-between text-sm">
                  <span>Ditolak/Revisi:</span>
                  <span class="font-semibold text-orange-600">${reviewStatus.totalRejected}</span>
                </div>
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

  // Handler untuk generate berita acara per proposal
  const handleGenerateBeritaAcaraKegiatan = async (kegiatanId, namaKegiatan, proposalId) => {
    const result = await Swal.fire({
      title: '',
      html: `
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-violet-100 to-purple-100 mb-4">
            <svg class="w-12 h-12 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          
          <h3 class="text-2xl font-bold text-violet-700 mb-2">
            Buat Berita Acara Kegiatan
          </h3>
          
          <p class="text-gray-600 mb-2">
            <strong>Desa:</strong> ${desa?.nama}<br/>
            <strong>Kegiatan:</strong> ${namaKegiatan}
          </p>
          <p class="text-gray-500 text-sm">
            Lanjutkan membuat Berita Acara untuk kegiatan ini?
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
        confirmButton: 'bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border-0 flex-1',
        cancelButton: 'bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all duration-200 border-0 flex-1'
      },
      buttonsStyling: false,
      showClass: {
        popup: 'animate__animated animate__zoomIn animate__faster'
      }
    });

    if (result.isConfirmed) {
      try {
        const response = await api.post(`/kecamatan/bankeu/desa/${desaId}/berita-acara`, {
          kegiatanId,
          proposalId
        });
        
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
                Berita Acara untuk <strong>${namaKegiatan}</strong> berhasil dibuat
              </p>
              <a
                href="${imageBaseUrl}${response.data.data.file_path}"
                target="_blank"
                class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold hover:from-violet-700 hover:to-purple-700 transition-all duration-200 shadow-lg"
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
        console.error("Error generating berita acara kegiatan:", error);
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

  // Handler untuk generate surat pengantar per proposal
  const handleGenerateSuratPengantar = async (proposalId, judulProposal) => {
    const result = await Swal.fire({
      title: '',
      html: `
        <div class="text-center">
          <div class="mx-auto flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 mb-4">
            <svg class="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
          </div>
          
          <h3 class="text-2xl font-bold text-blue-700 mb-4">
            Buat Surat Pengantar
          </h3>
          
          <p class="text-gray-600 mb-4">
            <strong>Desa:</strong> ${desa?.nama}<br/>
            <strong>Proposal:</strong> ${judulProposal}
          </p>
          
          <div class="text-left mb-4">
            <label class="block text-sm font-semibold text-gray-700 mb-2">Nomor Surat <span class="text-red-500">*</span></label>
            <input 
              type="text" 
              id="nomorSurat" 
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              placeholder="Contoh: 005/123/Kec.Ciomas/2026"
            />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: `<span class="flex items-center gap-2">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
        </svg>
        Buat Surat
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
        confirmButton: 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 border-0 flex-1',
        cancelButton: 'bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-all duration-200 border-0 flex-1'
      },
      buttonsStyling: false,
      showClass: {
        popup: 'animate__animated animate__zoomIn animate__faster'
      },
      preConfirm: () => {
        const nomorSurat = document.getElementById('nomorSurat').value;
        if (!nomorSurat || !nomorSurat.trim()) {
          Swal.showValidationMessage('Nomor Surat wajib diisi');
          return false;
        }
        return nomorSurat.trim();
      }
    });

    if (result.isConfirmed) {
      try {
        const nomorSurat = result.value;
        const response = await api.post(`/berita-acara/surat-pengantar/${proposalId}`, { nomor_surat: nomorSurat });
        
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
                Surat Pengantar untuk <strong>${judulProposal}</strong> berhasil dibuat
              </p>
              <a
                href="${imageBaseUrl}${response.data.data.pdf_path}"
                target="_blank"
                class="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                </svg>
                Download Surat Pengantar
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
        console.error("Error generating surat pengantar:", error);
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
                ${error.response?.data?.message || "Gagal membuat Surat Pengantar"}
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

  // Handler untuk review surat
  const handleReviewSurat = async (suratId, status, catatan = '') => {
    try {
      Swal.fire({
        title: status === 'approved' ? 'Menyetujui surat...' : 'Menolak surat...',
        text: 'Mohon tunggu',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      await api.post(`/kecamatan/bankeu/surat/${suratId}/review`, {
        status,
        catatan
      });

      await fetchData();

      Swal.fire({
        icon: "success",
        title: status === 'approved' ? 'Surat Disetujui!' : 'Surat Ditolak',
        text: status === 'approved' 
          ? 'Surat berhasil disetujui' 
          : 'Surat berhasil ditolak dan dikembalikan ke desa',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Error review surat:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal",
        text: error.response?.data?.message || "Gagal melakukan review surat"
      });
    }
  };

  const handleApproveSurat = (suratId) => {
    Swal.fire({
      title: 'Setujui Surat Desa?',
      text: 'Surat Pengantar dan Surat Permohonan akan disetujui',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#10b981',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Setujui',
      cancelButtonText: 'Batal'
    }).then((result) => {
      if (result.isConfirmed) {
        handleReviewSurat(suratId, 'approved');
      }
    });
  };

  const handleRejectSurat = (suratId) => {
    Swal.fire({
      title: 'Tolak Surat Desa?',
      html: `
        <div class="text-left mb-4">
          <label class="block text-sm font-medium text-gray-700 mb-2">Alasan Penolakan <span class="text-red-500">*</span></label>
          <textarea
            id="catatan-penolakan"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            rows="4"
            placeholder="Jelaskan alasan penolakan..."></textarea>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ya, Tolak',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const catatan = document.getElementById('catatan-penolakan').value;
        if (!catatan || catatan.trim() === '') {
          Swal.showValidationMessage('Catatan penolakan wajib diisi');
          return false;
        }
        return catatan;
      }
    }).then((result) => {
      if (result.isConfirmed) {
        handleReviewSurat(suratId, 'rejected', result.value);
      }
    });
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

  // Group kegiatan by type - HANYA TAMPILKAN YANG SUDAH DIUPLOAD
  const infrastruktur = useMemo(() => {
    return proposals
      .filter(p => p.kegiatan_list?.some(k => k.jenis_kegiatan === 'infrastruktur'))
      .map(proposal => ({
        proposal,
        kegiatan: proposal.kegiatan_list.find(k => k.jenis_kegiatan === 'infrastruktur')
      }));
  }, [proposals]);

  const nonInfrastruktur = useMemo(() => {
    return proposals
      .filter(p => p.kegiatan_list?.some(k => k.jenis_kegiatan === 'non_infrastruktur'))
      .map(proposal => ({
        proposal,
        kegiatan: proposal.kegiatan_list.find(k => k.jenis_kegiatan === 'non_infrastruktur')
      }));
  }, [proposals]);

  return (
    <div className="min-h-screen bg-gray-50 space-y-6 pb-8">
      {/* Submission Closed Warning Banner */}
      {!submissionOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-red-50 via-rose-50 to-red-50 border-b-2 border-red-200"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-center gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                <LuTriangleAlert className="w-5 h-5 text-red-600" />
              </div>
              <div className="text-center">
                <p className="text-red-800 font-semibold">
                  Laju Pengajuan ke DPMD Sedang Ditutup
                </p>
                <p className="text-red-600 text-sm">
                  DPMD sedang menutup laju pengajuan proposal untuk sementara waktu. Anda masih bisa melakukan review, tetapi tidak bisa mengirim ke DPMD.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
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
              
              {/* Tombol Final Action - hanya muncul jika semua sudah direview */}
              {reviewStatus.allReviewed && (
                <>
                  {/* Show if already submitted to DPMD */}
                  {reviewStatus.isSubmittedToDpmd ? (
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-bold shadow-lg cursor-default">
                      <LuCheck className="w-5 h-5" />
                      <span>Sudah Dikirim ke DPMD</span>
                      {reviewStatus.submittedToDpmdAt && (
                        <span className="text-xs opacity-80">
                          ({new Date(reviewStatus.submittedToDpmdAt).toLocaleDateString('id-ID')})
                        </span>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Show warning if documents are missing and action is submit */}
                      {!reviewStatus.hasRejected && (!reviewStatus.hasAllBeritaAcara || !reviewStatus.hasAllSuratPengantar) && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs">
                          <LuInfo className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <span className="text-amber-700">
                            {!reviewStatus.hasAllBeritaAcara && !reviewStatus.hasAllSuratPengantar 
                              ? `${reviewStatus.missingBeritaAcara} BA & ${reviewStatus.missingSuratPengantar} SP belum dibuat`
                              : !reviewStatus.hasAllBeritaAcara 
                                ? `${reviewStatus.missingBeritaAcara} Berita Acara belum dibuat`
                                : `${reviewStatus.missingSuratPengantar} Surat Pengantar belum dibuat`
                            }
                          </span>
                        </div>
                      )}
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
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full px-4 sm:px-6 lg:px-8 space-y-4">

      {/* Info Box: Cara Membuat Berita Acara dan Surat Pengantar */}
      {reviewStatus.allReviewed && !reviewStatus.hasRejected && (!reviewStatus.hasAllBeritaAcara || !reviewStatus.hasAllSuratPengantar) && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg flex-shrink-0">
              <LuInfo className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-indigo-800 mb-2">Langkah Selanjutnya Sebelum Kirim ke DPMD</h3>
              <div className="space-y-3 text-sm text-gray-700">
                {!reviewStatus.hasAllBeritaAcara && (
                  <div className="flex items-start gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-violet-200 text-violet-700 text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                    <div>
                      <p className="font-semibold text-violet-700">Buat Berita Acara ({reviewStatus.missingBeritaAcara} proposal)</p>
                      <p className="text-gray-600 text-xs mt-0.5">
                        Pada setiap proposal yang sudah disetujui, klik tombol <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded text-xs font-medium"><LuDownload className="w-3 h-3" />Buat BA</span>. 
                        Pastikan <strong>Tim Verifikasi</strong> sudah lengkap (isi data, kuesioner, dan upload TTD).
                      </p>
                    </div>
                  </div>
                )}
                {!reviewStatus.hasAllSuratPengantar && (
                  <div className="flex items-start gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-200 text-blue-700 text-xs font-bold flex-shrink-0 mt-0.5">{!reviewStatus.hasAllBeritaAcara ? '2' : '1'}</span>
                    <div>
                      <p className="font-semibold text-blue-700">Buat Surat Pengantar ({reviewStatus.missingSuratPengantar} proposal)</p>
                      <p className="text-gray-600 text-xs mt-0.5">
                        Pada setiap proposal yang sudah disetujui, klik tombol <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium"><LuFileText className="w-3 h-3" />Buat SP</span>. 
                        Anda akan diminta mengisi <strong>Nomor Surat</strong>.
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2 pt-2 border-t border-indigo-200">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-200 text-green-700 text-xs font-bold flex-shrink-0 mt-0.5">✓</span>
                  <div>
                    <p className="font-semibold text-green-700">Kirim ke DPMD</p>
                    <p className="text-gray-600 text-xs mt-0.5">
                      Setelah semua proposal memiliki <span className="text-violet-600 font-medium">Berita Acara</span> dan <span className="text-blue-600 font-medium">Surat Pengantar</span>, 
                      tombol <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium"><LuCheck className="w-3 h-3" />Kirim ke DPMD</span> akan aktif.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Surat Pengantar & Permohonan Section */}
      {surat && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl">
                <LuFileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Surat Pengantar & Permohonan</h3>
                <p className="text-sm text-gray-600">Desa {desa?.nama}</p>
              </div>
              {/* Status Badge */}
              <div className="ml-auto">
                {surat.kecamatan_status === 'approved' ? (
                  <span className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                    <LuCheck className="w-3.5 h-3.5" />
                    Disetujui
                  </span>
                ) : surat.kecamatan_status === 'rejected' ? (
                  <span className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                    <LuX className="w-3.5 h-3.5" />
                    Ditolak
                  </span>
                ) : (
                  <span className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-semibold flex items-center gap-1.5">
                    <LuClock className="w-3.5 h-3.5" />
                    Menunggu Review
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="p-4 space-y-4">
            {/* Surat Files */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Surat Pengantar */}
              {surat.surat_pengantar && (
                <button
                  onClick={() => {
                    setSelectedPdf({
                      kegiatanName: 'Surat Pengantar',
                      url: `${imageBaseUrl}/storage/uploads/bankeu/${surat.surat_pengantar}`,
                      status: surat.kecamatan_status || 'pending'
                    });
                    setShowPdfModal(true);
                  }}
                  className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all duration-200 group"
                >
                  <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <LuFileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-blue-800">Surat Pengantar</p>
                    <p className="text-xs text-blue-600">Klik untuk melihat dokumen</p>
                  </div>
                  <LuEye className="w-5 h-5 text-blue-500 group-hover:text-blue-700" />
                </button>
              )}
              
              {/* Surat Permohonan */}
              {surat.surat_permohonan && (
                <button
                  onClick={() => {
                    setSelectedPdf({
                      kegiatanName: 'Surat Permohonan',
                      url: `${imageBaseUrl}/storage/uploads/bankeu/${surat.surat_permohonan}`,
                      status: surat.kecamatan_status || 'pending'
                    });
                    setShowPdfModal(true);
                  }}
                  className="flex items-center gap-3 p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-all duration-200 group"
                >
                  <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                    <LuFileText className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-purple-800">Surat Permohonan</p>
                    <p className="text-xs text-purple-600">Klik untuk melihat dokumen</p>
                  </div>
                  <LuEye className="w-5 h-5 text-purple-500 group-hover:text-purple-700" />
                </button>
              )}
            </div>
            
            {/* Rejected Reason */}
            {surat.kecamatan_status === 'rejected' && surat.kecamatan_catatan && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-700 mb-1">Alasan Penolakan:</p>
                <p className="text-sm text-red-600">{surat.kecamatan_catatan}</p>
              </div>
            )}
            
            {/* Review Actions - Only show if pending */}
            {(!surat.kecamatan_status || surat.kecamatan_status === 'pending') && (
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
                <button
                  onClick={() => handleRejectSurat(surat.id)}
                  className="flex items-center gap-2 px-4 py-2.5 border-2 border-red-200 text-red-600 rounded-xl hover:bg-red-50 hover:border-red-300 font-semibold text-sm transition-all duration-200"
                >
                  <LuX className="w-4 h-4" />
                  Tolak Surat
                </button>
                <button
                  onClick={() => handleApproveSurat(surat.id)}
                  className="flex items-center gap-2 px-4 py-2.5 border-2 border-green-200 text-green-600 rounded-xl hover:bg-green-50 hover:border-green-300 font-semibold text-sm transition-all duration-200"
                >
                  <LuCheck className="w-4 h-4" />
                  Setujui Surat
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
                key={`infra-${item.proposal?.id || item.kegiatan.id}-${index}`}
                kegiatan={item.kegiatan}
                proposal={item.proposal}
                index={index}
                onVerify={handleVerify}
                onViewPdf={handleViewPdf}
                onGenerateBeritaAcara={handleGenerateBeritaAcaraKegiatan}
                onGenerateSuratPengantar={handleGenerateSuratPengantar}
                getStatusBadge={getStatusBadge}
                imageBaseUrl={imageBaseUrl}
                timCompletionStatus={timCompletionStatus}
                desaId={desaId}
                navigate={navigate}
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
                key={`non-infra-${item.proposal?.id || item.kegiatan.id}-${index}`}
                kegiatan={item.kegiatan}
                proposal={item.proposal}
                index={index}
                onVerify={handleVerify}
                onViewPdf={handleViewPdf}
                onGenerateBeritaAcara={handleGenerateBeritaAcaraKegiatan}
                onGenerateSuratPengantar={handleGenerateSuratPengantar}
                getStatusBadge={getStatusBadge}
                imageBaseUrl={imageBaseUrl}
                timCompletionStatus={timCompletionStatus}
                desaId={desaId}
                navigate={navigate}
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
const ProposalRow = ({ kegiatan, proposal, index, onVerify, onViewPdf, onGenerateBeritaAcara, onGenerateSuratPengantar, getStatusBadge, imageBaseUrl, timCompletionStatus, desaId, navigate }) => {
  // Get completion status untuk proposal ini
  const completionStatus = proposal ? timCompletionStatus[proposal.id] : null;
  const isTimComplete = completionStatus?.all_complete || false;
  
  return (
    <div className={`p-4 md:p-5 border-b border-gray-100 hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 ${index === 0 ? '' : ''}`}>
      {/* Header: Nama Kegiatan */}
      <div className="text-sm font-bold text-gray-900 mb-3">
        {kegiatan.nama_kegiatan}
      </div>
      
      {proposal ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Top Section: Status & Actions */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
            {/* Status Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                <LuCheck className="w-3.5 h-3.5" />
                Sudah Upload
              </span>
              {getStatusBadge(proposal.kecamatan_status || proposal.status)}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* View PDF Button */}
              {(() => {
                const kecamatanPrevRejected = proposal.kecamatan_catatan || 
                                               proposal.kecamatan_status === 'rejected' || 
                                               proposal.kecamatan_status === 'revision';
                const desaSudahUploadUlang = proposal.verified_at !== null;
                const showDualView = kecamatanPrevRejected && desaSudahUploadUlang && proposal.dinas_reviewed_file;
                
                return (
                  <>
                    {showDualView && (
                      <div className="flex items-center gap-1 px-2.5 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
                        <LuShield className="w-3.5 h-3.5 text-purple-600" />
                        <span className="text-xs font-semibold text-purple-700">Ref. Dinas</span>
                      </div>
                    )}
                    
                    <button
                      onClick={() => onViewPdf(proposal, kegiatan.nama_kegiatan)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
                        showDualView
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-md'
                          : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                      }`}
                      title={showDualView ? 'Lihat dan Bandingkan 2 File' : 'Lihat Proposal'}
                    >
                      <LuEye className="w-4 h-4" />
                      {showDualView ? 'Bandingkan' : 'Lihat'}
                    </button>
                  </>
                );
              })()}

              {/* Tim Verifikasi Button */}
              <button
                onClick={() => navigate(`/kecamatan/bankeu/tim-verifikasi/${desaId}?proposalId=${proposal.id}`)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg transition-all duration-150 shadow-sm text-xs font-semibold"
                title="Isi Quisioner Tim Verifikasi"
              >
                <LuClipboardList className="w-4 h-4" />
                <span>Tim Verifikasi</span>
              </button>

              {/* Surat Pengantar Button */}
              {proposal.kecamatan_status === 'approved' && (
                proposal.surat_pengantar ? (
                  // Surat Pengantar sudah ada - tampilkan tombol download
                  <button
                    onClick={() => window.open(`${imageBaseUrl}/storage${proposal.surat_pengantar}`, '_blank')}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg transition-all duration-150 shadow-sm text-xs font-semibold"
                    title="Lihat Surat Pengantar"
                  >
                    <LuCheck className="w-4 h-4" />
                    <span>SP ✓</span>
                  </button>
                ) : (
                  // Surat Pengantar belum ada - tampilkan tombol generate
                  <button
                    onClick={() => onGenerateSuratPengantar(proposal.id, proposal.judul_proposal || kegiatan.nama_kegiatan)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg transition-all duration-150 shadow-sm text-xs font-semibold animate-pulse"
                    title="Generate Surat Pengantar (Wajib sebelum kirim ke DPMD)"
                  >
                    <LuFileText className="w-4 h-4" />
                    <span>Buat SP</span>
                  </button>
                )
              )}

              {/* Approve/Reject Buttons */}
              {proposal.kecamatan_status !== 'approved' && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onVerify(proposal.id, "verified")}
                    className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-150 shadow-sm text-xs font-semibold"
                    title="Setujui"
                  >
                    <LuCheck className="w-4 h-4" />
                    <span className="hidden sm:inline">Setujui</span>
                  </button>

                  <button
                    onClick={() => onVerify(proposal.id, "revision")}
                    className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-150 shadow-sm text-xs font-semibold"
                    title="Revisi"
                  >
                    <LuX className="w-4 h-4" />
                    <span className="hidden sm:inline">Revisi</span>
                  </button>
                </div>
              )}
              
              {/* Berita Acara Button */}
              {proposal.kecamatan_status === 'approved' && (
                proposal.berita_acara_path ? (
                  // Berita Acara sudah ada - tampilkan tombol download
                  <button
                    onClick={() => window.open(`${imageBaseUrl}${proposal.berita_acara_path}`, '_blank')}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg transition-all duration-150 shadow-sm text-xs font-semibold"
                    title="Lihat Berita Acara"
                  >
                    <LuCheck className="w-4 h-4" />
                    <span>BA ✓</span>
                  </button>
                ) : (
                  // Berita Acara belum ada - tampilkan tombol generate dengan validasi tim
                  <div className="relative group">
                    <button
                      onClick={() => {
                        if (isTimComplete) {
                          onGenerateBeritaAcara(proposal.kegiatan_id, proposal.judul_proposal || kegiatan.nama_kegiatan, proposal.id);
                        }
                      }}
                      disabled={!isTimComplete}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg transition-all duration-150 shadow-sm text-xs font-semibold ${
                        isTimComplete
                          ? 'bg-gradient-to-r from-violet-500 to-purple-500 text-white hover:from-violet-600 hover:to-purple-600 cursor-pointer animate-pulse'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                      title={isTimComplete ? 'Generate Berita Acara (Wajib sebelum kirim ke DPMD)' : 'Lengkapi Tim Verifikasi terlebih dahulu'}
                    >
                      {isTimComplete ? (
                        <>
                          <LuDownload className="w-4 h-4" />
                          <span>Buat BA</span>
                        </>
                      ) : (
                        <>
                          <LuClock className="w-4 h-4" />
                          <span>Buat BA</span>
                        </>
                      )}
                    </button>
                    
                    {/* Tooltip */}
                    {!isTimComplete && completionStatus && (
                      <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block z-10 w-72">
                        <div className="bg-gray-900 text-white text-xs rounded-lg p-3 shadow-xl">
                          <p className="font-bold mb-2">Tim Verifikasi Belum Lengkap ({completionStatus.complete_members || 0}/{completionStatus.total_members || 0}):</p>
                          {completionStatus.tim_status?.length > 0 ? (
                            completionStatus.tim_status.map((tim, idx) => (
                              <div key={idx} className={`flex items-center gap-2 py-1 ${!tim.is_complete ? 'text-yellow-300' : 'text-green-300'}`}>
                                {tim.is_complete ? <LuCheck className="w-3 h-3" /> : <LuX className="w-3 h-3" />}
                                <span className="capitalize">{tim.posisi?.replace(/_/g, ' ')}</span>
                                {!tim.has_data && <span className="text-xs opacity-75">(belum isi data)</span>}
                                {tim.has_data && !tim.has_questionnaire && <span className="text-xs opacity-75">(belum isi quisioner)</span>}
                                {tim.has_data && tim.has_questionnaire && !tim.has_ttd && <span className="text-xs opacity-75">(belum upload TTD)</span>}
                              </div>
                            ))
                          ) : (
                            <p className="text-yellow-300">Belum ada anggota tim yang terdaftar untuk proposal ini</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
          
          {/* Content Section: Proposal Details */}
          <div className="p-4 space-y-3">
            {/* Judul Proposal */}
            <h4 className="text-base font-bold text-gray-900">
              {proposal.judul_proposal}
            </h4>

            {/* Kegiatan Tags (many-to-many) */}
            {proposal.kegiatan_list && proposal.kegiatan_list.length > 1 && (
              <div className="flex flex-wrap gap-1.5">
                {proposal.kegiatan_list.map((k) => (
                  <span 
                    key={k.id}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium ${
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
            
            {/* Nama kegiatan spesifik */}
            {proposal.nama_kegiatan_spesifik && (
              <p className="text-sm text-gray-600 italic">
                {proposal.nama_kegiatan_spesifik}
              </p>
            )}

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {proposal.volume && (
                <div className="flex items-center gap-2 p-2.5 bg-blue-50 rounded-lg">
                  <LuPackage className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Volume</p>
                    <p className="text-sm font-semibold text-blue-900">{proposal.volume}</p>
                  </div>
                </div>
              )}
              {proposal.lokasi && (
                <div className="flex items-center gap-2 p-2.5 bg-red-50 rounded-lg">
                  <LuMapPin className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-red-600 font-medium">Lokasi</p>
                    <p className="text-sm font-semibold text-red-900">{proposal.lokasi}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 p-2.5 bg-green-50 rounded-lg">
                <LuDollarSign className="w-4 h-4 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-xs text-green-600 font-medium">Anggaran</p>
                  <p className="text-sm font-semibold text-green-900">
                    {new Intl.NumberFormat("id-ID", {
                      style: "currency",
                      currency: "IDR",
                      minimumFractionDigits: 0
                    }).format(proposal.anggaran_usulan)}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Catatan Section */}
            {(proposal.dinas_catatan || proposal.kecamatan_catatan || proposal.catatan_verifikasi) && (
              <div className="space-y-2 pt-2">
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
                        <p className="text-blue-700 text-sm leading-relaxed">{proposal.dinas_catatan}</p>
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
                  <div className="p-3 bg-purple-50 border-l-4 border-purple-400 rounded-r-lg">
                    <p className="font-semibold text-purple-800 text-xs mb-1">Catatan Kecamatan</p>
                    <p className="text-purple-700 text-sm">{proposal.kecamatan_catatan}</p>
                  </div>
                )}
                
                {proposal.catatan_verifikasi && (
                  <div className="p-3 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg">
                    <p className="font-semibold text-amber-800 text-xs mb-1">Catatan Verifikasi</p>
                    <p className="text-amber-700 text-sm">{proposal.catatan_verifikasi}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-4 bg-red-50 rounded-lg border border-red-200">
          <LuX className="w-5 h-5 text-red-500" />
          <span className="text-sm font-medium text-red-700">Belum ada proposal yang diupload untuk kegiatan ini</span>
        </div>
      )}
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