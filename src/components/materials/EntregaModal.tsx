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
import { useProjects } from "@/hooks/useProjects";
import { useWorkers } from "@/hooks/useWorkers";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";

type EntregaModalProps = {
    open: boolean;
    onClose: () => void;
    preselectedMaterialId?: number;
    onSuccess?: () => void;
};

export function EntregaModal({ open, onClose, preselectedMaterialId, onSuccess }: EntregaModalProps) {
	const { profile, user } = useAuth();
	const { registerDelivery, error: deliveryError } = useMaterialMovements();
	const { materials, stockData, getStockByWarehouse, fetchStockForMaterials, fetchMaterials } = useMaterials();
	const { warehouses, fetchWarehouses } = useWarehouses();
	const projectsHook = useProjects();
	const workersHook = useWorkers();
	const [users, setUsers] = useState<any[]>([]);
	
	const projects = Array.isArray(projectsHook) ? projectsHook : (projectsHook?.projects || []);
	const workers = Array.isArray(workersHook) ? workersHook : (workersHook?.workers || []);

	const [materialId, setMaterialId] = useState("");
	const [projectId, setProjectId] = useState("");
	const [workerId, setWorkerId] = useState("");
	const [warehouseId, setWarehouseId] = useState("");
	const [quantity, setQuantity] = useState("");
	const [reason, setReason] = useState("");
	const [notes, setNotes] = useState("");
	const [deliveredBy, setDeliveredBy] = useState("");
	const [deliveryDate, setDeliveryDate] = useState("");
	const [deliveryTime, setDeliveryTime] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// Cargar usuarios del sistema y materiales cuando se abre el modal
	useEffect(() => {
		if (open) {
			// Siempre cargar materiales y almacenes al abrir el modal
			fetchMaterials({ activeOnly: true });
			fetchWarehouses();
			
			// Establecer fecha y hora actuales por defecto
			const now = new Date();
			const dateStr = now.toISOString().split('T')[0];
			const timeStr = now.toTimeString().slice(0, 5); // HH:mm
			setDeliveryDate(dateStr);
			setDeliveryTime(timeStr);
			
			// Cargar usuarios del sistema
			const loadUsers = async () => {
				try {
					const { data, error } = await supabase
						.from('user_profiles')
						.select('id, full_name, email')
						.order('full_name');
					if (!error && data) {
						setUsers(data);
						// Establecer usuario actual por defecto
						if (user?.id) {
							setDeliveredBy(user.id);
						}
					}
				} catch (err) {
					console.error('Error loading users:', err);
				}
			};
			loadUsers();
		}
	}, [open, user?.id]);

	// Pre-seleccionar material si viene preseleccionado
	useEffect(() => {
		if (preselectedMaterialId && open) {
			setMaterialId(preselectedMaterialId.toString());
		}
	}, [preselectedMaterialId, open]);

	// Cargar stock cuando se selecciona material y resetear bodega/cantidad
	useEffect(() => {
		// Resetear bodega y cantidad cuando cambia el material
		setWarehouseId("");
		setQuantity("");
		
		// Cargar stock del material seleccionado
		if (materialId) {
			fetchStockForMaterials([Number(materialId)]);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [materialId]);

	// Resetear cantidad cuando cambia la bodega
	useEffect(() => {
		if (warehouseId !== "") {
			setQuantity("");
		}
	}, [warehouseId]);

	// Resetear formulario al cerrar
	useEffect(() => {
		if (!open) {
			setMaterialId("");
			setProjectId("");
			setWorkerId("");
			setWarehouseId("");
			setQuantity("");
			setReason("");
			setNotes("");
			setDeliveredBy("");
			setDeliveryDate("");
			setDeliveryTime("");
			setError(null);
		}
	}, [open]);

	const selectedMaterial = materials.find(m => m.id.toString() === materialId);
	
	// Obtener bodegas con stock del material seleccionado
	const warehousesWithStock = materialId
		? warehouses.filter(w => {
				if (!w.is_active) return false;
				const stock = getStockByWarehouse(Number(materialId), w.id);
				return stock > 0;
			})
		: [];

	// Obtener stock actual de la bodega seleccionada
	const currentStock = warehouseId && materialId 
		? getStockByWarehouse(Number(materialId), Number(warehouseId))
		: 0;

	// Verificar si hay stock disponible en alguna bodega
	const hasAnyStock = warehousesWithStock.length > 0;

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

		if (qty > currentStock) {
			setError(`Stock insuficiente. Disponible: ${currentStock.toLocaleString()}`);
			setLoading(false);
			return;
		}

		// Construir fecha y hora combinadas para created_at
		let created_at = null;
		if (deliveryDate && deliveryTime) {
			const dateTimeStr = `${deliveryDate}T${deliveryTime}:00`;
			// Validar que sea una fecha válida
			const dateTime = new Date(dateTimeStr);
			if (!isNaN(dateTime.getTime())) {
				created_at = dateTime.toISOString();
			}
		}

		try {
            await registerDelivery({
				material_id: Number(materialId),
				warehouse_id: Number(warehouseId),
				quantity: Number(qty.toFixed(3)), // Asegurar que sea un número válido
				project_id: projectId ? Number(projectId) : null,
				worker_id: workerId ? Number(workerId) : null,
				reason: reason || null,
				notes: notes || null,
				delivered_by: deliveredBy || user?.id || null,
				created_at: created_at,
			});
			// Recargar materiales y stock después de entregar
			await fetchMaterials();
			if (materialId && warehouseId) {
				await fetchStockForMaterials([Number(materialId)]);
			}
			onClose();
            onSuccess?.();
		} catch (err: any) {
			setError(err.message || "Error al registrar entrega");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Modal isOpen={open} onClose={onClose} title="Registrar entrega">
			<form onSubmit={handleSubmit} className="space-y-4">
				{(error || deliveryError) && (
					<div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
						<AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
						<p className="text-sm text-red-800">{error || deliveryError}</p>
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
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Almacén origen *</label>
						{!materialId ? (
							<Select disabled>
								<option value="">Primero selecciona un material</option>
							</Select>
						) : !hasAnyStock ? (
							<div className="space-y-2">
								<Select disabled>
									<option value="">Sin stock disponible</option>
								</Select>
								<div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
									<p className="text-xs text-yellow-800">
										⚠️ No hay stock disponible en ninguna bodega para este material.
									</p>
								</div>
							</div>
						) : (
							<Select 
								value={warehouseId} 
								onChange={(e) => setWarehouseId(e.target.value)}
								required
							>
								<option value="">Selecciona almacén</option>
								{warehousesWithStock.map((wh) => {
									const stock = getStockByWarehouse(Number(materialId), wh.id);
									return (
										<option key={wh.id} value={wh.id.toString()}>
											{wh.name} (Stock: {stock.toLocaleString()} {selectedMaterial?.unit || 'unidad'})
										</option>
									);
								})}
							</Select>
						)}
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Cantidad a entregar *</label>
						<Input 
							type="number" 
							min="0.001" 
							step="0.001"
							max={currentStock}
							value={quantity} 
							onChange={(e) => setQuantity(e.target.value)}
							required
							disabled={!warehouseId || !hasAnyStock}
							placeholder={!warehouseId ? "Selecciona una bodega primero" : ""}
						/>
						{selectedMaterial && warehouseId && (
							<p className="text-xs text-gray-500 mt-1">
								Stock disponible: <span className="font-medium">{currentStock.toLocaleString()} {selectedMaterial.unit}</span>
							</p>
						)}
						{selectedMaterial && !warehouseId && (
							<p className="text-xs text-gray-500 mt-1">Unidad: {selectedMaterial.unit}</p>
						)}
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Proyecto</label>
						<Select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
							<option value="">Selecciona proyecto (opcional)</option>
							{projects.map((proj) => (
								<option key={proj.id} value={proj.id.toString()}>{proj.name}</option>
							))}
						</Select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Trabajador</label>
						<Select value={workerId} onChange={(e) => setWorkerId(e.target.value)}>
							<option value="">Selecciona trabajador (opcional)</option>
							{workers.filter(w => w.is_active).map((worker) => (
								<option key={worker.id} value={worker.id.toString()}>{worker.full_name}</option>
							))}
						</Select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Entregado por *</label>
						<Select 
							value={deliveredBy || user?.id || ''} 
							onChange={(e) => setDeliveredBy(e.target.value)}
							required
						>
							<option value="">Selecciona usuario</option>
							{users.map((usr) => (
								<option key={usr.id} value={usr.id}>
									{usr.full_name} {usr.email ? `(${usr.email})` : ''}
								</option>
							))}
						</Select>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Fecha de entrega *</label>
						<Input 
							type="date"
							value={deliveryDate} 
							onChange={(e) => setDeliveryDate(e.target.value)}
							required
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-1">Hora de entrega *</label>
						<Input 
							type="time"
							value={deliveryTime} 
							onChange={(e) => setDeliveryTime(e.target.value)}
							required
						/>
					</div>

					<div className="md:col-span-2">
						<label className="block text-sm font-medium text-gray-700 mb-1">Motivo / uso previsto (opcional)</label>
						<Input 
							value={reason} 
							onChange={(e) => setReason(e.target.value)} 
							placeholder="Ej: para piso 3"
						/>
					</div>

					<div className="md:col-span-2">
						<label className="block text-sm font-medium text-gray-700 mb-1">Comentarios (opcional)</label>
						<Textarea 
							value={notes} 
							onChange={(e) => setNotes(e.target.value)}
							rows={3}
							placeholder="Notas adicionales sobre la entrega"
						/>
					</div>
				</div>

				<div className="flex justify-end gap-2 pt-4 border-t">
					<Button type="button" variant="secondary" onClick={onClose} disabled={loading}>
						Cancelar
					</Button>
					<Button type="submit" disabled={loading}>
						{loading ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin mr-2" />
								Registrando...
							</>
						) : (
							"Registrar entrega"
						)}
					</Button>
				</div>
			</form>
		</Modal>
	);
}