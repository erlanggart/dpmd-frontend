import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useBidangPath } from '../../../../hooks/useBidangPath';
import {
  ArrowLeft, Plus, Search, Edit2, Trash2,
  DollarSign, FileText, Layers, X, Save, AlertCircle, RefreshCw,
  Calendar, Hash, ChevronDown, ChevronUp
} from 'lucide-react';
import api from '../../../../api';
import toast from 'react-hot-toast';

const formatRupiah = (value) => {
  if (!value && value !== 0) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
};

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = [CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1];

// ============================================================
// Modal Tambah/Edit Master Kegiatan
// ============================================================
const MasterModal = ({ isOpen, onClose, onSave, editData, defaultBidangId, allBidangs, loading }) => {
  const [form, setForm] = useState({
    bidang_id: '',
    bidang_unit_id: '',
    kode_program: '',
    nama_program: '',
    kode_kegiatan: '',
    nama_kegiatan: '',
    kode_sub_kegiatan: '',
    nama_sub_kegiatan: '',
  });
  const [availableUnits, setAvailableUnits] = useState([]);

  useEffect(() => {
    const init = editData
      ? {
          bidang_id: editData.bidang_id || defaultBidangId || '',
          bidang_unit_id: editData.bidang_unit_id || '',
          kode_program: editData.kode_program || '',
          nama_program: editData.nama_program || '',
          kode_kegiatan: editData.kode_kegiatan || '',
          nama_kegiatan: editData.nama_kegiatan || '',
          kode_sub_kegiatan: editData.kode_sub_kegiatan || '',
          nama_sub_kegiatan: editData.nama_sub_kegiatan || '',
        }
      : { bidang_id: defaultBidangId || '', bidang_unit_id: '', kode_program: '', nama_program: '', kode_kegiatan: '', nama_kegiatan: '', kode_sub_kegiatan: '', nama_sub_kegiatan: '' };
    setForm(init);
  }, [editData, isOpen, defaultBidangId]);

  // Load sub-units when bidang_id changes
  useEffect(() => {
    if (!form.bidang_id) { setAvailableUnits([]); return; }
    api.get('/anggaran/bidang-units', { params: { bidang_id: form.bidang_id } })
      .then(res => setAvailableUnits(res.data.success ? res.data.data : []))
      .catch(() => setAvailableUnits([]));
  }, [form.bidang_id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
      // Reset unit when bidang changes
      ...(name === 'bidang_id' ? { bidang_unit_id: '' } : {}),
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.bidang_id) return toast.error('Bidang wajib dipilih');
    if (!form.nama_program.trim()) return toast.error('Nama program wajib diisi');
    if (!form.nama_kegiatan.trim()) return toast.error('Nama kegiatan wajib diisi');
    onSave(form);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">
              {editData ? 'Edit Program Kegiatan' : 'Tambah Program Kegiatan'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Data program kegiatan bersifat tetap setiap tahun. Pagu diatur terpisah per tahun.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Bidang + Sub Bagian */}
          <div className="border border-blue-100 bg-blue-50 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide">Penempatan</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Bidang <span className="text-red-500">*</span></label>
                <select
                  name="bidang_id"
                  value={form.bidang_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  required
                >
                  <option value="">-- Pilih Bidang --</option>
                  {allBidangs.map(b => (
                    <option key={b.id} value={b.id}>{b.nama}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Sub Bagian (opsional)</label>
                <select
                  name="bidang_unit_id"
                  value={form.bidang_unit_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  disabled={!form.bidang_id || availableUnits.length === 0}
                >
                  <option value="">-- Tanpa Sub Bagian --</option>
                  {availableUnits.map(u => (
                    <option key={u.id} value={u.id}>{u.nama}</option>
                  ))}
                </select>
                {form.bidang_id && availableUnits.length === 0 && (
                  <p className="text-xs text-gray-400 mt-1">Bidang ini tidak memiliki sub bagian</p>
                )}
              </div>
            </div>
            {editData && editData.bidang_id && String(editData.bidang_id) !== String(form.bidang_id) && (
              <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <span>⚠</span>
                <span>Sub kegiatan ini akan dipindahkan ke bidang yang dipilih. Sub bagian akan direset.</span>
              </div>
            )}
          </div>

          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Program</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kode Program</label>
                <input name="kode_program" value={form.kode_program} onChange={handleChange} placeholder="2.13.02"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Nama Program <span className="text-red-500">*</span></label>
                <input name="nama_program" value={form.nama_program} onChange={handleChange} placeholder="PROGRAM PENATAAN DESA"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" required />
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Kegiatan</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kode Kegiatan</label>
                <input name="kode_kegiatan" value={form.kode_kegiatan} onChange={handleChange} placeholder="2.13.02.2.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Nama Kegiatan <span className="text-red-500">*</span></label>
                <input name="nama_kegiatan" value={form.nama_kegiatan} onChange={handleChange} placeholder="Penyelenggaraan Penataan Desa"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" required />
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Sub Kegiatan (opsional)</h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Kode Sub Kegiatan</label>
                <input name="kode_sub_kegiatan" value={form.kode_sub_kegiatan} onChange={handleChange} placeholder="2.13.02.2.01.0001"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Nama Sub Kegiatan</label>
                <input name="nama_sub_kegiatan" value={form.nama_sub_kegiatan} onChange={handleChange} placeholder="Pembentukan, Penghapusan..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm" />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50">Batal</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Save className="h-4 w-4" />}
              {editData ? 'Simpan Perubahan' : 'Tambahkan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// Modal Set Pagu per Tahun
// ============================================================
const PaguModal = ({ isOpen, onClose, onSave, master, tahun, existingPagu, loading }) => {
  const [pagu, setPagu] = useState('');
  const [paguIndikatif, setPaguIndikatif] = useState('');

  useEffect(() => {
    if (existingPagu) {
      setPagu(existingPagu.pagu || '');
      setPaguIndikatif(existingPagu.pagu_indikatif || '');
    } else {
      setPagu('');
      setPaguIndikatif('');
    }
  }, [existingPagu, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!pagu && pagu !== 0) return toast.error('Pagu wajib diisi');
    onSave({ tahun, pagu: Number(pagu), pagu_indikatif: Number(paguIndikatif) || 0 });
  };

  if (!isOpen || !master) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-800">Set Pagu Tahun {tahun}</h2>
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{master.nama_sub_kegiatan || master.nama_kegiatan}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Pagu Anggaran (Rp) <span className="text-red-500">*</span></label>
            <input
              type="number"
              value={pagu}
              onChange={e => setPagu(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
            />
            {pagu > 0 && <p className="text-xs text-gray-500 mt-1">{formatRupiah(pagu)}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Pagu Indikatif (Rp)</label>
            <input
              type="number"
              value={paguIndikatif}
              onChange={e => setPaguIndikatif(e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50">Batal</button>
            <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Save className="h-4 w-4" />}
              Simpan Pagu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================
// Baris List Master Kegiatan (menggantikan card grid)
// ============================================================
const MasterRow = ({ master, idx, tahun, isSuperadmin, onEdit, onDelete, onSetPagu, onViewItems }) => {
  const [expanded, setExpanded] = useState(false);
  const paguTahunIni = master.pagu_list?.find(p => p.tahun === tahun);

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0">
        {/* Nomor */}
        <span className="text-xs text-gray-400 w-6 text-center shrink-0">{idx + 1}</span>

        {/* Nama & kode */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {master.kode_sub_kegiatan && (
              <span className="font-mono text-xs text-gray-400 shrink-0">{master.kode_sub_kegiatan}</span>
            )}
            <span className="text-sm font-medium text-gray-800 leading-snug">
              {master.nama_sub_kegiatan || master.nama_kegiatan}
            </span>
          </div>
          {master.bidang_unit && (
            <span className="inline-block mt-1 text-xs bg-purple-100 text-purple-700 font-medium px-2 py-0.5 rounded-full">
              {master.bidang_unit.nama}
            </span>
          )}
          {master.bidangs && !master.bidang_unit && (
            <span className="inline-block mt-1 text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
              {master.bidangs.nama}
            </span>
          )}
        </div>

        {/* Pagu */}
        <div className="text-right shrink-0 w-44 hidden sm:block">
          {paguTahunIni ? (
            <>
              <p className="text-sm font-bold text-emerald-700">{formatRupiah(paguTahunIni.pagu)}</p>
              <p className="text-xs text-gray-400">{paguTahunIni.item_count || 0} item</p>
            </>
          ) : (
            <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              Belum ada pagu
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {paguTahunIni && (
            <button
              onClick={() => onViewItems(master, paguTahunIni)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors"
            >
              <Hash className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Item</span>
            </button>
          )}
          {isSuperadmin && (
            <button
              onClick={() => onSetPagu(master, paguTahunIni)}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
            >
              <DollarSign className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{paguTahunIni ? 'Edit' : 'Set'} Pagu</span>
            </button>
          )}
          <button
            onClick={() => setExpanded(p => !p)}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
            title="Detail"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          {isSuperadmin && (
            <>
              <button onClick={() => onEdit(master)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="Edit">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onDelete(master)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Hapus">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 text-xs text-gray-500 space-y-1 ml-9">
          {master.kode_program && <p>Program: <span className="font-mono">{master.kode_program}</span> — {master.nama_program}</p>}
          {master.kode_kegiatan && <p>Kegiatan: <span className="font-mono">{master.kode_kegiatan}</span> — {master.nama_kegiatan}</p>}
          {master.pagu_list?.length > 0 && (
            <div className="mt-1">
              <p className="font-semibold text-gray-600 mb-1">Pagu semua tahun:</p>
              {master.pagu_list.map(p => (
                <div key={p.tahun} className="flex items-center justify-between py-0.5 max-w-xs">
                  <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {p.tahun}</span>
                  <span className="font-semibold text-gray-700">{formatRupiah(p.pagu)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

// ============================================================
// Halaman Utama
// ============================================================
const ProgramKegiatanPage = () => {
  const navigate = useNavigate();
  const { getPath } = useBidangPath();
  const [searchParams] = useSearchParams();

  const bidangId = searchParams.get('bidang_id');
  const unitId = searchParams.get('unit_id');
  const label = searchParams.get('label') || 'Program Kegiatan';
  const initialSearch = searchParams.get('q') || '';

  const [masters, setMasters] = useState([]);
  const [allBidangs, setAllBidangs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState(initialSearch);
  const [tahunFilter, setTahunFilter] = useState(CURRENT_YEAR);
  const [masterModalOpen, setMasterModalOpen] = useState(false);
  const [paguModalOpen, setPaguModalOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [selectedMaster, setSelectedMaster] = useState(null);
  const [selectedPagu, setSelectedPagu] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isSuperadmin = user.role === 'superadmin';

  const fetchMasters = useCallback(async () => {
    try {
      setLoading(true);
      const params = { tahun: tahunFilter };
      if (bidangId) params.bidang_id = bidangId;
      if (unitId) params.bidang_unit_id = unitId;
      if (search) params.search = search;
      const res = await api.get('/anggaran/master', { params });
      if (res.data.success) setMasters(res.data.data);
    } catch (error) {
      console.error('Error fetching master kegiatan:', error);
      toast.error('Gagal memuat data kegiatan');
    } finally {
      setLoading(false);
    }
  }, [bidangId, unitId, tahunFilter, search]);

  useEffect(() => {
    fetchMasters();
  }, [fetchMasters]);

  useEffect(() => {
    api.get('/anggaran/bidang')
      .then(res => res.data.success && setAllBidangs(res.data.data.map(b => ({ id: b.id, nama: b.nama }))))
      .catch(() => {});
  }, []);

  const handleSaveMaster = async (formData) => {
    try {
      setSaving(true);
      if (editData) {
        await api.put(`/anggaran/master/${editData.id}`, formData);
        toast.success('Kegiatan berhasil diupdate');
      } else {
        await api.post('/anggaran/master', formData);
        toast.success('Kegiatan berhasil ditambahkan');
      }
      setMasterModalOpen(false);
      setEditData(null);
      fetchMasters();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan kegiatan');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePagu = async (formData) => {
    try {
      setSaving(true);
      await api.post(`/anggaran/master/${selectedMaster.id}/pagu`, formData);
      toast.success(`Pagu tahun ${formData.tahun} berhasil disimpan`);
      setPaguModalOpen(false);
      setSelectedMaster(null);
      setSelectedPagu(null);
      fetchMasters();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menyimpan pagu');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (master) => {
    try {
      await api.delete(`/anggaran/master/${master.id}`);
      toast.success('Kegiatan berhasil dihapus');
      setDeleteConfirm(null);
      fetchMasters();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Gagal menghapus kegiatan');
    }
  };

  const handleViewItems = (master, pagu) => {
    const params = new URLSearchParams();
    params.set('pagu_id', pagu.id);
    params.set('label', master.nama_sub_kegiatan || master.nama_kegiatan);
    params.set('sub_label', `${master.nama_program} · ${tahunFilter}`);
    navigate(`${getPath('/sekretariat/anggaran/item-rka')}?${params.toString()}`);
  };

  const handleSetPagu = (master, existingPagu) => {
    setSelectedMaster(master);
    setSelectedPagu(existingPagu || null);
    setPaguModalOpen(true);
  };

  // Group by program
  const grouped = masters.reduce((acc, m) => {
    const key = m.kode_program || m.nama_program;
    if (!acc[key]) acc[key] = { nama_program: m.nama_program, kode_program: m.kode_program, items: [] };
    acc[key].items.push(m);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button onClick={() => navigate(-1)} className="mb-4 flex items-center gap-2 text-emerald-100 hover:text-white transition-colors text-sm">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </button>
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
              <Layers className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold">{label}</h1>
              <p className="text-emerald-100 text-sm mt-0.5">Program & Sub Kegiatan Anggaran</p>
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1 min-w-60 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari kegiatan atau program..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
            />
          </div>

          <select
            value={tahunFilter}
            onChange={e => setTahunFilter(Number(e.target.value))}
            className="px-4 py-2.5 border border-gray-300 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500"
          >
            {YEARS.map(y => <option key={y} value={y}>Tahun {y}</option>)}
          </select>

          <button onClick={fetchMasters} className="p-2.5 border border-gray-300 rounded-xl bg-white hover:bg-gray-50">
            <RefreshCw className="h-5 w-5 text-gray-500" />
          </button>

          {isSuperadmin && (
            <button
              onClick={() => { setEditData(null); setMasterModalOpen(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium"
            >
              <Plus className="h-5 w-5" />
              Tambah Kegiatan
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600" />
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">Belum ada program kegiatan</p>
            {isSuperadmin && (
              <button
                onClick={() => { setEditData(null); setMasterModalOpen(true); }}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-medium"
              >
                <Plus className="h-5 w-5" />
                Tambah Kegiatan Pertama
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.values(grouped).map(group => (
              <div key={group.kode_program || group.nama_program}>
                {/* Program header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    {group.kode_program && (
                      <span className="font-mono text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{group.kode_program}</span>
                    )}
                    <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">{group.nama_program}</h2>
                  </div>
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400">{group.items.length} sub kegiatan</span>
                </div>

                {/* Master kegiatan — list */}
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  {/* List header */}
                  <div className="hidden sm:flex items-center gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    <span className="w-6 text-center">#</span>
                    <span className="flex-1">Kode / Sub Kegiatan</span>
                    <span className="w-44 text-right">Pagu {tahunFilter}</span>
                    <span className="w-48 text-right">Aksi</span>
                  </div>
                  {group.items.map((master, idx) => (
                    <MasterRow
                      key={master.id}
                      master={master}
                      idx={idx}
                      tahun={tahunFilter}
                      isSuperadmin={isSuperadmin}
                      onEdit={(m) => { setEditData(m); setMasterModalOpen(true); }}
                      onDelete={setDeleteConfirm}
                      onSetPagu={handleSetPagu}
                      onViewItems={handleViewItems}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Master Modal */}
      <MasterModal
        isOpen={masterModalOpen}
        onClose={() => { setMasterModalOpen(false); setEditData(null); }}
        onSave={handleSaveMaster}
        editData={editData}
        defaultBidangId={bidangId}
        allBidangs={allBidangs}
        loading={saving}
      />

      {/* Pagu Modal */}
      <PaguModal
        isOpen={paguModalOpen}
        onClose={() => { setPaguModalOpen(false); setSelectedMaster(null); setSelectedPagu(null); }}
        onSave={handleSavePagu}
        master={selectedMaster}
        tahun={tahunFilter}
        existingPagu={selectedPagu}
        loading={saving}
      />

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDeleteConfirm(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Hapus Program Kegiatan</h3>
                <p className="text-sm text-gray-500">Semua pagu dan item RKA akan ikut terhapus</p>
              </div>
            </div>
            <p className="text-gray-700 mb-2">Yakin ingin menghapus:</p>
            <p className="font-semibold text-gray-800 mb-6 text-sm">{deleteConfirm.nama_sub_kegiatan || deleteConfirm.nama_kegiatan}</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50">Batal</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700">Ya, Hapus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramKegiatanPage;
