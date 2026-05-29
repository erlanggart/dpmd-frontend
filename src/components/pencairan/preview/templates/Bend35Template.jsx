import DocumentSheet from '../DocumentSheet';
import {
  MiniSignature,
  formatQty,
  safe,
  tanggal,
  terbilangAngka,
} from './templateHelpers';

const th = {
  border: '1px solid #000',
  padding: '3pt',
  textAlign: 'center',
  fontWeight: 'bold',
};

const td = {
  border: '1px solid #000',
  padding: '3pt',
  verticalAlign: 'top',
};

const Bend35Template = ({ pencairan }) => {
  const d = pencairan || {};
  const items = d.items || [];

  return (
    <DocumentSheet withKop={false} modelTag="Model : Bend 35">
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>PEMERINTAH KABUPATEN BOGOR</p>
        <p style={{ margin: 0, fontWeight: 'bold' }}>PERINTAH PENERIMAAN / PENGELUARAN</p>
        <p style={{ margin: 0 }}>DAERAH / UNIT DPMD</p>
        <p style={{ margin: '14pt 0 0 0', fontWeight: 'bold', textDecoration: 'underline' }}>
          PERINTAH PENERIMAAN / PENGELUARAN
        </p>
      </div>

      <div style={{ marginTop: '16pt', lineHeight: 1.5 }}>
        <p style={{ margin: 0 }}>Kepada Bendaharawan Umum Barang pada Gudang : DPMD Kab. Bogor</p>
        <p style={{ margin: 0 }}>
          diperintah untuk menerima / mengeluarkan dari / kepada : {safe(d.penyedia?.nama)}
        </p>
        <p style={{ margin: 0 }}>barang sebagai berikut :</p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10pt', fontSize: '10.3pt' }}>
        <thead>
          <tr>
            <th style={th} rowSpan={2}>Nomor</th>
            <th style={th} rowSpan={2}>Nama dan Kode Barang</th>
            <th style={th} colSpan={3}>Banyaknya</th>
            <th style={th} rowSpan={2}>Ket</th>
          </tr>
          <tr>
            <th style={th}>Satuan</th>
            <th style={th}>Angka</th>
            <th style={th}>Huruf</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={6} style={{ ...td, textAlign: 'center', color: '#777' }}>- belum ada item -</td></tr>
          ) : items.map((item, idx) => (
            <tr key={item.id || idx}>
              <td style={{ ...td, textAlign: 'center' }}>{idx + 1}</td>
              <td style={td}>{item.nama_barang}</td>
              <td style={{ ...td, textAlign: 'center' }}>{item.satuan}</td>
              <td style={{ ...td, textAlign: 'center' }}>{formatQty(item.qty)}</td>
              <td style={{ ...td, textAlign: 'center' }}>{terbilangAngka(item.qty)}</td>
              <td style={td} />
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '22pt', textAlign: 'right' }}>
        <div style={{ display: 'inline-block', minWidth: '8cm', textAlign: 'center' }}>
          <p style={{ margin: 0 }}>Cibinong, {tanggal(d.tgl_basthp)}</p>
          <MiniSignature
            title="A.n. Ordonatur/Kuasa Pengguna Barang"
            sub="Atasan Langsung Pengurus Barang"
            name={d.atasan_pengurus_barang?.name}
            nip={d.atasan_pengurus_barang?.nip}
            height="58pt"
          />
        </div>
      </div>
    </DocumentSheet>
  );
};

export default Bend35Template;
