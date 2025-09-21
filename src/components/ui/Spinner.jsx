// src/components/ui/Spinner.jsx
import React from "react";

const Spinner = () => {
	return (
		<div className="flex flex-col items-center justify-center gap-2 minh-screen">
			<div
				className="h-8 w-8 animate-spin rounded-full border-4 border-solid border-[rgb(var(--color-primary))] border-t-transparent"
				role="status"
				aria-label="loading"
			></div>
			<span className="text-gray-500">Memuat...</span>
		</div>
	);
};

export default Spinner;
