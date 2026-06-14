import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import './App.css'

function App() {
  const tituloCompleto = "Bienvenido a Minecraft Simple Server"
  const textoCompleto = "Veo que no tienes ningun servidor pulsa en boton para crear uno"
  const [tituloVisible, setTituloVisible] = useState("")
  const [textoVisible, setTextoVisible] = useState("")

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
          <Button className="my-auto" style={{ fontSize: "40px" }} variant="ghost">GO</Button>
        </div>
      </div>
    </>
  )
}

export default App
