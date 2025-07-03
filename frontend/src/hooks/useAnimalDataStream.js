// ~/Project/frontend/src/hooks/useAnimalDataStream.js
import { useEffect, useState } from 'react';
import { fetchAnimalsEntities } from '@/api/services/animalService';

export function useAnimalDataStream(interval = 10000, campo_id) {
    const [inside, setInside] = useState([]);
    const [outside, setOutside] = useState([]);

    useEffect(() => {
        if (!campo_id) return;

        const fetchData = async () => {
            try {
                const data = await fetchAnimalsEntities(campo_id);
                setInside(data.inside || []);
                setOutside(data.outside || []);
            } catch (err) {
                console.error('Error al obtener animales:', err);
            }
        };

        fetchData();
        const timer = setInterval(fetchData, interval);
        return () => clearInterval(timer);
    }, [campo_id, interval]);

    return { inside, outside };
}
