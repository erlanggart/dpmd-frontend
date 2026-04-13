import React, { useEffect, useState } from 'react';
import api from '../../../../api';
import Swal from 'sweetalert2';

const STATUS_CONFIG = {
  pending:  { label: 'Pending',    bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-500' },
  dibaca:   { label: 'Dibaca',     bg: 'bg-blue-100',    text: 'text-blue-700',    dot: 'bg-blue-500' },
  proses:   { label: 'Diproses',   bg: 'bg-indigo-100',  text: 'text-indigo-700',  dot: 'bg-indigo-500' },
  selesai:  { label: 'Selesai',    bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  teruskan: { label: 'Diteruskan', bg: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-500' },
  ditarik:  { label: 'Ditarik',    bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-500' },
};

const RiwayatSurat = () => {
  const [loading, setLoading] = useState(true);
  const [suratList, setSuratList] = useState([]);

  useEffect(() => {
    fetchRiwayatSurat();
  }, []);

  const fetchRiwayatSurat = async () => {
    setLoading(true);
    try {
      const res = await api.get('/disposisi/riwayat-sekretariat');
      if (res.data.success) {
        setSuratList(res.data.data);
      }
    } catch (err) {
      Swal.fire('Error', 'Gagal memuat riwayat surat', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

  const formatRole = (role) => {
    if (!role) return '-';
    const map = {
      kepala_dinas: 'Kepala Dinas',
      sekretaris_dinas: 'Sekretaris Dinas',
      kepala_bidang: 'Kepala Bidang',
      ketua_tim: 'Ketua Tim',
      pegawai: 'Pegawai',
      superadmin: 'Superadmin',
    };
    return map[role] || role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  const handleTarikSurat = async (id, suratId) => {
    const confirm = await Swal.fire({
      title: 'Tarik Surat?',
      text: 'Surat akan ditarik kembali dari penerima.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Tarik',
      cancelButtonText: 'Batal'
    });
    if (!confirm.isConfirmed) return;
    try {
      const res = await api.put(`/disposisi/${id}/tarik`);
      if (res.data.success) {
        await Swal.fire('Berhasil', 'Surat berhasil ditarik kembali.', 'success');
        fetchRiwayatSurat();
      } else {
        Swal.fire('Gagal', res.data.message || 'Gagal menarik surat', 'error');
      }
    } catch (err) {
      Swal.fire('Error', err.response?.data?.message || 'Gagal tarik surat', 'error');
    }
  };

  const handleHapusSurat = async (suratId) => {
    if (!suratId) return;
    const confirm = await Swal.fire({
      title: 'Hapus Surat?',
      text: 'Surat akan dihapus permanen beserta seluruh disposisi terkait.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal'
    });
    if (!confirm.isConfirmed) return;
    try {
      const res = await api.delete(`/bank-surat/${suratId}`);
      if (res.data.success) {
        Swal.fire('Berhasil', 'Surat berhasil dihapus.', 'success');
        fetchRiwayatSurat();
      } else {
        Swal.fire('Gagal', res.data.message || 'Gagal menghapus surat', 'error');
      }
    } catch (err) {
      if (err.response?.status === 401) {
        Swal.fire('Sesi Habis', 'Sesi login Anda sudah habis. Silakan login ulang.', 'warning');
      } else if (err.response?.status === 403) {
        Swal.fire('Akses Ditolak', 'Anda tidak punya akses untuk menghapus surat ini.', 'warning');
      } else {
        Swal.fire('Error', err.response?.data?.message || 'Gagal hapus surat', 'error');
      }
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-3" />
        <p className="text-gray-500 text-sm">Memuat riwayat surat...</p>
      </div>
    );
  }

  if (suratList.length === 0) {
    return (
      <div className="py-12 text-center">
        <i className="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
        <p className="text-gray-500">Belum ada surat yang dikirimkan.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-blue-100">
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 px-6 py-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <i className="fas fa-history"></i>
          Riwayat Surat Terkirim
        </h2>
        <p className="text-blue-200 text-sm mt-0.5">Daftar surat yang telah dikirimkan ke Kepala Dinas</p>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center w-12">No</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Nomor Surat</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">Perihal</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Tanggal</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Dikirim Ke</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center w-48">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {suratList.map((item, idx) => {
              const surat = item.surat_masuk || item.surat;
              const keUser = item.ke_user;
              const st = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
              return (
                <tr key={item.id} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-4 py-3 text-center text-sm text-slate-500">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm font-medium text-slate-800">{surat?.nomor_surat || '-'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-700 line-clamp-2">{surat?.perihal || '-'}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs text-slate-600">{fmtDate(surat?.tanggal_surat || surat?.tanggal_terima)}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-xs font-medium text-slate-700">{keUser?.name || '-'}</span>
                    {keUser?.role && (
                      <span className="block text-[10px] text-slate-400">{formatRole(keUser.role)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${st.bg} ${st.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {item.can_recall && (
                        <button
                          className="px-3 py-1.5 rounded-lg bg-amber-500 text-white hover:bg-amber-600 text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
                          onClick={() => handleTarikSurat(item.id, surat?.id)}
                          title="Tarik surat kembali"
                        >
                          <i className="fas fa-undo-alt text-[10px]"></i>
                          Tarik
                        </button>
                      )}
                      {(item.status === 'ditarik' || item.status === 'pending') && (
                        <button
                          className="px-3 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 text-xs font-semibold shadow-sm transition-colors flex items-center gap-1"
                          onClick={() => handleHapusSurat(surat?.id)}
                          disabled={!surat?.id}
                          title="Hapus surat permanen"
                        >
                          <i className="fas fa-trash-alt text-[10px]"></i>
                          Hapus
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RiwayatSurat;
