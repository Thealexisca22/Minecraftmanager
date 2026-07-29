import { useState, useEffect, useRef } from 'react'
import { useLocation, useParams, useNavigate } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { load } from '@tauri-apps/plugin-store'
import { confirm } from '@tauri-apps/plugin-dialog';

function Servidor() {
    const { nombre } = useParams()
    const navigate = useNavigate()
    const [estado, setEstado] = useState("Creando...")
    const [ip, setIp] = useState(null)
    const [logs, setLogs] = useState([])
    const location = useLocation()
    const puerto = location.state?.puerto
    const intervaloRef = useRef(null)
    const estadoAnteriorRef = useRef(null)

    const eliminarDelStoreLocal = async () => {
        const store = await load('servidores.json')
        const servidores = await store.get('servidores') || []
        const nuevaLista = servidores.filter(s => s.nombre !== nombre)
        await store.set('servidores', nuevaLista)
        await store.save()
    }

    useEffect(() => {
        intervaloRef.current = setInterval(async () => {
            try {
                const estadoActual = await invoke('obtener_estado_servidor', { nombre })
                setEstado(estadoActual)

                const ipActual = await invoke('obtener_ip_minikube')
                setIp(ipActual)

                if (estadoActual === "Parado" && estadoAnteriorRef.current === "Running") {
                    setLogs(prev => [...prev, "--- Servidor detenido ---"])
                }
                estadoAnteriorRef.current = estadoActual

                if (estadoActual === "Running") {
                    const logsActuales = await invoke('obtener_logs_servidor', { nombre })
                    setLogs(logsActuales.split('\n').filter(l => l.trim() !== ''))
                }
            } catch (e) {
                const mensaje = String(e)
                if (mensaje.includes('NotFound') || mensaje.includes('not found')) {
                    setEstado("No encontrado")
                } else {
                    console.error(e)
                }
            }
        }, 3000)

        return () => clearInterval(intervaloRef.current)
    }, [nombre])

    const noEncontrado = estado === "No encontrado"

    return (
        <div className="min-h-screen p-8">
            <h1 style={{ fontSize: "44px" }}>{nombre}</h1>

            <div className="mt-4 flex items-center gap-2">
                <span>Estado:</span>
                <span style={{ color: estado === "Running" ? "green" : noEncontrado ? "red" : "orange" }}>
                    {estado}
                </span>
            </div>

            {noEncontrado && (
                <div
                    className="mt-4 p-4 rounded-md"
                    style={{ background: "#2a1010", borderRadius: "10px" }}
                >
                    <p style={{ color: "#ff6b6b" }}>
                        ⚠️ Este servidor ya no existe en el clúster de Kubernetes (puede que minikube se haya reiniciado
                        o que se haya borrado manualmente). Sigue apareciendo aquí porque quedó guardado localmente.
                    </p>
                    <button
                        className="px-4 py-2 rounded-md border text-sm mt-3"
                        style={{ borderColor: "red", color: "red" }}
                        onClick={async () => {
                            await eliminarDelStoreLocal()
                            clearInterval(intervaloRef.current)
                            navigate('/')
                        }}
                    >
                        Quitar de la lista
                    </button>
                </div>
            )}

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
                    <span style={{ color: "lightblue" }}>
                        {ip}
                    </span>
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

            {!noEncontrado && (
                <div className="flex gap-4 mt-6">
                    {estado === "Parado" ? (
                        <button
                            className="px-4 py-2 rounded-md border text-sm"
                            style={{ borderColor: "green", color: "green" }}
                            onClick={() => invoke('arrancar_servidor', { nombre })}
                        >
                            Arrancar
                        </button>
                    ) : (
                        <button
                            className="px-4 py-2 rounded-md border text-sm"
                            style={{ borderColor: "orange", color: "orange" }}
                            onClick={() => invoke('parar_servidor', { nombre })}
                        >
                            Detener
                        </button>
                    )}
                    <button className="px-4 py-2 rounded-md border text-sm">
                        Reiniciar
                    </button>
                    <button
                        className="px-4 py-2 rounded-md border text-sm"
                        style={{ borderColor: "red", color: "red" }}
                        onClick={async () => {
                            const confirmado = await confirm(
                                '¿Estás seguro de que quieres borrar este servidor? Esta acción es irreversible y se perderán todos los datos almacenados.',
                                {
                                    title: 'Confirmar',
                                    kind: 'warning',
                                }
                            );

                            if (!confirmado) return;

                            try {
                                await invoke('borrar_servidor', { nombre })
                            } catch (e) {
                                console.error("Error borrando en el clúster:", e)
                                // seguimos igualmente para no dejar el servidor huérfano en el store
                            }

                            await eliminarDelStoreLocal()
                            clearInterval(intervaloRef.current)
                            navigate('/')
                        }}
                    >
                        Borrar
                    </button>
                </div>
            )}
        </div>
    )
}

export default Servidor