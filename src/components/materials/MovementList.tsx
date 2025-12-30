"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Loader2 } from "lucide-react";
import { useMaterialMovements } from "@/hooks/useMaterialMovements";
import { useMaterials } from "@/hooks/useMaterials";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useProjects } from "@/hooks/useProjects";
import { useWorkers } from "@/hooks/useWorkers";
import { supabase } from "@/lib/supabase";
import { MovementDetailModal } from "./MovementDetailModal";

type MovementListProps = {
	refreshToken?: number;
	movementType: 'todos' | 'entrada' | 'salida';
	consumedFilter: 'todos' | 'consumido' | 'no_consumido';
	materialId: string;
	projectId: string;
	workerId: string;
	userId: string;
	dateFrom: string;
	dateTo: string;
};

export function MovementList({
	refreshToken,
	movementType,
	consumedFilter,
	materialId,
	projectId,
	workerId,
	userId,
	dateFrom,
	dateTo
}: MovementListProps) {
	const { movements, loading, fetchMovements } = useMaterialMovements();
	const [selectedMovementId, setSelectedMovementId] = useState<number | null>(null);
	const [showDetailModal, setShowDetailModal] = useState(false);

	// Aplicar filtros
	useEffect(() => {
		const timeoutId = setTimeout(() => {
			// Determinar el tipo de movimiento según el filtro
			// Para "salida" no filtramos en backend (obtenemos todos) y luego filtramos en frontend
			// para incluir tanto 'entrega' como 'ajuste_negativo'
			let movement_type: 'ingreso' | 'entrega' | 'ajuste_negativo' | undefined = undefined;
			if (movementType === 'entrada') {
				movement_type = 'ingreso';
			}
			// Para 'salida' y 'todos', no filtramos por movement_type en backend

			fetchMovements({
				material_id: materialId ? Number(materialId) : undefined,
				project_id: projectId ? Number(projectId) : undefined,
				worker_id: workerId ? Number(workerId) : undefined,
				delivered_by: userId || undefined,
				date_from: dateFrom || undefined,
				date_to: dateTo || undefined,
				movement_type: movement_type,
				limit: 100,
			});
		}, 300);

		return () => clearTimeout(timeoutId);
	}, [materialId, projectId, workerId, userId, dateFrom, dateTo, movementType]);

	// Refrescar cuando cambie refreshToken (por ejemplo tras un ajuste/entrega)
	useEffect(() => {
		if (refreshToken !== undefined) {
			fetchMovements({ limit: 100 });
		}
	}, [refreshToken]);

	// Cargar datos necesarios
	useEffect(() => {
		fetchMovements({ limit: 100 });
	}, []);

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

	// Filtrar movimientos por tipo y consumed
	let filteredMovements = movementType === 'salida'
		? movements.filter(m => m.movement_type === 'entrega' || m.movement_type === 'ajuste_negativo')
		: movementType === 'entrada'
			? movements.filter(m => m.movement_type === 'ingreso')
			: movements;

	// Aplicar filtro de consumed
	if (consumedFilter === 'consumido') {
		filteredMovements = filteredMovements.filter(m => m.consumed === true)
	} else if (consumedFilter === 'no_consumido') {
		filteredMovements = filteredMovements.filter(m => m.consumed === false || m.consumed === undefined)
	}

	const handleRowClick = (movementId: number) => {
		setSelectedMovementId(movementId)
		setShowDetailModal(true)
	}

	const handleCloseModal = () => {
		setShowDetailModal(false)
		setSelectedMovementId(null)
	}

	const handleMovementUpdate = () => {
		fetchMovements({ limit: 100 })
	}

	return (
		<div className="space-y-4">

			<div className="rounded-lg overflow-hidden">

				{/* VISTA MÓVIL: Tarjetas */}
				<div className="md:hidden space-y-4">
					{loading ? (
						<div className="bg-slate-800 rounded-lg shadow p-8 text-center">
							<Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-500" />
							<p className="mt-2 text-sm text-slate-400">Cargando movimientos...</p>
						</div>
					) : filteredMovements.length === 0 ? (
						<div className="bg-slate-800 rounded-lg shadow p-8 text-center text-slate-500">
							No se encontraron movimientos
						</div>
					) : (
						filteredMovements.map((movement) => {
							const isNegative = movement.movement_type === 'entrega' || movement.movement_type === 'ajuste_negativo';
							return (
								<div
									key={movement.id}
									className="bg-slate-800 rounded-lg shadow border border-slate-700 p-4 cursor-pointer hover:border-blue-500 transition-all"
									onClick={() => handleRowClick(movement.id)}
								>
									<div className="flex justify-between items-start mb-2">
										<p className="text-xs text-slate-400">{formatDate(movement.created_at)}</p>
										<span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize border ${isNegative ? 'bg-red-900/30 text-red-400 border-red-800/50' : 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50'
											}`}>
											{movement.movement_type}
										</span>
									</div>
									<h4 className="font-medium text-slate-100 mb-1">{movement.material_name || 'Material desconocido'}</h4>

									<div className="flex items-center justify-between mb-3 bg-slate-900/50 p-2 rounded border border-slate-700/50">
										<span className="text-sm text-slate-400">Cantidad:</span>
										<span className={`text-lg font-bold ${isNegative ? 'text-red-400' : 'text-emerald-400'}`}>
											{isNegative ? '-' : '+'}{movement.quantity.toLocaleString()}
										</span>
									</div>

									<div className="space-y-1 text-xs text-slate-400">
										{movement.project_name && (
											<div className="flex justify-between">
												<span>Proyecto:</span>
												<span className="font-medium text-slate-300">{movement.project_name}</span>
											</div>
										)}
										{movement.worker_name && (
											<div className="flex justify-between">
												<span>Trabajador:</span>
												<span className="font-medium text-slate-300">{movement.worker_name}</span>
											</div>
										)}
										{movement.warehouse_name && (
											<div className="flex justify-between">
												<span>Almacén:</span>
												<span className="font-medium text-slate-300">{movement.warehouse_name}</span>
											</div>
										)}
										{movement.consumed !== undefined && (
											<div className="flex justify-between">
												<span>Usado:</span>
												<span className={`font-medium ${movement.consumed ? 'text-yellow-400' : 'text-slate-300'}`}>
													{movement.consumed ? 'Sí' : 'No'}
												</span>
											</div>
										)}
									</div>

									{(movement.notes || movement.reason) && (
										<div className="mt-3 pt-2 border-t border-slate-700 text-xs italic text-slate-500">
											&quot;{movement.notes || movement.reason}&quot;
										</div>
									)}
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
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Fecha</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Material</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Tipo</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Cantidad</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Proyecto</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Trabajador</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Entregado por</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Almacén</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Notas</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Usado</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Stock antes</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Stock después</th>
							</tr>
						</thead>
						<tbody className="bg-slate-900/30 divide-y divide-slate-700">
							{loading ? (
								<tr>
									<td colSpan={12} className="px-6 py-8 text-center">
										<Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-500" />
										<p className="mt-2 text-sm text-slate-400">Cargando movimientos...</p>
									</td>
								</tr>
							) : filteredMovements.length === 0 ? (
								<tr>
									<td colSpan={12} className="px-6 py-8 text-center text-slate-500">
										No se encontraron movimientos
									</td>
								</tr>
							) : (
								filteredMovements.map((movement) => {
									const isNegative = movement.movement_type === 'entrega' || movement.movement_type === 'ajuste_negativo';
									return (
										<tr
											key={movement.id}
											className="hover:bg-slate-800/50 transition-colors cursor-pointer"
											onClick={() => handleRowClick(movement.id)}
										>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{formatDate(movement.created_at)}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200 font-medium">{movement.material_name || '-'}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm">
												<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize border ${isNegative ? 'bg-red-900/30 text-red-400 border-red-800/50' : 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50'
													}`}>
													{movement.movement_type}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm">
												<span className={`font-bold ${isNegative ? 'text-red-400' : 'text-emerald-400'}`}>
													{isNegative ? '-' : '+'}{movement.quantity.toLocaleString()}
												</span>
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{movement.project_name || '-'}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{movement.worker_name || '-'}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{movement.delivered_by_name || '-'}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{movement.warehouse_name || '-'}</td>
											<td className="px-6 py-4 text-sm text-slate-400 italic truncate max-w-xs" title={movement.notes || movement.reason || ''}>
												{movement.notes || movement.reason || '-'}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm">
												{movement.consumed !== undefined ? (
													<span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${movement.consumed ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-800/50' : 'bg-slate-700/30 text-slate-400 border border-slate-600/50'}`}>
														{movement.consumed ? 'Sí' : 'No'}
													</span>
												) : '-'}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{movement.stock_before.toLocaleString()}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-slate-200 font-medium">{movement.stock_after.toLocaleString()}</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>

			{/* Movement Detail Modal */}
			<MovementDetailModal
				isOpen={showDetailModal}
				onClose={handleCloseModal}
				movementId={selectedMovementId}
				onUpdate={handleMovementUpdate}
			/>
		</div>
	);
}