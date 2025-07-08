// ~/Project/frontend/src/components/common/datatable/ExportButton.jsx
import { Button } from '@/components/ui/shadcn/button';
import { Download, FileText } from 'lucide-react'; // Añadido FileText para la plantilla
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from '@/components/ui/shadcn/dropdown-menu';
import { toast } from 'sonner';
import { AlertCircle, XCircle } from 'lucide-react';

// Importar servicios de exportación de animales y collares
import { exportAnimals, downloadAnimalTemplate } from '@/api/services/animalService';
import { exportCollars, downloadCollarTemplate } from '@/api/services/collarService';


export default function ExportButton({ table = null, filename = "data", entityType }) { // Añadido entityType

    const downloadCsvFromBlob = (blob, filenameWithExtension) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filenameWithExtension;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
        toast.success("Archivo exportado correctamente.");
    };

    const handleExport = async (type) => {
        let selectedIds = [];
        if (table) {
            if (type === 'selected') {
                selectedIds = table.getSelectedRowModel().rows.map(row => row.original.id || row.original.animal_id);
                if (selectedIds.length === 0) {
                    toast.warning("No hay filas seleccionadas para exportar.", {
                        description: "Por favor, selecciona al menos una fila.",
                        icon: <AlertCircle className="h-4 w-4 text-orange-500" />,
                    });
                    return;
                }
            } else if (type === 'page') {
                selectedIds = table.getRowModel().rows.map(row => row.original.id || row.original.animal_id);
            }
        }

        const filters = {
            globalFilter: table ? table.getState().globalFilter : null,
            ids: selectedIds,
        };

        try {
            let blob;
            if (entityType === 'animals') {
                blob = await exportAnimals(type, filters);
            } else if (entityType === 'collares') {
                blob = await exportCollars(type, filters);
            } else {
                throw new Error('Tipo de entidad no soportado para exportación.');
            }
            downloadCsvFromBlob(blob, `${filename}_${type}.csv`);

        } catch (error) {
            console.error(`Error al exportar ${entityType} (${type}):`, error);
            toast.error(`Error al exportar ${entityType}.`, {
                description: error.message,
                icon: <XCircle className="h-4 w-4 text-red-500" />,
            });
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            let blob;
            if (entityType === 'animals') {
                blob = await downloadAnimalTemplate();
            } else if (entityType === 'collares') {
                blob = await downloadCollarTemplate();
            } else {
                throw new Error('Tipo de entidad no soportado para plantilla.');
            }
            downloadCsvFromBlob(blob, `plantilla_${entityType}.csv`);
        } catch (error) {
            console.error(`Error al descargar plantilla de ${entityType}:`, error);
            toast.error('Error al descargar la plantilla.', {
                description: error.message,
                icon: <XCircle className="h-4 w-4 text-red-500" />,
            });
        }
    };

    const showTableSpecificOptions = table && typeof table === 'object' &&
        table.getFilteredRowModel &&
        table.getRowModel &&
        table.getSelectedRowModel;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    className="gap-2 bg-orange-600 hover:bg-orange-700 text-white shadow-md w-full sm:w-auto"
                >
                    <Download className="h-4 w-4" /> <span className="hidden lg:inline">Exportar</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px] bg-white">
                <DropdownMenuItem onClick={() => handleExport('all')}>
                    Exportar Todo
                </DropdownMenuItem>
                {showTableSpecificOptions && (
                    <>
                        <DropdownMenuItem onClick={() => handleExport('filtered')}>
                            Exportar Filtrado
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleExport('page')}>
                            Exportar Página
                        </DropdownMenuItem>
                        {table.getIsSomeRowsSelected() || table.getIsAllRowsSelected() ? (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleExport('selected')}>
                                    Exportar Seleccionado ({table.getSelectedRowModel().rows.length})
                                </DropdownMenuItem>
                            </>
                        ) : null}
                    </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDownloadTemplate} className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-800" /> Descargar Plantilla
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}