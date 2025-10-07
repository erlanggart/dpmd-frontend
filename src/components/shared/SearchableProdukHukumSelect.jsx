import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaTrash } from "react-icons/fa";

// Reusable searchable select for Produk Hukum (SK)
// Props:
// - value: string | undefined (id)
// - onChange: (id: string) => void
// - produkHukumList: Array<{ id, nomor, tahun, judul }>
export default function SearchableProdukHukumSelect({
	value,
	onChange,
	produkHukumList,
}) {
	const [query, setQuery] = useState("");
	const [open, setOpen] = useState(false);
	const boxRef = useRef(null);

	const options = useMemo(() => {
		// Ensure produkHukumList is always an array
		const safeList = Array.isArray(produkHukumList) ? produkHukumList : [];
		return safeList.map((ph) => ({
			id: ph.id?.toString?.() ?? String(ph.id),
			label: `Nomor ${ph.nomor} Tahun ${ph.tahun} — ${ph.judul}`,
			nomor: (ph.nomor || "").toString().toLowerCase(),
			judul: (ph.judul || "").toString().toLowerCase(),
			tahun: (ph.tahun || "").toString().toLowerCase(),
		}));
	}, [produkHukumList]);

	const selected = useMemo(
		() => options.find((o) => o.id === (value ?? "")),
		[options, value]
	);

	const filtered = useMemo(() => {
		const q = (query || "").toLowerCase().trim();
		if (!q) return options.slice(0, 20);
		return options
			.filter(
				(o) => o.judul.includes(q) || o.nomor.includes(q) || o.tahun.includes(q)
			)
			.slice(0, 50);
	}, [options, query]);

	useEffect(() => {
		const onDocClick = (e) => {
			if (!boxRef.current) return;
			if (!boxRef.current.contains(e.target)) setOpen(false);
		};
		document.addEventListener("mousedown", onDocClick);
		return () => document.removeEventListener("mousedown", onDocClick);
	}, []);

	const handlePick = (id) => {
		onChange?.(id);
		const picked = options.find((o) => o.id === id);
		if (picked) setQuery(picked.label);
		setOpen(false);
	};

	const clearSelection = () => {
		onChange?.("");
		setQuery("");
		setOpen(false);
	};

	return (
		<div className="relative" ref={boxRef}>
			<div className=" input-group flex gap-2">
				<input
					type="text"
					className="w-full"
					placeholder={
						selected
							? selected.label
							: "Ketik judul/nomor/tahun untuk mencari SK"
					}
					value={query}
					onChange={(e) => {
						setQuery(e.target.value);
						setOpen(true);
					}}
					onFocus={() => setOpen(true)}
				/>
				{value && (
					<button
						type="button"
						onClick={clearSelection}
						className="px-2 text-sm text-white bg-red-500 rounded hover:bg-red-600"
						title="Clear"
					>
						<FaTrash />
					</button>
				)}
			</div>
			{open && (
				<div className="absolute z-20 mt-1 w-full bg-white border rounded shadow max-h-64 overflow-auto">
					{filtered.length === 0 ? (
						<div className="px-3 py-2 text-sm text-gray-500">
							Tidak ada hasil
						</div>
					) : (
						filtered.map((o) => (
							<button
								type="button"
								key={o.id}
								className={`w-full text-left px-3 py-2 hover:bg-slate-100 ${
									o.id === value ? "bg-slate-50 font-medium" : ""
								}`}
								onClick={() => handlePick(o.id)}
							>
								{o.label}
							</button>
						))
					)}
				</div>
			)}
		</div>
	);
}
