import React, { useEffect, useState, useRef } from 'react';
import api from '../../../api';
import Swal from 'sweetalert2';
import SignatureCanvas from 'react-signature-canvas';
import {
  LuUsers, LuPlus, LuTrash2, LuUpload, LuRefreshCw, LuSave, LuImage, LuEye,
  LuPenTool, LuRotateCcw, LuCheck, LuX
} from 'react-icons/lu';
import { JABATAN_OPTIONS } from '../../../constants/jabatanOptions';

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

  // Tanda tangan camat (digambar via canvas, bukan upload)
  const [showCamatSignaturePad, setShowCamatSignaturePad] = useState(false);
  const camatSigCanvasRef = useRef(null);

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

  const handleSyncFromReguler = async () => {
    const r = await Swal.fire({
      title: 'Sinkron dari Bankeu Reguler?',
      text: 'Data camat, TTD Camat, dan stempel akan disalin dari konfigurasi Bankeu reguler (menimpa yang ada di sini).',
      icon: 'question', showCancelButton: true,
      confirmButtonColor: '#ea580c', confirmButtonText: 'Ya, sinkron', cancelButtonText: 'Batal',
    });
    if (!r.isConfirmed) return;
    setSavingConfig(true);
    try {
      await api.post(`/kecamatan/bankeu-perubahan/config/${kecamatanId}/sync-from-reguler`);
      Swal.fire('Berhasil', 'Konfigurasi disinkron dari Bankeu reguler', 'success');
      fetchConfig();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal sinkron konfigurasi', 'error');
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

  const handleSaveCamatSignature = async () => {
    if (!camatSigCanvasRef.current || camatSigCanvasRef.current.isEmpty()) {
      return Swal.fire('Validasi', 'Silakan gambar tanda tangan terlebih dahulu', 'warning');
    }
    try {
      const dataUrl = camatSigCanvasRef.current.toDataURL('image/png');
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'ttd-camat.png', { type: 'image/png' });
      await handleUploadFile('upload-camat-signature', file, 'TTD Camat');
      setShowCamatSignaturePad(false);
    } catch (err) {
      console.error('Save camat signature error:', err);
      Swal.fire('Gagal', 'Tidak dapat menyimpan tanda tangan', 'error');
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
              Konfigurasi Kop Surat &amp; Tanda Tangan Camat
            </h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Tim verifikasi diatur <strong>per-proposal</strong> — buka tab <strong>Verifikasi Proposal</strong>,
            lalu klik tombol <strong>"Tim Verifikasi"</strong> pada proposal yang sudah disetujui.
          </p>
        </div>

        {(
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SelectField
                label="Jabatan Penandatangan"
                value={config.jabatan_penandatangan || 'Camat'}
                onChange={v => setConfig({...config, jabatan_penandatangan: v})}
                options={['Camat', 'Plt. Camat', 'Pj. Camat']}
              />
              <Field label="Kode Pos" value={config.kode_pos || ''} onChange={v => setConfig({...config, kode_pos: v})} />
              <Field label={`Nama ${config.jabatan_penandatangan || 'Camat'} *`} value={config.nama_camat} onChange={v => setConfig({...config, nama_camat: v})} />
              <Field label={`NIP ${config.jabatan_penandatangan || 'Camat'}`} value={config.nip_camat || ''} onChange={v => setConfig({...config, nip_camat: v})} />
              <Field label="Telepon" value={config.telepon || ''} onChange={v => setConfig({...config, telepon: v})} />
              <Field label="Email" value={config.email || ''} onChange={v => setConfig({...config, email: v})} />
              <Field label="Website" value={config.website || ''} onChange={v => setConfig({...config, website: v})} />
              <Field label="Alamat" value={config.alamat || ''} onChange={v => setConfig({...config, alamat: v})} textarea />
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={handleSyncFromReguler}
                disabled={savingConfig}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-orange-300 text-orange-700 hover:bg-orange-50 font-semibold rounded-xl shadow-sm disabled:opacity-50"
                title="Salin data camat, TTD, dan stempel dari konfigurasi Bankeu reguler"
              >
                <LuRefreshCw className="w-4 h-4" /> Sinkron dari Bankeu Reguler
              </button>
              <button
                onClick={handleSaveConfig}
                disabled={savingConfig}
                className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl shadow-sm disabled:opacity-50"
              >
                <LuSave className="w-4 h-4" /> {savingConfig ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>

            {/* Tanda Tangan Camat - digambar via canvas (bukan upload) */}
            <div className="mt-6 border-t border-gray-200 pt-5">
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Tanda Tangan {config.jabatan_penandatangan || 'Camat'}
              </label>

              {!config.ttd_camat_path ? (
                !showCamatSignaturePad ? (
                  <button
                    type="button"
                    onClick={() => setShowCamatSignaturePad(true)}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl shadow-sm"
                  >
                    <LuPenTool className="w-4 h-4" /> Gambar Tanda Tangan
                  </button>
                ) : (
                  <div className="border-2 border-violet-300 rounded-xl p-3 bg-white max-w-md">
                    <div className="border border-gray-300 rounded-lg overflow-hidden bg-white">
                      <SignatureCanvas
                        ref={camatSigCanvasRef}
                        penColor="black"
                        canvasProps={{ width: 500, height: 160, className: 'w-full h-40 bg-white' }}
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        type="button"
                        onClick={handleSaveCamatSignature}
                        className="inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg"
                      >
                        <LuCheck className="w-4 h-4" /> Simpan
                      </button>
                      <button
                        type="button"
                        onClick={() => camatSigCanvasRef.current?.clear()}
                        className="inline-flex items-center gap-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg"
                      >
                        <LuRotateCcw className="w-4 h-4" /> Hapus
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCamatSignaturePad(false)}
                        className="inline-flex items-center gap-1 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-semibold rounded-lg"
                      >
                        <LuX className="w-4 h-4" /> Batal
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex gap-4 items-start">
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-2">Tanda Tangan Saat Ini</p>
                    <img
                      src={`${imageBaseUrl}/storage/uploads/bankeu-perubahan/config/${config.ttd_camat_path}`}
                      alt="Tanda Tangan Camat"
                      className="h-24 border border-gray-200 rounded p-2 bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      await handleDeleteFile('delete-camat-signature', 'TTD Camat');
                      setShowCamatSignaturePad(true);
                    }}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-semibold rounded-lg"
                  >
                    <LuRotateCcw className="w-4 h-4" /> Gambar Ulang
                  </button>
                </div>
              )}
            </div>

            {/* Stempel - via upload (logo kop memakai logo Kabupaten Bogor standar, tidak diupload) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <FileUploadCard
                label="Stempel (PNG Transparan)"
                filename={config.stempel_path}
                onUpload={f => handleUploadFile('upload-stempel', f, 'Stempel')}
                onDelete={() => handleDeleteFile('delete-stempel', 'Stempel')}
                folder="bankeu-perubahan/config"
              />
            </div>
          </div>
        )}

        {showAddTim && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-800">Tambah Anggota Tim</h3>
              </div>
              <form onSubmit={handleAddTim} className="px-6 py-4 space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Jabatan *</label>
                  <select
                    value={newTim.jabatan}
                    onChange={e => {
                      const opt = JABATAN_OPTIONS.find(o => o.value === e.target.value);
                      setNewTim({ ...newTim, jabatan: e.target.value, jabatan_label: opt?.label || '' });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                  >
                    <option value="">Pilih jabatan...</option>
                    {JABATAN_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
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

const SelectField = ({ label, value, onChange, options }) => (
  <div>
    <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
    <select
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
    >
      {options.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
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
