// ~/Project/frontend/src/hooks/polygonTools/index.js
import { usePolygonGeneral } from './general'
import { useDrawTool } from './draw'
import { useChangeTool } from './change'

export function usePolygonTools(mapRef, onUpdate = () => {}) {
    const general = usePolygonGeneral()

    const draw = useDrawTool(mapRef, {
        setMode: general.setMode,
        setArea: general.setArea,
        setTooltipText: general.setTooltipText
    })

    const edit = useChangeTool(mapRef, {
        setMode: general.setMode,
    }, 
    onUpdate)

    return {
        ...general,
        ...draw,
        ...edit
    }
}
