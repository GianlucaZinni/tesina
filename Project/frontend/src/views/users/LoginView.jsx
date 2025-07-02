// ~/Project/frontend/src/views/users/LoginView.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { CircleUserRound, LockKeyhole } from 'lucide-react';

export default function LoginView() {
    const { login, isAuthenticated, loading } = useAuth();
    const navigate = useNavigate();

    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!loading && isAuthenticated) {
            navigate('/mapa', { replace: true });
        }
    }, [loading, isAuthenticated, navigate]);

    const handleChange = (e) => {
        setCredentials({ ...credentials, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        setError(null);

        try {
            await login(credentials);
            navigate('/mapa');
        } catch (err) {
            setError(err.message || 'Error de autenticación');
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="text-center text-red-600 mt-10">Verificando sesión...</div>;
    }

    return (
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-green-50 bg-gray-400">
            <div className="flex flex-col md:flex-row items-center bg-white shadow-xl rounded-xl overflow-hidden max-w-4xl w-full">

                {/* Imagen o ilustración temática */}
                <div
                    className="hidden md:block w-1/2 min-h-[500px] bg-cover bg-center"
                    style={{ backgroundImage: "url('https://i.pinimg.com/736x/4f/ec/ee/4fecee3b0ba71316c5ffe25a78265c9e.jpg')" }}
                ></div>
                <form
                    onSubmit={handleSubmit}
                    className="p-8 w-full md:w-1/2"
                >
                    <h2 className="text-3xl font-bold text-gray-800 mb-4 text-center">Bienvenido</h2>
                    <p className="text-sm text-gray-500 mb-6 text-center">Accedé a tu sistema de gestión ganadera</p>

                    {error && <p className="text-red-600 text-sm mb-4 text-center">{error}</p>}

                    <div className="mb-4 relative">
                        <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                            Usuario
                        </label>
                        <div className="flex items-center border rounded-md shadow-sm px-3 py-2 bg-gray-50 focus-within:ring-2 focus:ring-gray-500">
                            <CircleUserRound className="text-gray-400 mr-2" />
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                value={credentials.username}
                                onChange={handleChange}
                                required
                                className="bg-transparent w-full focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="mb-6 relative">
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                            Contraseña
                        </label>
                        <div className="flex items-center border rounded-md shadow-sm px-3 py-2 bg-gray-50 focus-within:ring-2 focus:ring-gray-500">
                            <LockKeyhole className="text-gray-400 mr-2" />
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                value={credentials.password}
                                onChange={handleChange}
                                required
                                className="bg-transparent w-full focus:outline-none"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full py-2 px-4 bg-black text-white font-semibold rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 transition"
                    >
                        {submitting ? 'Ingresando...' : 'Ingresar'}
                    </button>
                </form>
            </div>
        </div>
    );
}
