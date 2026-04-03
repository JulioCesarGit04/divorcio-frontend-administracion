import { createContext, useContext, useState } from 'react'

const NavigationContext = createContext()

export function NavigationProvider({ children }) {
    const [paginaActual, setPaginaActual] = useState('dashboard')
    const [expedienteId, setExpedienteId] = useState(null)

    const cambiarPagina = (pagina, id = null) => {
        console.log('🔵 cambiarPagina llamada:', pagina, id);
        setPaginaActual(pagina)
        if (id) setExpedienteId(id)
    }

    const verDetalle = (id) => {
        console.log('🔵 verDetalle llamada con id:', id);
        setExpedienteId(id)
        setPaginaActual('detalle')
    }

    return (
        <NavigationContext.Provider value={{
            paginaActual,
            expedienteId,
            cambiarPagina,
            verDetalle
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