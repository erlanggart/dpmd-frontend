import React from "react";
import { useNavigate } from "react-router-dom";
import { UserCircle, Crown, Briefcase, Shield, Users, ChevronRight, Landmark } from "lucide-react";

const getBaseHost = () => {
	const apiBase = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";
	return apiBase.replace(/\/?api\/?$/, "");
};

const getPasFotoUrl = (person) => {
	if (person?.file_pas_foto) {
		return `${getBaseHost()}/uploads/aparatur_desa_files/${person.file_pas_foto}`;
	}
	return null;
};

const Avatar = ({ person, size = "md" }) => {
	const foto = getPasFotoUrl(person);
	const sizes = {
		lg: "h-20 w-20",
		md: "h-14 w-14",
		sm: "h-11 w-11",
	};
	const iconSizes = { lg: "h-10 w-10", md: "h-7 w-7", sm: "h-6 w-6" };

	return foto ? (
		<img
			src={foto}
			alt={person.nama_lengkap}
			className={`${sizes[size]} rounded-full object-cover ring-2 ring-white shadow-md`}
			onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex'; }}
		/>
	) : (
		<div className={`${sizes[size]} bg-gradient-to-br from-slate-100 to-slate-300 rounded-full flex items-center justify-center ring-2 ring-white shadow-md ${foto ? 'hidden' : ''}`}>
			<UserCircle className={`${iconSizes[size]} text-slate-600`} />
		</div>
	);
};

// Leader card — Kepala Desa / Sekretaris
const LeaderCard = ({ person, accent = "teal" }) => {
	const nav = useNavigate();
	if (!person) return null;

	const gradients = {
		teal: "from-slate-700 to-slate-900",
		blue: "from-slate-600 to-slate-800",
	};

	return (
		<div
			onClick={() => nav(`/desa/aparatur-desa/${person.id}`)}
			className="cursor-pointer group"
		>
			<div className={`relative bg-gradient-to-br ${gradients[accent]} rounded-2xl p-[2px] shadow-lg group-hover:shadow-xl transition-shadow`}>
				<div className="bg-white rounded-[14px] p-5 flex flex-col items-center">
					<div className="relative mb-3">
						<Avatar person={person} size="lg" />
						<div className={`absolute -bottom-1 -right-1 bg-gradient-to-br ${gradients[accent]} text-white p-1.5 rounded-full shadow-md`}>
							<Crown className="w-3.5 h-3.5" />
						</div>
					</div>
					<h3 className="font-bold text-gray-900 text-center text-sm leading-tight">{person.nama_lengkap || "-"}</h3>
					<span className={`mt-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${gradients[accent]} text-white`}>
						{person.jabatan || "-"}
					</span>
				</div>
			</div>
		</div>
	);
};

// Staff card — Kaur, Kasi, Kadus, Staf, dll
const StaffCard = ({ person }) => {
	const nav = useNavigate();
	if (!person) return null;

	return (
		<div
			onClick={() => nav(`/desa/aparatur-desa/${person.id}`)}
			className="group cursor-pointer bg-white rounded-xl border border-gray-200 hover:border-slate-300 hover:shadow-md p-4 flex items-center gap-3 transition-all"
		>
			<Avatar person={person} size="sm" />
			<div className="flex-1 min-w-0">
				<p className="font-semibold text-gray-900 text-sm truncate group-hover:text-slate-700 transition-colors">{person.nama_lengkap || "-"}</p>
				<p className="text-xs text-gray-500 truncate">{person.jabatan || "-"}</p>
			</div>
			<ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-slate-500 flex-shrink-0 transition-colors" />
		</div>
	);
};

