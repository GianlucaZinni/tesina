// components/CampoSelector.jsx
import { ChevronDown, MapPin } from 'lucide-react';
import { fromLonLat } from '../services/mapService';

export default function CampoSelector({
    campos = {},
    campoId = '',
    parcelaId = '',
    parcelaNombre = '',
    areaParcela = 0,
    areaCampo = 0,
    selectorOpen = false,
    setSelectorOpen = () => { },
    onSelectCampo = () => { },
    mapRef = null,
}) {

    const handleSelect = (id) => {
        const campo = campos[id];
        if (campo && mapRef?.current) {
            mapRef.current.getView().setCenter(fromLonLat([campo.lon, campo.lat]));
        }
        onSelectCampo(id);
        setSelectorOpen(false);
    };

    return (
        <div className="relative" data-testid="campo-selector">
            <button
                onClick={() => {
                    if (!campoId) return;
                    setSelectorOpen(!selectorOpen);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-black/60 backdrop-blur-md rounded-full shadow-lg text-white font-semibold text-sm hover:bg-black/70 transition-all"
            >
                <div className="flex flex-col text-left">
                    <span className="text-xs text-gray-300">
                        {campos[campoId]?.nombre || 'Seleccionar campo'}
                    </span>
                    {parcelaId ? (
                        <div className="flex items-center gap-1">
                            <MapPin size={14} className="text-cyan-400" />
                            <span className="text-sm">{parcelaNombre}</span>
                            <span className="text-xs text-green-400 ml-2">
                                {(areaParcela / 10000).toFixed(2)} ha
                            </span>
                        </div>
                    ) : (
                        <span className="text-xs text-green-400">
                            {(areaCampo / 10000).toFixed(2)} ha
                        </span>
                    )}
                </div>
                <ChevronDown size={16} className="text-white" />
            </button>

            {selectorOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-md shadow-md text-sm overflow-hidden z-20 w-full">
                    {Object.entries(campos).map(([id, campo]) => (
                        <button
                            key={id}
                            onClick={() => handleSelect(id)}
                            disabled={id === campoId}
                            className="w-full px-4 py-2 text-left hover:bg-gray-100 disabled:text-gray-400 disabled:italic disabled:cursor-not-allowed"
                        >
                            {campo.nombre}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

import { useEffect, useRef } from 'react'
import { Compass } from 'lucide-react'

export default function CompassButton({ mapRef }) {
    const iconRef = useRef(null)
    const isDraggingRef = useRef(false)
    const centerRef = useRef({ x: 0, y: 0 })
    const startMapRotationRef = useRef(0)
    const startMouseAngleRef = useRef(0)

    const SENSITIVITY = 0.4 // Cuanto menor, más suave

    useEffect(() => {
        if (!mapRef?.current) return

        const view = mapRef.current.getView()

        const updateRotation = () => {
            const angle = view.getRotation()
            if (iconRef.current) {
                iconRef.current.style.transform = `rotate(${-angle}rad)`
            }
        }

        updateRotation()
        view.on('change:rotation', updateRotation)
        return () => view.un('change:rotation', updateRotation)
    }, [mapRef])

    const getAngleFromCenter = (x, y) => {
        const dx = x - centerRef.current.x
        const dy = centerRef.current.y - y // Invertido
        return Math.atan2(dx, dy)
    }

    const onMouseDown = (e) => {
        if (!mapRef.current) return
        isDraggingRef.current = true

        const rect = e.currentTarget.getBoundingClientRect()
        centerRef.current = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        }

        startMapRotationRef.current = mapRef.current.getView().getRotation()
        startMouseAngleRef.current = getAngleFromCenter(e.clientX, e.clientY)

        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
    }

    const onMouseMove = (e) => {
        if (!isDraggingRef.current || !mapRef.current) return

        const currentMouseAngle = getAngleFromCenter(e.clientX, e.clientY)
        const delta = currentMouseAngle - startMouseAngleRef.current

        const newRotation = startMapRotationRef.current + delta * SENSITIVITY
        mapRef.current.getView().setRotation(newRotation)
    }

    const onMouseUp = () => {
        isDraggingRef.current = false
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
    }

    const onClick = () => {
        if (!isDraggingRef.current && mapRef.current) {
            mapRef.current.getView().setRotation(0)
        }
    }

    return (
        <button
            title="Brújula"
            className="bg-white rounded-full p-3 shadow-md transition-transform select-none"
            onMouseDown={onMouseDown}
            onClick={onClick}
        >
            <img
                ref={iconRef}
                src="/dist/compass.svg"
                alt="Compass"
                className="w-6 h-6 transition-transform pointer-events-none"
            />
        </button>
    )
}

// components/DrawToolPanel.jsx
import { SplinePointer, Check, Undo, X } from 'lucide-react'

export default function DrawToolPanel({
    onFinish,
    onUndo,
    onStart,
    onCancel,
    canFinish,
    closedBySnap,
    firstVertexDraw,
    open,
    setOpen,
    finished
}) {
    const handleStartToggle = () => {
        const nextOpen = !open
        setOpen(nextOpen)
        if (nextOpen) {
            onStart?.()
        }
    }

    return (
        <>
            {/* SplinePointer: solo visible cuando está cerrado */}
            {!open && (
                <button
                    onClick={handleStartToggle}
                    className="bg-white p-3 rounded-full shadow-md flex items-center justify-center"
                    title="Dibujar polígono"
                >
                    <SplinePointer className="w-6 h-6 text-gray-800" />
                </button>
            )}

            {/* Botonera activa */}
            {open && (
                <div className="flex flex-row-reverse gap-1 items-center">
                    {/* Botón Cancel (X) */}
                    <button
                        onClick={onCancel}
                        className="bg-white p-3 rounded-full shadow-md flex items-center justify-center"
                        title="Cancelar"
                    >
                        <X className="w-6 h-6" />
                    </button>

                    {/* Check y Undo solo si no está finalizado */}
                    {!finished && (
                        <>
                            <button
                                onClick={onUndo}
                                disabled={!firstVertexDraw}
                                className={`p-3 rounded-full shadow-md flex items-center justify-center 
                                    ${firstVertexDraw
                                        ? 'bg-white text-black'
                                        : 'bg-gray-300 text-gray-400 cursor-not-allowed'
                                    }`}
                                title="Deshacer último punto"
                            >
                                <Undo className="w-6 h-6" />
                            </button>

                            <button
                                onClick={onFinish}
                                disabled={!(canFinish || closedBySnap)}
                                className={`p-3 rounded-full shadow-md flex items-center justify-center 
                                    ${canFinish || closedBySnap
                                        ? 'bg-white text-black'
                                        : 'bg-gray-300 text-gray-400 cursor-not-allowed'
                                    }`}
                                title="Finalizar dibujo"
                            >
                                <Check className="w-6 h-6" />
                            </button>
                        </>
                    )}
                </div>
            )}
        </>
    )
}

// components/FloatingButtons.jsx
import { CircleX, X, Save } from 'lucide-react';


export default function FloatingButtons({
    mode = 'edit',
    isDeleteMode = false,
    onToggleDeleteMode = () => { },
    onCancel = () => { },
    onSave = () => { },
    showDelete = true,
    showCancel = true,
    showSave = true
}) {
    if (mode !== 'edit') return null

    return (
        <>
            {showDelete && (
                <button
                    onClick={onToggleDeleteMode}
                    className={`p-3 rounded-full shadow-md flex items-center justify-center ${isDeleteMode ? 'bg-red-600' : 'bg-white'}`}
                    title="Eliminar vértices"
                >
                    <CircleX className="w-6 h-6" />
                </button>
            )}
            {showCancel && (
                <button
                    onClick={onCancel}
                    className="bg-white p-3 rounded-full shadow-md flex items-center justify-center"
                    title="Cancelar edición"
                >
                    <X className="w-6 h-6" />
                </button>
            )}
            {showSave && (
                <button
                    onClick={onSave}
                    className="bg-white p-3 rounded-full shadow-md flex items-center justify-center"
                    title="Guardar cambios"
                >
                    <Save className="w-6 h-6" />
                </button>
            )}
        </>
    )
}

// components/Footer.jsx
import { useLocation, useNavigate } from 'react-router-dom'
import { MapPin, Bell, Fence, Ruler, PawPrint } from 'lucide-react'
import FooterMenuItem from './FooterMenuItem'

export default function Footer({ setMenuOpen }) {
    const location = useLocation()
    const navigate = useNavigate()

    const handleNavigate = (path) => {
        setMenuOpen(false)   // Primero cerramos
        setTimeout(() => {
            navigate(path, { replace: true }) // Luego navegamos
        }, 100) // Un pequeño delay (100ms) para evitar que choque el re-render
    }
    

    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 z-50 bg-white border-t flex justify-around items-center">
            <FooterMenuItem label="Campos" icon={<Fence />} path="/campos" current={location.pathname} navigate={handleNavigate} />
            <FooterMenuItem label="Parcelas" icon={<Ruler />} path="/parcelas" current={location.pathname} navigate={handleNavigate} />
            <FooterMenuItem label="Mapa" icon={<MapPin />} path="/mapa" current={location.pathname} navigate={handleNavigate} />
            <FooterMenuItem label="Alertas" icon={<Bell />} path="/alertas" current={location.pathname} navigate={handleNavigate} />
            <FooterMenuItem label="Animales" icon={<PawPrint />} path="/animales" current={location.pathname} navigate={handleNavigate} />
        </div>
    )
}


// components/FooterMenuItem.jsx
export default function FooterMenuItem({ label, icon, path, current, navigate, full = false, onClick }) {
    const handleClick = () => {
        navigate(path)
        if (onClick) onClick()
    }

    return (
        <button
            onClick={handleClick}
            className={`h-full w-full flex flex-col items-center justify-center flex-1 py-1 ${current === path ? 'text-green-600 font-semibold' : 'text-gray-700'}
                        transition-all`}
        >
            {/* Ícono */}
            <span className="text-lg">{icon}</span>

            {/* Texto solo si >= 400px */}
            <span className="text-[10px] min-[400px]:block hidden leading-none">{label}</span>
        </button>
    )
}

// components/Forms.jsx
export function FormularioParcela({ campos = {}, formData = {}, onChange = () => { } }) {
    return (
        <>
            <div className="flex flex-col gap-1">
                <label className="block font-medium text-xs">Seleccionar campo</label>
                <select
                    name="campo_id"
                    value={formData.campo_id}
                    onChange={onChange}
                    className="form-select w-full border p-1 rounded-full text-xs bg-white/70"
                >
                    {Object.entries(campos).map(([id, campo]) => (
                        <option
                            key={id}
                            value={id}
                            disabled={id === formData.campo_id}
                            className={id === formData.campo_id ? 'text-gray-400 italic' : ''}
                        >
                            {campo.nombre}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-1">
                <label className="block font-medium text-xs">Nombre del área</label>
                <input
                    name="nombre"
                    value={formData.nombre}
                    onChange={onChange}
                    className="w-full border p-1 rounded-full text-xs bg-white/70"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="block font-medium text-xs">Descripción de la parcela</label>
                <input
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={onChange}
                    className="w-full border p-1 rounded-full text-xs bg-white/70"
                />
            </div>
        </>
    )
}

export function FormularioCampo({ campos = {}, formData = {}, onChange = () => { } }) {
    return (
        <>
            <div className="flex flex-col gap-1">
                <label className="block font-medium text-xs">Seleccionar campo existente</label>
                <select
                    name="campo_id"
                    value={formData.campo_id}
                    onChange={onChange}
                    className="form-select w-full border p-1 rounded-full text-xs bg-white/70"
                >
                    <option value="">-- Crear nuevo campo --</option>
                    {Object.entries(campos).map(([id, campo]) => (
                        <option
                            key={id}
                            value={id}
                            disabled={id === formData.campo_id}
                            className={id === formData.campo_id ? 'text-gray-400 italic' : ''}
                        >
                            {campo.nombre}
                        </option>
                    ))}
                </select>

            </div>

            <div className="flex flex-col gap-1">
                <label className="block font-medium text-xs">Nombre del campo</label>
                <input
                    name="nombre"
                    value={formData.nombre}
                    onChange={onChange}
                    className="w-full border p-1 rounded-full text-xs bg-white/70"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="block font-medium text-xs">Descripción del campo</label>
                <input
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={onChange}
                    className="w-full border p-1 rounded-full text-xs bg-white/70"
                />
            </div>

            <input type="hidden" name="lat" value={formData.lat} />
            <input type="hidden" name="lon" value={formData.lon} />
        </>
    )
}

// components/Header.jsx
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu } from 'lucide-react';

export default function Header({ menuOpen, setMenuOpen }) {
    const location = useLocation();
    const navigate = useNavigate();
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

    const handleNavigate = (path) => {
        setMenuOpen(false);
        setTimeout(() => {
            navigate(path, { replace: true });
        }, 100);
    };

    const stopPropagation = (e) => {
        e.stopPropagation();
    };

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setMenuOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [setMenuOpen]);

    return (
        <>
            {/* Botón hamburguesa */}
            <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
                <button onClick={() => setMenuOpen(true)} className="bg-white rounded-full p-3 shadow-md">
                    <Menu className="w-6 h-6 text-gray-800" />
                </button>
            </div>

            {/* Menú pantalla completa */}
            {menuOpen && (
                <div
                    key={windowSize.width}
                    className="fixed inset-0 bg-white/60 backdrop-blur-md z-50 transition-all duration-300 ease-in-out animate-slide-in-left"
                    onClick={() => setMenuOpen(false)}
                    
                >
                    {/* Botón cerrar */}
                    <button
                            onClick={() => setMenuOpen(false)}
                            className="absolute top-4 right-6 text-lg text-gray-700 hover:text-red-600"
                        >
                            ✕
                    </button>
                    <div
                        className="h-full w-full flex flex-col items-center justify-center px-4 text-center div-menu-button"
                        onClick={stopPropagation}
                    >

                        {/* Opciones del menú */}
                        {[
                            ['Collares', '/collares'],
                            ['Parcelas', '/parcelas'],
                            ['Mapa', '/mapa'],
                            ['Alertas', '/alertas'],
                            ['Animales', '/animales']
                        ].map(([label, path]) => (
                            <button
                                key={path}
                                onClick={() => handleNavigate(path)}
                                className="w-full text-gray-800 font-semibold hover:text-green-600 transition-all
                                    text-xl sm:text-2xl md:text-3xl lg:text-4xl menu-button"
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}

export function useMenuControl() {
    const [menuOpen, setMenuOpen] = useState(false);
    return { menuOpen, setMenuOpen };
}

// components/LateralButtons.jsx
import { Layers, LocateFixed } from 'lucide-react';
import { useEffect, useRef } from 'react';
import CompassButton from './CompassButton'

export default function LateralButtons({
    mapRef,
    onToggleLayer = () => { },
    onLocate = () => { },
}) {
    const rotateIconRef = useRef(null)

    useEffect(() => {
        if (!mapRef?.current) return
        const view = mapRef.current.getView()
        const listener = () => {
            const angle = view.getRotation()
            if (rotateIconRef.current) {
                rotateIconRef.current.style.transform = `rotate(${-angle}rad)`
            }
        }
        view.on('change:rotation', listener)
        return () => view.un('change:rotation', listener)
    }, [mapRef])

    return (
        <div style={{top:"4.5rem"}} className="absolute right-4 z-40 flex flex-col gap-2">
            <button onClick={onToggleLayer} title="Cambiar capa" className="bg-white rounded-full p-3 shadow-md">
                <Layers className="w-6 h-6 text-gray-800" />
            </button>
            <button onClick={onLocate} title="Mi ubicación" className="bg-white rounded-full p-3 shadow-md">
                <LocateFixed className="w-6 h-6 text-gray-800" />
            </button>
            <CompassButton mapRef={mapRef} />
        </div>
    )
}

// constants/styles.js
import { Style, Fill, Stroke, Circle as CircleStyle } from 'ol/style'

export const PARCELA_STYLES = {
    base: new Style({
        stroke: new Stroke({
            color: '#FFFFFF',
            width: 5
        }),
        fill: new Fill({
            color: 'rgba(255, 255, 255, 0.05)' // leve fondo claro
        })
    }),

    draw: new Style({
        stroke: new Stroke({
            color: '#FF4D00', // violeta
            width: 4,
            lineDash: [0,0,10,10]
        }),
        fill: new Fill({
            color: 'rgba(255, 77, 0, 0.2)' // violeta transparente
        })
    }),

    edit: new Style({
        stroke: new Stroke({
            color: '#00FFFF', // celeste
            width: 4,
            lineDash: [0,0,10,10]
        }),
        fill: new Fill({
            color: 'rgba(0, 255, 255, 0.15)'
        })
    }),
    
    vertexEdit: new Style({
        image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: '#00FFFF' }), // celeste
            stroke: new Stroke({ color: '#FFFFFF', width: 3 })
        })
    }),

    vertexIntermediate: new Style({
        image: new CircleStyle({
            radius: 4.5,
            fill: new Fill({ color: '#777777' }), // gris oscuro
            stroke: new Stroke({ color: '#FFFFFF', width: 2.5 }) // borde blanco
        })
    }),

    vertexDelete: new Style({
        image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: '#860000' }), 
            stroke: new Stroke({ color: '#FF0000', width: 4 }) // rojo oscuro
        })
    }),

    vertexDraw: new Style({
        image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: '#FF4D00' }), // naranja
            stroke: new Stroke({ color: '#FFFFFF', width: 3 }) // blanco
        })
    }),

    previewVertex: new Style({
        image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: '#777777' }), // gris oscuro
            stroke: new Stroke({ color: '#FFFFFF', width: 3 }) // borde blanco
        })
    }),

    previewVertexSnap: new Style({
        image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: '#FFFFFF' }), // blanco
            stroke: new Stroke({ color: '#FF4D00', width: 3 }) // naranja
        })
    }),

    previewLine: new Style({
        stroke: new Stroke({
            color: '#FF8300', // naranja
            width: 4,
            lineDash: [0,0,10,10]
        })
    })
}

