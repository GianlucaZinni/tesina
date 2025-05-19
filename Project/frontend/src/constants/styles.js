import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style'

export const PARCELA_STYLES = {
    base: new Style({
        stroke: new Stroke({
            color: '#FFFFFF',
            width: 5
        }),
        fill: new Fill({
            color: 'rgba(0,0,0,0)' // Sin relleno
        })
    }),

    draw: new Style({
        stroke: new Stroke({
            color: '#FF9B00',
            width: 5
        }),
        fill: new Fill({
            color: 'rgba(255, 155, 0, 0.2)'
        })
    }),

    edit: new Style({
        stroke: new Stroke({
            color: '#e92694',
            width: 5,
        }),
        fill: new Fill({
            color: 'rgba(233, 38, 148, 0.2)'
        })
    }),

    created: new Style({
        stroke: new Stroke({
            color: '#2cf5dc',
            width: 5
        }),
        fill: new Fill({
            color: 'rgba(121, 242, 227, 0.2)'
        })
    }),

    vertex: new Style({
        image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: '#3b82f6' }),
            stroke: new Stroke({ color: '#8E1358', width: 1 })
        })
    }),

    vertexEdit: new Style({
        image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: '#C60AB2' }), // magenta fuerte
            stroke: new Stroke({ color: '#8E1358', width: 1 })
        })
    }),
    
    vertexIntermediate: new Style({
        image: new CircleStyle({
            radius: 4,
            fill: new Fill({ color: '#D0D0D0' }), // gris claro
            stroke: new Stroke({ color: '#888888', width: 1 })
        })
    }),
    
    vertexDelete: new Style({
        image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: '#f87171' }), // rojo claro
            stroke: new Stroke({ color: '#dc2626', width: 1.5 })
        })
    }),

    vertexDraw: new Style({
        image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: '#714808' }),
            stroke: new Stroke({ color: '#A0660C', width: 1 })
        })
    }),

    previewVertex: new Style({
        image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: '#ccc' }),
            stroke: new Stroke({ color: '#666', width: 1 })
        })
    }),

    previewVertexSnap: new Style({
        image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: 'lime' }),
            stroke: new Stroke({ color: 'green', width: 1 })
        })
    }),

    previewLine: new Style({
        stroke: new Stroke({
            color: '#FF5722',
            width: 4,
            lineDash: [6, 6]
        })
    }),
}
