export function clearDrawnLayer(layerRef) {
    if (layerRef.value) {
        layerRef.map.removeLayer(layerRef.value);
        layerRef.value = null;
    }
}

export function createBaseMap(containerId, centerCoords) {
    const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "UB © Predeterminado"
    });

    const esriSat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "UB © Satélite"
    });

    const map = L.map(containerId, {
        center: centerCoords,
        zoom: 15,
        maxZoom: 17,
        minZoom: 4,
        zoomControl: false,
        layers: [esriSat]
    });

    // Guardamos en window para acceso externo
    window._leaflet_map_instance = map
    window.osm = osm
    window.esriSat = esriSat

    return map
}