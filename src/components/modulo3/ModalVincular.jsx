import { useState } from 'react';
import { vincularExpediente } from '../../services/ProcedimientoService';
import '../../styles/modulo3/modales.css';

export default function ModalVincular({ preExpediente, onCerrar, onVinculado }) {
    const [nroMesaPartes, setNroMesaPartes] = useState('');
    const [error, setError] = useState('');
    const [cargando, setCargando] = useState(false);

    const handleConfirmar = async () => {
        if (!nroMesaPartes.trim()) {
            setError('El número de Mesa de Partes es requerido');
            return;
        }

        setCargando(true);
        setError('');
        
        try {
            // CORRECCIÓN: Pasar solo el ID, no todo el objeto
            await vincularExpediente(preExpediente.PreSolicitudes_Id, nroMesaPartes);
            onVinculado();
            onCerrar();
        } catch (error) {
            setError(error.message || 'Error al vincular expediente');
        } finally {
            setCargando(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div className="modal-header">
                    <h3>Vincular Expediente</h3>
                    <button className="modal-close" onClick={onCerrar}>×</button>
                </div>
                
                <div className="modal-body">
                    <p>
                        <strong>Pre-expediente:</strong> {preExpediente.PreSolicitudes_Codigo}
                    </p>
                    <p>
                        <strong>Solicitante:</strong> {preExpediente.Solicitante_Nombres} {preExpediente.Solicitante_Apellidos}
                    </p>
                    
                    <div className="campo">
                        <label>N° Mesa de Partes</label>
                        <input
                            type="text"
                            placeholder="Ej: EXP-001-2026"
                            value={nroMesaPartes}
                            onChange={(e) => setNroMesaPartes(e.target.value)}
                            autoFocus
                        />
                    </div>
                    
                    {error && <div className="error-mensaje">{error}</div>}
                </div>
                
                <div className="modal-footer">
                    <button className="btn-cancelar" onClick={onCerrar} disabled={cargando}>
                        Cancelar
                    </button>
                    <button className="btn-confirmar" onClick={handleConfirmar} disabled={cargando}>
                        {cargando ? 'Vinculando...' : 'Vincular'}
                    </button>
                </div>
            </div>
        </div>
    );
}