import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/modulo3/Sidebar'
import BotonesNavegacion from '../../components/modulo3/BotonesNavegacion'
import '../../styles/modulo3/detalle.css'
import PipelineVisual from '../../components/modulo3/PipelineVisual'
import PlazoAlerta from '../../components/modulo3/PlazoAlerta'

import { getExpedienteById, avanzarAAudiencia, getAudiencias, cambiarEstadoExpediente, reemplazarDocumentoCiudadano, getPdfUrl } from '../../services/ProcedimientoService'
export default function DetalleExpediente() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [expediente, setExpediente] = useState(null)
    const [documentos, setDocumentos] = useState([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState(null)
    const [refresh, setRefresh] = useState(false)
    const [confirmado, setConfirmado] = useState(false)
    const [audienciaVigente, setAudienciaVigente] = useState(null)
    const [mensajeGlobal, setMensajeGlobal] = useState(null)
    const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)

    const getPipelineEtapa = () => {
        switch(etapaActual) {
            case 'EVALUACION': return 'revision'
            case 'DOCUMENTOS_INTERNOS': return 'documentos'
            case 'AUDIENCIA': return 'audiencia'
            case 'ESPERA_LEGAL': return 'resolucion'
            case 'DISOLUCION': return 'disolucion'
            default: return 'revision'
        }
    }

    const cargar = async () => {
    if (!id) {
        setError('No hay ID')
        setCargando(false)
        return
    }
    
    setCargando(true)
    setError(null)
    
    try {
        // Cargar expediente
        const res = await getExpedienteById(id)
        const data = res?.data || res
        const expedienteData = data?.expediente || data
        const documentosData = data?.documentos_ciudadano || data?.documentos || []
        
        setExpediente(expedienteData)
        setDocumentos(documentosData)
        
        // Cargar audiencias
        const resAudiencias = await getAudiencias(id)
        const audienciasData = resAudiencias?.data || resAudiencias || []
        
        // Buscar audiencia vigente (PROGRAMADA o REPROGRAMADA)
        // Buscar la audiencia vigente (la que tiene es_actual = true)
const audienciaVigente = audienciasData.find(a => a.es_actual === true)
setAudienciaVigente(audienciaVigente)
        
    } catch (error) {
        setError(error.message)
    } finally {
        setCargando(false)
    }
}

    useEffect(() => { 
        if (id) cargar() 
    }, [id, refresh])

    const handleVolver = () => {
        navigate('/modulo3/expedientes')
    }

    const handleConfirmarRevision = () => {
    setMostrarConfirmacion(true)
}

const handleConfirmarRevisionAceptar = async () => {
    setMostrarConfirmacion(false)
    try {
        const data = await cambiarEstadoExpediente(
            id,
            'DOCUMENTOS_INTERNOS',
            'Revision documentaria confirmada'
        )
        if (data.ok) {
            setConfirmado(true)
            setMensajeGlobal({ tipo: 'success', texto: 'Revision documentaria confirmada' })
            setTimeout(() => window.location.reload(), 1500)
        } else {
            setMensajeGlobal({ tipo: 'error', texto: data.mensaje || 'Error al confirmar' })
        }
    } catch (error) {
        console.error('Error:', error)
        setMensajeGlobal({ tipo: 'error', texto: 'Error al confirmar la revision' })
    }
}


  

    const esDiaHabil = (fecha) => {
        const diaSemana = fecha.getDay();
        return diaSemana !== 0 && diaSemana !== 6;
    };

    const calcularTotalDiasHabiles = () => {
        if (!expediente?.fecha_pago || !expediente?.fecha_limite_audiencia) return null;
        
        const fechaPago = new Date(expediente.fecha_pago);
        const fechaLimite = new Date(expediente.fecha_limite_audiencia);
        
        let contador = 0;
        let fecha = new Date(fechaPago);
        
        while (fecha <= fechaLimite) {
            if (esDiaHabil(fecha)) {
                contador++;
            }
            fecha.setDate(fecha.getDate() + 1);
        }
        
        return contador;
        {console.log('expediente:', expediente)}
        {console.log('audienciaVigente:', audienciaVigente)}
    };

    const calcularDiasRestantes = () => {
        if (!expediente?.fecha_limite_audiencia) return null;
        
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fechaLimite = new Date(expediente.fecha_limite_audiencia);
        
        let contador = 0;
        let fecha = new Date(hoy);
        
        while (fecha <= fechaLimite) {
            if (esDiaHabil(fecha)) {
                contador++;
            }
            fecha.setDate(fecha.getDate() + 1);
        }
        
        return contador;
    };

    const DocumentoItem = ({ doc, onReemplazado, bloqueado }) => {
        const [mostrarModal, setMostrarModal] = useState(false)
        const [archivo, setArchivo] = useState(null)
        const [cargandoDoc, setCargandoDoc] = useState(false)
        const [errorDoc, setErrorDoc] = useState('')
        const [exitoDoc, setExitoDoc] = useState('')

        const handleReemplazar = async () => {
            if (!archivo) {
                setErrorDoc('Debe seleccionar un archivo PDF')
                return
            }
            if (archivo.type !== 'application/pdf') {
                setErrorDoc('Solo se permiten archivos PDF')
                return
            }

            setCargandoDoc(true)
            setErrorDoc('')
            setExitoDoc('')

            try {
                const formData = new FormData()
                formData.append('documento', archivo)

                const data = await reemplazarDocumentoCiudadano(doc.id, archivo)

                
                setExitoDoc('Documento reemplazado correctamente')
                setTimeout(() => {
                    setMostrarModal(false)
                    setArchivo(null)
                    setExitoDoc('')
                    onReemplazado()
                }, 1500)
            } catch (err) {
                setErrorDoc(err.message)
            } finally {
                setCargandoDoc(false)
            }
        }

        return (
            <>
                <div className="documento-item">
                    <div className="documento-info">
                        <div className="documento-icono">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                            </svg>
                        </div>
                        <div>
                            <div className="documento-nombre">{doc.tipo_documento || 'Documento'}</div>
                            <div className="documento-archivo">{doc.nombre_archivo}</div>
                            <div className="documento-fecha">
                                Subido: {doc.subido_en ? new Date(doc.subido_en).toLocaleDateString('es-PE') : '—'}
                            </div>
                        </div>
                    </div>
                    <div className="documento-acciones">
                        <button className="btn-ver" onClick={() => {
                            const url = getPdfUrl(doc.ruta_archivo)
                            if (url !== '#') window.open(url, '_blank')
                            else alert('No se puede abrir el PDF')
                        }}>
                            Ver PDF
                        </button>
                        
                    </div>
                </div>

                {mostrarModal && !bloqueado && (
                    <div className="modal-overlay" onClick={() => !cargandoDoc && setMostrarModal(false)}>
                        <div className="modal-contenido" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Reemplazar documento</h3>
                                <button className="modal-cerrar" onClick={() => !cargandoDoc && setMostrarModal(false)}>×</button>
                            </div>
                            <div className="modal-body">
                                <p><strong>Documento actual:</strong> {doc.nombre_archivo}</p>
                                <div className="campo">
                                    <label>Seleccione el nuevo archivo PDF:</label>
                                    <input type="file" accept=".pdf" onChange={(e) => setArchivo(e.target.files[0])} />
                                </div>
                                {errorDoc && <div className="error-mensaje">{errorDoc}</div>}
                                {exitoDoc && <div className="exito-mensaje">{exitoDoc}</div>}
                            </div>
                            <div className="modal-footer">
                                <button onClick={() => setMostrarModal(false)}>Cancelar</button>
                                <button onClick={handleReemplazar} disabled={!archivo}>{cargandoDoc ? 'Reemplazando...' : 'Reemplazar'}</button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        )
    }

    if (cargando) {
        return (
            <>
                <Sidebar />
                <main className="contenido-modulo3">
                    <div className="pagina-header"><h1>Detalle del Expediente</h1></div>
                    <div className="loading-spinner"></div>
                    <p>Cargando...</p>
                </main>
            </>
        )
    }

    if (error) {
        return (
            <>
                <Sidebar />
                <main className="contenido-modulo3">
                    <div className="pagina-header">
                        <button className="btn-volver" onClick={handleVolver}>← Volver</button>
                        <h1>Detalle del Expediente</h1>
                    </div>
                    <div className="error-message">{error}</div>
                </main>
            </>
        )
    }

    if (!expediente) {
        return (
            <>
                <Sidebar />
                <main className="contenido-modulo3">
                    <div className="pagina-header">
                        <button className="btn-volver" onClick={handleVolver}>← Volver</button>
                        <h1>Detalle del Expediente</h1>
                    </div>
                    <div className="warning-message">Expediente no encontrado</div>
                </main>
            </>
        )
    }

    const etapaActual = expediente.etapa || expediente.expedientes_estado_actual
    const numeroMesaPartes = expediente.numero_mesa_partes || expediente.expedientes_nro_mesa_partes
    const estadoActual = expediente.estado || expediente.expedientes_estado_actual
    const fechaPago = expediente.fecha_pago
    const fechaRecepcion = expediente.fecha_recepcion || expediente.expedientes_creado_en
    const registradoPor = expediente.registrado_por || expediente.Usuario_Vinculo
    const fechaLimiteAudiencia = expediente.fecha_limite_audiencia
    const diasRestantes = calcularDiasRestantes()
    
    const getColorDias = () => {
        if (diasRestantes === null) return '#64748b'
        if (diasRestantes < 3) return '#dc2626'
        if (diasRestantes <= 7) return '#eab308'
        return '#22c55e'
    }

    const formatFecha = (fecha) => {
        if (!fecha) return '—'
        return fecha.split('T')[0].split('-').reverse().join('/')
    }

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="detalle-header">
                    {mensajeGlobal && (
                        <div className={`mensaje ${mensajeGlobal.tipo}`} style={{ marginBottom: 16 }}>
                            {mensajeGlobal.texto}
                        </div>
                    )}
                    <button className="btn-volver" onClick={handleVolver}>← Volver</button>
                    <h1>Expediente {numeroMesaPartes || '—'}</h1>
                    <span className={`estado-badge estado-${(estadoActual || 'ACTIVO').toLowerCase()}`}>
                        {estadoActual || 'ACTIVO'}
                    </span>
                </div>

                <div className="detalle-grid">
                    {/* COLUMNA IZQUIERDA */}
                    <div className="detalle-izquierda">
                        {/* Datos del expediente */}
                        {console.log('expediente:', expediente)}
                            {console.log('audienciaVigente:', audienciaVigente)}
                            <PlazoAlerta 
                                expediente={expediente}
                                audienciaActual={audienciaVigente}
                            />
                        <div className="seccion">
                            <h2>Datos del expediente</h2>
                            <div className="datos-grid">
                                <div className="dato-item">
                                    <label>N° Mesa de Partes</label>
                                    <p>{numeroMesaPartes || '—'}</p>
                                </div>
                                <div className="dato-item">
                                    <label>Estado</label>
                                    <p>{estadoActual || '—'}</p>
                                </div>
                                <div className="dato-item">
                                    <label>Etapa</label>
                                    <p>{etapaActual || '—'}</p>
                                </div>
                                <div className="dato-item">
                                    <label>Fecha pago</label>
                                    <p>{formatFecha(fechaPago)}</p>
                                </div>
                                <div className="dato-item">
                                    <label>Fecha recepción</label>
                                    <p>{formatFecha(fechaRecepcion)}</p>
                                </div>
                                <div className="dato-item">
                                    <label>Vinculado por</label>
                                    <p>{registradoPor || '—'}</p>
                                </div>
                            </div>
                           
                            

                        </div>
                        

                        {/* Cónyuges */}
                        <div className="seccion">
                            <h2>Cónyuges</h2>
                            <div className="conyuges-grid-moderno">
                                {/* Solicitante */}
                                <div className="conyuge-card-moderno">
                                    <div className="conyuge-header-moderno">
                                        <div>
                                            <h3>Solicitante</h3>
                                            <span className="conyuge-rol">Inicia el tramite</span>
                                        </div>
                                    </div>
                                    <div className="conyuge-body">
                                        <div className="conyuge-nombre">
                                            {expediente.Solicitante_Nombres || '—'} {expediente.Solicitante_Apellidos || ''}
                                        </div>
                                        <div className="conyuge-detalle">
                                            <span className="detalle-icono">DNI:</span>
                                            <span>{expediente.Solicitante_Dni || '—'}</span>
                                        </div>
                                        <div className="conyuge-detalle">
                                            <span className="detalle-icono">Tel:</span>
                                            <span>{expediente.Solicitante_Telefono || '—'}</span>
                                        </div>
                                        <div className="conyuge-detalle">
                                            <span className="detalle-icono">Email:</span>
                                            <span>{expediente.Solicitante_Correo || '—'}</span>
                                        </div>
                                        <div className="conyuge-detalle">
                                            <span className="detalle-icono">Dir:</span>
                                            <span>{expediente.Solicitante_Direccion || '—'}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Demandado */}
                                <div className="conyuge-card-moderno">
                                    <div className="conyuge-header-moderno">
                                        <div>
                                            <h3>Demandado</h3>
                                            <span className="conyuge-rol">Parte demandada</span>
                                        </div>
                                    </div>
                                    <div className="conyuge-body">
                                        <div className="conyuge-nombre">
                                            {expediente.Demandado_Nombres || '—'} {expediente.Demandado_Apellidos || ''}
                                        </div>
                                        <div className="conyuge-detalle">
                                            <span className="detalle-icono">DNI:</span>
                                            <span>{expediente.Demandado_Dni || '—'}</span>
                                        </div>
                                        <div className="conyuge-detalle">
                                            <span className="detalle-icono">Tel:</span>
                                            <span>{expediente.Demandado_Telefono || '—'}</span>
                                        </div>
                                        <div className="conyuge-detalle">
                                            <span className="detalle-icono">Email:</span>
                                            <span>{expediente.Demandado_Correo || '—'}</span>
                                        </div>
                                        <div className="conyuge-detalle">
                                            <span className="detalle-icono">Dir:</span>
                                            <span>{expediente.Demandado_Direccion || '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Documentos */}
                        <div className="seccion">
                            <h2>Documentos del ciudadano</h2>
                            {documentos.length === 0 ? (
                                <div className="empty-state">No hay documentos registrados</div>
                            ) : (
                                <div className="documentos-lista">
                                    {documentos.map((doc, idx) => (
                                        <DocumentoItem key={doc.id || idx} doc={doc} onReemplazado={() => setRefresh(prev => !prev)} bloqueado={confirmado || etapaActual !== 'EVALUACION'} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Botón Continuar */}
                        {!confirmado && etapaActual === 'EVALUACION' && (
                            <div className="seccion acciones">
                                <button className="btn-continuar" onClick={handleConfirmarRevision}>
                                    Continuar revision
                                </button>
                                <p className="texto-ayuda">Revise todos los documentos antes de continuar</p>
                            </div>
                        )}
                    </div>

                    {/* COLUMNA DERECHA */}
                    <div className="detalle-derecha">
                        <BotonesNavegacion expedienteId={id} etapaActual={etapaActual} />
                        <PipelineVisual etapaActual={getPipelineEtapa()} />
                    </div>
                </div>


                {mostrarConfirmacion && (
                <div className="modal-overlay" onClick={() => setMostrarConfirmacion(false)}>
                    <div className="modal-contenido" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Confirmar revisión documentaria</h3>
                            <button className="modal-cerrar" onClick={() => setMostrarConfirmacion(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p>Una vez que confirme la revisión documentaria:</p>
                            <ul style={{ margin: '12px 0', paddingLeft: 20 }}>
                                <li>Los documentos del ciudadano quedarán <strong>BLOQUEADOS</strong></li>
                                <li>No podrá reemplazar ningún documento después</li>
                            </ul>
                            <p>¿Está seguro de que todos los documentos están correctos?</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-cancelar" onClick={() => setMostrarConfirmacion(false)}>
                                Cancelar
                            </button>
                            <button className="btn-confirmar" onClick={handleConfirmarRevisionAceptar}>
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            </main>
        </>
    )
}