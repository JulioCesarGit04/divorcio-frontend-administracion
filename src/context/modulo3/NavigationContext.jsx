import { createContext, useContext, useState } from 'react'

const NavigationContext = createContext()

export function NavigationProvider({ children }) {
    const [paginaActual, setPaginaActual] = useState('expedientes')
    const [expedienteId, setExpedienteId] = useState(null)

    const cambiarPagina = (pagina, id = null) => {
        console.log('🔵 cambiarPagina:', pagina, id);
        setPaginaActual(pagina)
        if (id !== null) {
            setExpedienteId(id)
        }
    }

    const verDetalle = (id) => {
        console.log('🔵 verDetalle:', id);
        setExpedienteId(id)
        setPaginaActual('detalle')
    }

    const irADocumentosInternos = (id) => {
        console.log('🔵 irADocumentosInternos:', id);
        setExpedienteId(id)
        setPaginaActual('documentosInternos')
    }

    const irAProgramarAudiencia = (id) => {
        console.log('🔵 irAProgramarAudiencia:', id);
        setExpedienteId(id)
        setPaginaActual('programarAudiencia')
    }

    const irAResolucionFundada = (id) => {
        console.log('🔵 irAResolucionFundada:', id);
        setExpedienteId(id)
        setPaginaActual('resolucionFundada')
    }

    return (
        <NavigationContext.Provider value={{
            paginaActual,
            expedienteId,
            cambiarPagina,
            verDetalle,
            irADocumentosInternos,
            irAProgramarAudiencia,
            irAResolucionFundada
        }}>
            {children}
        </NavigationContext.Provider>
    )
}

export function useNavigation() {
    const context = useContext(NavigationContext)
    if (!context) {
        throw new Error('useNavigation debe usarse dentro de NavigationProvider')
    }
    return context
}