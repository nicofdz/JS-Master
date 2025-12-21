"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Loader2, AlertCircle } from "lucide-react";
import { useMaterialMovements } from "@/hooks/useMaterialMovements";
import { useMaterials } from "@/hooks/useMaterials";
import { useWarehouses } from "@/hooks/useWarehouses";

type AdjustStockModalProps = {
	open: boolean;
	onClose: () => void;
	preselectedMaterialId?: number;
	onSuccess?: () => void;
};

export function AdjustStockModal({ open, onClose, preselectedMaterialId, onSuccess }: AdjustStockModalProps) {
	const { registerAdjustment, error: adjustmentError } = useMaterialMovements();
	const { materials, stockData, getStockByWarehouse, fetchStockForMaterials } = useMaterials();
	const { warehouses } = useWarehouses();

	const [materialId, setMaterialId] = useState("");
	const [warehouseId, setWarehouseId] = useState("");
	const [adjustType, setAdjustType] = useState<"ingreso" | "ajuste_negativo">("ingreso");
	const [quantity, setQuantity] = useState("");
	const [reason, setReason] = useState("");
	const [notes, setNotes] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Pre-seleccionar material si viene preseleccionado
	useEffect(() => {
		if (preselectedMaterialId && open) {
			setMaterialId(preselectedMaterialId.toString());
		}
	}, [preselectedMaterialId, open]);

	// Cargar stock cuando se selecciona material y resetear bodega/cantidad
	useEffect(() => {
		// Resetear bodega y cantidad cuando cambia el material
		const material = materials.find(m => m.id.toString() === materialId);

		if (material?.default_warehouse_id) {
			setWarehouseId(material.default_warehouse_id.toString());
		} else {
			setWarehouseId("");
		}

		// Cargar stock del material seleccionado
		if (materialId) {
			fetchStockForMaterials([Number(materialId)]);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [materialId]);

	// Cuando cambia warehouseId, recargar el stock específico si es necesario (aunque ya cargamos todo el stock del material)
	/* No es estrictamente necesario otro effect si fetchStockForMaterials trae todo, 
	   pero mantenemos la lógica de obtener el valor específico para UI */

	// Resetear formulario al cerrar
	useEffect(() => {
		if (!open) {
			setMaterialId("");
			setWarehouseId("");
			setAdjustType("ingreso");
			setQuantity("");
			setReason("");
			setNotes("");
			setError(null);
		}
	}, [open]);

	const selectedMaterial = materials.find(m => m.id.toString() === materialId);
	const currentStock = warehouseId && materialId
		? getStockByWarehouse(Number(materialId), Number(warehouseId))
		: 0;

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setLoading(true);

		if (!materialId || !warehouseId || !quantity) {
			setError("Por favor completa todos los campos requeridos");
			setLoading(false);
			return;
		}

		const qty = Number(quantity);
		if (isNaN(qty) || qty <= 0) {
			setError("La cantidad debe ser mayor a 0");
			setLoading(false);
			return;
		}

		// Validar que no quede stock negativo en ajuste negativo
		if (adjustType === "ajuste_negativo" && qty > currentStock) {
			setError(`No se puede dejar stock negativo. Stock disponible: ${currentStock.toLocaleString()}, ajuste solicitado: ${qty.toLocaleString()}`);
			setLoading(false);
			return;
		}

		try {
			await registerAdjustment({
				material_id: Number(materialId),
				warehouse_id: Number(warehouseId),
				movement_type: adjustType,
				quantity: Number(qty.toFixed(3)), // Asegurar que sea un número válido
				reason: reason || null,
				notes: notes || null,
			});
			onClose();
			onSuccess?.();
		} catch (err: any) {
			setError(err.message || "Error al registrar ajuste");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Modal isOpen={open} onClose={onClose} title="Ajustar stock">
			<form onSubmit={handleSubmit} className="space-y-4">
				{(error || adjustmentError) && (
					<div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
						<AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
						<p className="text-sm text-red-800">{error || adjustmentError}</p>
					</div>
				)}

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Material *</label>
						<Select
							value={materialId}
							onChange={(e) => setMaterialId(e.target.value)}
							required
							disabled={!!preselectedMaterialId}
						>
							<option value="">Selecciona material</option>
							{materials.filter(m => m.is_active).map((mat) => (
								<option key={mat.id} value={mat.id.toString()}>{mat.name}</option>
							))}
						</Select>
						{selectedMaterial && warehouseId && (
							<p className="text-xs text-gray-500 mt-1">
								Stock actual: <span className="font-medium">{currentStock.toLocaleString()} {selectedMaterial.unit}</span>
							</p>
						)}
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Almacén *</label>
						<Select
							value={warehouseId}
							onChange={(e) => setWarehouseId(e.target.value)}
							required
						>
							<option value="">Selecciona almacén</option>
							{warehouses.filter(w => w.is_active).map((wh) => (
								<option key={wh.id} value={wh.id.toString()}>{wh.name}</option>
							))}
						</Select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Tipo de movimiento *</label>
						<Select
							value={adjustType}
							onChange={(e) => setAdjustType(e.target.value as "ingreso" | "ajuste_negativo")}
							required
						>
							<option value="ingreso">Ingreso</option>
							<option value="ajuste_negativo">Ajuste negativo (pérdida/daño)</option>
						</Select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label>
						<Input
							type="number"
							min="0.001"
							step="0.001"
							value={quantity}
							onChange={(e) => setQuantity(e.target.value)}
							required
						/>
						{selectedMaterial && (
							<p className="text-xs text-gray-500 mt-1">Unidad: {selectedMaterial.unit}</p>
						)}
					</div>

					<div className="md:col-span-2">
						<label className="block text-sm font-medium text-gray-700 mb-1">Motivo (opcional)</label>
						<Input
							value={reason}
							onChange={(e) => setReason(e.target.value)}
							placeholder="Ej: reposición, corrección, pérdida"
						/>
					</div>

					<div className="md:col-span-2">
						<label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
						<Textarea
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={3}
							placeholder="Detalles adicionales del ajuste"
						/>
					</div>
				</div>

				<div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
					<p className="text-xs text-yellow-800">
						<strong>Nota:</strong> {adjustType === "ingreso"
							? "Este ajuste aumentará el stock disponible."
							: "Este ajuste reducirá el stock. Se validará que no quede stock negativo."}
					</p>
				</div>

				<div className="flex justify-end gap-2 pt-4 border-t">
					<Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
						Cancelar
					</Button>
					<Button type="submit" disabled={loading}>
						{loading ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin mr-2" />
								Procesando...
							</>
						) : (
							"Guardar ajuste"
						)}
					</Button>
				</div>
			</form>
		</Modal>
	);
}