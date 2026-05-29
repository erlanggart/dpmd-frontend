// Template Surat Pesanan — mengacu pada sheet "Pesanan" di File Pencairan ATK.xls
import DocumentSheet, { formatTanggalIndonesia } from '../DocumentSheet';
import { terbilangKapital } from '../../../../utils/terbilang';

// Angka tanpa prefix "Rp"
const fmtNum = (n) =>
  new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n || 0);

const B = '1px solid #000';
const th = (extra = {}) => ({
  border: B, padding: '3pt 4pt', textAlign: 'center',
  fontWeight: 'bold', fontSize: '9pt', verticalAlign: 'middle', ...extra,
});
const td = (extra = {}) => ({
  border: B, padding: '3pt 4pt', verticalAlign: 'top', fontSize: '9pt', ...extra,
});

// Render kolom Banyaknya + Satuan — dukung satuan gabungan (mis. "OH / Hari / Bulan")
const renderBanyakSatuan = (it) => {
  const qty = Number(it.qty) || 0;
  const satuan = (it.satuan || '').trim();
  if (!satuan) return String(qty);
  // Satuan gabungan dari koefisien: "OH / Hari / Bulan" → tampil vertikal
  const parts = satuan.split('/').map(s => s.trim()).filter(Boolean);
  if (parts.length <= 1) return `${qty} ${satuan}`;
  // Jika multi-satuan, tampilkan qty lalu satuan per baris
  return (
    <span style={{ fontSize: '8.5pt', lineHeight: 1.4 }}>
      {qty} {parts[0]}
      {parts.slice(1).map((p, i) => (
        <span key={i}><br />× {p}</span>
      ))}
    </span>
  );
};

