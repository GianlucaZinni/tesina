// src/api/services/authService.js
import apiClient from '../apiClient';

/**
 * Inicia sesión con las credenciales dadas.
 * @param {Object} credentials - { username, password }
 * @returns {Promise<Object>} - { status, message, user } o lanza error
 */
export const login = async (credentials) => {
    try {
        const response = await apiClient.post('/api/user/login', credentials, {
            withCredentials: true, // asegura envío de cookies
        });
        return response.data;
    } catch (error) {
        if (error.response) {
            throw new Error(error.response.data.message || "Error de autenticación.");
        }
        throw new Error("No se pudo conectar con el servidor.");
    }
};

/**
 * Cierra la sesión del usuario actual.
 * @returns {Promise<Object>} - { status, message }
 */
export const logout = async () => {
    try {
        const response = await apiClient.post('/api/user/logout', {}, {
            withCredentials: true,
        });
        return response.data;
    } catch (error) {
        throw new Error("Error al cerrar sesión.");
    }
};

/**
 * Verifica el estado de la sesión.
 * @returns {Promise<Object>} - { authenticated: true, user: {...} } o lanza error
 */
export const getSession = async () => {
    try {
        const response = await apiClient.get('/api/user/session', {
            withCredentials: true,
        });
        return response.data;
    } catch (error) {
        // En este caso podría devolver 401, y eso es válido para saber que no hay sesión
        if (error.response && error.response.status === 401) {
            return { authenticated: false };
        }
        throw new Error("Error al verificar sesión.");
    }
};
