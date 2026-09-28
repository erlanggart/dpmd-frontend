// src/components/kecamatan/KecamatanDashboard.jsx
//
// Beranda akun kecamatan: apa yang harus diputuskan hari ini (verifikasi),
// lalu gambaran wilayah (desa, penduduk, BUMDes), lalu pintu ke tiap modul.
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    MapPin,
    Banknote,
    Coins,
    Building2,
    Store,
    Users,
    MessageCircle,
    ArrowRight,
    ArrowUpRight,
    ClipboardCheck,
    CheckCircle2,
    ScrollText,
    Eye,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api";
import PageHeader from "../statistik/PageHeader";
import { isAktif, tahapBadanHukum } from "../../pages/kepala-dinas/components/bumdesFilter";

const nf = new Intl.NumberFormat("id-ID");

const STATUS_VERIFIKASI = [
    { key: "verified", label: "Disetujui", warna: "bg-emerald-500" },
    { key: "pending", label: "Menunggu", warna: "bg-amber-400" },
    { key: "revision", label: "Revisi", warna: "bg-orange-500" },
    { key: "rejected", label: "Ditolak", warna: "bg-rose-500" },
];

const MODUL = [
    {
        judul: "Bantuan Keuangan",
        teks: "Verifikasi proposal bantuan keuangan desa",
        path: "/kecamatan/bankeu",
        icon: Banknote,
    },
    {
        judul: "Bankeu Perubahan",
        teks: "Verifikasi proposal pada APBD perubahan",
        path: "/kecamatan/bankeu-perubahan",
        icon: Coins,
    },
    {
        judul: "Kelembagaan",
        teks: "Verifikasi pengurus lembaga kemasyarakatan desa",
        path: "/kecamatan/kelembagaan",
        icon: Building2,
    },
    {
        judul: "Aparatur Desa",
        teks: "Pantau perangkat desa & BPD beserta statistiknya",
        path: "/kecamatan/aparatur-desa",
        icon: Users,
        lihat: true,
    },
    {
        judul: "BUMDes",
        teks: "Pantau profil, legalitas, dan kinerja BUMDes",
        path: "/kecamatan/bumdes",
        icon: Store,
        lihat: true,
    },
    {
        judul: "Pesan",
        teks: "Komunikasi dengan desa dan DPMD",
        path: "/kecamatan/pesan",
        icon: MessageCircle,
    },
];

/** Kerangka abu-abu selama angka dimuat. */
const Kerangka = ({ className = "" }) => (
    <span className={`inline-block animate-pulse rounded bg-slate-200 ${className}`} />
);

const Kartu = ({ children, className = "" }) => (
    <section className={`rounded-2xl border border-slate-200 bg-white ${className}`}>{children}</section>
);

const JudulKartu = ({ icon: Icon, children, aksi }) => (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            {Icon && <Icon className="h-4 w-4 text-slate-400" />}
            {children}
        </h2>
        {aksi}
    </div>
);

const KecamatanDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [loadingBankeu, setLoadingBankeu] = useState(true);
    const [loadingBumdes, setLoadingBumdes] = useState(true);
    const [stats, setStats] = useState({
        totalDesa: 0,
        totalPenduduk: 0,
        total_proposals: 0,
        pending: 0,
        verified: 0,
        rejected: 0,
        revision: 0,
    });
    const [bumdes, setBumdes] = useState([]);
    const [wilayah, setWilayah] = useState(null);

    useEffect(() => {
        const loadDesaData = async () => {
            try {
                const response = await api.get("/desas");
                const desaDiKecamatan = (response.data.data || []).filter(
                    (d) => d.kecamatan_id === user?.kecamatan_id
                );
                const totalPenduduk = desaDiKecamatan.reduce(
                    (sum, desa) => sum + (parseInt(desa.jumlah_penduduk) || 0),
                    0
                );
                setStats((prev) => ({ ...prev, totalDesa: desaDiKecamatan.length, totalPenduduk }));
            } catch (error) {
                console.error("Error loading desa data:", error);
            }
        };

        const loadBankeu = async () => {
            try {
                const response = await api.get("/kecamatan/bankeu/statistics");
                setStats((prev) => ({ ...prev, ...response.data.data }));
            } catch (error) {
                console.error("Error loading dashboard data:", error);
            } finally {
                setLoadingBankeu(false);
            }
        };

        const loadBumdes = async () => {
            try {
                const response = await api.get("/kecamatan/bumdes");
                setBumdes(response.data?.data || []);
                setWilayah(response.data?.wilayah || null);
            } catch (error) {
                console.error("Error loading bumdes data:", error);
            } finally {
                setLoadingBumdes(false);
            }
        };

        loadDesaData();
        loadBankeu();
        loadBumdes();
    }, [user?.kecamatan_id]);

    const namaKecamatan =
        user?.kecamatan_name || user?.kecamatan?.nama || wilayah?.kecamatan || "Kecamatan";
    const totalDesa = stats.totalDesa || wilayah?.jumlah_desa || 0;

    const ringkasBumdes = useMemo(() => {
        const total = bumdes.length;
        const aktif = bumdes.filter((b) => isAktif(b.status)).length;
        const berbadanHukum = bumdes.filter(
            (b) => tahapBadanHukum(b) === "Terbit Sertifikat Badan Hukum"
        ).length;
        return {
            total,
            aktif,
            tidakAktif: total - aktif,
            berbadanHukum,
            cakupan: totalDesa ? Math.round((total / totalDesa) * 100) : null,
        };
    }, [bumdes, totalDesa]);

    const totalProposal = stats.total_proposals || 0;
    const tanggal = new Date().toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    return (
        <div className="space-y-6">
            <PageHeader
                icon={MapPin}
                kicker="Dashboard Kecamatan"
                title={`Selamat datang, ${user?.name?.split(" ")[0] || "Admin"}`}
                subtitle={`Kecamatan ${namaKecamatan} · ${tanggal}`}
                stats={[
                    { label: "Desa", value: nf.format(totalDesa) },
                    { label: "Penduduk", value: nf.format(stats.totalPenduduk || 0) },
                    { label: "Proposal Bankeu", value: loadingBankeu ? "…" : nf.format(totalProposal) },
                    { label: "BUMDes", value: loadingBumdes ? "…" : nf.format(ringkasBumdes.total) },
                ]}
            />

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
                {/* ------------------------------------------ verifikasi -- */}
                <Kartu className="xl:col-span-3">
                    <JudulKartu
                        icon={ClipboardCheck}
                        aksi={
                            <button
                                onClick={() => navigate("/kecamatan/bankeu")}
                                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
                            >
                                Buka verifikasi <ArrowRight className="h-3.5 w-3.5" />
                            </button>
                        }
                    >
                        Verifikasi Bantuan Keuangan
                    </JudulKartu>

                    <div className="p-5">
                        {/* Yang perlu ditindaklanjuti — satu angka yang paling penting */}
                        <div
                            className={`flex items-center gap-4 rounded-xl p-4 ring-1 ${
                                stats.pending > 0
                                    ? "bg-amber-50 ring-amber-200/70"
                                    : "bg-emerald-50 ring-emerald-200/70"
                            }`}
                        >
                            <span
                                className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${
                                    stats.pending > 0 ? "bg-amber-400/20 text-amber-700" : "bg-emerald-500/15 text-emerald-700"
                                }`}
                            >
                                {stats.pending > 0 ? (
                                    <ClipboardCheck className="h-5 w-5" />
                                ) : (
                                    <CheckCircle2 className="h-5 w-5" />
                                )}
                            </span>
                            <div className="min-w-0 flex-1">
                                {loadingBankeu ? (
                                    <Kerangka className="h-5 w-48" />
                                ) : (
                                    <>
                                        <p className="text-sm font-semibold text-slate-900">
                                            {stats.pending > 0
                                                ? `${nf.format(stats.pending)} proposal menunggu verifikasi`
                                                : "Semua proposal sudah diproses"}
                                        </p>
                                        <p className="mt-0.5 text-xs text-slate-600">
                                            {stats.pending > 0
                                                ? "Periksa dan putuskan proposal yang masuk dari desa."
                                                : "Tidak ada proposal yang menunggu tindakan kecamatan."}
                                        </p>
                                    </>
                                )}
                            </div>
                            {stats.pending > 0 && (
                                <button
                                    onClick={() => navigate("/kecamatan/bankeu")}
                                    className="hidden flex-shrink-0 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 sm:block"
                                >
                                    Proses sekarang
                                </button>
                            )}
                        </div>

                        {/* Komposisi status — satu pita, jumlahnya genap 100% */}
                        <div className="mt-6">
                            <div className="flex items-baseline justify-between">
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                                    Komposisi status
                                </p>
                                <p className="text-xs text-slate-500">
                                    <span className="font-semibold tabular-nums text-slate-900">
                                        {nf.format(totalProposal)}
                                    </span>{" "}
                                    proposal
                                </p>
                            </div>
                            <div className="mt-2.5 flex h-2.5 overflow-hidden rounded-full bg-slate-100">
                                {!loadingBankeu &&
                                    totalProposal > 0 &&
                                    STATUS_VERIFIKASI.map((s) => {
                                        const n = stats[s.key] || 0;
                                        if (!n) return null;
                                        return (
                                            <div
                                                key={s.key}
                                                className={`${s.warna} transition-all duration-700`}
                                                style={{ width: `${(n / totalProposal) * 100}%` }}
                                                title={`${s.label}: ${nf.format(n)}`}
                                            />
                                        );
                                    })}
                            </div>
                            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                                {STATUS_VERIFIKASI.map((s) => {
                                    const n = stats[s.key] || 0;
                                    return (
                                        <div key={s.key} className="rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3">
                                            <dt className="flex items-center gap-1.5 text-xs text-slate-500">
                                                <span className={`h-2 w-2 rounded-full ${s.warna}`} />
                                                {s.label}
                                            </dt>
                                            <dd className="mt-1 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                                                {loadingBankeu ? <Kerangka className="h-6 w-8" /> : nf.format(n)}
                                            </dd>
                                            <dd className="text-[11px] tabular-nums text-slate-400">
                                                {!loadingBankeu && totalProposal
                                                    ? `${Math.round((n / totalProposal) * 100)}%`
                                                    : " "}
                                            </dd>
                                        </div>
                                    );
                                })}
                            </dl>
                        </div>
                    </div>
                </Kartu>

                {/* ---------------------------------------------- BUMDes -- */}
                <Kartu className="flex flex-col xl:col-span-2">
                    <JudulKartu
                        icon={Store}
                        aksi={
                            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
                                <Eye className="h-3 w-3" /> Lihat saja
                            </span>
                        }
                    >
                        BUMDes di Wilayah
                    </JudulKartu>

                    <div className="flex flex-1 flex-col p-5">
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <p className="text-4xl font-semibold tabular-nums tracking-tight text-slate-900">
                                    {loadingBumdes ? <Kerangka className="h-9 w-14" /> : nf.format(ringkasBumdes.total)}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                    BUMDes terdata
                                    {ringkasBumdes.cakupan !== null && !loadingBumdes && (
                                        <> · {ringkasBumdes.cakupan}% dari {nf.format(totalDesa)} desa</>
                                    )}
                                </p>
                            </div>
                        </div>

                        {/* Cakupan desa ber-BUMDes */}
                        <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
                            <div
                                className="h-full rounded-full bg-slate-900 transition-all duration-700"
                                style={{ width: `${Math.min(100, ringkasBumdes.cakupan || 0)}%` }}
                            />
                        </div>

                        <dl className="mt-5 divide-y divide-slate-100 text-sm">
                            {[
                                { label: "Aktif", nilai: ringkasBumdes.aktif, titik: "bg-emerald-500" },
                                { label: "Tidak aktif", nilai: ringkasBumdes.tidakAktif, titik: "bg-slate-300" },
                                {
                                    label: "Berbadan hukum",
                                    nilai: ringkasBumdes.berbadanHukum,
                                    icon: ScrollText,
                                },
                            ].map((b) => (
                                <div key={b.label} className="flex items-center justify-between py-2.5">
                                    <dt className="flex items-center gap-2 text-slate-600">
                                        {b.icon ? (
                                            <b.icon className="h-3.5 w-3.5 text-slate-400" />
                                        ) : (
                                            <span className={`h-2 w-2 rounded-full ${b.titik}`} />
                                        )}
                                        {b.label}
                                    </dt>
                                    <dd className="font-semibold tabular-nums text-slate-900">
                                        {loadingBumdes ? <Kerangka className="h-4 w-6" /> : nf.format(b.nilai)}
                                    </dd>
                                </div>
                            ))}
                        </dl>

                        <button
                            onClick={() => navigate("/kecamatan/bumdes")}
                            className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                        >
                            Lihat statistik & direktori
                            <ArrowRight className="h-4 w-4" />
                        </button>
                    </div>
                </Kartu>
            </div>

            {/* ---------------------------------------------- modul -- */}
            <div>
                <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Modul</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {MODUL.map((m) => {
                        const Icon = m.icon;
                        return (
                            <button
                                key={m.path}
                                onClick={() => navigate(m.path)}
                                className="group flex items-start gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/5"
                            >
                                <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 transition-colors group-hover:bg-slate-900 group-hover:text-white">
                                    <Icon className="h-[18px] w-[18px]" />
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                                        {m.judul}
                                        {m.lihat && (
                                            <span className="rounded bg-slate-100 px-1.5 py-px text-[10px] font-medium text-slate-500">
                                                Lihat
                                            </span>
                                        )}
                                    </span>
                                    <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{m.teks}</span>
                                </span>
                                <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-slate-300 transition-colors group-hover:text-slate-900" />
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default KecamatanDashboard;
