import { apiFetch } from '../apiClient';

export async function fetchCollars() {
    const res = await apiFetch('/api/collares/')
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al obtener todos los collares.');
    }
    return await res.json()
}

export async function fetchCollarStates() {
    const res = await apiFetch('/api/collares/states');
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al obtener los estados de collar.');
    }
    return await res.json();
}

export async function fetchCollarsAvailables() {
    const res = await apiFetch('/api/collares/available')
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al obtener los collares disponibles.');
    }
    return await res.json()
}

export async function deleteCollar(collarId) {
    const res = await apiFetch(`/api/collares/${collarId}`, {
        method: 'DELETE'
    })
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al eliminar collar.');
    }
    return await res.json()
}

export async function deleteCollarsBatch(ids) {
    const res = await apiFetch('/api/collares/', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids })
    })
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al eliminar collares.');
    }
    return await res.json();
}

export const createCollarsBatch = async (data) => {
    const response = await apiFetch('/api/collares/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
    });
    console.log(response)
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear collares en lote.');
    }
    return response.json();
};

export const updateCollar = async (collarId, data) => {
    const response = await apiFetch(`/api/collares/${collarId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar collar.');
    }
    return response.json();
};

export const fetchCollarDetails = async (collarId) => {
    const response = await apiFetch(`/api/collares/${collarId}`);
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener detalles del collar.');
    }
    return response.json();
};

export const handleCollarAssignment = async (collarId, animalId) => { // animalId puede ser null
    const response = await apiFetch(`/api/collares/${collarId}/assign`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ animal_id: animalId }), // animal_id puede ser null
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al manejar la asignación del collar.');
    }
    return response.json();
};

export async function downloadCollarTemplate() {
    const res = await apiFetch('/api/collares/export/template');
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al descargar la plantilla de collares.');
    }
    return res.blob();
}
