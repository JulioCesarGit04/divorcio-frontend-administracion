import { useEffect, useState } from 'react'
import Sidebar from '../../components/modulo3/Sidebar'
import { getHistorialGlobal } from '../../services/ProcedimientoService'
import '../../styles/modulo3/historial.css'

export default function Historial({ cambiarPagina, paginaActual }) {
    const [historial, setHistorial] = useState([])
    const [expedientesAgrupados, setExpedientesAgrupados] = useState([])
    const [expedienteExpandido, setExpedienteExpandido] = useState(null)
    const [cargando, setCargando] = useState(true)

   

    useEffect(() => {
        getHistorialGlobal()
            .then(data => {
                const historialData = Array.isArray(data) ? data : []
                setHistorial(historialData)
                
                // Agrupar por expediente
                const grupos = {}
                historialData.forEach(item => {
                    const nroExp = item.expedientes_nro_mesa_partes
                    if (!grupos[nroExp]) {
                        grupos[nroExp] = {
                            expediente_nro: nroExp,
                            expediente_id: item.historial_expediente_id,
                            acciones: []
                        }
                    }
                    grupos[nroExp].acciones.push(item)
                })
                
                // Convertir a array y ordenar por fecha descendente (el más reciente primero)
                const agrupado = Object.values(grupos)
                agrupado.sort((a, b) => {
                    const fechaA = new Date(a.acciones[0]?.historial_fecha_hora || 0)
                    const fechaB = new Date(b.acciones[0]?.historial_fecha_hora || 0)
                    return fechaB - fechaA
                })
                
                setExpedientesAgrupados(agrupado)
            })
            .catch(console.error)
            .finally(() => setCargando(false))
    }, [])

    const toggleExpandir = (expedienteNro) => {
        if (expedienteExpandido === expedienteNro) {
            setExpedienteExpandido(null)
        } else {
            setExpedienteExpandido(expedienteNro)
        }
    }

    // Función para obtener el ícono según la acción
    const getIconoAccion = (accion) => {
        if (accion === 'VINCULACION') return '🔗'
        if (accion === 'AVANCE_ETAPA') return '➡️'
        if (accion === 'GENERACION_RESOLUCION') return '📄'
        if (accion === 'ARCHIVO') return '📦'
        if (accion === 'DESBLOQUEO_ADMIN') return '🔓'
        return '📌'
    }

    // Función para obtener el color del badge según la acción
    const getColorAccion = (accion) => {
        if (accion === 'VINCULACION') return 'badge-vinculacion'
        if (accion === 'AVANCE_ETAPA') return 'badge-avance'
        if (accion === 'GENERACION_RESOLUCION') return 'badge-resolucion'
        if (accion === 'ARCHIVO') return 'badge-archivo'
        if (accion === 'DESBLOQUEO_ADMIN') return 'badge-desbloqueo'
        return 'badge-accion'
    }

    return (
        <>
            <Sidebar cambiarPagina={cambiarPagina} paginaActual={paginaActual} />
            <main className="contenido">
                <div className="pagina-header">
                    <h1>Historial global</h1>
                    <p>Registro inalterable de todas las acciones agrupadas por expediente</p>
                </div>

                {cargando ? (
                    <p className="cargando">Cargando...</p>
                ) : expedientesAgrupados.length === 0 ? (
                    <div className="vacio">
                        <p>No hay registros en el historial.</p>
                    </div>
                ) : (
                    <div className="historial-acordeon">
                        {expedientesAgrupados.map(exp => (
                            <div key={exp.expediente_nro} className="expediente-grupo">
                                <div 
                                    className={`expediente-header ${expedienteExpandido === exp.expediente_nro ? 'expandido' : ''}`}
                                    onClick={() => toggleExpandir(exp.expediente_nro)}
                                >
                                    <div className="expediente-info">
                                        <span className="expediente-icono">
                                            {expedienteExpandido === exp.expediente_nro ? '▼' : '▶'}
                                        </span>
                                        <span className="expediente-nro">
                                            📁 Expediente {exp.expediente_nro}
                                        </span>
                                        <span className="expediente-total">
                                            {exp.acciones.length} {exp.acciones.length === 1 ? 'movimiento' : 'movimientos'}
                                        </span>
                                    </div>
                                    <div className="expediente-resumen">
                                        <span className="expediente-fecha">
                                            Último: {new Date(exp.acciones[0]?.historial_fecha_hora).toLocaleDateString('es-PE')}
                                        </span>
                                    </div>
                                </div>
                                
                                {expedienteExpandido === exp.expediente_nro && (
                                    <div className="expediente-contenido">
                                        <table className="tabla-historial">
                                            <thead>
                                                <tr>
                                                    <th>Fecha y hora</th>
                                                    <th>Acción</th>
                                                    <th>Estado anterior</th>
                                                    <th>Estado nuevo</th>
                                                    <th>Detalle</th>
                                                    <th>Usuario</th>
                                                    <th>Rol</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {exp.acciones.map(h => (
                                                    <tr key={h.historial_id}>
                                                        <td className="fecha-cell">
                                                            {new Date(h.historial_fecha_hora).toLocaleString('es-PE')}
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${getColorAccion(h.historial_accion)}`}>
                                                                {getIconoAccion(h.historial_accion)} {h.historial_accion}
                                                            </span>
                                                        </td>
                                                        <td>{h.historial_estado_anterior || '—'}</td>
                                                        <td>{h.historial_estado_nuevo || '—'}</td>
                                                        <td className="detalle-cell">{h.historial_detalle || '—'}</td>
                                                        <td>{h.Usuario}</td>
                                                        <td>
                                                            <span className={`badge-rol ${h.Rol === 'ADMINISTRADOR' ? 'rol-admin' : 'rol-asistente'}`}>
                                                                {h.Rol}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </>
    )
}