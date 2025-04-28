import { createBaseMap } from "./leaflet.base.js";

let mapas = {};      // animal_id -> Leaflet map
let marcadores = {}; // animal_id -> Leaflet marker

const vacaIcon = L.icon({
    iconUrl: '/static/recursos-img/vaca.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -30]
});

async function cargarDatosRealtime() {
    try {
        const res = await axios.get("/dashboard/data");
        const datos = res.data;
        const contenedor = document.getElementById("panel-dinamico");

        datos.forEach((entry) => {
            const cardId = `map-${entry.animal_id}`;
            const cardContainerId = `card-${entry.animal_id}`;

            let tarjeta = document.getElementById(cardContainerId);

            if (!tarjeta) {
                tarjeta = document.createElement("div");
                tarjeta.className = "col-md-6 mb-4";
                tarjeta.id = cardContainerId;

                tarjeta.innerHTML = `
                <div class="card shadow">
                    <div class="card-body">
                    <h5 class="card-title">🐄 ${entry.nombre} (${entry.collar_codigo})</h5>
                    <div class="map-container" id="container-${cardId}">
                        ${entry.ubicacion ? `<div id="${cardId}" style="height: 200px;" class="mb-3"></div>` : '<p class="text-muted">Sin datos de ubicación</p>'}
                    </div>
                    <p class="mb-1" id="temp-${entry.animal_id}"></p>
                    <p class="mb-1" id="accel-${entry.animal_id}"></p>
                    <p class="text-muted small mt-3" id="time-${entry.animal_id}"></p>
                    </div>
                </div>
                `;

                contenedor.appendChild(tarjeta);

                // Crear mapa si hay ubicación
                if (entry.ubicacion) {
                    const map = createBaseMap(cardId, [entry.ubicacion.lat, entry.ubicacion.lon]);
                    const marker = L.marker([entry.ubicacion.lat, entry.ubicacion.lon], { icon: vacaIcon })
                        .addTo(map)
                        .bindPopup(entry.nombre);

                    mapas[entry.animal_id] = map;
                    marcadores[entry.animal_id] = marker;
                }
            } else {
                // Actualizar marcador si existe
                if (entry.ubicacion && marcadores[entry.animal_id]) {
                    marcadores[entry.animal_id].setLatLng([entry.ubicacion.lat, entry.ubicacion.lon]);
                    marcadores[entry.animal_id].setPopupContent(entry.nombre);
                    mapas[entry.animal_id].panTo([entry.ubicacion.lat, entry.ubicacion.lon]);
                }
            }

            // Actualizar info
            const temp = document.getElementById(`temp-${entry.animal_id}`);
            const accel = document.getElementById(`accel-${entry.animal_id}`);
            const time = document.getElementById(`time-${entry.animal_id}`);

            temp.innerHTML = `<strong>Temperatura Corporal:</strong> ` +
                (entry.temperatura !== null
                    ? `<span class="badge ${entry.temperatura > 39.5 ? 'bg-danger' : 'bg-success'}">${entry.temperatura} °C</span>`
                    : '<span class="text-muted">Sin datos</span>');

            accel.innerHTML = `<strong>Acelerómetro:</strong> ` +
                (entry.acelerometro
                    ? `X: ${entry.acelerometro.x}, Y: ${entry.acelerometro.y}, Z: ${entry.acelerometro.z}`
                    : '<span class="text-muted">Sin datos</span>');

            time.innerText = `Última actualización: ${entry.timestamp || '---'}`;
        });
    } catch (err) {
        console.error("Error al cargar datos del monitoreo:", err);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    cargarDatosRealtime();
    setInterval(cargarDatosRealtime, 1000);
});