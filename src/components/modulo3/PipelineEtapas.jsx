// ── PipelineEtapas.jsx ──
import '../../styles/modulo3/pipeline.css'

const ETAPAS = [
    { key: 'RECIBIDO',       label: 'Recibido',         desc: 'Expediente creado'      },
    { key: 'EVALUACION',     label: 'Evaluación',        desc: 'Revisión de documentos' },
    { key: 'RES_SEPARACION', label: 'Res. Separación',   desc: 'Primera resolución'     },
    { key: 'RES_DISOLUCION', label: 'Res. Disolución',   desc: 'Resolución final'       },
    { key: 'ARCHIVO',        label: 'Archivo',           desc: 'Expediente cerrado'     },
]

const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <polyline
            points="2,7 5.5,10.5 12,3"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
)

const formatFecha = (fechaStr) => {
    if (!fechaStr) return null
    try {
        return new Date(fechaStr).toLocaleDateString('es-PE', {
            day: '2-digit', month: 'short', year: 'numeric',
        })
    } catch {
        return null
    }
}

export default function PipelineEtapas({ estadoActual, etapas, resoluciones }) {
    // ← CORRECCIÓN: Determinar la etapa activa REAL
    // Si ya existe Resolución de Separación, la etapa activa es RES_DISOLUCION
    const tieneResolucionSeparacion = resoluciones?.some(r => r.resoluciones_tipo === 'SEPARACION')
    const tieneResolucionDisolucion = resoluciones?.some(r => r.resoluciones_tipo === 'DISOLUCION')
    
    let etapaActivaReal = estadoActual
    
    // Si ya se generó la Resolución de Separación, la etapa activa es DISOLUCION
    if (tieneResolucionSeparacion && !tieneResolucionDisolucion && estadoActual === 'RES_SEPARACION') {
        etapaActivaReal = 'RES_DISOLUCION'
    }
    
    // Si ya se generó la Disolución, la etapa activa es ARCHIVO
    if (tieneResolucionDisolucion && estadoActual === 'RES_DISOLUCION') {
        etapaActivaReal = 'ARCHIVO'
    }
    
    const indexActual = ETAPAS.findIndex(e => e.key === etapaActivaReal)
    const isArchivado = estadoActual === 'ARCHIVO'

    const getClase = (i) => {
        if (isArchivado || i < indexActual) return 'completado'
        if (i === indexActual) return 'activo'
        return 'pendiente'
    }

    const getSegmento = (i) => {
        const c = getClase(i)
        const n = getClase(i + 1)
        if (c === 'completado' && n === 'completado') return 'lleno'
        if (c === 'completado' && n === 'activo')     return 'mitad'
        return ''
    }

    const getProgreso = () => {
        if (isArchivado) return 100
        if (indexActual === -1) return 0
        return Math.round(((indexActual + 1) / ETAPAS.length) * 100)
    }

    const etapasTexto = isArchivado
        ? `${ETAPAS.length} de ${ETAPAS.length} — Concluido`
        : `${indexActual + 1} de ${ETAPAS.length} etapas`

    return (
        <div className="pipeline" role="list" aria-label="Progreso del trámite">

            <div className="pipeline-header">
                <h3>Progreso del trámite</h3>
                <span className="pipeline-progreso-texto">{etapasTexto}</span>
            </div>

            <div
                className="pipeline-barra-progreso"
                role="progressbar"
                aria-valuenow={getProgreso()}
                aria-valuemin={0}
                aria-valuemax={100}
            >
                <div className="pipeline-barra-lleno" style={{ width: `${getProgreso()}%` }} />
            </div>

            <div className="pipeline-etapas">
                {ETAPAS.map((etapa, i) => {
                    const clase    = getClase(i)
                    const isLast   = i === ETAPAS.length - 1
                    const info     = etapas?.find(e => e.etapas_etapa === etapa.key)
                    const fecha    = formatFecha(info?.etapas_fecha_inicio)
                    const segClase = !isLast ? getSegmento(i) : null

                    return (
                        <div
                            key={etapa.key}
                            className="pipeline-item"
                            role="listitem"
                            aria-current={clase === 'activo' ? 'step' : undefined}
                        >
                            <div className="pipeline-spine">
                                <div className={`pipeline-nodo ${clase}`}>
                                    {clase === 'completado'
                                        ? <CheckIcon />
                                        : <span>{String(i + 1).padStart(2, '0')}</span>
                                    }
                                </div>

                                {!isLast && (
                                    <div className={`pipeline-segmento ${segClase}`} />
                                )}
                            </div>

                            <div className="pipeline-contenido">
                                <div className={`pipeline-label ${clase}`}>{etapa.label}</div>
                                <div className="pipeline-descripcion">{etapa.desc}</div>

                                {fecha && (
                                    <div className="pipeline-fecha">{fecha}</div>
                                )}

                                {clase !== 'pendiente' && (
                                    <span className={`pipeline-badge ${clase}`}>
                                        {clase === 'activo' ? 'En curso' : 'Completado'}
                                    </span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

        </div>
    )
}