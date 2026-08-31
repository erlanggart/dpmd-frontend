import React, { useState, useEffect } from 'react';
import {
  FileText, Download, Search, ChevronDown, ChevronUp, CheckCircle2, XCircle,
  BarChart3, MapPin, Loader2, MessageSquare, Trash2, Users,
} from 'lucide-react';
import api from '../../../../api';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import ChatDrawer from '../../../../components/shared/ChatDrawer';

/**
 * Rekap Proposal Bantuan Keuangan TA 2025 untuk DPMD/SPKED.
 *
 * Sengaja dibuat terpisah dari monitoring LPJ karena alurnya berbeda: proposal
 * 2025 masuk langsung dari desa tanpa verifikasi siapa pun, jadi di sini tidak
 * ada status, tidak ada tombol setujui/tolak/revisi. Yang tersedia hanya
 * melihat siapa yang sudah/belum menyetor, mengunduh berkas, berkirim pesan ke
 * desa, dan menghapus berkas yang salah unggah.
 */

const ENDPOINT = '/dpmd/bankeu-proposal-2025';
const STORAGE_BASE = '/storage/uploads/bankeu_proposal_2025';
const REFERENCE_TYPE = 'bankeu_proposal_2025';

const formatFileSize = (bytes) => {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (tanggal) =>
  tanggal
    ? new Date(tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '-';

const BankeuProposal2025MonitoringPage = ({ tahun = 2025 }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterUnggah, setFilterUnggah] = useState('all'); // all | uploaded | belum
  const [expandedKecamatan, setExpandedKecamatan] = useState({});
  const [menghapus, setMenghapus] = useState(null);
  const [chatProposalId, setChatProposalId] = useState(null);
  const [chatTargetUserId, setChatTargetUserId] = useState(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahun]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`${ENDPOINT}?tahun=${tahun}`);
      if (res.data.success) setData(res.data.data);
    } catch (error) {
      console.error('Error fetching proposal bankeu 2025:', error);
      toast.error('Gagal memuat data proposal');
    } finally {
      setLoading(false);
    }
  };

  const getFileUrl = (filePath) => {
    const baseUrl = api.defaults.baseURL?.replace('/api', '') || '';
    return `${baseUrl}${STORAGE_BASE}/${filePath}`;
  };

  const toggleKecamatan = (kecId) => setExpandedKecamatan(prev => ({ ...prev, [kecId]: !prev[kecId] }));
  const expandAll = () => {
    if (!data?.kecamatan) return;
    setExpandedKecamatan(Object.fromEntries(data.kecamatan.map(k => [k.kecamatan_id, true])));
  };
  const collapseAll = () => setExpandedKecamatan({});

  /* Kecamatan + desa sesuai pencarian & filter unggah */
  const kecamatanTersaring = () => {
    if (!data?.kecamatan) return [];
    const q = searchTerm.trim().toLowerCase();

    return data.kecamatan
      .map(kec => {
        let desaList = kec.desa_list;
        if (filterUnggah === 'uploaded') desaList = desaList.filter(d => d.has_proposal);
        if (filterUnggah === 'belum') desaList = desaList.filter(d => !d.has_proposal);
        if (q && !kec.kecamatan_nama.toLowerCase().includes(q)) {
          desaList = desaList.filter(d => d.desa_nama.toLowerCase().includes(q));
        }
        return { ...kec, desa_list: desaList };
      })
      .filter(kec => kec.desa_list.length > 0);
  };

  const handleHapus = async (proposal, desaNama) => {
    const konfirmasi = await Swal.fire({
      title: 'Hapus berkas proposal?',
      html: `<p style="font-size:14px;color:#475569">Desa <strong>${desaNama}</strong></p>
             <p style="font-size:13px;color:#991B1B;margin-top:6px">📄 ${proposal.nama_file}</p>
             <p style="font-size:12px;color:#64748B;margin-top:8px">Berkas dihapus permanen. Desa harus mengunggah ulang bila masih diperlukan.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#64748b',
      confirmButtonText: '🗑️ Ya, hapus',
      cancelButtonText: 'Batal',
    });
    if (!konfirmasi.isConfirmed) return;

    try {
      setMenghapus(proposal.id);
      const res = await api.delete(`${ENDPOINT}/${proposal.id}`);
      if (res.data.success) {
        toast.success('Berkas proposal dihapus');
        fetchData();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menghapus berkas');
    } finally {
      setMenghapus(null);
    }
  };

  const handleExportExcel = () => {
    if (!data?.kecamatan) return;
    const rows = [];
    data.kecamatan.forEach(kec => {
      kec.desa_list.forEach(desa => {
        if (desa.has_proposal && desa.proposal_files?.length) {
          desa.proposal_files.forEach(berkas => {
            rows.push({
              Kecamatan: kec.kecamatan_nama,
              Desa: desa.desa_nama,
              Status: 'Sudah Upload',
              'Nama File': berkas.nama_file,
              'Ukuran File': formatFileSize(berkas.file_size),
              Keterangan: berkas.keterangan || '-',
              'Diunggah Oleh': berkas.uploaded_by_name || '-',
              'Tanggal Upload': formatDate(berkas.created_at),
            });
          });
        } else {
          rows.push({
            Kecamatan: kec.kecamatan_nama,
            Desa: desa.desa_nama,
            Status: 'Belum Upload',
            'Nama File': '-',
            'Ukuran File': '-',
            Keterangan: '-',
            'Diunggah Oleh': '-',
            'Tanggal Upload': '-',
          });
        }
      });
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), `Proposal ${tahun}`);
    XLSX.writeFile(wb, `Proposal_Bankeu_${tahun}_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Data berhasil diekspor ke Excel');
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-slate-400" />
          <p className="mt-3 text-slate-500">Memuat data proposal {tahun}...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-12 text-center">
        <XCircle className="mx-auto mb-3 h-12 w-12 text-rose-400" />
        <p className="text-slate-600">Gagal memuat data</p>
        <button onClick={fetchData} className="mt-3 text-sm text-slate-900 underline">Coba lagi</button>
      </div>
    );
  }

  const summary = data.summary;
  const daftarKecamatan = kecamatanTersaring();

  const kartu = [
    { key: 'all', nilai: summary.total_desa, label: 'Total Desa', Icon: MapPin, warna: 'text-slate-900' },
    { key: 'uploaded', nilai: summary.total_uploaded, label: 'Sudah Upload', Icon: CheckCircle2, warna: 'text-emerald-700' },
    { key: 'belum', nilai: summary.total_belum, label: 'Belum Upload', Icon: XCircle, warna: 'text-rose-600' },
  ];

  return (
    <div className="p-4 sm:p-6">
      {/* Penjelasan alur — supaya tidak ada yang mencari tombol verifikasi */}
      <div className="mb-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-600">
        <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
        <span>
          Proposal TA {tahun} dikirim desa <strong>langsung ke DPMD</strong> tanpa verifikasi kecamatan maupun dinas,
          jadi tidak ada status persetujuan di sini. Berkas dapat diunduh, dibahas lewat chat, atau dihapus bila salah unggah.
        </span>
      </div>

      {/* Ringkasan */}
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {kartu.map(({ key, nilai, label, Icon, warna }) => (
          <button
            key={key}
            onClick={() => setFilterUnggah(key)}
            className={`rounded-xl border bg-white p-4 text-left transition-all hover:shadow-sm ${
              filterUnggah === key ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
                <Icon className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${warna}`}>{nilai}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            </div>
          </button>
        ))}

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
              <BarChart3 className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{summary.persentase}%</p>
              <p className="text-xs text-slate-500">{summary.total_berkas || 0} berkas masuk</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pencarian & aksi */}
      <div className="mb-4 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari desa atau kecamatan..."
            className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-4 text-sm focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={expandAll} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200">
            Buka Semua
          </button>
          <button onClick={collapseAll} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200">
            Tutup Semua
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Download className="h-3.5 w-3.5" />
            Export Excel
          </button>
          <button onClick={fetchData} className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800">
            Muat ulang
          </button>
        </div>
      </div>

      {/* Daftar per kecamatan */}
      <div className="space-y-3">
        {daftarKecamatan.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            Tidak ada desa yang sesuai pencarian atau filter.
          </div>
        ) : daftarKecamatan.map((kec) => {
          const terbuka = expandedKecamatan[kec.kecamatan_id];
          const sudah = kec.desa_list.filter(d => d.has_proposal).length;
          const total = kec.desa_list.length;
          const persen = total > 0 ? Math.round((sudah / total) * 100) : 0;

          return (
            <div key={kec.kecamatan_id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <button
                onClick={() => toggleKecamatan(kec.kecamatan_id)}
                className="flex w-full items-center justify-between p-4 transition-colors hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-900">
                    <MapPin className="h-4 w-4 text-white" />
                  </div>
                  <div className="text-left">
                    <h4 className="font-semibold text-slate-800">{kec.kecamatan_nama}</h4>
                    <p className="text-xs text-slate-500">{sudah}/{total} desa sudah upload</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden w-32 sm:block">
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${persen}%` }} />
                    </div>
                  </div>
                  <span className="text-sm font-bold text-slate-600">{persen}%</span>
                  {terbuka ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                </div>
              </button>

              {terbuka && (
                <div className="divide-y divide-slate-100 border-t border-slate-100">
                  {kec.desa_list.map((desa) => (
                    <div key={desa.desa_id} className="px-4 py-3">
                      <div className="mb-1 flex items-center gap-3">
                        {desa.has_proposal
                          ? <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500" />
                          : <XCircle className="h-5 w-5 flex-shrink-0 text-slate-300" />}
                        <p className={`text-sm font-medium ${desa.has_proposal ? 'text-slate-800' : 'text-slate-500'}`}>
                          {desa.desa_nama}
                        </p>
                        {desa.has_proposal && (
                          <span className="text-xs text-slate-400">({desa.proposal_files?.length || 0} berkas)</span>
                        )}
                      </div>

                      {desa.has_proposal && desa.proposal_files?.map((berkas) => (
                        <div key={berkas.id} className="ml-8 mt-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 flex-shrink-0 text-slate-400" />
                                <p className="truncate text-sm font-medium text-slate-800">{berkas.nama_file}</p>
                              </div>
                              <p className="mt-1 text-xs text-slate-500">
                                {formatFileSize(berkas.file_size)} • {formatDate(berkas.created_at)}
                              </p>
                              {berkas.uploaded_by_name && (
                                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
                                  <Users className="h-3 w-3" /> {berkas.uploaded_by_name}
                                </p>
                              )}
                              {berkas.keterangan && (
                                <p className="mt-1 text-xs text-slate-500">
                                  <span className="font-medium">Keterangan:</span> {berkas.keterangan}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              <a
                                href={getFileUrl(berkas.file_path)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-slate-800"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Lihat / Unduh
                              </a>
                              <button
                                onClick={() => { setChatProposalId(berkas.id); setChatTargetUserId(berkas.uploaded_by); }}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                Chat
                              </button>
                              <button
                                onClick={() => handleHapus(berkas, desa.desa_nama)}
                                disabled={menghapus === berkas.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-600 transition-colors hover:border-rose-200 hover:bg-rose-50 disabled:opacity-50"
                              >
                                {menghapus === berkas.id
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Trash2 className="h-3.5 w-3.5" />}
                                Hapus
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {chatProposalId && (
        <ChatDrawer
          referenceType={REFERENCE_TYPE}
          referenceId={chatProposalId}
          targetUserId={chatTargetUserId}
          floating={false}
          isOpen={!!chatProposalId}
          onClose={() => { setChatProposalId(null); setChatTargetUserId(null); }}
          title="Chat Proposal Bantuan Keuangan"
        />
      )}
    </div>
  );
};

export default BankeuProposal2025MonitoringPage;
