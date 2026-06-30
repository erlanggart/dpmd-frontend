import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft, DollarSign, Calendar, TrendingUp, TrendingDown,
  FileText, BarChart2, AlertCircle, CheckCircle2, Clock,
  ChevronDown, Layers, Package, Wallet, X,
  Utensils, Printer, Plane, Wrench, Gift, ChevronRight,
  Eye, Receipt, Loader2, Percent,
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

const persen = (num, denom) => {
  if (!denom || denom <= 0) return 0;
  return Math.round((num / denom) * 1000) / 10;
};

// Bangun pohon hierarki rekening dari daftar item flat (sama seperti Item Anggaran)
function buildRekeningTree(items) {
  const root = { code: null, depth: -1, children: new Map(), items: [], total: 0, itemCount: 0 };
  for (const item of items) {
    const kode = (item.kode_rekening || '').trim();
    const parts = kode ? kode.split('.') : ['—'];
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const prefix = parts.slice(0, i + 1).join('.');
      if (!node.children.has(prefix)) {
        node.children.set(prefix, { code: prefix, depth: i, children: new Map(), items: [], total: 0, itemCount: 0 });
      }
      node = node.children.get(prefix);
      node.total += Number(item.total) || 0;
      node.itemCount += 1;
    }
    node.items.push(item);
  }
  return root;
}

// Style per kedalaman segmen rekening: 0='5', 1='5.1', 2='5.1.02', dst.
// Slate netral + garis aksen kiri menandakan kedalaman; total tetap emerald.
const REK_DEPTH_STYLES = [
  { bg: 'bg-slate-700', text: 'text-white',     count: 'text-slate-300', acc: 'text-emerald-300', bar: 'border-l-slate-700', weight: 'font-black'    },
  { bg: 'bg-slate-100', text: 'text-slate-800', count: 'text-slate-400', acc: 'text-emerald-700', bar: 'border-l-slate-400', weight: 'font-bold'     },
  { bg: 'bg-slate-50',  text: 'text-slate-700', count: 'text-slate-400', acc: 'text-emerald-700', bar: 'border-l-slate-300', weight: 'font-bold'     },
  { bg: 'bg-white',     text: 'text-slate-600', count: 'text-slate-300', acc: 'text-emerald-700', bar: 'border-l-slate-200', weight: 'font-semibold' },
  { bg: 'bg-white',     text: 'text-slate-500', count: 'text-slate-300', acc: 'text-emerald-700', bar: 'border-l-slate-100', weight: 'font-semibold' },
  { bg: 'bg-white',     text: 'text-slate-400', count: 'text-slate-300', acc: 'text-emerald-700', bar: 'border-l-slate-100', weight: 'font-semibold' },
];
const REK_INDENT = 14; // px per kedalaman

// Badge warna per jenis SHT (selaras Item Anggaran)
const SHT_BADGE = {
  SSH:  'bg-blue-100 text-blue-700',
  SBU:  'bg-amber-100 text-amber-700',
  ASB:  'bg-emerald-100 text-emerald-700',
  HSPK: 'bg-rose-100 text-rose-700',
};
const shtBadge = (t) => SHT_BADGE[t] || 'bg-gray-100 text-gray-600';

// Grid kolom tabel item: No | Uraian | Jenis | Vol.Satuan | Harga Satuan | Total
const ITEM_GRID = '2.5rem 1fr 4.5rem 9rem 9rem 9rem';

// ─── Print (PDF via window.print) ─────────────────────────────────────────────
const esc = (s) => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

