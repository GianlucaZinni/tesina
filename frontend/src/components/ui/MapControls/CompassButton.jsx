// ~/Project/frontend/src/components/ui/MapControls/CompassButton.jsx
import { useEffect, useRef } from 'react'

export default function CompassButton({ mapRef }) {
    const iconRef = useRef(null)
    const isDraggingRef = useRef(false)
    const centerRef = useRef({ x: 0, y: 0 })
    const startMapRotationRef = useRef(0)
    const startMouseAngleRef = useRef(0)

    const SENSITIVITY = 0.4 // Cuanto menor, más suave

    useEffect(() => {
        if (!mapRef?.current) return

        const view = mapRef.current.getView()

        const updateRotation = () => {
            const angle = view.getRotation()
            if (iconRef.current) {
                iconRef.current.style.transform = `rotate(${-angle}rad)`
            }
        }

        updateRotation()
        view.on('change:rotation', updateRotation)
        return () => view.un('change:rotation', updateRotation)
    }, [mapRef])

    const getAngleFromCenter = (x, y) => {
        const dx = x - centerRef.current.x
        const dy = centerRef.current.y - y // Invertido
        return Math.atan2(dx, dy)
    }

    const onMouseDown = (e) => {
        if (!mapRef.current) return
        isDraggingRef.current = true

        const rect = e.currentTarget.getBoundingClientRect()
        centerRef.current = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        }

        startMapRotationRef.current = mapRef.current.getView().getRotation()
        startMouseAngleRef.current = getAngleFromCenter(e.clientX, e.clientY)

        window.addEventListener('mousemove', onMouseMove)
        window.addEventListener('mouseup', onMouseUp)
    }

    const onMouseMove = (e) => {
        if (!isDraggingRef.current || !mapRef.current) return

        const currentMouseAngle = getAngleFromCenter(e.clientX, e.clientY)
        const delta = currentMouseAngle - startMouseAngleRef.current

        const newRotation = startMapRotationRef.current + delta * SENSITIVITY
        mapRef.current.getView().setRotation(newRotation)
    }

    const onMouseUp = () => {
        isDraggingRef.current = false
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
    }

    const onClick = () => {
        if (!isDraggingRef.current && mapRef.current) {
            mapRef.current.getView().setRotation(0)
        }
    }

    return (
        <button
            title="Brújula"
            className="bg-white rounded-full p-3 shadow-md transition-transform select-none"
            onMouseDown={onMouseDown}
            onClick={onClick}
        >
            <img
                ref={iconRef}
                src="/dist/compass.svg"
                alt="Compass"
                className="w-6 h-6 transition-transform pointer-events-none"
            />
        </button>
    )
}
