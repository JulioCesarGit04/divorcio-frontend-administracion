import { createContext, useContext, useState } from 'react'

const NavigationContext = createContext()

export function NavigationProvider({ children }) {
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

    return (
        <NavigationContext.Provider value={{
            paginaActual,
            expedienteId,
            cambiarPagina,
            verDetalleExpediente
        }}>
            {children}
        </NavigationContext.Provider>
    )
}

export function useNavigation() {
    const context = useContext(NavigationContext)
    if (!context) {
        throw new Error('useNavigation debe usarse dentroo de NavigationProvider')
    }
    return context
}
