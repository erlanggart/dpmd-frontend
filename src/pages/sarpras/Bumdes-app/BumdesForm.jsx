import React, { useState, useEffect } from 'react';
import api, { getKecamatans, getDesasByKecamatan } from '../../../services/api.js';
import { FaPaperPlane, FaSpinner, FaTimes, FaCheck, FaExclamationTriangle, FaInfoCircle, FaChevronLeft, FaChevronRight, FaSave, FaTrash } from 'react-icons/fa';
import { HiSparkles } from 'react-icons/hi';
import { useLocalStorage, useFileLocalStorage } from '../../../hooks/useLocalStorage.js';
import EnhancedFileInput from '../../../components/EnhancedFileInput.jsx';

// Custom CSS untuk styling dropdown yang lebih baik
const customStyles = `
  .custom-dropdown {
    position: relative;
    width: 100%;
  }
  
  .custom-dropdown-trigger {
    width: 100%;
    padding: 0.75rem 3rem 0.75rem 1rem;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(8px);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 0.875rem;
    line-height: 1.25rem;
    transition: all 0.3s ease;
    outline: none;
    text-align: left;
  }
  
  .custom-dropdown-trigger:hover {
    border-color: #cbd5e1;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .custom-dropdown-trigger:focus {
    border-color: #3b82f6;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
  }
  
  .custom-dropdown-trigger.disabled {
    background-color: #f1f5f9;
    cursor: not-allowed;
    color: #94a3b8;
  }
  
  .custom-dropdown-arrow {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    width: 1.25rem;
    height: 1.25rem;
    color: #6b7280;
    transition: transform 0.2s ease;
  }
  
  .custom-dropdown-arrow.open {
    transform: translateY(-50%) rotate(180deg);
  }
  
  .custom-dropdown-menu {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    z-index: 50;
    margin-top: 0.25rem;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    max-height: 12rem;
    overflow-y: auto;
    backdrop-filter: blur(8px);
  }
  
  .custom-dropdown-menu::-webkit-scrollbar {
    width: 6px;
  }
  
  .custom-dropdown-menu::-webkit-scrollbar-track {
    background: #f8fafc;
  }
  
  .custom-dropdown-menu::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
  
  .custom-dropdown-menu::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
  
  .custom-dropdown-option {
    padding: 0.75rem 1rem;
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 0.875rem;
    line-height: 1.25rem;
    border-bottom: 1px solid #f8fafc;
  }
  
  .custom-dropdown-option:hover {
    background-color: #f1f5f9;
    color: #1e293b;
  }
  
  .custom-dropdown-option:last-child {
    border-bottom: none;
  }
  
  .custom-dropdown-option.selected {
    background-color: #e2e8f0;
    color: #1e293b;
    font-weight: 500;
  }
  
  .custom-dropdown-placeholder {
    color: #94a3b8;
  }
`;

// Inject CSS styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.type = 'text/css';
  styleSheet.innerHTML = customStyles;
  if (!document.head.querySelector('style[data-bumdes-form-styles]')) {
    styleSheet.setAttribute('data-bumdes-form-styles', 'true');
    document.head.appendChild(styleSheet);
  }
}

