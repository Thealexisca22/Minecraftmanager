import { Routes, Route } from 'react-router-dom'
import Inicio from './pages/Inicio.jsx'
import CrearServer from '@/pages/CrearServer.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/crear" element={<CrearServer/>} />
    </Routes>
  )
}

export default App