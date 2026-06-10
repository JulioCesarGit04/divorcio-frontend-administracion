import { useNavigate } from 'react-router-dom'
import '../../styles/modulo3/BotonesNavegacion.css'


export default function BotonesNavegacion({ expedienteId, etapaActual, documentosInternosCompletados = false }) {
    const navigate = useNavigate()

    const ordenEtapas = ['EVALUACION', 'DOCUMENTOS_INTERNOS', 'AUDIENCIA', 'ESPERA_LEGAL', 'DISOLUCION']
    const etapaActualIndex = ordenEtapas.indexOf(etapaActual)

    const botones = [
        { 
            id: 'revision', 
            label: 'Revisión Documentaria',
            ruta: `/modulo3/detalle/${expedienteId}`,
            etapaMinimaIndex: 0  
        },
        { 
            id: 'documentos', 
            label: 'Documentos Internos',
            ruta: `/modulo3/expediente/${expedienteId}/documentos-internos`,
            etapaMinimaIndex: 1 
        },
        { 
            id: 'audiencia', 
            label: 'Programar Audiencia', 
            ruta: `/modulo3/expediente/${expedienteId}/programar-audiencia`,
            etapaMinimaIndex: 2  
        },
        { 
            id: 'resolucion', 
            label: 'Resolución Fundada',
            ruta: `/modulo3/expediente/${expedienteId}/resolucion-fundada`,
            etapaMinimaIndex: 3  
        },
              
        {
            id: 'disolucion',
            label: 'Resolución de Disolución',
            ruta: `/modulo4/resolucion-disolucion/${expedienteId}`,
            etapaMinimaIndex: 3 
        },
        {
            id: 'archivar',
            label: 'Archivamiento del Expediente',
            ruta: `/modulo4/archivamiento/${expedienteId}`,
            etapaMinimaIndex: 4  
        }
    ]

    const isButtonEnabled = (btn) => {
       
        if (btn.id === 'audiencia') {
            return etapaActualIndex >= btn.etapaMinimaIndex
        }
        if (btn.id === 'documentos') {
            return etapaActualIndex >= btn.etapaMinimaIndex
        }
        return etapaActualIndex >= btn.etapaMinimaIndex
    }

    const getButtonTooltip = (btn) => {
        if (isButtonEnabled(btn)) return ''
        
        if (btn.id === 'documentos') return 'Debe confirmar la Revisión Documentaria primero'
        if (btn.id === 'audiencia') return 'Debe completar los Documentos Internos primero'
        if (btn.id === 'resolucion') return 'Debe completar la Audiencia primero'
        if (btn.id === 'disolucion') return 'Debe culminar la Espera Legal primero'
        if (btn.id === 'archivar') return 'Debe emitir la Resolución de Disolución primero'
        return 'Etapa no disponible'
    }

    const isCurrentView = (id) => {
        if (id === 'revision' && etapaActual === 'EVALUACION') return true
        if (id === 'documentos' && etapaActual === 'DOCUMENTOS_INTERNOS') return true
        if (id === 'audiencia' && etapaActual === 'AUDIENCIA') return true
        if (id === 'resolucion' && etapaActual === 'ESPERA_LEGAL') return true
        if (id === 'disolucion' && etapaActual === 'DISOLUCION') return true
        if (id === 'archivar' && etapaActual === 'ARCHIVAMIENTO') return true
        return false
    }

    return (
        <div className="seccion acciones-seccion">
            <h2>Acciones</h2>
            <div className="botones-acciones">
                {botones.map((btn) => {
                    const enabled = isButtonEnabled(btn)
                    const tooltip = getButtonTooltip(btn)
                    const isActive = isCurrentView(btn.id)
                    
                    return (
                        <button
                            key={btn.id}
                            className={`btn-accion-principal btn-${btn.id} ${isActive ? 'activo' : ''}`}
                            onClick={() => enabled && navigate(btn.ruta)}
                            disabled={!enabled}
                            title={tooltip}
                        >
                            {btn.label}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}