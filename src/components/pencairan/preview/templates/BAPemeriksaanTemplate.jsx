import DocumentSheet from '../DocumentSheet';
import {
  BLANK,
  MiniSignature,
  PemeriksaStack,
  dateParts,
  nomorBaPemeriksaan,
  nomorPesanan,
  safe,
  tanggal,
} from './templateHelpers';

const BAPemeriksaanTemplate = ({ pencairan }) => {
  const d = pencairan || {};
  const parts = dateParts(d.tgl_ba_pemeriksaan);

  return (
    <DocumentSheet withKop modelTag="Model : Peng 2">
      <div style={{ textAlign: 'center', marginTop: '8pt' }}>
        <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline', fontSize: '13pt' }}>BERITA ACARA</p>
        <p style={{ margin: 0, fontWeight: 'bold' }}>PEMERIKSAAN / PENERIMAAN HASIL PEKERJAAN BARANG/JASA</p>
        <p style={{ margin: '4pt 0 0 0' }}>Nomor : {nomorBaPemeriksaan(d)}</p>
      </div>

      <p style={{ marginTop: '18pt', textAlign: 'justify' }}>
        Pada hari ini {parts.hari} tanggal {parts.tanggal} bulan {parts.bulan} tahun {parts.tahun},
        kami yang bertanda tangan di bawah ini:
      </p>

      <div style={{ margin: '8pt 0 12pt 24pt' }}>
        {[0, 1, 2].map((idx) => {
          const user = d.pemeriksa?.[idx]?.user || {};
          return (
            <div key={idx} style={{ marginBottom: '7pt' }}>
              <p style={{ margin: 0 }}>{idx + 1}. Nama&nbsp;&nbsp;: <strong>{safe(user.name)}</strong></p>
              <p style={{ margin: 0, paddingLeft: '18pt' }}>NIP&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {safe(user.nip)}</p>
            </div>
          );
        })}
      </div>

      <p style={{ textAlign: 'justify', margin: 0 }}>
        Berdasarkan Surat Perintah Tugas dari Pejabat Pembuat Komitmen pada Sekretariat Dinas Pemberdayaan
        Masyarakat dan Desa Nomor : {safe(d.no_surat_perintah_tugas)} tanggal {tanggal(d.tgl_surat_perintah_tugas)},
        kami selaku Pemeriksa Hasil Pekerjaan Barang/Jasa dengan teliti telah memeriksa hasil pekerjaan
        barang/jasa terhadap barang-barang yang diadakan sebagaimana daftar terlampir yang diserahkan oleh{' '}
        <strong>{safe(d.penyedia?.nama)}</strong> berdasarkan Surat Pesanan Nomor {nomorPesanan(d)} tanggal{' '}
        {tanggal(d.tgl_pesanan)}, menyimpulkan sebagai berikut:
      </p>

      <div style={{ margin: '12pt 0 12pt 26pt' }}>
        <p style={{ margin: '0 0 3pt 0' }}>a. Terdapat baik sesuai Pesanan/SPK/Kontrak.</p>
        <p style={{ margin: 0 }}>b. Kurang/Tidak baik (daftar terlampir).</p>
      </div>

      <p style={{ textAlign: 'justify', margin: 0 }}>
        Pekerjaan yang terdapat baik kami beri tanda (v) yang selanjutnya akan diserahkan kepada Bendaharawan
        Barang, sedang yang tidak baik kami beri tanda (x).
      </p>

      <p style={{ textAlign: 'justify', marginTop: '12pt' }}>
        Demikian Berita Acara dibuat dalam rangkap 6 (enam) untuk dapat dipergunakan sebagaimana mestinya.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '42% 1fr', gap: '24pt', marginTop: '18pt' }}>
        <MiniSignature
          title="Penyedia Barang/Jasa"
          sub={d.penyedia?.nama}
          name={d.penyedia?.nama_direktur}
          role={d.penyedia?.jabatan_direktur || 'Direktur'}
          height="52pt"
        />
        <div>
          <p style={{ margin: '0 0 6pt 0', fontWeight: 'bold' }}>PEMERIKSA HASIL PEKERJAAN BARANG/JASA :</p>
          <PemeriksaStack pencairan={d} />
        </div>
      </div>

      <div style={{ marginTop: '12pt', color: '#fff', fontSize: '1pt' }}>{BLANK}</div>
    </DocumentSheet>
  );
};

export default BAPemeriksaanTemplate;
