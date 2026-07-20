import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/modulo3/Sidebar'
import BotonesNavegacion from '../../components/modulo3/BotonesNavegacion'
import PipelineVisual from '../../components/modulo3/PipelineVisual'
import PlazoAlerta from '../../components/modulo3/PlazoAlerta'
import { 
    getExpedienteById, 
    getDocumentosInternos, 
    subirDocumentoInterno, 
    getAudiencias, 
    getPdfUrl, 
    cambiarEstadoExpediente,
    obtenerUltimoCorrelativo,
    verificarUnicidadNumeroDocumento
} from '../../services/ProcedimientoService'

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
    const [sufijoDocumento, setSufijoDocumento] = useState('') 
    const [fechaElaboracion, setFechaElaboracion] = useState('')
    const [archivo, setArchivo] = useState(null)
    const [vistaPreviaUrl, setVistaPreviaUrl] = useState(null)
    const [previaAbierta, setPreviaAbierta] = useState(false) 
    const [cargandoCorrelativo, setCargandoCorrelativo] = useState(false)
    const [errorUnicidad, setErrorUnicidad] = useState('')
    const [mostrarConfirmacionSubida, setMostrarConfirmacionSubida] = useState(false)

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
            setError(err?.message || 'Error al cargar el expediente')
            setCargando(false)
            return
        }

        try {
            const resDocs = await getDocumentosInternos(id)
            const docsData = resDocs?.data || resDocs || []
            setDocumentosInternos(docsData)
        } catch (err) {
            setDocumentosInternos([])
            setErrorSecundario('No se pudieron cargar los documentos internos')
        }

        try {
            const resAudiencias = await getAudiencias(id)
            const audienciasData = resAudiencias?.data || resAudiencias || []
            const audienciaVigente = audienciasData.find(a => a.es_actual === true)
            setAudienciaVigente(audienciaVigente)
        } catch (err) {
            setAudienciaVigente(null)
            setErrorSecundario(prev => prev || 'No se pudieron cargar las audiencias')
        }

        setCargando(false)
    }

    useEffect(() => {
        cargar()
    }, [id])

    const obtenerCorrelativoYGenerar = async (tipo) => {
    setCargandoCorrelativo(true)
    setErrorUnicidad('')
    try {
        
        let tipoCorrelativo = tipo;
        if (tipo === 'RESOLUCION_ADMISIBLE') {
            tipoCorrelativo = 'RESOLUCION';
        }
        
        const ultimo = await obtenerUltimoCorrelativo(tipoCorrelativo);
        
        const anio = new Date().getFullYear();
        const numeroFormateado = String(ultimo + 1).padStart(3, '0');
        
        if (tipo === 'INFORME_LEGAL') {
            setSufijoDocumento(`-${anio}-GAJ-SCDU-MDEP`);
        } else if (tipo === 'RESOLUCION_ADMISIBLE') {
            setSufijoDocumento(`-${anio}-MDEP`);
        }
        setNumeroDocumento(numeroFormateado);
    } catch (err) {
        setNumeroDocumento('');
        setSufijoDocumento('');
    } finally {
        setCargandoCorrelativo(false);
    }
};

    const abrirModal = async (tipo) => {
        if (esSoloLectura) return
        setMensaje(null)
        setErrorUnicidad('')
        setArchivo(null)
        setVistaPreviaUrl(null)
        setPreviaAbierta(false)
        setTipoDocumento(tipo)
        setFechaElaboracion(new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' }))
        setMostrarConfirmacionSubida(false)
        setModalAbierto(true)
        await obtenerCorrelativoYGenerar(tipo)
    }

    const cerrarModal = () => {
        if (subiendo) return
        setModalAbierto(false)
        setArchivo(null)
        setVistaPreviaUrl(null)
        setPreviaAbierta(false)
        setNumeroDocumento('')
        setSufijoDocumento('')
        setFechaElaboracion('')
        setMensaje(null)
        setErrorUnicidad('')
        setMostrarConfirmacionSubida(false)
        if (vistaPreviaUrl) {
            URL.revokeObjectURL(vistaPreviaUrl)
        }
    }

    const handleArchivoChange = (e) => {
        const file = e.target.files[0]
        setMensaje(null)
        setErrorUnicidad('')
        if (!file) {
            setArchivo(null)
            if (vistaPreviaUrl) {
                URL.revokeObjectURL(vistaPreviaUrl)
                setVistaPreviaUrl(null)
                setPreviaAbierta(false)
            }
            return
        }
        if (!esArchivoPdfValido(file)) {
            setMensaje({ tipo: 'error', texto: 'Solo se permiten archivos PDF' })
            setArchivo(null)
            setPreviaAbierta(false)
            return
        }
        if (file.size > TAMANIO_MAXIMO_PDF) {
            setMensaje({ tipo: 'error', texto: `El archivo supera el tamaño máximo permitido (${TAMANIO_MAXIMO_PDF / (1024 * 1024)} MB)` })
            setArchivo(null)
            setPreviaAbierta(false)
            return
        }
        if (vistaPreviaUrl) {
            URL.revokeObjectURL(vistaPreviaUrl)
        }
        const url = URL.createObjectURL(file)
        setVistaPreviaUrl(url)
        setArchivo(file)
        setPreviaAbierta(true)
    }

    const verificarUnicidad = async (numeroCompleto) => {
        if (!numeroCompleto.trim()) {
            setErrorUnicidad('Debe ingresar un número de documento')
            return false
        }
        try {
            const existe = await verificarUnicidadNumeroDocumento(tipoDocumento, numeroCompleto)
            if (existe) {
                setErrorUnicidad('Este número de documento ya existe en el sistema. Debe ser único.')
                return false
            }
            setErrorUnicidad('')
            return true
        } catch (err) {
            setErrorUnicidad('Error al verificar unicidad. Intente de nuevo.')
            return false
        }
    }

    const handleSubirDocumento = async () => {
        if (subiendo) return

        if (!tipoDocumento) {
            setMensaje({ tipo: 'error', texto: 'Tipo de documento no especificado' })
            return
        }
        if (!archivo) {
            setMensaje({ tipo: 'error', texto: 'Debe seleccionar un archivo PDF' })
            return
        }
        if (!numeroDocumento.trim()) {
            setMensaje({ tipo: 'error', texto: 'Debe ingresar el número de documento' })
            return
        }

        const numeroCompleto = `${numeroDocumento}${sufijoDocumento}`
        const esUnico = await verificarUnicidad(numeroCompleto)
        if (!esUnico) return

        setMostrarConfirmacionSubida(true)
    }

    const confirmarSubida = async () => {
        setMostrarConfirmacionSubida(false)
        setSubiendo(true)
        setMensaje(null)

        try {
            const numeroCompleto = `${numeroDocumento}${sufijoDocumento}`
            await subirDocumentoInterno(
                id,
                tipoDocumento,
                numeroCompleto,
                fechaElaboracion,
                archivo
            )
            setMensaje({ tipo: 'success', texto: 'Documento subido correctamente' })
            setTimeout(() => {
                cerrarModal()
                cargar()
            }, 1500)
        } catch (err) {
            const mensajeError = err?.message?.replace('Error: ', '') || 'Error al subir el documento'
            setMensaje({ tipo: 'error', texto: mensajeError })
        } finally {
            setSubiendo(false)
        }
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

    const togglePdf = (tipo) => {
        setPdfAbierto(prev => ({
            ...prev,
            [tipo]: !prev[tipo]
        }))
    }

    const togglePrevia = () => {
        setPreviaAbierta(!previaAbierta)
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
        if (confirmandoAvance) return
        setMostrarConfirmacion(false)
        setConfirmandoAvance(true)
        try {
            const data = await cambiarEstadoExpediente(id, 'AUDIENCIA', 'Documentos internos completados')
            if (data?.ok) {
                setMensajeGlobal({ tipo: 'success', texto: 'Etapa cambiada a AUDIENCIA' })
                setTimeout(() => cargar(), 1500)
            } else {
                setMensajeGlobal({ tipo: 'error', texto: data?.mensaje || 'Error al avanzar' })
            }
        } catch (error) {
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
                                            <span className="estado-subido">
                                                Subido {informeLegal.fecha}
                                                {informeLegal.nombre && ` - N° ${informeLegal.nombre}`}
                                            </span>
                                        ) : (
                                            <span className="estado-pendiente">Pendiente</span>
                                        )}
                                    </div>
                                    <div className="documento-acciones">
                                        {informeLegal.estado === 'subido' ? (
                                            <>
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

                                {informeLegal.estado === 'subido' && pdfAbierto.INFORME_LEGAL && (
                                    puedeVerInformeLegal ? (
                                        <div style={{
                                            marginTop: '8px',
                                            marginBottom: '12px',
                                            border: '1.5px solid #9ae6b4',
                                            borderRadius: '10px',
                                            overflow: 'hidden',
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '8px 16px',
                                                background: '#0f3b6f',
                                            }}>
                                                <span style={{ color: '#c7a03a', fontSize: '0.78rem', fontWeight: 600 }}>
                                                    INFORME LEGAL {informeLegal.nombre && `- ${informeLegal.nombre}`}
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
                                            <span className="estado-subido">
                                                Subido {resolucionAdmision.fecha}
                                                {resolucionAdmision.nombre && ` - N° ${resolucionAdmision.nombre}`}
                                            </span>
                                        ) : (
                                            <span className="estado-pendiente">Pendiente</span>
                                        )}
                                    </div>
                                    <div className="documento-acciones">
                                        {resolucionAdmision.estado === 'subido' ? (
                                            <>
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

                                {resolucionAdmision.estado === 'subido' && pdfAbierto.RESOLUCION_ADMISIBLE && (
                                    puedeVerResolucionAdmision ? (
                                        <div style={{
                                            marginTop: '8px',
                                            marginBottom: '12px',
                                            border: '1.5px solid #9ae6b4',
                                            borderRadius: '10px',
                                            overflow: 'hidden',
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '8px 16px',
                                                background: '#0f3b6f',
                                            }}>
                                                <span style={{ color: '#c7a03a', fontSize: '0.78rem', fontWeight: 600 }}>
                                                    RESOLUCIÓN DE ADMISIÓN {resolucionAdmision.nombre && `- ${resolucionAdmision.nombre}`}
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
                    <div className="modal-overlay" onClick={cerrarModal}>
                        <div className="modal-contenido" style={{ maxWidth: '800px', width: '90%' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>
                                    Subir {tipoDocumento === 'INFORME_LEGAL' ? 'Informe Legal' : 'Resolución de Admisión'}
                                </h3>
                                <button className="modal-cerrar" onClick={cerrarModal} disabled={subiendo}>×</button>
                            </div>
                            <div className="modal-body">

                                <div className="campo">
                                    <label>N° de documento <span className="required">*</span></label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                                        <input
                                            type="text"
                                            value={numeroDocumento}
                                            onChange={(e) => {
                                                const valor = e.target.value.replace(/\D/g, '').slice(0, 3)
                                                setNumeroDocumento(valor)
                                                setErrorUnicidad('')
                                            }}
                                            placeholder="003"
                                            disabled={subiendo || cargandoCorrelativo}
                                            style={{ 
                                                width: '80px', 
                                                textAlign: 'center', 
                                                fontSize: '1rem',
                                                padding: '8px 4px'
                                            }}
                                            inputMode="numeric"
                                            pattern="[0-9]*"
                                            className={errorUnicidad ? 'input-error' : ''}
                                        />
                                        <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#4a5568' }}>
                                            {sufijoDocumento || '-2026-GAJ-SCDU-MDEP'}
                                        </span>
                                        {cargandoCorrelativo && <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>Generando...</span>}
                                    </div>
                                    {errorUnicidad && (
                                        <span className="campo-ayuda--error" style={{ color: '#dc2626', fontSize: '0.8rem', display: 'block', marginTop: '4px' }}>
                                            {errorUnicidad}
                                        </span>
                                    )}
                                    <span className="campo-ayuda" style={{ display: 'block', marginTop: '4px' }}>
                                        Ingrese solo los 3 dígitos (ej: 003). El año y sufijo se generan automáticamente.
                                    </span>
                                </div>

                                <div className="campo">
                                    <label>Fecha de elaboración <span className="required">*</span></label>
                                    <input
                                        type="date"
                                        value={fechaElaboracion}
                                        disabled
                                        style={{ background: '#f3f4f6', cursor: 'not-allowed' }}
                                    />
                                    <span className="campo-ayuda">La fecha se fija automáticamente al día de hoy.</span>
                                </div>

                                <div className="campo">
                                    <label>Archivo PDF <span className="required">*</span></label>
                                    <input
                                        type="file"
                                        accept=".pdf,application/pdf"
                                        onChange={handleArchivoChange}
                                        disabled={subiendo}
                                    />
                                    {mensaje && mensaje.tipo === 'error' && (
                                        <div className="error-mensaje" style={{ marginTop: '4px' }}>{mensaje.texto}</div>
                                    )}
                                </div>

                                {vistaPreviaUrl && (
                                    <div className="campo" style={{ marginTop: '12px' }}>
                                        <label>Vista previa del documento</label>
                                        <div style={{
                                            border: '1.5px solid #9ae6b4',
                                            borderRadius: '10px',
                                            overflow: 'hidden',
                                        }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px 16px',
                                                background: '#f0fff4',
                                            }}>
                                                <button
                                                    onClick={togglePrevia}
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
                                                        transform: previaAbierta ? 'rotate(90deg)' : 'rotate(0deg)',
                                                        transition: 'transform 0.2s',
                                                    }}
                                                >
                                                    ▶
                                                </button>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#0f3b6f', margin: 0 }}>
                                                        {tipoDocumento === 'INFORME_LEGAL' ? 'Informe Legal' : 'Resolución de Admisión'}
                                                    </p>
                                                    <p style={{ fontSize: '0.73rem', color: '#4a5568', margin: '2px 0 0' }}>
                                                        {archivo?.name}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span style={{
                                                        padding: '4px 12px',
                                                        borderRadius: '20px',
                                                        fontSize: '0.78rem',
                                                        fontWeight: 700,
                                                        background: '#fef3c7',
                                                        color: '#92400e',
                                                        border: '1px solid #f6ad55'
                                                    }}>
                                                        Previsualizando
                                                    </span>
                                                </div>
                                            </div>

                                            {previaAbierta && (
                                                <div style={{ borderTop: '2px solid #0f3b6f', background: '#1a1a2e' }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '8px 16px',
                                                        background: '#0f3b6f',
                                                    }}>
                                                        <span style={{ color: '#c7a03a', fontSize: '0.78rem', fontWeight: 600 }}>
                                                            {tipoDocumento === 'INFORME_LEGAL' ? 'Informe Legal' : 'Resolución de Admisión'} (previsualización)
                                                        </span>
                                                        <a
                                                            href={vistaPreviaUrl}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            style={{ color: 'white', fontSize: '0.75rem', textDecoration: 'none' }}
                                                        >
                                                            Abrir en nueva pestaña ↗
                                                        </a>
                                                    </div>
                                                    <iframe
                                                        src={vistaPreviaUrl}
                                                        title="Vista previa"
                                                        style={{ width: '100%', height: '400px', border: 'none', display: 'block' }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {mensaje && mensaje.tipo === 'success' && (
                                    <div className="exito-mensaje" style={{ marginTop: '12px' }}>{mensaje.texto}</div>
                                )}

                            </div>

                            <div className="modal-footer">
                                <button className="btn-cancelar" onClick={cerrarModal} disabled={subiendo}>
                                    Cancelar
                                </button>
                                <button
                                    className="btn-confirmar"
                                    onClick={handleSubirDocumento}
                                    disabled={subiendo || !archivo || !numeroDocumento.trim() || cargandoCorrelativo || !!errorUnicidad}
                                >
                                    {subiendo ? 'Subiendo...' : 'Subir documento'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {mostrarConfirmacionSubida && (
                    <div className="modal-overlay" onClick={() => setMostrarConfirmacionSubida(false)}>
                        <div className="modal-contenido" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Confirmar subida</h3>
                                <button className="modal-cerrar" onClick={() => setMostrarConfirmacionSubida(false)}>×</button>
                            </div>
                            <div className="modal-body">
                                <p style={{ marginBottom: '8px' }}>
                                    ¿Está seguro de subir el siguiente documento?
                                </p>
                                <div style={{ background: '#f3f4f6', padding: '12px', borderRadius: '8px' }}>
                                    <p><strong>Tipo:</strong> {tipoDocumento === 'INFORME_LEGAL' ? 'Informe Legal' : 'Resolución de Admisión'}</p>
                                    <p><strong>N° de documento:</strong> {numeroDocumento}{sufijoDocumento}</p>
                                    <p><strong>Archivo:</strong> {archivo?.name}</p>
                                    <p><strong>Fecha:</strong> {fechaElaboracion}</p>
                                </div>
                                <p style={{ marginTop: '12px', color: '#dc2626', fontSize: '0.9rem' }}>
                                    Esta acción no se puede deshacer.
                                </p>
                            </div>
                            <div className="modal-footer">
                                <button className="btn-cancelar" onClick={() => setMostrarConfirmacionSubida(false)}>
                                    Cancelar
                                </button>
                                <button className="btn-confirmar" onClick={confirmarSubida} disabled={subiendo}>
                                    {subiendo ? 'Subiendo...' : 'Confirmar subida'}
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