const PesananTemplate = ({ pencairan }) => {
  const d = pencairan || {};
  const items = d.items || [];
  const total = Number(d.total_nilai) || 0;
  const tgl = d.tgl_pesanan ? formatTanggalIndonesia(d.tgl_pesanan) : '';
  const ppk = d.ppk;

  // Jenis belanja (nama rekening/grup ATK)
  const jenisbelanja = d.jenis_belanja
    || 'Belanja Alat/Bahan untuk Kegiatan Kantor - Alat Tulis Kantor';

  // Kode rekening dari item pertama
  const kodeRekening = items[0]?.kode_rekening || '…………';

  return (
    <DocumentSheet withKop kopLogoSrc="/logo-96.png">

      {/* ── Tanggal pojok kanan ── */}
      <div style={{ textAlign: 'right', marginTop: '6pt', marginBottom: '8pt', fontSize: '11pt' }}>
        Cibinong,{' '}{tgl || '………………………'}
      </div>

      {/* ── Nomor / Lampiran / Perihal + Kepada (dua kolom) ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '8pt' }}>

        {/* Kiri */}
        <table style={{ borderCollapse: 'collapse', flex: '0 0 50%', fontSize: '11pt' }}>
          <tbody>
            <tr>
              <td style={{ padding: '1.5pt 0', verticalAlign: 'top', whiteSpace: 'nowrap' }}>Nomor</td>
              <td style={{ padding: '1.5pt 8pt', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '1.5pt 0' }}>
                {d.no_pesanan_a || '000.3.1 /'}
                {' '}
                <span style={{ display: 'inline-block', minWidth: '28pt', borderBottom: '1px solid #000' }}>&nbsp;</span>
                {' '}
                {d.no_pesanan_b ? `- ${d.no_pesanan_b}` : '- Umpeg'}
              </td>
            </tr>
            <tr>
              <td style={{ padding: '1.5pt 0' }}>Lampiran</td>
              <td style={{ padding: '1.5pt 8pt' }}>:</td>
              <td style={{ padding: '1.5pt 0' }}>-</td>
            </tr>
            <tr>
              <td style={{ padding: '1.5pt 0', verticalAlign: 'top' }}>Perihal</td>
              <td style={{ padding: '1.5pt 8pt', verticalAlign: 'top' }}>:</td>
              <td style={{ padding: '1.5pt 0' }}>
                <strong><u>Surat Pesanan</u></strong>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Kanan — Kepada Yth. */}
        <table style={{ borderCollapse: 'collapse', flex: '0 0 50%', fontSize: '11pt' }}>
          <tbody>
            <tr>
              <td colSpan={3} style={{ padding: '1.5pt 0' }}>Kepada</td>
            </tr>
            <tr>
              <td style={{ padding: '1.5pt 0', verticalAlign: 'top', whiteSpace: 'nowrap' }}>Yth.</td>
              <td style={{ width: '6pt' }} />
              <td style={{ padding: '1.5pt 0' }}>
                <strong>{d.penyedia?.nama || '—'}</strong>
              </td>
            </tr>
            {d.penyedia?.alamat && (
              <tr>
                <td /><td />
                <td style={{ padding: '1pt 0', lineHeight: 1.35 }}>{d.penyedia.alamat}</td>
              </tr>
            )}
            <tr>
              <td colSpan={3} style={{ padding: '4pt 0 1pt 0' }}>di –</td>
            </tr>
            <tr>
              <td /><td />
              <td style={{ padding: '1.5pt 0', fontWeight: 'bold' }}>Bogor</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Body paragraf ── */}
      <p style={{ margin: '0 0 6pt 0', textAlign: 'justify', lineHeight: 1.5, fontSize: '11pt' }}>
        Untuk kepentingan Dinas Pemberdayaan Masyarakat dan Desa Kabupaten Bogor, agar
        dilaksanakan pekerjaan <strong>{jenisbelanja}</strong> Kegiatan{' '}
        <strong>{d.uraian_kegiatan || '—'}</strong> kebutuhan DPMD Kabupaten Bogor Tahun
        Anggaran <strong>{d.tahun_anggaran || '…'}</strong> dengan rincian sebagai berikut :
      </p>

      {/* ── Tabel items ── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9pt' }}>
        <colgroup>
          <col style={{ width: '4%' }} />   {/* No */}
          <col style={{ width: '34%' }} />  {/* Nama Barang */}
          <col style={{ width: '14%' }} />  {/* Banyaknya & Satuan */}
          <col style={{ width: '14%' }} />  {/* Harga Satuan */}
          <col style={{ width: '9%' }} />   {/* PPN */}
          <col style={{ width: '13%' }} />  {/* Jumlah */}
          <col style={{ width: '12%' }} />  {/* Ket */}
        </colgroup>

        <thead>
          <tr>
            <th style={th()}>No</th>
            <th style={th()}>Nama Barang</th>
            <th style={th()}>Banyaknya &amp; Satuan</th>
            <th style={th()}>Harga Satuan</th>
            <th style={th()}>PPN</th>
            <th style={th()}>Jumlah</th>
            <th style={th()}>Ket</th>
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
            <>
              {/* Baris header grup */}
              <tr>
                <td style={td({ textAlign: 'center' })}>I.</td>
                <td colSpan={6} style={td({ fontWeight: 'bold' })}>
                  {jenisbelanja}
                </td>
              </tr>

              {/* Baris item — kolom Ket di-rowSpan seluruh baris agar baris 1 tidak membengkak */}
              {items.map((it, idx) => (
                <tr key={it.id || idx}>
                  <td style={td({ textAlign: 'center' })}>{idx + 1}</td>
                  <td style={td()}>{it.nama_barang}</td>
                  <td style={td({ textAlign: 'center' })}>{renderBanyakSatuan(it)}</td>
                  <td style={td({ textAlign: 'right' })}>{fmtNum(it.harga_satuan)}</td>
                  <td style={td({ textAlign: 'right' })}>
                    {Number(it.ppn) > 0 ? fmtNum(it.ppn) : ''}
                  </td>
                  <td style={td({ textAlign: 'right' })}>{fmtNum(it.total)}</td>
                  {idx === 0 && (
                    <td
                      rowSpan={items.length}
                      style={td({ fontSize: '8pt', lineHeight: 1.4, verticalAlign: 'top', textAlign: 'center', paddingTop: '6pt' })}
                    >
                      Harga Sudah Termasuk Pajak yang timbul
                    </td>
                  )}
                </tr>
              ))}
            </>
          )}

          {/* JUMLAH TOTAL */}
          <tr>
            <td colSpan={5} style={td({ textAlign: 'right', fontWeight: 'bold' })}>
              JUMLAH TOTAL
            </td>
            <td style={td({ textAlign: 'right', fontWeight: 'bold' })}>
              {fmtNum(total)}
            </td>
            <td style={td()} />
          </tr>
        </tbody>
      </table>

      {/* ── Terbilang ── */}
      <p style={{ margin: '3pt 0 8pt 0', fontSize: '10.5pt' }}>
        <strong>Terbilang :</strong>{'  '}
        <em>{total > 0 ? terbilangKapital(total) : '—'}</em>
      </p>

      {/* ── Ketentuan dan Syarat-Syarat ── */}
      <div style={{ fontSize: '10.5pt' }}>
        <p style={{ margin: '0 0 4pt 0', fontWeight: 'bold' }}>
          II.{'  '}KETENTUAN DAN SYARAT-SYARAT
        </p>

        {/* Nomor 1 */}
        <div style={{ display: 'flex', gap: '6pt', marginBottom: '4pt', lineHeight: 1.5, textAlign: 'justify' }}>
          <span style={{ flexShrink: 0, minWidth: '14pt' }}>1.</span>
          <span style={{ flex: 1 }}>
            Pekerjaan Tersebut merupakan kegiatan Dinas Pemberdayaan Masyarakat dan Desa
            Kabupaten Bogor Tahun Anggaran {d.tahun_anggaran || '…'}.
          </span>
        </div>

        {/* Nomor 2 */}
        <div style={{ display: 'flex', gap: '6pt', marginBottom: '4pt', lineHeight: 1.5, textAlign: 'justify' }}>
          <span style={{ flexShrink: 0, minWidth: '14pt' }}>2.</span>
          <span style={{ flex: 1 }}>
            Cara Pembayaran akan langsung dengan mentransfer ke rekening{' '}
            <strong>{d.penyedia?.nama || '—'}</strong> No. Rek{' '}
            <strong>{d.penyedia?.no_rekening || '…………'}</strong> pada{' '}
            <strong>{d.penyedia?.nama_bank || '…………'}</strong>, yang dibayarkan langsung
            dan setelah pekerjaan tersebut selesai yang dibuktikan dengan Berita Acara Serah
            Terima Hasil Pekerjaan yang telah ditandatangani dan disetujui oleh kedua belah
            pihak.
          </span>
        </div>

        {/* Nomor 3 */}
        <div style={{ display: 'flex', gap: '6pt', lineHeight: 1.5 }}>
          <span style={{ flexShrink: 0, minWidth: '14pt' }}>3.</span>
          <span style={{ flex: 1 }}>
            Kode Rekening Kegiatan : <strong>{kodeRekening}</strong>
          </span>
        </div>
      </div>

      <p style={{ margin: '8pt 0 16pt 0', fontSize: '10.5pt' }}>
        Demikian agar dilaksanakan dengan sebaik-baiknya
      </p>

      {/* ── TTD PPK ── */}
      <div style={{ textAlign: 'right' }}>
        <div style={{ display: 'inline-block', textAlign: 'center', minWidth: '7cm' }}>
          <p style={{ margin: 0, fontSize: '11pt' }}>Pejabat Pembuat Komitmen</p>
          <div style={{ height: '60pt' }} />
          <p style={{ margin: 0, fontWeight: 'bold', textDecoration: 'underline', fontSize: '11pt' }}>
            {ppk?.name || '…………………………………………'}
          </p>
          <p style={{ margin: '2pt 0 0 0', fontSize: '10.5pt' }}>
            NIP. {ppk?.nip || '…………………………………'}
          </p>
        </div>
      </div>

    </DocumentSheet>
  );
};

export default PesananTemplate;
