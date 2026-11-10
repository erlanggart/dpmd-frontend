import React, { useState, useEffect } from 'react';
import { LuVideo, LuPlus, LuTrash2, LuLoader, LuCircleCheck, LuCircleAlert } from 'react-icons/lu';
import toast from 'react-hot-toast';
import api from '../../../api';

const MIN_LINK = 3;
const MAX_LINK = 10;
const MAX_PANJANG = 500;

const KATEGORI = [
  { key: 'dayeuh_pajajaran', label: 'Video Dayeuh Pajajaran' },
  { key: 'infrastruktur', label: 'Video Infrastruktur' },
];

// Isi sampai minimal MIN_LINK input supaya selalu ada tiga kolom wajib.
const padLink = (arr) => {
  const hasil = [...(arr || [])];
  while (hasil.length < MIN_LINK) hasil.push('');
  return hasil;
};

const urlSah = (v) => {
  if (v.length > MAX_PANJANG) return false;
  try {
    return ['http:', 'https:'].includes(new URL(v).protocol);
  } catch {
    return false;
  }
};

// Mengembalikan { key: [pesan per indeks], ...} + pesan per kategori di `_kat`
const validasi = (draf) => {
  const galat = {};
  for (const { key } of KATEGORI) {
    const g = { item: {}, kat: null };
    const terisi = draf[key].map((v) => v.trim()).filter(Boolean);
    if (terisi.length < MIN_LINK) g.kat = `Minimal ${MIN_LINK} link video harus diisi.`;
    draf[key].forEach((v, i) => {
      const t = v.trim();
      if (t && !urlSah(t)) g.item[i] = `Link harus diawali http:// atau https:// (maks ${MAX_PANJANG} karakter).`;
    });
    galat[key] = g;
  }
  return galat;
};

const adaGalat = (galat) => Object.values(galat).some((g) => g.kat || Object.keys(g.item).length);

const LpjVideoLinks = ({ tahun, onLengkapChange }) => {
  const [draf, setDraf] = useState({ dayeuh_pajajaran: padLink([]), infrastruktur: padLink([]) });
  const [lengkap, setLengkap] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [galat, setGalat] = useState({});
  const [pesanServer, setPesanServer] = useState('');

  // Terapkan data dari server: isi draf, perbarui lencana, kabari induk.
  const terapkan = (data) => {
    setDraf({
      dayeuh_pajajaran: padLink(data.dayeuh_pajajaran),
      infrastruktur: padLink(data.infrastruktur),
    });
    setLengkap(!!data.lengkap);
    onLengkapChange?.(!!data.lengkap);
  };

  useEffect(() => {
    let batal = false;
    setLoading(true);
    api.get('/desa/bankeu-lpj/video', { params: { tahun } })
      .then((res) => { if (!batal && res.data?.data) terapkan(res.data.data); })
      .catch(() => { if (!batal) toast.error('Gagal memuat link video'); })
      .finally(() => { if (!batal) setLoading(false); });
    return () => { batal = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tahun]);

  const ubah = (key, idx, nilai) => {
    setDraf((d) => ({ ...d, [key]: d[key].map((v, i) => (i === idx ? nilai : v)) }));
  };
  const tambah = (key) => setDraf((d) => ({ ...d, [key]: [...d[key], ''] }));
  const hapus = (key, idx) => setDraf((d) => ({ ...d, [key]: d[key].filter((_, i) => i !== idx) }));

  const simpan = async () => {
    setPesanServer('');
    const g = validasi(draf);
    setGalat(g);
    if (adaGalat(g)) return;

    try {
      setSaving(true);
      const bersih = (arr) => arr.map((v) => v.trim()).filter(Boolean);
      const res = await api.put('/desa/bankeu-lpj/video', {
        tahun_anggaran: tahun,
        dayeuh_pajajaran: bersih(draf.dayeuh_pajajaran),
        infrastruktur: bersih(draf.infrastruktur),
      });
      if (res.data?.data) terapkan(res.data.data);
      toast.success('Link video berhasil disimpan');
    } catch (error) {
      setPesanServer(error.response?.data?.message || 'Gagal menyimpan link video');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <LuVideo className="h-4 w-4 text-slate-400" />
          Link Video LPJ
        </h3>
        {!loading && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
            lengkap ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>
            {lengkap ? <LuCircleCheck className="h-3 w-3" /> : <LuCircleAlert className="h-3 w-3" />}
            {lengkap ? 'Lengkap' : 'Belum lengkap — wajib sebelum unggah LPJ'}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <LuLoader className="h-6 w-6 animate-spin text-slate-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {KATEGORI.map(({ key, label }) => (
            <div key={key}>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {label} <span className="text-rose-500">*</span>
                <span className="ml-1 font-normal text-slate-400">(minimal {MIN_LINK}, maksimal {MAX_LINK} link)</span>
              </label>
              <div className="space-y-2">
                {draf[key].map((nilai, idx) => (
                  <div key={idx}>
                    <div className="flex items-center gap-2">
                      <input
                        type="url"
                        value={nilai}
                        onChange={(e) => ubah(key, idx, e.target.value)}
                        placeholder="https://youtube.com/…"
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                      {idx >= MIN_LINK && (
                        <button
                          type="button"
                          onClick={() => hapus(key, idx)}
                          className="rounded-lg p-2 text-rose-600 hover:bg-rose-50"
                          title="Hapus link"
                        >
                          <LuTrash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {galat[key]?.item?.[idx] && (
                      <p className="mt-1 text-xs text-rose-600">{galat[key].item[idx]}</p>
                    )}
                  </div>
                ))}
              </div>
              {galat[key]?.kat && <p className="mt-1 text-xs text-rose-600">{galat[key].kat}</p>}
              {draf[key].length < MAX_LINK && (
                <button
                  type="button"
                  onClick={() => tambah(key)}
                  className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
                >
                  <LuPlus className="h-4 w-4" />
                  Tambah link
                </button>
              )}
            </div>
          ))}

          {pesanServer && <p className="text-sm text-rose-600">{pesanServer}</p>}

          <button
            onClick={simpan}
            disabled={saving}
            className={`flex w-full items-center justify-center gap-2 rounded-lg px-6 py-3 font-semibold text-white transition-colors ${
              saving ? 'cursor-not-allowed bg-slate-300' : 'bg-slate-900 hover:bg-slate-800'
            }`}
          >
            {saving && <LuLoader className="h-5 w-5 animate-spin" />}
            {saving ? 'Menyimpan...' : 'Simpan Link Video'}
          </button>
        </div>
      )}
    </div>
  );
};

export default LpjVideoLinks;
