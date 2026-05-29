import DocumentSheet, { formatRupiah } from '../DocumentSheet';
import {
  MiniSignature,
  dateParts,
  nomorBasthp,
  safe,
  tanggal,
  terbilangRupiah,
} from './templateHelpers';

const BasthpTemplate = ({ pencairan }) => {
  const d = pencairan || {};
  const total = Number(d.total_nilai) || 0;
  const parts = dateParts(d.tgl_basthp);

  return (
    <DocumentSheet withKop>
      <div style={{ textAlign: 'center', marginTop: '10pt' }}>
        <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>
          BERITA ACARA PENYERAHAN PEKERJAAN BARANG/JASA
        </p>
        <p style={{ margin: '3pt 0 0 0' }}>
          Nomor : {nomorBasthp(d)}
        </p>
      </div>

      {/* ── Pembuka — rujukan Perpres + tanggal ── */}
      <p style={{ marginTop: '16pt', textAlign: 'justify', lineHeight: 1.6 }}>
        Menunjuk pada Peraturan Presiden Nomor : 46 Tahun 2025 tentang Perubahan Ke Satu
        atas Peraturan Presiden Nomor 16 Tahun 2018 Tentang Pengadaan Barang/Jasa Pemerintah
        pasal 15 ayat (1) dan pasal 58 ayat (2) Pada Hari ini {parts.hari} Tanggal{' '}
        {parts.tanggal} Bulan {parts.bulan} Tahun {parts.tahun} Kami yang bertandatangan
        di bawah ini :
      </p>

      {/* ── Pihak 1: KPA ── */}
      <div style={{ marginTop: '12pt' }}>

        <div style={{ display: 'flex', gap: '6pt', lineHeight: 1.6, textAlign: 'justify' }}>
          <span style={{ flexShrink: 0, minWidth: '18pt' }}>1.</span>
          <span style={{ flex: 1 }}>
            Kuasa Pengguna Anggaran sesuai dengan Surat Keputusan Bupati Bogor
            Nomor : <strong>{safe(d.no_sk_bupati_kpa)}</strong> tanggal{' '}
            {tanggal(d.tgl_sk_bupati_kpa)} Tentang Penunjukan Pejabat Pengguna Anggaran
            dan Pejabat Kuasa Pengguna Anggaran pada Dinas Pemberdayaan Masyarakat dan
            Desa Kabupaten Bogor
          </span>
        </div>
        <table style={{ margin: '6pt 0 12pt 24pt', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '2pt 0', width: '5cm' }}>Nama</td>
              <td style={{ padding: '2pt 8pt' }}>:</td>
              <td style={{ padding: '2pt 0' }}><strong>{safe(d.kpa?.name)}</strong></td>
            </tr>
            <tr>
              <td style={{ padding: '2pt 0' }}>Jabatan</td>
              <td style={{ padding: '2pt 8pt' }}>:</td>
              <td style={{ padding: '2pt 0' }}>Kuasa Pengguna Anggaran</td>
            </tr>
          </tbody>
        </table>

        {/* ── Pihak 2: PPK ── */}
        <div style={{ display: 'flex', gap: '6pt', lineHeight: 1.6, textAlign: 'justify' }}>
          <span style={{ flexShrink: 0, minWidth: '18pt' }}>2.</span>
          <span style={{ flex: 1 }}>
            Pejabat Pembuat Komitmen (PPK) sesuai dengan Surat Keputusan Kepala Dinas
            Pemberdayaan Masyarakat dan Desa Nomor :{' '}
            <strong>{safe(d.no_sk_kadis_ppk)}</strong> tanggal{' '}
            {tanggal(d.tgl_sk_kadis_ppk)} Tentang Penunjukan Pejabat Pembuat Komitmen
            pada Dinas Pemberdayaan Masyarakat dan Desa Tahun {d.tahun_anggaran || ''}
          </span>
        </div>
        <table style={{ margin: '6pt 0 12pt 24pt', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '2pt 0', width: '5cm' }}>Nama</td>
              <td style={{ padding: '2pt 8pt' }}>:</td>
              <td style={{ padding: '2pt 0' }}><strong>{safe(d.ppk?.name)}</strong></td>
            </tr>
            <tr>
              <td style={{ padding: '2pt 0' }}>Jabatan</td>
              <td style={{ padding: '2pt 8pt' }}>:</td>
              <td style={{ padding: '2pt 0' }}>Pejabat Pembuat Komitmen (PPK)</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Paragraf penyerahan ── */}
      <p style={{ textAlign: 'justify', margin: 0, lineHeight: 1.6 }}>
        Pejabat Pembuat Komitmen Menyerahkan Barang/Jasa untuk kegiatan{' '}
        <strong>{safe(d.uraian_kegiatan)}</strong> Sebesar{' '}
        <strong>{formatRupiah(total)},-</strong> ({terbilangRupiah(total)}) Pada Dinas
        Pemberdayaan Masyarakat dan Desa ke Kuasa Pengguna Anggaran yang diperiksa oleh
        Pejabat Pemeriksa Dokumen Administrasi Pengadaan Barang dan Jasa.
      </p>

      <p style={{ marginTop: '12pt', lineHeight: 1.6 }}>
        Demikian Berita Acara Penyerahan ini dibuat dengan penuh tanggung jawab
      </p>

      {/* ── TTD: KPA (kiri) + PPK (kanan) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24pt', marginTop: '24pt' }}>
        <MiniSignature
          title="Kuasa Pengguna Anggaran"
          name={d.kpa?.name}
          nip={d.kpa?.nip}
          height="60pt"
        />
        <MiniSignature
          title="Pejabat Pembuat Komitmen"
          name={d.ppk?.name}
          nip={d.ppk?.nip}
          height="60pt"
        />
      </div>
    </DocumentSheet>
  );
};

export default BasthpTemplate;
