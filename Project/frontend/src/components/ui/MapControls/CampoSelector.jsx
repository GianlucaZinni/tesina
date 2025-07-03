// ~/Project/frontend/src/components/ui/MapControls/CampoSelector.jsx
import { useEffect } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import { fromLonLat } from '../../../api/services/mapService';
import { easeOut } from 'ol/easing';

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
            mapRef.current.getView().animate({
                center: fromLonLat([campo.lon, campo.lat]),
                duration: 800,
                easing: easeOut
            });
        }
        onSelectCampo(id);
        setSelectorOpen(false);
        window.dispatchEvent(new Event('cerrarPopupResumen'));
    };

    useEffect(() => {
        const close = () => setSelectorOpen(false);
        window.addEventListener('closeCampoSelector', close);
        return () => window.removeEventListener('closeCampoSelector', close);
    }, []);

    return (
        <div className="relative" data-testid="campo-selector">
            <button
                onClick={() => {
                    setSelectorOpen(prev => {
                        const newState = !prev;
                        if (newState) window.dispatchEvent(new Event('closeForm'));
                        return newState;
                    });
                }}
                className="flex items-center px-4 py-2 bg-black/60 backdrop-blur-md rounded-full shadow-lg text-white text-sm hover:bg-black/70 transition-all max-w-full"
            >
                <div className="flex flex-col items-center min-w-[120px] max-w-[150px]">
                    <span className="text-xs text-gray-300 truncate">
                        {(campoId && campos[campoId]) ? campos[campoId].nombre : 'Creando nuevo campo'}
                    </span>

                    {parcelaId && campoId ? (
                        <>
                            <div className="flex items-center justify-center gap-1 flex-wrap">
                                <MapPin size={14} className="text-blue-400" />
                                <span className="text-sm truncate">{parcelaNombre}</span>
                            </div>
                            <span className="text-xs text-green-400 mt-0.5">
                                {(areaParcela / 10000).toFixed(2)} ha
                            </span>
                        </>
                    ) : campoId && campos[campoId] ? (
                        <span className="text-xs text-green-400 mt-0.5">
                            {(areaCampo / 10000).toFixed(2)} ha
                        </span>
                    ) : (
                        <span className="text-xs text-green-400 mt-0.5">0.00 ha</span>
                    )}
                </div>
                <ChevronDown size={16} className="text-white" />
            </button>
            {selectorOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-xl shadow-md text-sm overflow-hidden z-20 w-full">
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
