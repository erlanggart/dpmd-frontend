import React, { useState, useEffect } from 'react';
import api from '../../../api.js';
import { 
  FaPaperPlane, 
  FaSpinner, 
  FaFileDownload, 
  FaTimes, 
  FaCheckCircle, 
  FaExclamationCircle,
  FaEdit,
  FaSave,
  FaTrash
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';

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

// Enhanced Modal Component
const Modal = ({ show, onClose, title, message, type }) => {
    if (!show) return null;

    const getModalStyles = () => {
        switch (type) {
            case 'error':
                return {
                    overlay: 'bg-red-900/20',
                    container: 'border-red-200 bg-gradient-to-br from-red-50 to-red-100',
                    icon: <FaExclamationCircle className="text-red-600 text-2xl" />,
                    iconBg: 'bg-red-100',
                    button: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                };
            case 'success':
                return {
                    overlay: 'bg-green-900/20',
                    container: 'border-green-200 bg-gradient-to-br from-green-50 to-green-100',
                    icon: <FaCheckCircle className="text-green-600 text-2xl" />,
                    iconBg: 'bg-green-100',
                    button: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                };
            default:
                return {
                    overlay: 'bg-slate-900/20',
                    container: 'border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100',
                    icon: <FaExclamationCircle className="text-slate-600 text-2xl" />,
                    iconBg: 'bg-slate-100',
                    button: 'bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700'
                };
        }
    };

    const styles = getModalStyles();

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${styles.overlay} backdrop-blur-sm`}>
            <div className={`relative max-w-md w-full rounded-3xl shadow-2xl border-2 ${styles.container} p-8`}>
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 p-2 rounded-full bg-white/50 hover:bg-white/80 transition-all duration-200 group"
                >
                    <FaTimes className="text-slate-600 group-hover:rotate-90 transition-transform duration-200" />
                </button>

                <div className={`w-16 h-16 rounded-2xl ${styles.iconBg} flex items-center justify-center mx-auto mb-6 shadow-lg`}>
                    {styles.icon}
                </div>

                <div className="text-center">
                    <h4 className="text-2xl font-bold text-slate-800 mb-4">{title}</h4>
                    <p className="text-slate-600 leading-relaxed mb-8">{message}</p>
                    
                    <button 
                        onClick={onClose} 
                        className={`w-full py-3 px-6 rounded-xl text-white font-semibold ${styles.button} shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300`}
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
};

// Delete Confirmation Modal
const DeleteConfirmModal = ({ show, onClose, onConfirm, loading, bumdesName }) => {
    if (!show) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="relative max-w-md w-full rounded-3xl shadow-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100 p-8">
                <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-6 shadow-lg">
                    <FaTrash className="text-red-600 text-2xl" />
                </div>

                <div className="text-center">
                    <h4 className="text-2xl font-bold text-slate-800 mb-4">Konfirmasi Hapus</h4>
                    <p className="text-slate-600 leading-relaxed mb-2">
                        Apakah Anda yakin ingin menghapus BUMDes:
                    </p>
                    <p className="font-bold text-red-700 mb-8">"{bumdesName}"</p>
                    <p className="text-sm text-red-600 mb-8">
                        Data yang dihapus tidak dapat dikembalikan!
                    </p>
                    
                    <div className="flex gap-4">
                        <button 
                            onClick={onClose} 
                            disabled={loading}
                            className="flex-1 py-3 px-6 rounded-xl text-slate-700 font-semibold bg-gray-200 hover:bg-gray-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50"
                        >
                            Batal
                        </button>
                        <button 
                            onClick={onConfirm} 
                            disabled={loading}
                            className="flex-1 py-3 px-6 rounded-xl text-white font-semibold bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <FaSpinner className="animate-spin" />
                                    Menghapus...
                                </>
                            ) : (
                                <>
                                    <FaTrash />
                                    Hapus
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Enhanced form input component
const FormInput = ({ label, name, type = "text", value, onChange, disabled, required = false, placeholder, options = [] }) => (
    <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {type === 'select' ? (
            <select
                name={name}
                value={value || ''}
                onChange={onChange}
                disabled={disabled}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm disabled:bg-slate-100 disabled:cursor-not-allowed hover:border-slate-300"
            >
                <option value="">Pilih {label}</option>
                {options.map((option, index) => (
                    <option key={index} value={option.value || option}>
                        {option.label || option}
                    </option>
                ))}
            </select>
        ) : type === 'file' ? (
            <div className="relative">
                <input
                    type="file"
                    name={name}
                    onChange={onChange}
                    disabled={disabled}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm disabled:bg-slate-100 disabled:cursor-not-allowed file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <div className="text-xs text-slate-500 mt-1">Maksimal ukuran file: 5MB</div>
            </div>
        ) : type === 'textarea' ? (
            <textarea
                name={name}
                value={value || ''}
                onChange={onChange}
                disabled={disabled}
                placeholder={placeholder}
                rows={4}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm disabled:bg-slate-100 disabled:cursor-not-allowed hover:border-slate-300 resize-none"
            />
        ) : (
            <input
                type={type}
                name={name}
                value={value || ''}
                onChange={onChange}
                disabled={disabled}
                placeholder={placeholder}
                required={required}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm disabled:bg-slate-100 disabled:cursor-not-allowed hover:border-slate-300"
            />
        )}
    </div>
);

const SectionHeader = ({ title, subtitle }) => (
    <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">{title}</h2>
        {subtitle && <p className="text-slate-600">{subtitle}</p>}
        <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mx-auto mt-4"></div>
    </div>
);

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

function BumdesEditDashboard({ initialData, onLogout, onClose, onDelete }) {
    const [formData, setFormData] = useState(initialData);
    const [loading, setLoading] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState({ text: '', type: '' });
    const [activeSection, setActiveSection] = useState('identitas');
    
    // State untuk kecamatan dan desa
    const [kecamatanList, setKecamatanList] = useState([]);
    const [desaList, setDesaList] = useState([]);
    const [selectedKecamatanId, setSelectedKecamatanId] = useState('');
    const [loadingDesa, setLoadingDesa] = useState(false);
    
    // State untuk konfirmasi delete
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Load kecamatan data dan set initial values
    useEffect(() => {
        const fetchKecamatans = async () => {
            try {
                const response = await api.get('/kecamatan');
                const kecamatans = response.data.data || [];
                setKecamatanList(kecamatans);
                
                // Set initial kecamatan jika ada data
                if (initialData.kecamatan) {
                    const foundKecamatan = kecamatans.find(kec => kec.nama === initialData.kecamatan);
                    if (foundKecamatan) {
                        setSelectedKecamatanId(foundKecamatan.id);
                        // Load desa untuk kecamatan ini
                        const desaResponse = await api.get(`/desa/${foundKecamatan.id}`);
                        setDesaList(desaResponse.data.data || []);
                    }
                }
            } catch (error) {
                console.error('Error fetching kecamatans:', error);
                showMessagePopup('Gagal memuat data kecamatan', 'error');
            }
        };

        fetchKecamatans();
    }, [initialData]);

    // Handle kecamatan change
    const handleKecamatanChange = async (e) => {
        const kecamatanId = e.target.value;
        const selectedKecamatan = kecamatanList.find(kec => kec.id == kecamatanId);
        
        setSelectedKecamatanId(kecamatanId);
        setFormData({
            ...formData,
            kecamatan: selectedKecamatan ? selectedKecamatan.nama : '',
            desa: '',
            kode_desa: ''
        });
        
        if (kecamatanId) {
            setLoadingDesa(true);
            try {
                const response = await api.get(`/desa/${kecamatanId}`);
                setDesaList(response.data.data || []);
            } catch (error) {
                console.error('Error fetching desas:', error);
                showMessagePopup('Gagal memuat data desa', 'error');
                setDesaList([]);
            } finally {
                setLoadingDesa(false);
            }
        } else {
            setDesaList([]);
        }
    };

    // Handle desa change
    const handleDesaChange = (e) => {
        const desaId = e.target.value;
        const selectedDesa = desaList.find(desa => desa.id == desaId);
        
        if (selectedDesa) {
            setFormData({
                ...formData,
                desa: selectedDesa.nama,
                kode_desa: selectedDesa.kode
            });
        } else {
            setFormData({
                ...formData,
                desa: '',
                kode_desa: ''
            });
        }
    };

    // Handle delete
    const handleDelete = async () => {
        setDeleting(true);
        try {
            await api.delete(`/bumdes/${formData.id}`);
            showMessagePopup('Data BUMDes berhasil dihapus!', 'success');
            setTimeout(() => {
                setShowDeleteConfirm(false);
                if (onDelete) onDelete(formData.id);
                if (onClose) onClose();
            }, 2000);
        } catch (error) {
            console.error('Error deleting BUMDes:', error);
            showMessagePopup('Gagal menghapus data BUMDes: ' + (error.response?.data?.message || error.message), 'error');
        } finally {
            setDeleting(false);
        }
    };

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
        
        // Pastikan ID selalu dikirim
        dataToSend.append('id', formData.id);
        
        // Kirim semua data yang tidak null/undefined (kecuali file kosong)
        for (const key in formData) {
            const value = formData[key];
            
            // Skip id karena sudah ditambahkan di atas
            if (key === 'id') continue;
            
            if (value !== null && value !== undefined && value !== '') {
                if (value instanceof File) {
                    // Kirim file
                    dataToSend.append(key, value);
                } else if (['Omset2023', 'Laba2023', 'Omset2024', 'Laba2024', 'PenyertaanModal2019', 'PenyertaanModal2020', 'PenyertaanModal2021', 'PenyertaanModal2022', 'PenyertaanModal2023', 'PenyertaanModal2024', 'SumberLain', 'NilaiAset', 'KontribusiTerhadapPADes2021', 'KontribusiTerhadapPADes2022', 'KontribusiTerhadapPADes2023', 'KontribusiTerhadapPADes2024', 'TotalTenagaKerja'].includes(key)) {
                    // Kirim data angka dengan parsing
                    dataToSend.append(key, parseRupiah(value));
                } else {
                    // Kirim data biasa
                    dataToSend.append(key, String(value));
                }
            }
        }
        
        dataToSend.append('_method', 'PUT');

        console.log('BUMDes ID being updated:', formData.id);
        console.log('Kode Desa yang dikirim:', formData.kode_desa);
        console.log('Data yang akan dikirim:', Object.fromEntries(dataToSend.entries()));

        try {
            const response = await api.post(`/bumdes/${formData.id}`, dataToSend, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            showMessagePopup(response.data.message || 'Data berhasil diupdate!', 'success');
            setFormData(response.data.data || formData);
            setLoading(false);
        } catch (error) {
            console.error("Gagal mengupdate data:", error.response?.data?.errors || error.message);
            console.error("Full error response:", error.response?.data);
            console.log("BUMDes ID yang sedang diedit:", formData.id);
            console.log("Kode desa yang dikirim:", formData.kode_desa);
            
            let errorMessage = 'Gagal mengupdate data';
            if (error.response?.data?.errors) {
                const errors = error.response.data.errors;
                const errorFields = Object.keys(errors);
                errorMessage += ': ' + errorFields.map(field => `${field}: ${errors[field][0]}`).join(', ');
            } else if (error.response?.data?.message) {
                errorMessage += ': ' + error.response.data.message;
            }
            
            showMessagePopup(errorMessage, 'error');
            setLoading(false);
        }
    };
    
    // Fungsi untuk merender setiap section form
    const renderSection = () => {
        switch (activeSection) {
            case 'identitas':
                return (
                    <div className="space-y-8">
                        <SectionHeader 
                            title="Identitas BUMDes" 
                            subtitle="Informasi dasar dan lokasi BUMDes"
                        />
                        
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput
                                    label="Kecamatan"
                                    name="kecamatan_id"
                                    type="select"
                                    value={selectedKecamatanId}
                                    onChange={handleKecamatanChange}
                                    options={kecamatanList.map(kec => ({
                                        value: kec.id,
                                        label: kec.nama
                                    }))}
                                    required
                                />
                                
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700">
                                        Desa
                                        <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <select
                                        name="desa_id"
                                        value={desaList.find(desa => desa.nama === formData.desa)?.id || ''}
                                        onChange={handleDesaChange}
                                        disabled={!selectedKecamatanId || loadingDesa}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm disabled:bg-slate-100 disabled:cursor-not-allowed hover:border-slate-300"
                                    >
                                        <option value="">
                                            {loadingDesa ? 'Memuat desa...' : 'Pilih Desa'}
                                        </option>
                                        {desaList.map(desa => (
                                            <option key={desa.id} value={desa.id}>
                                                {desa.nama}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                
                                <FormInput
                                    label="Kode Desa"
                                    name="kode_desa"
                                    value={formData.kode_desa || ''}
                                    onChange={handleChange}
                                    disabled
                                    placeholder="Kode akan terisi otomatis"
                                />
                                
                                {/* Display selected kecamatan and desa */}
                                {formData.kecamatan && (
                                    <div className="md:col-span-2 p-4 bg-green-50 border border-green-200 rounded-xl">
                                        <div className="text-sm font-medium text-green-800">
                                            Lokasi Terpilih:
                                        </div>
                                        <div className="text-green-700 mt-1">
                                            <strong>Kecamatan:</strong> {formData.kecamatan}
                                            {formData.desa && <span className="ml-4"><strong>Desa:</strong> {formData.desa}</span>}
                                            {formData.kode_desa && <span className="ml-4"><strong>Kode:</strong> {formData.kode_desa}</span>}
                                        </div>
                                    </div>
                                )}
                                
                                <FormInput
                                    label="Nama BUMDesa"
                                    name="namabumdesa"
                                    value={formData.namabumdesa || ''}
                                    onChange={handleChange}
                                    required
                                />
                                
                                <div className="md:col-span-2">
                                    <FormInput
                                        label="Alamat BUMDesa"
                                        name="AlamatBumdesa"
                                        value={formData.AlamatBumdesa || ''}
                                        onChange={handleChange}
                                        placeholder="Masukkan alamat lengkap BUMDesa"
                                    />
                                </div>
                                
                                <FormInput
                                    label="No Telepon BUMDesa"
                                    name="TelfonBumdes"
                                    value={formData.TelfonBumdes || ''}
                                    onChange={handleChange}
                                    placeholder="Contoh: 0812-3456-7890"
                                />
                                
                                <FormInput
                                    label="Alamat Email"
                                    name="Alamatemail"
                                    type="email"
                                    value={formData.Alamatemail || ''}
                                    onChange={handleChange}
                                    placeholder="Contoh: bumdes@desa.id"
                                />
                                
                                <FormInput
                                    label="Tahun Pendirian"
                                    name="TahunPendirian"
                                    type="number"
                                    value={formData.TahunPendirian}
                                    onChange={handleChange}
                                    placeholder="Contoh: 2020"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'status':
                return (
                    <div className="space-y-8">
                        <SectionHeader 
                            title="Status BUMDes" 
                            subtitle="Status operasional BUMDes saat ini"
                        />
                        
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput
                                    label="Status 2025"
                                    name="status"
                                    type="select"
                                    value={formData.status}
                                    onChange={handleChange}
                                    options={[
                                        { value: 'aktif', label: 'Aktif' },
                                        { value: 'tidak aktif', label: 'Tidak Aktif' }
                                    ]}
                                />
                                
                                <FormInput
                                    label="Keterangan Tidak Aktif"
                                    name="keterangan_tidak_aktif"
                                    type="select"
                                    value={formData.keterangan_tidak_aktif}
                                    onChange={handleChange}
                                    options={[
                                        { value: 'Ada pengurus, tidak ada usaha', label: 'Ada pengurus, tidak ada usaha' },
                                        { value: 'Tidak ada pengurus, ada usaha', label: 'Tidak ada pengurus, ada usaha' },
                                        { value: 'Tidak ada keduanya', label: 'Tidak ada keduanya' }
                                    ]}
                                />
                            </div>
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
                return (
                    <div className="text-center py-12">
                        <div className="text-slate-500 text-lg">
                            Section ini sedang dalam pengembangan
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            {/* Enhanced Header */}
            <div className="bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-xl p-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                            <FaEdit className="text-white text-xl" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800">Edit Data BUMDes</h1>
                            <p className="text-slate-600">{formData.namabumdesa} - {formData.desa}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setShowDeleteConfirm(true)}
                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-2"
                        >
                            <FaTrash />
                            Hapus
                        </button>
                        
                        {onClose && (
                            <button 
                                onClick={onClose}
                                className="bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                            >
                                Tutup
                            </button>
                        )}
                        
                        {onLogout && (
                            <button 
                                onClick={onLogout}
                                className="bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                            >
                                Keluar
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row">
                {/* Enhanced Sidebar Navigation */}
                <nav className="lg:w-80 bg-white/70 backdrop-blur-xl border-r border-white/20 shadow-xl overflow-y-auto">
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl flex items-center justify-center">
                                <HiSparkles className="text-white text-xl" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Edit Form</h3>
                                <p className="text-sm text-slate-600">Section by Section</p>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            {formSections.map((section, index) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={`w-full text-left p-4 rounded-xl font-medium transition-all duration-300 group ${
                                        activeSection === section.id
                                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg'
                                            : 'text-slate-700 hover:bg-white/80 hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                                            activeSection === section.id
                                                ? 'bg-white/20 text-white'
                                                : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                                        }`}>
                                            {index + 1}
                                        </div>
                                        <span className="flex-1">{section.title}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </nav>

                {/* Enhanced Form Content */}
                <div className="flex-1 flex flex-col">
                    <form onSubmit={handleUpdate} className="flex-1 p-6">
                        <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 min-h-full">
                            <div className="p-8">
                                {renderSection()}
                            </div>
                            
                            {/* Enhanced Save Button Footer */}
                            <div className="border-t border-slate-200/50 p-6 bg-gradient-to-r from-slate-50/50 to-slate-100/50 rounded-b-3xl">
                                <div className="flex justify-center">
                                    <button 
                                        type="submit" 
                                        disabled={loading}
                                        className="group bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-slate-300 disabled:to-slate-400 text-white px-12 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:transform-none disabled:cursor-not-allowed flex items-center gap-3 text-lg"
                                    >
                                        {loading ? (
                                            <>
                                                <FaSpinner className="animate-spin text-xl" />
                                                <span>Menyimpan...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FaSave className="group-hover:scale-110 transition-transform duration-300 text-xl" />
                                                <span>Simpan Perubahan</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* Modal Component */}
            <Modal 
                show={showPopup} 
                onClose={() => setShowPopup(false)} 
                title={popupMessage.type === 'error' ? 'Update Gagal' : 'Update Berhasil'}
                message={popupMessage.text} 
                type={popupMessage.type} 
            />
            
            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                show={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
                loading={deleting}
                bumdesName={formData.namabumdesa}
            />
        </div>
    );
}

export default BumdesEditDashboard;