// context/CampoContext.jsx
import { createContext, useState } from 'react';

export const CampoContext = createContext();

export function CampoProvider({ children }) {
    const [campoSeleccionado, setCampoSeleccionado] = useState(null);

    return (
        <CampoContext.Provider value={{ campoSeleccionado, setCampoSeleccionado }}>
            {children}
        </CampoContext.Provider>
    );
}