import { createContext, useState } from 'react';

export const CampoContext = createContext();

export function CampoProvider({ children }) {
    const [campoSeleccionado, setCampoSeleccionado] = useState(null);

    return (
        <CampoContext.Provider value={{ campoSeleccionado, setCampoSeleccionado }}>
            {children}
        </CampoContext.Provider>
    );
}

// context/MapContext.jsx
import { createContext, useRef, useEffect, useState, useCallback } from 'react'
import { createBaseMap } from '../services/mapService'

export const MapContext = createContext(null)

export function MapProvider({ children, center = [-35.5075089029126, -60.3545349790534] }) {
    const mapRef = useRef(null)
    const [ready, setReady] = useState(false)

    // Inicializa el mapa solo si no existe y el div ya está montado
    const initMap = useCallback(() => {
        const container = document.getElementById('map')
        if (!mapRef.current && container) {
            mapRef.current = createBaseMap('map', center)
            setReady(true)
        }
    }, [center])

    // Limpia la instancia del mapa y reinicia
    const resetMap = useCallback(() => {
        const container = document.getElementById('map')
        if (container && mapRef.current) {
            mapRef.current.setTarget(null)
            mapRef.current = null
            container.innerHTML = ''
            setReady(false)
        }
        setTimeout(() => initMap(), 0)
    }, [initMap])

    // Se monta el mapa una vez
    useEffect(() => {
        initMap()
    }, [initMap])

    return (
        <MapContext.Provider value={{ mapRef, ready, resetMap }}>
            <div className="relative w-full h-screen overflow-hidden">
                <div id="map" className="absolute inset-0 z-0" />
                {ready && children}
            </div>
        </MapContext.Provider>
    )
}

