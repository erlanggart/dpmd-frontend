import React, { useState } from 'react';
import api from '../../../services/api.js';
import { FaPaperPlane, FaSpinner, FaFileDownload, FaTimes, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import { initialFormData } from './BumdesForm';
import './bumdes.css';

const normalizeFieldName = (name) => {
    return name.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ');
};

const formatRupiah = (angka) => {
    if (!angka) return "";
    let numberString = String(angka).replace(/[^,\d]/g, "").toString();
    return "Rp. " + numberString.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseRupiah = (rupiah) => {
    return parseInt(String(rupiah).replace(/[^0-9]/g, ''), 10) || 0;
};

// Definisikan sections form yang sama seperti di BumdesForm.js
const formSections = [
    { id: 'identitas', title: 'Identitas BUMDes' },
    { id: 'status', title: 'Status BUMDes' },
    { id: 'legalitas', title: 'Legalitas' },
    { id: 'pengurus', title: 'Profil Pengurus' },
    { id: 'organisasi', title: 'Profil Organisasi' },
    { id: 'usaha', title: 'Usaha BUMDes' },
    { id: 'permodalan', title: 'Permodalan dan Aset' },
    { id: 'kemitraan', title: 'Kemitraan' },
    { id: 'kontribusi', title: 'Kontribusi PADes' },
    { id: 'peran', title: 'Peran BUMDes' },
    { id: 'bantuan', title: 'Bantuan' },
    { id: 'laporan', title: 'Laporan Keuangan' },
    { id: 'dokumen', title: 'Dokumen Pendirian' },
];

function BumdesEditDashboard({ initialData, onLogout }) {
    const [formData, setFormData] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState({ text: '', type: '' });
    const [activeSection, setActiveSection] = useState('identitas');

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('Omset') || name.includes('Laba') || name.includes('Modal') || name.includes('Kontribusi') || name.includes('NilaiAset') || name.includes('SumberLain') || name === 'TotalTenagaKerja') {
            setFormData({ ...formData, [name]: parseRupiah(value) });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.files[0] });
    };

    const showMessagePopup = (text, type) => {
        setPopupMessage({ text, type });
        setShowPopup(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setShowPopup(false);

        const dataToSend = new FormData();
        
        // Field required yang harus selalu dikirim
        const requiredFields = ['id', 'kecamatan', 'desa', 'namabumdesa', 'kode_desa'];
        
        // Kirim semua field required
        requiredFields.forEach(key => {
            if (formData[key] !== null && formData[key] !== undefined) {
                dataToSend.append(key, formData[key]);
            }
        });
        
        // Kirim data yang berubah dan file baru
        for (const key in formData) {
            const value = formData[key];
            const initialValue = initialData[key];

            if (value instanceof File) {
                // Selalu kirim file baru
                dataToSend.append(key, value);
            } else if (value !== null && value !== initialValue && !requiredFields.includes(key)) {
                // Kirim data non-file yang berubah (kecuali yang sudah di required fields)
                if (['Omset2023', 'Laba2023', 'Omset2024', 'Laba2024', 'PenyertaanModal2019', 'PenyertaanModal2020', 'PenyertaanModal2021', 'PenyertaanModal2022', 'PenyertaanModal2023', 'PenyertaanModal2024', 'SumberLain', 'NilaiAset', 'KontribusiTerhadapPADes2021', 'KontribusiTerhadapPADes2022', 'KontribusiTerhadapPADes2023', 'KontribusiTerhadapPADes2024', 'TotalTenagaKerja'].includes(key)) {
                    dataToSend.append(key, parseRupiah(value));
                } else {
                    dataToSend.append(key, value);
                }
            }
        }
        
        dataToSend.append('_method', 'PUT');

        try {
            const response = await api.post(`/bumdes/${formData.id}`, dataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            showMessagePopup(response.data.message, 'success');
            setFormData(response.data.data);
            setLoading(false);
            // Perbarui data di localStorage setelah update berhasil
            localStorage.setItem('bumdesData', JSON.stringify(response.data.data));
        } catch (error) {
            console.error("Gagal mengupdate data:", error.response?.data?.errors || error.message);
            console.error("Full error response:", error.response?.data);
            console.error("Data yang dikirim:", Object.fromEntries(dataToSend.entries()));
            showMessagePopup('Gagal mengupdate data: ' + (error.response?.data?.message || error.message), 'error');
            setLoading(false);
        }
    };
    
    // Fungsi untuk merender setiap section form
    const renderSection = () => {
        switch (activeSection) {
            case 'identitas':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Identitas BUMDes</h2>
                        <div className="form-group">
                            <label className="form-label">Kode Desa:</label>
                            <input type="text" name="kode_desa" value={formData.kode_desa || ''} onChange={handleChange} required className="form-input" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Kecamatan:</label>
                            <input type="text" name="kecamatan" value={formData.kecamatan || ''} onChange={handleChange} required className="form-input" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Desa:</label>
                            <input type="text" name="desa" value={formData.desa || ''} onChange={handleChange} required className="form-input" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Nama BUMDesa:</label>
                            <input type="text" name="namabumdesa" value={formData.namabumdesa || ''} onChange={handleChange} required className="form-input" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Alamat BUMDesa:</label>
                            <input type="text" name="AlamatBumdesa" value={formData.AlamatBumdesa || ''} onChange={handleChange} className="form-input" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">No Telfon BUMDesa:</label>
                            <input type="text" name="TelfonBumdes" value={formData.TelfonBumdes || ''} onChange={handleChange} className="form-input" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Alamat Email:</label>
                            <input type="text" name="Alamatemail" value={formData.Alamatemail || ''} onChange={handleChange} className="form-input" />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Tahun Pendirian:</label>
                            <input type="text" name="TahunPendirian" value={formData.TahunPendirian} onChange={handleChange} className="form-input" />
                        </div>
                    </div>
                );
            case 'status':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Status BUMDesa</h2>
                        <div className="form-group">
                            <label className="form-label">Status 2025:</label>
                            <select name="status" value={formData.status} onChange={handleChange} className="form-select">
                                <option value="aktif">Aktif</option>
                                <option value="tidak aktif">Tidak Aktif</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Keterangan Tidak Aktif:</label>
                            <select name="keterangan_tidak_aktif" value={formData.keterangan_tidak_aktif} onChange={handleChange} className="form-select">
                                <option value="">-</option>
                                <option value="Ada pengurus, tidak ada usaha">Ada pengurus, tidak ada usaha</option>
                                <option value="Tidak ada pengurus, ada usaha">Tidak ada pengurus, ada usaha</option>
                                <option value="Tidak ada keduanya">Tidak ada keduanya</option>
                            </select>
                        </div>
                    </div>
                );
            case 'legalitas':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Legalitas</h2>
                        <div className="form-group"><label className="form-label">NIB:</label><input type="text" name="NIB" value={formData.NIB} onChange={handleChange} placeholder="masukan nomor NIB.." className="form-input" /></div>
                        <div className="form-group"><label className="form-label">LKPP:</label><input type="text" name="LKPP" value={formData.LKPP} onChange={handleChange} placeholder="masukan nomor LKPP.." className="form-input" /></div>
                        <div className="form-group"><label className="form-label">NPWP:</label><input type="text" name="NPWP" value={formData.NPWP} onChange={handleChange} placeholder="masukan nomor NPWP.." className="form-input" /></div>
                        <div className="form-group">
                            <label className="form-label">Status Badan Hukum:</label>
                            <select name="badanhukum" value={formData.badanhukum} onChange={handleChange} className="form-select">
                                <option value="">-</option>
                                <option value="Belum Melakukan Proses">Belum Melakukan Proses</option>
                                <option value="Nama Terverifikasi">Nama Terverifikasi</option>
                                <option value="Perbaikan Dokumen">Perbaikan Dokumen</option>
                                <option value="Terbit Sertifikat Badan Hukum">Terbit Sertifikat Badan Hukum</option>
                            </select>
                        </div>
                    </div>
                );
            case 'pengurus':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Profil Pengurus</h2>
                        {['NamaPenasihat', 'JenisKelaminPenasihat', 'HPPenasihat', 'NamaPengawas', 'JenisKelaminPengawas', 'HPPengawas', 'NamaDirektur', 'JenisKelaminDirektur', 'HPDirektur', 'NamaSekretaris', 'JenisKelaminSekretaris', 'HPSekretaris', 'NamaBendahara', 'JenisKelaminBendahara', 'HPBendahara'].map(key => (
                            <div key={key} className="form-group">
                                <label className="form-label">{normalizeFieldName(key)}:</label>
                                {key.includes('JenisKelamin') ? (
                                    <select name={key} value={formData[key]} onChange={handleChange} className="form-select">
                                        <option value="">-</option>
                                        <option value="laki-laki">Laki-Laki</option>
                                        <option value="perempuan">Perempuan</option>
                                    </select>
                                ) : (
                                    <input type="text" name={key} value={formData[key] || ''} onChange={handleChange} className="form-input" />
                                )}
                            </div>
                        ))}
                    </div>
                );
            case 'organisasi':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Profil Organisasi BUMDesa</h2>
                        <div className="form-group"><label className="form-label">Total Tenaga Kerja:</label><input type="text" name="TotalTenagaKerja" value={formData.TotalTenagaKerja} onChange={handleChange} className="form-input" /></div>
                    </div>
                );
            case 'usaha':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Usaha BUMDesa</h2>
                        <div className="form-group">
                            <label className="form-label">Jenis Usaha:</label>
                            <select name="JenisUsaha" value={formData.JenisUsaha} onChange={handleChange} className="form-select">
                                <option value="">-</option>
                                <option value="BudidayadanPertambangan">Budidaya dan Pertambangan</option>
                                <option value="BudidayaPertanian">Budidaya Pertanian</option>
                                <option value="BudidayaPerikanan">Budidaya Perikanan</option>
                                <option value="BudidayaPeternakan">Budidaya Peternakan</option>
                                <option value="BudidayaPertanianPeternakanPerikanan">Budidaya Pertanian, Budidaya Peternakan, Budidaya Perikanan</option>
                                <option value="BudidayaPertanianPerdagangandanJasaUmumPariwisata">Budidaya Pertanian, Perdagangan dan Jasa Umum, Pariwisata</option>
                                <option value="BudidayaPertanianPerdagangandanJasaUmumPariwisataKeuangan/LKD">Budidaya Pertanian,Perdagangan dan Jasa Umum, Pariwisata, Keuangan/LKD</option>
                                <option value="BudidayaPertanianPerdagangandanJasaUmumPelayananPublikKeuangan/LKD">Budidaya Pertanian, Perdagangan dan, Jasa Umum, Pelayanan Publik Keuangan/LKD</option>
                                <option value="BudidayaPertanianPerdagangandanJasaUmumPengolahandanManufaktur">Budidaya Pertanian, Perdagangan dan Jasa Umum, Pengolahan dan Manufaktur</option>
                                <option value="Keuangan/LKD">Keuangan/LKD</option>
                                <option value="Pariwisata">Pariwisaata</option>
                                <option value="PelayananPublik">Pelayanan Publik</option>
                                <option value="PelayananPublikKeuangan/LKD">Pelayanan Publik, Keuangan/LKD</option>
                                <option value="PengolahandanManufaktur">Pengolahan dan Manufaktur</option>
                                <option value="PerdagangandanJasaUmum">Perdagangan dan Jasa Umum</option>
                                <option value="PerdagangandanJasaUmumKeuangan/LKD">Perdagangan dan Jasa Umum, Keuangan/LKD</option>
                                <option value="PerdagangandanJasaUmum,Pariwisata">Perdagangan dan Jasa Umum, Pariwisata</option>
                                <option value="PerdagangandanJasaUmum,PelayananPublik">Perdagangan dan Jasa Umum, Pelayanan Publik</option>
                                <option value="PerdagangandanJasaUmum,PengolahandanManufaktur">Perdagangan dan Jasa Umum, Pengolahan dan Manufaktur</option>
                                <option value="BelumAdaKeterangan">Belum Ada Keterangan</option>
                            </select>
                        </div>
                        <div className="form-group"><label className="form-label">Keterangan Jenis Usaha Utama:</label><input type="text" name="JenisUsahaUtama" value={formData.JenisUsahaUtama} onChange={handleChange} className="form-input" /></div>
                        <div className="form-group"><label className="form-label">Jenis Usaha Lainnya:</label><input type="text" name="JenisUsahaLainnya" value={formData.JenisUsahaLainnya} onChange={handleChange} className="form-input" /></div>
                        <div className="form-group"><label className="form-label">Omset 2023:</label><input type="text" name="Omset2023" value={formatRupiah(formData.Omset2023)} onChange={handleChange} className="form-input" /></div>
                        <div className="form-group"><label className="form-label">Laba 2023:</label><input type="text" name="Laba2023" value={formatRupiah(formData.Laba2023)} onChange={handleChange} className="form-input" /></div>
                        <div className="form-group"><label className="form-label">Omset 2024:</label><input type="text" name="Omset2024" value={formatRupiah(formData.Omset2024)} onChange={handleChange} className="form-input" /></div>
                        <div className="form-group"><label className="form-label">Laba 2024:</label><input type="text" name="Laba2024" value={formatRupiah(formData.Laba2024)} onChange={handleChange} className="form-input" /></div>
                    </div>
                );
            case 'permodalan':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Permodalan dan Aset</h2>
                        <div className="form-group"><label className="form-label">Penyertaan Modal 2019:</label><input type="text" name="PenyertaanModal2019" value={formatRupiah(formData.PenyertaanModal2019)} onChange={handleChange} className="form-input" /></div>
                        <div className="form-group"><label className="form-label">Penyertaan Modal 2020:</label><input type="text" name="PenyertaanModal2020" value={formatRupiah(formData.PenyertaanModal2020)} onChange={handleChange} className="form-input" /></div>
                        <div className="form-group"><label className="form-label">Penyertaan Modal 2021:</label><input type="text" name="PenyertaanModal2021" value={formatRupiah(formData.PenyertaanModal2021)} onChange={handleChange} className="form-input" /></div>
                        <div className="form-group"><label className="form-label">Penyertaan Modal 2022:</label><input type="text" name="PenyertaanModal2022" value={formatRupiah(formData.PenyertaanModal2022)} onChange={handleChange} className="form-input" /></div>
                        <div className="form-group"><label className="form-label">Penyertaan Modal 2023:</label><input type="text" name="PenyertaanModal2023" value={formatRupiah(formData.PenyertaanModal2023)} onChange={handleChange} className="form-input" /></div>
                        <div className="form-group"><label className="form-label">Penyertaan Modal 2024:</label><input type="text" name="PenyertaanModal2024" value={formatRupiah(formData.PenyertaanModal2024)} onChange={handleChange} className="form-input" /></div>
                        <div className="form-group"><label className="form-label">Modal dari Sumber Lain:</label><input type="text" name="SumberLain" value={formatRupiah(formData.SumberLain)} onChange={handleChange} className="form-input" /></div>
                        <div className="form-group"><label className="form-label">Jenis Aset:</label><input type="text" name="JenisAset" value={formData.JenisAset} onChange={handleChange} className="form-input" /></div>
                        <div className="form-group"><label className="form-label">Nilai Aset:</label><input type="text" name="NilaiAset" value={formatRupiah(formData.NilaiAset)} onChange={handleChange} className="form-input" /></div>
                    </div>
                );
            case 'kemitraan':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Kemitraan/Kerjasama</h2>
                        <div className="form-group"><label className="form-label">Kemitraan/Kerjasama Pihak Ketiga:</label><input type="text" name="KerjasamaPihakKetiga" value={formData.KerjasamaPihakKetiga} onChange={handleChange} className="form-input" /></div>
                        <div className="form-group"><label className="form-label">Tahun Mulai-Tahun Berakhir:</label><input type="text" name="TahunMulai-TahunBerakhir" value={formData['TahunMulai-TahunBerakhir']} onChange={handleChange} className="form-input" /></div>
                    </div>
                );
            case 'kontribusi':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Kontribusi PADES</h2>
                        <div className="form-group"><label className="form-label">Kontribusi PADes 2021:</label><input type="text" name="KontribusiTerhadapPADes2021" value={formatRupiah(formData.KontribusiTerhadapPADes2021)} onChange={handleChange} className="form-input" /></div>
                        <div className="form-group"><label className="form-label">Kontribusi PADes 2022:</label><input type="text" name="KontribusiTerhadapPADes2022" value={formatRupiah(formData.KontribusiTerhadapPADes2022)} onChange={handleChange} className="form-input" /></div>
                        <div className="form-group"><label className="form-label">Kontribusi PADes 2023:</label><input type="text" name="KontribusiTerhadapPADes2023" value={formatRupiah(formData.KontribusiTerhadapPADes2023)} onChange={handleChange} className="form-input" /></div>
                        <div className="form-group"><label className="form-label">Kontribusi PADes 2024:</label><input type="text" name="KontribusiTerhadapPADes2024" value={formatRupiah(formData.KontribusiTerhadapPADes2024)} onChange={handleChange} className="form-input" /></div>
                    </div>
                );
            case 'peran':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Peran BUMDesa pada Program Pemerintah</h2>
                        <div className="form-group">
                            <label className="form-label">Peran Program Ketahanan Pangan 2024:</label>
                            <select name="Ketapang2024" value={formData.Ketapang2024} onChange={handleChange} className="form-select">
                                <option value="">-</option>
                                <option value="Pengelola">Pengelola</option>
                                <option value="Distribusi">Distribusi</option>
                                <option value="Pemasaran">Pemasaran</option>
                                <option value="tidakadaperan">Tidak Ada Peran</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Peran Program Ketahanan Pangan 2025:</label>
                            <select name="Ketapang2025" value={formData.Ketapang2025} onChange={handleChange} className="form-select">
                                <option value="">-</option>
                                <option value="Pengelola">Pengelola</option>
                                <option value="Distribusi">Distribusi</option>
                                <option value="Pemasaran">Pemasaran</option>
                                <option value="tidakadaperan">Tidak Ada Peran</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Peran Pada Desa Wisata:</label>
                            <select name="DesaWisata" value={formData.DesaWisata} onChange={handleChange} className="form-select">
                                <option value="">-</option>
                                <option value="PengelolaUtama">Pengelola Utama</option>
                                <option value="Pengelola Pendukung">Pengelola Pendukung</option>
                            </select>
                        </div>
                    </div>
                );
            case 'bantuan':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Bantuan</h2>
                        <div className="form-group"><label className="form-label">Bantuan Kementrian:</label><input type="text" name="BantuanKementrian" value={formData.BantuanKementrian} onChange={handleChange} className="form-input" /></div>
                        <div className="form-group"><label className="form-label">Bantuan Lainnya:</label><input type="text" name="BantuanLaptopShopee" value={formData.BantuanLaptopShopee} onChange={handleChange} className="form-input" /></div>
                    </div>
                );
            case 'laporan':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Laporan Pertanggung Jawaban</h2>
                        {['LaporanKeuangan2021', 'LaporanKeuangan2022', 'LaporanKeuangan2023', 'LaporanKeuangan2024'].map(key => (
                            <div key={key} className="form-group file-group">
                                <label className="form-label">{normalizeFieldName(key)}:</label>
                                {formData[key] && typeof formData[key] === 'string' && (
                                    <div className="file-info">
                                        <a href={`http://localhost:8000/storage/${formData[key]}`} target="_blank" rel="noopener noreferrer" className="download-link">
                                            <FaFileDownload /> Unduh Dokumen Saat Ini
                                        </a>
                                    </div>
                                )}
                                <input type="file" name={key} onChange={handleFileChange} className="file-input" />
                            </div>
                        ))}
                    </div>
                );
            case 'dokumen':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Dokumen Pendirian</h2>
                        <div className="form-group"><label className="form-label">Nomor Perdes:</label><input type="text" name="NomorPerdes" value={formData.NomorPerdes} onChange={handleChange} className="form-input" /></div>
                        {['Perdes', 'ProfilBUMDesa', 'BeritaAcara', 'AnggaranDasar', 'AnggaranRumahTangga', 'ProgramKerja', 'SK_BUM_Desa'].map(key => (
                            <div key={key} className="form-group file-group">
                                <label className="form-label">{normalizeFieldName(key)}:</label>
                                {formData[key] && typeof formData[key] === 'string' && (
                                    <div className="file-info">
                                        <a href={`http://localhost:8000/storage/${formData[key]}`} target="_blank" rel="noopener noreferrer" className="download-link">
                                            <FaFileDownload /> Unduh Dokumen Saat Ini
                                        </a>
                                    </div>
                                )}
                                <input type="file" name={key} onChange={handleFileChange} className="file-input" required={key === 'SK_BUM_Desa'} />
                            </div>
                        ))}
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="form-page-container">
            <nav className="sidebar">
                <div className="edit-header">
                    <h2 className="dashboard-title">Edit Data</h2>
                    {/* Menggunakan prop onLogout yang dikirim dari BumdesApp */}
                  
                </div>
                {formSections.map(section => (
                    <button 
                        key={section.id} 
                        onClick={() => setActiveSection(section.id)} 
                        className={`sidebar-button ${activeSection === section.id ? 'active' : ''}`}
                    >
                        {section.title}
                    </button>
                ))}
            </nav>
            <form onSubmit={handleUpdate} className="form-content">
                <h2 className="dashboard-title-main">Edit Data BUMDesa: {formData.namabumdesa}</h2>
                {renderSection()}
                
                <button type="submit" disabled={loading} className="submit-button">
                    {loading ? <FaSpinner className="spinner" /> : <FaPaperPlane />}
                    {loading ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}
                </button>
            </form>

            {showPopup && (
                <div className="popup-overlay">
                    <div className={`popup-content ${popupMessage.type}`}>
                        <div className="popup-icon">
                            {popupMessage.type === 'success' ? <FaCheckCircle /> : <FaExclamationCircle />}
                        </div>
                        <p className="popup-text">{popupMessage.text}</p>
                        <button onClick={() => setShowPopup(false)} className="close-popup-btn">
                            Tutup
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BumdesEditDashboard;