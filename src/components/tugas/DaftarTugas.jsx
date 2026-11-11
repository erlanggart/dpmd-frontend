import { useCallback, useEffect, useState } from 'react';
import { Circle, CheckCircle2, Pencil, Trash2, Plus, Check, X, ChevronDown, CheckCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';
import confirmDialog from '../../utils/confirmDialog';

// tanggal hari ini menurut WIB, format YYYY-MM-DD (sama dengan format tanggal_pengingat)
const hariIni = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const tanggalId = (ymd) => new Date(`${ymd}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
// belum selesai: tanggal pengingat terdekat dulu, tanpa tanggal di akhir, lalu yang terbaru dibuat
const urutAktif = (a, b) => (a.tanggal_pengingat || '9999').localeCompare(b.tanggal_pengingat || '9999') || b.created_at.localeCompare(a.created_at);
const pesanGalat = (e, cadangan) => e?.response?.data?.message || cadangan;

const kelasInput = 'h-10 rounded-lg border border-slate-200 px-3 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20';
const kelasIkon = 'flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100';

const DaftarTugas = () => {
  const [tugas, setTugas] = useState(null); // null = memuat
  const [gagal, setGagal] = useState(false);
  const [judulBaru, setJudulBaru] = useState('');
  const [tanggalBaru, setTanggalBaru] = useState('');
  const [menambah, setMenambah] = useState(false);
  const [edit, setEdit] = useState(null);
  const [lihatSelesai, setLihatSelesai] = useState(false);

  const muat = useCallback(async () => {
    setGagal(false);
    try {
      const res = await api.get('/tugas-pribadi');
      setTugas(res.data.data || []);
    } catch {
      setGagal(true);
    }
  }, []);

  useEffect(() => {
    muat();
  }, [muat]);

  const aktif = (tugas || []).filter((t) => !t.selesai).sort(urutAktif);
  const selesai = (tugas || []).filter((t) => t.selesai).sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  const pasang = (baru) => setTugas((d) => d.map((t) => (t.id === baru.id ? baru : t)));

  const tambah = async (e) => {
    e.preventDefault();
    const judul = judulBaru.trim();
    if (!judul) {
      toast.error('Tulis dulu pekerjaannya');
      return;
    }
    setMenambah(true);
    try {
      const res = await api.post('/tugas-pribadi', { judul, tanggal_pengingat: tanggalBaru || null });
      setTugas((d) => [res.data.data, ...(d || [])]);
      setJudulBaru('');
      setTanggalBaru('');
      toast.success('Tugas ditambahkan');
    } catch (err) {
      toast.error(pesanGalat(err, 'Gagal menambah tugas'));
    } finally {
      setMenambah(false);
    }
  };

  const centang = async (t) => {
    try {
      const res = await api.patch(`/tugas-pribadi/${t.id}`, { selesai: !t.selesai });
      pasang(res.data.data);
    } catch (err) {
      toast.error(pesanGalat(err, 'Gagal mengubah tugas'));
    }
  };

  const simpanEdit = async () => {
    const judul = edit.judul.trim();
    if (!judul) {
      toast.error('Judul tidak boleh kosong');
      return;
    }
    try {
      const res = await api.patch(`/tugas-pribadi/${edit.id}`, { judul, tanggal_pengingat: edit.tanggal || null });
      pasang(res.data.data);
      setEdit(null);
    } catch (err) {
      toast.error(pesanGalat(err, 'Gagal mengubah tugas'));
    }
  };

  const hapus = async (t) => {
    if (!(await confirmDialog({ title: 'Hapus tugas?', text: t.judul, confirmText: 'Hapus', confirmColor: '#dc2626' }))) return;
    try {
      await api.delete(`/tugas-pribadi/${t.id}`);
      setTugas((d) => d.filter((x) => x.id !== t.id));
      toast.success('Tugas dihapus');
    } catch (err) {
      toast.error(pesanGalat(err, 'Gagal menghapus tugas'));
    }
  };

  const tombolHapus = (t) => (
    <button
      type="button"
      onClick={() => hapus(t)}
      aria-label={`Hapus tugas: ${t.judul}`}
      className={`${kelasIkon} hover:!bg-red-50 hover:!text-red-600`}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );

  const infoTanggal = (tgl) => {
    const h = hariIni();
    if (tgl < h) return { kelas: 'font-medium text-red-600', teks: `Lewat · ${tanggalId(tgl)}` };
    if (tgl === h) return { kelas: 'font-medium text-purple-600', teks: 'Hari ini' };
    return { kelas: 'text-slate-500', teks: `Pengingat · ${tanggalId(tgl)}` };
  };

  const barisEdit = (t) => (
    <li key={t.id} className="flex items-center gap-1 bg-slate-50 px-2 py-1.5">
      <input
        type="text"
        autoFocus
        maxLength={160}
        value={edit.judul}
        onChange={(e) => setEdit({ ...edit, judul: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') simpanEdit();
          else if (e.key === 'Escape') setEdit(null);
        }}
        aria-label="Judul tugas"
        className={`${kelasInput} min-w-0 flex-1`}
      />
      <input
        type="date"
        value={edit.tanggal}
        onChange={(e) => setEdit({ ...edit, tanggal: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === 'Enter') simpanEdit();
          else if (e.key === 'Escape') setEdit(null);
        }}
        aria-label="Tanggal pengingat (opsional)"
        title="Tanggal pengingat (opsional)"
        className={`${kelasInput} w-[10.5rem] text-slate-600`}
      />
      <button
        type="button"
        onClick={simpanEdit}
        aria-label="Simpan"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-purple-600 transition hover:bg-purple-50"
      >
        <Check className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => setEdit(null)}
        aria-label="Batal"
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );

  const barisAktif = (t) => {
    if (edit?.id === t.id) return barisEdit(t);
    const info = t.tanggal_pengingat ? infoTanggal(t.tanggal_pengingat) : null;
    return (
      <li key={t.id} className="group flex items-center gap-1 px-2 py-1 transition hover:bg-slate-50">
        <button
          type="button"
          onClick={() => centang(t)}
          aria-label={`Tandai selesai: ${t.judul}`}
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-purple-50 hover:text-purple-600"
        >
          <Circle className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setEdit({ id: t.id, judul: t.judul, tanggal: t.tanggal_pengingat || '' })}
          className="min-w-0 flex-1 py-1.5 text-left"
        >
          <span className="block truncate text-sm font-medium text-slate-900">{t.judul}</span>
          {info && <span className={`mt-0.5 block text-xs ${info.kelas}`}>{info.teks}</span>}
        </button>
        <button
          type="button"
          onClick={() => setEdit({ id: t.id, judul: t.judul, tanggal: t.tanggal_pengingat || '' })}
          aria-label={`Ubah tugas: ${t.judul}`}
          className={kelasIkon}
        >
          <Pencil className="h-4 w-4" />
        </button>
        {tombolHapus(t)}
      </li>
    );
  };

  let isi;
  if (gagal) {
    isi = (
      <div className="px-4 py-8 text-center text-sm text-slate-500">
        Gagal memuat daftar tugas.{' '}
        <button type="button" onClick={muat} className="font-semibold text-purple-600 hover:text-purple-700">
          Coba lagi
        </button>
      </div>
    );
  } else if (tugas === null) {
    isi = [0, 1, 2].map((i) => <div key={i} className="mx-3 my-2 h-10 animate-pulse rounded-lg bg-slate-100" />);
  } else if (aktif.length === 0 && selesai.length === 0) {
    isi = (
      <div className="px-6 py-10 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-purple-50 text-purple-500">
          <CheckCheck className="h-6 w-6" />
        </div>
        <p className="font-medium text-slate-800">Daftar Anda sudah lega.</p>
        <p className="mt-1 text-sm text-slate-500">Tambahkan pekerjaan yang perlu Anda ingat.</p>
      </div>
    );
  } else {
    isi = (
      <>
        {aktif.length === 0 ? (
          <p className="px-4 py-4 text-sm text-slate-500">Semua tugas sudah selesai.</p>
        ) : (
          <ul className="divide-y divide-slate-100">{aktif.map(barisAktif)}</ul>
        )}
        {selesai.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setLihatSelesai((v) => !v)}
              aria-expanded={lihatSelesai}
              className="flex w-full items-center justify-between border-t border-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
            >
              <span>Selesai ({selesai.length})</span>
              <ChevronDown className={`h-4 w-4 transition ${lihatSelesai ? 'rotate-180' : ''}`} />
            </button>
            {lihatSelesai && (
              <ul className="divide-y divide-slate-100">
                {selesai.map((t) => (
                  <li key={t.id} className="group flex items-center gap-1 px-2 py-1 transition hover:bg-slate-50">
                    <button
                      type="button"
                      onClick={() => centang(t)}
                      aria-label={`Tandai belum selesai: ${t.judul}`}
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-purple-600 transition hover:bg-purple-50"
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </button>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-400 line-through">{t.judul}</span>
                    {tombolHapus(t)}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <form onSubmit={tambah} className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
        <input
          type="text"
          maxLength={160}
          value={judulBaru}
          onChange={(e) => setJudulBaru(e.target.value)}
          placeholder="Contoh: Siapkan bahan rapat"
          aria-label="Tugas baru"
          className={`${kelasInput} min-w-[12rem] flex-1`}
        />
        <input
          type="date"
          value={tanggalBaru}
          onChange={(e) => setTanggalBaru(e.target.value)}
          aria-label="Tanggal pengingat (opsional)"
          title="Tanggal pengingat (opsional)"
          className={`${kelasInput} w-[10.5rem] text-slate-600`}
        />
        <button
          type="submit"
          disabled={menambah}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-purple-600 px-4 text-sm font-semibold text-white hover:bg-purple-700 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Tambah
        </button>
      </form>
      {isi}
      <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
        Tersimpan di akun Anda · pengingat dikirim ke notifikasi pukul 07.05 WIB pada tanggalnya
      </div>
    </div>
  );
};

export default DaftarTugas;
