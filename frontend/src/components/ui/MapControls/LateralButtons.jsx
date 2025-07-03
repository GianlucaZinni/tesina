// ~/Project/frontend/src/components/ui/MapControls/LateralButtons.jsx
import { Layers, LocateFixed, MapPinned } from 'lucide-react';
import { useEffect, useRef } from 'react';
import CompassButton from './CompassButton'

export default function LateralButtons({
    mapRef,
    onToggleLayer = () => { },
    onLocate = () => { },
    onCenterCampo = () => { },
}) {
    const rotateIconRef = useRef(null)

    useEffect(() => {
        if (!mapRef?.current) return
        const view = mapRef.current.getView()
        const listener = () => {
            const angle = view.getRotation()
            if (rotateIconRef.current) {
                rotateIconRef.current.style.transform = `rotate(${-angle}rad)`
            }
        }
        view.on('change:rotation', listener)
        return () => view.un('change:rotation', listener)
    }, [mapRef])

    return (
        <div className="absolute top-4 left-4 z-40 flex flex-col gap-2">
            <button onClick={onToggleLayer} title="Cambiar capa" className="bg-white rounded-full p-3 shadow-md">
                <Layers className="w-6 h-6 text-gray-800" />
            </button>
            <button
                onClick={onCenterCampo}
                title="Centrar en campo"
                className="bg-white p-3 rounded-full shadow-md"
            >
                <MapPinned className="w-6 h-6" />
            </button>
            <button onClick={onLocate} title="Centrar mapa" className="bg-white rounded-full p-3 shadow-md">
                <LocateFixed className="w-6 h-6 text-gray-800" />
            </button>
            <CompassButton mapRef={mapRef} />
        </div>
    )
}
