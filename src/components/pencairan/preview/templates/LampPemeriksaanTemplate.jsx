import DocumentSheet from '../DocumentSheet';
import {
  MiniSignature,
  PemeriksaStack,
  nomorBaPemeriksaan,
  safe,
  tanggal,
} from './templateHelpers';

const B = '1px solid #000';
const th = (extra = {}) => ({
  border: B, padding: '3pt 4pt', textAlign: 'center', fontWeight: 'bold', fontSize: '10pt', ...extra,
});
const td = (extra = {}) => ({
  border: B, padding: '3pt 4pt', fontSize: '10pt', verticalAlign: 'top', ...extra,
});

// Baris kosong untuk mengisi ruang tabel agar tampak seperti form
const EMPTY_ROWS = 5;

const LampPemeriksaanTemplate = ({ pencairan }) => {
  const d = pencairan || {};
  const items = d.items || [];

  return (
    <DocumentSheet withKop modelTag="Lamp. Model : Peng 2">
      <div style={{ textAlign: 'center', marginTop: '8pt' }}>
        <p style={{ margin: 0, fontWeight: 'bold' }}>
          LAMPIRAN BERITA ACARA PEMERIKSAAN/PENERIMAAN HASIL PEKERJAAN BARANG/JASA
        </p>
        <p style={{ margin: '4pt 0 0 0' }}>Nomor : {nomorBaPemeriksaan(d)}</p>
        <p style={{ margin: 0 }}>Tanggal : {tanggal(d.tgl_ba_pemeriksaan)}</p>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '14pt', fontSize: '10pt' }}>
        <colgroup>
          <col style={{ width: '5%' }} />   {/* No */}
          <col style={{ width: '18%' }} />  {/* Uraian Pekerjaan / Barang */}
          <col style={{ width: '35%' }} />  {/* Spesifikasi */}
          <col style={{ width: '8%' }} />   {/* Banyaknya - Jumlah */}
          <col style={{ width: '10%' }} />  {/* Banyaknya - Satuan */}
          <col style={{ width: '12%' }} />  {/* Keterangan - Baik */}
          <col style={{ width: '12%' }} />  {/* Keterangan - Kurang Baik */}
        </colgroup>

        <thead>
          <tr>
            <th style={th()} rowSpan={2}>No.</th>
            <th style={th()} rowSpan={2}>Uraian Pekerjaan / Barang</th>
            <th style={th()} rowSpan={2}>Spesifikasi</th>
            <th style={th({ fontSize: '9.5pt' })} colSpan={2}>Banyaknya</th>
            <th style={th({ fontSize: '9.5pt' })} colSpan={2}>Keterangan</th>
          </tr>
          <tr>
            <th style={th({ fontSize: '9pt' })}>Jumlah</th>
            <th style={th({ fontSize: '9pt' })}>Satuan</th>
            <th style={th({ fontSize: '9pt' })}>baik</th>
            <th style={th({ fontSize: '9pt' })}>kurang baik</th>
          </tr>
        </thead>

        <tbody>
          {/* Baris header grup: No=1, Uraian="Belanja ATK" */}
          <tr>
            <td style={td({ textAlign: 'center' })}>1</td>
            <td style={td({ fontWeight: 'bold' })}>Belanja ATK</td>
            <td style={td()} />
            <td style={td()} />
            <td style={td()} />
            <td style={td()} />
            <td style={td()} />
          </tr>

          {/* Baris item: No kosong, Uraian kosong, nama barang di Spesifikasi */}
          {items.length === 0 ? (
            <tr>
              <td colSpan={7} style={td({ textAlign: 'center', color: '#777' })}>
                - belum ada item -
              </td>
            </tr>
          ) : (
            items.map((item) => (
              <tr key={item.id}>
                <td style={td()} />
                <td style={td()} />
                <td style={td()}>{item.nama_barang}</td>
                <td style={td({ textAlign: 'center' })}>{Number(item.qty) || ''}</td>
                <td style={td({ textAlign: 'center' })}>{item.satuan}</td>
                <td style={td({ textAlign: 'center' })}>√</td>
                <td style={td()} />
              </tr>
            ))
          )}

          {/* Baris kosong pengisi */}
          {Array.from({ length: Math.max(0, EMPTY_ROWS - items.length) }).map((_, i) => (
            <tr key={`empty-${i}`} style={{ height: '16pt' }}>
              {[...Array(7)].map((__, j) => (
                <td key={j} style={td()} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── TTD: Penyedia (kiri) + label + Pemeriksa (kanan) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '40% 1fr', gap: '24pt', marginTop: '14pt' }}>
        <MiniSignature
          title="Penyedia Barang/Jasa"
          sub={safe(d.penyedia?.nama)}
          name={d.penyedia?.nama_direktur}
          role={d.penyedia?.jabatan_direktur || 'Direktur'}
          height="50pt"
        />
        <div>
          <p style={{ margin: '0 0 6pt 0', fontWeight: 'bold', fontSize: '10.5pt' }}>
            PEMERIKSA/PENERIMA HASIL PEKERJAAN BARANG/JASA :
          </p>
          <PemeriksaStack pencairan={d} />
        </div>
      </div>
    </DocumentSheet>
  );
};

export default LampPemeriksaanTemplate;
