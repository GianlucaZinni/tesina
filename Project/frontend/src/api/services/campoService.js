// ~/Project/frontend/src/api/services/campoService.js
import { apiFetch } from '../apiClient';

export async function createCampo(payload) {
    const res = await apiFetch('/map/api/campos/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })

    if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Error al crear campo')
    }

    return await res.json()
}

export async function updateCampo(id, payload) {
    const res = await apiFetch(`/map/api/campos/${id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })

    if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Error al actualizar campo')
    }

    return await res.json()
}

export async function deleteCampo(id) {
    const res = await apiFetch(`/map/api/campos/${id}/delete`, {
        method: 'DELETE'
    })
    if (!res.ok) throw new Error('Error al eliminar el campo')
    return await res.json()
}