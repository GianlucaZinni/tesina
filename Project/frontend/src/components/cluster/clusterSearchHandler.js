// ~/Project/frontend/src/components/cluster/ClusterSearchHandler.js
import { fromLonLat } from 'ol/proj';

/**
 * Busca un animal por ID y centra el mapa en su ubicación.
 * Si está agrupado, se puede forzar desagrupación programática.
 * 
 * @param {Object} params
 * @param {string|number} params.animalId - ID del animal a buscar
 * @param {Map} params.featuresMap - Mapa de ID -> Feature
 * @param {import('ol/Map').default} params.map - Referencia al mapa
 * @param {Function} params.setExplodedFeatures - Setter para desagrupar features en ese punto
 * @param {number} [params.zoomTarget=18] - Nivel de zoom deseado
 * @returns {boolean} true si lo encontró, false si no
 */
export function locateAndZoomToAnimal({ animalId, featuresMap, map, setExplodedFeatures, zoomTarget = 18 }) {
    if (!featuresMap || !map || !animalId) return false;

    const feature = featuresMap.get(animalId);
    if (!feature) return false;

    const geometry = feature.getGeometry();
    const coords = geometry.getCoordinates();

    // Aplicar animación de zoom y foco
    map.getView().animate({
        center: coords,
        zoom: zoomTarget,
        duration: 600
    });

    // Desagrupar si el animal está dentro de un clúster
    const nearbyFeatures = [];
    map.forEachFeatureAtPixel(
        map.getPixelFromCoordinate(coords),
        f => {
            const metas = f.get('features') || [];
            if (metas.length > 1 && metas.find(subf => subf.getId() === animalId)) {
                nearbyFeatures.push(...metas);
            }
        }
    );

    if (nearbyFeatures.length > 1) {
        setExplodedFeatures(nearbyFeatures);
    }

    return true;
}
