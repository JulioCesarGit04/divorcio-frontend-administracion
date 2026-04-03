import { createContext, useContext, useState } from 'react'
//generado por julio borra despues2

const NavigationContext = createContext()

export function NavigationProvider({ children }) {
    const [paginaActual, setPaginaActual] = useState('dashboard')
    const [expedienteId, setExpedienteId] = useState(null)

    const cambiarPagina = (pagina, id = null) => {
        console.log('🔵 cambiarPagina llamada:', pagina, id);  // ← AGREGAR
        setPaginaActual(pagina)
        if (id) setExpedienteId(id)
    }

    const verDetalleExpediente = (id) => {
        console.log('🔵 verDetalleExpediente llamada:', id);  // ← AGREGAR
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
        throw new Error('useNavigation debe usarse dentro de NavigationProvider')
    }
    return context
}