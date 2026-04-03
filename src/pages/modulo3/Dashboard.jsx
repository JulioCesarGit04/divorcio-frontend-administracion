import { useEffect, useState } from 'react'
import Sidebar from '../../components/modulo3/Sidebar'
import { getAlertas, getReportes } from '../../services/ProcedimientoService'
import '../../styles/modulo3/dashboard.css'

export default function Dashboard() {
    const [reportes, setReportes] = useState(null)
    const [alertas, setAlertas] = useState([])
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        const cargar = async () => {
            try {
                const [r, a] = await Promise.all([getReportes(), getAlertas()])
                setReportes(r)
                setAlertas(a)
            } catch {
                console.error('Error cargando dashboard')
            } finally {
                setCargando(false)
            }
        }
        cargar()
    }, [])

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="pagina-header">
                    <h1>Dashboard</h1>
                    <p>Resumen del día</p>
                </div>

                {cargando ? <p className="cargando">Cargando...</p> : (
                    <>
                        <div className="tarjetas-resumen">
                            <div className="tarjeta">
                                <span className="tarjeta-numero">
                                    {reportes?.expedientes_en_evaluacion?.Expedientes_EnEvaluacion ?? 0}
                                </span>
                                <span className="tarjeta-label">En evaluación</span>
                            </div>
                            <div className="tarjeta">
                                <span className="tarjeta-numero">
                                    {reportes?.resoluciones?.Total_Resoluciones ?? 0}
                                </span>
                                <span className="tarjeta-label">Resoluciones emitidas</span>
                            </div>
                            <div className="tarjeta">
                                <span className="tarjeta-numero">
                                    {reportes?.expedientes_archivados?.Expedientes_Archivados ?? 0}
                                </span>
                                <span className="tarjeta-label">Archivados</span>
                            </div>
                            <div className="tarjeta tarjeta-alerta">
                                <span className="tarjeta-numero">{alertas.length}</span>
                                <span className="tarjeta-label">Alertas activas</span>
                            </div>
                        </div>

                        <div className="accesos-rapidos">
                            <h2>Accesos rápidos</h2>
                            <div className="botones-rapidos">
                                <button onClick={() => window.location.href = '/modulo3/vincular'} className="btn-rapido">
                                    Vincular expediente
                                </button>
                                <button onClick={() => window.location.href = '/modulo3/expedientes'} className="btn-rapido">
                                    Ver expedientes
                                </button>
                                <button onClick={() => window.location.href = '/modulo3/alertas'} className="btn-rapido btn-rapido-alerta">
                                    Ver alertas ({alertas.length})
                                </button>
                            </div>
                        </div>

                        {alertas.length > 0 && (
                            <div className="alertas-preview">
                                <h2>Alertas urgentes</h2>
                                {alertas.slice(0, 3).map((a, i) => (
                                    <div key={i} className="alerta-item">
                                        <span className={`alerta-tipo ${a.TipoAlerta === 'SIN_MOVIMIENTO' ? 'rojo' : 'amarillo'}`}>
                                            {a.TipoAlerta === 'SIN_MOVIMIENTO' ? 'Sin movimiento' : 'Plazo próximo'}
                                        </span>
                                        <span>{a.Solicitante_Nombres} {a.Solicitante_Apellidos}</span>
                                        <span className="alerta-dias">{a.DiasTranscurridos} días</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>
        </>
    )
}