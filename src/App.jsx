import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import { Calendar } from "@/components/ui/calendar"
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [date, setDate] = useState(new Date())

  return (
    <>
     <div style={{ padding: 20, background: "red", color: "white" }}>
      APP RENDERIZADA
    </div>
    <Calendar
      mode="single"
      selected={date}
      onSelect={setDate}
      className="rounded-lg border"
      captionLayout="dropdown"
    />
    </>
  )
}

export default App
