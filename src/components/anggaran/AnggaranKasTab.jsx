import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wallet, Loader2, Save, CalendarDays, LayoutGrid, Sparkles,
  Eraser, AlertTriangle, CheckCircle2, Printer, Tag,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';

const formatRupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

const fmtNum = (n) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Number(n) || 0);

const MONTHS = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11', 'm12'];
const MONTH_LABEL = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];
const TW = [
  { label: 'TW I', months: ['m1', 'm2', 'm3'] },
  { label: 'TW II', months: ['m4', 'm5', 'm6'] },
  { label: 'TW III', months: ['m7', 'm8', 'm9'] },
  { label: 'TW IV', months: ['m10', 'm11', 'm12'] },
];

const zeroMonths = () => MONTHS.reduce((o, m) => { o[m] = 0; return o; }, {});
const sumMonths = (obj) => MONTHS.reduce((s, m) => s + (Number(obj[m]) || 0), 0);

// ─── Cell input untuk satu bulan ──────────────────────────────────────────────
const MonthCell = ({ value, onChange, disabled }) => (
  <input
    type="text"
    inputMode="numeric"
    disabled={disabled}
    value={value === 0 || value === '0' ? '' : fmtNum(value)}
    onChange={(e) => {
      const raw = e.target.value.replace(/[^\d]/g, '');
      onChange(raw === '' ? 0 : Number(raw));
    }}
    placeholder="0"
    className={`w-24 text-right text-[11.5px] font-medium px-2 py-1.5 rounded-md border tabular-nums transition
      ${disabled
        ? 'bg-gray-50 border-gray-100 text-gray-500 cursor-not-allowed'
        : 'bg-white border-gray-200 text-gray-800 focus:border-amber-400 focus:ring-1 focus:ring-amber-200 outline-none'}`}
  />
);

