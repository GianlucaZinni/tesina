// ~/Project/frontend/src/api/services/parcelaService.js
export async function fetchParcelaInit() {
    const res = await fetch('/api/parcelas/init')
    if (!res.ok) throw new Error('Error al cargar datos')
    return await res.json()
}

export async function getResumenParcelas() {
    const res = await fetch('/api/parcelas/animales/resumen');
    if (!res.ok) throw new Error('Error al cargar resumen de parcelas')
    return await res.json()
};

export async function createParcela(payload) {
    const res = await fetch('/api/parcelas/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    })

    if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Error al guardar')
    }

    return await res.json()
}

export async function updateParcela(id, geojson, nombre = '', descripcion = '', area) {
    const res = await fetch(`/api/parcelas/${id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geojson, nombre, descripcion, area }),
    })

    if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Error al actualizar')
    }

    return await res.json()
}

export async function deleteParcela(id) {
    const res = await fetch(`/api/parcelas/${id}/delete`, {
        method: 'DELETE'
    })
    if (!res.ok) throw new Error('Error al eliminar la parcela')
    return await res.json()
}