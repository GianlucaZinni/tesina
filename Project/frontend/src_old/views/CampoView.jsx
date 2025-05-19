import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import { Save, MapPinPlus, MapPinX } from 'lucide-react'

import { createCampo, updateCampo, deleteCampo } from '../services/campoService'
import { fetchParcelaInit } from '../services/parcelaService'
import { createBaseMap } from '../services/mapService'
import { PARCELA_STYLES } from '../services/parcelaService'

export default function CampoView() {
    const [loading, setLoading] = useState(true)
    const [campos, setCampos] = useState({})
    const [parcelas, setParcelas] = useState({})
    const [formData, setFormData] = useState({ campo_id: '', nombre: '', descripcion: '', lat: '', lon: '' })
    const [center, setCenter] = useState({ lat: -36.7916906190708, lon: -64.31396484375 })
    const [showFormCampo, setshowFormCampo] = useState(false)
    const [selectorOpen, setSelectorOpen] = useState(false)

    const markerRef = useRef(null)
    const parcelasLayerRef = useRef([])
    const mapRef = useRef(null)
    const selectorRef = useRef(null)

    const navigate = useNavigate()

    const mapIcon = L.icon({
        iconUrl: '/dist/map_pin.svg',
        iconSize: [32, 56], // 34.89/20 x 32 = 56
        iconAnchor: [16, 56],
        popupAnchor: [0, -28]
    });    

    const crearRipple = (event) => {
        const ripple = document.createElement('div');
        ripple.className = 'ripple-effect';
        ripple.style.left = `${event.clientX}px`;
        ripple.style.top = `${event.clientY}px`;
    
        document.body.appendChild(ripple);
    
        setTimeout(() => {
            ripple.remove();
        }, 600); // Tiempo para eliminar el ripple
    } 

    useEffect(() => {
        fetchParcelaInit().then(data => {
            setCampos(data.campos)
            setParcelas(data.parcelas)
            setCenter(data.center)

            const preferidoId = data.campo_preferido_id
            const preferido = preferidoId ? data.campos[preferidoId] : null

            if (preferido) {
                setFormData({
                    campo_id: preferidoId,
                    nombre: preferido.nombre,
                    descripcion: preferido.descripcion || '',
                    lat: preferido.lat,
                    lon: preferido.lon
                })
            }

            setLoading(false)
        })
    }, [])

    useEffect(() => {
        if (loading) return

        const map = createBaseMap('map', [center.lat, center.lon])
        mapRef.current = map

        map.on('click', (e) => {

            // Crear animación ripple
            crearRipple(e.originalEvent);

            const { lat, lng } = e.latlng
            setFormData(prev => ({ ...prev, lat, lon: lng }))
            if (markerRef.current) map.removeLayer(markerRef.current)
            markerRef.current = L.marker([lat, lng], { icon: mapIcon }).addTo(map)
        })

        if (formData.campo_id) {
            const campo = campos[formData.campo_id]
            if (campo) {
                pintarMarcador(campo)
                pintarParcelas(formData.campo_id)
            }
        }
    }, [loading])

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
    

    const pintarParcelas = (campoId) => {
        const map = mapRef.current
        const lista = parcelas[campoId] || []

        limpiarParcelas()

        const nuevas = []
        lista.forEach(p => {
            const layer = L.geoJSON(p, {
                style: PARCELA_STYLES.base
            }).addTo(map)
            nuevas.push(layer)
        })

        parcelasLayerRef.current = nuevas
    }

    const handleCampoChangeManual = (campoId) => {
        const campo = campos[campoId]
        if (campo) {
            setFormData({
                campo_id: campoId,
                nombre: campo.nombre,
                descripcion: campo.descripcion || '',
                lat: campo.lat,
                lon: campo.lon
            })
            pintarMarcador(campo)
            pintarParcelas(campoId)
            if (mapRef.current) {
                mapRef.current.setView([campo.lat, campo.lon], 15)
            }
        }
    }
    

    const limpiarParcelas = () => {
        const map = mapRef.current
        parcelasLayerRef.current.forEach(l => map.removeLayer(l))
        parcelasLayerRef.current = []
    }

    const pintarMarcador = (campo) => {
        const latlng = [campo.lat, campo.lon]
        if (mapRef.current) mapRef.current.setView(latlng, 15)
        if (markerRef.current) mapRef.current.removeLayer(markerRef.current)
        markerRef.current = L.marker(latlng, { icon: mapIcon }).addTo(mapRef.current)
    }

    const handleChange = (e) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))

        if (name === 'campo_id') {
            const campo = campos[value]
            if (campo) {
                setFormData({
                    campo_id: value,
                    nombre: campo.nombre,
                    descripcion: campo.descripcion || '',
                    lat: campo.lat,
                    lon: campo.lon
                })
                pintarMarcador(campo)
                pintarParcelas(value)
            } else {
                setFormData({ campo_id: '', nombre: '', descripcion: '', lat: '', lon: '' })
                limpiarParcelas()
                if (markerRef.current) mapRef.current.removeLayer(markerRef.current)
            }
        }
    }

    const handleGuardar = async () => {
        const { campo_id, nombre, descripcion, lat, lon } = formData
        if (!nombre || !descripcion || !lat || !lon) {
            alert('Todos los campos son obligatorios.')
            return
        }
    
        try {
            if (campo_id) {
                await updateCampo(campo_id, { nombre, descripcion, lat, lon })
            } else {
                await createCampo({ nombre, descripcion, lat, lon })
            }
    
            const data = await fetchParcelaInit()
            setCampos(data.campos)
            setParcelas(data.parcelas)
    
            const idActualizado = campo_id || Object.keys(data.campos).pop() // Si fue creación, último ID agregado
            const campoActualizado = data.campos[idActualizado]
    
            if (campoActualizado) {
                setFormData({
                    campo_id: idActualizado,
                    nombre: campoActualizado.nombre,
                    descripcion: campoActualizado.descripcion || '',
                    lat: campoActualizado.lat,
                    lon: campoActualizado.lon
                })
    
                if (mapRef.current) {
                    const latlng = [campoActualizado.lat, campoActualizado.lon]
                    mapRef.current.setView(latlng, 15)
                    if (markerRef.current) mapRef.current.removeLayer(markerRef.current)
                    markerRef.current = L.marker(latlng, { icon: mapIcon }).addTo(mapRef.current)
                }
    
                limpiarParcelas()
                pintarParcelas(idActualizado)
            }
    
        } catch (err) {
            console.error('Error al guardar campo:', err)
        }
    }
    

    const handleEliminar = async () => {
        if (!formData.campo_id) return
        const confirmar = window.confirm("¿Estás seguro que querés eliminar este campo?")
        if (!confirmar) return

        try {
            await deleteCampo(formData.campo_id)
            const data = await fetchParcelaInit()
            setCampos(data.campos)
            setParcelas(data.parcelas)
            setFormData({ campo_id: '', nombre: '', descripcion: '', lat: '', lon: '' })
            limpiarParcelas()
            if (markerRef.current) mapRef.current.removeLayer(markerRef.current)
        } catch (err) {
            console.error("Error al eliminar campo:", err)
        }
    }

    return (
        <div className="relative w-full h-screen overflow-hidden">
            {/* Mapa */}
            <div id="map" className="absolute inset-0 z-0" />
    
            <div className="absolute top-4 left-4 z-40 flex flex-row-reverse items-end gap-2">
                {/* Botón de eliminar */}
                {formData.campo_id && (
                    <button
                        onClick={handleEliminar}
                        className="bg-white p-3 rounded-full shadow-md flex items-center justify-center"
                        title="Eliminar campo"
                    >
                        <MapPinX className="w-6 h-6" />
                    </button>
                )}

                <button 
                        className="bg-white p-3 rounded-full shadow-md flex items-center justify-center transition-all duration-300" 
                        onClick={() => setshowFormCampo(prev => !prev)}
                    >
                    <MapPinPlus className="w-6 h-6" />
                </button>
            </div>

            {/* Panel de Formulario flotante */}
            <div
                style={{top:"4.5rem"}} className={`absolute left-4 right-4 md:left-4 md:right-auto md:w-[350px] bg-white/60 rounded-2xl shadow-lg p-2 z-10 overflow-y-auto max-h-[90%] max-w-[70%] flex flex-col gap-2 transform transition-all duration-500 ${showFormCampo ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
            >
                <div className="flex flex-col gap-1">
                    <label className="block font-medium text-xs">Seleccionar campo existente</label>
                    <select
                        name="campo_id"
                        value={formData.campo_id}
                        onChange={handleChange}
                        className="form-select w-full border p-1 rounded-full text-xs bg-white/70"
                    >
                        <option value="">-- Crear nuevo campo --</option>
                        {Object.entries(campos).map(([id, campo]) => (
                            <option key={id} value={id}>{campo.nombre}</option>
                        ))}
                    </select>
                </div>
    
                <div className="flex flex-col gap-1">
                    <label className="block font-medium text-xs">Nombre del campo</label>
                    <input
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        className="w-full border p-1 rounded-full text-xs bg-white/70"
                    />
                </div>
    
                <div className="flex flex-col gap-1">
                    <label className="block font-medium text-xs">Descripción del campo</label>
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
                            <span className="text-xs text-gray-300">Campo seleccionado</span>
                            <span className="text-sm">{campos[formData.campo_id]?.nombre || 'Seleccionar campo'}</span>
                        </div>
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

            {/* Botón de guardar */}
            <div className="absolute bottom-20 right-4 z-40 flex flex-col-reverse items-end gap-1">
                <button
                    onClick={handleGuardar}
                    className="bg-white p-3 rounded-full shadow-md flex items-center justify-center"
                    title="Guardar campo"
                >
                    <Save className="w-6 h-6" />
                </button>
            </div>
        </div>
    )
    
}
