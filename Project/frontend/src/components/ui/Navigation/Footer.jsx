// components/Footer.jsx
import { useLocation, useNavigate } from 'react-router-dom'
import { MapPin, Bell, Fence, Ruler, PawPrint } from 'lucide-react'
import FooterMenuItem from './FooterMenuItem'

export default function Footer({ setMenuOpen }) {
    const location = useLocation()
    const navigate = useNavigate()

    const handleNavigate = (path) => {
        setMenuOpen(false)   // Primero cerramos
        setTimeout(() => {
            navigate(path, { replace: true }) // Luego navegamos
        }, 100) // Un pequeño delay (100ms) para evitar que choque el re-render
    }
    

    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 z-50 bg-white border-t flex justify-around items-center">
            <FooterMenuItem label="Campos" icon={<Fence />} path="/campos" current={location.pathname} navigate={handleNavigate} />
            <FooterMenuItem label="Parcelas" icon={<Ruler />} path="/parcelas" current={location.pathname} navigate={handleNavigate} />
            <FooterMenuItem label="Mapa" icon={<MapPin />} path="/mapa" current={location.pathname} navigate={handleNavigate} />
            <FooterMenuItem label="Alertas" icon={<Bell />} path="/alertas" current={location.pathname} navigate={handleNavigate} />
            <FooterMenuItem label="Animales" icon={<PawPrint />} path="/animales" current={location.pathname} navigate={handleNavigate} />
        </div>
    )
}
