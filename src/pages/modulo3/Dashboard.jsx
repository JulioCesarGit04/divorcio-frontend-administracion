import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/modulo3/Sidebar'
import { getAlertas, getReportes, getExpedientes, getHistorialGlobal } from '../../services/ProcedimientoService'
import '../../styles/modulo3/dashboard.css'

export default function Dashboard() {
    const navigate = useNavigate()
    const [reportes, setReportes] = useState(null)
    const [alertas, setAlertas] = useState([])
    const [ultimosExpedientes, setUltimosExpedientes] = useState([])
    const [actividadReciente, setActividadReciente] = useState([])
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        const cargar = async () => {
            try {
                const [r, a, exp, hist] = await Promise.all([
                    getReportes(),
                    getAlertas(),
                    getExpedientes({}),
                    getHistorialGlobal()
                ])
                setReportes(r)
                setAlertas(a)
                setUltimosExpedientes(Array.isArray(exp) ? exp.slice(0, 5) : [])
                setActividadReciente(Array.isArray(hist) ? hist.slice(0, 5) : [])
            } catch {
                console.error('Error cargando dashboard')
            } finally {
                setCargando(false)
            }
        }
        cargar()
    }, [])

    const getEstadoColor = (estado) => {
        switch(estado) {
            case 'RECIBIDO': return '#3b82f6'
            case 'EVALUACION': return '#f59e0b'
            case 'RES_SEPARACION': return '#10b981'
            case 'RES_DISOLUCION': return '#8b5cf6'
            case 'ARCHIVO': return '#6b7280'
            default: return '#6b7280'
        }
    }

    const getEstadoTexto = (estado) => {
        switch(estado) {
            case 'RECIBIDO': return 'Recibido'
            case 'EVALUACION': return 'Evaluación'
            case 'RES_SEPARACION': return 'Res. Separación'
            case 'RES_DISOLUCION': return 'Res. Disolución'
            case 'ARCHIVO': return 'Archivado'
            default: return estado
        }
    }

    const getAccionIcono = (accion) => {
        if (accion === 'VINCULACION') return '🔗'
        if (accion === 'AVANCE_ETAPA') return '➡️'
        if (accion === 'GENERACION_RESOLUCION') return '📄'
        if (accion === 'ARCHIVO') return '📦'
        if (accion === 'DESVINCULACION_ADMIN') return '🔄'
        return '📌'
    }

    // Calcular porcentaje de progreso general
    const totalExpedientes = (reportes?.expedientes_en_evaluacion?.Expedientes_EnEvaluacion || 0) + 
                             (reportes?.expedientes_archivados?.Expedientes_Archivados || 0)
    const porcentajeArchivados = totalExpedientes > 0 
        ? Math.round((reportes?.expedientes_archivados?.Expedientes_Archivados || 0) / totalExpedientes * 100) 
        : 0

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="dashboard-header">
                    <div>
                        <h1>Dashboard</h1>
                        <p>Bienvenido al panel de gestión del Módulo 3</p>
                    </div>
                    <div className="dashboard-fecha">
                        {new Date().toLocaleDateString('es-PE', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                        })}
                    </div>
                </div>

                {cargando ? (
                    <div className="skeleton-loader">
                        <div className="skeleton-card"></div>
                        <div className="skeleton-card"></div>
                        <div className="skeleton-card"></div>
                        <div className="skeleton-card"></div>
                    </div>
                ) : (
                    <>
                        {/* Tarjetas de estadísticas */}
                        <div className="stats-grid">
                            <div className="stat-card stat-card-primary">
                                <div className="stat-icon">📋</div>
                                <div className="stat-info">
                                    <span className="stat-value">{reportes?.expedientes_en_evaluacion?.Expedientes_EnEvaluacion ?? 0}</span>
                                    <span className="stat-label">En evaluación</span>
                                </div>
                                <div className="stat-trend trend-up">+12%</div>
                            </div>
                            <div className="stat-card stat-card-success">
                                <div className="stat-icon">📜</div>
                                <div className="stat-info">
                                    <span className="stat-value">{reportes?.resoluciones?.Total_Resoluciones ?? 0}</span>
                                    <span className="stat-label">Resoluciones emitidas</span>
                                </div>
                                <div className="stat-sub">
                                    Sep: {reportes?.resoluciones?.Resoluciones_Separacion ?? 0} | 
                                    Dis: {reportes?.resoluciones?.Resoluciones_Disolucion ?? 0}
                                </div>
                            </div>
                            <div className="stat-card stat-card-warning">
                                <div className="stat-icon">📦</div>
                                <div className="stat-info">
                                    <span className="stat-value">{reportes?.expedientes_archivados?.Expedientes_Archivados ?? 0}</span>
                                    <span className="stat-label">Archivados</span>
                                </div>
                                <div className="stat-progress">
                                    <div className="progress-bar" style={{ width: `${porcentajeArchivados}%` }}></div>
                                    <span className="progress-text">{porcentajeArchivados}% del total</span>
                                </div>
                            </div>
                            <div className="stat-card stat-card-danger">
                                <div className="stat-icon">⚠️</div>
                                <div className="stat-info">
                                    <span className="stat-value">{alertas.length}</span>
                                    <span className="stat-label">Alertas activas</span>
                                </div>
                                {alertas.length > 0 && (
                                    <div className="stat-alert">
                                        <span className="alert-urgent">Requiere atención</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Gráfico de progreso */}
                        <div className="dashboard-row">
                            <div className="dashboard-card full-width">
                                <div className="card-header">
                                    <h3>📊 Progreso general</h3>
                                    <span className="card-subtitle">Estado actual de los expedientes</span>
                                </div>
                                <div className="progress-stats">
                                    <div className="progress-item">
                                        <div className="progress-info">
                                            <span className="progress-label">En evaluación</span>
                                            <span className="progress-percent">{reportes?.expedientes_en_evaluacion?.Expedientes_EnEvaluacion ?? 0}</span>
                                        </div>
                                        <div className="progress-bar-bg">
                                            <div className="progress-bar-fill progress-blue" style={{ 
                                                width: `${totalExpedientes > 0 ? ((reportes?.expedientes_en_evaluacion?.Expedientes_EnEvaluacion || 0) / totalExpedientes * 100) : 0}%` 
                                            }}></div>
                                        </div>
                                    </div>
                                    <div className="progress-item">
                                        <div className="progress-info">
                                            <span className="progress-label">Archivados</span>
                                            <span className="progress-percent">{reportes?.expedientes_archivados?.Expedientes_Archivados ?? 0}</span>
                                        </div>
                                        <div className="progress-bar-bg">
                                            <div className="progress-bar-fill progress-green" style={{ 
                                                width: `${totalExpedientes > 0 ? ((reportes?.expedientes_archivados?.Expedientes_Archivados || 0) / totalExpedientes * 100) : 0}%` 
                                            }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Últimos expedientes y actividad reciente */}
                        <div className="dashboard-row two-columns">
                            {/* Últimos expedientes */}
                            <div className="dashboard-card">
                                <div className="card-header">
                                    <h3>📋 Últimos expedientes</h3>
                                    <button onClick={() => navigate('/modulo3/expedientes')} className="card-link">Ver todos →</button>
                                </div>
                                <div className="expedientes-list">
                                    {ultimosExpedientes.length === 0 ? (
                                        <p className="empty-message">No hay expedientes registrados</p>
                                    ) : (
                                        ultimosExpedientes.map(exp => (
                                            <div key={exp.expedientes_id} className="expediente-item" onClick={() => navigate(`/modulo3/detalle/${exp.expedientes_id}`)}>
                                                <div className="expediente-info">
                                                    <span className="expediente-numero">{exp.expedientes_nro_mesa_partes}</span>
                                                    <span className="expediente-solicitante">
                                                        {exp.Solicitante_Nombres} {exp.Solicitante_Apellidos}
                                                    </span>
                                                </div>
                                                <div className="expediente-estado">
                                                    <span className="estado-badge" style={{ background: getEstadoColor(exp.expedientes_estado_actual) }}>
                                                        {getEstadoTexto(exp.expedientes_estado_actual)}
                                                    </span>
                                                    <span className="expediente-fecha">
                                                        {new Date(exp.expedientes_creado_en).toLocaleDateString('es-PE')}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Actividad reciente */}
                            <div className="dashboard-card">
                                <div className="card-header">
                                    <h3>🔄 Actividad reciente</h3>
                                    <button onClick={() => navigate('/modulo3/historial')} className="card-link">Ver historial →</button>
                                </div>
                                <div className="actividad-list">
                                    {actividadReciente.length === 0 ? (
                                        <p className="empty-message">No hay actividad reciente</p>
                                    ) : (
                                        actividadReciente.map((act, idx) => (
                                            <div key={idx} className="actividad-item">
                                                <div className="actividad-icono">{getAccionIcono(act.historial_accion)}</div>
                                                <div className="actividad-info">
                                                    <div className="actividad-descripcion">
                                                        <strong>Expediente {act.expedientes_nro_mesa_partes}</strong>
                                                        <span> - {act.historial_accion}</span>
                                                    </div>
                                                    <div className="actividad-detalle">{act.historial_detalle || 'Sin detalles'}</div>
                                                    <div className="actividad-fecha">
                                                        {new Date(act.historial_fecha_hora).toLocaleString('es-PE')}
                                                    </div>
                                                </div>
                                                <div className="actividad-usuario">{act.Usuario}</div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Alertas destacadas */}
                        {alertas.length > 0 && (
                            <div className="dashboard-card alertas-card">
                                <div className="card-header">
                                    <h3>⚠️ Alertas destacadas</h3>
                                    <button onClick={() => navigate('/modulo3/alertas')} className="card-link">Ver todas →</button>
                                </div>
                                <div className="alertas-grid">
                                    {alertas.slice(0, 3).map((alerta, i) => (
                                        <div key={i} className={`alerta-destacada ${alerta.TipoAlerta === 'SIN_MOVIMIENTO' ? 'alerta-roja' : 'alerta-amarilla'}`}>
                                            <div className="alerta-header">
                                                <span className="alerta-icono">{alerta.TipoAlerta === 'SIN_MOVIMIENTO' ? '🔴' : '🟡'}</span>
                                                <span className="alerta-titulo">
                                                    {alerta.TipoAlerta === 'SIN_MOVIMIENTO' ? 'Sin movimiento' : 'Plazo próximo'}
                                                </span>
                                            </div>
                                            <div className="alerta-cuerpo">
                                                <p><strong>Expediente:</strong> {alerta.expedientes_nro_mesa_partes}</p>
                                                <p><strong>Solicitante:</strong> {alerta.Solicitante_Nombres} {alerta.Solicitante_Apellidos}</p>
                                                <p><strong>Días transcurridos:</strong> {alerta.DiasTranscurridos}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </main>
        </>
    )
}