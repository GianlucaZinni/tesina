// ~/Project/frontend/src/context/MapContext.jsx
import { createContext, useRef, useEffect, useState, useCallback } from 'react';

export const MapContext = createContext(null);

export function MapProvider({ children }) {
    const mapRef = useRef(null);
    const [ready, setReady] = useState(false);

    const resetMap = useCallback(() => {
        const container = document.getElementById('map');
        if (container && mapRef.current) {
            mapRef.current.setTarget(null);
            mapRef.current = null;
            container.innerHTML = '';
            setReady(false);
        }
    }, []);

    useEffect(() => {
        const observer = new ResizeObserver(() => {
            const container = document.getElementById('map');
            if (container?.offsetWidth > 0 && container?.offsetHeight > 0 && !mapRef.current) {
                setReady(true); // listo para inicializar desde MapLayout
            }
        });

        const container = document.getElementById('map');
        if (container) observer.observe(container);

        return () => observer.disconnect();
    }, []);

    return (
        <MapContext.Provider value={{ mapRef, ready, resetMap }}>
            <div className="relative w-full h-full flex-grow overflow-hidden">
                <div id="map" className="absolute inset-0 z-0">
                    <div id="popup-cluster-container" className="min-w-[250px]" />
                </div>
                {ready && children}
            </div>
        </MapContext.Provider>
    );
}
