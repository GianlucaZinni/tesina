// components/CampoSelector.jsx
import { ChevronDown, MapPin } from 'lucide-react';
import { fromLonLat } from '../../../api/services/mapService';

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
            mapRef.current.getView().setCenter(fromLonLat([campo.lon, campo.lat]));
        }
        onSelectCampo(id);
        setSelectorOpen(false);
    };

    return (
        <div className="relative" data-testid="campo-selector">
            <button
                onClick={() => {
                    setSelectorOpen(prev => !prev);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-black/60 backdrop-blur-md rounded-full shadow-lg text-white font-semibold text-sm hover:bg-black/70 transition-all"
            >
                <div className="flex flex-col text-left">

                    <span className="text-xs text-gray-300">
                        {(campoId && campos[campoId]) ? campos[campoId].nombre : 'Creando nuevo campo'}
                    </span>

                    {parcelaId && campoId ? (
                        <div className="flex items-center gap-1">
                            <MapPin size={14} className="text-cyan-400" />
                            <span className="text-sm">{parcelaNombre}</span>
                            <span className="text-xs text-green-400 ml-2">
                                {(areaParcela / 10000).toFixed(2)} ha
                            </span>
                        </div>
                    ) : campoId && campos[campoId] ? (
                        <span className="text-xs text-green-400">
                            {(areaCampo / 10000).toFixed(2)} ha
                        </span>
                    ) : (
                        <span className="text-xs text-green-400">0.00 ha</span>
                    )}
                </div>
                <ChevronDown size={16} className="text-white" />
            </button>

            {selectorOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white rounded-md shadow-md text-sm overflow-hidden z-20 w-full">
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
