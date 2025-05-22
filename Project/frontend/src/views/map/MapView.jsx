import { useEffect, useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import GeoJSON from 'ol/format/GeoJSON';

import {
    fetchParcelaInit,
    updateParcela
} from '../../api/services/parcelaService';

import {
    toggleBaseLayer,
    fromLonLat
} from '../../api/services/mapService';

import { calculatePolygonAreaFromGeometry } from '../../utils/geometry';
import { polygonGlobals } from '../../hooks/polygonTools/general';

import FloatingButtons from '../../components/ui/MapControls/FloatingButtons';
import LateralButtons from '../../components/ui/MapControls/LateralButtons';
import CampoSelector from '../../components/ui/CampoSelector/CampoSelector';
import { usePolygonTools } from '../../hooks/polygonTools';
import { MapContext } from '../../context/MapContext';
import { CampoContext } from '../../context/CampoContext';
import { useMapParcelas } from '../../hooks/useMapParcelas';

import useViewCleanup from '../../hooks/useViewCleanup';
import { ModalInfo } from '../../components/common/Modals';

export default function MapView() {
    const [loading, setLoading] = useState(true);
    const [campos, setCampos] = useState({});
    const [parcelas, setParcelas] = useState({});
    const { campoSeleccionado, setCampoSeleccionado } = useContext(CampoContext);
    const [formData, setFormData] = useState({ campo_id: '', parcela_id: '' });
    const [areaCampo, setAreaCampo] = useState(0);
    const [areaParcela, setAreaParcela] = useState(0);
    const [selectorOpen, setSelectorOpen] = useState(false);
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [modalInfoOpen, setModalInfoOpen] = useState(false);
    const [modalInfoMessage, setModalInfoMessage] = useState('');

    const { mapRef, ready } = useContext(MapContext);
    const navigate = useNavigate();

    const {
        disableDraw,
        activateDeleteMode,
        disableDeleteMode,
        activateEditMode,
        clearEdit,
        getEditedFeature,
        polygonMode
    } = usePolygonTools(mapRef, () => {
        const geometry = getEditedFeature()?.getGeometry();
        if (geometry) setAreaParcela(calculatePolygonAreaFromGeometry(geometry));
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
        getCreatedFeature: () => null,
        setFormData,
        setAreaCampo,
        setAreaParcela
    });

    useEffect(() => {
        polygonGlobals.onFinishCallback.current = (feature) => {
            if (feature) {
                activateEditMode(feature);
                setFormData(prev => ({ ...prev, parcela_id: '' }));
                const geometry = feature.getGeometry();
                if (geometry) setAreaParcela(calculatePolygonAreaFromGeometry(geometry));
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
            setFormData({ campo_id: selectedCampo, parcela_id: '' });

            setLoading(false);
        }
        init();
    }, []);

    useEffect(() => {
        if (!ready || !formData.campo_id) return;
        setFeaturesOnMap();
    }, [ready, formData.campo_id, formData.parcela_id, parcelas]);

    const handleGuardar = async () => {
        const feature = getEditedFeature();
        if (!feature) {
            setModalInfoMessage('Debe seleccionar una parcela existente para editar.');
            setModalInfoOpen(true);
            return;
        }

        const geometry = feature.getGeometry();
        if (!geometry || !formData.parcela_id) {
            setModalInfoMessage('Falta seleccionar una parcela válida.');
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
            await updateParcela(formData.parcela_id, geojson);
            const data = await fetchParcelaInit();
            setParcelas(data.parcelas);
            setFormData(prev => ({ ...prev, parcela_id: '' }));
            setAreaParcela(0);
        } catch (err) {
            console.error('Error al guardar:', err);
        }
    };

    const handleCancelEdit = () => {
        clearEdit();
        disableDeleteMode();
        setIsDeleteMode(false);
        setFormData(prev => ({ ...prev, parcela_id: '' }));
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
                    parcelaNombre={''}
                    areaParcela={areaParcela}
                    areaCampo={areaCampo}
                    selectorOpen={selectorOpen}
                    setSelectorOpen={setSelectorOpen}
                    onSelectCampo={(id) => {
                        setCampoSeleccionado(id);
                        setFormData({ campo_id: id, parcela_id: '' });
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

            <ModalInfo
                isOpen={modalInfoOpen}
                message={modalInfoMessage}
                onClose={() => setModalInfoOpen(false)}
            />
        </>
    );
}