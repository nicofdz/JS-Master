"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Loader2, AlertCircle, Package, Warehouse, Globe, User, ClipboardList, Truck, Calendar, Clock, FileText } from "lucide-react";
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
	const { profile, user, isAdmin } = useAuth();
	const { registerDelivery, error: deliveryError } = useMaterialMovements();
	const { materials, stockData, getStockByWarehouse, fetchStockForMaterials, fetchMaterials } = useMaterials();
	const { warehouses, fetchWarehouses } = useWarehouses();
	const projectsHook = useProjects();
	const { getWorkersByProject } = useWorkers();
	const [users, setUsers] = useState<any[]>([]);

	const projects = Array.isArray(projectsHook) ? projectsHook : (projectsHook?.projects || []);
	// const workers = Array.isArray(workersHook) ? workersHook : (workersHook?.workers || []); // Ya no usamos lista global

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
	const [projectWorkers, setProjectWorkers] = useState<any[]>([]);

	// Cargar usuarios del sistema y materiales cuando se abre el modal
	useEffect(() => {
		if (open) {
			fetchMaterials({ activeOnly: true });
			fetchWarehouses();

			const now = new Date();
			const dateStr = now.toISOString().split('T')[0];
			const timeStr = now.toTimeString().slice(0, 5);
			setDeliveryDate(dateStr);
			setDeliveryTime(timeStr);

			const loadUsers = async () => {
				try {
					const { data, error } = await supabase
						.from('user_profiles')
						.select('id, full_name, email')
						.order('full_name');
					if (!error && data) {
						setUsers(data);
						if (user?.id) setDeliveredBy(user.id);
					}
				} catch (err) {
					console.error('Error loading users:', err);
				}
			};
			loadUsers();
		}
	}, [open, user?.id]);

	useEffect(() => {
		if (preselectedMaterialId && open) {
			setMaterialId(preselectedMaterialId.toString());
		}
	}, [preselectedMaterialId, open]);

	useEffect(() => {
		const material = materials.find(m => m.id.toString() === materialId);
		if (material?.default_warehouse_id) {
			setWarehouseId(material.default_warehouse_id.toString());
		} else {
			setWarehouseId("");
		}
		setQuantity("");
		if (materialId) fetchStockForMaterials([Number(materialId)]);
	}, [materialId]);

	useEffect(() => {
		if (warehouseId !== "") setQuantity("");
	}, [warehouseId]);

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
			setProjectWorkers([]);
		}
	}, [open]);

	// Cargar trabajadores cuando cambia el proyecto
	useEffect(() => {
		const loadProjectWorkers = async () => {
			if (projectId) {
				const workers = await getWorkersByProject(Number(projectId));
				setProjectWorkers(workers);
			} else {
				setProjectWorkers([]);
			}
			setWorkerId(""); // Reset worker selection when project changes
		};
		loadProjectWorkers();
	}, [projectId]);

	const selectedMaterial = materials.find(m => m.id.toString() === materialId);
	const warehousesWithStock = materialId
		? warehouses.filter(w => w.is_active && getStockByWarehouse(Number(materialId), w.id) > 0)
		: [];
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
		if (qty > currentStock) {
			setError(`Stock insuficiente. Disponible: ${currentStock.toLocaleString()}`);
			setLoading(false);
			return;
		}

		let created_at = null;
		if (deliveryDate && deliveryTime) {
			const dateTimeStr = `${deliveryDate}T${deliveryTime}:00`;
			const dateTime = new Date(dateTimeStr);
			if (!isNaN(dateTime.getTime())) {
				created_at = dateTime.toISOString();
			}
		}

		try {
			await registerDelivery({
				material_id: Number(materialId),
				warehouse_id: Number(warehouseId),
				quantity: qty,
				project_id: projectId ? Number(projectId) : null,
				worker_id: workerId ? Number(workerId) : null,
				reason: reason || null,
				notes: notes || null,
				delivered_by: deliveredBy || user?.id || null,
				created_at: created_at,
			});
			await fetchMaterials();
			onClose();
			onSuccess?.();
		} catch (err: any) {
			setError(err.message || "Error al registrar entrega");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Modal isOpen={open} onClose={onClose} title="Registrar Entrega de Material" size="xl">
			<form onSubmit={handleSubmit} className="space-y-6">
				{(error || deliveryError) && (
					<div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3 animate-shake">
						<AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
						<p className="text-sm text-red-200 font-medium">{error || deliveryError}</p>
					</div>
				)}

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					{/* Columna Izquierda: Material y Origen */}
					<div className="space-y-6">
						<section className="space-y-4">
							<div className="flex items-center gap-2 pb-2 border-b border-white/5">
								<div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
									<Package className="h-4 w-4" />
								</div>
								<h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Selección de Material</h4>
							</div>

							<div className="glass-panel premium-border rounded-2xl p-6 space-y-6">
								<div className="space-y-2">
									<label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
										Material <span className="text-red-500">*</span>
									</label>
									<Select
										value={materialId}
										onChange={(e) => setMaterialId(e.target.value)}
										required
										disabled={!!preselectedMaterialId}
										className="bg-slate-800/50 border-slate-700 focus:border-blue-500"
									>
										<option value="">Selecciona material</option>
										{materials.filter(m => m.is_active).map((mat) => (
											<option key={mat.id} value={mat.id.toString()}>{mat.name}</option>
										))}
									</Select>
								</div>

								<div className="space-y-2">
									<label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
										<Warehouse className="h-3.5 w-3.5" />
										Bodega de Origen <span className="text-red-500">*</span>
									</label>
									<Select
										value={warehouseId}
										onChange={(e) => setWarehouseId(e.target.value)}
										required
										disabled={!materialId || warehousesWithStock.length === 0}
										className="bg-slate-800/50 border-slate-700"
									>
										<option value="">Selecciona bodega</option>
										{warehousesWithStock.map((wh) => (
											<option key={wh.id} value={wh.id.toString()}>
												{wh.name} (Stock: {getStockByWarehouse(Number(materialId), wh.id).toLocaleString()} {selectedMaterial?.unit})
											</option>
										))}
									</Select>
									{!materialId ? (
										<p className="text-[10px] text-slate-500 font-medium italic">Selecciona un material para ver stock disponible</p>
									) : warehousesWithStock.length === 0 && (
										<p className="text-[10px] text-rose-400 font-bold uppercase tracking-tighter">⚠️ No hay stock disponible en ninguna bodega</p>
									)}
								</div>

								<div className="space-y-2">
									<label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cantidad <span className="text-red-500">*</span></label>
									<div className="relative">
										<Input
											type="number"
											step="0.001"
											value={quantity}
											onChange={(e) => setQuantity(e.target.value)}
											required
											disabled={!warehouseId}
											className="bg-slate-800/50 border-slate-700 pr-16"
										/>
										<div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-500 uppercase">
											{selectedMaterial?.unit || 'UNID'}
										</div>
									</div>
									{warehouseId && (
										<p className="text-[10px] text-slate-500 font-medium">Máximo disponible: <span className="text-slate-300 font-bold">{currentStock.toLocaleString()}</span></p>
									)}
								</div>
							</div>
						</section>

						<section className="space-y-4">
							<div className="flex items-center gap-2 pb-2 border-b border-white/5">
								<div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
									<Calendar className="h-4 w-4" />
								</div>
								<h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Fecha y Hora</h4>
							</div>
							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-2">
									<label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Fecha</label>
									<Input type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} className="bg-slate-800/50 border-slate-700" />
								</div>
								<div className="space-y-2">
									<label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Hora</label>
									<Input type="time" value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} className="bg-slate-800/50 border-slate-700" />
								</div>
							</div>
						</section>
					</div>

					{/* Columna Derecha: Asignación y Notas */}
					<div className="space-y-6">
						<section className="space-y-4">
							<div className="flex items-center gap-2 pb-2 border-b border-white/5">
								<div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400">
									<User className="h-4 w-4" />
								</div>
								<h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Asignación de Entrega</h4>
							</div>

							<div className="glass-panel premium-border rounded-2xl p-6 space-y-6">
								<div className="space-y-2">
									<label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
										<Globe className="h-3.5 w-3.5" />
										Proyecto Destino
									</label>
									<Select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="bg-slate-800/50 border-slate-700">
										<option value="">Selecciona proyecto</option>
										{projects.map((proj) => <option key={proj.id} value={proj.id.toString()}>{proj.name}</option>)}
									</Select>
								</div>

								<div className="space-y-2">
									<label className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
										<ClipboardList className="h-3.5 w-3.5" />
										Trabajador Responsable
									</label>
									<Select
										value={workerId}
										onChange={(e) => setWorkerId(e.target.value)}
										className="bg-slate-800/50 border-slate-700"
										disabled={!projectId || projectWorkers.length === 0}
									>
										<option value="">
											{!projectId
												? "Selecciona un proyecto primero"
												: projectWorkers.length === 0
													? "Sin trabajadores asignar"
													: "Selecciona trabajador"
											}
										</option>
										{projectWorkers.map((w) => <option key={w.id} value={w.id.toString()}>{w.full_name}</option>)}
									</Select>
								</div>

								<div className="space-y-2">
									<label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Despachado por</label>
									<Select
										value={deliveredBy}
										onChange={(e) => setDeliveredBy(e.target.value)}
										className="bg-slate-800/50 border-slate-700"
										disabled={!isAdmin()}
									>
										{users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
									</Select>
								</div>
							</div>
						</section>

						<section className="space-y-4">
							<div className="flex items-center gap-2 pb-2 border-b border-white/5">
								<div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400">
									<FileText className="h-4 w-4" />
								</div>
								<h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Notas y Detalles</h4>
							</div>
							<div className="space-y-4">
								<div className="space-y-2">
									<label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Uso Previsto / Motivo</label>
									<Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ej: Para terminaciones en depto 402" className="bg-slate-800/50 border-slate-700" />
								</div>
								<div className="space-y-2">
									<label className="text-xs font-bold text-slate-500 uppercase tracking-widest">Notas Adicionales</label>
									<Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Cualquier observación relevante..." rows={2} className="bg-slate-800/50 border-slate-700 resize-none" />
								</div>
							</div>
						</section>
					</div>
				</div>

				<div className="flex justify-end gap-3 pt-6 border-t border-white/5">
					<Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="px-6">
						Cancelar
					</Button>
					<Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-500 text-white min-w-[160px] shadow-lg shadow-blue-500/20">
						{loading ? (
							<div className="flex items-center gap-2">
								<Loader2 className="h-4 w-4 animate-spin" />
								<span>Registrando...</span>
							</div>
						) : (
							<div className="flex items-center gap-2">
								<Truck className="h-4 w-4" />
								<span>Registrar Entrega</span>
							</div>
						)}
					</Button>
				</div>
			</form>
		</Modal>
	);
}