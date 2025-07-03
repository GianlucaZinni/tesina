// ~/Project/frontend/src/views/AnimalView.jsx
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';

// API Services
import {
    fetchAnimalesInit,
    fetchFichaCompleta,
    createAnimal,
    updateAnimal,
    deleteAnimal,
    fetchAnimalesOptions,
} from '@/api/services/animalService';
import {
    fetchCollaresInit,
    createCollarBatch,
    deleteCollar,
    updateCollar,
    fetchCollarDetails,
    handleCollarAssignment,
    fetchCollaresDisponibles,
    fetchCollarStates
} from '@/api/services/collarService';
import { fetchParcelaInit } from '@/api/services/parcelaService';

// Componentes de la aplicación
import AnimalForm from '@/components/ui/Forms/AnimalForm';
import CollarForm from '@/components/ui/Forms/CollarForm';
import { ModalGenerico } from '@/components/common/Modals';

// Componentes de Shadcn UI
import { Button } from '@/components/ui/shadcn/button';
import { Card, CardContent } from '@/components/ui/shadcn/card';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/shadcn/select';
import { Label } from '@/components/ui/shadcn/label';

// Notificaciones (Sonner)
import { toast } from 'sonner';

// Iconos de Lucide React
import {
    Plus,
    Bone,
    Tag,
    AlertCircle,
    CheckCircle,
    XCircle,
    Trash2,
    Edit,
    ChevronDown,
    ChevronUp,
    Link,
    Info,
} from 'lucide-react';

import AnimalsDataTable from "@/components/common/datatable/AnimalsDataTable";
import CollarsGrid from '@/components/common/datatable/CollarsGrid'

import { createColumnHelper } from '@tanstack/react-table';

const columnHelper = createColumnHelper();

const STORAGE_KEY = "animalTableState";

function getInitialTableState() {
    try {
        const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
        return {
            globalFilter: saved?.globalFilter || "",
            sorting: saved?.sorting || [],
            pagination: saved?.pagination || { pageIndex: 0, pageSize: 10 },
            columnVisibility: saved?.columnVisibility || {},
            rowSelection: {},
        };
    } catch {
        return {
            globalFilter: "",
            sorting: [],
            pagination: { pageIndex: 0, pageSize: 10 },
            columnVisibility: {},
            rowSelection: {},
        };
    }
}

const COLLARS_STORAGE_KEY = "collarTableState";

function getInitialCollarTableState() {
    try {
        const saved = JSON.parse(sessionStorage.getItem(COLLARS_STORAGE_KEY));
        return {
            globalFilter: saved?.globalFilter || "",
            sorting: saved?.sorting || [],
            pagination: saved?.pagination || { pageIndex: 0, pageSize: 10 },
            columnVisibility: saved?.columnVisibility || {},
            rowSelection: {},
        };
    } catch {
        return {
            globalFilter: "",
            sorting: [],
            pagination: { pageIndex: 0, pageSize: 10 },
            columnVisibility: {},
            rowSelection: {},
        };
    }
}

