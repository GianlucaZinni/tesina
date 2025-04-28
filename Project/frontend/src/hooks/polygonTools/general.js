import { useState } from 'react'

export const modeRef = { current: null }
export const onFinishCallback = { current: null } // <-- export global

export function usePolygonGeneral() {
    const [mode, setModeState] = useState(null)
    const [area, setArea] = useState(0)
    const [tooltipText, setTooltipText] = useState('Click para colocar el primer vértice')

    const setMode = (value) => {
        modeRef.current = value
        setModeState(value)
    }

    return {
        mode,
        setMode,
        area,
        setArea,
        tooltipText,
        setTooltipText
    }
}
