import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/modulo3/Sidebar'
import BotonesNavegacion from '../../components/modulo3/BotonesNavegacion'
import PipelineVisual from '../../components/modulo3/PipelineVisual'
import PlazoAlerta from '../../components/modulo3/PlazoAlerta'
import { 
    getExpedienteById, 
    getDocumentosInternos, 
    subirDocumentoInterno,
    getPdfUrl,
    cambiarEstadoExpediente
} from '../../services/ProcedimientoService'
import '../../styles/modulo3/resolucion-fundada.css'

export default function ResolucionFundada() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [expediente, setExpediente] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState(null)
    const [enviando, setEnviando] = useState(false)
    const [mensaje, setMensaje] = useState(null)
    const [resolucionFundada, setResolucionFundada] = useState(null)
    const [archivo, setArchivo] = useState(null)
    const [numeroDocumento, setNumeroDocumento] = useState('')
    const [fechaElaboracion, setFechaElaboracion] = useState(new Date().toISOString().split('T')[0])
    const [diasRestantes, setDiasRestantes] = useState(null)
    const [puedeAvanzar, setPuedeAvanzar] = useState(false)

    const [modalReemplazoAbierto, setModalReemplazoAbierto] = useState(false)
    const [motivoReemplazo, setMotivoReemplazo] = useState('')
    const [archivoReemplazo, setArchivoReemplazo] = useState(null)
    const [enviandoReemplazo, setEnviandoReemplazo] = useState(false)
    const [mensajeReemplazo, setMensajeReemplazo] = useState(null)

    const [modalConfirmacionAbierto, setModalConfirmacionAbierto] = useState(false)

    const [modalCancelacionAbierto, setModalCancelacionAbierto] = useState(false)
    const [motivoCancelacion, setMotivoCancelacion] = useState('')
    const [enviandoCancelacion, setEnviandoCancelacion] = useState(false)

    const [visorAbierto, setVisorAbierto] = useState(false)
    const [pdfUrl, setPdfUrl] = useState('')

    const etapaActual = expediente?.etapa
    const estaCancelado = expediente?.estado === 'CANCELADO'
    const estaArchivado = expediente?.estado === 'ARCHIVADO'
    const esSoloLectura = estaCancelado || estaArchivado

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

    const getUsuarioLogueado = () =>
        localStorage.getItem('usuario_nombre') ||
        localStorage.getItem('email') ||
        localStorage.getItem('usuario') ||
        'sistema'

    const formatFecha = (fechaStr) => {
        if (!fechaStr) return '—'
        return fechaStr.split('T')[0].split('-').reverse().join('/')
    }

    useEffect(() => {
        const cargar = async () => {
            if (!id) return
            setCargando(true)
            try {
                const resExp = await getExpedienteById(id)
                const data = resExp?.data || resExp
                const expedienteData = data?.expediente || data
                console.log('Datos del expediente desde la API:', expedienteData);

                setExpediente(expedienteData)

                if (expedienteData?.fecha_fin_espera) {
                    const fechaFin = new Date(expedienteData.fecha_fin_espera)
                    const hoy = new Date()
                    hoy.setHours(0, 0, 0, 0)
                    const diffDays = Math.ceil((fechaFin - hoy) / (1000 * 60 * 60 * 24))
                    setDiasRestantes(diffDays)
                    setPuedeAvanzar(diffDays <= 0)
                }

                const resDocs = await getDocumentosInternos(id)
                const docsData = resDocs?.data || resDocs || []
                const resoluciones = docsData
                    .filter(d => d.tipo_documento === 'RESOLUCION_FUNDADA')
                    .sort((a, b) => new Date(b.subido_en) - new Date(a.subido_en))

                setResolucionFundada(resoluciones[0] || null)
                if (resoluciones[0]) {
                    setNumeroDocumento(resoluciones[0].numero_documento || '')
                    if (resoluciones[0].fecha_elaboracion) {
                        setFechaElaboracion(resoluciones[0].fecha_elaboracion.split('T')[0])
                    }
                }
            } catch (err) {
                setError(err.message)
            } finally {
                setCargando(false)
            }
        }
        cargar()
    }, [id])

    const handleArchivoChange = (file) => {
        if (file && file.type !== 'application/pdf') {
            setMensaje({ tipo: 'error', texto: 'Solo se permiten archivos PDF' })
            return
        }
        setArchivo(file)
        setMensaje(null)
    }

    const handleSubirResolucion = async () => {
        if (!archivo) {
            setMensaje({ tipo: 'error', texto: 'Debe seleccionar un archivo PDF' })
            return
        }
        if (!numeroDocumento) {
            setMensaje({ tipo: 'error', texto: 'Debe ingresar el número de resolución' })
            return
        }
        setEnviando(true)
        setMensaje(null)
        try {
            await subirDocumentoInterno(id, 'RESOLUCION_FUNDADA', numeroDocumento, fechaElaboracion, archivo, getUsuarioLogueado())
            setMensaje({ tipo: 'success', texto: 'Resolución Fundada subida correctamente' })
            setTimeout(() => window.location.reload(), 1500)
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.message || 'Error al subir la resolución' })
        } finally {
            setEnviando(false)
        }
    }

    const abrirModalReemplazo = () => {
        if (esSoloLectura) return
        setMotivoReemplazo('')
        setArchivoReemplazo(null)
        setMensajeReemplazo(null)
        setModalReemplazoAbierto(true)
    }

    const handleReemplazarResolucion = async () => {
        if (!archivoReemplazo) {
            setMensajeReemplazo({ tipo: 'error', texto: 'Debe seleccionar un archivo PDF' })
            return
        }
        if (!motivoReemplazo.trim()) {
            setMensajeReemplazo({ tipo: 'error', texto: 'Debe ingresar el motivo del reemplazo' })
            return
        }

        setEnviandoReemplazo(true)
        setMensajeReemplazo(null)

        try {
            await subirDocumentoInterno(id, 'RESOLUCION_FUNDADA', null, fechaElaboracion, archivoReemplazo, motivoReemplazo)
            setMensajeReemplazo({ tipo: 'success', texto: 'Resolución Fundada reemplazada correctamente' })
            setTimeout(() => {
                setModalReemplazoAbierto(false)
                setArchivoReemplazo(null)
                setMotivoReemplazo('')
                setMensajeReemplazo(null)
                window.location.reload()
            }, 1500)
        } catch (err) {
            console.error('Error:', err)
            setMensajeReemplazo({ tipo: 'error', texto: err.message })
        } finally {
            setEnviandoReemplazo(false)
        }
    }

    const handleAvanzarADisolucion = async () => {
        if (!puedeAvanzar) {
            setMensaje({ tipo: 'error', texto: `Debe esperar ${diasRestantes} días para avanzar a disolución` })
            return
        }
        if (!resolucionFundada) {
            setMensaje({ tipo: 'error', texto: 'Debe subir la Resolución Fundada antes de avanzar' })
            return
        }
        setModalConfirmacionAbierto(true)
    }

    const handleConfirmarAvance = async () => {
        setModalConfirmacionAbierto(false)
        setEnviando(true)
        setMensaje(null)
        try {
            const data = await cambiarEstadoExpediente(id, 'DISOLUCION', 'Resolución Fundada emitida - Expediente completado')
            if (data.ok) {
                setMensaje({ tipo: 'success', texto: 'Expediente avanzado a DISOLUCION' })
                setTimeout(() => navigate(`/modulo3/detalle/${id}`), 2000)
            } else {
                setMensaje({ tipo: 'error', texto: data.mensaje || 'Error al avanzar' })
            }
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.message || 'Error al avanzar' })
        } finally {
            setEnviando(false)
        }
    }

    const abrirModalCancelacion = () => {
        if (esSoloLectura) return
        setMotivoCancelacion('')
        setModalCancelacionAbierto(true)
    }

    const handleConfirmarCancelacion = async () => {
        if (!motivoCancelacion.trim()) {
            setMensaje({ tipo: 'error', texto: 'Debe ingresar el motivo de cancelación' })
            return
        }

        setEnviandoCancelacion(true)
        setMensaje(null)

        try {
            const data = await cambiarEstadoExpediente(
                id,
                null,                                    
                `Proceso cancelado en etapa ESPERA_LEGAL. Motivo: ${motivoCancelacion}`,
                'CANCELADO'                              
            )
            if (data.ok) {
                setMensaje({ tipo: 'success', texto: 'Proceso cancelado correctamente' })
                setModalCancelacionAbierto(false)
                setTimeout(() => navigate('/modulo3/expedientes'), 2000)
            } else {
                setMensaje({ tipo: 'error', texto: data.mensaje || 'Error al cancelar' })
            }
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.message || 'Error al cancelar' })
        } finally {
            setEnviandoCancelacion(false)
        }
    }

    const verPdfEnModal = (ruta) => {
        const url = getPdfUrl(ruta)
        if (url !== '#') {
            setPdfUrl(url)
            setVisorAbierto(true)
        } else {
            alert('No se puede abrir el PDF')
        }
    }

    if (cargando) return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="detalle-header">
                    <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>← Volver</button>
                    <h1>Resolución Fundada</h1>
                </div>
                <p style={{ color: '#64748b', padding: '40px 0', textAlign: 'center' }}>Cargando...</p>
            </main>
        </>
    )

    if (error) return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="detalle-header">
                    <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>← Volver</button>
                    <h1>Resolución Fundada</h1>
                </div>
                <p style={{ color: '#dc2626' }}>Error: {error}</p>
            </main>
        </>
    )

    const yaTieneResolucion = resolucionFundada !== null
    const bloqueado = etapaActual === 'DISOLUCION'

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">

                <div className="detalle-header">
                    <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>← Volver</button>
                    <h1>Resolución Fundada</h1>
                    <span className="estado-badge">{expediente?.numero_mesa_partes || '—'}</span>
                </div>

                {bloqueado && !esSoloLectura && (
                    <div >
                    </div>
                )}

                <div className="detalle-grid">
                    <div className="detalle-izquierda">
                        <PlazoAlerta expediente={expediente} audienciaActual={null} />

                        <div className="seccion">
                            <h2>Plazo legal</h2>
                            <div className="datos-grid">
                                <div>
                                    <label>Inicio de espera</label>
                                    <p>{formatFecha(expediente?.fecha_inicio_espera)}</p>
                                </div>
                                <div>
                                    <label>Fin de espera</label>
                                    <p>{formatFecha(expediente?.fecha_fin_espera)}</p>
                                </div>
                                <div>
                                    <label>Días restantes</label>
                                    <p className={diasRestantes > 0 ? 'dias-pendiente' : 'dias-cumplido'}>
                                        {diasRestantes !== null
                                            ? (diasRestantes > 0 ? `${diasRestantes} días` : '✓ Cumplido')
                                            : '—'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="seccion">
                            <h2>Datos del expediente</h2>
                            <div className="datos-grid">
                                <div>
                                    <label>N° Expediente</label>
                                    <p>{expediente?.numero_expediente || '—'}</p>
                                </div>
                                <div>
                                    <label>N° Mesa de Partes</label>
                                    <p>{expediente?.numero_mesa_partes || '—'}</p>
                                </div>
                                <div>
                                    <label>Etapa actual</label>
                                    <p>{expediente?.etapa || '—'}</p>
                                </div>
                                <div>
                                    <label>Fecha de pago</label>
                                    <p>{formatFecha(expediente?.fecha_pago)}</p>
                                </div>
                                <div>
                                    <label>Fecha de recepción</label>
                                    <p>{formatFecha(expediente?.fecha_recepcion)}</p>
                                </div>
                                <div>
                                    <label>Registrado por</label>
                                    <p>{expediente?.registrado_por || '—'}</p>
                                </div>
                            </div>

                            <div className="conyuges-grid-moderno" style={{ marginTop: 24 }}>
                                <div className="conyuge-card-moderno">
                                    <div className="conyuge-header-moderno">
                                        <div>
                                            <h3>Solicitante</h3>
                                            <span className="conyuge-rol">Inicia el trámite</span>
                                        </div>
                                    </div>
                                    <div className="conyuge-body">
                                        <div className="conyuge-nombre">
                                            {expediente?.Solicitante_Nombres || '—'} {expediente?.Solicitante_Apellidos || ''}
                                        </div>
                                        <div className="conyuge-detalle">
                                            <span className="detalle-icono">DNI:</span>
                                            <span>{expediente?.Solicitante_Dni || '—'}</span>
                                        </div>
                                        <div className="conyuge-detalle">
                                            <span className="detalle-icono">Tel:</span>
                                            <span>{expediente?.Solicitante_Telefono || '—'}</span>
                                        </div>
                                        <div className="conyuge-detalle">
                                            <span className="detalle-icono">Email:</span>
                                            <span>{expediente?.Solicitante_Correo || '—'}</span>
                                        </div>
                                        <div className="conyuge-detalle">
                                            <span className="detalle-icono">Dir:</span>
                                            <span>{expediente?.Solicitante_Direccion || '—'}</span>
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
                                            {expediente?.Demandado_Nombres || '—'} {expediente?.Demandado_Apellidos || ''}
                                        </div>
                                        <div className="conyuge-detalle">
                                            <span className="detalle-icono">DNI:</span>
                                            <span>{expediente?.Demandado_Dni || '—'}</span>
                                        </div>
                                        <div className="conyuge-detalle">
                                            <span className="detalle-icono">Tel:</span>
                                            <span>{expediente?.Demandado_Telefono || '—'}</span>
                                        </div>
                                        <div className="conyuge-detalle">
                                            <span className="detalle-icono">Email:</span>
                                            <span>{expediente?.Demandado_Correo || '—'}</span>
                                        </div>
                                        <div className="conyuge-detalle">
                                            <span className="detalle-icono">Dir:</span>
                                            <span>{expediente?.Demandado_Direccion || '—'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="seccion">
                            <h2>Resolución Fundada</h2>

                            {yaTieneResolucion && (
                                <div className="documento-item" style={{ marginBottom: 20 }}>
                                    <div className="documento-info">
                                        <div className="documento-icono">
                                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                                <polyline points="14 2 14 8 20 8"/>
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="documento-nombre">
                                                {resolucionFundada.numero_documento
                                                    ? `Res. ${resolucionFundada.numero_documento}`
                                                    : resolucionFundada.nombre_archivo}
                                            </div>
                                            <div className="documento-descripcion">
                                                Fecha de elaboración: {formatFecha(resolucionFundada.fecha_elaboracion)}
                                            </div>
                                            <div className="documento-descripcion">
                                                Subido: {formatFecha(resolucionFundada.subido_en)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="documento-acciones">
                                        <span className="estado-subido">Subido</span>
                                        <button className="btn-ver" onClick={() => verPdfEnModal(resolucionFundada.ruta_archivo)}>
                                            Ver PDF
                                        </button>
                                        {!bloqueado && !esSoloLectura && (
                                            <button className="btn-reemplazar" onClick={abrirModalReemplazo}>
                                                Reemplazar
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {!yaTieneResolucion && !bloqueado && !esSoloLectura && (
                                <div className="rf-form">
                                    <div className="campo">
                                        <label>N° de Resolución <span className="required">*</span></label>
                                        <input
                                            type="text"
                                            value={numeroDocumento}
                                            onChange={(e) => setNumeroDocumento(e.target.value)}
                                            placeholder="Ej: RES-2026-001"
                                        />
                                    </div>

                                    <div className="campo">
                                        <label>Fecha de elaboración <span className="required">*</span></label>
                                        <input
                                            type="date"
                                            value={fechaElaboracion}
                                            onChange={(e) => setFechaElaboracion(e.target.value)}
                                        />
                                    </div>

                                    <div className="campo">
                                        <label>Archivo PDF <span className="required">*</span></label>
                                        <div className="rf-archivo">
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                id="rf-file-input"
                                                onChange={(e) => handleArchivoChange(e.target.files[0])}
                                                style={{ display: 'none' }}
                                            />
                                            <label htmlFor="rf-file-input" className="btn-ver" style={{ cursor: 'pointer' }}>
                                                Seleccionar archivo
                                            </label>
                                            {archivo
                                                ? <span className="archivo-ok"> {archivo.name}</span>
                                                : <span className="archivo-pendiente">Ningún archivo seleccionado</span>
                                            }
                                        </div>
                                    </div>

                                    {mensaje && (
                                        <div className={`mensaje ${mensaje.tipo}`}>{mensaje.texto}</div>
                                    )}

                                    <button className="btn-subir" onClick={handleSubirResolucion} disabled={enviando}>
                                        {enviando ? 'Subiendo...' : 'Subir Resolución Fundada'}
                                    </button>
                                </div>
                            )}

                            {!yaTieneResolucion && esSoloLectura && (
                                <div className="alerta-info" style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '12px', borderRadius: '8px', marginTop: 16 }}>
                                    No se ha subido una Resolución Fundada. El expediente está {expediente?.estado}, no es posible subir documentos.
                                </div>
                            )}

                            {yaTieneResolucion && etapaActual === 'ESPERA_LEGAL' && !bloqueado && !esSoloLectura && (
                                <div className="alerta-info" style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '12px', borderRadius: '8px', marginTop: 16 }}>
                                     La Resolución Fundada ya ha sido subida. Puedes avanzar a DISOLUCIÓN cuando se cumpla el plazo o reemplazarla si es necesario.
                                </div>
                            )}

                            {yaTieneResolucion && esSoloLectura && (
                                <div className="alerta-info" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '12px', borderRadius: '8px', marginTop: 16 }}>
                                    Resolución Fundada disponible solo para consulta.
                                </div>
                            )}
                        </div>

                        {!esSoloLectura && etapaActual === 'ESPERA_LEGAL' && (
                            <div className="seccion acciones" style={{ display: 'flex', gap: '16px', justifyContent: 'space-between' }}>
                                <button
                                    onClick={abrirModalCancelacion}
                                    disabled={enviandoCancelacion}
                                    style={{
                                        backgroundColor: '#dc2626',
                                        color: 'white',
                                        padding: '12px 24px',
                                        border: 'none',
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        flex: 1
                                    }}
                                >
                                     Cancelar Proceso
                                </button>
                                <button
                                    className="btn-continuar"
                                    onClick={handleAvanzarADisolucion}
                                    disabled={enviando || !puedeAvanzar || !yaTieneResolucion}
                                    style={{
                                        flex: 1
                                    }}
                                >
                                    {puedeAvanzar && yaTieneResolucion
                                        ? 'Avanzar a DISOLUCIÓN'
                                        : !yaTieneResolucion
                                            ? 'Primero suba la Resolución Fundada'
                                            : `Esperar ${diasRestantes} días para avanzar`}
                                </button>
                            </div>
                        )}
                        {!esSoloLectura && !puedeAvanzar && yaTieneResolucion && etapaActual === 'ESPERA_LEGAL' && (
                            <p className="texto-ayuda" style={{ textAlign: 'center', marginTop: '8px' }}>
                                El plazo de espera legal es de 2 meses desde la ratificación.
                            </p>
                        )}
                    </div>

                    <div className="detalle-derecha">
                        <BotonesNavegacion expedienteId={id} etapaActual={etapaActual} />
                        <PipelineVisual etapaActual={getPipelineEtapa()} estado={expediente?.estado} />
                    </div>
                </div>

                {modalReemplazoAbierto && (
                    <div className="modal-overlay" onClick={() => !enviandoReemplazo && setModalReemplazoAbierto(false)}>
                        <div className="modal-contenido" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Reemplazar Resolución Fundada</h3>
                                <button className="modal-cerrar" onClick={() => !enviandoReemplazo && setModalReemplazoAbierto(false)} disabled={enviandoReemplazo}>×</button>
                            </div>
                            <div className="modal-body">
                                <div className="campo">
                                    <label>Motivo del reemplazo <span className="required">*</span></label>
                                    <textarea
                                        value={motivoReemplazo}
                                        onChange={(e) => setMotivoReemplazo(e.target.value)}
                                        placeholder="Ej: Error en la resolución, versión actualizada, etc."
                                        rows="3"
                                        disabled={enviandoReemplazo}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                                    />
                                </div>
                                <div className="campo">
                                    <label>Nuevo archivo PDF <span className="required">*</span></label>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => setArchivoReemplazo(e.target.files[0])}
                                        disabled={enviandoReemplazo}
                                        style={{ width: '100%', padding: '8px' }}
                                    />
                                    {archivoReemplazo && (
                                        <span className="archivo-ok" style={{ display: 'inline-block', marginTop: '8px', fontSize: '12px', color: '#22c55e' }}>
                                             {archivoReemplazo.name}
                                        </span>
                                    )}
                                </div>
                                {mensajeReemplazo && (
                                    <div className={`mensaje ${mensajeReemplazo.tipo}`} style={{ marginTop: '16px' }}>
                                        {mensajeReemplazo.texto}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn-cancelar" onClick={() => setModalReemplazoAbierto(false)} disabled={enviandoReemplazo}>Cancelar</button>
                                <button className="btn-confirmar" onClick={handleReemplazarResolucion} disabled={enviandoReemplazo || !archivoReemplazo || !motivoReemplazo.trim()}>
                                    {enviandoReemplazo ? 'Reemplazando...' : 'Reemplazar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {modalConfirmacionAbierto && (
                    <div className="modal-overlay" onClick={() => !enviando && setModalConfirmacionAbierto(false)}>
                        <div className="modal-contenido" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Confirmar avance a DISOLUCIÓN</h3>
                                <button className="modal-cerrar" onClick={() => !enviando && setModalConfirmacionAbierto(false)} disabled={enviando}>×</button>
                            </div>
                            <div className="modal-body">
                                <p style={{ marginBottom: 16, fontSize: '16px' }}>
                                     Una vez confirmado, el expediente cambiará a la etapa de <strong>DISOLUCIÓN</strong>.
                                </p>
                                <ul style={{ marginLeft: 20, color: '#475569', lineHeight: 1.6 }}>
                                    <li>El expediente pasará a estado ARCHIVADO</li>
                                </ul>
                                <p style={{ marginTop: 16, fontWeight: 500, color: '#dc2626' }}>
                                    Esta acción no se puede deshacer.
                                </p>
                            </div>
                            <div className="modal-footer">
                                <button className="btn-cancelar" onClick={() => setModalConfirmacionAbierto(false)} disabled={enviando}>Cancelar</button>
                                <button className="btn-confirmar" onClick={handleConfirmarAvance} disabled={enviando}>
                                    {enviando ? 'Procesando...' : 'Confirmar avance'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {modalCancelacionAbierto && (
                    <div className="modal-overlay" onClick={() => !enviandoCancelacion && setModalCancelacionAbierto(false)}>
                        <div className="modal-contenido" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Cancelar Proceso</h3>
                                <button className="modal-cerrar" onClick={() => !enviandoCancelacion && setModalCancelacionAbierto(false)} disabled={enviandoCancelacion}>×</button>
                            </div>
                            <div className="modal-body">
                                <p style={{ marginBottom: 16, color: '#dc2626' }}>
                                     Está a punto de CANCELAR el proceso de divorcio.
                                </p>
                                <ul style={{ marginBottom: 20, marginLeft: 20 }}>
                                    <li>El expediente pasará a estado CANCELADO</li>
                                    <li>No hay devolución de dinero</li>
                                    <li>El proceso se concluye definitivamente</li>
                                </ul>
                                <div className="campo">
                                    <label>Motivo de cancelación <span className="required">*</span></label>
                                    <textarea
                                        value={motivoCancelacion}
                                        onChange={(e) => setMotivoCancelacion(e.target.value)}
                                        placeholder="Ej: Los cónyuges se reconciliaron, desistimiento, etc."
                                        rows="3"
                                        disabled={enviandoCancelacion}
                                        style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                                {mensaje && mensaje.tipo === 'error' && (
                                    <div className="mensaje error" style={{ marginTop: 16 }}>{mensaje.texto}</div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn-cancelar" onClick={() => setModalCancelacionAbierto(false)} disabled={enviandoCancelacion}>Cancelar</button>
                                <button className="btn-confirmar" onClick={handleConfirmarCancelacion} disabled={enviandoCancelacion || !motivoCancelacion.trim()} style={{ backgroundColor: '#dc2626' }}>
                                    {enviandoCancelacion ? 'Cancelando...' : 'Sí, cancelar proceso'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {visorAbierto && (
                    <div className="modal-overlay" onClick={() => setVisorAbierto(false)}>
                        <div className="modal-contenido" style={{ width: '80%', maxWidth: '1000px', height: '80vh' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Visualizador de PDF</h3>
                                <button className="modal-cerrar" onClick={() => setVisorAbierto(false)}>×</button>
                            </div>
                            <div className="modal-body" style={{ padding: 0, height: 'calc(100% - 60px)' }}>
                                <iframe
                                    src={pdfUrl}
                                    title="Visor PDF"
                                    style={{ width: '100%', height: '100%', border: 'none' }}
                                />
                            </div>
                            <div className="modal-footer">
                                <button onClick={() => setVisorAbierto(false)}>Cerrar</button>
                            </div>
                        </div>
                    </div>
                )}

            </main>
        </>
    )
}