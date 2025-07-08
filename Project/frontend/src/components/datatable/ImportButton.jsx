// ~/Project/frontend/src/components/common/datatable/ImportButton.jsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/shadcn/button';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Loader2, List } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from '@/components/ui/shadcn/dialog';
import { Input } from '@/components/ui/shadcn/input';
import { Label } from '@/components/ui/shadcn/label';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/shadcn/scroll-area';

// Importar servicios según el tipo de entidad
import { importAnimals, downloadAnimalTemplate } from '@/api/services/animalService';
import { importCollars, downloadCollarTemplate } from '@/api/services/collarService';

export default function ImportButton({ entityType, onImportSuccess }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [importResults, setImportResults] = useState(null); // { summary: {}, errors: [] }

    const handleFileChange = (event) => {
        const file = event.target.files ? event.target.files[0] : null;
        setSelectedFile(file);
        setImportResults(null); // Limpiar resultados anteriores al seleccionar nuevo archivo
    };

    const handleImportClick = async () => {
        if (!selectedFile) {
            toast.error('Por favor, selecciona un archivo CSV para importar.');
            return;
        }

        setIsLoading(true);
        setImportResults(null);

        try {
            let result;
            if (entityType === 'animals') {
                result = await importAnimals(selectedFile);
            } else if (entityType === 'collares') {
                result = await importCollars(selectedFile);
            } else {
                throw new Error('Tipo de entidad no soportado para importación.');
            }

            setImportResults(result);

            if (result.status === 'success') {
                toast.success('Importación completada con éxito.', {
                    description: result.message,
                    icon: <CheckCircle className="h-4 w-4 text-green-500" />,
                });
                setIsDialogOpen(false);
                setSelectedFile(null);
                if (onImportSuccess) {
                    onImportSuccess(); // Callback para recargar datos en la vista principal
                }
            } else if (result.status === 'partial_success') {
                toast.warning('Importación completada con algunos errores.', {
                    description: result.message,
                    icon: <AlertCircle className="h-4 w-4 text-orange-500" />,
                    duration: 5000,
                });
            } else { // status: 'error' (para errores fatales del backend, aunque ya se maneja con res.ok)
                toast.error('La importación falló.', {
                    description: result.message || 'Ocurrió un error inesperado en el servidor.',
                    icon: <XCircle className="h-4 w-4 text-red-500" />,
                });
            }
        } catch (error) {
            console.error(`Error al importar ${entityType}:`, error);
            toast.error('Error al iniciar la importación.', {
                description: error.message,
                icon: <XCircle className="h-4 w-4 text-red-500" />,
            });
            setImportResults({
                summary: { total_processed: 0, created: 0, updated: 0, errors_count: 1 },
                errors: [{ row: 'N/A', errors: [{ field: 'Archivo', value: selectedFile?.name, message: error.message }] }]
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadTemplate = async () => {
        setIsLoading(true);
        try {
            let blob;
            if (entityType === 'animals') {
                blob = await downloadAnimalTemplate();
            } else if (entityType === 'collares') {
                blob = await downloadCollarTemplate();
            } else {
                throw new Error('Tipo de entidad no soportado para plantilla.');
            }

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `plantilla_${entityType}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success(`Plantilla de ${entityType} descargada correctamente.`);
        } catch (error) {
            console.error(`Error al descargar plantilla de ${entityType}:`, error);
            toast.error('Error al descargar la plantilla.', {
                description: error.message,
                icon: <XCircle className="h-4 w-4 text-red-500" />,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
                <Button
                    className="gap-2 bg-yellow-700 hover:bg-yellow-800 text-white shadow-md w-full sm:w-auto"
                >
                    <Upload className="h-4 w-4" /> <span className="hidden lg:inline">Importar</span>
                </Button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-lg sm:max-w-xl bg-white p-4">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Upload className="h-6 w-6 text-yellow-700" /> Importar {entityType === 'animals' ? 'Animales' : 'Collares'}
                    </DialogTitle>
                    <DialogDescription>
                        Sube un archivo CSV para importar o actualizar {entityType === 'animals' ? 'animales' : 'collares'}.
                        <Button
                            variant="link"
                            onClick={handleDownloadTemplate}
                            className="p-0 h-auto text-blue-800 hover:text-blue-800 flex items-center justify-start"
                            disabled={isLoading}
                        >
                            <FileText className="h-4 w-4 mr-1" /> Descargar Plantilla
                        </Button>
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="file" className="text-right">
                            Archivo CSV
                        </Label>
                        <Input
                            id="file"
                            type="file"
                            accept=".csv"
                            onChange={handleFileChange}
                            className="col-span-3"
                            disabled={isLoading}
                        />
                    </div>
                    {selectedFile && (
                        <p className="text-sm text-muted-foreground text-center">
                            <span className="font-semibold">{selectedFile.name}</span>
                        </p>
                    )}

                    {importResults && (
                        <div className="mt-4 p-4 rounded-xl bg-gray-50">
                            <h4 className="font-semibold text-lg mb-2">Resumen de Importación</h4>
                            <p className="text-sm">Total procesados: {importResults.summary.total_processed}</p>
                            <p className="text-sm">Creados: {importResults.summary.created}</p>
                            <p className="text-sm">Actualizados: {importResults.summary.updated}</p>
                            <p className="text-sm font-semibold">Errores: {importResults.summary.errors_count}</p>

                            {importResults.errors_count > 0 && (
                                <div className="mt-4">
                                    <h5 className="font-semibold text-sm text-red-600 mb-2 flex items-center gap-1">
                                        <List className="h-4 w-4" /> Detalles de Errores:
                                    </h5>
                                    <ScrollArea className="h-40 border rounded-xl p-2 bg-white">
                                        {importResults.errors.map((err, index) => (
                                            <div key={index} className="mb-2 text-xs text-red-700 border-b pb-1 last:border-b-0">
                                                <p className="font-bold">Fila {err.row}:</p>
                                                <ul className="list-disc pl-4">
                                                    {err.errors.map((detail, dIdx) => (
                                                        <li key={dIdx}>
                                                            <span className="font-medium">{detail.field}:</span> {detail.message} (Valor: "{detail.value}")
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        ))}
                                    </ScrollArea>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <DialogFooter className="flex flex-col sm:flex-row justify-between sm:space-x-2">
                    <Button
                        variant="outline"
                        onClick={() => { setIsDialogOpen(false); setSelectedFile(null); setImportResults(null); }}
                        className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-100 shadow-md w-full sm:w-auto"
                    >
                        Cerrar
                    </Button>
                    <Button
                        onClick={handleImportClick}
                        disabled={!selectedFile || isLoading}
                        variant="default"
                        className={`gap-2 bg-yellow-700 hover:bg-yellow-800 text-white shadow-md w-full sm:w-auto`}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Importar Archivo
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}