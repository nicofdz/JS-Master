"use client";

import { useState, useEffect } from "react";
import { MaterialList } from "@/components/materials/MaterialList";
import { MovementList } from "@/components/materials/MovementList";
import { EntregaModal } from "@/components/materials/EntregaModal";
import { AdjustStockModal } from "@/components/materials/AdjustStockModal";
import { MaterialFormModal } from "@/components/materials/MaterialFormModal";
import { WarehouseFormModal } from "@/components/materials/WarehouseFormModal";
import { MaterialFiltersSidebar } from "@/components/materials/MaterialFiltersSidebar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Filter, Search, Package } from "lucide-react";
import { useMaterials } from "@/hooks/useMaterials";
import { useProjects } from "@/hooks/useProjects";
import { useWorkers } from "@/hooks/useWorkers";
import { supabase } from "@/lib/supabase";

export default function MaterialesPage() {
	const [view, setView] = useState<"materiales" | "historial">("materiales");
	const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);
	const [isAdjustOpen, setIsAdjustOpen] = useState(false);
	const [isCreateOpen, setIsCreateOpen] = useState(false);
	const [isWarehouseOpen, setIsWarehouseOpen] = useState(false);
	const [selectedMaterialId, setSelectedMaterialId] = useState<number | undefined>();
	const [refreshKey, setRefreshKey] = useState(0);

	// Sidebar & Filters
	const [isFilterSidebarOpen, setIsFilterSidebarOpen] = useState(false);

	// Material Filters
	const [search, setSearch] = useState("");
	const [category, setCategory] = useState("");
	const [lowStockOnly, setLowStockOnly] = useState(false);
	const [categories, setCategories] = useState<string[]>([]);

	// History Filters
	const [movementType, setMovementType] = useState<'todos' | 'entrada' | 'salida'>('todos');
	const [consumedFilter, setConsumedFilter] = useState<'todos' | 'consumido' | 'no_consumido'>('todos');
	const [materialId, setMaterialId] = useState("");
	const [projectId, setProjectId] = useState("");
	const [workerId, setWorkerId] = useState("");
	const [userId, setUserId] = useState("");
	const [dateFrom, setDateFrom] = useState("");
	const [dateTo, setDateTo] = useState("");

	// Data for dropdowns
	const { materials, getCategories, fetchMaterials } = useMaterials();
	const projectsHook = useProjects();
	const workersHook = useWorkers();
	const [users, setUsers] = useState<any[]>([]);

	const projects = Array.isArray(projectsHook) ? projectsHook : (projectsHook?.projects || []);
	const workers = Array.isArray(workersHook) ? workersHook : (workersHook?.workers || []);

	// Load initial data
	useEffect(() => {
		const loadData = async () => {
			// Categories
			const cats = await getCategories();
			setCategories(cats);

			// Materials (active only for dropdown)
			fetchMaterials({ activeOnly: true });

			// Users
			const { data: usersData } = await supabase
				.from('user_profiles')
				.select('id, full_name, email')
				.order('full_name');
			if (usersData) setUsers(usersData);

			// Projects & Workers
			if (!Array.isArray(projectsHook) && projectsHook?.refresh) projectsHook.refresh();
			if (!Array.isArray(workersHook) && workersHook?.refresh) workersHook.refresh();
		};
		loadData();
	}, []);

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
		<div className="w-full px-6 space-y-6 py-8">
			{/* Header Row: Title and View Toggle */}
			<div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
				<div className="flex items-center gap-4">
					<div className="w-12 h-12 bg-slate-700/50 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-black/20 border border-slate-700">
						<Package className="w-6 h-6 text-blue-400" />
					</div>
					<div>
						<h1 className="text-2xl font-bold text-slate-100 tracking-tight">Gestión de Materiales</h1>
						<p className="text-slate-400">Administra el catálogo, registra entregas y controla el stock por almacén.</p>
					</div>
				</div>

				{/* View Toggle */}
				<div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
					<button
						onClick={() => setView("materiales")}
						className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === "materiales"
							? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
							: "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
							}`}
					>
						Materiales
					</button>
					<button
						onClick={() => setView("historial")}
						className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${view === "historial"
							? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
							: "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
							}`}
					>
						Historial
					</button>
				</div>
			</div>

			{/* Second Row: Filters and Actions */}
			<div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
				{/* Filters (Left) */}
				<div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
					<div className="relative w-full sm:w-64">
						<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
						<Input
							placeholder="Buscar material..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-9 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:ring-blue-500/50 focus:border-blue-500/50 w-full"
						/>
					</div>

					<select
						value={category}
						onChange={(e) => setCategory(e.target.value)}
						className="bg-slate-800 border-slate-700 text-slate-200 text-sm rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 w-full sm:w-48 appearance-none"
					>
						<option value="">Todas las categorías</option>
						{categories.map((cat) => (
							<option key={cat} value={cat}>
								{cat}
							</option>
						))}
					</select>

					<label className="flex items-center gap-2 px-3 py-2 cursor-pointer select-none bg-slate-800/50 border border-slate-700/50 rounded-md hover:bg-slate-800 transition-colors">
						<input
							type="checkbox"
							checked={lowStockOnly}
							onChange={(e) => setLowStockOnly(e.target.checked)}
							className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500/50 focus:ring-offset-0"
						/>
						<span className="text-sm text-slate-300">Solo bajo stock</span>
					</label>
				</div>

				{/* Action Buttons (Right) */}
				<div className="flex flex-wrap gap-2 w-full xl:w-auto justify-end">
					<Button
						onClick={() => handleNewDelivery()}
						className="bg-blue-600 hover:bg-blue-700 text-white border-none shadow-lg shadow-blue-900/20"
					>
						Registrar entrega
					</Button>
					<Button
						onClick={() => handleAdjustStock()}
						variant="secondary"
						className="bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600"
					>
						Ajustar stock
					</Button>
					<Button
						onClick={() => setIsWarehouseOpen(true)}
						variant="secondary"
						className="bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600"
					>
						Bodegas
					</Button>
					<Button
						onClick={() => setIsCreateOpen(true)}
						variant="secondary"
						className="bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600"
					>
						Nuevo material
					</Button>
				</div>
			</div>

			{/* Quick Filters for History View */}
			{view === "historial" && (
				<div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
					<div className="flex flex-col sm:flex-row gap-6">
						{/* Movement Type Filters */}
						<div className="flex-1">
							<label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Tipo de Movimiento</label>
							<div className="flex flex-wrap gap-2">
								<button
									onClick={() => setMovementType('todos')}
									className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${movementType === 'todos'
										? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
										: 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600'
										}`}
								>
									Todos
								</button>
								<button
									onClick={() => setMovementType('entrada')}
									className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${movementType === 'entrada'
										? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20'
										: 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600'
										}`}
								>
									Entradas
								</button>
								<button
									onClick={() => setMovementType('salida')}
									className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${movementType === 'salida'
										? 'bg-red-600 text-white shadow-lg shadow-red-900/20'
										: 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600'
										}`}
								>
									Salidas
								</button>
							</div>
						</div>

						{/* Consumed Status Filters */}
						<div className="flex-1">
							<label className="block text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Estado de Uso</label>
							<div className="flex flex-wrap gap-2">
								<button
									onClick={() => setConsumedFilter('todos')}
									className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${consumedFilter === 'todos'
										? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
										: 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600'
										}`}
								>
									Todos
								</button>
								<button
									onClick={() => setConsumedFilter('consumido')}
									className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${consumedFilter === 'consumido'
										? 'bg-yellow-600 text-white shadow-lg shadow-yellow-900/20'
										: 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600'
										}`}
								>
									Usados
								</button>
								<button
									onClick={() => setConsumedFilter('no_consumido')}
									className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${consumedFilter === 'no_consumido'
										? 'bg-slate-600 text-white shadow-lg shadow-slate-900/20'
										: 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 border border-slate-600'
										}`}
								>
									Disponibles
								</button>
							</div>
						</div>
					</div>
				</div>
			)}

			{view === "materiales" ? (
				<MaterialList
					onNewDelivery={handleNewDelivery}
					onAdjustStock={handleAdjustStock}
					onNewMaterial={() => setIsCreateOpen(true)}
					refreshToken={refreshKey}
					search={search}
					category={category}
					lowStockOnly={lowStockOnly}
				/>
			) : (
				<MovementList
					refreshToken={refreshKey}
					movementType={movementType}
					consumedFilter={consumedFilter}
					materialId={materialId}
					projectId={projectId}
					workerId={workerId}
					userId={userId}
					dateFrom={dateFrom}
					dateTo={dateTo}
				/>
			)}

			<MaterialFiltersSidebar
				isOpen={isFilterSidebarOpen}
				onClose={() => setIsFilterSidebarOpen(false)}
				activeTab={view}

				// Material Filters
				search={search}
				onSearchChange={setSearch}
				category={category}
				onCategoryChange={setCategory}
				lowStockOnly={lowStockOnly}
				onLowStockChange={setLowStockOnly}
				categories={categories}

				// History Filters
				movementType={movementType}
				onMovementTypeChange={setMovementType}
				materialId={materialId}
				onMaterialIdChange={setMaterialId}
				projectId={projectId}
				onProjectIdChange={setProjectId}
				workerId={workerId}
				onWorkerIdChange={setWorkerId}
				userId={userId}
				onUserIdChange={setUserId}
				dateFrom={dateFrom}
				onDateFromChange={setDateFrom}
				dateTo={dateTo}
				onDateToChange={setDateTo}

				// Options
				materials={materials}
				projects={projects}
				workers={workers}
				users={users}
			/>

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
			<WarehouseFormModal
				open={isWarehouseOpen}
				onClose={() => setIsWarehouseOpen(false)}
				onSuccess={() => setRefreshKey((k) => k + 1)} // Refreshing lists might not be strictly necessary for warehouse changes unless they affect stock view, but safe to do.
			/>
		</div>
	);
}