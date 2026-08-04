// Header gelap untuk halaman statistik Core Dashboard.
// Dominan hitam-navy; merah bata hanya muncul sebagai teks kicker dan sorot
// tipis di latar, tidak pernah sebagai bidang warna.
import React from 'react';

const PageHeader = ({
  icon: Icon,
  kicker = 'Core Dashboard',
  title,
  subtitle,
  stats = [], // [{ label, value }]
  actions,
}) => (
  <header className="relative overflow-hidden rounded-2xl bg-slate-950 px-5 py-6 sm:px-7 sm:py-7">
    {/* Grid halus + sorot merah bata tipis */}
    <div
      className="pointer-events-none absolute inset-0 opacity-[0.06]"
      style={{
        backgroundImage:
          'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }}
      aria-hidden="true"
    />
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        background:
          'radial-gradient(70% 120% at 92% 0%, rgba(185,28,28,0.22) 0%, transparent 62%)',
      }}
      aria-hidden="true"
    />

    <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex min-w-0 items-start gap-3.5">
        {Icon && (
          <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
            <Icon className="h-5 w-5 text-white" />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-400">
            {kicker}
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{subtitle}</p>
          )}
        </div>
      </div>

      {actions && <div className="flex flex-shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>

    {stats.length > 0 && (
      <dl className="relative mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/10 sm:grid-cols-4">
        {stats.map((item) => (
          <div key={item.label} className="bg-slate-950 px-4 py-3">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-400">
              {item.label}
            </dt>
            <dd className="mt-1 truncate text-base font-semibold tracking-tight text-white">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    )}
  </header>
);

export default PageHeader;
