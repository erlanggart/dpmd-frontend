import api from './api';

export const printerService = {
	// Print via Bluetooth thermal printer
	async printToBluetooth(escposData) {
		try {
			const response = await api.post('/printer/print', { escposData });
			return response.data;
		} catch (error) {
			throw error.response?.data || error;
		}
	},

	// Check printer status
	async checkStatus() {
		try {
			const response = await api.get('/printer/status');
			return response.data;
		} catch (error) {
			throw error.response?.data || error;
		}
	},

	// Convert image to ESC/POS bitmap
	async convertImageToBitmap(imagePath, width = 150) {
		try {
			const response = await api.post('/printer/convert-image', { 
				imagePath, 
				width 
			});
			return response.data;
		} catch (error) {
			throw error.response?.data || error;
		}
	}
};

export default printerService;
