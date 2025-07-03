// ~/Project/frontend/src/components/ui/MapOverlays/PopupResumenParcela.jsx
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function PopupResumenParcela({ resumen, visible, onClose }) {
    if (!resumen) return null;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: '0%' }}
                    exit={{ y: '100%' }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className={`absolute bottom-20 left-20 right-20 md:left-20
                        z-20 flex justify-center px-4 sm:bottom-20`}
                >
                    <div className="relative bg-white w-full max-w-[400px] max-h-[45vh] overflow-y-auto rounded-2xl shadow-xl p-4 border border-gray-300 dark:bg-zinc-900 dark:text-white">
                        <button
                            onClick={onClose}
                            className="absolute top-2 right-2 p-1 rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700"
                            title="Cerrar"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h2 className="text-xl font-bold mb-2 break-words">{resumen.nombre}</h2>

                        <p className="text-sm">Animales: <strong>{resumen.total_animales}</strong></p>
                        <p className="text-sm">Collares: <strong>{resumen.total_collares}</strong></p>

                        {resumen.tipos && (
                            <div className="mt-2 space-y-2">
                                {Object.entries(resumen.tipos).map(([tipo, data]) => (
                                    <div key={tipo} className="break-words">
                                        <h3 className="font-semibold text-sm mt-2">{tipo} ({data.cantidad})</h3>
                                        <p className="text-xs">Razas: {Object.entries(data.por_raza).map(([raza, cant]) => `${raza} (${cant})`).join(', ')}</p>
                                        <p className="text-xs">Sexos: {Object.entries(data.por_sexo).map(([sexo, cant]) => `${sexo} (${cant})`).join(', ')}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}