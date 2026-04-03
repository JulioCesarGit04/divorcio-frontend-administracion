import { useState } from 'react'
import { desbloquearExpediente } from '../../services/ProcedimientoService'
import '../../styles/modulo3/modales.css'

export default function ModalDesbloquear({ expedienteId, onCerrar, onDesbloqueado }) {
    const [motivo, setMotivo] = useState('')
    const [error, setError] = useState('')
    const [cargando, setCargando] = useState(false)
    const usuario = JSON.parse(localStorage.getItem('usuario') || '{}')

    const handleConfirmar = async () => {
        if (!motivo.trim()) {
            setError('¡El motivo es obligatorio para desbloquear!')
            return
        }
        setError('')
        setCargando(true)
        try {
            const result = await desbloquearExpediente(expedienteId, {
                motivo,
                usuario_id: usuario.usuarios_id
            })
            if (result.error) {
                setError(result.error)
            } else {
                onDesbloqueado()
            }
        } catch {
            setError('Error al conectar con el servidor')
        } finally {
            setCargando(false)
        }
    }

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h2>Desbloquear expediente</h2>
                    <button className="modal-cerrar" onClick={onCerrar}>✕</button>
                </div>
                <div className="modal-body">
                    <p className="modal-advertencia">
                        Esta acción solo puede realizarla el Administrador.
                        El motivo quedará registrado en el historial.
                    </p>
                    <div className="campo">
                        <label>Motivo del desbloqueo <span className="requerido">*</span></label>
                        <textarea
                            rows={4}
                            placeholder="Explique el motivo por el que desbloquea este expediente..."
                            value={motivo}
                            onChange={e => setMotivo(e.target.value)}
                        />
                    </div>
                    {error && <div className="modal-error">{error}</div>}
                </div>
                <div className="modal-footer">
                    <button className="btn-cancelar" onClick={onCerrar}>Cancelar</button>
                    <button className="btn-desbloquear" onClick={handleConfirmar} disabled={cargando}>
                        {cargando ? 'Desbloqueando...' : 'Confirmar desbloqueo'}
                    </button>
                </div>
            </div>
        </div>
    )
}
