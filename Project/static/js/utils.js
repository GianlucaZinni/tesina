export function initBaseMap(center, tile = "satellite") {
    const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "UB Predeterminado"
    });
    const esriSat = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "UB Satélite" }
    );

    const baseMaps = { "Predeterminado": osm, "Satélite": esriSat };
    const map = L.map("map", {
        center: center,
        zoom: 15,
        maxZoom: 17,
        minZoom: 2,
        layers: [tile === "osm" ? osm : esriSat]
    });

    L.control.layers(baseMaps).addTo(map);
    L.Control.geocoder({ defaultMarkGeocode: true }).addTo(map);

    return map;
}

export function clearDrawnLayer(layerRef) {
    if (layerRef.value) {
        layerRef.map.removeLayer(layerRef.value);
        layerRef.value = null;
    }
}

export function loadGeoJSONInto(map, geojson, style = {}) {
    return L.geoJSON(geojson, { style }).addTo(map);
}
