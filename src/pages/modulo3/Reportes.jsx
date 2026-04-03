import { useEffect, useState } from 'react'
import Sidebar from '../../components/modulo3/Sidebar'
import { getReportes } from '../../services/ProcedimientoService'
import '../../styles/modulo3/reportes.css'

export default function Reportes({ cambiarPagina, paginaActual }) {
    const [reportes, setReportes] = useState(null)
    const [cargando, setCargando] = useState(true)

    useEffect(() => {
        if (!localStorage.getItem('usuario')) cambiarPagina('login')
    }, [cambiarPagina])

    useEffect(() => {
        getReportes()
            .then(data => setReportes(data))
            .catch(console.error)
            .finally(() => setCargando(false))
    }, [])

    return (
        <>
            <Sidebar cambiarPagina={cambiarPagina} paginaActual={paginaActual} />
            <main className="contenido">
                <div className="pagina-header">
                    <h1>Reportes</h1>
                    <p>Indicadores del procedimiento administrativo</p>
                </div>
                {cargando ? <p className="cargando">Cargando...</p> : !reportes ? (
                    <div className="vacio"><p>No se pudieron cargar los reportes.</p></div>
                ) : (
                    <div className="reportes-grid">
                        <div className="reporte-card">
                            <h3>En evaluación</h3>
                            <span className="reporte-numero">
                                {reportes.expedientes_en_evaluacion?.Expedientes_EnEvaluacion ?? 0}
                            </span>
                            <p>Expedientes actualmente en etapa de evaluación</p>
                        </div>
                        <div className="reporte-card">
                            <h3>Resoluciones emitidas</h3>
                            <span className="reporte-numero">
                                {reportes.resoluciones?.Total_Resoluciones ?? 0}
                            </span>
                            <p>
                                Separación: {reportes.resoluciones?.Resoluciones_Separacion ?? 0} —
                                Disolución: {reportes.resoluciones?.Resoluciones_Disolucion ?? 0}
                            </p>
                        </div>
                        <div className="reporte-card">
                            <h3>Archivados</h3>
                            <span className="reporte-numero">
                                {reportes.expedientes_archivados?.Expedientes_Archivados ?? 0}
                            </span>
                            <p>Expedientes con trámite finalizado</p>
                        </div>
                        <div className="reporte-card">
                            <h3>Tiempo promedio</h3>
                            <span className="reporte-numero">
                                {reportes.tiempo_promedio?.Promedio_Dias ?? '—'}
                            </span>
                            <p>Días promedio para completar el procedimiento</p>
                        </div>
                    </div>
                )}
            </main>
        </>
    )
}