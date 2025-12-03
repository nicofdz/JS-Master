"use client";

import { useState, useEffect } from "react";
import { MaterialList } from "@/components/materials/MaterialList";
import { MovementList } from "@/components/materials/MovementList";
import { EntregaModal } from "@/components/materials/EntregaModal";
import { AdjustStockModal } from "@/components/materials/AdjustStockModal";
import { MaterialFormModal } from "@/components/materials/MaterialFormModal";
import { MaterialFiltersSidebar } from "@/components/materials/MaterialFiltersSidebar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Filter, Search } from "lucide-react";
import { useMaterials } from "@/hooks/useMaterials";
import { useProjects } from "@/hooks/useProjects";
import { useWorkers } from "@/hooks/useWorkers";
import { supabase } from "@/lib/supabase";

export default function MaterialesPage() {
	const [view, setView] = useState<"materiales" | "historial">("materiales");
	const [isDeliveryOpen, setIsDeliveryOpen] = useState(false);
	const [isAdjustOpen, setIsAdjustOpen] = useState(false);
	const [isCreateOpen, setIsCreateOpen] = useState(false);
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
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900">Gestión de Materiales</h1>
					<p className="text-gray-600 mt-1">Administra el catálogo, registra entregas y controla el stock por almacén.</p>
				</div>
				<div className="flex items-center gap-4">
					{view === 'materiales' && (
						<div className="relative w-64">
							<Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
							<Input
								placeholder="Buscar material..."
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="pl-9 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 focus:ring-blue-500/50"
							/>
						</div>
					)}
					<Button
						onClick={() => setIsFilterSidebarOpen(true)}
						variant="outline"
						className="border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white"
					>
						<Filter className="w-4 h-4 mr-2" />
						Filtros
						{((view === 'materiales' && (category || lowStockOnly)) ||
							(view === 'historial' && (movementType !== 'todos' || materialId || projectId || workerId || userId || dateFrom || dateTo))) && (
								<span className="ml-2 bg-blue-500/20 text-blue-300 text-xs font-medium px-2 py-0.5 rounded-full border border-blue-500/30">
									!
								</span>
							)}
					</Button>

					<div className="flex bg-slate-700/30 p-1 rounded-lg">
						<button
							onClick={() => setView("materiales")}
							className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === "materiales"
									? "bg-blue-600 text-white shadow-md"
									: "text-slate-400 hover:text-slate-300"
								}`}
						>
							Materiales
						</button>
						<button
							onClick={() => setView("historial")}
							className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${view === "historial"
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
					search={search}
					category={category}
					lowStockOnly={lowStockOnly}
				/>
			) : (
				<MovementList
					refreshToken={refreshKey}
					movementType={movementType}
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
		</div>
	);
}