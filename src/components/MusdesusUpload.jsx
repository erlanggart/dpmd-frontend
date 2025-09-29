import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../api';
import { 
  CloudArrowUpIcon, 
  DocumentIcon, 
  XMarkIcon,
  PlusIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const MusdesusUpload = ({ onClose }) => {
  const [formData, setFormData] = useState({
    kecamatan_id: '',
    desa_id: '',
    nama_pengupload: '',
    email_pengupload: '',
    telepon_pengupload: '',
    keterangan: '',
    tanggal_musdesus: ''
  });

  const [files, setFiles] = useState([]);
  const [kecamatanList, setKecamatanList] = useState([]);
  const [desaList, setDesaList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [desaUploadStatus, setDesaUploadStatus] = useState(null);
  const [isCheckingDesa, setIsCheckingDesa] = useState(false);

  // Fetch kecamatan list on component mount
  useEffect(() => {
    fetchKecamatan();
  }, []);

  // Fetch desa when kecamatan changes
  useEffect(() => {
    if (formData.kecamatan_id) {
      fetchDesa(formData.kecamatan_id);
    } else {
      setDesaList([]);
      setFormData(prev => ({ ...prev, desa_id: '' }));
      setDesaUploadStatus(null);
    }
  }, [formData.kecamatan_id]);

  // Check desa upload status when desa changes
  useEffect(() => {
    if (formData.desa_id) {
      checkDesaUploadStatus(formData.desa_id);
    } else {
      setDesaUploadStatus(null);
    }
  }, [formData.desa_id]);

  const fetchKecamatan = async () => {
    try {
      const response = await api.get('/musdesus/kecamatan');
      if (response.data.success) {
        setKecamatanList(response.data.data);
      } else {
        toast.error('Gagal memuat data kecamatan');
      }
    } catch (error) {
      toast.error('Gagal memuat data kecamatan');
      console.error('Error fetching kecamatan:', error);
    }
  };

  const fetchDesa = async (kecamatanId) => {
    try {
      const response = await api.get(`/musdesus/desa/${kecamatanId}`);
      if (response.data.success) {
        setDesaList(response.data.data);
      } else {
        toast.error('Gagal memuat data desa');
      }
    } catch (error) {
      toast.error('Gagal memuat data desa');
      console.error('Error fetching desa:', error);
    }
  };

  const checkDesaUploadStatus = async (desaId) => {
    setIsCheckingDesa(true);
    try {
      const response = await api.get(`/musdesus/check-desa/${desaId}`);
      if (response.data.success) {
        setDesaUploadStatus(response.data);
        if (response.data.already_uploaded) {
          toast.warning(response.data.message);
        }
      }
    } catch (error) {
      console.error('Error checking desa upload status:', error);
      setDesaUploadStatus(null);
    } finally {
      setIsCheckingDesa(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateFile = (file) => {
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!validTypes.includes(file.type)) {
      toast.error(`File ${file.name} tidak diperbolehkan. Hanya PDF, DOC, DOCX, JPG, JPEG, PNG yang diizinkan.`);
      return false;
    }
    
    if (file.size > maxSize) {
      toast.error(`File ${file.name} terlalu besar. Maksimal 10MB per file.`);
      return false;
    }
    
    return true;
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(validateFile);
    setFiles(prev => [...prev, ...validFiles]);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const validFiles = droppedFiles.filter(validateFile);
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const addMoreFiles = () => {
    document.getElementById('file-upload-additional').click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (files.length === 0) {
      toast.error('Pilih minimal 1 file untuk diupload');
      return;
    }

    if (!formData.kecamatan_id || !formData.desa_id || !formData.nama_pengupload) {
      toast.error('Kecamatan, Desa, dan Nama Pengupload wajib diisi');
      return;
    }

    // Check if desa already uploaded
    if (desaUploadStatus?.already_uploaded) {
      toast.error('Desa ini sudah pernah melakukan upload sebelumnya. Satu desa hanya dapat upload satu kali.');
      return;
    }

    setIsLoading(true);
    setUploadProgress(0);

    try {
      const submitData = new FormData();
      
      // Append form data
      Object.keys(formData).forEach(key => {
        if (formData[key]) {
          submitData.append(key, formData[key]);
        }
      });

      // Append files
      files.forEach(file => {
        submitData.append('files[]', file);
      });

      const response = await api.post('/musdesus/upload', submitData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        }
      });

      if (response.data.success) {
        toast.success('File berhasil diupload!');
        
        // Reset form
        setFormData({
          kecamatan_id: '',
          desa_id: '',
          nama_pengupload: '',
          email_pengupload: '',
          telepon_pengupload: '',
          keterangan: '',
          tanggal_musdesus: ''
        });
        setFiles([]);
        setUploadProgress(0);
        
        if (onClose) onClose();
      } else {
        toast.error(response.data.message || 'Gagal mengupload file');
      }

    } catch (error) {
      if (error.response?.data?.errors) {
        Object.values(error.response.data.errors).forEach(errorMessages => {
          errorMessages.forEach(message => toast.error(message));
        });
      } else {
        toast.error(error.response?.data?.message || 'Gagal mengupload file');
      }
      console.error('Upload error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file) => {
    if (file.type.includes('pdf')) return '📄';
    if (file.type.includes('word')) return '📝';
    if (file.type.includes('image')) return '🖼️';
    return '📄';
  };

  return (
    <div className="bg-white rounded-xl shadow-2xl max-w-6xl mx-auto overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-white">Upload File Hasil Musdesus</h2>
            <p className="text-blue-100 mt-1">Koperasi Desa Merah Putih</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white hover:text-blue-200 transition-colors p-2 rounded-full hover:bg-blue-600"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-8">
        {/* Alert Info */}
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-blue-400 mr-3 mt-0.5" />
            <div>
              <p className="text-sm text-blue-800">
                <strong>Informasi:</strong> Upload file hasil musdesus dalam format PDF, DOC, DOCX, JPG, JPEG, atau PNG. Maksimal 10MB per file.
              </p>
            </div>
          </div>
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Form Fields */}
          <div className="space-y-6">
            {/* Pilih Kecamatan */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Kecamatan <span className="text-red-500">*</span>
              </label>
              <select
                name="kecamatan_id"
                value={formData.kecamatan_id}
                onChange={handleInputChange}
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white"
                required
              >
                <option value="">Pilih Kecamatan</option>
                {kecamatanList.map(kecamatan => (
                  <option key={kecamatan.id} value={kecamatan.id}>
                    {kecamatan.nama}
                  </option>
                ))}
              </select>
            </div>

            {/* Pilih Desa */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Desa <span className="text-red-500">*</span>
              </label>
              <select
                name="desa_id"
                value={formData.desa_id}
                onChange={handleInputChange}
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white disabled:bg-gray-100"
                required
                disabled={!formData.kecamatan_id}
              >
                <option value="">Pilih Desa</option>
                {desaList.map(desa => (
                  <option key={desa.id} value={desa.id}>
                    {desa.nama}
                  </option>
                ))}
              </select>
              
              {/* Status Upload Desa */}
              {isCheckingDesa && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    <span className="text-sm text-gray-600">Mengecek status upload desa...</span>
                  </div>
                </div>
              )}
              
              {desaUploadStatus?.already_uploaded && (
                <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-semibold text-red-800 mb-1">
                        Desa Sudah Pernah Upload!
                      </h4>
                      <p className="text-sm text-red-700 mb-2">
                        {desaUploadStatus.message}
                      </p>
                      <div className="text-xs text-red-600 space-y-1">
                        <p><strong>Upload terakhir:</strong> {desaUploadStatus.upload_info?.upload_date}</p>
                        <p><strong>Diupload oleh:</strong> {desaUploadStatus.upload_info?.uploader_name}</p>
                        <p><strong>Jumlah file:</strong> {desaUploadStatus.upload_info?.files_count} file</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {desaUploadStatus?.already_uploaded === false && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="h-4 w-4 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-green-700">Desa belum pernah upload, dapat melakukan upload.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Nama Pengupload */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Nama Pengupload <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="nama_pengupload"
                value={formData.nama_pengupload}
                onChange={handleInputChange}
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                placeholder="Masukkan nama lengkap"
                required
              />
            </div>

            {/* Email & Phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Email
                </label>
                <input
                  type="email"
                  name="email_pengupload"
                  value={formData.email_pengupload}
                  onChange={handleInputChange}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  No. Telepon
                </label>
                <input
                  type="tel"
                  name="telepon_pengupload"
                  value={formData.telepon_pengupload}
                  onChange={handleInputChange}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="08123456789"
                />
              </div>
            </div>

            {/* Tanggal Musdesus */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Tanggal Musdesus
              </label>
              <input
                type="date"
                name="tanggal_musdesus"
                value={formData.tanggal_musdesus}
                onChange={handleInputChange}
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>

            {/* Keterangan */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Keterangan
              </label>
              <textarea
                name="keterangan"
                value={formData.keterangan}
                onChange={handleInputChange}
                rows={4}
                className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                placeholder="Keterangan tambahan (opsional)"
              />
            </div>
          </div>

          {/* Right Column - File Upload */}
          <div className="space-y-6">
            {/* File Upload Area */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Upload File <span className="text-red-500">*</span>
              </label>
              
              {/* Drag & Drop Area */}
              <div
                className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload-additional"
                />
                
                <CloudArrowUpIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer"
                >
                  <span className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold">
                    <DocumentIcon className="w-5 h-5 mr-2" />
                    Pilih File
                  </span>
                </label>
                
                <p className="text-gray-600 mt-4 text-sm">
                  atau drag & drop file di sini
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  PDF, DOC, DOCX, JPG, JPEG, PNG (Max: 10MB per file)
                </p>
              </div>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">
                    File yang akan diupload ({files.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addMoreFiles}
                    className="inline-flex items-center px-3 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Tambah File
                  </button>
                </div>
                
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
                      <div className="flex items-center">
                        <span className="text-2xl mr-3">{getFileIcon(file)}</span>
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-48">{file.name}</p>
                          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-100 p-2 rounded-full transition-colors"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload Progress */}
            {isLoading && uploadProgress > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between text-sm text-blue-800 mb-2">
                  <span className="font-medium">Uploading...</span>
                  <span className="font-bold">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-3">
                  <div
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-8 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-semibold"
              disabled={isLoading}
            >
              Batal
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || files.length === 0 || desaUploadStatus?.already_uploaded}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-semibold flex items-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Mengupload...
              </>
            ) : desaUploadStatus?.already_uploaded ? (
              <>
                <ExclamationTriangleIcon className="w-5 h-5 mr-2" />
                Upload Diblokir
              </>
            ) : (
              <>
                <CloudArrowUpIcon className="w-5 h-5 mr-2" />
                Upload File ({files.length})
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default MusdesusUpload;