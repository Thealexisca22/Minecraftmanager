import { Routes, Route } from 'react-router-dom'
import Inicio from './pages/Inicio.jsx'
import CrearServer from '@/pages/CrearServer.jsx'
import Servidor from '@/pages/Servidor.jsx'
import ListaServidores from '@/pages/ListaServidores.jsx'
import { invoke } from '@tauri-apps/api/core'
import { load } from '@tauri-apps/plugin-store'
import { useEffect, useState } from 'react'

function App() {

  const [cargando, setCargando] = useState(true)
  const [progreso, setProgreso] = useState(0)
  const [hayServidores, setHayServidores] = useState(false)

  useEffect(() => {
    const prepararApp = async () => {
      try {
        console.log("Comprobando Minikube...")
        setProgreso(20)

        const activo = await invoke("comprobar_minikube")
        setProgreso(40)

        if (!activo) {
          console.log("Minikube apagado, iniciando...")

          const ram = await invoke("obtener_ram")
          const cpus = await invoke("obtener_cpus")

          console.log("Recursos detectados:", ram, "GB RAM", cpus, "CPUs")

          setProgreso(60)

          const resultado = await invoke("iniciar_minikube", {
            ram,
            cpus
          })

          console.log(resultado)
          setProgreso(80)

        } else {
          console.log("Minikube ya está iniciado")
          setProgreso(80)
        }

        // Comprobar si ya existen servidores creados
        const store = await load('servidores.json')
        const servidoresGuardados = await store.get('servidores') || []
        setHayServidores(servidoresGuardados.length > 0)

        setProgreso(100)

        setTimeout(() => {
          setCargando(false)
        }, 500)

      } catch (error) {
        console.error("Error preparando la app:", error)
        setCargando(false)
      }
    }

    prepararApp()
  }, [])

  if (cargando) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 style={{ fontSize: "36px" }}>Cargando app...</h1>

        <div
          className="mt-6"
          style={{
            width: "400px",
            height: "20px",
            background: "#333",
            borderRadius: "10px",
            overflow: "hidden"
          }}
        >
          <div
            style={{
              width: `${progreso}%`,
              height: "100%",
              background: "#3b82f6",
              transition: "width 0.5s"
            }}
          />
        </div>

        <p className="mt-3">{progreso}%</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={hayServidores ? <ListaServidores /> : <Inicio />} />
      <Route path="/crear" element={<CrearServer />} />
      <Route path="/servidor/:nombre" element={<Servidor />} />
      <Route path="/servidores" element={<ListaServidores />} />
    </Routes>
  )
}

export default App