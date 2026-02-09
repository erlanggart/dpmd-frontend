import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X, Plus, Trash2 } from 'lucide-react';
import api from '../../api';
import toast from 'react-hot-toast';

// Validation schema
const perjadinSchema = z.object({
  nama_kegiatan: z.string().min(1, 'Nama kegiatan wajib diisi').max(255, 'Maksimal 255 karakter'),
  nomor_sp: z.string().min(1, 'Nomor SP wajib diisi').max(255, 'Maksimal 255 karakter'),
  lokasi: z.string().min(1, 'Tempat kegiatan wajib diisi').max(255, 'Maksimal 255 karakter'),
  tanggal_mulai: z.string().min(1, 'Tanggal mulai wajib diisi'),
  tanggal_selesai: z.string().min(1, 'Tanggal selesai wajib diisi'),
  keterangan: z.string().optional(),
  bidang: z.array(z.object({
    id_bidang: z.number({ required_error: 'Bidang harus dipilih', invalid_type_error: 'Pilih bidang' }).positive('Pilih bidang'),
    pegawai_ids: z.array(z.number()).min(1, 'Minimal 1 pegawai harus dipilih')
  })).min(1, 'Minimal 1 bidang harus dipilih')
});

function PerjadinFormModal({ isOpen, onClose, onSuccess, editData = null }) {
  const [bidangOptions, setBidangOptions] = useState([]);
  const [pegawaiByBidang, setPegawaiByBidang] = useState({}); // { '0': [...], '1': [...] }
  const [loadingBidang, setLoadingBidang] = useState(true);
  const [loadingPegawai, setLoadingPegawai] = useState({}); // { '0': true, '1': false }
  const [submitting, setSubmitting] = useState(false);

  const isEditMode = !!editData;

  console.log('[PerjadinFormModal] Rendered - isOpen:', isOpen, 'isEditMode:', isEditMode);

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm({
    resolver: zodResolver(perjadinSchema),
    defaultValues: {
      nama_kegiatan: '',
      nomor_sp: '',
      lokasi: '',
      tanggal_mulai: '',
      tanggal_selesai: '',
      keterangan: '',
      bidang: [{ id_bidang: '', pegawai_ids: [] }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'bidang'
  });

  const bidangFieldValues = watch('bidang');

  // Fetch bidang options
  useEffect(() => {
    if (isOpen) {
      fetchBidangOptions();
      if (editData) {
        populateEditData();
      } else {
        reset({
          nama_kegiatan: '',
          nomor_sp: '',
          lokasi: '',
          tanggal_mulai: '',
          tanggal_selesai: '',
          keterangan: '',
          bidang: [{ id_bidang: '', pegawai_ids: [] }]
        });
        setPegawaiByBidang({});
      }
    }
  }, [isOpen, editData]);

  const fetchBidangOptions = async () => {
    try {
      console.log('[PerjadinFormModal] Fetching bidang options...');
      setLoadingBidang(true);
      const response = await api.get('/bidang');
      console.log('[PerjadinFormModal] Bidang response:', response.data);

      if (response.data.success) {
        const bidangs = response.data.data || [];
        console.log('[PerjadinFormModal] Setting', bidangs.length, 'bidang options');
        setBidangOptions(bidangs);
      } else {
        console.error('[PerjadinFormModal] Bidang response not successful:', response.data);
        toast.error('Gagal memuat data bidang');
      }
    } catch (error) {
      console.error('[PerjadinFormModal] Error fetching bidang:', error);
      toast.error('Gagal memuat data bidang');
    } finally {
      setLoadingBidang(false);
      console.log('[PerjadinFormModal] Bidang loading complete');
    }
  };

  const populateEditData = async () => {
    if (!editData) return;

    const formattedBidang = editData.bidang.map(b => ({
      id_bidang: b.id_bidang,
      pegawai_ids: b.pegawai.map(p => p.id)
    }));

    reset({
      nama_kegiatan: editData.nama_kegiatan || '',
      nomor_sp: editData.nomor_sp || '',
      lokasi: editData.lokasi || '',
      tanggal_mulai: editData.tanggal_mulai ? editData.tanggal_mulai.split('T')[0] : '',
      tanggal_selesai: editData.tanggal_selesai ? editData.tanggal_selesai.split('T')[0] : '',
      keterangan: editData.keterangan || '',
      bidang: formattedBidang
    });

    // Fetch pegawai for each bidang
    const pegawaiData = {};
    for (let i = 0; i < editData.bidang.length; i++) {
      const b = editData.bidang[i];
      const pegawai = await fetchPegawaiForBidang(b.id_bidang);
      pegawaiData[i] = pegawai;
    }
    setPegawaiByBidang(pegawaiData);
  };

  const fetchPegawaiForBidang = async (bidangId) => {
    try {
      console.log('Fetching pegawai for bidang:', bidangId);
      const response = await api.get(`/pegawai?bidang_id=${bidangId}`);
      console.log('Pegawai response:', response.data);

      if (response.data.success) {
        const pegawaiList = response.data.data || [];
        console.log(`Found ${pegawaiList.length} pegawai for bidang ${bidangId}`);
        return pegawaiList;
      }
      return [];
    } catch (error) {
      console.error(`Error fetching pegawai for bidang ${bidangId}:`, error);
      toast.error('Gagal memuat data pegawai');
      return [];
    }
  };

  const handleBidangChange = async (index, bidangId) => {
    if (!bidangId || bidangId === '') {
      // Clear pegawai if no bidang selected
      setPegawaiByBidang(prev => ({ ...prev, [index]: [] }));
      setValue(`bidang.${index}.pegawai_ids`, []);
      setLoadingPegawai(prev => ({ ...prev, [index]: false }));
      return;
    }

    // Set loading state
    setLoadingPegawai(prev => ({ ...prev, [index]: true }));

    // Fetch pegawai for this bidang
    const pegawai = await fetchPegawaiForBidang(bidangId);
    setPegawaiByBidang(prev => ({ ...prev, [index]: pegawai }));

    // Clear loading state
    setLoadingPegawai(prev => ({ ...prev, [index]: false }));

    // Clear previous pegawai selection
    setValue(`bidang.${index}.pegawai_ids`, []);
  };

  const handlePegawaiToggle = (index, pegawaiId) => {
    const currentPegawai = bidangFieldValues[index]?.pegawai_ids || [];
    const newPegawai = currentPegawai.includes(pegawaiId)
      ? currentPegawai.filter(id => id !== pegawaiId)
      : [...currentPegawai, pegawaiId];

    setValue(`bidang.${index}.pegawai_ids`, newPegawai);
  };

  const onSubmit = async (data) => {
    try {
      setSubmitting(true);

      // Format data for API
      const payload = {
        nama_kegiatan: data.nama_kegiatan,
        nomor_sp: data.nomor_sp,
        lokasi: data.lokasi,
        tanggal_mulai: data.tanggal_mulai,
        tanggal_selesai: data.tanggal_selesai,
        keterangan: data.keterangan || null,
        bidang: data.bidang.map(b => ({
          id_bidang: Number(b.id_bidang),
          pegawai_ids: b.pegawai_ids.map(id => Number(id))
        }))
      };

      let response;
      if (isEditMode) {
        response = await api.put(`/perjadin/kegiatan/${editData.id_kegiatan}`, payload);
      } else {
        response = await api.post('/perjadin/kegiatan', payload);
      }

      if (response.data.success) {
        toast.success(isEditMode ? 'Kegiatan berhasil diperbarui' : 'Kegiatan berhasil dibuat');
        onSuccess();
        onClose();
      } else {
        throw new Error(response.data.message || 'Gagal menyimpan kegiatan');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Gagal menyimpan kegiatan';
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-blue-600 px-6 py-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">
              {isEditMode ? 'Edit Kegiatan Perjadin' : 'Tambah Kegiatan Perjadin'}
            </h3>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="px-6 py-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Basic Fields */}
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Kegiatan <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="nama_kegiatan"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.nama_kegiatan ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Masukkan nama kegiatan"
                      />
                    )}
                  />
                  {errors.nama_kegiatan && (
                    <p className="text-red-500 text-xs mt-1">{errors.nama_kegiatan.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nomor SP <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="nomor_sp"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.nomor_sp ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Masukkan nomor SP"
                      />
                    )}
                  />
                  {errors.nomor_sp && (
                    <p className="text-red-500 text-xs mt-1">{errors.nomor_sp.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tempat Kegiatan <span className="text-red-500">*</span>
                  </label>
                  <Controller
                    name="lokasi"
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.lokasi ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Masukkan lokasi"
                      />
                    )}
                  />
                  {errors.lokasi && (
                    <p className="text-red-500 text-xs mt-1">{errors.lokasi.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tanggal Mulai <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name="tanggal_mulai"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="date"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.tanggal_mulai ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      )}
                    />
                    {errors.tanggal_mulai && (
                      <p className="text-red-500 text-xs mt-1">{errors.tanggal_mulai.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tanggal Selesai <span className="text-red-500">*</span>
                    </label>
                    <Controller
                      name="tanggal_selesai"
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="date"
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                            errors.tanggal_selesai ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      )}
                    />
                    {errors.tanggal_selesai && (
                      <p className="text-red-500 text-xs mt-1">{errors.tanggal_selesai.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Keterangan
                  </label>
                  <Controller
                    name="keterangan"
                    control={control}
                    render={({ field }) => (
                      <textarea
                        {...field}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Keterangan tambahan (optional)"
                      />
                    )}
                  />
                </div>
              </div>

              {/* Bidang & Pegawai Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-base font-semibold text-gray-800">
                    Bidang & Pegawai Terlibat <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => append({ id_bidang: '', pegawai_ids: [] })}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Bidang
                  </button>
                </div>

                {errors.bidang?.root && (
                  <p className="text-red-500 text-sm mb-2">{errors.bidang.root.message}</p>
                )}

                <div className="space-y-4">
                  {fields.map((field, index) => (
                    <div key={field.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-gray-700">Bidang {index + 1}</span>
                        {fields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="space-y-3">
                        {/* Bidang Dropdown */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Pilih Bidang
                          </label>
                          <Controller
                            name={`bidang.${index}.id_bidang`}
                            control={control}
                            render={({ field: controllerField }) => (
                              <select
                                value={controllerField.value}
                                onChange={(e) => {
                                  const value = e.target.value ? Number(e.target.value) : '';
                                  controllerField.onChange(value);
                                  handleBidangChange(index, value);
                                }}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                                  errors.bidang?.[index]?.id_bidang ? 'border-red-500' : 'border-gray-300'
                                }`}
                                disabled={loadingBidang}
                              >
                                <option value="">-- Pilih Bidang --</option>
                                {bidangOptions.map(b => (
                                  <option key={b.id} value={b.id}>{b.nama}</option>
                                ))}
                              </select>
                            )}
                          />
                          {errors.bidang?.[index]?.id_bidang && (
                            <p className="text-red-500 text-xs mt-1">
                              {errors.bidang[index].id_bidang.message}
                            </p>
                          )}
                        </div>

                        {/* Pegawai Multi-Select */}
                        {bidangFieldValues[index]?.id_bidang && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Pilih Pegawai (centang beberapa)
                            </label>

                            {/* Loading State */}
                            {loadingPegawai[index] ? (
                              <div className="flex items-center justify-center py-8 border border-gray-300 rounded-lg bg-white">
                                <div className="text-center">
                                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent mx-auto mb-2"></div>
                                  <p className="text-sm text-gray-500">Memuat pegawai...</p>
                                </div>
                              </div>
                            ) : pegawaiByBidang[index] && pegawaiByBidang[index].length > 0 ? (
                              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-2 bg-white">
                                {pegawaiByBidang[index].map(pegawai => (
                                  <label
                                    key={pegawai.id_pegawai}
                                    className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={bidangFieldValues[index]?.pegawai_ids?.includes(Number(pegawai.id_pegawai)) || false}
                                      onChange={() => handlePegawaiToggle(index, Number(pegawai.id_pegawai))}
                                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-gray-700">{pegawai.nama_pegawai}</span>
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 italic border border-gray-300 rounded-lg p-3 bg-gray-50">
                                Tidak ada pegawai di bidang ini
                              </p>
                            )}

                            {errors.bidang?.[index]?.pegawai_ids && (
                              <p className="text-red-500 text-xs mt-1">
                                {errors.bidang[index].pegawai_ids.message}
                              </p>
                            )}

                            {/* Selected pegawai count */}
                            {bidangFieldValues[index]?.pegawai_ids && bidangFieldValues[index].pegawai_ids.length > 0 && (
                              <p className="text-xs text-blue-600 mt-1">
                                {bidangFieldValues[index].pegawai_ids.length} pegawai dipilih
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
                disabled={submitting}
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                disabled={submitting}
              >
                {submitting ? 'Menyimpan...' : isEditMode ? 'Update Kegiatan' : 'Simpan Kegiatan'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default PerjadinFormModal;
