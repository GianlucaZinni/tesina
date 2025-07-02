// // ~/Project/frontend/src/api/apiClient.js
import axios from 'axios';

// const apiClient = axios.create({
//     baseURL: "http://127.0.0.1:5000",
//     withCredentials: true,
//     headers: {
//         'Content-Type': 'application/json',
//     },
// });

const apiClient = axios.create({
    baseURL: "http://192.168.1.35:5000", // IP de tu PC
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

export default apiClient;
