// Template Kwitansi — mengacu pada sheet "Kwitansi" di File Pencairan ATK.xls
import DocumentSheet, { formatTanggalIndonesia, BULAN_INDO } from '../DocumentSheet';
import { terbilangKapital } from '../../../../utils/terbilang';

const fmtNum = (n) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n || 0);

const KwitansiTemplate = ({ pencairan }) => {
  const d = pencairan || {};
  const total = Number(d.total_nilai) || 0;
  const tglKwitansi = d.tgl_kwitansi ? formatTanggalIndonesia(d.tgl_kwitansi) : '';
  const bulan = d.tgl_kwitansi ? BULAN_INDO[new Date(d.tgl_kwitansi).getMonth()] : '…………';
  const tahun = d.tahun_anggaran || (d.tgl_kwitansi ? new Date(d.tgl_kwitansi).getFullYear() : '…');

  const dotLine = (w = '170pt') => ({
    display: 'inline-block',
    borderBottom: '1px dotted #666',
    minWidth: w,
    verticalAlign: 'bottom',
  });

  return (
    <DocumentSheet withKop={false} orientation="landscape">

      {/* ── Atas: KWITANSI/NOMOR (kiri) + KPA (kanan) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '12pt', marginTop: '20pt' }}>

        {/* Kiri */}
        <table style={{ borderCollapse: 'collapse', fontSize: '11.5pt' }}>
          <tbody>
            <tr>
              <td style={{ fontWeight: 'bold', padding: '3pt 0', whiteSpace: 'nowrap', width: '4cm' }}>
                KWITANSI
              </td>
              <td style={{ padding: '3pt 10pt 3pt 10pt', verticalAlign: 'bottom' }}>:</td>
              <td style={{ padding: '3pt 0' }}>
                <span style={dotLine('160pt')}>&nbsp;</span>
              </td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold', padding: '4pt 0 3pt', whiteSpace: 'nowrap' }}>
                NOMOR
              </td>
              <td style={{ padding: '4pt 10pt 3pt', verticalAlign: 'bottom' }}>:</td>
              <td style={{ padding: '4pt 0 3pt' }}>
                <span style={dotLine('160pt')}>{d.no_kwitansi || ''}</span>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Kanan: KPA */}
        <div style={{ textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: '11pt' }}>Kuasa Pengguna Anggaran</p>
          <div style={{ height: '40pt' }} />
          <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline', fontSize: '11.5pt' }}>
            {d.kpa?.name || '………………………………'}
          </p>
          <p style={{ margin: '2pt 0 0 0', fontSize: '11pt' }}>
            Nip. {d.kpa?.nip || '………………………'}
          </p>
        </div>
      </div>

      {/* ── Isian: Sudah diterima / Uang sebesar / Untuk pembayaran ── */}
      <table style={{ borderCollapse: 'collapse', width: '100%', marginTop: '12pt', fontSize: '11.5pt' }}>
        <tbody>
          <tr>
            <td style={{ padding: '4pt 0', verticalAlign: 'top', width: '5.5cm', whiteSpace: 'nowrap' }}>
              Sudah diterima dari
            </td>
            <td style={{ padding: '4pt 10pt', verticalAlign: 'top', width: '12pt' }}>:</td>
            <td style={{ padding: '4pt 0' }}>
              <strong>Pemerintah Kabupaten Bogor</strong>
            </td>
          </tr>
          <tr>
            <td style={{ padding: '4pt 0', verticalAlign: 'top' }}>Uang sebesar</td>
            <td style={{ padding: '4pt 10pt', verticalAlign: 'top' }}>:</td>
            <td style={{ padding: '4pt 0' }}>
              <strong># {total > 0 ? terbilangKapital(total) : '—'} #</strong>
            </td>
          </tr>
          <tr>
            <td style={{ padding: '4pt 0', verticalAlign: 'top' }}>Untuk pembayaran</td>
            <td style={{ padding: '4pt 10pt', verticalAlign: 'top' }}>:</td>
            <td style={{ padding: '4pt 0', lineHeight: 1.5 }}>
              {d.uraian_kegiatan || '—'}<br />
              Bulan {bulan} {tahun}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── TTD 3 kolom ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        gap: '8pt', marginTop: '28pt', fontSize: '11pt', textAlign: 'center',
      }}>
        {/* PPTK */}
        <div>
          <p style={{ margin: 0 }}>Mengetahui/menyetujui,</p>
          <p style={{ margin: 0 }}>Pejabat Pelaksana Teknis Kegiatan</p>
          <div style={{ height: '55pt' }} />
          <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>
            {d.pptk?.name || '………………………………'}
          </p>
          <p style={{ margin: '2pt 0 0 0' }}>NIP. {d.pptk?.nip || '………………'}</p>
        </div>

        {/* Bendahara */}
        <div>
          <p style={{ margin: 0 }}>Lunas</p>
          <p style={{ margin: 0 }}>Bendahara Pengeluaran Pembantu</p>
          <div style={{ height: '55pt' }} />
          <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>
            {d.bendahara?.name || '………………………………'}
          </p>
          <p style={{ margin: '2pt 0 0 0' }}>NIP. {d.bendahara?.nip || '………………'}</p>
        </div>

        {/* Yang menerima */}
        <div>
          <p style={{ margin: 0 }}>Cibinong, {tglKwitansi || '………………………'}</p>
          <p style={{ margin: 0 }}>Yang menerima</p>
          <div style={{ height: '55pt' }} />
          <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>
            {d.penyedia?.nama_direktur || '………………………………'}
          </p>
          <p style={{ margin: '2pt 0 0 0', fontStyle: 'italic', fontSize: '10.5pt' }}>
            {d.penyedia?.jabatan_direktur || 'Direktur'} {d.penyedia?.nama || ''}
          </p>
        </div>
      </div>

      {/* ── Jumlah box — border atas & bawah double ── */}
      <table style={{ marginTop: '20pt', fontSize: '11.5pt', borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <td style={{ borderTop: '3px double #000', borderBottom: '3px double #000', padding: '4pt 14pt', fontWeight: 'bold' }}>
              Jumlah
            </td>
            <td style={{ borderTop: '3px double #000', borderBottom: '3px double #000', padding: '4pt 14pt' }}>
              Rp.
            </td>
            <td style={{ borderTop: '3px double #000', borderBottom: '3px double #000', padding: '4pt 16pt', fontWeight: 'bold', minWidth: '5cm', textAlign: 'right' }}>
              {fmtNum(total)},-
            </td>
          </tr>
        </tbody>
      </table>

    </DocumentSheet>
  );
};

export default KwitansiTemplate;