// Render satu node rekening + anak + itemnya jadi baris-baris <tr> (rekursif)
const printRekeningRows = (node, depth, indexMap) => {
  const pad = 6 + depth * 18;
  const shade = ['#334155', '#e2e8f0', '#f1f5f9', '#f8fafc'][Math.min(depth, 3)];
  const color = depth === 0 ? '#ffffff' : '#1e293b';
  let html = `<tr>
    <td colspan="5" style="background:${shade};color:${color};padding:5px 6px 5px ${pad}px;font-family:monospace;font-weight:bold;border-left:3px solid #94a3b8">${esc(node.code)} <span style="font-weight:400;opacity:.65">· ${node.itemCount} item</span></td>
    <td style="background:${shade};color:${color};text-align:right;padding:5px 8px;font-weight:bold">${formatRupiah(node.total)}</td>
  </tr>`;
  for (const child of node.children.values()) html += printRekeningRows(child, depth + 1, indexMap);
  if (node.items.length) {
    const ipad = pad + 18;
    html += `<tr class="ih">
      <td style="padding-left:${ipad}px">No</td><td>Uraian Item</td>
      <td style="text-align:center">Jenis</td><td style="text-align:right">Vol. Satuan</td>
      <td style="text-align:right">Harga Satuan</td><td style="text-align:right">Total</td>
    </tr>`;
    for (const item of node.items) {
      const no = String((indexMap[item.id] ?? 0) + 1).padStart(2, '0');
      html += `<tr class="it">
        <td style="padding-left:${ipad}px;text-align:right;color:#94a3b8">${no}</td>
        <td>${esc(item.nama_item)}${item.keterangan ? `<div class="ket">${esc(item.keterangan)}</div>` : ''}</td>
        <td style="text-align:center">${esc(item.jenis_sht || '')}</td>
        <td style="text-align:right">${esc(item.volume)} ${esc(item.satuan || '')}</td>
        <td style="text-align:right">${formatRupiah(item.harga_satuan)}</td>
        <td style="text-align:right;color:#059669;font-weight:600">${formatRupiah(item.total)}</td>
      </tr>`;
    }
  }
  return html;
};

