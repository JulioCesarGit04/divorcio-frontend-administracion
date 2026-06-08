import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../../components/modulo3/Sidebar'
import { getAlertas, getExpedientes } from '../../services/ProcedimientoService'
import '../../styles/modulo3/dashboard.css'

export default function Dashboard() {
    const navigate = useNavigate()
    const [alertas, setAlertas] = useState([])
    const [ultimosExpedientes, setUltimosExpedientes] = useState([])
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        const cargar = async () => {
            try {
                const [a, exp] = await Promise.all([
                    getAlertas(),
                    getExpedientes({})
                ])
                setAlertas(a)
                setUltimosExpedientes(Array.isArray(exp) ? exp.slice(0, 5) : [])
            } catch (error) {
                console.error('Error cargando dashboard', error)
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

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="dashboard-header">
                    <div>
                        <h1>Dashboard</h1>
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
                        {/* Tarjetas de estadísticas simplificadas */}
                        <div className="stats-grid">
                            <div className="stat-card stat-card-primary">
                                <div className="stat-icon">📋</div>
                                <div className="stat-info">
                                    <span className="stat-value">{ultimosExpedientes.length}</span>
                                    <span className="stat-label">Expedientes recientes</span>
                                </div>
                            </div>
                            <div className="stat-card stat-card-danger">
                                <div className="stat-icon">⚠️</div>
                                <div className="stat-info">
                                    <span className="stat-value">{alertas.length}</span>
                                    <span className="stat-label">Alertas activas</span>
                                </div>
                            </div>
                        </div>

                        {/* Últimos expedientes */}
                        <div className="dashboard-row two-columns">
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
                                            <div key={exp.id} className="expediente-item" onClick={() => navigate(`/modulo3/detalle/${exp.id}`)}>
                                                <div className="expediente-info">
                                                    <span className="expediente-numero">{exp.numero_mesa_partes}</span>
                                                    <span className="expediente-solicitante">
                                                        {exp.Solicitante_Nombres} {exp.Solicitante_Apellidos}
                                                    </span>
                                                </div>
                                                <div className="expediente-estado">
                                                    <span className="estado-badge" style={{ background: getEstadoColor(exp.estado) }}>
                                                        {getEstadoTexto(exp.estado)}
                                                    </span>
                                                    <span className="expediente-fecha">
                                                        {new Date(exp.fecha_recepcion).toLocaleDateString('es-PE')}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
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
                        </div>
                    </>
                )}
            </main>
        </>
    )
}