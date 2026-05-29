/* eslint-disable react-refresh/only-export-components */
import { formatRupiah, formatTanggalIndonesia, splitTanggal } from '../DocumentSheet';
import { terbilangKapital } from '../../../../utils/terbilang';

export const BLANK = '................................';

export const safe = (value, fallback = BLANK) => {
  if (value === null || value === undefined || value === '') return fallback;
  return value;
};

export const formatQty = (value) =>
  Number(value || 0).toLocaleString('id-ID', { maximumFractionDigits: 2 });

export const itemTotal = (item) => {
  const explicit = Number(item?.total);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return Number(item?.qty || 0) * Number(item?.harga_satuan || 0);
};

export const getPemeriksa = (pencairan, index) =>
  pencairan?.pemeriksa?.[index]?.user || pencairan?.pemeriksa?.[index] || {};

export const dateParts = (date) => splitTanggal(date);

export const tanggal = (date) => date ? formatTanggalIndonesia(date) : BLANK;

export const terbilangRupiah = (value) =>
  Number(value || 0) > 0 ? terbilangKapital(value) : BLANK;

export const terbilangAngka = (value) =>
  Number(value || 0) > 0 ? terbilangKapital(value).replace(/\s+Rupiah$/i, '') : BLANK;

export const nomorBaPemeriksaan = (d) => d?.no_ba_pemeriksaan || BLANK;
export const nomorBast = (d) => d?.no_bast || BLANK;
export const nomorBasthp = (d) => d?.no_basthp || BLANK;
export const nomorPesanan = (d) => d?.no_pesanan_b || d?.no_pesanan_a || BLANK;

export const signStyle = {
  name: { margin: 0, fontWeight: 'bold', textDecoration: 'underline' },
  line: { margin: '2pt 0 0 0' },
};

export const MiniSignature = ({
  title,
  sub,
  name,
  nip,
  role,
  height = '54pt',
  align = 'center',
}) => (
  <div style={{ textAlign: align }}>
    {title && <p style={{ margin: 0 }}>{title}</p>}
    {sub && <p style={{ margin: 0, fontSize: '10.5pt' }}>{sub}</p>}
    <div style={{ height }} />
    <p style={signStyle.name}>{safe(name)}</p>
    {role && <p style={signStyle.line}>{role}</p>}
    {nip && <p style={signStyle.line}>NIP. {nip}</p>}
  </div>
);

export const PemeriksaStack = ({ pencairan, withSignLine = true }) => (
  <div style={{ display: 'grid', gap: '8pt' }}>
    {[0, 1, 2].map((idx) => {
      const user = getPemeriksa(pencairan, idx);
      return (
        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '18pt 1fr', columnGap: '4pt' }}>
          <div>{idx + 1}.</div>
          <div>
            <p style={{ margin: 0, fontWeight: 'bold' }}>{safe(user.name)}</p>
            <p style={{ margin: 0 }}>NIP. {safe(user.nip)}</p>
            {withSignLine && <p style={{ margin: '3pt 0 0 0' }}>Tanda Tangan : {BLANK}</p>}
          </div>
        </div>
      );
    })}
  </div>
);

export const ItemsTableRows = ({ items, emptyColSpan = 6, showPrice = true, showCheck = false }) => {
  if (!items?.length) {
    return (
      <tr>
        <td colSpan={emptyColSpan} style={{ border: '1px solid #000', padding: '8pt', textAlign: 'center', color: '#777' }}>
          - belum ada item -
        </td>
      </tr>
    );
  }

  return items.map((item, idx) => (
    <tr key={item.id || idx}>
      <td style={{ border: '1px solid #000', padding: '3pt', textAlign: 'center' }}>{idx + 1}</td>
      <td style={{ border: '1px solid #000', padding: '3pt' }}>{item.nama_barang}</td>
      <td style={{ border: '1px solid #000', padding: '3pt' }}>{item.spesifikasi || '-'}</td>
      <td style={{ border: '1px solid #000', padding: '3pt', textAlign: 'center' }}>{formatQty(item.qty)}</td>
      <td style={{ border: '1px solid #000', padding: '3pt', textAlign: 'center' }}>{item.satuan}</td>
      {showPrice && (
        <>
          <td style={{ border: '1px solid #000', padding: '3pt', textAlign: 'right' }}>{formatRupiah(item.harga_satuan)}</td>
          <td style={{ border: '1px solid #000', padding: '3pt', textAlign: 'right' }}>{formatRupiah(itemTotal(item))}</td>
        </>
      )}
      {showCheck && (
        <>
          <td style={{ border: '1px solid #000', padding: '3pt', textAlign: 'center' }}>v</td>
          <td style={{ border: '1px solid #000', padding: '3pt' }} />
        </>
      )}
    </tr>
  ));
};
