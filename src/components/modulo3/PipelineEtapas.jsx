// ── PipelineEtapas.jsx ──
import '../../styles/modulo3/pipeline.css'
//mensaje
const ETAPAS = [
    { key: 'RECIBIDO',       label: 'Recibido' },
    { key: 'EVALUACION',     label: 'Evaluación' },
    { key: 'RES_SEPARACION', label: 'Res. Separación' },
    { key: 'RES_DISOLUCION', label: 'Res. Disolución' },
    { key: 'ARCHIVO',        label: 'Archivo' },
]

export default function PipelineEtapas({ estadoActual, etapas }) {
    const indexActual = ETAPAS.findIndex(e => e.key === estadoActual)

    return (
        <div className="pipeline">
            <h3>Progreso del expediente: </h3>
            <div className="pipeline-etapas">
                {ETAPAS.map((etapa, i) => {
                    const completada = i < indexActual
                    const activa = i === indexActual
                    const info = etapas?.find(e => e.etapas_etapa === etapa.key)

                    return (
                        <div key={etapa.key} className={`pipeline-paso ${completada ? 'completado' : ''} ${activa ? 'activo' : ''}`}>
                            <div className="pipeline-circulo">{i + 1}</div>
                            <div className="pipeline-info">
                                <span className="pipeline-label">{etapa.label}</span>
                                {info && (
                                    <span className="pipeline-fecha">
                                        {new Date(info.etapas_fecha_inicio).toLocaleDateString('es-PE')}
                                    </span>
                                )}
                            </div>
                            {i < ETAPAS.length - 1 && <div className="pipeline-linea" />}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}