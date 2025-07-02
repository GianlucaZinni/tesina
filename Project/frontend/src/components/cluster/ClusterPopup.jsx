import React from 'react';
import {
    X,
    PawPrint,
    MapPin,
    Fence,
    Bone,
    Shell,
    Origami,
    Dumbbell,
    Calendar,
    Zap,
    VenusAndMars,
    Thermometer,
    HeartPlus,
    Info,
    AtSign,
    Tag,
    Activity,
    BatteryLow,
    BatteryFull,
    BatteryMedium,
    XCircle,

} from 'lucide-react';
import { Badge } from '@/components/ui/shadcn/badge';
import { cn } from '@/lib/utils';

export default function ClusterPopup({ metadata, onClose }) {
    if (!metadata) return null;

    const {
        nombre,
        raza,
        sexo,
        peso,
        tipo,
        estado_reproductivo,
        especie,
        campo,
        parcela,
        numero_identificacion,
        ubicacion_sensor,
        fecha_nacimiento,
        temperatura_corporal_actual,
        collar_asignado,
    } = metadata;

    return (
        <div
            className="space-y-1 p-4 rounded-xl bg-white max-h-[355px] overflow-y-auto"
            role="dialog"
            aria-label={`Información de ${nombre ?? 'animal'}`}
            tabIndex={0}
            onClick={(e) => e.stopPropagation()}
        >
            <button
                onClick={onClose}
                className="absolute top-3 right-3 text-gray-500 hover:text-black"
                aria-label="Cerrar"
            >
                <X size={20} />
            </button>

            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-blue-700 break-words">
                <PawPrint size={20} /> {nombre || 'Animal'} ({numero_identificacion})
            </h3>

            <div className="grid grid-cols-2 gap-y-2 gap-x-4 mb-3">
                <PopupLine icon={MapPin} label="Campo" value={campo} color="text-blue-600" />
                <PopupLine icon={Fence} label="Parcela" value={parcela} color="text-blue-400" />
                <PopupLine icon={Bone} label="Especie" value={especie} color="text-pink-600" />
                <PopupLine icon={Shell} label="Tipo" value={tipo} color="text-yellow-600" />
                <PopupLine icon={Origami} label="Raza" value={raza} color="text-orange-600" />
                <PopupLine icon={Dumbbell} label="Peso" value={`${peso} kg`} color="text-emerald-600" />
                <PopupLine icon={Calendar} label="Nacimiento" value={fecha_nacimiento} color="text-cyan-600" />
                <PopupLine icon={Zap} label="Sensor" value={ubicacion_sensor} color="text-rose-600" />
                <PopupLine icon={VenusAndMars} label="Sexo" value={sexo} color="text-indigo-600" />
                <PopupLine icon={Thermometer} label="Temperatura" value={temperatura_corporal_actual ?? 'N/A'} color="text-red-600" />
                <PopupLine icon={HeartPlus} label="Estado Reproductivo" value={estado_reproductivo} color="text-violet-600" />
            </div>

            {collar_asignado && (
                <div className="pt-3 border-t border-gray-200">
                    <h4 className="text-gray-700 text-center font-semibold mb-2">📡 Collar asignado</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 mb-3">
                        <div className="flex items-start gap-2">
                            <AtSign size={16} className={cn('mt-1', "text-cyan-600")} />
                                <strong>ID:</strong> {collar_asignado.collar_id}
                        </div>
                        <div className="flex items-start gap-2">
                            <Tag size={16} className={cn('mt-1', "text-purple-600")} />
                                <strong>Código:</strong> {collar_asignado.codigo}
                        </div>
                        <div className="flex items-start gap-2 break-words">
                            <Activity size={16} className={cn('mt-1', "text-red-600")} />
                            <div className="flex flex-col">
                            <strong>Última actividad:</strong> {collar_asignado.ultima_actividad?.split(".")[0]}
                            </div>
                        </div>
                        <div className="flex items-start gap-2">
                            {getEstadoBadge(collar_asignado.estado, collar_asignado.bateria)}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function PopupLine({ icon: Icon, label, value, color = 'text-gray-700' }) {
    return (
        <div className="flex items-start gap-2 break-words">
            <Icon size={16} className={cn('mt-1', color)} />
            <div className="flex flex-col">
                <span className="font-medium text-gray-700 leading-tight">{label}:</span>
                <span className="text-gray-800 leading-tight break-words whitespace-pre-wrap">{value}</span>
            </div>
        </div>
    );
}

function getEstadoBadge(estado, bateria) {
    const estadoSanitizado = (estado || '').toLowerCase();
    const isActivo = estadoSanitizado === 'activo';

    let icon = <Info className="h-4 w-4" />;
    let text = 'Desconocido';
    let badgeClass = 'bg-gray-100 text-gray-700';

    if (isActivo && typeof bateria === 'number') {
        if (bateria >= 70) {
            icon = <BatteryFull className="h-4 w-4 text-green-600" />;
            badgeClass = 'bg-green-100 text-green-800';
        } else if (bateria >= 30) {
            icon = <BatteryMedium className="h-4 w-4 text-yellow-500" />;
            badgeClass = 'bg-yellow-100 text-yellow-800';
        } else {
            icon = <BatteryLow className="h-4 w-4 text-red-700" />;
            badgeClass = 'bg-red-100 text-red-800';
        }
        text = `Activo (${bateria}%)`;
    } else {
        switch (estadoSanitizado) {
            case 'disponible':
                icon = <CircleDotDashed className="h-4 w-4 text-green-600" />;
                badgeClass = 'bg-green-100 text-green-800';
                text = 'Disponible';
                break;
            case 'sin bateria':
                icon = <BatteryLow className="h-4 w-4 text-red-700" />;
                badgeClass = 'bg-red-100 text-red-800';
                text = 'Sin batería';
                break;
            case 'defectuoso':
                icon = <XCircle className="h-4 w-4 text-red-700" />;
                badgeClass = 'bg-red-100 text-red-800';
                text = 'Defectuoso';
                break;
            default:
                text = estadoSanitizado.charAt(0).toUpperCase() + estadoSanitizado.slice(1);
                break;
        }
    }

    return (
        <Badge className={cn('flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap', badgeClass)}>
            {icon}
            {text}
        </Badge>
    );
}
