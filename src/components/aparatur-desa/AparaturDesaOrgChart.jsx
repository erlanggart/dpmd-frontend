import React from "react";
import { useNavigate } from "react-router-dom";
import { FaUserTie, FaUsers } from "react-icons/fa";
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

const PersonCard = ({ person, isLeader = false }) => {
	const nav = useNavigate();
	
	if (!person) return null;
	
	const statusColor =
		person.status === "Aktif"
			? "bg-green-500 text-white"
			: "bg-red-500 text-white";
	
	return (
		<div
			className={`bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 ${
				isLeader ? 'border-2 border-primary' : 'border border-gray-200'
			}`}
			onClick={() => nav(`/desa/aparatur-desa/${person.id}`)}
		>
			<div className={`${isLeader ? 'bg-gradient-to-br from-primary to-primary/80' : 'bg-gradient-to-br from-gray-50 to-gray-100'} p-4 rounded-t-xl`}>
				<div className="flex justify-center mb-3">
					<div className="relative">
						<img
							src={getPasFotoUrl(person)}
							onError={(e) => {
								e.currentTarget.src = "/user-default.svg";
							}}
							alt={person.nama_lengkap || "Foto Aparatur"}
							className={`w-20 h-20 rounded-full object-cover border-4 ${
								isLeader ? 'border-white shadow-lg' : 'border-white'
							}`}
						/>
						<div className={`absolute -bottom-1 -right-1 ${statusColor} rounded-full p-1.5 shadow-md`}>
							<FaUserTie className="w-3 h-3" />
						</div>
					</div>
				</div>
			</div>
			<div className="p-4">
				<h3 className={`font-bold text-center mb-1 ${isLeader ? 'text-lg text-primary' : 'text-base text-gray-900'}`}>
					{person.nama_lengkap || "-"}
				</h3>
				<p className="text-sm text-center text-gray-600 mb-2">
					{person.jabatan || "-"}
				</p>
				<div className="flex justify-center">
					<span className={`text-xs px-3 py-1 rounded-full font-medium ${statusColor}`}>
						{person.status || "-"}
					</span>
				</div>
			</div>
		</div>
	);
};

// Vertical connector component
const VerticalConnector = ({ height = "h-8" }) => (
	<div className="flex justify-center">
		<div className={`w-0.5 ${height} bg-gradient-to-b from-primary/60 to-primary/30`} />
	</div>
);

// Horizontal connector for multiple items
const HorizontalConnector = ({ count }) => {
	if (count <= 1) return null;
	return (
		<div className="flex justify-center mb-4">
			<div className="relative w-full max-w-4xl">
				<div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-4 bg-primary/40" />
				<div className="absolute top-4 left-0 right-0 h-0.5 bg-primary/40" />
				<div className="flex justify-around">
					{Array.from({ length: count }).map((_, i) => (
						<div key={i} className="w-0.5 h-4 bg-primary/40 mt-4" />
					))}
				</div>
			</div>
		</div>
	);
};

const Section = ({ title, children, icon: Icon }) => (
	<div className="space-y-4">
		<div className="flex items-center justify-center gap-2 mb-6">
			{Icon && <Icon className="text-primary w-5 h-5" />}
			<h4 className="text-center font-bold text-lg text-gray-800 uppercase tracking-wide">
				{title}
			</h4>
		</div>
		<div className="flex flex-wrap justify-center gap-6">{children}</div>
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
		<div className="org-chart py-8 px-4 bg-gray-50">
			<div className="max-w-7xl mx-auto">
				{/* Level 1: Kepala Desa - Center Top */}
				{kepalaDesa && (
					<div className="flex justify-center mb-8">
						<div className="w-64">
							<PersonCard person={kepalaDesa} isLeader={true} />
						</div>
					</div>
				)}

				{/* Level 2 & 3: Two Columns Layout */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
					{/* LEFT COLUMN: Sekretaris + Kaur */}
					<div className="flex flex-col items-center space-y-8">
						{/* Sekretaris */}
						{sekretaris && (
							<div className="w-full max-w-sm">
								<PersonCard person={sekretaris} isLeader={true} />
							</div>
						)}

						{/* Kaur - Below Sekretaris */}
						{kaur.length > 0 && (
							<div className="w-full">
								<div className="flex items-center justify-center gap-2 mb-6">
									<FaUserTie className="text-primary w-5 h-5" />
									<h4 className="text-center font-bold text-lg text-gray-800 uppercase tracking-wide">
										Kepala Urusan
									</h4>
								</div>
								<div className="space-y-4">
									{kaur.map((p) => (
										<div key={p.id} className="w-full max-w-sm mx-auto">
											<PersonCard person={p} />
										</div>
									))}
								</div>
							</div>
						)}
					</div>

					{/* RIGHT COLUMN: Kasi (slightly below Sekretaris) */}
					<div className="flex flex-col items-center">
						{kasi.length > 0 && (
							<div className="w-full" style={{ marginTop: '80px' }}>
								<div className="flex items-center justify-center gap-2 mb-6">
									<FaUserTie className="text-primary w-5 h-5" />
									<h4 className="text-center font-bold text-lg text-gray-800 uppercase tracking-wide">
										Kepala Seksi
									</h4>
								</div>
								<div className="space-y-4">
									{kasi.map((p) => (
										<div key={p.id} className="w-full max-w-sm mx-auto">
											<PersonCard person={p} />
										</div>
									))}
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Level 4: Kepala Dusun */}
				{kadus.length > 0 && (
					<>
						<VerticalConnector height="h-12" />
						<Section title="Kepala Dusun" icon={FaUsers}>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
								{kadus.map((p) => (
									<PersonCard key={p.id} person={p} />
								))}
							</div>
						</Section>
					</>
				)}

				{/* Level 5: Staf Desa */}
				{staf.length > 0 && (
					<>
						<VerticalConnector height="h-12" />
						<Section title="Staf Desa" icon={FaUsers}>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
								{staf.map((p) => (
									<PersonCard key={p.id} person={p} />
								))}
							</div>
						</Section>
					</>
				)}

				{/* Level 6: Lainnya */}
				{others.length > 0 && (
					<>
						<VerticalConnector height="h-12" />
						<Section title="Aparatur Lainnya" icon={FaUsers}>
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-6xl mx-auto">
								{others.map((p) => (
									<PersonCard key={p.id} person={p} />
								))}
							</div>
						</Section>
					</>
				)}
			</div>
		</div>
	);
};

export default AparaturDesaOrgChart;
