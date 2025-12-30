"use client";

import { useRef, useState, useEffect } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Loader2, AlertCircle, Info, Package, Warehouse as WarehouseIcon, FileText, ChevronDown, Globe, Tag, Settings } from "lucide-react";
import type { MaterialFormData } from "@/hooks/useMaterials";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useMaterials } from "@/hooks/useMaterials";
import { useProjects } from "@/hooks/useProjects";
import { WarehouseFormModal } from "./WarehouseFormModal";

type MaterialFormProps = {
	onSave: (data: MaterialFormData) => Promise<void>;
	onCancel: () => void;
	initialData?: any;
	loading?: boolean;
	error?: string | null;
};

export function MaterialForm({ onSave, onCancel, initialData, loading = false, error }: MaterialFormProps) {
	const { warehouses, fetchWarehouses } = useWarehouses();
	const { getCategories } = useMaterials();
	const { projects } = useProjects();
	const categoryInputRef = useRef<HTMLInputElement>(null);
	const categoryDropdownRef = useRef<HTMLDivElement>(null);

	const [form, setForm] = useState({
		name: initialData?.name || "",
		category: initialData?.category || "",
		unit: initialData?.unit || "unidad",
		unit_cost: initialData?.unit_cost ?? 0,
		supplier: initialData?.supplier || "",
		stock_min: initialData?.stock_min ?? 0,
		default_warehouse_id: initialData?.default_warehouse_id || initialData?.default_warehouse?.id || "",
		notes: initialData?.notes || "",
		is_active: initialData?.is_active ?? true,
		project_id: initialData?.project_id || "",
	});

	const [categories, setCategories] = useState<string[]>([]);
	const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
	const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);

	// Cargar almacenes y categorías al montar
	useEffect(() => {
		fetchWarehouses(true);
		const loadCategories = async () => {
			const cats = await getCategories();
			setCategories(cats);
		};
		loadCategories();
	}, []);

	// Manejar click fuera del dropdown
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				categoryInputRef.current &&
				categoryDropdownRef.current &&
				!categoryInputRef.current.contains(event.target as Node) &&
				!categoryDropdownRef.current.contains(event.target as Node)
			) {
				setShowCategoryDropdown(false);
			}
		};

		if (showCategoryDropdown) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showCategoryDropdown]);

	// Actualizar form cuando cambie initialData (para modo edición)
	useEffect(() => {
		if (initialData) {
			setForm({
				name: initialData.name || "",
				category: initialData.category || "",
				unit: initialData.unit || "unidad",
				unit_cost: initialData.unit_cost ?? 0,
				supplier: initialData.supplier || "",
				stock_min: initialData.stock_min ?? 0,
				default_warehouse_id: initialData.default_warehouse_id || initialData?.default_warehouse?.id || "",
				notes: initialData.notes || "",
				is_active: initialData.is_active ?? true,
				project_id: initialData.project_id || "",
			});
		}
	}, [initialData]);

	const handleChange = (field: string, value: any) => {
		setForm((prev) => ({ ...prev, [field]: value }));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		await onSave({
			name: form.name,
			category: form.category,
			unit: form.unit,
			unit_cost: form.unit_cost,
			supplier: form.supplier || null,
			stock_min: form.stock_min,
			default_warehouse_id: form.default_warehouse_id ? Number(form.default_warehouse_id) : null,
			notes: form.notes || null,
			is_active: form.is_active,
			project_id: form.project_id ? Number(form.project_id) : null,
		});
	};

	return (
		<>
			<form onSubmit={handleSubmit} className="space-y-4">
				{error && (
					<div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
						<AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
						<p className="text-sm text-red-800">{error}</p>
					</div>
				)}

				<div className="space-y-8">
					{/* Sección 1: Información Básica */}
					<section className="space-y-4">
						<div className="flex items-center gap-2 pb-2 border-b border-white/5">
							<div className="p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
								<Info className="h-4 w-4" />
							</div>
							<h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Información Básica</h4>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2">
									Nombre del Material
									<span className="text-red-500">*</span>
								</label>
								<Input
									value={form.name}
									onChange={(e) => handleChange("name", e.target.value)}
									placeholder="Ej: Pintura Látex Blanca"
									required
									className="bg-slate-800/50 border-slate-700 focus:border-blue-500 transition-all"
								/>
							</div>
							<div className="relative">
								<label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2">
									<Tag className="h-3.5 w-3.5 text-slate-500" />
									Categoría
								</label>
								<div className="relative" ref={categoryDropdownRef}>
									<Input
										ref={categoryInputRef}
										value={form.category}
										onChange={(e) => {
											handleChange("category", e.target.value);
											setShowCategoryDropdown(true);
										}}
										onFocus={() => setShowCategoryDropdown(true)}
										placeholder="Selecciona o escribe..."
										className="bg-slate-800/50 border-slate-700"
									/>
									<ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 pointer-events-none" />

									{showCategoryDropdown && categories.length > 0 && (
										<div className="absolute z-10 w-full mt-1 glass-panel premium-border rounded-lg shadow-xl max-h-48 overflow-y-auto premium-shadow">
											{categories
												.filter(c => c.toLowerCase().includes(form.category.toLowerCase()))
												.map((cat, idx) => (
													<button
														key={idx}
														type="button"
														className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
														onClick={() => {
															handleChange("category", cat);
															setShowCategoryDropdown(false);
														}}
													>
														{cat}
													</button>
												))}
										</div>
									)}
								</div>
							</div>
						</div>
					</section>

					{/* Sección 2: Stock y Unidades */}
					<section className="space-y-4">
						<div className="flex items-center gap-2 pb-2 border-b border-white/5">
							<div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400">
								<Package className="h-4 w-4" />
							</div>
							<h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Stock y Almacén</h4>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1.5">Unidad</label>
								<Input
									value={form.unit}
									onChange={(e) => handleChange("unit", e.target.value)}
									placeholder="m2, kg, unidad, etc."
									required
									className="bg-slate-800/50 border-slate-700"
								/>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2">
									Costo Unitario
								</label>
								<div className="relative">
									<span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
									<Input
										type="number"
										value={form.unit_cost}
										onChange={(e) => handleChange("unit_cost", e.target.value)}
										className="pl-7 bg-slate-800/50 border-slate-700"
									/>
								</div>
							</div>
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2">
									Stock Mínimo
								</label>
								<Input
									type="number"
									value={form.stock_min}
									onChange={(e) => handleChange("stock_min", e.target.value)}
									className="bg-slate-800/50 border-slate-700"
								/>
							</div>

							<div className="md:col-span-1">
								<div className="flex items-center justify-between mb-1.5">
									<label className="block text-sm font-medium text-slate-300 flex items-center gap-2">
										<WarehouseIcon className="h-3.5 w-3.5 text-slate-500" />
										Bodega Predeterminada
									</label>
									<button
										type="button"
										onClick={() => setIsWarehouseModalOpen(true)}
										className="p-1 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all"
										title="Gestionar bodegas"
									>
										<Settings className="h-3.5 w-3.5" />
									</button>
								</div>
								<Select
									value={form.default_warehouse_id}
									onChange={(e) => handleChange("default_warehouse_id", e.target.value)}
									className="bg-slate-800/50 border-slate-700 focus:border-blue-500"
								>
									<option value="">Selecciona bodega</option>
									{warehouses.filter(w => w.is_active).map((wh) => (
										<option key={wh.id} value={wh.id.toString()}>{wh.name}</option>
									))}
								</Select>
							</div>

							<div className="md:col-span-2 flex items-center pt-6">
								<label className="group flex items-center gap-3 cursor-pointer select-none">
									<div className="relative">
										<input
											id="active"
											type="checkbox"
											checked={form.is_active}
											onChange={(e) => handleChange("is_active", e.target.checked)}
											className="sr-only"
										/>
										<div className={`w-10 h-6 rounded-full transition-all duration-300 ${form.is_active ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-700'}`}>
											<div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${form.is_active ? 'translate-x-4' : ''}`} />
										</div>
									</div>
									<div className="flex flex-col">
										<span className="text-sm font-bold text-slate-200">Material Activo</span>
										<span className="text-xs text-slate-500">Disponible para movimientos</span>
									</div>
								</label>
							</div>
						</div>
					</section>

					{/* Sección 3: Proyecto y Notas */}
					<section className="space-y-4">
						<div className="flex items-center gap-2 pb-2 border-b border-white/5">
							<div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400">
								<Globe className="h-4 w-4" />
							</div>
							<h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">Asignación y Notas</h4>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2 text-primary">
									<Globe className="h-4 w-4" />
									Proyecto Asociado
								</label>
								<Select
									value={form.project_id?.toString() || ""}
									onChange={(e) => handleChange("project_id", e.target.value || "")}
									className="bg-slate-800/50 border-slate-700 border-primary/30"
								>
									<option value="">Todos los proyectos (General)</option>
									{projects.filter(p => p.is_active).map((project) => (
										<option key={project.id} value={project.id.toString()}>{project.name}</option>
									))}
								</Select>
							</div>
							<div className="md:col-span-2">
								<label className="block text-sm font-medium text-slate-300 mb-1.5 flex items-center gap-2">
									<FileText className="h-3.5 w-3.5 text-slate-500" />
									Notas Adicionales
								</label>
								<Textarea
									value={form.notes}
									onChange={(e) => handleChange("notes", e.target.value)}
									placeholder="Detalles sobre el uso, almacenamiento o especificaciones..."
									rows={3}
									className="bg-slate-800/50 border-slate-700 resize-none"
								/>
							</div>
						</div>
					</section>
				</div>

				<div className="flex justify-end gap-2 pt-4 border-t">
					<Button type="button" variant="secondary" onClick={onCancel} disabled={loading}>
						Cancelar
					</Button>
					<Button type="submit" disabled={loading}>
						{loading ? (
							<>
								<Loader2 className="h-4 w-4 animate-spin mr-2" />
								Guardando...
							</>
						) : (
							"Guardar"
						)}
					</Button>
				</div>
			</form>

			<WarehouseFormModal
				open={isWarehouseModalOpen}
				onClose={() => {
					setIsWarehouseModalOpen(false);
					fetchWarehouses(true);
				}}
				onSuccess={() => fetchWarehouses(true)}
			/>
		</>
	);
}