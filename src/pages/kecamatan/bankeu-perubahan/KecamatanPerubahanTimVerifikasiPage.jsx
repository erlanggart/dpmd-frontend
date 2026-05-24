import React, { useEffect, useState, useRef } from 'react';
import api from '../../../api';
import Swal from 'sweetalert2';
import SignatureCanvas from 'react-signature-canvas';
import {
  LuUsers, LuPlus, LuTrash2, LuUpload, LuRefreshCw, LuSave, LuImage, LuEye,
  LuPenTool, LuRotateCcw, LuCheck, LuX
} from 'react-icons/lu';

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const KecamatanPerubahanTimVerifikasiPage = () => {
  const [kecamatanId, setKecamatanId] = useState(null);
  const [activeTab, setActiveTab] = useState('config');

  // Config state
  const [config, setConfig] = useState({
    nama_camat: '', nip_camat: '', jabatan_penandatangan: 'Camat',
    alamat: '', telepon: '', email: '', website: '', kode_pos: '',
    logo_path: null, ttd_camat_path: null, stempel_path: null,
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // Tim state
  const [tim, setTim] = useState([]);
  const [showAddTim, setShowAddTim] = useState(false);
  const [newTim, setNewTim] = useState({ jabatan: '', jabatan_label: '', nama: '', nip: '' });

  // Signature modal state
  const [signingMember, setSigningMember] = useState(null); // member being signed
  const [signMode, setSignMode] = useState('draw'); // 'draw' | 'upload'
  const signatureRef = useRef(null);

  const fetchUserKecamatan = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (user.kecamatan_id) setKecamatanId(user.kecamatan_id);
    } catch (e) {
      console.error('Get user error:', e);
    }
  };

  const fetchConfig = async () => {
    if (!kecamatanId) return;
    try {
      const res = await api.get(`/kecamatan/bankeu-perubahan/config/${kecamatanId}`);
      if (res.data?.data) {
        setConfig(prev => ({ ...prev, ...res.data.data }));
      }
    } catch (err) {
      console.error('Config fetch error:', err);
    }
  };

  const fetchTim = async () => {
    if (!kecamatanId) return;
    try {
      const res = await api.get(`/kecamatan/bankeu-perubahan/tim-verifikasi/${kecamatanId}`);
      setTim(res.data?.data || []);
    } catch (err) {
      console.error('Tim fetch error:', err);
    }
  };

  useEffect(() => { fetchUserKecamatan(); }, []);
  useEffect(() => { if (kecamatanId) { fetchConfig(); fetchTim(); } }, [kecamatanId]);

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    try {
      await api.post(`/kecamatan/bankeu-perubahan/config/${kecamatanId}`, {
        nama_camat: config.nama_camat,
        nip_camat: config.nip_camat,
        jabatan_penandatangan: config.jabatan_penandatangan,
        alamat: config.alamat,
        telepon: config.telepon,
        email: config.email,
        website: config.website,
        kode_pos: config.kode_pos,
      });
      Swal.fire('Berhasil', 'Konfigurasi tersimpan', 'success');
      fetchConfig();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal simpan config', 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const handleUploadFile = async (endpoint, file, label) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.post(`/kecamatan/bankeu-perubahan/config/${kecamatanId}/${endpoint}`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      Swal.fire('Berhasil', `${label} terupload`, 'success');
      fetchConfig();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || `Gagal upload ${label}`, 'error');
    }
  };

  const handleDeleteFile = async (endpoint, label) => {
    const result = await Swal.fire({
      title: `Hapus ${label}?`,
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#d33', confirmButtonText: 'Ya', cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/kecamatan/bankeu-perubahan/config/${kecamatanId}/${endpoint}`);
      Swal.fire('Berhasil', `${label} dihapus`, 'success');
      fetchConfig();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || `Gagal hapus ${label}`, 'error');
    }
  };

  const handleAddTim = async (e) => {
    e.preventDefault();
    if (!newTim.jabatan || !newTim.nama) {
      return Swal.fire('Validasi', 'Jabatan dan nama wajib diisi', 'warning');
    }
    try {
      await api.post(`/kecamatan/bankeu-perubahan/tim-verifikasi/${kecamatanId}`, newTim);
      Swal.fire('Berhasil', 'Anggota tim ditambahkan', 'success');
      setNewTim({ jabatan: '', jabatan_label: '', nama: '', nip: '' });
      setShowAddTim(false);
      fetchTim();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal tambah tim', 'error');
    }
  };

  const handleRemoveTim = async (id) => {
    const result = await Swal.fire({
      title: 'Hapus anggota tim?',
      icon: 'warning', showCancelButton: true,
      confirmButtonColor: '#d33', confirmButtonText: 'Ya, hapus', cancelButtonText: 'Batal',
    });
    if (!result.isConfirmed) return;
    try {
      await api.delete(`/kecamatan/bankeu-perubahan/tim-verifikasi/${id}`);
      Swal.fire('Berhasil', 'Anggota tim dihapus', 'success');
      fetchTim();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal hapus', 'error');
    }
  };

  const handleUploadTimSig = async (id, file) => {
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.post(`/kecamatan/bankeu-perubahan/tim-verifikasi/${id}/upload-signature`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      Swal.fire('Berhasil', 'TTD terupload', 'success');
      fetchTim();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal upload TTD', 'error');
    }
  };

  const openSignDialog = (member) => {
    setSigningMember(member);
    setSignMode('draw');
  };

  const closeSignDialog = () => {
    setSigningMember(null);
    if (signatureRef.current) signatureRef.current.clear();
  };

  const handleSaveCanvasSignature = async () => {
    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      return Swal.fire('Validasi', 'Mohon buat tanda tangan terlebih dahulu', 'warning');
    }
    try {
      const dataURL = signatureRef.current.toDataURL('image/png');
      const blob = await (await fetch(dataURL)).blob();
      const file = new File([blob], `ttd-${signingMember.id}.png`, { type: 'image/png' });
      await handleUploadTimSig(signingMember.id, file);
      closeSignDialog();
    } catch (err) {
      console.error('Save signature error:', err);
      Swal.fire('Gagal', 'Tidak dapat menyimpan tanda tangan', 'error');
    }
  };

  if (!kecamatanId) {
    return <div className="p-8 text-center text-gray-500">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <LuUsers className="w-6 h-6 text-orange-600" />
              Konfigurasi & Tim Verifikasi Bankeu Perubahan
            </h2>
          </div>
          <div className="flex gap-2 mt-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('config')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                activeTab === 'config' ? 'border-orange-600 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >Konfigurasi Kecamatan</button>
            <button
              onClick={() => setActiveTab('tim')}
              className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                activeTab === 'tim' ? 'border-orange-600 text-orange-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >Tim Verifikasi</button>
          </div>
        </div>

        {activeTab === 'config' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nama Camat *" value={config.nama_camat} onChange={v => setConfig({...config, nama_camat: v})} />
              <Field label="NIP Camat" value={config.nip_camat || ''} onChange={v => setConfig({...config, nip_camat: v})} />
              <Field label="Jabatan Penandatangan" value={config.jabatan_penandatangan || 'Camat'} onChange={v => setConfig({...config, jabatan_penandatangan: v})} />
              <Field label="Kode Pos" value={config.kode_pos || ''} onChange={v => setConfig({...config, kode_pos: v})} />
              <Field label="Telepon" value={config.telepon || ''} onChange={v => setConfig({...config, telepon: v})} />
              <Field label="Email" value={config.email || ''} onChange={v => setConfig({...config, email: v})} />
              <Field label="Website" value={config.website || ''} onChange={v => setConfig({...config, website: v})} />
              <Field label="Alamat" value={config.alamat || ''} onChange={v => setConfig({...config, alamat: v})} textarea />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl shadow-sm disabled:opacity-50"
              >
                <LuSave className="w-4 h-4" /> {savingConfig ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <FileUploadCard
                label="Logo Kecamatan"
                filename={config.logo_path}
                onUpload={f => handleUploadFile('upload-logo', f, 'Logo')}
                onDelete={null}
                folder="bankeu-perubahan/config"
              />
              <FileUploadCard
                label="TTD Camat"
                filename={config.ttd_camat_path}
                onUpload={f => handleUploadFile('upload-camat-signature', f, 'TTD Camat')}
                onDelete={() => handleDeleteFile('delete-camat-signature', 'TTD Camat')}
                folder="bankeu-perubahan/config"
              />
              <FileUploadCard
                label="Stempel"
                filename={config.stempel_path}
                onUpload={f => handleUploadFile('upload-stempel', f, 'Stempel')}
                onDelete={() => handleDeleteFile('delete-stempel', 'Stempel')}
                folder="bankeu-perubahan/config"
              />
            </div>
          </div>
        )}

        {activeTab === 'tim' && (
          <div className="space-y-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex justify-between items-center">
              <div>
                <span className="text-sm text-gray-600">{tim.length} anggota tim aktif</span>
                <div className="text-xs text-gray-500 mt-0.5">
                  TTD wajib untuk semua anggota sebelum Berita Acara dapat di-generate
                </div>
              </div>
              <button
                onClick={() => setShowAddTim(true)}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-lg"
              >
                <LuPlus className="w-4 h-4" /> Tambah Anggota
              </button>
            </div>

            {tim.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
                Belum ada anggota tim verifikasi
              </div>
            ) : (
              tim.map(t => (
                <div key={t.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {t.ttd_path ? (
                        <img
                          src={`${imageBaseUrl}/storage/uploads/signatures/${t.ttd_path}`}
                          alt="ttd"
                          className="w-16 h-16 object-contain border rounded-lg bg-white flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex flex-col items-center justify-center text-gray-400 flex-shrink-0 border-2 border-dashed border-gray-300">
                          <LuImage className="w-5 h-5" />
                          <span className="text-[10px] mt-0.5">No TTD</span>
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-gray-800 truncate">{t.nama}</div>
                        <div className="text-xs text-gray-500">{t.jabatan_label || t.jabatan}</div>
                        {t.nip && <div className="text-xs text-gray-500">NIP: {t.nip}</div>}
                        {t.ttd_path ? (
                          <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-200">
                            <LuCheck className="w-3 h-3" /> TTD tersimpan
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full text-xs font-semibold border border-amber-200">
                            <LuX className="w-3 h-3" /> Belum ada TTD
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <button
                        onClick={() => openSignDialog(t)}
                        className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-lg"
                      >
                        <LuPenTool className="w-3.5 h-3.5" /> {t.ttd_path ? 'Ganti TTD' : 'Buat TTD'}
                      </button>
                      <button
                        onClick={() => handleRemoveTim(t.id)}
                        className="inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg"
                      >
                        <LuTrash2 className="w-3.5 h-3.5" /> Hapus
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {showAddTim && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-800">Tambah Anggota Tim</h3>
              </div>
              <form onSubmit={handleAddTim} className="px-6 py-4 space-y-3">
                <Field label="Jabatan Kode *" value={newTim.jabatan} onChange={v => setNewTim({...newTim, jabatan: v})} placeholder="ketua / sekretaris / anggota" />
                <Field label="Jabatan Label" value={newTim.jabatan_label} onChange={v => setNewTim({...newTim, jabatan_label: v})} placeholder="Ketua Tim Verifikasi" />
                <Field label="Nama *" value={newTim.nama} onChange={v => setNewTim({...newTim, nama: v})} />
                <Field label="NIP" value={newTim.nip} onChange={v => setNewTim({...newTim, nip: v})} />
                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowAddTim(false)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50">Batal</button>
                  <button type="submit" className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl shadow-sm">Tambah</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Signature dialog */}
        {signingMember && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">Tanda Tangan Anggota Tim</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{signingMember.nama} · {signingMember.jabatan_label || signingMember.jabatan}</p>
                </div>
                <button onClick={closeSignDialog} className="text-gray-400 hover:text-gray-600">
                  <LuX className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-4 space-y-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSignMode('draw')}
                    className={`flex-1 px-3 py-2 text-sm font-semibold rounded-xl border-2 transition-colors ${
                      signMode === 'draw' ? 'bg-violet-50 border-violet-500 text-violet-700' : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <LuPenTool className="w-4 h-4 inline mr-1" /> Gambar Tanda Tangan
                  </button>
                  <button
                    onClick={() => setSignMode('upload')}
                    className={`flex-1 px-3 py-2 text-sm font-semibold rounded-xl border-2 transition-colors ${
                      signMode === 'upload' ? 'bg-violet-50 border-violet-500 text-violet-700' : 'bg-white border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <LuUpload className="w-4 h-4 inline mr-1" /> Upload File
                  </button>
                </div>

                {signMode === 'draw' && (
                  <div className="space-y-2">
                    <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 overflow-hidden">
                      <SignatureCanvas
                        ref={signatureRef}
                        penColor="black"
                        canvasProps={{
                          width: 500,
                          height: 200,
                          className: 'w-full h-[200px] bg-white'
                        }}
                      />
                    </div>
                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => signatureRef.current?.clear()}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg"
                      >
                        <LuRotateCcw className="w-3.5 h-3.5" /> Hapus
                      </button>
                      <p className="text-xs text-gray-500">Tanda tangan akan disimpan sebagai gambar PNG</p>
                    </div>
                  </div>
                )}

                {signMode === 'upload' && (
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center">
                    <LuUpload className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm text-gray-700 mb-2">Upload file gambar tanda tangan (PNG/JPG)</p>
                    <input
                      type="file"
                      accept=".png,.jpg,.jpeg"
                      onChange={e => {
                        if (e.target.files?.[0]) {
                          handleUploadTimSig(signingMember.id, e.target.files[0]);
                          closeSignDialog();
                        }
                      }}
                      className="block mx-auto text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
                    />
                  </div>
                )}
              </div>

              {signMode === 'draw' && (
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
                  <button
                    onClick={closeSignDialog}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50"
                  >Batal</button>
                  <button
                    onClick={handleSaveCanvasSignature}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl shadow-sm"
                  >
                    <LuSave className="w-4 h-4" /> Simpan Tanda Tangan
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const Field = ({ label, value, onChange, placeholder, textarea }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
    {textarea ? (
      <textarea
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        rows={2}
        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
        placeholder={placeholder}
      />
    ) : (
      <input
        type="text"
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
        placeholder={placeholder}
      />
    )}
  </div>
);

const FileUploadCard = ({ label, filename, onUpload, onDelete, folder }) => (
  <div className="border border-gray-200 rounded-xl p-3">
    <div className="text-sm font-semibold text-gray-700 mb-2">{label}</div>
    {filename ? (
      <div className="space-y-2">
        <img
          src={`${imageBaseUrl}/storage/uploads/${folder}/${filename}`}
          alt={label}
          className="w-full h-24 object-contain bg-gray-50 rounded border"
        />
        <div className="flex gap-1">
          <label className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg cursor-pointer">
            <LuUpload className="w-3.5 h-3.5" /> Ganti
            <input type="file" accept=".png,.jpg,.jpeg" className="hidden" onChange={e => onUpload(e.target.files?.[0])} />
          </label>
          {onDelete && (
            <button onClick={onDelete} className="inline-flex items-center px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold rounded-lg">
              <LuTrash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    ) : (
      <label className="border-2 border-dashed border-gray-300 hover:border-orange-400 bg-gray-50 hover:bg-orange-50 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer transition-colors">
        <LuUpload className="w-6 h-6 text-gray-400" />
        <span className="mt-1 text-xs text-gray-600">Upload {label}</span>
        <input type="file" accept=".png,.jpg,.jpeg" className="hidden" onChange={e => onUpload(e.target.files?.[0])} />
      </label>
    )}
  </div>
);

export default KecamatanPerubahanTimVerifikasiPage;
