"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Loader2, Package, Warehouse, History, User, Calendar, DollarSign } from "lucide-react";
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
				<div className="space-y-6">
					{/* Información General del Material */}
					<section>
						<div className="flex items-center gap-2 mb-4">
							<Package className="h-5 w-5 text-slate-400" />
							<h3 className="text-lg font-semibold text-slate-100">Información General</h3>
						</div>
						<div className="bg-slate-700/30 border border-slate-600 rounded-lg p-4 grid grid-cols-2 gap-4">
							<div>
								<label className="text-xs font-medium text-slate-400 uppercase">Nombre</label>
								<p className="text-sm font-medium text-slate-100 mt-1">{material.name}</p>
							</div>
							<div>
								<label className="text-xs font-medium text-slate-400 uppercase">Categoría</label>
								<p className="text-sm text-slate-100 mt-1">{material.category}</p>
							</div>
							<div>
								<label className="text-xs font-medium text-slate-400 uppercase">Unidad</label>
								<p className="text-sm text-slate-100 mt-1">{material.unit}</p>
							</div>
							<div>
								<label className="text-xs font-medium text-slate-400 uppercase">Almacén Principal</label>
								<p className="text-sm text-slate-100 mt-1">
									{material.default_warehouse?.name || 'No asignado'}
								</p>
							</div>
							<div>
								<label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-1">
									<DollarSign className="h-3 w-3" />
									Costo Unitario
								</label>
								<p className="text-sm font-medium text-slate-100 mt-1">
									${material.unit_cost.toLocaleString('es-CL')}
								</p>
							</div>
							<div>
								<label className="text-xs font-medium text-slate-400 uppercase">Stock Mínimo</label>
								<p className="text-sm text-slate-100 mt-1">
									{material.stock_min.toLocaleString()} {material.unit}
								</p>
							</div>
							{material.supplier && (
								<div>
									<label className="text-xs font-medium text-slate-400 uppercase">Proveedor</label>
									<p className="text-sm text-slate-100 mt-1">{material.supplier}</p>
								</div>
							)}
							<div>
								<label className="text-xs font-medium text-slate-400 uppercase flex items-center gap-1">
									<Calendar className="h-3 w-3" />
									Estado
								</label>
								<p className="text-sm mt-1">
									<span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
										material.is_active 
											? 'bg-green-900/50 text-green-300 border border-green-700' 
											: 'bg-red-900/50 text-red-300 border border-red-700'
									}`}>
										{material.is_active ? 'Activo' : 'Inactivo'}
									</span>
								</p>
							</div>
							{material.notes && (
								<div className="col-span-2">
									<label className="text-xs font-medium text-slate-400 uppercase">Notas</label>
									<p className="text-sm text-slate-100 mt-1">{material.notes}</p>
								</div>
							)}
							<div>
								<label className="text-xs font-medium text-slate-400 uppercase">Creado</label>
								<p className="text-sm text-slate-100 mt-1">{formatDate(material.created_at)}</p>
							</div>
							<div>
								<label className="text-xs font-medium text-slate-400 uppercase">Última Actualización</label>
								<p className="text-sm text-slate-100 mt-1">{formatDate(material.updated_at)}</p>
							</div>
						</div>
					</section>

					{/* Información del Creador */}
					{creatorInfo && (
						<section>
							<div className="flex items-center gap-2 mb-4">
								<User className="h-5 w-5 text-slate-400" />
								<h3 className="text-lg font-semibold text-slate-100">Quien lo Ingresó</h3>
							</div>
							<div className="bg-slate-700/50 border border-slate-600 rounded-lg p-4">
								<div className="flex items-center gap-3">
									<div className="flex-shrink-0">
										<div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
											{creatorInfo.full_name.charAt(0).toUpperCase()}
										</div>
									</div>
									<div>
										<p className="text-sm font-medium text-slate-100">{creatorInfo.full_name}</p>
										{creatorInfo.email && (
											<p className="text-xs text-slate-300">{creatorInfo.email}</p>
										)}
									</div>
								</div>
							</div>
						</section>
					)}

					{/* Stock por Almacén */}
					<section>
						<div className="flex items-center gap-2 mb-4">
							<Warehouse className="h-5 w-5 text-slate-400" />
							<h3 className="text-lg font-semibold text-slate-100">Stock por Almacén</h3>
							<span className="ml-auto text-sm font-medium text-slate-300">
								Total: {totalStock.toLocaleString()} {material.unit}
							</span>
						</div>
						{stockByWarehouse.length > 0 ? (
							<div className="bg-slate-700/30 border border-slate-600 rounded-lg overflow-hidden">
								<table className="min-w-full divide-y divide-slate-600">
									<thead className="bg-slate-700">
										<tr>
											<th className="px-4 py-3 text-left text-xs font-medium text-slate-200 uppercase">
												Almacén
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-slate-200 uppercase">
												Cantidad
											</th>
											<th className="px-4 py-3 text-left text-xs font-medium text-slate-200 uppercase">
												Estado
											</th>
										</tr>
									</thead>
									<tbody className="bg-slate-800/50 divide-y divide-slate-700">
										{stockByWarehouse.map((item) => {
											const isLowStock = item.quantity <= (material.stock_min || 0);
											return (
												<tr key={item.warehouse.id} className="hover:bg-slate-700/50 transition-colors">
													<td className="px-4 py-3 text-sm font-medium text-slate-100">
														{item.warehouse.name}
														{item.warehouse.code && (
															<span className="ml-2 text-xs text-slate-400">
																({item.warehouse.code})
															</span>
														)}
													</td>
													<td className="px-4 py-3 text-sm text-slate-100">
														{item.quantity.toLocaleString()} {material.unit}
													</td>
													<td className="px-4 py-3">
														{isLowStock ? (
															<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-900/50 text-red-300 border border-red-700">
																Stock Bajo
															</span>
														) : (
															<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-900/50 text-green-300 border border-green-700">
																Normal
															</span>
														)}
													</td>
												</tr>
											);
										})}
									</tbody>
								</table>
							</div>
						) : (
							<div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4">
								<p className="text-sm text-yellow-300">
									No hay stock registrado en ningún almacén para este material.
								</p>
							</div>
						)}
					</section>

					{/* Historial Reciente de Movimientos */}
					<section>
						<div className="flex items-center gap-2 mb-4">
							<History className="h-5 w-5 text-slate-400" />
							<h3 className="text-lg font-semibold text-slate-100">Historial Reciente</h3>
							<span className="ml-auto text-xs text-slate-400">
								Últimos {movements.length} movimientos
							</span>
						</div>
						{movementsLoading ? (
							<div className="flex items-center justify-center py-8">
								<Loader2 className="h-5 w-5 animate-spin text-slate-400" />
								<p className="ml-2 text-sm text-slate-400">Cargando movimientos...</p>
							</div>
						) : movements.length > 0 ? (
							<div className="bg-slate-700/30 border border-slate-600 rounded-lg overflow-hidden">
								<div className="overflow-x-auto">
									<table className="min-w-full divide-y divide-slate-600">
										<thead className="bg-slate-700">
											<tr>
												<th className="px-4 py-3 text-left text-xs font-medium text-slate-200 uppercase">
													Fecha
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-slate-200 uppercase">
													Tipo
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-slate-200 uppercase">
													Cantidad
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-slate-200 uppercase">
													Almacén
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-slate-200 uppercase">
													Proyecto
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-slate-200 uppercase">
													Realizado por
												</th>
												<th className="px-4 py-3 text-left text-xs font-medium text-slate-200 uppercase">
													Stock Después
												</th>
											</tr>
										</thead>
										<tbody className="bg-slate-800/50 divide-y divide-slate-700">
											{movements.map((movement) => {
												const isNegative = movement.movement_type === 'entrega' || movement.movement_type === 'ajuste_negativo';
												return (
													<tr key={movement.id} className="hover:bg-slate-700/50 transition-colors">
														<td className="px-4 py-3 text-sm text-slate-100 whitespace-nowrap">
															{formatDate(movement.created_at)}
														</td>
														<td className="px-4 py-3 text-sm">
															<span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
																movement.movement_type === 'ingreso'
																	? 'bg-green-900/50 text-green-300 border border-green-700'
																	: movement.movement_type === 'entrega'
																	? 'bg-blue-900/50 text-blue-300 border border-blue-700'
																	: 'bg-red-900/50 text-red-300 border border-red-700'
															}`}>
																{formatMovementType(movement.movement_type)}
															</span>
														</td>
														<td className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
															isNegative ? 'text-red-400' : 'text-green-400'
														}`}>
															{isNegative ? '-' : '+'}{movement.quantity.toLocaleString()} {material.unit}
														</td>
														<td className="px-4 py-3 text-sm text-slate-300">
															{movement.warehouse_name || '-'}
														</td>
														<td className="px-4 py-3 text-sm text-slate-300">
															{movement.project_name || '-'}
														</td>
														<td className="px-4 py-3 text-sm text-slate-300">
															{movement.delivered_by_name || '-'}
														</td>
														<td className="px-4 py-3 text-sm font-medium text-slate-100">
															{movement.stock_after.toLocaleString()} {material.unit}
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>
							</div>
						) : (
							<div className="bg-slate-700/30 border border-slate-600 rounded-lg p-4">
								<p className="text-sm text-slate-300">
									No hay movimientos registrados para este material.
								</p>
							</div>
						)}
					</section>

					{/* Botón de Cerrar */}
					<div className="flex justify-end pt-4 border-t border-slate-700">
						<button
							onClick={onClose}
							className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
						>
							Cerrar
						</button>
					</div>
				</div>
			)}
		</Modal>
	);
}

