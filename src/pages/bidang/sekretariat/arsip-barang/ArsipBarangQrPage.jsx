import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBidangPath } from '../../../../hooks/useBidangPath';
import { QrCode, ShieldAlert, Loader2, ArrowLeft } from 'lucide-react';
import api from '../../../../api';

/**
 * Halaman tujuan QR pada label barang.
 * Alurnya: petugas memindai QR pakai kamera bawaan HP → browser membuka URL ini
 * → token ditukar jadi id barang → langsung diarahkan ke halaman detail.
 * Bila belum login, RoleProtectedRoute yang menangani ke halaman login lebih dulu.
 */
const ArsipBarangQrPage = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const { getPath } = useBidangPath();
  const [galat, setGalat] = useState(null);

  useEffect(() => {
    const resolve = async () => {
      try {
        const res = await api.get(`/arsip-barang/qr/${token}`);
        if (res.data.success) {
          // replace: tombol "kembali" jangan memantul balik ke halaman perantara ini.
          navigate(getPath(`/sekretariat/arsip-barang/${res.data.data.id}`), { replace: true });
        }
      } catch (error) {
        setGalat(
          error.response?.status === 404
            ? 'Kode QR ini tidak terdaftar. Mungkin label sudah tidak berlaku atau barangnya telah dihapus dari sistem.'
            : error.response?.status === 403
              ? 'Akun Anda tidak memiliki akses ke data Arsip Barang Sekretariat.'
              : 'Gagal membuka data barang. Periksa koneksi internet Anda.'
        );
      }
    };
    resolve();
  }, [token, navigate, getPath]);

  if (galat) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center max-w-sm w-full">
          <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="h-7 w-7 text-red-500" />
          </div>
          <h1 className="font-bold text-gray-800 text-lg">Barang Tidak Ditemukan</h1>
          <p className="text-sm text-gray-500 mt-2">{galat}</p>
          <button
            onClick={() => navigate(getPath('/sekretariat/arsip-barang'))}
            className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Ke Daftar Barang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 p-4">
      <div className="h-16 w-16 rounded-2xl bg-purple-100 flex items-center justify-center">
        <QrCode className="h-8 w-8 text-purple-600" />
      </div>
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <p className="text-sm">Membuka data barang...</p>
      </div>
    </div>
  );
};

export default ArsipBarangQrPage;