export default function AnimalView() {
    const [animales, setAnimales] = useState([]);
    const [collares, setCollares] = useState([]);
    const [parcelas, setParcelas] = useState([]);
    const [animalOptions, setAnimalOptions] = useState({ tipos: [], razas: [], sexos: [], parcelas: [], especies: [], estados_reproductivos: [] });
    const [collarStatesOptions, setCollarStatesOptions] = useState([]);
    const [formData, setFormData] = useState({});
    const [collarFormData, setCollarFormData] = useState({});
    const [modoEdicion, setModoEdicion] = useState(false);
    const [mostrarFormularioAnimal, setMostrarFormularioAnimal] = useState(false);
    const [mostrarFormularioCollar, setMostrarFormularioCollar] = useState(false);
    const [modalAsignarCollar, setModalAsignarCollar] = useState({ abierto: false, animalId: null });
    const [availableCollaresForAssignment, setAvailableCollaresForAssignment] = useState([]);
    const [selectedCollarToAssign, setSelectedCollarToAssign] = useState(null);

    const [modalEliminarAnimal, setModalEliminarAnimal] = useState({ abierto: false, animal: null });
    const [modalEliminarCollar, setModalEliminarCollar] = useState({ abierto: false, collar: null });

    const animalTableRef = useRef(null);
    const collarGridRef = useRef(null);
    const previousScroll = useRef({ animals: 0, collares: 0 });

    // Estados AnimalsDatatable
    const [tableGlobalFilter, setTableGlobalFilter] = useState(getInitialTableState().globalFilter);
    const [tableSorting, setTableSorting] = useState(getInitialTableState().sorting);
    const [tablePagination, setTablePagination] = useState(getInitialTableState().pagination);
    const [tableColumnVisibility, setTableColumnVisibility] = useState(getInitialTableState().columnVisibility);
    const [tableRowSelection, setTableRowSelection] = useState({});

    // Estados CollarsGrid
    const [collarFilter, setCollarFilter] = useState(getInitialCollarTableState().globalFilter);
    const [collarSorting, setCollarSorting] = useState(getInitialCollarTableState().sorting);
    const [collarPagination, setCollarPagination] = useState(getInitialCollarTableState().pagination);
    const [collarColumnVisibility, setCollarColumnVisibility] = useState(getInitialCollarTableState().columnVisibility);
    const [collarRowSelection, setCollarRowSelection] = useState({});

    const handleAnimalSearchChange = (value) => {
        setTablePagination(prev => ({ ...prev, pageIndex: 0 }));
        setTableGlobalFilter(value);
    };

    const handleCollarSearchChange = (value) => {
        setCollarPagination(prev => ({ ...prev, pageIndex: 0 }));
        setCollarFilter(value);
    };

    const cargarDatos = useCallback(async () => {

        if (animalTableRef.current) {
            previousScroll.current.animals = animalTableRef.current.scrollTop;
        }
        if (collarGridRef.current) {
            previousScroll.current.collares = collarGridRef.current.scrollTop;
        }
        try {
            const [animalesRes, collaresRes, parcelasRes, opcionesRes, collarStatesRes] = await Promise.all([
                fetchAnimalesInit(),
                fetchCollaresInit(),
                fetchParcelaInit(),
                fetchAnimalesOptions(),
                fetchCollarStates(),
            ]);

            const animalIdToCollarMap = new Map();
            collaresRes.forEach(collar => {
                if (collar.animal_id) {
                    animalIdToCollarMap.set(collar.animal_id, {
                        id: collar.id,
                        codigo: collar.codigo,
                        estado: collar.estado,
                        bateria: collar.bateria,
                        ultima_actividad: collar.ultima_actividad
                    });
                }
            });

            const enrichedAnimales = animalesRes.map(animal => {
                const assignedCollar = animalIdToCollarMap.get(animal.animal_id);

                return {
                    ...animal,
                    collar_asignado: assignedCollar || null,
                    sexo_nombre: animal.sexo,
                    especie_nombre: animal.especie,
                    tipo_nombre: animal.tipo,
                    raza_nombre: animal.raza,
                    estado_reproductivo_nombre: animal.estado_reproductivo_nombre,
                    parcela_nombre: animal.parcela_nombre,
                    fecha_nacimiento: animal.fecha_nacimiento
                };
            });

            setAnimales(enrichedAnimales);
            setCollares(collaresRes);
            const todasLasParcelas = Object.values(parcelasRes.parcelas || {}).flat();
            setParcelas(todasLasParcelas);
            setAnimalOptions(opcionesRes);
            setCollarStatesOptions(collarStatesRes);
        } catch (error) {
            console.error("Error al cargar datos iniciales:", error);
            toast.error("Error al cargar los datos.", {
                description: "Por favor, intente recargar la página.",
                icon: <AlertCircle className="h-4 w-4 text-red-500" />,
            });
        } finally {
            if (animalTableRef.current) {
                animalTableRef.current.scrollTop = previousScroll.current.animals;
            }
            if (collarGridRef.current) {
                collarGridRef.current.scrollTop = previousScroll.current.collares;
            }
        }
    }, []);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    // --- Manejo de Animales ---

    const handleNuevoAnimal = () => {
        setFormData({});
        setModoEdicion(false);
        setMostrarFormularioAnimal(true);
    };

    const handleEditarAnimal = useCallback(async (id) => {
        try {
            const data = await fetchFichaCompleta(id);
            const form = {
                ...data,
                parcela_id: data.parcela_id?.toString() || '',
                raza_id: data.raza_id != null ? data.raza_id.toString() : '',
                sexo_id: data.sexo_id != null ? data.sexo_id : 1,
                tipo_id: data.tipo_id != null ? data.tipo_id.toString() : '',
                especie_id: data.especie_id != null ? data.especie_id.toString() : '',
                estado_reproductivo_id: data.estado_reproductivo_id != null ? data.estado_reproductivo_id.toString() : '',
                peso: data.peso?.toString() || '',
                altura_cruz: data.altura_cruz?.toString() || '',
                longitud_tronco: data.longitud_tronco?.toString() || '',
                perimetro_toracico: data.perimetro_toracico?.toString() || '',
                ancho_grupa: data.ancho_grupa?.toString() || '',
                longitud_grupa: data.longitud_grupa?.toString() || '',
                numero_partos: data.numero_partos?.toString() || '',
                intervalo_partos: data.intervalo_partos?.toString() || '',
                fertilidad: data.fertilidad?.toString() || '50',
                fecha_nacimiento: data.fecha_nacimiento ? new Date(data.fecha_nacimiento).toISOString().split('T')[0] : '',
                ubicacion_sensor: data.ubicacion_sensor || '',
            };
            setFormData(form);
            setModoEdicion(true);
            setMostrarFormularioAnimal(true);
        } catch (error) {
            console.error("Error al cargar ficha de animal:", error);
            toast.error("No se pudo cargar la ficha del animal.", {
                description: "Por favor, intente de nuevo.",
                icon: <AlertCircle className="h-4 w-4 text-red-500" />,
            });
        }
    }, []);

    const handleGuardarAnimal = async (data) => {
        try {
            if (modoEdicion) {
                await updateAnimal(data.animal_id, data);
                toast.success("Animal actualizado.", {
                    description: `Los datos de ${data.nombre} han sido guardados.`,
                    icon: <CheckCircle className="h-4 w-4 text-green-500" />,
                });
            } else {
                await createAnimal(data);
                toast.success("Animal creado.", {
                    description: `El animal ${data.nombre} ha sido añadido.`,
                    icon: <CheckCircle className="h-4 w-4 text-green-500" />,
                });
            }
            setMostrarFormularioAnimal(false);
            setFormData({});
            await cargarDatos();
        } catch (error) {
            console.error("Error al guardar animal:", error);
            toast.error("Error al guardar el animal.", {
                description: error.message || "Hubo un problema al procesar la solicitud.",
                icon: <XCircle className="h-4 w-4 text-red-500" />,
            });
        }
    };

    const handleEliminarAnimalConfirm = async () => {
        if (!modalEliminarAnimal.animal) return;
        try {
            await deleteAnimal(modalEliminarAnimal.animal.animal_id);
            toast.success("Animal eliminado.", {
                description: `${modalEliminarAnimal.animal.nombre} ha sido eliminado correctamente.`,
                icon: <Trash2 className="h-4 w-4 text-red-500" />,
            });
            setModalEliminarAnimal({ abierto: false, animal: null });
            await cargarDatos();
        } catch (error) {
            console.error("Error al eliminar animal:", error);
            toast.error("Error al eliminar el animal.", {
                description: error.message || "No se pudo completar la eliminación. Si está asignado a un collar, se desvinculará automáticamente.",
                icon: <XCircle className="h-4 w-4 text-red-500" />,
            });
        }
    };

    // --- Manejo de Collares ---

    const handleCreateCollarBatch = async (identificadorBase, cantidad) => {
        try {
            await createCollarBatch({ identificador: identificadorBase, cantidad: cantidad });
            toast.success("Collares creados.", {
                description: `Se han registrado ${cantidad} collares con identificador ${identificadorBase}.`,
                icon: <CheckCircle className="h-4 w-4 text-green-500" />,
            });
            await cargarDatos();
        } catch (error) {
            console.error("Error al crear collares en lote:", error);
            toast.error("Error al crear collares.", {
                description: error.message || "Hubo un problema al procesar la solicitud de creación masiva.",
                icon: <XCircle className="h-4 w-4 text-red-500" />,
            });
        }
    };

    const handleEliminarCollar = (collar) => {
        setModalEliminarCollar({ abierto: true, collar: collar });
    };

    const handleEliminarCollarConfirm = async () => {
        if (!modalEliminarCollar.collar) return;
        try {
            await deleteCollar(modalEliminarCollar.collar.id);
            toast.success("Collar eliminado.", {
                description: `El collar con código ${modalEliminarCollar.collar.codigo} ha sido eliminado.`,
                icon: <Trash2 className="h-4 w-4 text-red-500" />,
            });
            setModalEliminarCollar({ abierto: false, collar: null });
            await cargarDatos();
        } catch (error) {
            console.error("Error al eliminar collar:", error);
            toast.error("Error al eliminar el collar.", {
                description: error.message || "No se pudo completar la eliminación. Si está asignado, se desvinculará automáticamente.",
                icon: <XCircle className="h-4 w-4 text-red-500" />,
            });
        }
    };

    const openCollarEditModal = useCallback(async (collarId) => {
        try {
            const data = await fetchCollarDetails(collarId);
            setCollarFormData({
                collar_id: data.id,
                codigo: data.codigo,
                estado: data.estado,
                bateria: data.bateria,
                animal_id: data.animal_id != null ? data.animal_id.toString() : "UNASSIGNED",
                original_animal_id: data.animal_id != null ? data.animal_id.toString() : "UNASSIGNED",
                original_estado: data.estado
            });
            setMostrarFormularioCollar(true);
        } catch (error) {
            console.error("Error al cargar detalles del collar:", error);
            toast.error("No se pudo cargar la ficha del collar.", {
                description: "Verifique la conexión o intente de nuevo.",
                icon: <AlertCircle className="h-4 w-4 text-red-500" />,
            });
        }
    }, []);

    const handleSaveCollar = async (data) => {
        try {
            const { collar_id, animal_id, original_animal_id, original_estado, ...rest } = data;

            let needsReload = false;

            const estadoChanged = rest.estado !== original_estado;
            const bateriaChanged = rest.bateria !== collarFormData.bateria;

            if (estadoChanged || bateriaChanged) {
                await updateCollar(collar_id, { estado: rest.estado, bateria: rest.bateria });
                needsReload = true;
                toast.success("Collar actualizado.", {
                    description: `Los datos del collar ${data.codigo} han sido guardados.`,
                    icon: <CheckCircle className="h-4 w-4 text-green-500" />,
                });
            }

            if (animal_id !== original_animal_id) {
                await handleCollarAssignment(collar_id, animal_id === "UNASSIGNED" ? null : animal_id);
                needsReload = true;
                toast.success("Asignación de collar actualizada.", {
                    description: `La asignación del collar ${data.codigo} ha sido modificada.`,
                    icon: <CheckCircle className="h-4 w-4 text-green-500" />,
                });
            } else if (!estadoChanged && !bateriaChanged) {
                toast.info("No se detectaron cambios en el collar.", {
                    description: "No se realizó ninguna actualización.",
                    icon: <Info className="h-4 w-4 text-blue-500" />,
                });
            }

            if (needsReload) {
                await cargarDatos();
            }
            setMostrarFormularioCollar(false);
            setCollarFormData({});
        } catch (error) {
            console.error("Error al guardar collar:", error);
            const errorMessage = error.message || "Hubo un problema al procesar la solicitud.";
            toast.error("Error al guardar el collar.", {
                description: errorMessage,
                icon: <XCircle className="h-4 w-4 text-red-500" />,
            });
        }
    };

    const handleOpenAssignCollarModal = useCallback(async (animalId) => {
        try {
            const disponibles = await fetchCollaresDisponibles();
            setAvailableCollaresForAssignment(disponibles);
            setSelectedCollarToAssign(null);
            setModalAsignarCollar({ abierto: true, animalId: animalId });
        } catch (error) {
            console.error("Error al cargar collares disponibles:", error);
            toast.error("No se pudieron cargar collares disponibles para asignar.", {
                description: "Por favor, intente de nuevo.",
                icon: <AlertCircle className="h-4 w-4 text-red-500" />,
            });
        }
    }, []);

    const handleAssignCollarConfirm = async () => {
        if (!selectedCollarToAssign || !modalAsignarCollar.animalId) {
            toast.error("Debe seleccionar un collar para asignar.", { icon: <AlertCircle className="h-4 w-4 text-red-500" /> });
            return;
        }
        try {
            await handleCollarAssignment(parseInt(selectedCollarToAssign), modalAsignarCollar.animalId);
            toast.success("Collar asignado.", {
                description: `Collar ${selectedCollarToAssign} asignado al animal.`,
                icon: <CheckCircle className="h-4 w-4 text-green-500" />,
            });
            setModalAsignarCollar({ abierto: false, animalId: null });
            setSelectedCollarToAssign(null);
            await cargarDatos();
        } catch (error) {
            console.error("Error al asignar collar:", error);
            toast.error("Error al asignar el collar.", {
                description: error.message || "Hubo un problema al procesar la asignación.",
                icon: <XCircle className="h-4 w-4 text-red-500" />,
            });
        }
    };

    const columns = useMemo(() => [
        columnHelper.accessor("numero_identificacion", { header: "ID" }),
        columnHelper.accessor("nombre", { header: "Nombre" }),
        columnHelper.accessor(row => row.collar_asignado ? row.collar_asignado.codigo : null, {
            id: 'collar_info',
            header: 'Collar',
            cell: ({ row }) => {
                const animal = row.original;
                if (animal.collar_asignado) {
                    return (
                        <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                openCollarEditModal(animal.collar_asignado.id);
                            }}
                            className="gap-2 h-auto bg-orange-600 hover:bg-orange-700 text-white shadow-md w-full sm:w-auto hover:underline"
                        >
                            {animal.collar_asignado.codigo}
                        </Button>
                    );
                } else {
                    return (
                        <Button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpenAssignCollarModal(animal.animal_id);
                            }}
                            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-md w-full sm:w-auto"
                        >
                            <Plus className="h-3 w-3" /> <span className="hidden md:inline">Asignar</span>
                        </Button>
                    );
                }
            },
            filterFn: (row, columnId, filterValue) => {
                const collarCode = row.original.collar_asignado?.codigo;
                if (!collarCode) return false;
                return collarCode.toLowerCase().startsWith(filterValue.toLowerCase());
            },
        }),
        columnHelper.accessor(row => row.parcela ? row.parcela : '-', {
            id: 'parcela',
            header: "Parcela",
            enableColumnFilter: true,
            meta: { filterOptions: animalOptions.parcelas.map(p => p.nombre) },
        }),
        columnHelper.accessor(row => row.especie ? row.especie : '-', {
            id: 'especie',
            header: "Especie",
            enableColumnFilter: true,
            meta: { filterOptions: animalOptions.especies.map(e => e.nombre) }
        }),
        columnHelper.accessor(row => row.raza ? row.raza : '-', {
            id: 'raza',
            header: "Raza",
            enableColumnFilter: true,
            meta: { filterOptions: animalOptions.razas.map(r => r.nombre) }
        }),
        columnHelper.accessor(row => row.tipo ? row.tipo : '-', {
            id: 'tipo',
            header: "Tipo",
            enableColumnFilter: true,
            meta: { filterOptions: animalOptions.tipos.map(t => t.nombre) }
        }),
        columnHelper.accessor(row => row.sexo ? row.sexo : '-', {
            id: "sexo",
            header: "Sexo",
            enableColumnFilter: true,
            meta: { filterOptions: animalOptions.sexos?.map(s => s.nombre) }
        }),
        columnHelper.display({
            id: "acciones",
            header: "Funciones",
            enableColumnFilter: false,
            cell: ({ row, table }) => (
                <div className="flex gap-2 justify-center">
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); handleEditarAnimal(row.original.animal_id); }}
                        className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                    >
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Editar animal</span>
                    </Button>
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); setModalEliminarAnimal({ abierto: true, animal: row.original }); }}
                        className="text-red-700 hover:text-red-800 hover:bg-red-50"
                    >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Eliminar animal</span>
                    </Button>
                    {!table.options.meta.showExpandableRows && (
                        <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                                e.stopPropagation();
                                row.toggleExpanded();
                            }}
                            className="text-gray-500 hover:bg-gray-100"
                            aria-label={row.getIsExpanded() ? "Colapsar detalles" : "Expandir detalles"}
                        >
                            {row.getIsExpanded() ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </Button>
                    )}
                </div>
            )
        })
    ], [animalOptions, handleEditarAnimal, openCollarEditModal, handleOpenAssignCollarModal]);

    useEffect(() => {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
            globalFilter: tableGlobalFilter,
            sorting: tableSorting,
            pagination: tablePagination,
            columnVisibility: tableColumnVisibility,
        }));
    }, [tableGlobalFilter, tableSorting, tablePagination, tableColumnVisibility]);

    useEffect(() => {
        sessionStorage.setItem(COLLARS_STORAGE_KEY, JSON.stringify({
            globalFilter: collarFilter,
            sorting: collarSorting,
            pagination: collarPagination,
            columnVisibility: collarColumnVisibility,
        }));
    }, [collarFilter, collarSorting, collarPagination, collarColumnVisibility]);

    return (
        <div className="px-6 py-20 sm:px-8 md:px-10 lg:px-12 xl:px-16 bg-white min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 leading-tight">
                    <Bone className="inline-block h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-blue-800 mr-2 sm:mr-3 align-middle" />
                    Gestión de Animales
                </h1>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                    <Button onClick={handleNuevoAnimal} className="gap-2 bg-blue-800 hover:bg-blue-700 text-white shadow-md w-full sm:w-auto">
                        <Plus className="h-4 w-4" /> Nuevo Animal
                    </Button>
                </div>
            </div>


            <div className="gap-4 sm:gap-6 lg:gap-8">
                <Card className="p-4 shadow-lg border border-gray-200 w-full h-fit">
                    <CardContent className="p-4" ref={animalTableRef}>
                        <AnimalsDataTable
                            data={animales}
                            columns={columns}
                            exportFilename="animales"
                            fullData={animales}
                            onRowClick={(animal) => console.log("Seleccionado:", animal.numero_identificacion)}
                            onEditRow={handleEditarAnimal}
                            onDeleteRow={(animal) => setModalEliminarAnimal({ abierto: true, animal: animal })}
                            globalFilter={tableGlobalFilter}
                            setGlobalFilter={handleAnimalSearchChange}
                            rowSelection={tableRowSelection}
                            setRowSelection={setTableRowSelection}
                            sorting={tableSorting}
                            setSorting={setTableSorting}
                            pagination={tablePagination}
                            setPagination={setTablePagination}
                            columnVisibility={tableColumnVisibility}
                            setColumnVisibility={setTableColumnVisibility}
                        />
                    </CardContent>
                </Card>
            </div>

            {/* Sección de Gestión de Collares */}
            <div className="mt-8 flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-gray-900 leading-tight">
                    <Tag className="inline-block h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 text-purple-600 mr-2 sm:mr-3 align-middle" />
                    Gestión de Collares
                </h1>
            </div>

            <div className="mb-4 gap-4 sm:gap-6 lg:gap-8">
                <Card className="p-4 shadow-lg border border-gray-200 w-full h-fit">
                    <CardContent ref={collarGridRef}>
                        <CollarsGrid
                            collares={collares}
                            onCreateBatch={handleCreateCollarBatch}
                            onDelete={handleEliminarCollar}
                            onEditCollar={openCollarEditModal}
                            fullCollarDataForExport={collares}
                            collarStatesOptions={collarStatesOptions}
                            onImportSuccess={cargarDatos}
                            globalFilter={collarFilter}
                            setGlobalFilter={handleCollarSearchChange}
                            rowSelection={collarRowSelection}
                            setRowSelection={setCollarRowSelection}
                            sorting={collarSorting}
                            setSorting={setCollarSorting}
                            pagination={collarPagination}
                            setPagination={setCollarPagination}
                            columnVisibility={collarColumnVisibility}
                            setColumnVisibility={setCollarColumnVisibility}
                        />

                    </CardContent>
                </Card>
            </div>

            {/* Modal para AnimalForm */}
            <ModalGenerico
                isOpen={mostrarFormularioAnimal}
                size="xxxxl"
            >
                <AnimalForm
                    animal={formData}
                    modoEdicion={modoEdicion}
                    parcelas={parcelas}
                    animalOptions={animalOptions}
                    onCancel={() => setMostrarFormularioAnimal(false)}
                    onSave={handleGuardarAnimal}
                />
            </ModalGenerico>

            {/* Modal para CollarForm */}
            <ModalGenerico
                isOpen={mostrarFormularioCollar}
                size="xl"
            >

                <CollarForm
                    collar={collarFormData}
                    animals={animales}
                    collarStatesOptions={collarStatesOptions}
                    onCancel={() => setMostrarFormularioCollar(false)}
                    onSave={handleSaveCollar}
                />
            </ModalGenerico>

            {/* Modal para Asignar Collar a un Animal */}
            <ModalGenerico
                isOpen={modalAsignarCollar.abierto}
                title={`Asignar Collar a ${modalAsignarCollar.animalId ? animales.find(a => a.animal_id === modalAsignarCollar.animalId)?.nombre : 'animal desconocido'}`}
                description="Selecciona un collar disponible para asignar a este animal."
                onCancel={() => { setModalAsignarCollar({ abierto: false, animalId: null }); setSelectedCollarToAssign(null); }}
                onConfirm={handleAssignCollarConfirm}
                confirmText="Asignar Collar"
                confirmColor="bg-purple-600 hover:bg-purple-700"
                cancelText="Cancelar"
                icon={<Link className="h-6 w-6 text-purple-500" />}
                size="sm"
                message={
                    <div className="p-4 space-y-4">
                        <div>
                            <Label htmlFor="collar-select" className="mb-2 block text-sm font-medium text-gray-700">Seleccionar Collar</Label>
                            <Select
                                onValueChange={setSelectedCollarToAssign}
                                value={selectedCollarToAssign || ''}
                                disabled={availableCollaresForAssignment.length === 0}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue
                                        placeholder={
                                            availableCollaresForAssignment.length === 0
                                                ? "No hay collares disponibles"
                                                : "Seleccionar collar"
                                        }
                                    />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableCollaresForAssignment.length === 0 ? (
                                        <SelectItem value="no-available" disabled>No hay collares disponibles</SelectItem>
                                    ) : (
                                        availableCollaresForAssignment.map(collar => (
                                            <SelectItem key={collar.id} value={collar.id.toString()}>
                                                {collar.codigo} (Batería: {collar.bateria}%, Estado: {collar.estado})
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                            {availableCollaresForAssignment.length === 0 && (
                                <p className="text-sm text-red-500 mt-2">No hay collares con estado 'disponible' para asignar.</p>
                            )}
                        </div>
                    </div>
                }
            />

            {/* Modal para Eliminar Collar */}
            <ModalGenerico
                isOpen={modalEliminarCollar.abierto}
                title="Confirmar Eliminación de Collar"
                onConfirm={handleEliminarCollarConfirm}
                onCancel={() => setModalEliminarCollar({ abierto: false, collar: null })}
                confirmText="Eliminar Collar"
                confirmColor="bg-red-600 hover:bg-red-700"
                cancelText="Cancelar"
                confirmVariant="destructive"
                icon={<Trash2 className="h-6 w-6 text-red-500" />}
                size="md"
                message={
                    <span className="text-gray-700">
                        ¿Estás seguro de que quieres eliminar el collar <span className="font-bold text-red-600">{modalEliminarCollar.collar?.codigo}</span>?
                        <br />
                        Si este collar está asignado a un animal, se desvinculará automáticamente.
                    </span>
                }
            />

            {/* Modal para Eliminar Animal */}
            <ModalGenerico
                isOpen={modalEliminarAnimal.abierto}
                title="Confirmar Eliminación de Animal"
                onConfirm={handleEliminarAnimalConfirm}
                onCancel={() => setModalEliminarAnimal({ abierto: false, animal: null })}
                confirmText="Eliminar Animal"
                confirmColor="bg-red-600 hover:bg-red-700"
                cancelText="Cancelar"
                confirmVariant="destructive"
                icon={<Trash2 className="h-6 w-6 text-red-500" />}
                size="md"
                message={
                    <span className="text-gray-700">
                        ¿Estás seguro de que quieres eliminar a <span className="font-bold text-red-600">{modalEliminarAnimal.animal?.nombre}</span>?
                        <br />
                        Esta acción es irreversible y también desvinculará cualquier collar asociado.
                    </span>
                }
            />
        </div>
    );
}