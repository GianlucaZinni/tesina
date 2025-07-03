// ~/Project/frontend/src/components/common/datatable/AnimalsDataTable.jsx
import * as React from "react";
import {
    useReactTable,
    getCoreRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    getSortedRowModel,
    flexRender,
    getExpandedRowModel,
    getFacetedRowModel,
} from "@tanstack/react-table";
import SearchBar from "./SearchBar";
import ColumnFilter from "./ColumnFilter";
import PaginationControls from "./PaginationControls";
import RowsPerPageSelector from "./RowsPerPageSelector";
import ExpandableRow from "./ExpandableRow";
import AnimalDetailContent from './AnimalDetailContent';
import GlobalFilterPanel from './GlobalFilterPanel';

import { useEffect, useCallback } from "react";

import { Button } from '@/components/ui/shadcn/button';
import { Check, X, XCircle, Ban, Minus, SortAsc, SortDesc, ListFilter, PawPrint } from 'lucide-react';

import { useWindowWidth, BREAKPOINTS } from "@/lib/utils"

const EXPANDABLE_ROW_BREAKPOINT = BREAKPOINTS.xs;


export default function AnimalsDataTable({
    data = [],
    columns = [],
    exportFilename = "export.csv",
    onRowClick,
    onEditRow,
    onDeleteRow,
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
    const [lastSelectedIndex, setLastSelectedIndex] = React.useState(null);
    const windowWidth = useWindowWidth();

    const showExpandableRows = windowWidth < EXPANDABLE_ROW_BREAKPOINT;

    const dynamicallyHiddenColumns = ['sexo', 'tipo', 'raza', 'especie', 'parcela'];

    useEffect(() => {
        const newColumnVisibility = {
            numero_identificacion: true,
            nombre: true,
            acciones: true,
        };

        newColumnVisibility.sexo = windowWidth >= BREAKPOINTS.xxl;
        newColumnVisibility.tipo = windowWidth >= BREAKPOINTS.xl;
        newColumnVisibility.raza = windowWidth >= BREAKPOINTS.lg;
        newColumnVisibility.especie = windowWidth >= BREAKPOINTS.md;
        newColumnVisibility.parcela = windowWidth >= BREAKPOINTS.sm;

        if (showExpandableRows) {
            dynamicallyHiddenColumns.forEach(colId => {
                newColumnVisibility[colId] = false;
            });
        }

        setColumnVisibility(newColumnVisibility);
    }, [windowWidth, showExpandableRows]);


    const hasHiddenColumns = React.useMemo(() => {
        return dynamicallyHiddenColumns.some(colId => columnVisibility[colId] === false);
    }, [columnVisibility, dynamicallyHiddenColumns]);


    const table = useReactTable({
        data,
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
        onColumnFiltersChange: () => {
            setPagination(prev => ({ ...prev, pageIndex: 0 }));
        },
        getCoreRowModel: getCoreRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        enableRowSelection: true,
        autoResetPageIndex: false,
        meta: {
            showExpandableRows: showExpandableRows,
            columnVisibility: columnVisibility,
        },
    });

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

    const handleRowClick = (row, index, event) => {
        if (!showExpandableRows) {
            let newSelection = { ...rowSelection };

            if (event.shiftKey && lastSelectedIndex !== null) {
                const rowIdsOnPage = table.getRowModel().rows.map(r => r.id);
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
        }

        if (onRowClick) onRowClick(row.original);
    };

    const handleToggleRowSelectionMobile = useCallback((rowToToggle) => {
        setRowSelection(prev => ({
            ...prev,
            [rowToToggle.id]: !prev[rowToToggle.id]
        }));
    }, []);


    const toggleAllPageRowsSelected = () => {
        if (table.getIsAllPageRowsSelected()) {
            table.toggleAllPageRowsSelected(false);
        } else {
            table.toggleAllPageRowsSelected(true);
        }
    };

    const getSelectAllButtonState = () => {
        if (table.getIsAllPageRowsSelected()) {
            return { text: "Deseleccionar Página", icon: <X className="h-4 w-4" />, variant: "outline" };
        }
        if (table.getIsSomePageRowsSelected()) {
            return { text: "Deseleccionar Página", icon: <Minus className="h-4 w-4" />, variant: "outline" };
        }
        return { text: "Seleccionar Página", icon: <Check className="h-4 w-4" />, variant: "outline" };
    };

    const hasAnyFilters = table.getState().globalFilter || table.getAllColumns().some(col => col.getIsFiltered())

    const selectAllButtonState = getSelectAllButtonState();

    return (
        <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <PawPrint className="h-5 w-5 text-blue-600" />
                Animales Registrados
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

                    {!showExpandableRows && hasAnyFilters && (
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

                    {(showExpandableRows || hasHiddenColumns) && (
                        <GlobalFilterPanel table={table} columnVisibility={columnVisibility} />
                    )}

                </div>
            </div>

            <div className="overflow-hidden">
                {!showExpandableRows ? (
                    <table className="min-w-full table-fixed text-center">
                        <thead className="sticky top-0 bg-gray-100 z-10">
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id} className="border-b p-2">
                                            {header.isPlaceholder ? null : (
                                                <div className="p-1 flex flex-col items-center justify-center space-y-1">
                                                    <div className="flex items-center justify-center w-full">
                                                        {header.column.getCanSort() && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-4 w-4 hover:bg-gray-200 flex-shrink-0"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    header.column.getToggleSortingHandler()?.(e);
                                                                }}
                                                            >
                                                                {{
                                                                    asc: <SortAsc className="h-4 w-4" />,
                                                                    desc: <SortDesc className="h-4 w-4" />,
                                                                }[header.column.getIsSorted() ?? null] || <ListFilter className="h-4 w-4" />}
                                                            </Button>
                                                        )}
                                                        {header.column.getCanFilter() && (
                                                            <div>
                                                                <ColumnFilter column={header.column} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </th>
                                    ))}
                                </tr>
                            ))}
                        </thead>
                        <tbody>
                            {table.getRowModel().rows.map(row => (
                                <React.Fragment key={row.id}>
                                    <tr
                                        onClick={(e) => handleRowClick(row, row.index, e)}
                                        className={`transition-colors duration-100 ease-in-out
                                            ${row.getIsSelected()
                                                ? "bg-blue-100 hover:bg-blue-200"
                                                : "even:bg-gray-50 odd:bg-white hover:bg-gray-100"}`}
                                    >
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id} className="border-b p-2">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                    </tr>
                                    {row.getIsExpanded() && (
                                        <tr>
                                            <td colSpan={row.getVisibleCells().length} className="p-3 bg-gray-100 border-b border-gray-200 text-left">
                                                <AnimalDetailContent animal={row.original} columnVisibility={table.options.meta.columnVisibility} />
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                ) : ( // Si showExpandableRows es true, muestra la lista de ExpandableRows
                    <div className="space-y-2">
                        {table.getRowModel().rows.map(row => (
                            <ExpandableRow
                                key={row.id}
                                row={row}
                                onEdit={() => onEditRow(row.original.animal_id)}
                                onDelete={() => onDeleteRow(row.original)}
                                isSelected={row.getIsSelected()}
                                onToggleSelection={handleToggleRowSelectionMobile}
                                columnVisibility={table.options.meta.columnVisibility}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="flex justify-between mt-2 flex-wrap gap-2">
                <PaginationControls table={table} />
                {Object.keys(rowSelection).length > 0 && (
                    <Button
                        onClick={clearAllSelections}
                        variant="ghost"
                        className="gap-2 text-red-600 hover:text-red-700 w-full sm:w-auto"
                    >
                        <Ban className="h-4 w-4" /> Deseleccionar Todo
                    </Button>
                )}
                <RowsPerPageSelector table={table} />
            </div>
        </div>
    );
}