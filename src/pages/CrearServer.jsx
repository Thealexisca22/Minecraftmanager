import { useState, useEffect } from 'react'
import { load } from '@tauri-apps/plugin-store'
import { Input } from "@/components/ui/input"
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { useNavigate } from 'react-router-dom'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


function CrearServer() {

  const navigate = useNavigate()
  const [nombreServidor, setNombreServidor] = useState("")
  const [versiones, setVersiones] = useState([])
  const [cpus, setCpus] = useState(0)
  const [cpusSeleccionadas, setCpusSeleccionadas] = useState(0)
  const [ram, setRam] = useState(0)
  const [ramSeleccionada, setRamSeleccionada] = useState(0)
  const [discos, setDiscos] = useState([])
  const [discoSeleccionado, setDiscoSeleccionado] = useState(null)
  const [almacenamientoAsignado, setAlamacenamientoAsignado] = useState(1)
  const [modoPirata, setModoPirata] = useState(false)
  const [tipo, setTipo] = useState("VANILLA");
  const [versionSeleccionada, setVersionSeleccionada] = useState("")
  const textos = {
    VANILLA:
      "Vanilla: servidor oficial sin mods, solo plugins de datapacks.",
    FABRIC:
      "Fabric: modloader ligero y rápido, muy usado para mods de rendimiento y contenido moderno.",
    FORGE:
      "Forge: el modloader más antiguo y con más mods disponibles, pero más pesado.",
    NEOFORGE:
      "NeoForge: continuación moderna de Forge, compatible con muchos mods de Forge recientes.",
    PAPER:
      "Paper: para servidores de plugins (no mods), muy optimizado para rendimiento con muchos jugadores.",
  };
  const [mods, setMods] = useState([])
  const [plugins, setPlugins] = useState([])

  const seleccionarArchivos = async () => {
    const archivos = await open({
      multiple: true,
      filters: [{
        name: tipo === 'PAPER' ? 'Plugins' : 'Mods',
        extensions: ['jar']
      }]
    })
    if (archivos) {
      if (tipo === 'PAPER') {
        setPlugins(archivos)
      } else {
        setMods(archivos)
      }
    }
  }

  const eliminarArchivo = (index) => {
    if (tipo === "PAPER") {
      setPlugins((prev) => prev.filter((_, i) => i !== index));
    } else {
      setMods((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const crearServidor = async () => {
    if (!nombreServidor.trim()) {
      alert('Por favor, introduce un nombre para el servidor')
      return
    }
    if (!versionSeleccionada) {
      alert('Por favor, selecciona una versión de Minecraft')
      return
    }


    const resultado = await invoke('crear_servidor', {
      nombre: nombreServidor,
      version: versionSeleccionada,
      tipo: tipo,
      ram: ramSeleccionada,
      cpus: cpusSeleccionadas,
      almacenamiento: almacenamientoAsignado,
      disco: discoSeleccionado,
      modoPirata: modoPirata,
      mods: mods,
      plugins: plugins
    })
    console.log(resultado)
    navigate(`/servidor/${nombreServidor}`, {
      state: {
        puerto: JSON.parse(resultado).puerto
      }
    })

  }

  useEffect(() => {
    const leerVersiones = async () => {
      const store = await load('versiones.json')
      const versionesGuardadas = await store.get('versiones')
      if (versionesGuardadas) {
        setVersiones(versionesGuardadas)
      }
      const ramTotal = await invoke('obtener_ram')
      setRam(ramTotal)
      const discosTotales = await invoke('obtener_discos')
      setDiscos(discosTotales)
      const cpusTotales = await invoke('obtener_cpus')
      setCpus(cpusTotales)
    }
    leerVersiones()
  }, [])

  useEffect(() => {
    if (discoSeleccionado) {
      setAlamacenamientoAsignado(discos.find(d => d.nombre === discoSeleccionado)?.espacio_libre / 4)
    }
  }, [discoSeleccionado])

  useEffect(() => {
    if (ram) {
      setRamSeleccionada(ram / 4)
    }
  }, [ram])

  useEffect(() => {
    if (cpus) {
      setCpusSeleccionadas(cpus / 4)
    }
  }, [cpus])

  return (
    <div className="Cuerpo min-h-screen ">

      <div className="flex flex-col pt-8 items-center justify-center">
        <h1 style={{ fontSize: "44px" }}>Crear nuevo servidor</h1>

      </div>

      <div className="Formulario mx-auto mt-6" style={{ maxWidth: "97vw" }}>
        <div className='flex flex-col mt-4'>
          <label htmlFor="Nombre">Nombre del servidor</label>
          <Input style={{ maxHeight: "60px" }} id="Nombre"
            placeholder="Nombre del servidor"
            value={nombreServidor}
            onChange={(e) => setNombreServidor(e.target.value)}
          />
        </div>

        <div className='Principal w-full grid grid-cols-2 gap-6 mt-4'>
          <div className='ColumnaIZ max-w-xxl flex flex-col'>
            <label htmlFor='version'>Version</label>
            <select id="version" placeholder="1.22" className="w-full h-9 rounded-md border px-3 text-sm"
              value={versionSeleccionada}
              onChange={(e) => setVersionSeleccionada(e.target.value)}
            >
              <option value="" disabled selected>Selecciona una versión</option>,
              {versiones.map(v => (
                <option key={v.id} value={v.id}>{v.id}</option>
              ))}
            </select>
            <div className='flex flex-col mt-4'>
              Memoria asignada (RAM)
              <br />{ramSeleccionada} GB
              <input
                type="range"
                min={1}
                max={ram}
                step={0.5}
                value={ramSeleccionada}
                onChange={(e) => setRamSeleccionada(Number(e.target.value))}
              />
              {ramSeleccionada > ram * 0.75 && (
                <p style={{ color: "red", }}>
                  ⚠️ Estás asignando mas del 75% de su ram total, el sistema puede ir lento
                </p>
              )}
            </div>
            <div className='flex flex-col mt-4'>
              Núcleos de CPU
              <br />{cpusSeleccionadas}
              <input
                type="range"
                min={1}
                max={cpus}
                step={0.5}
                value={cpusSeleccionadas}
                onChange={(e) => setCpusSeleccionadas(Number(e.target.value))}
              />
              {cpusSeleccionadas > cpus * 0.50 && (
                <p style={{ color: "red", }}>
                  ⚠️ Estás asignando más del 50% de los núcleos de CPU disponibles. El sistema podría volverse más lento.
                </p>
              )}
            </div>
          </div>

          <div className='ColumnaDe max-w-xxl flex flex-col'>
            <label htmlFor='tipo-select'>Tipo de servidor</label>

            <select
              id="tipo-select"
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              style={{ width: "100%" }}
              className='w-full h-9 rounded-md border px-3 text-sm'
            >
              <option value="VANILLA">Vanilla</option>
              <option value="FABRIC">Fabric</option>
              <option value="FORGE">Forge</option>
              <option value="NEOFORGE">NeoForge</option>
              <option value="PAPER">Paper</option>
            </select>
            {textos[tipo]}
            <div className='flex flex-col mt-4'>
              <label htmlFor="disco">Disco</label>
              <select
                id="disco"
                className="w-full h-9 rounded-md border px-3 text-sm"
                onChange={(e) => setDiscoSeleccionado(e.target.value)}
              >
                <option value="" disabled selected>Selecciona un disco</option>
                {discos.map(d => (
                  <option key={d.nombre} value={d.nombre}>
                    {d.nombre} — {d.espacio_libre} GB libres
                  </option>
                ))}
              </select>

              {almacenamientoAsignado} GB
              <input
                type="range"
                min={1}
                max={discos.find(d => d.nombre === discoSeleccionado)?.espacio_libre || 100}
                step={0.5}
                value={almacenamientoAsignado}
                onChange={(e) => setAlamacenamientoAsignado(Number(e.target.value))}
              />
              {almacenamientoAsignado > discos.find(d => d.nombre === discoSeleccionado)?.espacio_libre * 0.75 && (
                <p style={{ color: "red", }}>
                  ⚠️ Estás asignando mucho espacio, puede que el disco se llene
                </p>
              )}
              {almacenamientoAsignado >= 2 && almacenamientoAsignado < 5 && (
                <p style={{ color: "orange" }}>
                  ⚠️ Se recomienda asignar al menos 5 GB de almacenamiento para un servidor de Minecraft.
                </p>
              )}
              {almacenamientoAsignado >= 1 && almacenamientoAsignado < 2 && (
                <p style={{ color: "red" }}>
                  ⚠️ ¿1 GB? Vamos, no me jodas... La verdad, no sé si arrancará. 💀
                </p>
              )}
            </div>
          </div>
        </div>
        <div className='flex flex-col mt-4'>
          <label>Mods/Plugins(uno por línea, URL de Modrinth/CurseForge)</label>
          <textarea className='mt-1 p-2' rows={3}
            placeholder={
              tipo === "PAPER"
                ? "Pega un plugin por línea, por ejemplo:\nhttps://modrinth.com/plugin/viaversion\nhttps://modrinth.com/plugin/luckperms"
                : "Pega un mod por línea, por ejemplo:\nhttps://modrinth.com/mod/sodium\nhttps://modrinth.com/mod/fabric-api"
            }
            style={{ width: "100%", resize: "none", height: "12vh", borderRadius: "10px" }}
            disabled={tipo === "VANILLA"}
          />
          <div className='flex items-center gap-2 mt-2'>
            <span className="text-sm" style={{ color: "gray" }}>o añade archivos manualmente</span>
          </div>
          <div className='flex flex-col mt-2 gap-2'>
            <button
              onClick={seleccionarArchivos}
              disabled={tipo === "VANILLA"}
              className='w-fit px-4 py-2 rounded-md border text-sm'
            >
              {tipo === "PAPER" ? "Añadir plugins (.jar)" : "Añadir mods (.jar)"}
            </button>

            {(tipo === "PAPER" ? plugins : mods).length > 0 && (
              <div>
                {(tipo === "PAPER" ? plugins : mods).map((archivo, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-2 py-1"
                  >
                    <span className="text-sm" style={{ color: "gray" }}>
                      📦 {archivo.split("\\").pop()}
                      <button
                        onClick={() => eliminarArchivo(index)}
                        className="text-red-500 ml-1 hover:text-red-700 text-sm"
                      >
                        ✕
                      </button>
                    </span>


                  </div>
                ))}
              </div>
            )}

            <div className='flex items-center  gap-2 mt-4'>
              <input
                type="checkbox"
                id="modoPirata"
                checked={modoPirata}
                onChange={(e) => setModoPirata(e.target.checked)}
              />
              <label htmlFor="modoPirata">Activar para permitir jugadores pirata</label>
            </div>
          </div>

        </div>
        <button onClick={crearServidor}>
          Crear servidor
        </button>
      </div>
    </div>
  )
}

export default CrearServer