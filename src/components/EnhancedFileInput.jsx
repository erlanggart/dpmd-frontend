import React, { useState, useRef, useEffect } from 'react';
import { FaUpload, FaFile, FaTimes, FaCheck, FaExclamationTriangle } from 'react-icons/fa';

const EnhancedFileInput = ({ 
  label, 
  name, 
  onChange, 
  disabled, 
  required = false,
  fileInfo,
  onFileInfoChange,
  isValidFileInfo
}) => {
  const fileInputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  // Load file info from localStorage on mount
  useEffect(() => {
    if (fileInfo && fileInfo[name] && isValidFileInfo(name)) {
      // File info exists and is valid, show it
      console.log(`Restored file info for ${name}:`, fileInfo[name]);
    }
  }, [fileInfo, name, isValidFileInfo]);

  const handleFileSelect = (file) => {
    if (file) {
      // Validate file type and size
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!allowedTypes.includes(file.type)) {
        alert('File harus berformat PDF, DOC, atau DOCX');
        return;
      }

      if (file.size > maxSize) {
        alert('Ukuran file maksimal 5MB');
        return;
      }

      setSelectedFile(file);
      onFileInfoChange(name, file);
      
      // Trigger onChange for form
      const event = {
        target: {
          name: name,
          files: [file]
        }
      };
      onChange(event);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const removeFile = () => {
    setSelectedFile(null);
    onFileInfoChange(name, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Trigger onChange for form
    const event = {
      target: {
        name: name,
        files: []
      }
    };
    onChange(event);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Get current file to display (either selected or from localStorage)
  const currentFile = selectedFile || (fileInfo && fileInfo[name] && isValidFileInfo(name) ? fileInfo[name] : null);
  const hasFile = !!currentFile;

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <div
        className={`relative border-2 border-dashed rounded-xl transition-all duration-300 ${
          dragOver
            ? 'border-blue-500 bg-blue-50'
            : hasFile
            ? 'border-green-500 bg-green-50'
            : 'border-slate-300 bg-slate-50 hover:border-slate-400 hover:bg-slate-100'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          name={name}
          onChange={handleFileChange}
          disabled={disabled}
          accept=".pdf,.doc,.docx"
          className="hidden"
        />
        
        <div className="p-6 text-center">
          {hasFile ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <FaCheck className="text-green-600 text-xl" />
                </div>
              </div>
              
              <div>
                <p className="font-semibold text-slate-800 truncate">
                  {currentFile.name || 'File terpilih'}
                </p>
                <p className="text-sm text-slate-600">
                  {currentFile.size ? formatFileSize(currentFile.size) : 'Ukuran tidak diketahui'}
                </p>
                {fileInfo && fileInfo[name] && !selectedFile && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center justify-center gap-1">
                    <FaExclamationTriangle className="text-xs" />
                    File tersimpan dari sesi sebelumnya
                  </p>
                )}
              </div>
              
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile();
                }}
                className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
              >
                <FaTimes className="text-xs" />
                Hapus File
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center">
                  <FaUpload className="text-slate-600 text-xl" />
                </div>
              </div>
              
              <div>
                <p className="font-semibold text-slate-800">
                  Pilih file atau drag & drop
                </p>
                <p className="text-sm text-slate-600">
                  PDF, DOC, DOCX • Maksimal 5MB
                </p>
              </div>
              
              <div className="text-xs text-slate-500">
                Klik area ini untuk memilih file
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedFileInput;