import React, { useState, useEffect } from 'react';
import api from '../../../services/api.js';
import { FaPaperPlane, FaSpinner } from 'react-icons/fa';
import './bumdes.css';

const Modal = ({ show, onClose, title, message, type }) => {
    if (!show) {
        return null;
    }

    const modalClass = `modal ${type}`;

    return (
        <div className="modal-overlay">
            <div className={modalClass}>
                <div className="modal-header">
                    <h4 className="modal-title">{title}</h4>
                    <button onClick={onClose} className="modal-close-button">&times;</button>
                </div>
                <div className="modal-body">
                    <p>{message}</p>
                </div>
                <div className="modal-footer">
                    <button onClick={onClose} className="modal-button">Tutup</button>
                </div>
            </div>
        </div>
    );
};

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

const initialFormData = {
    kode_desa: '',
    kecamatan: '',
    desa: '',
    namabumdesa: '',
    status: 'aktif',
    keterangan_tidak_aktif: '',
    NIB: '',
    LKPP: '',
    NPWP: '',
    badanhukum: '',
    NamaPenasihat: '', JenisKelaminPenasihat: '', HPPenasihat: '', NamaPengawas: '', JenisKelaminPengawas: '', HPPengawas: '',
    NamaDirektur: '', JenisKelaminDirektur: '', HPDirektur: '', NamaSekretaris: '', JenisKelaminSekretaris: '', HPSekretaris: '',
    NamaBendahara: '', JenisKelaminBendahara: '', HPBendahara: '', TahunPendirian: '', AlamatBumdesa: '', Alamatemail: '',
    TotalTenagaKerja: '', TelfonBumdes: '', JenisUsaha: '', JenisUsahaUtama: '', JenisUsahaLainnya: '', Omset2023: '', Laba2023: '',
    Omset2024: '', Laba2024: '', PenyertaanModal2019: '', PenyertaanModal2020: '', PenyertaanModal2021: '', PenyertaanModal2022: '',
    PenyertaanModal2023: '', PenyertaanModal2024: '', SumberLain: '', JenisAset: '', NilaiAset: '', KerjasamaPihakKetiga: '',
    'TahunMulai-TahunBerakhir': '', KontribusiTerhadapPADes2021: '', KontribusiTerhadapPADes2022: '', KontribusiTerhadapPADes2023: '',
    KontribusiTerhadapPADes2024: '', Ketapang2024: '', Ketapang2025: '', BantuanKementrian: '', BantuanLaptopShopee: '',
    NomorPerdes: '', DesaWisata: '', // Field tambahan dari backend
    LaporanKeuangan2021: null, LaporanKeuangan2022: null, LaporanKeuangan2023: null, LaporanKeuangan2024: null,
    Perdes: null, ProfilBUMDesa: null, BeritaAcara: null, AnggaranDasar: null, AnggaranRumahTangga: null,
    ProgramKerja: null, SK_BUM_Desa: null,
};

