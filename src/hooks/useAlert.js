// src/hooks/useAlert.js
import { useState, useCallback } from 'react';
import AlertDialog from '../components/mobile/AlertDialog';

/**
 * useAlert Hook - Custom hook untuk alert dialog
 * Menggantikan window.alert() dengan UI yang lebih bagus
 * 
 * Usage:
 * const { alertDialog, showAlert } = useAlert();
 * 
 * const handleSuccess = () => {
 *   showAlert({
 *     title: 'Berhasil',
 *     message: 'Data berhasil disimpan!',
 *     type: 'success'
 *   });
 * };
 * 
 * return (
 *   <>
 *     <button onClick={handleSuccess}>Save</button>
 *     {alertDialog}
 *   </>
 * );
 */
export const useAlert = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({});

  const showAlert = useCallback((options = {}) => {
    setConfig({
      title: options.title || 'Pemberitahuan',
      message: options.message || '',
      buttonText: options.buttonText || 'OK',
      type: options.type || 'info'
    });
    setIsOpen(true);

    if (options.onClose) {
      // Store callback for when dialog closes
      setConfig(prev => ({ ...prev, onCloseCallback: options.onClose }));
    }
  }, []);

  const handleClose = useCallback(() => {
    if (config.onCloseCallback) {
      config.onCloseCallback();
    }
    setIsOpen(false);
  }, [config]);

  const alertDialog = isOpen ? (
    <AlertDialog
      isOpen={isOpen}
      onClose={handleClose}
      {...config}
    />
  ) : null;

  return { alertDialog, showAlert, isAlertOpen: isOpen };
};

export default useAlert;
