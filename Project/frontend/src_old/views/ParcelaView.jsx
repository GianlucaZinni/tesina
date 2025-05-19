import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Save, CircleX, MapPinPlusInside, MapPinMinusInside, ChevronDown, MapPin } from 'lucide-react'

import { PARCELA_STYLES, fetchParcelaInit, createParcela, updateParcela, deleteParcela } from '../services/parcelaService.js'
import { createBaseMap } from '../services/mapService.js'

import { usePolygonTools } from '../hooks/polygonTools/index'

import DrawToolPanel from '../components/DrawToolPanel.jsx'

import geodesicArea from '../utils/math.js'

export default function ParcelaView() {
    const [loading, setLoading] = useState(true)
    const [campos, setCampos] = useState({})
    const [parcelas, setParcelas] = useState({})
    const [center, setCenter] = useState({ lat: -36.79, lon: -64.31 })
    const [formData, setFormData] = useState({ campo_id: '', parcela_id: '', nombre: '', descripcion: '' })
    const [isDeleteMode, setIsDeleteMode] = useState(false)
    const [drawPanelOpen, setDrawPanelOpen] = useState(false)
    const [showFormParcela, setShowFormParcela] = useState(false)
    const [areaCampo, setAreaCampo] = useState(0)
    const [areaParcela, setAreaParcela] = useState(0)
    const [selectorOpen, setSelectorOpen] = useState(false)
    
    const mapRef = useRef(null)
    const drawnLayerRef = useRef(null)
    const parcelasLayer = useRef([])
    const selectorRef = useRef(null)

    const navigate = useNavigate()

    const {
        mode,
        endPolygon,
        cancelDraw,
        enableDraw,
        disableDraw,
        clearDraw,
        removeLastPoint,
        tooltipText,
        area,
        canFinish,
        closedBySnap,
        activateDeleteMode,
        disableDeleteMode,
        activateEditMode,
        clearEdit,
        getEditedLayer,
        getCreatedLayer
    } = usePolygonTools(mapRef, (latlngs) => {
        const coords = latlngs.map(p => [p.lat, p.lng])
        const area = geodesicArea(coords)
        setAreaParcela(area)
    })    

    useEffect(() => {
        async function init() {
            try {
                const data = await fetchParcelaInit()
                setCampos(data.campos)
                setParcelas(data.parcelas)
                setCenter(data.center)

                if (data.campo_preferido_id) {
                    setFormData({ campo_id: data.campo_preferido_id, parcela_id: '', nombre: '', descripcion: '' })
                } else {
                    const camposArray = Object.keys(data.campos)
                    if (camposArray.length > 0) {
                        setFormData({ campo_id: camposArray[0], parcela_id: '', nombre: '', descripcion: '' })
                    }
                }

                setLoading(false)
            } catch (err) {
                console.error('Error al cargar datos:', err)
            }
        }

        init()
    }, [])

    useEffect(() => {
        if (!loading) {
            const map = createBaseMap('map', [center.lat, center.lon])
            mapRef.current = map
        }
    }, [loading])

    useEffect(() => {
        if (!mapRef.current) return
    
        const map = mapRef.current
    
        const handleMapClick = (e) => {
            const map = mapRef.current
            const clickedLatLng = e.latlng
        
            // Verificar si el click fue dentro de alguna parcela visible
            const tocóUnaParcela = parcelasLayer.current.some(layer => {
                return layer.getBounds().contains(clickedLatLng)
            })
        
            if (tocóUnaParcela) return
        
            // Verificar vértices o intermedios
            const isVertexClick = e.originalEvent.target.classList.contains('vertex-marker')
            const isIntermediateClick = e.originalEvent.target.classList.contains('intermediate-marker')
            if (isVertexClick || isIntermediateClick) return
        
            clearEdit()
            setIsDeleteMode(false)
            disableDeleteMode()
            setFormData(prev => ({ ...prev, parcela_id: '', nombre: '', descripcion: '' }))
        }
        
    
        map.on('click', handleMapClick)
        return () => {
            map.off('click', handleMapClick)
        }
    }, [getEditedLayer])

    useEffect(() => {
        if (!formData.campo_id || !mapRef.current || !parcelas) return
        pintarParcelas()
    }, [formData.campo_id, formData.parcela_id, parcelas])

    useEffect(() => {
        function handleClickOutside(event) {
            if (selectorRef.current && !selectorRef.current.contains(event.target)) {
                setSelectorOpen(false)
            }
        }
    
        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])
    
    const pintarParcelas = () => {
        const map = mapRef.current
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
                    setFormData({
                        campo_id: formData.campo_id,
                        parcela_id: parcela.id,
                        nombre: parcela.nombre || '',
                        descripcion: parcela.descripcion || ''
                    })
    
                    // calcular área de la parcela seleccionada
                    const latlngs = layer.getLayers()[0].getLatLngs()[0].map(latlng => [latlng.lat, latlng.lng])
                    const area = geodesicArea(latlngs)
                    setAreaParcela(area)
                })
    
                parcelasLayer.current.push(layer)
    
                // Acumular área de todas las parcelas
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
    
                drawnLayerRef.current = editable
                activateEditMode(editable)
    
                const latlngs = editable.getLatLngs()[0].map(latlng => [latlng.lat, latlng.lng])
                const area = geodesicArea(latlngs)
                setAreaParcela(area)
            }
        }
    }
    
    const handleCampoChangeManual = (campoId) => {
        setFormData({ campo_id: campoId, parcela_id: '', nombre: '', descripcion: '' })
        const campo = campos[campoId]
        if (campo && mapRef.current) {
            mapRef.current.setView([campo.lat, campo.lon], 15)
        }
    }
    

    const limpiarParcelas = () => {
        const map = mapRef.current
        parcelasLayer.current.forEach(layer => map.removeLayer(layer))
        parcelasLayer.current = []
    }

    const handleChange = (e) => {
        const { name, value } = e.target
    
        if (name === 'campo_id') {
            const campo = campos[value]
            if (campo && mapRef.current) {
                mapRef.current.setView([campo.lat, campo.lon], 15)
            }
            setFormData({ campo_id: value, parcela_id: '', nombre: '', descripcion: '' })
            return
        }
    
        if (name === 'parcela_id') {
            if (value === '') {
                setFormData(prev => ({ ...prev, parcela_id: '', nombre: '', descripcion: '' }))
            } else {
                const parcelaSeleccionada = (parcelas[formData.campo_id] || []).find(p => p.id == value)
                if (parcelaSeleccionada) {
                    setFormData(prev => ({
                        ...prev,
                        parcela_id: value,
                        nombre: parcelaSeleccionada.nombre || '',
                        descripcion: parcelaSeleccionada.descripcion || ''
                    }))
                }
            }
            return
        }
    
        setFormData(prev => ({ ...prev, [name]: value }))
    }    

    const handleGuardar = async () => {
        if (!formData.campo_id || !formData.nombre) {
            alert('Todos los campos son obligatorios.')
            return
        }

        let layer = getEditedLayer()
        if (!layer) {
            layer = getCreatedLayer()
        }
    
        if (!layer) {
            alert('Debe seleccionar o crear una parcela para guardar.')
            return
        }

        const geojson = layer.toGeoJSON()

        try {
            if (formData.parcela_id) {
                await updateParcela(formData.parcela_id, geojson, formData.nombre, formData.descripcion)
            } else {
                await createParcela({
                    campo_id: formData.campo_id,
                    nombre: formData.nombre,
                    descripcion: formData.descripcion,
                    perimetro_geojson: geojson
                })
                clearDraw()
            }
            const data = await fetchParcelaInit()
            setParcelas(data.parcelas)
            setFormData(prev => ({ ...prev, parcela_id: '', nombre: '', descripcion: '' }))
        } catch (err) {
            console.error('Error al guardar:', err)
        }

    }

    const handleEliminar = async () => {
        if (!formData.parcela_id) return
        const confirmar = window.confirm("¿Estás seguro que querés eliminar esta parcela?")
        if (!confirmar) return

        try {
            await deleteParcela(formData.parcela_id)
            const data = await fetchParcelaInit()
            setParcelas(data.parcelas)
            setFormData(prev => ({ ...prev, parcela_id: '', nombre: '', descripcion: '' }))
        } catch (err) {
            console.error("Error al eliminar parcela:", err)
        }
    }

    const handleDeleteModeToggle = () => {
        setIsDeleteMode(prev => !prev)
        if (!isDeleteMode) {
            activateDeleteMode()
        } else {
            disableDeleteMode()
        }
    }

    if (loading) return <div className="p-4">Cargando mapa...</div>

    return (
        <div className="relative w-full h-screen overflow-hidden">
            {/* Mapa */}
            <div id="map" className="absolute inset-0 z-0" />

            <div className="absolute top-4 left-4 z-40 flex flex-row-reverse items-end gap-2">
                {/* Botón Eliminar */}
                {formData.parcela_id && (
                    <button
                        onClick={handleEliminar}
                        className="bg-white p-3 rounded-full shadow-md flex items-center justify-center"
                        title="Eliminar campo"
                    >
                        <MapPinMinusInside className="w-6 h-6" />
                    </button>
                )}

                <button 
                        className="bg-white p-3 rounded-full shadow-md transition-all duration-300" 
                        onClick={() => setShowFormParcela(prev => !prev)}
                    >
                    <MapPinPlusInside className="w-6 h-6" />
                </button>
            </div>

            {/* Panel de Formulario flotante */}
            <div
                style={{top:"4.5rem"}} className={`absolute top-20 left-4 right-4 md:left-4 md:right-auto md:w-[350px] bg-white/60 rounded-2xl shadow-lg p-2 z-10 overflow-y-auto max-h-[90%] max-w-[70%] flex flex-col gap-2 transform transition-all duration-500 ${showFormParcela ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
            >
                <div className="flex flex-col gap-1">
                    <label className="block font-medium text-xs">Seleccionar campo</label>
                    <select
                        name="campo_id"
                        value={formData.campo_id}
                        onChange={handleChange}
                        className="form-select w-full border p-1 rounded-full text-xs bg-white/70"
                    >
                        {Object.entries(campos).map(([id, campo]) => (
                            <option key={id} value={id}>{campo.nombre}</option>
                        ))}
                    </select>
                </div>
    
                <div className="flex flex-col gap-1">
                    <label className="block font-medium text-xs">Seleccionar parcela</label>
                    <select
                        name="parcela_id"
                        value={formData.parcela_id}
                        onChange={handleChange}
                        className="form-select w-full border p-1 rounded-full text-xs bg-white/70"
                    >
                        <option value="">-- Crear nueva parcela --</option>
                        {(parcelas[formData.campo_id] || []).map((p) => (
                            <option key={p.id} value={p.id}>{p.nombre}</option>
                        ))}
                    </select>
                </div>
    
                <div className="flex flex-col gap-1">
                    <label className="block font-medium text-xs">Nombre del área</label>
                    <input
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        className="w-full border p-1 rounded-full text-xs bg-white/70"
                    />
                </div>
    
                <div className="flex flex-col gap-1">
                    <label className="block font-medium text-xs">Descripción de la parcela</label>
                    <input
                        name="descripcion"
                        value={formData.descripcion}
                        onChange={handleChange}
                        className="w-full border p-1 rounded-full text-xs bg-white/70"
                    />
                </div>
    
                <input type="hidden" name="lat" value={formData.lat} />
                <input type="hidden" name="lon" value={formData.lon} />
            </div>

            {/* Botón central */}
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


            {/* Tooltip de área mientras dibujás */}
            {mode === 'draw' && (
                <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-10 px-4 py-2 bg-white/50 backdrop-blur-md shadow rounded text-xs text-gray-800 max-w-[65%] overflow-hidden whitespace-nowrap text-ellipsis">
                    {tooltipText} {area > 0 && `– ${(area / 10000).toFixed(2)} ha`}
                </div>
            )}
    
            {/* Botón de Eliminar vértices */}
            {formData.parcela_id !== '' && (
                <div style={{bottom:"8.5rem"}} className="absolute right-4 z-40 flex flex-col-reverse items-end gap-1">
                    <button
                        onClick={handleDeleteModeToggle}
                        className={`p-3 rounded-full shadow-md flex items-center justify-center ${isDeleteMode ? 'bg-red-600' : 'bg-white'}`}
                        title="Eliminar vértices"
                    >
                        <CircleX className="w-6 h-6" />
                    </button>
                </div>
            )}
    
            {/* Botón Guardar */}
            { ( (showFormParcela) || (formData.parcela_id !== '') ) && (
                <div className="absolute bottom-20 right-4 z-40 flex flex-col-reverse items-end gap-2">
                    <button
                        onClick={handleGuardar}
                        className="bg-white p-3 rounded-full shadow-md flex items-center justify-center"
                        title="Guardar cambios"
                    >
                        <Save className="w-6 h-6" />
                    </button>
                </div>
            )}

            {/* Panel flotante de Dibujo */}
            {formData.parcela_id === '' && showFormParcela &&  (

                <DrawToolPanel
                    open={drawPanelOpen}
                    setOpen={setDrawPanelOpen}
                    onStart={enableDraw}
                    onFinish={() => {
                        if (!mapRef.current) return
                        const drawn = mapRef.current._layers
                        const layers = Object.values(drawn).filter(l => l instanceof L.Polygon)
                        if (layers.length > 0) {
                            drawnLayerRef.current = layers[layers.length - 1]
                        }
                        endPolygon()
                        disableDraw()
                        setDrawPanelOpen(false)
                    }}
                    onUndo={removeLastPoint}
                    onCancel={() => {
                        if (cancelDraw) cancelDraw()
                        setDrawPanelOpen(false)
                    }}
                    canFinish={canFinish}
                    closedBySnap={closedBySnap}
                />
            
            )}
        </div>
    )
    
}
