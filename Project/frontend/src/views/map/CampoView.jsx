// ~/Project/frontend/src/views/CampoView.jsx

import { useEffect, useState, useContext } from 'react';
import { useOutletContext } from 'react-router-dom';

import { createCampo, updateCampo, deleteCampo } from '@/api/services/campoService';
import { fromLonLat, fetchMapFeatures } from '@/api/services/mapService';

import { FormularioCampo } from '@/components/ui/Forms/FormsMap';
import { ModalGenerico, ModalInfo } from '@/components/common/Modals';

import { useMarkerGps } from '@/hooks/useMarkerGps';
import { useMapParcelas } from '@/hooks/useMapParcelas';
import useViewCleanup from '@/hooks/useViewCleanup';

import { MapContext } from '@/context/MapContext';
import { CampoContext } from '@/context/CampoContext';

import { Save, MapPinPlus, MapPinX } from 'lucide-react';

import { easeOut } from 'ol/easing';

export default function CampoView() {
    const [formCampo, setFormCampo] = useState({ campo_id: '', nombre: '', descripcion: '', lat: '', lon: '' });
    const [showFormCampo, setShowFormCampo] = useState(false);
    const [modalEliminarOpen, setModalEliminarOpen] = useState(false);
    const [modalInfoOpen, setModalInfoOpen] = useState(false);
    const [modalInfoMessage, setModalInfoMessage] = useState('');

    const {
        mapRef,
        ready
    } = useContext(MapContext);

    const {
        campoSeleccionado,
        setCampoSeleccionado,
        setLastCampoId,
    } = useContext(CampoContext);

    const {
        campos,
        parcelas,
        setFormData,
        setCampos,
        setParcelas,
        setAreaCampo,
        setAreaParcela,
    } = useOutletContext();

    const {
        colocarMarcadorGps,
        moverMarcadorGps,
        limpiarMarcadorGps
    } = useMarkerGps(mapRef);

    const {
        setFeaturesOnMap,
        clearParcelas
    } = useMapParcelas({
        mapRef,
        parcelas,
        formData: formCampo,
        clearEdit: () => {},
        activateEditMode: () => {},
        getCreatedFeature: () => null,
        setFormData: setFormCampo,
        setAreaCampo,
        setAreaParcela,
        enabled: true,
        modoVisualizacionCampo: true
    });

    useViewCleanup(() => {
        limpiarMarcadorGps();
        clearParcelas();
    });

    const handleChange = (e) => {
        const { name, value } = e.target;

        if (name === 'campo_id' && value === '') {
            if (campoSeleccionado) {
                setLastCampoId(campoSeleccionado);
            }
            limpiarMarcadorGps();
            setCampoSeleccionado(null);
            setFormCampo({ campo_id: '', nombre: '', descripcion: '', lat: '', lon: '' });
            return;
        }

        if (name === 'campo_id') {
            if (value === '') {
                limpiarMarcadorGps();
                setCampoSeleccionado(null);
                setFormCampo({ campo_id: '', nombre: '', descripcion: '', lat: '', lon: '' });
                return;
            }

            const campo = campos[value];
            if (campo) {
                setCampoSeleccionado(value);
                setFormCampo({
                    campo_id: value,
                    nombre: campo.nombre,
                    descripcion: campo.descripcion || '',
                    lat: campo.lat,
                    lon: campo.lon
                });
                setFormData(prev => ({
                    ...prev,
                    campo_id: value,
                    parcela_id: '',
                    nombre: '',
                    descripcion: ''
                }));
                setShowFormCampo(true);

                if (mapRef.current) {
                    mapRef.current.getView().animate({
                        center: fromLonLat([campo.lon, campo.lat]),
                        duration: 800,
                        easing: easeOut
                    });
                    moverMarcadorGps(campo.lon, campo.lat);
                }
            }
            return;
        }

        setFormCampo(prev => ({ ...prev, [name]: value }));
    };

    const handleGuardar = async () => {
        const { campo_id, nombre, descripcion, lat, lon } = formCampo;

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

            const data = await fetchMapFeatures();
            setCampos(data.campos);
            setParcelas(data.parcelas);

            const nuevoCampo = Object.entries(data.campos).find(([id, campo]) =>
                campo.nombre === nombre && campo.lat === lat && campo.lon === lon
            );

            if (nuevoCampo) {
                const [nuevoCampoId, campo] = nuevoCampo;
                setCampoSeleccionado(nuevoCampoId);
                setFormCampo({
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
        mapRef.current.getView().animate({
            center: fromLonLat([campo.lon, campo.lat]),
            duration: 800,
            easing: easeOut
        });
        moverMarcadorGps(campo.lon, campo.lat);
    };

    const handleEliminar = () => setModalEliminarOpen(true);

    const confirmarEliminacion = async () => {
        setModalEliminarOpen(false);
        if (!formCampo.campo_id) return;

        try {
            await deleteCampo(formCampo.campo_id);
            const data = await fetchMapFeatures();
            setCampos(data.campos);
            setParcelas(data.parcelas);
            setFormCampo({ campo_id: '', nombre: '', descripcion: '', lat: '', lon: '' });
            limpiarMarcadorGps();
        } catch (err) {
            console.error('Error al eliminar campo:', err);
        }
    };

    useEffect(() => {
        if (!ready || !formCampo.campo_id) return;
        setFeaturesOnMap();
    }, [ready, formCampo.campo_id, parcelas]);

    useEffect(() => {
        if (formCampo.lat && formCampo.lon && ready && mapRef.current) {
            moverMarcadorGps(formCampo.lon, formCampo.lat);
        }
    }, [formCampo.lat, formCampo.lon, ready]);

    useEffect(() => {
        if (!ready || !mapRef.current) return;
        const map = mapRef.current;

        const handler = (e) => colocarMarcadorGps(e, setFormCampo);
        map.on('click', handler);

        return () => map.un('click', handler);
    }, [ready]);

    useEffect(() => {
        if (
            campoSeleccionado &&
            campoSeleccionado !== formCampo.campo_id &&
            campos[campoSeleccionado]
        ) {
            const campo = campos[campoSeleccionado];
            setFormCampo({
                campo_id: campoSeleccionado,
                nombre: campo.nombre,
                descripcion: campo.descripcion || '',
                lat: campo.lat,
                lon: campo.lon
            });

            if (ready && mapRef.current) {
                moverMarcadorGps(campo.lon, campo.lat);
            }
        }
    }, [campoSeleccionado]);

    const handleToggleForm = () => {
        setShowFormCampo(prev => !prev);
        if (!showFormCampo) {
            window.dispatchEvent(new CustomEvent("closeCampoSelector"));
        }
    };

    useEffect(() => {
        const closeForm = () => setShowFormCampo(false);
        window.addEventListener('closeForm', closeForm);
        return () => window.removeEventListener('closeForm', closeForm);
    }, []);

    return (
        <>
            <div className="absolute bottom-20 left-4 z-40 flex flex-col items-end space-y-2">
                {formCampo.campo_id && (
                    <button onClick={handleEliminar} title="Eliminar campo" className="bg-white p-3 rounded-full shadow-md">
                        <MapPinX className="w-6 h-6" />
                    </button>
                )}
                <button onClick={handleToggleForm} title="Mostrar formulario" className="bg-white p-3 rounded-full shadow-md">
                    <MapPinPlus className="w-6 h-6" />
                </button>
            </div>

            <div
                className={`
                    absolute top-24 left-20 right-20 md:left-20
                    md:right-20 md:w-[350px] bg-white/60 
                    rounded-2xl shadow-lg p-2 z-10 overflow-y-auto 
                    max-h-[90%] max-w-[70%] flex flex-col gap-2 
                    transform transition-all duration-500 
                    ${showFormCampo ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`
                }
            >
                <FormularioCampo campos={campos} formData={formCampo} onChange={handleChange} />
            </div>

            {(showFormCampo || formCampo.campo_id !== '') && (
                <div className="absolute bottom-20 right-4 z-40 flex flex-col items-end space-y-2">
                    <button onClick={handleGuardar} className="bg-white p-3 rounded-full shadow-md" title="Guardar campo">
                        <Save className="w-6 h-6" />
                    </button>
                </div>
            )}

            <ModalGenerico
                isOpen={modalEliminarOpen}
                title="Eliminar campo"
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