// ~/Project/frontend/src/views/ParcelaView.jsx

import { useEffect, useState, useContext } from 'react';
import { useOutletContext } from 'react-router-dom';

import { createParcela, updateParcela, deleteParcela, fetchParcelaInit, getResumenParcelas } from '@/api/services/parcelaService';
import { fromLonLat } from '@/api/services/mapService';

import DrawToolPanel from '@/components/ui/MapControls/DrawToolPanel';
import { FormularioParcela } from '@/components/ui/Forms/FormsMap';
import FloatingButtons from '@/components/ui/MapControls/FloatingButtons';
import { ModalGenerico, ModalInfo } from '@/components/common/Modals';
import PopupResumenParcela from '@/components/ui/MapOverlays/PopupResumenParcela';

import { polygonGlobals } from '@/hooks/polygonTools/general';
import { usePolygonTools } from '@/hooks/polygonTools';
import { useMapParcelas } from '@/hooks/useMapParcelas';
import useViewCleanup from '@/hooks/useViewCleanup';

import { MapContext } from '@/context/MapContext';
import { CampoContext } from '@/context/CampoContext';

import { calculatePolygonAreaFromGeometry } from '@/utils/geometry';

import GeoJSON from 'ol/format/GeoJSON';

import { MapPinPlusInside, MapPinMinusInside, Info } from 'lucide-react';

import { easeOut } from 'ol/easing';

