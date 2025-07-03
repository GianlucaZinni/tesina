// ~/Project/frontend/src/components/cluster/ExplodedClusterLayer.jsx
import { useEffect, useRef } from 'react';
import { Vector as VectorLayer } from 'ol/layer';
import { Vector as VectorSource } from 'ol/source';
import { Style, Circle as CircleStyle, Fill, Stroke } from 'ol/style';
import Feature from 'ol/Feature';
import { Point } from 'ol/geom';

export function ExplodedClusterLayer({ map, features = [], onClose }) {
    const layerRef = useRef();

    useEffect(() => {
        if (!map || features.length === 0) return;

        const source = new VectorSource();
        const jitter = 15; // pixeles

        // Obtener centro promedio
        const coords = features.map(f => f.getGeometry().getCoordinates());
        const centerX = coords.reduce((acc, c) => acc + c[0], 0) / coords.length;
        const centerY = coords.reduce((acc, c) => acc + c[1], 0) / coords.length;

        features.forEach((f, i) => {
            const angle = (2 * Math.PI * i) / features.length;
            const dx = Math.cos(angle) * jitter;
            const dy = Math.sin(angle) * jitter;

            const newFeature = new Feature({
                geometry: new Point([centerX + dx, centerY + dy]),
                metadata: f.get('metadata')
            });

            newFeature.setStyle(
                new Style({
                    image: new CircleStyle({
                        radius: 6,
                        fill: new Fill({ color: '#0099ff' }),
                        stroke: new Stroke({ color: '#fff', width: 1.5 })
                    })
                })
            );

            source.addFeature(newFeature);
        });

        const layer = new VectorLayer({ source });
        map.addLayer(layer);
        layerRef.current = layer;

        return () => {
            if (map && layerRef.current) {
                map.removeLayer(layerRef.current);
            }
        };
    }, [map, features]);

    return (
        <div className="absolute top-4 right-4 z-50">
            <button
                onClick={onClose}
                className="bg-red-600 text-white px-4 py-1 rounded shadow hover:bg-red-700 text-sm"
                aria-label="Reagrupar clúster"
            >
                Reagrupar
            </button>
        </div>
    );
}
