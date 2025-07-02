// ~/Project/frontend/src/components/ui/MapOverlays/SearchAnimal.jsx
import { useEffect, useMemo, useState } from 'react';
import { PawPrint, X } from 'lucide-react';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';

export default function SearchAnimal({ inside = [], outside = [], featuresMapRef }) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');

    const allAnimals = useMemo(() => {
        return [...inside, ...outside]
            .filter(Boolean)
            .map(a => ({
                label: `${a.nombre || 'Animal'} (${a.numero_identificacion || 'sin ID'})`,
                value: String(a.animal_id),
                full: a
            }))
            .filter(a => {
                const q = query.toLowerCase();
                const m = a.full;
                return (
                    m.nombre?.toLowerCase().includes(q) ||
                    m.numero_identificacion?.toLowerCase().includes(q) ||
                    m.especie?.toLowerCase().includes(q) ||
                    m.raza?.toLowerCase().includes(q) ||
                    m.estado_reproductivo?.toLowerCase().includes(q)
                );
            });
    }, [inside, outside, query]);

    const handleSelect = (animalId) => {
        const feature = featuresMapRef?.current?.get?.(Number(animalId));
        if (feature && window.ClusterPopup?.open) {
            window.ClusterPopup.open(feature);
        } else {
            console.warn("No se encontró el animal en featuresMapRef o no está definido ClusterPopup.");
        }
        setIsOpen(false);
    };

    useEffect(() => {
        const escListener = (e) => {
            if (e.key === 'Escape') setIsOpen(false);
        };
        window.addEventListener('keydown', escListener);
        return () => window.removeEventListener('keydown', escListener);
    }, []);

    return (
        <div className="absolute top-16 mt-2 right-4 z-40 flex items-center gap-2">
            <button 
                onClick={() => {
                    setIsOpen(!isOpen);
                    if (window.ClusterPopup?.close) {
                        window.ClusterPopup.close();
                    }
                }}
                className="bg-white rounded-full p-3 shadow-md"
            >
                <PawPrint className="h-6 w-6 text-gray-800" />
            </button>

            {isOpen && (
                <div className="absolute right-16 top-0 bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-[280px] max-h-[360px] overflow-auto z-50">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="absolute top-2 right-2 text-gray-500 hover:text-black"
                        aria-label="Cerrar"
                    >
                        <X size={18} />
                    </button>

                    <h2 className="text-sm font-semibold text-gray-700 mb-2">Buscar animal</h2>

                    <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Nombre, ID, especie..."
                        className="mb-3 text-sm"
                    />

                    {allAnimals.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-2">Sin resultados</p>
                    ) : (
                        <ul className="space-y-1 pr-1">
                            {allAnimals.map((a) => (
                                <li key={a.value}>
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start text-xs truncate text-left"
                                        onClick={() => handleSelect(a.value)}
                                    >
                                        <PawPrint size={16} className="text-cyan-600 mr-2" />
                                        {a.label} - {a.full.especie}
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
}
