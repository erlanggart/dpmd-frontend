import DocumentSheet, { formatRupiah } from '../DocumentSheet';
import {
  MiniSignature,
  formatQty,
  itemTotal,
  nomorBast,
  safe,
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

const LampiranBastTemplate = ({ pencairan }) => {
  const d = pencairan || {};
  const items = d.items || [];
  const total = Number(d.total_nilai) || 0;

  return (
    <DocumentSheet withKop>
      <div style={{ textAlign: 'center', marginTop: '8pt' }}>
        <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline' }}>
          LAMPIRAN BERITA ACARA SERAH TERIMA BARANG
        </p>
        <p style={{ margin: 0, fontWeight: 'bold' }}>(KHUSUS POLA GANTI UANG)</p>
        <p style={{ margin: '4pt 0 0 0' }}>Nomor : {nomorBast(d)}</p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '14pt', fontSize: '9.8pt' }}>
        <thead>
          <tr>
            <th style={th} rowSpan={2}>No.</th>
            <th style={th} rowSpan={2}>Jenis Barang</th>
            <th style={th} colSpan={2}>Banyaknya</th>
            <th style={th} rowSpan={2}>Harga Satuan<br />(Rp)</th>
            <th style={th} rowSpan={2}>PPN<br />(Rp)</th>
            <th style={th} rowSpan={2}>Jumlah<br />(Rp)</th>
            <th style={th} rowSpan={2}>Keterangan</th>
          </tr>
          <tr>
            <th style={th}>Jumlah</th>
            <th style={th}>Satuan</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={8} style={{ ...td, textAlign: 'center', color: '#777' }}>- belum ada item -</td>
            </tr>
          ) : items.map((item, idx) => (
            <tr key={item.id || idx}>
              <td style={{ ...td, textAlign: 'center' }}>{idx + 1}</td>
              <td style={td}>{item.nama_barang}</td>
              <td style={{ ...td, textAlign: 'center' }}>{formatQty(item.qty)}</td>
              <td style={{ ...td, textAlign: 'center' }}>{item.satuan}</td>
              <td style={{ ...td, textAlign: 'right' }}>{formatRupiah(item.harga_satuan)}</td>
              <td style={{ ...td, textAlign: 'right' }}>{Number(item.ppn) > 0 ? formatRupiah(item.ppn) : '-'}</td>
              <td style={{ ...td, textAlign: 'right' }}>{formatRupiah(itemTotal(item))}</td>
              <td style={{ ...td, textAlign: 'center' }}>Baik</td>
            </tr>
          ))}
          <tr>
            <td colSpan={6} style={{ ...td, textAlign: 'right', fontWeight: 'bold' }}>JUMLAH</td>
            <td style={{ ...td, textAlign: 'right', fontWeight: 'bold' }}>{formatRupiah(total)}</td>
            <td style={td} />
          </tr>
        </tbody>
      </table>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24pt', marginTop: '26pt' }}>
        <MiniSignature
          title="Pihak Ketiga"
          sub={safe(d.penyedia?.nama, '')}
          name={d.penyedia?.nama_direktur}
          role={d.penyedia?.jabatan_direktur || 'Direktur'}
          height="56pt"
        />
        <MiniSignature
          title="Pejabat Pembuat Komitmen (PPK)"
          name={d.ppk?.name}
          nip={d.ppk?.nip}
          height="56pt"
        />
      </div>
    </DocumentSheet>
  );
};

export default LampiranBastTemplate;
