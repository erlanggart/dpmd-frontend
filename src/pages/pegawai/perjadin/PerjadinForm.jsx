import { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, X, Check, AlertCircle, Users, FileText, MapPin, Calendar, Loader2 } from 'lucide-react';
import api from '../../../api';
import perjadinService from '../../../services/perjadinService';
import toast from 'react-hot-toast';

const formSchema = z.object({
  nama_kegiatan: z.string().min(1, 'Nama kegiatan wajib diisi'),
  nomor_sp: z.string().min(1, 'Nomor SP wajib diisi'),
  tanggal_mulai: z.string().min(1, 'Tanggal mulai wajib diisi'),
  tanggal_selesai: z.string().min(1, 'Tanggal selesai wajib diisi'),
  lokasi: z.string().min(1, 'Lokasi wajib diisi'),
  keterangan: z.string().optional(),
  bidang: z.array(z.object({
    id_bidang: z.union([z.number(), z.string()]).refine(val => val !== '' && val !== 0, 'Pilih bidang'),
    pegawai_ids: z.array(z.number()).min(1, 'Minimal 1 pegawai harus dipilih')
  })).min(1, 'Minimal 1 bidang harus dipilih')
});

function PerjadinForm({ editData = null, onSuccess, onCancel }) {
  const [bidangOptions, setBidangOptions] = useState([]);
  const [pegawaiByBidang, setPegawaiByBidang] = useState({});
  const [loadingBidang, setLoadingBidang] = useState(true);
  const [loadingPegawai, setLoadingPegawai] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const isEditMode = !!editData;

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nama_kegiatan: '',
      nomor_sp: '',
      tanggal_mulai: '',
      tanggal_selesai: '',
      lokasi: '',
      keterangan: '',
      bidang: [{ id_bidang: '', pegawai_ids: [] }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'bidang'
  });

  useEffect(() => {
    fetchBidangOptions();
    if (editData) {
      populateEditData();
    }
  }, [editData]);

  const fetchBidangOptions = async () => {
    try {
      setLoadingBidang(true);
      const response = await api.get('/bidang');
      if (response.data.success) {
        setBidangOptions(response.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching bidang:', error);
      toast.error('Gagal memuat data bidang');
    } finally {
      setLoadingBidang(false);
    }
  };

  const populateEditData = async () => {
    if (!editData) return;

    const formattedBidang = editData.bidang.map(b => ({
      id_bidang: b.id_bidang,
      pegawai_ids: b.pegawai.map(p => Number(p.id))
    }));

    setValue('nama_kegiatan', editData.nama_kegiatan);
    setValue('nomor_sp', editData.nomor_sp);
    setValue('tanggal_mulai', editData.tanggal_mulai?.split('T')[0] || '');
    setValue('tanggal_selesai', editData.tanggal_selesai?.split('T')[0] || '');
    setValue('lokasi', editData.lokasi);
    setValue('keterangan', editData.keterangan || '');
    setValue('bidang', formattedBidang);

    // Fetch pegawai for each bidang with preservePegawai = true
    for (let i = 0; i < formattedBidang.length; i++) {
      await handleBidangChange(i, formattedBidang[i].id_bidang, true);
    }
  };

  const fetchPegawaiForBidang = async (bidangId) => {
    try {
      const response = await api.get(`/pegawai?bidang_id=${bidangId}`);
      if (response.data.success) {
        return response.data.data || [];
      }
      return [];
    } catch (error) {
      console.error(`Error fetching pegawai for bidang ${bidangId}:`, error);
      toast.error('Gagal memuat data pegawai');
      return [];
    }
  };

  const handleBidangChange = async (index, bidangId, preservePegawai = false) => {
    if (!bidangId || bidangId === '') {
      setPegawaiByBidang(prev => ({ ...prev, [index]: [] }));
      setValue(`bidang.${index}.pegawai_ids`, []);
      setLoadingPegawai(prev => ({ ...prev, [index]: false }));
      return;
    }

    setLoadingPegawai(prev => ({ ...prev, [index]: true }));
    const pegawai = await fetchPegawaiForBidang(bidangId);
    setPegawaiByBidang(prev => ({ ...prev, [index]: pegawai }));
    setLoadingPegawai(prev => ({ ...prev, [index]: false }));

    // Only clear pegawai selection if not preserving (new selection, not edit)
    if (!preservePegawai) {
      setValue(`bidang.${index}.pegawai_ids`, []);
    }
  };

  const handlePegawaiToggle = (index, pegawaiId) => {
    const currentField = watch(`bidang.${index}`);
    const currentPegawai = currentField?.pegawai_ids || [];
    const newPegawai = currentPegawai.includes(pegawaiId)
      ? currentPegawai.filter(id => id !== pegawaiId)
      : [...currentPegawai, pegawaiId];
    setValue(`bidang.${index}.pegawai_ids`, newPegawai);
  };

  const onSubmit = async (data) => {
    try {
      setSubmitting(true);

      const payload = {
        ...data,
        bidang: data.bidang.map(b => ({
          id_bidang: Number(b.id_bidang),
          pegawai_ids: b.pegawai_ids.map(id => Number(id))
        }))
      };

      let response;
      if (isEditMode) {
        response = await perjadinService.updateKegiatan(editData.id_kegiatan, payload);
      } else {
        response = await perjadinService.createKegiatan(payload);
      }

      if (response.data.success) {
        toast.success(isEditMode ? 'Kegiatan berhasil diupdate' : 'Kegiatan berhasil dibuat');
        reset();
        onSuccess();
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      toast.error(error.response?.data?.message || 'Gagal menyimpan kegiatan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="bg-[#2C3E50] px-6 py-4">
        <h2 className="text-xl font-bold text-white">
          {isEditMode ? 'Edit Kegiatan' : 'Formulir Kegiatan'}
        </h2>
        <p className="text-gray-300 text-sm mt-1">
          Lengkapi semua informasi yang diperlukan dengan detail
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-6">
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          {/* Section Header */}
          <div className="border-l-4 border-blue-600 pl-4 mb-6">
            <h3 className="text-lg font-bold text-gray-800">Informasi Dasar</h3>
            <p className="text-sm text-gray-600">Data utama kegiatan perjalanan dinas</p>
          </div>

          {/* Basic Fields */}
          <div className="space-y-4">
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
                    placeholder="Masukkan nama kegiatan lengkap"
                  />
                )}
              />
              {errors.nama_kegiatan && (
                <p className="text-red-500 text-xs mt-1">{errors.nama_kegiatan.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      placeholder="Nomor Surat Perintah"
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
                      placeholder="Lokasi kegiatan"
                    />
                  )}
                />
                {errors.lokasi && (
                  <p className="text-red-500 text-xs mt-1">{errors.lokasi.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Tambahkan keterangan kegiatan (opsional)"
                  />
                )}
              />
            </div>
          </div>
        </div>

        {/* Bidang & Pegawai Section */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="border-l-4 border-green-600 pl-4 mb-6">
            <h3 className="text-lg font-bold text-gray-800">Bidang & Pegawai</h3>
            <p className="text-sm text-gray-600">Pilih bidang dan pegawai yang terlibat dalam kegiatan</p>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => {
              const currentBidangId = watch(`bidang.${index}.id_bidang`);
              const currentPegawaiIds = watch(`bidang.${index}.pegawai_ids`) || [];

              return (
                <div key={field.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-[#2C3E50] rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">{index + 1}</span>
                      </div>
                      <h4 className="font-semibold text-gray-700">Bidang {index + 1}</h4>
                    </div>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="flex items-center gap-1 text-red-600 hover:text-red-700 px-3 py-1.5 hover:bg-red-50 rounded-lg transition text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Hapus</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Bidang Dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pilih Bidang <span className="text-red-500">*</span>
                      </label>
                      <Controller
                        name={`bidang.${index}.id_bidang`}
                        control={control}
                        render={({ field: bidangField }) => (
                          <select
                            {...bidangField}
                            value={bidangField.value || ''}
                            onChange={(e) => {
                              const value = e.target.value ? Number(e.target.value) : '';
                              bidangField.onChange(value);
                              handleBidangChange(index, value);
                            }}
                            className={`w-full px-3 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition ${
                              errors.bidang?.[index]?.id_bidang ? 'border-red-500 bg-red-50' : 'border-gray-300'
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
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.bidang[index].id_bidang.message}
                        </p>
                      )}
                    </div>

                    {/* Pegawai Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Pilih Pegawai <span className="text-red-500">*</span>
                        {currentPegawaiIds.length > 0 && (
                          <span className="ml-2 text-xs text-blue-600 font-normal">
                            ({currentPegawaiIds.length} dipilih)
                          </span>
                        )}
                      </label>

                      {loadingPegawai[index] ? (
                        <div className="flex items-center justify-center py-8 border border-gray-300 rounded-lg bg-white">
                          <div className="text-center">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-500 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">Memuat pegawai...</p>
                          </div>
                        </div>
                      ) : !currentBidangId ? (
                        <div className="flex items-center justify-center py-8 border border-gray-300 rounded-lg bg-gray-100">
                          <p className="text-sm text-gray-500">Pilih bidang terlebih dahulu</p>
                        </div>
                      ) : pegawaiByBidang[index]?.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto border border-gray-300 rounded-lg bg-white p-2">
                          {pegawaiByBidang[index].map(pegawai => {
                            const isChecked = currentPegawaiIds.includes(Number(pegawai.id_pegawai));
                            return (
                              <label
                                key={pegawai.id_pegawai}
                                className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition ${
                                  isChecked
                                    ? 'bg-blue-50 border border-blue-200'
                                    : 'hover:bg-gray-50 border border-transparent'
                                }`}
                              >
                                <div className={`w-5 h-5 rounded flex items-center justify-center transition ${
                                  isChecked
                                    ? 'bg-blue-600 text-white'
                                    : 'border-2 border-gray-300 bg-white'
                                }`}>
                                  {isChecked && <Check className="w-3 h-3" />}
                                </div>
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={isChecked}
                                  onChange={() => handlePegawaiToggle(index, Number(pegawai.id_pegawai))}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">
                                    {pegawai.nama_pegawai}
                                  </p>
                                </div>
                                {isChecked && (
                                  <span className="text-xs text-blue-600 font-medium">Dipilih</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-8 border border-gray-300 rounded-lg bg-gray-100">
                          <p className="text-sm text-gray-500 italic">Tidak ada pegawai di bidang ini</p>
                        </div>
                      )}

                      {errors.bidang?.[index]?.pegawai_ids && (
                        <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          {errors.bidang[index].pegawai_ids.message}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => append({ id_bidang: '', pegawai_ids: [] })}
            className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-[#2C3E50] text-white rounded-lg hover:bg-[#34495e] transition font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Bidang Lain</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            <span className="text-red-500">*</span> Wajib diisi
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{isEditMode ? 'Update Kegiatan' : 'Simpan Kegiatan'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default PerjadinForm;
