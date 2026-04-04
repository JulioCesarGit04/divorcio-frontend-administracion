import { useState } from 'react';
import { desvincularExpediente } from '../../services/ProcedimientoService';

export default function ModalDesvincular({ expedienteId, expedienteNro, onCerrar, onDesvinculado }) {
    const [motivo, setMotivo] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    const handleConfirmar = async () => {
        if (!motivo.trim()) {
            setError('El motivo de desvinculación es obligatorio');
            return;
        }

        setCargando(true);
        setError('');
        
        try {
            // ← CAMBIO: Ya NO envía usuario_id (el backend lo toma de la sesión)
            await desvincularExpediente(expedienteId, motivo);
            onDesvinculado();
            onCerrar();
        } catch (err) {
            setError(err.message || 'Error al desvincular expediente');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h2>⚠️ Desvincular expediente</h2>
                    <button className="modal-cerrar" onClick={onCerrar}>✕</button>
                </div>
                <div className="modal-body">
                    <div className="alerta-importante">
                        <p><strong>⚠️ Esta acción es irreversible</strong></p>
                        <p>Se eliminará el expediente <strong>{expedienteNro}</strong> y todas sus etapas, resoluciones y documentos asociados.</p>
                        <p>El pre-expediente volverá a estar disponible para vincular nuevamente.</p>
                    </div>
                    
                    <div className="campo">
                        <label>Motivo de desvinculación <span className="requerido">*</span></label>
                        <textarea
                            rows={4}
                            placeholder="Ej: Número de Mesa de Partes incorrecto, documentos incompletos, error de vinculación, etc."
                            value={motivo}
                            onChange={e => setMotivo(e.target.value)}
                        />
                        <small>Este motivo quedará registrado en el historial.</small>
                    </div>

                    {error && <div className="modal-error">{error}</div>}
                </div>
                <div className="modal-footer">
                    <button className="btn-cancelar" onClick={onCerrar}>Cancelar</button>
                    <button className="btn-confirmar btn-peligro" onClick={handleConfirmar} disabled={cargando}>
                        {cargando ? 'Procesando...' : 'Confirmar desvinculación'}
                    </button>
                </div>
            </div>
        </div>
    );
}