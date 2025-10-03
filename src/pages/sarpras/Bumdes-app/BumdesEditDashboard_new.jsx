import React, { useState } from 'react';
import api from '../../../Services/api.js';
import { 
  FaPaperPlane, 
  FaSpinner, 
  FaFileDownload, 
  FaTimes, 
  FaCheckCircle, 
  FaExclamationCircle,
  FaEdit,
  FaSave
} from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import { initialFormData } from './BumdesForm';

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
                value={value}
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
                value={value}
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
                value={value}
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
                dataToSend.append(key, value);
            } else if (value !== null && value !== initialValue && !requiredFields.includes(key)) {
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
            localStorage.setItem('bumdesData', JSON.stringify(response.data.data));
        } catch (error) {
            console.error("Gagal mengupdate data:", error.response?.data?.errors || error.message);
            showMessagePopup('Gagal mengupdate data: ' + (error.response?.data?.message || error.message), 'error');
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
                                    label="Kode Desa"
                                    name="kode_desa"
                                    value={formData.kode_desa || ''}
                                    onChange={handleChange}
                                    required
                                />
                                
                                <FormInput
                                    label="Kecamatan"
                                    name="kecamatan"
                                    value={formData.kecamatan || ''}
                                    onChange={handleChange}
                                    required
                                />
                                
                                <FormInput
                                    label="Desa"
                                    name="desa"
                                    value={formData.desa || ''}
                                    onChange={handleChange}
                                    required
                                />
                                
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
                    
                    {onLogout && (
                        <button 
                            onClick={onLogout}
                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                        >
                            Keluar
                        </button>
                    )}
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
        </div>
    );
}

export default BumdesEditDashboard;