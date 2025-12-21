"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Loader2, AlertCircle, Plus, Pencil, Trash2, Warehouse as WarehouseIcon, X, Lock, Unlock } from "lucide-react";
import { useWarehouses } from "@/hooks/useWarehouses";
import type { WarehouseFormData, Warehouse } from "@/hooks/useWarehouses";

type WarehouseFormModalProps = {
	open: boolean;
	onClose: () => void;
	onSuccess?: () => void;
};

export function WarehouseFormModal({ open, onClose, onSuccess }: WarehouseFormModalProps) {
	const { warehouses, loading: warehousesLoading, fetchWarehouses, createWarehouse, updateWarehouse, deactivateWarehouse, activateWarehouse, deleteWarehouse, error } = useWarehouses();
	const [showForm, setShowForm] = useState(false);
	const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
	const [loading, setLoading] = useState(false);
	const [form, setForm] = useState({
		name: "",
		code: "",
	});
	const [showActiveOnly, setShowActiveOnly] = useState(false);

	// Cargar bodegas al abrir el modal
	useEffect(() => {
		if (open) {
			fetchWarehouses(false); // Cargar todas (activas e inactivas)
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open]);

	// Resetear formulario
	const resetForm = () => {
		setForm({ name: "", code: "" });
		setEditingWarehouse(null);
		setShowForm(false);
	};

	// Abrir formulario para crear nueva
	const handleNew = () => {
		resetForm();
		setShowForm(true);
	};

	// Abrir formulario para editar
	const handleEdit = (warehouse: Warehouse) => {
		setEditingWarehouse(warehouse);
		setForm({
			name: warehouse.name,
			code: warehouse.code || "",
		});
		setShowForm(true);
	};

	// Guardar (crear o actualizar)
	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		try {
			const warehouseData: WarehouseFormData = {
				name: form.name.trim(),
				code: form.code.trim() || null,
				is_active: editingWarehouse ? editingWarehouse.is_active : true,
			};

			if (editingWarehouse) {
				await updateWarehouse(editingWarehouse.id, warehouseData);
			} else {
				await createWarehouse(warehouseData);
			}

			resetForm();
			await fetchWarehouses(false);
			onSuccess?.();
		} catch (err) {
			console.error('Error saving warehouse:', err);
		} finally {
			setLoading(false);
		}
	};

	// Estado para modal de desactivación
	const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
	const [warehouseToDeactivate, setWarehouseToDeactivate] = useState<Warehouse | null>(null);

	// Activar bodega
	const handleActivate = async (warehouse: Warehouse) => {
		try {
			// No necesitamos confirmación para activar, es una acción segura
			setLoading(true);
			await activateWarehouse(warehouse.id);
			await fetchWarehouses(false);
			onSuccess?.();
		} catch (err) {
			console.error('Error activating warehouse:', err);
		} finally {
			setLoading(false);
		}
	};

	// Desactivar bodega (abrir modal)
	const handleDeactivate = (warehouse: Warehouse) => {
		setWarehouseToDeactivate(warehouse);
		setIsDeactivateModalOpen(true);
	};

	// Ejecutar desactivación
	const confirmDeactivate = async () => {
		if (!warehouseToDeactivate) return;

		try {
			setLoading(true);
			await deactivateWarehouse(warehouseToDeactivate.id);
			await fetchWarehouses(false);
			onSuccess?.();
			setIsDeactivateModalOpen(false);
			setWarehouseToDeactivate(null);
		} catch (err) {
			console.error('Error deactivating warehouse:', err);
		} finally {
			setLoading(false);
		}
	};

	// Estado para modal de eliminación
	const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
	const [warehouseToDelete, setWarehouseToDelete] = useState<Warehouse | null>(null);
	const [deleteError, setDeleteError] = useState<string | null>(null);

	// Eliminar permanentemente (abrir modal)
	const handlePermanentDelete = (warehouse: Warehouse) => {
		setWarehouseToDelete(warehouse);
		setDeleteError(null);
		setIsDeleteModalOpen(true);
	};

	// Ejecutar eliminación
	const confirmDelete = async () => {
		if (!warehouseToDelete) return;

		try {
			setLoading(true);
			await deleteWarehouse(warehouseToDelete.id);
			await fetchWarehouses(false);
			onSuccess?.();
			setIsDeleteModalOpen(false);
			setWarehouseToDelete(null);
		} catch (err: any) {
			console.error('Error deleting warehouse:', err);
			// Mostrar error en el modal en lugar de alert
			setDeleteError('No se puede eliminar la bodega porque tiene historial de movimientos asociado. Solo se puede mantener desactivada.');
		} finally {
			setLoading(false);
		}
	};

	// Filtrar bodegas según el toggle
	const filteredWarehouses = showActiveOnly
		? warehouses.filter(w => w.is_active)
		: warehouses;

	return (
		<>
			<Modal
				isOpen={open}
				onClose={onClose}
				title="Administrar Bodegas"
				size="lg"
			>
				<div className="space-y-4">
					{/* Header con botón nueva y toggle */}
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<WarehouseIcon className="h-5 w-5 text-slate-400" />
							<span className="text-sm text-slate-300">
								{filteredWarehouses.length} bodega{filteredWarehouses.length !== 1 ? 's' : ''}
							</span>
						</div>
						<div className="flex items-center gap-3">
							<label className="inline-flex items-center gap-2 cursor-pointer select-none">
								<input
									type="checkbox"
									checked={showActiveOnly}
									onChange={(e) => setShowActiveOnly(e.target.checked)}
									className="rounded"
								/>
								<span className="text-sm text-slate-300">Solo activas</span>
							</label>
							{!showForm && (
								<Button onClick={handleNew} size="sm">
									<Plus className="h-4 w-4 mr-1" />
									Nueva bodega
								</Button>
							)}
						</div>
					</div>

					{/* Formulario de crear/editar */}
					{showForm && (
						<div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
							<form onSubmit={handleSubmit} className="space-y-4">
								<div className="flex items-center justify-between mb-2">
									<h3 className="text-sm font-semibold text-slate-100">
										{editingWarehouse ? "Editar bodega" : "Nueva bodega"}
									</h3>
									<button
										type="button"
										onClick={resetForm}
										className="text-sm text-slate-400 hover:text-slate-200 transition-colors"
									>
										Cancelar
									</button>
								</div>

								{error && (
									<div className="bg-red-900/30 border border-red-700 rounded-md p-3 flex items-start gap-2">
										<AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
										<p className="text-sm text-red-300">{error}</p>
									</div>
								)}

								<div className="grid grid-cols-2 gap-4">
									<div>
										<label className="block text-sm font-medium text-slate-300 mb-1">
											Nombre *
										</label>
										<Input
											value={form.name}
											onChange={(e) => setForm({ ...form, name: e.target.value })}
											placeholder="Ej: Bodega Central"
											required
										/>
									</div>

									<div>
										<label className="block text-sm font-medium text-slate-300 mb-1">
											Código (opcional)
										</label>
										<Input
											value={form.code}
											onChange={(e) => setForm({ ...form, code: e.target.value })}
											placeholder="Ej: BDG-CENTRAL"
										/>
									</div>
								</div>

								<div className="flex justify-end gap-2 pt-2">
									<Button type="button" variant="secondary" onClick={resetForm} disabled={loading}>
										Cancelar
									</Button>
									<Button type="submit" disabled={loading || !form.name.trim()}>
										{loading ? (
											<>
												<Loader2 className="h-4 w-4 animate-spin mr-2" />
												Guardando...
											</>
										) : (
											editingWarehouse ? "Actualizar" : "Crear"
										)}
									</Button>
								</div>
							</form>
						</div>
					)}

					{/* Lista de bodegas */}
					<div className="bg-slate-700/30 rounded-lg border border-slate-600 overflow-hidden">
						{warehousesLoading ? (
							<div className="flex items-center justify-center py-8">
								<Loader2 className="h-5 w-5 animate-spin text-slate-400" />
								<p className="ml-2 text-sm text-slate-400">Cargando bodegas...</p>
							</div>
						) : filteredWarehouses.length === 0 ? (
							<div className="text-center py-8 text-slate-400 text-sm">
								No hay bodegas registradas
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-slate-600">
									<thead className="bg-slate-700">
										<tr>
											<th className="px-4 py-3 text-left text-xs font-medium text-slate-200 uppercase">
												Nombre
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-slate-200 uppercase">
												Código
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-slate-200 uppercase">
												Estado
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-slate-200 uppercase">
												Acciones
											</th>
										</tr>
									</thead>
									<tbody className="bg-slate-800/50 divide-y divide-slate-700">
										{filteredWarehouses.map((warehouse) => (
											<tr
												key={warehouse.id}
												className={`hover:bg-slate-700/50 transition-colors ${!warehouse.is_active ? 'opacity-60' : ''}`}
											>
												<td className="px-4 py-3 text-sm font-medium text-slate-100">
													{warehouse.name}
												</td>
												<td className="px-4 py-3 text-sm text-slate-300">
													{warehouse.code || '-'}
												</td>
												<td className="px-4 py-3">
													<span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${warehouse.is_active
														? 'bg-green-900/50 text-green-300 border border-green-700'
														: 'bg-red-900/50 text-red-300 border border-red-700'
														}`}>
														{warehouse.is_active ? 'Activa' : 'Inactiva'}
													</span>
												</td>
												<td className="px-4 py-3 text-sm font-medium">
													<div className="flex gap-2">
														<button
															onClick={() => handleEdit(warehouse)}
															className="text-emerald-400 hover:text-emerald-300 transition-colors"
															title="Editar bodega"
														>
															<Pencil className="h-4 w-4" />
														</button>
														{warehouse.is_active ? (
															<button
																onClick={() => handleDeactivate(warehouse)}
																className="text-amber-400 hover:text-amber-300 transition-colors"
																title="Desactivar bodega"
															>
																<Lock className="h-4 w-4" />
															</button>
														) : (
															<>
																<button
																	onClick={() => handleActivate(warehouse)}
																	className="text-emerald-400 hover:text-emerald-300 transition-colors"
																	title="Reactivar (Desbloquear)"
																>
																	<Unlock className="h-4 w-4" />
																</button>
																<button
																	onClick={() => handlePermanentDelete(warehouse)}
																	className="text-red-500 hover:text-red-400 transition-colors"
																	title="Eliminar permanentemente"
																>
																	<Trash2 className="h-4 w-4" />
																</button>
															</>
														)}
													</div>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>

					{/* Botón cerrar */}
					<div className="flex justify-end pt-2 border-t border-slate-700">
						<Button variant="secondary" onClick={onClose}>
							Cerrar
						</Button>
					</div>
				</div>
			</Modal>

			{/* Modal de confirmación de desactivación */}
			<Modal
				isOpen={isDeactivateModalOpen}
				onClose={() => setIsDeactivateModalOpen(false)}
				title="Confirmar desactivación"
				size="md"
			>
				<div className="space-y-4">
					<div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 flex gap-3">
						<AlertCircle className="h-6 w-6 text-yellow-500 flex-shrink-0" />
						<div className="space-y-2">
							<p className="text-slate-200 font-medium">
								¿Deseas desactivar la bodega <span className="text-white font-bold">"{warehouseToDeactivate?.name}"</span>?
							</p>
							<p className="text-sm text-slate-400">
								La bodega dejará de aparecer en las listas de selección, pero el historial de movimientos se conservará. Puedes reactivarla editándola y cambiando su estado.
							</p>
						</div>
					</div>

					<div className="flex justify-end gap-3 pt-2">
						<Button
							variant="secondary"
							onClick={() => setIsDeactivateModalOpen(false)}
							disabled={loading}
						>
							Cancelar
						</Button>
						<Button
							onClick={confirmDeactivate}
							disabled={loading}
							className="bg-yellow-600 hover:bg-yellow-700 text-white border-transparent"
						>
							{loading ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
									Desactivando...
								</>
							) : (
								"Desactivar bodega"
							)}
						</Button>
					</div>
				</div>
			</Modal>

			{/* Modal de confirmación de eliminación */}
			<Modal
				isOpen={isDeleteModalOpen}
				onClose={() => setIsDeleteModalOpen(false)}
				title="Confirmar eliminación permanente"
				size="md"
			>
				<div className="space-y-4">
					<div className="bg-red-900/20 border border-red-800 rounded-lg p-4 flex gap-3">
						<AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
						<div className="space-y-2">
							<p className="text-slate-200 font-medium">
								¿Estás seguro de que deseas eliminar permanentemente la bodega <span className="text-white font-bold">"{warehouseToDelete?.name}"</span>?
							</p>
							<p className="text-sm text-slate-400">
								Esta acción <span className="font-semibold text-red-400">NO se puede deshacer</span> y eliminará todos los registros asociados.
							</p>
						</div>
					</div>

					{deleteError && (
						<div className="bg-red-950/50 border border-red-900 rounded-md p-3 text-sm text-red-300">
							{deleteError}
						</div>
					)}

					<div className="flex justify-end gap-3 pt-2">
						<Button
							variant="secondary"
							onClick={() => setIsDeleteModalOpen(false)}
							disabled={loading}
						>
							Cancelar
						</Button>
						<Button
							onClick={confirmDelete}
							disabled={loading}
							className="bg-red-600 hover:bg-red-700 text-white border-transparent"
						>
							{loading ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin mr-2" />
									Eliminando...
								</>
							) : (
								"Eliminar permanentemente"
							)}
						</Button>
					</div>
				</div>
			</Modal>
		</>
	);
}
