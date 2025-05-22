// hooks/useMarkerGps.js
import { toLonLat, fromLonLat } from 'ol/proj';
import { useRef } from 'react';

import { createMapMarker } from '../utils/mapIcon';
import { crearRipple } from '../effects/ripple';


export function useMarkerGps(mapRef) {
    const markerLayerRef = useRef(null)

    const colocarMarcadorGps = (e, setFormData) => {
        if (!mapRef.current || !e?.coordinate) return
        crearRipple(e.originalEvent)

        const coord = e.coordinate
        const [lon, lat] = toLonLat(coord)
        setFormData(prev => ({ ...prev, lat, lon }))

        if (markerLayerRef.current) {
            mapRef.current.removeLayer(markerLayerRef.current)
        }

        const { layer } = createMapMarker(coord)
        markerLayerRef.current = layer
        mapRef.current.addLayer(layer)
    }

    const moverMarcadorGps = (lon, lat) => {
        if (!mapRef.current) return

        const newCoord = fromLonLat([lon, lat])
        const currentFeature = markerLayerRef.current?.getSource()?.getFeatures()?.[0]
        const currentCoord = currentFeature?.getGeometry()?.getCoordinates()

        const isSame = currentCoord &&
            Math.abs(currentCoord[0] - newCoord[0]) < 0.001 &&
            Math.abs(currentCoord[1] - newCoord[1]) < 0.001

        if (isSame) return

        if (markerLayerRef.current) {
            mapRef.current.removeLayer(markerLayerRef.current)
        }

        const { layer } = createMapMarker(newCoord)
        markerLayerRef.current = layer
        mapRef.current.addLayer(layer)
    }

    const limpiarMarcadorGps = () => {
        if (markerLayerRef.current && mapRef.current) {
            mapRef.current.removeLayer(markerLayerRef.current);
            markerLayerRef.current = null;
        }
    };

    return { colocarMarcadorGps, moverMarcadorGps, limpiarMarcadorGps, markerLayerRef };

}
