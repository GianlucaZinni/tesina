document.addEventListener("DOMContentLoaded", function () {
    const campos = window.CAMPOS_DATA;
    const selector = document.getElementById("campo_selector");
    const campoIdInput = document.getElementById("campo_id");
    const inputNombre = document.getElementById("campo-nombre");
    const inputDescripcion = document.getElementById("campo-descripcion");
    const inputLat = document.getElementById("lat");
    const inputLon = document.getElementById("lon");

    // Rellenar el selector
    campos.forEach(campo => {
        const opt = document.createElement("option");
        opt.value = campo.id;
        opt.innerText = campo.nombre;
        selector.appendChild(opt);
    });

    const map = createBaseMap("map", [window.CENTER_LAT, window.CENTER_LON]);
    let marker = null;

    map.on("click", function (e) {
        if (marker) map.removeLayer(marker);
        marker = L.marker(e.latlng).addTo(map);
        inputLat.value = e.latlng.lat;
        inputLon.value = e.latlng.lng;
    });

    selector.addEventListener("change", function () {
        const campoId = this.value;
        const campo = campos.find(c => c.id == campoId);

        if (!campo) {
            campoIdInput.value = "";
            inputNombre.value = "";
            inputDescripcion.value = "";
            inputLat.value = "";
            inputLon.value = "";
            if (marker) map.removeLayer(marker);
            return;
        }

        campoIdInput.value = campo.id;
        inputNombre.value = campo.nombre;
        inputDescripcion.value = campo.descripcion;
        inputLat.value = campo.lat;
        inputLon.value = campo.lon;

        const latlng = [campo.lat, campo.lon];
        if (marker) map.removeLayer(marker);
        marker = L.marker(latlng).addTo(map);
        map.setView(latlng, 15);
    });

    document.querySelector("form").addEventListener("submit", function (e) {
        if (!inputLat.value || !inputLon.value) {
            e.preventDefault();
            alert("⚠️ Debe seleccionar una ubicación en el mapa.");
        }
    });
});
