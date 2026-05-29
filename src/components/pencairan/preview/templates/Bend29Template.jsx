import DocumentSheet from '../DocumentSheet';
import {
  BLANK,
  formatQty,
  itemTotal,
  safe,
  tanggal,
  terbilangAngka,
} from './templateHelpers';

const fmtNum = (n) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n || 0);

const B = '1px solid #000';
const th = (extra = {}) => ({
  border: B, padding: '3pt', textAlign: 'center',
  fontWeight: 'bold', verticalAlign: 'middle', fontSize: '9.5pt', ...extra,
});
const td = (extra = {}) => ({
  border: B, padding: '3pt', verticalAlign: 'top', fontSize: '9.5pt', ...extra,
});

const DotLine = ({ w = '100pt' }) => (
  <span style={{ display: 'inline-block', borderBottom: '1px dotted #666', minWidth: w }}>&nbsp;</span>
);

// Lebar label kolom dikunci agar semua baris lurus
const InfoRow = ({ label, value, dotWidth = '80pt' }) => (
  <tr>
    <td style={{ padding: '1.5pt 0', whiteSpace: 'nowrap', fontSize: '10.5pt', width: '70pt' }}>{label}</td>
    <td style={{ padding: '1.5pt 6pt', fontSize: '10.5pt', width: '10pt' }}>:</td>
    <td style={{ padding: '1.5pt 0', fontSize: '10.5pt' }}>
      {value ?? <DotLine w={dotWidth} />}
    </td>
  </tr>
);

const EMPTY_ROWS = 5;

