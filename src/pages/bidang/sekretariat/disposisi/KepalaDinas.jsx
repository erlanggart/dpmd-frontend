// src/pages/bidang/sekretariat/disposisi/KepalaDinas.jsx
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../../api';
import Swal from 'sweetalert2';
import {
  LuInbox, LuSend, LuClock, LuCheckCircle2,
  LuArrowRight, LuFileText, LuUser, LuUsers, LuCalendar, LuSearch, LuRefreshCw,
  LuX, LuCheck, LuBuilding2, LuBookOpen, LuMessageSquare, LuExternalLink
} from 'react-icons/lu';
import { INSTRUKSI_OPTIONS, INSTRUKSI_BADGES, getInstruksiLabel } from '../../../../constants/disposisiInstruksi';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};
const fmtFull = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleString('id-ID', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const ROLE_LABEL = {
  sekretaris_dinas: 'Sekretaris Dinas',
  kepala_bidang: 'Kepala Bidang',
  ketua_tim: 'Ketua Tim',
  pegawai: 'Pegawai',
};
const ROLE_COLOR = {
  sekretaris_dinas: 'bg-purple-100 text-purple-700 border-purple-200',
  kepala_bidang: 'bg-blue-100 text-blue-700 border-blue-200',
  ketua_tim: 'bg-teal-100 text-teal-700 border-teal-200',
  pegawai: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_CFG = {
  pending:  { label: 'Menunggu',   cls: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-400' },
  dibaca:   { label: 'Dibaca',     cls: 'bg-blue-100 text-blue-700 border-blue-200',       dot: 'bg-blue-400' },
  proses:   { label: 'Diproses',   cls: 'bg-indigo-100 text-indigo-700 border-indigo-200', dot: 'bg-indigo-400' },
  teruskan: { label: 'Diteruskan', cls: 'bg-teal-100 text-teal-700 border-teal-200',       dot: 'bg-teal-400' },
  selesai:  { label: 'Selesai',    cls: 'bg-green-100 text-green-700 border-green-200',    dot: 'bg-green-400' },
  ditarik:  { label: 'Ditarik',    cls: 'bg-red-100 text-red-700 border-red-200',          dot: 'bg-red-400' },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status] || STATUS_CFG.pending;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const InstruksiBadge = ({ value }) => {
  const badge = INSTRUKSI_BADGES[value] || { bg: 'bg-gray-100', text: 'text-gray-600' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
      {getInstruksiLabel(value)}
    </span>
  );
};

// ─── Teruskan Modal ───────────────────────────────────────────────────────────
const ROLE_ORDER = ['sekretaris_dinas', 'kepala_bidang', 'ketua_tim'];
const ROLE_SECTION_CFG = {
  sekretaris_dinas: { label: 'Sekretaris Dinas', color: 'border-purple-200 bg-purple-50', badge: 'bg-purple-100 text-purple-700 border-purple-300', check: 'bg-purple-600 border-purple-600', icon: '🏢' },
  kepala_bidang:    { label: 'Kepala Bidang',    color: 'border-blue-200 bg-blue-50',    badge: 'bg-blue-100 text-blue-700 border-blue-300',     check: 'bg-blue-600 border-blue-600',   icon: '👔' },
  ketua_tim:        { label: 'Ketua Tim',         color: 'border-teal-200 bg-teal-50',    badge: 'bg-teal-100 text-teal-700 border-teal-300',     check: 'bg-teal-600 border-teal-600',   icon: '👥' },
};

const TeruskanModal = ({ disposisi, availableUsers, onClose, onSuccess }) => {
  const [selectedIds, setSelectedIds] = useState([]);
  const [instruksi, setInstruksi] = useState('tindaklanjuti');
  const [catatan, setCatatan] = useState('');
  const [loading, setLoading] = useState(false);

  const grouped = ROLE_ORDER.reduce((acc, role) => {
    const users = availableUsers.filter(u => u.role === role);
    if (users.length > 0) acc[role] = users;
    return acc;
  }, {});

  const toggle = (id) => {
    const strId = String(id);
    setSelectedIds(prev => prev.includes(strId) ? prev.filter(x => x !== strId) : [...prev, strId]);
  };

  const toggleAll = (role) => {
    const roleIds = (grouped[role] || []).map(u => String(u.id));
    const allSelected = roleIds.every(id => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !roleIds.includes(id)));
    } else {
      setSelectedIds(prev => [...new Set([...prev, ...roleIds])]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedIds.length === 0) { Swal.fire('Perhatian', 'Pilih minimal satu penerima', 'warning'); return; }
    setLoading(true);
    try {
      await api.post('/disposisi', {
        surat_id: disposisi.surat_masuk?.id || disposisi.surat_id,
        ke_user_ids: selectedIds,
        instruksi,
        catatan,
        level_disposisi: 2,
      });
      await api.put(`/disposisi/${disposisi.id}/status`, { status: 'teruskan' });
      Swal.fire({ icon: 'success', title: 'Berhasil!', text: `Disposisi diteruskan ke ${selectedIds.length} penerima`, timer: 2000, showConfirmButton: false });
      onSuccess();
      onClose();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Gagal meneruskan disposisi', 'error');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 px-6 py-5 flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5 mb-1">
                <div className="p-1.5 bg-white/20 rounded-lg"><LuSend className="w-5 h-5 text-white" /></div>
                <h2 className="text-lg font-bold text-white">Teruskan Disposisi</h2>
              </div>
              <p className="text-white/70 text-xs ml-10 line-clamp-1">
                {disposisi.surat_masuk?.nomor_surat} — {disposisi.surat_masuk?.perihal}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-all text-white flex-shrink-0"><LuX className="w-5 h-5" /></button>
          </div>
        </div>
        <form id="teruskan-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">
            {/* Role sections */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-2">
                <LuUsers className="w-3.5 h-3.5" /> Pilih Penerima <span className="text-red-500">*</span>
                {selectedIds.length > 0 && (
                  <span className="ml-auto text-indigo-600 font-semibold normal-case tracking-normal">
                    {selectedIds.length} dipilih
                  </span>
                )}
              </p>
              {Object.keys(grouped).length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-4">Memuat daftar penerima...</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(grouped).map(([role, users]) => {
                    const cfg = ROLE_SECTION_CFG[role];
                    const roleIds = users.map(u => String(u.id));
                    const selectedInRole = roleIds.filter(id => selectedIds.includes(id)).length;
                    const allInRoleSelected = selectedInRole === users.length;
                    return (
                      <div key={role} className={`rounded-2xl border-2 overflow-hidden ${cfg.color}`}>
                        {/* Role header */}
                        <div className="flex items-center justify-between px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{cfg.icon}</span>
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
                              {cfg.label}
                            </span>
                            <span className="text-xs text-gray-500">{users.length} orang</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleAll(role)}
                            className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all ${allInRoleSelected ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-white/80 hover:bg-white text-gray-700 shadow-sm'}`}
                          >
                            {allInRoleSelected ? 'Batal Semua' : 'Pilih Semua'}
                          </button>
                        </div>
                        {/* Users list */}
                        <div className="px-3 pb-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {users.map(u => {
                            const strId = String(u.id);
                            const checked = selectedIds.includes(strId);
                            return (
                              <label
                                key={u.id}
                                className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all select-none ${checked ? 'bg-white border-indigo-300 shadow-sm' : 'bg-white/60 border-transparent hover:bg-white hover:border-gray-200'}`}
                              >
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={checked}
                                  onChange={() => toggle(u.id)}
                                />
                                <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-all ${checked ? `${cfg.check}` : 'border-gray-300 bg-white'}`}>
                                  {checked && <LuCheck className="w-3 h-3 text-white" />}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                                  {u.pegawai?.bidangs?.nama && <p className="text-xs text-gray-400 truncate">{u.pegawai.bidangs.nama}</p>}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Instruksi */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <LuBookOpen className="w-3.5 h-3.5 text-gray-400" /> Instruksi <span className="text-red-500">*</span>
              </label>
              <select value={instruksi} onChange={e => setInstruksi(e.target.value)} className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 focus:bg-white transition-all">
                {INSTRUKSI_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>

            {/* Catatan */}
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <LuMessageSquare className="w-3.5 h-3.5 text-gray-400" /> Catatan Disposisi
              </label>
              <textarea value={catatan} onChange={e => setCatatan(e.target.value)} rows={3} placeholder="Tulis catatan / arahan tambahan..." className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 focus:bg-white transition-all resize-none" />
            </div>
          </div>
        </form>
        <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 bg-white flex gap-3">
          <button type="button" onClick={onClose} className="flex-1 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold text-sm transition-all">Batal</button>
          <button type="submit" form="teruskan-form" disabled={loading || selectedIds.length === 0} className="flex-1 px-7 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2">
            {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Meneruskan...</> : <><LuSend className="w-4 h-4" /> Teruskan ke {selectedIds.length || '...'} Penerima</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Detail Panel ──────────────────────────────────────────────────────────────
const DetailPanel = ({ disposisi, onClose, onAction, availableUsers }) => {
  const [showTeruskan, setShowTeruskan] = useState(false);
  const [updating, setUpdating] = useState(false);
  const BASE = import.meta.env.VITE_API_BASE_URL?.replace('/api', '') || 'http://127.0.0.1:3001';

  const handleAction = async (action) => {
    if (action === 'teruskan') { setShowTeruskan(true); return; }
    setUpdating(true);
    try {
      if (action === 'baca') { await api.put(`/disposisi/${disposisi.id}/baca`); }
      else { await api.put(`/disposisi/${disposisi.id}/status`, { status: action === 'proses' ? 'proses' : 'selesai' }); }
      onAction();
    } catch (err) {
      Swal.fire('Gagal', err.response?.data?.message || 'Aksi gagal', 'error');
    } finally { setUpdating(false); }
  };

  const surat = disposisi.surat_masuk || disposisi.surat;
  const dariUser = disposisi.users_disposisi_dari_user_idTousers || disposisi.dari_user;

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative bg-white w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
          <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
          <div className="bg-gradient-to-br from-teal-600 to-cyan-700 px-5 py-4 flex-shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-teal-200 text-xs mb-0.5">{surat?.nomor_surat}</p>
                <h3 className="text-white font-bold text-base leading-snug line-clamp-2">{surat?.perihal}</h3>
                <p className="text-teal-100/70 text-xs mt-1">Dari: {dariUser?.name} • {fmt(disposisi.tanggal_disposisi)}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-all text-white flex-shrink-0"><LuX className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={disposisi.status} />
              <InstruksiBadge value={disposisi.instruksi} />
            </div>
            {disposisi.catatan && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1.5"><LuMessageSquare className="w-3.5 h-3.5" /> Catatan dari Pengirim</p>
                <p className="text-sm text-amber-800">{disposisi.catatan}</p>
              </div>
            )}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex gap-2"><span className="text-gray-400 w-28 flex-shrink-0">Pengirim Surat</span><span className="text-gray-700 font-medium">{surat?.pengirim}</span></div>
              <div className="flex gap-2"><span className="text-gray-400 w-28 flex-shrink-0">Tanggal Surat</span><span className="text-gray-700">{fmt(surat?.tanggal_surat)}</span></div>
              <div className="flex gap-2"><span className="text-gray-400 w-28 flex-shrink-0">Tgl Disposisi</span><span className="text-gray-700">{fmtFull(disposisi.tanggal_disposisi)}</span></div>
              {disposisi.tanggal_dibaca && <div className="flex gap-2"><span className="text-gray-400 w-28 flex-shrink-0">Dibaca</span><span className="text-gray-700">{fmtFull(disposisi.tanggal_dibaca)}</span></div>}
              {surat?.file_path && (
                <div className="flex gap-2 items-center">
                  <span className="text-gray-400 w-28 flex-shrink-0">File Surat</span>
                  <a href={`${BASE}/${surat.file_path}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm">
                    <LuFileText className="w-4 h-4" /> Lihat PDF <LuExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 bg-white">
            <div className="flex gap-2 flex-wrap">
              {disposisi.status === 'pending' && (
                <button onClick={() => handleAction('baca')} disabled={updating} className="flex-1 min-w-[120px] px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2">
                  <LuBookOpen className="w-4 h-4" /> Tandai Dibaca
                </button>
              )}
              {disposisi.status === 'dibaca' && (
                <button onClick={() => handleAction('proses')} disabled={updating} className="flex-1 min-w-[120px] px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2">
                  <LuClock className="w-4 h-4" /> Tandai Proses
                </button>
              )}
              {(disposisi.status === 'dibaca' || disposisi.status === 'proses') && (
                <>
                  <button onClick={() => handleAction('teruskan')} disabled={updating} className="flex-1 min-w-[120px] px-4 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2">
                    <LuArrowRight className="w-4 h-4" /> Teruskan
                  </button>
                  <button onClick={() => handleAction('selesai')} disabled={updating} className="flex-1 min-w-[120px] px-4 py-2.5 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2">
                    <LuCheckCircle2 className="w-4 h-4" /> Selesai
                  </button>
                </>
              )}
              {(disposisi.status === 'selesai' || disposisi.status === 'teruskan') && (
                <div className="flex-1 flex items-center gap-2 text-gray-400 text-sm font-medium px-4 py-2.5 bg-gray-50 rounded-xl">
                  <LuCheckCircle2 className="w-4 h-4 text-green-500" />
                  {disposisi.status === 'teruskan' ? 'Sudah diteruskan' : 'Sudah diselesaikan'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {showTeruskan && (
        <TeruskanModal disposisi={disposisi} availableUsers={availableUsers} onClose={() => setShowTeruskan(false)} onSuccess={onAction} />
      )}
    </>
  );
};

// ─── Disposisi Card ───────────────────────────────────────────────────────────
const DisposisiCard = ({ item, onClick }) => {
  const surat = item.surat_masuk || item.surat;
  const dariUser = item.users_disposisi_dari_user_idTousers || item.dari_user;
  const JENIS_CFG = { penting: 'bg-orange-100 text-orange-700', segera: 'bg-red-100 text-red-700', rahasia: 'bg-purple-100 text-purple-700', biasa: 'bg-gray-100 text-gray-600' };
  return (
    <div onClick={onClick} className={`group bg-white border rounded-2xl p-4 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all duration-200 ${item.status === 'pending' ? 'border-l-4 border-l-yellow-400' : item.status === 'proses' ? 'border-l-4 border-l-indigo-400' : item.status === 'dibaca' ? 'border-l-4 border-l-blue-400' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {surat?.jenis_surat && surat.jenis_surat !== 'biasa' && (
              <span className={`text-xs px-1.5 py-0.5 rounded font-semibold uppercase ${JENIS_CFG[surat.jenis_surat] || JENIS_CFG.biasa}`}>{surat.jenis_surat}</span>
            )}
            <span className="text-xs text-gray-400 font-mono">{surat?.nomor_surat}</span>
          </div>
          <p className="text-sm font-bold text-gray-800 leading-snug line-clamp-2 group-hover:text-indigo-700 transition-colors">{surat?.perihal}</p>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <div className="flex items-center gap-3 text-xs text-gray-500 mt-2 flex-wrap">
        <span className="flex items-center gap-1"><LuUser className="w-3 h-3" />{dariUser?.name || '-'}</span>
        <span className="flex items-center gap-1"><LuCalendar className="w-3 h-3" />{fmt(item.tanggal_disposisi)}</span>
        {item.instruksi && <InstruksiBadge value={item.instruksi} />}
      </div>
      {item.catatan && (
        <p className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5 line-clamp-1 italic">"{item.catatan}"</p>
      )}
    </div>
  );
};

// ─── Riwayat Card (sent) ──────────────────────────────────────────────────────
const RiwayatCard = ({ item }) => {
  const surat = item.surat_masuk || item.surat;
  const keUser = item.users_disposisi_ke_user_idTousers || item.ke_user;
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-400 font-mono mb-0.5">{surat?.nomor_surat}</p>
          <p className="text-sm font-bold text-gray-800 leading-snug line-clamp-2">{surat?.perihal}</p>
        </div>
        <StatusBadge status={item.status} />
      </div>
      <div className="flex items-center gap-2 flex-wrap mt-2">
        {keUser && (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${ROLE_COLOR[keUser.role] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
            <LuUser className="w-3 h-3" />{keUser.name} <span className="opacity-70">({ROLE_LABEL[keUser.role] || keUser.role})</span>
          </span>
        )}
        <InstruksiBadge value={item.instruksi} />
        <span className="text-xs text-gray-400 flex items-center gap-1 ml-auto"><LuCalendar className="w-3 h-3" />{fmtFull(item.tanggal_disposisi)}</span>
      </div>
      {item.catatan && (
        <div className="mt-2.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          <p className="text-xs font-semibold text-amber-600 mb-0.5 flex items-center gap-1"><LuMessageSquare className="w-3 h-3" /> Catatan</p>
          <p className="text-xs text-amber-800">{item.catatan}</p>
        </div>
      )}
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const KepalaDinas = () => {
  const [activeTab, setActiveTab] = useState('masuk');
  const [masukList, setMasukList] = useState([]);
  const [keluarList, setKeluarList] = useState([]);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [stats, setStats] = useState({ pending: 0, dibaca: 0, proses: 0, selesai: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingKeluar, setLoadingKeluar] = useState(false);
  const [selectedDisposisi, setSelectedDisposisi] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const loadMasuk = useCallback(async () => {
    setLoading(true);
    try {
      const [masukRes, statsRes, usersRes] = await Promise.all([
        api.get('/disposisi/masuk', { params: { limit: 50 } }),
        api.get('/disposisi/statistik'),
        api.get('/disposisi/available-users'),
      ]);
      setMasukList(masukRes.data.data || []);
      const s = statsRes.data.data?.masuk || {};
      setStats({ pending: s.pending || 0, dibaca: s.dibaca || 0, proses: s.proses || 0, selesai: s.selesai || 0 });
      setAvailableUsers(usersRes.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  const loadKeluar = useCallback(async () => {
    setLoadingKeluar(true);
    try {
      const res = await api.get('/disposisi/keluar', { params: { limit: 50 } });
      setKeluarList(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoadingKeluar(false); }
  }, []);

  useEffect(() => { loadMasuk(); }, [loadMasuk]);
  useEffect(() => {
    if (activeTab === 'keluar' && keluarList.length === 0) loadKeluar();
  }, [activeTab]);

  const handleAction = () => {
    setSelectedDisposisi(null);
    loadMasuk();
    if (activeTab === 'keluar') loadKeluar();
  };

  const filteredMasuk = masukList.filter(item => {
    const surat = item.surat_masuk || item.surat;
    const matchSearch = !search || surat?.perihal?.toLowerCase().includes(search.toLowerCase()) || surat?.nomor_surat?.toLowerCase().includes(search.toLowerCase()) || surat?.pengirim?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || item.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const filteredKeluar = keluarList.filter(item => {
    const surat = item.surat_masuk || item.surat;
    return !search || surat?.perihal?.toLowerCase().includes(search.toLowerCase()) || surat?.nomor_surat?.toLowerCase().includes(search.toLowerCase());
  });

  const pendingCount = masukList.filter(x => x.status === 'pending' || x.status === 'dibaca').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-700 via-indigo-700 to-purple-800 px-4 sm:px-6 pt-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Disposisi Surat</h1>
              <p className="text-blue-200 text-sm">Kepala Dinas DPMD Kab. Bogor</p>
            </div>
            <button onClick={() => { loadMasuk(); if (activeTab === 'keluar') loadKeluar(); }} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white">
              <LuRefreshCw className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Pending', val: stats.pending, color: 'from-yellow-400 to-orange-400', Icon: LuClock },
              { label: 'Dibaca', val: stats.dibaca, color: 'from-blue-400 to-cyan-400', Icon: LuBookOpen },
              { label: 'Proses', val: stats.proses, color: 'from-indigo-400 to-purple-400', Icon: LuArrowRight },
              { label: 'Selesai', val: stats.selesai, color: 'from-green-400 to-emerald-400', Icon: LuCheckCircle2 },
            ].map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-center">
                <div className={`w-8 h-8 mx-auto mb-1 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center`}>
                  <s.Icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-2xl font-bold text-white">{s.val}</p>
                <p className="text-xs text-white/60">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 -mt-12 pb-10">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button onClick={() => setActiveTab('masuk')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all ${activeTab === 'masuk' ? 'text-indigo-700 border-b-2 border-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
              <LuInbox className="w-4 h-4" /> Disposisi Masuk
              {pendingCount > 0 && <span className="ml-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">{pendingCount}</span>}
            </button>
            <button onClick={() => setActiveTab('keluar')} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all ${activeTab === 'keluar' ? 'text-teal-700 border-b-2 border-teal-600 bg-teal-50/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
              <LuSend className="w-4 h-4" /> Riwayat Diteruskan
              {keluarList.length > 0 && <span className="ml-1 px-2 py-0.5 bg-teal-100 text-teal-700 text-xs rounded-full font-semibold">{keluarList.length}</span>}
            </button>
          </div>
          {/* Search + Filter */}
          <div className="p-4 border-b border-gray-100 flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari perihal, nomor surat..." className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 focus:bg-white transition-all" />
            </div>
            {activeTab === 'masuk' && (
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 cursor-pointer transition-all">
                <option value="all">Semua Status</option>
                <option value="pending">Menunggu</option>
                <option value="dibaca">Dibaca</option>
                <option value="proses">Diproses</option>
                <option value="teruskan">Diteruskan</option>
                <option value="selesai">Selesai</option>
              </select>
            )}
          </div>
          {/* List */}
          <div className="p-4 space-y-3 min-h-[300px]">
            {activeTab === 'masuk' && (
              loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-10 h-10 border-[3px] border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                  <p className="text-sm text-gray-400">Memuat disposisi...</p>
                </div>
              ) : filteredMasuk.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <LuInbox className="w-12 h-12 text-gray-200" />
                  <p className="text-gray-400 font-medium">Tidak ada disposisi masuk</p>
                </div>
              ) : filteredMasuk.map(item => (
                <DisposisiCard key={item.id} item={item} onClick={() => setSelectedDisposisi(item)} />
              ))
            )}
            {activeTab === 'keluar' && (
              loadingKeluar ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-10 h-10 border-[3px] border-teal-200 border-t-teal-600 rounded-full animate-spin" />
                  <p className="text-sm text-gray-400">Memuat riwayat...</p>
                </div>
              ) : filteredKeluar.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-2">
                  <LuSend className="w-12 h-12 text-gray-200" />
                  <p className="text-gray-400 font-medium">Belum ada disposisi yang diteruskan</p>
                </div>
              ) : filteredKeluar.map(item => (
                <RiwayatCard key={item.id} item={item} />
              ))
            )}
          </div>
        </div>
      </div>

      {selectedDisposisi && (
        <DetailPanel disposisi={selectedDisposisi} availableUsers={availableUsers} onClose={() => setSelectedDisposisi(null)} onAction={handleAction} />
      )}
    </div>
  );
};

export default KepalaDinas;
