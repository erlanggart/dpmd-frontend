// Template Faktur — mengacu pada sheet "Faktur" di File Pencairan ATK.xls
import DocumentSheet, { formatTanggalIndonesia } from '../DocumentSheet';
import { terbilangKapital } from '../../../../utils/terbilang';

// Angka tanpa prefix "Rp" — (Rp) sudah ada di header tabel
const fmtNum = (n) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n || 0);

const B = '1px solid #000';
const th = (extra = {}) => ({
  border: B, padding: '3pt 4pt', textAlign: 'center',
  fontWeight: 'bold', fontSize: '10pt', verticalAlign: 'middle', ...extra,
});
const td = (extra = {}) => ({
  border: B, padding: '3pt 4pt', verticalAlign: 'top', fontSize: '10pt', ...extra,
});

const FakturTemplate = ({ pencairan }) => {
  const d = pencairan || {};
  const items = d.items || [];
  const total = Number(d.total_nilai) || 0;
  const tgl = d.tgl_faktur ? formatTanggalIndonesia(d.tgl_faktur) : '';

  const jenisbelanja = d.jenis_belanja
    || 'Belanja Alat/Bahan untuk Kegiatan Kantor - Alat Tulis Kantor';

  return (
    <DocumentSheet withKop={false} orientation="landscape">

      {/* ── Space atas untuk kop surat penyedia (saat print) ── */}
      <div style={{ height: '3.5cm' }} />

      {/* ── Tanggal + Kepada Yth. — rata kanan ── */}
      <div style={{ marginLeft: 'auto', width: '42%', fontSize: '11pt', lineHeight: 1.5 }}>
        <p style={{ margin: 0 }}>Bogor,{'  '}{tgl || '………………………………'}</p>
        <p style={{ margin: '8pt 0 0 0' }}>Kepada Yth.</p>
        <p style={{ margin: 0, fontWeight: 'bold' }}>PEMERINTAH DAERAH</p>
        <p style={{ margin: 0, fontWeight: 'bold' }}>KABUPATEN BOGOR</p>
        <p style={{ margin: '4pt 0 0 0' }}>di –</p>
        <p style={{ margin: 0, paddingLeft: '24pt', fontWeight: 'bold', textDecoration: 'underline' }}>
          CIBINONG
        </p>
      </div>

      {/* ── FAKTUR NO. : ── */}
      <div style={{ marginTop: '16pt', marginBottom: '10pt', fontSize: '11pt' }}>
        <span style={{ fontWeight: 'bold', fontStyle: 'italic' }}>FAKTUR NO. :</span>
        {'  '}
        <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '80pt' }}>
          {d.no_faktur || ''}
        </span>
      </div>

      {/* ── Tabel items ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10pt' }}>
        <colgroup>
          <col style={{ width: '4%' }} />   {/* No */}
          <col style={{ width: '12%' }} />  {/* Banyaknya */}
          <col style={{ width: '24%' }} />  {/* Jenis Barang/Jasa */}
          <col style={{ width: '28%' }} />  {/* Uraian Pekerjaan */}
          <col style={{ width: '14%' }} />  {/* Harga Satuan */}
          <col style={{ width: '7%' }} />   {/* PPN */}
          <col style={{ width: '11%' }} />  {/* Jumlah */}
        </colgroup>

        <thead>
          <tr>
            <th style={th()}>No</th>
            <th style={th()}>Banyaknya</th>
            <th style={th()}>Jenis Barang/Jasa</th>
            <th style={th()}>Uraian Pekerjaan</th>
            <th style={th()}>
              Harga Satuan<br />(Rp)
            </th>
            <th style={th()}>
              PPN<br />(Rp)
            </th>
            <th style={th()}>
              Jumlah<br />(Rp)
            </th>
          </tr>
        </thead>

        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} style={td({ textAlign: 'center', color: '#999' })}>
                — belum ada item —
              </td>
            </tr>
          ) : (
            items.map((it, idx) => (
              <tr key={it.id || idx}>
                <td style={td({ textAlign: 'center' })}>{idx + 1}</td>
                <td style={td({ textAlign: 'center' })}>
                  {Number(it.qty)} {it.satuan}
                </td>
                {/* Jenis Barang/Jasa — rowSpan seluruh baris item */}
                {idx === 0 && (
                  <td
                    rowSpan={items.length}
                    style={td({ fontWeight: 'bold', verticalAlign: 'top' })}
                  >
                    {jenisbelanja}
                  </td>
                )}
                <td style={td()}>{it.nama_barang}</td>
                <td style={td({ textAlign: 'right' })}>{fmtNum(it.harga_satuan)}</td>
                <td style={td({ textAlign: 'right' })}>
                  {Number(it.ppn) > 0 ? fmtNum(it.ppn) : ''}
                </td>
                <td style={td({ textAlign: 'right' })}>{fmtNum(it.total)}</td>
              </tr>
            ))
          )}

          {/* JUMLAH */}
          <tr>
            <td colSpan={5} style={td({ textAlign: 'right', fontWeight: 'bold', border: B })}>
              JUMLAH
            </td>
            <td style={td()} />
            <td style={td({ textAlign: 'right', fontWeight: 'bold' })}>
              {fmtNum(total)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Terbilang ── */}
      <p style={{ marginTop: '4pt', marginBottom: '20pt', fontSize: '10.5pt' }}>
        <strong>Terbilang :</strong>{'  '}
        <em>( {total > 0 ? terbilangKapital(total) : '—'} )</em>
      </p>

      {/* ── TTD: HORMAT KAMI — rata kanan ── */}
      <div style={{ textAlign: 'right', marginTop: '8pt' }}>
        <div style={{ display: 'inline-block', textAlign: 'center', minWidth: '38%' }}>
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '11pt' }}>HORMAT KAMI,</p>
          <p style={{ margin: '2pt 0 0 0', fontWeight: 'bold', fontSize: '11pt' }}>
            {d.penyedia?.nama || '—'}
          </p>
          <div style={{ height: '60pt' }} />
          <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline', fontSize: '11pt' }}>
            {d.penyedia?.nama_direktur || '………………………………'}
          </p>
          <p style={{ margin: '2pt 0 0 0', fontSize: '10.5pt' }}>
            {d.penyedia?.jabatan_direktur || 'Direktur'}
          </p>
        </div>
      </div>

    </DocumentSheet>
  );
};

export default FakturTemplate;
