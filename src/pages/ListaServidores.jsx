import { useState, useEffect, useRef } from 'react'
import { load } from '@tauri-apps/plugin-store'
import { invoke } from '@tauri-apps/api/core'
import { useNavigate } from 'react-router-dom'
import { Input } from "@/components/ui/input"

function ListaServidores() {
  const navigate = useNavigate()
  const [servidores, setServidores] = useState([])
  const [estados, setEstados] = useState({})
  const [busqueda, setBusqueda] = useState("")
  const [cargando, setCargando] = useState(true)
  const intervaloRef = useRef(null)

  useEffect(() => {
    const cargarServidores = async () => {
      const store = await load('servidores.json')
      const lista = await store.get('servidores') || []
      setServidores(lista)
      setCargando(false)
      actualizarEstados(lista)
    }
    cargarServidores()

    intervaloRef.current = setInterval(() => {
      setServidores(prev => {
        actualizarEstados(prev)
        return prev
      })
    }, 3000)

    return () => clearInterval(intervaloRef.current)
  }, [])

  const actualizarEstados = async (lista) => {
    const nuevosEstados = {}
    await Promise.all(
      lista.map(async (s) => {
        try {
          nuevosEstados[s.nombre] = await invoke('obtener_estado_servidor', { nombre: s.nombre })
        } catch (e) {
          nuevosEstados[s.nombre] = "Desconocido"
        }
      })
    )
    setEstados(prev => ({ ...prev, ...nuevosEstados }))
  }

  const irAlServidor = (servidor) => {
    navigate(`/servidor/${servidor.nombre}`, {
      state: { puerto: servidor.puerto }
    })
  }

  const alternarEstado = async (e, servidor) => {
    e.stopPropagation()
    const estadoActual = estados[servidor.nombre]
    if (estadoActual === "Parado") {
      await invoke('arrancar_servidor', { nombre: servidor.nombre })
    } else if (estadoActual === "Running") {
      await invoke('parar_servidor', { nombre: servidor.nombre })
    }
    actualizarEstados(servidores)
  }

  const colorEstado = (estado) => {
    if (estado === "Running") return "green"
    if (estado === "Iniciando") return "#facc15"
    if (estado === "Parado") return "orange"
    return "gray"
  }

  const textoBoton = (estado) => {
    if (estado === "Running") return "Detener"
    if (estado === "Iniciando") return "Iniciando..."
    return "Arrancar"
  }

  const botonDeshabilitado = (estado) => {
    return estado === "Iniciando" || estado === "Cargando..." || estado === "Desconocido" || !estado
  }

  const servidoresFiltrados = servidores.filter(s =>
    s.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="Cuerpo min-h-screen">
      <div className="flex flex-col pt-8 items-center justify-center">
        <h1 style={{ fontSize: "44px" }}>Tus servidores</h1>
      </div>

      <div className="mx-auto mt-6" style={{ maxWidth: "97vw" }}>
        <div className="flex flex-col mb-4" style={{ maxWidth: "400px" }}>
          <Input
            placeholder="Buscar servidor..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {cargando && <p>Cargando servidores...</p>}

        {!cargando && servidoresFiltrados.length === 0 && (
          <p style={{ color: "gray" }}>
            No hay servidores creados todavía.
          </p>
        )}

        <div className="grid grid-cols-3 gap-4 mt-2">
          {servidoresFiltrados.map((servidor) => {
            const estado = estados[servidor.nombre] || "Cargando..."
            return (
              <div
                key={servidor.nombre}
                onClick={() => irAlServidor(servidor)}
                className="flex flex-col p-4 rounded-md border cursor-pointer hover:shadow-md transition"
                style={{ borderRadius: "10px" }}
              >
                <div className="flex items-center justify-between">
                  <h2 style={{ fontSize: "20px", fontWeight: "bold" }}>
                    {servidor.nombre}
                  </h2>
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      border: `1px solid ${colorEstado(estado)}`,
                      color: colorEstado(estado)
                    }}
                  >
                    {estado}
                  </span>
                </div>

                <span className="text-sm mt-1" style={{ color: "gray" }}>
                  {servidor.tipo} · {servidor.version}
                </span>

                <div className="flex gap-3 mt-2 text-sm" style={{ color: "gray" }}>
                  <span>🧠 {servidor.ram} GB</span>
                  <span>⚙️ {servidor.cpus} CPUs</span>
                  <span>💾 {servidor.almacenamiento} GB</span>
                </div>

                {servidor.modoPirata && (
                  <span className="text-sm mt-1" style={{ color: "orange" }}>
                    ☠️ Modo pirata activado
                  </span>
                )}

                <span className="text-xs mt-2" style={{ color: "gray" }}>
                  Creado el {new Date(servidor.fechaCreacion).toLocaleDateString()}
                </span>

                <button
                  onClick={(e) => alternarEstado(e, servidor)}
                  disabled={botonDeshabilitado(estado)}
                  className="mt-3 px-3 py-1 rounded-md border text-sm w-fit"
                  style={{
                    borderColor: colorEstado(estado),
                    color: colorEstado(estado),
                    opacity: botonDeshabilitado(estado) ? 0.5 : 1
                  }}
                >
                  {textoBoton(estado)}
                </button>
              </div>
            )
          })}
        </div>
        <button onClick={() => navigate(`/crear`)}>
          IR
        </button>
      </div>
    </div>
  )
}

export default ListaServidores