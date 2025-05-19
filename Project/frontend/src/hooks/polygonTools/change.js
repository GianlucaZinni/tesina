import { useRef } from 'react'
import { Feature } from 'ol'
import { Point, Polygon } from 'ol/geom'
import { Vector as VectorLayer } from 'ol/layer'
import { Vector as VectorSource } from 'ol/source'
import { Modify, Select } from 'ol/interaction'
import { click } from 'ol/events/condition'
import { toLonLat } from 'ol/proj'
import Overlay from 'ol/Overlay'
import { getArea as getGeodesicArea } from 'ol/sphere'

import { PARCELA_STYLES } from '../../constants/styles'

export function useChangeTool(mapRef, { setMode }, onUpdate = () => {}) {
    const editableLayer = useRef(null)
    const vertexLayer = useRef(null)
    const vertexFeatures = useRef([])
    const intermediateFeatures = useRef([])
    const isDeleteMode = useRef(false)
    const modifyInteraction = useRef(null)
    const selectInteraction = useRef(null)
    const editableFeatureRef = useRef(null)
    const areaLabelOverlay = useRef(null)

    const activateEditMode = (polygonFeature) => {
        const map = mapRef.current
        if (!map || !polygonFeature) return

        clearEdit()

        const geometry = polygonFeature.getGeometry()
        if (!geometry) return

        setMode('edit')

        let coords
        if (geometry.getType() === 'Polygon') {
            const rings = geometry.getCoordinates()
            coords = Array.isArray(rings[0]) ? rings[0] : []
        } else if (geometry.getType() === 'MultiPolygon') {
            const multi = geometry.getCoordinates()
            coords = Array.isArray(multi[0][0]) ? multi[0][0] : []
        } else {
            console.error('Tipo no soportado:', geometry.getType())
            return
        }
        if (coords.length < 3) return

        const source = new VectorSource()
        const layer = new VectorLayer({ source, style: PARCELA_STYLES.edit })
        editableLayer.current = layer
        map.addLayer(layer)

        const clone = polygonFeature.clone()
        clone.setStyle(PARCELA_STYLES.edit)
        source.addFeature(clone)
        editableFeatureRef.current = clone

        map.getLayers().forEach((l) => {
            const src = l.getSource?.()
            if (src && src.hasFeature?.(polygonFeature)) {
                src.removeFeature(polygonFeature)
            }
        })

        vertexLayer.current = new VectorLayer({
            source: new VectorSource(),
            style: null
        })
        map.addLayer(vertexLayer.current)

        const modify = new Modify({ source })
        modifyInteraction.current = modify

        const handlePointerDown = (evt) => {
            map.forEachFeatureAtPixel(evt.pixel, (feat) => {
                if (feat.get('insertAfter') !== undefined) {
                    vertexLayer.current.getSource().removeFeature(feat)
                    intermediateFeatures.current = intermediateFeatures.current.filter(f => f !== feat)
                }
            })
        }
        map.on('pointerdown', handlePointerDown)
        modifyInteraction.current._pointerDownHandler = handlePointerDown

        map.getOverlays().getArray().forEach((overlay) => {
            const el = overlay.getElement()
            if (el && el.className.includes('area-label')) {
                map.removeOverlay(overlay)
            }
        })

        const updateAreaOverlay = () => {
            const geom = clone.getGeometry()
            if (!geom || geom.getType() !== 'Polygon') return

            const coords = geom.getCoordinates()?.[0]
            if (!coords || coords.length < 3) return

            const polygon = new Polygon([coords])
            const area = getGeodesicArea(polygon, { projection: 'EPSG:3857' })

            const text = `${(area / 10000).toFixed(2)} ha`
            const centroid = polygon.getInteriorPoint().getCoordinates()

            if (!areaLabelOverlay.current) {
                const div = document.createElement('div')
                div.className = 'area-label'
                div.textContent = text

                areaLabelOverlay.current = new Overlay({
                    element: div,
                    positioning: 'center-center',
                    stopEvent: false
                })
                map.addOverlay(areaLabelOverlay.current)
            }

            areaLabelOverlay.current.getElement().textContent = text
            areaLabelOverlay.current.setPosition(centroid)
        }

        modify.on('modifyend', (e) => {
            const updated = e.features.item(0)
            if (!updated) return
            const geom = updated.getGeometry()
            const newCoords = extractPolygonCoordinates(geom)
            drawVertices(newCoords)
            onUpdate(formatCoords(newCoords))
            updateAreaOverlay()
        })

        clone.getGeometry().on('change', () => {
            const geom = clone.getGeometry()
            const newCoords = extractPolygonCoordinates(geom)
            drawVertices(newCoords)
            onUpdate(formatCoords(newCoords))
            updateAreaOverlay()
        })

        map.addInteraction(modify)
        drawVertices(coords)
        onUpdate(formatCoords(coords))
        updateAreaOverlay()
    }

    const drawVertices = (coords) => {
        const map = mapRef.current
        const vSource = vertexLayer.current?.getSource()
        if (!map || !vSource || !Array.isArray(coords) || coords.length < 2) return

        vSource.clear()
        vertexFeatures.current = []
        intermediateFeatures.current = []

        const cleanCoords = coords.slice(0, -1)

        cleanCoords.forEach((coord, index) => {
            const vertex = new Feature(new Point(coord))
            vertex.set('vertexIndex', index)
            vertex.setStyle(PARCELA_STYLES.vertexEdit)
            vSource.addFeature(vertex)
            vertexFeatures.current.push(vertex)
        })

        for (let i = 0; i < cleanCoords.length; i++) {
            const current = cleanCoords[i]
            const next = cleanCoords[(i + 1) % cleanCoords.length]
            const midpoint = [
                (current[0] + next[0]) / 2,
                (current[1] + next[1]) / 2
            ]

            const intermediate = new Feature(new Point(midpoint))
            intermediate.set('insertAfter', i)
            intermediate.setStyle(PARCELA_STYLES.vertexIntermediate)
            vSource.addFeature(intermediate)
            intermediateFeatures.current.push(intermediate)
        }
    }

    const activateDeleteMode = () => {
        const map = mapRef.current
        const source = editableLayer.current?.getSource()
        const polygon = getMainFeature()
        if (!map || !source || !polygon) return

        isDeleteMode.current = true

        const select = new Select({
            condition: click,
            layers: [vertexLayer.current],
            filter: f => f.getGeometry().getType() === 'Point'
        })

        select.on('select', e => {
            const marker = e.selected[0]
            const index = marker?.get('vertexIndex')
            if (index === undefined) return

            const coords = getMainCoords()
            if (coords.length <= 4) return

            coords.splice(index, 1)
            coords[coords.length - 1] = coords[0]

            polygon.getGeometry().setCoordinates([coords])
            drawVertices(coords)
            onUpdate(formatCoords(coords))
        })

        selectInteraction.current = select
        map.addInteraction(select)
    }

    const disableDeleteMode = () => {
        const map = mapRef.current
        if (!map || !selectInteraction.current) return

        map.removeInteraction(selectInteraction.current)
        selectInteraction.current = null
        isDeleteMode.current = false

        const main = getMainFeature()
        if (main) drawVertices(getMainCoords())
    }

    const clearEdit = () => {
        const map = mapRef.current
        if (!map) return

        if (editableLayer.current) {
            map.removeLayer(editableLayer.current)
            editableLayer.current = null
        }

        if (vertexLayer.current) {
            map.removeLayer(vertexLayer.current)
            vertexLayer.current = null
        }

        if (modifyInteraction.current) {
            map.removeInteraction(modifyInteraction.current)
            const h = modifyInteraction.current._pointerDownHandler
            if (h) map.un('pointerdown', h)
            modifyInteraction.current = null
        }

        if (selectInteraction.current) {
            map.removeInteraction(selectInteraction.current)
            selectInteraction.current = null
        }

        if (areaLabelOverlay.current) {
            map.removeOverlay(areaLabelOverlay.current)
            areaLabelOverlay.current = null
        }

        vertexFeatures.current = []
        intermediateFeatures.current = []
        isDeleteMode.current = false
        editableFeatureRef.current = null
        setMode(null)
    }

    const getEditedFeature = () => editableFeatureRef.current || null

    const getMainFeature = () => {
        return editableLayer.current?.getSource()?.getFeatures().find(f => f.getGeometry().getType() === 'Polygon') || null
    }

    const getMainCoords = () => {
        const feature = getMainFeature()
        return extractPolygonCoordinates(feature?.getGeometry())
    }

    const formatCoords = (coords3857) =>
        coords3857.map(coord => {
            const [lon, lat] = toLonLat(coord)
            return { lat, lng: lon }
        })

    const extractPolygonCoordinates = (geometry) => {
        if (!geometry || typeof geometry.getCoordinates !== 'function') return []

        const coords = geometry.getCoordinates()

        if (
            geometry.getType() === 'Polygon' &&
            Array.isArray(coords) &&
            Array.isArray(coords[0])
        ) {
            return coords[0]
        }

        if (
            geometry.getType() === 'MultiPolygon' &&
            Array.isArray(coords) &&
            Array.isArray(coords[0]) &&
            Array.isArray(coords[0][0])
        ) {
            return coords[0][0]
        }

        return []
    }

    return {
        activateEditMode,
        clearEdit,
        getEditedFeature,
        activateDeleteMode,
        disableDeleteMode
    }
}
