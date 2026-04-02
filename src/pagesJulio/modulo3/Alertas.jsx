import { useEffect, useState } from 'react'
import Sidebar from '../../components/modulo3/Sidebar'
import { getAlertas } from '../../services/ProcedimientoService'
import '../../styles/modulo3/alertas.css'

export default function Alertas({ cambiarPagina, paginaActual, verDetalle }) {
    const [alertas, setAlertas] = useState([])
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        if (!localStorage.getItem('usuario')) cambiarPagina('login')
    }, [cambiarPagina])

    useEffect(() => {
        getAlertas()
            .then(data => setAlertas(Array.isArray(data) ? data : []))
            .catch(console.error)
            .finally(() => setCargando(false))
    }, [])

    const handleVerExpediente = (expedienteId) => {
        verDetalle(expedienteId)
    }

    return (
        <>
            <Sidebar cambiarPagina={cambiarPagina} paginaActual={paginaActual} />
            <main className="contenido">
                <div className="pagina-header">
                    <h1>Alertas de plazo</h1>
                    <p>Expedientes que requieren atención</p>
                </div>
                {cargando ? <p className="cargando">Cargando...</p> : alertas.length === 0 ? (
                    <div className="vacio"><p>No hay alertas activas.</p></div>
                ) : (
                    <div className="alertas-lista">
                        {alertas.map((a, i) => (
                            <div key={i} className={`alerta-card ${a.TipoAlerta === 'SIN_MOVIMIENTO' ? 'alerta-roja' : 'alerta-amarilla'}`}>
                                <div className="alerta-card-header">
                                    <span className="alerta-tipo">
                                        {a.TipoAlerta === 'SIN_MOVIMIENTO' ? 'Sin movimiento +15 días' : 'Plazo 3 meses próximo'}
                                    </span>
                                    <span className="alerta-dias">{a.DiasTranscurridos} días</span>
                                </div>
                                <div className="alerta-card-body">
                                    <p><strong>Expediente:</strong> {a.expedientes_nro_mesa_partes}</p>
                                    <p><strong>Estado:</strong> {a.expedientes_estado_actual}</p>
                                    <p><strong>Solicitante:</strong> {a.Solicitante_Nombres} {a.Solicitante_Apellidos}</p>
                                </div>
                                <button
                                    className="btn-ver"
                                    onClick={() => handleVerExpediente(a.expedientes_id)}
                                >
                                    Ver expediente
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </>
    )
}