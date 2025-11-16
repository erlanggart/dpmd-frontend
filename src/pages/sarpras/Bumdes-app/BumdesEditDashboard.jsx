import React, { useState, useEffect } from 'react';
import api from '../../../api.js';
import API_CONFIG from '../../../config/api';
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
                const response = await api.get('/kecamatans');
                const kecamatans = response.data.data || [];
                setKecamatanList(kecamatans);
                
                // Set initial kecamatan jika ada data
                if (initialData.kecamatan) {
                    const foundKecamatan = kecamatans.find(kec => kec.nama_kecamatan === initialData.kecamatan);
                    if (foundKecamatan) {
                        setSelectedKecamatanId(foundKecamatan.id_kecamatan);
                        // Load desa untuk kecamatan ini
                        const desaResponse = await api.get(`/desas/kecamatan/${foundKecamatan.id_kecamatan}`);
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
        const selectedKecamatan = kecamatanList.find(kec => kec.id_kecamatan == kecamatanId);
        
        setSelectedKecamatanId(kecamatanId);
        setFormData({
            ...formData,
            kecamatan: selectedKecamatan ? selectedKecamatan.nama_kecamatan : '',
            desa: '',
            kode_desa: ''
        });
        
        if (kecamatanId) {
            setLoadingDesa(true);
            try {
                const response = await api.get(`/desas/kecamatan/${kecamatanId}`);
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
        const selectedDesa = desaList.find(desa => desa.id_desa == desaId);
        
        if (selectedDesa) {
            setFormData({
                ...formData,
                desa: selectedDesa.nama_desa,
                kode_desa: selectedDesa.kode_desa
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

        try {
            // STEP 1: Prepare non-file data (JSON)
            const dataOnly = {};
            const fileFields = {};
            
            for (const key in formData) {
                // Skip 'id' field as it's already in the URL
                if (key === 'id') continue;
                
                const value = formData[key];
                
                if (value instanceof File) {
                    // Collect files for separate upload
                    fileFields[key] = value;
                } else if (value !== null && value !== undefined && value !== '') {
                    // Handle numeric fields that need parsing
                    if (['Omset2023', 'Laba2023', 'Omset2024', 'Laba2024', 'PenyertaanModal2019', 'PenyertaanModal2020', 'PenyertaanModal2021', 'PenyertaanModal2022', 'PenyertaanModal2023', 'PenyertaanModal2024', 'SumberLain', 'NilaiAset', 'KontribusiTerhadapPADes2021', 'KontribusiTerhadapPADes2022', 'KontribusiTerhadapPADes2023', 'KontribusiTerhadapPADes2024', 'TotalTenagaKerja'].includes(key)) {
                        dataOnly[key] = parseRupiah(value);
                    } else {
                        dataOnly[key] = value;
                    }
                }
            }

            console.log('🔄 Updating BUMDes ID:', formData.id);
            console.log('📦 Data to send:', dataOnly);
            console.log('📁 Files to upload:', Object.keys(fileFields));

            // STEP 2: Update non-file data via PUT
            const response = await api.put(`/bumdes/${formData.id}`, dataOnly, {
                headers: { 'Content-Type': 'application/json' }
            });

            console.log('✅ Update response:', response.data);

            // STEP 3: Upload files one by one if any
            const fileFieldNames = Object.keys(fileFields);
            
            if (fileFieldNames.length > 0) {
                let uploadedCount = 0;
                let failedFiles = [];
                
                for (const fieldName of fileFieldNames) {
                    try {
                        const fileData = new FormData();
                        fileData.append('file', fileFields[fieldName]);
                        fileData.append('bumdes_id', formData.id);
                        fileData.append('field_name', fieldName);

                        const uploadResponse = await api.post('/bumdes/upload-file', fileData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                        
                        uploadedCount++;
                        console.log(`✅ File uploaded: ${fieldName}`, uploadResponse.data);
                        
                        // Update formData with the new file path from server
                        if (uploadResponse.data.data && uploadResponse.data.data.file_path) {
                            setFormData(prev => ({
                                ...prev,
                                [fieldName]: uploadResponse.data.data.file_path
                            }));
                        }
                    } catch (fileError) {
                        console.error(`❌ Failed to upload ${fieldName}:`, fileError);
                        failedFiles.push(fieldName);
                        // Continue with other files even if one fails
                    }
                }
                
                console.log(`📁 Uploaded ${uploadedCount}/${fileFieldNames.length} files`);
                
                if (failedFiles.length > 0) {
                    showMessagePopup(
                        `Data berhasil diupdate! Namun ${failedFiles.length} file gagal diupload: ${failedFiles.join(', ')}`, 
                        'warning'
                    );
                } else if (uploadedCount > 0) {
                    showMessagePopup(
                        `Data dan ${uploadedCount} file berhasil diupdate!`, 
                        'success'
                    );
                }
            } else {
                showMessagePopup(response.data.message || 'Data berhasil diupdate!', 'success');
            }
            
            // Refresh data from server to get updated file paths
            try {
                const refreshResponse = await api.get(`/bumdes/${formData.id}`);
                if (refreshResponse.data.data) {
                    setFormData(refreshResponse.data.data);
                }
            } catch (refreshError) {
                console.warn('Could not refresh data:', refreshError);
            }
            
            setLoading(false);
        } catch (error) {
            console.error("❌ Gagal mengupdate data:", error.response?.data?.errors || error.message);
            console.error("Full error response:", error.response?.data);
            
            let errorMessage = 'Gagal mengupdate data';
            if (error.response?.data?.errors) {
                const errors = error.response.data.errors;
                const errorFields = Object.keys(errors);
                errorMessage += ': ' + errorFields.map(field => `${field}: ${errors[field][0]}`).join(', ');
            } else if (error.response?.data?.message) {
                errorMessage += ': ' + error.response.data.message;
            } else if (error.message) {
                errorMessage += ': ' + error.message;
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
                                        value: kec.id_kecamatan,
                                        label: kec.nama_kecamatan
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
                                        value={desaList.find(desa => desa.nama_desa === formData.desa)?.id_desa || ''}
                                        onChange={handleDesaChange}
                                        disabled={!selectedKecamatanId || loadingDesa}
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 bg-white/80 backdrop-blur-sm disabled:bg-slate-100 disabled:cursor-not-allowed hover:border-slate-300"
                                    >
                                        <option value="">
                                            {loadingDesa ? 'Memuat desa...' : 'Pilih Desa'}
                                        </option>
                                        {desaList.map(desa => (
                                            <option key={desa.id_desa} value={desa.id_desa}>
                                                {desa.nama_desa}
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
                                    value={formData.TahunPendirian || ''}
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
                                    value={formData.status || ''}
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
                                    value={formData.keterangan_tidak_aktif || ''}
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
                    <div className="space-y-8">
                        <SectionHeader 
                            title="Legalitas" 
                            subtitle="Dokumen legal dan status badan hukum BUMDes"
                        />
                        
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput
                                    label="NIB (Nomor Induk Berusaha)"
                                    name="NIB"
                                    value={formData.NIB || ''}
                                    onChange={handleChange}
                                    placeholder="Masukkan nomor NIB"
                                />
                                
                                <FormInput
                                    label="LKPP (Lembaga Kebijakan Pengadaan Barang/Jasa Pemerintah)"
                                    name="LKPP"
                                    value={formData.LKPP || ''}
                                    onChange={handleChange}
                                    placeholder="Masukkan nomor LKPP"
                                />
                                
                                <FormInput
                                    label="NPWP"
                                    name="NPWP"
                                    value={formData.NPWP || ''}
                                    onChange={handleChange}
                                    placeholder="Masukkan nomor NPWP"
                                />
                                
                                <FormInput
                                    label="Status Badan Hukum"
                                    name="badanhukum"
                                    type="select"
                                    value={formData.badanhukum || ''}
                                    onChange={handleChange}
                                    options={[
                                        { value: 'Belum Melakukan Proses', label: 'Belum Melakukan Proses' },
                                        { value: 'Nama Terverifikasi', label: 'Nama Terverifikasi' },
                                        { value: 'Perbaikan Dokumen', label: 'Perbaikan Dokumen' },
                                        { value: 'Terbit Sertifikat Badan Hukum', label: 'Terbit Sertifikat Badan Hukum' }
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'pengurus':
                return (
                    <div className="space-y-8">
                        <SectionHeader 
                            title="Profil Pengurus" 
                            subtitle="Informasi lengkap pengurus BUMDes"
                        />
                        
                        {/* Penasihat */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                Penasihat
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormInput
                                    label="Nama Penasihat"
                                    name="NamaPenasihat"
                                    value={formData.NamaPenasihat || ''}
                                    onChange={handleChange}
                                />
                                <FormInput
                                    label="Jenis Kelamin"
                                    name="JenisKelaminPenasihat"
                                    type="select"
                                    value={formData.JenisKelaminPenasihat || ''}
                                    onChange={handleChange}
                                    options={[
                                        { value: 'laki-laki', label: 'Laki-Laki' },
                                        { value: 'perempuan', label: 'Perempuan' }
                                    ]}
                                />
                                <FormInput
                                    label="No. HP"
                                    name="HPPenasihat"
                                    value={formData.HPPenasihat || ''}
                                    onChange={handleChange}
                                    placeholder="08xxxxxxxxxx"
                                />
                            </div>
                        </div>

                        {/* Pengawas */}
                        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                Pengawas
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormInput
                                    label="Nama Pengawas"
                                    name="NamaPengawas"
                                    value={formData.NamaPengawas || ''}
                                    onChange={handleChange}
                                />
                                <FormInput
                                    label="Jenis Kelamin"
                                    name="JenisKelaminPengawas"
                                    type="select"
                                    value={formData.JenisKelaminPengawas || ''}
                                    onChange={handleChange}
                                    options={[
                                        { value: 'laki-laki', label: 'Laki-Laki' },
                                        { value: 'perempuan', label: 'Perempuan' }
                                    ]}
                                />
                                <FormInput
                                    label="No. HP"
                                    name="HPPengawas"
                                    value={formData.HPPengawas || ''}
                                    onChange={handleChange}
                                    placeholder="08xxxxxxxxxx"
                                />
                            </div>
                        </div>

                        {/* Direktur */}
                        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-100">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                                Direktur
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormInput
                                    label="Nama Direktur"
                                    name="NamaDirektur"
                                    value={formData.NamaDirektur || ''}
                                    onChange={handleChange}
                                />
                                <FormInput
                                    label="Jenis Kelamin"
                                    name="JenisKelaminDirektur"
                                    type="select"
                                    value={formData.JenisKelaminDirektur || ''}
                                    onChange={handleChange}
                                    options={[
                                        { value: 'laki-laki', label: 'Laki-Laki' },
                                        { value: 'perempuan', label: 'Perempuan' }
                                    ]}
                                />
                                <FormInput
                                    label="No. HP"
                                    name="HPDirektur"
                                    value={formData.HPDirektur || ''}
                                    onChange={handleChange}
                                    placeholder="08xxxxxxxxxx"
                                />
                            </div>
                        </div>

                        {/* Sekretaris */}
                        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 border border-teal-100">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                                Sekretaris
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormInput
                                    label="Nama Sekretaris"
                                    name="NamaSekretaris"
                                    value={formData.NamaSekretaris || ''}
                                    onChange={handleChange}
                                />
                                <FormInput
                                    label="Jenis Kelamin"
                                    name="JenisKelaminSekretaris"
                                    type="select"
                                    value={formData.JenisKelaminSekretaris || ''}
                                    onChange={handleChange}
                                    options={[
                                        { value: 'laki-laki', label: 'Laki-Laki' },
                                        { value: 'perempuan', label: 'Perempuan' }
                                    ]}
                                />
                                <FormInput
                                    label="No. HP"
                                    name="HPSekretaris"
                                    value={formData.HPSekretaris || ''}
                                    onChange={handleChange}
                                    placeholder="08xxxxxxxxxx"
                                />
                            </div>
                        </div>

                        {/* Bendahara */}
                        <div className="bg-gradient-to-br from-rose-50 to-red-50 rounded-2xl p-6 border border-rose-100">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <div className="w-2 h-2 bg-rose-500 rounded-full"></div>
                                Bendahara
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormInput
                                    label="Nama Bendahara"
                                    name="NamaBendahara"
                                    value={formData.NamaBendahara || ''}
                                    onChange={handleChange}
                                />
                                <FormInput
                                    label="Jenis Kelamin"
                                    name="JenisKelaminBendahara"
                                    type="select"
                                    value={formData.JenisKelaminBendahara || ''}
                                    onChange={handleChange}
                                    options={[
                                        { value: 'laki-laki', label: 'Laki-Laki' },
                                        { value: 'perempuan', label: 'Perempuan' }
                                    ]}
                                />
                                <FormInput
                                    label="No. HP"
                                    name="HPBendahara"
                                    value={formData.HPBendahara || ''}
                                    onChange={handleChange}
                                    placeholder="08xxxxxxxxxx"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'organisasi':
                return (
                    <div className="space-y-8">
                        <SectionHeader 
                            title="Profil Organisasi BUMDesa" 
                            subtitle="Informasi sumber daya manusia BUMDes"
                        />
                        
                        <div className="bg-gradient-to-br from-slate-50 to-zinc-50 rounded-2xl p-6 border border-slate-100">
                            <FormInput
                                label="Total Tenaga Kerja"
                                name="TotalTenagaKerja"
                                type="number"
                                value={formData.TotalTenagaKerja || ''}
                                onChange={handleChange}
                                placeholder="Jumlah total pegawai"
                            />
                        </div>
                    </div>
                );
            case 'usaha':
                return (
                    <div className="space-y-8">
                        <SectionHeader 
                            title="Usaha BUMDes" 
                            subtitle="Jenis dan detail usaha yang dijalankan"
                        />
                        
                        <div className="bg-gradient-to-br from-violet-50 to-purple-50 rounded-2xl p-6 border border-violet-100">
                            <div className="space-y-6">
                                <FormInput
                                    label="Jenis Usaha"
                                    name="JenisUsaha"
                                    type="select"
                                    value={formData.JenisUsaha || ''}
                                    onChange={handleChange}
                                    options={[
                                        { value: 'BudidayadanPertambangan', label: 'Budidaya dan Pertambangan' },
                                        { value: 'BudidayaPertanian', label: 'Budidaya Pertanian' },
                                        { value: 'BudidayaPerikanan', label: 'Budidaya Perikanan' },
                                        { value: 'BudidayaPeternakan', label: 'Budidaya Peternakan' },
                                        { value: 'BudidayaPertanianPeternakanPerikanan', label: 'Budidaya Pertanian, Budidaya Peternakan, Budidaya Perikanan' },
                                        { value: 'BudidayaPertanianPerdagangandanJasaUmumPariwisata', label: 'Budidaya Pertanian, Perdagangan dan Jasa Umum, Pariwisata' },
                                        { value: 'BudidayaPertanianPerdagangandanJasaUmumPariwisataKeuangan/LKD', label: 'Budidaya Pertanian, Perdagangan dan Jasa Umum, Pariwisata, Keuangan/LKD' },
                                        { value: 'BudidayaPertanianPerdagangandanJasaUmumPelayananPublikKeuangan/LKD', label: 'Budidaya Pertanian, Perdagangan dan Jasa Umum, Pelayanan Publik Keuangan/LKD' },
                                        { value: 'BudidayaPertanianPerdagangandanJasaUmumPengolahandanManufaktur', label: 'Budidaya Pertanian, Perdagangan dan Jasa Umum, Pengolahan dan Manufaktur' },
                                        { value: 'Keuangan/LKD', label: 'Keuangan/LKD' },
                                        { value: 'Pariwisata', label: 'Pariwisata' },
                                        { value: 'PelayananPublik', label: 'Pelayanan Publik' },
                                        { value: 'PelayananPublikKeuangan/LKD', label: 'Pelayanan Publik, Keuangan/LKD' },
                                        { value: 'PengolahandanManufaktur', label: 'Pengolahan dan Manufaktur' },
                                        { value: 'PerdagangandanJasaUmum', label: 'Perdagangan dan Jasa Umum' },
                                        { value: 'PerdagangandanJasaUmumKeuangan/LKD', label: 'Perdagangan dan Jasa Umum, Keuangan/LKD' },
                                        { value: 'PerdagangandanJasaUmum,Pariwisata', label: 'Perdagangan dan Jasa Umum, Pariwisata' },
                                        { value: 'PerdagangandanJasaUmum,PelayananPublik', label: 'Perdagangan dan Jasa Umum, Pelayanan Publik' },
                                        { value: 'PerdagangandanJasaUmum,PengolahandanManufaktur', label: 'Perdagangan dan Jasa Umum, Pengolahan dan Manufaktur' },
                                        { value: 'BelumAdaKeterangan', label: 'Belum Ada Keterangan' }
                                    ]}
                                />
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormInput
                                        label="Keterangan Jenis Usaha Utama"
                                        name="JenisUsahaUtama"
                                        value={formData.JenisUsahaUtama || ''}
                                        onChange={handleChange}
                                        placeholder="Jelaskan usaha utama"
                                    />
                                    
                                    <FormInput
                                        label="Jenis Usaha Lainnya"
                                        name="JenisUsahaLainnya"
                                        value={formData.JenisUsahaLainnya || ''}
                                        onChange={handleChange}
                                        placeholder="Jelaskan usaha tambahan"
                                    />
                                </div>

                                <div className="border-t border-violet-200 pt-6 mt-6">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">Keuangan Usaha</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormInput
                                            label="Omset 2023"
                                            name="Omset2023"
                                            value={formatRupiah(formData.Omset2023)}
                                            onChange={handleChange}
                                            placeholder="Rp. 0"
                                        />
                                        
                                        <FormInput
                                            label="Laba 2023"
                                            name="Laba2023"
                                            value={formatRupiah(formData.Laba2023)}
                                            onChange={handleChange}
                                            placeholder="Rp. 0"
                                        />
                                        
                                        <FormInput
                                            label="Omset 2024"
                                            name="Omset2024"
                                            value={formatRupiah(formData.Omset2024)}
                                            onChange={handleChange}
                                            placeholder="Rp. 0"
                                        />
                                        
                                        <FormInput
                                            label="Laba 2024"
                                            name="Laba2024"
                                            value={formatRupiah(formData.Laba2024)}
                                            onChange={handleChange}
                                            placeholder="Rp. 0"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'permodalan':
                return (
                    <div className="space-y-8">
                        <SectionHeader 
                            title="Permodalan dan Aset" 
                            subtitle="Penyertaan modal dan nilai aset BUMDes"
                        />
                        
                        <div className="bg-gradient-to-br from-lime-50 to-green-50 rounded-2xl p-6 border border-lime-100">
                            <div className="space-y-6">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">Penyertaan Modal per Tahun</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <FormInput
                                            label="Modal 2019"
                                            name="PenyertaanModal2019"
                                            value={formatRupiah(formData.PenyertaanModal2019)}
                                            onChange={handleChange}
                                            placeholder="Rp. 0"
                                        />
                                        
                                        <FormInput
                                            label="Modal 2020"
                                            name="PenyertaanModal2020"
                                            value={formatRupiah(formData.PenyertaanModal2020)}
                                            onChange={handleChange}
                                            placeholder="Rp. 0"
                                        />
                                        
                                        <FormInput
                                            label="Modal 2021"
                                            name="PenyertaanModal2021"
                                            value={formatRupiah(formData.PenyertaanModal2021)}
                                            onChange={handleChange}
                                            placeholder="Rp. 0"
                                        />
                                        
                                        <FormInput
                                            label="Modal 2022"
                                            name="PenyertaanModal2022"
                                            value={formatRupiah(formData.PenyertaanModal2022)}
                                            onChange={handleChange}
                                            placeholder="Rp. 0"
                                        />
                                        
                                        <FormInput
                                            label="Modal 2023"
                                            name="PenyertaanModal2023"
                                            value={formatRupiah(formData.PenyertaanModal2023)}
                                            onChange={handleChange}
                                            placeholder="Rp. 0"
                                        />
                                        
                                        <FormInput
                                            label="Modal 2024"
                                            name="PenyertaanModal2024"
                                            value={formatRupiah(formData.PenyertaanModal2024)}
                                            onChange={handleChange}
                                            placeholder="Rp. 0"
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-lime-200 pt-6">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">Sumber Modal dan Aset</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormInput
                                            label="Modal dari Sumber Lain"
                                            name="SumberLain"
                                            value={formatRupiah(formData.SumberLain)}
                                            onChange={handleChange}
                                            placeholder="Rp. 0"
                                        />
                                        
                                        <FormInput
                                            label="Jenis Aset"
                                            name="JenisAset"
                                            value={formData.JenisAset || ''}
                                            onChange={handleChange}
                                            placeholder="Jenis aset yang dimiliki"
                                        />
                                        
                                        <FormInput
                                            label="Nilai Aset"
                                            name="NilaiAset"
                                            value={formatRupiah(formData.NilaiAset)}
                                            onChange={handleChange}
                                            placeholder="Rp. 0"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'kemitraan':
                return (
                    <div className="space-y-8">
                        <SectionHeader 
                            title="Kemitraan/Kerjasama" 
                            subtitle="Kerja sama dengan pihak ketiga"
                        />
                        
                        <div className="bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl p-6 border border-sky-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <FormInput
                                        label="Kemitraan/Kerjasama Pihak Ketiga"
                                        name="KerjasamaPihakKetiga"
                                        value={formData.KerjasamaPihakKetiga || ''}
                                        onChange={handleChange}
                                        placeholder="Nama pihak ketiga"
                                    />
                                </div>
                                
                                <FormInput
                                    label="Tahun Mulai-Tahun Berakhir"
                                    name="TahunMulai-TahunBerakhir"
                                    value={formData['TahunMulai-TahunBerakhir'] || ''}
                                    onChange={handleChange}
                                    placeholder="2024-2025"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'kontribusi':
                return (
                    <div className="space-y-8">
                        <SectionHeader 
                            title="Kontribusi PADES" 
                            subtitle="Kontribusi BUMDes terhadap Pendapatan Asli Desa"
                        />
                        
                        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-2xl p-6 border border-yellow-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput
                                    label="Kontribusi PADes 2021"
                                    name="KontribusiTerhadapPADes2021"
                                    value={formatRupiah(formData.KontribusiTerhadapPADes2021)}
                                    onChange={handleChange}
                                    placeholder="Rp. 0"
                                />
                                
                                <FormInput
                                    label="Kontribusi PADes 2022"
                                    name="KontribusiTerhadapPADes2022"
                                    value={formatRupiah(formData.KontribusiTerhadapPADes2022)}
                                    onChange={handleChange}
                                    placeholder="Rp. 0"
                                />
                                
                                <FormInput
                                    label="Kontribusi PADes 2023"
                                    name="KontribusiTerhadapPADes2023"
                                    value={formatRupiah(formData.KontribusiTerhadapPADes2023)}
                                    onChange={handleChange}
                                    placeholder="Rp. 0"
                                />
                                
                                <FormInput
                                    label="Kontribusi PADes 2024"
                                    name="KontribusiTerhadapPADes2024"
                                    value={formatRupiah(formData.KontribusiTerhadapPADes2024)}
                                    onChange={handleChange}
                                    placeholder="Rp. 0"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'peran':
                return (
                    <div className="space-y-8">
                        <SectionHeader 
                            title="Peran BUMDesa pada Program Pemerintah" 
                            subtitle="Peran BUMDes dalam program ketahanan pangan dan desa wisata"
                        />
                        
                        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-2xl p-6 border border-indigo-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput
                                    label="Peran Program Ketahanan Pangan 2024"
                                    name="Ketapang2024"
                                    type="select"
                                    value={formData.Ketapang2024 || ''}
                                    onChange={handleChange}
                                    options={[
                                        { value: 'Pengelola', label: 'Pengelola' },
                                        { value: 'Distribusi', label: 'Distribusi' },
                                        { value: 'Pemasaran', label: 'Pemasaran' },
                                        { value: 'tidakadaperan', label: 'Tidak Ada Peran' }
                                    ]}
                                />
                                
                                <FormInput
                                    label="Peran Program Ketahanan Pangan 2025"
                                    name="Ketapang2025"
                                    type="select"
                                    value={formData.Ketapang2025 || ''}
                                    onChange={handleChange}
                                    options={[
                                        { value: 'Pengelola', label: 'Pengelola' },
                                        { value: 'Distribusi', label: 'Distribusi' },
                                        { value: 'Pemasaran', label: 'Pemasaran' },
                                        { value: 'tidakadaperan', label: 'Tidak Ada Peran' }
                                    ]}
                                />
                                
                                <FormInput
                                    label="Peran Pada Desa Wisata"
                                    name="DesaWisata"
                                    type="select"
                                    value={formData.DesaWisata || ''}
                                    onChange={handleChange}
                                    options={[
                                        { value: 'PengelolaUtama', label: 'Pengelola Utama' },
                                        { value: 'Pengelola Pendukung', label: 'Pengelola Pendukung' }
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'bantuan':
                return (
                    <div className="space-y-8">
                        <SectionHeader 
                            title="Bantuan" 
                            subtitle="Bantuan yang diterima BUMDes"
                        />
                        
                        <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-6 border border-pink-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput
                                    label="Bantuan Kementrian"
                                    name="BantuanKementrian"
                                    value={formData.BantuanKementrian || ''}
                                    onChange={handleChange}
                                    placeholder="Sebutkan bantuan dari kementrian"
                                />
                                
                                <FormInput
                                    label="Bantuan Lainnya"
                                    name="BantuanLaptopShopee"
                                    value={formData.BantuanLaptopShopee || ''}
                                    onChange={handleChange}
                                    placeholder="Sebutkan bantuan lainnya"
                                />
                            </div>
                        </div>
                    </div>
                );
            case 'laporan':
                return (
                    <div className="space-y-8">
                        <SectionHeader 
                            title="Laporan Pertanggung Jawaban" 
                            subtitle="Upload laporan keuangan per tahun"
                        />
                        
                        <div className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-2xl p-6 border border-cyan-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {['LaporanKeuangan2021', 'LaporanKeuangan2022', 'LaporanKeuangan2023', 'LaporanKeuangan2024'].map(key => {
                                    const existingFile = typeof formData[key] === 'string' ? formData[key] : null;
                                    const newFile = formData[key] instanceof File ? formData[key] : null;
                                    const fileName = existingFile ? existingFile.split('/').pop() : null;
                                    
                                    return (
                                    <div key={key} className="space-y-3">
                                        <label className="block text-sm font-semibold text-slate-700">
                                            {normalizeFieldName(key)}:
                                        </label>
                                        
                                        {/* Show existing file info */}
                                        {existingFile && !newFile && (
                                            <div className="bg-white border border-cyan-200 rounded-lg p-3">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <FaFileDownload className="text-cyan-600 flex-shrink-0" />
                                                        <span className="text-sm text-slate-700 truncate" title={fileName}>
                                                            {fileName}
                                                        </span>
                                                    </div>
                                                    <a 
                                                        href={`${API_CONFIG.STORAGE_URL}/${existingFile}`} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="text-xs bg-cyan-100 text-cyan-700 px-3 py-1 rounded-md hover:bg-cyan-200 flex-shrink-0"
                                                    >
                                                        Lihat
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Show new file info (before upload) */}
                                        {newFile && (
                                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                                <div className="flex items-center gap-2">
                                                    <FaFileDownload className="text-amber-600 flex-shrink-0" />
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium text-amber-900 truncate" title={newFile.name}>
                                                            {newFile.name}
                                                        </p>
                                                        <p className="text-xs text-amber-600">
                                                            Siap diupload ({(newFile.size / 1024).toFixed(2)} KB)
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* File input */}
                                        <input 
                                            type="file" 
                                            name={key} 
                                            onChange={handleFileChange} 
                                            className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100 cursor-pointer"
                                        />
                                    </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                );
            case 'dokumen':
                return (
                    <div className="space-y-8">
                        <SectionHeader 
                            title="Dokumen Pendirian" 
                            subtitle="Upload dokumen legal pendirian BUMDes"
                        />
                        
                        <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-6 border border-slate-200">
                            <div className="space-y-6">
                                <div className="mb-4">
                                    <FormInput
                                        label="Nomor Perdes"
                                        name="NomorPerdes"
                                        value={formData.NomorPerdes || ''}
                                        onChange={handleChange}
                                        placeholder="Nomor Peraturan Desa"
                                    />
                                </div>

                                <div className="border-t border-slate-200 pt-6">
                                    <h3 className="text-lg font-bold text-slate-800 mb-4">Dokumen Legal</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {['Perdes', 'ProfilBUMDesa', 'BeritaAcara', 'AnggaranDasar', 'AnggaranRumahTangga', 'ProgramKerja', 'SK_BUM_Desa'].map(key => {
                                            const existingFile = typeof formData[key] === 'string' ? formData[key] : null;
                                            const newFile = formData[key] instanceof File ? formData[key] : null;
                                            const fileName = existingFile ? existingFile.split('/').pop() : null;
                                            
                                            return (
                                            <div key={key} className="space-y-3">
                                                <label className="block text-sm font-semibold text-slate-700">
                                                    {normalizeFieldName(key)}:
                                                    {key === 'SK_BUM_Desa' && <span className="text-red-500 ml-1">*</span>}
                                                </label>
                                                
                                                {/* Show existing file info */}
                                                {existingFile && !newFile && (
                                                    <div className="bg-white border border-slate-200 rounded-lg p-3">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                                                <FaFileDownload className="text-slate-600 flex-shrink-0" />
                                                                <span className="text-sm text-slate-700 truncate" title={fileName}>
                                                                    {fileName}
                                                                </span>
                                                            </div>
                                                            <a 
                                                                href={`${API_CONFIG.STORAGE_URL}/${existingFile}`} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer" 
                                                                className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-md hover:bg-slate-200 flex-shrink-0"
                                                            >
                                                                Lihat
                                                            </a>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                {/* Show new file info (before upload) */}
                                                {newFile && (
                                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                                        <div className="flex items-center gap-2">
                                                            <FaFileDownload className="text-amber-600 flex-shrink-0" />
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-amber-900 truncate" title={newFile.name}>
                                                                    {newFile.name}
                                                                </p>
                                                                <p className="text-xs text-amber-600">
                                                                    Siap diupload ({(newFile.size / 1024).toFixed(2)} KB)
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <input 
                                                    type="file" 
                                                    name={key} 
                                                    onChange={handleFileChange} 
                                                    required={key === 'SK_BUM_Desa' && !existingFile}
                                                    className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 cursor-pointer"
                                                />
                                            </div>
                                            );
                                        })}
                                    </div>
                                </div>
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
                    
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setShowDeleteConfirm(true)}
                            className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-2"
                        >
                            <FaTrash />
                            Hapus
                        </button>
                        
                       
                        
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