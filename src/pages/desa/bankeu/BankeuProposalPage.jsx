import React, { useEffect, useState, useMemo } from "react";
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
  const [expandedStats, setExpandedStats] = useState(true);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [uploadForms, setUploadForms] = useState({});
  const [showContohModal, setShowContohModal] = useState(false);
  const [contohFiles, setContohFiles] = useState({ cover: [], desa: [], kecamatan: [] });
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);

  useEffect(() => {
    fetchData();
    fetchContohProposal();
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
    setSelectedPdf({
      url: `${imageBaseUrl}/storage/uploads/${proposal.file_proposal}`,
      title: kegiatanNama,
      proposal: proposal
    });
    setShowPdfModal(true);
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
      formDataUpload.append("kegiatan_id", kegiatan.id);
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
    const formData = uploadForms[kegiatan.id];
    
    console.log("=== DEBUG REVISION UPLOAD ===");
    console.log("Proposal ID:", proposal.id);
    console.log("Kegiatan:", kegiatan);
    console.log("File:", file);
    console.log("Form Data:", formData);
    
    // Validation
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
      formDataUpload.append("nama_kegiatan_spesifik", formData.nama_kegiatan);
      formDataUpload.append("volume", formData.volume);
      formDataUpload.append("lokasi", formData.lokasi);
      formDataUpload.append("anggaran_usulan", formData.anggaran.replace(/\D/g, ""));

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
        delete newForms[kegiatan.id];
        return newForms;
      });
      
      // Simpan kegiatan ID untuk scroll nanti
      const uploadedKegiatanId = kegiatan.id;

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
          title: 'Mengirim ke Kecamatan...',
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
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  title={expandedStats ? "Tutup statistik" : "Buka statistik"}
                >
                  {expandedStats ? (
                    <LuChevronDown className="w-5 h-5 text-gray-600" />
                  ) : (
                    <LuChevronRight className="w-5 h-5 text-gray-600" />
                  )}
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

        {/* Status Tracking - Tampil di level atas sebelum list kegiatan */}
        <StatusTracking proposals={proposals} />

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
                    key={`desa-infra-${item.kegiatan.id}`}
                    item={item}
                    index={index}
                    onUpload={handleUpload}
                    onRevisionUpload={handleRevisionUpload}
                    onReplaceFile={handleReplaceFile}
                    onDelete={handleDelete}
                    onViewPdf={handleViewPdf}
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
                  key={`desa-non-infra-${item.kegiatan.id}`}
                  item={item}
                  index={index}
                  onUpload={handleUpload}
                  onRevisionUpload={handleRevisionUpload}
                  onReplaceFile={handleReplaceFile}
                  onDelete={handleDelete}
                  onViewPdf={handleViewPdf}
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
const KegiatanRow = ({ item, index, onUpload, onRevisionUpload, onReplaceFile, onDelete, onViewPdf, getStatusBadge, imageBaseUrl, isSubmitted, uploadForms, updateUploadForm, formatRupiah }) => {
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
                <h4 className="text-base font-semibold text-gray-900">{kegiatan.nama_kegiatan}</h4>
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
          {!proposal.submitted_to_kecamatan && (
            (proposal.status === "rejected" || proposal.status === "revision") ||
            (proposal.dinas_status === "rejected" || proposal.dinas_status === "revision")
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
            <p className="text-sm text-gray-500 mb-3">{kegiatan.nama_kegiatan}</p>
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
