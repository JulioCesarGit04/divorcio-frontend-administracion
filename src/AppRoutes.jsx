import { useNavigation } from './context/modulo3/NavigationContext'
import Dashboard from './pages/modulo3/Dashboard'
import VincularExpedientes from './pages/modulo3/VincularExpedientes'
import ExpedientesActivos from './pages/modulo3/ExpedientesActivos'
import DetalleExpediente from './pages/modulo3/DetalleExpediente'
import Historial from './pages/modulo3/Historial'
import Alertas from './pages/modulo3/Alertas'
import Reportes from './pages/modulo3/Reportes'
import Login from './pages/modulo3/Login'
import DocumentosInternos from './pages/modulo3/DocumentosInternos'
import ProgramarAudiencia from './pages/modulo3/ProgramarAudiencia'
import ResolucionFundada from './pages/modulo3/ResolucionFundada'

export default function AppRoutes() {
    const { paginaActual, expedienteId, cambiarPagina, verDetalle } = useNavigation()    
    console.log(' AppRoutes - paginaActual:', paginaActual, 'expedienteId:', expedienteId)
    
    const propsComunes = {
        cambiarPagina,
        paginaActual,
        verDetalle
    }

    // Props con ID para las vistas que lo necesitan
    const propsConId = {
        ...propsComunes,
        id: expedienteId
    }

    switch (paginaActual) {
        case 'login':
            return <Login cambiarPagina={cambiarPagina} />
        case 'dashboard':
            return <Dashboard {...propsComunes} />
        case 'vincular':
            return <VincularExpedientes {...propsComunes} />
        case 'expedientes':
            return <ExpedientesActivos {...propsComunes} />
        case 'detalle':
            return <DetalleExpediente {...propsConId} />
        case 'historial':
            return <Historial {...propsComunes} />
        case 'alertas':
            return <Alertas {...propsComunes} />
        case 'reportes':
            return <Reportes {...propsComunes} />
        case 'documentosInternos':
            return <DocumentosInternos {...propsConId} />
        case 'programarAudiencia':
            return <ProgramarAudiencia {...propsConId} />
        case 'resolucionFundada':
            return <ResolucionFundada {...propsConId} />
        default:
            return <Login cambiarPagina={cambiarPagina} />
    }
}