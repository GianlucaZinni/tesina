// ~/Project/frontend/src/utils/mapIcon.js
import { Feature } from 'ol'
import Point from 'ol/geom/Point'
import Style from 'ol/style/Style'
import Icon from 'ol/style/Icon'
import VectorSource from 'ol/source/Vector'
import VectorLayer from 'ol/layer/Vector'

export function createMapMarker(coord3857) {
    const marker = new Feature({
        geometry: new Point(coord3857)
    })

    marker.setStyle(
        new Style({
            image: new Icon({
                src: '/dist/map_pin.svg',
                anchor: [0.5, 1],
                scale: 1,
            })
        })
    )

    const source = new VectorSource({
        features: [marker]
    })

    const layer = new VectorLayer({
        source: source,
        zIndex: 1000
    })

    return { feature: marker, layer }
}
