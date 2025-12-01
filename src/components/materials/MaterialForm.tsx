"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Loader2, AlertCircle } from "lucide-react";
import type { MaterialFormData } from "@/hooks/useMaterials";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useMaterials } from "@/hooks/useMaterials";

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
	});

	const [categories, setCategories] = useState<string[]>([]);
	const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

	// Cargar almacenes y categorías al montar
	useEffect(() => {
		fetchWarehouses(true);
		const loadCategories = async () => {
			const cats = await getCategories();
			setCategories(cats);
		};
		loadCategories();
	}, []);

	// Filtrar categorías según el input
	const filteredCategories = form.category
		? categories.filter(cat => 
			cat.toLowerCase().includes(form.category.toLowerCase()) && 
			cat !== form.category
		)
		: categories;

	// Manejar click fuera del dropdown
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				categoryInputRef.current &&
				categoryDropdownRef.current &&
				!categoryInputRef.current.contains(event.target as Node) &&
				!categoryDropdownRef.current.contains(event.target as Node)
			) {
				setShowCategorySuggestions(false);
			}
		};

		if (showCategorySuggestions) {
			document.addEventListener('mousedown', handleClickOutside);
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [showCategorySuggestions]);

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
		});
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			{error && (
				<div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
					<AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
					<p className="text-sm text-red-800">{error}</p>
				</div>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
					<Input 
						value={form.name} 
						onChange={(e) => handleChange("name", e.target.value)} 
						required 
					/>
				</div>
				<div className="relative">
					<label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
					<Input
						ref={categoryInputRef}
						value={form.category}
						onChange={(e) => {
							handleChange("category", e.target.value);
							setShowCategorySuggestions(true);
						}}
						onFocus={() => {
							setShowCategorySuggestions(true);
						}}
						onBlur={() => {
							// Delay para permitir click en sugerencia
							setTimeout(() => setShowCategorySuggestions(false), 200);
						}}
						placeholder="Ej: Fijaciones, Adhesivos, Eléctricos"
						required
					/>
					{showCategorySuggestions && filteredCategories.length > 0 && (
						<div
							ref={categoryDropdownRef}
							className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto"
						>
							{filteredCategories.map((category) => (
								<button
									key={category}
									type="button"
									onClick={() => {
										handleChange("category", category);
										setShowCategorySuggestions(false);
										categoryInputRef.current?.blur();
									}}
									className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
								>
									{category}
								</button>
							))}
						</div>
					)}
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Unidad *</label>
					<Select value={form.unit} onChange={(e) => handleChange("unit", e.target.value)} required>
						<option value="unidad">Unidad</option>
						<option value="caja">Caja</option>
						<option value="kg">Kg</option>
						<option value="mts">Mts</option>
						<option value="m2">m²</option>
						<option value="m3">m³</option>
						<option value="lt">Litro</option>
					</Select>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Almacén principal</label>
					<Select 
						value={form.default_warehouse_id?.toString() || ""} 
						onChange={(e) => handleChange("default_warehouse_id", e.target.value || "")}
					>
						<option value="">Selecciona almacén (opcional)</option>
						{warehouses.filter(w => w.is_active).map((wh) => (
							<option key={wh.id} value={wh.id.toString()}>{wh.name}</option>
						))}
					</Select>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
					<Input 
						type="number" 
						min="0" 
						step="0.001"
						value={form.stock_min} 
						onChange={(e) => handleChange("stock_min", Number(e.target.value))} 
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Costo unitario *</label>
					<Input 
						type="number" 
						min="0" 
						step="0.01" 
						value={form.unit_cost} 
						onChange={(e) => handleChange("unit_cost", Number(e.target.value))}
						required
					/>
				</div>
				<div>
					<label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
					<Input 
						value={form.supplier} 
						onChange={(e) => handleChange("supplier", e.target.value)} 
						placeholder="Opcional"
					/>
				</div>
				<div className="flex items-center gap-2 pt-6">
					<input 
						id="active" 
						type="checkbox" 
						checked={form.is_active} 
						onChange={(e) => handleChange("is_active", e.target.checked)} 
						className="rounded"
					/>
					<label htmlFor="active" className="text-sm text-gray-700 cursor-pointer">Activo</label>
				</div>
				<div className="md:col-span-2">
					<label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
					<Textarea 
						value={form.notes} 
						onChange={(e) => handleChange("notes", e.target.value)} 
						placeholder="Detalles adicionales del material"
						rows={3}
					/>
				</div>
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
	);
}