// ─── Print Anggaran Kas ───────────────────────────────────────────────────────
const openPrintAngkas = ({ master, tahun, rows, colTotals, grandTotal }) => {
  const esc = (s) => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const win = window.open('', '_blank');
  if (!win) return;
  const head = MONTH_LABEL.map(m => `<th style="text-align:right">${m}</th>`).join('');
  const body = rows.map((r, i) => {
    const cells = MONTHS.map(m => `<td style="text-align:right">${r[m] ? fmtNum(r[m]) : '-'}</td>`).join('');
    return `<tr>
      <td style="text-align:right;color:#94a3b8">${i + 1}</td>
      <td>${esc(r.nama_rekening || '—')}<div style="font-family:monospace;font-size:8px;color:#94a3b8">${esc(r.kode_rekening || '')}</div></td>
      ${cells}
      <td style="text-align:right;font-weight:700;color:#b45309">${fmtNum(sumMonths(r))}</td>
    </tr>`;
  }).join('');
  const foot = MONTHS.map(m => `<td style="text-align:right">${fmtNum(colTotals[m])}</td>`).join('');
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Anggaran Kas ${esc(master?.nama_sub_kegiatan || '')} ${tahun}</title>
  <style>
    *{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;color:#1e293b;margin:18px;font-size:10px}
    h1{font-size:14px;margin:0 0 2px}.sub{font-size:10px;color:#475569;margin:0 0 10px}
    .meta{margin:8px 0 12px;font-size:10px}.meta div{margin:2px 0}
    table{width:100%;border-collapse:collapse}
    th,td{border:1px solid #e2e8f0;padding:3px 5px;font-size:9px}
    th{background:#f8fafc;color:#475569;text-transform:uppercase;letter-spacing:.03em}
    tfoot td{font-weight:700;background:#fffbeb}
    @media print{body{margin:0}@page{size:landscape;margin:10mm}}
  </style></head><body>
    <h1>ANGGARAN KAS (RENCANA PENARIKAN DANA) ${tahun}</h1>
    <p class="sub">${esc(master?.bidangs?.nama || '')}</p>
    <div class="meta">
      <div><b>Sub Kegiatan:</b> ${esc(master?.kode_sub_kegiatan || '')} — ${esc(master?.nama_sub_kegiatan || '')}</div>
    </div>
    <table>
      <thead><tr><th>No</th><th style="text-align:left">Rekening</th>${head}<th style="text-align:right">Total</th></tr></thead>
      <tbody>${body}</tbody>
      <tfoot><tr><td colspan="2" style="text-align:right">TOTAL</td>${foot}<td style="text-align:right">${fmtNum(grandTotal)}</td></tr></tfoot>
    </table>
    <script>window.onload=function(){window.print();}</script>
  </body></html>`);
  win.document.close();
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const AnggaranKasTab = ({ paguId, tahun, master, totalRka, canEdit, onManageRekening }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [period, setPeriod] = useState('bulan'); // 'bulan' | 'triwulan'
  // rows: [{ kode_rekening, plafon, m1..m12 (number) }]
  const [rows, setRows] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [selected, setSelected] = useState(() => new Set()); // kode_rekening terpilih untuk bagi rata

  const load = useCallback(async () => {
    if (!paguId) return;
    setLoading(true);
    try {
      const res = await api.get('/anggaran-kas', { params: { pagu_id: paguId } });
      const stored = res.data?.data || [];
      const reference = res.data?.reference || [];

      // Union kode rekening: dari referensi RKA + baris kas tersimpan.
      const plafonMap = new Map(reference.map(r => [r.kode_rekening || '', Number(r.plafon) || 0]));
      const namaMap = new Map(reference.map(r => [r.kode_rekening || '', r.nama_rekening || '']));
      const storedMap = new Map(stored.map(r => [r.kode_rekening || '', r]));
      const allKode = new Set([...plafonMap.keys(), ...storedMap.keys()]);

      const merged = [...allKode].sort((a, b) => a.localeCompare(b)).map((kode) => {
        const s = storedMap.get(kode);
        const base = {
          kode_rekening: kode,
          nama_rekening: namaMap.get(kode) || s?.nama_rekening || '',
          plafon: plafonMap.get(kode) || 0,
          ...zeroMonths(),
        };
        if (s) MONTHS.forEach(m => { base[m] = Number(s[m]) || 0; });
        return base;
      });
      setRows(merged);
      setDirty(false);
      setSelected(new Set());
    } catch {
      toast.error('Gagal memuat anggaran kas');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [paguId]);

  useEffect(() => { load(); }, [load]);

  // Input tidak boleh membuat total 12 bulan melebihi plafon RKA rekening.
  // Nilai di-clamp otomatis ke sisa yang tersedia; beri tahu bila dipangkas.
  const setCell = (kode, month, value) => {
    setRows(prev => prev.map(r => {
      if (r.kode_rekening !== kode) return r;
      const others = MONTHS.reduce((s, m) => (m === month ? s : s + (Number(r[m]) || 0)), 0);
      const maxAllowed = Math.max(0, r.plafon - others);
      let v = value;
      if (value > maxAllowed) {
        v = maxAllowed;
        toast.error(
          r.plafon > 0
            ? `Maksimal ${fmtNum(maxAllowed)} — total tidak boleh melebihi plafon RKA (${fmtNum(r.plafon)})`
            : 'Rekening ini tidak punya plafon RKA, tidak bisa diisi',
          { id: `cap-${kode}` },
        );
      }
      return { ...r, [month]: v };
    }));
    setDirty(true);
  };

  // Bagi rata plafon rekening ke 12 bulan (sisa pembulatan ke Desember).
  const distributeEven = (kode) => {
    setRows(prev => prev.map(r => {
      if (r.kode_rekening !== kode || !r.plafon) return r;
      const per = Math.floor(r.plafon / 12);
      const next = { ...r };
      MONTHS.forEach(m => { next[m] = per; });
      next.m12 = r.plafon - per * 11;
      return next;
    }));
    setDirty(true);
  };

  const clearRow = (kode) => {
    setRows(prev => prev.map(r => (r.kode_rekening === kode ? { ...r, ...zeroMonths() } : r)));
    setDirty(true);
  };

  // Bagi rata hanya untuk rekening yang DICENTANG.
  const distributeSelected = () => {
    if (selected.size === 0) return;
    setRows(prev => prev.map(r => {
      if (!selected.has(r.kode_rekening) || !r.plafon) return r;
      const per = Math.floor(r.plafon / 12);
      const next = { ...r };
      MONTHS.forEach(m => { next[m] = per; });
      next.m12 = r.plafon - per * 11;
      return next;
    }));
    setDirty(true);
  };

  // ─── Seleksi baris ────────────────────────────────────────────────────────
  const toggleSelect = (kode) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(kode)) next.delete(kode); else next.add(kode);
      return next;
    });
  };
  // Baris yang bisa dibagi rata = punya plafon > 0.
  const selectableKodes = useMemo(() => rows.filter(r => r.plafon > 0).map(r => r.kode_rekening), [rows]);
  const allSelected = selectableKodes.length > 0 && selectableKodes.every(k => selected.has(k));
  const toggleSelectAll = () => {
    setSelected(allSelected ? new Set() : new Set(selectableKodes));
  };

  const colTotals = useMemo(() => {
    const t = zeroMonths();
    rows.forEach(r => MONTHS.forEach(m => { t[m] += Number(r[m]) || 0; }));
    return t;
  }, [rows]);

  const grandTotal = useMemo(() => sumMonths(colTotals), [colTotals]);
  const selisihTotal = totalRka - grandTotal; // + = belum dialokasikan, - = melebihi RKA

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { rows: rows.map(r => ({ kode_rekening: r.kode_rekening, ...MONTHS.reduce((o, m) => { o[m] = Number(r[m]) || 0; return o; }, {}) })) };
      const res = await api.put(`/anggaran-kas/pagu/${paguId}`, payload);
      toast.success(res.data?.message || 'Anggaran kas tersimpan');
      setDirty(false);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div>
      {/* Header + kontrol */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2 flex-wrap">
        <Wallet className="h-4 w-4 text-amber-500" />
        <h2 className="text-sm font-bold text-gray-800">Anggaran Kas {tahun}</h2>
        <span className="text-[10.5px] text-gray-400">Rencana penarikan dana per bulan</span>

        <div className="ml-auto flex items-center gap-2">
          {/* Toggle periode */}
          <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden text-xs font-semibold">
            <button
              onClick={() => setPeriod('bulan')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 transition-colors ${period === 'bulan' ? 'bg-amber-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Bulanan
            </button>
            <button
              onClick={() => setPeriod('triwulan')}
              className={`inline-flex items-center gap-1 px-3 py-1.5 transition-colors ${period === 'triwulan' ? 'bg-amber-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Triwulan
            </button>
          </div>

          {onManageRekening && (
            <button
              onClick={onManageRekening}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-50 transition-colors"
              title="Atur nama/keterangan untuk tiap kode rekening"
            >
              <Tag className="h-3.5 w-3.5" /> Nama Rekening
            </button>
          )}

          <button
            onClick={() => openPrintAngkas({ master, tahun, rows, colTotals, grandTotal })}
            disabled={rows.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" /> Print
          </button>

          {canEdit && period === 'bulan' && (
            <button
              onClick={distributeSelected}
              disabled={selected.size === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 text-amber-700 rounded-lg text-xs font-semibold hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Bagi rata plafon RKA ke 12 bulan untuk rekening yang dicentang"
            >
              <Sparkles className="h-3.5 w-3.5" /> Bagi Rata{selected.size > 0 ? ` (${selected.size})` : ''}
            </button>
          )}

          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Simpan
            </button>
          )}
        </div>
      </div>

      {/* Ringkasan rekonsiliasi vs Total RKA */}
      <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-3 border-b border-gray-100 bg-gradient-to-br from-amber-50/40 to-white">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-[10px] uppercase font-bold text-blue-700">Total RKA</p>
          <p className="text-sm font-bold text-blue-900 mt-0.5">{formatRupiah(totalRka)}</p>
          <p className="text-[10.5px] text-blue-600 mt-0.5">plafon anggaran</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-[10px] uppercase font-bold text-amber-700">Total Rencana Kas</p>
          <p className="text-sm font-bold text-amber-900 mt-0.5">{formatRupiah(grandTotal)}</p>
          <p className="text-[10.5px] text-amber-600 mt-0.5">Σ 12 bulan semua rekening</p>
        </div>
        <div className={`rounded-lg border p-3 ${
          selisihTotal === 0 ? 'border-emerald-200 bg-emerald-50'
          : selisihTotal < 0 ? 'border-rose-200 bg-rose-50' : 'border-gray-200 bg-gray-50'}`}>
          <p className={`text-[10px] uppercase font-bold ${
            selisihTotal === 0 ? 'text-emerald-700' : selisihTotal < 0 ? 'text-rose-700' : 'text-gray-600'}`}>
            {selisihTotal < 0 ? 'Melebihi RKA' : 'Belum Dialokasikan'}
          </p>
          <p className={`text-sm font-bold mt-0.5 flex items-center gap-1 ${
            selisihTotal === 0 ? 'text-emerald-900' : selisihTotal < 0 ? 'text-rose-900' : 'text-gray-800'}`}>
            {selisihTotal === 0
              ? <><CheckCircle2 className="h-4 w-4" /> Sesuai</>
              : formatRupiah(Math.abs(selisihTotal))}
          </p>
          <p className="text-[10.5px] text-gray-500 mt-0.5">Total RKA − Rencana Kas</p>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          <Wallet className="h-8 w-8 mx-auto mb-2 opacity-30" />
          Belum ada item RKA untuk tahun {tahun}. Isi RKA terlebih dahulu.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                <th className="px-3 py-2.5 text-left sticky left-0 bg-gray-50 z-10 min-w-[240px]">
                  <div className="flex items-center gap-2">
                    {canEdit && period === 'bulan' && (
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleSelectAll}
                        disabled={selectableKodes.length === 0}
                        className="h-3.5 w-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-400 cursor-pointer"
                        title="Pilih semua rekening (yang punya pagu)"
                      />
                    )}
                    Rekening
                  </div>
                </th>
                {period === 'bulan'
                  ? MONTH_LABEL.map((m) => <th key={m} className="px-2 py-2.5 text-right">{m}</th>)
                  : TW.map((t) => <th key={t.label} className="px-3 py-2.5 text-right">{t.label}</th>)}
                <th className="px-3 py-2.5 text-right">Total</th>
                <th className="px-3 py-2.5 text-right">Plafon RKA</th>
                <th className="px-3 py-2.5 text-right">Selisih</th>
                {canEdit && period === 'bulan' && <th className="px-2 py-2.5"></th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const rowTotal = sumMonths(r);
                const selisih = r.plafon - rowTotal;
                return (
                  <tr key={r.kode_rekening || '—'} className="hover:bg-amber-50/30 transition-colors border-t border-gray-100">
                    <td className="px-3 py-2 sticky left-0 bg-white z-10 border-t border-gray-100 min-w-[240px] max-w-[300px]">
                      <div className="flex items-start gap-2">
                        {canEdit && period === 'bulan' && (
                          <input
                            type="checkbox"
                            checked={selected.has(r.kode_rekening)}
                            onChange={() => toggleSelect(r.kode_rekening)}
                            disabled={!r.plafon}
                            className="h-3.5 w-3.5 mt-0.5 rounded border-gray-300 text-amber-600 focus:ring-amber-400 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            title={r.plafon ? 'Pilih untuk bagi rata' : 'Tanpa pagu, tidak bisa dibagi rata'}
                          />
                        )}
                        <div className="min-w-0">
                          {r.nama_rekening
                            ? <p className="text-[12px] font-semibold text-gray-800 leading-snug">{r.nama_rekening}</p>
                            : <p className="text-[12px] italic text-gray-400">{r.kode_rekening ? '(nama belum terdaftar)' : 'tanpa rekening'}</p>}
                          {r.kode_rekening && <p className="font-mono text-[10px] text-gray-400 mt-0.5">{r.kode_rekening}</p>}
                          <div className="flex items-center gap-2 mt-1 text-[10.5px]">
                            <span className="text-gray-500">Pagu <span className="font-semibold text-blue-600 tabular-nums">{fmtNum(r.plafon)}</span></span>
                            <span className="text-gray-300">·</span>
                            <span className={selisih < 0 ? 'text-rose-600' : selisih === 0 ? 'text-emerald-600' : 'text-amber-600'}>
                              Sisa <span className="font-semibold tabular-nums">{fmtNum(Math.max(0, selisih))}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    {period === 'bulan'
                      ? MONTHS.map((m) => (
                          <td key={m} className="px-1.5 py-1.5 text-right">
                            <MonthCell value={r[m]} disabled={!canEdit} onChange={(v) => setCell(r.kode_rekening, m, v)} />
                          </td>
                        ))
                      : TW.map((t) => {
                          const val = t.months.reduce((s, m) => s + (Number(r[m]) || 0), 0);
                          return <td key={t.label} className="px-3 py-2 text-right tabular-nums text-gray-700">{val ? fmtNum(val) : '—'}</td>;
                        })}
                    <td className="px-3 py-2 text-right font-bold text-amber-700 tabular-nums">{fmtNum(rowTotal)}</td>
                    <td className="px-3 py-2 text-right text-gray-500 tabular-nums">{fmtNum(r.plafon)}</td>
                    <td className={`px-3 py-2 text-right font-semibold tabular-nums ${
                      selisih === 0 ? 'text-emerald-600' : selisih < 0 ? 'text-rose-600' : 'text-amber-600'}`}>
                      <span className="inline-flex items-center gap-1 justify-end">
                        {selisih < 0 && <AlertTriangle className="h-3 w-3" />}
                        {selisih === 0 ? '✓' : fmtNum(Math.abs(selisih))}
                      </span>
                    </td>
                    {canEdit && period === 'bulan' && (
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => distributeEven(r.kode_rekening)}
                            disabled={!r.plafon}
                            className="p-1 rounded text-gray-400 hover:text-amber-600 hover:bg-amber-50 disabled:opacity-30 transition"
                            title="Bagi rata plafon ke 12 bulan"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => clearRow(r.kode_rekening)}
                            className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Kosongkan baris"
                          >
                            <Eraser className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-amber-50 border-t-2 border-amber-200 font-bold text-amber-800">
                <td className="px-3 py-2.5 text-left sticky left-0 bg-amber-50 z-10">TOTAL</td>
                {period === 'bulan'
                  ? MONTHS.map((m) => <td key={m} className="px-2 py-2.5 text-right tabular-nums text-[11.5px]">{fmtNum(colTotals[m])}</td>)
                  : TW.map((t) => {
                      const val = t.months.reduce((s, m) => s + colTotals[m], 0);
                      return <td key={t.label} className="px-3 py-2.5 text-right tabular-nums">{fmtNum(val)}</td>;
                    })}
                <td className="px-3 py-2.5 text-right tabular-nums">{fmtNum(grandTotal)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-gray-500">{fmtNum(totalRka)}</td>
                <td className="px-3 py-2.5" colSpan={canEdit && period === 'bulan' ? 2 : 1}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {canEdit && dirty && (
        <div className="px-4 py-2.5 bg-amber-50/60 border-t border-amber-100 text-[11.5px] text-amber-700 flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" /> Ada perubahan yang belum disimpan.
        </div>
      )}
    </div>
  );
};

export default AnggaranKasTab;
