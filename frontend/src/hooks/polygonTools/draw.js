// ~/Project/frontend/src/hooks/polygonTools/draw.js
import { useEffect, useRef, useState } from 'react'
import { Feature } from 'ol'
import { Polygon, Point, LineString } from 'ol/geom'
import { Vector as VectorLayer } from 'ol/layer'
import { Vector as VectorSource } from 'ol/source'
import { getArea as getGeodesicArea } from 'ol/sphere'
import Overlay from 'ol/Overlay'

import { polygonGlobals } from './general'
import { PARCELA_STYLES } from '../../constants/styles'

export function useDrawTool(mapRef, { setMode, setArea, setTooltipText }) {
    const drawingPoints = useRef([])
    const vertexFeatures = useRef([])
    const previewLine = useRef(null)
    const previewVertex = useRef(null)
    const areaLabelOverlay = useRef(null)
    const tooltipOverlay = useRef(null)
    const vectorSource = useRef(null)
    const vectorLayer = useRef(null)
    const finalFeature = useRef(null)
    const isDrawingActive = useRef(false);

    const [canFinish, setCanFinish] = useState(false)
    const [closedBySnap, setClosedBySnap] = useState(false)
    const [firstVertexDraw, setFirstVertexDraw] = useState(false)

    const pixelSnapThreshold = 15

    const resetAllState = () => {
        drawingPoints.current = []
        vertexFeatures.current = []
        previewLine.current = null
        previewVertex.current = null
        finalFeature.current = null
        setCanFinish(false)
        setArea(0)
        setClosedBySnap(false)
        setFirstVertexDraw(false)
        setTooltipText('')
    }

    const handleMapDoubleClick = useRef((evt) => {
        if (!isDrawingActive.current) return;
        if (polygonGlobals.modeRef.current !== 'draw') return
    
        if (drawingPoints.current.length >= 3) {
            setClosedBySnap(true)
            endPolygon()
            evt.preventDefault() // Previene el zoom de doble click por defecto
        }
    }).current    

    const renderPreviewLine = (cursorCoord) => {
        if (!vectorSource.current || drawingPoints.current.length === 0) return

        if (previewLine.current) {
            vectorSource.current.removeFeature(previewLine.current)
        }

        const last = drawingPoints.current[drawingPoints.current.length - 1]
        const line = new LineString([last, cursorCoord])
        previewLine.current = new Feature(line)
        previewLine.current.setStyle(PARCELA_STYLES.previewLine)
        vectorSource.current.addFeature(previewLine.current)
    }

    const renderPreviewVertex = (coord, isSnapping) => {
        if (!vectorSource.current) return

        if (!previewVertex.current) {
            previewVertex.current = new Feature(new Point(coord))
            vectorSource.current.addFeature(previewVertex.current)
        } else {
            previewVertex.current.getGeometry().setCoordinates(coord)
        }

        previewVertex.current.setStyle(isSnapping ? PARCELA_STYLES.previewVertexSnap : PARCELA_STYLES.previewVertex)
    }

    const renderVertex = (coord) => {
        const vertex = new Feature(new Point(coord))
        vertex.setStyle(PARCELA_STYLES.vertexDraw)
        vertexFeatures.current.push(vertex)
        vectorSource.current.addFeature(vertex)
    }

    const updatePolygonPreview = () => {
        if (!vectorSource.current || drawingPoints.current.length < 2) return

        vectorSource.current.getFeatures().forEach(f => {
            if (f.getGeometry() instanceof Polygon) vectorSource.current.removeFeature(f)
        })

        const polygonFeature = new Feature(new Polygon([drawingPoints.current]))
        polygonFeature.setStyle(PARCELA_STYLES.draw)
        vectorSource.current.addFeature(polygonFeature)
    }

    const updateAreaOverlay = () => {
        const map = mapRef.current
        if (!map || drawingPoints.current.length < 3) {
            if (areaLabelOverlay.current) {
                map.removeOverlay(areaLabelOverlay.current)
                areaLabelOverlay.current = null
            }
            setArea(0)
            return
        }

        const polygon = new Polygon([drawingPoints.current])
        const area = getGeodesicArea(polygon, { projection: 'EPSG:3857' })
        setArea(area)

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

    const updateTooltipOverlay = (text, coord) => {
        const map = mapRef.current
        if (!map) return

        if (!tooltipOverlay.current) {
            const div = document.createElement('div')
            div.className = 'map-tooltip'
            tooltipOverlay.current = new Overlay({ element: div, offset: [0, -15], positioning: 'bottom-center', className: 'ol-tooltip-text' })
            map.addOverlay(tooltipOverlay.current)
        }

        tooltipOverlay.current.getElement().textContent = text
        tooltipOverlay.current.setPosition(coord)
    }

    const handleMapClick = useRef((evt) => {
        if (!isDrawingActive.current) return;
        if (polygonGlobals.modeRef.current !== 'draw') return
        const map = mapRef.current
        const coord = evt.coordinate

        const first = drawingPoints.current[0]
        const isClosing = (
            first &&
            map.getPixelFromCoordinate(coord) &&
            map.getPixelFromCoordinate(first) &&
            distance(map.getPixelFromCoordinate(coord), map.getPixelFromCoordinate(first)) < pixelSnapThreshold &&
            drawingPoints.current.length >= 3
        )

        if (isClosing) {
            drawingPoints.current.push(first)
            setClosedBySnap(true)
            endPolygon()
            return
        }

        drawingPoints.current.push(coord)
        renderVertex(coord)
        updatePolygonPreview()
        updateAreaOverlay()

        if (drawingPoints.current.length > 0) {setFirstVertexDraw(true)} else {setFirstVertexDraw(false)}

        const isFirst = drawingPoints.current.length === 1
        const tooltipText = isFirst ? 'Click para continuar dibujando' : 'Click para cerrar polígono'
        setTooltipText(tooltipText)
        updateTooltipOverlay(tooltipText, coord)
        setCanFinish(drawingPoints.current.length >= 3)
    }).current

    const handleMouseMove = useRef((evt) => {
        if (!isDrawingActive.current) return;
        if (polygonGlobals.modeRef.current !== 'draw') return
        const map = mapRef.current
        const coord = evt.coordinate
        const first = drawingPoints.current[0]
        const dist = first ? distance(map.getPixelFromCoordinate(coord), map.getPixelFromCoordinate(first)) : Infinity
        const isSnapping = dist < pixelSnapThreshold

        const tooltipText = isSnapping
            ? 'Click sobre el primer punto para cerrar'
            : (drawingPoints.current.length === 0
                ? 'Click para colocar el primer vértice'
                : 'Click para continuar dibujando')

        setTooltipText(tooltipText)
        updateTooltipOverlay(tooltipText, coord)
        renderPreviewLine(coord)
        renderPreviewVertex(coord, isSnapping)
    }).current

    const enableDraw = () => {
        const map = mapRef.current
        if (!map) return

        disableDraw()

        if (vectorLayer.current) map.removeLayer(vectorLayer.current)
        
        vectorSource.current = new VectorSource()
        vectorLayer.current = new VectorLayer({ source: vectorSource.current })
        map.addLayer(vectorLayer.current)        

        map.on('click', handleMapClick)
        map.on('pointermove', handleMouseMove)
        map.on('dblclick', handleMapDoubleClick)

        resetAllState()
        setMode('draw')
        setTooltipText('Click para colocar el primer vértice')
        document.body.classList.add('draw-mode')

        if (areaLabelOverlay.current) {
            map.removeOverlay(areaLabelOverlay.current)
            areaLabelOverlay.current = null
        }

        if (tooltipOverlay.current) {
            map.removeOverlay(tooltipOverlay.current)
            tooltipOverlay.current = null
        }

        isDrawingActive.current = true;
    }

    const endPolygon = () => {
        const map = mapRef.current
        if (!map || drawingPoints.current.length < 3) return
    
        // Cierre del anillo si no fue cerrado por SNAP
        const first = drawingPoints.current[0]
        const last = drawingPoints.current[drawingPoints.current.length - 1]
        if (first && last && distance(first, last) > 1) {
            drawingPoints.current.push(first)
        }
    
        // Limpieza de previews
        if (vectorSource.current) {
            vertexFeatures.current.forEach(f => vectorSource.current.removeFeature(f))
            if (previewLine.current) vectorSource.current.removeFeature(previewLine.current)
            if (previewVertex.current) vectorSource.current.removeFeature(previewVertex.current)
            vectorSource.current.getFeatures().forEach(f => {
                if (f.getGeometry() instanceof Polygon) {
                    vectorSource.current.removeFeature(f)
                }
            })
        }
    
        // Crear feature
        const polygon = new Polygon([drawingPoints.current])
        finalFeature.current = new Feature(polygon)
        vectorSource.current.addFeature(finalFeature.current)
    
        // Limpieza de overlays
        if (tooltipOverlay.current) {
            map.removeOverlay(tooltipOverlay.current)
            tooltipOverlay.current = null
        }
    
        document.body.classList.remove('draw-mode')
        setTooltipText('')
        drawingPoints.current = []
        vertexFeatures.current = []
        previewLine.current = null
        previewVertex.current = null
        setCanFinish(false)
    
        // Callback para activar edición
        if (typeof polygonGlobals.onFinishCallback.current === 'function') {
            polygonGlobals.onFinishCallback.current(finalFeature.current)
        }
    }
    
    const disableDraw = () => {
        const map = mapRef.current
        if (!map) return

        map.on('click', handleMapClick)
        map.on('pointermove', handleMouseMove)
        map.on('dblclick', handleMapDoubleClick)

        resetAllState()
        
        if (tooltipOverlay.current) {
            map.removeOverlay(tooltipOverlay.current)
            tooltipOverlay.current = null
        }

        document.body.classList.remove('draw-mode')
        setMode(null)
        setTooltipText('')

        if (areaLabelOverlay.current) {
            map.removeOverlay(areaLabelOverlay.current)
            areaLabelOverlay.current = null
        }

        if (vectorLayer.current) {
            map.removeLayer(vectorLayer.current)
            vectorLayer.current = null
            vectorSource.current = null
        }

        document.body.classList.remove('draw-mode')
        isDrawingActive.current = false;
    }

    const cancelDraw = () => disableDraw()

    const removeLastPoint = () => {
        if (!drawingPoints.current.length) return
    
        // Quitar último punto y vértice visual
        drawingPoints.current.pop()
        const lastVertex = vertexFeatures.current.pop()
        if (lastVertex && vectorSource.current) {
            vectorSource.current.removeFeature(lastVertex)
        }
    
        // Borrar línea de preview
        if (previewLine.current && vectorSource.current) {
            vectorSource.current.removeFeature(previewLine.current)
            previewLine.current = null
        }
    
        // Borrar polígono de preview viejo
        if (vectorSource.current) {
            vectorSource.current.getFeatures().forEach(f => {
                if (f.getGeometry() instanceof Polygon) {
                    vectorSource.current.removeFeature(f)
                }
            })
        }
    
        // Volver a renderizar el polígono si quedan al menos 2 puntos
        if (drawingPoints.current.length >= 2) {
            const polygonFeature = new Feature(new Polygon([drawingPoints.current]))
            polygonFeature.setStyle(PARCELA_STYLES.draw)
            vectorSource.current.addFeature(polygonFeature)
        }
    
        // Volver a dibujar línea si hay al menos 1 punto
        if (drawingPoints.current.length >= 1 && tooltipOverlay.current) {
            const mouseCoord = tooltipOverlay.current.getPosition()
            if (mouseCoord) renderPreviewLine(mouseCoord)
        }
    
        updateAreaOverlay()
        setFirstVertexDraw(drawingPoints.current.length > 0)
        setCanFinish(drawingPoints.current.length >= 3)
    }    
    
    const getCreatedFeature = () => finalFeature.current || null

    useEffect(() => disableDraw, [])

    return {
        enableDraw,
        disableDraw,
        cancelDraw,
        endPolygon,
        removeLastPoint,
        getCreatedFeature,
        canFinish,
        closedBySnap,
        firstVertexDraw
    }
}

function distance(p1, p2) {
    const dx = p1[0] - p2[0]
    const dy = p1[1] - p2[1]
    return Math.sqrt(dx * dx + dy * dy)
}
