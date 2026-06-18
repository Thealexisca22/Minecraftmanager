import { useState, useEffect } from 'react'
import { load } from '@tauri-apps/plugin-store'
import { Input } from "@/components/ui/input"
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
  const [versiones, setVersiones] = useState([])
  useEffect(() => {
    const leerVersiones = async () => {
      const store = await load('versiones.json')
      const versionesGuardadas = await store.get('versiones')
      if (versionesGuardadas) {
        setVersiones(versionesGuardadas)
      }
    }
    leerVersiones()
  }, [])

  return (
    <div className="Cuerpo min-h-screen ">

      <div className="flex flex-col pt-4 items-center justify-center">
        <h1>Crear nuevo servidor</h1>

      </div>

      <div className="Formulario w-full max-w-md flex flex-col gap-3 px-4 mt-4">
        <label htmlFor="Nombre">Nombre del servidor</label>
        <Input style={{ maxWidth: "800px", maxHeight: "60px" }} id="Nombre" placeholder="Enter text" />

        <label htmlFor='version'>Version</label>
        <select id="version" placeholder="1.22" className="w-full h-9 rounded-md border px-3 text-sm">
          <option value="" disabled selected>Selecciona una versión</option>,
          {versiones.map(v => (
            <option key={v.id} value={v.id}>{v.id}</option>
          ))}
        </select>

      </div>
    </div>
  )
}

export default CrearServer