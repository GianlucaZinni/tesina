// ~/Project/frontend/src/AppRoutes.jsx
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Header from './components/ui/Navigation/Header';
import Footer from './components/ui/Navigation/Footer';
import LoginView from './views/users/LoginView';
import MapView from './views/map/MapView';
import ParcelaView from './views/map/ParcelaView';
import CampoView from './views/map/CampoView';
import AnimalView from './views/animals/AnimalView';
import { MapProvider } from './context/MapContext';

import { useMenuControl } from './components/ui/Navigation/Header';
import { useAuth } from './context/AuthContext';
import MapLayout from './layouts/MapLayout';

export default function AppRoutes() {
    const location = useLocation();
    const { menuOpen, setMenuOpen } = useMenuControl();
    const isLogin = location.pathname === '/login';

    return (
        <>
            {!isLogin && <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} />}
            <Routes>
                <Route path="/login" element={<LoginView />} />
                <Route path="/animales" element={<ProtectedRoute> <AnimalView /> </ProtectedRoute>} />
                <Route
                    element={
                        <ProtectedRoute>
                            <MapProvider>
                                <MapLayout />
                            </MapProvider>
                        </ProtectedRoute>
                    }
                >
                    <Route path="/mapa" element={<MapView />} />
                    <Route path="/parcelas" element={<ParcelaView />} />
                    <Route path="/campos" element={<CampoView />} />
                </Route>

                <Route path="/alertas" element={<ProtectedRoute><Placeholder label="Alertas" /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            {!isLogin && <Footer setMenuOpen={setMenuOpen} />}
        </>
    );
}

function Placeholder({ label }) {
    return (
        <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
            <h1 className="text-3xl font-bold">{label}</h1>
        </div>
    );
}

function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return <div className="text-center text-blue-800 mt-10">Verificando sesión...</div>;
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    return children;
}