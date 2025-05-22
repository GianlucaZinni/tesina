// hooks/polygonTools/general.js
import { useState } from 'react'

// Refs globales para ser accedidos desde cualquier hook
export const polygonGlobals = {
    modeRef: { current: null },
    onFinishCallback: { current: null }
}

export function usePolygonGeneral() {
    const [polygonMode, setPolygonMode] = useState(null)
    const [area, setArea] = useState(0)
    const [tooltipText, setTooltipText] = useState('Click para colocar el primer vértice')

    const setMode = (value) => {
        polygonGlobals.modeRef.current = value
        setPolygonMode(value)
    }

    const resetPolygonState = () => {
        polygonGlobals.modeRef.current = null
        polygonGlobals.onFinishCallback.current = null
        setPolygonMode(null)
        setArea(0)
        setTooltipText('Click para colocar el primer vértice')
    }

    return {
        polygonMode,
        setMode,
        resetPolygonState,
        area,
        setArea,
        tooltipText,
        setTooltipText
    }
}
