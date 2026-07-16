import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBidangPath } from '../../../../hooks/useBidangPath';
import {
  ArrowLeft, Pencil, Trash2, Printer, QrCode, MapPin, User, Calendar, Wallet,
  FileText, History, ScanLine, Package, ImageOff, X, Loader2, Archive, RotateCcw,
  ExternalLink, Copy, ArrowRightLeft
} from 'lucide-react';
import api from '../../../../api';
import toast from 'react-hot-toast';
import { fotoUrl, KONDISI, SUMBER_DANA, formatRupiah, formatTanggal, formatWaktu, cetakLabelPdf } from './arsipBarangUtils';

const JENIS_MUTASI = {
  lokasi: { label: 'Pindah Lokasi', warna: 'bg-blue-100 text-blue-700' },
  kondisi: { label: 'Ubah Kondisi', warna: 'bg-amber-100 text-amber-700' },
  pemegang: { label: 'Ganti Pemegang', warna: 'bg-indigo-100 text-indigo-700' },
  status: { label: 'Status', warna: 'bg-gray-200 text-gray-700' },
  lainnya: { label: 'Catatan', warna: 'bg-gray-100 text-gray-600' }
};

const ArsipBarangDetailPage = () => {
  const navigate = useNavigate();
  const { getPath } = useBidangPath();
  const { id } = useParams();

  const [barang, setBarang] = useState(null);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState(null);
  const [tab, setTab] = useState('detail');

  const [modalMutasi, setModalMutasi] = useState(false);
  const [modalHapusAset, setModalHapusAset] = useState(false);
  const [modalHapusData, setModalHapusData] = useState(false);
  const [proses, setProses] = useState(false);

  const [formMutasi, setFormMutasi] = useState({ lokasi: '', kondisi: '', catatan: '' });
  const [formHapusAset, setFormHapusAset] = useState({ alasan_penghapusan: '', nomor_ba_penghapusan: '' });

  const muat = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/arsip-barang/${id}`);
      if (res.data.success) {
        setBarang(res.data.data);
        setFormMutasi({ lokasi: res.data.data.lokasi || '', kondisi: res.data.data.kondisi || '', catatan: '' });
      }
    } catch (error) {
      console.error('Error memuat barang:', error);
      toast.error('Gagal memuat data barang');
      navigate(getPath('/sekretariat/arsip-barang'));
    } finally {
      setLoading(false);
    }
  }, [id, navigate, getPath]);

  useEffect(() => { muat(); }, [muat]);

  useEffect(() => {
    const muatLabel = async () => {
      try {
        const res = await api.get(`/arsip-barang/${id}/label`);
        if (res.data.success) setLabel(res.data.data);
      } catch (error) {
        console.error('Error memuat label:', error);
      }
    };
    muatLabel();
  }, [id]);

  const salinTautan = async () => {
    try {
      await navigator.clipboard.writeText(barang.scan_url);
      toast.success('Tautan QR disalin');
    } catch {
      toast.error('Gagal menyalin tautan');
    }
  };

  const cetak = async () => {
    if (!label) return toast.error('Label belum siap');
    try {
      await cetakLabelPdf(label);
      toast.success('Label diunduh — cetak di kertas stiker lalu tempel di barang');
    } catch (error) {
      console.error('Error cetak label:', error);
      toast.error('Gagal membuat label');
    }
  };

  const simpanMutasi = async () => {
    if (!formMutasi.lokasi.trim() && !formMutasi.kondisi) {
      return toast.error('Isi lokasi atau kondisi baru');
    }
    try {
      setProses(true);
      const res = await api.post(`/arsip-barang/${id}/mutasi`, {
        lokasi: formMutasi.lokasi,
        kondisi: formMutasi.kondisi,
        catatan: formMutasi.catatan || undefined
      });
      if (res.data.success) {
        toast.success('Mutasi tercatat');
        setModalMutasi(false);
        muat();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan mutasi');
    } finally {
      setProses(false);
    }
  };

  const hapuskanAset = async () => {
    if (!formHapusAset.alasan_penghapusan.trim()) return toast.error('Alasan penghapusan wajib diisi');
    try {
      setProses(true);
      const res = await api.post(`/arsip-barang/${id}/penghapusan`, formHapusAset);
      if (res.data.success) {
        toast.success('Barang ditandai dihapuskan');
        setModalHapusAset(false);
        muat();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal memproses penghapusan');
    } finally {
      setProses(false);
    }
  };

  const pulihkan = async () => {
    try {
      setProses(true);
      const res = await api.post(`/arsip-barang/${id}/penghapusan`, { batalkan: true });
      if (res.data.success) {
        toast.success('Status barang dipulihkan');
        muat();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal memulihkan status');
    } finally {
      setProses(false);
    }
  };

  const hapusData = async () => {
    try {
      setProses(true);
      const res = await api.delete(`/arsip-barang/${id}`);
      if (res.data.success) {
        toast.success('Data barang dihapus');
        navigate(getPath('/sekretariat/arsip-barang'));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menghapus data');
      setProses(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
      </div>
    );
  }

  if (!barang) return null;

  const kondisi = KONDISI[barang.kondisi] || KONDISI.baik;
  const dihapuskan = barang.status === 'dihapuskan';

  const Baris = ({ Icon, label: l, children }) => (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <Icon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500">{l}</p>
        <div className="text-sm text-gray-800 font-medium mt-0.5 break-words">{children || '-'}</div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate(getPath('/sekretariat/arsip-barang'))}
            className="mb-4 flex items-center gap-2 text-purple-100 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Kembali ke Daftar
          </button>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-purple-200 mb-1">
                <QrCode className="h-4 w-4" />
                <span className="font-mono text-sm font-semibold">{barang.kode_barang}</span>
              </div>
              <h1 className="text-2xl font-bold">{barang.nama}</h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${kondisi.chip}`}>
                  {kondisi.label}
                </span>
                {dihapuskan && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-gray-900/60 text-white border border-white/20">
                    Dihapuskan
                  </span>
                )}
                {barang.kategori && (
                  <span className="px-2.5 py-1 rounded-lg text-xs font-medium bg-white/15 border border-white/20">
                    {barang.kategori.nama}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setModalMutasi(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-xl font-medium transition-colors border border-white/20 text-sm"
              >
                <ArrowRightLeft className="h-4 w-4" />
                Mutasi
              </button>
              <button
                onClick={() => navigate(getPath(`/sekretariat/arsip-barang/${id}/edit`))}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-xl font-medium transition-colors border border-white/20 text-sm"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={cetak}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-purple-700 hover:bg-purple-50 rounded-xl font-semibold transition-colors shadow-lg text-sm"
              >
                <Printer className="h-4 w-4" />
                Cetak Label
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Tab */}
        <div className="flex items-center gap-1 bg-white rounded-xl border border-gray-100 p-1 mb-5 w-fit shadow-sm">
          {[
            { k: 'detail', l: 'Detail', Icon: FileText },
            { k: 'riwayat', l: `Riwayat (${barang.riwayat_mutasi?.length || 0})`, Icon: History },
            { k: 'scan', l: `Jejak Scan (${barang.total_scan || 0})`, Icon: ScanLine }
          ].map(({ k, l, Icon }) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === k ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {l}
            </button>
          ))}
        </div>

        {tab === 'detail' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Foto + QR */}
            <div className="space-y-5">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="h-60 bg-gray-100">
                  {barang.foto ? (
                    <img src={fotoUrl(barang.foto)} alt={barang.nama} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                      <ImageOff className="h-10 w-10 mb-2" />
                      <span className="text-sm">Tanpa foto</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
                <h3 className="font-bold text-gray-800 mb-1 flex items-center justify-center gap-2">
                  <QrCode className="h-4 w-4 text-purple-600" />
                  Label QR
                </h3>
                <p className="text-xs text-gray-500 mb-4">Cetak, lalu tempel di barang</p>

                {label ? (
                  <img src={label.qr_data_url} alt="QR" className="w-40 h-40 mx-auto rounded-lg border border-gray-100" />
                ) : (
                  <div className="w-40 h-40 mx-auto rounded-lg bg-gray-50 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                )}

                <p className="font-mono text-sm font-bold text-gray-800 mt-3">{barang.kode_barang}</p>

                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={salinTautan}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Salin Tautan
                  </button>
                  <a
                    href={barang.scan_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Buka
                  </a>
                </div>
              </div>
            </div>

            {/* Data */}
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-bold text-gray-800 mb-2">Identitas</h3>
                <Baris Icon={Package} label="Merk / Tipe">{barang.merk_tipe}</Baris>
                <Baris Icon={FileText} label="Nomor Seri">{barang.nomor_seri}</Baris>
                <Baris Icon={Package} label="Jumlah">{barang.jumlah} {barang.satuan}</Baris>
                <Baris Icon={MapPin} label="Lokasi / Ruangan">{barang.lokasi}</Baris>
                <Baris Icon={User} label="Penanggung Jawab">{barang.pemegang?.nama}</Baris>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="font-bold text-gray-800 mb-2">Perolehan</h3>
                <Baris Icon={Calendar} label="Tanggal Perolehan">{formatTanggal(barang.tanggal_perolehan)}</Baris>
                <Baris Icon={Wallet} label="Sumber Dana">{SUMBER_DANA[barang.sumber_dana]}</Baris>
                <Baris Icon={Wallet} label="Nilai Perolehan">{formatRupiah(barang.nilai_perolehan)}</Baris>
                <Baris Icon={FileText} label="Nomor Kontrak / SPK">{barang.nomor_kontrak}</Baris>
                <Baris Icon={FileText} label="Nomor Faktur">{barang.nomor_faktur}</Baris>
                {barang.keterangan && <Baris Icon={FileText} label="Keterangan">{barang.keterangan}</Baris>}
              </div>

              {dihapuskan && (
                <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
                  <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                    <Archive className="h-4 w-4 text-gray-500" />
                    Penghapusan Aset
                  </h3>
                  <Baris Icon={Calendar} label="Tanggal Penghapusan">{formatTanggal(barang.tanggal_penghapusan)}</Baris>
                  <Baris Icon={FileText} label="Nomor Berita Acara">{barang.nomor_ba_penghapusan}</Baris>
                  <Baris Icon={FileText} label="Alasan">{barang.alasan_penghapusan}</Baris>
                  <button
                    onClick={pulihkan}
                    disabled={proses}
                    className="mt-4 flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Batalkan Penghapusan
                  </button>
                </div>
              )}

              {/* Zona berbahaya */}
              <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-5">
                <h3 className="font-bold text-gray-800 mb-1">Tindakan Lain</h3>
                <p className="text-xs text-gray-500 mb-4">
                  Barang yang sudah tidak dipakai sebaiknya <strong>dihapuskan sebagai aset</strong> agar
                  riwayatnya tetap tersimpan. Hapus data permanen hanya untuk salah input.
                </p>
                <div className="flex items-center gap-3 flex-wrap">
                  {!dihapuskan && (
                    <button
                      onClick={() => setModalHapusAset(true)}
                      className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <Archive className="h-4 w-4" />
                      Hapuskan Aset
                    </button>
                  )}
                  <button
                    onClick={() => setModalHapusData(true)}
                    className="flex items-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Hapus Data Permanen
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'riwayat' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            {!barang.riwayat_mutasi?.length ? (
              <div className="text-center py-16">
                <History className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Belum ada riwayat</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {barang.riwayat_mutasi.map((m) => {
                  const j = JENIS_MUTASI[m.jenis] || JENIS_MUTASI.lainnya;
                  return (
                    <div key={m.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${j.warna}`}>{j.label}</span>
                        <span className="text-xs text-gray-400">{formatWaktu(m.created_at)}</span>
                      </div>
                      <div className="mt-2 text-sm text-gray-800">
                        {m.nilai_lama || m.nilai_baru ? (
                          <span className="inline-flex items-center gap-2 flex-wrap">
                            <span className="text-gray-400 line-through">{m.nilai_lama || '(kosong)'}</span>
                            <ArrowRightLeft className="h-3 w-3 text-gray-400" />
                            <span className="font-semibold">{m.nilai_baru || '(kosong)'}</span>
                          </span>
                        ) : null}
                      </div>
                      {m.catatan && <p className="text-sm text-gray-500 mt-1">{m.catatan}</p>}
                      <p className="text-xs text-gray-400 mt-1.5">oleh {m.user_name || 'Sistem'}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'scan' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            {!barang.riwayat_scan?.length ? (
              <div className="text-center py-16">
                <ScanLine className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Label ini belum pernah discan</p>
                <p className="text-gray-400 text-sm mt-1">Setiap pemindaian QR akan tercatat di sini</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {barang.riwayat_scan.map((s) => (
                  <div key={s.id} className="p-4 flex items-center justify-between gap-3 flex-wrap hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-full flex items-center justify-center ${
                        s.source === 'internal' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'
                      }`}>
                        <ScanLine className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {s.user_name || 'Pemindai publik'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {s.source === 'internal' ? 'Petugas (login)' : 'Tanpa login'} · IP {s.ip_address || '-'}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-gray-400">{formatWaktu(s.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal mutasi */}
      {modalMutasi && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Catat Mutasi Barang</h3>
              <button onClick={() => setModalMutasi(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Lokasi Baru</label>
                <input
                  type="text"
                  value={formMutasi.lokasi}
                  onChange={(e) => setFormMutasi((f) => ({ ...f, lokasi: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Kondisi</label>
                <select
                  value={formMutasi.kondisi}
                  onChange={(e) => setFormMutasi((f) => ({ ...f, kondisi: e.target.value }))}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm"
                >
                  {Object.entries(KONDISI).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Catatan</label>
                <textarea
                  rows="2"
                  value={formMutasi.catatan}
                  onChange={(e) => setFormMutasi((f) => ({ ...f, catatan: e.target.value }))}
                  placeholder="Alasan perpindahan / kondisi..."
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setModalMutasi(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium">
                Batal
              </button>
              <button
                onClick={simpanMutasi}
                disabled={proses}
                className="flex items-center gap-2 px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-60 text-sm font-semibold"
              >
                {proses && <Loader2 className="h-4 w-4 animate-spin" />}
                Simpan Mutasi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal penghapusan aset */}
      {modalHapusAset && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-800">Hapuskan Aset</h3>
              <button onClick={() => setModalHapusAset(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-500">
                Barang tetap tersimpan beserta riwayatnya, hanya ditandai tidak aktif lagi.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Alasan Penghapusan <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows="3"
                  value={formHapusAset.alasan_penghapusan}
                  onChange={(e) => setFormHapusAset((f) => ({ ...f, alasan_penghapusan: e.target.value }))}
                  placeholder="Rusak berat, tidak ekonomis diperbaiki"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nomor Berita Acara</label>
                <input
                  type="text"
                  value={formHapusAset.nomor_ba_penghapusan}
                  onChange={(e) => setFormHapusAset((f) => ({ ...f, nomor_ba_penghapusan: e.target.value }))}
                  placeholder="BA/09/DPMD/2026"
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
              <button onClick={() => setModalHapusAset(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium">
                Batal
              </button>
              <button
                onClick={hapuskanAset}
                disabled={proses}
                className="flex items-center gap-2 px-5 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 disabled:opacity-60 text-sm font-semibold"
              >
                {proses && <Loader2 className="h-4 w-4 animate-spin" />}
                Hapuskan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal hapus data permanen */}
      {modalHapusData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5">
            <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="font-bold text-gray-800 text-lg">Hapus data permanen?</h3>
            <p className="text-sm text-gray-500 mt-2">
              Data <strong>{barang.nama}</strong> ({barang.kode_barang}), foto, seluruh riwayat mutasi
              dan jejak scan akan hilang selamanya. Label QR yang sudah tertempel jadi tidak berlaku.
              Tindakan ini tidak bisa dibatalkan.
            </p>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button onClick={() => setModalHapusData(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium">
                Batal
              </button>
              <button
                onClick={hapusData}
                disabled={proses}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60 text-sm font-semibold"
              >
                {proses && <Loader2 className="h-4 w-4 animate-spin" />}
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArsipBarangDetailPage;