export default function ParcelaView() {
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [drawPanelOpen, setDrawPanelOpen] = useState(false);
    const [showFormData, setShowFormData] = useState(false);
    const [drawFinished, setDrawFinished] = useState(false);
    const [modalInfoOpen, setModalInfoOpen] = useState(false);
    const [modalInfoMessage, setModalInfoMessage] = useState('');
    const [modalEliminarOpen, setModalEliminarOpen] = useState(false);
    const [popupResumenOpen, setPopupResumenOpen] = useState(false);
    const [resumenParcela, setResumenParcela] = useState(null);
    const [resumenes, setResumenes] = useState([]);
    const [resumenesCargados, setResumenesCargados] = useState(false);

    const {
        mapRef,
        ready
    } = useContext(MapContext);

    const {
        campoSeleccionado,
        setCampoSeleccionado,
        lastCampoId
    } = useContext(CampoContext);

    const {
        campos,
        parcelas,
        formData,
        setFormData,
        setParcelas,
        setAreaCampo,
        setAreaParcela
    } = useOutletContext();

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

    const {
        setFeaturesOnMap,
        clearParcelas
    } = useMapParcelas({
        mapRef,
        parcelas,
        formData,
        clearEdit,
        activateEditMode,
        getCreatedFeature,
        setFormData,
        setAreaCampo,
        setAreaParcela,
        onSelectFeature: (_, parcela) => {
            setResumenParcela(
                resumenes.find(r => r.parcela_id === parcela.id) || null
            );
            setPopupResumenOpen(false);
        }

    });

    useViewCleanup(() => {
        clearEdit();
        disableDraw();
        disableDeleteMode();
        setFormData(prev => ({ ...prev, parcela_id: '', nombre: '', descripcion: '' }));
    });

    const resetHerramientas = () => {
        clearEdit();
        disableDraw();
        disableDeleteMode();
        clearParcelas();
        setDrawFinished(false);
        setDrawPanelOpen(false);
        setIsDeleteMode(false);
    };

    const getFeatureForSave = () =>
        ['edit', 'draw-edit'].includes(polygonGlobals.modeRef.current)
            ? getEditedFeature()
            : getCreatedFeature();

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'campo_id') {
            if (value === formData.campo_id) return;
            resetHerramientas();
            const campo = campos[value];
            if (campo && mapRef.current) {
                mapRef.current.getView().animate({
                    center: fromLonLat([campo.lon, campo.lat]),
                    duration: 800,
                    easing: easeOut
                });
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
            setModalInfoMessage('Todos los campos son obligatorios.');
            setModalInfoOpen(true);
            return;
        }

        const feature = getFeatureForSave();
        if (!feature) {
            setModalInfoMessage('Debe crear o seleccionar una parcela.');
            setModalInfoOpen(true);
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
            resetHerramientas();
            setAreaParcela(0);
            setPopupResumenOpen(false);
            setResumenParcela(null);
        } catch (err) {
            console.error('Error al guardar:', err);
        }
    };

    const handleEliminar = () => {
        if (!formData.parcela_id) return;
        setModalEliminarOpen(true);
    };

    const confirmarEliminacion = async () => {
        setModalEliminarOpen(false);
        setPopupResumenOpen(false)
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
        setPopupResumenOpen(false);
        setResumenParcela(null);
        setFormData(prev => ({ ...prev, parcela_id: '', nombre: '', descripcion: '' }));
        setAreaParcela(0);
    };

    const handleToggleForm = () => {
        setShowFormData(prev => !prev);
        if (!showFormData) {
            window.dispatchEvent(new Event('closeCampoSelector'));
        }
    };

    const handleMostrarResumen = (resumen) => {
        setResumenParcela(resumen);
        setPopupResumenOpen(true);
    };

    useEffect(() => {
        resetHerramientas();
        polygonGlobals.onFinishCallback.current = (feature) => {
            if (feature) {
                setDrawFinished(true);
                setDrawPanelOpen(true);
                activateEditMode(feature, 'draw-edit');
                setFormData(prev => ({ ...prev, parcela_id: '' }));

                const geom = feature.getGeometry();
                if (geom) setAreaParcela(calculatePolygonAreaFromGeometry(geom));
            }
        };

    }, []);

    useEffect(() => {
        if (!ready || !formData.campo_id) return;
        setFeaturesOnMap();
    }, [ready, formData.campo_id, formData.parcela_id, parcelas]);

    useEffect(() => {
        if (
            campoSeleccionado &&
            campoSeleccionado !== formData.campo_id &&
            campos[campoSeleccionado]
        ) {
            setFormData(prev => ({
                ...prev,
                campo_id: campoSeleccionado,
                parcela_id: '',
                nombre: '',
                descripcion: ''
            }));
            setAreaParcela(0);
        }
    }, [campoSeleccionado]);

    useEffect(() => {
        if (
            !formData.campo_id &&
            !campoSeleccionado &&
            lastCampoId &&
            campos[lastCampoId]
        ) {
            setCampoSeleccionado(lastCampoId);
            setFormData(prev => ({
                ...prev,
                campo_id: lastCampoId,
                parcela_id: '',
                nombre: '',
                descripcion: ''
            }));
            setAreaParcela(0);
        }
    }, []);

    useEffect(() => {
        if (campoSeleccionado || !formData.campo_id || !campos[formData.campo_id]) return;
        setCampoSeleccionado(formData.campo_id);
        mapRef.current.getView().animate({
            center: fromLonLat([campos[formData.campo_id].lon, campos[formData.campo_id].lat]),
            duration: 800,
            easing: easeOut
        });
    }, [formData.campo_id, campoSeleccionado]);

    useEffect(() => {
        const closeForm = () => setShowFormData(false);
        window.addEventListener('closeForm', closeForm);
        return () => window.removeEventListener('closeForm', closeForm);
    }, []);

    useEffect(() => {
        const cargarResumenes = async () => {
            setResumenesCargados(false);
            if (!formData.campo_id) return;
            try {
                const data = await getResumenParcelas(formData.campo_id);
                setResumenes(data);
                setResumenesCargados(true);
            } catch (error) {
                console.error('Error al cargar resumen de parcelas:', error);
                setResumenesCargados(true);
            }
        };
        cargarResumenes();
    }, [formData.campo_id]);

    useEffect(() => {
        const cerrarPopup = () => {
            setPopupResumenOpen(false);
            setResumenParcela(null);
        };
    
        window.addEventListener('cerrarPopupResumen', cerrarPopup);
        return () => {
            window.removeEventListener('cerrarPopupResumen', cerrarPopup);
        };
    }, []);

    return (
        <>
            <div className="absolute bottom-20 left-4 z-40 flex flex-col items-end space-y-2">
                {formData.parcela_id && (
                    <>
                        <button
                            onClick={() => setPopupResumenOpen(prev => !prev)}
                            className={`bg-white p-3 rounded-full shadow-md transition-colors ${!resumenParcela ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-100'}`}
                            disabled={!resumenParcela}
                            title={resumenParcela ? 'Ver resumen' : 'Seleccioná una parcela primero'}
                        >
                            <Info className="w-6 h-6" />
                        </button>
                        <button onClick={handleEliminar} className="bg-white p-3 rounded-full shadow-md">
                            <MapPinMinusInside className="w-6 h-6" />
                        </button>
                    </>
                )}
                <button
                    className="bg-white p-3 rounded-full shadow-md transition-all duration-300"
                    onClick={handleToggleForm}
                >
                    <MapPinPlusInside className="w-6 h-6" />
                </button>
            </div>

            <div
                className={`
                    absolute top-24 left-20 right-20 md:left-20
                    md:right-20 md:w-[350px] bg-white/60 
                    rounded-2xl shadow-lg p-2 z-10 overflow-y-auto 
                    max-h-[90%] max-w-[70%] flex flex-col gap-2 
                    transform transition-all duration-500 
                    ${showFormData ? 'scale-100 opacity-100' : 'scale-0 opacity-0 pointer-events-none'}`
                }
            >
                <FormularioParcela campos={campos} formData={formData} onChange={handleChange} />
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

                {formData.parcela_id === '' && showFormData && (
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

            <PopupResumenParcela
                visible={popupResumenOpen}
                resumen={resumenParcela}
                onClose={() => setPopupResumenOpen(false)}
            />

            <ModalInfo
                isOpen={modalInfoOpen}
                message={modalInfoMessage}
                onClose={() => setModalInfoOpen(false)}
            />

            <ModalGenerico
                isOpen={modalEliminarOpen}
                title="Eliminar parcela"
                message="Esta acción eliminará la parcela seleccionada. ¿Deseás continuar?"
                onCancel={() => setModalEliminarOpen(false)}
                onConfirm={confirmarEliminacion}
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
            />
        </>
    );
}
