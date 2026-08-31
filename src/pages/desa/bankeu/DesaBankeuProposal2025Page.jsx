import React from 'react';
import DesaBankeuLpjPage from './DesaBankeuLpjPage';

/**
 * Proposal Bantuan Keuangan TA 2025 — sisi desa.
 *
 * Memakai formulir unggah yang sama dengan LPJ, hanya tanpa status verifikasi:
 * berkas yang diunggah desa langsung masuk ke DPMD, tidak lewat kecamatan
 * maupun dinas. Hak aksesnya pun menumpang izin "Bantuan Keuangan" yang sudah
 * dipegang akun desa, jadi tidak ada akun atau izin baru yang perlu diatur.
 */
const DesaBankeuProposal2025Page = ({ tahun = 2025 }) => (
  <DesaBankeuLpjPage
    tahun={tahun}
    programName="Bantuan Keuangan"
    endpointBase="/desa/bankeu-proposal-2025"
    storageBase="/storage/uploads/bankeu_proposal_2025"
    referenceType="bankeu_proposal_2025"
    chatTitle="Chat Proposal Bantuan Keuangan"
    jenisDokumen="Proposal"
    pakaiVerifikasi={false}
    judul={`Proposal Bantuan Keuangan ${tahun}`}
    deskripsi={`Unggah berkas proposal Bantuan Keuangan Tahun Anggaran ${tahun}.`}
    infoTambahan={
      <>
        Berkas proposal langsung diterima DPMD tanpa verifikasi kecamatan maupun dinas,
        jadi tidak ada status menunggu persetujuan. Pastikan berkas yang diunggah sudah benar —
        Anda tetap bisa menghapus dan mengunggah ulang bila keliru.
      </>
    }
  />
);

export default DesaBankeuProposal2025Page;
