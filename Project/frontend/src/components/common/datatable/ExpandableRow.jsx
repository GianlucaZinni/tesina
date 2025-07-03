import { useState } from 'react';
import { Button } from '@/components/ui/shadcn/button';
import { Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import AnimalDetailContent from './AnimalDetailContent';

export default function ExpandableRow({ row, onEdit, onDelete, isSelected, onToggleSelection, columnVisibility }) {
    const [expanded, setExpanded] = useState(false);

    const handleToggleExpand = (e) => {
        e.stopPropagation();
        setExpanded(prev => !prev);
    };

    const handleRowClick = () => {
        if (onToggleSelection) {
            onToggleSelection(row);
        }
    };

    return (
        <div
            className={`border-b ${isSelected ? "bg-blue-100" : "bg-white"} transition-colors duration-100 ease-in-out`}
        >
            {/* Fila clickeable para selección */}
            <div
                onClick={handleRowClick}
                className="p-3 flex justify-between items-center cursor-pointer"
            >
                <div className="flex-grow min-w-0 mr-2">
                    <div className="text-sm text-gray-700 truncate">
                        <span className="font-semibold">ID:</span> {row.original.numero_identificacion || '-'}
                    </div>
                    <div className="text-sm text-gray-700 truncate">
                        <span className="font-semibold">Nombre:</span> {row.original.nombre || '-'}
                    </div>
                </div>

                <div className="flex-shrink-0 flex items-center gap-2 ml-auto">
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); onEdit(row.original.animal_id); }}
                        className="text-orange-600 hover:text-orange-700 hover:bg-blue-50"
                        aria-label="Editar animal"
                    >
                        <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); onDelete(row.original); }}
                        className="text-red-700 hover:text-red-800 hover:bg-red-50"
                        aria-label="Eliminar animal"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleToggleExpand}
                        aria-label={expanded ? "Colapsar detalles" : "Expandir detalles"}
                        className="text-gray-500 hover:bg-gray-100"
                    >
                        {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </Button>
                </div>
            </div>

            {expanded && (
                <div className="p-3 pt-0 bg-gray-50 border-t border-gray-100">
                    <AnimalDetailContent animal={row.original} columnVisibility={columnVisibility} />
                </div>
            )}
        </div>
    );
}
