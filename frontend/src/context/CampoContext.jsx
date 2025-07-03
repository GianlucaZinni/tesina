// ~/Project/frontend/src/context/CampoContext.jsx
import { createContext, useState } from 'react';

export const CampoContext = createContext();

export function CampoProvider({ children }) {
    const [campoSeleccionado, setCampoSeleccionado] = useState(null);
    const [lastCampoId, setLastCampoId] = useState(null);

    return (
        <CampoContext.Provider value={{ campoSeleccionado, setCampoSeleccionado, lastCampoId, setLastCampoId }}>
            {children}
        </CampoContext.Provider>
    );
}