// effects/ripple.js
export function crearRipple(event) {
    const ripple = document.createElement('div')
    ripple.className = 'ripple-effect'
    ripple.style.left = `${event.clientX}px`
    ripple.style.top = `${event.clientY}px`
    document.body.appendChild(ripple)
    setTimeout(() => ripple.remove(), 600)
}

// hooks/polygonTools/change.js
import { useRef } from 'react'
import { Feature } from 'ol'
import { Point, Polygon } from 'ol/geom'
import { Vector as VectorLayer } from 'ol/layer'
import { Vector as VectorSource } from 'ol/source'
import { Modify, Select } from 'ol/interaction'
import { click } from 'ol/events/condition'
import { toLonLat } from 'ol/proj'
import Overlay from 'ol/Overlay'
import { getArea as getGeodesicArea } from 'ol/sphere'

import { PARCELA_STYLES } from '../../constants/styles'

export function useChangeTool(mapRef, { setMode }, onUpdate = () => {}) {
    const editableLayer = useRef(null)
    const vertexLayer = useRef(null)
    const vertexFeatures = useRef([])
    const intermediateFeatures = useRef([])
    const isDeleteMode = useRef(false)
    const modifyInteraction = useRef(null)
    const selectInteraction = useRef(null)
    const editableFeatureRef = useRef(null)
    const areaLabelOverlay = useRef(null)

    const activateEditMode = (polygonFeature) => {
        const map = mapRef.current
        if (!map || !polygonFeature) return

        clearEdit()

        const geometry = polygonFeature.getGeometry()
        if (!geometry) return

        setMode('edit')

        let coords
        if (geometry.getType() === 'Polygon') {
            const rings = geometry.getCoordinates()
            coords = Array.isArray(rings[0]) ? rings[0] : []
        } else if (geometry.getType() === 'MultiPolygon') {
            const multi = geometry.getCoordinates()
            coords = Array.isArray(multi[0][0]) ? multi[0][0] : []
        } else {
            console.error('Tipo no soportado:', geometry.getType())
            return
        }
        if (coords.length < 3) return

        const source = new VectorSource()
        const layer = new VectorLayer({ source, style: PARCELA_STYLES.edit })
        editableLayer.current = layer
        map.addLayer(layer)

        const clone = polygonFeature.clone()
        clone.setStyle(PARCELA_STYLES.edit)
        source.addFeature(clone)
        editableFeatureRef.current = clone

        map.getLayers().forEach((l) => {
            const src = l.getSource?.()
            if (src && src.hasFeature?.(polygonFeature)) {
                src.removeFeature(polygonFeature)
            }
        })

        vertexLayer.current = new VectorLayer({
            source: new VectorSource(),
            style: null
        })
        map.addLayer(vertexLayer.current)

        const modify = new Modify({ source })
        modifyInteraction.current = modify

        const handlePointerDown = (evt) => {
            map.forEachFeatureAtPixel(evt.pixel, (feat) => {
                if (feat.get('insertAfter') !== undefined) {
                    vertexLayer.current.getSource().removeFeature(feat)
                    intermediateFeatures.current = intermediateFeatures.current.filter(f => f !== feat)
                }
            })
        }
        map.on('pointerdown', handlePointerDown)
        modifyInteraction.current._pointerDownHandler = handlePointerDown

        map.getOverlays().getArray().forEach((overlay) => {
            const el = overlay.getElement()
            if (el && el.className.includes('area-label')) {
                map.removeOverlay(overlay)
            }
        })

        const updateAreaOverlay = () => {
            const geom = clone.getGeometry()
            if (!geom || geom.getType() !== 'Polygon') return

            const coords = geom.getCoordinates()?.[0]
            if (!coords || coords.length < 3) return

            const polygon = new Polygon([coords])
            const area = getGeodesicArea(polygon, { projection: 'EPSG:3857' })

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

        modify.on('modifyend', (e) => {
            const updated = e.features.item(0)
            if (!updated) return
            const geom = updated.getGeometry()
            const newCoords = extractPolygonCoordinates(geom)
            drawVertices(newCoords)
            onUpdate(formatCoords(newCoords))
            updateAreaOverlay()
        })

        clone.getGeometry().on('change', () => {
            const geom = clone.getGeometry()
            const newCoords = extractPolygonCoordinates(geom)
            drawVertices(newCoords)
            onUpdate(formatCoords(newCoords))
            updateAreaOverlay()
        })

        map.addInteraction(modify)
        drawVertices(coords)
        onUpdate(formatCoords(coords))
        updateAreaOverlay()
    }

    const drawVertices = (coords) => {
        const map = mapRef.current
        const vSource = vertexLayer.current?.getSource()
        if (!map || !vSource || !Array.isArray(coords) || coords.length < 2) return

        vSource.clear()
        vertexFeatures.current = []
        intermediateFeatures.current = []

        const cleanCoords = coords.slice(0, -1)

        cleanCoords.forEach((coord, index) => {
            const vertex = new Feature(new Point(coord))
            vertex.set('vertexIndex', index)
            vertex.setStyle(isDeleteMode.current ? PARCELA_STYLES.vertexDelete : PARCELA_STYLES.vertexEdit)
            vSource.addFeature(vertex)
            vertexFeatures.current.push(vertex)
        })

        for (let i = 0; i < cleanCoords.length; i++) {
            const current = cleanCoords[i]
            const next = cleanCoords[(i + 1) % cleanCoords.length]
            const midpoint = [
                (current[0] + next[0]) / 2,
                (current[1] + next[1]) / 2
            ]

            const intermediate = new Feature(new Point(midpoint))
            intermediate.set('insertAfter', i)
            intermediate.setStyle(PARCELA_STYLES.vertexIntermediate)
            vSource.addFeature(intermediate)
            intermediateFeatures.current.push(intermediate)
        }
    }

    const activateDeleteMode = () => {
        const map = mapRef.current
        const source = editableLayer.current?.getSource()
        const polygon = getMainFeature()
        if (!map || !source || !polygon) return

        isDeleteMode.current = true

        const select = new Select({
            condition: click,
            layers: [vertexLayer.current],
            filter: f => f.getGeometry().getType() === 'Point'
        })

        vertexFeatures.current.forEach(vertex => {
            vertex.setStyle(PARCELA_STYLES.vertexDelete)
        })

        select.on('select', e => {
            const marker = e.selected[0]
            const index = marker?.get('vertexIndex')
            if (index === undefined) return

            const coords = getMainCoords()
            if (coords.length <= 4) return

            coords.splice(index, 1)
            coords[coords.length - 1] = coords[0]

            polygon.getGeometry().setCoordinates([coords])
            drawVertices(coords)
            onUpdate(formatCoords(coords))
        })

        selectInteraction.current = select
        map.addInteraction(select)
    }

    const disableDeleteMode = () => {
        const map = mapRef.current
        if (!map || !selectInteraction.current) return

        map.removeInteraction(selectInteraction.current)
        selectInteraction.current = null
        isDeleteMode.current = false

        vertexFeatures.current.forEach(vertex => {
            vertex.setStyle(PARCELA_STYLES.vertexEdit)
        })

        const main = getMainFeature()
        if (main) drawVertices(getMainCoords())
    }

    const clearEdit = () => {
        const map = mapRef.current
        if (!map) return

        if (editableLayer.current) {
            map.removeLayer(editableLayer.current)
            editableLayer.current = null
        }

        if (vertexLayer.current) {
            map.removeLayer(vertexLayer.current)
            vertexLayer.current = null
        }

        if (modifyInteraction.current) {
            map.removeInteraction(modifyInteraction.current)
            const h = modifyInteraction.current._pointerDownHandler
            if (h) map.un('pointerdown', h)
            modifyInteraction.current = null
        }

        if (selectInteraction.current) {
            map.removeInteraction(selectInteraction.current)
            selectInteraction.current = null
        }

        if (areaLabelOverlay.current) {
            map.removeOverlay(areaLabelOverlay.current)
            areaLabelOverlay.current = null
        }

        vertexFeatures.current = []
        intermediateFeatures.current = []
        isDeleteMode.current = false
        editableFeatureRef.current = null
        setMode(null)
    }

    const getEditedFeature = () => editableFeatureRef.current || null

    const getMainFeature = () => {
        return editableLayer.current?.getSource()?.getFeatures().find(f => f.getGeometry().getType() === 'Polygon') || null
    }

    const getMainCoords = () => {
        const feature = getMainFeature()
        return extractPolygonCoordinates(feature?.getGeometry())
    }

    const formatCoords = (coords3857) =>
        coords3857.map(coord => {
            const [lon, lat] = toLonLat(coord)
            return { lat, lng: lon }
        })

    const extractPolygonCoordinates = (geometry) => {
        if (!geometry || typeof geometry.getCoordinates !== 'function') return []

        const coords = geometry.getCoordinates()

        if (
            geometry.getType() === 'Polygon' &&
            Array.isArray(coords) &&
            Array.isArray(coords[0])
        ) {
            return coords[0]
        }

        if (
            geometry.getType() === 'MultiPolygon' &&
            Array.isArray(coords) &&
            Array.isArray(coords[0]) &&
            Array.isArray(coords[0][0])
        ) {
            return coords[0][0]
        }

        return []
    }

    return {
        activateEditMode,
        clearEdit,
        getEditedFeature,
        activateDeleteMode,
        disableDeleteMode
    }
}

// hooks/polygonTools/draw.js
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
        setMode('draw-finished')
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

// hooks/polygonTools/general.js
import { useState } from 'react'

// Refs globales para ser accedidos desde cualquier hook
export const polygonGlobals = {
    modeRef: { current: null },
    onFinishCallback: { current: null }
}

export function usePolygonGeneral() {
    const [polygonMode, setPolygonMode] = useState(null)
    const [area, setArea] = useState(0)
    const [tooltipText, setTooltipText] = useState('Click para colocar el primer vértice')

    const setMode = (value) => {
        polygonGlobals.modeRef.current = value
        setPolygonMode(value)
    }

    const resetPolygonState = () => {
        polygonGlobals.modeRef.current = null
        polygonGlobals.onFinishCallback.current = null
        setPolygonMode(null)
        setArea(0)
        setTooltipText('Click para colocar el primer vértice')
    }

    return {
        polygonMode,
        setMode,
        resetPolygonState,
        area,
        setArea,
        tooltipText,
        setTooltipText
    }
}

// hooks/polygonTools/index.js
import { usePolygonGeneral } from './general'
import { useDrawTool } from './draw'
import { useChangeTool } from './change'

export function usePolygonTools(mapRef, onUpdate = () => {}) {
    const general = usePolygonGeneral()

    const draw = useDrawTool(mapRef, {
        setMode: general.setMode,
        setArea: general.setArea,
        setTooltipText: general.setTooltipText
    })

    const edit = useChangeTool(mapRef, {
        setMode: general.setMode,
    }, 
    onUpdate)

    return {
        ...general,
        ...draw,
        ...edit
    }
}

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
        setFeaturesOnMap
    }
}

