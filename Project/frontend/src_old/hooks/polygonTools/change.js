import L from 'leaflet'
import { useRef } from 'react'
import { PARCELA_STYLES } from '../../services/parcelaService'

export function useChangeTool(mapRef, onUpdate = () => {}) {
    const editableLayer = useRef(null)
    const vertexMarkers = useRef([])
    const intermediateMarkers = useRef([])
    const isDeleteMode = useRef(false)

    const activateEditMode = (polygon) => {
        clearEdit()
        const map = mapRef.current
        if (!map) return

        const latlngs = polygon.getLatLngs()[0]
        editableLayer.current = L.polygon(latlngs, PARCELA_STYLES.edit.polygon).addTo(map)
        drawVertices(latlngs)
        onUpdate(latlngs)
    }

    const drawVertices = (latlngs) => {
        const map = mapRef.current
        vertexMarkers.current.forEach(m => map.removeLayer(m))
        intermediateMarkers.current.forEach(m => map.removeLayer(m))
        vertexMarkers.current = []
        intermediateMarkers.current = []

        latlngs.forEach((point, index) => {
            const marker = L.marker(point, {
                icon: L.divIcon({
                    className: 'vertex-marker',
                    iconSize: [16, 16]
                }),
                draggable: !isDeleteMode.current
            })

            marker._vertexIndex = index

            marker
                .addTo(map)
                .on('drag', (e) => {
                    if (isDeleteMode.current) return
                    latlngs[marker._vertexIndex] = e.target.getLatLng()
                    editableLayer.current.setLatLngs([latlngs])
                    drawIntermediatePoints(latlngs)
                    onUpdate(latlngs)
                })
                .on('click', () => {
                    if (isDeleteMode.current && latlngs.length > 3) {
                        latlngs.splice(marker._vertexIndex, 1)
                        editableLayer.current.setLatLngs([latlngs])
                        drawVertices(latlngs)
                        onUpdate(latlngs)
                    }
                })

            vertexMarkers.current.push(marker)
        })

        drawIntermediatePoints(latlngs)
    }

    const drawIntermediatePoints = (latlngs) => {
        const map = mapRef.current
        intermediateMarkers.current.forEach(m => map.removeLayer(m))
        intermediateMarkers.current = []

        for (let i = 0; i < latlngs.length; i++) {
            const p1 = latlngs[i]
            const p2 = latlngs[(i + 1) % latlngs.length]
            const mid = L.latLng((p1.lat + p2.lat) / 2, (p1.lng + p2.lng) / 2)

            const marker = L.marker(mid, {
                icon: L.divIcon({
                    className: 'intermediate-marker',
                    iconSize: [12, 12]
                }),
                draggable: !isDeleteMode.current
            })
                .addTo(map)
                .on('drag', (e) => {
                    if (isDeleteMode.current) return
                    const temp = [...latlngs]
                    temp.splice(i + 1, 0, e.target.getLatLng())
                    editableLayer.current.setLatLngs([temp])
                    onUpdate(temp)
                })
                .on('dragend', (e) => {
                    if (isDeleteMode.current) return
                    latlngs.splice(i + 1, 0, e.target.getLatLng())
                    editableLayer.current.setLatLngs([latlngs])
                    drawVertices(latlngs)
                    onUpdate(latlngs)
                })

            intermediateMarkers.current.push(marker)
        }
    }

    const activateDeleteMode = () => {
        isDeleteMode.current = true
        if (editableLayer.current) {
            const latlngs = editableLayer.current.getLatLngs()[0]
            drawVertices(latlngs)
            onUpdate(latlngs)
        }
    }

    const disableDeleteMode = () => {
        isDeleteMode.current = false
        if (editableLayer.current) {
            const latlngs = editableLayer.current.getLatLngs()[0]
            drawVertices(latlngs)
            onUpdate(latlngs)
        }
    }

    const clearEdit = () => {
        const map = mapRef.current
        if (editableLayer.current) map.removeLayer(editableLayer.current)
        editableLayer.current = null
        vertexMarkers.current.forEach(m => map.removeLayer(m))
        intermediateMarkers.current.forEach(m => map.removeLayer(m))
        vertexMarkers.current = []
        intermediateMarkers.current = []
        isDeleteMode.current = false
    }

    return {
        activateEditMode,
        clearEdit,
        getEditedLayer: () => editableLayer.current,
        activateDeleteMode,
        disableDeleteMode
    }
}
