import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../../api';
import Swal from 'sweetalert2';
import {
  LuEye, LuCheck, LuX, LuRefreshCw, LuSend, LuInfo,
  LuClipboardCheck, LuChevronDown, LuChevronRight,
  LuFilter, LuSearch, LuPackage, LuMapPin, LuDollarSign,
  LuFileText, LuStamp, LuTriangleAlert, LuUsers, LuClipboardList, LuPencilLine
} from 'react-icons/lu';
import PdfAnnotationEditor from '../../../components/shared/PdfAnnotationEditor';

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const STATUS_LABELS = {
  pending: 'Pending', in_review: 'Review',
  approved: 'Disetujui', rejected: 'Ditolak', revision: 'Revisi'
};
const STATUS_STYLES = {
  pending:   'bg-amber-100 text-amber-700 border-amber-300',
  in_review: 'bg-blue-100 text-blue-700 border-blue-300',
  approved:  'bg-emerald-100 text-emerald-700 border-emerald-300',
  rejected:  'bg-red-100 text-red-700 border-red-300',
  revision:  'bg-orange-100 text-orange-700 border-orange-300',
};

const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${STATUS_STYLES[status] || 'bg-gray-100 text-gray-700 border-gray-300'}`}>
    {STATUS_LABELS[status] || status}
  </span>
);

const KATEGORI_META = {
  wajib: {
    label: 'Wajib',
    sublabel: 'Kegiatan WAJIB',
    gradFrom: 'from-red-500', gradTo: 'to-rose-600',
    headerBg: 'from-red-50 via-rose-50 to-red-50',
    headerHover: 'hover:from-red-100 hover:via-rose-100 hover:to-red-100',
    badge: 'bg-red-100 text-red-700 border-red-300',
  },
  pilihan_infrastruktur: {
    label: 'Pilihan Infrastruktur',
    sublabel: 'Kegiatan fisik/bangunan',
    gradFrom: 'from-orange-500', gradTo: 'to-amber-600',
    headerBg: 'from-orange-50 via-amber-50 to-orange-50',
    headerHover: 'hover:from-orange-100 hover:via-amber-100 hover:to-orange-100',
    badge: 'bg-orange-100 text-orange-700 border-orange-300',
  },
  pilihan_non_infrastruktur: {
    label: 'Pilihan Non-Infrastruktur',
    sublabel: 'Program/pemberdayaan',
    gradFrom: 'from-blue-500', gradTo: 'to-indigo-600',
    headerBg: 'from-blue-50 via-indigo-50 to-blue-50',
    headerHover: 'hover:from-blue-100 hover:via-indigo-100 hover:to-blue-100',
    badge: 'bg-blue-100 text-blue-700 border-blue-300',
  },
};
const KATEGORI_KEYS = Object.keys(KATEGORI_META);

const BankeuPerubahanVerificationPage = ({ tahun }) => {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [stats, setStats] = useState({});
  const [kecamatanConfig, setKecamatanConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedDesa, setExpandedDesa] = useState({});
  const [expandedKategori, setExpandedKategori] = useState({});
  const [verifyModal, setVerifyModal] = useState(null);

  // Anotasi PDF (revisi visual)
  const [annotateModal, setAnnotateModal] = useState(null); // { proposal, fileUrl, initialAnnotation }
  const [annotateCatatan, setAnnotateCatatan] = useState('');
  const [annotateSubmitting, setAnnotateSubmitting] = useState(false);
  const annotationGetRef = useRef(null);

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterKategori, setFilterKategori] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const kecamatanId = user?.kecamatan_id;

      const requests = [
        api.get('/kecamatan/bankeu-perubahan/proposals', { params: { tahun } }),
        api.get('/kecamatan/bankeu-perubahan/statistics', { params: { tahun } }),
      ];
      if (kecamatanId) {
        requests.push(api.get(`/kecamatan/bankeu-perubahan/config/${kecamatanId}`).catch(() => ({ data: { data: null } })));
      }

      const [proposalsRes, statsRes, configRes] = await Promise.all(requests);
      setProposals(proposalsRes.data?.data || []);
      setStats(statsRes.data?.data || {});
      if (configRes) setKecamatanConfig(configRes.data?.data || null);
    } catch (err) {
      console.error('Error fetch:', err);
      Swal.fire('Gagal', 'Tidak dapat mengambil data proposal perubahan', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [tahun]);

  const isKecamatanConfigComplete = () => {
    if (!kecamatanConfig) return false;
    return !!(kecamatanConfig.nama_camat && kecamatanConfig.ttd_camat_path && kecamatanConfig.stempel_path && kecamatanConfig.alamat);
  };

  const getConfigMissingItems = () => {
    const missing = [];
    if (!kecamatanConfig) {
      return ['Konfigurasi Kecamatan belum dibuat (buka menu Tim Verifikasi → Konfigurasi)'];
    }
    if (!kecamatanConfig.nama_camat) missing.push('Nama Camat');
    if (!kecamatanConfig.ttd_camat_path) missing.push('Tanda Tangan Camat');
    if (!kecamatanConfig.stempel_path) missing.push('Stempel Kecamatan');
    if (!kecamatanConfig.alamat) missing.push('Alamat Kecamatan');
    return missing;
  };

  // Filter proposals
  const filteredProposals = useMemo(() => {
    return proposals.filter(p => {
      if (filterStatus !== 'all') {
        if (filterStatus === 'pending' && p.kecamatan_status && p.kecamatan_status !== 'pending') return false;
        if (filterStatus !== 'pending' && p.kecamatan_status !== filterStatus) return false;
      }
      if (filterKategori !== 'all' && p.jenis_kegiatan !== filterKategori) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inJudul = p.judul_proposal?.toLowerCase().includes(q);
        const inDesa = p.desa_nama?.toLowerCase().includes(q);
        const inKegiatan = (p.kegiatan_list || []).some(k => k.nama_kegiatan?.toLowerCase().includes(q));
        if (!inJudul && !inDesa && !inKegiatan) return false;
      }
      return true;
    });
  }, [proposals, filterStatus, filterKategori, searchQuery]);

  // Group by desa, then by kategori
  const groupedByDesa = useMemo(() => {
    const groups = {};
    filteredProposals.forEach(p => {
      const key = p.desa_id;
      if (!groups[key]) {
        groups[key] = {
          desa_id: p.desa_id,
          desa_nama: p.desa_nama,
          items: [],
          byKategori: { wajib: [], pilihan_infrastruktur: [], pilihan_non_infrastruktur: [] },
        };
      }
      groups[key].items.push(p);
      if (groups[key].byKategori[p.jenis_kegiatan]) {
        groups[key].byKategori[p.jenis_kegiatan].push(p);
      }
    });
    return Object.values(groups);
  }, [filteredProposals]);

  const getApprovalMissingItems = (proposal) => {
    const missing = [];
    if (!proposal.berita_acara_path) missing.push('Berita Acara Verifikasi Kecamatan');
    if (!proposal.surat_pengantar_kecamatan_path) missing.push('Surat Pengantar Kecamatan');
    return missing;
  };

  const showApprovalMissingAlert = (proposal) => {
    const missing = getApprovalMissingItems(proposal);
    return Swal.fire({
      icon: 'warning',
      title: 'Dokumen Belum Lengkap',
      html: `
        <div class="text-left">
          <p class="text-gray-700 mb-2">
            Proposal belum dapat disetujui. Buat dokumen berikut terlebih dahulu:
          </p>
          <ul class="list-disc pl-5 text-sm text-gray-700 bg-amber-50 p-3 rounded-lg space-y-1">
            ${missing.map(item => `<li>${item}</li>`).join('')}
          </ul>
          <p class="text-xs text-gray-500 mt-3">
            Flow ini mengikuti Bankeu Reguler: BA dan Surat Pengantar Kecamatan harus tersedia sebelum persetujuan dilanjutkan.
          </p>
        </div>
      `,
      confirmButtonText: 'Mengerti',
    });
  };

  const openVerify = (proposal, status) => {
    if (status === 'approved' && getApprovalMissingItems(proposal).length > 0) {
      showApprovalMissingAlert(proposal);
      return;
    }
    setVerifyModal({ proposal, status, catatan: '' });
  };

  const submitVerify = async () => {
    if (!verifyModal) return;
    const { proposal, status, catatan } = verifyModal;
    if ((status === 'rejected' || status === 'revision') && !catatan.trim()) {
      return Swal.fire('Validasi', 'Catatan wajib diisi untuk tolak/revisi', 'warning');
    }
    if (status === 'approved' && getApprovalMissingItems(proposal).length > 0) {
      return showApprovalMissingAlert(proposal);
    }
    try {
      await api.patch(`/kecamatan/bankeu-perubahan/proposals/${proposal.id}/verify`, {
        status, catatan
      });
      Swal.fire('Berhasil', 'Verifikasi tersimpan', 'success');
      setVerifyModal(null);
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal verifikasi', 'error');
    }
  };

  // Buka editor anotasi untuk minta revisi (revisi visual di atas PDF)
  const openAnnotate = async (proposal) => {
    annotationGetRef.current = null;
    setAnnotateCatatan(proposal.kecamatan_catatan || '');
    let initialAnnotation = null;
    try {
      const res = await api.get(`/kecamatan/bankeu-perubahan/proposals/${proposal.id}/annotation`);
      initialAnnotation = res.data?.data?.annotation || null;
    } catch { /* abaikan, mulai dari kosong */ }
    setAnnotateModal({
      proposal,
      fileUrl: `${imageBaseUrl}/storage/uploads/bankeu-perubahan/${proposal.file_proposal}`,
      initialAnnotation,
    });
  };

  const saveAnnotationDraft = async (data) => {
    if (!annotateModal) return;
    try {
      await api.put(`/kecamatan/bankeu-perubahan/proposals/${annotateModal.proposal.id}/annotation`, {
        annotation_data: data,
      });
      Swal.fire({ icon: 'success', title: 'Draft tersimpan', timer: 1200, showConfirmButton: false });
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal menyimpan draft', 'error');
    }
  };

  const submitAnnotateRevision = async () => {
    if (!annotateModal) return;
    const annotation_data = annotationGetRef.current ? annotationGetRef.current() : null;
    // Catatan revisi tidak wajib jika sudah ada anotasi (teks/gambar/catatan halaman) di PDF.
    const hasAnnotation = !!(annotation_data?.pages?.length);
    if (!annotateCatatan.trim() && !hasAnnotation) {
      return Swal.fire('Validasi', 'Beri anotasi pada PDF atau isi catatan revisi (minimal salah satu)', 'warning');
    }
    setAnnotateSubmitting(true);
    try {
      await api.patch(`/kecamatan/bankeu-perubahan/proposals/${annotateModal.proposal.id}/verify`, {
        status: 'revision',
        catatan: annotateCatatan,
        annotation_data,
      });
      Swal.fire('Berhasil', 'Revisi beranotasi terkirim ke Desa', 'success');
      setAnnotateModal(null);
      setAnnotateCatatan('');
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal mengirim revisi', 'error');
    } finally {
      setAnnotateSubmitting(false);
    }
  };

  const cancelApproval = async (proposalId) => {
    const result = await Swal.fire({
      title: 'Batalkan persetujuan?',
      text: 'Status proposal akan kembali ke pending',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, batalkan',
      cancelButtonText: 'Tidak',
    });
    if (!result.isConfirmed) return;
    try {
      await api.patch(`/kecamatan/bankeu-perubahan/proposals/${proposalId}/cancel-approval`);
      Swal.fire('Berhasil', 'Persetujuan dibatalkan', 'success');
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal membatalkan', 'error');
    }
  };

  const showConfigMissingAlert = (action) => {
    const missing = getConfigMissingItems();
    return Swal.fire({
      icon: 'warning',
      title: 'Konfigurasi Belum Lengkap',
      html: `
        <div class="text-left">
          <p class="text-gray-700 mb-2">Lengkapi item berikut di menu <strong>Tim Verifikasi → Konfigurasi Kecamatan</strong> sebelum ${action}:</p>
          <ul class="bg-amber-50 rounded-lg p-3 text-sm text-amber-800 list-disc list-inside">
            ${missing.map(i => `<li>${i}</li>`).join('')}
          </ul>
        </div>
      `,
      confirmButtonText: 'Mengerti',
    });
  };

  // Validate tim & quisioner kelengkapan sebelum generate BA
  const validateTimAndQuisioner = async (proposal) => {
    try {
      const res = await api.get(`/bankeu-perubahan/berita-acara/validate/${proposal.desa_id}/${proposal.id}`);
      const data = res.data?.data;
      if (data?.valid) return { ok: true };

      // Compose missing items message from response
      const reasons = [];
      if (data?.missing_tim_members?.length) {
        reasons.push(`Anggota tim belum lengkap: ${data.missing_tim_members.join(', ')}`);
      }
      if (data?.missing_signatures?.length) {
        reasons.push(`TTD belum dibuat untuk: ${data.missing_signatures.join(', ')}`);
      }
      if (data?.missing_quisioner?.length) {
        reasons.push(`Quisioner belum diisi oleh: ${data.missing_quisioner.join(', ')}`);
      }
      if (reasons.length === 0 && data?.message) {
        reasons.push(data.message);
      }
      return { ok: false, reasons };
    } catch (err) {
      // If endpoint not yet implemented, allow generation but warn
      if (err.response?.status === 404) {
        console.warn('Validate endpoint not available, skipping client-side check');
        return { ok: true };
      }
      console.error('Validate error:', err);
      return { ok: false, reasons: [err.response?.data?.message || 'Gagal memvalidasi tim'] };
    }
  };

  // Generate Berita Acara per proposal
  const handleGenerateBeritaAcara = async (proposal) => {
    if (!isKecamatanConfigComplete()) {
      return showConfigMissingAlert('membuat Berita Acara');
    }
    const kegiatanId = proposal.kegiatan_list?.[0]?.id || proposal.kegiatan_id;
    if (!kegiatanId) {
      return Swal.fire('Gagal', 'Proposal tidak terkait dengan kegiatan apapun', 'error');
    }

    // Validasi tim & quisioner
    const validation = await validateTimAndQuisioner(proposal);
    if (!validation.ok) {
      return Swal.fire({
        icon: 'warning',
        title: 'Belum Siap Generate Berita Acara',
        html: `
          <div class="text-left">
            <p class="mb-2 text-gray-700">Lengkapi item berikut terlebih dahulu:</p>
            <ul class="list-disc pl-5 text-sm text-gray-700 bg-amber-50 p-3 rounded-lg space-y-1">
              ${validation.reasons.map(r => `<li>${r}</li>`).join('')}
            </ul>
            <p class="text-xs text-gray-500 mt-3">
              Tim Verifikasi & TTD diatur di menu <strong>Tim Verifikasi</strong>.
              Quisioner diisi via tombol <strong>Quisioner</strong> pada proposal ini.
            </p>
          </div>
        `,
        confirmButtonText: 'Mengerti',
      });
    }

    const result = await Swal.fire({
      title: proposal.berita_acara_path ? 'Regenerate Berita Acara?' : 'Generate Berita Acara?',
      html: `
        <div class="text-left">
          <p class="text-sm text-gray-600 mb-2">Desa <strong>${proposal.desa_nama}</strong></p>
          <p class="text-sm text-gray-600 mb-2">Proposal: <strong>${proposal.judul_proposal}</strong></p>
          <div class="mt-3">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Tanggal Berita Acara</label>
            <input type="date" id="swal-tanggal-ba" value="${new Date().toISOString().split('T')[0]}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: proposal.berita_acara_path ? 'Regenerate' : 'Generate',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#ea580c',
      preConfirm: () => {
        const tanggal = document.getElementById('swal-tanggal-ba')?.value || null;
        return { tanggal };
      },
    });
    if (!result.isConfirmed) return;

    try {
      Swal.fire({ title: 'Generating...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const response = await api.post(`/kecamatan/bankeu-perubahan/desa/${proposal.desa_id}/berita-acara`, {
        proposalId: proposal.id,
        kegiatanId,
        tanggal: result.value.tanggal,
      });
      await fetchData();
      const filePath = response.data?.data?.file_path;
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        html: `Berita Acara berhasil dibuat${filePath ? `<br/><a href="${imageBaseUrl}${filePath}" target="_blank" class="inline-block mt-3 px-4 py-2 bg-orange-600 text-white rounded-lg">Lihat Berita Acara</a>` : ''}`,
        showConfirmButton: !filePath,
      });
    } catch (err) {
      console.error('BA error:', err);
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal membuat Berita Acara', 'error');
    }
  };

  // Generate Surat Pengantar per proposal
  const handleGenerateSuratPengantar = async (proposal) => {
    if (!isKecamatanConfigComplete()) {
      return showConfigMissingAlert('membuat Surat Pengantar');
    }

    const result = await Swal.fire({
      title: proposal.surat_pengantar_kecamatan_path ? 'Regenerate Surat Pengantar?' : 'Generate Surat Pengantar?',
      html: `
        <div class="text-left">
          <p class="text-sm text-gray-600 mb-2">Desa <strong>${proposal.desa_nama}</strong></p>
          <p class="text-sm text-gray-600 mb-3">Proposal: <strong>${proposal.judul_proposal}</strong></p>
          <div class="mb-3">
            <label class="block text-sm font-semibold text-gray-700 mb-1">Nomor Surat <span class="text-red-500">*</span></label>
            <input type="text" id="swal-nomor-surat"
              placeholder="Contoh: 005/123/Kec.X/2026"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Tanggal Surat</label>
            <input type="date" id="swal-tanggal-sp" value="${new Date().toISOString().split('T')[0]}"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: proposal.surat_pengantar_kecamatan_path ? 'Regenerate' : 'Generate',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#2563eb',
      preConfirm: () => {
        const nomorSurat = document.getElementById('swal-nomor-surat')?.value?.trim();
        const tanggal = document.getElementById('swal-tanggal-sp')?.value || null;
        if (!nomorSurat) {
          Swal.showValidationMessage('Nomor Surat wajib diisi');
          return false;
        }
        return { nomor_surat: nomorSurat, tanggal };
      },
    });
    if (!result.isConfirmed) return;

    try {
      Swal.fire({ title: 'Generating...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
      const response = await api.post(
        `/kecamatan/bankeu-perubahan/proposals/${proposal.id}/surat-pengantar`,
        result.value
      );
      await fetchData();
      const pdfPath = response.data?.data?.pdf_path;
      Swal.fire({
        icon: 'success',
        title: 'Berhasil!',
        html: `Surat Pengantar berhasil dibuat${pdfPath ? `<br/><a href="${imageBaseUrl}${pdfPath}" target="_blank" class="inline-block mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg">Lihat Surat Pengantar</a>` : ''}`,
        showConfirmButton: !pdfPath,
      });
    } catch (err) {
      console.error('SP error:', err);
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal membuat Surat Pengantar', 'error');
    }
  };

  const submitToDpmd = async (desaId, desaNama) => {
    const desaProposals = proposals.filter(p =>
      p.desa_id === desaId &&
      p.kecamatan_status === 'approved' &&
      !p.submitted_to_dpmd
    );
    if (desaProposals.length === 0) {
      return Swal.fire('Info', 'Tidak ada proposal yang siap dikirim ke DPMD', 'info');
    }

    // Prerequisite: semua proposal approved harus punya Quisioner + BA + Surat Pengantar
    const missingDocs = desaProposals.filter(p =>
      !p.quisioner_completed || !p.berita_acara_path || !p.surat_pengantar_kecamatan_path
    );
    if (missingDocs.length > 0) {
      return Swal.fire({
        icon: 'warning',
        title: 'Dokumen Belum Lengkap',
        html: `
          <div class="text-left">
            <p class="text-gray-700 mb-2">
              ${missingDocs.length} proposal belum lengkap dokumennya.
              Setiap proposal yang dikirim ke DPMD wajib memiliki:
            </p>
            <ul class="list-disc list-inside text-sm text-gray-700 bg-amber-50 p-3 rounded-lg">
              <li>Quisioner Verifikasi (oleh Tim Kecamatan)</li>
              <li>Berita Acara Verifikasi Kecamatan</li>
              <li>Surat Pengantar Kecamatan</li>
            </ul>
            <p class="text-xs text-gray-500 mt-3">Lengkapi dokumen tersebut dengan tombol Quisioner & Generate pada masing-masing proposal.</p>
          </div>
        `,
        confirmButtonText: 'Mengerti',
      });
    }

    const result = await Swal.fire({
      title: `Kirim ${desaProposals.length} proposal ke DPMD?`,
      text: `Dari Desa: ${desaNama}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#7c3aed',
      confirmButtonText: 'Ya, kirim',
      cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;
    try {
      await api.post(`/kecamatan/bankeu-perubahan/desa/${desaId}/submit-to-dpmd`, { tahun });
      Swal.fire('Berhasil', 'Proposal terkirim ke DPMD', 'success');
      fetchData();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal mengirim', 'error');
    }
  };

  const toggleDesa = (desaId) => setExpandedDesa(e => ({ ...e, [desaId]: !e[desaId] }));
  const toggleKategori = (desaId, kat) => {
    const key = `${desaId}-${kat}`;
    setExpandedKategori(e => ({ ...e, [key]: e[key] === undefined ? false : !e[key] }));
  };
  const isDesaExpanded = (desaId) => expandedDesa[desaId] === true;
  const isKategoriExpanded = (desaId, kat) => expandedKategori[`${desaId}-${kat}`] !== false;

  // Per-desa kirim-ke-DPMD status (Quisioner + BA + Surat Pengantar lengkap)
  const getDesaReadiness = (group) => {
    const approved = group.items.filter(p => p.kecamatan_status === 'approved' && !p.submitted_to_dpmd);
    const readyCount = approved.filter(p =>
      p.quisioner_completed && p.berita_acara_path && p.surat_pengantar_kecamatan_path
    ).length;
    return { approvedCount: approved.length, readyCount, allReady: approved.length > 0 && readyCount === approved.length };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 p-4 md:p-6">
      <div className="w-full space-y-5">
        {/* Header & Stats */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <LuClipboardCheck className="w-5 h-5 text-orange-600" />
              Verifikasi Bankeu Perubahan TA {tahun}
            </h2>
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg"
            >
              <LuRefreshCw className="w-4 h-4" /> Refresh
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <StatCard label="Total" value={stats.total || 0} color="bg-gray-50 text-gray-700" />
            <StatCard label="Pending" value={stats.pending || 0} color="bg-amber-50 text-amber-700" />
            <StatCard label="Approved" value={stats.approved || 0} color="bg-emerald-50 text-emerald-700" />
            <StatCard label="Rejected" value={stats.rejected || 0} color="bg-red-50 text-red-700" />
            <StatCard label="Revision" value={stats.revision || 0} color="bg-orange-50 text-orange-700" />
            <StatCard label="Ke DPMD" value={stats.submitted_to_dpmd || 0} color="bg-purple-50 text-purple-700" />
          </div>

          {/* Config completeness warning */}
          {!isKecamatanConfigComplete() && (
            <div className="mt-4 bg-amber-50 border border-amber-300 rounded-xl p-3 flex items-start gap-3">
              <LuTriangleAlert className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 text-sm">
                <p className="font-semibold text-amber-800">Konfigurasi Kecamatan belum lengkap</p>
                <p className="text-amber-700 mt-0.5">
                  Generate Berita Acara & Surat Pengantar memerlukan: {getConfigMissingItems().join(', ')}.
                  Lengkapi di menu <strong>Tim Verifikasi → Konfigurasi Kecamatan</strong>.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <LuFilter className="w-4 h-4" /> Filter:
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="revision">Revision</option>
          </select>
          <select
            value={filterKategori}
            onChange={e => setFilterKategori(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="all">Semua Kategori</option>
            {KATEGORI_KEYS.map(k => (
              <option key={k} value={k}>{KATEGORI_META[k].label}</option>
            ))}
          </select>
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari judul / desa / kegiatan..."
              className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <span className="ml-auto text-xs text-gray-500">
            {filteredProposals.length} dari {proposals.length} proposal
          </span>
        </div>

        {/* List grouped by Desa */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
            Memuat data...
          </div>
        ) : groupedByDesa.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <LuInfo className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600 font-medium">
              {proposals.length === 0
                ? 'Belum ada proposal perubahan dari desa'
                : 'Tidak ada proposal yang sesuai filter'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedByDesa.map(group => {
              const desaExpanded = isDesaExpanded(group.desa_id);
              const { approvedCount, readyCount, allReady } = getDesaReadiness(group);
              const totalAnggaran = group.items.reduce((s, p) => s + (Number(p.anggaran_usulan) || 0), 0);
              return (
                <div key={group.desa_id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => toggleDesa(group.desa_id)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {desaExpanded ? <LuChevronDown className="w-5 h-5 text-gray-400" /> : <LuChevronRight className="w-5 h-5 text-gray-400" />}
                      <div className="text-left">
                        <div className="font-bold text-gray-800">Desa {group.desa_nama}</div>
                        <div className="text-xs text-gray-500">
                          {group.items.length} proposal · Rp {totalAnggaran.toLocaleString('id-ID')}
                        </div>
                      </div>
                    </div>
                    {approvedCount > 0 && (
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${
                          allReady ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          Dokumen: {readyCount}/{approvedCount}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); submitToDpmd(group.desa_id, group.desa_nama); }}
                          disabled={!allReady}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors ${
                            allReady ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-400 cursor-not-allowed'
                          }`}
                          title={allReady ? '' : 'Lengkapi BA + Surat Pengantar untuk semua proposal yang sudah approved'}
                        >
                          <LuSend className="w-3.5 h-3.5" /> Kirim {approvedCount} ke DPMD
                        </button>
                      </div>
                    )}
                  </button>

                  {desaExpanded && (
                    <div className="border-t border-gray-100 p-3 space-y-3 bg-gray-50">
                      {KATEGORI_KEYS.map(kat => {
                        const items = group.byKategori[kat];
                        if (items.length === 0) return null;
                        const meta = KATEGORI_META[kat];
                        const katExpanded = isKategoriExpanded(group.desa_id, kat);
                        return (
                          <div key={kat} className="bg-white rounded-xl overflow-hidden border border-gray-200">
                            <button
                              onClick={() => toggleKategori(group.desa_id, kat)}
                              className={`w-full px-4 py-3 flex items-center justify-between bg-gradient-to-r ${meta.headerBg} ${meta.headerHover} transition-colors`}
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 bg-gradient-to-br ${meta.gradFrom} ${meta.gradTo} rounded-lg flex items-center justify-center shadow-sm`}>
                                  {katExpanded
                                    ? <LuChevronDown className="w-4 h-4 text-white" />
                                    : <LuChevronRight className="w-4 h-4 text-white" />}
                                </div>
                                <div className="text-left">
                                  <div className="font-bold text-gray-800 text-sm">{meta.label}</div>
                                  <div className="text-xs text-gray-600">{items.length} proposal · {meta.sublabel}</div>
                                </div>
                              </div>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded border ${meta.badge}`}>
                                {items.length}
                              </span>
                            </button>
                            {katExpanded && (
                              <div className="divide-y divide-gray-100">
                                {items.map(p => (
                                  <ProposalRow
                                    key={p.id}
                                    proposal={p}
                                    onApprove={() => openVerify(p, 'approved')}
                                    onReject={() => openVerify(p, 'rejected')}
                                    onRevision={() => openAnnotate(p)}
                                    onCancel={() => cancelApproval(p.id)}
                                    onGenerateBA={() => handleGenerateBeritaAcara(p)}
                                    onGenerateSP={() => handleGenerateSuratPengantar(p)}
                                    onTim={() => navigate(`/kecamatan/bankeu-perubahan/tim-verifikasi/${p.desa_id}?proposalId=${p.id}&tahun=${tahun}`)}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Verify modal */}
      {verifyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">
                {verifyModal.status === 'approved' ? 'Setujui' : verifyModal.status === 'revision' ? 'Minta Revisi' : 'Tolak'} Proposal
              </h3>
              <p className="text-xs text-gray-500 mt-1">{verifyModal.proposal.judul_proposal}</p>
            </div>
            <div className="px-6 py-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Catatan {verifyModal.status !== 'approved' && '*'}
              </label>
              <textarea
                value={verifyModal.catatan}
                onChange={e => setVerifyModal({ ...verifyModal, catatan: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder={verifyModal.status === 'approved' ? 'Catatan (opsional)' : 'Tulis catatan untuk desa...'}
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
              <button
                onClick={() => setVerifyModal(null)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-100"
              >Batal</button>
              <button
                onClick={submitVerify}
                className={`px-4 py-2 text-white font-semibold rounded-xl shadow-sm ${
                  verifyModal.status === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' :
                  verifyModal.status === 'revision' ? 'bg-orange-600 hover:bg-orange-700' :
                  'bg-red-600 hover:bg-red-700'
                }`}
              >Simpan Verifikasi</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Anotasi PDF (revisi visual) */}
      {annotateModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex flex-col">
          <div className="bg-white flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
                <LuPencilLine className="w-4 h-4 text-orange-600" /> Anotasi Revisi Proposal
              </h3>
              <p className="text-xs text-gray-500 truncate">{annotateModal.proposal.judul_proposal}</p>
            </div>
            <button onClick={() => { setAnnotateModal(null); setAnnotateCatatan(''); }}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><LuX className="w-5 h-5" /></button>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row min-h-0">
            {/* Editor */}
            <div className="flex-1 min-h-0 bg-gray-100">
              <PdfAnnotationEditor
                fileUrl={annotateModal.fileUrl}
                initialAnnotation={annotateModal.initialAnnotation}
                getAnnotationRef={annotationGetRef}
                onSaveDraft={saveAnnotationDraft}
              />
            </div>
            {/* Panel catatan & kirim */}
            <div className="lg:w-80 shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-gray-200 p-4 flex flex-col gap-3">
              <div className="text-xs text-gray-500 bg-orange-50 border border-orange-200 rounded-lg p-2.5">
                Beri tanda langsung pada dokumen (teks, gambar) di atas PDF. Catatan revisi di bawah opsional — boleh dikosongkan jika sudah ada anotasi pada PDF. Desa akan menerima PDF beranotasi ini.
              </div>
              <label className="block text-sm font-semibold text-gray-700">Catatan Revisi <span className="font-normal text-gray-400">(opsional)</span></label>
              <textarea
                value={annotateCatatan}
                onChange={e => setAnnotateCatatan(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                placeholder="Ringkasan bagian yang perlu diperbaiki..."
              />
              <div className="mt-auto flex flex-col gap-2">
                <button
                  onClick={submitAnnotateRevision}
                  disabled={annotateSubmitting}
                  className="w-full px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl shadow-sm disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  <LuSend className="w-4 h-4" /> {annotateSubmitting ? 'Mengirim...' : 'Kirim Revisi ke Desa'}
                </button>
                <button
                  onClick={() => { setAnnotateModal(null); setAnnotateCatatan(''); }}
                  className="w-full px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-100"
                >Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

const StatCard = ({ label, value, color }) => (
  <div className={`rounded-xl p-3 ${color}`}>
    <div className="text-xs font-semibold opacity-70">{label}</div>
    <div className="text-2xl font-bold mt-1">{value}</div>
  </div>
);

const ProposalRow = ({ proposal, onApprove, onReject, onRevision, onCancel, onGenerateBA, onGenerateSP, onTim }) => {
  const submittedToDpmd = !!proposal.submitted_to_dpmd;
  const kecApproved = proposal.kecamatan_status === 'approved';
  const isPending = !proposal.kecamatan_status || proposal.kecamatan_status === 'pending';
  const canManageKecamatanDocs = !submittedToDpmd && (isPending || kecApproved);
  const firstKegiatan = proposal.kegiatan_list?.[0];
  const hasBA = !!proposal.berita_acara_path;
  const hasSP = !!proposal.surat_pengantar_kecamatan_path;
  const hasQuisioner = !!proposal.quisioner_completed;
  const canApprove = hasBA && hasSP;

  return (
    <div className="px-4 py-3">
      <div className="flex flex-col md:flex-row md:items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <StatusBadge status={proposal.kecamatan_status || 'pending'} />
            {submittedToDpmd && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border bg-purple-100 text-purple-700 border-purple-300">
                DPMD: {STATUS_LABELS[proposal.dpmd_status] || proposal.dpmd_status}
              </span>
            )}
            {canManageKecamatanDocs && (
              <>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${
                  hasQuisioner ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}>
                  <LuClipboardList className="w-3 h-3" /> Quisioner {hasQuisioner ? '✓' : '✗'}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${
                  hasBA ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}>
                  <LuFileText className="w-3 h-3" /> BA {hasBA ? '✓' : '✗'}
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full border ${
                  hasSP ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-gray-50 text-gray-500 border-gray-200'
                }`}>
                  <LuStamp className="w-3 h-3" /> Surat {hasSP ? '✓' : '✗'}
                </span>
              </>
            )}
          </div>
          <h4 className="font-bold text-gray-800 text-sm md:text-base leading-tight">{proposal.judul_proposal}</h4>
          {firstKegiatan && (
            <p className="text-xs text-gray-600 mt-1">
              <span className="font-semibold">Kegiatan:</span> {firstKegiatan.nama_kegiatan}
            </p>
          )}
          {proposal.nama_kegiatan_spesifik && (
            <p className="text-sm text-gray-600 mt-0.5">{proposal.nama_kegiatan_spesifik}</p>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 mt-2 text-xs">
            {proposal.volume && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 rounded text-blue-800">
                <LuPackage className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate"><strong>Vol:</strong> {proposal.volume}</span>
              </div>
            )}
            {proposal.lokasi && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded text-green-800">
                <LuMapPin className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate"><strong>Lokasi:</strong> {proposal.lokasi}</span>
              </div>
            )}
            {proposal.anggaran_usulan && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 rounded text-amber-800">
                <LuDollarSign className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="truncate"><strong>Rp</strong> {Number(proposal.anggaran_usulan).toLocaleString('id-ID')}</span>
              </div>
            )}
          </div>
          {proposal.kecamatan_catatan && (
            <div className="mt-2 text-xs bg-blue-50 border border-blue-200 rounded p-2 text-blue-800">
              <strong>Catatan Anda:</strong> {proposal.kecamatan_catatan}
            </div>
          )}
          {proposal.dpmd_catatan && (
            <div className="mt-2 text-xs bg-purple-50 border border-purple-200 rounded p-2 text-purple-800">
              <strong>Catatan DPMD:</strong> {proposal.dpmd_catatan}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 flex-shrink-0">
          {/* Action: verify / cancel */}
          <div className="flex flex-wrap gap-1 justify-end">
            {/* Tombol "Proposal" hanya untuk status non-pending; saat masih pending,
                aksi "Review" sudah membuka & menampilkan PDF proposalnya sekaligus. */}
            {proposal.file_proposal && !(!submittedToDpmd && isPending) && (
              <a
                href={`${imageBaseUrl}/storage/uploads/bankeu-perubahan/${proposal.file_proposal}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg"
              >
                <LuEye className="w-3.5 h-3.5" /> Proposal
              </a>
            )}
            {!submittedToDpmd && isPending && (
              <>
                <button onClick={onRevision} className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg">
                  <LuEye className="w-3.5 h-3.5" /> Review
                </button>
                <button
                  onClick={onApprove}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg ${
                    canApprove
                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                      : 'bg-gray-100 hover:bg-amber-50 text-gray-500 hover:text-amber-700'
                  }`}
                  title={canApprove ? 'Setujui proposal' : 'Buat BA dan Surat Pengantar terlebih dahulu'}
                >
                  <LuCheck className="w-3.5 h-3.5" /> Approve
                </button>
                <button onClick={onReject} className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg">
                  <LuX className="w-3.5 h-3.5" /> Tolak
                </button>
              </>
            )}
            {!submittedToDpmd && kecApproved && (
              <button onClick={onCancel} className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg">
                <LuRefreshCw className="w-3.5 h-3.5" /> Batalkan
              </button>
            )}
          </div>

          {/* Dokumen Kecamatan: Quisioner + BA + Surat Pengantar */}
          {canManageKecamatanDocs && (
            <div className="flex flex-wrap gap-1 justify-end pt-1 border-t border-gray-100">
              <button
                onClick={onTim}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg shadow-sm ${
                  hasQuisioner
                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
                title="Atur tim verifikasi & isi quisioner per anggota"
              >
                <LuUsers className="w-3.5 h-3.5" /> {hasQuisioner ? 'Tim Verifikasi ✓' : 'Tim Verifikasi'}
              </button>
              {hasBA ? (
                <>
                  <a
                    href={`${imageBaseUrl}${proposal.berita_acara_path.startsWith('/') ? '' : '/'}${proposal.berita_acara_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-semibold rounded-lg"
                  >
                    <LuFileText className="w-3.5 h-3.5" /> Lihat BA
                  </a>
                  <button
                    onClick={onGenerateBA}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-semibold rounded-lg"
                    title="Regenerate Berita Acara"
                  >
                    <LuRefreshCw className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={onGenerateBA}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  <LuFileText className="w-3.5 h-3.5" /> Generate BA
                </button>
              )}
              {hasSP ? (
                <>
                  <a
                    href={`${imageBaseUrl}${proposal.surat_pengantar_kecamatan_path.startsWith('/') ? '' : '/'}${proposal.surat_pengantar_kecamatan_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg"
                  >
                    <LuStamp className="w-3.5 h-3.5" /> Lihat Surat
                  </a>
                  <button
                    onClick={onGenerateSP}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg"
                    title="Regenerate Surat Pengantar"
                  >
                    <LuRefreshCw className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <button
                  onClick={onGenerateSP}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-sm"
                >
                  <LuStamp className="w-3.5 h-3.5" /> Generate Surat
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BankeuPerubahanVerificationPage;
