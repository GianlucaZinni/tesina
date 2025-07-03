// ~/Project/frontend/src/utils/geometry.js
import { getArea as getGeodesicArea } from 'ol/sphere'

export function calculatePolygonAreaFromGeometry(geometry) {
    if (!geometry) return 0
    try {
        return getGeodesicArea(geometry, { projection: 'EPSG:3857' }) // ya está en la proyección correcta
    } catch {
        return 0
    }
}
