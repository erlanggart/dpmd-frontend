import Swal from "sweetalert2";

// Custom SweetAlert configuration with consistent styling
const defaultConfig = {
	// Custom styling to match app theme
	customClass: {
		confirmButton:
			"bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200",
		cancelButton:
			"bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200 ml-2",
		popup: "rounded-2xl shadow-2xl",
		header: "pb-0",
		title: "text-gray-800 font-bold",
		content: "text-gray-600",
	},
	buttonsStyling: false,
};

// Success alert
export const showSuccessAlert = (title, text, timer = 2000) => {
	return Swal.fire({
		...defaultConfig,
		icon: "success",
		title,
		text,
		timer,
		showConfirmButton: false,
		timerProgressBar: true,
	});
};

// Error alert
export const showErrorAlert = (title, text) => {
	return Swal.fire({
		...defaultConfig,
		icon: "error",
		title,
		text,
		confirmButtonText: "OK",
	});
};

// Warning alert
export const showWarningAlert = (title, text) => {
	return Swal.fire({
		...defaultConfig,
		icon: "warning",
		title,
		text,
		confirmButtonText: "OK",
	});
};

// Loading alert
export const showLoadingAlert = (title, text) => {
	return Swal.fire({
		...defaultConfig,
		title,
		text,
		allowOutsideClick: false,
		allowEscapeKey: false,
		showConfirmButton: false,
		didOpen: () => {
			Swal.showLoading();
		},
	});
};

// Confirmation alert
export const showConfirmAlert = (
	title,
	text,
	confirmText = "Ya",
	cancelText = "Batal"
) => {
	return Swal.fire({
		...defaultConfig,
		title,
		text,
		icon: "question",
		showCancelButton: true,
		confirmButtonText: confirmText,
		cancelButtonText: cancelText,
	});
};

export default Swal;
