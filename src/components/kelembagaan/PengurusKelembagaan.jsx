import React, { useState, useEffect, useCallback } from "react";
import {
	getPengurusByKelembagaan,
	addPengurus,
	updatePengurus,
} from "../../services/pengurus";
import { useAuth } from "../../context/AuthContext";
import PengurusForm from "./pengurus/PengurusForm";
import PengurusJabatanList from "./pengurus/PengurusJabatanList";
import PengurusDetailPage from "./pengurus/PengurusDetailPage";

const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;

const PengurusKelembagaan = ({ kelembagaanType, kelembagaanId }) => {
	const { user } = useAuth();
	const isAdmin = user?.role === "admin_kabupaten";
	const isUserDesa = user?.role === "desa";
	const isAdminBidang = user?.role === "pemberdayaan_masyarakat";
	const isSuperAdmin = user?.role === "superadmin";

	// User yang bisa mengelola pengurus
	const canManagePengurus =
		isAdmin || isUserDesa || isAdminBidang || isSuperAdmin;

	const [pengurusList, setPengurusList] = useState([]);
	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);
	const [editingPengurus, setEditingPengurus] = useState(null);
	const [showDetailPage, setShowDetailPage] = useState(false);
	const [selectedPengurusId, setSelectedPengurusId] = useState(null);

	const loadPengurus = useCallback(async () => {
		if (!kelembagaanId || !kelembagaanType) return;

		setLoading(true);
		try {
			const response = await getPengurusByKelembagaan(
				kelembagaanType,
				kelembagaanId
			);
			setPengurusList(response?.data?.data || []);
		} catch (error) {
			console.error("Error loading pengurus:", error);
			setPengurusList([]);
		} finally {
			setLoading(false);
		}
	}, [kelembagaanType, kelembagaanId]);

	useEffect(() => {
		loadPengurus();
	}, [loadPengurus]);

	const handleAddPengurus = () => {
		setEditingPengurus(null);
		setShowForm(true);
	};

	// Handler untuk menampilkan detail pengurus - tidak digunakan lagi karena menggunakan Link langsung

	const handleSubmit = async (formData) => {
		try {
			// Add kelembagaan type and id to form data
			formData.append("kelembagaan_type", kelembagaanType);
			formData.append("kelembagaan_id", kelembagaanId);

			if (editingPengurus) {
				await updatePengurus(editingPengurus.id, formData);
			} else {
				await addPengurus(formData);
			}

			setShowForm(false);
			setEditingPengurus(null);
			await loadPengurus();
		} catch (error) {
			console.error("Error saving pengurus:", error);
			throw error; // Re-throw to let form handle the error
		}
	};

	const handleCloseForm = () => {
		setShowForm(false);
		setEditingPengurus(null);
	};

	const handleViewHistory = (pengurus) => {
		setSelectedPengurusId(pengurus.id);
		setShowDetailPage(true);
	};

	const handleCloseDetail = () => {
		setShowDetailPage(false);
		setSelectedPengurusId(null);
	};

	const handleEditFromDetail = (pengurus) => {
		setEditingPengurus(pengurus);
		setShowDetailPage(false);
		setShowForm(true);
	};

	const handleStatusUpdate = () => {
		// Refresh the pengurus list after status update
		loadPengurus();
	};

	if (loading) {
		return (
			<div className="">
				<div className="flex items-center justify-between mb-4">
					<h3 className="text-lg font-semibold">Daftar Pengurus</h3>
				</div>
				<div className="text-center py-8 text-gray-500">
					Memuat data pengurus...
				</div>
			</div>
		);
	}

	return (
		<div className="">
			<PengurusJabatanList
				kelembagaanType={kelembagaanType}
				kelembagaanId={kelembagaanId}
				onAddPengurus={handleAddPengurus}
				onViewHistory={handleViewHistory}
			/>

			{showForm && (
				<PengurusForm
					isOpen={showForm}
					onClose={handleCloseForm}
					onSubmit={handleSubmit}
					editData={editingPengurus}
					kelembagaanType={kelembagaanType}
					kelembagaanId={kelembagaanId}
				/>
			)}

			{showDetailPage && selectedPengurusId && (
				<PengurusDetailPage
					pengurusId={selectedPengurusId}
					onClose={() => {
						setShowDetailPage(false);
						setSelectedPengurusId(null);
					}}
					onEdit={handleEditFromDetail}
					onStatusUpdate={handleStatusUpdate}
				/>
			)}
		</div>
	);
};

export default PengurusKelembagaan;
