// ~/Project/frontend/src/components/cluster/ClusterMultiPopup.jsx
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/shadcn/button';
import { Input } from '@/components/ui/shadcn/input';
import { PawPrint, X } from 'lucide-react';

export default function ClusterMultiPopup({
    features = [],
    onClose = () => { },
    onSelectAnimal = () => { },
}) {
    const [query, setQuery] = useState('');

    const animalList = useMemo(() => {
        return features
            .map(f => f.get('metadata'))
            .filter(Boolean)
            .filter(a => {
                const q = query.toLowerCase();
                return (
                    a.nombre?.toLowerCase().includes(q) ||
                    a.numero_identificacion?.toLowerCase().includes(q) ||
                    a.especie?.toLowerCase().includes(q) ||
                    a.raza?.toLowerCase().includes(q) ||
                    a.estado_reproductivo?.toLowerCase().includes(q)
                );
            });
    }, [features, query]);

    useEffect(() => {
        const keyHandler = (e) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', keyHandler);
        return () => window.removeEventListener('keydown', keyHandler);
    }, [onClose]);

    return (
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-[280px] max-h-[300px] overflow-auto">
            <button
                onClick={onClose}
                className="absolute top-1 right-1 text-gray-500 hover:text-black"
                aria-label="Cerrar"
            >
                <X size={20} />
            </button>
            <div className="flex justify-between items-center mb-2">
                <h2 className="text-sm font-semibold text-gray-700">Animales en esta zona</h2>
            </div>

            <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nombre, ID, especie..."
                className="mb-2 text-sm"
            />

            {animalList.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">Sin resultados</p>
            ) : (
                <ul className="space-y-1">
                    {animalList.map((a) => (
                        <li key={a.animal_id}>
                            <Button
                                variant="ghost"
                                className="w-full justify-start text-xs truncate text-left"
                                onClick={() => {
                                    const selected = features.find(f => f.get('metadata')?.animal_id === a.animal_id);
                                    if (selected) onSelectAnimal(selected);
                                }}
                            >
                                <PawPrint size={16} className={"text-cyan-600"} /> {a.nombre} ({a.numero_identificacion}) - {a.especie}
                            </Button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
