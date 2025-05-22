// constants/styles.js
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style'

export const PARCELA_STYLES = {
    base: new Style({
        stroke: new Stroke({
            color: '#FFFFFF',
            width: 5
        }),
        fill: new Fill({
            color: 'rgba(255, 255, 255, 0.05)' // leve fondo claro
        })
    }),

    draw: new Style({
        stroke: new Stroke({
            color: '#FF4D00', // violeta
            width: 4,
            lineDash: [0,0,10,10]
        }),
        fill: new Fill({
            color: 'rgba(255, 77, 0, 0.2)' // violeta transparente
        })
    }),

    edit: new Style({
        stroke: new Stroke({
            color: '#00FFFF', // celeste
            width: 4,
            lineDash: [0,0,10,10]
        }),
        fill: new Fill({
            color: 'rgba(0, 255, 255, 0.15)'
        })
    }),
    
    vertexEdit: new Style({
        image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: '#00FFFF' }), // celeste
            stroke: new Stroke({ color: '#FFFFFF', width: 3 })
        })
    }),

    vertexIntermediate: new Style({
        image: new CircleStyle({
            radius: 4.5,
            fill: new Fill({ color: '#777777' }), // gris oscuro
            stroke: new Stroke({ color: '#FFFFFF', width: 2.5 }) // borde blanco
        })
    }),

    vertexDelete: new Style({
        image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: '#860000' }), 
            stroke: new Stroke({ color: '#FF0000', width: 4 }) // rojo oscuro
        })
    }),

    vertexDraw: new Style({
        image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: '#FF4D00' }), // naranja
            stroke: new Stroke({ color: '#FFFFFF', width: 3 }) // blanco
        })
    }),

    previewVertex: new Style({
        image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: '#777777' }), // gris oscuro
            stroke: new Stroke({ color: '#FFFFFF', width: 3 }) // borde blanco
        })
    }),

    previewVertexSnap: new Style({
        image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: '#FFFFFF' }), // blanco
            stroke: new Stroke({ color: '#FF4D00', width: 3 }) // naranja
        })
    }),

    previewLine: new Style({
        stroke: new Stroke({
            color: '#FF8300', // naranja
            width: 4,
            lineDash: [0,0,10,10]
        })
    })
}
