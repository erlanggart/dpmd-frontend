import { useEffect, useState } from 'react';
import api from '../../api';
import {
  LuX, LuFileText, LuHistory, LuLayers, LuDownload, LuLoader, LuPencilLine,
} from 'react-icons/lu';

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const SOURCE_LABEL = { initial: 'Pengajuan awal', revision: 'Revisi' };

/**
 * Modal riwayat versi dokumen & ronde revisi/anotasi Bankeu Perubahan.
 * Dipakai oleh Desa & DPMD (read-only). Self-fetching.
 *
 * Props:
 *  - apiBase: '/desa/bankeu-perubahan' | '/dpmd/bankeu-perubahan' | '/kecamatan/bankeu-perubahan'
 *  - proposalId
 *  - proposalTitle
 *  - onClose
 */
export default function BankeuRevisionHistoryModal({ apiBase, proposalId, proposalTitle, onClose }) {
  const [loading, setLoading] = useState(true);
  const [versions, setVersions] = useState([]);
  const [revisions, setRevisions] = useState([]);
  const [error, setError] = useState(null);
  // Pratinjau PDF inline (popup) — { url, title } | null
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [vRes, rRes] = await Promise.all([
          api.get(`${apiBase}/proposals/${proposalId}/versions`),
          api.get(`${apiBase}/proposals/${proposalId}/revisions`),
        ]);
        if (cancelled) return;
        setVersions(vRes.data?.data || []);
        setRevisions(rRes.data?.data || []);
      } catch {
        if (!cancelled) setError('Gagal memuat riwayat dokumen.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [apiBase, proposalId]);

  const fullUrl = (p) => (p ? `${imageBaseUrl}${p.startsWith('/') ? '' : '/'}${p}` : null);
  const fmtDate = (d) => d ? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between shrink-0">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              <LuHistory className="w-4 h-4 text-blue-600" /> Riwayat Revisi & Versi
            </h3>
            {proposalTitle && <p className="text-xs text-gray-500 truncate">{proposalTitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500"><LuX className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-10 text-gray-500 gap-2">
              <LuLoader className="w-5 h-5 animate-spin" /> Memuat riwayat...
            </div>
          )}
          {error && <div className="text-center text-red-600 py-8">{error}</div>}

          {!loading && !error && (
            <>
              {/* Ronde revisi / anotasi Kecamatan */}
              <section>
                <h4 className="text-sm font-bold text-gray-700 flex items-center gap-1.5 mb-2">
                  <LuPencilLine className="w-4 h-4 text-orange-600" /> Ronde Revisi Kecamatan ({revisions.length})
                </h4>
                {revisions.length === 0 ? (
                  <p className="text-xs text-gray-400">Belum ada revisi dari Kecamatan.</p>
                ) : (
                  <div className="space-y-2">
                    {revisions.map((r) => (
                      <div key={r.id} className="border border-orange-200 bg-orange-50/60 rounded-xl p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-orange-700">
                            Revisi ke-{r.round_number}
                            <span className="font-normal text-orange-600"> · atas Versi {r.version_number ?? '-'}</span>
                          </span>
                          <span className="text-[10px] text-gray-400">{fmtDate(r.created_at)}</span>
                        </div>
                        {r.catatan && <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">{r.catatan}</p>}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-[10px] text-gray-500">oleh {r.annotated_by_name || '-'}</span>
                          {r.annotated_pdf_url ? (
                            <button type="button"
                              onClick={() => setPreview({ url: fullUrl(r.annotated_pdf_url), title: `PDF Beranotasi · Revisi ke-${r.round_number}` })}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold rounded-lg">
                              <LuFileText className="w-3.5 h-3.5" /> Lihat PDF Beranotasi
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">Tanpa anotasi visual</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Versi dokumen Desa */}
              <section>
                <h4 className="text-sm font-bold text-gray-700 flex items-center gap-1.5 mb-2">
                  <LuLayers className="w-4 h-4 text-blue-600" /> Versi Dokumen ({versions.length})
                </h4>
                {versions.length === 0 ? (
                  <p className="text-xs text-gray-400">Belum ada versi dokumen.</p>
                ) : (
                  <div className="space-y-1.5">
                    {versions.slice().reverse().map((v) => (
                      <div key={v.id} className="flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2">
                        <div className="min-w-0">
                          <span className="text-xs font-semibold text-gray-800">Versi {v.version_number}</span>
                          <span className="text-[10px] text-gray-500 ml-2">{SOURCE_LABEL[v.source] || v.source}</span>
                          <p className="text-[10px] text-gray-400">{fmtDate(v.created_at)} · {v.uploaded_by_name || '-'}</p>
                        </div>
                        {v.file_url && (
                          <button type="button"
                            onClick={() => setPreview({ url: fullUrl(v.file_url), title: `Versi ${v.version_number} · ${SOURCE_LABEL[v.source] || v.source}` })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg shrink-0">
                            <LuDownload className="w-3.5 h-3.5" /> Buka
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      {/* Popup pratinjau PDF (inline, tanpa buka tab baru) */}
      {preview && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4"
          onClick={() => setPreview(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between shrink-0">
              <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2 min-w-0">
                <LuFileText className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="truncate">{preview.title || 'Pratinjau PDF'}</span>
              </h4>
              <div className="flex items-center gap-1 shrink-0">
                <a href={preview.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg">
                  <LuDownload className="w-3.5 h-3.5" /> Unduh
                </a>
                <button onClick={() => setPreview(null)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
                  <LuX className="w-5 h-5" />
                </button>
              </div>
            </div>
            <iframe src={preview.url} title={preview.title || 'Pratinjau PDF'} className="flex-1 w-full bg-gray-100" />
          </div>
        </div>
      )}
    </div>
  );
}
