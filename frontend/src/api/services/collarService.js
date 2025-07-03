// ~/Project/frontend/src/api/services/collarService.js

export async function fetchCollaresInit() {
    const res = await fetch('/api/collares/')
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al obtener todos los collares.');
    }
    return await res.json()
}

export async function fetchCollaresDisponibles() {
    const res = await fetch('/api/collares/available')
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al obtener los collares disponibles.');
    }
    return await res.json()
}

export async function deleteCollar(collarId) {
    const res = await fetch(`/api/collares/${collarId}`, {
        method: 'DELETE'
    })
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al eliminar collar.');
    }
    return await res.json()
}

export const createCollarBatch = async (data) => {
    const response = await fetch('/api/collares/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            // 'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear collares en lote.');
    }
    return response.json();
};

export const updateCollar = async (collarId, data) => {
    const response = await fetch(`/api/collares/${collarId}`, {
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
    const response = await fetch(`/api/collares/${collarId}`);
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al obtener detalles del collar.');
    }
    return response.json();
};

export const handleCollarAssignment = async (collarId, animalId) => { // animalId puede ser null
    const response = await fetch(`/api/collares/${collarId}/assign`, {
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

export async function fetchCollarStates() {
    const res = await fetch('/api/collares/estados');
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al obtener los estados de collar.');
    }
    return await res.json();
}

export async function downloadCollarTemplate() {
    const res = await fetch('/api/collares/export/template');
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al descargar la plantilla de collares.');
    }
    return res.blob();
}

export async function exportCollares(type, filters = {}) {
    const params = new URLSearchParams({ type });
    if (filters.globalFilter) {
        params.append('globalFilter', filters.globalFilter);
    }
    if (filters.ids && filters.ids.length > 0) {
        params.append('ids', filters.ids.join(','));
    }

    const res = await fetch(`/api/collares/export?${params.toString()}`);
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al exportar collares.');
    }
    return res.blob();
}

export async function importCollares(file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/collares/import', {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al importar collares.');
    }
    return await res.json(); // Devuelve el JSON con summary y errores
}