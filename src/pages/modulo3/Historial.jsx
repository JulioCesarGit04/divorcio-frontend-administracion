import { useEffect, useState } from 'react'
import Sidebar from '../../components/modulo3/Sidebar'
import { getHistorialGlobal } from '../../services/ProcedimientoService'
import '../../styles/modulo3/historial.css'

export default function Historial() {
    const [preExpedientes, setPreExpedientes] = useState([])
    const [expandido, setExpandido] = useState(null)
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        getHistorialGlobal()
            .then(data => {
                const historialData = Array.isArray(data) ? data : []
                
                // ← CAMBIO: Agrupar por pre_solicitud_id (NO por número de expediente)
                const grupos = {}
                historialData.forEach(item => {
                    const preId = item.pre_solicitud_id
                    if (!grupos[preId]) {
                        grupos[preId] = {
                            pre_solicitud_id: preId,
                            pre_solicitud_codigo: item.pre_solicitud_codigo,
                            solicitante: `${item.solicitante_nombres || ''} ${item.solicitante_apellidos || ''}`,
                            demandado: `${item.demandado_nombres || ''} ${item.demandado_apellidos || ''}`,
                            acciones: []
                        }
                    }
                    grupos[preId].acciones.push(item)
                })
                
                // Ordenar acciones dentro de cada grupo por fecha ascendente
                Object.values(grupos).forEach(grupo => {
                    grupo.acciones.sort((a, b) => 
                        new Date(a.historial_fecha_hora) - new Date(b.historial_fecha_hora)
                    )
                })
                
                setPreExpedientes(Object.values(grupos))
            })
            .catch(console.error)
            .finally(() => setCargando(false))
    }, [])

    const toggleExpandir = (id) => {
        setExpandido(expandido === id ? null : id)
    }

    const getIconoAccion = (accion) => {
        if (accion === 'VINCULACION') return '🔗'
        if (accion === 'DESVINCULACION_ADMIN') return '🔄'
        if (accion === 'AVANCE_ETAPA') return '➡️'
        if (accion === 'GENERACION_RESOLUCION') return '📄'
        if (accion === 'ARCHIVO') return '📦'
        if (accion === 'DESBLOQUEO_ADMIN') return '🔓'
        return '📌'
    }

    const getColorAccion = (accion) => {
        if (accion === 'VINCULACION') return 'badge-vinculacion'
        if (accion === 'DESVINCULACION_ADMIN') return 'badge-desvinculacion'
        if (accion === 'AVANCE_ETAPA') return 'badge-avance'
        if (accion === 'GENERACION_RESOLUCION') return 'badge-resolucion'
        if (accion === 'ARCHIVO') return 'badge-archivo'
        if (accion === 'DESBLOQUEO_ADMIN') return 'badge-desbloqueo'
        return 'badge-accion'
    }

    const getColorEstado = (estado) => {
        if (estado === 'RECIBIDO') return 'estado-recibido'
        if (estado === 'EVALUACION') return 'estado-evaluacion'
        if (estado === 'RES_SEPARACION') return 'estado-separacion'
        if (estado === 'RES_DISOLUCION') return 'estado-disolucion'
        if (estado === 'ARCHIVO') return 'estado-archivo'
        if (estado === 'ANULADO') return 'estado-anulado'
        return ''
    }

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="pagina-header">
                    <h1>Historial por pre-expediente</h1>
                    <p>Todos los intentos de vinculación y acciones de cada solicitud</p>
                </div>

                {cargando ? (
                    <p className="cargando">Cargando...</p>
                ) : preExpedientes.length === 0 ? (
                    <div className="vacio">
                        <p>No hay registros en el historial.</p>
                    </div>
                ) : (
                    <div className="historial-acordeon">
                        {preExpedientes.map(pre => (
                            <div key={pre.pre_solicitud_id} className="expediente-grupo">
                                <div 
                                    className={`expediente-header ${expandido === pre.pre_solicitud_id ? 'expandido' : ''}`}
                                    onClick={() => toggleExpandir(pre.pre_solicitud_id)}
                                >
                                    <div className="expediente-info">
                                        <span className="expediente-icono">
                                            {expandido === pre.pre_solicitud_id ? '▼' : '▶'}
                                        </span>
                                        <span className="expediente-nro">
                                            📋 {pre.pre_solicitud_codigo}
                                        </span>
                                        <span className="expediente-subtitulo">
                                            {pre.solicitante} vs {pre.demandado}
                                        </span>
                                        <span className="expediente-total">
                                            {pre.acciones.length} movimientos
                                        </span>
                                    </div>
                                </div>
                                
                                {expandido === pre.pre_solicitud_id && (
                                    <div className="expediente-contenido">
                                        <table className="tabla-historial">
                                            <thead>
                                                <tr>
                                                    <th>Fecha y hora</th>
                                                    <th>N° Mesa</th>
                                                    <th>Acción</th>
                                                    <th>Estado</th>
                                                    <th>Detalle</th>
                                                    <th>Usuario</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {pre.acciones.map(acc => (
                                                    <tr key={acc.historial_id}>
                                                        <td className="fecha-cell">
                                                            {new Date(acc.historial_fecha_hora).toLocaleString('es-PE')}
                                                        </td>
                                                        <td className="mesa-cell">
                                                            {acc.expedientes_nro_mesa_partes || '—'}
                                                        </td>
                                                        <td>
                                                            <span className={`badge ${getColorAccion(acc.historial_accion)}`}>
                                                                {getIconoAccion(acc.historial_accion)} {acc.historial_accion}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            <span className={`estado-badge ${getColorEstado(acc.historial_estado_nuevo)}`}>
                                                                {acc.historial_estado_nuevo || '—'}
                                                            </span>
                                                        </td>
                                                        <td className="detalle-cell">{acc.historial_detalle || '—'}</td>
                                                        <td>{acc.Usuario}</td>
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