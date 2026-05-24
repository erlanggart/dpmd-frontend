import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, DollarSign, Calendar, TrendingUp, TrendingDown,
  FileText, BarChart2, AlertCircle, CheckCircle2, Clock,
  ChevronDown, ChevronUp, Layers, Package,
} from 'lucide-react';
import api from '../../../../api';
import { useBidangPath } from '../../../../hooks/useBidangPath';

const formatRupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const fmtCompact = (n) => {
  if (!n && n !== 0) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1).replace(/\.0$/, '')} M`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')} Jt`;
  return formatRupiah(n);
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color = 'gray', icon: Icon }) => {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    blue:    'bg-blue-50 text-blue-700 border-blue-200',
    amber:   'bg-amber-50 text-amber-700 border-amber-200',
    rose:    'bg-rose-50 text-rose-700 border-rose-200',
    purple:  'bg-purple-50 text-purple-700 border-purple-200',
    gray:    'bg-gray-50 text-gray-700 border-gray-200',
  };
  const iconColors = {
    emerald: 'text-emerald-500', blue: 'text-blue-500',
    amber: 'text-amber-500', rose: 'text-rose-500',
    purple: 'text-purple-500', gray: 'text-gray-400',
  };
  return (
    <div className={`rounded-xl border p-4 ${colors[color]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide opacity-70">{label}</p>
          <p className="text-lg font-bold mt-0.5 truncate">{value}</p>
          {sub && <p className="text-[11px] opacity-60 mt-0.5">{sub}</p>}
        </div>
        {Icon && <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconColors[color]}`} />}
      </div>
    </div>
  );
};

// ─── Item Row ─────────────────────────────────────────────────────────────────
const ItemRow = ({ item, index }) => (
  <div className="flex items-start gap-3 px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0">
    <span className="text-[10.5px] text-gray-400 font-mono mt-0.5 shrink-0 w-5 text-right">{index + 1}.</span>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm text-gray-800 font-medium leading-snug">{item.nama_item}</span>
        {item.grup && (
          <span className="text-[9.5px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-full shrink-0">
            {item.grup}
          </span>
        )}
        {item.jenis_sht && (
          <span className="text-[9.5px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full shrink-0">
            {item.jenis_sht}
          </span>
        )}
        <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full shrink-0 font-semibold">
          Belum Direalisasikan
        </span>
      </div>
      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
        <span className="text-[11px] text-gray-500">
          {item.volume} {item.satuan} × {formatRupiah(item.harga_satuan)}
        </span>
        <span className="text-[11.5px] font-bold text-emerald-700">{formatRupiah(item.total)}</span>
      </div>
    </div>
  </div>
);

