// views/map/ParcelaView.jsx
import { MapPinPlusInside, MapPinMinusInside } from 'lucide-react';
import { useEffect, useState, useContext } from 'react';
import GeoJSON from 'ol/format/GeoJSON';

import {
    fetchParcelaInit,
    createParcela,
    updateParcela,
    deleteParcela
} from '../../api/services/parcelaService';

import {
    calculatePolygonAreaFromGeometry
} from '../../utils/geometry';

import {
    toggleBaseLayer,
    fromLonLat
} from '../../api/services/mapService';

import { polygonGlobals } from '../../hooks/polygonTools/general';
import FloatingButtons from '../../components/ui/MapControls/FloatingButtons';
import LateralButtons from '../../components/ui/MapControls/LateralButtons';
import CampoSelector from '../../components//ui/CampoSelector/CampoSelector';
import { FormularioParcela } from '../../components/ui/Forms/FormsMap';
import DrawToolPanel from '../../components/ui/MapControls/DrawToolPanel';
import { usePolygonTools } from '../../hooks/polygonTools';
import { useMapParcelas } from '../../hooks/useMapParcelas';
import { MapContext } from '../../context/MapContext';
import { CampoContext } from '../../context/CampoContext';

import useViewCleanup from '../../hooks/useViewCleanup';

import { ModalGenerico, ModalInfo } from '../../components/common/Modals';

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
    const [modalInfoOpen, setModalInfoOpen] = useState(false);
    const [modalInfoMessage, setModalInfoMessage] = useState('');
    const [modalEliminarOpen, setModalEliminarOpen] = useState(false);

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

    const { setFeaturesOnMap, clearParcelas } = useMapParcelas({
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

    const resetHerramientas = () => {
        clearEdit();
        disableDraw();
        disableDeleteMode();
        clearParcelas();
        setDrawFinished?.(false);
        setDrawPanelOpen?.(false);
        setIsDeleteMode?.(false);
    };

    useEffect(() => {
        resetHerramientas();
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
            resetHerramientas();
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
        } catch (err) {
            console.error('Error al guardar:', err);
        }
    };

    const handleEliminar = async () => {
        if (!formData.parcela_id) return;
        setModalEliminarOpen(true);
    }

    const confirmarEliminacion = async () => {
        setModalEliminarOpen(false);
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

            <ModalInfo
                isOpen={modalInfoOpen}
                message={modalInfoMessage}
                onClose={() => setModalInfoOpen(false)}
            />

            <ModalGenerico
                isOpen={modalEliminarOpen}
                title="¿Eliminar parcela?"
                message="Esta acción eliminará la parcela seleccionada. ¿Deseás continuar?"
                onCancel={() => setModalEliminarOpen(false)}
                onConfirm={confirmarEliminacion}
                confirmLabel="Eliminar"
                cancelLabel="Cancelar"
            />

        </>
    );
}