// hooks/useMarkerGps.js
import { toLonLat, fromLonLat } from 'ol/proj';
import { useRef } from 'react';

import { createMapMarker } from '../utils/mapIcon';
import { crearRipple } from '../effects/ripple';


export function useMarkerGps(mapRef) {
    const markerLayerRef = useRef(null)

    const colocarMarcadorGps = (e, setFormData) => {
        if (!mapRef.current || !e?.coordinate) return
        crearRipple(e.originalEvent)

        const coord = e.coordinate
        const [lon, lat] = toLonLat(coord)
        setFormData(prev => ({ ...prev, lat, lon }))

        if (markerLayerRef.current) {
            mapRef.current.removeLayer(markerLayerRef.current)
        }

        const { layer } = createMapMarker(coord)
        markerLayerRef.current = layer
        mapRef.current.addLayer(layer)
    }

    const moverMarcadorGps = (lon, lat) => {
        if (!mapRef.current) return

        const newCoord = fromLonLat([lon, lat])
        const currentFeature = markerLayerRef.current?.getSource()?.getFeatures()?.[0]
        const currentCoord = currentFeature?.getGeometry()?.getCoordinates()

        const isSame = currentCoord &&
            Math.abs(currentCoord[0] - newCoord[0]) < 0.001 &&
            Math.abs(currentCoord[1] - newCoord[1]) < 0.001

        if (isSame) return

        if (markerLayerRef.current) {
            mapRef.current.removeLayer(markerLayerRef.current)
        }

        const { layer } = createMapMarker(newCoord)
        markerLayerRef.current = layer
        mapRef.current.addLayer(layer)
    }

    const limpiarMarcadorGps = () => {
        if (markerLayerRef.current && mapRef.current) {
            mapRef.current.removeLayer(markerLayerRef.current);
            markerLayerRef.current = null;
        }
    };

    return { colocarMarcadorGps, moverMarcadorGps, limpiarMarcadorGps, markerLayerRef };

}

