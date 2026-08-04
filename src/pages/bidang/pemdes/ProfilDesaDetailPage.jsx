import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Camera,
  CircleAlert,
  ClipboardList,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Instagram,
  Loader2,
  Mail,
  MapPin,
  MapPinned,
  Phone,
  Route,
  Ruler,
  ScrollText,
  Sparkles,
  Users,
  Youtube,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../../api';
import { useBidangPath } from '../../../hooks/useBidangPath';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL;
const IMAGE_BASE_URL = import.meta.env.VITE_IMAGE_BASE_URL;

const isFilled = (value) => {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === 'string') {
    return value.trim() !== '';
  }

  return true;
};

const formatNumber = (value) => new Intl.NumberFormat('id-ID').format(Number(value || 0));

const formatDate = (value) => {
  if (!value) {
    return 'Belum diperbarui';
  }

  return new Date(value).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

const formatText = (value, fallback = 'Belum diisi') => (isFilled(value) ? String(value) : fallback);

const formatStatusPemerintahan = (value) => (value === 'kelurahan' ? 'Kelurahan' : 'Desa');

const getCompletionTone = (statusKey) => {
  if (statusKey === 'lengkap') {
    return {
      badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      bar: 'bg-emerald-600',
    };
  }

  if (statusKey === 'perlu_dilengkapi') {
    return {
      badge: 'border-amber-200 bg-amber-50 text-amber-700',
      bar: 'bg-amber-500',
    };
  }

  return {
    badge: 'border-slate-200 bg-slate-50 text-slate-600',
    bar: 'bg-slate-300',
  };
};

const getProfileImageUrl = (path) => {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const baseUrl = (IMAGE_BASE_URL || BACKEND_URL || '').replace(/\/$/, '');
  const normalizedPath = String(path).replace(/^\/+/, '');

  return baseUrl ? `${baseUrl}/uploads/${normalizedPath}` : null;
};

const OverviewCard = ({ icon, title, value, subtitle, tone }) => {
  const IconComponent = icon;

  return (
    <div className="rounded-lg border border-white/70 bg-white/90 p-5 shadow-sm backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">{title}</p>
          <p className="mt-3 text-2xl font-black tracking-tight text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone}`}>
          <IconComponent className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
};

const SectionCard = ({ icon, title, description, children, className = '' }) => {
  const IconComponent = icon;

  return (
    <section className={`rounded-lg border border-slate-200 bg-white p-6 shadow-sm ${className}`.trim()}>
      <div className="mb-5 flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
          <IconComponent className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
};

const InfoRow = ({ icon, label, value, href }) => {
  const IconComponent = icon;
  const hasValue = isFilled(value);

  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-sm">
        <IconComponent className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-brand-600">{label}</p>
        {hasValue && href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-2 break-all font-medium text-slate-700 transition hover:text-brand-700"
          >
            <span>{value}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
          </a>
        ) : (
          <p className="mt-1 break-words font-medium text-slate-700">{formatText(value)}</p>
        )}
      </div>
    </div>
  );
};

const IndicatorPill = ({ active, label }) => (
  <div
    className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
      active
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-slate-200 bg-slate-50 text-slate-400'
    }`}
  >
    {label}
  </div>
);

const NarrativeCard = ({ title, icon, value, emptyText, accentClass }) => {
  const IconComponent = icon;

  return (
    <article className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 w-full ${accentClass}`} />
      <div className="p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-900 text-white shadow-sm">
            <IconComponent className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500">Ringkasan narasi yang diisi oleh desa</p>
          </div>
        </div>

        <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50/80 p-4">
          <p className="whitespace-pre-wrap text-sm leading-7 text-slate-600">{formatText(value, emptyText)}</p>
        </div>
      </div>
    </article>
  );
};

