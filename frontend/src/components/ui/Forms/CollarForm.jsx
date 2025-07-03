// ~/Project/frontend/src/components/ui/Forms/CollarForm.jsx
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Input } from '@/components/ui/shadcn/input';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    SelectScrollUpButton,
    SelectScrollDownButton,
} from '@/components/ui/shadcn/select';
import { Button } from '@/components/ui/shadcn/button';
import { Badge } from '@/components/ui/shadcn/badge';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription
} from '@/components/ui/shadcn/form';

import { CircleDashed, Slash, Info, BatteryLow, BatteryMedium, BatteryFull } from 'lucide-react';
import { cn } from '@/lib/utils';

const schema = z.object({
    collar_id: z.number().optional(),
    codigo: z.string().min(1, "El código es obligatorio."),
    estado: z.string().min(1, "El estado es obligatorio."),
    bateria: z.coerce.number().min(0).max(100).optional().nullable(),
    animal_id: z.union([
        z.literal("UNASSIGNED"),
        z.string().regex(/^\d+$/, "ID de animal inválido. Debe ser un número.").transform(Number),
        z.null(),
        z.undefined()
    ]).optional().nullable(),
    original_animal_id: z.string().optional().nullable(),
    original_estado: z.string().optional().nullable(),
});

export default function CollarEditForm({ collar = {}, animals = [], onCancel, onSave, collarStatesOptions = [] }) {
    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            codigo: collar.codigo || '',
            ...collar,
            estado: collar.estado || 'disponible',
            bateria: collar.bateria,
            animal_id: (collar.animal_id === null || collar.animal_id === undefined || collar.animal_id === 0) ? "UNASSIGNED" : collar.animal_id.toString(),
            original_animal_id: (collar.animal_id === null || collar.animal_id === undefined || collar.animal_id === 0) ? "UNASSIGNED" : collar.animal_id.toString(),
            original_estado: collar.estado || 'disponible'
        },
    });

    const { handleSubmit, formState: { errors }, watch, setValue } = form;
    const [animalSearch, setAnimalSearch] = useState('');

    // Si el collar está activo, deshabilitar el selector de estado
    const isEstadoDisabled = watch('estado') === 'activo';
    const isAnimalSelectDisabled = watch('estado') === 'defectuoso';
    const editableStates = useMemo(() => {
        // Si el estado actual del collar es 'activo', solo se permite visualizar 'activo'
        if (collar.estado && collar.estado.toLowerCase() === 'activo') {
            return [{ id: collarStatesOptions.find(s => s.nombre.toLowerCase() === 'activo')?.id, nombre: 'activo' }];
        }
        // Para otros estados, filtrar los estados 'activo' y 'sin bateria'
        const disallowedStates = ['activo', 'sin bateria'];
        return collarStatesOptions.filter(
            (state) => !disallowedStates.includes(state.nombre.toLowerCase())
        );
    }, [collarStatesOptions, collar.estado]);

    // Función para renderizar el badge de estado de la batería
    const getBatteryBadge = (bateria) => {
        let icon = <Info className="h-4 w-4" />;
        let text = 'N/A';
        let badgeClass = 'bg-gray-100 text-gray-700';

        if (typeof bateria === 'number') {
            if (bateria >= 70) {
                icon = <BatteryFull className="h-4 w-4 text-green-600" />;
                badgeClass = 'bg-green-100 text-green-800';
            } else if (bateria >= 30) {
                icon = <BatteryMedium className="h-4 w-4 text-yellow-500" />;
                badgeClass = 'bg-yellow-100 text-yellow-800';
            } else {
                icon = <BatteryLow className="h-4 w-4 text-red-700" />;
                badgeClass = 'bg-red-100 text-red-800';
            }
            text = `${bateria}%`;
        }

        return (
            <Badge className={cn('flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-medium', badgeClass)}>
                {icon}
                {text}
            </Badge>
        );
    };


    useEffect(() => {
        if (isAnimalSelectDisabled) {
            setValue('animal_id', 'UNASSIGNED', { shouldValidate: true });
        }
    }, [isAnimalSelectDisabled, setValue]);

    useEffect(() => {
        if (Object.keys(errors).length > 0) {
            if (errors.collar_id) {
                console.error("Detalle del error de collar_id:", errors.collar_id.message);
                console.error("Valor actual de collar_id en el formulario:", form.getValues('collar_id'));
            }
            if (errors.estado) console.error("Error estado:", errors.estado.message);
            if (errors.bateria) console.error("Error bateria:", errors.bateria.message);
            if (errors.animal_id) console.error("Error animal_id:", errors.animal_id.message);
        }
    }, [errors, form]);

    const selectedAnimalId = watch('animal_id');
    const selectedAnimal = animals.find(a => a.animal_id.toString() === selectedAnimalId?.toString());
    
    const filteredAnimals = useMemo(() => {
        const q = animalSearch.trim().toLowerCase();
        let list = animals;
    
        if (q) {
            list = animals.filter(a => (
                a.nombre?.toLowerCase().includes(q) ||
                a.numero_identificacion?.toLowerCase?.().includes(q) ||
                a.collar_asignado?.codigo?.toLowerCase().includes(q)
            ));
        }
    
        // Incluir el animal seleccionado si no está en el filtro
        if (
            selectedAnimal &&
            !list.some(a => a.animal_id === selectedAnimal.animal_id)
        ) {
            list = [selectedAnimal, ...list];
        }
    
        return list;
    }, [animals, animalSearch, selectedAnimal]);

    const onSubmit = (data) => {
        const payload = {
            collar_id: data.collar_id,
            estado: data.estado,
            bateria: collar.bateria,
            animal_id: data.animal_id
        };

        // Si el estado es "sin bateria", forzamos batería a 0 en el payload que se envía
        if (payload.estado === 'sin bateria') {
            payload.bateria = 0;
        }

        onSave({
            ...payload,
            original_animal_id: data.original_animal_id,
            original_estado: data.original_estado,
            codigo: data.codigo
        });
    };

    return (
        <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-4">
                <FormField
                    control={form.control}
                    name="collar_id"
                    render={({ field }) => (
                        <FormItem className="hidden">
                            <FormControl><Input type="hidden" {...field} value={field.value !== undefined ? String(field.value) : ''} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="original_animal_id"
                    render={({ field }) => (
                        <FormItem className="hidden">
                            <FormControl><Input type="hidden" {...field} /></FormControl>
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="original_estado"
                    render={({ field }) => (
                        <FormItem className="hidden">
                            <FormControl><Input type="hidden" {...field} /></FormControl>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="codigo"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Código del Collar</FormLabel>
                            <FormControl><Input {...field} disabled /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="estado"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Estado del Collar</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value} disabled={isEstadoDisabled}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Seleccionar estado" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {editableStates.map((estado) => (
                                            <SelectItem key={estado.id} value={estado.nombre}>
                                                {estado.nombre.charAt(0).toUpperCase() + estado.nombre.slice(1)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormItem>
                        <FormLabel>Nivel de Batería</FormLabel>
                        <FormControl>
                            <div className="flex items-center h-10">
                                {getBatteryBadge(collar.bateria)}
                            </div>
                        </FormControl>
                    </FormItem>
                </div>

                <FormField
                    control={form.control}
                    name="animal_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Asignar a Animal</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value} disabled={isAnimalSelectDisabled}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Seleccionar animal (opcional)" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent withScrollButtons={false} className="bg-white max-h-[350px] overflow-auto">
                                    <div className="bg-white px-4 pt-4 sticky top-0 z-20">
                                        <Input
                                            value={animalSearch}
                                            onChange={(e) => setAnimalSearch(e.target.value)}
                                            onKeyDown={(e) => e.stopPropagation()}
                                            placeholder="Buscar animal o collar"
                                            className="mb-2 text-sm mt-4 px-4"
                                        />
                                        <SelectItem value="UNASSIGNED" className="border-b">
                                            <div className="flex items-center gap-2 text-muted-foreground italic">
                                                <Slash className="h-4 w-4" /> Desasignar
                                            </div>
                                        </SelectItem>
                                        <SelectScrollUpButton className="sticky top-[6rem] z-10 bg-white h-max" />
                                    </div>
                                    {filteredAnimals.length === 0 ? (
                                        <div className="text-sm text-gray-400 text-center py-2">Sin resultados</div>
                                    ) : (
                                        filteredAnimals.map((animal) => (
                                            <SelectItem
                                                key={animal.animal_id}
                                                value={animal.animal_id.toString()}
                                                className="bg-white"
                                            >
                                                {animal.nombre} ({animal.numero_identificacion})
                                                {animal.collar_asignado && animal.collar_asignado.id !== collar.collar_id && (
                                                    <span className="italic ml-2"> - Collar asignado ({animal.collar_asignado.codigo})</span>
                                                )}
                                            </SelectItem>
                                        ))
                                    )}
                                    <SelectScrollDownButton className="sticky bottom-0 z-10 bg-white h-max" />
                                </SelectContent>
                            </Select>
                            <FormDescription>Asigna este collar a un animal específico. Un collar solo puede estar asignado a un animal a la vez. Si el animal ya tiene un collar, este será desasignado automáticamente.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="flex justify-end gap-4 mt-6 border-t pt-4">
                    <Button type="button" variant="outline" onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-xl border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors duration-200">
                        Cancelar
                    </Button>
                    <Button type="submit" className="flex items-center gap-2 px-6 py-3 rounded-xl bg-black text-white hover:bg-gray-700 transition-colors duration-200 shadow-lg">
                        <CircleDashed className="h-5 w-5" />
                        Guardar Collar
                    </Button>
                </div>
            </form>
        </Form>
    );
}
