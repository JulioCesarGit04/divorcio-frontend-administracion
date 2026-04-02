import { useState } from 'react'
import { avanzarEtapa, generarResolucion, archivarExpediente } from '../../services/ProcedimientoService'
import '../../styles/modulo3/modales.css'

const SIGUIENTE_ETAPA = {
    RECIBIDO: 'EVALUACION',
    EVALUACION: 'RES_SEPARACION'
}

export default function ModalActualizarEtapa({ expedienteId, estadoActual, onCerrar, onActualizado, tipoAccion }) {
    const [observaciones, setObservaciones] = useState('')
    const [ubicacion, setUbicacion] = useState('')
    const [error, setError] = useState('')
    const [cargando, setCargando] = useState(false)
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

    const siguienteEtapa = SIGUIENTE_ETAPA[estadoActual]

    const handleConfirmar = async () => {
        setError('')
        setCargando(true)
        try {
            let result

            // Según el tipo de acción o estado actual
            if (tipoAccion === 'archivar' || estadoActual === 'RES_DISOLUCION') {
                if (!ubicacion.trim()) {
                    setError('La ubicación física es obligatoria para archivar')
                    setCargando(false)
                    return
                }
                result = await archivarExpediente(expedienteId, ubicacion)
                
            } else if (tipoAccion === 'separacion' || estadoActual === 'EVALUACION') {
                result = await generarResolucion(expedienteId, 'SEPARACION')
                
            } else if (tipoAccion === 'disolucion' || estadoActual === 'RES_SEPARACION') {
                result = await generarResolucion(expedienteId, 'DISOLUCION')
                
            } else {
                const obs = observaciones?.trim() || ''
                result = await avanzarEtapa(expedienteId, obs)
            }

            if (result.Resultado === 'ERROR') {
                setError(result.Mensaje)
            } else {
                onActualizado()
                onCerrar()
            }
        } catch (err) {
            setError(err.message || 'Error al conectar con el servidor')
        } finally {
            setCargando(false)
        }
    }

    // Determinar el título y mensaje según la acción
    const getTitulo = () => {
        if (tipoAccion === 'archivar' || estadoActual === 'RES_DISOLUCION') return 'Archivar expediente'
        if (tipoAccion === 'separacion' || estadoActual === 'EVALUACION') return 'Generar Resolución de Separación'
        if (tipoAccion === 'disolucion' || estadoActual === 'RES_SEPARACION') return 'Generar Resolución de Disolución'
        return 'Avanzar etapa'
    }

    const getMensaje = () => {
        if (tipoAccion === 'archivar' || estadoActual === 'RES_DISOLUCION') {
            return '¿Está seguro de archivar este expediente? Se bloqueará y no podrá ser modificado.'
        }
        if (tipoAccion === 'separacion' || estadoActual === 'EVALUACION') {
            return 'Se generará la Resolución de Separación Convencional. El expediente pasará a estado RES_SEPARACION.'
        }
        if (tipoAccion === 'disolucion' || estadoActual === 'RES_SEPARACION') {
            return 'Se generará la Resolución de Disolución del Vínculo Matrimonial. El expediente pasará a estado RES_DISOLUCION.'
        }
        return `El expediente pasará de ${estadoActual} a ${siguienteEtapa}`
    }

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h2>{getTitulo()}</h2>
                    <button className="modal-cerrar" onClick={onCerrar}>✕</button>
                </div>
                <div className="modal-body">
                    <p>{getMensaje()}</p>
                    
                    {estadoActual === 'RES_DISOLUCION' && (
                        <div className="campo">
                            <label>Ubicación física <span className="requerido">*</span></label>
                            <input
                                type="text"
                                placeholder="Ej: Archivero 3, Bandeja B, Folder 12"
                                value={ubicacion}
                                onChange={e => setUbicacion(e.target.value)}
                            />
                        </div>
                    )}

                    {!['RES_DISOLUCION', 'EVALUACION', 'RES_SEPARACION'].includes(estadoActual) && (
                        <div className="campo">
                            <label>Observaciones (opcional)</label>
                            <textarea
                                rows={3}
                                placeholder="Ingrese observaciones si las hay..."
                                value={observaciones}
                                onChange={e => setObservaciones(e.target.value)}
                            />
                        </div>
                    )}

                    {error && <div className="modal-error">{error}</div>}
                </div>
                <div className="modal-footer">
                    <button className="btn-cancelar" onClick={onCerrar}>Cancelar</button>
                    <button className="btn-confirmar" onClick={handleConfirmar} disabled={cargando}>
                        {cargando ? 'Procesando...' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    )
}