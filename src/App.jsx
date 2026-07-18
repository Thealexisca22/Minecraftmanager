import { Routes, Route } from 'react-router-dom'
import Inicio from './pages/Inicio.jsx'
import CrearServer from '@/pages/CrearServer.jsx'
import Servidor from '@/pages/Servidor.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/crear" element={<CrearServer/>} />
      <Route path="/servidor/:nombre" element={<Servidor />} />
    </Routes>
  )
}

export default App