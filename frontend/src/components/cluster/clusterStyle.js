// // ~/Project/frontend/src/components/cluster/clusterStyle.js
import { Style, Circle as CircleStyle, Fill, Stroke, Text, Icon } from 'ol/style';

/**
 * Devuelve un estilo personalizado según el tamaño del clúster y los metadatos.
 * @param {Object} settings - Parámetros opcionales.
 * @param {string} settings.baseColor - Color base para puntos individuales.
 * @param {string} settings.iconUrl - Si se provee, se renderiza ícono en lugar de círculo.
 */
export function getClusterStyle(settings = {}) {
    const {
        baseColor = '#f97316', // tailwind orange-500
        iconUrl = null
    } = settings;

    const styleCache = {};

    return (feature) => {
        const features = feature.get('features');

        // Si es clúster
        if (features?.length > 1) {
            const size = features.length;
            if (!styleCache[size]) {
                styleCache[size] = new Style({
                    image: new CircleStyle({
                        radius: 10 + Math.min(size, 30) * 0.4,
                        fill: new Fill({ color: baseColor }),
                        stroke: new Stroke({ color: '#ffffff', width: 2 })
                    }),
                    text: new Text({
                        text: size.toString(),
                        font: 'bold 12px sans-serif',
                        fill: new Fill({ color: '#ffffff' }),
                        stroke: new Stroke({ color: '#000000', width: 2 })
                    })
                });
            }
            return styleCache[size];
        }

        // Si es punto individual
        const metadata = feature.get('metadata') || {};
        const isOutside = metadata.is_outside === true;
        const pointColor = isOutside ? '#e60000' : baseColor;

        // Estilo por ícono si se define
        if (iconUrl) {
            return new Style({
                image: new Icon({
                    src: iconUrl,
                    scale: 0.5,
                    anchor: [0.5, 1]
                })
            });
        }

        // Estilo por círculo de color
        return new Style({
            image: new CircleStyle({
                radius: 6,
                fill: new Fill({ color: pointColor }),
                stroke: new Stroke({ color: '#ffffff', width: 1.5 })
            })
        });
    };
}
