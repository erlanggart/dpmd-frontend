import React from "react";
import { useNavigate } from "react-router-dom";
// actions are handled on the detail page

const getBaseHost = () => {
	const apiBase =
		import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
	// remove trailing /api or /api/
	return apiBase.replace(/\/?api\/?$/, "");
};

const getPasFotoUrl = (person) => {
	if (person?.file_pas_foto) {
		return `${getBaseHost()}/uploads/aparatur_desa_files/${
			person.file_pas_foto
		}`;
	}
	return "/user-default.svg";
};

const PersonCard = ({ person }) => {
	if (!person) return null;
	const nav = useNavigate();
	const statusColor =
		person.status === "Aktif"
			? "bg-green-100 text-green-700"
			: "bg-red-100 text-red-700";
	return (
		<div
			className="bg-white border border-slate-300 rounded-lg shadow p-4 min-w-[220px] text-center cursor-pointer hover:shadow-md transition"
			onClick={() => nav(`/desa/aparatur-desa/${person.id}`)}
		>
			<div className="flex justify-center">
				<img
					src={getPasFotoUrl(person)}
					onError={(e) => {
						e.currentTarget.src = "/user-default.svg";
					}}
					alt={person.nama_lengkap || "Foto Aparatur"}
					className="w-16 h-16 rounded-full object-cover border border-slate-300"
				/>
			</div>
			<div
				className={`inline-block text-xs px-2 py-0.5 rounded ${statusColor}`}
			>
				{person.status || "-"}
			</div>
			<div className="mt-2 font-semibold">{person.nama_lengkap || "-"}</div>
			<div className="text-sm text-gray-500">{person.jabatan || "-"}</div>
			{/* actions removed: navigate by clicking card; edit on detail page */}
		</div>
	);
};

const Section = ({ title, children }) => (
	<div className="space-y-3">
		<h4 className="text-center font-semibold text-gray-700">{title}</h4>
		<div className="flex flex-wrap justify-center gap-4">{children}</div>
	</div>
);

const AparaturDesaOrgChart = ({ aparatur = [] }) => {
	// Show only active personnel in the org chart
	const activeOnly = (aparatur || []).filter(
		(p) => (p.status || "").toLowerCase() === "aktif"
	);

	const byExact = (jab) =>
		activeOnly.find(
			(p) => (p.jabatan || "").toLowerCase() === jab.toLowerCase()
		);
	const byInclude = (kw) =>
		activeOnly.filter((p) =>
			(p.jabatan || "").toLowerCase().includes(kw.toLowerCase())
		);

	const kepalaDesa = byExact("Kepala Desa");
	const sekretaris = byExact("Sekretaris Desa");
	const kaur = byInclude("Kaur");
	const kasi = byInclude("Kasi");
	const kadus = byExact("Kepala Dusun")
		? activeOnly.filter((p) => p.jabatan === "Kepala Dusun")
		: byInclude("Kepala Dusun");
	const staf = byInclude("Staf Desa");

	// Others (not in known categories)
	const usedIds = new Set(
		[
			kepalaDesa?.id,
			sekretaris?.id,
			...kaur.map((x) => x.id),
			...kasi.map((x) => x.id),
			...kadus.map((x) => x.id),
			...staf.map((x) => x.id),
		].filter(Boolean)
	);
	const others = activeOnly.filter((p) => !usedIds.has(p.id));

	return (
		<div className="org-chart space-y-10">
			{/* Root */}
			<div className="flex justify-center">
				<PersonCard person={kepalaDesa} />
			</div>

			{/* Connector */}
			{sekretaris && (
				<div className="flex justify-center">
					<div className="w-px h-6 bg-gray-300" />
				</div>
			)}

			{/* Sekretaris */}
			{sekretaris && (
				<div className="flex justify-center">
					<PersonCard person={sekretaris} />
				</div>
			)}

			{/* Bidang-bidang di bawahnya */}
			{(kaur.length > 0 || kasi.length > 0) && (
				<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
					{kaur.length > 0 && (
						<Section title="Kaur">
							{kaur.map((p) => (
								<PersonCard key={p.id} person={p} />
							))}
						</Section>
					)}
					{kasi.length > 0 && (
						<Section title="Kasi">
							{kasi.map((p) => (
								<PersonCard key={p.id} person={p} />
							))}
						</Section>
					)}
				</div>
			)}

			{/* Kepala Dusun */}
			{kadus.length > 0 && (
				<Section title="Kepala Dusun">
					{kadus.map((p) => (
						<PersonCard key={p.id} person={p} />
					))}
				</Section>
			)}

			{/* Staf */}
			{staf.length > 0 && (
				<Section title="Staf Desa">
					{staf.map((p) => (
						<PersonCard key={p.id} person={p} />
					))}
				</Section>
			)}

			{/* Lainnya */}
			{others.length > 0 && (
				<Section title="Lainnya">
					{others.map((p) => (
						<PersonCard key={p.id} person={p} />
					))}
				</Section>
			)}
		</div>
	);
};

export default AparaturDesaOrgChart;
