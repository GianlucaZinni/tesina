import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    MapPinPlusInside,
    Save,
    ChevronDown,
    CircleX,
    MapPinMinusInside,
    MapPin,
    X
} from 'lucide-react'

import {
    fetchParcelaInit,
    createParcela,
    updateParcela,
    deleteParcela
} from '../services/parcelaService.js'

import { createBaseMap, fromLonLat } from '../services/mapService.js'
import { usePolygonTools } from '../hooks/polygonTools'
import DrawToolPanel from '../components/DrawToolPanel.jsx'
import { calculatePolygonAreaFromGeometry } from '../utils/geometry'

import GeoJSON from 'ol/format/GeoJSON'
import VectorSource from 'ol/source/Vector'
import VectorLayer from 'ol/layer/Vector'
import { PARCELA_STYLES } from '../constants/styles'

import { polygonGlobals } from '../hooks/polygonTools/general'

export default function ParcelaView() {
    const [loading, setLoading] = useState(true)
    const [campos, setCampos] = useState({})
    const [parcelas, setParcelas] = useState({})
    const [center, setCenter] = useState({ lat: -36.79, lon: -64.31 })
    const [formData, setFormData] = useState({
        campo_id: '',
        parcela_id: '',
        nombre: '',
        descripcion: ''
    })
    const [isDeleteMode, setIsDeleteMode] = useState(false)
    const [drawPanelOpen, setDrawPanelOpen] = useState(false)
    const [showFormParcela, setShowFormParcela] = useState(false)
    const [areaCampo, setAreaCampo] = useState(0)
    const [areaParcela, setAreaParcela] = useState(0)
    const [selectorOpen, setSelectorOpen] = useState(false)
    const [drawFinished, setDrawFinished] = useState(false)

    const mapRef = useRef(null)
    const selectorRef = useRef(null)
    const parcelasLayer = useRef([])
    const clickHandlerRef = useRef(null)

    const navigate = useNavigate()

    const {
        enableDraw,
        disableDraw,
        cancelDraw,
        endPolygon,
        removeLastPoint,
        canFinish,
        closedBySnap,
        firstVertexDraw,
        activateDeleteMode,
        disableDeleteMode,
        activateEditMode,
        clearEdit,
        getEditedFeature,
        getCreatedFeature,
        polygonMode
    } = usePolygonTools(
        mapRef,
        () => {
            const geometry = getEditedFeature()?.getGeometry()
            const area = calculatePolygonAreaFromGeometry(geometry)
            setAreaParcela(area)
        }
    )

    useEffect(() => {
        polygonGlobals.onFinishCallback.current = (feature) => {
            if (feature) {
                setDrawFinished(true)
                setDrawPanelOpen(true)
                activateEditMode(feature)
                setFormData(prev => ({
                    ...prev,
                    parcela_id: ''
                }))
    
                const geometry = feature.getGeometry()
                if (geometry) {
                    const area = calculatePolygonAreaFromGeometry(geometry)
                    setAreaParcela(area)
                }
            }
        }
    }, [])

    useEffect(() => {
        async function init() {
            const data = await fetchParcelaInit()
            setCampos(data.campos)
            setParcelas(data.parcelas)
            setCenter(data.center)

            const defaultCampo =
                data.campo_preferido_id || Object.keys(data.campos)[0]
            setFormData({
                campo_id: defaultCampo,
                parcela_id: '',
                nombre: '',
                descripcion: ''
            })

            setLoading(false)
        }
        init()

        return () => {
            if (clickHandlerRef.current && mapRef.current) {
                mapRef.current.un('click', clickHandlerRef.current)
                clickHandlerRef.current = null
            }
        }
    }, [])

    useEffect(() => {
        const mapDiv = document.getElementById('map')
        if (!mapDiv) return

        if (polygonGlobals.modeRef.current === 'draw') {
            mapDiv.classList.add('cursor-draw')
        } else {
            mapDiv.classList.remove('cursor-draw')
        }
    }, [polygonGlobals.modeRef.current])

    useEffect(() => {
        if (loading || mapRef.current) return

        const map = createBaseMap('map', [center.lat, center.lon])
        mapRef.current = map
    }, [loading])

    useEffect(() => {
        if (!formData.campo_id || !mapRef.current) return
        pintarParcelas()
    }, [formData.campo_id, formData.parcela_id, parcelas])

    const pintarParcelas = () => {
        const map = mapRef.current
        clearEdit()
        parcelasLayer.current.forEach((layer) => map.removeLayer(layer))
        parcelasLayer.current = []

        if (clickHandlerRef.current) {
            map.un('click', clickHandlerRef.current)
        }

        const handler = (e) => {
            if (polygonGlobals.modeRef.current === 'draw') return

            const createdFeature = getCreatedFeature()
            if (createdFeature && createdFeature.getGeometry()?.intersectsCoordinate(e.coordinate)) {
                clearEdit()
                activateEditMode(createdFeature)
                return
            }

            map.forEachFeatureAtPixel(e.pixel, (feature) => {
                const createdFeature = getCreatedFeature()
                if (createdFeature && createdFeature.getGeometry()?.intersectsCoordinate(e.coordinate)) {
                    clearEdit()
                    activateEditMode(createdFeature)
                    return
                }
                if (!feature || !feature.getGeometry()) return
                const type = feature.getGeometry().getType()
                if (type !== 'Polygon' && type !== 'MultiPolygon') return

                const id = feature.getId() || feature.get('parcela_id')
                const campoId = formData.campo_id
                const parcela = (parcelas[campoId] || []).find(p => p.id == id)
                if (!parcela) return

                setFormData({
                    campo_id: campoId,
                    parcela_id: parcela.id,
                    nombre: parcela.nombre || '',
                    descripcion: parcela.descripcion || ''
                })

                try {
                    const clone = feature.clone()
                    clone.setId(parcela.id)
                    activateEditMode(clone)
                } catch (err) {
                    console.error('Error al clonar feature o activar edición:', err)
                }
            })
        }

        map.on('click', handler)
        clickHandlerRef.current = handler

        const parcelasDelCampo = parcelas[formData.campo_id] || []
        let areaTotal = 0
        const format = new GeoJSON()

        if (formData.parcela_id === '' || formData.parcela_id === 'temporal') {
            parcelasDelCampo.forEach((parcela) => {
                let feature
                try {
                    feature = format.readFeature(parcela, {
                        featureProjection: 'EPSG:3857'
                    })
                } catch (err) {
                    console.error('Error al leer feature GeoJSON:', err, parcela)
                    return
                }
                if (!feature.getGeometry()) return

                feature.setId(parcela.id)
                const source = new VectorSource({ features: [feature] })
                const layer = new VectorLayer({
                    source,
                    style: PARCELA_STYLES.base
                })
                layer.set('parcela_id', parcela.id)
                map.addLayer(layer)
                parcelasLayer.current.push(layer)

                const geom = feature.getGeometry()
                const area = calculatePolygonAreaFromGeometry(geom)
                areaTotal += area
            })

            setAreaCampo(areaTotal)
            setAreaParcela(0)
        } else {
            const seleccionada = parcelasDelCampo.find(
                (p) => p.id == formData.parcela_id
            )
            if (seleccionada) {
                let feature
                try {
                    feature = format.readFeature(seleccionada, {
                        featureProjection: 'EPSG:3857'
                    })
                } catch (err) {
                    console.error('Error al leer feature seleccionada:', err)
                    return
                }

                if (!feature.getGeometry()) return

                feature.setId(seleccionada.id)
                activateEditMode(feature)

                const geom = feature.getGeometry()
                const area = calculatePolygonAreaFromGeometry(geom)
                setAreaParcela(area)
            }
        }
    }

    const getFeatureForSave = () => {
        return polygonGlobals.modeRef.current === 'edit'
            ? getEditedFeature()
            : getCreatedFeature()
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        if (name === 'campo_id') {
            const campo = campos[value]
            if (campo && mapRef.current) {
                mapRef.current
                    .getView()
                    .setCenter(fromLonLat([campo.lon, campo.lat]))
            }
            setFormData({
                campo_id: value,
                parcela_id: '',
                nombre: '',
                descripcion: ''
            })
            setAreaParcela(0)
        } else {
            setFormData((prev) => ({ ...prev, [name]: value }))
        }
    }
    
    const handleGuardar = async () => {
        if (!formData.campo_id || !formData.nombre) {
            alert('Todos los campos son obligatorios.')
            return
        }
        const feature = getFeatureForSave()
        if (!feature) {
            alert('Debe crear o seleccionar una parcela.')
            return
        }
    
        const format = new GeoJSON()
        const cloned = feature.clone()
        cloned.getGeometry().transform('EPSG:3857', 'EPSG:4326')
        const geojson = format.writeFeatureObject(cloned, {
            featureProjection: 'EPSG:4326'
        })
    
        try {
            if (formData.parcela_id && formData.parcela_id !== 'temporal') {
                await updateParcela(
                    formData.parcela_id,
                    geojson,
                    formData.nombre,
                    formData.descripcion
                )
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
            setFormData((prev) => ({
                ...prev,
                parcela_id: '',
                nombre: '',
                descripcion: ''
            }))
            setIsDeleteMode(false)
            setDrawFinished(false)
            setDrawPanelOpen(false)
            setAreaParcela(0)
            clearEdit()
            disableDraw()
        } catch (err) {
            console.error('Error al guardar:', err)
        }
    }
    
    const handleEliminar = async () => {
        if (!formData.parcela_id || formData.parcela_id === 'temporal') return
        if (!window.confirm('¿Estás seguro que querés eliminar esta parcela?')) return
    
        try {
            await deleteParcela(formData.parcela_id)
            const data = await fetchParcelaInit()
            setParcelas(data.parcelas)
            setFormData((prev) => ({
                ...prev,
                parcela_id: '',
                nombre: '',
                descripcion: ''
            }))
            setAreaParcela(0)
        } catch (err) {
            console.error('Error al eliminar parcela:', err)
        }
    }

    const handleFinishDraw = () => {
        endPolygon()
        setDrawFinished(true)
        setDrawPanelOpen(true)
    }
    
    const handleCancelDraw = () => {
        cancelDraw()
        clearEdit()
        setDrawFinished(false)
        setDrawPanelOpen(false)
    }
    
    const handleCancelEdit = () => {
        clearEdit()
        disableDeleteMode()
        setIsDeleteMode(false)
        setDrawFinished(false)
        setDrawPanelOpen(false)
        setFormData(prev => ({
            ...prev,
            parcela_id: '',
            nombre: '',
            descripcion: ''
        }))
        setAreaParcela(0)
    }
    
    const handleDeleteModeToggle = () => {
        setIsDeleteMode((prev) => !prev)
        if (!isDeleteMode) activateDeleteMode()
        else disableDeleteMode()
    }

    if (loading) return <div className="p-4">Cargando mapa...</div>

    return (
        <div className="relative w-full h-screen overflow-hidden">
            <div id="map" className="relative z-0 w-full h-full" />

            {/* Botones en la esquina superior izquierda */}
            <div className="absolute top-4 left-4 z-40 flex flex-row-reverse items-end gap-2">
                {formData.parcela_id && (
                    <button
                        onClick={handleEliminar}
                        className="bg-white p-3 rounded-full shadow-md flex items-center justify-center"
                        title="Eliminar parcela"
                    >
                        <MapPinMinusInside className="w-6 h-6" />
                    </button>
                )}
                <button
                    className="bg-white p-3 rounded-full shadow-md transition-all duration-300"
                    onClick={() => setShowFormParcela((prev) => !prev)}
                >
                    <MapPinPlusInside className="w-6 h-6" />
                </button>
            </div>

            {/* Formulario lateral */}
            <div
                className={`absolute top-20 left-4 right-4 md:left-4 md:right-auto md:w-[350px] bg-white/60 rounded-2xl shadow-lg p-2 z-10 overflow-y-auto max-h-[90%] max-w-[70%] flex flex-col gap-2 transform transition-all duration-500 ${showFormParcela ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
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
            </div>

            {/* Selector de campo */}
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
                                    <span className="text-sm">{formData.nombre || ''}</span>
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
                                        const c = campos[id]
                                        if (c && mapRef.current) {
                                            mapRef.current.getView().setCenter(fromLonLat([c.lon, c.lat]))
                                        }
                                        setFormData({ campo_id: id, parcela_id: '', nombre: '', descripcion: '' })
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

            {/* Botones flotantes */}
            <div className="absolute bottom-20 right-4 z-40 flex flex-col items-end space-y-2">

                {polygonMode === 'edit' && (
                    <button
                        onClick={handleDeleteModeToggle}
                        className={`p-3 rounded-full shadow-md flex items-center justify-center ${isDeleteMode ? 'bg-red-600' : 'bg-white'}`}
                        title="Eliminar vértices"
                    >
                        <CircleX className="w-6 h-6" />
                    </button>
                )}

                {polygonMode === 'edit' && formData.parcela_id !== '' && (
                    <button
                        onClick={handleCancelEdit}
                        className="bg-white p-3 rounded-full shadow-md flex items-center justify-center"
                        title="Cancelar edición"
                    >
                        <X className="w-6 h-6" />
                    </button>
                )}

                {formData.parcela_id === '' && showFormParcela && (
                    <DrawToolPanel
                        open={drawPanelOpen}
                        setOpen={setDrawPanelOpen}
                        onStart={enableDraw}
                        onFinish={handleFinishDraw}
                        onUndo={removeLastPoint}
                        onCancel={handleCancelDraw}
                        canFinish={canFinish}
                        closedBySnap={closedBySnap}
                        firstVertexDraw={firstVertexDraw}
                        finished={drawFinished}
                    />
                )}

                {(showFormParcela || formData.parcela_id !== '') && (
                    <button
                        onClick={handleGuardar}
                        className="bg-white p-3 rounded-full shadow-md flex items-center justify-center"
                        title="Guardar cambios"
                    >
                        <Save className="w-6 h-6" />
                    </button>
                )}
            </div>

        </div>
    )

}