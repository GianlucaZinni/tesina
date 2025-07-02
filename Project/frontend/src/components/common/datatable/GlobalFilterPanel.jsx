// ~/Project/frontend/src/components/common/datatable/GlobalFilterPanel.jsx
import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/shadcn/dialog';
import { Button } from '@/components/ui/shadcn/button';
import { ScrollArea } from '@/components/ui/shadcn/scroll-area';
import { ListFilter, XCircle } from 'lucide-react';
import ColumnFilter from './ColumnFilter';

export default function GlobalFilterPanel({ table, columnVisibility = {} }) {
    const allFilterableColumns = table
        .getAllColumns()
        .filter(column => column.getCanFilter() && column.id !== 'acciones');

    const relevantFilterableColumns = allFilterableColumns.filter(
        column =>
            !columnVisibility[column.id] &&
            column.id !== 'numero_identificacion' &&
            column.id !== 'nombre'
    );

    const clearAllColumnFilters = () => {
        allFilterableColumns.forEach(column => {
            if (column.getIsFiltered()) {
                column.setFilterValue(undefined);
            }
        });
        table.setGlobalFilter("");
    };

    const hasActiveFilters = allFilterableColumns.some(column => column.getIsFiltered()) || table.getState().globalFilter;

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    className="gap-2 text-gray-700 border-gray-300 hover:bg-gray-100 w-full sm:w-auto"
                >
                    <ListFilter className="h-4 w-4" /> <span className="hidden lg:inline">Filtros</span>
                    {hasActiveFilters && (
                        <span className="ml-1 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                            Activo
                        </span>
                    )}
                </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-lg sm:max-w-xl bg-white p-4">
                <DialogHeader className="text-center">
                    <DialogTitle className="text-lg font-semibold">
                        Filtros Avanzados
                    </DialogTitle>
                    {hasActiveFilters && (
                        <div className="w-full flex justify-center">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearAllColumnFilters}
                                className="text-red-500 hover:bg-red-50 gap-1"
                            >
                                <XCircle className="h-4 w-4" /> Limpiar todo
                            </Button>
                        </div>
                    )}
                </DialogHeader>
                <ScrollArea className="max-h-[70vh] py-2">
                    <div className="flex flex-col items-center gap-4">
                        {relevantFilterableColumns.length > 0 ? (
                            relevantFilterableColumns.map(column => (
                                <div
                                    key={column.id}
                                    className="p-4 rounded-md border border-gray-200 bg-gray-50 shadow-sm w-full"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-sm font-medium text-gray-700 capitalize">
                                            {column.id.replace(/_/g, ' ')}
                                        </h4>
                                        {column.getIsFiltered() && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => column.setFilterValue(undefined)}
                                                className="text-red-500 hover:bg-red-50"
                                            >
                                                <XCircle className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <ColumnFilter column={column}/>
                                    {column.getIsFiltered() && (
                                        <p className="text-xs text-blue-600 mt-1">
                                            Filtro activo: <code>{String(column.getFilterValue())}</code>
                                        </p>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-center text-gray-500">
                                No hay filtros ocultos disponibles para esta vista.
                            </p>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
