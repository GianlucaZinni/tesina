// // ~/Project/frontend/src/api/apiClient.js
import axios from 'axios';

const BASE_URL = "http://192.168.1.35:5000"; // IP de tu PC

const apiClient = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Adjunta el token JWT en cada petición si existe
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
});

/**
 * Wrapper de fetch que agrega el token JWT y la baseURL automáticamente.
 * Utilizar para las peticiones que actualmente usan `fetch` nativo.
 */
export async function apiFetch(path, options = {}) {
    const token = localStorage.getItem('token');
    const headers = options.headers ? { ...options.headers } : {};
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${BASE_URL}${path}`;
    const response = await fetch(url, {
        credentials: 'include',
        ...options,
        headers,
    });
    return response;
}

export default apiClient;