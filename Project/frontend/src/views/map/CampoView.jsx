// views/map/CampoView.jsx
import { Save, MapPinPlus, MapPinX } from 'lucide-react';
import { useEffect, useState, useContext } from 'react';

import { createCampo, updateCampo, deleteCampo } from '../../api/services/campoService';
import { toggleBaseLayer, fromLonLat } from '../../api/services/mapService';
import { fetchParcelaInit } from '../../api/services/parcelaService';
import LateralButtons from '../../components/ui/MapControls/LateralButtons';
import CampoSelector from '../../components/ui/CampoSelector/CampoSelector';
import { FormularioCampo } from '../../components/ui/Forms/FormsMap';
import { useMarkerGps } from '../../hooks/useMarkerGps';
import { MapContext } from '../../context/MapContext';
import { CampoContext } from '../../context/CampoContext';
import { useMapParcelas } from '../../hooks/useMapParcelas';
import useViewCleanup from '../../hooks/useViewCleanup';
import { ModalGenerico, ModalInfo } from '../../components/common/Modals';


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

    const [modalEliminarOpen, setModalEliminarOpen] = useState(false);
    const [modalInfoOpen, setModalInfoOpen] = useState(false);
    const [modalInfoMessage, setModalInfoMessage] = useState('');

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

        // Si el usuario elige "-- Crear nuevo campo --"
        if (name === 'campo_id' && value === '') {
            limpiarMarcadorGps();
            setCampoSeleccionado(null);
            setFormData({
                campo_id: '',
                nombre: '',
                descripcion: '',
                lat: '',
                lon: ''
            });
            return;
        }

        if (name === 'campo_id') {
            setCampoSeleccionado(value);
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleGuardar = async () => {
        const { campo_id, nombre, descripcion, lat, lon } = formData;

        if (!nombre || !descripcion || !lat || !lon) {
            setModalInfoMessage("Todos los campos son obligatorios.");
            setModalInfoOpen(true);
            return;
        }

        try {
            if (campo_id) {
                await updateCampo(campo_id, { nombre, descripcion, lat, lon });
            } else {
                await createCampo({ nombre, descripcion, lat, lon });
            }

            const data = await fetchParcelaInit();
            setCampos(data.campos);
            setParcelas(data.parcelas);

            const nuevoCampo = Object.entries(data.campos).find(([id, campo]) =>
                campo.nombre === nombre && campo.lat === lat && campo.lon === lon
            );

            if (nuevoCampo) {
                const [nuevoCampoId, campo] = nuevoCampo;
                setCampoSeleccionado(nuevoCampoId);
                setFormData({
                    campo_id: nuevoCampoId,
                    nombre: campo.nombre,
                    descripcion: campo.descripcion || '',
                    lat: campo.lat,
                    lon: campo.lon
                });
                centrarCampo(campo);
            }

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
        setModalEliminarOpen(true);
    };

    const confirmarEliminacion = async () => {
        setModalEliminarOpen(false);
        if (!formData.campo_id) return;

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

            <ModalGenerico
                isOpen={modalEliminarOpen}
                title="¿Eliminar campo?"
                message="Esta acción no se puede deshacer. ¿Deseás continuar?"
                onCancel={() => setModalEliminarOpen(false)}
                onConfirm={confirmarEliminacion}
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
            />

            <ModalInfo
                isOpen={modalInfoOpen}
                message={modalInfoMessage}
                onClose={() => setModalInfoOpen(false)}
            />

        </>
    );
}