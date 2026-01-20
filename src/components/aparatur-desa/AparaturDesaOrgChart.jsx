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
			? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
			: "bg-gradient-to-r from-red-500 to-rose-500 text-white";
	
	return (
		<div
			className={`group relative bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer transform hover:scale-105 overflow-hidden w-64 ${
				isLeader ? 'border border-primary' : 'border border-gray-200 hover:border-primary/50'
			}`}
			onClick={() => nav(`/desa/aparatur-desa/${person.id}`)}
		>
			{/* Decorative corner accent */}
			<div className={`absolute top-0 right-0 w-20 h-20 transform translate-x-10 -translate-y-10 rounded-full ${isLeader ? 'bg-gradient-to-br from-primary/30 to-blue-500/30' : 'bg-gradient-to-br from-gray-200/50 to-gray-300/50'} transition-all duration-500 group-hover:scale-150`} />
			
			{/* Shine effect on hover */}
			<div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
			
			<div className={`relative ${isLeader ? 'bg-gradient-to-br from-[rgb(var(--color-primary))] via-blue-600 to-indigo-600' : 'bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50'} p-5 rounded-t-2xl`}>
				<div className="flex justify-center mb-3">
					<div className="relative">
						{/* Rotating ring effect */}
						<div className={`absolute inset-0 rounded-full ${isLeader ? 'bg-gradient-to-r from-yellow-400 via-pink-400 to-yellow-400 animate-spin' : 'bg-gradient-to-r from-blue-400 via-purple-400 to-blue-400'} opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-500`} style={{ animationDuration: '3s' }} />
						
						<div className={`relative ${isLeader ? 'ring-2 ring-white/40' : 'ring-1 ring-white/20'} rounded-full p-1 bg-gradient-to-br from-white to-gray-100`}>
							<img
								src={getPasFotoUrl(person)}
								onError={(e) => {
									e.currentTarget.src = "/user-default.svg";
								}}
								alt={person.nama_lengkap || "Foto Aparatur"}
								className={`w-24 h-24 rounded-full object-cover border-2 border-white shadow-xl transform transition-transform duration-500 group-hover:scale-110`}
							/>
						</div>
						
						<div className={`absolute -bottom-2 -right-2 ${statusColor} rounded-full p-2 shadow-lg ring-2 ring-white transform transition-all duration-300 group-hover:scale-110 group-hover:rotate-12`}>
							<FaUserTie className="w-4 h-4" />
						</div>
					</div>
				</div>
			</div>
			
			<div className="relative p-5 bg-gradient-to-b from-white to-gray-50">
				<h3 className={`font-bold text-center mb-2 transition-colors duration-300 ${isLeader ? 'text-xl bg-gradient-to-r from-primary via-blue-600 to-indigo-600 bg-clip-text text-transparent' : 'text-base text-gray-900 group-hover:text-primary'}`}>
					{person.nama_lengkap || "-"}
				</h3>
				<p className="text-sm text-center text-gray-600 mb-3 font-medium">
					{person.jabatan || "-"}
				</p>
				<div className="flex justify-center">
					<span className={`text-xs px-4 py-1.5 rounded-full font-semibold ${statusColor} shadow-md transform transition-all duration-300 group-hover:scale-105`}>
						{person.status || "-"}
					</span>
				</div>
			</div>
		</div>
	);
};

// Vertical connector component
const VerticalConnector = ({ height = "h-8" }) => (
	<div className="flex justify-center my-6">
		<div className="relative">
			<div className={`w-1 ${height} bg-gradient-to-b from-primary via-blue-500 to-primary rounded-full shadow-lg`} />
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-lg animate-pulse" />
		</div>
	</div>
);

