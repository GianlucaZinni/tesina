function createBaseMap(containerId, centerCoords) {
    const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "UB © Predeterminado"
    });

    const esriSat = L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
        attribution: "UB © Satélite"
    });

    const map = L.map(containerId, {
        center: centerCoords,
        zoom: 15,
        maxZoom: 19,
        minZoom: 2,
        layers: [esriSat]
    });

    L.control.layers({ "Predeterminado": osm, "Satélite": esriSat }).addTo(map);
    L.Control.geocoder({ defaultMarkGeocode: true }).addTo(map);

    return map;
}
