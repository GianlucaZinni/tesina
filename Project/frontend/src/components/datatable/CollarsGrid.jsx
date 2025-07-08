// ~/Project/frontend/src/components/common/datatable/CollarsGrid.jsx
import * as React from "react";
import { useMemo, useCallback, useEffect } from "react";
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
} from "@tanstack/react-table";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Shadcn UI Components
import { Input } from '@/components/ui/shadcn/input';
import { Button } from '@/components/ui/shadcn/button';
import { ScrollArea } from '@/components/ui/shadcn/scroll-area';
import { Separator } from '@/components/ui/shadcn/separator';
import { Badge } from '@/components/ui/shadcn/badge';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from '@/components/ui/shadcn/form';

// Componentes
import SearchBar from "./SearchBar";
import ExportButton from "./ExportButton";
import ImportButton from "./ImportButton";
import PaginationControls from "./PaginationControls";
import RowsPerPageSelector from "./RowsPerPageSelector";

// Iconos de Lucide React
import {
    Ban,
    Trash2,
    PlusCircle,
    Settings,
    Hash,
    BatteryLow,
    XCircle,
    Info,
    CircleDotDashed,
    BatteryFull,
    BatteryMedium,
    Edit,
    Check,
    X,
    Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Esquema de validación para el formulario de creación de collares
const collarSchema = z.object({
    identificadorBase: z.string().min(1, "El identificador base es obligatorio.").max(4, "El identificador no puede exceder 4 caracteres."),
    cantidad: z.coerce.number().int().min(1, "La cantidad debe ser al menos 1.").max(500, "Máximo 500 collares por lote."),
});

// Función para renderizar el badge de estado del collar (fuera del componente principal)
const getEstadoBadge = (estado, bateria) => {
    const estadoSanitizado = (estado || '').toLowerCase();
    const isActivo = estadoSanitizado === 'activo';

    let icon = <Info className="h-4 w-4" />;
    let text = 'Desconocido';
    let badgeClass = 'bg-gray-100 text-gray-700';

    if (isActivo && typeof bateria === 'number') {
        if (bateria >= 70) {
            icon = <BatteryFull className="h-4 w-4 text-green-600" />;
            badgeClass = 'bg-green-100 text-green-800';
        } else if (bateria >= 30) {
            icon = <BatteryMedium className="h-4 w-4 text-yellow-500" />;
            badgeClass = 'bg-yellow-100 text-yellow-800';
        } else {
            icon = <BatteryLow className="h-4 w-4 text-red-700" />;
            badgeClass = 'bg-red-100 text-red-800';
        }
        text = `Activo (${bateria}%)`;
    } else {
        switch (estadoSanitizado) {
            case 'disponible':
                icon = <CircleDotDashed className="h-4 w-4 text-green-600" />;
                badgeClass = 'bg-green-100 text-green-800';
                text = 'Disponible';
                break;
            case 'sin bateria':
                icon = <BatteryLow className="h-4 w-4 text-red-700" />;
                badgeClass = 'bg-red-100 text-red-800';
                text = 'Sin batería';
                break;
            case 'defectuoso':
                icon = <XCircle className="h-4 w-4 text-red-700" />;
                badgeClass = 'bg-red-100 text-red-800';
                text = 'Defectuoso';
                break;
            default:
                text = estadoSanitizado.charAt(0).toUpperCase() + estadoSanitizado.slice(1);
                break;
        }
    }

    return (
        <Badge className={cn('flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap max-w-[70%] truncate', badgeClass)}>
            {icon}
            {text}
        </Badge>
    );
};


export default function CollarsGrid({
    collares = [],
    onCreateBatch,
    onDelete,
    onDeleteSelected,
    onEditCollar,
    fullCollarDataForExport = [],
    onImportSuccess,
    globalFilter,
    setGlobalFilter,
    rowSelection,
    setRowSelection,
    sorting,
    setSorting,
    pagination,
    setPagination,
    columnVisibility,
    setColumnVisibility,
}) {

    // Formulario para creación de collares
    const form = useForm({
        resolver: zodResolver(collarSchema),
        defaultValues: {
            identificadorBase: '',
            cantidad: 1,
        },
    });

    const onSubmitBatch = useCallback((data) => {
        onCreateBatch(data.identificadorBase, data.cantidad);
        form.reset({ identificadorBase: '', cantidad: 1 });
    }, [onCreateBatch, form]);


    // Definición de columnas *virtuales* para React Table.
    const columns = useMemo(
        () => [
            { accessorKey: "id" },
            { accessorKey: "codigo" },
            { accessorKey: "prefijo" },
            { accessorKey: "estado" },
            { accessorKey: "bateria" },
            { accessorKey: "animal_id" },
            { accessorKey: "animal_nombre" },
        ],
        []
    );

    const table = useReactTable({
        data: collares,
        columns,
        state: {
            globalFilter,
            rowSelection,
            sorting,
            pagination,
            columnVisibility,
        },
        onGlobalFilterChange: (value) => {
            setPagination(prev => ({ ...prev, pageIndex: 0 }));
            setGlobalFilter(value);
        },
        onRowSelectionChange: setRowSelection,
        onSortingChange: setSorting,
        onPaginationChange: setPagination,
        onColumnVisibilityChange: setColumnVisibility,
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getSortedRowModel: getSortedRowModel(),
        enableRowSelection: true,
        autoResetPageIndex: false,
        globalFilterFn: (row, columnId, filterValue) => {
            const searchTerm = String(filterValue).toLowerCase();
            const codigo = row.original.codigo?.toLowerCase() || '';
            const estado = row.original.estado?.toLowerCase() || '';
            const animalNombre = row.original.animal_nombre?.toLowerCase() || '';

            return (
                codigo.includes(searchTerm) ||
                estado.includes(searchTerm) ||
                animalNombre.includes(searchTerm)
            );
        },
    });

    const displayedCollarRows = table.getRowModel().rows;
    const [lastSelectedIndex, setLastSelectedIndex] = React.useState(null);

    const clearAllSelections = useCallback(() => {
        setRowSelection({});
        setLastSelectedIndex(null);
    }, []);

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                clearAllSelections();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [clearAllSelections]);

    const toggleAllPageRowsSelected = useCallback(() => {
        if (table.getIsAllPageRowsSelected()) {
            table.toggleAllPageRowsSelected(false);
        } else {
            table.toggleAllPageRowsSelected(true);
        }
    }, [table]);

    const getSelectAllButtonState = useCallback(() => {
        if (table.getIsAllPageRowsSelected()) {
            return { text: "Deseleccionar Página", icon: <X className="h-4 w-4" />, variant: "outline" };
        }
        if (table.getIsSomePageRowsSelected()) {
            return { text: "Deseleccionar Página", icon: <Minus className="h-4 w-4" />, variant: "outline" };
        }
        return { text: "Seleccionar Página", icon: <Check className="h-4 w-4" />, variant: "outline" };
    }, [table]);

    const handleRowClick = (row, index, event) => {
        event.preventDefault();
        let newSelection = { ...rowSelection };

        if (event.shiftKey && lastSelectedIndex !== null) {
            const rowIdsOnPage = displayedCollarRows.map(r => r.id);
            const [start, end] = [lastSelectedIndex, index].sort((a, b) => a - b);
            for (let i = start; i <= end; i++) {
                newSelection[rowIdsOnPage[i]] = true;
            }
        } else if (event.ctrlKey || event.metaKey) {
            newSelection[row.id] = !newSelection[row.id];
            setLastSelectedIndex(index);
        } else {
            if (newSelection[row.id] && Object.keys(newSelection).length === 1) {
                delete newSelection[row.id];
            } else {
                newSelection = { [row.id]: true };
            }
            setLastSelectedIndex(index);
        }
        setRowSelection(newSelection);
    };

    const hasAnyFilters = table.getState().globalFilter || table.getAllColumns().some(col => col.getIsFiltered())

    const selectAllButtonState = getSelectAllButtonState();

    return (
        <div className="space-y-6">
            {/* Sección de Registro de Nuevos Collares */}
            <section className="space-y-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <PlusCircle className="h-5 w-5 text-purple-600" />
                    Registrar Nuevos Collares
                </h3>
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(onSubmitBatch)}
                        className="flex flex-col md:flex-row md:items-end gap-4 flex-wrap"
                    >
                        <FormField
                            control={form.control}
                            name="identificadorBase"
                            render={({ field }) => (
                                <FormItem className="flex-grow min-w-[160px]">
                                    <FormLabel>Identificador Base</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="Ej. AFGH"
                                            {...field}
                                            className={form.formState.errors.identificadorBase ? "border-red-500 focus-visible:ring-red-500" : ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="cantidad"
                            render={({ field }) => (
                                <FormItem className="w-full sm:w-40">
                                    <FormLabel>Cantidad</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="Ej. 100"
                                            {...field}
                                            onChange={(e) => field.onChange(e.target.value === "" ? "" : Number(e.target.value))}
                                            className={form.formState.errors.cantidad ? "border-red-500 focus-visible:ring-red-500" : ""}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button
                            type="submit"
                            className="flex-shrink-0 gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-sm h-10 px-4"
                        >
                            <Hash className="h-4 w-4" /> <span className="hidden sm:inline">Crear Collares</span>
                        </Button>
                    </form>
                </Form>
            </section>

            <Separator />

            {/* Sección de Collares Registrados (Grid) */}
            <section className="space-y-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <Settings className="h-5 w-5 text-purple-600" />
                    Collares Registrados
                </h3>
                <div className="flex flex-col sm:flex-row justify-between items-center mb-2 gap-4 flex-wrap">
                    <SearchBar globalFilter={globalFilter} setGlobalFilter={setGlobalFilter} />
                    <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                        {table.getFilteredRowModel().rows.length > 0 && (
                            <Button
                                onClick={toggleAllPageRowsSelected}
                                variant={selectAllButtonState.variant}
                                className="gap-2 text-gray-700 border-gray-300 hover:bg-gray-100 w-full sm:w-auto"
                            >
                                {selectAllButtonState.icon} <span className="hidden lg:inline">{selectAllButtonState.text}</span>
                            </Button>
                        )}

                        {hasAnyFilters && (
                            <Button
                                onClick={() => {
                                    table.resetGlobalFilter();
                                    table.getAllColumns().forEach(col => col.setFilterValue(undefined));
                                    setRowSelection({});
                                }}
                                variant="ghost"
                                className="gap-2 bg-red-700 hover:bg-red-800 text-white shadow-md w-full sm:w-auto"
                            >
                                <XCircle className="h-4 w-4" /> <span className="hidden lg:inline">Limpiar Filtros</span>
                            </Button>
                        )}


                        {Object.keys(rowSelection).length > 0 && (
                            <Button
                                onClick={() => {
                                    const ids = table.getSelectedRowModel().rows.map(r => r.original.id);
                                    onDeleteSelected(ids);
                                }}
                                variant="ghost"
                                className="gap-2 bg-red-700 hover:bg-red-800 text-white shadow-md w-full sm:w-auto"
                            >
                                <Trash2 className="h-4 w-4" /> <span className="hidden lg:inline">Eliminar Seleccionado</span>
                            </Button>
                        )}

                        <ExportButton
                            table={table}
                            filename="collares"
                            entityType="collares"
                        />

                        <ImportButton
                            entityType="collares"
                            onImportSuccess={onImportSuccess}
                        />
                    </div>
                </div>

                <ScrollArea className="max-h-[80vh] w-full overflow-y-auto rounded-xl p-3 bg-gray-50">
                    {displayedCollarRows.length === 0 ? (
                        <div className="text-center text-gray-500 py-12">
                            <Ban className="h-10 w-10 mx-auto mb-3 text-gray-400" />
                            <p className="text-lg font-medium">
                                {collares.length > 0 && table.getState().globalFilter
                                    ? "No se encontraron collares con los filtros aplicados."
                                    : collares.length > 0
                                        ? "No hay collares en esta página con la paginación actual."
                                        : "No hay collares registrados."}
                            </p>
                            <p className="text-sm">
                                {collares.length > 0 && table.getState().globalFilter
                                    ? "Intenta ajustar tu búsqueda."
                                    : collares.length > 0
                                        ? "Ajusta las filas por página o navega a otra página."
                                        : "Utiliza el formulario de arriba para añadir uno."}
                            </p>
                        </div>
                    ) : (
                        <ul className="grid w-full p-1 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                            {displayedCollarRows.map((row) => {
                                const collar = row.original;
                                const isSelected = row.getIsSelected();
                                return (
                                    <li
                                        key={collar.id}
                                        className={cn(
                                            "flex flex-col justify-center p-4 rounded-xl bg-white shadow-sm hover:shadow-md transition-shadow duration-150 min-h-[120px] cursor-pointer relative select-none",
                                            isSelected ? "border-blue-500 ring-2 ring-blue-500 bg-blue-50" : "border-gray-200"
                                        )}
                                        onClick={(e) => handleRowClick(row, row.index, e)}
                                    >

                                        <div className="space-y-1 mb-2">
                                            <div className="font-semibold text-gray-900 text-base flex items-center gap-2">
                                                <span>Código: {collar.codigo}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                {collar.animal_nombre ? (
                                                    <span className="flex items-center gap-1">
                                                        Asignado a: <b className="text-blue-700">{collar.animal_nombre}</b>
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground italic">No asignado</span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap justify-center items-center gap-2 mt-2">
                                            {getEstadoBadge(collar.estado, collar.bateria)}
                                            <div className="flex gap-2 flex-shrink-0">
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={(e) => { e.stopPropagation(); onEditCollar(collar.id); }}
                                                    title="Editar collar"
                                                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={(e) => { e.stopPropagation(); onDelete(collar); }}
                                                    title="Eliminar collar"
                                                    className="text-red-700 hover:text-red-800 hover:bg-red-50"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </ScrollArea>

                <div className="flex flex-wrap justify-between items-center gap-4 mt-4">
                    <PaginationControls table={table} />
                    {Object.keys(rowSelection).length > 0 && (
                        <Button
                            onClick={clearAllSelections}
                            variant="ghost"
                            className="gap-2 text-red-600 hover:text-red-700 w-full sm:w-auto"
                        >
                            <Ban className="h-4 w-4" /> <span className="hidden lg:inline">Deseleccionar Todo</span>
                        </Button>
                    )}
                    <RowsPerPageSelector table={table} />
                </div>
            </section>
        </div>
    );
}