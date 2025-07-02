// ~/Project/frontend/src/components/common/Modals.jsx
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/shadcn/button';

export function ModalGenerico({
    isOpen,
    title,
    message,
    onConfirm, // Solo relevante cuando children es null
    onCancel,
    confirmText = "Aceptar",
    cancelText = "Cancelar",
    children = null, // El contenido principal del modal (ej. un formulario)
    confirmVariant = "default", // Variantes de Shadcn UI: "default", "destructive", "outline", "ghost", etc.
    confirmColor = "bg-black hover:bg-gray-700", // Default classes for background and hover
    cancelVariant = "outline",
    icon = null, // Ícono para el título del modal
    size = "md" // Tamaño del modal: "sm", "md", "lg", "xl", "full"
}) {
    useEffect(() => {
        if (isOpen) {
            const timeout = setTimeout(() => {
                // Si hay children, asumimos que el children manejará el foco.
                // Si no hay children (modal de confirmación), enfocamos el botón de confirmar.
                if (!children) {
                    const button = document.querySelector('.modal-footer-confirm-button');
                    if (button) button.focus();
                }
            }, 50);
            return () => clearTimeout(timeout);
        }
    }, [isOpen, children]);

    if (!isOpen) return null;

    const sizeClasses = {
        sm: "max-w-sm",
        md: "max-w-md",
        lg: "max-w-lg",
        xl: "max-w-xl",
        xxxxl: "max-w-4xl",
        full: "max-w-full"
    };

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
            onKeyDown={(e) => {
                if (e.key === 'Escape') {
                    onCancel?.(); // Permitir cerrar con ESC
                }
            }}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby="modal-description"
        >
            <div
                className={`bg-white p-4 rounded-xl shadow-xl w-full relative ${sizeClasses[size] || sizeClasses.md}`}
            >
                {children ? (
                    children
                ) : (
                    <>
                        <h2 id="modal-title" className="text-lg font-bold mb-2 flex items-center gap-2">
                            {icon && <span className="mr-1">{icon}</span>}
                            {title}
                        </h2>
                        {message && <p id="modal-description" className="text-sm text-gray-700 mb-4">{message}</p>}
                        <div className="flex justify-end gap-2">
                            <Button
                                variant={cancelVariant}
                                onClick={onCancel}
                                className="gap-2 border-gray-300 text-gray-700 hover:bg-gray-100 shadow-md w-full sm:w-auto"
                            >
                                
                                {cancelText}
                            </Button>
                            <Button
                                variant={confirmVariant} 
                                onClick={onConfirm}
                                className={`gap-2 ${confirmColor} text-white shadow-md w-full sm:w-auto modal-footer-confirm-button`}
                            >
                                {confirmText}
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
}

export function ModalInfo({ isOpen, message, onClose }) {
    useEffect(() => {
        if (isOpen) {
            const timeout = setTimeout(() => {
                const button = document.querySelector('.modal-info-confirm-button');
                if (button) button.focus();
            }, 50);
            return () => clearTimeout(timeout);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
            <div
                className="bg-white p-5 rounded-xl shadow-lg w-full max-w-sm text-center"
                role="dialog"
                aria-modal="true"
                aria-labelledby="info-modal-title"
                aria-describedby="info-modal-description"
            >
                <h2 id="info-modal-title" className="sr-only">Información</h2>
                <p id="info-modal-description" className="text-sm text-gray-700 mb-4">{message}</p>
                <Button
                    onClick={onClose}
                    className="modal-info-confirm-button w-full sm:w-auto"
                >
                    OK
                </Button>
            </div>
        </div>,
        document.body
    );
}
