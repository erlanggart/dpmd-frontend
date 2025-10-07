import React from "react";

const Row = ({ label, value }) => (
	<div className="flex gap-3 py-1">
		<div className="w-48 text-sm text-gray-500">{label}</div>
		<div className="flex-1 text-sm text-gray-800">{value || "-"}</div>
	</div>
);

export default function PengurusDetail({ data }) {
	if (!data) return null;

	return (
		<div className="p-4 rounded-lg border bg-white">
			<div className="flex items-center gap-4 mb-4">
				{data.avatar && (
					<img
						src={data.avatar_url || data.avatar}
						alt="Avatar"
						className="w-16 h-16 rounded object-cover border"
					/>
				)}
				<div>
					<div className="text-lg font-semibold">
						{data.nama_lengkap || data.nama || "-"}
					</div>
					<div className="text-sm text-gray-600">{data.jabatan || "-"}</div>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<Row label="Nama Lengkap" value={data.nama_lengkap || data.nama} />
					<Row label="NIK" value={data.nik} />
					<Row label="Tempat Lahir" value={data.tempat_lahir} />
					<Row label="Tanggal Lahir" value={data.tanggal_lahir} />
					<Row label="Jenis Kelamin" value={data.jenis_kelamin} />
					<Row label="Status Perkawinan" value={data.status_perkawinan} />
					<Row label="Pendidikan" value={data.pendidikan} />
				</div>
				<div>
					<Row label="Alamat" value={data.alamat} />
					<Row label="No. Telepon" value={data.no_telepon || data.kontak} />
					<Row label="Tgl Mulai Jabatan" value={data.tanggal_mulai_jabatan} />
					<Row label="Tgl Akhir Jabatan" value={data.tanggal_akhir_jabatan} />
					<Row label="Status Jabatan" value={data.status_jabatan} />
					<Row label="Status Verifikasi" value={data.status_verifikasi} />
					<Row label="Produk Hukum ID" value={data.produk_hukum_id} />
				</div>
			</div>
		</div>
	);
}
