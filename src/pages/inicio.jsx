import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from "@/components/ui/button"
import { load } from '@tauri-apps/plugin-store'
import '../App.css'

function Inicio() {
  const navigate = useNavigate()
  const tituloCompleto = "Bienvenido a Minecraft Simple Server"
  const textoCompleto = "Veo que no tienes ningun servidor pulsa en boton para crear uno"
  const [tituloVisible, setTituloVisible] = useState("")
  const [textoVisible, setTextoVisible] = useState("")

  useEffect(() => {
    const cargarVersiones = async () => {
      const store = await load('versiones.json')
      const versionesGuardadas = await store.get('versiones')
      if (!versionesGuardadas) {
        const respuesta = await fetch(`https://launchermeta.mojang.com/mc/game/version_manifest.json`, {
          method: "GET",
        })
        const datos = await respuesta.json()
        const soloReleases = datos.versions.filter(v => v.type === 'release')
        await store.set('versiones', soloReleases)
        await store.save()
      }
    }
    cargarVersiones()
  }, [])

  useEffect(() => {
    let i = 0

    const tituloInterval = setInterval(() => {
      setTituloVisible(tituloCompleto.slice(0, i + 1))
      i++

      if (i === tituloCompleto.length) {
        clearInterval(tituloInterval)

        let a = 0
        const textoInterval = setInterval(() => {
          setTextoVisible(textoCompleto.slice(0, a + 1))
          a++

          if (a === textoCompleto.length) {
            clearInterval(textoInterval)
          }
        }, 80)
      }
    }, 80)

    return () => {
      clearInterval(tituloInterval)
    }
  }, [])

  return (
    <>
      <div className="h-screen flex flex-col">
        <div className='Cabecera w-fit mx-auto'>
          <h1 style={{ fontFamily: "Array67", color: "green" }}>{tituloVisible}</h1>
        </div>
        <div className='Cuerpo flex-1 flex flex-col text-center'>
          <p style={{ fontSize: "8px", color: "green" }}>{textoVisible}</p>
          <Button onClick={() => navigate('/crear')} className="my-auto" style={{ fontSize: "40px" }} variant="ghost">GO</Button>
        </div>
      </div>
    </>
  )
}

export default Inicio