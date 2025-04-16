document.addEventListener("DOMContentLoaded", () => {
    const animalesConCaracteristicas = window.ANIMALES_CARACTERISTICAS || {};
    const selectorAnimal = document.getElementById("caracteristicas-animal_id");

    if (!selectorAnimal) return;

    selectorAnimal.addEventListener("change", function () {
        const id = this.value;
        const data = animalesConCaracteristicas[id];

        const campos = [
            "indice_corporal", "indice_toracico", "indice_cefalico", "perfil", "cabeza", "cuello",
            "grupa", "orejas", "ubre", "testiculos", "pelaje", "pezuñas", "mucosas",
            "bcs", "locomocion", "comportamiento"
        ];

        campos.forEach(campo => {
            const input = document.getElementById(`caracteristicas-${campo}`);
            if (input) {
                input.value = data && data[campo] !== undefined && data[campo] !== null ? data[campo] : "";
            }
        });

        const cuernosInput = document.getElementById("caracteristicas-cuernos");
        if (cuernosInput) {
            cuernosInput.checked = !!(data && data.cuernos);
        }
    });
});