import { useEffect } from 'react';
import { createPortal } from 'react-dom';

export function ModalGenerico({ isOpen, title, message, onConfirm, onCancel, confirmLabel = "Aceptar", cancelLabel = "Cancelar" }) {
    useEffect(() => {
        if (isOpen) {
            const timeout = setTimeout(() => {
                const button = document.querySelector('.modal-primary-button');
                if (button) button.focus();
            }, 50);
            return () => clearTimeout(timeout);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm w-full text-center">
                {title && <h2 className="text-lg font-bold mb-2">{title}</h2>}
                <p className="text-sm text-gray-700 mb-4">{message}</p>
                <div className="flex justify-end gap-2">
                    <button onClick={onCancel} className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 text-sm">
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="modal-primary-button px-4 py-2 rounded bg-black hover:bg-gray-700 text-white text-sm"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}

export function ModalInfo({ isOpen, message, onClose }) {
    useEffect(() => {
        if (isOpen) {
            const timeout = setTimeout(() => {
                const button = document.querySelector('.modal-primary-button');
                if (button) button.focus();
            }, 50);
            return () => clearTimeout(timeout);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white p-5 rounded-xl shadow-lg w-full max-w-sm text-center">
                <p className="text-sm text-gray-700 mb-4">{message}</p>
                <button
                    onClick={onClose}
                    className="modal-primary-button bg-black text-white px-4 py-2 rounded"
                >
                    OK
                </button>
            </div>
        </div>,
        document.body
    );
}
