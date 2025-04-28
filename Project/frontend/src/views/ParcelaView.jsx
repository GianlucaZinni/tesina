import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Save, CircleX, MapPlus } from 'lucide-react'

import { PARCELA_STYLES, fetchParcelaInit, createParcela, updateParcela, deleteParcela } from '../services/parcelaService'
import { createBaseMap } from '../services/mapService.js'

import { usePolygonTools } from '../hooks/polygonTools/index'

import DrawToolPanel from '../components/DrawToolPanel'

export default function ParcelaView() {
    const [loading, setLoading] = useState(true)
    const [campos, setCampos] = useState({})
    const [parcelas, setParcelas] = useState({})
    const [center, setCenter] = useState({ lat: -36.79, lon: -64.31 })
    const [formData, setFormData] = useState({ campo_id: '', parcela_id: '', nombre: '', descripcion: '' })
    const [isDeleteMode, setIsDeleteMode] = useState(false)
    const [drawPanelOpen, setDrawPanelOpen] = useState(false)
    const [showFormParcela, setShowFormParcela] = useState(false)

    const mapRef = useRef(null)
    const drawnLayerRef = useRef(null)
    const parcelasLayer = useRef([])

    const navigate = useNavigate()

    const {
        mode,
        endPolygon,
        cancelDraw,
        enableDraw,
        disableDraw,
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
    } = usePolygonTools(mapRef)

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

    const pintarParcelas = () => {
        const map = mapRef.current
        clearEdit()
        limpiarParcelas()

        const parcelasDelCampo = parcelas[formData.campo_id] || []

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
                })                

                parcelasLayer.current.push(layer)
            })
        } else {
            const seleccionada = parcelasDelCampo.find(p => p.id == formData.parcela_id)
            if (seleccionada) {
                const editable = L.geoJSON(seleccionada, {
                    style: PARCELA_STYLES.edit.polygon
                }).getLayers()[0]

                drawnLayerRef.current = editable
                activateEditMode(editable)
            }
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
    
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1">
                <button 
                        className="bg-white p-3 rounded-full shadow-md transition-all duration-300" 
                        onClick={() => setShowFormParcela(prev => !prev)}
                    >
                    <MapPlus className="w-6 h-6" />
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
                        <option value="">-- Seleccionar campo --</option>
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
                        className={`p-3 rounded-full shadow-md flex items-center justify-center ${isDeleteMode ? 'bg-red-600 text-white' : 'bg-white'}`}
                        title="Eliminar vértices"
                    >
                        <CircleX className="w-6 h-6" />
                    </button>
                </div>
            )}
    
            {/* Botón Guardar */}
            {showFormParcela &&  (
                <div className="absolute bottom-20 right-4 z-40 flex flex-col-reverse items-end gap-2">
                    <button
                        onClick={handleGuardar}
                        className="bg-green-600 text-white p-3 rounded-full shadow-md flex items-center justify-center"
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
