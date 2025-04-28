export async function fetchParcelaInit() {
    const res = await fetch('/config/api/parcelas/init')
    if (!res.ok) throw new Error('Error al cargar datos')
    return await res.json()
}

export async function createParcela(payload) {
    const res = await fetch('/config/api/parcelas/create', {
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

export async function updateParcela(id, geojson, nombre = '', descripcion = '') {
    const res = await fetch(`/config/api/parcelas/${id}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geojson, nombre, descripcion }),
    })

    if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || 'Error al actualizar')
    }

    return await res.json()
}

export async function deleteParcela(id) {
    const res = await fetch(`/config/api/parcelas/${id}/delete`, {
        method: 'DELETE'
    })
    if (!res.ok) throw new Error('Error al eliminar la parcela')
    return await res.json()
}

export const PARCELA_STYLES = {
    base: {
        color: '#FFFFFF',
        weight: 5,
        fillOpacity: 0
    },
    edit: {
        polygon: {
            color: '#e92694',
            weight: 5,
            fillOpacity: 0.2
        },
        vertex: {
            radius: 6,
            color: '#8E1358',
            fillColor: '#C60AB2',
            fillOpacity: 1,
            weight: 1
        }
    },
    draw: {
        polygon: {
            color: '#FF9B00',
            weight: 5,
            fillOpacity: 0.2
        },
        vertex: {
            radius: 6,
            color: '#A0660C',
            fillColor: '#714808',
            fillOpacity: 1,
            weight: 1
        }
    },
    created: {
        color: '#2cf5dc',
        fillColor: '#79f2e3',
        weight: 5,
        fillOpacity: 0.2
    }
}