// ~/Project/frontend/src/components/datatable/AnimalDetailContent.jsx
import React from 'react';

export default function AnimalDetailContent({ animal, columnVisibility = {} }) {
    if (!animal) {
        return <div className="text-center text-gray-500 py-4">No hay datos detallados para mostrar.</div>;
    }

    // Define una función auxiliar para renderizar el campo solo si su columna está oculta
    const renderFieldIfHidden = (columnKey, label, value, suffix = '') => {
        // columnVisibility[columnKey] es 'true' si la columna está visible, 'false' si está oculta.
        // Queremos mostrarlo en el detalle si NO está visible en la tabla principal.
        if (!columnVisibility[columnKey]) {
            return (
                <div>
                    <span className="font-semibold">{label}:</span> {value !== undefined && value !== null ? `${value}${suffix}` : '-'}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-1 gap-x-2 text-sm text-gray-700">
            {/* Los campos ID y Nombre siempre están visibles en la fila principal, así que no se repiten aquí. */}

            {renderFieldIfHidden('tipo', 'Tipo', animal.tipo)}
            {renderFieldIfHidden('raza', 'Raza', animal.raza)}
            {renderFieldIfHidden('sexo', 'Sexo', animal.sexo)}
            {renderFieldIfHidden('especie', 'Especie', animal.especie)}
            {renderFieldIfHidden('parcela', 'Parcela', animal.parcela)}
            
            {/* Otros campos que no son columnas visibles o siempre deben mostrarse en el detalle */}
            <div><span className="font-semibold">Fecha Nacimiento:</span> {animal.fecha_nacimiento || '-'}</div>
            <div><span className="font-semibold">Peso:</span> {animal.peso !== undefined && animal.peso !== null ? `${animal.peso} kg` : '-'}</div>
            <div><span className="font-semibold">Altura Cruz:</span> {animal.altura_cruz !== undefined && animal.altura_cruz !== null ? `${animal.altura_cruz} cm` : '-'}</div>
            <div><span className="font-semibold">Longitud Tronco:</span> {animal.longitud_tronco !== undefined && animal.longitud_tronco !== null ? `${animal.longitud_tronco} cm` : '-'}</div>
            <div><span className="font-semibold">Perímetro Torácico:</span> {animal.perimetro_toracico !== undefined && animal.perimetro_toracico !== null ? `${animal.perimetro_toracico} cm` : '-'}</div>
            <div><span className="font-semibold">Ancho Grupa:</span> {animal.ancho_grupa !== undefined && animal.ancho_grupa !== null ? `${animal.ancho_grupa} cm` : '-'}</div>
            <div><span className="font-semibold">Longitud Grupa:</span> {animal.longitud_grupa !== undefined && animal.longitud_grupa !== null ? `${animal.longitud_grupa} cm` : '-'}</div>
            {renderFieldIfHidden('estado_reproductivo', 'Estado Reproductivo', animal.estado_reproductivo_nombre)}
            <div><span className="font-semibold">Número Partos:</span> {animal.numero_partos !== undefined && animal.numero_partos !== null ? animal.numero_partos : '-'}</div>
            <div><span className="font-semibold">Intervalo Partos:</span> {animal.intervalo_partos !== undefined && animal.intervalo_partos !== null ? `${animal.intervalo_partos} días` : '-'}</div>
            <div><span className="font-semibold">Fertilidad:</span> {animal.fertilidad !== undefined && animal.fertilidad !== null ? `${animal.fertilidad}%` : '-'}</div>

            {/* Información del collar, solo si existe */}
            {animal.collar_id && (
                <>
                    <div><span className="font-semibold">Collar ID:</span> {animal.collar_id || '-'}</div>
                    <div><span className="font-semibold">Ubicación Sensor:</span> {animal.ubicacion_sensor || '-'}</div>
                    <div><span className="font-semibold">Última Latitud:</span> {animal.ultima_latitud !== undefined && animal.ultima_latitud !== null ? animal.ultima_latitud : '-'}</div>
                    <div><span className="font-semibold">Última Longitud:</span> {animal.ultima_longitud !== undefined && animal.ultima_longitud !== null ? animal.ultima_longitud : '-'}</div>
                    <div><span className="font-semibold">Temperatura Corporal:</span> {animal.temperatura_corporal !== undefined && animal.temperatura_corporal !== null ? `${animal.temperatura_corporal}°C` : '-'}</div>
                    <div><span className="font-semibold">Hora Temperatura:</span> {animal.hora_temperatura || '-'}</div>
                    {animal.campo_id && <div><span className="font-semibold">Campo ID:</span> {animal.campo_id}</div>}
                </>
            )}
        </div>
    );
}