import '../../styles/modulo3/pipeline.css'

export default function PipelineVisual({ etapaActual }) {
    // etapaActual: 'revision', 'documentos', 'audiencia', 'resolucion'
    const etapas = [
        { 
            id: 'revision', 
            label: 'Revisión Documentaria', 
            descripcion: 'Revisión de documentos del ciudadano',
            icono: '📋',
            numero: 1
        },
        { 
            id: 'documentos', 
            label: 'Documentos Internos', 
            descripcion: 'Informe Legal y Resolución de Admisión',
            icono: '📄',
            numero: 2
        },
        { 
            id: 'audiencia', 
            label: 'Audiencia', 
            descripcion: 'Programación y realización de audiencia',
            icono: '⚖️',
            numero: 3
        },
        { 
            id: 'resolucion', 
            label: 'Resolución Fundada', 
            descripcion: 'Resolución y espera de 2 meses',
            icono: '📑',
            numero: 4
        },
        
        // MÓDULO 4 - DISOLUCIÓN Y ARCHIVAMIENTO
        { 
            id: 'disolucion', 
            label: 'Resolución de Disolución', 
            descripcion: 'Plazo de 15 días hábiles y emisión',
            icono: '📜',
            numero: 5
        },
        { 
            id: 'archivar', 
            label: 'Archivamiento', 
            descripcion: 'Cargos SUNARP/RENIEC y cierre',
            icono: '🗄️',
            numero: 6
        }
    ]

    // Encontrar índice de la etapa actual
    const etapaIndex = etapas.findIndex(e => e.id === etapaActual)
    const progreso = ((etapaIndex + 1) / etapas.length) * 100

    const getEstadoNodo = (idx) => {
        if (idx < etapaIndex) return 'completado'
        if (idx === etapaIndex) return 'activo'
        return 'pendiente'
    }

    const getEstadoSegmento = (idx) => {
        if (idx < etapaIndex) return 'lleno'
        if (idx === etapaIndex && etapaIndex === etapas.length - 1) return ''
        if (idx === etapaIndex) return 'mitad'
        return ''
    }

    // Obtener el estado actual en texto
    const getEstadoTexto = (idx) => {
        if (idx < etapaIndex) return 'Completado'
        if (idx === etapaIndex) return 'En curso'
        return 'Pendiente'
    }

    return (
        <div className="pipeline">
            {/* Header con icono */}
            <div className="pipeline-header">
                <div className="pipeline-header-titulo">
                    <span className="pipeline-icono-header"></span>
                    <h3>Proceso del Expediente</h3>
                </div>
                <div className="pipeline-progreso-info">
                    <span className="pipeline-progreso-texto">
                        {etapaIndex + 1} de {etapas.length} etapas
                    </span>
                    <span className="pipeline-progreso-porcentaje">
                        {Math.round(progreso)}%
                    </span>
                </div>
            </div>

            {/* Barra de progreso */}
            <div className="pipeline-barra-progreso">
                <div className="pipeline-barra-lleno" style={{ width: `${progreso}%` }}>
                    <span className="pipeline-barra-porcentaje">{Math.round(progreso)}%</span>
                </div>
            </div>

            {/* Lista de pasos */}
            <div className="pipeline-etapas">
                {etapas.map((etapa, idx) => (
                    <div key={etapa.id} className="pipeline-item">
                        {/* Columna izquierda: círculo + línea */}
                        <div className="pipeline-spine">
                            <div className={`pipeline-nodo ${getEstadoNodo(idx)}`}>
                                {getEstadoNodo(idx) === 'completado' ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                ) : (
                                    <span className="pipeline-nodo-numero">{etapa.icono}</span>
                                )}
                            </div>
                            {idx < etapas.length - 1 && (
                                <div className={`pipeline-segmento ${getEstadoSegmento(idx)}`}></div>
                            )}
                        </div>

                        {/* Columna derecha: contenido */}
                        <div className="pipeline-contenido">
                            <div className="pipeline-contenido-header">
                                <div className={`pipeline-label ${getEstadoNodo(idx)}`}>
                                    {etapa.label}
                                </div>
                                <div className={`pipeline-estado-badge ${getEstadoNodo(idx)}`}>
                                    {getEstadoTexto(idx)}
                                </div>
                            </div>
                            <div className="pipeline-descripcion">
                                {etapa.descripcion}
                            </div>
                            {getEstadoNodo(idx) === 'activo' && (
                                <div className="pipeline-badge-activo">
                                    <span className="pulse-dot"></span>
                                    Procesando...
                                </div>
                            )}
                            {getEstadoNodo(idx) === 'completado' && (
                                <div className="pipeline-badge-completado">
                                    ✓ Finalizado
                                </div>
                            )}
                            {getEstadoNodo(idx) === 'pendiente' && (
                                <div className="pipeline-badge-pendiente">
                                    ⏳ Próximamente
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}