// src/views/MapView.jsx

import { useEffect, useContext, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

import { updateParcela, fetchParcelaInit } from '../../api/services/parcelaService';

import FloatingButtons from '../../components/ui/MapControls/FloatingButtons';
import { ModalInfo } from '../../components/common/Modals';

import { polygonGlobals } from '../../hooks/polygonTools/general';
import { usePolygonTools } from '../../hooks/polygonTools';
import { useMapParcelas } from '../../hooks/useMapParcelas';
import useViewCleanup from '../../hooks/useViewCleanup';

import { MapContext } from '../../context/MapContext';

import { calculatePolygonAreaFromGeometry } from '../../utils/geometry';

import GeoJSON from 'ol/format/GeoJSON';

export default function MapView() {
    const [isDeleteMode, setIsDeleteMode] = useState(false);
    const [modalInfoOpen, setModalInfoOpen] = useState(false);
    const [modalInfoMessage, setModalInfoMessage] = useState('');

    const { 
        mapRef, 
        ready 
    } = useContext(MapContext);

    const {
        parcelas,
        formData,
        setFormData,
        setParcelas,
        setAreaParcela,
        setAreaCampo
    } = useOutletContext();

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
        if (geometry) {
            setAreaParcela(calculatePolygonAreaFromGeometry(geometry));
        }
    });

    const { setFeaturesOnMap, clearParcelas } = useMapParcelas({
        mapRef,
        parcelas,
        formData,
        clearEdit,
        activateEditMode,
        getCreatedFeature: () => null,
        setFormData,
        setAreaCampo,
        setAreaParcela,
        enabled: true,
        modoVisualizacionCampo: false
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
        setIsDeleteMode(false);
    };

    const handleGuardar = async () => {
        const feature = getEditedFeature();
        if (!feature || !formData.parcela_id) {
            setModalInfoMessage('Debe seleccionar una parcela existente para editar.');
            setModalInfoOpen(true);
            return;
        }

        const geometry = feature.getGeometry();
        if (!geometry) {
            setModalInfoMessage('Falta geometría válida.');
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
            resetHerramientas();
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
        setFeaturesOnMap();
    };

    useEffect(() => {
        resetHerramientas();
        polygonGlobals.onFinishCallback.current = (feature) => {
            if (feature) {
                activateEditMode(feature);
                setFormData(prev => ({ ...prev, parcela_id: '' }));
                const geometry = feature.getGeometry();
                if (geometry) {
                    setAreaParcela(calculatePolygonAreaFromGeometry(geometry));
                }
            }
        };
    }, []);

    useEffect(() => {
        if (!ready || !formData.campo_id) return;
        setFeaturesOnMap();
    }, [ready, formData.campo_id, formData.parcela_id, parcelas]);

    return (
        <>
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