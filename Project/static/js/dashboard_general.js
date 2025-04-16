const ctx = document.getElementById('graficoCollares').getContext('2d');
const grafico = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: ['Activo', 'En mantenimiento', 'Desconectado'],
        datasets: [{
            label: 'Cantidad de collares',
            data: [10, 3, 2], // reemplazar con inyección Jinja2 o llamada AJAX
            backgroundColor: ['green', 'orange', 'red']
        }]
    },
    options: {
        responsive: true,
        plugins: {
            title: {
                display: true,
                text: 'Estado general de collares'
            }
        }
    }
});
