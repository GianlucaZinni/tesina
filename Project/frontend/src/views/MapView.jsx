import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Home, Layers, LocateFixed, Save, CircleX, MapPin, ChevronDown } from 'lucide-react'

import { createBaseMap } from '../services/mapService'
import { PARCELA_STYLES, fetchParcelaInit, updateParcela } from '../services/parcelaService'

import geodesicArea from '../utils/math'

import { usePolygonTools } from '../hooks/polygonTools/index'
import { useChangeTool } from '../hooks/polygonTools/change'

export default function MapView() {
    const [campos, setCampos] = useState({})
    const [parcelas, setParcelas] = useState({})
    const [formData, setFormData] = useState({ campo_id: '', parcela_id: '' })
    const [center, setCenter] = useState({ lat: -36.79, lon: -64.31 })
    const [loading, setLoading] = useState(true)
    const [isDeleteMode, setIsDeleteMode] = useState(false)
    const [selectorOpen, setSelectorOpen] = useState(false)
    const [areaCampo, setAreaCampo] = useState(0)
    const [areaParcela, setAreaParcela] = useState(0)

    const mapRef = useRef(null)
    const parcelasLayer = useRef([])

    const navigate = useNavigate()

    const {
        activateEditMode,
        clearEdit,
        getEditedLayer,
        activateDeleteMode,
        disableDeleteMode
    } = useChangeTool(mapRef, (latlngs) => {
        const coords = latlngs.map(p => [p.lat, p.lng])
        const area = geodesicArea(coords)
        setAreaParcela(area)
    })



    // const {
    //     activateEditMode,
    //     clearEdit,
    //     getEditedLayer,
    //     activateDeleteMode,
    //     disableDeleteMode
    // } = useChangeTool(mapRef)

    useEffect(() => {
        async function init() {
            try {
                const data = await fetchParcelaInit()
                setCampos(data.campos)
                setParcelas(data.parcelas)
                setCenter(data.center)

                if (data.campo_preferido_id) {
                    setFormData({ campo_id: data.campo_preferido_id, parcela_id: '' })
                } else {
                    const camposArray = Object.keys(data.campos)
                    if (camposArray.length > 0) {
                        setFormData({ campo_id: camposArray[0], parcela_id: '' })
                    }
                }

                setLoading(false)
            } catch (err) {
                console.error('Error al cargar datos del mapa:', err)
            }
        }

        init()
    }, [])

    useEffect(() => {
        if (loading) return

        const mapElement = document.getElementById('map')
        if (!mapElement) return

        if (!mapRef.current) {
            const map = createBaseMap('map', [center.lat, center.lon])
            mapRef.current = map

            map.on('click', handleMapClick)

            pintarParcelas()
        }
    }, [loading])

    useEffect(() => {
        if (!loading && mapRef.current) {
            pintarParcelas()
        }
    }, [formData.campo_id, formData.parcela_id])

    const handleMapClick = (e) => {
        if (
            e.originalEvent.target.classList.contains('vertex-marker') ||
            e.originalEvent.target.classList.contains('intermediate-marker')
        ) return

        if (getEditedLayer()?.getBounds()?.contains(e.latlng)) return

        clearEdit()
        setFormData(prev => ({ ...prev, parcela_id: '' }))
        setIsDeleteMode(false)
        disableDeleteMode()
    }

    const pintarParcelas = () => {
        const map = mapRef.current
        if (!map || !formData.campo_id) return
    
        clearEdit()
        limpiarParcelas()
    
        const parcelasDelCampo = parcelas[formData.campo_id] || []
    
        let areaTotal = 0
    
        if (formData.parcela_id === '') {
            parcelasDelCampo.forEach(parcela => {
                const layer = L.geoJSON(parcela, {
                    style: PARCELA_STYLES.base
                }).addTo(map)
    
                layer.on('click', () => {
                    clearEdit()
                    limpiarParcelas()
    
                    const editable = L.geoJSON(parcela, {
                        style: PARCELA_STYLES.edit.polygon
                    }).getLayers()[0]
                    activateEditMode(editable)
    
                    setFormData(prev => ({ ...prev, parcela_id: parcela.id }))
    
                    // Obtener coordenadas para calcular área
                    const latlngs = editable.getLatLngs()[0].map(latlng => [latlng.lat, latlng.lng])
                    const area = geodesicArea(latlngs)
                    setAreaParcela(area)
                })
    
                parcelasLayer.current.push(layer)
    
                // Acumulamos área total de todas las parcelas
                const capa = layer.getLayers()[0]
                if (capa) {
                    const latlngs = capa.getLatLngs()[0].map(latlng => [latlng.lat, latlng.lng])
                    const areaParcela = geodesicArea(latlngs)
                    areaTotal += areaParcela
                }
            })
    
            setAreaCampo(areaTotal)
            setAreaParcela(0)
        } else {
            const seleccionada = parcelasDelCampo.find(p => p.id == formData.parcela_id)
            if (seleccionada) {
                const editable = L.geoJSON(seleccionada, {
                    style: PARCELA_STYLES.edit.polygon
                }).getLayers()[0]
                activateEditMode(editable)
    
                const latlngs = editable.getLatLngs()[0].map(latlng => [latlng.lat, latlng.lng])
                const area = geodesicArea(latlngs)
                setAreaParcela(area)
            }
        }
    }

    const limpiarParcelas = () => {
        const map = mapRef.current
        parcelasLayer.current.forEach(layer => map.removeLayer(layer))
        parcelasLayer.current = []
    }

    const handleCampoChangeManual = (campoId) => {
        setFormData({ campo_id: campoId, parcela_id: '' })
        const campo = campos[campoId]
        if (campo && mapRef.current) {
            mapRef.current.setView([campo.lat, campo.lon], 15)
        }
    }

    const handleGuardar = async () => {
        const editedLayer = getEditedLayer()
        if (!editedLayer || !formData.parcela_id) {
            alert('Seleccioná una parcela para guardar los cambios.')
            return
        }
    
        const geojson = editedLayer.toGeoJSON()
    
        try {
            await updateParcela(formData.parcela_id, geojson)
    
            setParcelas(prevParcelas => {
                const nuevasParcelas = { ...prevParcelas }
                const parcelasCampo = [...(nuevasParcelas[formData.campo_id] || [])]
    
                const index = parcelasCampo.findIndex(p => p.id == formData.parcela_id)
                if (index !== -1) {
                    parcelasCampo[index] = {
                        ...parcelasCampo[index],
                        ...geojson,
                        id: formData.parcela_id
                    }
                    nuevasParcelas[formData.campo_id] = parcelasCampo
                }
                return nuevasParcelas
            })
    
            clearEdit()
            setIsDeleteMode(false)
            setFormData(prev => ({ ...prev, parcela_id: '' }))
            setAreaParcela(0)
            pintarParcelas()
    
        } catch (err) {
            console.error('Error al guardar cambios:', err)
        }
    }
    

    const handleDeleteModeToggle = () => {
        setIsDeleteMode(prev => {
            const next = !prev
            if (next) activateDeleteMode()
            else disableDeleteMode()
            return next
        })
    }

    const toggleLayer = () => {
        const map = mapRef.current
        const osm = window.osm
        const esriSat = window.esriSat
        if (map.hasLayer(osm)) {
            map.removeLayer(osm)
            esriSat.addTo(map)
        } else {
            map.removeLayer(esriSat)
            osm.addTo(map)
        }
    }

    const handleNavigateHome = () => {
        navigate('/home')
    }

    if (loading) return <div className="p-4">Cargando mapa...</div>

    return (
        <div className="w-full h-full relative overflow-hidden">
            <div id="map" className="absolute inset-0 z-0" />

            <div className="absolute top-4 left-4 z-40 flex flex-col gap-2">
                <button  onClick={handleNavigateHome} title="Home" className="bg-white rounded-full p-3 shadow-md">
                    <Home className="w-6 h-6 text-gray-800" />
                </button>
                <button onClick={toggleLayer} title="Cambiar capa" className="bg-white rounded-full p-3 shadow-md">
                    <Layers className="w-6 h-6 text-gray-800" />
                </button>
                <button onClick={() => mapRef.current?.locate({ setView: true })} title="Mi ubicación" className="bg-white rounded-full p-3 shadow-md">
                    <LocateFixed className="w-6 h-6 text-gray-800" />
                </button>
            </div>

            {/* Botón central */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
                <div className="relative">
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

            {/* Botones inferiores */}
            {formData.parcela_id && (
                <>
                    <div className="absolute bottom-40 right-4 z-40 flex flex-row-reverse gap-2">
                        <button onClick={handleGuardar} 
                        className="bg-green-600 text-white p-3 rounded-full shadow-md" 
                        title="Guardar cambios">
                            <Save className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="absolute bottom-24 right-4 z-40 flex flex-row-reverse gap-2">
                        <button
                            onClick={handleDeleteModeToggle}
                            className={`p-3 rounded-full shadow-md ${isDeleteMode ? 'bg-red-600 text-white' : 'bg-white'}`}
                            title="Eliminar vértices"
                        >
                            <CircleX className="w-6 h-6" />
                        </button>
                    </div>
                </>
            )}
        </div>
    )
}
