// hooks/useMapParcelas.js
import { useEffect, useRef } from 'react'
import GeoJSON from 'ol/format/GeoJSON'
import VectorSource from 'ol/source/Vector'
import VectorLayer from 'ol/layer/Vector'
import { calculatePolygonAreaFromGeometry } from '../utils/geometry'
import { PARCELA_STYLES } from '../constants/styles'

export function useMapParcelas({
    mapRef,
    parcelas,
    formData,
    clearEdit,
    activateEditMode,
    getCreatedFeature,
    setFormData,
    setAreaCampo,
    setAreaParcela,
    enabled = true,
    modoVisualizacionCampo = false
}) {

    const clickHandlerRef = useRef(null)
    const parcelasLayerRef = useRef([])

    const clearParcelas = () => {
        const map = mapRef.current
        if (!map) return
    
        parcelasLayerRef.current.forEach(layer => map.removeLayer(layer))
        parcelasLayerRef.current = []
    
        map.getLayers().getArray().forEach(layer => {
            const style = layer.getStyle?.()
            if (style === PARCELA_STYLES.edit) {
                map.removeLayer(layer)
            }
        })
    }

    const handleParcelClick = (e) => {
        const map = mapRef.current
        if (!map) return

        const created = getCreatedFeature()
        if (created?.getGeometry()?.intersectsCoordinate(e.coordinate)) {
            clearEdit()
            activateEditMode(created)
            return
        }

        map.forEachFeatureAtPixel(e.pixel, feature => {
            if (!feature || !feature.getGeometry()) return
            const type = feature.getGeometry().getType()
            if (type !== 'Polygon' && type !== 'MultiPolygon') return

            const id = feature.getId() || feature.get('parcela_id')
            const campoId = formData.campo_id
            const parcela = (parcelas[campoId] || []).find(p => p.id == id)
            if (!parcela) return

            if (!modoVisualizacionCampo) {
                setFormData({
                    campo_id: campoId,
                    parcela_id: parcela.id,
                    nombre: parcela.nombre || '',
                    descripcion: parcela.descripcion || ''
                })
            } else {
                setFormData(prev => ({
                    ...prev,
                    parcela_id: parcela.id
                }))
            }
            

            try {
                const clone = feature.clone()
                clone.setId(parcela.id)
                activateEditMode(clone)
            } catch (err) {
                console.error('Error al clonar feature:', err)
            }
        })
    }

    const setFeaturesOnMap = () => {
        const map = mapRef.current
        if (!map || !formData.campo_id) return
    
        clearEdit()
        clearParcelas()
    
        if (clickHandlerRef.current) map.un('click', clickHandlerRef.current)
        map.on('click', handleParcelClick)
        clickHandlerRef.current = handleParcelClick
    
        const lista = parcelas[formData.campo_id] || []
        const format = new GeoJSON()
        let areaTotal = 0
    
        if (modoVisualizacionCampo) {
            // Modo tipo CampoView
            lista.forEach(p => {
                try {
                    const f = format.readFeature(p, { featureProjection: 'EPSG:3857' })
                    if (!f.getGeometry()) return
                    f.setId(p.id)
                    const source = new VectorSource({ features: [f] })
                    const layer = new VectorLayer({ source, style: PARCELA_STYLES.base })
                    map.addLayer(layer)
                    parcelasLayerRef.current.push(layer)
                    areaTotal += calculatePolygonAreaFromGeometry(f.getGeometry())
                } catch (err) {
                    console.error('Error leyendo feature:', err)
                }
            })
            setAreaCampo(areaTotal)
            setAreaParcela(0)
            return
        }
    
        // Modo normal: con selección
        if (formData.parcela_id === '' || formData.parcela_id === 'temporal') {
            lista.forEach(p => {
                try {
                    const f = format.readFeature(p, { featureProjection: 'EPSG:3857' })
                    if (!f.getGeometry()) return
                    f.setId(p.id)
                    const source = new VectorSource({ features: [f] })
                    const layer = new VectorLayer({ source, style: PARCELA_STYLES.base })
                    map.addLayer(layer)
                    parcelasLayerRef.current.push(layer)
                    areaTotal += calculatePolygonAreaFromGeometry(f.getGeometry())
                } catch (err) {
                    console.error('Error leyendo feature:', err)
                }
            })
            setAreaCampo(areaTotal)
            setAreaParcela(0)
        } else {
            const p = lista.find(p => p.id == formData.parcela_id)
            if (p) {
                try {
                    const f = format.readFeature(p, { featureProjection: 'EPSG:3857' })
                    if (!f.getGeometry()) return
                    f.setId(p.id)
                    activateEditMode(f)
                    const area = calculatePolygonAreaFromGeometry(f.getGeometry())
                    setAreaParcela(area)
                } catch (err) {
                    console.error('Error leyendo feature seleccionada:', err)
                }
            }
        }
    }
    

    useEffect(() => {
        if (!enabled) return
        setFeaturesOnMap()
        return () => {
            clearParcelas()
            if (clickHandlerRef.current && mapRef.current) {
                mapRef.current.un('click', clickHandlerRef.current)
                clickHandlerRef.current = null
            }
        }
    }, [formData.campo_id, formData.parcela_id, parcelas])

    return {     
        setFeaturesOnMap,
        clearParcelas
    }
}
