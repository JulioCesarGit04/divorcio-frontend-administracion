import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/modulo3/Sidebar'
import BotonesNavegacion from '../../components/modulo3/BotonesNavegacion'
import '../../styles/modulo3/detalle.css'
import PipelineVisual from '../../components/modulo3/PipelineVisual'
import PlazoAlerta from '../../components/modulo3/PlazoAlerta'
import { getExpedienteById, getAudiencias, cambiarEstadoExpediente, reemplazarDocumentoCiudadano, getPdfUrl } from '../../services/ProcedimientoService'

const TAMANIO_MAXIMO_PDF = 10 * 1024 * 1024

function DocumentoItem({ doc, onReemplazado, bloqueado }) {
    const [mostrarModal, setMostrarModal] = useState(false)
    const [archivo, setArchivo] = useState(null)
    const [cargandoDoc, setCargandoDoc] = useState(false)
    const [errorDoc, setErrorDoc] = useState('')
    const [exitoDoc, setExitoDoc] = useState('')
    const [pdfAbierto, setPdfAbierto] = useState(false)

    const tieneExtensionPdf = (nombreArchivo) => {
        if (!nombreArchivo) return false
        return nombreArchivo.toLowerCase().endsWith('.pdf')
    }

    const handleSeleccionArchivo = (e) => {
        const archivoSeleccionado = e.target.files[0]
        setErrorDoc('')
        setExitoDoc('')

        if (!archivoSeleccionado) {
            setArchivo(null)
            return
        }

        const esPdfPorTipo = archivoSeleccionado.type === 'application/pdf'
        const esPdfPorExtension = tieneExtensionPdf(archivoSeleccionado.name)
        if (!esPdfPorTipo && !esPdfPorExtension) {
            setErrorDoc('Solo se permiten archivos PDF')
            setArchivo(null)
            return
        }

        if (archivoSeleccionado.size > TAMANIO_MAXIMO_PDF) {
            setErrorDoc(`El archivo supera el tamaño máximo permitido (${TAMANIO_MAXIMO_PDF / (1024 * 1024)} MB)`)
            setArchivo(null)
            return
        }

        setArchivo(archivoSeleccionado)
    }

    const handleReemplazar = async () => {
        if (cargandoDoc) return

        if (!archivo) {
            setErrorDoc('Debe seleccionar un archivo PDF')
            return
        }

        const esPdfPorTipo = archivo.type === 'application/pdf'
        const esPdfPorExtension = tieneExtensionPdf(archivo.name)
        if (!esPdfPorTipo && !esPdfPorExtension) {
            setErrorDoc('Solo se permiten archivos PDF')
            return
        }

        if (archivo.size > TAMANIO_MAXIMO_PDF) {
            setErrorDoc(`El archivo supera el tamaño máximo permitido (${TAMANIO_MAXIMO_PDF / (1024 * 1024)} MB)`)
            return
        }

        setCargandoDoc(true)
        setErrorDoc('')
        setExitoDoc('')

        try {
            await reemplazarDocumentoCiudadano(doc.id, archivo)
            setExitoDoc('Documento reemplazado correctamente')
            setTimeout(() => {
                setMostrarModal(false)
                setArchivo(null)
                setExitoDoc('')
                onReemplazado()
            }, 1500)
        } catch (err) {
            setErrorDoc(err?.message || 'Error al reemplazar el documento')
        } finally {
            setCargandoDoc(false)
        }
    }

    const handleTogglePdf = () => {
        setPdfAbierto(!pdfAbierto)
    }

    const handleAbrirModal = () => {
        if (bloqueado) return
        setErrorDoc('')
        setExitoDoc('')
        setArchivo(null)
        setMostrarModal(true)
    }

    const handleCerrarModal = () => {
        if (cargandoDoc) return
        setMostrarModal(false)
        setArchivo(null)
        setErrorDoc('')
        setExitoDoc('')
    }

    const tieneArchivoValido = Boolean(doc?.ruta_archivo)
    const pdfUrl = tieneArchivoValido ? getPdfUrl(doc.ruta_archivo) : '#'
    const puedeMostrarVisor = tieneArchivoValido && pdfUrl && pdfUrl !== '#'

    return (
        <>
            <div style={{
                marginBottom: '12px',
                border: '1.5px solid #9ae6b4',
                borderRadius: '10px',
                overflow: 'hidden',
            }}>
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 16px',
                    background: '#f0fff4',
                }}>
                    <button
                        onClick={handleTogglePdf}
                        style={{
                            background: '#0f3b6f',
                            border: 'none', borderRadius: '6px',
                            width: '30px', height: '30px',
                            color: 'white', cursor: 'pointer',
                            fontSize: '0.8rem', fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transform: pdfAbierto ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                        }}
                    >
                        ▶
                    </button>
                    <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#0f3b6f', margin: 0 }}>
                            {doc.tipo_documento || 'Documento'}
                        </p>
                        <p style={{ fontSize: '0.73rem', color: '#4a5568', margin: '2px 0 0' }}>
                            {doc.nombre_archivo}
                            {doc.subido_en && ` - Fecha: ${new Date(doc.subido_en).toLocaleDateString('es-PE')}`}
                        </p>
                    </div>
                    
                    <div>
                        <span style={{
                            padding: '4px 12px', borderRadius: '20px',
                            fontSize: '0.78rem', fontWeight: 700,
                            background: '#f0fff4', color: '#276749', border: '1px solid #9ae6b4'
                        }}>
                            Subido
                        </span>
                    </div>
                </div>

                {pdfAbierto && puedeMostrarVisor && (
                    <div style={{ borderTop: '2px solid #0f3b6f', background: '#1a1a2e' }}>
                        <div style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '8px 16px', background: '#0f3b6f',
                        }}>
                            <span style={{ color: '#c7a03a', fontSize: '0.78rem', fontWeight: 600 }}>
                                {doc.tipo_documento || 'Documento'}
                            </span>
                            <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ color: 'white', fontSize: '0.75rem', textDecoration: 'none' }}>
                                Abrir en nueva pestaña ↗
                            </a>
                        </div>
                        <iframe
                            src={pdfUrl}
                            title={doc.nombre_archivo}
                            style={{ width: '100%', height: '500px', border: 'none', display: 'block' }}
                        />
                    </div>
                )}

                {pdfAbierto && !puedeMostrarVisor && (
                    <div style={{ borderTop: '2px solid #0f3b6f', background: '#fff5f5', padding: '12px 16px' }}>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#c53030' }}>
                            No se encontró un archivo válido para este documento.
                        </p>
                    </div>
                )}
            </div>

            {mostrarModal && !bloqueado && (
                <div className="modal-overlay" onClick={handleCerrarModal}>
                    <div className="modal-contenido" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Reemplazar documento</h3>
                            <button className="modal-cerrar" onClick={handleCerrarModal}>×</button>
                        </div>
                        <div className="modal-body">
                            <p><strong>Documento actual:</strong> {doc.nombre_archivo}</p>
                            <div className="campo">
                                <label>Seleccione el nuevo archivo PDF:</label>
                                <input type="file" accept=".pdf,application/pdf" onChange={handleSeleccionArchivo} disabled={cargandoDoc} />
                            </div>
                            {errorDoc && <div className="error-mensaje">{errorDoc}</div>}
                            {exitoDoc && <div className="exito-mensaje">{exitoDoc}</div>}
                        </div>
                        <div className="modal-footer">
                            <button onClick={handleCerrarModal} disabled={cargandoDoc}>Cancelar</button>
                            <button onClick={handleReemplazar} disabled={!archivo || cargandoDoc}>
                                {cargandoDoc ? 'Reemplazando...' : 'Reemplazar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

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
    const [confirmandoAvance, setConfirmandoAvance] = useState(false)
    const [errorAudiencias, setErrorAudiencias] = useState(null)

    const getPipelineEtapa = () => {
        const etapaActual = expediente?.etapa || expediente?.expedientes_estado_actual
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
        setErrorAudiencias(null)

        try {
            const res = await getExpedienteById(id)
            const data = res?.data || res
            const expedienteData = data?.expediente || data
            const documentosData = data?.documentos_ciudadano || data?.documentos || []

            setExpediente(expedienteData)
            setDocumentos(documentosData)
        } catch (error) {
            setError(error?.message || 'Error al cargar el expediente')
            setCargando(false)
            return
        }

        try {
            const resAudiencias = await getAudiencias(id)
            const audienciasData = resAudiencias?.data || resAudiencias || []
            const audienciaEncontrada = audienciasData.find(a => a.es_actual === true)
            setAudienciaVigente(audienciaEncontrada || null)
        } catch (errorAudiencia) {
            setAudienciaVigente(null)
            setErrorAudiencias(errorAudiencia?.message || 'No se pudieron cargar las audiencias')
        }

        setCargando(false)
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
        if (confirmandoAvance) return 

        setMostrarConfirmacion(false)
        setConfirmandoAvance(true)

        try {
            const data = await cambiarEstadoExpediente(
                id,
                'DOCUMENTOS_INTERNOS',
                'Revision documentaria confirmada'
            )
            if (data?.ok) {
                setConfirmado(true)
                setMensajeGlobal({ tipo: 'success', texto: '' })
                setTimeout(() => setRefresh(prev => !prev), 1500)
            } else {
                setMensajeGlobal({ tipo: 'error', texto: data?.mensaje || 'Error al confirmar' })
            }
        } catch (error) {
            setMensajeGlobal({ tipo: 'error', texto: 'Error al confirmar la revision' })
        } finally {
            setConfirmandoAvance(false)
        }
    }

    const esDiaHabil = (fecha) => {
        const diaSemana = fecha.getDay();
        return diaSemana !== 0 && diaSemana !== 6;
    };

    const calcularDiasRestantes = () => {
        if (!expediente?.fecha_limite_audiencia) return null;

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fechaLimite = new Date(expediente.fecha_limite_audiencia);

        if (Number.isNaN(fechaLimite.getTime())) {
            return null;
        }

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
    const diasRestantes = calcularDiasRestantes()

    const formatFecha = (fecha) => {
        if (!fecha) return '—'

        const partes = fecha.split('T')[0].split('-')
        const formatoValido = partes.length === 3 && partes.every(p => /^\d+$/.test(p))
        if (!formatoValido) {
            return '—'
        }

        return partes.reverse().join('/')
    }

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="detalle-header">
                    
                    {errorAudiencias && (
                        <div className="mensaje error" style={{ marginBottom: 16 }}>
                            {errorAudiencias}
                        </div>
                    )}
                    <button className="btn-volver" onClick={handleVolver}>← Volver</button>
                    <h1>Expediente {numeroMesaPartes || '—'}</h1>
                    <span className={`estado-badge estado-${(estadoActual || 'ACTIVO').toLowerCase()}`}>
                        {estadoActual || 'ACTIVO'}
                    </span>
                </div>

                <div className="detalle-grid">
                    <div className="detalle-izquierda">
                        <PlazoAlerta 
    expediente={expediente} 
    audienciaActual={audienciaVigente} 
    debug={false} 
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

                        <div className="seccion">
                            <h2>Cónyuges</h2>
                            <div className="conyuges-grid-moderno">
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

                        <div className="seccion">
                            <h2>Documentos del ciudadano</h2>
                            {documentos.length === 0 ? (
                                <div className="empty-state">No hay documentos registrados</div>
                            ) : (
                                <div className="documentos-lista">
                                    {documentos.map((doc, idx) => (
                                        <DocumentoItem
                                            key={doc.id || idx}
                                            doc={doc}
                                            onReemplazado={() => setRefresh(prev => !prev)}
                                            bloqueado={confirmado || etapaActual !== 'EVALUACION'}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {!confirmado && etapaActual === 'EVALUACION' && (
                            <div className="seccion acciones">
                                <button
                                    className="btn-continuar"
                                    onClick={handleConfirmarRevision}
                                    disabled={confirmandoAvance}
                                >
                                    {confirmandoAvance ? 'Procesando...' : 'Continuar'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="detalle-derecha">
                        <BotonesNavegacion expedienteId={id} etapaActual={etapaActual} />
                        <PipelineVisual etapaActual={getPipelineEtapa()} estado={expediente?.estado} />
                    </div>
                </div>

                {mostrarConfirmacion && (
                    <div className="modal-overlay" onClick={() => setMostrarConfirmacion(false)}>
                        <div className="modal-contenido" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>ATENCIÓN</h3>
                                <button className="modal-cerrar" onClick={() => setMostrarConfirmacion(false)}>×</button>
                            </div>
                            <div className="modal-body">
                                <p>El expediente avanzará a la siguiente fase</p>
                                <p>¿Está seguro de que quiere avanzar?</p>
                            </div>
                            <div className="modal-footer">
                                <button className="btn-cancelar" onClick={() => setMostrarConfirmacion(false)} disabled={confirmandoAvance}>Cancelar</button>
                                <button className="btn-confirmar" onClick={handleConfirmarRevisionAceptar} disabled={confirmandoAvance}>
                                    {confirmandoAvance ? 'Confirmando...' : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </>
    )
}