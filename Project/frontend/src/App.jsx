// App.jsx
import AppRoutes from './AppRoutes.jsx';
import { useAuth } from './context/AuthContext';
import { CampoProvider } from './context/CampoContext';
import { MapProvider } from './context/MapContext';

export default function App() {
  const { isAuthenticated, loading } = useAuth();

  // Mientras carga la sesión, no renderizamos nada
  if (loading) return <div className="p-4">Verificando sesión...</div>;

  // Si no está autenticado, renderizamos solo las rutas (LoginView)
  if (!isAuthenticated) {
    return <AppRoutes />;
  }

  // Si está autenticado, renderizamos el mapa + rutas
  return (
    <MapProvider>
      <CampoProvider>
        <AppRoutes />
      </CampoProvider>
    </MapProvider>
  );
}