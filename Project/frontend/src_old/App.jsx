import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import Header from './components/Header'
import Footer from './components/Footer'

import MapView from './views/MapView'
import ParcelaView from './views/ParcelaView'
import CampoView from './views/CampoView'

import { useMenuControl } from './components/Header'

export default function App() {
  const { menuOpen, setMenuOpen } = useMenuControl()
  return (
    <Router>
      <Header menuOpen={menuOpen} setMenuOpen={setMenuOpen} />
      <Routes>
        <Route path="/mapa" element={<MapView />} />
        <Route path="/collares" element={<Placeholder label="Collares" />} />
        <Route path="/parcelas" element={<ParcelaView />} />
        <Route path="/alertas" element={<Placeholder label="Alertas" />} />
        <Route path="/animales" element={<Placeholder label="Animales" />} />
        <Route path="/campos" element={<CampoView />} />
        <Route path="*" element={<MapView />} />
      </Routes>
      <Footer setMenuOpen={setMenuOpen} />
    </Router>
  )
}

function Placeholder({ label }) {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-gray-100">
      <h1 className="text-3xl font-bold">{label}</h1>
    </div>
  )
}
