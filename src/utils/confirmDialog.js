// Helper konfirmasi berbasis SweetAlert2 — pengganti window.confirm bawaan.
// Dipakai agar dialog konfirmasi seragam & sesuai tema aplikasi.
import Swal from 'sweetalert2';

/**
 * Tampilkan dialog konfirmasi. Mengembalikan Promise<boolean>.
 *
 * @param {Object}  opts
 * @param {string}  opts.title        - Judul dialog
 * @param {string} [opts.text]        - Deskripsi (plain text)
 * @param {string} [opts.html]        - Deskripsi (HTML, menimpa text)
 * @param {'warning'|'question'|'info'|'success'|'error'} [opts.icon='warning']
 * @param {string} [opts.confirmText='Ya']
 * @param {string} [opts.cancelText='Batal']
 * @param {string} [opts.confirmColor='#0d9488'] - Warna tombol konfirmasi (default teal)
 * @returns {Promise<boolean>} true jika user menekan konfirmasi
 */
export const confirmDialog = async ({
  title,
  text,
  html,
  icon = 'warning',
  confirmText = 'Ya',
  cancelText = 'Batal',
  confirmColor = '#0d9488',
} = {}) => {
  const result = await Swal.fire({
    title,
    text: html ? undefined : text,
    html,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: confirmColor,
    cancelButtonColor: '#6b7280',
    reverseButtons: true,
    buttonsStyling: true,
    customClass: { popup: 'rounded-2xl' },
  });
  return result.isConfirmed;
};

export default confirmDialog;
