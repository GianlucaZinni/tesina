import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Home, Layers, LocateFixed, Save, CircleX, MapPin, ChevronDown } from 'lucide-react'

import DrawToolPanel from '../components/DrawToolPanel'
import { usePolygonTools } from '../hooks/polygonTools'
import { createBaseMap } from '../services/mapService'
import { fetchParcelaInit, updateParcela } from '../services/parcelaService'
import { PARCELA_STYLES } from '../constants/styles'
import { fromLonLat } from 'ol/proj'
import GeoJSON from 'ol/format/GeoJSON'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import Style from 'ol/style/Style'
import Stroke from 'ol/style/Stroke'
import Fill from 'ol/style/Fill'
import * as olSphere from 'ol/sphere'

export default function MapView() {
    const [campos, setCampos] = useState({})
    const [parcelas, setParcelas] = useState({})
    const [formData, setFormData] = useState({ campo_id: '', parcela_id: '' })
    const [center, setCenter] = useState({ lat: -36.79, lon: -64.31 })
    const [loading, setLoading] = useState(true)
    const [selectorOpen, setSelectorOpen] = useState(false)
    const [areaCampo, setAreaCampo] = useState(0)
    const [areaParcela, setAreaParcela] = useState(0)
    const [isDeleteMode, setIsDeleteMode] = useState(false)

    const mapRef = useRef(null)
    const vectorLayerRef = useRef(null)
    const selectorRef = useRef(null)
    const navigate = useNavigate()

    const {
        enableDraw,
        cancelDraw,
        endPolygon,
        clearDraw,
        canFinish,
        closedBySnap,
        activateEditMode,
        clearEdit,
        getEditedLayer,
        activateDeleteMode,
        disableDeleteMode
    } = usePolygonTools(mapRef, (geojson) => {
        if (geojson?.geometry?.coordinates) {
            const geometry = new GeoJSON().readGeometry(geojson.geometry, { featureProjection: 'EPSG:3857' })
            const area = olSphere.getArea(geometry)
            setAreaParcela(area)
        }
    })

    const calcularArea = (feature) => {
        const geometry = feature.getGeometry()
        return olSphere.getArea(geometry, { projection: 'EPSG:3857' })
    }

    const handleParcelaSelect = (parcela, feature) => {
        if (vectorLayerRef.current) {
            const src = vectorLayerRef.current.getSource()
            const f = src.getFeatureById(parcela.id)
            if (f) src.removeFeature(f)
        }
        activateEditMode(parcela)
        setFormData(prev => ({ ...prev, parcela_id: parcela.id }))
        setAreaParcela(calcularArea(feature))
    }

    const pintarParcelas = () => {
        const map = mapRef.current
        if (!map || !formData.campo_id) return

        const source = new VectorSource()
        const geojsonFormat = new GeoJSON()
        const lista = parcelas[formData.campo_id] || []

        let areaTotal = 0

        lista.forEach(parcela => {
            console.log('Parcela GeoJSON a procesar:', parcela)
            const feature = geojsonFormat.readFeature(parcela, {
                featureProjection: 'EPSG:3857'
            })
            feature.setId(parcela.id)
            source.addFeature(feature)
            areaTotal += calcularArea(feature)
        })

        const vectorLayer = new VectorLayer({
            source,
            style: new Style({
                stroke: new Stroke({
                    color: PARCELA_STYLES.base.color,
                    width: PARCELA_STYLES.base.weight
                }),
                fill: new Fill({
                    color: `rgba(255,255,255,${PARCELA_STYLES.base.fillOpacity})`
                })
            })
        })

        if (vectorLayerRef.current) {
            map.removeLayer(vectorLayerRef.current)
        }

        vectorLayerRef.current = vectorLayer
        map.addLayer(vectorLayer)

        map.once('singleclick', (evt) => {
            map.forEachFeatureAtPixel(evt.pixel, (feature) => {
                const id = feature.getId()
                const parcela = lista.find(p => p.id === id)
                if (parcela) {
                    handleParcelaSelect(parcela, feature)
                }
            })
        })

        setAreaCampo(areaTotal)
        setAreaParcela(0)
    }

    const reloadParcelas = async () => {
        const data = await fetchParcelaInit()
        setParcelas(data.parcelas)
        pintarParcelas()
    }

    const handleGuardar = async () => {
        const edited = getEditedLayer()
        if (!edited || !formData.parcela_id) {
            alert('Seleccioná una parcela para guardar los cambios.')
            return
        }

        try {
            await updateParcela(formData.parcela_id, edited)
            setFormData(prev => ({ ...prev, parcela_id: '' }))
            setAreaParcela(0)
            clearEdit()
            setIsDeleteMode(false)
            reloadParcelas()
        } catch (err) {
            console.error('Error al guardar cambios:', err)
        }
    }

    const handleCampoChangeManual = (campoId) => {
        setFormData({ campo_id: campoId, parcela_id: '' })
        const campo = campos[campoId]
        if (campo && mapRef.current) {
            const center = fromLonLat([campo.lon, campo.lat])
            mapRef.current.getView().animate({ center, zoom: 15 })
        }
    }

    const toggleLayer = () => {
        const osm = window.osmLayer
        const sat = window.esriSatLayer
        if (!osm || !sat) return
        const osmVisible = osm.getVisible()
        osm.setVisible(!osmVisible)
        sat.setVisible(osmVisible)
    }

    const handleDeleteModeToggle = () => {
        setIsDeleteMode(prev => {
            const next = !prev
            next ? activateDeleteMode() : disableDeleteMode()
            return next
        })
    }

    const handleNavigateHome = () => {
        navigate('/home')
    }

    const handleLocate = () => {
        if (navigator.geolocation && mapRef.current) {
            navigator.geolocation.getCurrentPosition((position) => {
                const coords = fromLonLat([position.coords.longitude, position.coords.latitude])
                mapRef.current.getView().animate({ center: coords, zoom: 16 })
            })
        }
    }

    useEffect(() => {
        async function init() {
            try {
                const data = await fetchParcelaInit()
                setCampos(data.campos)
                setParcelas(data.parcelas)
                setCenter(data.center)

                const campoId = data.campo_preferido_id || Object.keys(data.campos)[0]
                setFormData({ campo_id: campoId, parcela_id: '' })
                setLoading(false)
            } catch (err) {
                console.error('Error al cargar datos del mapa:', err)
            }
        }
        init()
    }, [])

    useEffect(() => {
        if (!loading && !mapRef.current) {
            const map = createBaseMap('map', [center.lat, center.lon])
            mapRef.current = map
        }
        if (!loading) pintarParcelas()
    }, [loading])

    useEffect(() => {
        if (!loading && mapRef.current) pintarParcelas()
    }, [formData.campo_id])

    useEffect(() => {
        function handleClickOutside(event) {
            if (selectorRef.current && !selectorRef.current.contains(event.target)) {
                setSelectorOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    if (loading) return <div className="p-4">Cargando mapa...</div>

    return (
        <div className="w-full h-full relative overflow-hidden">
            <div id="map" className="absolute inset-0 z-0" />

            <div className="absolute top-4 left-4 z-40 flex flex-col gap-2">
                <button onClick={handleNavigateHome} title="Home" className="bg-white rounded-full p-3 shadow-md">
                    <Home className="w-6 h-6 text-gray-800" />
                </button>
                <button onClick={toggleLayer} title="Cambiar capa" className="bg-white rounded-full p-3 shadow-md">
                    <Layers className="w-6 h-6 text-gray-800" />
                </button>
                <button onClick={handleLocate} title="Mi ubicación" className="bg-white rounded-full p-3 shadow-md">
                    <LocateFixed className="w-6 h-6 text-gray-800" />
                </button>
            </div>

            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
                <div ref={selectorRef} className="relative">
                    <button
                        onClick={() => setSelectorOpen(!selectorOpen)}
                        className="flex items-center gap-2 px-6 py-3 bg-black/60 backdrop-blur-md rounded-full shadow-lg text-white font-semibold text-sm hover:bg-black/70 transition-all"
                    >
                        <div className="flex flex-col text-left">
                            <span className="text-xs text-gray-300">{campos[formData.campo_id]?.nombre || 'Seleccionar campo'}</span>
                            {formData.parcela_id ? (
                                <div className="flex items-center gap-1">
                                    <MapPin size={14} className="text-cyan-400" />
                                    <span className="text-sm">{parcelas[formData.campo_id]?.find(p => p.id == formData.parcela_id)?.nombre || 'Parcela'}</span>
                                    <span className="text-xs text-green-400 ml-2">{(areaParcela / 10000).toFixed(2)} ha</span>
                                </div>
                            ) : (
                                <span className="text-xs text-green-400">{(areaCampo / 10000).toFixed(2)} ha</span>
                            )}
                        </div>
                        <ChevronDown size={16} className="text-white" />
                    </button>

                    {selectorOpen && (
                        <div className="absolute top-full left-0 mt-2 bg-white rounded-md shadow-md text-sm overflow-hidden z-20 w-full">
                            {Object.entries(campos).map(([id, campo]) => (
                                <button
                                    key={id}
                                    onClick={() => {
                                        handleCampoChangeManual(id)
                                        setSelectorOpen(false)
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-gray-100"
                                >
                                    {campo.nombre}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <DrawToolPanel
                onStart={enableDraw}
                onFinish={endPolygon}
                onCancel={cancelDraw}
                onUndo={() => { }}
                canFinish={canFinish}
                closedBySnap={closedBySnap}
            />

            {formData.parcela_id && (
                <>
                    <div style={{ bottom: '8.5rem' }} className="absolute right-4 z-40 flex flex-row-reverse gap-2">
                        <button
                            onClick={handleDeleteModeToggle}
                            className="p-3 rounded-full shadow-md bg-white"
                            title="Eliminar vértices"
                        >
                            <CircleX className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="absolute bottom-20 right-4 z-40 flex flex-row-reverse gap-2">
                        <button onClick={handleGuardar} className="bg-white p-3 rounded-full shadow-md" title="Guardar cambios">
                            <Save className="w-6 h-6" />
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