const SectionLabel = ({ icon: Icon, label, count, color = "teal" }) => {
	const colors = {
		teal: "bg-slate-50 text-slate-700 border-slate-200",
		blue: "bg-slate-100 text-slate-700 border-slate-200",
		purple: "bg-white text-slate-700 border-slate-300",
		amber: "bg-amber-50 text-amber-700 border-amber-200",
		gray: "bg-gray-50 text-gray-700 border-gray-200",
	};
	return (
		<div className="flex items-center gap-2 mb-3">
			<div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold ${colors[color]}`}>
				<Icon className="w-3.5 h-3.5" />
				{label}
			</div>
			{count > 0 && <span className="text-xs text-gray-400">{count} orang</span>}
		</div>
	);
};

const Connector = () => (
	<div className="flex justify-center py-2">
		<div className="w-px h-6 bg-gradient-to-b from-slate-300 to-transparent" />
	</div>
);

const AparaturDesaOrgChart = ({ aparatur = [] }) => {
	const activeOnly = (aparatur || []).filter(
		(p) => (p.status || "").toLowerCase() === "aktif"
	);

	const byExact = (jab) =>
		activeOnly.find((p) => (p.jabatan || "").toLowerCase() === jab.toLowerCase());
	const byInclude = (kw) =>
		activeOnly.filter((p) => (p.jabatan || "").toLowerCase().includes(kw.toLowerCase()));

	const kepalaDesa = byExact("Kepala Desa");
	const sekretaris = byExact("Sekretaris Desa");
	const kaur = activeOnly.filter((p) => {
		const j = (p.jabatan || "").toLowerCase();
		return j.includes("kaur") || j.includes("kepala urusan");
	});
	const kasi = activeOnly.filter((p) => {
		const j = (p.jabatan || "").toLowerCase();
		return j.includes("kasi") || j.includes("kepala seksi");
	});
	const kadus = activeOnly.filter((p) => {
		const j = (p.jabatan || "").toLowerCase();
		return j.includes("kadus") || j.includes("kepala dusun");
	});
	const staf = byInclude("Staf Desa");
	const bpd = activeOnly.filter((p) => (p.jabatan || "").toUpperCase().includes("BPD"));

	const usedIds = new Set(
		[kepalaDesa?.id, sekretaris?.id, ...kaur.map((x) => x.id), ...kasi.map((x) => x.id), ...kadus.map((x) => x.id), ...staf.map((x) => x.id), ...bpd.map((x) => x.id)].filter(Boolean)
	);
	const others = activeOnly.filter((p) => !usedIds.has(p.id));

	if (activeOnly.length === 0) {
		return (
			<div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
				<Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
				<p className="text-gray-500">Tidak ada aparatur aktif</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Top Leaders */}
			{(kepalaDesa || sekretaris) && (
				<div className="flex flex-col items-center gap-2">
					{kepalaDesa && (
						<div className="w-full max-w-[240px]">
							<LeaderCard person={kepalaDesa} accent="teal" />
						</div>
					)}
					{kepalaDesa && sekretaris && <Connector />}
					{sekretaris && (
						<div className="w-full max-w-[240px]">
							<LeaderCard person={sekretaris} accent="blue" />
						</div>
					)}
				</div>
			)}

			{/* Divider */}
			{(kepalaDesa || sekretaris) && (kaur.length > 0 || kasi.length > 0 || kadus.length > 0 || staf.length > 0 || others.length > 0) && (
				<div className="flex items-center gap-3">
					<div className="flex-1 h-px bg-gradient-to-r from-transparent to-gray-200" />
					<span className="text-xs text-gray-400 font-medium">Struktur Organisasi</span>
					<div className="flex-1 h-px bg-gradient-to-l from-transparent to-gray-200" />
				</div>
			)}

			{/* Staff Grid */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Kepala Urusan */}
				{kaur.length > 0 && (
					<div>
						<SectionLabel icon={Briefcase} label="Kepala Urusan" count={kaur.length} color="blue" />
						<div className="space-y-2">
							{kaur.map((p) => <StaffCard key={p.id} person={p} />)}
						</div>
					</div>
				)}

				{/* Kepala Seksi */}
				{kasi.length > 0 && (
					<div>
						<SectionLabel icon={Shield} label="Kepala Seksi" count={kasi.length} color="purple" />
						<div className="space-y-2">
							{kasi.map((p) => <StaffCard key={p.id} person={p} />)}
						</div>
					</div>
				)}

				{/* Kepala Dusun */}
				{kadus.length > 0 && (
					<div>
						<SectionLabel icon={Users} label="Kadus" count={kadus.length} color="amber" />
						<div className="space-y-2">
							{kadus.map((p) => <StaffCard key={p.id} person={p} />)}
						</div>
					</div>
				)}

				{/* Staf Desa */}
				{staf.length > 0 && (
					<div>
						<SectionLabel icon={Users} label="Staf Desa" count={staf.length} color="teal" />
						<div className="space-y-2">
							{staf.map((p) => <StaffCard key={p.id} person={p} />)}
						</div>
					</div>
				)}
			</div>

			{/* BPD Section - separate from Pemerintah Desa */}
			{bpd.length > 0 && (
				<>
					<div className="flex items-center gap-3">
						<div className="flex-1 h-px bg-gradient-to-r from-transparent to-gray-200" />
						<span className="text-xs text-gray-400 font-medium">Badan Permusyawaratan Desa</span>
						<div className="flex-1 h-px bg-gradient-to-l from-transparent to-gray-200" />
					</div>
					<div>
						<SectionLabel icon={Landmark} label="BPD" count={bpd.length} color="blue" />
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
							{bpd.map((p) => <StaffCard key={p.id} person={p} />)}
						</div>
					</div>
				</>
			)}

			{/* Lainnya */}
			{others.length > 0 && (
				<div>
					<SectionLabel icon={Users} label="Lainnya" count={others.length} color="gray" />
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
						{others.map((p) => <StaffCard key={p.id} person={p} />)}
					</div>
				</div>
			)}
		</div>
	);
};

export default AparaturDesaOrgChart;