// hooks/useViewCleanup.js
import { useEffect } from 'react'

export default function useViewCleanup(callback) {
    useEffect(() => {
        return () => {
            if (typeof callback === 'function') {
                callback()
            }
        }
    }, [])
}

// services/campoService.js
export async function createCampo(payload) {
    const res = await fetch('/config/api/campos/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })

    if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Error al crear campo')
    }

    return await res.json()
}

export async function updateCampo(id, payload) {
    const res = await fetch(`/config/api/campos/${id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })

    if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Error al actualizar campo')
    }

    return await res.json()
}

export async function deleteCampo(id) {
    const res = await fetch(`/config/api/campos/${id}/delete`, {
        method: 'DELETE'
    })
    if (!res.ok) throw new Error('Error al eliminar el campo')
    return await res.json()
}

// services/mapService.js
import 'ol/ol.css';

import { Feature } from 'ol';
import { mouseOnly } from 'ol/events/condition';
import { Polygon } from 'ol/geom';
import { defaults as defaultInteractions } from 'ol/interaction';
import DragRotate from 'ol/interaction/DragRotate';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import Map from 'ol/Map';
import { fromLonLat as olFromLonLat, toLonLat as olToLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import { Fill, Stroke, Style } from 'ol/style';
import View from 'ol/View';


// VectorLayers dinámicos usados para limpiar el mapa
const vectorLayers = []

// Referencias globales para alternar capas base
let osmLayer = null
let esriSatLayer = null

/**
 * Borra una capa vectorial específica
 */
export function clearDrawnLayer(layerRef) {
    if (layerRef?.value && layerRef.map) {
        layerRef.map.removeLayer(layerRef.value)
        layerRef.value = null
    }
}

/**
 * Crea el mapa base con capas OSM y Satélite (ESRI).
 * @param {string} containerId - ID del contenedor del mapa
 * @param {[number, number]} centerCoords - Coordenadas [lat, lon]
 * @returns {ol/Map}
 */
export function createBaseMap(containerId, [lat, lon]) {
    osmLayer = new TileLayer({
        source: new OSM(),
        visible: false,
        title: 'OSM Base',
        preload: Infinity
    })
    
    esriSatLayer = new TileLayer({
        source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            attributions: 'UB © Satélite'
        }),
        visible: true,
        title: 'ESRI Sat',
        preload: Infinity
    })
    

    const map = new Map({
        target: containerId,
        layers: [esriSatLayer, osmLayer],
        view: new View({
            center: olFromLonLat([lon, lat]),
            zoom: 15,
            maxZoom: 17,
            minZoom: 4,
            rotation: 0,
            constrainRotation: false,
        }),
        controls: [],
        interactions: defaultInteractions().extend([
            new DragRotate({
                condition: (event) => {
                    return mouseOnly(event) && event.originalEvent.button === 1
                }
            })
        ])
    })

    window._ol_map_instance = map
    window.osm = osmLayer
    window.esriSat = esriSatLayer

    return map
}

/**
 * Transforma coordenadas de [lon, lat] a proyección del mapa
 */
export function fromLonLat([lon, lat]) {
    return olFromLonLat([lon, lat])
}

/**
 * Transforma coordenadas desde la proyección del mapa a [lon, lat]
 */
export function toLonLat([x, y]) {
    return olToLonLat([x, y])
}

/**
 * Crea un Feature tipo Polygon desde coordenadas lon/lat.
 */
export function createPolygonFromCoords(coords) {
    const transformed = coords.map(([lon, lat]) => olFromLonLat([lon, lat]))
    const closed = [...transformed, transformed[0]] // Aseguramos cierre
    const polygon = new Polygon([closed])
    return new Feature({ geometry: polygon })
}

/**
 * Agrega una Feature (ej. parcela) al mapa como capa vectorial
 */
export function addParcelaToMap(map, feature, style = null) {
    const vectorSource = new VectorSource({ features: [feature] })
    const vectorLayer = new VectorLayer({
        source: vectorSource,
        style: style || new Style({
            stroke: new Stroke({ color: '#3388ff', width: 5 }),
            fill: new Fill({ color: 'rgba(0,0,0,0)' })
        })
    })
    map.addLayer(vectorLayer)
    vectorLayers.push(vectorLayer)
    return vectorLayer
}

/**
 * Limpia todas las capas vectoriales dinámicas (parcelas, áreas, etc.)
 */
export function clearVectorLayers(map) {
    vectorLayers.forEach(layer => map.removeLayer(layer))
    vectorLayers.length = 0
}

/**
 * Centra el mapa en una feature (por ejemplo, una parcela)
 */
export function fitMapToFeature(map, feature) {
    const geometry = feature.getGeometry()
    const size = map.getSize()
    if (geometry && size) {
        map.getView().fit(geometry, {
            size,
            padding: [40, 40, 40, 40],
            maxZoom: 18
        })
    }
}

/**
 * Cambia entre capa base satélite y OSM
 */
export function toggleBaseLayer(map) {
    if (!osmLayer || !esriSatLayer) return

    const osmVisible = osmLayer.getVisible()
    osmLayer.setVisible(!osmVisible)
    esriSatLayer.setVisible(osmVisible)
}

// services/parcelaService.js
export async function fetchParcelaInit() {
    const res = await fetch('/config/api/parcelas/init')
    if (!res.ok) throw new Error('Error al cargar datos')
    return await res.json()
}

export async function createParcela(payload) {
    const res = await fetch('/config/api/parcelas/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })

    if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Error al guardar')
    }

    return await res.json()
}

export async function updateParcela(id, geojson, nombre = '', descripcion = '', area) {
    const res = await fetch(`/config/api/parcelas/${id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geojson, nombre, descripcion, area }),
    })

    if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Error al actualizar')
    }

    return await res.json()
}

export async function deleteParcela(id) {
    const res = await fetch(`/config/api/parcelas/${id}/delete`, {
        method: 'DELETE'
    })
    if (!res.ok) throw new Error('Error al eliminar la parcela')
    return await res.json()
}

// utils/geometry.js
import { getArea as getGeodesicArea } from 'ol/sphere'

export function calculatePolygonAreaFromGeometry(geometry) {
    if (!geometry) return 0
    try {
        return getGeodesicArea(geometry, { projection: 'EPSG:3857' }) // ya está en la proyección correcta
    } catch {
        return 0
    }
}

// utils/mapIcon.js
import { Feature } from 'ol'
import Point from 'ol/geom/Point'
import Style from 'ol/style/Style'
import Icon from 'ol/style/Icon'
import VectorSource from 'ol/source/Vector'
import VectorLayer from 'ol/layer/Vector'

