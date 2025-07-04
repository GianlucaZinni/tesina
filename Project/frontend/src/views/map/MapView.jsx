// ~/Project/frontend/src/views/MapView.jsx
import { useEffect, useContext, useState, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { ModalInfo } from '@/components/common/Modals';
import { useMapParcelas } from '@/hooks/useMapParcelas';
import useViewCleanup from '@/hooks/useViewCleanup';
import { MapContext } from '@/context/MapContext';
import { CampoContext } from '@/context/CampoContext';
import { easeOut } from 'ol/easing';
import ClusterLayer from '@/components/cluster/ClusterLayer';
import { useAnimalDataStream } from '@/hooks/useAnimalDataStream';
import { fromLonLat, fetchMapFeatures } from '@/api/services/mapService';
import SearchAnimal from '@/components/ui/MapOverlays/SearchAnimal';

export default function MapView() {
    const [modalInfoOpen, setModalInfoOpen] = useState(false);
    const [modalInfoMessage, setModalInfoMessage] = useState('');
    const [parcelasGeo, setParcelasGeo] = useState({});

    const { mapRef, ready } = useContext(MapContext);
    const { campoSeleccionado, setCampoSeleccionado, lastCampoId } = useContext(CampoContext);
    const { campos, parcelas, formData, setFormData, setAreaCampo, setAreaParcela } = useOutletContext();

    const featuresMapRef = useRef(new Map());
    const insideClusterRef = useRef();
    const outsideClusterRef = useRef();

    const {
        setFeaturesOnMap,
        clearParcelas
    } = useMapParcelas({
        mapRef,
        parcelas,
        formData,
        clearEdit: () => { },
        activateEditMode: () => { },
        getCreatedFeature: () => null,
        setFormData,
        setAreaCampo,
        setAreaParcela,
        enabled: true,
        modoVisualizacionCampo: true
    });

    useViewCleanup(() => clearParcelas());

    useEffect(() => {
        fetchMapFeatures()
            .then(data => setParcelasGeo(data.parcelas))
            .catch(err => console.error('Error al cargar parcelas:', err));
    }, []);

    const { inside, outside } = useAnimalDataStream(10000, formData.campo_id);

    useEffect(() => {
        if (!ready || !formData.campo_id) return;
        setFeaturesOnMap();
    }, [ready, formData.campo_id, formData.parcela_id, parcelas]);

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
        const merged = new Map();
        const iRef = insideClusterRef.current?.current;
        const oRef = outsideClusterRef.current?.current;
        if (iRef) for (const [k, v] of iRef.entries()) merged.set(k, v);
        if (oRef) for (const [k, v] of oRef.entries()) merged.set(k, v);
        featuresMapRef.current = merged;
    }, [inside, outside]);

    return (
        <>
            <ModalInfo
                isOpen={modalInfoOpen}
                message={modalInfoMessage}
                onClose={() => setModalInfoOpen(false)}
            />

            <ClusterLayer
                map={mapRef.current}
                inside={inside}
                outside={outside}
                insideRef={insideClusterRef}
                outsideRef={outsideClusterRef}
                settings={{
                    distance: 50,
                    baseColor: 'orange',
                }}
            />

            <SearchAnimal
                mapRef={mapRef}
                inside={inside}
                outside={outside}
                featuresMapRef={featuresMapRef}
            />
        </>
    );
}
