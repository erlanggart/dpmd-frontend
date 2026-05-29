import DocumentSheet, { formatRupiah } from '../DocumentSheet';
import {
  MiniSignature,
  dateParts,
  nomorBaPemeriksaan,
  nomorBast,
  nomorPesanan,
  safe,
  tanggal,
  terbilangRupiah,
} from './templateHelpers';

const BastTemplate = ({ pencairan }) => {
  const d = pencairan || {};
  const total = Number(d.total_nilai) || 0;
  const parts = dateParts(d.tgl_bast);

  const jenisbelanja = d.jenis_belanja
    || 'Kegiatan Kantor - Alat Tulis Kantor';

  return (
    <DocumentSheet withKop>
      <div style={{ textAlign: 'center', marginTop: '10pt' }}>
        <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>
          BERITA ACARA SERAH TERIMA PEKERJAAN BARANG
        </p>
        <p style={{ margin: '3pt 0 0 0' }}>
          Nomor : {nomorBast(d)}
        </p>
      </div>

      {/* ── Pembuka — rujukan Perpres ── */}
      <p style={{ marginTop: '16pt', textAlign: 'justify', lineHeight: 1.6 }}>
        Menunjuk pada Peraturan Presiden Nomor 46 Tahun 2025 tentang Perubahan kedua atas
        Peraturan Presiden Nomor 16 Tahun 2018 Tentang Pengadaan Barang/Jasa Pemerintah
        pasal 11 ayat (1) huruf m dan Pasal 58 ayat (1) dan ayat (2), Pada Hari ini{' '}
        {parts.hari}&nbsp;&nbsp;Tanggal&nbsp;{parts.tanggal}&nbsp;Bulan&nbsp;
        {parts.bulan}&nbsp;Tahun {d.tahun_anggaran || new Date().getFullYear()},
        yang bertanda tangan di bawah ini :
      </p>

      {/* ── Pihak 1: PPK ── */}
      <div style={{ marginTop: '10pt' }}>

        <div style={{ display: 'flex', gap: '6pt', lineHeight: 1.6, textAlign: 'justify' }}>
          <span style={{ flexShrink: 0, minWidth: '18pt' }}>1.</span>
          <span style={{ flex: 1 }}>
            Pejabat Pembuat Komitmen (PPK) sesuai dengan Surat Keputusan Kepala Dinas
            Pemberdayaan Masyarakat dan Desa Nomor : <strong>{safe(d.no_sk_kadis_ppk)}</strong>{' '}
            tanggal {tanggal(d.tgl_sk_kadis_ppk)} Tentang Penunjukan Pejabat Pembuat
            Komitmen pada Dinas Pemberdayaan Masyarakat dan Desa Tahun {d.tahun_anggaran || ''}.
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

        {/* ── Pihak 2: Penyedia ── */}
        <div style={{ display: 'flex', gap: '6pt', lineHeight: 1.6, textAlign: 'justify' }}>
          <span style={{ flexShrink: 0, minWidth: '18pt' }}>2.</span>
          <span style={{ flex: 1 }}>
            Penyedia Barang dan Jasa sesuai dengan Surat Pesanan Nomor : {nomorPesanan(d)}.
          </span>
        </div>
        <table style={{ margin: '6pt 0 12pt 24pt', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '2pt 0', width: '5cm' }}>Nama</td>
              <td style={{ padding: '2pt 8pt' }}>:</td>
              <td style={{ padding: '2pt 0' }}><strong>{safe(d.penyedia?.nama_direktur)}</strong></td>
            </tr>
            <tr>
              <td style={{ padding: '2pt 0' }}>Jabatan</td>
              <td style={{ padding: '2pt 8pt' }}>:</td>
              <td style={{ padding: '2pt 0' }}>{d.penyedia?.jabatan_direktur || 'Direktur'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Paragraf hasil pemeriksaan ── */}
      <p style={{ textAlign: 'justify', margin: 0, lineHeight: 1.6 }}>
        Berdasarkan hasil Berita Acara Pemeriksaan/Penerimaan Hasil pekerjaan/barang
        Nomor : {nomorBaPemeriksaan(d)}{' '}
        <strong>{jenisbelanja}</strong> Kegiatan <strong>{safe(d.uraian_kegiatan)}</strong>{' '}
        sebesar <strong>{formatRupiah(total)},-</strong>{' '}
        ({terbilangRupiah(total)}) pada Dinas Pemberdayaan Masyarakat dan Desa Kabupaten
        Bogor dengan hasil :{' '}
        <strong>DITERIMA/TIDAK DITERIMA<sup>*)</sup></strong>{' '}
        sesuai dengan ketentuan yang termuat dalam Surat Pesanan dengan Penyedia Jasa.
        Dokumen Berita Acara Penyerahan Pekerjaan/Barang ini selanjutnya diserahkan ke
        Kuasa Pengguna Anggaran untuk diverifikasi administrasi oleh Pejabat Penatausahaan
        Keuangan (PPK-SKPD).
      </p>

      <p style={{ marginTop: '10pt', lineHeight: 1.6 }}>
        Berita Acara ini dilampiri dengan Lampiran Berita Acara Pemeriksaan dan Penerimaan Barang.
      </p>
      <p style={{ marginTop: '6pt', lineHeight: 1.6 }}>
        Demikian Berita Acara Penyerahan ini dibuat dengan penuh tanggung jawab.
      </p>

      {/* ── TTD ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24pt', marginTop: '24pt' }}>
        <MiniSignature
          title="Pihak Ketiga"
          sub={d.penyedia?.nama}
          name={d.penyedia?.nama_direktur}
          role={d.penyedia?.jabatan_direktur || 'Direktur'}
          height="58pt"
        />
        <MiniSignature
          title="Pejabat Pembuat Komitmen (PPK)"
          name={d.ppk?.name}
          nip={d.ppk?.nip}
          height="58pt"
        />
      </div>
    </DocumentSheet>
  );
};

export default BastTemplate;
