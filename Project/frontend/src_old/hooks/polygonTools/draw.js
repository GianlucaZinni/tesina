import { useState, useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet-geometryutil'
import { PARCELA_STYLES } from '../../services/parcelaService'
import geodesicArea from '../../utils/math'

export function useDrawTool(mapRef, { mode, setMode, setArea, setTooltipText }) {
    const drawingPoints = useRef([])
    const currentPolygon = useRef(null)
    const previewMarker = useRef(null)
    const previewLine = useRef(null)
    const areaLabel = useRef(null)
    const vertexMarkers = useRef([])
    const finalPolygon = useRef(null)
    const [canFinish, setCanFinish] = useState(false)
    const [closedBySnap, setClosedBySnap] = useState(false)

    const endPolygon = () => {
        const map = mapRef.current

        if (drawingPoints.current.length >= 3) {
            finalPolygon.current = L.polygon(drawingPoints.current, PARCELA_STYLES.created).addTo(map)
        }
        disableDraw()
    }

    const enableDraw = () => {
        disableDraw()
        setClosedBySnap(false)
        setMode('draw')
        setTooltipText('Click para colocar el primer vértice')
    }

    const updateCanFinish = () => {
        setCanFinish(drawingPoints.current.length >= 3)
    }

    const cancelDraw = () => {
        const map = mapRef.current
        if (finalPolygon.current) {
            map.removeLayer(finalPolygon.current)
            finalPolygon.current = null
        }
        disableDraw()
    }    

    const disableDraw = () => {
        const map = mapRef.current
        setMode(null)
        drawingPoints.current = []
        setCanFinish(false)
        if (!map) return

        if (currentPolygon.current) {
            map.removeLayer(currentPolygon.current)
            currentPolygon.current = null
        }

        previewMarker.current && map.removeLayer(previewMarker.current)
        previewLine.current && map.removeLayer(previewLine.current)
        areaLabel.current && map.removeLayer(areaLabel.current)
        vertexMarkers.current.forEach(m => map.removeLayer(m))

        previewMarker.current = null
        previewLine.current = null
        areaLabel.current = null
        vertexMarkers.current = []
        setArea(0)
    }

    const clearDraw = () => {
        const map = mapRef.current
        if (!map) return
    
        if (finalPolygon.current) {
            map.removeLayer(finalPolygon.current)
            finalPolygon.current = null
        }
    }
    

    const handleClick = (e) => {
        if (mode !== 'draw') return

        const map = mapRef.current
        const latlng = e.latlng

        const first = drawingPoints.current[0]
        const isClosing =
            first &&
            map.latLngToLayerPoint(latlng).distanceTo(map.latLngToLayerPoint(first)) < 15 &&
            drawingPoints.current.length >= 3

        if (isClosing) {
            setClosedBySnap(true)
            endPolygon()
            return
        }

        drawingPoints.current.push([latlng.lat, latlng.lng])
        setTooltipText('Click para continuar dibujando')

        const marker = L.circleMarker(latlng, PARCELA_STYLES.draw.vertex).addTo(map)
        vertexMarkers.current.push(marker)

        if (drawingPoints.current.length > 1) {
            if (currentPolygon.current) map.removeLayer(currentPolygon.current)
                currentPolygon.current = L.polygon(drawingPoints.current, PARCELA_STYLES.draw.polygon).addTo(map)
        }

        updateCanFinish()
        updateAreaLabel()
    }

    const handleMouseMove = (e) => {
        if (mode !== 'draw') return
        const map = mapRef.current
        const latlng = e.latlng
        const first = drawingPoints.current[0]
        const last = drawingPoints.current[drawingPoints.current.length - 1]

        if (!previewMarker.current) {
            previewMarker.current = L.circleMarker(latlng, {
                radius: 6,
                color: '#666',
                fillColor: '#ccc',
                fillOpacity: 1,
                weight: 1
            }).addTo(map)
        } else {
            previewMarker.current.setLatLng(latlng)
        }

        if (first && map.latLngToLayerPoint(latlng).distanceTo(map.latLngToLayerPoint(first)) < 15) {
            previewMarker.current.setStyle({ color: 'green', fillColor: 'lime' })
            setTooltipText('Click sobre el primer punto para cerrar')
        } else {
            previewMarker.current.setStyle({ color: '#666', fillColor: '#ccc' })
            setTooltipText(
                drawingPoints.current.length === 0
                    ? 'Click para colocar el primer vértice'
                    : 'Click para continuar dibujando'
            )
        }

        if (drawingPoints.current.length > 0) {
            if (!previewLine.current) {
                previewLine.current = L.polyline([last, latlng], {
                    color: '#ef4444',
                    dashArray: '5, 5',
                    weight: 3
                }).addTo(map)
            } else {
                previewLine.current.setLatLngs([last, latlng])
            }
        }
    }

    const updateAreaLabel = () => {
        const map = mapRef.current
        if (drawingPoints.current.length < 3) {
            areaLabel.current && map.removeLayer(areaLabel.current)
            areaLabel.current = null
            return
        }

        const polygon = L.polygon(drawingPoints.current)
        const centroid = polygon.getBounds().getCenter()
        const area = geodesicArea(drawingPoints.current)

        setArea(area)

        const text = `${(area / 10000).toFixed(2)} ha`

        if (!areaLabel.current) {
            areaLabel.current = L.tooltip({
                permanent: true,
                direction: 'center',
                className: 'area-label'
            })
                .setLatLng(centroid)
                .setContent(text)
                .addTo(map)
        } else {
            areaLabel.current.setLatLng(centroid).setContent(text)
        }
    }

    const removeLastPoint = () => {
        const map = mapRef.current
        drawingPoints.current.pop()

        if (currentPolygon.current) {
            map.removeLayer(currentPolygon.current)
            currentPolygon.current = null
        }

        const last = vertexMarkers.current.pop()
        if (last) map.removeLayer(last)

        if (drawingPoints.current.length >= 2) {
            currentPolygon.current = L.polygon(drawingPoints.current, PARCELA_STYLES.draw.polygon).addTo(map)
        }

        updateCanFinish()
        updateAreaLabel()
    }

    const getCreatedLayer = () => {
        return finalPolygon.current || null
    }

    useEffect(() => {
        const map = mapRef.current
        if (!map) return
    
        if (mode === 'draw') {
            map.on('click', handleClick)
            map.on('mousemove', handleMouseMove)
        }
    
        return () => {
            map.off('click', handleClick)
            map.off('mousemove', handleMouseMove)
        }
    }, [mode])
    

    return {
        enableDraw,
        disableDraw,
        cancelDraw,
        endPolygon,
        clearDraw,
        removeLastPoint,
        canFinish,
        closedBySnap,
        getCreatedLayer
    }
}
