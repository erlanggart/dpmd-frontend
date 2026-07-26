import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Settings2, Trash2, Pencil, Check, X, Loader2, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';

const inputCls = "w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition";

const fmtTanggal = (v) => {
  if (!v) return '';
  try {
    return new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

const optionLabel = (s) => `${s.nomor}${s.keterangan ? ` — ${s.keterangan}` : ''}`;

/**
 * Dropdown SK referensi (statis per tahun) untuk dokumen pencairan.
 * Menyimpan/memilih/menambah/mengelola SK Bupati (KPA) atau SK Kepala Dinas (PPK).
 *
 * Props:
 *   jenis    : 'bupati_kpa' | 'kadis_ppk'
 *   value    : nomor SK terpilih (string)
 *   onChange : (nomor) => void
 *   tahun    : tahun anggaran berjalan (untuk kategorisasi list)
 */
const SkReferensiSelect = ({ jenis, value, onChange, tahun }) => {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [panel, setPanel] = useState(null); // null | 'add' | 'manage'

  // Form tambah/edit
  const emptyForm = useMemo(() => ({
    id: null,
    tahun: tahun || new Date().getFullYear(),
    nomor: '',
    tanggal: '',
    keterangan: '',
  }), [tahun]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchList = useCallback(async () => {
    if (!jenis) return;
    setLoading(true);
    try {
      const res = await api.get('/pencairan-sk', { params: { jenis } });
      setList(res.data?.data || []);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [jenis]);

  useEffect(() => { fetchList(); }, [fetchList]);

  // Kelompokkan: tahun berjalan dulu, tahun lain di bawah.
  const { relevan, lainnya } = useMemo(() => {
    const relevan = [];
    const lainnya = [];
    list.forEach(s => (tahun && s.tahun === tahun ? relevan : lainnya).push(s));
    return { relevan, lainnya };
  }, [list, tahun]);

  const valueInList = list.some(s => s.nomor === value);

  const openAdd = () => {
    setForm({ ...emptyForm });
    setPanel(p => (p === 'add' ? null : 'add'));
  };

  const openEdit = (s) => {
    setForm({
      id: s.id,
      tahun: s.tahun,
      nomor: s.nomor,
      tanggal: s.tanggal || '',
      keterangan: s.keterangan || '',
    });
    setPanel('add');
  };

  const handleSave = async () => {
    if (!form.nomor.trim()) { toast.error('Nomor SK wajib diisi'); return; }
    if (!form.tahun) { toast.error('Tahun wajib diisi'); return; }
    setSaving(true);
    try {
      const payload = {
        jenis,
        tahun: Number(form.tahun),
        nomor: form.nomor.trim(),
        tanggal: form.tanggal || null,
        keterangan: form.keterangan.trim() || null,
      };
      let savedNomor = payload.nomor;
      if (form.id) {
        await api.put(`/pencairan-sk/${form.id}`, payload);
        toast.success('SK diperbarui');
      } else {
        await api.post('/pencairan-sk', payload);
        toast.success('SK ditambahkan');
      }
      await fetchList();
      onChange(savedNomor); // auto-pakai SK yang baru disimpan
      setPanel(null);
      setForm({ ...emptyForm });
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan SK');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Hapus SK "${s.nomor}"?`)) return;
    try {
      await api.delete(`/pencairan-sk/${s.id}`);
      toast.success('SK dihapus');
      if (value === s.nomor) onChange('');
      fetchList();
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menghapus SK');
    }
  };

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <select
          value={valueInList ? value : (value ? '__custom__' : '')}
          onChange={e => { if (e.target.value !== '__custom__') onChange(e.target.value); }}
          className={inputCls}
        >
          <option value="">{loading ? 'Memuat…' : '— Pilih SK tersimpan —'}</option>
          {value && !valueInList && (
            <option value="__custom__">{value} (nilai saat ini)</option>
          )}
          {relevan.length > 0 && (
            <optgroup label={`Tahun ${tahun} (berjalan)`}>
              {relevan.map(s => (
                <option key={s.id} value={s.nomor}>{optionLabel(s)}</option>
              ))}
            </optgroup>
          )}
          {lainnya.length > 0 && (
            <optgroup label="Tahun lainnya">
              {lainnya.map(s => (
                <option key={s.id} value={s.nomor}>{optionLabel(s)} · {s.tahun}</option>
              ))}
            </optgroup>
          )}
        </select>
        <button
          type="button"
          onClick={openAdd}
          title="Tambah SK baru"
          className={`shrink-0 p-2 rounded-lg border transition ${panel === 'add' ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300 hover:text-amber-700'}`}
        >
          <Plus className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setPanel(p => (p === 'manage' ? null : 'manage'))}
          title="Kelola SK tersimpan"
          className={`shrink-0 p-2 rounded-lg border transition ${panel === 'manage' ? 'bg-gray-100 border-gray-300 text-gray-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </div>

      {/* Panel Tambah / Edit */}
      {panel === 'add' && (
        <div className="mt-2 p-3 rounded-lg bg-amber-50/60 border border-amber-100 space-y-2">
          <p className="text-[11px] font-semibold text-amber-800">
            {form.id ? 'Edit SK' : 'Tambah SK baru'}
          </p>
          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-1">
              <label className="text-[10px] font-semibold text-gray-600">Tahun</label>
              <input
                type="number"
                value={form.tahun}
                onChange={e => setForm(f => ({ ...f, tahun: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div className="col-span-2">
              <label className="text-[10px] font-semibold text-gray-600">Tanggal SK (opsional)</label>
              <input
                type="date"
                value={form.tanggal}
                onChange={e => setForm(f => ({ ...f, tanggal: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-600">Nomor SK</label>
            <input
              value={form.nomor}
              onChange={e => setForm(f => ({ ...f, nomor: e.target.value }))}
              placeholder="mis. 900.1/12/Kpts/Per-UU/2026"
              className={inputCls}
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-gray-600">Keterangan (opsional)</label>
            <input
              value={form.keterangan}
              onChange={e => setForm(f => ({ ...f, keterangan: e.target.value }))}
              placeholder="mis. Penunjukan KPA TA 2026"
              className={inputCls}
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-[12px] font-semibold hover:bg-amber-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Simpan
            </button>
            <button
              type="button"
              onClick={() => { setPanel(null); setForm({ ...emptyForm }); }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-[12px] font-medium hover:border-gray-300"
            >
              <X className="h-3.5 w-3.5" />
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Panel Kelola */}
      {panel === 'manage' && (
        <div className="mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200">
          <p className="text-[11px] font-semibold text-gray-700 mb-2">SK Tersimpan</p>
          {list.length === 0 ? (
            <div className="text-center py-4 text-[12px] text-gray-400">
              <FileText className="h-6 w-6 mx-auto mb-1 text-gray-300" />
              Belum ada SK. Klik <Plus className="h-3 w-3 inline" /> untuk menambah.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {[...relevan, ...lainnya].map(s => (
                <div key={s.id} className="flex items-center gap-2 p-2 rounded-md bg-white border border-gray-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-gray-800 truncate">{s.nomor}</p>
                    <p className="text-[10px] text-gray-500 truncate">
                      Tahun {s.tahun}
                      {s.tanggal ? ` · ${fmtTanggal(s.tanggal)}` : ''}
                      {s.keterangan ? ` · ${s.keterangan}` : ''}
                    </p>
                  </div>
                  <button type="button" onClick={() => openEdit(s)} title="Edit"
                    className="p-1.5 rounded text-gray-400 hover:text-amber-600 hover:bg-amber-50">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => handleDelete(s)} title="Hapus"
                    className="p-1.5 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SkReferensiSelect;
