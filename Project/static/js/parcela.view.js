import { initBaseMap, clearDrawnLayer, loadGeoJSONInto } from './utils.js';

document.addEventListener("DOMContentLoaded", () => {
    const coordenadas = window.COORDENADAS_CAMPO;
    const parcelas = window.PARCELAS_CAMPO;

    const campoSelect = document.getElementById("campo_selector");
    const parcelaSelect = document.getElementById("parcela_selector");
    const inputNombre = document.getElementById("parcela-nombre");
    const inputDescripcion = document.getElementById("parcela-descripcion");
    const inputGeojson = document.getElementById("perimetro_geojson");
    const inputParcelaId = document.getElementById("parcela_id");

    const map = initBaseMap([window.INIT_LAT, window.INIT_LON]);
    const drawn = new L.FeatureGroup().addTo(map);
    const capaParcelas = new L.LayerGroup().addTo(map);
    let drawnLayer = null;
    let parcelaEditableLayer = null;

    map.pm.addControls({
        position: "topleft",
        drawCircle: false,
        drawMarker: false,
        drawText: false,
        drawCircleMarker: false,
        drawPolyline: false,
        drawRectangle: false,
        drawPolygon: true,
        removalMode: true,
        editMode: true,
        dragMode: true
    });

    map.on("pm:create", function (e) {
        clearDrawnLayer({ map, value: drawnLayer });
        drawnLayer = e.layer;
        drawn.addLayer(drawnLayer);
        inputGeojson.value = JSON.stringify(drawnLayer.toGeoJSON());
    });

    function limpiarParcelaForm(mapRef) {
        if (inputNombre) inputNombre.value = '';
        if (inputDescripcion) inputDescripcion.value = '';
        if (inputGeojson) inputGeojson.value = '';
        if (inputParcelaId) inputParcelaId.value = '';

        if (parcelaEditableLayer) {
            mapRef.removeLayer(parcelaEditableLayer);
            parcelaEditableLayer = null;
        }

        if (drawnLayer) {
            mapRef.removeLayer(drawnLayer);
            drawnLayer = null;
        }

        drawn.clearLayers();
    }

    campoSelect.addEventListener("change", function () {
        const campoId = this.value;
        parcelaSelect.innerHTML = '<option value="">-- Crear nueva parcela --</option>';
        capaParcelas.clearLayers();
        limpiarParcelaForm(map);

        const coords = coordenadas[campoId];
        if (coords) map.setView([coords.lat, coords.lon], 15);

        if (parcelas[campoId]) {
            // pintar todas las parcelas automáticamente
            parcelas[campoId].forEach(p => {
                loadGeoJSONInto(map, p, {
                    color: '#3388ff', weight: 2, fillOpacity: 0.2
                }).addTo(capaParcelas);

                const opt = document.createElement("option");
                opt.value = p.id;
                opt.innerText = p.nombre;
                parcelaSelect.appendChild(opt);
            });
        }
    });

    parcelaSelect.addEventListener("change", function () {
        const parcelaId = this.value;
        const campoId = campoSelect.value;
        capaParcelas.clearLayers();
        limpiarParcelaForm(map);

        if (!parcelaId) {
            if (parcelas[campoId]) {
                parcelas[campoId].forEach(p => {
                    loadGeoJSONInto(map, p, {
                        color: '#3388ff', weight: 2, fillOpacity: 0.2
                    }).addTo(capaParcelas);
                });
            }
            return;
        }

        const geojson = parcelas[campoId].find(p => p.id == parcelaId);
        if (!geojson) return;

        parcelaEditableLayer = loadGeoJSONInto(map, geojson, {
            color: 'orange', weight: 2, fillOpacity: 0.4
        });

        const layer = parcelaEditableLayer.getLayers()[0];
        layer.pm.enable({ allowSelfIntersection: false });

        inputParcelaId.value = parcelaId;
        inputNombre.value = geojson.nombre || "";
        inputDescripcion.value = geojson.descripcion || "";

        layer.on("pm:edit", function (e) {
            const updatedGeoJSON = e.layer.toGeoJSON();
            inputGeojson.value = JSON.stringify(updatedGeoJSON);
            fetch(`/parcela/${parcelaId}/update`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ geojson: updatedGeoJSON })
            })
                .then(res => res.json())
                .then(data => console.log("Guardado", data))
                .catch(err => console.error("Error al guardar:", err));
        });
    });
});
