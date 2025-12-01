"use client";

import { useState } from "react";
import { MaterialList } from "@/components/materials/MaterialList";
import { MovementList } from "@/components/materials/MovementList";
import { EntregaModal } from "@/components/materials/EntregaModal";
import { AdjustStockModal } from "@/components/materials/AdjustStockModal";
import { MaterialFormModal } from "@/components/materials/MaterialFormModal";

export default function MaterialesPage() {
	const [view, setView] = useState<"materiales" | "historial">("materiales");
	const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);
	const [isAdjustOpen, setIsAdjustOpen] = useState(false);
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [selectedMaterialId, setSelectedMaterialId] = useState<number | undefined>();
    const [refreshKey, setRefreshKey] = useState(0);

	const handleNewDelivery = (materialId?: number) => {
		setSelectedMaterialId(materialId);
		setIsDeliveryOpen(true);
	};

	const handleAdjustStock = (materialId?: number) => {
		setSelectedMaterialId(materialId);
		setIsAdjustOpen(true);
	};

	const handleCloseDelivery = () => {
		setIsDeliveryOpen(false);
		setSelectedMaterialId(undefined);
	};

	const handleCloseAdjust = () => {
		setIsAdjustOpen(false);
		setSelectedMaterialId(undefined);
	};

	return (
		<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 py-8">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Gestión de Materiales</h1>
					<p className="text-gray-600 mt-1">Administra el catálogo, registra entregas y controla el stock por almacén.</p>
				</div>
				<div className="flex items-center gap-4">
					<div className="flex bg-slate-700/30 p-1 rounded-lg">
						<button
							onClick={() => setView("materiales")}
							className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
								view === "materiales"
									? "bg-blue-600 text-white shadow-md"
									: "text-slate-400 hover:text-slate-300"
							}`}
						>
							Materiales
						</button>
						<button
							onClick={() => setView("historial")}
							className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
								view === "historial"
									? "bg-blue-600 text-white shadow-md"
									: "text-slate-400 hover:text-slate-300"
							}`}
						>
							Historial
						</button>
					</div>
				</div>
			</div>

			{view === "materiales" ? (
				<MaterialList
					onNewDelivery={handleNewDelivery}
					onAdjustStock={handleAdjustStock}
					onNewMaterial={() => setIsCreateOpen(true)}
					refreshToken={refreshKey}
				/>
			) : (
				<MovementList refreshToken={refreshKey} />
			)}

			<EntregaModal 
				open={isDeliveryOpen} 
				onClose={handleCloseDelivery}
				onSuccess={() => setRefreshKey((k) => k + 1)}
				preselectedMaterialId={selectedMaterialId}
			/>
			<AdjustStockModal 
				open={isAdjustOpen} 
				onClose={handleCloseAdjust}
				onSuccess={() => setRefreshKey((k) => k + 1)}
				preselectedMaterialId={selectedMaterialId}
			/>
			<MaterialFormModal 
				open={isCreateOpen} 
				onClose={() => {
					setIsCreateOpen(false);
					setRefreshKey((k) => k + 1);
				}}
			/>
		</div>
	);
}