import React, { useState, useEffect, useCallback } from 'react';
import { LuCoins, LuLoader, LuCircleAlert } from 'react-icons/lu';
import api from '../../../api';
import DesaPageHeader from '../../../components/desa/DesaPageHeader';

const rupiah = (n) => `Rp${Number(n || 0).toLocaleString('id-ID')}`;

const KartuTahap = ({ judul, data }) => {
  const cair = String(data?.status || '').includes('Dicairkan');
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">{judul}</h3>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
          cair ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
        }`}>
          {data?.status || '-'}
        </span>
      </div>
      {data?.hasData ? (
        <p className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">{rupiah(data.realisasi)}</p>
      ) : (
        <p className="mt-4 text-sm text-slate-500">Belum ada data penyaluran</p>
      )}
    </div>
  );
};

const DesaBankeuPenyaluranTab = ({ tahun = 2026 }) => {
  const [bankeu, setBankeu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const muat = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/desa/bankeu-penyaluran', { params: { tahun } });
      setBankeu(response.data?.data || {});
    } catch (err) {
      setError(err.response?.data?.message || 'Gagal memuat data penyaluran');
    } finally {
      setLoading(false);
    }
  }, [tahun]);

  useEffect(() => { muat(); }, [muat]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <LuLoader className="h-8 w-8 animate-spin text-slate-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5">
        <div className="flex items-center gap-3">
          <LuCircleAlert className="h-5 w-5 flex-shrink-0 text-rose-600" />
          <p className="flex-1 text-sm text-rose-700">{error}</p>
          <button
            onClick={muat}
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800"
          >
            Coba lagi
          </button>
        </div>
      </div>
    );
  }

  const total = Number(bankeu?.tahap1?.realisasi || 0) + Number(bankeu?.tahap2?.realisasi || 0);

  return (
    <div className="space-y-5">
      <DesaPageHeader
        icon={LuCoins}
        eyebrow="Bantuan Keuangan"
        title={`Penyaluran T1 & T2 TA ${tahun}`}
        description={`Status dan realisasi penyaluran bantuan keuangan desa Anda untuk TA ${tahun}.`}
      />

      {!bankeu?.tahap1?.hasData && !bankeu?.tahap2?.hasData && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Data penyaluran TA {tahun} belum diunggah DPMD.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KartuTahap judul="Tahap 1" data={bankeu?.tahap1} />
        <KartuTahap judul="Tahap 2" data={bankeu?.tahap2} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">Total realisasi (Tahap 1 + Tahap 2)</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{rupiah(total)}</p>
        <p className="mt-3 text-xs text-slate-400">Data penyaluran dari DPMD (Bidang SPKED).</p>
      </div>
    </div>
  );
};

export default DesaBankeuPenyaluranTab;
