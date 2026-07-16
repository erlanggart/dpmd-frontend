import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBidangPath } from '../../../../hooks/useBidangPath';
import { ArrowLeft, Camera, Upload, X, Save, Package, Loader2, ImageOff } from 'lucide-react';
import api from '../../../../api';
import toast from 'react-hot-toast';
import { fotoUrl, KONDISI, SUMBER_DANA } from './arsipBarangUtils';

const KOSONG = {
  nama: '', kategori_id: '', merk_tipe: '', nomor_seri: '', jumlah: 1, satuan: 'Unit',
  kondisi: 'baik', lokasi: '', pemegang_user_id: '', pemegang_nama: '',
  tanggal_perolehan: '', sumber_dana: '', nilai_perolehan: '', nomor_kontrak: '',
  nomor_faktur: '', keterangan: ''
};

const ArsipBarangFormPage = () => {
  const navigate = useNavigate();
  const { getPath } = useBidangPath();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState(KOSONG);
  const [kategoriList, setKategoriList] = useState([]);
  const [pegawaiList, setPegawaiList] = useState([]);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [fotoLama, setFotoLama] = useState(null);

  const fileInputRef = useRef(null);
  const kameraInputRef = useRef(null);

  useEffect(() => {
    const muat = async () => {
      try {
        const [k, p] = await Promise.all([
          api.get('/arsip-barang/kategori'),
          api.get('/users?limit=500').catch(() => null)
        ]);
        if (k.data.success) setKategoriList(k.data.data || []);
        const daftar = p?.data?.data;
        if (Array.isArray(daftar)) setPegawaiList(daftar);
      } catch (error) {
        console.error('Error memuat data pendukung:', error);
      }
    };
    muat();
  }, []);

  useEffect(() => {
    if (!isEdit) return;
    const muatBarang = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/arsip-barang/${id}`);
        if (res.data.success) {
          const b = res.data.data;
          setForm({
            nama: b.nama || '',
            kategori_id: b.kategori?.id || '',
            merk_tipe: b.merk_tipe || '',
            nomor_seri: b.nomor_seri || '',
            jumlah: b.jumlah ?? 1,
            satuan: b.satuan || 'Unit',
            kondisi: b.kondisi || 'baik',
            lokasi: b.lokasi || '',
            pemegang_user_id: b.pemegang_user_id || '',
            pemegang_nama: b.pemegang_user_id ? '' : b.pemegang?.nama || '',
            tanggal_perolehan: b.tanggal_perolehan ? b.tanggal_perolehan.substring(0, 10) : '',
            sumber_dana: b.sumber_dana || '',
            nilai_perolehan: b.nilai_perolehan ?? '',
            nomor_kontrak: b.nomor_kontrak || '',
            nomor_faktur: b.nomor_faktur || '',
            keterangan: b.keterangan || ''
          });
          setFotoLama(b.foto || null);
        }
      } catch (error) {
        console.error('Error memuat barang:', error);
        toast.error('Gagal memuat data barang');
        navigate(getPath('/sekretariat/arsip-barang'));
      } finally {
        setLoading(false);
      }
    };
    muatBarang();
  }, [id, isEdit, navigate, getPath]);

  // Objek URL preview wajib dilepas, kalau tidak memori bocor tiap ganti foto.
  useEffect(() => {
    return () => {
      if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    };
  }, [fotoPreview]);

  const pilihFoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error('Ukuran foto maksimal 12MB');
      return;
    }

    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFotoFile(file);
    setFotoPreview(URL.createObjectURL(file));
  };

  const hapusFoto = () => {
    if (fotoPreview) URL.revokeObjectURL(fotoPreview);
    setFotoFile(null);
    setFotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (kameraInputRef.current) kameraInputRef.current.value = '';
  };

  const ubah = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const simpan = async (e) => {
    e.preventDefault();

    if (!form.nama.trim()) {
      toast.error('Nama barang wajib diisi');
      return;
    }

    try {
      setSaving(true);
      const fd = new FormData();

      Object.entries(form).forEach(([k, v]) => {
        // Saat tambah, kirim hanya yang terisi. Saat edit, kirim semua agar
        // field yang dikosongkan benar-benar ikut terhapus.
        if (isEdit || (v !== '' && v !== null && v !== undefined)) {
          fd.append(k, v ?? '');
        }
      });
      if (fotoFile) fd.append('foto', fotoFile);

      const res = isEdit
        ? await api.put(`/arsip-barang/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
        : await api.post('/arsip-barang', fd, { headers: { 'Content-Type': 'multipart/form-data' } });

      if (res.data.success) {
        toast.success(res.data.message || 'Barang tersimpan');
        navigate(getPath(`/sekretariat/arsip-barang/${res.data.data.id}`));
      }
    } catch (error) {
      console.error('Error menyimpan barang:', error);
      toast.error(error.response?.data?.message || 'Gagal menyimpan barang');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-600" />
      </div>
    );
  }

  const previewAktif = fotoPreview || (fotoLama ? fotoUrl(fotoLama) : null);
  const labelInput = 'block text-sm font-medium text-gray-700 mb-1.5';
  const gayaInput =
    'w-full px-3.5 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm';

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate(getPath('/sekretariat/arsip-barang'))}
            className="mb-4 flex items-center gap-2 text-purple-100 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Kembali
          </button>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Package className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{isEdit ? 'Edit Barang' : 'Tambah Barang'}</h1>
              <p className="text-purple-100 mt-1 text-sm">
                {isEdit
                  ? 'Perbarui data barang. Kode dan QR tidak berubah.'
                  : 'Kode barang & QR terbit otomatis setelah disimpan.'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={simpan} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {/* Foto */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-gray-800 mb-4">Foto Barang</h2>

          <div className="flex flex-col sm:flex-row gap-5">
            <div className="w-full sm:w-52 h-52 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 overflow-hidden flex-shrink-0 relative">
              {previewAktif ? (
                <>
                  <img src={previewAktif} alt="Pratinjau" className="w-full h-full object-cover" />
                  {fotoFile && (
                    <button
                      type="button"
                      onClick={hapusFoto}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
                  <ImageOff className="h-10 w-10 mb-2" />
                  <span className="text-xs">Belum ada foto</span>
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col justify-center gap-3">
              {/* capture="environment" membuka kamera belakang langsung di HP */}
              <input
                ref={kameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={pilihFoto}
                className="hidden"
              />
              <input ref={fileInputRef} type="file" accept="image/*" onChange={pilihFoto} className="hidden" />

              <button
                type="button"
                onClick={() => kameraInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
              >
                <Camera className="h-5 w-5" />
                Ambil Foto dengan Kamera
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                <Upload className="h-5 w-5" />
                Pilih dari Galeri
              </button>

              <p className="text-xs text-gray-500 leading-relaxed">
                Foto otomatis dikompresi ke WebP maksimal 1280px, jadi tidak perlu
                mengecilkan sendiri. Maksimal 12MB.
                {isEdit && fotoLama && ' Biarkan kosong bila tidak ingin mengganti foto.'}
              </p>
            </div>
          </div>
        </div>

        {/* Identitas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-gray-800 mb-4">Identitas Barang</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelInput}>Nama Barang <span className="text-red-500">*</span></label>
              <input
                type="text" value={form.nama} onChange={ubah('nama')} required
                placeholder="Contoh: Laptop Lenovo ThinkPad T14"
                className={gayaInput}
              />
            </div>

            <div>
              <label className={labelInput}>Kategori</label>
              <select value={form.kategori_id} onChange={ubah('kategori_id')} className={gayaInput}>
                <option value="">— Pilih Kategori —</option>
                {kategoriList.map((k) => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelInput}>Merk / Tipe</label>
              <input type="text" value={form.merk_tipe} onChange={ubah('merk_tipe')} placeholder="Lenovo ThinkPad T14 Gen 3" className={gayaInput} />
            </div>

            <div>
              <label className={labelInput}>Nomor Seri</label>
              <input type="text" value={form.nomor_seri} onChange={ubah('nomor_seri')} placeholder="PF-3XK9021" className={gayaInput} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelInput}>Jumlah</label>
                <input type="number" min="1" value={form.jumlah} onChange={ubah('jumlah')} className={gayaInput} />
              </div>
              <div>
                <label className={labelInput}>Satuan</label>
                <input type="text" value={form.satuan} onChange={ubah('satuan')} placeholder="Unit" className={gayaInput} />
              </div>
            </div>

            <div>
              <label className={labelInput}>Kondisi</label>
              <select value={form.kondisi} onChange={ubah('kondisi')} className={gayaInput}>
                {Object.entries(KONDISI).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelInput}>Lokasi / Ruangan</label>
              <input type="text" value={form.lokasi} onChange={ubah('lokasi')} placeholder="Ruang Sekretariat Lt.2" className={gayaInput} />
            </div>
          </div>
        </div>

        {/* Pemegang */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-gray-800 mb-1">Penanggung Jawab</h2>
          <p className="text-xs text-gray-500 mb-4">
            Pilih dari daftar pegawai. Bila pemegangnya bukan pengguna sistem, isi kolom nama manual.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelInput}>Pegawai</label>
              <select
                value={form.pemegang_user_id}
                onChange={(e) => setForm((f) => ({ ...f, pemegang_user_id: e.target.value, pemegang_nama: e.target.value ? '' : f.pemegang_nama }))}
                className={gayaInput}
              >
                <option value="">— Tidak dipilih —</option>
                {pegawaiList.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelInput}>Nama Manual</label>
              <input
                type="text"
                value={form.pemegang_nama}
                onChange={ubah('pemegang_nama')}
                disabled={Boolean(form.pemegang_user_id)}
                placeholder={form.pemegang_user_id ? 'Terisi dari pegawai terpilih' : 'Nama penanggung jawab'}
                className={`${gayaInput} disabled:bg-gray-100 disabled:text-gray-400`}
              />
            </div>
          </div>
        </div>

        {/* Perolehan */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-bold text-gray-800 mb-1">Data Perolehan</h2>
          <p className="text-xs text-gray-500 mb-4">
            Nilai perolehan dan nomor kontrak tidak ditampilkan ke publik saat QR discan.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelInput}>Tanggal Perolehan</label>
              <input type="date" value={form.tanggal_perolehan} onChange={ubah('tanggal_perolehan')} className={gayaInput} />
            </div>
            <div>
              <label className={labelInput}>Sumber Dana</label>
              <select value={form.sumber_dana} onChange={ubah('sumber_dana')} className={gayaInput}>
                <option value="">— Pilih —</option>
                {Object.entries(SUMBER_DANA).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelInput}>Nilai Perolehan (Rp)</label>
              <input type="number" min="0" step="1" value={form.nilai_perolehan} onChange={ubah('nilai_perolehan')} placeholder="18500000" className={gayaInput} />
            </div>
            <div>
              <label className={labelInput}>Nomor Kontrak / SPK</label>
              <input type="text" value={form.nomor_kontrak} onChange={ubah('nomor_kontrak')} placeholder="SPK/027/DPMD/2026" className={gayaInput} />
            </div>
            <div>
              <label className={labelInput}>Nomor Faktur</label>
              <input type="text" value={form.nomor_faktur} onChange={ubah('nomor_faktur')} className={gayaInput} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelInput}>Keterangan</label>
              <textarea rows="3" value={form.keterangan} onChange={ubah('keterangan')} placeholder="Catatan tambahan..." className={gayaInput} />
            </div>
          </div>
        </div>

        {/* Aksi */}
        <div className="flex items-center justify-end gap-3 sticky bottom-4">
          <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100 p-3">
            <button
              type="button"
              onClick={() => navigate(getPath('/sekretariat/arsip-barang'))}
              className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-semibold shadow-lg shadow-purple-500/25"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              {saving ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Simpan & Terbitkan QR'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ArsipBarangFormPage;
