// ~/Project/frontend/src/components/ui/Forms/AnimalForm.jsx
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from "@/lib/utils";

import {
    Tabs, TabsList, TabsTrigger, TabsContent
} from '@/components/ui/shadcn/tabs';
import { Input } from '@/components/ui/shadcn/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/shadcn/select';
import { Button } from '@/components/ui/shadcn/button';
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '@/components/ui/shadcn/tooltip';
import { Switch } from '@/components/ui/shadcn/switch';
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription
} from '@/components/ui/shadcn/form';

import { Info, PawPrint, Ruler, Heart, Venus, Mars, CircleDashed } from 'lucide-react';

const schemaBase = z.object({
    animal_id: z.number().optional(),
    nombre: z.string().min(1, "El nombre es obligatorio."),
    especie_id: z.coerce.number().optional().nullable(),
    tipo_id: z.coerce.number().optional().nullable(),
    raza_id: z.coerce.number().optional().nullable(),
    sexo_id: z.coerce.number().min(1, "El sexo es obligatorio.").optional(),
    fecha_nacimiento: z.string().optional(),
    peso: z.coerce.number().min(0, "Debe ser un número positivo").optional().nullable(),
    altura_cruz: z.coerce.number().min(0, "Debe ser un número positivo").optional().nullable(),
    longitud_tronco: z.coerce.number().min(0, "Debe ser un número positivo").optional().nullable(),
    perimetro_toracico: z.coerce.number().min(0, "Debe ser un número positivo").optional().nullable(),
    ancho_grupa: z.coerce.number().min(0, "Debe ser un número positivo").optional().nullable(),
    longitud_grupa: z.coerce.number().min(0, "Debe ser un número positivo").optional().nullable(),
    estado_reproductivo_id: z.coerce.number().optional().nullable(),
    numero_partos: z.coerce.number().min(0).optional().nullable(),
    intervalo_partos: z.coerce.number().min(0).optional().nullable(),
    ubicacion_sensor: z.string().optional().nullable(),
    parcela_id: z.coerce.number().optional().nullable(),
});

