// ── ModalVerResolucion.jsx ──
import '../../styles/modulo3/modales.css'
//mensaje
export default function ModalVerResolucion({ resoluciones, onCerrar }) {
    return (
        <div className="modal-overlay">
            <div className="modal">
                <div className="modal-header">
                    <h2>Resoluciones del expediente: </h2>
                    <button className="modal-cerrar" onClick={onCerrar}>✕</button>
                </div>
                <div className="modal-body">
                    {resoluciones.map(r => (
                        <div key={r.resoluciones_id} className="resolucion-detalle">
                            <div className="campo-readonly">
                                <label>Tipo</label>
                                <p>{r.resoluciones_tipo}</p>
                            </div>
                            <div className="campo-readonly">
                                <label>N° Correlativo</label>
                                <p>{r.resoluciones_nro_correlativo}</p>
                            </div>
                            <div className="campo-readonly">
                                <label>Fecha de emisión</label>
                                <p>{new Date(r.resoluciones_fecha_emision).toLocaleDateString('es-PE')}</p>
                            </div>
                            <div className="campo-readonly">
                                <label>Emitido por</label>
                                <p>{r.Usuario}</p>
                            </div>
                            <hr />
                        </div>
                    ))}
                </div>
                <div className="modal-footer">
                    <button className="btn-cancelar" onClick={onCerrar}>Cerrar</button>
                </div>
            </div>
        </div>
    )
}