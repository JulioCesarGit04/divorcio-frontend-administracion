// ── PipelineEtapas.jsx ──
import '../../styles/modulo3/pipeline.css'

const ETAPAS = [
    { key: 'RECIBIDO',       label: '📋 Recibido',       desc: 'Expediente creado' },
    { key: 'EVALUACION',     label: '🔍 Evaluación',     desc: 'Revisión de documentos' },
    { key: 'RES_SEPARACION', label: '📄 Res. Separación', desc: 'Primera resolución' },
    { key: 'RES_DISOLUCION', label: '📜 Res. Disolución', desc: 'Resolución final' },
    { key: 'ARCHIVO',        label: '📦 Archivo',        desc: 'Expediente cerrado' },
]

export default function PipelineEtapas({ estadoActual, etapas }) {
    const indexActual = ETAPAS.findIndex(e => e.key === estadoActual)

    const getEtapaClase = (i) => {
        // Si el estado actual es ARCHIVO, todas las etapas deben estar completadas
        if (estadoActual === 'ARCHIVO') {
            return 'completado'
        }
        if (i < indexActual) return 'completado'
        if (i === indexActual) return 'activo'
        return 'pendiente'
    }

    const getBadge = (i, clase) => {
        // Si el expediente está archivado, mostrar "Completado" en todas
        if (estadoActual === 'ARCHIVO') {
            return <div className="pipeline-completado-badge">Completado</div>
        }
        if (clase === 'activo') {
            return <div className="pipeline-activo-badge">En curso</div>
        }
        if (clase === 'completado') {
            return <div className="pipeline-completado-badge">Completado</div>
        }
        return null
    }

    const getProgreso = () => {
        if (estadoActual === 'ARCHIVO') return 100
        if (indexActual === -1) return 0
        return ((indexActual + 1) / ETAPAS.length) * 100
    }

    return (
        <div className="pipeline">
            <div className="pipeline-header">
                <h3>📊 Progreso del trámite</h3>
                <div className="pipeline-progreso-texto">
                    {estadoActual === 'ARCHIVO' 
                        ? `${ETAPAS.length} de ${ETAPAS.length} etapas - Trámite concluido`
                        : `${indexActual + 1} de ${ETAPAS.length} etapas`
                    }
                </div>
            </div>
            
            <div className="pipeline-barra-progreso">
                <div className="pipeline-barra-lleno" style={{ width: `${getProgreso()}%` }} />
            </div>

            <div className="pipeline-etapas">
                {ETAPAS.map((etapa, i) => {
                    const clase = getEtapaClase(i)
                    const info = etapas?.find(e => e.etapas_etapa === etapa.key)
                    const isLast = i === ETAPAS.length - 1

                    return (
                        <div key={etapa.key} className="pipeline-item">
                            <div className="pipeline-fila">
                                <div className="pipeline-columna-circulo">
                                    <div className={`pipeline-circulo ${clase}`}>
                                        {clase === 'completado' ? '✓' : i + 1}
                                    </div>
                                </div>
                                <div className="pipeline-columna-contenido">
                                    <div className={`pipeline-label ${clase}`}>{etapa.label}</div>
                                    <div className="pipeline-descripcion">{etapa.desc}</div>
                                    {info && (
                                        <div className="pipeline-fecha">
                                            📅 {new Date(info.etapas_fecha_inicio).toLocaleDateString('es-PE')}
                                        </div>
                                    )}
                                    {getBadge(i, clase)}
                                </div>
                            </div>
                            {!isLast && (
                                <div className="pipeline-linea-container">
                                    <div className={`pipeline-linea ${clase === 'completado' ? 'linea-completada' : ''}`} />
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}