const Bend29Template = ({ pencairan }) => {
  const d = pencairan || {};
  const items = d.items || [];
  const total = Number(d.total_nilai) || 0;
  const pb = d.pengurus_barang || {};
  const atasan = d.atasan_pengurus_barang || {};

  return (
    <DocumentSheet withKop={false}>

      {/* ── Header: Instansi (kiri) + Model/No (kanan) ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6pt' }}>
        <div>
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: '11.5pt' }}>PEMERINTAH KABUPATEN BOGOR</p>
          <p style={{ margin: '2pt 0 0 0', fontSize: '11pt' }}>UNIT : DPMD</p>
        </div>
        <div style={{ textAlign: 'right', fontSize: '10.5pt' }}>
          <p style={{ margin: 0 }}>Model : Bend 29</p>
          <p style={{ margin: '2pt 0 0 0' }}>No : {safe(d.no_lampiran_bat)}</p>
        </div>
      </div>

      {/* ── GUDANG / BUKTI BARANG / KEPADA ── */}
      <table style={{ margin: '4pt 0 8pt 60pt', borderCollapse: 'collapse' }}>
        <tbody>
          <InfoRow label="GUDANG"       value="DPMD" />
          <InfoRow label="BUKTI BARANG" value="DPMD" />
          <InfoRow label="KEPADA"       value={null} dotWidth="120pt" />
        </tbody>
      </table>

      {/* ── Tabel barang ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt' }}>
        <thead>
          <tr>
            <th style={th({ width: '10%' })}>
              Tanggal<br />Penyerahan<br />menurut<br />permintaan
            </th>
            <th style={th({ width: '12%' })}>
              Barang<br />diterima<br />dari<br />Gudang
            </th>
            <th style={th({ width: '26%' })}>Nama dan<br />Kode Barang</th>
            <th style={th({ width: '8%' })}>Satuan</th>
            <th style={th({ width: '5%' })} colSpan={2}>Jumlah Barang</th>
            <th style={th({ width: '12%' })}>Harga<br />Satuan</th>
            <th style={th({ width: '14%' })}>Jumlah<br />Harga</th>
          </tr>
          <tr>
            <th style={th()}>1</th>
            <th style={th()}>2</th>
            <th style={th()}>3</th>
            <th style={th()}>4</th>
            <th style={th()}>Angka</th>
            <th style={th()}>Huruf</th>
            <th style={th()}>6</th>
            <th style={th()}>7</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr><td colSpan={8} style={td({ textAlign: 'center', color: '#777' })}>- belum ada item -</td></tr>
          ) : items.map((item, idx) => (
            <tr key={item.id || idx}>
              <td style={td({ textAlign: 'center', fontSize: '9pt' })}>
                {idx === 0 ? tanggal(d.tgl_basthp) : ''}
              </td>
              <td style={td()} />
              <td style={td()}>{item.nama_barang}</td>
              <td style={td({ textAlign: 'center' })}>{item.satuan}</td>
              <td style={td({ textAlign: 'center' })}>{formatQty(item.qty)}</td>
              <td style={td({ textAlign: 'center' })}>{terbilangAngka(item.qty)}</td>
              <td style={td({ textAlign: 'right' })}>{fmtNum(item.harga_satuan)}</td>
              <td style={td({ textAlign: 'right' })}>{fmtNum(itemTotal(item))}</td>
            </tr>
          ))}

          {/* Baris kosong pengisi */}
          {Array.from({ length: Math.max(0, EMPTY_ROWS - items.length) }).map((_, i) => (
            <tr key={`e-${i}`} style={{ height: '15pt' }}>
              {[...Array(8)].map((__, j) => <td key={j} style={td()} />)}
            </tr>
          ))}

          {/* Terbilang + total */}
          <tr>
            <td colSpan={7} style={td({ textAlign: 'left' })}>
              Terbilang&nbsp;&nbsp;<DotLine w="200pt" />
            </td>
            <td style={td({ textAlign: 'right', fontWeight: 'bold' })}>
              {fmtNum(total)}
            </td>
          </tr>
        </tbody>
      </table>

      {/* ── Bagian bawah: satu tabel penuh agar kolom kiri & kanan otomatis lurus ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12pt', fontSize: '10.5pt' }}>
        <colgroup>
          <col style={{ width: '15%' }} /> {/* label kiri */}
          <col style={{ width: '2%' }} />  {/* titik dua kiri */}
          <col style={{ width: '33%' }} /> {/* nilai kiri */}
          <col style={{ width: '4%' }} />  {/* spacer */}
          <col style={{ width: '15%' }} /> {/* label kanan */}
          <col style={{ width: '2%' }} />  {/* titik dua kanan */}
          <col />                          {/* nilai kanan */}
        </colgroup>
        <tbody>
          {/* Header kiri + kanan */}
          <tr>
            <td colSpan={3} style={{ padding: '0 0 2pt 0', verticalAlign: 'top' }}>
              <p style={{ margin: 0 }}>Daerah/Unit <DotLine w="90pt" /></p>
              <p style={{ margin: '2pt 0' }}><DotLine w="40pt" /> Tgl <DotLine w="50pt" /></p>
              <p style={{ margin: '4pt 0 0 0' }}>Yang menerima,</p>
              <div style={{ height: '28pt' }} />
            </td>
            <td />
            <td colSpan={3} style={{ padding: '0 0 2pt 0', verticalAlign: 'top' }}>
              <p style={{ margin: 0 }}>
                Cibinong,&nbsp;
                <span style={{ borderBottom: '1px solid #000', display: 'inline-block', minWidth: '60pt' }}>
                  {d.tgl_basthp ? tanggal(d.tgl_basthp) : ''}
                </span>
                &nbsp;{d.tahun_anggaran || ''}
              </p>
              <p style={{ margin: '2pt 0 0 0' }}>Pengurus Barang</p>
              <div style={{ height: '28pt' }} />
            </td>
          </tr>
          {/* Tanda Tangan */}
          <tr>
            <td style={{ padding: '1.5pt 0' }}>Tanda Tangan</td>
            <td style={{ padding: '1.5pt 6pt' }}>:</td>
            <td style={{ padding: '1.5pt 0' }}><DotLine w="100pt" /></td>
            <td />
            <td style={{ padding: '1.5pt 0' }}>Tanda Tangan</td>
            <td style={{ padding: '1.5pt 6pt' }}>:</td>
            <td style={{ padding: '1.5pt 0' }}><DotLine w="100pt" /></td>
          </tr>
          {/* Nama */}
          <tr>
            <td style={{ padding: '1.5pt 0' }}>Nama</td>
            <td style={{ padding: '1.5pt 6pt' }}>:</td>
            <td style={{ padding: '1.5pt 0' }}><DotLine w="100pt" /></td>
            <td />
            <td style={{ padding: '1.5pt 0' }}>Nama</td>
            <td style={{ padding: '1.5pt 6pt' }}>:</td>
            <td style={{ padding: '1.5pt 0' }}>{safe(pb.name) || <DotLine w="100pt" />}</td>
          </tr>
          {/* NIP */}
          <tr>
            <td style={{ padding: '1.5pt 0' }}>NIP</td>
            <td style={{ padding: '1.5pt 6pt' }}>:</td>
            <td style={{ padding: '1.5pt 0' }}><DotLine w="100pt" /></td>
            <td />
            <td style={{ padding: '1.5pt 0' }}>NIP</td>
            <td style={{ padding: '1.5pt 6pt' }}>:</td>
            <td style={{ padding: '1.5pt 0' }}>{pb.nip ? `NIP. ${pb.nip}` : <DotLine w="100pt" />}</td>
          </tr>
          {/* Pangkat/Gol */}
          <tr>
            <td style={{ padding: '1.5pt 0' }}>Pangkat/Gol.</td>
            <td style={{ padding: '1.5pt 6pt' }}>:</td>
            <td style={{ padding: '1.5pt 0' }}><DotLine w="100pt" /></td>
            <td />
            <td style={{ padding: '1.5pt 0' }}>Pangkat/Gol.</td>
            <td style={{ padding: '1.5pt 6pt' }}>:</td>
            <td style={{ padding: '1.5pt 0' }}>{pb.pangkat || <DotLine w="100pt" />}</td>
          </tr>
        </tbody>
      </table>

      {/* ── MENGETAHUI ── */}
      <div style={{ marginTop: '16pt' }}>
        {/* Judul terpusat */}
        <p style={{ margin: 0, fontWeight: 'bold', fontSize: '11pt', textAlign: 'center' }}>MENGETAHUI :</p>
        <p style={{ margin: '2pt 0 6pt 0', fontWeight: 'bold', fontSize: '11pt', textAlign: 'center' }}>
          AN. ORDONATUR / KUASA PENGGUNA BARANG
        </p>
        {/* Isian rata kiri, terpusat sebagai blok */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <table style={{ borderCollapse: 'collapse' }}>
            <tbody>
              <InfoRow label="Tanda Tangan" value={null}                  dotWidth="130pt" />
              <InfoRow label="Nama"         value={safe(atasan.name)} />
              <InfoRow label="NIP"          value={atasan.nip || null}    dotWidth="130pt" />
              <InfoRow label="Pangkat/Gol"  value={atasan.pangkat || null}dotWidth="130pt" />
              <InfoRow label="Jabatan"      value={atasan.jabatan || null} dotWidth="130pt" />
            </tbody>
          </table>
        </div>
      </div>

    </DocumentSheet>
  );
};

export default Bend29Template;
