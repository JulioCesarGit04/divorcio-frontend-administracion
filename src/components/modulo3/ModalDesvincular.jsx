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
            await desvincularExpediente(expedienteId, motivo);
            onDesvinculado();
            onCerrar();
        } catch (err) {
            setError(err.message || 'Error al desvincular expediente');
        } finally {
            setCargando(false);
        }
    };

    const sugerencias = [
        'Número de Mesa de Partes incorrecto',
        'Documentos incompletos o incorrectos',
        'Error de tipeo del asistente',
        'El ciudadano canceló el trámite',
        'Se asignó a otro pre-expediente por error',
    ];

    const aplicarSugerencia = (texto) => {
        setMotivo(texto);
    };

    return (
        <div className="modal-overlay">
            <div className="modal-desvincular">
                <div className="modal-header-desvincular">
                    <div className="header-icono"></div>
                    <div className="header-texto">
                        <h2>Desvincular expediente</h2>
                        <p>Esta acción no se puede deshacer</p>
                    </div>
                    <button className="modal-cerrar-desvincular" onClick={onCerrar}>✕</button>
                </div>

                <div className="modal-body-desvincular">
                    <div className="alerta-desvincular">
                        <div className="alerta-icono"></div>
                        <div className="alerta-contenido">
                            <div className="alerta-titulo">¡Atención! Esta acción es irreversible</div>
                            <div className="alerta-descripcion">
                                Se eliminará permanentemente el expediente <strong>{expedienteNro}</strong> y toda su información asociada:
                            </div>
                            <ul className="alerta-lista">
                                <li> Datos del expediente</li>
                                <li> Etapas y progreso</li>
                                <li> Resoluciones generadas</li>
                                <li> Documentos adjuntos</li>
                                <li> Contadores de plazo</li>
                            </ul>
                            <div className="alerta-nota">
                                 El pre-expediente volverá a estar disponible para vincular nuevamente con un número correcto.
                            </div>
                        </div>
                    </div>

                    <div className="campo-motivo">
                        <label>
                            Motivo de desvinculación <span className="requerido">*</span>
                        </label>
                        <textarea
                            rows={4}
                            placeholder="Describa detalladamente por qué se desvincula este expediente..."
                            value={motivo}
                            onChange={e => setMotivo(e.target.value)}
                        />
                        <div className="campo-ayuda">
                             Este motivo quedará registrado en el historial del sistema para auditoría.
                        </div>
                    </div>

                    <div className="sugerencias">
                        <label> Sugerencias rápidas:</label>
                        <div className="sugerencias-botones">
                            {sugerencias.map((sug, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    className="btn-sugerencia"
                                    onClick={() => aplicarSugerencia(sug)}
                                >
                                    {sug}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && (
                        <div className="modal-error-desvincular">
                            <span></span> {error}
                        </div>
                    )}
                </div>

                <div className="modal-footer-desvincular">
                    <button className="btn-cancelar-desvincular" onClick={onCerrar} disabled={cargando}>
                        Cancelar
                    </button>
                    <button className="btn-confirmar-desvincular" onClick={handleConfirmar} disabled={cargando}>
                        {cargando ? (
                            <>
                                <span className="spinner"></span> Procesando...
                            </>
                        ) : (
                            <>
                                 Confirmar desvinculación
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}