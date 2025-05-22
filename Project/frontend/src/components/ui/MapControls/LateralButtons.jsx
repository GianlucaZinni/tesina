// components/LateralButtons.jsx
import { Layers, LocateFixed } from 'lucide-react';
import { useEffect, useRef } from 'react';
import CompassButton from './CompassButton'

export default function LateralButtons({
    mapRef,
    onToggleLayer = () => { },
    onLocate = () => { },
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
        <div style={{top:"4.5rem"}} className="absolute right-4 z-40 flex flex-col gap-2">
            <button onClick={onToggleLayer} title="Cambiar capa" className="bg-white rounded-full p-3 shadow-md">
                <Layers className="w-6 h-6 text-gray-800" />
            </button>
            <button onClick={onLocate} title="Mi ubicación" className="bg-white rounded-full p-3 shadow-md">
                <LocateFixed className="w-6 h-6 text-gray-800" />
            </button>
            <CompassButton mapRef={mapRef} />
        </div>
    )
}
