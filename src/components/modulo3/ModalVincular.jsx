import { useState } from 'react';
import { vincularExpediente } from '../../services/ProcedimientoService';
import '../../styles/modulo3/modales.css';

const getFechaPeru = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' });
};

export default function ModalVincular({ preExpediente, onCerrar, onVinculado }) {
    const [nroMesaPartes, setNroMesaPartes] = useState('');
    const [nroMesaPartesConfirm, setNroMesaPartesConfirm] = useState('');
    const [fechaPago, setFechaPago] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    const validarFechaPago = (fecha) => {
        const hoy = new Date(getFechaPeru());
        hoy.setHours(0, 0, 0, 0);
        const fechaSeleccionada = new Date(fecha);
        fechaSeleccionada.setHours(0, 0, 0, 0);
        
        if (fechaSeleccionada > hoy) {
            return 'La fecha de pago no puede ser futura';
        }
        return null;
    };

    const limpiarNumero = (valor) => {
        return valor.replace(/\D/g, ''); 
    };

    const handleNroMesaPartesChange = (e) => {
        const soloNumeros = limpiarNumero(e.target.value);
        setNroMesaPartes(soloNumeros);
        setError('');
    };

    const handleNroMesaPartesConfirmChange = (e) => {
        const soloNumeros = limpiarNumero(e.target.value);
        setNroMesaPartesConfirm(soloNumeros);
        setError('');
    };

    const handleConfirmar = async () => {
        if (!nroMesaPartes.trim()) {
            setError('El número de Mesa de Partes es requerido.');
            return;
        }
        
        if (!/^\d+$/.test(nroMesaPartes)) {
            setError('El número de Mesa de Partes solo debe contener dígitos.');
            return;
        }
        
        if (nroMesaPartes.trim() !== nroMesaPartesConfirm.trim()) {
            setError('Los números de Mesa de Partes no coinciden.');
            return;
        }
        
        if (!fechaPago) {
            setError('La fecha de pago es requerida.');
            return;
        }
        
        const errorFecha = validarFechaPago(fechaPago);
        if (errorFecha) {
            setError(errorFecha);
            return;
        }

        setCargando(true);
        setError('');

        try {
            await vincularExpediente(
                preExpediente.PreSolicitudes_Id, 
                nroMesaPartes,
                fechaPago
            );
            onVinculado();
            onCerrar();
        } catch (error) {
            console.error('Error:', error);
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

    const fechaMaxima = getFechaPeru();

    return (
        <div className="modal-overlay" onClick={onCerrar}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h3>Vincular con Mesa de Partes</h3>
                        <span className="modal-subtitulo">
                            {preExpediente.PreSolicitudes_Codigo} · {solicitante} / {demandado}
                        </span>
                    </div>
                    <button className="modal-close" onClick={onCerrar} disabled={cargando}>×</button>
                </div>

                <div className="modal-body">
                    <div className="modal-aviso">
                        <div className="modal-aviso-icono">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" />
                                <line x1="12" y1="8" x2="12" y2="12" />
                                <line x1="12" y1="16" x2="12.01" y2="16" />
                            </svg>
                        </div>
                        <p>
                            Ingrese el número de Mesa de Partes y la fecha de pago según el voucher
                            que recibió el ciudadano.
                        </p>
                    </div>

                    <div className="campo">
                        <label>Número de Mesa de Partes <span className="campo-requerido">*</span></label>
                        <input
                            type="text"
                            placeholder="Ej: 1234"
                            value={nroMesaPartes}
                            onChange={handleNroMesaPartesChange}
                            autoFocus
                            disabled={cargando}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            title="Solo números (sin espacios ni letras)"
                        />
                        <span className="campo-ayuda">Solo dígitos (ej: 1234)</span>
                    </div>

                    <div className="campo">
                        <label>Confirme el número <span className="campo-requerido">*</span></label>
                        <input
                            type="text"
                            placeholder="Repita el número para confirmar"
                            value={nroMesaPartesConfirm}
                            onChange={handleNroMesaPartesConfirmChange}
                            disabled={cargando}
                            inputMode="numeric"
                            pattern="[0-9]*"
                            title="Solo números (sin espacios ni letras)"
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

                    <div className="campo">
                        <label>Fecha de pago <span className="campo-requerido">*</span></label>
                        <input
                            type="date"
                            value={fechaPago}
                            onChange={e => { setFechaPago(e.target.value); setError(''); }}
                            disabled={cargando}
                            max={fechaMaxima}
                        />
                        <span className="campo-ayuda">
                            Fecha del voucher de pago (no puede ser futura)
                        </span>
                    </div>

                    {error && <div className="error-mensaje">{error}</div>}
                </div>

                <div className="modal-footer">
                    <button className="btn-cancelar" onClick={onCerrar} disabled={cargando}>
                        Cancelar
                    </button>
                    <button
                        className="btn-confirmar"
                        onClick={handleConfirmar}
                        disabled={cargando || !coinciden || !fechaPago}
                    >
                        {cargando ? 'Vinculando...' : 'Vincular expediente →'}
                    </button>
                </div>
            </div>
        </div>
    );
}