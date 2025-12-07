"use client";

import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Truck, Wrench, Loader2, Pencil, Trash2, Eye } from "lucide-react";
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
						<div className="bg-slate-800 rounded-lg shadow p-8 text-center">
							<Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-500" />
							<p className="mt-2 text-sm text-slate-400">Cargando materiales...</p>
						</div>
					) : filteredMaterials.length === 0 ? (
						<div className="bg-slate-800 rounded-lg shadow p-8 text-center text-slate-500">
							No se encontraron materiales
						</div>
					) : (
						filteredMaterials.map((material) => {
							const totalStock = getTotalStock(material.id);
							const isLowStock = totalStock <= (material.stock_min || 0);
							return (
								<div key={material.id} className="bg-slate-800 rounded-lg shadow border border-slate-700 p-4">
									<div className="flex justify-between items-start mb-2">
										<div>
											<h3 className="font-medium text-slate-100">{material.name}</h3>
											<p className="text-sm text-slate-400">{material.category} • {material.unit}</p>
										</div>
										{isLowStock && (
											<span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-900/30 text-red-400 border border-red-800/50">
												Bajo Stock
											</span>
										)}
									</div>

									<div className="grid grid-cols-2 gap-4 mb-4 text-sm">
										<div className="bg-slate-900/50 p-2 rounded border border-slate-700/50">
											<span className="block text-xs text-slate-400">Stock Actual</span>
											<span className={`block font-medium ${isLowStock ? "text-red-400" : "text-slate-200"}`}>
												{totalStock.toLocaleString()}
											</span>
										</div>
										<div className="bg-slate-900/50 p-2 rounded border border-slate-700/50">
											<span className="block text-xs text-slate-400">Mínimo</span>
											<span className="block font-medium text-slate-300">
												{material.stock_min?.toLocaleString() || 0}
											</span>
										</div>
									</div>

									<div className="text-xs text-slate-400 mb-4">
										<span className="font-medium text-slate-300">Almacén:</span> {material.default_warehouse?.name || '-'}
									</div>

									<div className="flex justify-end gap-2 pt-3 border-t border-slate-700">
										<button
											onClick={() => setViewingDetails(material)}
											className="p-2 text-purple-400 bg-purple-900/20 hover:bg-purple-900/30 border border-purple-800/50 rounded-md transition-colors"
											title="Ver detalles"
										>
											<Eye className="h-4 w-4" />
										</button>
										<button
											onClick={() => onNewDelivery(material.id)}
											className="p-2 text-blue-400 bg-blue-900/20 hover:bg-blue-900/30 border border-blue-800/50 rounded-md transition-colors"
											title="Registrar entrega"
										>
											<Truck className="h-4 w-4" />
										</button>
										{canAdjustStock && (
											<>
												<button
													onClick={() => setEditing(material)}
													className="p-2 text-emerald-400 bg-emerald-900/20 hover:bg-emerald-900/30 border border-emerald-800/50 rounded-md transition-colors"
													title="Editar"
												>
													<Pencil className="h-4 w-4" />
												</button>
												<button
													onClick={() => onAdjustStock(material.id)}
													className="p-2 text-slate-300 bg-slate-700/50 hover:bg-slate-700 border border-slate-600/50 rounded-md transition-colors"
													title="Ajustar stock"
												>
													<Wrench className="h-4 w-4" />
												</button>
												<button
													onClick={() => setDeleting(material)}
													className="p-2 text-red-400 bg-red-900/20 hover:bg-red-900/30 border border-red-800/50 rounded-md transition-colors"
													title="Eliminar"
												>
													<Trash2 className="h-4 w-4" />
												</button>
											</>
										)}
									</div>
								</div>
							);
						})
					)}
				</div>

				{/* VISTA DESKTOP: Tabla */}
				<div className="hidden md:block overflow-x-auto">
					<table className="min-w-full divide-y divide-slate-700">
						<thead className="bg-slate-800">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Nombre</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Categoría</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Unidad</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Stock</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Mínimo</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Almacén principal</th>
								{canViewCosts && (
									<th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Costo unit.</th>
								)}
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Acciones</th>
							</tr>
						</thead>
						<tbody className="bg-slate-900/30 divide-y divide-slate-700">
							{loading ? (
								<tr>
									<td colSpan={canViewCosts ? 8 : 7} className="px-6 py-8 text-center">
										<Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-500" />
										<p className="mt-2 text-sm text-slate-400">Cargando materiales...</p>
									</td>
								</tr>
							) : filteredMaterials.length === 0 ? (
								<tr>
									<td colSpan={canViewCosts ? 8 : 7} className="px-6 py-8 text-center text-slate-500">
										No se encontraron materiales
									</td>
								</tr>
							) : (
								filteredMaterials.map((material) => {
									const totalStock = getTotalStock(material.id);
									const isLowStock = totalStock <= (material.stock_min || 0);
									return (
										<tr key={material.id} className="hover:bg-slate-800/50 transition-colors">
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-200">{material.name}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{material.category}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{material.unit}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm">
												<span className={isLowStock ? "text-red-400 font-medium" : "text-slate-200"}>
													{totalStock.toLocaleString()}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{material.stock_min?.toLocaleString() || 0}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{material.default_warehouse?.name || '-'}</td>
											{canViewCosts && (
												<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
													${material.unit_cost.toLocaleString('es-CL')}
												</td>
											)}
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
												<div className="flex gap-2">
													<button
														onClick={() => setViewingDetails(material)}
														className="text-purple-400 hover:text-purple-300 transition-colors"
														title="Ver detalles completos"
													>
														<Eye className="h-4 w-4" />
													</button>
													<button
														onClick={() => onNewDelivery(material.id)}
														className="text-blue-400 hover:text-blue-300 transition-colors"
														title="Registrar entrega"
													>
														<Truck className="h-4 w-4" />
													</button>
													{canAdjustStock && (
														<button
															onClick={() => setEditing(material)}
															className="text-emerald-400 hover:text-emerald-300 transition-colors"
															title="Editar material"
														>
															<Pencil className="h-4 w-4" />
														</button>
													)}
													{canAdjustStock && (
														<button
															onClick={() => onAdjustStock(material.id)}
															className="text-slate-400 hover:text-slate-300 transition-colors"
															title="Ajustar stock"
														>
															<Wrench className="h-4 w-4" />
														</button>
													)}
													{canAdjustStock && (
														<button
															onClick={() => setDeleting(material)}
															className="text-red-400 hover:text-red-300 transition-colors"
															title="Eliminar (soft delete)"
														>
															<Trash2 className="h-4 w-4" />
														</button>
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