const formatRupiah = (angka) => {
    let numberString = String(angka).replace(/[^,\d]/g, "").toString();
    if (!numberString) return "";
    return "Rp. " + numberString.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseRupiah = (rupiah) => {
    return parseInt(String(rupiah).replace(/[^0-9]/g, ''), 10) || 0;
};

function BumdesForm() {
    const [formData, setFormData] = useState(initialFormData);
    const [activeSection, setActiveSection] = useState('identitas');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [modalShow, setModalShow] = useState(false);

    const [allIdentitasData, setAllIdentitasData] = useState([]);
    const [kecamatanList, setKecamatanList] = useState([]);
    const [desaList, setDesaList] = useState([]);
    const [filteredDesaList, setFilteredDesaList] = useState([]);

    // Fetch data kecamatan
    useEffect(() => {
        const fetchKecamatan = async () => {
            try {
                const response = await api.get('/kecamatans');
                const kecamatanData = response.data && Array.isArray(response.data.data) ? response.data.data : [];
                setKecamatanList(kecamatanData);
            } catch (error) {
                console.error('Gagal mengambil data kecamatan:', error);
                setMessage({ text: 'Gagal memuat data kecamatan. Coba refresh halaman.', type: 'error' });
                setModalShow(true);
            }
        };
        fetchKecamatan();
    }, []);

    // Fetch data desa
    useEffect(() => {
        const fetchDesa = async () => {
            try {
                const response = await api.get('/desas');
                const desaData = response.data && Array.isArray(response.data.data) ? response.data.data : [];
                setDesaList(desaData);
            } catch (error) {
                console.error('Gagal mengambil data desa:', error);
                setMessage({ text: 'Gagal memuat data desa. Coba refresh halaman.', type: 'error' });
                setModalShow(true);
            }
        };
        fetchDesa();
    }, []);

    // Filter desa berdasarkan kecamatan yang dipilih
    useEffect(() => {
        if (formData.kecamatan && desaList.length > 0) {
            // Cari kecamatan yang dipilih berdasarkan nama
            const selectedKecamatan = kecamatanList.find(kec => kec.nama === formData.kecamatan);
            if (selectedKecamatan) {
                const filtered = desaList.filter(desa => desa.kecamatan_id === selectedKecamatan.id);
                setFilteredDesaList(filtered);
            }
        } else {
            setFilteredDesaList([]);
        }
    }, [formData.kecamatan, desaList, kecamatanList]);

    useEffect(() => {
        const savedData = localStorage.getItem('bumdesFormData');
        if (savedData) {
            const parsedData = JSON.parse(savedData);
            setFormData(prev => ({
                ...prev,
                ...parsedData,
            }));
            const submittedDesas = JSON.parse(localStorage.getItem('submittedDesas')) || [];
            if (submittedDesas.includes(parsedData.kode_desa)) {
                setHasSubmitted(true);
                setMessage({ text: `Desa ini (${parsedData.desa}) sudah mengisi form. Anda tidak bisa mengisinya lagi.`, type: 'info' });
                setModalShow(true);
            }
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.includes('Omset') || name.includes('Laba') || name.includes('Modal') || name.includes('Kontribusi') || name.includes('NilaiAset') || name.includes('SumberLain')) {
            setFormData({ ...formData, [name]: parseRupiah(value) });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handleKecamatanChange = (e) => {
        const selectedKecamatan = e.target.value;
        setFormData(prev => ({
            ...prev,
            kecamatan: selectedKecamatan,
            desa: '',
            kode_desa: '',
        }));
    };

    const handleDesaChange = (e) => {
        const selectedDesaId = e.target.value;
        const selectedDesa = desaList.find(d => d.id.toString() === selectedDesaId);

        if (selectedDesa) {
            setFormData(prev => ({
                ...prev,
                desa: selectedDesa.nama,
                kode_desa: selectedDesa.kode,
            }));
            
            // Check if this desa has already submitted
            const submittedDesas = JSON.parse(localStorage.getItem('submittedDesas')) || [];
            if (submittedDesas.includes(selectedDesa.kode)) {
                setHasSubmitted(true);
                setMessage({ text: `Desa ini (${selectedDesa.nama}) sudah mengisi form. Anda tidak bisa mengisinya lagi.`, type: 'info' });
                setModalShow(true);
            } else {
                setHasSubmitted(false);
            }
        }
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.files[0] });
    };

    const handleNext = () => {
        if (activeSection === 'identitas') {
            if (!formData.namabumdesa || !formData.kecamatan || !formData.kode_desa) {
                setMessage({ text: 'Harap lengkapi Nama BUMDesa, Kecamatan, dan Desa sebelum melanjutkan.', type: 'error' });
                setModalShow(true);
                return;
            }
        }
        
        const currentIndex = formSections.findIndex(section => section.id === activeSection);
        if (currentIndex < formSections.length - 1) {
            const nonFileFormData = Object.fromEntries(
                Object.entries(formData).filter(([key, value]) => !(value instanceof File))
            );
            localStorage.setItem('bumdesFormData', JSON.stringify(nonFileFormData));
            
            setActiveSection(formSections[currentIndex + 1].id);
            setMessage({ text: '', type: '' });
            setModalShow(false);
        }
    };

    const handlePrev = () => {
        const currentIndex = formSections.findIndex(section => section.id === activeSection);
        if (currentIndex > 0) {
            setActiveSection(formSections[currentIndex - 1].id);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ text: '', type: '' });
        setModalShow(false);

        const savedDataFromLocalStorage = JSON.parse(localStorage.getItem('bumdesFormData')) || {};

        const finalData = { ...savedDataFromLocalStorage };
        for (const key in formData) {
            if (formData[key] instanceof File) {
                finalData[key] = formData[key];
            }
        }

        const dataToSend = new FormData();
        for (const key in finalData) {
            if (finalData[key] !== null && finalData[key] !== undefined) {
                if (finalData[key] instanceof File) {
                    dataToSend.append(key, finalData[key], finalData[key].name);
                } else {
                    dataToSend.append(key, finalData[key]);
                }
            }
        }

        try {
            // PERBAIKAN: Menggunakan api.post tanpa prefix '/api' karena sudah ada di baseURL
            const response = await api.post('/bumdes', dataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            const submittedDesas = JSON.parse(localStorage.getItem('submittedDesas')) || [];
            submittedDesas.push(finalData.kode_desa);
            localStorage.setItem('submittedDesas', JSON.stringify(submittedDesas));

            localStorage.removeItem('bumdesFormData');
            setFormData(initialFormData);
            setActiveSection('identitas');
            setHasSubmitted(true);
            setMessage({ text: response.data.message, type: 'success' });
            setModalShow(true);

        } catch (error) {
            console.error(error);
            const errorMessage = error.response?.data?.message || error.message;
            setMessage({ text: 'Gagal mengirim data: ' + errorMessage, type: 'error' });
            setModalShow(true);
        } finally {
            setLoading(false);
        }
    };
    
    const isLastSection = activeSection === formSections[formSections.length - 1].id;

    const renderSection = () => {
        switch (activeSection) {
            case 'identitas':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Identitas BUMDes</h2>
                        <div className="form-group">
                            <label className="form-label">Nama BUMDesa:</label>
                            <input type="text" name="namabumdesa" value={formData.namabumdesa} onChange={handleChange} className="form-input" disabled={hasSubmitted} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Kecamatan:</label>
                            <select name="kecamatan" value={formData.kecamatan} onChange={handleKecamatanChange} className="form-select" disabled={hasSubmitted}>
                                <option value="">Pilih Kecamatan</option>
                                {kecamatanList.map(kec => (
                                    <option key={kec.id} value={kec.nama}>{kec.nama}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Desa:</label>
                            <select name="desa" value={formData.desa ? filteredDesaList.find(d => d.nama === formData.desa)?.id || '' : ''} onChange={handleDesaChange} className="form-select" disabled={!formData.kecamatan || hasSubmitted}>
                                <option value="">Pilih Desa</option>
                                {filteredDesaList.map(desa => (
                                    <option key={desa.id} value={desa.id}>{desa.nama}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Kode Desa:</label>
                            <input type="text" name="kode_desa" value={formData.kode_desa} readOnly className="form-input" placeholder="Kode Desa akan terisi otomatis" disabled={hasSubmitted} />
                        </div>
                    </div>
                );
            case 'status':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Status BUMDesa</h2>
                        <label className="form-group">Status 2025:
                            <select name="status" value={formData.status} onChange={handleChange} className="form-select" disabled={hasSubmitted}>
                                <option value="aktif">Aktif</option>
                                <option value="tidak aktif">Tidak Aktif</option>
                            </select>
                        </label>
                        <label className="form-group">Keterangan Tidak Aktif:
                            <select name="keterangan_tidak_aktif" value={formData.keterangan_tidak_aktif} onChange={handleChange} className="form-select" disabled={hasSubmitted}>
                                <option value="">-</option>
                                <option value="Ada pengurus, tidak ada usaha">Ada pengurus, tidak ada usaha</option>
                                <option value="Tidak ada pengurus, ada usaha">Tidak ada pengurus, ada usaha</option>
                                <option value="Tidak ada keduanya">Tidak ada keduanya</option>
                            </select>
                        </label>
                    </div>
                );
            case 'legalitas':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Legalitas</h2>
                        <label className="form-group">NIB: <input type="text" name="NIB" value={formData.NIB} onChange={handleChange} placeholder="masukan nomor NIB.." className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">LKPP: <input type="text" name="LKPP" value={formData.LKPP} onChange={handleChange} placeholder="masukan nomor LKPP.." className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">NPWP: <input type="text" name="NPWP" value={formData.NPWP} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">Status Badan Hukum:
                            <select name="badanhukum" value={formData.badanhukum} onChange={handleChange} className="form-select" disabled={hasSubmitted}>
                                <option value="">-</option>
                                <option value="Belum Melakukan Proses">Belum Melakukan Proses</option>
                                <option value="Nama Terverifikasi">Nama Terverifikasi</option>
                                <option value="Perbaikan Dokumen">Perbaikan Dokumen</option>
                                <option value="Terbit Sertifikat Badan Hukum">Terbit Sertifikat Badan Hukum</option>
                            </select>
                        </label>
                    </div>
                );
            case 'pengurus':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Profil Pengurus</h2>
                        {Object.keys(initialFormData).filter(key => key.startsWith('Nama') || key.startsWith('JenisKelamin') || key.startsWith('HP')).map(key => (
                            <label key={key} className="form-group">
                                {key.replace(/([A-Z])/g, ' $1').trim().replace(/_/g, ' ')}:
                                {key.startsWith('JenisKelamin') ? (
                                    <select name={key} value={formData[key]} onChange={handleChange} className="form-select" disabled={hasSubmitted}>
                                        <option value="">-</option>
                                        <option value="laki-laki">Laki-Laki</option>
                                        <option value="perempuan">Perempuan</option>
                                    </select>
                                ) : (
                                    <input type="text" name={key} value={formData[key] || ''} onChange={handleChange} className="form-input" disabled={hasSubmitted} />
                                )}
                            </label>
                        ))}
                    </div>
                );
            case 'organisasi':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Profil Organisasi BUMDesa</h2>
                        <label className="form-group">Tahun Pendirian: <input type="text" name="TahunPendirian" value={formData.TahunPendirian} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">Alamat Bumdesa: <input type="text" name="AlamatBumdesa" value={formData.AlamatBumdesa} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">Alamat email: <input type="text" name="Alamatemail" value={formData.Alamatemail} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">Total Tenaga Kerja: <input type="text" name="TotalTenagaKerja" value={formData.TotalTenagaKerja} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">No Telfon BUMDesa: <input type="text" name="TelfonBumdes" value={formData.TelfonBumdes} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                    </div>
                );
            case 'usaha':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Usaha BUMDesa</h2>
                        <label className="form-group">Jenis Usaha:
                            <select name="JenisUsaha" value={formData.JenisUsaha} onChange={handleChange} className="form-select" disabled={hasSubmitted}>
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
                        </label>
                        <label className="form-group">Keterangan Jenis Usaha Utama: <input type="text" name="JenisUsahaUtama" value={formData.JenisUsahaUtama} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">Jenis Usaha Lainnya: <input type="text" name="JenisUsahaLainnya" value={formData.JenisUsahaLainnya} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">Omset 2023: <input type="text" name="Omset2023" value={formatRupiah(formData.Omset2023)} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">Laba 2023: <input type="text" name="Laba2023" value={formatRupiah(formData.Laba2023)} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">Omset 2024: <input type="text" name="Omset2024" value={formatRupiah(formData.Omset2024)} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">Laba 2024: <input type="text" name="Laba2024" value={formatRupiah(formData.Laba2024)} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                    </div>
                );
            case 'permodalan':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Permodalan dan Aset</h2>
                        <label className="form-group">Penyertaan Modal 2019: <input type="text" name="PenyertaanModal2019" value={formatRupiah(formData.PenyertaanModal2019)} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">Penyertaan Modal 2020: <input type="text" name="PenyertaanModal2020" value={formatRupiah(formData.PenyertaanModal2020)} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">Penyertaan Modal 2021: <input type="text" name="PenyertaanModal2021" value={formatRupiah(formData.PenyertaanModal2021)} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">Penyertaan Modal 2022: <input type="text" name="PenyertaanModal2022" value={formatRupiah(formData.PenyertaanModal2022)} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">Penyertaan Modal 2023: <input type="text" name="PenyertaanModal2023" value={formatRupiah(formData.PenyertaanModal2023)} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">Penyertaan Modal 2024: <input type="text" name="PenyertaanModal2024" value={formatRupiah(formData.PenyertaanModal2024)} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">Modal dari Sumber Lain: <input type="text" name="SumberLain" value={formatRupiah(formData.SumberLain)} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">Jenis Aset: <input type="text" name="JenisAset" value={formData.JenisAset} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">Nilai Aset: <input type="text" name="NilaiAset" value={formatRupiah(formData.NilaiAset)} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                    </div>
                );
            case 'kemitraan':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Kemitraan/Kerjasama</h2>
                        <label className="form-group">Kemitraan/Kerjasama Pihak Ketiga: <input type="text" name="KerjasamaPihakKetiga" value={formData.KerjasamaPihakKetiga} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">Tahun Mulai-Tahun Berakhir: <input type="text" name="TahunMulai-TahunBerakhir" value={formData['TahunMulai-TahunBerakhir']} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                    </div>
                );
            case 'kontribusi':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Kontribusi PADES</h2>
                        <label className="form-group">Kontribusi PADes 2021: <input type="text" name="KontribusiTerhadapPADes2021" value={formatRupiah(formData.KontribusiTerhadapPADes2021)} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">Kontribusi PADes 2022: <input type="text" name="KontribusiTerhadapPADes2022" value={formatRupiah(formData.KontribusiTerhadapPADes2022)} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">Kontribusi PADes 2023: <input type="text" name="KontribusiTerhadapPADes2023" value={formatRupiah(formData.KontribusiTerhadapPADes2023)} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">Kontribusi PADes 2024: <input type="text" name="KontribusiTerhadapPADes2024" value={formatRupiah(formData.KontribusiTerhadapPADes2024)} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                    </div>
                );
            case 'peran':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Peran BUMDesa pada Program Pemerintah</h2>
                        <label className="form-group">Peran Program Ketahanan Pangan 2024:
                            <select name="Ketapang2024" value={formData.Ketapang2024} onChange={handleChange} className="form-select" disabled={hasSubmitted}>
                                <option value="">-</option>
                                <option value="Pengelola">Pengelola</option>
                                <option value="Distribusi">Distribusi</option>
                                <option value="Pemasaran">Pemasaran</option>
                                <option value="tidakadaperan">Tidak Ada Peran</option>
                            </select>
                        </label>
                        <label className="form-group">Peran Program Ketahanan Pangan 2025:
                            <select name="Ketapang2025" value={formData.Ketapang2025} onChange={handleChange} className="form-select" disabled={hasSubmitted}>
                                <option value="">-</option>
                                <option value="Pengelola">Pengelola</option>
                                <option value="Distribusi">Distribusi</option>
                                <option value="Pemasaran">Pemasaran</option>
                                <option value="tidakadaperan">Tidak Ada Peran</option>
                            </select>
                        </label>
                        <label className="form-group">Peran Pada Desa Wisata:
                            <select name="DesaWisata" value={formData.DesaWisata} onChange={handleChange} className="form-select" disabled={hasSubmitted}>
                                <option value="">-</option>
                                <option value="PengelolaUtama">Pengelola Utama</option>
                                <option value="Pengelola Pendukung">Pengelola Pendukung</option>
                            </select>
                        </label>
                    </div>
                );
            case 'bantuan':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Bantuan</h2>
                        <label className="form-group">Bantuan Kementrian: <input type="text" name="BantuanKementrian" value={formData.BantuanKementrian} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group">Bantuan Lainnya: <input type="text" name="BantuanLaptopShopee" value={formData.BantuanLaptopShopee} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                    </div>
                );
            case 'laporan':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Laporan Pertanggung Jawaban</h2>
                        <label className="form-group file-group">Laporan Keuangan 2021 (Maks: 5MB): <input type="file" name="LaporanKeuangan2021" onChange={handleFileChange} className="file-input" disabled={hasSubmitted} /></label>
                        <label className="form-group file-group">Laporan Keuangan 2022 (Maks: 5MB): <input type="file" name="LaporanKeuangan2022" onChange={handleFileChange} className="file-input" disabled={hasSubmitted} /></label>
                        <label className="form-group file-group">Laporan Keuangan 2023 (Maks: 5MB): <input type="file" name="LaporanKeuangan2023" onChange={handleFileChange} className="file-input" disabled={hasSubmitted} /></label>
                        <label className="form-group file-group">Laporan Keuangan 2024 (Maks: 5MB): <input type="file" name="LaporanKeuangan2024" onChange={handleFileChange} className="file-input" disabled={hasSubmitted} /></label>
                    </div>
                );
            case 'dokumen':
                return (
                    <div className="form-section">
                        <h2 className="form-section-title">Dokumen Pendirian</h2>
                        <label className="form-group">Nomor Perdes: <input type="text" name="NomorPerdes" value={formData.NomorPerdes} onChange={handleChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group file-group">Perdes (Maks: 5MB): <input type="file" name="Perdes" onChange={handleFileChange} className="file-input" disabled={hasSubmitted} /></label>
                        <label className="form-group file-group">Profil BUM Desa (Maks: 5MB): <input type="file" name="ProfilBUMDesa" onChange={handleFileChange} className="file-input" disabled={hasSubmitted} /></label>
                        <label className="form-group file-group">Berita Acara (Maks: 5MB): <input type="file" name="BeritaAcara" onChange={handleFileChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group file-group">Anggaran Dasar (Maks: 5MB): <input type="file" name="AnggaranDasar" onChange={handleFileChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group file-group">Anggaran Rumah Tangga (Maks: 5MB): <input type="file" name="AnggaranRumahTangga" onChange={handleFileChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group file-group">Program Kerja (Maks: 5MB): <input type="file" name="ProgramKerja" onChange={handleFileChange} className="form-input" disabled={hasSubmitted} /></label>
                        <label className="form-group file-group">SK BUM Desa (Maks: 5MB): <input type="file" name="SK_BUM_Desa" onChange={handleFileChange} className="form-input" disabled={hasSubmitted} /></label>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="form-page-container">
            <nav className="sidebar">
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
            <form onSubmit={isLastSection ? handleSubmit : (e) => e.preventDefault()} className="form-content">
                {renderSection()}
                
                <Modal 
                    show={modalShow} 
                    onClose={() => setModalShow(false)} 
                    title={message.type === 'error' ? 'Validasi Gagal' : (message.type === 'info' ? 'Informasi' : 'Berhasil')}
                    message={message.text} 
                    type={message.type} 
                />

                <div className="form-navigation">
                    {activeSection !== 'identitas' && (
                        <button type="button" onClick={handlePrev} className="nav-button-prev-button" disabled={loading || hasSubmitted}>
                            Kembali
                        </button>
                    )}
                    {isLastSection ? (
                        <button type="submit" disabled={loading || hasSubmitted} className="submit-button">
                            {loading ? <FaSpinner className="spinner" /> : <FaPaperPlane />}
                            {loading ? 'Mengirim...' : 'Submit'}
                        </button>
                    ) : (
                        <button type="button" onClick={handleNext} disabled={loading || hasSubmitted} className="nav-button-next-button">
                            Next
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}

export { initialFormData };
export default BumdesForm;