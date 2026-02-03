import React, { useEffect, useState, useMemo, useRef } from "react";
import api from "../../../api";
import Swal from "sweetalert2";
import {
  LuUpload, LuEye, LuClock, LuCheck, LuX, LuRefreshCw, 
  LuChevronDown, LuChevronRight, LuSend, LuTrash2, LuInfo, LuDownload, LuFileText, LuImage,
  LuPackage, LuMapPin, LuDollarSign
} from "react-icons/lu";

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

// Helper function untuk parse judul kegiatan yang memiliki "/" dan "," menjadi pilihan  
const parseKegiatanTitles = (namaKegiatan) => {
  // Cek apakah ada "/" di judul
  const hasSlash = namaKegiatan.includes('/');
  
  if (!hasSlash) {
    // KASUS: Tidak ada "/" -> koma sebagai separator pilihan
    const options = namaKegiatan.split(',').map(s => s.trim()).filter(s => s);
    return options;
  }
  
  // KASUS: Ada "/" -> parsing subjek dan objek
  // Format bisa:
  // 1. "Subjek1/Subjek2 ,Objek1,Objek2,..." (format baru dengan koma setelah subjek)
  // 2. "Subjek1/Subjek2 Objek1/Objek2/Objek3, Objek4 dan Objek5" (format lama mixed)
  
  // Cari posisi SPACE pertama setelah subjek
  // Subjek = kata-kata di awal yang dipisah "/"
  let subjekEnd = -1;
  let inSlashGroup = false;
  
  for (let i = 0; i < namaKegiatan.length; i++) {
    if (namaKegiatan[i] === '/') {
      inSlashGroup = true;
    } else if (namaKegiatan[i] === ' ' && inSlashGroup) {
      // Cek apakah setelah space ini ada huruf kapital
      if (i + 1 < namaKegiatan.length) {
        const nextChar = namaKegiatan[i + 1];
        if (nextChar === nextChar.toUpperCase() && nextChar.match(/[A-Z]/)) {
          // Ini adalah end dari subjek
          subjekEnd = i;
          break;
        }
      }
    }
  }
  
  if (subjekEnd === -1) {
    // Tidak ketemu pattern subjek-objek, fallback ke split by "/" aja
    const options = namaKegiatan.split('/').map(s => s.trim()).filter(s => s);
    return options;
  }
  
  // Parse subjek
  const subjekPart = namaKegiatan.slice(0, subjekEnd).trim();
  const subjekOptions = subjekPart.split('/').map(s => s.trim()).filter(s => s);
  
  // Parse objek (sisanya setelah subjek)
  const objekPart = namaKegiatan.slice(subjekEnd + 1).trim();
  
  // Objek bisa dipisah dengan:
  // 1. Koma ","
  // 2. Slash "/" (jika ada grup objek dengan slash)
  // 3. " dan " (kata "dan" sebagai separator)
  
  let objekOptions = [];
  
  // Split by koma dulu
  const komaSplits = objekPart.split(',').map(s => s.trim()).filter(s => s);
  
  for (const segment of komaSplits) {
    // Cek apakah segment ini punya "/"
    if (segment.includes('/')) {
      // Split by "/"
      const slashParts = segment.split('/').map(s => s.trim()).filter(s => s);
      objekOptions.push(...slashParts);
    } else if (segment.includes(' dan ')) {
      // Split by " dan "
      const danParts = segment.split(' dan ').map(s => s.trim()).filter(s => s);
      objekOptions.push(...danParts);
    } else {
      objekOptions.push(segment);
    }
  }
  
  // Jika tidak ada objek, return subjek aja
  if (objekOptions.length === 0) {
    return subjekOptions;
  }
  
  // Generate kombinasi: setiap subjek + setiap objek
  const combinations = [];
  for (const subjek of subjekOptions) {
    for (const objek of objekOptions) {
      combinations.push(`${subjek} ${objek}`);
    }
  }
  
  return combinations;
};

