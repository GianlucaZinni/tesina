// ~/Project/frontend/src/components/ui/Navigation/Header.jsx
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

export default function Header({ menuOpen, setMenuOpen }) {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

    const handleNavigate = (path) => {
        setMenuOpen(false);
        setTimeout(() => {
            navigate(path, { replace: true });
        }, 100);
    };

    const stopPropagation = (e) => {
        e.stopPropagation();
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login', { replace: true });
    };

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                setMenuOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('resize', handleResize);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [setMenuOpen]);

    return (
        <>
            {/* Botón hamburguesa */}
            <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
                <button onClick={() => setMenuOpen(true)} className="bg-white rounded-full p-3 shadow-md">
                    <Menu className="w-6 h-6 text-gray-800" />
                </button>
            </div>

            {/* Menú pantalla completa */}
            {menuOpen && (
                <div
                    key={windowSize.width}
                    className="fixed inset-0 bg-white/60 backdrop-blur-md z-50 transition-all duration-300 ease-in-out animate-slide-in-left"
                    onClick={() => setMenuOpen(false)}
                >
                    {/* Botón cerrar */}
                    <button
                        onClick={() => setMenuOpen(false)}
                        className="absolute top-4 right-6 text-lg text-gray-700 hover:text-red-600"
                    >
                        ✕
                    </button>

                    <div
                        className="h-full w-full flex flex-col items-center justify-center px-4 text-center"
                        onClick={stopPropagation}
                    >
                        {[
                            ['Mapa', '/mapa'],
                            ['Parcelas', '/parcelas'],
                            ['Campos', '/campos'],
                            ['Alertas', '/alertas'],
                            ['Animales', '/animales']
                        ].map(([label, path]) => (
                            <button
                                key={path}
                                onClick={() => handleNavigate(path)}
                                className="w-full text-gray-800 font-semibold hover:text-green-600 transition-all
                                    text-xl sm:text-2xl md:text-3xl lg:text-4xl menu-button"
                            >
                                {label}
                            </button>
                        ))}

                        {/* Logout */}
                        <button
                            onClick={handleLogout}
                            className="mt-10 text-red-600 hover:text-red-800 flex items-center gap-2 text-lg"
                        >
                            <LogOut className="w-5 h-5" />
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export function useMenuControl() {
    const [menuOpen, setMenuOpen] = useState(false);
    return { menuOpen, setMenuOpen };
}
