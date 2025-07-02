// ~/Project/frontend/src/components/ui/MapControls/FloatingButtons.jsx
import { CircleX, X, Save } from 'lucide-react';


export default function FloatingButtons({
    mode = 'edit',
    isDeleteMode = false,
    onToggleDeleteMode = () => { },
    onCancel = () => { },
    onSave = () => { },
    showDelete = true,
    showCancel = true,
    showSave = true
}) {
    if (!['edit', 'draw-edit'].includes(mode)) return null;

    return (
        <>
            {showDelete && (
                <button
                    onClick={onToggleDeleteMode}
                    className={`p-3 rounded-full shadow-md flex items-center justify-center ${isDeleteMode ? 'bg-red-600' : 'bg-white'}`}
                    title="Eliminar vértices"
                >
                    <CircleX className="w-6 h-6" />
                </button>
            )}
            {showCancel && (
                <button
                    onClick={onCancel}
                    className="bg-white p-3 rounded-full shadow-md flex items-center justify-center"
                    title="Cancelar edición"
                >
                    <X className="w-6 h-6" />
                </button>
            )}
            {showSave && (
                <button
                    onClick={onSave}
                    className="bg-white p-3 rounded-full shadow-md flex items-center justify-center"
                    title="Guardar cambios"
                >
                    <Save className="w-6 h-6" />
                </button>
            )}
        </>
    )
}