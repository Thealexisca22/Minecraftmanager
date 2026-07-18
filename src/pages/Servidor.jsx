import { useState, useEffect, useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'

function Servidor() {
    const { nombre } = useParams()
    const location = useLocation()
    const puerto = location.state?.puerto
    const [estado, setEstado] = useState("Creando...")
    const [ip, setIp] = useState(null)
    const [logs, setLogs] = useState([])
    const playitIniciado = useRef(false)
    const playitIniciando = useRef(false)
    const playitSecret = import.meta.env.VITE_PLAYIT_SECRET


    useEffect(() => {
        const intervalo = setInterval(async () => {
            try {
                const estadoActual = await invoke('obtener_estado_servidor', { nombre })
                setEstado(estadoActual)

                if (
                    estadoActual === 'Running' &&
                    !playitIniciado.current &&
                    !playitIniciando.current
                ) {
                    playitIniciando.current = true

                    try {
                        await invoke('iniciar_playit', {
                            secret: playitSecret
                        })

                        playitIniciado.current = true
                    } finally {
                        playitIniciando.current = false
                    }
                }

                const logsActuales = await invoke('obtener_logs_servidor', { nombre })

                setLogs(
                    logsActuales
                        .split('\n')
                        .filter(l => l.trim() !== '')
                )

            } catch (error) {
                console.error("Error servidor:", error)
            }

        }, 3000)

        return () => clearInterval(intervalo)

    }, [nombre])

    return (
        <div className="min-h-screen p-8">
            <h1 style={{ fontSize: "44px" }}>{nombre}</h1>

            <div className="mt-4 flex items-center gap-2">
                <span>Estado:</span>
                <span style={{ color: estado === "Running" ? "green" : "orange" }}>
                    {estado}
                </span>
            </div>

            {puerto && (
                <div className="mt-2">
                    <span>Puerto: </span>
                    <span style={{ color: "lightblue" }}>
                        {puerto}
                    </span>
                </div>
            )}

            {ip && (
                <div className="mt-2">
                    <span>IP: </span>
                    <span style={{ color: "lightblue" }}>{ip}:25565</span>
                </div>
            )}

            <div className="mt-6">
                <h2 style={{ fontSize: "20px" }}>Logs</h2>
                <div
                    className="mt-2 p-4 rounded-md"
                    style={{
                        background: "#0a0a0a",
                        height: "50vh",
                        overflowY: "auto",
                        fontFamily: "monospace",
                        fontSize: "13px"
                    }}
                >
                    {logs.length === 0 ? (
                        <p style={{ color: "gray" }}>Esperando logs...</p>
                    ) : (
                        logs.map((log, index) => (
                            <p key={index} style={{ color: "#00ff00", margin: "2px 0" }}>{log}</p>
                        ))
                    )}
                </div>
            </div>

            <div className="flex gap-4 mt-6">
                <button className="px-4 py-2 rounded-md border text-sm" style={{ borderColor: "red", color: "red" }}>
                    Detener
                </button>
                <button className="px-4 py-2 rounded-md border text-sm">
                    Reiniciar
                </button>
                <button className="px-4 py-2 rounded-md border text-sm" style={{ borderColor: "red", color: "red" }}>
                    Borrar
                </button>
            </div>
        </div>
    )
}

export default Servidor