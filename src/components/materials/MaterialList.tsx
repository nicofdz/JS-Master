"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Truck, Wrench, Loader2, Pencil, Trash2, Eye, Package, AlertTriangle, CheckCircle2, MoreVertical, Layers, Search, BarChart3, Globe } from "lucide-react";
import { useMaterials } from "@/hooks/useMaterials";
import { useAuth } from "@/hooks/useAuth";
import { MaterialFormModal } from "@/components/materials/MaterialFormModal";
import { MaterialDetailModal } from "@/components/materials/MaterialDetailModal";
import { WarehouseFormModal } from "@/components/materials/WarehouseFormModal";
import { Modal } from "@/components/ui/Modal";

type MaterialListProps = {
	onNewDelivery: (materialId?: number) => void;
	onAdjustStock: (materialId?: number) => void;
	onNewMaterial: () => void;
	refreshToken?: number;
	search: string;
	category: string;
	lowStockOnly: boolean;
};

export function MaterialList({
	onNewDelivery,
	onAdjustStock,
	onNewMaterial,
	refreshToken,
	search,
	category,
	lowStockOnly
}: MaterialListProps) {
	const { profile } = useAuth();
	const { materials, stockData, loading, getTotalStock, getCategories, fetchMaterials, fetchStockForMaterials, deleteMaterial } = useMaterials();
	const [editing, setEditing] = useState<any | null>(null);
	const [deleting, setDeleting] = useState<any | null>(null);
	const [viewingDetails, setViewingDetails] = useState<any | null>(null);
	const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);

	// Verificar permisos
	const canAdjustStock = profile?.role === 'admin' || profile?.role === 'supervisor';
	const canViewCosts = canAdjustStock;

	// Filtrar materiales cuando cambian los filtros
	useEffect(() => {
		const timeoutId = setTimeout(() => {
			fetchMaterials({
				search: search || undefined,
				category: category || undefined,
				lowStockOnly,
				activeOnly: true,
			});
		}, 300); // Debounce de 300ms

		return () => clearTimeout(timeoutId);
	}, [search, category, lowStockOnly]);

	// Refrescar cuando cambie refreshToken (por ejemplo tras un ajuste/entrega)
	useEffect(() => {
		if (refreshToken !== undefined && refreshToken > 0) {
			const refreshData = async () => {
				// Recargar materiales - esto también disparará la recarga de stock
				// cuando cambie materials.length
				await fetchMaterials({
					search: search || undefined,
					category: category || undefined,
					lowStockOnly,
					activeOnly: true,
				});
			};
			refreshData();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [refreshToken]);

	// Cargar stock cuando cambian los materiales
	// Esto se ejecuta automáticamente cuando fetchMaterials actualiza el estado
	useEffect(() => {
		if (materials.length > 0) {
			const materialIds = materials.map(m => m.id);
			fetchStockForMaterials(materialIds);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [materials.length]);

	// Recargar stock explícitamente cuando cambia refreshToken
	// Esto asegura actualización inmediata después de entrega/ajuste
	useEffect(() => {
		if (refreshToken !== undefined && refreshToken > 0 && materials.length > 0) {
			const materialIds = materials.map(m => m.id);
			fetchStockForMaterials(materialIds);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [refreshToken]);

	// Filtrar por categoría en el cliente (ya que getCategories puede no estar sincronizado)
	const filteredMaterials = useMemo(() => {
		let filtered = materials;

		if (category) {
			filtered = filtered.filter(m => m.category === category);
		}

		return filtered;
	}, [materials, category]);

	return (
		<div className="space-y-4">

			<div className="rounded-lg overflow-hidden">

				{/* VISTA MÓVIL: Tarjetas */}
				<div className="md:hidden space-y-4">
					{loading ? (
						<div className="glass-panel rounded-2xl premium-border p-12 text-center">
							<Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-4" />
							<p className="text-xs font-bold uppercase tracking-widest text-slate-500">Sincronizando Inventario...</p>
						</div>
					) : filteredMaterials.length === 0 ? (
						<div className="glass-panel rounded-2xl premium-border p-12 text-center">
							<Package className="h-10 w-10 text-slate-700 mx-auto mb-3" />
							<p className="text-sm text-slate-500">No se encontraron materiales</p>
						</div>
					) : (
						filteredMaterials.map((material) => {
							const totalStock = getTotalStock(material.id);
							const isLowStock = totalStock <= (material.stock_min || 0);
							return (
								<div key={material.id} className="glass-panel rounded-2xl premium-border overflow-hidden premium-shadow group transition-all duration-300 hover:scale-[1.01] active:scale-[0.99]">
									<div className="p-5 space-y-4">
										<div className="flex justify-between items-start">
											<div className="space-y-1">
												<div className="flex items-center gap-2">
													<div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
														<Package className="h-3.5 w-3.5" />
													</div>
													<h3 className="text-sm font-bold text-slate-200 group-hover:text-blue-400 transition-colors uppercase tracking-tight line-clamp-1">{material.name}</h3>
												</div>
												<div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
													<span>{material.category}</span>
													<span className="w-1 h-1 rounded-full bg-slate-700" />
													<span>{material.unit}</span>
												</div>
											</div>
											{isLowStock && (
												<div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 animate-pulse">
													<AlertTriangle className="h-3 w-3 text-rose-500" />
													<span className="text-[10px] font-bold text-rose-500 uppercase">Bajo Stock</span>
												</div>
											)}
										</div>

										<div className="grid grid-cols-2 gap-3">
											<div className="bg-slate-900/40 p-3 rounded-xl border border-white/5 group-hover:bg-slate-900/60 transition-colors">
												<span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Stock Actual</span>
												<div className="flex items-baseline gap-1">
													<span className={`text-lg font-black ${isLowStock ? "text-rose-400" : "text-emerald-400"}`}>
														{totalStock.toLocaleString()}
													</span>
													<span className="text-[10px] font-bold text-slate-600 uppercase">{material.unit}</span>
												</div>
											</div>
											<div className="bg-slate-900/40 p-3 rounded-xl border border-white/5">
												<span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Stock Mín.</span>
												<div className="flex items-baseline gap-1">
													<span className="text-lg font-black text-slate-200">
														{material.stock_min?.toLocaleString() || 0}
													</span>
													<span className="text-[10px] font-bold text-slate-600 uppercase">{material.unit}</span>
												</div>
											</div>
										</div>

										<div className="flex flex-col gap-2 pt-2">
											<div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
												<div className="flex items-center gap-1.5">
													<Layers className="h-3.5 w-3.5 text-slate-600" />
													<span>Bodega: <span className="text-slate-300">{material.default_warehouse?.name || '-'}</span></span>
												</div>
											</div>
											<div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
												<div className="flex items-center gap-1.5">
													<Globe className="h-3.5 w-3.5 text-slate-600" />
													<span>Proyecto: <span className="text-slate-300">{material.project?.name || 'CENTRAL / GENERAL'}</span></span>
												</div>
											</div>
										</div>
									</div>

									<div className="bg-white/5 p-3 flex justify-between gap-2 border-t border-white/5">
										<div className="flex gap-2">
											<button
												onClick={() => setViewingDetails(material)}
												className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-white/5"
												title="Detalles"
											>
												<Eye className="h-4 w-4" />
											</button>
										</div>
										<div className="flex gap-2">
											<button
												onClick={() => onNewDelivery(material.id)}
												className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
											>
												<Truck className="h-3.5 w-3.5" />
												Entrega
											</button>
											{canAdjustStock && (
												<button
													onClick={() => onAdjustStock(material.id)}
													className="p-2.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all border border-white/5"
													title="Ajustar stock"
												>
													<Wrench className="h-4 w-4" />
												</button>
											)}
										</div>
									</div>
								</div>
							);
						})
					)}
				</div>

				{/* VISTA DESKTOP: Tabla */}
				<div className="hidden md:block glass-panel rounded-2xl premium-border overflow-hidden premium-shadow">
					<div className="overflow-x-auto">
						<table className="min-w-full divide-y divide-white/5">
							<thead>
								<tr className="bg-slate-800/50">
									<th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Material</th>
									<th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Medidas</th>
									<th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Proyecto</th>
									<th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stock Disponible</th>
									<th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Bodega Principal</th>
									{canViewCosts && (
										<th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Precio Unidad</th>
									)}
									<th className="px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acciones</th>
								</tr>
							</thead>
							<tbody className="bg-slate-900/20 divide-y divide-white/5">
								{loading ? (
									<tr>
										<td colSpan={canViewCosts ? 7 : 6} className="px-6 py-12 text-center text-slate-500">
											<div className="flex flex-col items-center gap-3">
												<Loader2 className="h-8 w-8 animate-spin text-blue-500" />
												<span className="text-xs font-bold uppercase tracking-widest">Sincronizando...</span>
											</div>
										</td>
									</tr>
								) : filteredMaterials.length === 0 ? (
									<tr>
										<td colSpan={canViewCosts ? 7 : 6} className="px-6 py-12 text-center">
											<div className="flex flex-col items-center gap-2">
												<Package className="h-8 w-8 text-slate-700" />
												<p className="text-sm text-slate-500">No se encontraron materiales en el inventario</p>
											</div>
										</td>
									</tr>
								) : (
									filteredMaterials.map((material) => {
										const totalStock = getTotalStock(material.id);
										const isLowStock = totalStock <= (material.stock_min || 0);
										return (
											<tr key={material.id} className="group hover:bg-white/5 transition-all duration-300">
												<td className="px-6 py-4">
													<div className="flex flex-col">
														<span className="text-sm font-bold text-slate-200 group-hover:text-blue-400 transition-colors uppercase tracking-tight">{material.name}</span>
														<div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
															<span>PID-{material.project_id || 'GEN'}</span>
															<span className="w-1 h-1 rounded-full bg-slate-700" />
															<span>{material.category}</span>
														</div>
													</div>
												</td>
												<td className="px-6 py-4">
													<div className="px-2 py-0.5 inline-block rounded bg-slate-800 border border-white/5">
														<span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{material.unit}</span>
													</div>
												</td>
												<td className="px-6 py-4">
													<div className="flex items-center gap-2">
														<Globe className="h-3.5 w-3.5 text-slate-600" />
														<span className="text-xs font-bold text-slate-400 group-hover:text-slate-200 transition-colors uppercase tracking-tight">
															{material.project?.name || 'CENTRAL / GENERAL'}
														</span>
													</div>
												</td>
												<td className="px-6 py-4">
													<div className="flex items-center gap-3">
														<div className="flex flex-col">
															<span className={`text-sm font-black ${isLowStock ? 'text-rose-500' : 'text-emerald-500'}`}>
																{totalStock.toLocaleString()}
															</span>
															<span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">ACTUAL</span>
														</div>
														<div className="w-px h-8 bg-white/5" />
														<div className="flex flex-col">
															<span className="text-sm font-bold text-slate-400">
																{material.stock_min?.toLocaleString() || 0}
															</span>
															<span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">MÍNIMO</span>
														</div>
														{isLowStock && (
															<AlertTriangle className="h-4 w-4 text-rose-500 animate-pulse" />
														)}
													</div>
												</td>
												<td className="px-6 py-4">
													<div className="flex items-center gap-2">
														<Layers className="h-3.5 w-3.5 text-slate-600" />
														<span className="text-xs font-bold text-slate-400 group-hover:text-slate-200 transition-colors uppercase tracking-tight">
															{material.default_warehouse?.name || 'CENTRAL'}
														</span>
													</div>
												</td>
												{canViewCosts && (
													<td className="px-6 py-4">
														<div className="flex flex-col">
															<span className="text-sm font-bold text-slate-300">${material.unit_cost.toLocaleString('es-CL')}</span>
															<span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">POR {material.unit}</span>
														</div>
													</td>
												)}
												<td className="px-6 py-4 text-right">
													<div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
														<button
															onClick={() => setViewingDetails(material)}
															className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
															title="Ver analíticas"
														>
															<BarChart3 className="h-4 w-4" />
														</button>
														<button
															onClick={() => onNewDelivery(material.id)}
															className="bg-blue-600/10 text-blue-400 p-2 rounded-lg hover:bg-blue-600 hover:text-white transition-all border border-blue-500/20"
															title="Registrar Entrega"
														>
															<Truck className="h-4 w-4" />
														</button>
														{canAdjustStock && (
															<div className="flex gap-1 ml-1 pl-2 border-l border-white/5">
																<button
																	onClick={() => setEditing(material)}
																	className="p-2 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-400/10 transition-colors"
																	title="Editar material"
																>
																	<Pencil className="h-4 w-4" />
																</button>
																<button
																	onClick={() => onAdjustStock(material.id)}
																	className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
																	title="Ajustar stock"
																>
																	<Wrench className="h-4 w-4" />
																</button>
																<button
																	onClick={() => setDeleting(material)}
																	className="p-2 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
																	title="Eliminar"
																>
																	<Trash2 className="h-4 w-4" />
																</button>
															</div>
														)}
													</div>
												</td>
											</tr>
										);
									})
								)}
							</tbody>
						</table>
					</div>
				</div>
			</div>

			{/* Modal editar material */}
			{editing && (
				<MaterialFormModal
					open={!!editing}
					onClose={() => setEditing(null)}
					initialData={editing}
					onSuccess={() => {
						// Recargar materiales después de editar
						// El useEffect (líneas 79-87) se encargará automáticamente de recargar el stock
						fetchMaterials({
							search: search || undefined,
							category: category || undefined,
							lowStockOnly,
							activeOnly: true,
						});
					}}
				/>
			)}

			{/* Modal nueva bodega */}
			<WarehouseFormModal
				open={isWarehouseModalOpen}
				onClose={() => setIsWarehouseModalOpen(false)}
				onSuccess={() => {
					// Recargar materiales para refrescar la lista (por si hay cambios en almacenes)
					fetchMaterials({
						search: search || undefined,
						category: category || undefined,
						lowStockOnly,
						activeOnly: true,
					});
				}}
			/>

			{/* Modal detalles del material */}
			{viewingDetails && (
				<MaterialDetailModal
					open={!!viewingDetails}
					onClose={() => setViewingDetails(null)}
					material={viewingDetails}
				/>
			)}

			{/* Modal confirmación eliminación */}
			{deleting && (
				<Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Eliminar material">
					<div className="space-y-3">
						<p className="text-sm text-slate-300">¿Seguro que deseas eliminar &quot;{deleting.name}&quot;? Se desactivará (soft delete) y no aparecerá en la lista por defecto.</p>
						<div className="flex justify-end gap-2 pt-2">
							<button className="px-3 py-2 text-sm bg-slate-700 text-slate-200 rounded-md hover:bg-slate-600 transition-colors" onClick={() => setDeleting(null)}>Cancelar</button>
							<button
								className="px-3 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
								onClick={async () => {
									await deleteMaterial(deleting.id);
									setDeleting(null);
									fetchMaterials({
										search: search || undefined,
										category: category || undefined,
										lowStockOnly,
										activeOnly: true,
									});
								}}
							>Eliminar</button>
						</div>
					</div>
				</Modal>
			)}
		</div>
	);
}