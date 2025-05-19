import { usePolygonGeneral } from './general'
import { useDrawTool } from './draw'
import { useChangeTool } from './change'

export function usePolygonTools(mapRef, onUpdate = () => {}) {
    const general = usePolygonGeneral()

    const draw = useDrawTool(mapRef, {
        mode: general.mode,
        setMode: general.setMode,
        setArea: general.setArea,
        setTooltipText: general.setTooltipText
    })

    const edit = useChangeTool(mapRef, onUpdate)

    return {
        ...general,
        ...draw,
        ...edit
    }
}