// Komponen Status Tracking Timeline - Level Desa (NEW FLOW 2026-01-30)
// Flow: Desa → Dinas Terkait → Kecamatan → DPMD
const StatusTracking = ({ proposals }) => {
  // Tentukan status tracking berdasarkan keseluruhan proposal desa
  const getTrackingSteps = () => {
    const steps = [
      { id: 1, label: 'Desa', status: 'pending', icon: LuClock, color: 'gray' },
      { id: 2, label: 'Review Dinas Terkait', status: 'pending', icon: LuClock, color: 'gray' },
      { id: 3, label: 'Review Kecamatan', status: 'pending', icon: LuClock, color: 'gray' },
      { id: 4, label: 'Review DPMD', status: 'pending', icon: LuClock, color: 'gray' }
    ];

    // Jika belum ada proposal yang dikirim ke Dinas
    const submittedProposals = proposals.filter(p => p.submitted_to_dinas_at);
    if (submittedProposals.length === 0) {
      steps[0].status = 'active';
      steps[0].icon = LuClock;
      steps[0].color = 'blue';
      steps[0].label = 'Desa (Belum dikirim)';
      return steps;
    }

    // Desa step completed (sudah kirim ke Dinas)
    steps[0].status = 'completed';
    steps[0].icon = LuCheck;
    steps[0].color = 'green';

    // NEW FLOW 2026-01-30: Check Dinas status (step 2)
    const pendingDinas = submittedProposals.filter(p => p.dinas_status === 'pending' || p.dinas_status === 'in_review');
    const rejectedDinas = submittedProposals.filter(p => (p.dinas_status === 'rejected' || p.dinas_status === 'revision') && !p.submitted_to_dinas_at);
    const approvedDinas = submittedProposals.filter(p => p.dinas_status === 'approved');

    if (pendingDinas.length > 0) {
      steps[1].status = 'active';
      steps[1].icon = LuClock;
      steps[1].color = 'blue';
      steps[1].label = 'Sedang direview Dinas Terkait';
      return steps;
    }

    if (rejectedDinas.length > 0) {
      steps[1].status = 'rejected';
      steps[1].icon = LuX;
      steps[1].color = 'red';
      steps[1].label = 'Ditolak Dinas - Kembali ke Desa';
      return steps;
    }

    if (approvedDinas.length > 0) {
      steps[1].status = 'completed';
      steps[1].icon = LuCheck;
      steps[1].color = 'green';
      steps[1].label = 'Disetujui Dinas Terkait';
    }

    // Check Kecamatan status (step 3)
    const pendingKecamatan = approvedDinas.filter(p => p.kecamatan_status === 'pending' || p.kecamatan_status === 'in_review');
    const rejectedKecamatan = approvedDinas.filter(p => (p.kecamatan_status === 'rejected' || p.kecamatan_status === 'revision'));
    const approvedKecamatan = approvedDinas.filter(p => p.kecamatan_status === 'approved');

    if (pendingKecamatan.length > 0) {
      steps[2].status = 'active';
      steps[2].icon = LuClock;
      steps[2].color = 'blue';
      steps[2].label = 'Sedang direview Kecamatan';
      return steps;
    }

    if (rejectedKecamatan.length > 0) {
      steps[2].status = 'rejected';
      steps[2].icon = LuX;
      steps[2].color = 'red';
      steps[2].label = 'Ditolak Kecamatan - Kembali ke Desa';
      return steps;
    }

    if (approvedKecamatan.length > 0) {
      steps[2].status = 'completed';
      steps[2].icon = LuCheck;
      steps[2].color = 'green';
      steps[2].label = 'Disetujui Kecamatan';
    }

    // Check DPMD status (step 4)
    const pendingDPMD = approvedKecamatan.filter(p => p.dpmd_status === 'pending' || p.dpmd_status === 'in_review');
    const rejectedDPMD = approvedKecamatan.filter(p => p.dpmd_status === 'rejected' || p.dpmd_status === 'revision');
    const approvedDPMD = approvedKecamatan.filter(p => p.dpmd_status === 'approved');

    if (pendingDPMD.length > 0) {
      steps[3].status = 'active';
      steps[3].icon = LuClock;
      steps[3].color = 'blue';
      steps[3].label = 'Sedang direview DPMD';
      return steps;
    }

    if (rejectedDPMD.length > 0) {
      steps[3].status = 'rejected';
      steps[3].icon = LuX;
      steps[3].color = 'red';
      steps[3].label = 'Ditolak DPMD - Kembali ke Desa';
      return steps;
    }

    if (approvedDPMD.length > 0) {
      steps[3].status = 'completed';
      steps[3].icon = LuCheck;
      steps[3].color = 'green';
      steps[3].label = 'Disetujui DPMD (Final)';
    }

    return steps;
  };

  const steps = getTrackingSteps();
  
  // Jangan tampilkan jika belum ada yang submit
  const hasSubmitted = proposals.some(p => p.submitted_to_kecamatan);
  if (!hasSubmitted) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.id}>
            {/* Step */}
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
            
            {/* Connector Line */}
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
  const [expandedSurat, setExpandedSurat] = useState(false);
  const [expandedStats, setExpandedStats] = useState(false);
  const [expandedProposalListInfra, setExpandedProposalListInfra] = useState(false);
  const [expandedProposalListNonInfra, setExpandedProposalListNonInfra] = useState(false);
  const [desaSurat, setDesaSurat] = useState({ surat_pengantar: null, surat_permohonan: null, submitted_to_kecamatan: false });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [uploadForms, setUploadForms] = useState({});
  const [showContohModal, setShowContohModal] = useState(false);
  const [contohFiles, setContohFiles] = useState({ cover: [], desa: [], kecamatan: [] });
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);
  
  // NEW: State untuk upload proposal dengan dropdown
  const [showUploadFormInfra, setShowUploadFormInfra] = useState(false);
  const [showUploadFormNonInfra, setShowUploadFormNonInfra] = useState(false);
  const [selectedKegiatanIdInfra, setSelectedKegiatanIdInfra] = useState('');
  const [selectedKegiatanIdNonInfra, setSelectedKegiatanIdNonInfra] = useState('');
  const [dropdownOpenInfra, setDropdownOpenInfra] = useState(false);
  const [dropdownOpenNonInfra, setDropdownOpenNonInfra] = useState(false);
  const dropdownButtonRefInfra = useRef(null);
  const dropdownButtonRefNonInfra = useRef(null);
  const [showNewProposalForm, setShowNewProposalForm] = useState(false);
  const [selectedKegiatanIds, setSelectedKegiatanIds] = useState([]);
  const [newProposalData, setNewProposalData] = useState({
    judul_proposal: '',
    nama_kegiatan_spesifik: '',
    volume: '',
    lokasi: '',
    deskripsi: '',
    anggaran_usulan: '',
    file: null
  });

  useEffect(() => {
    fetchData();
    fetchContohProposal();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownOpenInfra && !event.target.closest('.dropdown-container-infra')) {
        setDropdownOpenInfra(false);
      }
      if (dropdownOpenNonInfra && !event.target.closest('.dropdown-container-noninf')) {
        setDropdownOpenNonInfra(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpenInfra, dropdownOpenNonInfra]);

  // Auto-expand sections jika ada proposal rejected/revision
  useEffect(() => {
    if (proposals.length === 0) return;

    const hasRejectedInfra = proposals.some(p => 
      p.kegiatan_list?.some(k => k.jenis_kegiatan === 'infrastruktur') &&
      ((p.dinas_status === 'rejected' || p.dinas_status === 'revision') && !p.submitted_to_dinas_at ||
       (p.kecamatan_status === 'rejected' || p.kecamatan_status === 'revision') && !p.submitted_to_kecamatan)
    );
    
    const hasRejectedNonInfra = proposals.some(p => 
      p.kegiatan_list?.some(k => k.jenis_kegiatan === 'non_infrastruktur') &&
      ((p.dinas_status === 'rejected' || p.dinas_status === 'revision') && !p.submitted_to_dinas_at ||
       (p.kecamatan_status === 'rejected' || p.kecamatan_status === 'revision') && !p.submitted_to_kecamatan)
    );

    if (hasRejectedInfra) {
      setExpandedInfra(true);
      setExpandedProposalListInfra(true);
    }
    
    if (hasRejectedNonInfra) {
      setExpandedNonInfra(true);
      setExpandedProposalListNonInfra(true);
    }
  }, [proposals]);

  // Auto-expand stats panel ketika tombol kirim sudah tersedia
  useEffect(() => {
    // Hitung canSubmitToKecamatan dan canSubmitToDinas
    const unsendToKecamatan = proposals.filter(p => 
      p.status === 'pending' && 
      !p.submitted_to_kecamatan && 
      !p.verified_at &&
      !p.dinas_status && !p.kecamatan_status && !p.dpmd_status
    );
    
    const fromRevisionUploaded = proposals.filter(p => 
      p.status === 'pending' && 
      !p.submitted_to_kecamatan && 
      p.verified_at &&
      (p.dinas_status || p.kecamatan_status || p.dpmd_status)
    );
    
    const fromAnyLevelRevisionNotUploaded = proposals.filter(p => 
      (p.status === 'rejected' || p.status === 'revision') && 
      !p.submitted_to_kecamatan
    );
    
    const hasUnresolvedRevisions = fromAnyLevelRevisionNotUploaded.length > 0;
    const canSubmit = (unsendToKecamatan.length > 0 && !hasUnresolvedRevisions) || fromRevisionUploaded.length > 0;
    
    if (canSubmit) {
      setExpandedStats(true);
    }
  }, [proposals]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get current year untuk surat
      const currentYear = new Date().getFullYear();
      
      const [masterRes, proposalsRes, suratRes] = await Promise.all([
        api.get("/desa/bankeu/master-kegiatan"),
        api.get("/desa/bankeu/proposals"),
        api.get("/desa/bankeu/surat", { params: { tahun: currentYear } }).catch(() => ({ data: { data: { surat_pengantar: null, surat_permohonan: null, submitted_to_kecamatan: false } } }))
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
      
      const suratData = suratRes.data.data || { surat_pengantar: null, surat_permohonan: null, submitted_to_kecamatan: false };
      console.log('✅ Surat API Response:', suratRes.data);
      console.log('📄 Surat Data yang akan di-set ke state:', suratData);
      console.log('📎 Surat Pengantar:', suratData.surat_pengantar);
      console.log('📎 Surat Permohonan:', suratData.surat_permohonan);
      
      setDesaSurat(suratData);
      
      // Check if already submitted to kecamatan OR dinas
      const submittedProposal = proposalsRes.data.data.find(p => p.submitted_to_kecamatan || p.submitted_to_dinas_at);
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

  const fetchContohProposal = async () => {
    try {
      const response = await api.get("/contoh-proposal/list");
      setContohFiles(response.data.data);
    } catch (error) {
      console.error("Error fetching contoh proposal:", error);
    }
  };

  const handleDownloadContoh = (file) => {
    const downloadUrl = `${imageBaseUrl}${file.download_url}`;
    window.open(downloadUrl, '_blank');
  };

  const handleViewPdf = (proposal, kegiatanNama) => {
    // Strip /api suffix dari imageBaseUrl untuk static file access
    const apiBaseUrl = imageBaseUrl.replace(/\/api$/, '');
    
    setSelectedPdf({
      url: `${apiBaseUrl}/storage/uploads/bankeu/${proposal.file_proposal}`,
      title: kegiatanNama,
      proposal: proposal
    });
    setShowPdfModal(true);
    
    console.log('📄 Opening Bankeu PDF:', {
      file: proposal.file_proposal,
      url: `${apiBaseUrl}/storage/uploads/bankeu/${proposal.file_proposal}`
    });
  };

  const handleClosePdfModal = () => {
    setShowPdfModal(false);
    setSelectedPdf(null);
  };

  const handleUpload = async (kegiatan, file) => {
    const formData = uploadForms[kegiatan.id];
    
    console.log("=== DEBUG UPLOAD ===");
    console.log("Kegiatan:", kegiatan);
    console.log("File:", file);
    console.log("Form Data:", formData);
    
    // Parse title options
    const titleOptions = parseKegiatanTitles(kegiatan.nama_kegiatan);
    const hasMultipleOptions = titleOptions.length > 1;
    
    // Validation
    if (hasMultipleOptions && !formData?.judul_kegiatan?.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Silakan pilih judul kegiatan terlebih dahulu"
      });
      return;
    }
    if (!formData?.nama_kegiatan?.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Nama kegiatan wajib diisi terlebih dahulu"
      });
      return;
    }
    if (!formData?.volume?.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Volume kegiatan wajib diisi terlebih dahulu"
      });
      return;
    }
    if (!formData?.lokasi?.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Lokasi kegiatan wajib diisi terlebih dahulu"
      });
      return;
    }
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
      formDataUpload.append("kegiatan_ids", JSON.stringify([kegiatan.id])); // Convert to array for new API
      // Gunakan judul_kegiatan jika ada pilihan, kalau tidak pakai nama kegiatan master
      const judulFinal = hasMultipleOptions && formData.judul_kegiatan ? formData.judul_kegiatan : kegiatan.nama_kegiatan;
      formDataUpload.append("judul_proposal", judulFinal);
      formDataUpload.append("nama_kegiatan_spesifik", formData.nama_kegiatan);
      formDataUpload.append("volume", formData.volume);
      formDataUpload.append("lokasi", formData.lokasi);
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

  const handleReplaceFile = async (proposal, kegiatan, file, newAnggaran = null) => {
    console.log("=== DEBUG REPLACE FILE ===");
    console.log("Proposal ID:", proposal.id);
    console.log("Kegiatan:", kegiatan);
    console.log("File:", file);
    console.log("New Anggaran:", newAnggaran);
    
    // Validation
    if (!file) {
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
        title: 'Mengganti File...',
        text: 'Mohon tunggu',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      if (newAnggaran) {
        formDataUpload.append("anggaran_usulan", newAnggaran.toString().replace(/\D/g, ""));
      } else {
        formDataUpload.append("anggaran_usulan", proposal.anggaran_usulan);
      }
      formDataUpload.append("keep_status", "true"); // Flag untuk mempertahankan status

      console.log("=== FORM DATA REPLACE FILE YANG DIKIRIM ===");
      for (let pair of formDataUpload.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      console.log("Mengirim request replace file ke API...");
      const response = await api.patch(`/desa/bankeu/proposals/${proposal.id}/replace-file`, formDataUpload, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      console.log("Response replace file:", response.data);

      // Clear form
      setUploadForms(prev => {
        const newForms = { ...prev };
        delete newForms[kegiatan.id];
        return newForms;
      });

      // Fetch data baru
      await fetchData();
      
      // Simpan kegiatan ID untuk scroll nanti
      const uploadedKegiatanId = kegiatan.id;

      await Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "File proposal berhasil diganti",
        timer: 2000,
        showConfirmButton: false
      });
      
      // Scroll ke kegiatan yang baru diupload
      setTimeout(() => {
        const kegiatanElements = document.querySelectorAll('[data-kegiatan-id]');
        const targetElement = Array.from(kegiatanElements).find(
          el => el.getAttribute('data-kegiatan-id') === String(uploadedKegiatanId)
        );
        
        if (targetElement) {
          targetElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);
    } catch (error) {
      console.error("Error saat replace file:", error);
      console.error("Error response:", error.response);
      Swal.fire({
        icon: "error",
        title: "Gagal Ganti File",
        text: error.response?.data?.message || error.message || "Gagal mengganti file proposal",
        confirmButtonText: "OK"
      });
    }
  };

  const handleRevisionUpload = async (proposal, kegiatan, file) => {
    // Cek form data dari kegiatan.id (untuk form kegiatan) atau proposal.id (untuk form compact card)
    const formData = uploadForms[kegiatan?.id] || uploadForms[proposal.id];
    
    console.log("=== DEBUG REVISION UPLOAD ===");
    console.log("Proposal ID:", proposal.id);
    console.log("Kegiatan:", kegiatan);
    console.log("File:", file);
    console.log("Form Data from kegiatan.id:", uploadForms[kegiatan?.id]);
    console.log("Form Data from proposal.id:", uploadForms[proposal.id]);
    console.log("Selected Form Data:", formData);
    
    // Validation - Semua field OPSIONAL untuk revisi
    if (!file) {
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
        title: 'Mengupload Revisi...',
        text: 'Mohon tunggu',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      
      // Semua field opsional - hanya kirim jika diisi
      if (formData?.nama_kegiatan?.trim()) {
        formDataUpload.append("nama_kegiatan_spesifik", formData.nama_kegiatan.trim());
      }
      if (formData?.volume?.trim()) {
        formDataUpload.append("volume", formData.volume.trim());
      }
      if (formData?.lokasi?.trim()) {
        formDataUpload.append("lokasi", formData.lokasi.trim());
      }
      if (formData?.anggaran?.trim()) {
        formDataUpload.append("anggaran_usulan", formData.anggaran.replace(/\D/g, ""));
      }

      console.log("=== FORM DATA REVISI YANG DIKIRIM ===");
      for (let pair of formDataUpload.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      console.log("Mengirim request revisi ke API...");
      const response = await api.patch(`/desa/bankeu/proposals/${proposal.id}`, formDataUpload, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      
      console.log("Response revisi:", response.data);

      // Tutup Swal loading
      Swal.close();

      // Fetch data baru untuk refresh status
      console.log("Fetching updated data after revision upload...");
      await fetchData();
      console.log("Data refreshed. New proposal status:", response.data);
      
      // Clear form setelah data ter-refresh
      setUploadForms(prev => {
        const newForms = { ...prev };
        delete newForms[kegiatan?.id];
        delete newForms[proposal.id];
        return newForms;
      });
      
      // Simpan kegiatan ID untuk scroll nanti (jika ada)
      const uploadedKegiatanId = kegiatan?.id;

      await Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Revisi proposal berhasil diupload. Status telah direset ke pending.",
        timer: 2500,
        showConfirmButton: false
      });
      
      // Scroll ke kegiatan yang baru diupload
      setTimeout(() => {
        const kegiatanElements = document.querySelectorAll('[data-kegiatan-id]');
        const targetElement = Array.from(kegiatanElements).find(
          el => el.getAttribute('data-kegiatan-id') === String(uploadedKegiatanId)
        );
        
        if (targetElement) {
          targetElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);
    } catch (error) {
      console.error("Error saat upload revisi:", error);
      console.error("Error response:", error.response);
      console.error("Error response data:", error.response?.data);
      
      const errorMessage = error.response?.data?.message || error.message || "Gagal mengupload revisi proposal";
      
      Swal.fire({
        icon: "error",
        title: "Gagal Upload Revisi",
        html: `
          <div class="text-left">
            <p class="mb-2"><strong>Error:</strong> ${errorMessage}</p>
            ${error.response?.data?.error ? `<p class="text-sm text-gray-600 mt-2">${error.response.data.error}</p>` : ''}
          </div>
        `,
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
    // Validasi: Surat harus sudah dikirim ke kecamatan (tidak perlu menunggu approval)
    if (!desaSurat.submitted_to_kecamatan) {
      Swal.fire({
        icon: "warning",
        title: "Surat Belum Dikirim",
        html: `
          <div class="text-left">
            <p class="mb-2">Sebelum mengirim proposal ke Dinas Terkait, Anda harus:</p>
            <ol class="list-decimal ml-6 text-sm text-gray-700 space-y-1">
              <li>Upload Surat Pengantar Proposal</li>
              <li>Upload Surat Permohonan Proposal</li>
              <li>Kirim kedua surat tersebut ke Kecamatan</li>
            </ol>
            <p class="mt-3 text-sm text-amber-600">
              <strong>Catatan:</strong> Silakan scroll ke atas untuk melengkapi dokumen di section <strong>"Dokumen Pendukung Proposal"</strong>.
            </p>
          </div>
        `,
        confirmButtonText: "OK"
      });
      return;
    }

    const count = unsendToKecamatanCount;
    
    const result = await Swal.fire({
      title: 'Kirim ke Dinas Terkait?',
      html: `<strong>${count} proposal</strong> akan dikirim ke Dinas Terkait untuk diverifikasi.<br><strong>Proses ini tidak dapat dibatalkan!</strong>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Kirim!",
      cancelButtonText: "Batal"
    });

    if (result.isConfirmed) {
      try {
        Swal.fire({
          title: 'Mengirim ke Dinas Terkait...',
          text: 'Mohon tunggu',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const response = await api.post('/desa/bankeu/submit-to-dinas-terkait');
        await fetchData();

        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: response.data.message || "Proposal berhasil dikirim ke Dinas Terkait",
          timer: 2500,
          showConfirmButton: false
        });
      } catch (error) {
        console.error('Error submit to Kecamatan:', error);
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: error.response?.data?.message || "Gagal mengirim proposal"
        });
      }
    }
  };

  const handleSubmitToDinas = async () => {
    const count = unsendToDinasCount;
    
    const result = await Swal.fire({
      title: 'Kirim Ulang Proposal Revisi?',
      html: `<strong>${count} proposal revisi</strong> akan dikirim ulang ke <strong>${resubmitDestination}</strong>.<br><strong>Proses ini tidak dapat dibatalkan!</strong>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Kirim Ulang!",
      cancelButtonText: "Batal"
    });

    if (result.isConfirmed) {
      try {
        Swal.fire({
          title: 'Mengirim ulang proposal...',
          text: 'Mohon tunggu',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        const response = await api.post('/desa/bankeu/resubmit');
        await fetchData();

        Swal.fire({
          icon: "success",
          title: "Berhasil!",
          text: response.data.message || "Proposal revisi berhasil dikirim ulang",
          timer: 2500,
          showConfirmButton: false
        });
      } catch (error) {
        console.error('Error resubmit proposals:', error);
        Swal.fire({
          icon: "error",
          title: "Gagal",
          text: error.response?.data?.message || "Gagal mengirim proposal"
        });
      }
    }
  };

  const handleUploadSurat = async (proposalId, jenis, file) => {
    console.log("=== DEBUG UPLOAD SURAT ===");
    console.log("Proposal ID:", proposalId);
    console.log("Jenis:", jenis);
    console.log("File:", file);

    // Validation
    if (!file) {
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

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Ukuran file maksimal 5MB"
      });
      return;
    }

    try {
      Swal.fire({
        title: `Mengupload Surat ${jenis === 'pengantar' ? 'Pengantar' : 'Permohonan'}...`,
        text: 'Mohon tunggu',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("jenis", jenis);

      console.log("=== FORM DATA UPLOAD SURAT ===");
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      const response = await api.post(`/desa/bankeu/proposals/${proposalId}/upload-surat`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      console.log("Response upload surat:", response.data);

      // Fetch data baru untuk refresh tampilan
      await fetchData();

      await Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: `Surat ${jenis === 'pengantar' ? 'Pengantar' : 'Permohonan'} berhasil diupload`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Error saat upload surat:", error);
      console.error("Error response:", error.response);
      Swal.fire({
        icon: "error",
        title: "Gagal Upload",
        text: error.response?.data?.message || error.message || "Gagal mengupload surat",
        confirmButtonText: "OK"
      });
    }
  };

  // Handler baru untuk upload surat desa-level (pengantar & permohonan)
  const handleUploadDesaSurat = async (jenis, file) => {
    // Validation
    if (!file) {
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

    if (file.size > 5 * 1024 * 1024) {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Ukuran file maksimal 5MB"
      });
      return;
    }

    try {
      Swal.fire({
        title: `Mengupload Surat ${jenis === 'pengantar' ? 'Pengantar' : 'Permohonan'}...`,
        text: 'Mohon tunggu',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const formData = new FormData();
      formData.append("file", file);
      formData.append("jenis", jenis);

      await api.post('/desa/bankeu/surat/upload', formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      // Fetch data baru untuk refresh tampilan
      await fetchData();

      await Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: `Surat ${jenis === 'pengantar' ? 'Pengantar' : 'Permohonan'} berhasil diupload`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Error saat upload surat desa:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal Upload",
        text: error.response?.data?.message || error.message || "Gagal mengupload surat",
        confirmButtonText: "OK"
      });
    }
  };

  // Handler untuk submit surat ke kecamatan
  const handleSubmitDesaSurat = async () => {
    // Validasi: kedua surat harus sudah diupload
    if (!desaSurat.surat_pengantar || !desaSurat.surat_permohonan) {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Upload kedua surat (Pengantar & Permohonan) terlebih dahulu sebelum mengirim ke Kecamatan",
        confirmButtonText: "OK"
      });
      return;
    }

    // Confirm submit
    const result = await Swal.fire({
      title: "Kirim Surat ke Kecamatan?",
      html: `
        <div class="text-left">
          <p class="mb-2">Pastikan dokumen yang Anda upload sudah benar:</p>
          <ul class="list-disc ml-6 text-sm text-gray-700">
            <li>Surat Pengantar ✅</li>
            <li>Surat Permohonan ✅</li>
          </ul>
          <p class="mt-3 text-sm text-amber-600">
            <strong>Catatan:</strong> Setelah dikirim, Anda masih bisa upload proposal sampai semua proposal dikirim ke Dinas Terkait.
          </p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Ya, Kirim Surat",
      cancelButtonText: "Batal"
    });

    if (!result.isConfirmed) return;

    try {
      Swal.fire({
        title: 'Mengirim surat ke Kecamatan...',
        text: 'Mohon tunggu',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      await api.post('/desa/bankeu/surat/submit-to-kecamatan');
      await fetchData();

      await Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: "Surat berhasil dikirim ke Kecamatan",
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Error submit surat:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal Mengirim Surat",
        text: error.response?.data?.message || error.message || "Gagal mengirim surat ke Kecamatan",
        confirmButtonText: "OK"
      });
    }
  };

  // NEW: Handler untuk submit proposal dengan multiple kegiatan
  const handleSubmitNewProposal = async () => {
    // Validasi
    if (selectedKegiatanIds.length === 0) {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Pilih minimal 1 kegiatan"
      });
      return;
    }

    if (!newProposalData.judul_proposal.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Judul proposal wajib diisi"
      });
      return;
    }

    if (!newProposalData.file) {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "File proposal wajib diupload"
      });
      return;
    }

    if (newProposalData.file.type !== "application/pdf") {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "File harus berformat PDF"
      });
      return;
    }

    if (newProposalData.file.size > 10 * 1024 * 1024) {
      Swal.fire({
        icon: "warning",
        title: "Perhatian",
        text: "Ukuran file maksimal 10MB"
      });
      return;
    }

    try {
      Swal.fire({
        title: 'Mengupload Proposal...',
        text: 'Mohon tunggu',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const formData = new FormData();
      formData.append("file", newProposalData.file);
      formData.append("kegiatan_ids", JSON.stringify(selectedKegiatanIds));
      formData.append("judul_proposal", newProposalData.judul_proposal);
      formData.append("nama_kegiatan_spesifik", newProposalData.nama_kegiatan_spesifik || '');
      formData.append("volume", newProposalData.volume || '');
      formData.append("lokasi", newProposalData.lokasi || '');
      formData.append("deskripsi", newProposalData.deskripsi || '');
      formData.append("anggaran_usulan", newProposalData.anggaran_usulan.replace(/\D/g, "") || '0');

      await api.post("/desa/bankeu/proposals", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      // Reset form
      setShowNewProposalForm(false);
      setSelectedKegiatanIds([]);
      setNewProposalData({
        judul_proposal: '',
        nama_kegiatan_spesifik: '',
        volume: '',
        lokasi: '',
        deskripsi: '',
        anggaran_usulan: '',
        file: null
      });

      await fetchData();

      await Swal.fire({
        icon: "success",
        title: "Berhasil!",
        text: `Proposal dengan ${selectedKegiatanIds.length} kegiatan berhasil diupload`,
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      console.error("Error submit proposal:", error);
      Swal.fire({
        icon: "error",
        title: "Gagal Upload",
        text: error.response?.data?.message || error.message || "Gagal mengupload proposal",
        confirmButtonText: "OK"
      });
    }
  };

  // NEW: Toggle kegiatan selection
  const toggleKegiatanSelection = (kegiatanId) => {
    setSelectedKegiatanIds(prev => {
      if (prev.includes(kegiatanId)) {
        return prev.filter(id => id !== kegiatanId);
      } else {
        return [...prev, kegiatanId];
      }
    });
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

  // Merge kegiatan dengan proposals - dengan useMemo untuk cache
  const mergeKegiatanWithProposals = useMemo(() => {
    return (jenis) => {
      const kegiatanList = masterKegiatan.filter(k => k.jenis_kegiatan === jenis);
      
      // Deduplicate kegiatan by id
      const uniqueKegiatan = kegiatanList.filter((kegiatan, index, self) => 
        index === self.findIndex(k => parseInt(k.id) === parseInt(kegiatan.id))
      );
      
      return uniqueKegiatan.map(kegiatan => {
        const proposal = proposals.find(p => p.kegiatan_id === kegiatan.id);
        return {
          kegiatan,
          proposal: proposal || null
        };
      });
    };
  }, [masterKegiatan, proposals]);

  const infrastrukturData = useMemo(() => 
    mergeKegiatanWithProposals('infrastruktur'), 
    [mergeKegiatanWithProposals]
  );
  
  const nonInfrastrukturData = useMemo(() => 
    mergeKegiatanWithProposals('non_infrastruktur'),
    [mergeKegiatanWithProposals]
  );
  
  const totalKegiatan = masterKegiatan.length;
  
  // Hitung per status
  const verifiedProposals = proposals.filter(p => p.status === 'verified');
  const pendingProposals = proposals.filter(p => p.status === 'pending');
  // Hanya hitung revision yang sudah dikembalikan ke desa (submitted_to_dinas_at = NULL)
  const revisionProposals = proposals.filter(p => 
    (p.status === 'revision' || p.status === 'rejected') && !p.submitted_to_dinas_at
  );
  
  // NEW FLOW 2026-01-30: Hitung proposal yang belum dikirim ke Dinas
  const unsendProposals = proposals.filter(p => 
    p.status === 'pending' && 
    !p.submitted_to_dinas_at
  );
  
  // DETEKSI ASAL REVISI (NEW FLOW) - Pisah per level:
  // PENTING: Cek p.status dulu! Kalau sudah upload ulang (status='pending'), tidak masuk sini
  
  // Dari DPMD: status masih revision/rejected DAN dpmd_status ada
  const fromDPMDRevision = proposals.filter(p => 
    (p.status === 'revision' || p.status === 'rejected') &&
    (p.dpmd_status === 'rejected' || p.dpmd_status === 'revision') &&
    !p.submitted_to_dinas_at // Belum upload ulang
  );
  
  // Dari Kecamatan: status masih revision/rejected DAN kecamatan_status ada (tapi bukan dari DPMD)
  const fromKecamatanRevision = proposals.filter(p => 
    (p.status === 'revision' || p.status === 'rejected') &&
    (p.kecamatan_status === 'rejected' || p.kecamatan_status === 'revision') &&
    !p.dpmd_status && // Bukan dari DPMD (prioritas lebih tinggi)
    !p.submitted_to_dinas_at
  );
  
  // Dari Dinas: status masih revision/rejected DAN dinas_status ada (tapi bukan dari level lain)
  const fromDinasRevisionNotUploaded = proposals.filter(p => 
    (p.status === 'revision' || p.status === 'rejected') &&
    (p.dinas_status === 'rejected' || p.dinas_status === 'revision') &&
    !p.kecamatan_status && // Bukan dari Kecamatan
    !p.dpmd_status && // Bukan dari DPMD
    !p.submitted_to_dinas_at
  );
  
  // Semua revisi belum upload
  const fromAnyLevelRevisionNotUploaded = proposals.filter(p => 
    (p.status === 'revision' || p.status === 'rejected') &&
    !p.submitted_to_dinas_at
  );
  
  // Revisi yang SUDAH UPLOAD ULANG: status=pending (siap dikirim ulang)
  const fromRevisionUploaded = proposals.filter(p => 
    p.status === 'pending' &&
    !p.submitted_to_dinas_at &&
    !p.submitted_to_kecamatan &&
    (p.dinas_status || p.kecamatan_status || p.dpmd_status) // Pernah direview
  );
  
  // Count untuk tombol submit
  const unsendToKecamatanCount = unsendProposals.filter(p => 
    !p.dinas_status && !p.kecamatan_status && !p.dpmd_status // Benar-benar baru
  ).length;
  
  const unsendToDinasCount = fromRevisionUploaded.length; // Revisi SUDAH upload ulang
  
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
  
  // Cek apakah ada proposal yang perlu direvisi (belum diupload ulang)
  const hasUnresolvedRevisions = fromAnyLevelRevisionNotUploaded.length > 0;
  const hasUnresolvedDinasRevisions = fromDinasRevisionNotUploaded.length > 0;
  const hasUnresolvedKecamatanRevisions = fromKecamatanRevision.length > 0;
  
  // Deteksi asal revisi YANG SUDAH DIUPLOAD (untuk tentukan destination)
  const fromKecamatanUploaded = fromRevisionUploaded.filter(p => 
    p.kecamatan_status && !p.dpmd_status
  );
  const fromDinasOrDPMDUploaded = fromRevisionUploaded.filter(p => 
    !fromKecamatanUploaded.includes(p)
  );
  const resubmitDestination = fromKecamatanUploaded.length > 0 ? 'Kecamatan' : 'Dinas Terkait';
  
  // Tombol kirim ke Dinas Terkait: Ada proposal pending BARU DAN tidak ada revision yang belum diupload
  const canSubmitToKecamatan = unsendToKecamatanCount > 0 && !hasUnresolvedRevisions;
  
  // Tombol kirim ulang (resubmit): Ada proposal revisi yang SUDAH diupload ulang
  const canSubmitToDinas = unsendToDinasCount > 0;
  
  // DEBUG: Log untuk troubleshooting
  console.log('🔍 DEBUG COUNTING:', {
    proposals: proposals.length,
    fromRevisionUploaded: fromRevisionUploaded.length,
    fromRevisionUploadedData: fromRevisionUploaded.map(p => ({
      id: p.id,
      status: p.status,
      dinas_status: p.dinas_status,
      kecamatan_status: p.kecamatan_status,
      dpmd_status: p.dpmd_status,
      submitted_to_dinas_at: p.submitted_to_dinas_at
    })),
    unsendToDinasCount,
    canSubmitToDinas,
    resubmitDestination
  });

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

  // Debug: Log desaSurat state setiap kali component render
  console.log('🔍 [RENDER] Current desaSurat state:', desaSurat);
  console.log('🔍 [RENDER] Surat Pengantar:', desaSurat.surat_pengantar);
  console.log('🔍 [RENDER] Surat Permohonan:', desaSurat.surat_permohonan);

  return (
    <>
      <div className="space-y-6">
        {/* Header & Progress */}
        <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-100">
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <LuUpload className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Proposal Bantuan Keuangan</h1>
                  <p className="text-sm text-gray-600">Kelola proposal kegiatan desa Anda</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setExpandedStats(!expandedStats)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-all duration-300 group"
                  title={expandedStats ? "Tutup statistik" : "Buka statistik"}
                >
                  <LuChevronRight 
                    className={`w-5 h-5 text-gray-600 transition-transform duration-300 group-hover:scale-110 ${
                      expandedStats ? 'rotate-90' : 'rotate-0'
                    }`} 
                  />
                </button>
                <button
                  onClick={() => setShowContohModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 flex items-center gap-2 font-semibold text-sm shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  <LuDownload className="w-4 h-4" />
                  <span>Contoh Proposal</span>
                </button>
              </div>
            </div>
          </div>

          {/* Alert Banner for Rejected/Revision Proposals */}
          {proposals.some(p => (p.dinas_status === 'rejected' || p.dinas_status === 'revision') && !p.submitted_to_dinas_at) && (
            <div className="px-8">
              <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 shadow-md">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <LuInfo className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-red-900 mb-1">
                      ⚠️ Ada Proposal yang Ditolak/Perlu Revisi oleh Dinas!
                    </h3>
                    <p className="text-sm text-red-800 mb-2">
                      Dinas telah menolak atau meminta revisi pada {proposals.filter(p => (p.dinas_status === 'rejected' || p.dinas_status === 'revision') && !p.submitted_to_dinas_at).length} proposal Anda. 
                      Silakan periksa catatan dari Dinas, perbaiki proposal, lalu kirim ulang.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {proposals.filter(p => (p.dinas_status === 'rejected' || p.dinas_status === 'revision') && !p.submitted_to_dinas_at).map(p => (
                        <div key={p.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-red-200 rounded-lg shadow-sm">
                          <span className="text-xs font-medium text-red-700">{p.judul_proposal}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.dinas_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {p.dinas_status === 'rejected' ? 'DITOLAK' : 'REVISI'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {proposals.some(p => (p.kecamatan_status === 'rejected' || p.kecamatan_status === 'revision') && !p.submitted_to_kecamatan) && (
            <div className="px-8">
              <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg p-4 shadow-md">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <LuInfo className="w-6 h-6 text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold text-orange-900 mb-1">
                      ⚠️ Ada Proposal yang Ditolak/Perlu Revisi oleh Kecamatan!
                    </h3>
                    <p className="text-sm text-orange-800 mb-2">
                      Kecamatan telah menolak atau meminta revisi pada {proposals.filter(p => (p.kecamatan_status === 'rejected' || p.kecamatan_status === 'revision') && !p.submitted_to_kecamatan).length} proposal Anda. 
                      Silakan periksa catatan dari Kecamatan, perbaiki proposal, lalu kirim ulang.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {proposals.filter(p => (p.kecamatan_status === 'rejected' || p.kecamatan_status === 'revision') && !p.submitted_to_kecamatan).map(p => (
                        <div key={p.id} className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-orange-200 rounded-lg shadow-sm">
                          <span className="text-xs font-medium text-orange-700">{p.judul_proposal}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${p.kecamatan_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {p.kecamatan_status === 'rejected' ? 'DITOLAK' : 'REVISI'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        
          {expandedStats && (
            <div className="px-8 pb-8">
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
            ) : filledCount > 0 ? (
              <p className="text-sm text-gray-600 mt-3">
                {kegiatanPerluDiisi > 0 && (
                  <>Masih ada <span className="font-bold text-gray-900">{kegiatanPerluDiisi}</span> kegiatan lagi<br/>
                  <span className="text-xs text-green-600">Anda sudah bisa mengirim proposal yang ada</span></>
                )}
              </p>
            ) : (
              <p className="text-sm text-orange-600 mt-3 font-medium">
                Upload minimal 1 kegiatan untuk memulai
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
                    // Hanya hitung revision yang sudah dikembalikan ke desa
                    revision: proposals.filter(p => (p.status === 'revision' || p.status === 'rejected') && !p.submitted_to_kecamatan).length
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
            
            {/* Buttons Kirim - 2 tombol terpisah */}
            {(canSubmitToKecamatan || canSubmitToDinas) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                {(hasUnresolvedKecamatanRevisions || hasUnresolvedDinasRevisions) ? (
                  <div className="text-center space-y-2">
                    {hasUnresolvedKecamatanRevisions && (
                      <div className="px-6 py-3 bg-orange-50 border-2 border-orange-200 rounded-xl">
                        <LuRefreshCw className="w-6 h-6 mx-auto mb-2 text-orange-600 animate-spin" />
                        <p className="text-sm font-bold text-orange-800">
                          {fromKecamatanRevision.length} proposal dari Kecamatan perlu diupload ulang
                        </p>
                        <p className="text-xs text-orange-600 mt-1">
                          Upload semua revisi untuk mengirim ke Kecamatan
                        </p>
                      </div>
                    )}
                    {hasUnresolvedDinasRevisions && (
                      <div className="px-6 py-3 bg-purple-50 border-2 border-purple-200 rounded-xl">
                        <LuRefreshCw className="w-6 h-6 mx-auto mb-2 text-purple-600 animate-spin" />
                        <p className="text-sm font-bold text-purple-800">
                          {fromDinasRevisionNotUploaded.length} proposal dari Dinas perlu diupload ulang
                        </p>
                        <p className="text-xs text-purple-600 mt-1">
                          Upload semua revisi untuk mengirim ke Dinas
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Tombol Kirim ke Dinas Terkait (First Submission) */}
                    {canSubmitToKecamatan && (
                      <div>
                        <button
                          onClick={handleSubmitToKecamatan}
                          className="w-full px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-md transition-all bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                          <LuSend className="w-5 h-5" />
                          <span>Kirim ke Dinas Terkait</span>
                        </button>
                        <p className="text-xs text-blue-600 mt-2 text-center font-medium">
                          ✓ Siap dikirim ke Dinas Terkait ({unsendToKecamatanCount} proposal)
                        </p>
                      </div>
                    )}

                    {/* Tombol Kirim Ulang (Resubmit Revisi) */}
                    {canSubmitToDinas && (
                      <div>
                        <button
                          onClick={handleSubmitToDinas}
                          className="w-full px-6 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm shadow-md transition-all bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700 hover:shadow-lg transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                        >
                          <LuSend className="w-5 h-5" />
                          <span>Kirim Ulang ke {resubmitDestination}</span>
                        </button>
                        <p className="text-xs text-green-600 mt-2 text-center font-medium">
                          ✓ Revisi siap dikirim ke {resubmitDestination} ({unsendToDinasCount} proposal)
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
              </div>
            </div>
          )}
        </div>

        {/* Status Tracking - Tampil di level atas sebelum list kegiatan */}
        <StatusTracking proposals={proposals} />

        {/* Section Dokumen Pendukung - Surat Pengantar & Surat Permohonan (Desa-Level) */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100">
          <button
            onClick={() => setExpandedSurat(!expandedSurat)}
            className="w-full px-6 py-5 flex items-center justify-between bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 hover:from-green-100 hover:via-emerald-100 hover:to-green-100 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                {expandedSurat ? <LuChevronDown className="w-5 h-5 text-white" /> : <LuChevronRight className="w-5 h-5 text-white" />}
              </div>
              <div className="text-left">
                <h3 className="text-xl font-bold text-gray-900">Dokumen Pendukung Proposal</h3>
                <p className="text-sm text-gray-600">
                  Upload Surat Pengantar & Surat Permohonan untuk desa ini {desaSurat.submitted_to_kecamatan && <span className="text-green-600 font-medium">(Sudah Dikirim ke Kecamatan)</span>}
                </p>
              </div>
            </div>
            <div className="px-4 py-2 bg-white rounded-xl shadow-md border border-gray-100">
              {desaSurat.surat_pengantar && desaSurat.surat_permohonan ? (
                <span className="text-xl font-bold flex items-center gap-2 text-green-600">
                  <LuCheck className="w-6 h-6" /> 
                  <span>Lengkap</span>
                </span>
              ) : (
                <span className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                  {[desaSurat.surat_pengantar, desaSurat.surat_permohonan].filter(Boolean).length}/2
                </span>
              )}
            </div>
          </button>
        
          <div className={`transition-all duration-500 ease-in-out overflow-hidden ${
            expandedSurat ? 'max-h-[10000px] opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="p-6">
              {/* Info Box */}
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <LuInfo className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">Informasi Penting:</p>
                    <ul className="list-disc ml-4 space-y-1">
                      <li>Upload kedua dokumen (Surat Pengantar & Surat Permohonan) untuk seluruh proposal di desa ini</li>
                      <li>Maksimal ukuran file 5MB, format PDF</li>
                      <li>Surat harus dikirim ke Kecamatan terlebih dahulu sebelum mengirim proposal ke Dinas Terkait</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Upload Forms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Surat Pengantar */}
                <div className="bg-blue-50 p-5 rounded-xl border-2 border-blue-200">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <label className="text-base font-bold text-gray-800">Surat Pengantar Proposal</label>
                    {desaSurat.surat_pengantar && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-semibold shadow-sm">
                        <LuCheck className="w-4 h-4" />
                        Uploaded
                      </span>
                    )}
                  </div>
                  
                  {desaSurat.surat_pengantar ? (
                    <div className="space-y-3">
                      <a
                        href={`${imageBaseUrl}/storage/uploads/bankeu/${desaSurat.surat_pengantar}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full px-5 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-center text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <LuEye className="w-5 h-5" />
                          Lihat PDF
                        </div>
                      </a>
                      {!desaSurat.submitted_to_kecamatan && (
                        <>
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                handleUploadDesaSurat('pengantar', file);
                                e.target.value = null;
                              }
                            }}
                            className="hidden"
                            id="desa-surat-pengantar"
                          />
                          <label
                            htmlFor="desa-surat-pengantar"
                            className="block w-full px-5 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 cursor-pointer text-center text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                          >
                            <div className="flex items-center justify-center gap-2">
                              <LuRefreshCw className="w-5 h-5" />
                              Ganti PDF
                            </div>
                          </label>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            handleUploadDesaSurat('pengantar', file);
                            e.target.value = null;
                          }
                        }}
                        className="hidden"
                        id="desa-surat-pengantar"
                      />
                      <label
                        htmlFor="desa-surat-pengantar"
                        className="block w-full px-5 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 cursor-pointer text-center text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <LuUpload className="w-5 h-5" />
                          Upload Surat Pengantar
                        </div>
                      </label>
                    </>
                  )}
                  <p className="text-xs text-gray-600 mt-3 text-center">Max 5MB, Format PDF</p>
                </div>

                {/* Surat Permohonan */}
                <div className="bg-purple-50 p-5 rounded-xl border-2 border-purple-200">
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <label className="text-base font-bold text-gray-800">Surat Permohonan Proposal</label>
                    {desaSurat.surat_permohonan && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-semibold shadow-sm">
                        <LuCheck className="w-4 h-4" />
                        Uploaded
                      </span>
                    )}
                  </div>
                  
                  {desaSurat.surat_permohonan ? (
                    <div className="space-y-3">
                      <a
                        href={`${imageBaseUrl}/storage/uploads/bankeu/${desaSurat.surat_permohonan}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full px-5 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 text-center text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <LuEye className="w-5 h-5" />
                          Lihat PDF
                        </div>
                      </a>
                      {!desaSurat.submitted_to_kecamatan && (
                        <>
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => {
                              const file = e.target.files[0];
                              if (file) {
                                handleUploadDesaSurat('permohonan', file);
                                e.target.value = null;
                              }
                            }}
                            className="hidden"
                            id="desa-surat-permohonan"
                          />
                          <label
                            htmlFor="desa-surat-permohonan"
                            className="block w-full px-5 py-3 bg-amber-600 text-white rounded-xl hover:bg-amber-700 cursor-pointer text-center text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                          >
                            <div className="flex items-center justify-center gap-2">
                              <LuRefreshCw className="w-5 h-5" />
                              Ganti PDF
                            </div>
                          </label>
                        </>
                      )}
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            handleUploadDesaSurat('permohonan', file);
                            e.target.value = null;
                          }
                        }}
                        className="hidden"
                        id="desa-surat-permohonan"
                      />
                      <label
                        htmlFor="desa-surat-permohonan"
                        className="block w-full px-5 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 cursor-pointer text-center text-sm font-semibold transition-all shadow-md hover:shadow-lg"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <LuUpload className="w-5 h-5" />
                          Upload Surat Permohonan
                        </div>
                      </label>
                    </>
                  )}
                  <p className="text-xs text-gray-600 mt-3 text-center">Max 5MB, Format PDF</p>
                </div>
              </div>

              {/* Submit Button */}
              {desaSurat.surat_pengantar && desaSurat.surat_permohonan && !desaSurat.submitted_to_kecamatan && (
                <div className="flex justify-center">
                  <button
                    onClick={handleSubmitDesaSurat}
                    className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-bold text-base shadow-lg hover:shadow-xl transition-all flex items-center gap-3"
                  >
                    <LuSend className="w-5 h-5" />
                    Kirim Surat ke Kecamatan
                  </button>
                </div>
              )}

              {/* Status Review Kecamatan */}
              {desaSurat.submitted_to_kecamatan && desaSurat.kecamatan_status === 'approved' && (
                <div className="p-5 bg-green-50 border-2 border-green-300 rounded-xl">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <LuCheck className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-green-900 text-lg mb-1">Surat Disetujui Kecamatan</h4>
                      <p className="text-sm text-green-700 mb-2">
                        Direview oleh: <span className="font-semibold">{desaSurat.reviewer_name || 'Kecamatan'}</span>
                        {desaSurat.kecamatan_reviewed_at && (
                          <span className="ml-2">pada {new Date(desaSurat.kecamatan_reviewed_at).toLocaleString('id-ID')}</span>
                        )}
                      </p>
                      {desaSurat.kecamatan_catatan && (
                        <div className="mt-3 p-3 bg-white border border-green-200 rounded-lg">
                          <p className="text-sm font-semibold text-gray-700 mb-1">Catatan:</p>
                          <p className="text-sm text-gray-600">{desaSurat.kecamatan_catatan}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {desaSurat.submitted_to_kecamatan && desaSurat.kecamatan_status === 'pending' && (
                <div className="p-5 bg-amber-50 border-2 border-amber-300 rounded-xl">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <LuClock className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-amber-900 text-lg mb-1">Menunggu Review Kecamatan</h4>
                      <p className="text-sm text-amber-700">
                        Surat Anda telah dikirim ke Kecamatan pada {new Date(desaSurat.submitted_at).toLocaleString('id-ID')}.
                        Mohon menunggu konfirmasi dari pihak Kecamatan.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {desaSurat.kecamatan_status === 'rejected' && (
                <div className="p-5 bg-red-50 border-2 border-red-300 rounded-xl">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <LuX className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-red-900 text-lg mb-1">Surat Ditolak Kecamatan</h4>
                      <p className="text-sm text-red-700 mb-2">
                        Direview oleh: <span className="font-semibold">{desaSurat.reviewer_name || 'Kecamatan'}</span>
                        {desaSurat.kecamatan_reviewed_at && (
                          <span className="ml-2">pada {new Date(desaSurat.kecamatan_reviewed_at).toLocaleString('id-ID')}</span>
                        )}
                      </p>
                      {desaSurat.kecamatan_catatan && (
                        <div className="mt-3 p-3 bg-white border border-red-200 rounded-lg">
                          <p className="text-sm font-semibold text-gray-700 mb-1">Alasan Penolakan:</p>
                          <p className="text-sm text-gray-600">{desaSurat.kecamatan_catatan}</p>
                        </div>
                      )}
                      <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                        <p className="text-sm font-semibold text-amber-900 mb-2">⚠️ Tindak Lanjut:</p>
                        <p className="text-sm text-amber-800">
                          Silakan perbaiki surat sesuai catatan di atas, kemudian upload ulang kedua surat dan kirim kembali ke Kecamatan.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* List Kegiatan */}
        <div className="space-y-4">{/* Infrastruktur */}
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
                  <p className="text-sm text-gray-600">
                    {(() => {
                      const uniqueKegiatanIds = new Set();
                      proposals.forEach(p => {
                        p.kegiatan_list?.forEach(k => {
                          if (k.jenis_kegiatan === 'infrastruktur') {
                            uniqueKegiatanIds.add(k.id);
                          }
                        });
                      });
                      return uniqueKegiatanIds.size;
                    })()} dari {infrastrukturData.length} program
                  </p>
                </div>
              </div>
              <div className="px-4 py-2 bg-white rounded-xl shadow-md border border-gray-100">
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  {(() => {
                    const uniqueKegiatanIds = new Set();
                    proposals.forEach(p => {
                      p.kegiatan_list?.forEach(k => {
                        if (k.jenis_kegiatan === 'infrastruktur') {
                          uniqueKegiatanIds.add(k.id);
                        }
                      });
                    });
                    return uniqueKegiatanIds.size;
                  })()}/{infrastrukturData.length}
                </span>
              </div>
            </button>
          
            <div className={`transition-all duration-500 ease-in-out ${expandedInfra ? 'max-h-[10000px] opacity-100' : 'max-h-0 opacity-0'}`} style={{ overflow: expandedInfra ? 'visible' : 'hidden' }}>
              {/* Daftar Proposal yang Sudah Diupload */}
              {proposals.filter(p => p.kegiatan_list?.some(k => k.jenis_kegiatan === 'infrastruktur')).length > 0 && (
                <div className="border-b border-gray-200">
                  <button
                    onClick={() => setExpandedProposalListInfra(!expandedProposalListInfra)}
                    className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between group"
                  >
                    <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                      <LuFileText className="w-4 h-4" />
                      Proposal yang Sudah Diupload ({proposals.filter(p => p.kegiatan_list?.some(k => k.jenis_kegiatan === 'infrastruktur')).length})
                    </h4>
                    {expandedProposalListInfra ? 
                      <LuChevronDown className="w-5 h-5 text-gray-500 group-hover:text-gray-700" /> : 
                      <LuChevronRight className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
                    }
                  </button>
                  <div className={`transition-all duration-300 ${expandedProposalListInfra ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`} style={{ overflow: expandedProposalListInfra ? 'visible' : 'hidden' }}>
                    <div className="p-4 bg-gray-50 space-y-2">
                    {proposals.filter(p => p.kegiatan_list?.some(k => k.jenis_kegiatan === 'infrastruktur')).map((proposal) => (
                      <div key={proposal.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="font-bold text-gray-900 text-base leading-tight">{proposal.judul_proposal}</p>
                              {proposal.kegiatan_list && proposal.kegiatan_list.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {proposal.kegiatan_list.map((kegiatan) => (
                                    <span 
                                      key={kegiatan.id}
                                      className={`px-2 py-1 rounded text-xs font-medium ${
                                        kegiatan.jenis_kegiatan === 'infrastruktur' 
                                          ? 'bg-blue-100 text-blue-700' 
                                          : 'bg-purple-100 text-purple-700'
                                      }`}
                                    >
                                      {kegiatan.nama_kegiatan.substring(0, 30)}...
                                    </span>
                                  ))}
                                </div>
                              )}
                              <p className="text-xs text-gray-500 mt-2">
                                {new Date(proposal.created_at).toLocaleDateString('id-ID', { 
                                  day: 'numeric', 
                                  month: 'short', 
                                  year: 'numeric' 
                                })}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {getStatusBadge(proposal)}
                              {proposal.anggaran_usulan && (
                                <span className="text-xs font-semibold text-green-600">
                                  Rp {new Intl.NumberFormat('id-ID').format(proposal.anggaran_usulan)}
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  const apiBaseUrl = imageBaseUrl.replace(/\/api$/, '');
                                  window.open(`${apiBaseUrl}/storage/uploads/bankeu/${proposal.file_proposal}`, '_blank');
                                }}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 text-xs font-medium transition-all"
                              >
                                <LuEye className="w-3 h-3" />
                                Lihat
                              </button>
                            </div>
                          </div>

                          {/* Catatan Dinas */}
                          {proposal.dinas_catatan && (proposal.dinas_status === 'rejected' || proposal.dinas_status === 'revision') && (
                            <div className="mt-3 p-3 bg-red-50 border-l-3 border-red-400 rounded">
                              <div className="flex items-start gap-2">
                                <LuInfo className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-red-800 mb-1">
                                    Catatan Dinas {proposal.dinas_status === 'rejected' ? '(Ditolak)' : '(Revisi)'}
                                  </p>
                                  <p className="text-sm text-red-700">{proposal.dinas_catatan}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Catatan Kecamatan */}
                          {proposal.kecamatan_catatan && (proposal.kecamatan_status === 'rejected' || proposal.kecamatan_status === 'revision') && (
                            <div className="mt-3 p-3 bg-purple-50 border-l-3 border-purple-400 rounded">
                              <div className="flex items-start gap-2">
                                <LuInfo className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-purple-800 mb-1">
                                    Catatan Kecamatan {proposal.kecamatan_status === 'rejected' ? '(Ditolak)' : '(Revisi)'}
                                  </p>
                                  <p className="text-sm text-purple-700">{proposal.kecamatan_catatan}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Form Upload Ulang */}
                          {(
                            ((proposal.dinas_status === "rejected" || proposal.dinas_status === "revision") && !proposal.submitted_to_dinas_at) ||
                            ((proposal.kecamatan_status === "rejected" || proposal.kecamatan_status === "revision") && !proposal.submitted_to_kecamatan)
                          ) && (
                            <div className="mt-3 bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border-2 border-orange-300">
                              <div className="flex items-center gap-2 mb-3">
                                <LuRefreshCw className="w-5 h-5 text-orange-600" />
                                <span className="font-bold text-orange-900 text-base">Upload Ulang Proposal</span>
                                {(proposal.dinas_status === 'revision' || proposal.dinas_status === 'rejected') && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 border border-purple-300 rounded-lg ml-auto">
                                    <LuInfo className="w-3 h-3 text-purple-700" />
                                    <span className="text-xs font-bold text-purple-800">Dari DINAS</span>
                                  </div>
                                )}
                                {(proposal.kecamatan_status === 'revision' || proposal.kecamatan_status === 'rejected') && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 border border-blue-300 rounded-lg ml-auto">
                                    <LuInfo className="w-3 h-3 text-blue-700" />
                                    <span className="text-xs font-bold text-blue-800">Dari KECAMATAN</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-orange-800">Nama Kegiatan Baru (opsional)</label>
                                  <input
                                    type="text"
                                    value={uploadForms[proposal.id]?.nama_kegiatan || ''}
                                    onChange={(e) => updateUploadForm(proposal.id, 'nama_kegiatan', e.target.value)}
                                    placeholder="Kosongkan jika tidak diubah"
                                    className="w-full px-3 py-2 text-sm border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 bg-white"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-orange-800">Volume Baru (opsional)</label>
                                  <input
                                    type="text"
                                    value={uploadForms[proposal.id]?.volume || ''}
                                    onChange={(e) => updateUploadForm(proposal.id, 'volume', e.target.value)}
                                    placeholder="Kosongkan jika tidak diubah"
                                    className="w-full px-3 py-2 text-sm border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 bg-white"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-orange-800">Lokasi Baru (opsional)</label>
                                  <input
                                    type="text"
                                    value={uploadForms[proposal.id]?.lokasi || ''}
                                    onChange={(e) => updateUploadForm(proposal.id, 'lokasi', e.target.value)}
                                    placeholder="Kosongkan jika tidak diubah"
                                    className="w-full px-3 py-2 text-sm border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 bg-white"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-orange-800">Anggaran Baru (opsional)</label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm font-medium">Rp</span>
                                    <input
                                      type="text"
                                      value={formatRupiah(uploadForms[proposal.id]?.anggaran || '')}
                                      onChange={(e) => updateUploadForm(proposal.id, 'anggaran', e.target.value.replace(/\D/g, ''))}
                                      placeholder="Kosongkan jika tidak diubah"
                                      className="w-full pl-10 pr-3 py-2 text-sm border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 bg-white"
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <input
                                  type="file"
                                  accept=".pdf"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                      // Panggil handleRevisionUpload dengan proposal dan file
                                      handleRevisionUpload(proposal, proposal.kegiatan_list[0], file);
                                      e.target.value = null;
                                    }
                                  }}
                                  className="hidden"
                                  id={`file-revision-compact-${proposal.id}`}
                                />
                                <label
                                  htmlFor={`file-revision-compact-${proposal.id}`}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-semibold text-sm hover:from-orange-700 hover:to-red-700 cursor-pointer transition-all shadow-md"
                                >
                                  <LuUpload className="w-4 h-4" />
                                  Pilih File PDF Baru
                                </label>
                                <p className="text-xs text-gray-600">
                                  Max 5MB • Setelah upload, gunakan tombol <strong>"Kirim ke Dinas Terkait"</strong> di atas
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Tombol Upload Proposal Baru - Flow 3 Step */}
              {!isSubmitted && (
                <div className="p-6">
                  <button
                    onClick={() => {
                      setShowUploadFormInfra(!showUploadFormInfra);
                      if (!showUploadFormInfra) {
                        setSelectedKegiatanIdInfra('');
                      }
                    }}
                    className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 flex items-center justify-center gap-3 font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
                  >
                    <LuUpload className="w-6 h-6" />
                    {showUploadFormInfra ? 'Tutup Form' : 'Tambah Proposal Infrastruktur Baru'}
                  </button>

                  {/* Dropdown & Form Upload Inline */}
                  {showUploadFormInfra && (
                    <div className="mt-4 p-4 sm:p-6 bg-white rounded-2xl border-2 border-blue-300 shadow-xl transition-all duration-300">
                      <div className="space-y-5">
                        {/* Dropdown Pilih Program */}
                        <div className={`dropdown-container-infra relative ${dropdownOpenInfra ? 'mb-96' : 'mb-6'}`}>
                          <label className="flex items-center gap-3 text-lg sm:text-xl font-bold text-blue-900 mb-4">
                            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full shadow-md">
                              <span className="text-base font-bold">1</span>
                            </div>
                            <span>Pilih Program Infrastruktur</span>
                          </label>
                          <div className="relative">
                            {/* Custom Dropdown Button */}
                            <button
                              ref={dropdownButtonRefInfra}
                              type="button"
                              onClick={() => setDropdownOpenInfra(!dropdownOpenInfra)}
                              className="w-full pl-5 pr-12 py-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl text-base sm:text-lg font-semibold text-left shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-200 focus:border-blue-500 hover:border-blue-400 transition-all duration-200 cursor-pointer"
                            >
                              <span className={selectedKegiatanIdInfra ? 'text-gray-800' : 'text-gray-500'}>
                                {selectedKegiatanIdInfra 
                                  ? (() => {
                                      const selected = infrastrukturData.find(i => i.kegiatan.id.toString() === selectedKegiatanIdInfra);
                                      const name = selected?.kegiatan.nama_kegiatan || '';
                                      return name.length > 100 ? name.substring(0, 100) + '...' : name;
                                    })()
                                  : '-- Pilih Salah Satu Program --'
                                }
                              </span>
                            </button>
                            {/* Custom Dropdown Arrow */}
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                              <svg 
                                className={`w-7 h-7 text-blue-600 transition-transform duration-200 ${dropdownOpenInfra ? 'rotate-180' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                            
                            {/* Dropdown Menu with Scroll - Fixed Position */}
                            {dropdownOpenInfra && (
                              <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border-2 border-blue-300 rounded-xl shadow-2xl overflow-hidden">
                                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                    {infrastrukturData.map((item, idx) => (
                                      <button
                                        key={item.kegiatan.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedKegiatanIdInfra(item.kegiatan.id.toString());
                                          setDropdownOpenInfra(false);
                                        }}
                                        className={`w-full px-5 py-4 text-left text-base sm:text-lg font-medium transition-colors leading-relaxed ${
                                          selectedKegiatanIdInfra === item.kegiatan.id.toString()
                                            ? 'bg-blue-100 text-blue-900 font-semibold'
                                            : 'text-gray-800 hover:bg-blue-50'
                                        } ${idx !== infrastrukturData.length - 1 ? 'border-b border-gray-200' : 'mb-2'}`}
                                      >
                                        <span className="block">
                                          {item.kegiatan.nama_kegiatan}
                                        </span>
                                      </button>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                          {selectedKegiatanIdInfra && (
                            <p className="mt-3 text-sm sm:text-base text-gray-600 flex items-center gap-2">
                              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Program terpilih. Silakan isi detail proposal di bawah.
                            </p>
                          )}
                        </div>

                        {/* Form Input - Muncul setelah pilih program */}
                        {selectedKegiatanIdInfra && (
                          <div className="pt-5 border-t-2 border-blue-200">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full shadow-md">
                                <span className="text-sm font-bold">2</span>
                              </div>
                              <h4 className="text-base sm:text-lg font-bold text-gray-900">
                                Isi Detail Proposal
                              </h4>
                            </div>
                            {/* Reuse KegiatanRow component untuk form */}
                            {(() => {
                              const selectedItem = infrastrukturData.find(i => i.kegiatan.id.toString() === selectedKegiatanIdInfra);
                              if (!selectedItem) return null;
                              return (
                                <KegiatanRow
                                  key={`upload-infra-${selectedItem.kegiatan.id}`}
                                  item={selectedItem}
                                  index={0}
                                  onUpload={handleUpload}
                                  onRevisionUpload={handleRevisionUpload}
                                  onReplaceFile={handleReplaceFile}
                                  onUploadSurat={handleUploadSurat}
                                  onDelete={handleDelete}
                                  onViewPdf={handleViewPdf}
                                  getStatusBadge={getStatusBadge}
                                  imageBaseUrl={imageBaseUrl}
                                  isSubmitted={isSubmitted}
                                  uploadForms={uploadForms}
                                  updateUploadForm={updateUploadForm}
                                  formatRupiah={formatRupiah}
                                />
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                  <p className="text-sm text-gray-600">
                    {(() => {
                      const uniqueKegiatanIds = new Set();
                      proposals.forEach(p => {
                        p.kegiatan_list?.forEach(k => {
                          if (k.jenis_kegiatan === 'non_infrastruktur') {
                            uniqueKegiatanIds.add(k.id);
                          }
                        });
                      });
                      return uniqueKegiatanIds.size;
                    })()} dari {nonInfrastrukturData.length} program
                  </p>
                </div>
              </div>
              <div className="px-4 py-2 bg-white rounded-xl shadow-md border border-gray-100">
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-fuchsia-600 bg-clip-text text-transparent">
                  {(() => {
                    const uniqueKegiatanIds = new Set();
                    proposals.forEach(p => {
                      p.kegiatan_list?.forEach(k => {
                        if (k.jenis_kegiatan === 'non_infrastruktur') {
                          uniqueKegiatanIds.add(k.id);
                        }
                      });
                    });
                    return uniqueKegiatanIds.size;
                  })()}/{nonInfrastrukturData.length}
                </span>
              </div>
            </button>
          
            <div className={`transition-all duration-500 ease-in-out ${expandedNonInfra ? 'max-h-[10000px] opacity-100' : 'max-h-0 opacity-0'}`} style={{ overflow: expandedNonInfra && !dropdownOpenNonInfra ? 'visible' : (expandedNonInfra && dropdownOpenNonInfra ? 'visible' : 'hidden') }}>
              {/* Daftar Proposal yang Sudah Diupload */}
              {proposals.filter(p => p.kegiatan_list?.some(k => k.jenis_kegiatan === 'non_infrastruktur')).length > 0 && (
                <div className="border-b border-gray-200">
                  <button
                    onClick={() => setExpandedProposalListNonInfra(!expandedProposalListNonInfra)}
                    className="w-full p-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between group"
                  >
                    <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                      <LuFileText className="w-4 h-4" />
                      Proposal yang Sudah Diupload ({proposals.filter(p => p.kegiatan_list?.some(k => k.jenis_kegiatan === 'non_infrastruktur')).length})
                    </h4>
                    {expandedProposalListNonInfra ? 
                      <LuChevronDown className="w-5 h-5 text-gray-500 group-hover:text-gray-700" /> : 
                      <LuChevronRight className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
                    }
                  </button>
                  <div className={`transition-all duration-300 ${expandedProposalListNonInfra ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`} style={{ overflow: expandedProposalListNonInfra ? 'visible' : 'hidden' }}>
                    <div className="p-4 bg-gray-50 space-y-2">
                    {proposals.filter(p => p.kegiatan_list?.some(k => k.jenis_kegiatan === 'non_infrastruktur')).map((proposal) => (
                      <div key={proposal.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="font-bold text-gray-900 text-base leading-tight">{proposal.judul_proposal}</p>
                              {proposal.kegiatan_list && proposal.kegiatan_list.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {proposal.kegiatan_list.map((kegiatan) => (
                                    <span 
                                      key={kegiatan.id}
                                      className={`px-2 py-1 rounded text-xs font-medium ${
                                        kegiatan.jenis_kegiatan === 'infrastruktur' 
                                          ? 'bg-blue-100 text-blue-700' 
                                          : 'bg-purple-100 text-purple-700'
                                      }`}
                                    >
                                      {kegiatan.nama_kegiatan.substring(0, 30)}...
                                    </span>
                                  ))}
                                </div>
                              )}
                              <p className="text-xs text-gray-500 mt-2">
                                {new Date(proposal.created_at).toLocaleDateString('id-ID', { 
                                  day: 'numeric', 
                                  month: 'short', 
                                  year: 'numeric' 
                                })}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              {getStatusBadge(proposal)}
                              {proposal.anggaran_usulan && (
                                <span className="text-xs font-semibold text-green-600">
                                  Rp {new Intl.NumberFormat('id-ID').format(proposal.anggaran_usulan)}
                                </span>
                              )}
                              <button
                                onClick={() => {
                                  const apiBaseUrl = imageBaseUrl.replace(/\/api$/, '');
                                  window.open(`${apiBaseUrl}/storage/uploads/bankeu/${proposal.file_proposal}`, '_blank');
                                }}
                                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1.5 text-xs font-medium transition-all"
                              >
                                <LuEye className="w-3 h-3" />
                                Lihat
                              </button>
                            </div>
                          </div>

                          {/* Catatan Dinas */}
                          {proposal.dinas_catatan && (proposal.dinas_status === 'rejected' || proposal.dinas_status === 'revision') && (
                            <div className="mt-3 p-3 bg-red-50 border-l-3 border-red-400 rounded">
                              <div className="flex items-start gap-2">
                                <LuInfo className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-red-800 mb-1">
                                    Catatan Dinas {proposal.dinas_status === 'rejected' ? '(Ditolak)' : '(Revisi)'}
                                  </p>
                                  <p className="text-sm text-red-700">{proposal.dinas_catatan}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Catatan Kecamatan */}
                          {proposal.kecamatan_catatan && (proposal.kecamatan_status === 'rejected' || proposal.kecamatan_status === 'revision') && (
                            <div className="mt-3 p-3 bg-purple-50 border-l-3 border-purple-400 rounded">
                              <div className="flex items-start gap-2">
                                <LuInfo className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-purple-800 mb-1">
                                    Catatan Kecamatan {proposal.kecamatan_status === 'rejected' ? '(Ditolak)' : '(Revisi)'}
                                  </p>
                                  <p className="text-sm text-purple-700">{proposal.kecamatan_catatan}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Form Upload Ulang */}
                          {(
                            ((proposal.dinas_status === "rejected" || proposal.dinas_status === "revision") && !proposal.submitted_to_dinas_at) ||
                            ((proposal.kecamatan_status === "rejected" || proposal.kecamatan_status === "revision") && !proposal.submitted_to_kecamatan)
                          ) && (
                            <div className="mt-3 bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border-2 border-orange-300">
                              <div className="flex items-center gap-2 mb-3">
                                <LuRefreshCw className="w-5 h-5 text-orange-600" />
                                <span className="font-bold text-orange-900 text-base">Upload Ulang Proposal</span>
                                {(proposal.dinas_status === 'revision' || proposal.dinas_status === 'rejected') && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-purple-100 border border-purple-300 rounded-lg ml-auto">
                                    <LuInfo className="w-3 h-3 text-purple-700" />
                                    <span className="text-xs font-bold text-purple-800">Dari DINAS</span>
                                  </div>
                                )}
                                {(proposal.kecamatan_status === 'revision' || proposal.kecamatan_status === 'rejected') && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 border border-blue-300 rounded-lg ml-auto">
                                    <LuInfo className="w-3 h-3 text-blue-700" />
                                    <span className="text-xs font-bold text-blue-800">Dari KECAMATAN</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-2 gap-3 mb-3">
                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-orange-800">Nama Kegiatan Baru (opsional)</label>
                                  <input
                                    type="text"
                                    value={uploadForms[proposal.id]?.nama_kegiatan || ''}
                                    onChange={(e) => updateUploadForm(proposal.id, 'nama_kegiatan', e.target.value)}
                                    placeholder="Kosongkan jika tidak diubah"
                                    className="w-full px-3 py-2 text-sm border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 bg-white"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-orange-800">Volume Baru (opsional)</label>
                                  <input
                                    type="text"
                                    value={uploadForms[proposal.id]?.volume || ''}
                                    onChange={(e) => updateUploadForm(proposal.id, 'volume', e.target.value)}
                                    placeholder="Kosongkan jika tidak diubah"
                                    className="w-full px-3 py-2 text-sm border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 bg-white"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-orange-800">Lokasi Baru (opsional)</label>
                                  <input
                                    type="text"
                                    value={uploadForms[proposal.id]?.lokasi || ''}
                                    onChange={(e) => updateUploadForm(proposal.id, 'lokasi', e.target.value)}
                                    placeholder="Kosongkan jika tidak diubah"
                                    className="w-full px-3 py-2 text-sm border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 bg-white"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-xs font-semibold text-orange-800">Anggaran Baru (opsional)</label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm font-medium">Rp</span>
                                    <input
                                      type="text"
                                      value={formatRupiah(uploadForms[proposal.id]?.anggaran || '')}
                                      onChange={(e) => updateUploadForm(proposal.id, 'anggaran', e.target.value.replace(/\D/g, ''))}
                                      placeholder="Kosongkan jika tidak diubah"
                                      className="w-full pl-10 pr-3 py-2 text-sm border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 bg-white"
                                    />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <input
                                  type="file"
                                  accept=".pdf"
                                  onChange={(e) => {
                                    const file = e.target.files[0];
                                    if (file) {
                                      handleRevisionUpload(proposal, proposal.kegiatan_list[0], file);
                                      e.target.value = null;
                                    }
                                  }}
                                  className="hidden"
                                  id={`file-revision-compact-noninf-${proposal.id}`}
                                />
                                <label
                                  htmlFor={`file-revision-compact-noninf-${proposal.id}`}
                                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg font-semibold text-sm hover:from-orange-700 hover:to-red-700 cursor-pointer transition-all shadow-md"
                                >
                                  <LuUpload className="w-4 h-4" />
                                  Pilih File PDF Baru
                                </label>
                                <p className="text-xs text-gray-600">
                                  Max 5MB • Setelah upload, gunakan tombol <strong>"Kirim ke Dinas Terkait"</strong> di atas
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Tombol Upload Proposal Baru - Flow 3 Step */}
              {!isSubmitted && (
                <div className="p-6">
                  <button
                    onClick={() => {
                      setShowUploadFormNonInfra(!showUploadFormNonInfra);
                      if (!showUploadFormNonInfra) {
                        setSelectedKegiatanIdNonInfra('');
                      }
                    }}
                    className="w-full px-6 py-4 bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white rounded-xl hover:from-purple-700 hover:to-fuchsia-700 flex items-center justify-center gap-3 font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:scale-[1.02]"
                  >
                    <LuUpload className="w-6 h-6" />
                    {showUploadFormNonInfra ? 'Tutup Form' : 'Tambah Proposal Non-Infrastruktur Baru'}
                  </button>

                  {/* Dropdown & Form Upload Inline */}
                  {showUploadFormNonInfra && (
                    <div className="mt-4 p-4 sm:p-6 bg-white rounded-2xl border-2 border-purple-300 shadow-xl transition-all duration-300">
                      <div className="space-y-5">
                        {/* Dropdown Pilih Program */}
                        <div className={`dropdown-container-noninf relative ${dropdownOpenNonInfra ? 'mb-96' : 'mb-6'}`}>
                          <label className="flex items-center gap-3 text-lg sm:text-xl font-bold text-purple-900 mb-4">
                            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-full shadow-md">
                              <span className="text-base font-bold">1</span>
                            </div>
                            <span>Pilih Program Non-Infrastruktur</span>
                          </label>
                          <div className="relative">
                            {/* Custom Dropdown Button */}
                            <button
                              ref={dropdownButtonRefNonInfra}
                              type="button"
                              onClick={() => setDropdownOpenNonInfra(!dropdownOpenNonInfra)}
                              className="w-full pl-5 pr-12 py-5 bg-gradient-to-r from-purple-50 to-fuchsia-50 border-2 border-purple-300 rounded-xl text-base sm:text-lg font-semibold text-left shadow-sm focus:outline-none focus:ring-4 focus:ring-purple-200 focus:border-purple-500 hover:border-purple-400 transition-all duration-200 cursor-pointer"
                            >
                              <span className={selectedKegiatanIdNonInfra ? 'text-gray-800' : 'text-gray-500'}>
                                {selectedKegiatanIdNonInfra 
                                  ? (() => {
                                      const selected = nonInfrastrukturData.find(i => i.kegiatan.id.toString() === selectedKegiatanIdNonInfra);
                                      const name = selected?.kegiatan.nama_kegiatan || '';
                                      return name.length > 100 ? name.substring(0, 100) + '...' : name;
                                    })()
                                  : '-- Pilih Salah Satu Program --'
                                }
                              </span>
                            </button>
                            {/* Custom Dropdown Arrow */}
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                              <svg 
                                className={`w-7 h-7 text-purple-600 transition-transform duration-200 ${dropdownOpenNonInfra ? 'rotate-180' : ''}`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                            
                            {/* Dropdown Menu with Scroll - Fixed Position */}
                            {dropdownOpenNonInfra && (
                              <div className="absolute left-0 right-0 top-full mt-2 z-50 bg-white border-2 border-purple-300 rounded-xl shadow-2xl overflow-hidden">
                                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                    {nonInfrastrukturData.map((item, idx) => (
                                      <button
                                        key={item.kegiatan.id}
                                        type="button"
                                        onClick={() => {
                                          setSelectedKegiatanIdNonInfra(item.kegiatan.id.toString());
                                          setDropdownOpenNonInfra(false);
                                        }}
                                        className={`w-full px-5 py-4 text-left text-base sm:text-lg font-medium transition-colors leading-relaxed ${
                                          selectedKegiatanIdNonInfra === item.kegiatan.id.toString()
                                            ? 'bg-purple-100 text-purple-900 font-semibold'
                                            : 'text-gray-800 hover:bg-purple-50'
                                        } ${idx !== nonInfrastrukturData.length - 1 ? 'border-b border-gray-200' : 'mb-2'}`}
                                      >
                                        <span className="block">
                                          {item.kegiatan.nama_kegiatan}
                                        </span>
                                      </button>
                                    ))}
                                </div>
                              </div>
                            )}
                          </div>
                          {selectedKegiatanIdNonInfra && (
                            <p className="mt-3 text-sm sm:text-base text-gray-600 flex items-center gap-2">
                              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Program terpilih. Silakan isi detail proposal di bawah.
                            </p>
                          )}
                        </div>

                        {/* Form Input - Muncul setelah pilih program */}
                        {selectedKegiatanIdNonInfra && (
                          <div className="pt-5 border-t-2 border-purple-200">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="flex items-center justify-center w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-full shadow-md">
                                <span className="text-sm font-bold">2</span>
                              </div>
                              <h4 className="text-base sm:text-lg font-bold text-gray-900">
                                Isi Detail Proposal
                              </h4>
                            </div>
                            {/* Reuse KegiatanRow component untuk form */}
                            {(() => {
                              const selectedItem = nonInfrastrukturData.find(i => i.kegiatan.id.toString() === selectedKegiatanIdNonInfra);
                              if (!selectedItem) return null;
                              return (
                                <KegiatanRow
                                  key={`upload-noninf-${selectedItem.kegiatan.id}`}
                                  item={selectedItem}
                                  index={0}
                                  onUpload={handleUpload}
                                  onRevisionUpload={handleRevisionUpload}
                                  onReplaceFile={handleReplaceFile}
                                  onUploadSurat={handleUploadSurat}
                                  onDelete={handleDelete}
                                  onViewPdf={handleViewPdf}
                                  getStatusBadge={getStatusBadge}
                                  imageBaseUrl={imageBaseUrl}
                                  isSubmitted={isSubmitted}
                                  uploadForms={uploadForms}
                                  updateUploadForm={updateUploadForm}
                                  formatRupiah={formatRupiah}
                                />
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Modal Contoh Proposal */}
      <ContohProposalModal
        show={showContohModal}
        onClose={() => setShowContohModal(false)}
        contohFiles={contohFiles}
        onDownload={handleDownloadContoh}
      />

      {/* Modal PDF Viewer */}
      <PdfViewerModal
        show={showPdfModal}
        onClose={handleClosePdfModal}
        pdfData={selectedPdf}
      />
    </>
  );
};

// Kegiatan Row Component
const KegiatanRow = ({ item, index, onUpload, onRevisionUpload, onReplaceFile, onUploadSurat, onDelete, onViewPdf, getStatusBadge, imageBaseUrl, isSubmitted, uploadForms, updateUploadForm, formatRupiah }) => {
  const { kegiatan, proposal } = item;
  const formData = uploadForms[kegiatan.id] || {};
  const [showReplaceForm, setShowReplaceForm] = React.useState(false);

  // Parse kegiatan untuk mendapat list judul yang mungkin
  const titleOptions = React.useMemo(() => parseKegiatanTitles(kegiatan.nama_kegiatan), [kegiatan.nama_kegiatan]);
  const hasMultipleOptions = titleOptions.length > 1;

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

  const handleRevisionFileSelect = (e) => {
    const file = e.target.files[0];
    console.log("Revision file selected:", file);
    console.log("Proposal:", proposal);
    console.log("Kegiatan:", kegiatan);
    console.log("Form data:", formData);
    if (file && proposal) {
      onRevisionUpload(proposal, kegiatan, file);
      // Reset input file setelah upload
      e.target.value = null;
    }
  };

  const handleReplaceFileSelect = (e) => {
    const file = e.target.files[0];
    console.log("Replace file selected:", file);
    console.log("Proposal:", proposal);
    console.log("Kegiatan:", kegiatan);
    console.log("Form data:", formData);
    if (file && proposal) {
      const newAnggaran = formData.anggaran ? formData.anggaran.replace(/\D/g, '') : null;
      onReplaceFile(proposal, kegiatan, file, newAnggaran);
      // Reset input file dan form setelah upload
      e.target.value = null;
      setShowReplaceForm(false);
    }
  };

  return (
    <div 
      className="p-6 hover:bg-gray-50 transition-all border-b border-gray-100 last:border-b-0"
      data-kegiatan-id={kegiatan.id}
    >
      {proposal ? (
        // Proposal sudah ada - Layout simpel dan elegan
        <div className="space-y-3">
          {/* Main Info */}
          <div className="flex items-start justify-between gap-4">
            {/* Judul & Detail */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h4 className="text-base font-bold text-gray-900 leading-tight">{kegiatan.nama_kegiatan}</h4>
                {proposal.status === 'pending' && !proposal.submitted_to_kecamatan && !proposal.submitted_to_dinas_at && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-600 rounded text-xs font-medium">
                    <LuCheck className="w-3 h-3" />
                    Siap
                  </span>
                )}
              </div>
              
              {/* Nama Kegiatan Spesifik */}
              {proposal.nama_kegiatan_spesifik && (
                <p className="text-sm text-gray-700 font-medium flex items-center gap-2">
                  <LuFileText className="w-4 h-4 text-gray-400" />
                  {proposal.nama_kegiatan_spesifik}
                </p>
              )}
              
              {/* Volume & Lokasi in one line */}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {proposal.volume && (
                  <span className="flex items-center gap-1.5">
                    <LuPackage className="w-4 h-4 text-gray-400" />
                    {proposal.volume}
                  </span>
                )}
                {proposal.lokasi && (
                  <span className="flex items-center gap-1.5">
                    <LuMapPin className="w-4 h-4 text-gray-400" />
                    {proposal.lokasi}
                  </span>
                )}
                {proposal.anggaran_usulan && (
                  <span className="flex items-center gap-1.5 text-green-600 font-medium">
                    <LuDollarSign className="w-4 h-4" />
                    Rp {new Intl.NumberFormat("id-ID").format(proposal.anggaran_usulan)}
                  </span>
                )}
              </div>
              
              <p className="text-xs text-gray-500">
                Upload: {new Date(proposal.created_at).toLocaleDateString("id-ID", { 
                  day: 'numeric', month: 'short', year: 'numeric'
                })}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onViewPdf(proposal, kegiatan.nama_kegiatan)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 font-medium text-sm shadow-sm transition-all"
              >
                <LuEye className="w-4 h-4" />
                Lihat
              </button>

              {!isSubmitted && proposal.status === "pending" && (
                <>
                  <button
                    onClick={() => setShowReplaceForm(!showReplaceForm)}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 flex items-center gap-2 font-medium text-sm shadow-sm transition-all"
                  >
                    <LuRefreshCw className="w-4 h-4" />
                    Ganti
                  </button>
                  <button
                    onClick={() => onDelete(proposal.id)}
                    className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all"
                  >
                    <LuTrash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Form Ganti File - layout simpel */}
          {!isSubmitted && proposal.status === "pending" && showReplaceForm && (
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <LuRefreshCw className="w-5 h-5 text-amber-600" />
                  <span className="font-semibold text-amber-900">Ganti File Proposal</span>
                </div>
                
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={formatRupiah(formData.anggaran || '')}
                    onChange={(e) => updateUploadForm(kegiatan.id, 'anggaran', e.target.value.replace(/\D/g, ''))}
                    placeholder="Anggaran baru (opsional)"
                    className="w-48 px-3 py-2 text-sm border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-300 focus:border-amber-400 bg-white"
                  />

                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleReplaceFileSelect}
                    className="hidden"
                    id={`file-replace-${kegiatan.id}`}
                  />
                  <label
                    htmlFor={`file-replace-${kegiatan.id}`}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg font-medium text-sm hover:bg-amber-700 cursor-pointer transition-all"
                  >
                    <LuUpload className="w-4 h-4" />
                    Pilih File
                  </label>
                  <button
                    onClick={() => setShowReplaceForm(false)}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-300 transition-all"
                  >
                    Batal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Upload Surat Pengantar & Surat Permohonan */}
          {!isSubmitted && proposal.status === "pending" && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <LuFileText className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-blue-900">Dokumen Pendukung</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Surat Pengantar */}
                <div className="bg-white p-3 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label className="text-sm font-medium text-gray-700">Surat Pengantar</label>
                    {proposal.surat_pengantar && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                        <LuCheck className="w-3 h-3" />
                        Uploaded
                      </span>
                    )}
                  </div>
                  
                  {proposal.surat_pengantar ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={`${imageBaseUrl}/storage/uploads/bankeu/${proposal.surat_pengantar}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm font-medium transition-all"
                      >
                        <LuEye className="w-4 h-4" />
                        Lihat PDF
                      </a>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            onUploadSurat(proposal.id, 'pengantar', file);
                            e.target.value = null;
                          }
                        }}
                        className="hidden"
                        id={`surat-pengantar-replace-${proposal.id}`}
                      />
                      <label
                        htmlFor={`surat-pengantar-replace-${proposal.id}`}
                        className="px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 cursor-pointer transition-all"
                        title="Ganti Surat"
                      >
                        <LuRefreshCw className="w-4 h-4" />
                      </label>
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            onUploadSurat(proposal.id, 'pengantar', file);
                            e.target.value = null;
                          }
                        }}
                        className="hidden"
                        id={`surat-pengantar-${proposal.id}`}
                      />
                      <label
                        htmlFor={`surat-pengantar-${proposal.id}`}
                        className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-center text-sm font-medium transition-all"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <LuUpload className="w-4 h-4" />
                          Upload PDF
                        </div>
                      </label>
                    </>
                  )}
                  <p className="text-xs text-gray-500 mt-2">Max 5MB, Format PDF</p>
                </div>

                {/* Surat Permohonan */}
                <div className="bg-white p-3 rounded-lg border border-blue-100">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label className="text-sm font-medium text-gray-700">Surat Permohonan</label>
                    {proposal.surat_permohonan && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs font-medium">
                        <LuCheck className="w-3 h-3" />
                        Uploaded
                      </span>
                    )}
                  </div>
                  
                  {proposal.surat_permohonan ? (
                    <div className="flex items-center gap-2">
                      <a
                        href={`${imageBaseUrl}/storage/uploads/bankeu/${proposal.surat_permohonan}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 text-sm font-medium transition-all"
                      >
                        <LuEye className="w-4 h-4" />
                        Lihat PDF
                      </a>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            onUploadSurat(proposal.id, 'permohonan', file);
                            e.target.value = null;
                          }
                        }}
                        className="hidden"
                        id={`surat-permohonan-replace-${proposal.id}`}
                      />
                      <label
                        htmlFor={`surat-permohonan-replace-${proposal.id}`}
                        className="px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 cursor-pointer transition-all"
                        title="Ganti Surat"
                      >
                        <LuRefreshCw className="w-4 h-4" />
                      </label>
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        accept=".pdf"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            onUploadSurat(proposal.id, 'permohonan', file);
                            e.target.value = null;
                          }
                        }}
                        className="hidden"
                        id={`surat-permohonan-${proposal.id}`}
                      />
                      <label
                        htmlFor={`surat-permohonan-${proposal.id}`}
                        className="block w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer text-center text-sm font-medium transition-all"
                      >
                        <div className="flex items-center justify-center gap-2">
                          <LuUpload className="w-4 h-4" />
                          Upload PDF
                        </div>
                      </label>
                    </>
                  )}
                  <p className="text-xs text-gray-500 mt-2">Max 5MB, Format PDF</p>
                </div>
              </div>
            </div>
          )}

          {/* Catatan - Simplified dengan icon */}
          {proposal.dinas_catatan && (proposal.dinas_status === 'rejected' || proposal.dinas_status === 'revision') && (
            <div className="p-3 bg-red-50 border-l-3 border-red-400 rounded">
              <div className="flex items-start gap-2">
                <LuInfo className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-red-800 mb-1">
                    Catatan Dinas {proposal.dinas_status === 'rejected' ? '(Ditolak)' : '(Revisi)'}
                  </p>
                  <p className="text-sm text-red-700">{proposal.dinas_catatan}</p>
                </div>
              </div>
            </div>
          )}
          
          {proposal.kecamatan_catatan && (proposal.kecamatan_status === 'rejected' || proposal.kecamatan_status === 'revision') && (
            <div className="p-3 bg-purple-50 border-l-3 border-purple-400 rounded">
              <div className="flex items-start gap-2">
                <LuInfo className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-purple-800 mb-1">
                    Catatan Kecamatan {proposal.kecamatan_status === 'rejected' ? '(Ditolak)' : '(Revisi)'}
                  </p>
                  <p className="text-sm text-purple-700">{proposal.kecamatan_catatan}</p>
                </div>
              </div>
            </div>
          )}
          
          {proposal.catatan_verifikasi && (proposal.status === 'rejected' || proposal.status === 'revision') && (
            <div className="p-3 bg-orange-50 border-l-3 border-orange-400 rounded">
              <div className="flex items-start gap-2">
                <LuInfo className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-orange-800 mb-1">
                    Catatan Umum {proposal.status === 'rejected' ? '(Ditolak)' : '(Revisi)'}
                  </p>
                  <p className="text-sm text-orange-700">{proposal.catatan_verifikasi}</p>
                </div>
              </div>
            </div>
          )}

          {/* Pesan untuk proposal yang sudah di-upload ulang (pending setelah revisi) */}
          {proposal.status === 'pending' && !proposal.submitted_to_kecamatan && proposal.verified_at && (
            <div className="p-3 bg-green-50 border-l-4 border-green-400 rounded-lg">
              <div className="flex items-center gap-2">
                <LuCheck className="w-4 h-4 text-green-600" />
                <p className="text-sm text-green-700">
                  <span className="font-semibold">Revisi sudah diupload!</span> Gunakan tombol <strong>"Kirim ke Dinas Terkait"</strong> di bagian atas untuk mengirim proposal ini.
                </p>
              </div>
            </div>
          )}

          {/* Form Upload Ulang - Horizontal - Muncul jika: 1) Kecamatan reject/revisi ATAU 2) Dinas reject/revisi */}
          {(
            ((proposal.dinas_status === "rejected" || proposal.dinas_status === "revision") && !proposal.submitted_to_dinas_at) ||
            ((proposal.kecamatan_status === "rejected" || proposal.kecamatan_status === "revision") && !proposal.submitted_to_kecamatan) ||
            ((proposal.status === "rejected" || proposal.status === "revision") && !proposal.submitted_to_dinas_at)
          ) && (
            <div className="bg-gradient-to-r from-orange-50 to-red-50 p-4 rounded-lg border-2 border-orange-300">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <LuRefreshCw className="w-5 h-5 text-orange-600" />
                  <span className="font-bold text-orange-900 text-base">Upload Ulang Proposal</span>
                </div>
                
                {/* Badge Info: Dari mana revisi berasal - NEW FLOW 2026-01-30 */}
                {(proposal.dpmd_status === 'revision' || proposal.dpmd_status === 'rejected') ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 border-2 border-red-300 rounded-lg">
                    <LuInfo className="w-4 h-4 text-red-700" />
                    <span className="text-xs font-bold text-red-800">Revisi dari DPMD → Kirim Ulang</span>
                  </div>
                ) : (proposal.kecamatan_status === 'revision' || proposal.kecamatan_status === 'rejected') ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 border-2 border-blue-300 rounded-lg">
                    <LuInfo className="w-4 h-4 text-blue-700" />
                    <span className="text-xs font-bold text-blue-800">Revisi dari KECAMATAN → Kirim Ulang</span>
                  </div>
                ) : (proposal.dinas_status === 'revision' || proposal.dinas_status === 'rejected') ? (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 border-2 border-purple-300 rounded-lg">
                    <LuInfo className="w-4 h-4 text-purple-700" />
                    <span className="text-xs font-bold text-purple-800">Revisi dari DINAS TERKAIT → Kirim Ulang</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-100 border-2 border-orange-300 rounded-lg">
                    <LuInfo className="w-4 h-4 text-orange-700" />
                    <span className="text-xs font-bold text-orange-800">Perlu Revisi → Kirim Ulang</span>
                  </div>
                )}
              </div>
              
              {/* Form input untuk revisi */}
              <div className="grid grid-cols-2 gap-3">
                {/* Nama Kegiatan */}
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-orange-800">Nama Kegiatan Baru</label>
                  <input
                    type="text"
                    value={formData.nama_kegiatan || ''}
                    onChange={(e) => updateUploadForm(kegiatan.id, 'nama_kegiatan', e.target.value)}
                    placeholder="Nama kegiatan baru"
                    className="w-full px-3 py-2.5 text-sm border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 bg-white transition-all font-medium"
                  />
                </div>

                {/* Volume */}
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-orange-800">Volume Baru</label>
                  <input
                    type="text"
                    value={formData.volume || ''}
                    onChange={(e) => updateUploadForm(kegiatan.id, 'volume', e.target.value)}
                    placeholder="Volume baru"
                    className="w-full px-3 py-2.5 text-sm border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 bg-white transition-all font-medium"
                  />
                </div>

                {/* Lokasi */}
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-orange-800">Lokasi Baru</label>
                  <input
                    type="text"
                    value={formData.lokasi || ''}
                    onChange={(e) => updateUploadForm(kegiatan.id, 'lokasi', e.target.value)}
                    placeholder="Lokasi baru"
                    className="w-full px-3 py-2.5 text-sm border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 bg-white transition-all font-medium"
                  />
                </div>

                {/* Anggaran */}
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-orange-800">Anggaran Baru</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 text-sm font-medium">Rp</span>
                    <input
                      type="text"
                      value={formatRupiah(formData.anggaran || '')}
                      onChange={(e) => updateUploadForm(kegiatan.id, 'anggaran', e.target.value.replace(/\D/g, ''))}
                      placeholder="Anggaran baru"
                      className="w-full pl-10 pr-3 py-2.5 text-sm border-2 border-orange-200 rounded-lg focus:ring-2 focus:ring-orange-200 focus:border-orange-500 bg-white transition-all font-medium"
                    />
                  </div>
                </div>
              </div>
              
              {/* Upload button */}
              <div className="flex justify-end mt-3">
                <div>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleRevisionFileSelect}
                    className="hidden"
                    id={`file-revisi-${kegiatan.id}`}
                  />
                  <label
                    htmlFor={`file-revisi-${kegiatan.id}`}
                    className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg font-bold text-sm shadow-lg transition-all cursor-pointer hover:from-orange-600 hover:to-red-700 hover:shadow-xl transform hover:scale-105 active:scale-95 whitespace-nowrap"
                  >
                    <LuRefreshCw className="w-5 h-5" />
                    Upload Ulang
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        // Form upload - Layout simpel
        <div className="space-y-4">
          {/* Judul Kegiatan Master */}
          <div>
            <p className="text-base font-bold text-gray-900 mb-3 leading-tight">{kegiatan.nama_kegiatan}</p>
          </div>

          {/* Dropdown pilihan judul (jika ada /) */}
          {hasMultipleOptions && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">1. Pilih Judul Kegiatan <span className="text-red-500">*</span></label>
              <select
                value={formData.judul_kegiatan || ''}
                onChange={(e) => updateUploadForm(kegiatan.id, 'judul_kegiatan', e.target.value)}
                disabled={isSubmitted}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">-- Pilih Judul --</option>
                {titleOptions.map((title, idx) => (
                  <option key={idx} value={title}>{title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Input fields dalam grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Nama Kegiatan */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">2. Nama Kegiatan <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.nama_kegiatan || ''}
                onChange={(e) => updateUploadForm(kegiatan.id, 'nama_kegiatan', e.target.value)}
                placeholder="Contoh: Pembangunan Jalan"
                disabled={isSubmitted}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Volume */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">3. Volume <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.volume || ''}
                onChange={(e) => updateUploadForm(kegiatan.id, 'volume', e.target.value)}
                placeholder="Contoh: 500 m"
                disabled={isSubmitted}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Lokasi */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">4. Lokasi <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={formData.lokasi || ''}
                onChange={(e) => updateUploadForm(kegiatan.id, 'lokasi', e.target.value)}
                placeholder="Contoh: Kampung Baru"
                disabled={isSubmitted}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Anggaran */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">5. Anggaran <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">Rp</span>
                <input
                  type="text"
                  value={formatRupiah(formData.anggaran || '')}
                  onChange={(e) => updateUploadForm(kegiatan.id, 'anggaran', e.target.value.replace(/\D/g, ''))}
                  placeholder="0"
                  disabled={isSubmitted}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          {/* Upload Button */}
          <div className="flex justify-end pt-2">
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
              className={`flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg font-medium text-sm shadow-sm transition-all ${
                isSubmitted ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'hover:bg-green-700 cursor-pointer'
              }`}
            >
              <LuUpload className="w-4 h-4" />
              Upload Proposal
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

// Modal Contoh Proposal Component
const ContohProposalModal = ({ show, onClose, contohFiles, onDownload }) => {
  if (!show) return null;

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-30 rounded-lg flex items-center justify-center shadow-sm">
              <LuDownload className="w-5 h-5 text-gray-800" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Contoh Proposal Bantuan Keuangan</h2>
              <p className="text-sm text-white text-opacity-90">Download template dan contoh dokumen</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white bg-opacity-30 hover:bg-opacity-40 rounded-lg flex items-center justify-center transition-all shadow-sm"
          >
            <LuX className="w-5 h-5 text-gray-800 font-bold" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Cover Proposal */}
          {contohFiles.cover && contohFiles.cover.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <LuImage className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-gray-900 text-lg">Cover Proposal</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {contohFiles.cover.map((file, idx) => (
                  <button
                    key={idx}
                    onClick={() => onDownload(file)}
                    className="flex items-center gap-3 p-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 rounded-xl border border-purple-200 transition-all group"
                  >
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <LuImage className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900 text-sm group-hover:text-purple-700 transition-colors">
                        {file.display_name}
                      </p>
                      <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                    </div>
                    <LuDownload className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dokumen Desa */}
          {contohFiles.desa && contohFiles.desa.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <LuFileText className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-gray-900 text-lg">Template Dokumen Desa</h3>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {contohFiles.desa.map((file, idx) => (
                  <button
                    key={idx}
                    onClick={() => onDownload(file)}
                    className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 rounded-xl border border-blue-200 transition-all group"
                  >
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <LuFileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900 text-sm group-hover:text-blue-700 transition-colors">
                        {file.display_name}
                      </p>
                      <p className="text-xs text-gray-500">{file.extension.toUpperCase()} • {formatFileSize(file.size)}</p>
                    </div>
                    <LuDownload className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dokumen Kecamatan (Referensi) */}
          {contohFiles.kecamatan && contohFiles.kecamatan.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <LuFileText className="w-5 h-5 text-green-600" />
                <h3 className="font-bold text-gray-900 text-lg">Referensi Dokumen Kecamatan</h3>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-semibold">
                  Info
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {contohFiles.kecamatan.map((file, idx) => (
                  <button
                    key={idx}
                    onClick={() => onDownload(file)}
                    className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 rounded-xl border border-green-200 transition-all group"
                  >
                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center flex-shrink-0">
                      <LuFileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-gray-900 text-sm group-hover:text-green-700 transition-colors">
                        {file.display_name}
                      </p>
                      <p className="text-xs text-gray-500">{file.extension.toUpperCase()} • {formatFileSize(file.size)}</p>
                    </div>
                    <LuDownload className="w-5 h-5 text-green-600 group-hover:scale-110 transition-transform" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              <span className="font-semibold">💡 Tips:</span> Download dan isi template sesuai kebutuhan desa Anda
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold text-sm transition-all"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// PDF Viewer Modal Component
const PdfViewerModal = ({ show, onClose, pdfData }) => {
  if (!show || !pdfData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-2 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] sm:h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white bg-opacity-30 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
              <LuEye className="w-4 h-4 sm:w-5 sm:h-5 text-gray-800" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xs sm:text-sm md:text-base font-bold text-white truncate">{pdfData.title}</h2>
              <p className="text-xs sm:text-sm text-white text-opacity-90 hidden sm:block">Preview Proposal</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white bg-opacity-30 hover:bg-opacity-40 rounded-lg flex items-center justify-center transition-all shadow-sm flex-shrink-0"
            title="Tutup"
          >
            <LuX className="w-5 h-5 text-gray-800 font-bold" />
          </button>
        </div>

        {/* PDF Content */}
        <div className="flex-1 overflow-hidden bg-gray-100 relative">
          <iframe
            src={pdfData.url}
            className="w-full h-full border-0"
            title={pdfData.title}
          />
        </div>

        {/* Footer - Responsive */}
        <div className="bg-gray-50 px-3 sm:px-6 py-2 sm:py-3 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 flex-shrink-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 w-full sm:w-auto">
            <span className="flex items-center gap-2 flex-shrink-0">
              <span className="font-semibold">Status:</span>
              {pdfData.proposal.status === 'verified' && <span className="text-green-600 font-medium">✓ Disetujui</span>}
              {pdfData.proposal.status === 'pending' && <span className="text-yellow-600 font-medium">⏳ Menunggu</span>}
              {pdfData.proposal.status === 'rejected' && <span className="text-red-600 font-medium">✗ Ditolak</span>}
              {pdfData.proposal.status === 'revision' && <span className="text-orange-600 font-medium">↻ Revisi</span>}
            </span>
            <span className="text-gray-400 hidden sm:inline">|</span>
            <span className="flex items-center gap-1">
              <span className="font-semibold">Anggaran:</span>
              <span className="text-green-600 font-medium">Rp {new Intl.NumberFormat("id-ID").format(pdfData.proposal.anggaran_usulan)}</span>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-semibold text-xs sm:text-sm transition-all w-full sm:w-auto"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default BankeuProposalPage;
