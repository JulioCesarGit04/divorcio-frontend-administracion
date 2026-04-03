import { useState } from 'react'
import Dashboard from './pages/modulo3/Dashboard'
import VincularExpedientes from './pages/modulo3/VincularExpedientes'
import ExpedientesActivos from './pages/modulo3/ExpedientesActivos'
import DetalleExpediente from './pages/modulo3/DetalleExpediente'
import Historial from './pages/modulo3/Historial'
import Alertas from './pages/modulo3/Alertas'
import Reportes from './pages/modulo3/Reportes'
import Login from './pages/modulo3/Login'
import './App.css'

function App() {
  const [paginaActual, setPaginaActual] = useState('login')
  const [expedienteId, setExpedienteId] = useState(null)

  const cambiarPagina = (pagina, id = null) => {
    setPaginaActual(pagina)
    if (id) setExpedienteId(id)
  }

  const verDetalleExpediente = (id) => {
    setExpedienteId(id)
    setPaginaActual('detalle')
  }

  const renderComponente = () => {
    const propsComunes = { 
      cambiarPagina, 
      paginaActual,
      verDetalle: verDetalleExpediente
    }

    switch(paginaActual) {
      case 'login':
        return <Login cambiarPagina={cambiarPagina} />
      case 'dashboard':
        return <Dashboard {...propsComunes} />
      case 'vincular':
        return <VincularExpedientes {...propsComunes} />
      case 'expedientes':
        return <ExpedientesActivos {...propsComunes} />
      case 'detalle':
        return <DetalleExpediente id={expedienteId} {...propsComunes} />
      case 'historial':
        return <Historial {...propsComunes} />
      case 'alertas':
        return <Alertas {...propsComunes} />
      case 'reportes':
        return <Reportes {...propsComunes} />
      default:
        return <Login cambiarPagina={cambiarPagina} />
    }
  }

  return renderComponente()
}

export default App