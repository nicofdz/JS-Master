"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Loader2, Package, Warehouse, History, User, Calendar, DollarSign, Info, Layers, ArrowUpRight, ArrowDownRight, MoreVertical, Search, BarChart3, Tag, AlertTriangle, Globe } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useMaterials } from "@/hooks/useMaterials";
import { useMaterialMovements } from "@/hooks/useMaterialMovements";
import { useWarehouses } from "@/hooks/useWarehouses";
import { supabase } from "@/lib/supabase";
import type { Material } from "@/hooks/useMaterials";

type MaterialDetailModalProps = {
	open: boolean;
	onClose: () => void;
	material: Material | null;
};

export function MaterialDetailModal({ open, onClose, material }: MaterialDetailModalProps) {
	const { stockData, fetchStockForMaterials, getTotalStock } = useMaterials();
	const { movements, fetchMovements, loading: movementsLoading } = useMaterialMovements();
	const { warehouses, fetchWarehouses } = useWarehouses();
	const [loading, setLoading] = useState(false);
	const [creatorInfo, setCreatorInfo] = useState<{ full_name: string; email: string } | null>(null);

	// Cargar datos cuando se abre el modal
	useEffect(() => {
		if (open && material) {
			setLoading(true);

			// Cargar stock del material
			fetchStockForMaterials([material.id]);

			// Cargar almacenes
			fetchWarehouses(true);

			// Cargar movimientos recientes del material (últimos 10)
			fetchMovements({
				material_id: material.id,
				limit: 10,
			});

			// Intentar obtener información del creador desde el primer movimiento
			const getCreatorInfo = async () => {
				try {
					// Buscar el primer movimiento de ingreso del material
					const { data: firstMovement, error } = await supabase
						.from('material_movements')
						.select(`
							delivered_by,
							user_profiles!delivered_by(id, full_name, email)
						`)
						.eq('material_id', material.id)
						.eq('movement_type', 'ingreso')
						.order('created_at', { ascending: true })
						.limit(1)
						.single();

					if (!error && firstMovement?.user_profiles) {
						const profile = firstMovement.user_profiles as any;
						setCreatorInfo({
							full_name: profile.full_name || 'Desconocido',
							email: profile.email || '',
						});
					}
				} catch (err) {
					console.error('Error loading creator info:', err);
				}
			};

			getCreatorInfo();
			setLoading(false);
		}
	}, [open, material?.id]);

	// Obtener stock por almacén para este material
	const stockByWarehouse = warehouses
		.filter(w => w.is_active)
		.map(warehouse => {
			const stock = stockData.find(
				s => s.material_id === material?.id && s.warehouse_id === warehouse.id
			);
			return {
				warehouse,
				quantity: stock ? Number(stock.quantity) : 0,
			};
		})
		.filter(item => item.quantity > 0); // Solo mostrar almacenes con stock

	const totalStock = material ? getTotalStock(material.id) : 0;

	const formatDate = (dateString: string) => {
		if (!dateString) return '-';
		const date = new Date(dateString);
		return new Intl.DateTimeFormat('es-CL', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			timeZone: 'America/Santiago',
		}).format(date);
	};

	const formatMovementType = (type: string) => {
		const types: Record<string, string> = {
			ingreso: 'Ingreso',
			entrega: 'Entrega',
			ajuste_negativo: 'Ajuste Negativo',
		};
		return types[type] || type;
	};

	if (!material) return null;

	return (
		<Modal isOpen={open} onClose={onClose} title={`Detalles: ${material.name}`} size="xl">
			{loading ? (
				<div className="flex items-center justify-center py-8">
					<Loader2 className="h-6 w-6 animate-spin text-slate-400" />
					<p className="ml-2 text-sm text-slate-500">Cargando información...</p>
				</div>
			) : (
				<div className="space-y-10">
					{/* Información General del Material */}
					<section className="space-y-4">
						<div className="flex items-center gap-3 pb-3 border-b border-white/5">
							<div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
								<Package className="h-5 w-5" />
							</div>
							<div className="flex flex-col">
								<h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest leading-none">Identidad Técnica</h3>
								<span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Atributos y categorización</span>
							</div>
						</div>
						<div className="glass-panel premium-border rounded-2xl p-6 grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 premium-shadow">
							<div className="space-y-1">
								<label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nombre</label>
								<p className="text-sm font-bold text-slate-200 uppercase tracking-tight line-clamp-1">{material.name}</p>
							</div>
							<div className="space-y-1">
								<label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Categoría</label>
								<div className="flex items-center gap-1.5 pt-0.5">
									<div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
									<p className="text-sm font-medium text-slate-300">{material.category}</p>
								</div>
							</div>
							<div className="space-y-1">
								<label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Medidas</label>
								<p className="text-sm font-bold text-slate-200 uppercase">{material.unit}</p>
							</div>
							<div className="space-y-1">
								<label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bodega Principal</label>
								<div className="flex items-center gap-1.5 pt-0.5">
									<Layers className="h-3.5 w-3.5 text-slate-600" />
									<p className="text-sm font-medium text-slate-400">
										{material.default_warehouse?.name || 'CENTRAL'}
									</p>
								</div>
							</div>
							<div className="space-y-1">
								<label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 text-emerald-500/80">
									<DollarSign className="h-3 w-3" />
									Precio Unidad
								</label>
								<p className="text-sm font-black text-emerald-400">
									${material.unit_cost.toLocaleString('es-CL')}
								</p>
							</div>
							<div className="space-y-1">
								<label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Alerta Mínima</label>
								<div className="flex items-center gap-1.5 pt-1">
									<span className="text-sm font-black text-rose-400">
										{material.stock_min.toLocaleString()}
									</span>
									<span className="text-[9px] font-bold text-slate-600 uppercase">UNIDADES</span>
								</div>
							</div>
							{material.supplier && (
								<div className="space-y-1">
									<label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Origen/Socio</label>
									<p className="text-sm font-medium text-slate-300">{material.supplier}</p>
								</div>
							)}
							<div className="space-y-1">
								<label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estado</label>
								<div className="pt-1">
									<span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${material.is_active
										? 'text-emerald-500 bg-emerald-500/10'
										: 'text-rose-500 bg-rose-500/10'
										}`}>
										<div className={`w-1 h-1 rounded-full ${material.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
										{material.is_active ? 'Activo' : 'Inactivo'}
									</span>
								</div>
							</div>
							<div className="space-y-1">
								<label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Proyecto Asociado</label>
								<div className="flex items-center gap-1.5 pt-0.5">
									<Globe className="h-3.5 w-3.5 text-slate-600" />
									<p className="text-sm font-medium text-slate-400">
										{material.project?.name || 'CENTRAL / GENERAL'}
									</p>
								</div>
							</div>
							{material.notes && (
								<div className="md:col-span-4 space-y-2 pt-2 border-t border-white/5">
									<label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
										<Tag className="h-3 w-3" /> Observaciones del Maestro
									</label>
									<p className="text-sm text-slate-400 leading-relaxed italic">&quot;{material.notes}&quot;</p>
								</div>
							)}
						</div>
					</section>

					{/* Información del Creador */}
					{creatorInfo && (
						<section className="space-y-4">
							<div className="flex items-center gap-3 pb-3 border-b border-white/5">
								<div className="p-2 bg-purple-500/10 rounded-xl text-purple-400">
									<User className="h-5 w-5" />
								</div>
								<div className="flex flex-col">
									<h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest leading-none">Auditoría Operativa</h3>
									<span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Responsable del alta inicial</span>
								</div>
							</div>
							<div className="glass-panel bg-gradient-to-r from-purple-500/5 to-transparent border border-white/5 rounded-2xl p-4">
								<div className="flex items-center gap-4">
									<div className="flex-shrink-0 relative">
										<div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-purple-900/40">
											{creatorInfo.full_name.charAt(0).toUpperCase()}
										</div>
										<div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-900 border-2 border-slate-800 flex items-center justify-center">
											<div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
										</div>
									</div>
									<div className="flex flex-col">
										<p className="text-sm font-bold text-slate-100">{creatorInfo.full_name}</p>
										{creatorInfo.email && (
											<p className="text-xs font-medium text-slate-500 tracking-tight">{creatorInfo.email}</p>
										)}
									</div>
									<div className="ml-auto flex items-center gap-4">
										<div className="text-right">
											<p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Registrado el</p>
											<p className="text-xs font-bold text-slate-300">{formatDate(material.created_at)}</p>
										</div>
									</div>
								</div>
							</div>
						</section>
					)}

					{/* Stock por Almacén */}
					<section className="space-y-4">
						<div className="flex items-center gap-3 pb-3 border-b border-white/5">
							<div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
								<Warehouse className="h-5 w-5" />
							</div>
							<div className="flex flex-col">
								<div className="flex items-baseline gap-2">
									<h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest leading-none">Mapeo de Existencias</h3>
									<span className="text-xs font-black text-emerald-400">{totalStock.toLocaleString()} {material.unit}</span>
								</div>
								<span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Disponibilidad en red de depósitos</span>
							</div>
						</div>

						{stockByWarehouse.length > 0 ? (
							<div className="glass-panel premium-border rounded-2xl overflow-hidden premium-shadow">
								<table className="min-w-full divide-y divide-white/5">
									<thead>
										<tr className="bg-slate-800/40">
											<th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ubicación</th>
											<th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Balance</th>
											<th className="px-6 py-4 text-right text-[10px] font-bold text-slate-500 uppercase tracking-widest">Estado Crítico</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-white/5 bg-slate-900/10">
										{stockByWarehouse.map((item) => {
											const isLowStock = item.quantity <= (material.stock_min || 0);
											return (
												<tr key={item.warehouse.id} className="group hover:bg-white/5 transition-all duration-300">
													<td className="px-6 py-4">
														<div className="flex items-center gap-2">
															<span className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors uppercase tracking-tight">{item.warehouse.name}</span>
															{item.warehouse.code && (
																<span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-500 transition-colors uppercase">{item.warehouse.code}</span>
															)}
														</div>
													</td>
													<td className="px-6 py-4">
														<div className="flex items-baseline gap-1.5">
															<span className={`text-sm font-black ${isLowStock ? 'text-rose-400' : 'text-slate-200'}`}>
																{item.quantity.toLocaleString()}
															</span>
															<span className="text-[10px] font-bold text-slate-600 uppercase">{material.unit}</span>
														</div>
													</td>
													<td className="px-6 py-4 text-right">
														<span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${isLowStock ? 'text-rose-500 bg-rose-500/10' : 'text-emerald-500 bg-emerald-500/10'
															}`}>
															<div className={`w-1 h-1 rounded-full ${isLowStock ? 'bg-rose-500' : 'bg-emerald-500'}`} />
															{isLowStock ? 'Bajo' : 'Óptimo'}
														</span>
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						) : (
							<div className="bg-amber-500/5 border border-amber-500/10 rounded-2xl p-5 flex items-center gap-4">
								<div className="p-3 bg-amber-500/10 rounded-xl text-amber-500">
									<AlertTriangle className="h-6 w-6" />
								</div>
								<div className="flex flex-col">
									<p className="text-sm font-bold text-amber-200 uppercase tracking-tight">Inventario Agotado</p>
									<p className="text-xs text-amber-500 font-medium">No se detectaron existencias en ningún depósito activo.</p>
								</div>
							</div>
						)}
					</section>

					{/* Historial Reciente de Movimientos */}
					<section className="space-y-4">
						<div className="flex items-center gap-3 pb-3 border-b border-white/5">
							<div className="p-2 bg-blue-500/10 rounded-xl text-blue-400">
								<History className="h-5 w-5" />
							</div>
							<div className="flex flex-col">
								<h3 className="text-sm font-bold text-slate-200 uppercase tracking-widest leading-none">Registro de Trazabilidad</h3>
								<span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">Últimos {movements.length} eventos registrados</span>
							</div>
						</div>

						{movementsLoading ? (
							<div className="flex flex-col items-center justify-center py-12 gap-3 glass-panel rounded-2xl premium-border">
								<Loader2 className="h-8 w-8 animate-spin text-blue-500" />
								<p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Recuperando flujo de datos...</p>
							</div>
						) : movements.length > 0 ? (
							<div className="glass-panel premium-border rounded-2xl overflow-hidden premium-shadow">
								<div className="overflow-x-auto">
									<table className="min-w-full divide-y divide-white/5">
										<thead>
											<tr className="bg-slate-800/40">
												<th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Cronología</th>
												<th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Procedimiento</th>
												<th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Magnitud</th>
												<th className="px-6 py-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">Balance Final</th>
											</tr>
										</thead>
										<tbody className="divide-y divide-white/5 bg-slate-900/10">
											{movements.map((movement) => {
												const isNegative = movement.movement_type === 'entrega' || movement.movement_type === 'ajuste_negativo';
												return (
													<tr key={movement.id} className="group hover:bg-white/5 transition-all duration-300">
														<td className="px-6 py-4">
															<div className="flex flex-col">
																<span className="text-xs font-bold text-slate-200 uppercase tracking-tight">{formatDate(movement.created_at).split(',')[0]}</span>
																<span className="text-[10px] font-bold text-slate-600 uppercase">{formatDate(movement.created_at).split(',')[1]}</span>
															</div>
														</td>
														<td className="px-6 py-4">
															<span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-widest ${movement.movement_type === 'ingreso'
																? 'text-emerald-500 bg-emerald-500/10'
																: movement.movement_type === 'entrega'
																	? 'text-blue-500 bg-blue-500/10'
																	: 'text-rose-500 bg-rose-500/10'
																}`}>
																<div className={`w-1 h-1 rounded-full ${movement.movement_type === 'ingreso' ? 'bg-emerald-500' :
																	movement.movement_type === 'entrega' ? 'bg-blue-500' : 'bg-rose-500'
																	}`} />
																{formatMovementType(movement.movement_type)}
															</span>
														</td>
														<td className="px-6 py-4">
															<div className="flex items-center gap-1">
																{isNegative ? (
																	<ArrowDownRight className="h-3.5 w-3.5 text-rose-500" />
																) : (
																	<ArrowUpRight className="h-3.5 w-3.5 text-emerald-500" />
																)}
																<span className={`text-sm font-black ${isNegative ? 'text-rose-400' : 'text-emerald-400'}`}>
																	{movement.quantity.toLocaleString()}
																</span>
																<span className="text-[10px] font-bold text-slate-600 uppercase">{material.unit}</span>
															</div>
														</td>
														<td className="px-6 py-4">
															<div className="flex items-baseline gap-1">
																<span className="text-sm font-bold text-slate-200">{movement.stock_after.toLocaleString()}</span>
																<span className="text-[10px] font-bold text-slate-600 uppercase">{material.unit}</span>
															</div>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</div>
						) : (
							<div className="bg-slate-800/20 border border-white/5 rounded-2xl p-8 text-center">
								<p className="text-xs font-bold uppercase tracking-widest text-slate-600">Sin historial operativo disponible</p>
							</div>
						)}
					</section>

					{/* Botón de Cerrar */}
					<div className="flex justify-end pt-6 border-t border-white/5">
						<Button variant="secondary" onClick={onClose}>
							Finalizar Consulta
						</Button>
					</div>
				</div>
			)}
		</Modal>
	);
}

