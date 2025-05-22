// context/MapContext.jsx
import { createContext, useRef, useEffect, useState, useCallback } from 'react'
import { createBaseMap } from '../api/services/mapService'

export const MapContext = createContext(null)

export function MapProvider({ children, center = [-35.5075089029126, -60.3545349790534] }) {
    const mapRef = useRef(null);
    const [ready, setReady] = useState(false);

    const initMap = useCallback(() => {
        const container = document.getElementById('map');
        if (!mapRef.current && container) {
            mapRef.current = createBaseMap('map', center);
            setReady(true);
        }
    }, [center]);

    const resetMap = useCallback(() => {
        const container = document.getElementById('map');
        if (container && mapRef.current) {
            mapRef.current.setTarget(null);
            mapRef.current = null;
            container.innerHTML = '';
            setReady(false);
        }
        setTimeout(() => initMap(), 0);
    }, [initMap]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            if (!mapRef.current) initMap();
        }, 3000);
        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        const observer = new ResizeObserver(() => {
            const container = document.getElementById('map');
            if (container?.offsetWidth > 0 && container?.offsetHeight > 0 && !mapRef.current) {
                initMap();
            }
        });
    
        const container = document.getElementById('map');
        if (container) observer.observe(container);
    
        return () => observer.disconnect();
    }, [initMap]);
    
    return (
        <MapContext.Provider value={{ mapRef, ready, resetMap }}>
            <div className="relative w-full h-full flex-grow overflow-hidden">
                <div id="map" className="absolute inset-0 z-0" />
                {ready && children}
            </div>
        </MapContext.Provider>
    );
}