const openPrintRKA = ({ master, tahun, tree, indexMap, pagu }) => {
  const rows = [...tree.children.values()].map(n => printRekeningRows(n, 0, indexMap)).join('');
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>RKA ${esc(master?.nama_sub_kegiatan || '')} ${tahun}</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1e293b; margin: 24px; font-size: 11px; }
    h1 { font-size: 15px; margin: 0 0 2px; }
    .sub { font-size: 11px; color: #475569; margin: 0; }
    .meta { margin: 12px 0 14px; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; font-size: 11px; }
    .meta div { margin: 2px 0; display: flex; gap: 6px; align-items: baseline; }
    .meta b { flex: 0 0 100px; color: #475569; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 4px 6px; border-bottom: 1px solid #eef2f6; vertical-align: top; }
    tr.ih td { font-size: 8.5px; text-transform: uppercase; letter-spacing: .05em; color: #94a3b8; font-weight: 700; background: #fbfdff; border-bottom: 1px solid #e2e8f0; }
    tr.it td { font-size: 10.5px; }
    tr.it td:nth-child(2) { font-weight: 600; }
    .ket { font-size: 9px; color: #64748b; font-weight: 400; margin-top: 1px; }
    tfoot td { border-top: 2px solid #cbd5e1; font-weight: bold; padding: 7px 8px; font-size: 12px; }
    .ft { margin-top: 18px; padding-top: 8px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 9px; color: #94a3b8; }
    @media print { body { margin: 0; } @page { margin: 14mm; } }
  </style></head><body>
    <h1>RENCANA KERJA ANGGARAN ${tahun}</h1>
    <p class="sub">${esc(master?.bidangs?.nama || '')}</p>
    <div class="meta">
      <div><b>Sub Kegiatan</b> ${esc(master?.kode_sub_kegiatan || '')} — ${esc(master?.nama_sub_kegiatan || '')}</div>
      <div><b>Program</b> ${esc(master?.nama_program || '-')}</div>
      <div><b>Kegiatan</b> ${esc(master?.nama_kegiatan || '-')}</div>
      <div><b>Pagu</b> ${formatRupiah(pagu)}</div>
    </div>
    <table>
      <tbody>${rows}</tbody>
    </table>
    <div class="ft">DPMD Kabupaten Bogor — GEMA SuperApps</div>
    <script>window.onload=function(){window.print();}</script>
  </body></html>`);
  win.document.close();
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

// ─── Pencairan Type Modal ─────────────────────────────────────────────────────
const PENCAIRAN_TYPES = [
  { key: 'atk',      label: 'Pencairan ATK',          desc: 'Belanja Alat Tulis Kantor (10 dokumen: Pesanan, Faktur, Kwitansi, BA, BAST, BASTHP, Bend 35/29)', icon: Package,  color: 'from-teal-500 to-emerald-600',  ringColor: 'hover:border-teal-300',   available: true },
  { key: 'cetak',    label: 'Pencairan Cetak',        desc: 'Belanja barang cetakan (spanduk, banner, brosur, sertifikat)',                                  icon: Printer,  color: 'from-blue-500 to-indigo-600',   ringColor: 'hover:border-blue-300',   available: false },
  { key: 'makmin',   label: 'Pencairan Makan Minum',  desc: 'Konsumsi rapat, snack, jamuan tamu',                                                            icon: Utensils, color: 'from-amber-500 to-orange-600',  ringColor: 'hover:border-amber-300',  available: false },
  { key: 'perjadin', label: 'Pencairan Perjadin',     desc: 'Perjalanan dinas dalam/luar daerah',                                                            icon: Plane,    color: 'from-purple-500 to-pink-600',   ringColor: 'hover:border-purple-300', available: false },
  { key: 'jasa',     label: 'Pencairan Jasa',         desc: 'Honorarium narasumber, jasa pihak ketiga',                                                      icon: Wrench,   color: 'from-rose-500 to-red-600',      ringColor: 'hover:border-rose-300',   available: false },
  { key: 'hibah',    label: 'Pencairan Hibah/Bansos', desc: 'Bantuan keuangan & hibah',                                                                      icon: Gift,     color: 'from-cyan-500 to-teal-600',     ringColor: 'hover:border-cyan-300',   available: false },
];

const PencairanTypeModal = ({ open, onClose, onSelect }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-200/50">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Pilih Jenis Pencairan</h3>
              <p className="text-[11px] text-gray-500">Item dari sub kegiatan ini akan direalisasikan</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/60 transition">
            <X className="h-4 w-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PENCAIRAN_TYPES.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.key}
                  onClick={() => t.available && onSelect(t.key)}
                  disabled={!t.available}
                  className={`group relative text-left border border-gray-200 rounded-xl p-4 transition-all ${
                    t.available
                      ? `bg-white ${t.ringColor} hover:shadow-md cursor-pointer`
                      : 'bg-gray-50/50 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${t.color} flex items-center justify-center shadow-md shrink-0 ${
                      t.available ? 'group-hover:scale-105' : ''
                    } transition-transform`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-[13.5px] font-semibold text-gray-900 leading-tight">{t.label}</h4>
                        {!t.available && (
                          <span className="text-[9.5px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full font-semibold">SEGERA</span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1 leading-snug">{t.desc}</p>
                    </div>
                    {t.available && (
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all shrink-0 self-center" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <p className="text-[10.5px] text-gray-500">Modul pencairan akan terus bertambah seiring kebutuhan</p>
          <button onClick={onClose} className="px-4 py-1.5 text-[12px] font-medium text-gray-700 rounded-lg hover:bg-gray-200">
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Item Row ─────────────────────────────────────────────────────────────────
const ItemRow = ({ item, index, indentLeft = 16 }) => {
  const hasKoef = item.koefisien?.length > 1;
  return (
    <div className="hover:bg-gray-50/60 transition-colors border-b border-gray-50 last:border-0">
      {/* Desktop — tabel sejajar header kolom */}
      <div
        className="hidden md:grid items-start gap-3 py-3 pr-5"
        style={{ gridTemplateColumns: ITEM_GRID, paddingLeft: `${indentLeft}px` }}
      >
        <div className="text-sm font-mono text-gray-400 pt-0.5">{String(index + 1).padStart(2, '0')}</div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 text-sm leading-snug">{item.nama_item}</p>
          {item.keterangan && <p className="text-[11px] text-gray-500 mt-0.5">{item.keterangan}</p>}
        </div>
        <div className="flex justify-center pt-0.5">
          {item.jenis_sht && (
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${shtBadge(item.jenis_sht)}`}>{item.jenis_sht}</span>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-700">
            {item.volume} <span className="text-gray-500 font-normal text-xs">{item.satuan}</span>
          </p>
          {hasKoef && (
            <p className="text-[10px] text-gray-400 mt-0.5">
              {item.koefisien.map(k => `${k.nilai} ${k.satuan}`).join(' × ')}
            </p>
          )}
        </div>
        <div className="text-right text-sm text-gray-600 pt-0.5">{formatRupiah(item.harga_satuan)}</div>
        <div className="text-right font-semibold text-emerald-600/80 text-sm pt-0.5">{formatRupiah(item.total)}</div>
      </div>

      {/* Mobile */}
      <div className="md:hidden flex items-start gap-3 pr-4 py-2.5" style={{ paddingLeft: `${indentLeft}px` }}>
        <span className="text-[10.5px] text-gray-400 font-mono mt-0.5 shrink-0 w-5 text-right">{index + 1}.</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-800 font-medium leading-snug">{item.nama_item}</span>
            {item.jenis_sht && (
              <span className={`text-[9.5px] px-1.5 py-0.5 rounded-full shrink-0 ${shtBadge(item.jenis_sht)}`}>{item.jenis_sht}</span>
            )}
          </div>
          {item.keterangan && <p className="text-[11px] text-gray-500 mt-0.5">{item.keterangan}</p>}
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-[11px] text-gray-500">
              {item.volume} {item.satuan} × {formatRupiah(item.harga_satuan)}
            </span>
            <span className="text-[11.5px] font-semibold text-emerald-600/80">{formatRupiah(item.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Rekening Group (collapsible, hierarki bertingkat) ────────────────────────
const RekeningGroup = ({ node, indexMap }) => {
  const [open, setOpen] = useState(true);
  const s = REK_DEPTH_STYLES[Math.min(node.depth, REK_DEPTH_STYLES.length - 1)];
  const headerIndent = 12 + node.depth * REK_INDENT;
  const itemIndent = headerIndent + REK_INDENT + 4; // item menjorok ke dalam dari header rekeningnya

  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className={`w-full flex items-center gap-2 py-2 pr-4 border-b border-l-4 border-b-gray-100 ${s.bar} ${s.bg} transition-colors text-left`}
        style={{ paddingLeft: `${headerIndent}px` }}
      >
        {open
          ? <ChevronDown className={`h-3 w-3 shrink-0 ${s.text} opacity-60`} />
          : <ChevronRight className={`h-3 w-3 shrink-0 ${s.text} opacity-60`} />}
        <span className={`font-mono text-[11.5px] ${s.weight} ${s.text} flex-1 min-w-0 truncate`}>{node.code}</span>
        <span className={`text-[10px] ${s.count} shrink-0`}>{node.itemCount} item</span>
        <span className={`text-[11.5px] font-bold ${s.acc} shrink-0`}>{formatRupiah(node.total)}</span>
      </button>

      {open && (
        <div>
          {[...node.children.values()].map(child => (
            <RekeningGroup key={child.code} node={child} indexMap={indexMap} />
          ))}
          {node.items.length > 0 && (
            <div
              className="hidden md:grid py-1.5 pr-5 border-b border-gray-100 bg-gray-50/40 text-[9.5px] font-bold uppercase tracking-widest text-gray-400"
              style={{ gridTemplateColumns: ITEM_GRID, paddingLeft: `${itemIndent}px` }}
            >
              <div>No</div>
              <div>Uraian Item</div>
              <div className="text-center">Jenis</div>
              <div className="text-right">Vol. Satuan</div>
              <div className="text-right">Harga Satuan</div>
              <div className="text-right">Total</div>
            </div>
          )}
          {node.items.map(item => (
            <ItemRow key={item.id} item={item} index={indexMap[item.id] ?? 0} indentLeft={itemIndent} />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Pencairan Row (untuk tab Realisasi) ──────────────────────────────────────
const JENIS_LABEL = {
  atk: 'ATK', cetak: 'Cetak', makmin: 'Makan Minum',
  perjadin: 'Perjadin', jasa: 'Jasa', hibah: 'Hibah/Bansos', lainnya: 'Lainnya',
};
const JENIS_COLOR = {
  atk: 'bg-teal-100 text-teal-700',
  cetak: 'bg-blue-100 text-blue-700',
  makmin: 'bg-amber-100 text-amber-700',
  perjadin: 'bg-purple-100 text-purple-700',
  jasa: 'bg-rose-100 text-rose-700',
  hibah: 'bg-cyan-100 text-cyan-700',
  lainnya: 'bg-gray-100 text-gray-700',
};
const STATUS_COLOR = {
  draft:     { label: 'Draft',     cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  finalized: { label: 'Final',     cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  cancelled: { label: 'Dibatalkan',cls: 'bg-rose-100 text-rose-700 border-rose-200' },
};

const PencairanRow = ({ p, onDetail }) => {
  const status = STATUS_COLOR[p.status] || { label: p.status, cls: 'bg-gray-100 text-gray-700 border-gray-200' };
  return (
    <tr className="hover:bg-emerald-50/40 transition-colors">
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${JENIS_COLOR[p.jenis_pencairan] || JENIS_COLOR.lainnya}`}>
          {JENIS_LABEL[p.jenis_pencairan] || p.jenis_pencairan}
        </span>
      </td>
      <td className="px-4 py-3">
        <p className="font-mono text-[12px] text-gray-800 font-semibold">{p.no_pesanan_b || `#${p.id}`}</p>
        <p className="text-[10.5px] text-gray-500 mt-0.5">
          {p.tgl_pesanan
            ? new Date(p.tgl_pesanan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
            : '—'}
        </p>
      </td>
      <td className="px-4 py-3 text-gray-700 text-[12.5px]">{p.penyedia?.nama || '—'}</td>
      <td className="px-4 py-3 text-center text-gray-700 text-[12.5px]">{p.jumlah_item || 0}</td>
      <td className="px-4 py-3 text-right font-bold text-emerald-700">{formatRupiah(p.total_nilai)}</td>
      <td className="px-4 py-3 text-center">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10.5px] font-semibold ${status.cls}`}>
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onDetail(p)}
          className="p-1.5 rounded-lg text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 transition"
          title="Detail"
        >
          <Eye className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
};

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
  const [pencairanModalOpen, setPencairanModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('rka'); // 'rka' | 'realisasi'

  // Realisasi data (list of pencairan terkait master ini)
  const [pencairanList, setPencairanList] = useState([]);
  const [loadingPencairan, setLoadingPencairan] = useState(false);

  // ─── Fetch master ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!masterId) { setError('Master ID tidak ditemukan'); setLoading(false); return; }
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/anggaran/master/${masterId}`);
        if (res.data.success) {
          const m = res.data.data;
          setMaster(m);
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

  // ─── Fetch pencairan (realisasi) untuk master ini ─────────────────────
  const fetchPencairan = useCallback(async () => {
    if (!masterId || !selectedTahun) return;
    setLoadingPencairan(true);
    try {
      const res = await api.get('/pencairan', {
        params: { master_kegiatan_id: masterId, tahun: selectedTahun },
      });
      setPencairanList(res.data?.data || []);
    } catch {
      setPencairanList([]);
    } finally {
      setLoadingPencairan(false);
    }
  }, [masterId, selectedTahun]);

  useEffect(() => { fetchPencairan(); }, [fetchPencairan]);

  const handlePilihPencairan = (jenis) => {
    setPencairanModalOpen(false);
    const params = new URLSearchParams({
      master_id: masterId,
      tahun: selectedTahun,
      sub_kegiatan: master?.nama_sub_kegiatan || '',
    });
    if (jenis === 'atk') {
      navigate(`${getPath('/sekretariat/pencairan/atk/new')}?${params}`);
    }
  };

  const handleBack = () => navigate(-1);

  const handlePrint = () => {
    openPrintRKA({
      master,
      tahun: selectedTahun,
      tree: rekeningTree,
      indexMap: itemIndexMap,
      pagu: pagNominal,
    });
  };

  const handleOpenRKA = (paguId) => {
    const params = new URLSearchParams({ pagu_id: paguId, label: master.nama_sub_kegiatan });
    navigate(`${getPath('/sekretariat/anggaran/item-rka')}?${params}`);
  };

  const handlePencairanDetail = (p) => {
    if (p.jenis_pencairan === 'atk') {
      navigate(`${getPath(`/sekretariat/pencairan/atk/${p.id}`)}`);
    }
  };

  // ─── Derived ──────────────────────────────────────────────────────────
  const paguTahunList = useMemo(
    () => [...(master?.pagu_list || [])].sort((a, b) => b.tahun - a.tahun),
    [master],
  );
  const paguSelected = useMemo(
    () => paguTahunList.find(p => p.tahun === selectedTahun),
    [paguTahunList, selectedTahun],
  );

  const totalRka = paguSelected?.total_anggaran ?? 0;
  const pagNominal = paguSelected?.pagu ?? 0;
  const sisaPagu = pagNominal - totalRka;
  const items = useMemo(() => paguSelected?.rka_items ?? [], [paguSelected]);

  // Pohon hierarki rekening + penomoran item global (urutan DFS)
  const rekeningTree = useMemo(() => buildRekeningTree(items), [items]);
  const itemIndexMap = useMemo(() => {
    const map = {};
    let idx = 0;
    const dfs = (node) => {
      node.children.forEach(dfs);
      node.items.forEach(item => { map[item.id] = idx++; });
    };
    dfs(rekeningTree);
    return map;
  }, [rekeningTree]);

  // Realisasi totals (finalized only)
  const realisasiStats = useMemo(() => {
    const finalized = pencairanList.filter(p => p.status === 'finalized');
    const totalRealisasi = finalized.reduce((s, p) => s + (Number(p.total_nilai) || 0), 0);
    return {
      totalRealisasi,
      countFinalized: finalized.length,
      countDraft: pencairanList.filter(p => p.status === 'draft').length,
      countAll: pencairanList.length,
      pctRealisasi: persen(totalRealisasi, totalRka),
    };
  }, [pencairanList, totalRka]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
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
            <span className="font-mono text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{master.kode_sub_kegiatan}</span>
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
          <h1 className="text-base font-bold text-gray-900 mt-1 leading-snug">{master.nama_sub_kegiatan}</h1>
          <p className="text-xs text-gray-500 mt-0.5">{master.nama_program} › {master.nama_kegiatan}</p>
        </div>
        <button
          onClick={() => setPencairanModalOpen(true)}
          className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-[12.5px] font-semibold shadow-md shadow-emerald-200/50 hover:shadow-lg hover:shadow-emerald-200/70 transition-all"
        >
          <Wallet className="h-3.5 w-3.5" />
          Pencairan
        </button>
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
            <StatCard label="Pagu" value={`Rp ${fmtCompact(pagNominal)}`} sub={`Tahun ${selectedTahun}`} color="emerald" icon={DollarSign} />
            <StatCard label="Total Anggaran" value={`Rp ${fmtCompact(totalRka)}`} sub={`${items.length} item`} color="blue" icon={Layers} />
            <StatCard
              label="Realisasi"
              value={`Rp ${fmtCompact(realisasiStats.totalRealisasi)}`}
              sub={realisasiStats.countFinalized > 0 ? `${realisasiStats.countFinalized} pencairan` : 'Belum ada'}
              color={realisasiStats.totalRealisasi > 0 ? 'purple' : 'gray'}
              icon={CheckCircle2}
            />
            <StatCard
              label="% Realisasi"
              value={totalRka > 0 ? `${realisasiStats.pctRealisasi}%` : '—'}
              sub={
                realisasiStats.pctRealisasi >= 80 ? 'Sudah optimal' :
                realisasiStats.pctRealisasi >= 40 ? 'Sebagian terealisasi' :
                realisasiStats.pctRealisasi > 0 ? 'Awal realisasi' : 'Belum dimulai'
              }
              color="amber"
              icon={Percent}
            />
          </div>

          {/* ── Tabs ── */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/40 flex items-center gap-2">
              <div className="inline-flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
                <button
                  onClick={() => setActiveTab('rka')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-semibold transition-all ${
                    activeTab === 'rka'
                      ? 'bg-white shadow-sm text-blue-700 shadow-blue-100/60'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Rencana Kerja Anggaran
                  {items.length > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      activeTab === 'rka' ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
                    }`}>{items.length}</span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('realisasi')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12.5px] font-semibold transition-all ${
                    activeTab === 'realisasi'
                      ? 'bg-white shadow-sm text-purple-700 shadow-purple-100/60'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Receipt className="h-3.5 w-3.5" />
                  Realisasi Anggaran
                  {realisasiStats.countAll > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                      activeTab === 'realisasi' ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-500'
                    }`}>{realisasiStats.countAll}</span>
                  )}
                </button>
              </div>
            </div>

            {/* ═══════════════ TAB RKA ═══════════════ */}
            {activeTab === 'rka' && (
              <div>
                {/* Riwayat Pagu (jika multi-year) */}
                {paguTahunList.length > 1 && (
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart2 className="h-4 w-4 text-purple-500" />
                      <h2 className="text-sm font-bold text-gray-800">Riwayat Pagu Tahun ke Tahun</h2>
                    </div>
                    <div className="overflow-x-auto -mx-4">
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
                                <td className="px-4 py-2.5 text-right font-semibold text-emerald-700">{formatRupiah(p.pagu)}</td>
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

                {/* Header + tombol Kelola */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <h2 className="text-sm font-bold text-gray-800">Rencana Kerja Anggaran {selectedTahun}</h2>
                    {items.length > 0 && (
                      <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">{items.length} item</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handlePrint}
                      disabled={items.length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      Print
                    </button>
                    <button
                      onClick={() => handleOpenRKA(paguSelected.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Kelola Item RKA
                    </button>
                  </div>
                </div>

                {/* RKA Items */}
                {items.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Belum ada item RKA untuk tahun {selectedTahun}
                  </div>
                ) : (
                  <>
                    {[...rekeningTree.children.values()].map(node => (
                      <RekeningGroup key={node.code} node={node} indexMap={itemIndexMap} />
                    ))}
                    <div className="flex items-center justify-between px-4 py-3 bg-blue-50 border-t border-blue-100">
                      <span className="text-xs font-semibold text-blue-700">Total RKA</span>
                      <span className="text-sm font-bold text-blue-700">{formatRupiah(totalRka)}</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ═══════════════ TAB REALISASI ═══════════════ */}
            {activeTab === 'realisasi' && (
              <div>
                {/* Mini stats */}
                <div className="px-4 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-gray-100 bg-gradient-to-br from-purple-50/30 to-white">
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                    <p className="text-[10px] uppercase font-bold text-emerald-700">Realisasi</p>
                    <p className="text-sm font-bold text-emerald-900 mt-0.5">{formatRupiah(realisasiStats.totalRealisasi)}</p>
                    <p className="text-[10.5px] text-emerald-600 mt-0.5">{realisasiStats.countFinalized} pencairan final</p>
                  </div>
                  <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
                    <p className="text-[10px] uppercase font-bold text-purple-700">% Anggaran</p>
                    <p className="text-sm font-bold text-purple-900 mt-0.5">{totalRka > 0 ? `${realisasiStats.pctRealisasi}%` : '—'}</p>
                    <p className="text-[10.5px] text-purple-600 mt-0.5">dari {formatRupiah(totalRka)}</p>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-[10px] uppercase font-bold text-amber-700">Draft</p>
                    <p className="text-sm font-bold text-amber-900 mt-0.5">{realisasiStats.countDraft}</p>
                    <p className="text-[10.5px] text-amber-600 mt-0.5">menunggu finalisasi</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <p className="text-[10px] uppercase font-bold text-gray-600">Sisa Anggaran</p>
                    <p className={`text-sm font-bold mt-0.5 ${totalRka - realisasiStats.totalRealisasi < 0 ? 'text-rose-900' : 'text-gray-800'}`}>
                      {formatRupiah(totalRka - realisasiStats.totalRealisasi)}
                    </p>
                    <p className="text-[10.5px] text-gray-500 mt-0.5">belum direalisasi</p>
                  </div>
                </div>

                {/* List pencairan */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-purple-500" />
                  <h2 className="text-sm font-bold text-gray-800">Daftar Pencairan {selectedTahun}</h2>
                  {pencairanList.length > 0 && (
                    <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold ml-auto">
                      {pencairanList.length} pencairan
                    </span>
                  )}
                </div>

                {loadingPencairan ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-500" />
                  </div>
                ) : pencairanList.length === 0 ? (
                  <div className="text-center py-10">
                    <Receipt className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 mb-1">Belum ada realisasi untuk tahun {selectedTahun}</p>
                    <p className="text-[11.5px] text-gray-400">Klik tombol "Pencairan" di atas untuk membuat realisasi pertama</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 text-[10.5px] uppercase tracking-wider text-gray-500 font-semibold">
                        <tr>
                          <th className="px-4 py-2.5 text-left">Jenis</th>
                          <th className="px-4 py-2.5 text-left">Nomor & Tanggal</th>
                          <th className="px-4 py-2.5 text-left">Penyedia</th>
                          <th className="px-4 py-2.5 text-center">Item</th>
                          <th className="px-4 py-2.5 text-right">Total</th>
                          <th className="px-4 py-2.5 text-center">Status</th>
                          <th className="px-4 py-2.5"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pencairanList.map(p => (
                          <PencairanRow key={p.id} p={p} onDetail={handlePencairanDetail} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Sisa pagu summary card (shown below tabs) ── */}
          {paguSelected && (
            <div className="grid grid-cols-3 gap-3">
              <StatCard
                label="Sisa Pagu"
                value={`Rp ${fmtCompact(Math.abs(sisaPagu))}`}
                sub={sisaPagu < 0 ? 'Melebihi pagu' : sisaPagu === 0 ? 'Sesuai pagu' : 'Belum terisi penuh'}
                color={sisaPagu < 0 ? 'rose' : sisaPagu === 0 ? 'gray' : 'amber'}
                icon={sisaPagu < 0 ? TrendingUp : TrendingDown}
              />
              <StatCard
                label="Belum Direalisasi"
                value={`Rp ${fmtCompact(Math.max(0, totalRka - realisasiStats.totalRealisasi))}`}
                sub="Dari nominal anggaran"
                color="amber"
                icon={Clock}
              />
              <StatCard
                label="SILPA Estimasi"
                value={`Rp ${fmtCompact(pagNominal - realisasiStats.totalRealisasi)}`}
                sub="Pagu − Realisasi"
                color="purple"
                icon={BarChart2}
              />
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <DollarSign className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Belum ada data pagu untuk sub kegiatan ini</p>
        </div>
      )}

      <PencairanTypeModal
        open={pencairanModalOpen}
        onClose={() => setPencairanModalOpen(false)}
        onSelect={handlePilihPencairan}
      />
    </div>
  );
};

export default DetailSubKegiatanPage;
