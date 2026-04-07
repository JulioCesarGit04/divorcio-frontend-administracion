import { useEffect, useState } from 'react'
import Sidebar from '../../components/modulo3/Sidebar'
import { getHistorialGlobal } from '../../services/ProcedimientoService'
import '../../styles/modulo3/historial.css'

export default function Historial() {
    const [preExpedientes, setPreExpedientes] = useState([])
    const [preExpedientesFiltrados, setPreExpedientesFiltrados] = useState([])
    const [expandido, setExpandido] = useState(null)
    const [cargando, setCargando] = useState(true)
    
    // Filtros
    const [filtros, setFiltros] = useState({
        codigo: '',
        solicitante: '',
        demandado: '',
        fechaDesde: '',
        fechaHasta: ''
    })

    useEffect(() => {
        getHistorialGlobal()
            .then(data => {
                const historialData = Array.isArray(data) ? data : []
                
                const grupos = {}
                historialData.forEach(item => {
                    const preId = item.pre_solicitud_id
                    if (!grupos[preId]) {
                        grupos[preId] = {
                            pre_solicitud_id: preId,
                            pre_solicitud_codigo: item.pre_solicitud_codigo,
                            solicitante: `${item.solicitante_nombres || ''} ${item.solicitante_apellidos || ''}`.trim(),
                            demandado: `${item.demandado_nombres || ''} ${item.demandado_apellidos || ''}`.trim(),
                            acciones: []
                        }
                    }
                    grupos[preId].acciones.push(item)
                })
                
                Object.values(grupos).forEach(grupo => {
                    grupo.acciones.sort((a, b) => 
                        new Date(a.historial_fecha_hora) - new Date(b.historial_fecha_hora)
                    )
                })
                
                const gruposArray = Object.values(grupos)
                setPreExpedientes(gruposArray)
                setPreExpedientesFiltrados(gruposArray)
            })
            .catch(console.error)
            .finally(() => setCargando(false))
    }, [])

    // Aplicar filtros
    useEffect(() => {
        let filtrados = [...preExpedientes]
        
        if (filtros.codigo) {
            filtrados = filtrados.filter(pre => 
                pre.pre_solicitud_codigo?.toLowerCase().includes(filtros.codigo.toLowerCase())
            )
        }
        
        if (filtros.solicitante) {
            filtrados = filtrados.filter(pre => 
                pre.solicitante?.toLowerCase().includes(filtros.solicitante.toLowerCase())
            )
        }
        
        if (filtros.demandado) {
            filtrados = filtrados.filter(pre => 
                pre.demandado?.toLowerCase().includes(filtros.demandado.toLowerCase())
            )
        }
        
        if (filtros.fechaDesde) {
            filtrados = filtrados.filter(pre => {
                const primeraFecha = new Date(pre.acciones[0]?.historial_fecha_hora)
                return primeraFecha >= new Date(filtros.fechaDesde)
            })
        }
        
        if (filtros.fechaHasta) {
            filtrados = filtrados.filter(pre => {
                const ultimaFecha = new Date(pre.acciones[pre.acciones.length - 1]?.historial_fecha_hora)
                return ultimaFecha <= new Date(filtros.fechaHasta)
            })
        }
        
        setPreExpedientesFiltrados(filtrados)
    }, [filtros, preExpedientes])

    const limpiarFiltros = () => {
        setFiltros({
            codigo: '',
            solicitante: '',
            demandado: '',
            fechaDesde: '',
            fechaHasta: ''
        })
    }

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

    const getColorEstado = (estado) => {
        if (estado === 'RECIBIDO') return 'estado-recibido'
        if (estado === 'EVALUACION') return 'estado-evaluacion'
        if (estado === 'RES_SEPARACION') return 'estado-separacion'
        if (estado === 'RES_DISOLUCION') return 'estado-disolucion'
        if (estado === 'ARCHIVO') return 'estado-archivo'
        if (estado === 'ANULADO') return 'estado-anulado'
        return ''
    }

    const getEstadoTexto = (estado) => {
        if (estado === 'RECIBIDO') return 'Recibido'
        if (estado === 'EVALUACION') return 'Evaluación'
        if (estado === 'RES_SEPARACION') return 'Res. Separación'
        if (estado === 'RES_DISOLUCION') return 'Res. Disolución'
        if (estado === 'ARCHIVO') return 'Archivado'
        if (estado === 'ANULADO') return 'Anulado'
        return estado
    }

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="pagina-header">
                    <h1>📜 Historial de solicitudes</h1>
                    <p>Registro completo de todos los intentos de vinculación y acciones</p>
                </div>

                {/* Panel de filtros */}
                <div className="historial-filtros">
                    <div className="filtros-grid">
                        <div className="filtro-grupo">
                            <label> Código</label>
                            <input
                                type="text"
                                placeholder="Buscar por código"
                                value={filtros.codigo}
                                onChange={e => setFiltros({ ...filtros, codigo: e.target.value })}
                            />
                        </div>
                        <div className="filtro-grupo">
                            <label> Solicitante</label>
                            <input
                                type="text"
                                placeholder="Nombre del solicitante"
                                value={filtros.solicitante}
                                onChange={e => setFiltros({ ...filtros, solicitante: e.target.value })}
                            />
                        </div>
                        <div className="filtro-grupo">
                            <label> Demandado</label>
                            <input
                                type="text"
                                placeholder="Nombre del demandado"
                                value={filtros.demandado}
                                onChange={e => setFiltros({ ...filtros, demandado: e.target.value })}
                            />
                        </div>
                        <div className="filtro-grupo">
                            <label> Fecha desde</label>
                            <input
                                type="date"
                                value={filtros.fechaDesde}
                                onChange={e => setFiltros({ ...filtros, fechaDesde: e.target.value })}
                            />
                        </div>
                        <div className="filtro-grupo">
                            <label> Fecha hasta</label>
                            <input
                                type="date"
                                value={filtros.fechaHasta}
                                onChange={e => setFiltros({ ...filtros, fechaHasta: e.target.value })}
                            />
                        </div>
                        <div className="filtro-grupo acciones-filtros">
                            <button onClick={limpiarFiltros} className="btn-limpiar">
                                🗑️ Limpiar filtros
                            </button>
                        </div>
                    </div>
                </div>

                {/* Contador de resultados */}
                <div className="resultados-info">
                    Mostrando {preExpedientesFiltrados.length} de {preExpedientes.length} solicitudes
                </div>

                {cargando ? (
                    <div className="skeleton-historial">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="skeleton-card-h"></div>
                        ))}
                    </div>
                ) : preExpedientesFiltrados.length === 0 ? (
                    <div className="vacio">
                        <p>No hay registros en el historial.</p>
                    </div>
                ) : (
                    <div className="historial-cards">
                        {preExpedientesFiltrados.map(pre => (
                            <div key={pre.pre_solicitud_id} className="historial-card">
                                <div 
                                    className={`historial-card-header ${expandido === pre.pre_solicitud_id ? 'expandido' : ''}`}
                                    onClick={() => toggleExpandir(pre.pre_solicitud_id)}
                                >
                                    <div className="card-header-info">
                                        <div className="card-icono">
                                            {expandido === pre.pre_solicitud_id ? '▼' : '▶'}
                                        </div>
                                        <div className="card-titulo">
                                            <span className="card-codigo">{pre.pre_solicitud_codigo}</span>
                                            <div className="card-conyuges">
                                                <span className="solicitante">{pre.solicitante}</span>
                                                <span className="separador">•</span>
                                                <span className="demandado">{pre.demandado}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="card-header-stats">
                                        <span className="card-movimientos">{pre.acciones.length} movimientos</span>
                                        <span className="card-ultimo">
                                            Último: {new Date(pre.acciones[pre.acciones.length - 1]?.historial_fecha_hora).toLocaleDateString('es-PE')}
                                        </span>
                                    </div>
                                </div>
                                
                                {expandido === pre.pre_solicitud_id && (
                                    <div className="historial-card-body">
                                        <div className="timeline">
                                            {pre.acciones.map((acc, idx) => (
                                                <div key={acc.historial_id} className="timeline-item">
                                                    <div className="timeline-marker">
                                                        <div className="timeline-dot"></div>
                                                        {idx < pre.acciones.length - 1 && <div className="timeline-line"></div>}
                                                    </div>
                                                    <div className="timeline-content">
                                                        <div className="timeline-header">
                                                            <div className="timeline-fecha">
                                                                {new Date(acc.historial_fecha_hora).toLocaleString('es-PE')}
                                                            </div>
                                                            <div className="timeline-nro-mesa">
                                                                N° {acc.expedientes_nro_mesa_partes || 'Sin número'}
                                                            </div>
                                                        </div>
                                                        <div className="timeline-body">
                                                            <div className="timeline-accion">
                                                                <span className="accion-icono">{getIconoAccion(acc.historial_accion)}</span>
                                                                <span className="accion-texto">{acc.historial_accion}</span>
                                                            </div>
                                                            <div className={`timeline-estado ${getColorEstado(acc.historial_estado_nuevo)}`}>
                                                                {getEstadoTexto(acc.historial_estado_nuevo)}
                                                            </div>
                                                        </div>
                                                        {acc.historial_detalle && (
                                                            <div className="timeline-detalle">
                                                                📝 {acc.historial_detalle}
                                                            </div>
                                                        )}
                                                        <div className="timeline-footer">
                                                            <span className="timeline-usuario">👤 {acc.Usuario}</span>
                                                            <span className="timeline-rol">{acc.Rol}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
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