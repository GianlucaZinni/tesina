import { useState } from 'react'
import { SplinePointer, X, Check, Undo } from 'lucide-react'


export default function DrawToolPanel({ onFinish, onUndo, onCancel, onStart, canFinish, closedBySnap }) {
    const [open, setOpen] = useState(false)

    const handleStart = () => {
        const next = !open
        setOpen(next)
        if (next) {
            if (onStart) onStart()
        } else {
            if (onCancel) onCancel()
        }
    }


    const handleFinish = () => {
        if (onFinish) onFinish()
        setOpen(false)
    }

    const handleCancel = () => {
        if (onCancel) onCancel()
        setOpen(false)
    }

    return (
        <div style={{bottom:"8.5rem"}} className="absolute right-4 z-40 flex flex-row-reverse items-end gap-1">
            {/* Botón principal */}
            <button
                onClick={handleStart}
                className="bg-white p-3 rounded-full shadow-md flex items-center justify-center"
                title="Dibujar polígono"
            >
                {open && closedBySnap ? <X className="w-6 h-6 text-gray-800" /> : <SplinePointer className="w-6 h-6 text-gray-800" />}
            </button>

            {/* Subbotones */}
            {open && (
                <div className="flex flex-row gap-1">
                    <button
                        onClick={handleFinish}
                        className={`p-3 rounded-full shadow-md flex items-center justify-center 
                            ${(canFinish || closedBySnap) ? 'bg-white' : 'bg-gray-700 text-white'}`}
                        title="Finalizar dibujo"
                    >
                        <Check className="w-6 h-6" />
                    </button>

                    {!closedBySnap && (
                        <>
                            <button
                                onClick={onUndo}
                                className="bg-gray-700 text-white p-3 rounded-full shadow-md flex items-center justify-center"
                            >
                                <Undo className="w-6 h-6" />
                            </button>
                            <button
                                onClick={handleCancel}
                                className="bg-gray-700 text-white p-3 rounded-full shadow-md flex items-center justify-center"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </>
                    )}
                </div>
            )}

        </div>
    )
}