// Section header component
const SectionHeader = ({ title, icon: Icon }) => (
	<div className="flex items-center justify-center gap-3 mb-8">
		<div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/30 to-primary/50" />
		<div className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary/10 via-blue-50 to-primary/10 rounded-full border-2 border-primary/20 shadow-md">
			{Icon && <Icon className="text-primary w-6 h-6 animate-pulse" />}
			<h4 className="font-bold text-xl text-transparent bg-clip-text bg-gradient-to-r from-[rgb(var(--color-primary))] via-blue-600 to-indigo-600 uppercase tracking-wider">
				{title}
			</h4>
		</div>
		<div className="h-px flex-1 bg-gradient-to-l from-transparent via-primary/30 to-primary/50" />
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
		<div className="org-chart min-h-screen">
			<div className="max-w-7xl mx-auto">
				{/* Decorative background elements */}
				<div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-primary/5 to-transparent rounded-full blur-3xl -z-10" />
				<div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-blue-500/5 to-transparent rounded-full blur-3xl -z-10" />
				
				{/* Baris 1: Kepala Desa - Center Top with special treatment */}
				{kepalaDesa && (
					<div className="mb-12 relative">					<SectionHeader title="Kepala Desa" icon={FaUserTie} />						<div className="flex justify-center">
							<div className="relative">
								{/* Glow effect behind */}
								<div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-blue-500/20 to-indigo-500/20 rounded-3xl blur-2xl scale-110 animate-pulse" />
							<div className="relative w-64 transform transition-all duration-500 hover:scale-105">
									<PersonCard person={kepalaDesa} isLeader={true} />
								</div>
							</div>
						</div>
					</div>
				)}

				<VerticalConnector height="h-16" />

				{/* Baris 2: Sekretaris */}
				{sekretaris && (
					<>
						<SectionHeader title="Sekretariat" icon={FaUserTie} />
						<div className="flex justify-center mb-12">
							<div className="w-64 transform transition-all duration-500 hover:scale-105">
								<PersonCard person={sekretaris} isLeader={true} />
							</div>
						</div>
						<VerticalConnector height="h-12" />
					</>
				)}

				{/* Baris 3: Kepala Urusan (Kaur) - Horizontal scroll if many */}
				{kaur.length > 0 && (
					<>
						<SectionHeader title="Kepala Urusan" icon={FaUsers} />
						<div className="mb-12 overflow-x-auto pb-4">
							<div className="flex justify-center gap-6 min-w-max px-4">
								{kaur.map((p) => (
									<div key={p.id} className="w-64 flex-shrink-0 transform transition-all duration-500 hover:scale-105">
										<PersonCard person={p} />
									</div>
								))}
							</div>
						</div>
						<VerticalConnector height="h-12" />
					</>
				)}

				{/* Baris 4: Kepala Seksi (Kasi) - Horizontal scroll if many */}
				{kasi.length > 0 && (
					<>
						<SectionHeader title="Kepala Seksi" icon={FaUserTie} />
						<div className="mb-12 overflow-x-auto pb-4">
							<div className="flex justify-center gap-6 min-w-max px-4">
								{kasi.map((p) => (
									<div key={p.id} className="w-64 flex-shrink-0 transform transition-all duration-500 hover:scale-105">
										<PersonCard person={p} />
									</div>
								))}
							</div>
						</div>
						<VerticalConnector height="h-12" />
					</>
				)}

				{/* Baris 5: Kepala Dusun - Grid responsive */}
				{kadus.length > 0 && (
					<>
						<SectionHeader title="Kepala Dusun" icon={FaUsers} />
						<div className="mb-12">
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
								{kadus.map((p) => (
									<div key={p.id} className="w-64 transform transition-all duration-500 hover:scale-105">
										<PersonCard person={p} />
									</div>
								))}
							</div>
						</div>
						<VerticalConnector height="h-12" />
					</>
				)}

				{/* Baris 6: Staf Desa - Grid responsive */}
				{staf.length > 0 && (
					<>
						<SectionHeader title="Staf Desa" icon={FaUsers} />
						<div className="mb-12">
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
								{staf.map((p) => (
									<div key={p.id} className="w-64 transform transition-all duration-500 hover:scale-105">
										<PersonCard person={p} />
									</div>
								))}
							</div>
						</div>
						{others.length > 0 && <VerticalConnector height="h-12" />}
					</>
				)}

				{/* Baris 7: Aparatur Lainnya - Grid responsive */}
				{others.length > 0 && (
					<>
						<SectionHeader title="Aparatur Lainnya" icon={FaUsers} />
						<div className="mb-8">
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center">
								{others.map((p) => (
									<div key={p.id} className="w-64 transform transition-all duration-500 hover:scale-105">
										<PersonCard person={p} />
									</div>
								))}
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
};

export default AparaturDesaOrgChart;