export default function AnimalForm({ animal = {}, modoEdicion, parcelas = [], animalOptions = {}, onCancel, onSave }) {

    const schema = modoEdicion
        ? schemaBase
        : schemaBase.extend({
            acronimo_identificacion: z.string()
                .regex(/^[A-Za-z]{4}$/, "Debe contener exactamente 4 letras.")
                .transform(val => val.toUpperCase()),
        });

    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            ...animal,
            especie_id: animal.especie_id != null ? animal.especie_id.toString() : '',
            tipo_id: animal.tipo_id != null ? animal.tipo_id.toString() : '',
            raza_id: animal.raza_id != null ? animal.raza_id.toString() : '',
            sexo_id: animal.sexo_id != null ? parseInt(animal.sexo_id) : 1,
            estado_reproductivo_id: animal.estado_reproductivo_id != null ? animal.estado_reproductivo_id.toString() : '',
            parcela_id: animal.parcela_id != null ? animal.parcela_id.toString() : '',
            peso: animal.peso?.toString() || '',
            altura_cruz: animal.altura_cruz?.toString() || '',
            longitud_tronco: animal.longitud_tronco?.toString() || '',
            perimetro_toracico: animal.perimetro_toracico?.toString() || '',
            ancho_grupa: animal.ancho_grupa?.toString() || '',
            longitud_grupa: animal.longitud_grupa?.toString() || '',
            numero_partos: animal.numero_partos?.toString() || '',
            intervalo_partos: animal.intervalo_partos?.toString() || '',
            fecha_nacimiento: animal.fecha_nacimiento ? new Date(animal.fecha_nacimiento).toISOString().split('T')[0] : '',
            ubicacion_sensor: animal.ubicacion_sensor || '',
        },
    });

    const especieIdValue = form.watch('especie_id');
    const tipoIdValue = form.watch('tipo_id');
    const currentSexId = form.watch('sexo_id');
    const isMale = currentSexId === 2;

    useEffect(() => {
        if (especieIdValue && currentSexId) {
            const posibles = animalOptions.estados_reproductivos?.filter(e =>
                e.sexo_id === currentSexId && e.especie_id === parseInt(especieIdValue)
            );

            const currentValue = form.getValues('estado_reproductivo_id');

            if (currentValue && !posibles.some(e => e.id.toString() === currentValue)) {
                form.setValue('estado_reproductivo_id', '');
            }
        }
    }, [especieIdValue, currentSexId, animalOptions.estados_reproductivos, form]);

    const tiposFiltrados = animalOptions.tipos?.filter(tipo => especieIdValue ? tipo.especie_id === parseInt(especieIdValue) : true) || [];
    const razasFiltradas = animalOptions.razas?.filter(raza =>
        (!especieIdValue || raza.especie_id === parseInt(especieIdValue)) &&
        (!tipoIdValue || raza.tipo_id === parseInt(tipoIdValue))
    ) || [];
    const estadosReproductivosFiltrados = animalOptions.estados_reproductivos?.filter(estado =>
        estado.sexo_id === currentSexId &&
        (!especieIdValue || estado.especie_id === parseInt(especieIdValue))
    ) || [];

    const onSubmit = (data) => {
        const processedData = { ...data };
        ['especie_id', 'tipo_id', 'raza_id', 'sexo_id', 'estado_reproductivo_id', 'parcela_id'].forEach(key => {
            processedData[key] = processedData[key] === '' ? null : parseInt(processedData[key]);
        });
        ['peso', 'altura_cruz', 'longitud_tronco', 'perimetro_toracico', 'ancho_grupa', 'longitud_grupa', 'numero_partos', 'intervalo_partos', 'fertilidad'].forEach(key => {
            processedData[key] = processedData[key] !== '' ? parseFloat(processedData[key]) : null;
        });
        onSave(processedData);
    };

    return (
        <TooltipProvider>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="max-h-[85vh] overflow-y-auto bg-white p-4 sm:p-6 lg:p-8 rounded-xl w-full max-w-4xl mx-auto">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-800 mb-4 sm:mb-6 text-center">
                        {modoEdicion ? 'Editar Registro de Animal' : 'Nuevo Registro de Animal'}
                    </h2>
                    <p className="text-sm sm:text-base text-gray-600 text-center mb-6 sm:mb-8">
                        Completa la información detallada para el animal.
                    </p>

                    <Tabs defaultValue="general" className="space-y-8">
                        <TabsList className="flex flex-wrap gap-2 w-full p-2 rounded-lg">
                            <TabsTrigger value="general" className="flex items-center gap-2 text-gray-700 data-[state=active]:bg-gray-600 data-[state=active]:text-white transition-colors duration-200 rounded-xl py-2 px-4">
                                <PawPrint className="h-5 w-5" /> <span className="hidden sm:inline">General</span>
                            </TabsTrigger>
                            <TabsTrigger value="zoometria" className="flex items-center gap-2 text-gray-700 data-[state=active]:bg-gray-600 data-[state=active]:text-white transition-colors duration-200 rounded-xl py-2 px-4">
                                <Ruler className="h-5 w-5" /> <span className="hidden sm:inline">Zoometría</span>
                            </TabsTrigger>
                            <TabsTrigger value="reproduccion" className="flex items-center gap-2 text-gray-700 data-[state=active]:bg-gray-600 data-[state=active]:text-white transition-colors duration-200 rounded-xl py-2 px-4">
                                <Heart className="h-5 w-5" /> <span className="hidden sm:inline">Reproducción</span>
                            </TabsTrigger>
                        </TabsList>

                        {/* Pestaña 1: Información General */}
                        <TabsContent value="general" className="p-6 bg-gray-50 rounded-lg border border-gray-200 shadow-md min-h-[300px] w-full max-w-4xl">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-700 mb-3 sm:mb-4 flex items-center gap-2">
                                <PawPrint className="h-5 w-5" /> Información General
                            </h3>

                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-12 md:col-span-4">
                                    <FormField control={form.control} name="nombre" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nombre</FormLabel>
                                            <FormControl><Input {...field} placeholder="Ej: Camila" /></FormControl>
                                            <FormDescription>Nombre común del animal.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="col-span-12 md:col-span-4">
                                    {modoEdicion ? (
                                        <FormField control={form.control} name="numero_identificacion" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Número de Identificación</FormLabel>
                                                <FormControl><Input {...field} disabled /></FormControl>
                                                <FormDescription>Identificador único del animal.</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    ) : (
                                        <FormField control={form.control} name="acronimo_identificacion" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Acrónimo de Identificación</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        {...field}
                                                        list="acronimos-list"
                                                        placeholder="Ej: ABCD (4 letras)"
                                                        maxLength={4}
                                                        onChange={(e) => {
                                                            const onlyLetters = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
                                                            if (onlyLetters.length <= 4) {
                                                                field.onChange(onlyLetters);
                                                            }
                                                        }}
                                                    />
                                                    <Select id="acronimos-list" onValueChange={field.onChange} value={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Seleccionar parcela" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {animalOptions.acronimos?.map(ac => (
                                                                <option key={ac} value={ac} />
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </FormControl>
                                                <FormDescription>Acrónimo de agrupación del animal.</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )} />
                                    )}
                                </div>

                                <div className="col-span-12 md:col-span-4">
                                    <FormField control={form.control} name="parcela_id" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Parcela Actual</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccionar parcela" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {parcelas.map((p) => (
                                                        <SelectItem key={p.id} value={p.id.toString()}>{p.nombre}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>Ubicación actual del animal.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="col-span-12 md:col-span-4">
                                    <FormField control={form.control} name="especie_id" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Especie de Animal</FormLabel>
                                            <Select
                                                value={field.value}
                                                onValueChange={(value) => {
                                                    field.onChange(value);
                                                    form.setValue('tipo_id', '');
                                                    form.setValue('raza_id', '');
                                                }}
                                            >

                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccione la especie" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {animalOptions.especies?.map(especie => (
                                                        <SelectItem key={especie.id} value={especie.id.toString()}>{especie.nombre}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>Clasificación de la especie.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="col-span-12 md:col-span-4">
                                    <FormField control={form.control} name="tipo_id" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Tipo de Animal</FormLabel>
                                            <Select
                                                onValueChange={(value) => {
                                                    field.onChange(value);
                                                    form.setValue('raza_id', '');
                                                }}
                                                value={field.value}
                                                disabled={!especieIdValue}
                                            >

                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccione el tipo" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {tiposFiltrados.map(tipo => ( // Filtrar tipos por especie
                                                        <SelectItem key={tipo.id} value={tipo.id.toString()}>{tipo.nombre}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>Clasificación del tipo.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="col-span-12 md:col-span-4">
                                    <FormField control={form.control} name="raza_id" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Raza de Animal</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value}
                                                disabled={!especieIdValue || !tipoIdValue}
                                            >

                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccione la raza" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {razasFiltradas.map(raza => (
                                                        <SelectItem key={raza.id} value={raza.id.toString()}>{raza.nombre}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormDescription>Clasificación de la raza.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="col-span-12 md:col-span-6">
                                    <FormField control={form.control} name="fecha_nacimiento" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Fecha de Nacimiento</FormLabel>
                                            <FormControl><Input type="date" {...field} /></FormControl>
                                            <FormDescription>Fecha en formato AAAA-MM-DD.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="col-span-12 md:col-span-6">
                                    <FormField control={form.control} name="ubicacion_sensor" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ubicación del Sensor</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccionar ubicación" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="cuello">Cuello</SelectItem>
                                                    <SelectItem value="pata">Pata</SelectItem>
                                                    <SelectItem value="cola">Cola</SelectItem>
                                                    <SelectItem value="implante">Implante (interna)</SelectItem>
                                                    <SelectItem value="ninguno">Ninguno</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>

                            </div>
                        </TabsContent>

                        {/* Pestaña 2: Zoometría */}
                        <TabsContent value="zoometria" className="p-6 bg-gray-50 rounded-lg border border-gray-200 shadow-md min-h-[300px] w-full max-w-4xl">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-700 mb-3 sm:mb-4 flex items-center gap-2"><Ruler className="h-5 w-5" /> Medidas Corporales (Zoometría)</h3>
                            <div className="grid grid-cols-12 gap-4">
                                <div className="col-span-12 md:col-span-4">
                                    <FormField control={form.control} name="peso" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Peso (kg)</FormLabel>
                                            <FormControl>
                                                <div className="flex items-center gap-2">
                                                    <Input type="number" min={0} {...field} placeholder="Ej: 500.5" />
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Indica la masa corporal del animal en kilogramos.</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="col-span-12 md:col-span-4">
                                    <FormField control={form.control} name="altura_cruz" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Altura a la Cruz (cm)</FormLabel>
                                            <FormControl>
                                                <div className="flex items-center gap-2">
                                                    <Input type="number" min={0} {...field} placeholder="Ej: 150" />
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Representa la distancia vertical desde el suelo hasta la protuberancia más alta de la escápula.</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="col-span-12 md:col-span-4">
                                    <FormField control={form.control} name="longitud_tronco" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Longitud del Tronco (cm)</FormLabel>
                                            <FormControl>
                                                <div className="flex items-center gap-2">
                                                    <Input type="number" min={0} {...field} placeholder="Ej: 90" />
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Medida desde la punta del hombro (articulación escápulo-humeral) hasta la punta del isquion.</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="col-span-12 md:col-span-4">
                                    <FormField control={form.control} name="perimetro_toracico" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Perímetro Torácico (cm)</FormLabel>
                                            <FormControl>
                                                <div className="flex items-center gap-2">
                                                    <Input type="number" min={0} {...field} placeholder="Ej: 212" />
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Medición de la circunferencia del tórax justo detrás de las paletas.</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="col-span-12 md:col-span-4">
                                    <FormField control={form.control} name="ancho_grupa" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ancho de Grupa (cm)</FormLabel>
                                            <FormControl>
                                                <div className="flex items-center gap-2">
                                                    <Input type="number" min={0} {...field} placeholder="Ej: 112" />
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>
                                                                Distancia transversal entre las tuberosidades coxales (puntas de las caderas).
                                                                Es un indicador importante de la capacidad pélvica, especialmente relevante en hembras para evaluar la facilidad de parto (distocia).
                                                            </p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="col-span-12 md:col-span-4">
                                    <FormField control={form.control} name="longitud_grupa" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Longitud de Grupa (cm)</FormLabel>
                                            <FormControl>
                                                <div className="flex items-center gap-2">
                                                    <Input type="number" min={0} {...field} placeholder="Ej: 98" />
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Medida longitudinal desde las tuberosidades ilíacas (puntas de la cadera) hasta las tuberosidades isquiáticas (puntas de la nalga).</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            </FormControl>
                                        </FormItem>
                                    )} />
                                </div>
                            </div>
                        </TabsContent>

                        {/* Pestaña 3: Reproducción */}
                        <TabsContent value="reproduccion" className="p-6 bg-gray-50 rounded-lg border border-gray-200 shadow-md min-h-[300px] w-full max-w-4xl">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-700 mb-3 sm:mb-4 flex items-center gap-2"><Heart className="h-8 w-8" /> Datos Reproductivos</h3>
                            <div className="grid grid-cols-12 gap-4">

                                <div className="col-span-12 md:col-span-6">
                                    <FormField
                                        control={form.control}
                                        name="sexo_id"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col">
                                                <FormLabel className="mb-2">Sexo</FormLabel>
                                                <FormControl>
                                                    <div className="flex items-center gap-2">
                                                        <Switch
                                                            id="sexo-switch"
                                                            checked={field.value === 2}
                                                            onCheckedChange={(checked) => {
                                                                const selectedId = checked ? 2 : 1;
                                                                field.onChange(selectedId);
                                                                if (selectedId === 2) {
                                                                    form.setValue('numero_partos', null);
                                                                    form.setValue('intervalo_partos', null);
                                                                    form.setValue('fertilidad', null);
                                                                }
                                                            }}
                                                            className={cn(field.value === 2 ? 'bg-blue-500' : 'bg-pink-500')}
                                                            icon={
                                                                field.value === 2
                                                                    ? <Mars className="h-5 w-5 text-blue-800" />
                                                                    : <Venus className="h-5 w-5 text-pink-600" />
                                                            }
                                                        />
                                                        <span>{field.value === 2 ? 'Macho' : 'Hembra'}</span>
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="col-span-12 md:col-span-6">
                                    <FormField control={form.control} name="estado_reproductivo_id" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Estado Reproductivo</FormLabel>
                                            <Select
                                                onValueChange={field.onChange}
                                                value={field.value}
                                                disabled={
                                                    (!especieIdValue && !field.value) ||
                                                    (estadosReproductivosFiltrados.length === 0 && !field.value)
                                                }
                                            >
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Seleccionar estado" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {estadosReproductivosFiltrados.map(estado => (
                                                        <SelectItem key={estado.id} value={estado.id.toString()}>
                                                            {estado.nombre}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="col-span-12 md:col-span-6">
                                    <FormField control={form.control} name="numero_partos" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Número de Partos</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    {...field}
                                                    disabled={isMale}
                                                    placeholder={isMale ? "Solo para hembras" : "Ej: 1"}
                                                />
                                            </FormControl>
                                            <FormDescription>Número de partos registrados.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="col-span-12 md:col-span-6">
                                    <FormField control={form.control} name="intervalo_partos" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Intervalo entre Partos</FormLabel>
                                            <FormControl><Input type="number" min={0} {...field} disabled={isMale} placeholder={isMale ? "Solo para hembras" : "Ej: 365 (días)"} /></FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <div className="pt-8 flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-4 border-t border-gray-200 mt-8">
                        <Button type="button" variant="outline" onClick={onCancel} className="flex items-center gap-2 px-6 py-3 rounded-xl border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors duration-200">
                            Cancelar
                        </Button>
                        <Button type="submit" className="flex items-center gap-2 px-6 py-3 rounded-xl bg-black text-white hover:bg-gray-700 transition-colors duration-200 shadow-lg">
                            <CircleDashed className="h-5 w-5" />
                            Guardar Animal
                        </Button>
                    </div>
                </form>
            </Form>
        </TooltipProvider>
    );
}