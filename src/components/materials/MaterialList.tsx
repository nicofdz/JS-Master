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

			<div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-slate-700">
							<tr>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Nombre</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Categoría</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Unidad</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Stock</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Mínimo</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Almacén principal</th>
								{canViewCosts && (
									<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Costo unit.</th>
								)}
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Acciones</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{loading ? (
								<tr>
									<td colSpan={canViewCosts ? 8 : 7} className="px-6 py-8 text-center">
										<Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
										<p className="mt-2 text-sm text-slate-500">Cargando materiales...</p>
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
										<tr key={material.id} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{material.name}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{material.category}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{material.unit}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm">
												<span className={isLowStock ? "text-red-600 font-medium" : "text-gray-900"}>
													{totalStock.toLocaleString()}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{material.stock_min?.toLocaleString() || 0}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{material.default_warehouse?.name || '-'}</td>
											{canViewCosts && (
												<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
													${material.unit_cost.toLocaleString('es-CL')}
												</td>
											)}
											<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
												<div className="flex gap-2">
													<button
														onClick={() => setViewingDetails(material)}
														className="text-purple-600 hover:text-purple-800 transition-colors"
														title="Ver detalles completos"
													>
														<Eye className="h-4 w-4" />
													</button>
													<button
														onClick={() => onNewDelivery(material.id)}
														className="text-blue-600 hover:text-blue-800 transition-colors"
														title="Registrar entrega"
													>
														<Truck className="h-4 w-4" />
													</button>
													{canAdjustStock && (
														<button
															onClick={() => setEditing(material)}
															className="text-emerald-600 hover:text-emerald-800 transition-colors"
															title="Editar material"
														>
															<Pencil className="h-4 w-4" />
														</button>
													)}
													{canAdjustStock && (
														<button
															onClick={() => onAdjustStock(material.id)}
															className="text-gray-600 hover:text-gray-800 transition-colors"
															title="Ajustar stock"
														>
															<Wrench className="h-4 w-4" />
														</button>
													)}
													{canAdjustStock && (
														<button
															onClick={() => setDeleting(material)}
															className="text-red-600 hover:text-red-800 transition-colors"
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
						<p className="text-sm text-gray-700">¿Seguro que deseas eliminar &quot;{deleting.name}&quot;? Se desactivará (soft delete) y no aparecerá en la lista por defecto.</p>
						<div className="flex justify-end gap-2 pt-2">
							<button className="px-3 py-2 text-sm bg-gray-100 rounded-md" onClick={() => setDeleting(null)}>Cancelar</button>
							<button
								className="px-3 py-2 text-sm bg-red-600 text-white rounded-md"
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