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

const PengurusKelembagaan = ({
	kelembagaanType,
	kelembagaanId,
	desaId,
	onPengurusCountChange,
}) => {
	const { isSuperAdmin, isAdminBidangPMD } = useAuth();
	const isAdmin = isSuperAdmin() || isAdminBidangPMD();

	const [loading, setLoading] = useState(true);
	const [showForm, setShowForm] = useState(false);
	const [editingPengurus, setEditingPengurus] = useState(null);
	const [showDetailPage, setShowDetailPage] = useState(false);
	const [selectedPengurusId, setSelectedPengurusId] = useState(null);

	const loadPengurus = useCallback(async () => {
		if (!kelembagaanId || !kelembagaanType) return;

		setLoading(true);
		try {
			// Pass desaId for admin access
			const superadminDesaId = isAdmin ? desaId : null;
			const response = await getPengurusByKelembagaan(
				kelembagaanType,
				kelembagaanId,
				superadminDesaId,
			);
			const pengurusData = response?.data?.data || [];

			// Notify parent component about pengurus count change
			if (onPengurusCountChange) {
				onPengurusCountChange(pengurusData.length);
			}
		} catch (error) {
			console.error("Error loading pengurus:", error);
		} finally {
			setLoading(false);
		}
	}, [kelembagaanType, kelembagaanId, isAdmin, desaId, onPengurusCountChange]);

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
			// Note: pengurusable_type and pengurusable_id are already added in PengurusForm
			// with proper table name mapping (rws, rts, posyandus, etc.)
			// Don't add them here to avoid duplication

			// Prepare options with desaId for admin access
			const options =
				isAdmin && desaId ? { desaId, multipart: true } : { multipart: true };

			if (editingPengurus) {
				await updatePengurus(editingPengurus.id, formData, options);
			} else {
				await addPengurus(formData, options);
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
				desaId={desaId}
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
					desaId={desaId}
				/>
			)}
		</div>
	);
};

export default PengurusKelembagaan;
