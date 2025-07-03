// ~/Project/frontend/src/components/common/datatable/PaginationControls.jsx
import { Button } from "@/components/ui/shadcn/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function PaginationControls({ table }) {
    return (
        <div className="flex items-center space-x-2">
            {/* Botón para la primera página */}
            <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
            >
                <span className="sr-only">Ir a la primera página</span>
                <ChevronsLeft className="h-4 w-4" />
            </Button>

            {/* Botón para la página anterior */}
            <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
            >
                <span className="sr-only">Ir a la página anterior</span>
                <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Indicador de página actual y total */}
            <div className="flex-center text-sm font-medium whitespace-nowrap">
                {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
            </div>

            {/* Botón para la página siguiente */}
            <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
            >
                <span className="sr-only">Ir a la página siguiente</span>
                <ChevronRight className="h-4 w-4" />
            </Button>

            {/* Botón para la última página */}
            <Button
                variant="outline"
                className="h-8 w-8 p-0"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
            >
                <span className="sr-only">Ir a la última página</span>
                <ChevronsRight className="h-4 w-4" />
            </Button>
        </div>
    );
}