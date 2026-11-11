import React, { useState, useEffect } from 'react';
import { ClipboardCheck, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api';
import confirmDialog from '../../../utils/confirmDialog';

const TAHUN = 2026;
const MAKS_MB = 25;
const asal = api.defaults.baseURL?.replace('/api', '') || '';
const tanggalId = (ymd) => new Date(`${String(ymd).slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

const KecamatanMonevBankeuPage = () => {
  const [data, setData] = useState(null); // null = memuat
  const [gagal, setGagal] = useState(false);
  const [cari, setCari] = useState('');
  const [bukaDesa, setBukaDesa] = useState(null);
  const [berkas, setBerkas] = useState(null);
  const [keterangan, setKeterangan] = useState('');
  const [mengunggah, setMengunggah] = useState(false);
  const [menghapus, setMenghapus] = useState(null);

  const muat = async () => {
    setGagal(false);
    setData(null);
    try {
      const res = await api.get('/kecamatan/bankeu-monev', { params: { tahun: TAHUN } });
      setData(res.data.data);
    } catch {
      setGagal(true);
    }
  };

  useEffect(() => {
    muat();
  }, []);

  // Ubah daftar monev satu desa di state
  const ubahMonev = (desaId, fn) =>
    setData((d) => ({ ...d, desa: d.desa.map((x) => (x.desa_id === desaId ? { ...x, monev: fn(x.monev) } : x)) }));

  const toggleForm = (desaId) => {
    setBukaDesa((b) => (b === desaId ? null : desaId));
    setBerkas(null);
    setKeterangan('');
  };

  const unggah = async (desaId) => {
    if (!berkas) return toast.error('Pilih file hasil monev');
    if (berkas.size > MAKS_MB * 1024 * 1024) return toast.error(`Ukuran file maksimal ${MAKS_MB} MB`);
    const fd = new FormData();
    fd.append('file', berkas);
    fd.append('desa_id', desaId);
    fd.append('tahun_anggaran', TAHUN);
    fd.append('keterangan', keterangan);
    setMengunggah(true);
    try {
      const res = await api.post('/kecamatan/bankeu-monev', fd);
      ubahMonev(desaId, (m) => [res.data.data, ...m]);
      setBukaDesa(null);
      setBerkas(null);
      setKeterangan('');
      toast.success('Hasil monev diunggah');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengunggah hasil monev');
    } finally {
      setMengunggah(false);
    }
  };

  const hapus = async (desaId, m) => {
    const ya = await confirmDialog({ title: 'Hapus hasil monev?', text: m.nama_file, confirmText: 'Hapus', confirmColor: '#dc2626' });
    if (!ya) return;
    setMenghapus(m.id);
    try {
      await api.delete(`/kecamatan/bankeu-monev/${m.id}`);
      ubahMonev(desaId, (arr) => arr.filter((x) => x.id !== m.id));
      toast.success('Hasil monev dihapus');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus hasil monev');
    } finally {
      setMenghapus(null);
    }
  };

  const total = data?.desa.length || 0;
  const sudah = data?.desa.filter((d) => d.monev.length).length || 0;
  const persen = total ? Math.round((sudah / total) * 100) : 0;
  const daftar = data?.desa.filter((d) => d.desa_nama.toLowerCase().includes(cari.trim().toLowerCase())) || [];

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
          <ClipboardCheck className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900">Hasil Monev Bankeu TA {TAHUN}</h1>
          <p className="text-sm text-slate-500">
            {data ? `Kecamatan ${data.kecamatan_nama} · ` : ''}Unggah laporan monitoring & evaluasi Bantuan Keuangan untuk tiap desa. Hanya dapat dilihat DPMD.
          </p>
        </div>
      </div>

      {gagal ? (
        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
          Gagal memuat data.{' '}
          <button onClick={muat} className="font-semibold text-violet-700 hover:underline">Coba lagi</button>
        </div>
      ) : !data ? (
        <div className="mt-5 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-sm text-slate-700">{sudah} dari {total} desa sudah diunggah</p>
            <div className="mt-2 h-2 rounded-full bg-slate-100">
              <div className="h-2 rounded-full bg-violet-500" style={{ width: `${persen}%` }} />
            </div>
          </div>

          <input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari desa…"
            className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />

          {daftar.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Desa tidak ditemukan.</p>
          ) : (
            <div className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
              {daftar.map((d) => (
                <div key={d.desa_id}>
                  <div className="flex items-center gap-3 px-4 py-3">
                    <span className="flex-1 font-medium text-slate-900">{d.desa_nama}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${d.monev.length ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {d.monev.length ? 'Sudah' : 'Belum'}
                    </span>
                    <button
                      onClick={() => toggleForm(d.desa_id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-violet-200 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50"
                    >
                      <Upload className="h-3.5 w-3.5" /> Unggah
                    </button>
                  </div>

                  {d.monev.length > 0 && (
                    <div className="space-y-1.5 px-4 pb-3">
                      {d.monev.map((m) => (
                        <div key={m.id}>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 flex-shrink-0 text-slate-400" />
                            <a
                              href={`${asal}/storage/uploads/bankeu_monev/${m.file_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="truncate text-sm text-blue-600 hover:underline"
                            >
                              {m.nama_file}
                            </a>
                            <span className="flex-shrink-0 text-xs text-slate-400">
                              {tanggalId(m.created_at)} · {m.uploaded_by_name}
                            </span>
                            <button
                              onClick={() => hapus(d.desa_id, m)}
                              disabled={menghapus === m.id}
                              aria-label={`Hapus ${m.nama_file}`}
                              className="ml-auto flex-shrink-0 text-slate-400 hover:text-red-600 disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          {m.keterangan && <p className="ml-6 text-xs text-slate-500">{m.keterangan}</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  {bukaDesa === d.desa_id && (
                    <div className="mx-4 mb-3 flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-3">
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setBerkas(e.target.files?.[0] || null)}
                        className="text-sm"
                      />
                      <input
                        value={keterangan}
                        onChange={(e) => setKeterangan(e.target.value)}
                        maxLength={500}
                        placeholder="Keterangan (opsional)"
                        className="min-w-[12rem] flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
                      />
                      <button
                        onClick={() => unggah(d.desa_id)}
                        disabled={mengunggah}
                        className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-60"
                      >
                        {mengunggah && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Simpan
                      </button>
                      <button
                        onClick={() => toggleForm(d.desa_id)}
                        className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Batal
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default KecamatanMonevBankeuPage;
