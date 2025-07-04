// ~/Project/frontend/src/api/services/animalService.js

import { apiFetch } from '../apiClient';

export async function fetchAnimalesInit() {
    const res = await apiFetch('/api/animals/')
    if (!res.ok) throw new Error('Error al cargar animales')
    return await res.json()
}

export async function fetchAnimalsEntities(campoId) {
    const res = await apiFetch(`/api/animals/${campoId}/entities`)
    if (!res.ok) throw new Error('Error al cargar clusters de animales')
    return await res.json()
}

export async function fetchAnimalesOptions() {
    const res = await apiFetch('/api/animals/options')
    if (!res.ok) throw new Error('Error al cargar las opciones')
    return await res.json()
}

export async function fetchFichaSimple(animalId) {
    const res = await apiFetch(`/api/animals/${animalId}/simple_sheet`)
    if (!res.ok) throw new Error('Error al cargar ficha simple')
    return await res.json()
}

export async function fetchFichaCompleta(animalId) {
    const res = await apiFetch(`/api/animals/${animalId}/complete_sheet`)
    if (!res.ok) throw new Error('Error al cargar ficha completa')
    return await res.json()
}

export async function createAnimal(payload) {
    const res = await apiFetch('/api/animals/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Error al crear animal')
    }
    return await res.json()
}

// Ruta actualizada a PUT /api/animals/{id}
export async function updateAnimal(animalId, payload) {
    const res = await apiFetch(`/api/animals/${animalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Error al actualizar animal')
    }
    return await res.json()
}

// Ruta actualizada a DELETE /api/animals/{id}
export async function deleteAnimal(animalId) {
    const res = await apiFetch(`/api/animals/${animalId}`, {
        method: 'DELETE'
    })
    if (!res.ok) throw new Error('Error al eliminar animal')
    return await res.json()
}

// Ruta actualizada a PUT /api/animals/bulk_upsert
export async function apiAnimalsBulkUpsert() {
    const res = await apiFetch(`/api/animals/bulk_upsert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Error al actualizar animales en masa')
    }
    return await res.json()
}

export async function downloadAnimalTemplate() {
    const res = await apiFetch('/api/animals/export/template');
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al descargar la plantilla de animales.');
    }
    // No parsear a JSON, se devuelve un blob directamente
    return res.blob();
}

export async function exportAnimals(type, filters = {}) {
    const params = new URLSearchParams({ type });
    if (filters.globalFilter) {
        params.append('globalFilter', filters.globalFilter);
    }
    if (filters.ids && filters.ids.length > 0) {
        params.append('ids', filters.ids.join(','));
    }

    const res = await apiFetch(`/api/animals/export?${params.toString()}`);
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al exportar animales.');
    }
    return res.blob();
}

export async function importAnimals(file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiFetch('/api/animals/import', {
        method: 'POST',
        body: formData,
    });

    if (!res.ok) {
        const errorData = await res.json(); // El backend devolverá JSON incluso en error
        throw new Error(errorData.message || 'Error al importar animales.');
    }
    return await res.json(); // Devuelve el JSON con summary y errores
}