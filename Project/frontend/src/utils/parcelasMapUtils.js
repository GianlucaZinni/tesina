import L from 'leaflet'

export function clearLayers(map, layerRefs) {
    layerRefs.forEach(layer => map.removeLayer(layer))
    layerRefs.length = 0
}

export function pintarParcelasDelCampo(map, parcelas, campoId, onSelect) {
    const nuevas = []
    const lista = parcelas[campoId] || []
    lista.forEach(parcela => {
        const layer = L.geoJSON(parcela, {
            style: { color: '#3388ff', weight: 5, fillOpacity: 0 },
            onEachFeature: (_, l) => {
                l.on('click', () => onSelect(parcela))
            }
        }).addTo(map)
        nuevas.push(layer)
    })
    return nuevas
}

export function seleccionarParcela(map, drawnLayerRef, parcela) {
    if (drawnLayerRef.current) {
        map.removeLayer(drawnLayerRef.current)
        drawnLayerRef.current = null
    }

    const editable = L.geoJSON(parcela, {
        style: { color: 'orange', weight: 5, fillOpacity: 0.2 }
    }).getLayers()[0]

    editable.addTo(map)
    editable.pm.enable({ allowSelfIntersection: false })

    editable.on('pm:edit', async (e) => {
        try {
            const updatedGeoJSON = e.layer.toGeoJSON()
            await fetch(`/config/api/parcela/${parcela.id}/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ geojson: updatedGeoJSON })
            })
        } catch (err) {
            console.error('Error al guardar cambios:', err)
        }
    })

    drawnLayerRef.current = editable
}
