// components/Forms.jsx
export function FormularioParcela({ campos = {}, formData = {}, onChange = () => { } }) {
    return (
        <>
            <div className="flex flex-col gap-1">
                <label className="block font-medium text-xs">Seleccionar campo</label>
                <select
                    name="campo_id"
                    value={formData.campo_id}
                    onChange={onChange}
                    className="form-select w-full border p-1 rounded-full text-xs bg-white/70"
                >
                    {Object.entries(campos).map(([id, campo]) => (
                        <option
                            key={id}
                            value={id}
                            disabled={id === formData.campo_id}
                            className={id === formData.campo_id ? 'text-gray-400 italic' : ''}
                        >
                            {campo.nombre}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex flex-col gap-1">
                <label className="block font-medium text-xs">Nombre del área</label>
                <input
                    name="nombre"
                    value={formData.nombre}
                    onChange={onChange}
                    className="w-full border p-1 rounded-full text-xs bg-white/70"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="block font-medium text-xs">Descripción de la parcela</label>
                <input
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={onChange}
                    className="w-full border p-1 rounded-full text-xs bg-white/70"
                />
            </div>
        </>
    )
}

export function FormularioCampo({ campos = {}, formData = {}, onChange = () => { } }) {
    return (
        <>
            <div className="flex flex-col gap-1">
                <label className="block font-medium text-xs">Seleccionar campo existente</label>
                <select
                    name="campo_id"
                    value={formData.campo_id}
                    onChange={onChange}
                    className="form-select w-full border p-1 rounded-full text-xs bg-white/70"
                >
                    <option value="">-- Crear nuevo campo --</option>
                    {Object.entries(campos).map(([id, campo]) => (
                        <option
                            key={id}
                            value={id}
                            disabled={id === formData.campo_id}
                            className={id === formData.campo_id ? 'text-gray-400 italic' : ''}
                        >
                            {campo.nombre}
                        </option>
                    ))}
                </select>

            </div>

            <div className="flex flex-col gap-1">
                <label className="block font-medium text-xs">Nombre del campo</label>
                <input
                    name="nombre"
                    value={formData.nombre}
                    onChange={onChange}
                    className="w-full border p-1 rounded-full text-xs bg-white/70"
                />
            </div>

            <div className="flex flex-col gap-1">
                <label className="block font-medium text-xs">Descripción del campo</label>
                <input
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={onChange}
                    className="w-full border p-1 rounded-full text-xs bg-white/70"
                />
            </div>

            <input type="hidden" name="lat" value={formData.lat} />
            <input type="hidden" name="lon" value={formData.lon} />
        </>
    )
}