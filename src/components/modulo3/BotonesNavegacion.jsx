import { useNavigate } from 'react-router-dom'
//import './BotonesNavegacion.css'  // ← Así, no con "modulo3/"
import '../../styles/modulo3/BotonesNavegacion.css'


export default function BotonesNavegacion({ expedienteId, etapaActual, documentosInternosCompletados = false }) {
    const navigate = useNavigate()

    // Mapeo de etapas a índices (incluyendo DOCUMENTOS_INTERNOS)
    const ordenEtapas = ['EVALUACION', 'DOCUMENTOS_INTERNOS', 'AUDIENCIA', 'ESPERA_LEGAL', 'DISOLUCION']
    const etapaActualIndex = ordenEtapas.indexOf(etapaActual)

    // Definición de botones con su etapa mínima requerida (como índice)
    const botones = [
        { 
            id: 'revision', 
            label: 'Revisión Documentaria',
            ruta: `/modulo3/detalle/${expedienteId}`,
            etapaMinimaIndex: 0  // EVALUACION
        },
        { 
            id: 'documentos', 
            label: 'Documentos Internos',
            ruta: `/modulo3/expediente/${expedienteId}/documentos-internos`,
            etapaMinimaIndex: 1  // DOCUMENTOS_INTERNOS
        },
        { 
            id: 'audiencia', 
            label: 'Programar Audiencia', 
            ruta: `/modulo3/expediente/${expedienteId}/programar-audiencia`,
            etapaMinimaIndex: 2  // AUDIENCIA
        },
        { 
            id: 'resolucion', 
            label: 'Resolución Fundada',
            ruta: `/modulo3/expediente/${expedienteId}/resolucion-fundada`,
            etapaMinimaIndex: 3  // ESPERA_LEGAL
        }
    ]

    // Verificar si el botón debe estar habilitado
    const isButtonEnabled = (btn) => {
        // Para el botón de audiencia, se necesita etapa >= AUDIENCIA
        if (btn.id === 'audiencia') {
            return etapaActualIndex >= btn.etapaMinimaIndex
        }
        // Para documentos internos, se necesita etapa >= DOCUMENTOS_INTERNOS
        if (btn.id === 'documentos') {
            return etapaActualIndex >= btn.etapaMinimaIndex
        }
        return etapaActualIndex >= btn.etapaMinimaIndex
    }

    // Tooltips para botones deshabilitados
    const getButtonTooltip = (btn) => {
        if (isButtonEnabled(btn)) return ''
        
        if (btn.id === 'documentos') return 'Debe confirmar la Revisión Documentaria primero'
        if (btn.id === 'audiencia') return 'Debe completar los Documentos Internos primero'
        if (btn.id === 'resolucion') return 'Debe completar la Audiencia primero'
        return 'Etapa no disponible'
    }

    // Saber si es la vista actual (para resaltar el botón)
    const isCurrentView = (id) => {
        if (id === 'revision' && etapaActual === 'EVALUACION') return true
        if (id === 'documentos' && etapaActual === 'DOCUMENTOS_INTERNOS') return true
        if (id === 'audiencia' && etapaActual === 'AUDIENCIA') return true
        if (id === 'resolucion' && etapaActual === 'ESPERA_LEGAL') return true
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