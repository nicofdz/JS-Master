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

type MovementListProps = {
	refreshToken?: number;
	movementType: 'todos' | 'entrada' | 'salida';
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
	materialId,
	projectId,
	workerId,
	userId,
	dateFrom,
	dateTo
}: MovementListProps) {
	const { movements, loading, fetchMovements } = useMaterialMovements();

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

	// Filtrar movimientos por tipo si es necesario (para salida que incluye ajuste_negativo)
	const filteredMovements = movementType === 'salida'
		? movements.filter(m => m.movement_type === 'entrega' || m.movement_type === 'ajuste_negativo')
		: movementType === 'entrada'
			? movements.filter(m => m.movement_type === 'ingreso')
			: movements;

	return (
		<div className="space-y-4">

			<div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-slate-700">
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
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Stock antes</th>
								<th className="px-6 py-3 text-left text-xs font-medium text-slate-200 uppercase tracking-wider">Stock después</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-200">
							{loading ? (
								<tr>
									<td colSpan={11} className="px-6 py-8 text-center">
										<Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
										<p className="mt-2 text-sm text-slate-500">Cargando movimientos...</p>
									</td>
								</tr>
							) : filteredMovements.length === 0 ? (
								<tr>
									<td colSpan={11} className="px-6 py-8 text-center text-slate-500">
										No se encontraron movimientos
									</td>
								</tr>
							) : (
								filteredMovements.map((movement) => {
									const isNegative = movement.movement_type === 'entrega' || movement.movement_type === 'ajuste_negativo';
									return (
										<tr key={movement.id} className="hover:bg-gray-50">
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(movement.created_at)}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{movement.material_name || '-'}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm">
												<span className="capitalize text-gray-600">{movement.movement_type}</span>
											</td>
											<td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isNegative ? 'text-red-600' : 'text-emerald-600'}`}>
												{isNegative ? '-' : '+'}{movement.quantity.toLocaleString()}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{movement.project_name || '-'}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{movement.worker_name || '-'}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{movement.delivered_by_name || '-'}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{movement.warehouse_name || '-'}</td>
											<td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={movement.notes || movement.reason || ''}>
												{movement.notes || movement.reason || '-'}
											</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{movement.stock_before.toLocaleString()}</td>
											<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{movement.stock_after.toLocaleString()}</td>
										</tr>
									);
								})
							)}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}