// ─── Main Page ────────────────────────────────────────────────────────────────
const DetailSubKegiatanPage = () => {
  const navigate = useNavigate();
  const { getPath } = useBidangPath();
  const [searchParams] = useSearchParams();
  const masterId = searchParams.get('master_id');

  const [master, setMaster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTahun, setSelectedTahun] = useState(null);
  const [showAllItems, setShowAllItems] = useState(false);

  useEffect(() => {
    if (!masterId) { setError('Master ID tidak ditemukan'); setLoading(false); return; }
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/anggaran/master/${masterId}`);
        if (res.data.success) {
          const m = res.data.data;
          setMaster(m);
          // Default ke tahun terbaru yang ada pagu-nya
          if (m.pagu_list?.length > 0) {
            const sorted = [...m.pagu_list].sort((a, b) => b.tahun - a.tahun);
            setSelectedTahun(sorted[0].tahun);
          }
        } else {
          setError('Data tidak ditemukan');
        }
      } catch {
        setError('Gagal memuat data');
      }
      setLoading(false);
    };
    fetch();
  }, [masterId]);

  const handleBack = () => navigate(-1);

  const handleOpenRKA = (paguId) => {
    const params = new URLSearchParams({ pagu_id: paguId, label: master.nama_sub_kegiatan });
    navigate(`${getPath('/sekretariat/anggaran/item-rka')}?${params}`);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
    </div>
  );

  if (error || !master) return (
    <div className="max-w-2xl mx-auto px-4 py-10 text-center">
      <AlertCircle className="h-10 w-10 text-rose-400 mx-auto mb-3" />
      <p className="text-gray-600">{error || 'Data tidak ditemukan'}</p>
      <button onClick={handleBack} className="mt-4 text-sm text-emerald-700 hover:underline">
        ← Kembali
      </button>
    </div>
  );

  const paguTahunList = [...(master.pagu_list || [])].sort((a, b) => b.tahun - a.tahun);
  const paguSelected = paguTahunList.find(p => p.tahun === selectedTahun);
  const totalRka = paguSelected?.total_anggaran ?? 0;
  const pagNominal = paguSelected?.pagu ?? 0;
  const sisaPagu = pagNominal - totalRka;
  const totalRealisasi = 0; // placeholder — fitur realisasi belum tersedia
  const silpa = pagNominal - totalRealisasi;
  const items = paguSelected?.rka_items ?? [];
  const ITEMS_PREVIEW = 5;

  return (
    <div className="px-4 py-6 space-y-5">

      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <button
          onClick={handleBack}
          className="mt-0.5 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              {master.kode_sub_kegiatan}
            </span>
            {master.bidangs && (
              <span className="text-[10.5px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
                {master.bidangs.nama}
              </span>
            )}
            {master.bidang_unit && (
              <span className="text-[10.5px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                {master.bidang_unit.nama}
              </span>
            )}
          </div>
          <h1 className="text-base font-bold text-gray-900 mt-1 leading-snug">
            {master.nama_sub_kegiatan}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {master.nama_program} › {master.nama_kegiatan}
          </p>
        </div>
      </div>

      {/* ── Year Selector ── */}
      {paguTahunList.length > 0 && (
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
          <span className="text-xs text-gray-500">Tahun anggaran:</span>
          <div className="flex gap-1.5 flex-wrap">
            {paguTahunList.map(p => (
              <button
                key={p.tahun}
                onClick={() => setSelectedTahun(p.tahun)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                  selectedTahun === p.tahun
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                }`}
              >
                {p.tahun}
              </button>
            ))}
          </div>
        </div>
      )}

      {paguSelected ? (
        <>
          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Pagu"
              value={`Rp ${fmtCompact(pagNominal)}`}
              sub={`Tahun ${selectedTahun}`}
              color="emerald"
              icon={DollarSign}
            />
            <StatCard
              label="Total RKA"
              value={`Rp ${fmtCompact(totalRka)}`}
              sub={`${items.length} item`}
              color="blue"
              icon={Layers}
            />
            <StatCard
              label="Sisa Pagu"
              value={`Rp ${fmtCompact(Math.abs(sisaPagu))}`}
              sub={sisaPagu < 0 ? 'Melebihi pagu' : sisaPagu === 0 ? 'Sesuai pagu' : 'Belum terisi penuh'}
              color={sisaPagu < 0 ? 'rose' : sisaPagu === 0 ? 'gray' : 'amber'}
              icon={sisaPagu < 0 ? TrendingUp : TrendingDown}
            />
            <StatCard
              label="Realisasi"
              value="Rp 0"
              sub="Belum ada realisasi"
              color="gray"
              icon={CheckCircle2}
            />
          </div>

          {/* ── Riwayat Pagu Tahun ke Tahun ── */}
          {paguTahunList.length > 1 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-purple-500" />
                <h2 className="text-sm font-bold text-gray-800">Riwayat Pagu Tahun ke Tahun</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase tracking-wide text-[10px]">
                      <th className="text-left px-4 py-2">Tahun</th>
                      <th className="text-right px-4 py-2">Pagu</th>
                      <th className="text-right px-4 py-2">Total RKA</th>
                      <th className="text-right px-4 py-2">Sisa Pagu</th>
                      <th className="text-center px-4 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paguTahunList.map(p => {
                      const rka = p.total_anggaran ?? 0;
                      const sisa = p.pagu - rka;
                      const isSelected = p.tahun === selectedTahun;
                      return (
                        <tr
                          key={p.tahun}
                          onClick={() => setSelectedTahun(p.tahun)}
                          className={`border-b border-gray-50 last:border-0 cursor-pointer transition-colors ${
                            isSelected ? 'bg-emerald-50' : 'hover:bg-gray-50'
                          }`}
                        >
                          <td className="px-4 py-2.5 font-semibold text-gray-700">
                            {p.tahun}
                            {isSelected && <span className="ml-1.5 text-[9px] bg-emerald-500 text-white px-1.5 py-0.5 rounded-full">aktif</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">
                            {formatRupiah(p.pagu)}
                          </td>
                          <td className="px-4 py-2.5 text-right text-blue-700">
                            {rka > 0 ? formatRupiah(rka) : <span className="text-gray-300">—</span>}
                          </td>
                          <td className={`px-4 py-2.5 text-right font-semibold ${sisa < 0 ? 'text-rose-600' : sisa === 0 ? 'text-gray-400' : 'text-amber-600'}`}>
                            {sisa < 0 && '↑ '}
                            {formatRupiah(Math.abs(sisa))}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {rka === 0 ? (
                              <span className="text-[9.5px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Belum ada RKA</span>
                            ) : sisa < 0 ? (
                              <span className="text-[9.5px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full">Melebihi Pagu</span>
                            ) : sisa === 0 ? (
                              <span className="text-[9.5px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">Sesuai Pagu</span>
                            ) : (
                              <span className="text-[9.5px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Belum Penuh</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── RKA Items ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <h2 className="text-sm font-bold text-gray-800">
                  Rencana Kerja Anggaran {selectedTahun}
                </h2>
                {items.length > 0 && (
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                    {items.length} item
                  </span>
                )}
              </div>
              <button
                onClick={() => handleOpenRKA(paguSelected.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors shrink-0"
              >
                <FileText className="h-3.5 w-3.5" />
                Kelola Item RKA
              </button>
            </div>

            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Belum ada item RKA untuk tahun {selectedTahun}
              </div>
            ) : (
              <>
                {(showAllItems ? items : items.slice(0, ITEMS_PREVIEW)).map((item, i) => (
                  <ItemRow key={item.id} item={item} index={i} />
                ))}
                {items.length > ITEMS_PREVIEW && (
                  <button
                    onClick={() => setShowAllItems(v => !v)}
                    className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                  >
                    {showAllItems ? (
                      <><ChevronUp className="h-3.5 w-3.5" /> Tampilkan lebih sedikit</>
                    ) : (
                      <><ChevronDown className="h-3.5 w-3.5" /> {items.length - ITEMS_PREVIEW} item lainnya</>
                    )}
                  </button>
                )}
                {/* Total */}
                <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-t border-blue-100">
                  <span className="text-xs font-semibold text-blue-700">Total RKA</span>
                  <span className="text-sm font-bold text-blue-700">{formatRupiah(totalRka)}</span>
                </div>
              </>
            )}
          </div>

          {/* ── Realisasi Anggaran ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <h2 className="text-sm font-bold text-gray-800">Realisasi Anggaran {selectedTahun}</h2>
            </div>
            <div className="p-6 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl mb-3">
                <Clock className="h-4 w-4 text-amber-500" />
                <span className="text-xs font-semibold text-amber-700">Fitur dalam pengembangan</span>
              </div>
              <p className="text-sm text-gray-500 max-w-md mx-auto">
                Modul realisasi anggaran dan SPJ (Surat Pertanggung Jawaban) sedang disiapkan.
                Data realisasi akan tersedia setelah fitur ini selesai dikembangkan.
              </p>

              {/* SILPA Card */}
              <div className="mt-5 grid grid-cols-3 gap-3 max-w-sm mx-auto text-left">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                  <p className="text-[9.5px] font-semibold uppercase text-emerald-600 tracking-wide">Pagu</p>
                  <p className="text-xs font-bold text-emerald-800 mt-0.5">Rp {fmtCompact(pagNominal)}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <p className="text-[9.5px] font-semibold uppercase text-gray-500 tracking-wide">Realisasi</p>
                  <p className="text-xs font-bold text-gray-400 mt-0.5">Rp 0</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
                  <p className="text-[9.5px] font-semibold uppercase text-purple-600 tracking-wide">SILPA Est.</p>
                  <p className="text-xs font-bold text-purple-800 mt-0.5">Rp {fmtCompact(silpa)}</p>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">
                SILPA = Pagu − Total Realisasi (estimasi, realisasi belum tersedia)
              </p>
            </div>
          </div>

          {/* ── Items Belum Direalisasikan ── */}
          {items.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <h2 className="text-sm font-bold text-gray-800">Item Belum Direalisasikan</h2>
                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold ml-auto">
                  {items.length} item · {formatRupiah(totalRka)}
                </span>
              </div>
              {items.map((item, i) => (
                <ItemRow key={item.id} item={item} index={i} />
              ))}
              <div className="flex items-center justify-between px-4 py-3 bg-amber-50 border-t border-amber-100">
                <span className="text-xs font-semibold text-amber-700">Total Belum Direalisasikan</span>
                <span className="text-sm font-bold text-amber-700">{formatRupiah(totalRka)}</span>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <DollarSign className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Belum ada data pagu untuk sub kegiatan ini</p>
        </div>
      )}
    </div>
  );
};

export default DetailSubKegiatanPage;
