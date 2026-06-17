import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/modulo3/Sidebar'
import BotonesNavegacion from '../../components/modulo3/BotonesNavegacion'
import PipelineVisual from '../../components/modulo3/PipelineVisual'
import PlazoAlerta from '../../components/modulo3/PlazoAlerta'
import { getExpedienteById, getDocumentosInternos, subirDocumentoInterno, getAudiencias, getPdfUrl, cambiarEstadoExpediente } from '../../services/ProcedimientoService'

// Tamaño máximo permitido para el PDF (10 MB). Ajustar si el backend define otro límite.
const TAMANIO_MAXIMO_PDF = 10 * 1024 * 1024

const esArchivoPdfValido = (archivo) => {
    if (!archivo) return false
    const esPdfPorTipo = archivo.type === 'application/pdf'
    const esPdfPorExtension = (archivo.name || '').toLowerCase().endsWith('.pdf')
    return esPdfPorTipo || esPdfPorExtension
}

export default function DocumentosInternos() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [expediente, setExpediente] = useState(null)
    const [documentosInternos, setDocumentosInternos] = useState([])
    const [audienciaVigente, setAudienciaVigente] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState(null)
    const [subiendo, setSubiendo] = useState(false)
    const [mensaje, setMensaje] = useState(null)
    const [mensajeGlobal, setMensajeGlobal] = useState(null)
    const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
    const [confirmandoAvance, setConfirmandoAvance] = useState(false)
    const [errorSecundario, setErrorSecundario] = useState(null)
    const etapaActual = expediente?.etapa || expediente?.expedientes_estado_actual
    const [modalAbierto, setModalAbierto] = useState(false)
    const [tipoDocumento, setTipoDocumento] = useState('')
    const [numeroDocumento, setNumeroDocumento] = useState('')
    const [fechaElaboracion, setFechaElaboracion] = useState('')
    const [archivo, setArchivo] = useState(null)
    const [modalReemplazoAbierto, setModalReemplazoAbierto] = useState(false)
    const [tipoDocumentoReemplazo, setTipoDocumentoReemplazo] = useState('')
    const [motivoReemplazo, setMotivoReemplazo] = useState('')
    const [archivoReemplazo, setArchivoReemplazo] = useState(null)
    const [enviandoReemplazo, setEnviandoReemplazo] = useState(false)
    const [mensajeReemplazo, setMensajeReemplazo] = useState(null)
    // --- Control de acordeón por tipo de documento ---
    const [pdfAbierto, setPdfAbierto] = useState({
        INFORME_LEGAL: false,
        RESOLUCION_ADMISIBLE: false
    })
    const esSoloLectura = expediente?.estado === 'CANCELADO' || expediente?.estado === 'ARCHIVADO'
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
    const formatFecha = (fecha) => {
        if (!fecha) return '—';
        const partes = fecha.split('T')[0].split('-')
        // Validación de formato: se espera exactamente YYYY-MM-DD (3 partes numéricas)
        const formatoValido = partes.length === 3 && partes.every(p => /^\d+$/.test(p))
        if (!formatoValido) return '—'
        return partes.reverse().join('/');
    }
    const cargar = async () => {
        if (!id) return
        setCargando(true)
        setError(null)
        setErrorSecundario(null)
        try {
            const resExp = await getExpedienteById(id)
            const data = resExp?.data || resExp
            const expedienteData = data?.expediente || data
            setExpediente(expedienteData)
        } catch (err) {
            // Si falla la carga del expediente principal, sí bloqueamos toda la pantalla
            console.error('Error:', err)
            setError(err?.message || 'Error al cargar el expediente')
            setCargando(false)
            return
        }

        // Documentos internos y audiencias se cargan en un bloque separado: si alguno
        // falla, no debe ocultar los datos del expediente que ya cargaron correctamente.
        try {
            const resDocs = await getDocumentosInternos(id)
            const docsData = resDocs?.data || resDocs || []
            setDocumentosInternos(docsData)
        } catch (err) {
            console.error('Error:', err)
            setDocumentosInternos([])
            setErrorSecundario('No se pudieron cargar los documentos internos')
        }

        try {
            const resAudiencias = await getAudiencias(id)
            const audienciasData = resAudiencias?.data || resAudiencias || []
            const audienciaVigente = audienciasData.find(a => a.es_actual === true)
            setAudienciaVigente(audienciaVigente)
        } catch (err) {
            console.error('Error:', err)
            setAudienciaVigente(null)
            setErrorSecundario(prev => prev || 'No se pudieron cargar las audiencias')
        }

        setCargando(false)
    }
    useEffect(() => {
        cargar()
    }, [id])
    const handleSubirDocumento = async () => {
        if (subiendo) return // evita doble disparo por doble click

        if (!tipoDocumento) {
            setMensaje({ tipo: 'error', texto: 'Tipo de documento no especificado' })
            return
        }
        if (!archivo) {
            setMensaje({ tipo: 'error', texto: 'Debe seleccionar un archivo PDF' })
            return
        }
        if (!fechaElaboracion) {
            setMensaje({ tipo: 'error', texto: 'Debe ingresar la fecha de elaboración' })
            return
        }
        if (!esArchivoPdfValido(archivo)) {
            setMensaje({ tipo: 'error', texto: 'Solo se permiten archivos PDF' })
            return
        }
        if (archivo.size > TAMANIO_MAXIMO_PDF) {
            setMensaje({ tipo: 'error', texto: `El archivo supera el tamaño máximo permitido (${TAMANIO_MAXIMO_PDF / (1024 * 1024)} MB)` })
            return
        }
        setSubiendo(true)
        setMensaje(null)
        try {
            await subirDocumentoInterno(id, tipoDocumento, numeroDocumento || '', fechaElaboracion, archivo)
            setMensaje({ tipo: 'success', texto: 'Documento subido correctamente' })
            setTimeout(() => {
                setModalAbierto(false)
                setArchivo(null)
                setNumeroDocumento('')
                setFechaElaboracion('')
                setMensaje(null)
                cargar()
            }, 1500)
        } catch (err) {
            console.error('Error:', err)
            setMensaje({ tipo: 'error', texto: err?.message || 'Error al subir el documento' })
        } finally {
            setSubiendo(false)
        }
    }
    const handleReemplazarDocumento = async () => {
        if (enviandoReemplazo) return // evita doble disparo por doble click

        if (!archivoReemplazo) {
            setMensajeReemplazo({ tipo: 'error', texto: 'Debe seleccionar un archivo PDF' })
            return
        }
        if (!esArchivoPdfValido(archivoReemplazo)) {
            setMensajeReemplazo({ tipo: 'error', texto: 'Solo se permiten archivos PDF' })
            return
        }
        if (archivoReemplazo.size > TAMANIO_MAXIMO_PDF) {
            setMensajeReemplazo({ tipo: 'error', texto: `El archivo supera el tamaño máximo permitido (${TAMANIO_MAXIMO_PDF / (1024 * 1024)} MB)` })
            return
        }
        if (!motivoReemplazo.trim()) {
            setMensajeReemplazo({ tipo: 'error', texto: 'Debe ingresar el motivo del reemplazo' })
            return
        }
        setEnviandoReemplazo(true)
        setMensajeReemplazo(null)
        try {
            await subirDocumentoInterno(id, tipoDocumentoReemplazo, null, new Date().toISOString().split('T')[0], archivoReemplazo, motivoReemplazo)
            setMensajeReemplazo({ tipo: 'success', texto: 'Documento reemplazado correctamente' })
            setTimeout(() => {
                setModalReemplazoAbierto(false)
                setArchivoReemplazo(null)
                setMotivoReemplazo('')
                setMensajeReemplazo(null)
                cargar()
            }, 1500)
        } catch (err) {
            console.error('Error:', err)
            setMensajeReemplazo({ tipo: 'error', texto: err?.message || 'Error al reemplazar el documento' })
        } finally {
            setEnviandoReemplazo(false)
        }
    }
    const abrirModal = (tipo) => {
        if (esSoloLectura) return
        setMensaje(null)
        setArchivo(null)
        setNumeroDocumento('')
        setFechaElaboracion('')
        setTipoDocumento(tipo)
        setModalAbierto(true)
    }
    const abrirModalReemplazo = (tipo) => {
        if (esSoloLectura) return
        setTipoDocumentoReemplazo(tipo)
        setMotivoReemplazo('')
        setArchivoReemplazo(null)
        setMensajeReemplazo(null)
        setModalReemplazoAbierto(true)
    }
    const getDocumentoEstado = (tipo) => {
        const encontrado = documentosInternos.find(doc => doc.tipo_documento === tipo)
        if (encontrado) {
            const fechaSubida = encontrado.subido_en ? new Date(encontrado.subido_en) : null
            const fechaValida = fechaSubida && !Number.isNaN(fechaSubida.getTime())
            return {
                estado: 'subido',
                fecha: fechaValida ? fechaSubida.toLocaleDateString('es-PE') : '—',
                nombre: encontrado.numero_documento || '—',
                archivo: encontrado.ruta_archivo || null
            }
        }
        return { estado: 'pendiente', fecha: null, nombre: null, archivo: null }
    }
    // --- Función para alternar el acordeón ---
    const togglePdf = (tipo) => {
        setPdfAbierto(prev => ({
            ...prev,
            [tipo]: !prev[tipo]
        }))
    }
    const handleVolver = () => {
        navigate(`/modulo3/detalle/${id}`)
    }
    const handleContinuar = () => {
        if (esSoloLectura) return
        if (informeLegal.estado !== 'subido' || resolucionAdmision.estado !== 'subido') {
            setMensajeGlobal({ tipo: 'error', texto: 'Debe subir ambos documentos antes de continuar' })
            return
        }
        setMostrarConfirmacion(true)
    }
    const handleContinuarAceptar = async () => {
        if (confirmandoAvance) return // evita doble disparo por doble click

        setMostrarConfirmacion(false)
        setConfirmandoAvance(true)
        try {
            const data = await cambiarEstadoExpediente(id, 'AUDIENCIA', 'Documentos internos completados')
            if (data?.ok) {
                setMensajeGlobal({ tipo: 'success', texto: 'Etapa cambiada a AUDIENCIA' })
                // Se refresca el estado vía React en lugar de recargar toda la página
                setTimeout(() => cargar(), 1500)
            } else {
                setMensajeGlobal({ tipo: 'error', texto: data?.mensaje || 'Error al avanzar' })
            }
        } catch (error) {
            console.error('Error:', error)
            setMensajeGlobal({ tipo: 'error', texto: 'Error al avanzar la etapa' })
        } finally {
            setConfirmandoAvance(false)
        }
    }
    if (cargando) {
        return (
            <>
                <Sidebar />
                <main className="contenido-modulo3">
                    <div className="pagina-header">
                        <button className="btn-volver" onClick={handleVolver}>← Volver</button>
                        <h1>Documentos Internos</h1>
                    </div>
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
                        <h1>Documentos Internos</h1>
                    </div>
                    <p style={{ color: 'red' }}>Error: {error}</p>
                </main>
            </>
        )
    }
    const informeLegal = getDocumentoEstado('INFORME_LEGAL')
    const resolucionAdmision = getDocumentoEstado('RESOLUCION_ADMISIBLE')
    const disabledButtonStyle = {
        cursor: 'not-allowed',
        opacity: 0.6,
        pointerEvents: 'auto'
    }
    const urlInformeLegal = informeLegal.archivo ? getPdfUrl(informeLegal.archivo) : null
    const puedeVerInformeLegal = Boolean(urlInformeLegal) && urlInformeLegal !== '#'
    const urlResolucionAdmision = resolucionAdmision.archivo ? getPdfUrl(resolucionAdmision.archivo) : null
    const puedeVerResolucionAdmision = Boolean(urlResolucionAdmision) && urlResolucionAdmision !== '#'
    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                
                <div className="detalle-header">
                    <button className="btn-volver" onClick={handleVolver}>← Volver</button>
                    <h1>Documentos Internos</h1>
                </div>
                {mensajeGlobal && (
                    <div className={`mensaje ${mensajeGlobal.tipo}`} style={{ marginBottom: 16 }}>
                        {mensajeGlobal.texto}
                    </div>
                )}
                {errorSecundario && (
                    <div className="mensaje error" style={{ marginBottom: 16 }}>
                        {errorSecundario}
                    </div>
                )}
                <div style={{ display: 'flex', gap: '24px' }}>
                    <div style={{ flex: 2 }}>
                        <PlazoAlerta 
                            expediente={expediente}
                            audienciaActual={audienciaVigente}
                        />
                        <div className="seccion datos-expediente">
                            <h2>Datos del expediente</h2>
                            
                            <div className="subseccion">
                                <h3>Informacion general</h3>
                                <div className="datos-grid">
                                    <div><label>N° Expediente</label><p>{expediente?.numero_expediente || '—'}</p></div>
                                    <div><label>N° Mesa de Partes</label><p>{expediente?.numero_mesa_partes || '—'}</p></div>
                                    <div><label>Etapa actual</label><p>{expediente?.etapa || '—'}</p></div>
                                    <div><label>Fecha de pago</label><p>{expediente?.fecha_pago ? formatFecha(expediente.fecha_pago) : '—'}</p></div>
                                </div>
                            </div>
                            <div className="subseccion">
                                <h3>Solicitante</h3>
                                <div className="datos-grid">
                                    <div><label>Nombre completo</label><p>{expediente?.Solicitante_Nombres || '—'} {expediente?.Solicitante_Apellidos || ''}</p></div>
                                    <div><label>DNI</label><p>{expediente?.Solicitante_Dni || '—'}</p></div>
                                    <div><label>Telefono</label><p>{expediente?.Solicitante_Telefono || '—'}</p></div>
                                    <div><label>Correo electronico</label><p>{expediente?.Solicitante_Correo || '—'}</p></div>
                                    <div><label>Direccion</label><p>{expediente?.Solicitante_Direccion || '—'}</p></div>
                                </div>
                            </div>
                            <div className="subseccion">
                                <h3>Demandado</h3>
                                <div className="datos-grid">
                                    <div><label>Nombre completo</label><p>{expediente?.Demandado_Nombres || '—'} {expediente?.Demandado_Apellidos || ''}</p></div>
                                    <div><label>DNI</label><p>{expediente?.Demandado_Dni || '—'}</p></div>
                                    <div><label>Telefono</label><p>{expediente?.Demandado_Telefono || '—'}</p></div>
                                    <div><label>Correo electronico</label><p>{expediente?.Demandado_Correo || '—'}</p></div>
                                    <div><label>Direccion</label><p>{expediente?.Demandado_Direccion || '—'}</p></div>
                                </div>
                            </div>
                        </div>
                        <div className="seccion documentos-subida">
                            <h2>Documentos requeridos</h2>
                            <div className="documentos-lista">
                                {/* ===== INFORME LEGAL ===== */}
                                <div className="documento-item">
                                    <div className="documento-info">
                                        <div className="documento-icono"></div>
                                        <div>
                                            <div className="documento-nombre">INFORME LEGAL</div>
                                            <div className="documento-descripcion">Documento que sustenta la admision del expediente</div>
                                        </div>
                                    </div>
                                    <div className="documento-estado">
                                        {informeLegal.estado === 'subido' ? (
                                            <span className="estado-subido">Subido {informeLegal.fecha}</span>
                                        ) : (
                                            <span className="estado-pendiente">Pendiente</span>
                                        )}
                                    </div>
                                    <div className="documento-acciones">
                                        {informeLegal.estado === 'subido' ? (
                                            <>
                                                {/* ===== BOTÓN ▶ CON ESTILO MEJORADO ===== */}
                                                <button 
                                                    className="btn-ver" 
                                                    onClick={() => togglePdf('INFORME_LEGAL')}
                                                    style={{
                                                        background: '#0f3b6f',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        width: '30px',
                                                        height: '30px',
                                                        color: 'white',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 'bold',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transform: pdfAbierto.INFORME_LEGAL ? 'rotate(90deg)' : 'rotate(0deg)',
                                                        transition: 'transform 0.2s'
                                                    }}
                                                >
                                                    ▶
                                                </button>
                                                <button 
                                                    className="btn-reemplazar" 
                                                    onClick={() => abrirModalReemplazo('INFORME_LEGAL')}
                                                    disabled={esSoloLectura}
                                                    style={esSoloLectura ? disabledButtonStyle : {}}
                                                >
                                                    Reemplazar
                                                </button>
                                            </>
                                        ) : (
                                            <button 
                                                className="btn-subir" 
                                                onClick={() => abrirModal('INFORME_LEGAL')}
                                                disabled={esSoloLectura}
                                                style={esSoloLectura ? disabledButtonStyle : {}}
                                            >
                                                Subir
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {/* ===== ACORDEÓN INFORME LEGAL (diseño mejorado) ===== */}
                                {informeLegal.estado === 'subido' && pdfAbierto.INFORME_LEGAL && (
                                    puedeVerInformeLegal ? (
                                        <div style={{
                                            marginTop: '8px',
                                            marginBottom: '12px',
                                            border: '1.5px solid #9ae6b4',
                                            borderRadius: '10px',
                                            overflow: 'hidden',
                                        }}>
                                            {/* Cabecera del visor */}
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '8px 16px',
                                                background: '#0f3b6f',
                                            }}>
                                                <span style={{ color: '#c7a03a', fontSize: '0.78rem', fontWeight: 600 }}>
                                                    INFORME LEGAL
                                                </span>
                                                <a
                                                    href={urlInformeLegal}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{ color: 'white', fontSize: '0.75rem', textDecoration: 'none' }}
                                                >
                                                    Abrir en nueva pestaña ↗
                                                </a>
                                            </div>
                                            {/* Contenedor con fondo oscuro (igual que en DetalleExpediente) */}
                                            <div style={{ background: '#1a1a2e' }}>
                                                <iframe
                                                    src={urlInformeLegal}
                                                    title="Informe Legal"
                                                    style={{ width: '100%', height: '500px', border: 'none', display: 'block' }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{
                                            marginTop: '8px',
                                            marginBottom: '12px',
                                            border: '1.5px solid #feb2b2',
                                            borderRadius: '10px',
                                            background: '#fff5f5',
                                            padding: '12px 16px',
                                        }}>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#c53030' }}>
                                                No se encontró un archivo válido para este documento.
                                            </p>
                                        </div>
                                    )
                                )}
                                {/* ===== RESOLUCION DE ADMISION ===== */}
                                <div className="documento-item">
                                    <div className="documento-info">
                                        <div className="documento-icono"></div>
                                        <div>
                                            <div className="documento-nombre">RESOLUCION DE ADMISION</div>
                                            <div className="documento-descripcion">Resolucion que admite el expediente a tramite</div>
                                        </div>
                                    </div>
                                    <div className="documento-estado">
                                        {resolucionAdmision.estado === 'subido' ? (
                                            <span className="estado-subido">Subido {resolucionAdmision.fecha}</span>
                                        ) : (
                                            <span className="estado-pendiente">Pendiente</span>
                                        )}
                                    </div>
                                    <div className="documento-acciones">
                                        {resolucionAdmision.estado === 'subido' ? (
                                            <>
                                                {/* ===== BOTÓN ▶ CON ESTILO MEJORADO ===== */}
                                                <button 
                                                    className="btn-ver" 
                                                    onClick={() => togglePdf('RESOLUCION_ADMISIBLE')}
                                                    style={{
                                                        background: '#0f3b6f',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        width: '30px',
                                                        height: '30px',
                                                        color: 'white',
                                                        cursor: 'pointer',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 'bold',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        transform: pdfAbierto.RESOLUCION_ADMISIBLE ? 'rotate(90deg)' : 'rotate(0deg)',
                                                        transition: 'transform 0.2s'
                                                    }}
                                                >
                                                    ▶
                                                </button>
                                                <button 
                                                    className="btn-reemplazar" 
                                                    onClick={() => abrirModalReemplazo('RESOLUCION_ADMISIBLE')}
                                                    disabled={esSoloLectura}
                                                    style={esSoloLectura ? disabledButtonStyle : {}}
                                                >
                                                    Reemplazar
                                                </button>
                                            </>
                                        ) : (
                                            <button 
                                                className="btn-subir" 
                                                onClick={() => abrirModal('RESOLUCION_ADMISIBLE')}
                                                disabled={esSoloLectura}
                                                style={esSoloLectura ? disabledButtonStyle : {}}
                                            >
                                                Subir
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {/* ===== ACORDEÓN RESOLUCION ADMISION (diseño mejorado) ===== */}
                                {resolucionAdmision.estado === 'subido' && pdfAbierto.RESOLUCION_ADMISIBLE && (
                                    puedeVerResolucionAdmision ? (
                                        <div style={{
                                            marginTop: '8px',
                                            marginBottom: '12px',
                                            border: '1.5px solid #9ae6b4',
                                            borderRadius: '10px',
                                            overflow: 'hidden',
                                        }}>
                                            {/* Cabecera del visor */}
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '8px 16px',
                                                background: '#0f3b6f',
                                            }}>
                                                <span style={{ color: '#c7a03a', fontSize: '0.78rem', fontWeight: 600 }}>
                                                    RESOLUCIÓN DE ADMISIÓN
                                                </span>
                                                <a
                                                    href={urlResolucionAdmision}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{ color: 'white', fontSize: '0.75rem', textDecoration: 'none' }}
                                                >
                                                    Abrir en nueva pestaña ↗
                                                </a>
                                            </div>
                                            {/* Contenedor con fondo oscuro */}
                                            <div style={{ background: '#1a1a2e' }}>
                                                <iframe
                                                    src={urlResolucionAdmision}
                                                    title="Resolucion de Admision"
                                                    style={{ width: '100%', height: '500px', border: 'none', display: 'block' }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div style={{
                                            marginTop: '8px',
                                            marginBottom: '12px',
                                            border: '1.5px solid #feb2b2',
                                            borderRadius: '10px',
                                            background: '#fff5f5',
                                            padding: '12px 16px',
                                        }}>
                                            <p style={{ margin: 0, fontSize: '0.8rem', color: '#c53030' }}>
                                                No se encontró un archivo válido para este documento.
                                            </p>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>
                        {(etapaActual === 'DOCUMENTOS_INTERNOS' || etapaActual === 'EVALUACION') && (
                            <div className="seccion acciones">
                                <button 
                                    className="btn-continuar"
                                    onClick={handleContinuar}
                                    disabled={esSoloLectura || informeLegal.estado !== 'subido' || resolucionAdmision.estado !== 'subido' || confirmandoAvance}
                                    style={esSoloLectura ? disabledButtonStyle : {}}
                                >
                                    {confirmandoAvance ? 'Procesando...' : 'Continuar a Programar Audiencia'}
                                </button>
                            </div>
                        )}
                    </div>
                    <div style={{ flex: 1 }}>
                        <BotonesNavegacion 
                            expedienteId={id} 
                            etapaActual={etapaActual} 
                            documentosInternosCompletados={informeLegal.estado === 'subido' && resolucionAdmision.estado === 'subido'}
                        />
                        <PipelineVisual etapaActual={getPipelineEtapa()} estado={expediente?.estado} />
                    </div>
                </div>
                {modalAbierto && (
                    <div className="modal-overlay" onClick={() => !subiendo && setModalAbierto(false)}>
                        <div className="modal-contenido" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Subir {tipoDocumento === 'INFORME_LEGAL' ? 'Informe Legal' : 'Resolucion de Admision'}</h3>
                                <button className="modal-cerrar" onClick={() => !subiendo && setModalAbierto(false)} disabled={subiendo}>×</button>
                            </div>
                            <div className="modal-body">
                                <div className="campo">
                                    <label>N° de documento (opcional)</label>
                                    <input type="text" value={numeroDocumento} onChange={(e) => setNumeroDocumento(e.target.value)} placeholder="Ej: INF-001-2026" disabled={subiendo} />
                                </div>
                                <div className="campo">
                                    <label>Fecha de elaboracion *</label>
                                    <input type="date" value={fechaElaboracion} onChange={(e) => setFechaElaboracion(e.target.value)} disabled={subiendo} required />
                                </div>
                                <div className="campo">
                                    <label>Archivo PDF *</label>
                                    <input type="file" accept=".pdf,application/pdf" onChange={(e) => setArchivo(e.target.files[0])} disabled={subiendo} />
                                </div>
                                {mensaje && <div className={`mensaje ${mensaje.tipo}`}>{mensaje.texto}</div>}
                            </div>
                            <div className="modal-footer">
                                <button className="btn-cancelar" onClick={() => setModalAbierto(false)} disabled={subiendo}>Cancelar</button>
                                <button className="btn-confirmar" onClick={handleSubirDocumento} disabled={subiendo || !archivo || !fechaElaboracion}>
                                    {subiendo ? 'Subiendo...' : 'Subir documento'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {modalReemplazoAbierto && (
                    <div className="modal-overlay" onClick={() => !enviandoReemplazo && setModalReemplazoAbierto(false)}>
                        <div className="modal-contenido" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Reemplazar {tipoDocumentoReemplazo === 'INFORME_LEGAL' ? 'Informe Legal' : 'Resolucion de Admision'}</h3>
                                <button className="modal-cerrar" onClick={() => !enviandoReemplazo && setModalReemplazoAbierto(false)} disabled={enviandoReemplazo}>×</button>
                            </div>
                            <div className="modal-body">
                                <div className="campo">
                                    <label>Motivo del reemplazo <span className="required">*</span></label>
                                    <textarea value={motivoReemplazo} onChange={(e) => setMotivoReemplazo(e.target.value)} rows="3" disabled={enviandoReemplazo} />
                                </div>
                                <div className="campo">
                                    <label>Nuevo archivo PDF <span className="required">*</span></label>
                                    <input type="file" accept=".pdf,application/pdf" onChange={(e) => setArchivoReemplazo(e.target.files[0])} disabled={enviandoReemplazo} />
                                    {archivoReemplazo && <span className="archivo-ok">✅ {archivoReemplazo.name}</span>}
                                </div>
                                {mensajeReemplazo && <div className={`mensaje ${mensajeReemplazo.tipo}`}>{mensajeReemplazo.texto}</div>}
                            </div>
                            <div className="modal-footer">
                                <button className="btn-cancelar" onClick={() => setModalReemplazoAbierto(false)} disabled={enviandoReemplazo}>Cancelar</button>
                                <button className="btn-confirmar" onClick={handleReemplazarDocumento} disabled={enviandoReemplazo || !archivoReemplazo || !motivoReemplazo.trim()}>
                                    {enviandoReemplazo ? 'Reemplazando...' : 'Reemplazar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                {mostrarConfirmacion && (
                    <div className="modal-overlay" onClick={() => setMostrarConfirmacion(false)}>
                        <div className="modal-contenido" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Confirmar avance a Audiencia</h3>
                                <button className="modal-cerrar" onClick={() => setMostrarConfirmacion(false)}>×</button>
                            </div>
                            <div className="modal-body">
                                <p>Una vez que confirme, el expediente pasará a la etapa de <strong>AUDIENCIA</strong>.</p>
                                <p>¿Está seguro de que ambos documentos están correctamente subidos?</p>
                            </div>
                            <div className="modal-footer">
                                <button className="btn-cancelar" onClick={() => setMostrarConfirmacion(false)} disabled={confirmandoAvance}>Cancelar</button>
                                <button className="btn-confirmar" onClick={handleContinuarAceptar} disabled={confirmandoAvance}>
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