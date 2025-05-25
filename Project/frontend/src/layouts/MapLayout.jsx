// src/layouts/MapLayout.jsx
import { Outlet } from 'react-router-dom';
import { useContext, useEffect, useState } from 'react';
import LateralButtons from '../components/ui/MapControls/LateralButtons';
import CampoSelector from '../components/ui/CampoSelector/CampoSelector';
import { MapContext } from '../context/MapContext';
import { CampoContext } from '../context/CampoContext';
import { fetchParcelaInit } from '../api/services/parcelaService';
import { fromLonLat } from '../api/services/mapService';

export default function MapLayout() {
    const { mapRef } = useContext(MapContext);
    const { campoSeleccionado, setCampoSeleccionado, lastCampoId } = useContext(CampoContext);

    const [campos, setCampos] = useState({});
    const [parcelas, setParcelas] = useState({});
    const [formData, setFormData] = useState({ campo_id: '', parcela_id: '', nombre: '', descripcion: '' });
    const [areaCampo, setAreaCampo] = useState(0);
    const [areaParcela, setAreaParcela] = useState(0);
    const [selectorOpen, setSelectorOpen] = useState(false);

    useEffect(() => {
        async function init() {
            const data = await fetchParcelaInit();
            setCampos(data.campos);
            setParcelas(data.parcelas);
            const defaultCampo = data.campo_preferido_id || Object.keys(data.campos)[0];
            const campoInicial = campoSeleccionado ?? lastCampoId ?? defaultCampo;
    
            if (campoInicial) {
                setCampoSeleccionado(campoInicial);
                setFormData(prev => ({ ...prev, campo_id: campoInicial }));
            }
        }
        init();
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
                        mapRef.current.getView().setCenter(fromLonLat([campo.lon, campo.lat]));
                    }}
                    onLocate={() => {
                        if (navigator.geolocation && mapRef.current) {
                            navigator.geolocation.getCurrentPosition(pos => {
                                const coords = [pos.coords.longitude, pos.coords.latitude];
                                mapRef.current.getView().animate({ center: fromLonLat(coords), zoom: 16 });
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