// Custom Dropdown Component
const CustomDropdown = ({ label, name, value, onChange, options = [], disabled = false, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Ensure value is never undefined/null
    const safeValue = value || '';
    
    const filteredOptions = options.filter(option => {
        const label = option.label || option;
        // Convert to string to safely call toLowerCase
        return String(label).toLowerCase().includes(searchTerm.toLowerCase());
    });
    
    const selectedOption = options.find(option => 
        (option.value || option) === safeValue
    );
    
    const handleSelect = (optionValue) => {
        const event = {
            target: {
                name: name,
                value: optionValue
            }
        };
        onChange(event);
        setIsOpen(false);
        setSearchTerm('');
    };
    
    const toggleDropdown = () => {
        if (!disabled) {
            setIsOpen(!isOpen);
        }
    };
    
    const handleClickOutside = (e) => {
        if (!e.target.closest('.custom-dropdown')) {
            setIsOpen(false);
            setSearchTerm('');
        }
    };
    
    useEffect(() => {
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);
    
    return (
        <div className="custom-dropdown">
            <button
                type="button"
                className={`custom-dropdown-trigger ${disabled ? 'disabled' : ''}`}
                onClick={toggleDropdown}
                disabled={disabled}
            >
                <span className={selectedOption ? '' : 'custom-dropdown-placeholder'}>
                    {selectedOption ? (selectedOption.label || selectedOption) : (placeholder || `Pilih ${label}`)}
                </span>
                <svg 
                    className={`custom-dropdown-arrow ${isOpen ? 'open' : ''}`}
                    fill="none" 
                    viewBox="0 0 20 20"
                    stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="m6 8 4 4 4-4" />
                </svg>
            </button>
            
            {isOpen && (
                <div className="custom-dropdown-menu">
                    {options.length > 8 && (
                        <div className="p-2 border-b border-gray-100">
                            <input
                                type="text"
                                placeholder="Cari..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    )}
                    
                    {filteredOptions.length === 0 ? (
                        <div className="custom-dropdown-option text-gray-500">
                            Tidak ada data yang ditemukan
                        </div>
                    ) : (
                        filteredOptions.map((option, index) => (
                            <div
                                key={index}
                                className={`custom-dropdown-option ${
                                    (option.value || option) === safeValue ? 'selected' : ''
                                }`}
                                onClick={() => handleSelect(option.value || option)}
                            >
                                {option.label || option}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

const Modal = ({ show, onClose, title, message, type }) => {
    if (!show) {
        return null;
    }

    const getModalStyles = () => {
        switch (type) {
            case 'error':
                return {
                    overlay: 'bg-red-900/20',
                    container: 'border-red-200 bg-gradient-to-br from-red-50 to-red-100',
                    icon: <FaExclamationTriangle className="text-red-600 text-2xl" />,
                    iconBg: 'bg-red-100',
                    button: 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
                };
            case 'success':
                return {
                    overlay: 'bg-green-900/20',
                    container: 'border-green-200 bg-gradient-to-br from-green-50 to-green-100',
                    icon: <FaCheck className="text-green-600 text-2xl" />,
                    iconBg: 'bg-green-100',
                    button: 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                };
            case 'warning':
                return {
                    overlay: 'bg-yellow-900/20',
                    container: 'border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100',
                    icon: <FaExclamationTriangle className="text-yellow-600 text-2xl" />,
                    iconBg: 'bg-yellow-100',
                    button: 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700'
                };
            default:
                return {
                    overlay: 'bg-slate-900/20',
                    container: 'border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100',
                    icon: <FaInfoCircle className="text-slate-600 text-2xl" />,
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

// Enhanced form input component with localStorage support
const FormInput = ({ label, name, type = "text", value, onChange, disabled, required = false, placeholder, options = [], dropdownStyle = "auto", fileInfo, onFileInfoChange, isValidFileInfo }) => {
    if (type === 'file') {
        return (
            <EnhancedFileInput
                label={label}
                name={name}
                onChange={onChange}
                disabled={disabled}
                required={required}
                fileInfo={fileInfo}
                onFileInfoChange={onFileInfoChange}
                isValidFileInfo={isValidFileInfo}
            />
        );
    }
    
    return (
        <div className="space-y-2">
            <label className="block text-sm font-semibold text-slate-700">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {type === 'select' ? (
                <CustomDropdown
                    label={label}
                    name={name}
                    value={value}
                    onChange={onChange}
                    options={options}
                    disabled={disabled}
                    placeholder={placeholder}
                />
            
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
};

const SectionHeader = ({ title, subtitle }) => (
    <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-slate-800 mb-2">{title}</h2>
        {subtitle && <p className="text-slate-600">{subtitle}</p>}
        <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full mx-auto mt-4"></div>
    </div>
);

// Rupiah formatting functions
const formatRupiah = (angka) => {
    if (!angka) return "";
    let numberString = String(angka).replace(/[^,\d]/g, "").toString();
    return "Rp. " + numberString.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseRupiah = (rupiah) => {
    return parseInt(String(rupiah).replace(/[^0-9]/g, ''), 10) || 0;
};

// Initial form data
export const initialFormData = {
    desa_id: '',
    kode_desa: '',
    kecamatan: '',
    desa: '',
    namabumdesa: '',
    AlamatBumdesa: '',
    TelfonBumdes: '',
    Alamatemail: '',
    TahunPendirian: '',
    status: 'aktif',
    keterangan_tidak_aktif: '',
    NIB: '',
    LKPP: '',
    NPWP: '',
    badanhukum: '',
    NamaPenasihat: '',
    JenisKelaminPenasihat: '',
    HPPenasihat: '',
    NamaPengawas: '',
    JenisKelaminPengawas: '',
    HPPengawas: '',
    NamaDirektur: '',
    JenisKelaminDirektur: '',
    HPDirektur: '',
    NamaSekretaris: '',
    JenisKelaminSekretaris: '',
    HPSekretaris: '',
    NamaBendahara: '',
    JenisKelaminBendahara: '',
    HPBendahara: '',
    TotalTenagaKerja: '',
    JenisUsaha: '',
    JenisUsahaUtama: '',
    JenisUsahaLainnya: '',
    Omset2023: '',
    Laba2023: '',
    Omset2024: '',
    Laba2024: '',
    PenyertaanModal2019: '',
    PenyertaanModal2020: '',
    PenyertaanModal2021: '',
    PenyertaanModal2022: '',
    PenyertaanModal2023: '',
    PenyertaanModal2024: '',
    SumberLain: '',
    JenisAset: '',
    NilaiAset: '',
    KerjasamaPihakKetiga: '',
    'TahunMulai-TahunBerakhir': '',
    KontribusiTerhadapPADes2021: '',
    KontribusiTerhadapPADes2022: '',
    KontribusiTerhadapPADes2023: '',
    KontribusiTerhadapPADes2024: '',
    Ketapang2024: '',
    Ketapang2025: '',
    DesaWisata: '',
    BantuanKementrian: '',
    BantuanLaptopShopee: '',
    LaporanKeuangan2021: '',
    LaporanKeuangan2022: '',
    LaporanKeuangan2023: '',
    LaporanKeuangan2024: '',
    NomorPerdes: '',
    Perdes: '',
    ProfilBUMDesa: '',
    BeritaAcara: '',
    AnggaranDasar: '',
    AnggaranRumahTangga: '',
    ProgramKerja: '',
    SK_BUM_Desa: ''
};

// Form sections configuration
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

function BumdesForm({ onSwitchToDashboard }) {
    // State untuk form data dengan localStorage
    const [formData, setFormData] = useLocalStorage('bumdes-form-data', initialFormData);
    
    // State untuk file information dengan localStorage
    const [fileInfo, setFileInfo, removeFileInfo, clearAllFiles, isValidFileInfo] = useFileLocalStorage('bumdes-file-info');
    
    // State untuk file objects (tidak disimpan di localStorage)
    const [selectedFiles, setSelectedFiles] = useState({});
    
    const [loading, setLoading] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [popupMessage, setPopupMessage] = useState({ text: '', type: '' });
    
    // State untuk section navigation dengan localStorage
    const [activeSection, setActiveSection] = useLocalStorage('bumdes-active-section', 'identitas');
    const [currentSectionIndex, setCurrentSectionIndex] = useState(() => {
        const index = formSections.findIndex(section => section.id === activeSection);
        return index !== -1 ? index : 0;
    });
    
    // State untuk kecamatan dan desa
    const [kecamatanList, setKecamatanList] = useState([]);
    const [desaList, setDesaList] = useState([]);
    const [selectedKecamatanId, setSelectedKecamatanId] = useState('');
    const [loadingDesa, setLoadingDesa] = useState(false);

    // Auto-save timer
    const [autoSaveStatus, setAutoSaveStatus] = useState('');

    // Load kecamatan data saat komponen dimount
    useEffect(() => {
        const fetchKecamatans = async () => {
            try {
                console.log('🔄 Fetching kecamatan data...');
                const response = await getKecamatans();
                console.log('📊 Kecamatan response:', response);
                
                // Handle both response.data.data and response.data
                const kecamatanData = response.data?.data || response.data || [];
                console.log('📋 Kecamatan list:', kecamatanData);
                setKecamatanList(kecamatanData);
                
                // Restore kecamatan selection from form data
                if (formData.kecamatan) {
                    const savedKecamatan = kecamatanData.find(kec => kec.nama === formData.kecamatan);
                    if (savedKecamatan) {
                        setSelectedKecamatanId(savedKecamatan.id);
                        // Load desa list for saved kecamatan
                        try {
                            const desaResponse = await getDesasByKecamatan(savedKecamatan.id);
                            const desaData = desaResponse.data?.data || desaResponse.data || [];
                            setDesaList(desaData);
                        } catch (error) {
                            console.error('Error loading saved desa list:', error);
                        }
                    }
                }
            } catch (error) {
                console.error('❌ Error fetching kecamatans:', error);
                console.error('Error details:', error.response?.data || error.message);
                showMessagePopup('Gagal memuat data kecamatan: ' + (error.response?.data?.message || error.message), 'error');
            }
        };

        fetchKecamatans();
    }, [formData.kecamatan]);

    // Update currentSectionIndex when activeSection changes
    useEffect(() => {
        const index = formSections.findIndex(section => section.id === activeSection);
        if (index !== -1) {
            setCurrentSectionIndex(index);
        }
    }, [activeSection]);

    // Auto-save functionality
    useEffect(() => {
        const timer = setTimeout(() => {
            setAutoSaveStatus('Data tersimpan otomatis');
            const hideTimer = setTimeout(() => setAutoSaveStatus(''), 2000);
            return () => clearTimeout(hideTimer);
        }, 1000);

        return () => clearTimeout(timer);
    }, [formData]);

    // Handle kecamatan change
    const handleKecamatanChange = async (e) => {
        const kecamatanId = e.target.value;
        const selectedKecamatan = kecamatanList.find(kec => 
            (kec.id_kecamatan || kec.id) == kecamatanId
        );
        
        console.log('🏘️ Kecamatan changed:', kecamatanId, selectedKecamatan);
        
        setSelectedKecamatanId(kecamatanId);
        setFormData({
            ...formData,
            kecamatan: selectedKecamatan ? (selectedKecamatan.nama_kecamatan || selectedKecamatan.nama) : '',
            desa: '',
            kode_desa: ''
        });
        
        if (kecamatanId) {
            setLoadingDesa(true);
            try {
                console.log('🔄 Fetching desa for kecamatan:', kecamatanId);
                const response = await getDesasByKecamatan(kecamatanId);
                console.log('📊 Desa response:', response);
                
                const desaData = response.data?.data || response.data || [];
                console.log('📋 Desa list:', desaData);
                setDesaList(desaData);
            } catch (error) {
                console.error('❌ Error fetching desas:', error);
                console.error('Error details:', error.response?.data || error.message);
                showMessagePopup('Gagal memuat data desa: ' + (error.response?.data?.message || error.message), 'error');
                setDesaList([]);
            } finally {
                setLoadingDesa(false);
            }
        } else {
            setDesaList([]);
            setLoadingDesa(false);
        }
    };

    // Handle desa change
    const handleDesaChange = async (e) => {
        const desaId = e.target.value;
        const selectedDesa = desaList.find(desa => (desa.id_desa || desa.id) == desaId);
        
        console.log('🏘️ Desa selected:', selectedDesa);
        
        if (selectedDesa) {
            setFormData({
                ...formData,
                desa_id: selectedDesa.id_desa || selectedDesa.id,  // Support both field names
                desa: selectedDesa.nama_desa || selectedDesa.nama,
                kode_desa: selectedDesa.kode_desa || selectedDesa.kode
            });

            // Check if this desa already has BUMDes
            const hasExisting = await checkExistingBumdes(selectedDesa.kode_desa || selectedDesa.kode);
            if (hasExisting) {
                showMessagePopup(`Peringatan: Desa "${selectedDesa.nama_desa || selectedDesa.nama}" sudah melakukan input data BUMDes. Setiap desa hanya dapat memiliki satu BUMDes.`, 'warning');
            }
        } else {
            setFormData({
                ...formData,
                desa_id: null,
                desa: '',
                kode_desa: ''
            });
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
        const { name } = e.target;
        const file = e.target.files[0];
        
        if (file) {
            // Store actual file object for form submission
            setSelectedFiles(prev => ({
                ...prev,
                [name]: file
            }));
            
            // File info is handled by EnhancedFileInput component
        } else {
            // Remove file when cleared
            setSelectedFiles(prev => {
                const updated = { ...prev };
                delete updated[name];
                return updated;
            });
        }
    };

    const handleFileInfoChange = (fieldName, file) => {
        if (file) {
            setFileInfo(fieldName, file);
            // Also store the actual file for submission
            setSelectedFiles(prev => ({
                ...prev,
                [fieldName]: file
            }));
        } else {
            removeFileInfo(fieldName);
            setSelectedFiles(prev => {
                const updated = { ...prev };
                delete updated[fieldName];
                return updated;
            });
        }
    };

    const showMessagePopup = (text, type) => {
        setPopupMessage({ text, type });
        setShowPopup(true);
    };

    const goToNextSection = () => {
        if (currentSectionIndex < formSections.length - 1) {
            const newIndex = currentSectionIndex + 1;
            setCurrentSectionIndex(newIndex);
            setActiveSection(formSections[newIndex].id);
        }
    };

    const goToPreviousSection = () => {
        if (currentSectionIndex > 0) {
            const newIndex = currentSectionIndex - 1;
            setCurrentSectionIndex(newIndex);
            setActiveSection(formSections[newIndex].id);
        }
    };

    const goToSection = (sectionId) => {
        const index = formSections.findIndex(section => section.id === sectionId);
        if (index !== -1) {
            setCurrentSectionIndex(index);
            setActiveSection(sectionId);
        }
    };

    // Clear form data function
    const clearFormData = () => {
        setFormData(initialFormData);
        setSelectedFiles({});
        clearAllFiles();
        setActiveSection('identitas');
        setCurrentSectionIndex(0);
        setSelectedKecamatanId('');
        setDesaList([]);
        showMessagePopup('Data formulir telah dibersihkan', 'success');
    };

    // Function to check if desa already has BUMDes
    const checkExistingBumdes = async (kodeDesa) => {
        try {
            const response = await api.get(`/bumdes/check-desa/${kodeDesa}`);
            return response.data?.exists || false;
        } catch (error) {
            console.log('Error checking existing BUMDes:', error);
            return false;
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setShowPopup(false);

        // Validasi kode_desa
        if (!formData.kode_desa) {
            showMessagePopup('Silakan pilih desa terlebih dahulu.', 'error');
            setLoading(false);
            return;
        }

        // Validasi namabumdesa (required field)
        if (!formData.namabumdesa || formData.namabumdesa.trim() === '') {
            showMessagePopup('Nama BUMDesa wajib diisi.', 'error');
            setLoading(false);
            return;
        }

        // Check if desa already has BUMDes
        const hasExisting = await checkExistingBumdes(formData.kode_desa);
        if (hasExisting) {
            showMessagePopup(`Desa "${formData.desa}" sudah memiliki data BUMDes. Setiap desa hanya dapat memiliki satu BUMDes.`, 'error');
            setLoading(false);
            return;
        }

        try {
            // STEP 1: Submit data TANPA file dulu
            const dataOnly = {};
            for (const key in formData) {
                const value = formData[key];
                // Skip empty values except for desa_id which is required
                if (key === 'desa_id' || (value !== null && value !== '')) {
                    if (['Omset2023', 'Laba2023', 'Omset2024', 'Laba2024', 'PenyertaanModal2019', 'PenyertaanModal2020', 'PenyertaanModal2021', 'PenyertaanModal2022', 'PenyertaanModal2023', 'PenyertaanModal2024', 'SumberLain', 'NilaiAset', 'KontribusiTerhadapPADes2021', 'KontribusiTerhadapPADes2022', 'KontribusiTerhadapPADes2023', 'KontribusiTerhadapPADes2024', 'TotalTenagaKerja'].includes(key)) {
                        dataOnly[key] = parseRupiah(value);
                    } else {
                        dataOnly[key] = value;
                    }
                }
            }

            console.log('📤 Sending BUMDes data:', dataOnly);
            console.log('🔑 desa_id value:', dataOnly.desa_id);

            const response = await api.post('/bumdes', dataOnly, {
                headers: { 'Content-Type': 'application/json' }
            });

            const bumdesId = response.data.data?.id;

            // STEP 2: Upload files satu per satu jika ada
            const fileFields = Object.keys(selectedFiles).filter(key => selectedFiles[key]);
            
            if (fileFields.length > 0 && bumdesId) {
            let uploadedCount = 0;
            for (const fieldName of fileFields) {
                try {
                    const fileData = new FormData();
                    fileData.append('file', selectedFiles[fieldName]);
                    fileData.append('bumdes_id', bumdesId);
                    fileData.append('field_name', fieldName);

                    await api.post('/bumdes/upload-file', fileData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    uploadedCount++;
                } catch (fileError) {
                    console.error(`Failed to upload ${fieldName}:`, fileError);
                    // Continue dengan file lain meskipun ada yang gagal
                }
            }
        }

        showMessagePopup('Data BUMDesa berhasil disimpan!', 'success');            // Clear localStorage after successful submission
            setFormData(initialFormData);
            setSelectedFiles({});
            clearAllFiles();
            setActiveSection('identitas');
            setCurrentSectionIndex(0);
            setSelectedKecamatanId('');
            setDesaList([]);
            
            setLoading(false);
        } catch (error) {
            console.error("Gagal menyimpan data:", error.response?.data?.errors || error.message);
            
            let errorMessage = 'Gagal menyimpan data BUMDes.';
            
            // Handle specific validation errors
            if (error.response?.status === 422) {
                const errors = error.response.data.errors;
                
                if (errors?.kode_desa) {
                    errorMessage = `Desa "${formData.desa}" sudah memiliki data BUMDes. Setiap desa hanya dapat memiliki satu BUMDes.`;
                } else if (errors) {
                    // Handle other validation errors
                    const firstError = Object.keys(errors)[0];
                    errorMessage = `Error validasi: ${errors[firstError][0]}`;
                } else {
                    errorMessage = error.response.data.message || 'Data tidak valid.';
                }
            } else {
                errorMessage = error.response?.data?.message || error.message || 'Terjadi kesalahan pada server.';
            }
            
            showMessagePopup(errorMessage, 'error');
            setLoading(false);
        }
    };

    // Function to render each form section
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
                                        value: kec.id_kecamatan || kec.id,
                                        label: kec.nama_kecamatan || kec.nama
                                    }))}
                                    required
                                />
                                
                                <div className="space-y-2">
                                    <label className="block text-sm font-semibold text-slate-700">
                                        Desa
                                        <span className="text-red-500 ml-1">*</span>
                                    </label>
                                    <CustomDropdown
                                        label="Desa"
                                        name="desa_id"
                                        value={desaList.find(desa => (desa.nama_desa || desa.nama) === formData.desa)?.id_desa || desaList.find(desa => (desa.nama_desa || desa.nama) === formData.desa)?.id || ''}
                                        onChange={handleDesaChange}
                                        options={desaList.map(desa => ({
                                            value: desa.id_desa || desa.id,
                                            label: desa.nama_desa || desa.nama
                                        }))}
                                        disabled={!selectedKecamatanId || loadingDesa}
                                        placeholder={loadingDesa ? 'Memuat desa...' : 'Pilih Desa'}
                                    />
                                </div>
                                
                                <FormInput
                                    label="Kode Desa"
                                    name="kode_desa"
                                    value={formData.kode_desa}
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
                                
                                {/* Hidden input untuk kecamatan */}
                                <input
                                    type="hidden"
                                    name="kecamatan"
                                    value={formData.kecamatan}
                                />
                                
                                {/* Hidden input untuk desa */}
                                <input
                                    type="hidden"
                                    name="desa"
                                    value={formData.desa}
                                />
                                
                                <FormInput
                                    label="Nama BUMDesa"
                                    name="namabumdesa"
                                    value={formData.namabumdesa}
                                    onChange={handleChange}
                                    required={true}
                                    placeholder="Masukkan nama BUMDesa"
                                />
                                
                                <div className="md:col-span-2">
                                    <FormInput
                                        label="Alamat BUMDesa"
                                        name="AlamatBumdesa"
                                        value={formData.AlamatBumdesa}
                                        onChange={handleChange}
                                        placeholder="Masukkan alamat lengkap BUMDesa"
                                    />
                                </div>
                                
                                <FormInput
                                    label="No Telepon BUMDesa"
                                    name="TelfonBumdes"
                                    value={formData.TelfonBumdes}
                                    onChange={handleChange}
                                    placeholder="Contoh: 0812-3456-7890"
                                />
                                
                                <FormInput
                                    label="Alamat Email"
                                    name="Alamatemail"
                                    type="email"
                                    value={formData.Alamatemail}
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
                    <div className="space-y-8">
                        <SectionHeader 
                            title="Legalitas" 
                            subtitle="Dokumen dan status hukum BUMDes"
                        />
                        
                        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-6 border border-purple-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput
                                    label="NIB (Nomor Induk Berusaha)"
                                    name="NIB"
                                    value={formData.NIB}
                                    onChange={handleChange}
                                    placeholder="Masukkan nomor NIB"
                                />
                                
                                <FormInput
                                    label="LKPP (Lembaga Kebijakan Pengadaan)"
                                    name="LKPP"
                                    value={formData.LKPP}
                                    onChange={handleChange}
                                    placeholder="Masukkan nomor LKPP"
                                />
                                
                                <FormInput
                                    label="NPWP"
                                    name="NPWP"
                                    value={formData.NPWP}
                                    onChange={handleChange}
                                    placeholder="Masukkan nomor NPWP"
                                />
                                
                                <FormInput
                                    label="Status Badan Hukum"
                                    name="badanhukum"
                                    type="select"
                                    value={formData.badanhukum}
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
                            subtitle="Data lengkap pengurus BUMDes"
                        />
                        
                        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100">
                            <div className="space-y-8">
                                {/* Penasihat */}
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-orange-200 pb-2">Penasihat</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <FormInput
                                            label="Nama Penasihat"
                                            name="NamaPenasihat"
                                            value={formData.NamaPenasihat}
                                            onChange={handleChange}
                                        />
                                        <FormInput
                                            label="Jenis Kelamin"
                                            name="JenisKelaminPenasihat"
                                            type="select"
                                            value={formData.JenisKelaminPenasihat}
                                            onChange={handleChange}
                                            options={[
                                                { value: 'laki-laki', label: 'Laki-Laki' },
                                                { value: 'perempuan', label: 'Perempuan' }
                                            ]}
                                        />
                                        <FormInput
                                            label="No HP"
                                            name="HPPenasihat"
                                            value={formData.HPPenasihat}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                {/* Pengawas */}
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-orange-200 pb-2">Pengawas</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <FormInput
                                            label="Nama Pengawas"
                                            name="NamaPengawas"
                                            value={formData.NamaPengawas}
                                            onChange={handleChange}
                                        />
                                        <FormInput
                                            label="Jenis Kelamin"
                                            name="JenisKelaminPengawas"
                                            type="select"
                                            value={formData.JenisKelaminPengawas}
                                            onChange={handleChange}
                                            options={[
                                                { value: 'laki-laki', label: 'Laki-Laki' },
                                                { value: 'perempuan', label: 'Perempuan' }
                                            ]}
                                        />
                                        <FormInput
                                            label="No HP"
                                            name="HPPengawas"
                                            value={formData.HPPengawas}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                {/* Direktur */}
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-orange-200 pb-2">Direktur</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <FormInput
                                            label="Nama Direktur"
                                            name="NamaDirektur"
                                            value={formData.NamaDirektur}
                                            onChange={handleChange}
                                        />
                                        <FormInput
                                            label="Jenis Kelamin"
                                            name="JenisKelaminDirektur"
                                            type="select"
                                            value={formData.JenisKelaminDirektur}
                                            onChange={handleChange}
                                            options={[
                                                { value: 'laki-laki', label: 'Laki-Laki' },
                                                { value: 'perempuan', label: 'Perempuan' }
                                            ]}
                                        />
                                        <FormInput
                                            label="No HP"
                                            name="HPDirektur"
                                            value={formData.HPDirektur}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                {/* Sekretaris */}
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-orange-200 pb-2">Sekretaris</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <FormInput
                                            label="Nama Sekretaris"
                                            name="NamaSekretaris"
                                            value={formData.NamaSekretaris}
                                            onChange={handleChange}
                                        />
                                        <FormInput
                                            label="Jenis Kelamin"
                                            name="JenisKelaminSekretaris"
                                            type="select"
                                            value={formData.JenisKelaminSekretaris}
                                            onChange={handleChange}
                                            options={[
                                                { value: 'laki-laki', label: 'Laki-Laki' },
                                                { value: 'perempuan', label: 'Perempuan' }
                                            ]}
                                        />
                                        <FormInput
                                            label="No HP"
                                            name="HPSekretaris"
                                            value={formData.HPSekretaris}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>

                                {/* Bendahara */}
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-orange-200 pb-2">Bendahara</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <FormInput
                                            label="Nama Bendahara"
                                            name="NamaBendahara"
                                            value={formData.NamaBendahara}
                                            onChange={handleChange}
                                        />
                                        <FormInput
                                            label="Jenis Kelamin"
                                            name="JenisKelaminBendahara"
                                            type="select"
                                            value={formData.JenisKelaminBendahara}
                                            onChange={handleChange}
                                            options={[
                                                { value: 'laki-laki', label: 'Laki-Laki' },
                                                { value: 'perempuan', label: 'Perempuan' }
                                            ]}
                                        />
                                        <FormInput
                                            label="No HP"
                                            name="HPBendahara"
                                            value={formData.HPBendahara}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            case 'organisasi':
                return (
                    <div className="space-y-8">
                        <SectionHeader 
                            title="Profil Organisasi" 
                            subtitle="Informasi organisasi BUMDes"
                        />
                        
                        <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl p-6 border border-cyan-100">
                            <div className="grid grid-cols-1 gap-6">
                                <FormInput
                                    label="Total Tenaga Kerja"
                                    name="TotalTenagaKerja"
                                    type="number"
                                    value={formData.TotalTenagaKerja}
                                    onChange={handleChange}
                                    placeholder="Jumlah total tenaga kerja"
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'usaha':
                return (
                    <div className="space-y-8">
                        <SectionHeader 
                            title="Usaha BUMDes" 
                            subtitle="Detail usaha dan kinerja keuangan"
                        />
                        
                        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border border-emerald-100">
                            <div className="space-y-8">
                                {/* Jenis Usaha */}
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-emerald-200 pb-2">Jenis Usaha</h3>
                                    <div className="grid grid-cols-1 gap-6">
                                        <FormInput
                                            label="Jenis Usaha"
                                            name="JenisUsaha"
                                            type="select"
                                            value={formData.JenisUsaha}
                                            onChange={handleChange}
                                            options={[
                                                { value: 'BudidayadanPertambangan', label: 'Budidaya dan Pertambangan' },
                                                { value: 'BudidayaPertanian', label: 'Budidaya Pertanian' },
                                                { value: 'BudidayaPerikanan', label: 'Budidaya Perikanan' },
                                                { value: 'BudidayaPeternakan', label: 'Budidaya Peternakan' },
                                                { value: 'BudidayaPertanianPeternakanPerikanan', label: 'Budidaya Pertanian, Peternakan, Perikanan' },
                                                { value: 'Keuangan/LKD', label: 'Keuangan/LKD' },
                                                { value: 'Pariwisata', label: 'Pariwisata' },
                                                { value: 'PelayananPublik', label: 'Pelayanan Publik' },
                                                { value: 'PengolahandanManufaktur', label: 'Pengolahan dan Manufaktur' },
                                                { value: 'PerdagangandanJasaUmum', label: 'Perdagangan dan Jasa Umum' }
                                            ]}
                                        />
                                        
                                        <FormInput
                                            label="Keterangan Jenis Usaha Utama"
                                            name="JenisUsahaUtama"
                                            type="textarea"
                                            value={formData.JenisUsahaUtama}
                                            onChange={handleChange}
                                            placeholder="Jelaskan detail usaha utama"
                                        />
                                        
                                        <FormInput
                                            label="Jenis Usaha Lainnya"
                                            name="JenisUsahaLainnya"
                                            type="textarea"
                                            value={formData.JenisUsahaLainnya}
                                            onChange={handleChange}
                                            placeholder="Jelaskan usaha lainnya (jika ada)"
                                        />
                                    </div>
                                </div>

                                {/* Kinerja Keuangan */}
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-emerald-200 pb-2">Kinerja Keuangan</h3>
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
                            subtitle="Modal dan aset BUMDes"
                        />
                        
                        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-6 border border-yellow-100">
                            <div className="space-y-8">
                                {/* Penyertaan Modal */}
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-yellow-200 pb-2">Penyertaan Modal</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <FormInput
                                            label="Penyertaan Modal 2019"
                                            name="PenyertaanModal2019"
                                            value={formatRupiah(formData.PenyertaanModal2019)}
                                            onChange={handleChange}
                                            placeholder="Rp. 0"
                                        />
                                        
                                        <FormInput
                                            label="Penyertaan Modal 2020"
                                            name="PenyertaanModal2020"
                                            value={formatRupiah(formData.PenyertaanModal2020)}
                                            onChange={handleChange}
                                            placeholder="Rp. 0"
                                        />
                                        
                                        <FormInput
                                            label="Penyertaan Modal 2021"
                                            name="PenyertaanModal2021"
                                            value={formatRupiah(formData.PenyertaanModal2021)}
                                            onChange={handleChange}
                                            placeholder="Rp. 0"
                                        />
                                        
                                        <FormInput
                                            label="Penyertaan Modal 2022"
                                            name="PenyertaanModal2022"
                                            value={formatRupiah(formData.PenyertaanModal2022)}
                                            onChange={handleChange}
                                            placeholder="Rp. 0"
                                        />
                                        
                                        <FormInput
                                            label="Penyertaan Modal 2023"
                                            name="PenyertaanModal2023"
                                            value={formatRupiah(formData.PenyertaanModal2023)}
                                            onChange={handleChange}
                                            placeholder="Rp. 0"
                                        />
                                        
                                        <FormInput
                                            label="Penyertaan Modal 2024"
                                            name="PenyertaanModal2024"
                                            value={formatRupiah(formData.PenyertaanModal2024)}
                                            onChange={handleChange}
                                            placeholder="Rp. 0"
                                        />
                                    </div>
                                </div>

                                {/* Aset */}
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-800 mb-4 border-b border-yellow-200 pb-2">Aset</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FormInput
                                            label="Modal dari Sumber Lain"
                                            name="SumberLain"
                                            value={formatRupiah(formData.SumberLain)}
                                            onChange={handleChange}
                                            placeholder="Rp. 0"
                                        />
                                        
                                        <FormInput
                                            label="Nilai Aset"
                                            name="NilaiAset"
                                            value={formatRupiah(formData.NilaiAset)}
                                            onChange={handleChange}
                                            placeholder="Rp. 0"
                                        />
                                        
                                        <div className="md:col-span-2">
                                            <FormInput
                                                label="Jenis Aset"
                                                name="JenisAset"
                                                type="textarea"
                                                value={formData.JenisAset}
                                                onChange={handleChange}
                                                placeholder="Jelaskan jenis-jenis aset yang dimiliki"
                                            />
                                        </div>
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
                            title="Kemitraan" 
                            subtitle="Kerjasama dengan pihak ketiga"
                        />
                        
                        <div className="bg-gradient-to-br from-pink-50 to-rose-50 rounded-2xl p-6 border border-pink-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput
                                    label="Kemitraan/Kerjasama Pihak Ketiga"
                                    name="KerjasamaPihakKetiga"
                                    type="textarea"
                                    value={formData.KerjasamaPihakKetiga}
                                    onChange={handleChange}
                                    placeholder="Jelaskan kerjasama dengan pihak ketiga"
                                />
                                
                                <FormInput
                                    label="Tahun Mulai - Tahun Berakhir"
                                    name="TahunMulai-TahunBerakhir"
                                    value={formData['TahunMulai-TahunBerakhir']}
                                    onChange={handleChange}
                                    placeholder="Contoh: 2020-2025"
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'kontribusi':
                return (
                    <div className="space-y-8">
                        <SectionHeader 
                            title="Kontribusi PADes" 
                            subtitle="Kontribusi terhadap Pendapatan Asli Desa"
                        />
                        
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100">
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
                            title="Peran BUMDes" 
                            subtitle="Peran dalam program pemerintah"
                        />
                        
                        <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-2xl p-6 border border-teal-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput
                                    label="Peran Program Ketahanan Pangan 2024"
                                    name="Ketapang2024"
                                    type="select"
                                    value={formData.Ketapang2024}
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
                                    value={formData.Ketapang2025}
                                    onChange={handleChange}
                                    options={[
                                        { value: 'Pengelola', label: 'Pengelola' },
                                        { value: 'Distribusi', label: 'Distribusi' },
                                        { value: 'Pemasaran', label: 'Pemasaran' },
                                        { value: 'tidakadaperan', label: 'Tidak Ada Peran' }
                                    ]}
                                />
                                
                                <div className="md:col-span-2">
                                    <FormInput
                                        label="Peran Pada Desa Wisata"
                                        name="DesaWisata"
                                        type="select"
                                        value={formData.DesaWisata}
                                        onChange={handleChange}
                                        options={[
                                            { value: 'PengelolaUtama', label: 'Pengelola Utama' },
                                            { value: 'Pengelola Pendukung', label: 'Pengelola Pendukung' }
                                        ]}
                                    />
                                </div>
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
                        
                        <div className="bg-gradient-to-br from-lime-50 to-green-50 rounded-2xl p-6 border border-lime-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput
                                    label="Bantuan Kementerian"
                                    name="BantuanKementrian"
                                    type="textarea"
                                    value={formData.BantuanKementrian}
                                    onChange={handleChange}
                                    placeholder="Jelaskan bantuan dari kementerian"
                                />
                                
                                <FormInput
                                    label="Bantuan Lainnya"
                                    name="BantuanLaptopShopee"
                                    type="textarea"
                                    value={formData.BantuanLaptopShopee}
                                    onChange={handleChange}
                                    placeholder="Jelaskan bantuan lainnya"
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'laporan':
                return (
                    <div className="space-y-8">
                        <SectionHeader 
                            title="Laporan Keuangan" 
                            subtitle="Laporan pertanggungjawaban keuangan"
                        />
                        
                        <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-2xl p-6 border border-slate-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <FormInput
                                    label="Laporan Keuangan 2021"
                                    name="LaporanKeuangan2021"
                                    type="file"
                                    onChange={handleFileChange}
                                    fileInfo={fileInfo}
                                    onFileInfoChange={handleFileInfoChange}
                                    isValidFileInfo={isValidFileInfo}
                                />
                                
                                <FormInput
                                    label="Laporan Keuangan 2022"
                                    name="LaporanKeuangan2022"
                                    type="file"
                                    onChange={handleFileChange}
                                    fileInfo={fileInfo}
                                    onFileInfoChange={handleFileInfoChange}
                                    isValidFileInfo={isValidFileInfo}
                                />
                                
                                <FormInput
                                    label="Laporan Keuangan 2023"
                                    name="LaporanKeuangan2023"
                                    type="file"
                                    onChange={handleFileChange}
                                    fileInfo={fileInfo}
                                    onFileInfoChange={handleFileInfoChange}
                                    isValidFileInfo={isValidFileInfo}
                                />
                                
                                <FormInput
                                    label="Laporan Keuangan 2024"
                                    name="LaporanKeuangan2024"
                                    type="file"
                                    onChange={handleFileChange}
                                    fileInfo={fileInfo}
                                    onFileInfoChange={handleFileInfoChange}
                                    isValidFileInfo={isValidFileInfo}
                                />
                            </div>
                        </div>
                    </div>
                );

            case 'dokumen':
                return (
                    <div className="space-y-8">
                        <SectionHeader 
                            title="Dokumen Pendirian" 
                            subtitle="Dokumen resmi pendirian BUMDes"
                        />
                        
                        <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 border border-red-100">
                            <div className="space-y-6">
                                <FormInput
                                    label="Nomor Perdes"
                                    name="NomorPerdes"
                                    value={formData.NomorPerdes}
                                    onChange={handleChange}
                                    placeholder="Nomor Peraturan Desa"
                                />
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormInput
                                        label="Perdes"
                                        name="Perdes"
                                        type="file"
                                        onChange={handleFileChange}
                                        fileInfo={fileInfo}
                                        onFileInfoChange={handleFileInfoChange}
                                        isValidFileInfo={isValidFileInfo}
                                    />
                                    
                                    <FormInput
                                        label="Profil BUMDesa"
                                        name="ProfilBUMDesa"
                                        type="file"
                                        onChange={handleFileChange}
                                        fileInfo={fileInfo}
                                        onFileInfoChange={handleFileInfoChange}
                                        isValidFileInfo={isValidFileInfo}
                                    />
                                    
                                    <FormInput
                                        label="Berita Acara"
                                        name="BeritaAcara"
                                        type="file"
                                        onChange={handleFileChange}
                                        fileInfo={fileInfo}
                                        onFileInfoChange={handleFileInfoChange}
                                        isValidFileInfo={isValidFileInfo}
                                    />
                                    
                                    <FormInput
                                        label="Anggaran Dasar"
                                        name="AnggaranDasar"
                                        type="file"
                                        onChange={handleFileChange}
                                        fileInfo={fileInfo}
                                        onFileInfoChange={handleFileInfoChange}
                                        isValidFileInfo={isValidFileInfo}
                                    />
                                    
                                    <FormInput
                                        label="Anggaran Rumah Tangga"
                                        name="AnggaranRumahTangga"
                                        type="file"
                                        onChange={handleFileChange}
                                        fileInfo={fileInfo}
                                        onFileInfoChange={handleFileInfoChange}
                                        isValidFileInfo={isValidFileInfo}
                                    />
                                    
                                    <FormInput
                                        label="Program Kerja"
                                        name="ProgramKerja"
                                        type="file"
                                        onChange={handleFileChange}
                                        fileInfo={fileInfo}
                                        onFileInfoChange={handleFileInfoChange}
                                        isValidFileInfo={isValidFileInfo}
                                    />
                                    
                                    <div className="md:col-span-2">
                                        <FormInput
                                            label="SK BUM Desa (Wajib)"
                                            name="SK_BUM_Desa"
                                            type="file"
                                            onChange={handleFileChange}
                                            required
                                            fileInfo={fileInfo}
                                            onFileInfoChange={handleFileInfoChange}
                                            isValidFileInfo={isValidFileInfo}
                                        />
                                    </div>
                                    
                                    <div className="md:col-span-2">
                                        <FormInput
                                            label="SK BUM Desa (Wajib)"
                                            name="SK_BUM_Desa"
                                            type="file"
                                            onChange={handleFileChange}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Submit Button - Only in dokumen section */}
                        <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-6">
                            <div className="text-center">
                                <div className="mb-6">
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">Kirim Data BUMDes</h3>
                                    <p className="text-slate-600">Pastikan semua data telah diisi dengan benar sebelum mengirim</p>
                                </div>
                                
                                <button 
                                    type="submit" 
                                    disabled={loading}
                                    className="group bg-slate-800 hover:bg-slate-700 disabled:bg-gray-300 text-white px-12 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 disabled:transform-none disabled:cursor-not-allowed flex items-center gap-3 text-lg mx-auto"
                                >
                                    {loading ? (
                                        <>
                                            <FaSpinner className="animate-spin text-xl" />
                                            <span>Menyimpan...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FaPaperPlane className="group-hover:scale-110 transition-transform duration-300 text-xl" />
                                            <span>Simpan Data BUMDes</span>
                                        </>
                                    )}
                                </button>
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
                        <div className="text-slate-400 text-sm mt-2">
                            Fitur lengkap akan segera tersedia
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Enhanced Header */}
            <div className="bg-slate-800 border-b border-slate-700 shadow-xl p-6">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-700 rounded-2xl flex items-center justify-center shadow-lg">
                            <FaPaperPlane className="text-white text-xl" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Form Input BUMDes</h1>
                            <p className="text-slate-300">Isi data BUMDes dengan lengkap dan akurat</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-3">
                        {/* Auto-save status */}
                        {autoSaveStatus && (
                            <div className="flex items-center gap-2 px-4 py-3 bg-green-100 text-green-800 rounded-xl border border-green-200">
                                <FaSave className="text-sm" />
                                <span className="text-sm font-medium">{autoSaveStatus}</span>
                            </div>
                        )}
                        
                        <button 
                            onClick={clearFormData}
                            className="bg-red-500 text-white hover:bg-red-600 px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 flex items-center gap-2"
                        >
                            <FaTrash className="text-sm" />
                            Bersihkan Form
                        </button>
                        
                        <button 
                            onClick={onSwitchToDashboard}
                            className="bg-white text-slate-800 hover:bg-gray-100 px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                        >
                            Dashboard
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row">
                {/* Enhanced Sidebar Navigation */}
                <nav className="lg:w-80 bg-white border-r border-gray-200 shadow-xl overflow-y-auto">
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center">
                                <HiSparkles className="text-white text-xl" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800">Form Sections</h3>
                                <p className="text-sm text-slate-600">Step by step</p>
                            </div>
                        </div>
                        
                        <div className="space-y-2">
                            {formSections.map((section, index) => (
                                <button
                                    key={section.id}
                                    onClick={() => goToSection(section.id)}
                                    className={`w-full text-left p-4 rounded-xl font-medium transition-all duration-300 group ${
                                        activeSection === section.id
                                            ? 'bg-slate-800 text-white shadow-lg'
                                            : 'text-slate-700 hover:bg-gray-50 hover:shadow-md'
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
                    <form onSubmit={handleSubmit} className="flex-1 p-6">
                        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 min-h-full flex flex-col">
                            <div className="p-8 flex-1">
                                {renderSection()}
                            </div>
                            
                            {/* Navigation Buttons */}
                            <div className="px-8 py-6 border-t border-gray-200 bg-gray-50 rounded-b-3xl">
                                <div className="flex justify-between items-center">
                                    <button
                                        type="button"
                                        onClick={goToPreviousSection}
                                        disabled={currentSectionIndex === 0}
                                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
                                            currentSectionIndex === 0
                                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                : 'bg-white text-slate-800 hover:bg-gray-100 shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                                        }`}
                                    >
                                        <FaChevronLeft />
                                        Previous
                                    </button>

                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-slate-600">
                                            Step {currentSectionIndex + 1} of {formSections.length}
                                        </span>
                                        <div className="flex gap-1">
                                            {formSections.map((_, index) => (
                                                <div
                                                    key={index}
                                                    className={`w-2 h-2 rounded-full transition-all duration-300 ${
                                                        index === currentSectionIndex
                                                            ? 'bg-slate-800'
                                                            : index < currentSectionIndex
                                                            ? 'bg-green-500'
                                                            : 'bg-gray-300'
                                                    }`}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    {currentSectionIndex === formSections.length - 1 ? (
                                        <div className="text-sm text-slate-600">
                                            Gunakan tombol "Simpan Data BUMDes" di atas untuk mengirim data
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={goToNextSection}
                                            className="flex items-center gap-2 bg-slate-800 text-white hover:bg-slate-700 px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300"
                                        >
                                            Next
                                            <FaChevronRight />
                                        </button>
                                    )}
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
                title={popupMessage.type === 'error' ? 'Penyimpanan Gagal' : 'Data Tersimpan'}
                message={popupMessage.text} 
                type={popupMessage.type} 
            />
        </div>
    );
}

export default BumdesForm;