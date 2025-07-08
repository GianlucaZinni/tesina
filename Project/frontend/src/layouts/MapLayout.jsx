// ~/Project/frontend/src/layouts/MapLayout.jsx
import { Outlet } from 'react-router-dom';
import { useContext, useEffect, useState } from 'react';
import LateralButtons from '@/components/ui/MapControls/LateralButtons';
import CampoSelector from '@/components/ui/MapControls/CampoSelector';
import { MapContext } from '@/context/MapContext';
import { CampoContext } from '@/context/CampoContext';
import { fromLonLat, createBaseMap, fetchMapFeatures } from '@/api/services/mapService';
import { easeOut } from 'ol/easing';

export default function MapLayout() {
    const { mapRef, ready } = useContext(MapContext);
    const { campoSeleccionado, setCampoSeleccionado, lastCampoId } = useContext(CampoContext);

    const [campos, setCampos] = useState({});
    const [parcelas, setParcelas] = useState({});
    const [formData, setFormData] = useState({ campo_id: '', parcela_id: '', nombre: '', descripcion: '' });
    const [areaCampo, setAreaCampo] = useState(0);
    const [areaParcela, setAreaParcela] = useState(0);
    const [selectorOpen, setSelectorOpen] = useState(false);

    useEffect(() => {
        async function init() {
            const data = await fetchMapFeatures();
            const defaultCampo = data.campo_preferido_id || Object.keys(data.campos)[0];
            const campoInicial = campoSeleccionado ?? lastCampoId ?? defaultCampo;

            if (campoInicial) {
                const campo = data.campos[campoInicial];
                const map = createBaseMap('map', [campo.lat, campo.lon]);
                mapRef.current = map;
                setCampoSeleccionado(campoInicial);
                setFormData(prev => ({ ...prev, campo_id: campoInicial }));
            }
            setCampos(data.campos);
            setParcelas(data.parcelas);
        }
        init();
    }, []);

    useEffect(() => {
        const handler = () => setSelectorOpen(false);
        window.addEventListener('closeCampoSelector', handler);
        return () => window.removeEventListener('closeCampoSelector', handler);
    }, []);

    return (
        <>
            {mapRef.current && (
                <LateralButtons
                    mapRef={mapRef}
                    onToggleLayer={() => {
                        const osm = window.osm;
                        const sat = window.esriSat;
                        if (osm && sat) {
                            osm.setVisible(!osm.getVisible());
                            sat.setVisible(!sat.getVisible());
                        }
                    }}
                    onCenterCampo={() => {
                        if (!mapRef.current || !campoSeleccionado || !campos[campoSeleccionado]) return;
                        const campo = campos[campoSeleccionado];
                        mapRef.current.getView().animate({
                            center: fromLonLat([campo.lon, campo.lat]),
                            duration: 800,
                            easing: easeOut
                        });
                    }}
                    onLocate={() => {
                        if (navigator.geolocation && mapRef.current) {
                            navigator.geolocation.getCurrentPosition(pos => {
                                const coords = [pos.coords.longitude, pos.coords.latitude];
                                mapRef.current.getView().animate({
                                    center: fromLonLat(coords),
                                    duration: 800,
                                    easing: easeOut
                                });
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
                        setFormData(prev => ({ ...prev, campo_id: id, parcela_id: '', nombre: '', descripcion: '' }));
                    }}
                    mapRef={mapRef}
                />
            </div>

            <Outlet context={{
                campos,
                parcelas,
                formData,
                setFormData,
                setCampos,
                setParcelas,
                setAreaParcela,
                setAreaCampo
            }} />
        </>
    );
}