const ProfilDesaDetailPage = ({
  listPath,
  backLabel = 'Kembali ke daftar profil desa',
}) => {
  const navigate = useNavigate();
  const { desaId } = useParams();
  const { getPath } = useBidangPath();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const resolvedListPath = listPath || getPath('/pemdes/profil-desa');

  useEffect(() => {
    let isMounted = true;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await api.get(`/pemdes/profil-desa/${desaId}`);

        if (!isMounted) {
          return;
        }

        if (response.data.success) {
          setData(response.data.data);
          return;
        }

        setError('Detail profil desa tidak dapat dimuat.');
      } catch (fetchError) {
        console.error('Failed to fetch profil desa detail:', fetchError);

        if (!isMounted) {
          return;
        }

        setError(fetchError.response?.data?.message || 'Gagal memuat detail profil desa.');
        toast.error('Gagal memuat detail profil desa');
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchDetail();

    return () => {
      isMounted = false;
    };
  }, [desaId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-5 py-4 text-slate-600 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
          Memuat detail profil desa...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
          <CircleAlert className="mx-auto h-12 w-12 text-amber-500" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Detail profil tidak tersedia</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">{error || 'Data profil desa tidak ditemukan.'}</p>
          <button
            type="button"
            onClick={() => navigate(resolvedListPath)}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </button>
        </div>
      </div>
    );
  }

  const completionTone = getCompletionTone(data.completion?.status_key);
  const profileImageUrl = getProfileImageUrl(data.foto_kantor_desa_path);

  return (
    <div className="min-h-screen bg-slate-50 px-4 pb-8 pt-20 sm:px-6 lg:px-8 lg:pt-6">
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-xl bg-slate-900 p-7 text-white shadow-[0_24px_80px_-32px_rgba(15,118,110,0.55)] sm:p-8">
          <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.22),_transparent_42%)]" />
          <div className="absolute -right-12 bottom-0 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-8 top-8 h-32 w-32 rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <button
                type="button"
                onClick={() => navigate(resolvedListPath)}
                className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 transition hover:bg-white/15"
              >
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
              </button>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/80">
                <Sparkles className="h-4 w-4" />
                Detail Profil Desa
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">{data.nama_desa}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-white/85 sm:text-base">
                {formatStatusPemerintahan(data.status_pemerintahan)} di Kecamatan {data.kecamatan?.nama}. Kode desa {data.kode_desa}. Terakhir diperbarui pada {formatDate(data.updated_at)}.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${completionTone.badge}`}>
                  {data.completion?.status_label || 'Belum diisi'}
                </span>
                <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80">
                  {data.profil_tersimpan ? 'Profil tersimpan di sistem' : 'Profil belum dibuat'}
                </span>
              </div>

              <div className="mt-5 rounded-lg border border-white/15 bg-white/10 px-5 py-4 text-sm leading-6 text-white/90 backdrop-blur-sm">
                {data.completion?.filled || 0} dari {data.completion?.total || 0} indikator inti sudah terisi. Admin dapat meninjau kontak, lokasi, narasi desa, dan dokumentasi kantor dari halaman ini.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
              <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-white/70">Kelengkapan</p>
                <p className="mt-2 text-3xl font-black">{data.completion?.percentage || 0}%</p>
                <p className="mt-1 text-xs text-white/70">indikator inti profil</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-white/70">Penduduk</p>
                <p className="mt-2 text-3xl font-black">{data.jumlah_penduduk ? formatNumber(data.jumlah_penduduk) : '-'}</p>
                <p className="mt-1 text-xs text-white/70">jiwa terlapor</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-white/70">Koordinat</p>
                <p className="mt-2 text-3xl font-black">{data.flags?.has_coordinates ? 'Ada' : 'Belum'}</p>
                <p className="mt-1 text-xs text-white/70">titik lokasi kantor desa</p>
              </div>
              <div className="rounded-lg border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.18em] text-white/70">Foto Kantor</p>
                <p className="mt-2 text-3xl font-black">{data.flags?.has_office_photo ? 'Ada' : 'Belum'}</p>
                <p className="mt-1 text-xs text-white/70">dokumentasi profil</p>
              </div>
            </div>
          </div>
        </div>

        {!data.profil_tersimpan && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-sm">
            Profil desa ini belum pernah disimpan oleh admin desa. Data yang tampil saat ini masih berupa identitas dasar wilayah tanpa isian profil lanjutan.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <OverviewCard
            icon={Building2}
            title="Klasifikasi"
            value={formatText(data.klasifikasi_desa_label)}
            subtitle="kategori perkembangan desa"
            tone="bg-slate-100 text-slate-700"
          />
          <OverviewCard
            icon={BadgeCheck}
            title="Status Desa"
            value={formatText(data.status_desa_label)}
            subtitle="status pembangunan atau IDM"
            tone="bg-emerald-100 text-emerald-700"
          />
          <OverviewCard
            icon={ClipboardList}
            title="Tipologi"
            value={formatText(data.tipologi_desa_label)}
            subtitle="karakter dominan wilayah desa"
            tone="bg-amber-100 text-amber-700"
          />
          <OverviewCard
            icon={Users}
            title="Jumlah Penduduk"
            value={data.jumlah_penduduk ? `${formatNumber(data.jumlah_penduduk)} jiwa` : 'Belum diisi'}
            subtitle="data populasi yang dilaporkan"
            tone="bg-slate-100 text-slate-700"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <SectionCard
            icon={FileText}
            title="Informasi Profil"
            description="Identitas inti dan metadata profil desa yang tersimpan di sistem."
            className="xl:col-span-8"
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <InfoRow icon={Building2} label="Nama Desa" value={data.nama_desa} />
              <InfoRow icon={Building2} label="Status Pemerintahan" value={formatStatusPemerintahan(data.status_pemerintahan)} />
              <InfoRow icon={MapPinned} label="Kecamatan" value={data.kecamatan?.nama} />
              <InfoRow icon={FileText} label="Kode Desa" value={data.kode_desa} />
              <InfoRow icon={Ruler} label="Luas Wilayah" value={data.luas_wilayah} />
              <InfoRow icon={Route} label="Radius ke Kecamatan" value={data.radius_ke_kecamatan} />
              <div className="md:col-span-2">
                <InfoRow icon={MapPin} label="Alamat Kantor" value={data.alamat_kantor} />
              </div>
            </div>
          </SectionCard>

          <div className="space-y-6 xl:col-span-4">
            <SectionCard
              icon={BadgeCheck}
              title="Indikator Profil"
              description="Sinyal cepat untuk melihat komponen penting yang sudah tersedia."
            >
              <div className="space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-slate-600">Kelengkapan inti</span>
                    <span className="font-bold text-slate-800">{data.completion?.percentage || 0}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className={`h-2 rounded-full ${completionTone.bar}`}
                      style={{ width: `${Math.max(data.completion?.percentage || 0, data.completion?.percentage ? 6 : 0)}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <IndicatorPill active={data.flags?.has_contact} label="Kontak" />
                  <IndicatorPill active={data.flags?.has_coordinates} label="Koordinat" />
                  <IndicatorPill active={data.flags?.has_office_photo} label="Foto Kantor" />
                  <IndicatorPill active={data.flags?.has_social_media} label="Media Sosial" />
                  <IndicatorPill active={data.flags?.has_narratives} label="Narasi Lengkap" />
                </div>
              </div>
            </SectionCard>

            <SectionCard
              icon={Phone}
              title="Kontak dan Kanal"
              description="Nomor kontak, email, dan kanal digital yang terhubung."
            >
              <div className="space-y-3">
                <InfoRow icon={Phone} label="Nomor Telepon" value={data.no_telp} href={data.no_telp ? `tel:${data.no_telp}` : null} />
                <InfoRow icon={Mail} label="Email" value={data.email} href={data.email ? `mailto:${data.email}` : null} />
                <InfoRow icon={Instagram} label="Instagram" value={data.instagram_url} href={data.instagram_url} />
                <InfoRow icon={Youtube} label="YouTube" value={data.youtube_url} href={data.youtube_url} />
              </div>
            </SectionCard>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <SectionCard
            icon={MapPinned}
            title="Lokasi Kantor Desa"
            description="Koordinat dan tautan peta untuk memeriksa posisi kantor desa."
          >
            <div className="space-y-3">
              <InfoRow icon={MapPin} label="Latitude" value={data.latitude} />
              <InfoRow icon={MapPin} label="Longitude" value={data.longitude} />
              <InfoRow icon={Route} label="Radius ke Kecamatan" value={data.radius_ke_kecamatan} />
              <InfoRow
                icon={MapPinned}
                label="Buka di Peta"
                value={data.maps_url ? 'Lihat lokasi kantor desa' : null}
                href={data.maps_url}
              />
            </div>
          </SectionCard>

          <SectionCard
            icon={Camera}
            title="Dokumentasi Kantor"
            description="Foto kantor desa yang diunggah pada profil wilayah."
          >
            {profileImageUrl ? (
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                <img src={profileImageUrl} alt={`Kantor ${data.nama_desa}`} className="h-72 w-full object-cover" />
              </div>
            ) : (
              <div className="flex h-72 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-6 text-center text-sm text-slate-400">
                <ImageIcon className="mb-3 h-10 w-10" />
                Belum ada foto kantor desa yang diunggah.
              </div>
            )}
          </SectionCard>
        </div>

        <SectionCard
          icon={ScrollText}
          title="Narasi Profil Desa"
          description="Konten naratif yang menjelaskan sejarah, kondisi sosial, dan potensi wilayah desa."
        >
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <NarrativeCard
              title="Sejarah Desa"
              icon={ScrollText}
              value={data.sejarah_desa}
              emptyText="Sejarah desa belum diisi."
              accentClass="bg-slate-900"
            />
            <NarrativeCard
              title="Demografi"
              icon={Users}
              value={data.demografi}
              emptyText="Informasi demografi belum diisi."
              accentClass="bg-slate-900"
            />
            <NarrativeCard
              title="Potensi Desa"
              icon={Sparkles}
              value={data.potensi_desa}
              emptyText="Potensi desa belum diisi."
              accentClass="bg-slate-900"
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
};

export default ProfilDesaDetailPage;