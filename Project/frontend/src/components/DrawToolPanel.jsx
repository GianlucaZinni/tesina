import { SplinePointer, Check, Undo, X } from 'lucide-react'

export default function DrawToolPanel({
    onFinish,
    onUndo,
    onStart,
    onCancel,
    canFinish,
    closedBySnap,
    firstVertexDraw,
    open,
    setOpen,
    finished
}) {
    const handleStartToggle = () => {
        const nextOpen = !open
        setOpen(nextOpen)
        if (nextOpen) {
            onStart?.()
        }
    }

    return (
        <>
            {/* SplinePointer: solo visible cuando está cerrado */}
            {!open && (
                <button
                    onClick={handleStartToggle}
                    className="bg-white p-3 rounded-full shadow-md flex items-center justify-center"
                    title="Dibujar polígono"
                >
                    <SplinePointer className="w-6 h-6 text-gray-800" />
                </button>
            )}

            {/* Botonera activa */}
            {open && (
                <div className="flex flex-row-reverse gap-1 items-center">
                    {/* Botón Cancel (X) */}
                    <button
                        onClick={onCancel}
                        className="bg-white p-3 rounded-full shadow-md flex items-center justify-center"
                        title="Cancelar"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Check y Undo solo si no está finalizado */}
                    {!finished && (
                        <>
                            <button
                                onClick={onUndo}
                                disabled={!firstVertexDraw}
                                className={`p-3 rounded-full shadow-md flex items-center justify-center 
                                    ${firstVertexDraw
                                        ? 'bg-white text-black'
                                        : 'bg-gray-300 text-gray-400 cursor-not-allowed'
                                    }`}
                                title="Deshacer último punto"
                            >
                                <Undo className="w-6 h-6" />
                            </button>

                            <button
                                onClick={onFinish}
                                disabled={!(canFinish || closedBySnap)}
                                className={`p-3 rounded-full shadow-md flex items-center justify-center 
                                    ${canFinish || closedBySnap
                                        ? 'bg-white text-black'
                                        : 'bg-gray-300 text-gray-400 cursor-not-allowed'
                                    }`}
                                title="Finalizar dibujo"
                            >
                                <Check className="w-6 h-6" />
                            </button>
                        </>
                    )}
                </div>
            )}
        </>
    )
}
