"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { MaterialForm } from "@/components/materials/MaterialForm";
import { useMaterials } from "@/hooks/useMaterials";
import type { MaterialFormData } from "@/hooks/useMaterials";

type MaterialFormModalProps = {
	open: boolean;
	onClose: () => void;
	initialData?: any;
	onSuccess?: () => void;
};

export function MaterialFormModal({ open, onClose, initialData, onSuccess }: MaterialFormModalProps) {
	const { createMaterial, updateMaterial, error } = useMaterials();
	const [loading, setLoading] = useState(false);

	const handleSave = async (data: MaterialFormData) => {
		setLoading(true);
		try {
			if (initialData?.id) {
				await updateMaterial(initialData.id, data);
			} else {
				await createMaterial(data);
			}
			// Llamar callback de éxito si existe
			if (onSuccess) {
				onSuccess();
			}
			onClose();
		} catch (err) {
			// El error ya está manejado en el hook
			console.error('Error saving material:', err);
		} finally {
			setLoading(false);
		}
	};

	return (
		<Modal 
			isOpen={open} 
			onClose={onClose} 
			title={initialData ? "Editar material" : "Nuevo material"}
		>
			<MaterialForm 
				onSave={handleSave} 
				onCancel={onClose} 
				initialData={initialData}
				loading={loading}
				error={error}
			/>
		</Modal>
	);
}