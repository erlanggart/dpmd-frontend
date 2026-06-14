import React, { useEffect, useState, useCallback } from 'react';
import { Calendar, RefreshCw, Plus, Trash2, Info } from 'lucide-react';
import Swal from 'sweetalert2';
import api from '../../../api';
import { clearHariLiburCache } from '../../../utils/tanggalMerah';

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const formatTanggal = (ymd) => {
  const d = new Date(`${ymd}T00:00:00`);
  return `${NAMA_HARI[d.getDay()]}, ${d.getDate()} ${BULAN[d.getMonth()]} ${d.getFullYear()}`;
};

const HariLiburManager = () => {
  const currentYear = new Date().getFullYear();
  const [tahun, setTahun] = useState(currentYear);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const years = [];
  for (let y = currentYear - 1; y <= currentYear + 2; y++) years.push(y);

  const fetchData = useCallback(async (th) => {
    setLoading(true);
    try {
      const res = await api.get('/hari-libur', { params: { tahun: th } });
      setData(res.data?.data || []);
    } catch (e) {
      console.error('Gagal memuat hari libur:', e);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(tahun);
  }, [tahun, fetchData]);

  const handleSync = async () => {
    const confirm = await Swal.fire({
      title: `Sinkronkan kalender libur ${tahun}?`,
      text: 'Sistem akan menarik daftar hari libur nasional & cuti bersama Indonesia dari kalender online untuk tahun ini.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Ya, Sinkronkan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#dc2626',
    });
    if (!confirm.isConfirmed) return;

    setSyncing(true);
    try {
      const res = await api.post('/hari-libur/sync', null, { params: { tahun } });
      clearHariLiburCache();
      await fetchData(tahun);
      Swal.fire({ icon: 'success', title: 'Berhasil', text: res.data?.message || 'Sinkronisasi selesai', timer: 2500, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Gagal Sinkronisasi', text: e.response?.data?.message || 'Terjadi kesalahan saat sinkronisasi' });
    } finally {
      setSyncing(false);
    }
  };

  const handleAdd = async () => {
    const { value: form } = await Swal.fire({
      title: 'Tambah Hari Libur',
      html: `
        <div class="text-left space-y-3">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Tanggal</label>
            <input type="date" id="hl-tanggal" value="${tahun}-01-01" class="swal2-input" style="margin:0;width:100%" />
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-1">Keterangan</label>
            <input type="text" id="hl-ket" placeholder="Contoh: Hari Raya Nyepi" class="swal2-input" style="margin:0;width:100%" />
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Simpan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#dc2626',
      preConfirm: () => {
        const tanggal = document.getElementById('hl-tanggal')?.value;
        const keterangan = document.getElementById('hl-ket')?.value?.trim();
        if (!tanggal) { Swal.showValidationMessage('Tanggal wajib diisi'); return false; }
        if (!keterangan) { Swal.showValidationMessage('Keterangan wajib diisi'); return false; }
        return { tanggal, keterangan };
      },
    });
    if (!form) return;

    try {
      await api.post('/hari-libur', form);
      clearHariLiburCache();
      await fetchData(tahun);
      Swal.fire({ icon: 'success', title: 'Tersimpan', timer: 1500, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: e.response?.data?.message || 'Gagal menambah hari libur' });
    }
  };

  const handleDelete = async (item) => {
    const confirm = await Swal.fire({
      title: 'Hapus hari libur ini?',
      html: `<p>${formatTanggal(item.tanggal)}</p><p class="text-gray-500 text-sm">${item.keterangan}</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Ya, Hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#dc2626',
    });
    if (!confirm.isConfirmed) return;

    try {
      await api.delete(`/hari-libur/${item.id}`);
      clearHariLiburCache();
      await fetchData(tahun);
      Swal.fire({ icon: 'success', title: 'Dihapus', timer: 1200, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Gagal', text: e.response?.data?.message || 'Gagal menghapus' });
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200/50 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-gradient-to-br from-rose-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/25">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">Hari Libur (Tanggal Merah)</h2>
            <p className="text-sm text-gray-500">Tanggal di sini akan diblokir saat generate Berita Acara &amp; Surat Pengantar</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={tahun}
            onChange={(e) => setTahun(parseInt(e.target.value, 10))}
            className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 bg-white"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 shadow-md disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Menyinkronkan...' : 'Sync Kalender Libur'}
          </button>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:shadow-md"
          >
            <Plus className="w-4 h-4" /> Tambah Manual
          </button>
        </div>
      </div>

      {/* Info weekend */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          Sabtu &amp; Minggu (akhir pekan) otomatis diblokir tanpa perlu dimasukkan ke daftar ini.
          Daftar di bawah khusus libur nasional &amp; cuti bersama.
        </p>
      </div>

      {/* Tabel */}
      {loading ? (
        <div className="py-12 text-center text-gray-500">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-rose-600 mx-auto mb-2"></div>
          Memuat data...
        </div>
      ) : data.length === 0 ? (
        <div className="py-12 text-center">
          <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Belum ada hari libur untuk tahun {tahun}.</p>
          <p className="text-gray-400 text-sm">Klik <strong>Sync Kalender Libur</strong> untuk mengisi otomatis.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-gray-500">
                <th className="py-2.5 px-4 font-semibold w-12">#</th>
                <th className="py-2.5 px-4 font-semibold">Tanggal</th>
                <th className="py-2.5 px-4 font-semibold">Keterangan</th>
                <th className="py-2.5 px-4 font-semibold w-20 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr key={item.id} className="border-b border-gray-100 hover:bg-rose-50/40">
                  <td className="py-2.5 px-4 text-gray-400">{idx + 1}</td>
                  <td className="py-2.5 px-4 font-medium text-gray-800">{formatTanggal(item.tanggal)}</td>
                  <td className="py-2.5 px-4 text-gray-600">{item.keterangan}</td>
                  <td className="py-2.5 px-4 text-center">
                    <button
                      onClick={() => handleDelete(item)}
                      className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
                      title="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 mt-3">Total {data.length} hari libur untuk tahun {tahun}.</p>
        </div>
      )}
    </div>
  );
};

export default HariLiburManager;
