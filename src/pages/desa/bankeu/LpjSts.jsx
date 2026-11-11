import React, { useState, useEffect, useRef } from 'react';
import { LuReceipt, LuUpload, LuLoader, LuTrash2, LuFileText } from 'react-icons/lu';
import toast from 'react-hot-toast';
import api from '../../../api';
import confirmDialog from '../../../utils/confirmDialog';

const MAKS_MB = 10;
const JENIS = '.pdf,application/pdf';

const hariIni = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const rupiah = (n) => 'Rp ' + Number(n || 0).toLocaleString('id-ID');
const tanggalId = (ymd) =>
  new Date(`${ymd}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

const kelasInput =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

const urlBerkas = (filePath) =>
  `${api.defaults.baseURL?.replace('/api', '') || ''}/storage/uploads/bankeu_lpj/${filePath}`;

// Bukti Surat Tanda Setor (STS) pengembalian dana ke Kas Daerah. Opsional.
const LpjSts = ({ tahun }) => {
  const [daftar, setDaftar] = useState(null); // null = memuat
  const [nominal, setNominal] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [berkas, setBerkas] = useState(null);
  const [mengunggah, setMengunggah] = useState(false);
  const [menghapus, setMenghapus] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    let batal = false;
    setDaftar(null);
    api
      .get('/desa/bankeu-lpj/sts', { params: { tahun } })
      .then((res) => { if (!batal) setDaftar(res.data.data || []); })
      .catch((err) => {
        if (batal) return;
        setDaftar([]);
        toast.error(err.response?.data?.message || 'Gagal memuat bukti STS');
      });
    return () => { batal = true; };
  }, [tahun]);

  const kirim = async () => {
    if (!nominal || Number(nominal) === 0) return toast.error('Isi nominal yang disetor');
    if (!tanggal) return toast.error('Isi tanggal setor');
    if (tanggal > hariIni()) return toast.error('Tanggal setor tidak boleh di masa depan');
    if (!berkas) return toast.error('Pilih file bukti STS');
    if (!/\.pdf$/i.test(berkas.name)) return toast.error('File STS harus berformat PDF');
    if (berkas.size > MAKS_MB * 1024 * 1024) return toast.error(`Ukuran file maksimal ${MAKS_MB} MB`);

    const fd = new FormData();
    fd.append('file', berkas);
    fd.append('tahun_anggaran', tahun);
    fd.append('nominal', nominal);
    fd.append('tanggal_setor', tanggal);
    setMengunggah(true);
    try {
      const res = await api.post('/desa/bankeu-lpj/sts', fd);
      setDaftar((d) => [res.data.data, ...(d || [])]);
      setNominal('');
      setTanggal('');
      setBerkas(null);
      if (fileRef.current) fileRef.current.value = '';
      toast.success('Bukti STS diunggah');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengunggah bukti STS');
    } finally {
      setMengunggah(false);
    }
  };

  const hapus = async (s) => {
    const ok = await confirmDialog({
      title: 'Hapus bukti STS?',
      text: s.nama_file,
      confirmText: 'Hapus',
      confirmColor: '#dc2626',
    });
    if (!ok) return;
    setMenghapus(s.id);
    try {
      await api.delete(`/desa/bankeu-lpj/sts/${s.id}`);
      setDaftar((d) => d.filter((x) => x.id !== s.id));
      toast.success('Bukti STS dihapus');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus bukti STS');
    } finally {
      setMenghapus(null);
    }
  };

  const total = (daftar || []).reduce((n, s) => n + Number(s.nominal || 0), 0);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
        <LuReceipt className="h-4 w-4 text-slate-400" />
        Bukti STS Pengembalian Dana
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">Opsional</span>
      </h3>
      <p className="mt-1 text-sm text-slate-500">
        Unggah Surat Tanda Setor (STS) bila ada sisa dana Bantuan Keuangan TA {tahun} yang dikembalikan ke Kas
        Daerah. Bagian ini tidak wajib dan tidak menghalangi unggah LPJ.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Nominal disetor</span>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rp</span>
            <input
              type="text"
              inputMode="numeric"
              value={nominal ? Number(nominal).toLocaleString('id-ID') : ''}
              onChange={(e) => setNominal(e.target.value.replace(/\D/g, '').slice(0, 13))}
              className={`${kelasInput} pl-9`}
            />
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">Tanggal setor</span>
          <input
            type="date"
            value={tanggal}
            max={hariIni()}
            onChange={(e) => setTanggal(e.target.value)}
            className={kelasInput}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600">File STS (PDF, maks. {MAKS_MB} MB)</span>
          <input
            ref={fileRef}
            type="file"
            accept={JENIS}
            onChange={(e) => setBerkas(e.target.files?.[0] || null)}
            className={kelasInput}
          />
        </label>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={kirim}
          disabled={mengunggah}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {mengunggah ? <LuLoader className="h-4 w-4 animate-spin" /> : <LuUpload className="h-4 w-4" />}
          {mengunggah ? 'Mengunggah…' : 'Unggah STS'}
        </button>
      </div>

      {daftar === null ? (
        <div className="mt-4 h-12 animate-pulse rounded-lg bg-slate-100" />
      ) : daftar.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">Belum ada bukti STS diunggah.</p>
      ) : (
        <div className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-200">
          {daftar.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{rupiah(s.nominal)}</p>
                <p className="text-xs text-slate-500">Disetor {tanggalId(s.tanggal_setor)}</p>
              </div>
              <a
                href={urlBerkas(s.file_path)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
              >
                <LuFileText className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="max-w-[12rem] truncate">{s.nama_file}</span>
              </a>
              <button
                type="button"
                onClick={() => hapus(s)}
                disabled={menghapus === s.id}
                aria-label={`Hapus STS ${s.nama_file}`}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
              >
                <LuTrash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <div className="bg-slate-50 px-3 py-2 text-right text-xs text-slate-600">
            Total disetor: <b>{rupiah(total)}</b>
          </div>
        </div>
      )}
    </div>
  );
};

export default LpjSts;
