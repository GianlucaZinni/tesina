export default function geodesicArea(latlngs) {
    const radius = 6378137 // Radio de la Tierra en metros (WGS84)
    const d2r = Math.PI / 180
    let area = 0.0

    const points = latlngs.map(p => ({ lat: p[0], lng: p[1] }))
    const len = points.length

    for (let i = 0; i < len; i++) {
        const p1 = points[i]
        const p2 = points[(i + 1) % len]
        area += ((p2.lng - p1.lng) * d2r) *
                (2 + Math.sin(p1.lat * d2r) + Math.sin(p2.lat * d2r))
    }

    area = area * radius * radius / 2.0
    return Math.abs(area)
}