export function createMapMarker(coord3857) {
    const marker = new Feature({
        geometry: new Point(coord3857)
    })

    marker.setStyle(
        new Style({
            image: new Icon({
                src: '/dist/map_pin.svg',
                anchor: [0.5, 1],
                scale: 1,
            })
        })
    )

    const source = new VectorSource({
        features: [marker]
    })

    const layer = new VectorLayer({
        source: source
    })

    return { feature: marker, layer }
}

// views/CampoView.jsx
import { Save, MapPinPlus, MapPinX } from 'lucide-react';
import { useEffect, useState, useRef, useContext } from 'react';

import { createCampo, updateCampo, deleteCampo } from '../services/campoService';
import { toggleBaseLayer, fromLonLat } from '../services/mapService';
import { fetchParcelaInit } from '../services/parcelaService';
import LateralButtons from '../components/LateralButtons';
import CampoSelector from '../components/CampoSelector';
import { FormularioCampo } from '../components/Forms';
import { useMarkerGps } from '../hooks/useMarkerGps';
import { MapContext } from '../context/MapContext';
import { CampoContext } from '../context/CampoContext';
import { useMapParcelas } from '../hooks/useMapParcelas';
import useViewCleanup from '../hooks/useViewCleanup';

export default function CampoView() {
    const [loading, setLoading] = useState(true);
    const [campos, setCampos] = useState({});
    const [parcelas, setParcelas] = useState({});
    const [formData, setFormData] = useState({ campo_id: '', nombre: '', descripcion: '', lat: '', lon: '' });
    const [center, setCenter] = useState({ lat: -36.79, lon: -64.31 });
    const [showFormCampo, setShowFormCampo] = useState(false);
    const [selectorOpen, setSelectorOpen] = useState(false);
    const [areaCampo, setAreaCampo] = useState(0);

    const { campoSeleccionado, setCampoSeleccionado } = useContext(CampoContext);
    const { mapRef, ready } = useContext(MapContext);

    const { colocarMarcadorGps, moverMarcadorGps, limpiarMarcadorGps } = useMarkerGps(mapRef);

    const { setFeaturesOnMap } = useMapParcelas({
        mapRef,
        parcelas,
        formData,
        clearEdit: () => { },
        activateEditMode: () => { },
        getCreatedFeature: () => null,
        setFormData,
        setAreaCampo,
        setAreaParcela: () => { },
        enabled: true,
        modoVisualizacionCampo: true
    });

    useViewCleanup(() => {
        limpiarMarcadorGps();
    });

    useEffect(() => {
        async function init() {
            const data = await fetchParcelaInit();
            setCampos(data.campos);
            setParcelas(data.parcelas);
            setCenter(data.center);

            const preferidoId = data.campo_preferido_id || Object.keys(data.campos)[0];
            const preferido = data.campos[preferidoId];
            const idUsar = campoSeleccionado || preferidoId;

            if (preferido) {
                setCampoSeleccionado(idUsar);
                const campo = data.campos[idUsar];
                setFormData({
                    campo_id: idUsar,
                    nombre: campo.nombre,
                    descripcion: campo.descripcion || '',
                    lat: campo.lat,
                    lon: campo.lon
                });
            }
            setLoading(false);
        }
        init();
    }, []);

    useEffect(() => {
        if (formData.lat && formData.lon && ready && mapRef.current) {
            moverMarcadorGps(formData.lon, formData.lat);
        }
    }, [formData.lat, formData.lon, ready]);

    useEffect(() => {
        if (!ready || !mapRef.current) return;
        const map = mapRef.current;
        const handler = (e) => colocarMarcadorGps(e, setFormData);
        map.on('click', handler);

        if (formData.lat && formData.lon) {
            moverMarcadorGps(formData.lon, formData.lat);
        }

        return () => {
            map.un('click', handler);
        };
    }, [ready]);

    useEffect(() => {
        if (!ready || !formData.campo_id) return;
        setFeaturesOnMap();
    }, [ready, formData.campo_id, parcelas]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'campo_id') {
            setCampoSeleccionado(value); // ✅ actualiza el contexto también
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGuardar = async () => {
        const { campo_id, nombre, descripcion, lat, lon } = formData;
        if (!nombre || !descripcion || !lat || !lon) {
            alert('Todos los campos son obligatorios.');
            return;
        }
        try {
            if (campo_id) await updateCampo(campo_id, { nombre, descripcion, lat, lon });
            else await createCampo({ nombre, descripcion, lat, lon });
            centrarCampo({ lon, lat, nombre, descripcion });
        } catch (err) {
            console.error('Error al guardar campo:', err);
        }
    };

    const centrarCampo = (campo) => {
        if (!mapRef.current) return;
        const coord = fromLonLat([campo.lon, campo.lat]);
        mapRef.current.getView().animate({ center: coord, zoom: 15, duration: 500 });
        moverMarcadorGps(campo.lon, campo.lat);
    };

    const handleEliminar = async () => {
        if (!formData.campo_id) return;
        if (!window.confirm('¿Eliminar este campo?')) return;

        try {
            await deleteCampo(formData.campo_id);
            const data = await fetchParcelaInit();
            setCampos(data.campos);
            setParcelas(data.parcelas);
            setFormData({ campo_id: '', nombre: '', descripcion: '', lat: '', lon: '' });
            limpiarMarcadorGps();
        } catch (err) {
            console.error('Error al eliminar campo:', err);
        }
    };

    if (loading) return <div className="p-4">Cargando mapa...</div>;

    return (
        <>
            {mapRef.current && (
                <LateralButtons
                    mapRef={mapRef}
                    onToggleLayer={() => toggleBaseLayer(mapRef.current)}
                    onLocate={() => {
                        if (navigator.geolocation && mapRef.current) {
                            navigator.geolocation.getCurrentPosition(pos => {
                                const coords = fromLonLat([pos.coords.longitude, pos.coords.latitude]);
                                mapRef.current.getView().animate({ center: coords, zoom: 16 });
                            });
                        }
                    }}
                />
            )}

            <div className="absolute top-4 left-4 z-40 flex flex-row-reverse items-end gap-2">
                {formData.campo_id && (
                    <button onClick={handleEliminar} title="Eliminar campo" className="bg-white p-3 rounded-full shadow-md">
                        <MapPinX className="w-6 h-6" />
                    </button>
                )}
                <button onClick={() => setShowFormCampo(p => !p)} title="Mostrar formulario" className="bg-white p-3 rounded-full shadow-md">
                    <MapPinPlus className="w-6 h-6" />
                </button>
            </div>

            <div
                className={`absolute top-20 left-4 right-4 md:left-4 md:right-auto md:w-[350px] bg-white/60 rounded-2xl shadow-lg p-2 z-10 overflow-y-auto max-h-[90%] max-w-[70%] flex flex-col gap-2 transform transition-all duration-500 ${showFormCampo ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
            >
                <FormularioCampo campos={campos} formData={formData} onChange={handleChange} />
            </div>

            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
                <CampoSelector
                    campos={campos}
                    campoId={campoSeleccionado}
                    parcelaId={''}
                    parcelaNombre={''}
                    areaParcela={0}
                    areaCampo={areaCampo}
                    selectorOpen={selectorOpen}
                    setSelectorOpen={setSelectorOpen}
                    onSelectCampo={(id) => {
                        const campo = campos[id];
                        setCampoSeleccionado(id);
                        setFormData({
                            campo_id: id,
                            nombre: campo.nombre,
                            descripcion: campo.descripcion || '',
                            lat: campo.lat,
                            lon: campo.lon
                        });
                        centrarCampo(campo);
                    }}
                    mapRef={mapRef}
                />
            </div>

            {(showFormCampo || formData.campo_id !== '') && (
                <div className="absolute bottom-20 right-4 z-40 flex flex-col items-end space-y-2">
                    <button onClick={handleGuardar} className="bg-white p-3 rounded-full shadow-md" title="Guardar campo">
                        <Save className="w-6 h-6" />
                    </button>
                </div>
            )}
        </>
    );
}

// views/MapView.jsx
import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import GeoJSON from 'ol/format/GeoJSON';

import {
    fetchParcelaInit,
    createParcela,
    updateParcela
} from '../services/parcelaService';

import {
    toggleBaseLayer,
    fromLonLat
} from '../services/mapService';

import { calculatePolygonAreaFromGeometry } from '../utils/geometry';
import { polygonGlobals } from '../hooks/polygonTools/general';

import FloatingButtons from '../components/FloatingButtons';
import LateralButtons from '../components/LateralButtons';
import CampoSelector from '../components/CampoSelector';
import { usePolygonTools } from '../hooks/polygonTools';
import { MapContext } from '../context/MapContext';
import { CampoContext } from '../context/CampoContext';
import { useMapParcelas } from '../hooks/useMapParcelas';

import useViewCleanup from '../hooks/useViewCleanup'

export default function MapView() {
    const [loading, setLoading] = useState(true);
    const [campos, setCampos] = useState({});
    const { campoSeleccionado, setCampoSeleccionado } = useContext(CampoContext);
    const [parcelas, setParcelas] = useState({});
    const [formData, setFormData] = useState({
        campo_id: '',
        parcela_id: '',
        nombre: '',
        descripcion: ''
    });
    const [center, setCenter] = useState({ lat: -36.79, lon: -64.31 });
    const [areaCampo, setAreaCampo] = useState(0);
    const [areaParcela, setAreaParcela] = useState(0);
    const [selectorOpen, setSelectorOpen] = useState(false);
    const [isDeleteMode, setIsDeleteMode] = useState(false);

    const { mapRef, ready } = useContext(MapContext);
    const navigate = useNavigate();

    const {
        disableDraw,
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
            const geometry = getEditedFeature()?.getGeometry();
            if (geometry) {
                const area = calculatePolygonAreaFromGeometry(geometry);
                setAreaParcela(area);
            }
        }
    );

    useViewCleanup(() => {
        clearEdit()
        disableDraw()
        disableDeleteMode()
    })

    const { setFeaturesOnMap } = useMapParcelas({
        mapRef,
        parcelas,
        formData,
        clearEdit,
        activateEditMode,
        getCreatedFeature,
        setFormData,
        setAreaCampo,
        setAreaParcela
    });

    useEffect(() => {
        polygonGlobals.onFinishCallback.current = (feature) => {
            if (feature) {
                activateEditMode(feature);
                setFormData(prev => ({
                    ...prev,
                    parcela_id: ''
                }));
                const geometry = feature.getGeometry();
                if (geometry) {
                    const area = calculatePolygonAreaFromGeometry(geometry);
                    setAreaParcela(area);
                }
            }
        };
    }, []);

    useEffect(() => {
        async function init() {
            const data = await fetchParcelaInit();
            setCampos(data.campos);
            setParcelas(data.parcelas);
            setCenter(data.center);

            const defaultCampo = data.campo_preferido_id || Object.keys(data.campos)[0];
            if (!campoSeleccionado) {
                setCampoSeleccionado(defaultCampo);
            }
            setFormData({
                campo_id: campoSeleccionado || defaultCampo,
                parcela_id: '',
                nombre: '',
                descripcion: ''
            });

            setLoading(false);
        }
        init();
    }, []);

    useEffect(() => {
        if (!ready || !formData.campo_id) return;
        setFeaturesOnMap();
    }, [ready, formData.campo_id, formData.parcela_id, parcelas]);

    const handleGuardar = async () => {
        if (!formData.campo_id || !formData.nombre) {
            alert('Todos los campos son obligatorios.');
            return;
        }

        const feature = polygonGlobals.modeRef.current === 'edit'
            ? getEditedFeature()
            : getCreatedFeature();

        if (!feature) {
            alert('Debe crear o seleccionar una parcela.');
            return;
        }

        const format = new GeoJSON();
        const cloned = feature.clone();
        cloned.getGeometry().transform('EPSG:3857', 'EPSG:4326');
        const geojson = format.writeFeatureObject(cloned, {
            featureProjection: 'EPSG:4326'
        });

        try {
            if (formData.parcela_id && formData.parcela_id !== 'temporal') {
                await updateParcela(formData.parcela_id, geojson, formData.nombre, formData.descripcion);
            } else {
                await createParcela({
                    campo_id: formData.campo_id,
                    nombre: formData.nombre,
                    descripcion: formData.descripcion,
                    perimetro_geojson: geojson
                });
            }

            const data = await fetchParcelaInit();
            setParcelas(data.parcelas);
            setFormData(prev => ({ ...prev, parcela_id: '', nombre: '', descripcion: '' }));
            setAreaParcela(0);
        } catch (err) {
            console.error('Error al guardar:', err);
        }
    };

    const handleCancelEdit = () => {
        clearEdit();
        disableDeleteMode();
        setIsDeleteMode(false);
        setFormData(prev => ({
            ...prev,
            parcela_id: '',
            nombre: '',
            descripcion: ''
        }));
        setAreaParcela(0);
    };

    if (loading) return <div className="p-4">Cargando mapa...</div>;

    return (
        <>
            {mapRef.current && (
                <LateralButtons
                    mapRef={mapRef}
                    onToggleLayer={() => toggleBaseLayer(mapRef.current)}
                    onLocate={() => {
                        if (navigator.geolocation && mapRef.current) {
                            navigator.geolocation.getCurrentPosition(pos => {
                                const coords = fromLonLat([pos.coords.longitude, pos.coords.latitude]);
                                mapRef.current.getView().animate({ center: coords, zoom: 16 });
                            });
                        }
                    }}
                />
            )}

            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
                <CampoSelector
                    campos={campos}
                    campoId={campoSeleccionado}
                    parcelaId={formData.parcela_id}
                    parcelaNombre={formData.nombre}
                    areaParcela={areaParcela}
                    areaCampo={areaCampo}
                    selectorOpen={selectorOpen}
                    setSelectorOpen={setSelectorOpen}
                    onSelectCampo={(id) => {
                        setCampoSeleccionado(id);
                        setFormData({
                            campo_id: id,
                            parcela_id: '',
                            nombre: '',
                            descripcion: ''
                        });
                        setAreaParcela(0);
                    }}
                    mapRef={mapRef}
                />
            </div>

            <div className="absolute bottom-20 right-4 z-40 flex flex-col items-end space-y-2">
                <FloatingButtons
                    mode={polygonMode}
                    isDeleteMode={isDeleteMode}
                    onToggleDeleteMode={() => {
                        setIsDeleteMode(p => !p);
                        !isDeleteMode ? activateDeleteMode() : disableDeleteMode();
                    }}
                    onCancel={handleCancelEdit}
                    onSave={handleGuardar}
                />
            </div>
        </>
    );
}

// views/ParcelaView.jsx
import { MapPinPlusInside, MapPinMinusInside } from 'lucide-react';
import { useEffect, useState, useContext } from 'react';
import GeoJSON from 'ol/format/GeoJSON';

import {
    fetchParcelaInit,
    createParcela,
    updateParcela,
    deleteParcela
} from '../services/parcelaService';

import {
    calculatePolygonAreaFromGeometry
} from '../utils/geometry';

import {
    toggleBaseLayer,
    fromLonLat
} from '../services/mapService';

import { polygonGlobals } from '../hooks/polygonTools/general';
import FloatingButtons from '../components/FloatingButtons';
import LateralButtons from '../components/LateralButtons';
import CampoSelector from '../components/CampoSelector';
import { FormularioParcela } from '../components/Forms';
import DrawToolPanel from '../components/DrawToolPanel';
import { usePolygonTools } from '../hooks/polygonTools';
import { useMapParcelas } from '../hooks/useMapParcelas';
import { MapContext } from '../context/MapContext';
import { CampoContext } from '../context/CampoContext';

import useViewCleanup from '../hooks/useViewCleanup';

export default function ParcelaView() {
    const [loading, setLoading] = useState(true);
    const [campos, setCampos] = useState({});
    const [parcelas, setParcelas] = useState({});
    const { campoSeleccionado, setCampoSeleccionado } = useContext(CampoContext);
    const [formData, setFormData] = useState({ campo_id: '', parcela_id: '', nombre: '', descripcion: '' });
    const [areaCampo, setAreaCampo] = useState(0);
    const [areaParcela, setAreaParcela] = useState(0);
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [drawPanelOpen, setDrawPanelOpen] = useState(false);
    const [showFormParcela, setShowFormParcela] = useState(false);
    const [selectorOpen, setSelectorOpen] = useState(false);
    const [drawFinished, setDrawFinished] = useState(false);

    const { mapRef, ready } = useContext(MapContext);

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
    } = usePolygonTools(mapRef, () => {
        const geom = getEditedFeature()?.getGeometry();
        if (geom) {
            setAreaParcela(calculatePolygonAreaFromGeometry(geom));
        }
    });

    useViewCleanup(() => {
        clearEdit();
        disableDraw();
        disableDeleteMode();
    });

    const { setFeaturesOnMap } = useMapParcelas({
        mapRef,
        parcelas,
        formData,
        clearEdit,
        activateEditMode,
        getCreatedFeature,
        setFormData,
        setAreaCampo,
        setAreaParcela
    });

    useEffect(() => {
        polygonGlobals.onFinishCallback.current = (feature) => {
            if (feature) {
                setDrawFinished(true);
                setDrawPanelOpen(true);
                activateEditMode(feature);
                setFormData(prev => ({ ...prev, parcela_id: '' }));

                const geom = feature.getGeometry();
                if (geom) setAreaParcela(calculatePolygonAreaFromGeometry(geom));
            }
        };
    }, []);

    useEffect(() => {
        async function init() {
            const data = await fetchParcelaInit();
            setCampos(data.campos);
            setParcelas(data.parcelas);

            const defaultCampo = data.campo_preferido_id || Object.keys(data.campos)[0];
            const selectedCampo = campoSeleccionado || defaultCampo;

            setCampoSeleccionado(selectedCampo);
            setFormData({ campo_id: selectedCampo, parcela_id: '', nombre: '', descripcion: '' });
            setLoading(false);
        }
        init();
    }, []);

    useEffect(() => {
        if (!ready || !formData.campo_id) return;
        setFeaturesOnMap();
    }, [ready, formData.campo_id, formData.parcela_id, parcelas]);

    const getFeatureForSave = () =>
        polygonGlobals.modeRef.current === 'edit' ? getEditedFeature() : getCreatedFeature();

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'campo_id') {
            if (value === formData.campo_id) return;
            const campo = campos[value];
            if (campo && mapRef.current) {
                mapRef.current.getView().setCenter(fromLonLat([campo.lon, campo.lat]));
            }
            setCampoSeleccionado(value);
            setFormData({ campo_id: value, parcela_id: '', nombre: '', descripcion: '' });
            setAreaParcela(0);
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleGuardar = async () => {
        if (!formData.campo_id || !formData.nombre) {
            alert('Todos los campos son obligatorios.');
            return;
        }

        const feature = getFeatureForSave();
        if (!feature) {
            alert('Debe crear o seleccionar una parcela.');
            return;
        }

        const format = new GeoJSON();
        const cloned = feature.clone();
        cloned.getGeometry().transform('EPSG:3857', 'EPSG:4326');
        const geojson = format.writeFeatureObject(cloned, {
            featureProjection: 'EPSG:4326'
        });

        try {
            if (formData.parcela_id) {
                await updateParcela(formData.parcela_id, geojson, formData.nombre, formData.descripcion);
            } else {
                await createParcela({
                    campo_id: formData.campo_id,
                    nombre: formData.nombre,
                    descripcion: formData.descripcion,
                    perimetro_geojson: geojson
                });
            }

            const data = await fetchParcelaInit();
            setParcelas(data.parcelas);
            setFormData(prev => ({ ...prev, parcela_id: '', nombre: '', descripcion: '' }));
            setAreaParcela(0);
        } catch (err) {
            console.error('Error al guardar:', err);
        }
    };

    const handleEliminar = async () => {
        if (!formData.parcela_id) return;
        if (!window.confirm('¿Estás seguro que querés eliminar esta parcela?')) return;

        try {
            await deleteParcela(formData.parcela_id);
            const data = await fetchParcelaInit();
            setParcelas(data.parcelas);
            setFormData(prev => ({ ...prev, parcela_id: '', nombre: '', descripcion: '' }));
            setAreaParcela(0);
        } catch (err) {
            console.error('Error al eliminar parcela:', err);
        }
    };

    const handleFinishDraw = () => {
        endPolygon();
        setDrawFinished(true);
        setDrawPanelOpen(true);
    };

    const handleCancelDraw = () => {
        cancelDraw();
        clearEdit();
        setDrawFinished(false);
        setDrawPanelOpen(false);
    };

    const handleCancelEdit = () => {
        clearEdit();
        disableDeleteMode();
        setIsDeleteMode(false);
        setDrawFinished(false);
        setDrawPanelOpen(false);
        setFormData(prev => ({ ...prev, parcela_id: '', nombre: '', descripcion: '' }));
        setAreaParcela(0);
    };

    if (loading) return <div className="p-4">Cargando mapa...</div>;

    return (
        <>
            {mapRef.current && (
                <LateralButtons
                    mapRef={mapRef}
                    onToggleLayer={() => toggleBaseLayer(mapRef.current)}
                    onLocate={() => {
                        if (navigator.geolocation && mapRef.current) {
                            navigator.geolocation.getCurrentPosition(pos => {
                                const coords = fromLonLat([pos.coords.longitude, pos.coords.latitude]);
                                mapRef.current.getView().animate({ center: coords, zoom: 16 });
                            });
                        }
                    }}
                />
            )}

            <div className="absolute top-4 left-4 z-40 flex flex-row-reverse items-end gap-2">
                {formData.parcela_id && (
                    <button onClick={handleEliminar} className="bg-white p-3 rounded-full shadow-md">
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

            <div
                className={`absolute top-20 left-4 right-4 md:left-4 md:right-auto md:w-[350px] bg-white/60 rounded-2xl shadow-lg p-2 z-10 overflow-y-auto max-h-[90%] max-w-[70%] flex flex-col gap-2 transform transition-all duration-500 ${showFormParcela ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`}
            >
                <FormularioParcela campos={campos} formData={formData} onChange={handleChange} />
            </div>

            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
                <CampoSelector
                    campos={campos}
                    campoId={campoSeleccionado}
                    parcelaId={formData.parcela_id}
                    parcelaNombre={formData.nombre}
                    areaParcela={areaParcela}
                    areaCampo={areaCampo}
                    selectorOpen={selectorOpen}
                    setSelectorOpen={setSelectorOpen}
                    onSelectCampo={(id) => {
                        setCampoSeleccionado(id);
                        setFormData({
                            campo_id: id,
                            parcela_id: '',
                            nombre: '',
                            descripcion: ''
                        });
                        setAreaParcela(0);
                    }}
                    mapRef={mapRef}
                />
            </div>

            <div className="absolute bottom-20 right-4 z-40 flex flex-col items-end space-y-2">
                <FloatingButtons
                    mode={polygonMode}
                    isDeleteMode={isDeleteMode}
                    onToggleDeleteMode={() => {
                        setIsDeleteMode(p => !p);
                        !isDeleteMode ? activateDeleteMode() : disableDeleteMode();
                    }}
                    onCancel={handleCancelEdit}
                    onSave={handleGuardar}
                    showCancel={formData.parcela_id !== ''}
                />

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
            </div>
        </>
    );
}