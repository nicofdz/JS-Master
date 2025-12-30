"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Loader2, AlertCircle, Plus, Pencil, Trash2, Warehouse as WarehouseIcon, X, Lock, Unlock, Globe, Info, Package, Settings, Search } from "lucide-react";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useProjects } from "@/hooks/useProjects";
import { Select } from "@/components/ui/Select";
import type { WarehouseFormData, Warehouse } from "@/hooks/useWarehouses";

type WarehouseFormModalProps = {
	open: boolean;
	onClose: () => void;
	onSuccess?: () => void;
};

export function WarehouseFormModal({ open, onClose, onSuccess }: WarehouseFormModalProps) {
	const { warehouses, loading: warehousesLoading, fetchWarehouses, createWarehouse, updateWarehouse, deactivateWarehouse, activateWarehouse, deleteWarehouse, error } = useWarehouses();
	const { projects } = useProjects();
	const [showForm, setShowForm] = useState(false);
	const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
	const [loading, setLoading] = useState(false);
	const [form, setForm] = useState({
		name: "",
		code: "",
		project_id: "",
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
		setForm({ name: "", code: "", project_id: "" });
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
			project_id: warehouse.project_id?.toString() || "",
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
				project_id: form.project_id ? Number(form.project_id) : null,
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
					<div className="flex items-center justify-between bg-slate-800/50 p-3 rounded-xl border border-white/5">
						<div className="flex items-center gap-3">
							<div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
								<WarehouseIcon className="h-5 w-5" />
							</div>
							<div className="flex flex-col">
								<span className="text-xs font-bold uppercase tracking-widest text-slate-500">Inventario</span>
								<span className="text-sm font-bold text-slate-200">
									{filteredWarehouses.length} Bodega{filteredWarehouses.length !== 1 ? 's' : ''}
								</span>
							</div>
						</div>
						<div className="flex items-center gap-4">
							<label className="flex items-center gap-2 cursor-pointer group">
								<div className="relative">
									<input
										type="checkbox"
										checked={showActiveOnly}
										onChange={(e) => setShowActiveOnly(e.target.checked)}
										className="sr-only"
									/>
									<div className={`w-8 h-4 rounded-full transition-all ${showActiveOnly ? 'bg-emerald-500' : 'bg-slate-700'}`}>
										<div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${showActiveOnly ? 'translate-x-4' : ''}`} />
									</div>
								</div>
								<span className="text-xs font-medium text-slate-400 group-hover:text-slate-200 transition-colors">Solo activas</span>
							</label>
							{!showForm && (
								<Button onClick={handleNew} size="sm" className="shadow-lg shadow-blue-500/20">
									<Plus className="h-4 w-4 mr-1.5" />
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

									<div className="col-span-2">
										<label className="block text-sm font-medium text-slate-300 mb-1">
											Proyecto asociado
										</label>
										<Select
											value={form.project_id}
											onChange={(e) => setForm({ ...form, project_id: e.target.value })}
										>
											<option value="">Todos los proyectos (General)</option>
											{projects.filter(p => p.is_active).map((project) => (
												<option key={project.id} value={project.id.toString()}>
													{project.name}
												</option>
											))}
										</Select>
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
					<div className="glass-panel rounded-xl premium-border overflow-hidden premium-shadow">
						{warehousesLoading ? (
							<div className="flex flex-col items-center justify-center py-12 gap-3">
								<Loader2 className="h-8 w-8 animate-spin text-blue-500" />
								<p className="text-xs font-bold uppercase tracking-widest text-slate-500">Sincronizando depósitos...</p>
							</div>
						) : filteredWarehouses.length === 0 ? (
							<div className="text-center py-12">
								<Package className="h-10 w-10 text-slate-700 mx-auto mb-3" />
								<p className="text-sm text-slate-500">No se encontraron bodegas registradas</p>
							</div>
						) : (
							<div className="overflow-x-auto">
								<table className="min-w-full divide-y divide-white/5">
									<thead>
										<tr className="bg-slate-800/50">
											<th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
												Identificación
											</th>
											<th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
												Proyecto
											</th>
											<th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">
												Estado
											</th>
											<th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
												Gestión
											</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-white/5 bg-slate-900/20">
										{filteredWarehouses.map((warehouse) => (
											<tr
												key={warehouse.id}
												className={`group hover:bg-white/5 transition-all duration-300 ${!warehouse.is_active ? 'opacity-50' : ''}`}
											>
												<td className="px-6 py-4">
													<div className="flex flex-col">
														<span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors">
															{warehouse.name}
														</span>
														<span className="text-[10px] font-medium text-slate-500 uppercase tracking-tight">
															{warehouse.code || 'SIN CÓDIGO'}
														</span>
													</div>
												</td>
												<td className="px-6 py-4">
													<div className="flex items-center gap-2">
														{warehouse.project ? (
															<div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
																<div className="w-1 h-1 rounded-full bg-emerald-400" />
																<span className="text-xs font-medium text-emerald-400">{warehouse.project.name}</span>
															</div>
														) : (
															<div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-700/50 border border-slate-600/50">
																<Globe className="h-3 w-3 text-slate-500" />
																<span className="text-xs font-medium text-slate-500">General</span>
															</div>
														)}
													</div>
												</td>
												<td className="px-6 py-4">
													<span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest ${warehouse.is_active
														? 'text-emerald-500'
														: 'text-amber-500'
														}`}>
														<div className={`w-1 h-1 rounded-full ${warehouse.is_active ? 'bg-emerald-500' : 'bg-amber-500'}`} />
														{warehouse.is_active ? 'Operativa' : 'Bloqueada'}
													</span>
												</td>
												<td className="px-6 py-4 text-right whitespace-nowrap">
													<div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
														<button
															onClick={() => handleEdit(warehouse)}
															className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all"
															title="Editar configuración"
														>
															<Pencil className="h-4 w-4" />
														</button>
														{warehouse.is_active ? (
															<button
																onClick={() => handleDeactivate(warehouse)}
																className="p-1.5 rounded-lg text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 transition-all"
																title="Bloquear bodega"
															>
																<Lock className="h-4 w-4" />
															</button>
														) : (
															<>
																<button
																	onClick={() => handleActivate(warehouse)}
																	className="p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all"
																	title="Desbloquear"
																>
																	<Unlock className="h-4 w-4" />
																</button>
																<button
																	onClick={() => handlePermanentDelete(warehouse)}
																	className="p-1.5 rounded-lg text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
																	title="Eliminar bodega"
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
