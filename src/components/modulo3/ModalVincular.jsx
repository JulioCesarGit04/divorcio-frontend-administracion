import { useState } from 'react';
import { vincularExpediente } from '../../services/ProcedimientoService';
import '../../styles/modulo3/modales.css';

export default function ModalVincular({ preExpediente, onCerrar, onVinculado }) {
    const [nroMesaPartes, setNroMesaPartes] = useState('');
    const [nroMesaPartesConfirm, setNroMesaPartesConfirm] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    const handleConfirmar = async () => {
        if (!nroMesaPartes.trim()) {
            setError('El número de Mesa de Partes es requerido.');
            return;
        }
        if (nroMesaPartes.trim() !== nroMesaPartesConfirm.trim()) {
            setError('Los números de Mesa de Partes no coinciden.');
            return;
        }

        setCargando(true);
        setError('');

        try {
            await vincularExpediente(preExpediente.PreSolicitudes_Id, nroMesaPartes);
            onVinculado();
            onCerrar();
        } catch (error) {
            setError(error.message || 'Error al vincular expediente');
        } finally {
            setCargando(false);
        }
    };

    const solicitante = [preExpediente.Solicitante_Nombres, preExpediente.Solicitante_Apellidos]
        .filter(Boolean).join(' ') || '—';
    const demandado = [preExpediente.Demandado_Nombres, preExpediente.Demandado_Apellidos]
        .filter(Boolean).join(' ') || '—';

    const coinciden = nroMesaPartes.trim() && nroMesaPartesConfirm.trim()
        && nroMesaPartes.trim() === nroMesaPartesConfirm.trim();

    return (
        <div className="modal-overlay" onClick={onCerrar}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h3>Vincular con Mesa de Partes</h3>
                        <span className="modal-subtitulo">
                            {preExpediente.PreSolicitudes_Codigo} · {solicitante} / {demandado}
                        </span>
                    </div>
                    <button className="modal-close" onClick={onCerrar} disabled={cargando}>×</button>
                </div>

                {/* Body */}
                <div className="modal-body">

                    {/* Aviso informativo */}
                    <div className="modal-aviso">
                        <div className="modal-aviso-icono">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>
                        <p>
                            El Área Jurídica recibió por correo el número de expediente asignado
                            por Mesa de Partes Virtual. Ingréselo a continuación para activar el procedimiento.
                        </p>
                    </div>

                    {/* Pasos */}
                    <ol className="modal-pasos">
                        <li className="modal-paso">
                            <span className="paso-numero">1</span>
                            <div className="paso-texto">
                                <strong>Ubique el correo de Mesa de Partes</strong>
                                <span>Mesa de Partes Virtual le envió un correo al Área Jurídica con el número de expediente asignado.</span>
                            </div>
                        </li>
                        <li className="modal-paso">
                            <span className="paso-numero">2</span>
                            <div className="paso-texto">
                                <strong>Ingrese el número exactamente como aparece</strong>
                                <span>Escríbalo tal como figura en el correo recibido.</span>
                            </div>
                        </li>
                        <li className="modal-paso">
                            <span className="paso-numero">3</span>
                            <div className="paso-texto">
                                <strong>El sistema activará el expediente automáticamente</strong>
                                <span>El pre-expediente se convertirá en "Expediente Recibido" y podrá iniciar el procedimiento.</span>
                            </div>
                        </li>
                    </ol>

                    {/* Campos */}
                    <div className="campo">
                        <label>Número de expediente (Mesa de Partes) <span className="campo-requerido">*</span></label>
                        <input
                            type="text"
                            placeholder="Ej: EXP-2026-013"
                            value={nroMesaPartes}
                            onChange={e => { setNroMesaPartes(e.target.value); setError(''); }}
                            autoFocus
                            disabled={cargando}
                        />
                        <span className="campo-ayuda">Escríbalo exactamente como aparece en el correo de Mesa de Partes</span>
                    </div>

                    <div className="campo">
                        <label>Confirme el número <span className="campo-requerido">*</span></label>
                        <input
                            type="text"
                            placeholder="Repita el número para confirmar"
                            value={nroMesaPartesConfirm}
                            onChange={e => { setNroMesaPartesConfirm(e.target.value); setError(''); }}
                            disabled={cargando}
                            className={
                                nroMesaPartesConfirm
                                    ? coinciden ? 'input-valido' : 'input-invalido'
                                    : ''
                            }
                        />
                        <span className="campo-ayuda">
                            {nroMesaPartesConfirm && !coinciden
                                ? <span className="campo-ayuda--error">Los números no coinciden</span>
                                : coinciden
                                    ? <span className="campo-ayuda--ok">✓ Los números coinciden</span>
                                    : 'La confirmación evita errores de digitación'
                            }
                        </span>
                    </div>

                    {error && <div className="error-mensaje">{error}</div>}
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button className="btn-cancelar" onClick={onCerrar} disabled={cargando}>
                        Cancelar
                    </button>
                    <button
                        className="btn-confirmar"
                        onClick={handleConfirmar}
                        disabled={cargando || !coinciden}
                    >
                        {cargando ? 'Vinculando...' : 'Vincular expediente →'}
                    </button>
                </div>

            </div>
        </div>
    );
}