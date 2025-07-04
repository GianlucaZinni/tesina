// ~/Project/frontend/src/api/services/mapService.js
import 'ol/ol.css';
import { Feature } from 'ol';
import { mouseOnly } from 'ol/events/condition';
import { Polygon } from 'ol/geom';
import { defaults as defaultInteractions } from 'ol/interaction';
import DragRotate from 'ol/interaction/DragRotate';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import Map from 'ol/Map';
import { fromLonLat as olFromLonLat, toLonLat as olToLonLat,  get as getProjection } from 'ol/proj';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import { Fill, Stroke, Style } from 'ol/style';
import View from 'ol/View';
import { createXYZ } from 'ol/tilegrid';


import { apiFetch } from '../apiClient';

export async function fetchMapFeatures() {
    const res = await apiFetch('/api/map/')
    if (!res.ok) throw new Error('Error al cargar datos')
    return await res.json()
}

// VectorLayers dinámicos usados para limpiar el mapa
const vectorLayers = []

// Referencias globales para alternar capas base
let osmLayer = null
let esriSatLayer = null

/**
 * Borra una capa vectorial específica
 */
export function clearDrawnLayer(layerRef) {
    if (layerRef?.value && layerRef.map) {
        layerRef.map.removeLayer(layerRef.value)
        layerRef.value = null
    }
}

/**
 * Crea el mapa base con capas OSM y Satélite (ESRI).
 * @param {string} containerId - ID del contenedor del mapa
 * @param {[number, number]} centerCoords - Coordenadas [lat, lon]
 * @returns {ol/Map}
 */
export function createBaseMap(containerId, [lat, lon]) {
    osmLayer = new TileLayer({
        source: new OSM(),
        visible: false,
        title: 'OSM Base',
        preload: Infinity
    })

    esriSatLayer = new TileLayer({
        source: new XYZ({
            url: 'http://www.google.cn/maps/vt?lyrs=s@189&gl=cn&x={x}&y={y}&z={z}',
            attributions: 'UB © Satélite',
            tileGrid: createXYZ({
                extent: getProjection('EPSG:3857').getExtent(),
                tileSize: 256
            }),
            maxZoom: 21
        }),
        visible: true,
        title: 'MapTiler Satellite',
        preload: Infinity
    });

    const map = new Map({
        target: containerId,
        layers: [esriSatLayer, osmLayer],
        view: new View({
            center: olFromLonLat([lon, lat]),
            zoom: 14,
            maxZoom: 21,
            minZoom: 4,
            rotation: 0,
            constrainRotation: false,
        }),
        controls: [],
        interactions: defaultInteractions().extend([
            new DragRotate({
                condition: (event) => {
                    return mouseOnly(event) && event.originalEvent.button === 1
                }
            })
        ])
    })

    window._ol_map_instance = map
    window.osm = osmLayer
    window.esriSat = esriSatLayer

    return map
}

/**
 * Transforma coordenadas de [lon, lat] a proyección del mapa
 */
export function fromLonLat([lon, lat]) {
    return olFromLonLat([lon, lat])
}

/**
 * Transforma coordenadas desde la proyección del mapa a [lon, lat]
 */
export function toLonLat([x, y]) {
    return olToLonLat([x, y])
}

/**
 * Crea un Feature tipo Polygon desde coordenadas lon/lat.
 */
export function createPolygonFromCoords(coords) {
    const transformed = coords.map(([lon, lat]) => olFromLonLat([lon, lat]))
    const closed = [...transformed, transformed[0]] // Aseguramos cierre
    const polygon = new Polygon([closed])
    return new Feature({ geometry: polygon })
}

/**
 * Agrega una Feature (ej. parcela) al mapa como capa vectorial
 */
export function addParcelaToMap(map, feature, style = null) {
    const vectorSource = new VectorSource({ features: [feature] })
    const vectorLayer = new VectorLayer({
        source: vectorSource,
        style: style || new Style({
            stroke: new Stroke({ color: '#3388ff', width: 5 }),
            fill: new Fill({ color: 'rgba(0,0,0,0)' })
        })
    })
    map.addLayer(vectorLayer)
    vectorLayers.push(vectorLayer)
    return vectorLayer
}

/**
 * Limpia todas las capas vectoriales dinámicas (parcelas, áreas, etc.)
 */
export function clearVectorLayers(map) {
    vectorLayers.forEach(layer => map.removeLayer(layer))
    vectorLayers.length = 0
}

/**
 * Centra el mapa en una feature (por ejemplo, una parcela)
 */
export function fitMapToFeature(map, feature) {
    const geometry = feature.getGeometry()
    const size = map.getSize()
    if (geometry && size) {
        map.getView().fit(geometry, {
            size,
            padding: [40, 40, 40, 40],
            maxZoom: 18
        })
    }
}

/**
 * Cambia entre capa base satélite y OSM
 */
export function toggleBaseLayer(map) {
    if (!osmLayer || !esriSatLayer) return

    const osmVisible = osmLayer.getVisible()
    osmLayer.setVisible(!osmVisible)
    esriSatLayer.setVisible(osmVisible)
}
