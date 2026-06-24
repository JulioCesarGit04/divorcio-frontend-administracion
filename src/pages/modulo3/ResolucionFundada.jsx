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
    cambiarEstadoExpediente,
    obtenerUltimoCorrelativo,
    verificarUnicidadNumeroDocumento
} from '../../services/ProcedimientoService'
import '../../styles/modulo3/resolucion-fundada.css'

const TAMANIO_MAXIMO_PDF = 10 * 1024 * 1024

const getFechaPeru = () => {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Lima' })
}

const esArchivoPdfValido = (archivo) => {
    if (!archivo) return false
    const esPdfPorTipo = archivo.type === 'application/pdf'
    const esPdfPorExtension = (archivo.name || '').toLowerCase().endsWith('.pdf')
    return esPdfPorTipo || esPdfPorExtension
}

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
    const [vistaPreviaUrl, setVistaPreviaUrl] = useState(null)
    const [previaAbierta, setPreviaAbierta] = useState(false)
    const [numeroDocumento, setNumeroDocumento] = useState('')
    const [sufijoDocumento, setSufijoDocumento] = useState('')
    const [fechaElaboracion, setFechaElaboracion] = useState(getFechaPeru())
    const [diasRestantes, setDiasRestantes] = useState(null)
    const [puedeAvanzar, setPuedeAvanzar] = useState(false)
    const [cargandoCorrelativo, setCargandoCorrelativo] = useState(false)
    const [errorUnicidad, setErrorUnicidad] = useState('')
    const [mostrarConfirmacionSubida, setMostrarConfirmacionSubida] = useState(false)
    const [modalConfirmacionAbierto, setModalConfirmacionAbierto] = useState(false)
    const [modalCancelacionAbierto, setModalCancelacionAbierto] = useState(false)
    const [motivoCancelacion, setMotivoCancelacion] = useState('')
    const [enviandoCancelacion, setEnviandoCancelacion] = useState(false)
    const [acordeonAbierto, setAcordeonAbierto] = useState(false)

    const toggleAcordeon = () => {
        setAcordeonAbierto(!acordeonAbierto)
    }

    const togglePrevia = () => {
        setPreviaAbierta(!previaAbierta)
    }

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

    const generarCorrelativo = async () => {
        setCargandoCorrelativo(true)
        setErrorUnicidad('')
        try {
            const ultimo = await obtenerUltimoCorrelativo('RESOLUCION')
            const anio = new Date().getFullYear()
            const numero = String(ultimo + 1).padStart(3, '0')
            setNumeroDocumento(numero)
            setSufijoDocumento(`-${anio}-MDEP`)
        } catch (err) {
            console.error('Error al generar correlativo:', err)
            setNumeroDocumento('')
            setSufijoDocumento('')
        } finally {
            setCargandoCorrelativo(false)
        }
    }

    useEffect(() => {
        const cargar = async () => {
            if (!id) return
            setCargando(true)
            try {
                const resExp = await getExpedienteById(id)
                const data = resExp?.data || resExp
                const expedienteData = data?.expediente || data
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

                const resolucion = resoluciones[0] || null
                setResolucionFundada(resolucion)

                if (resolucion) {
                    const num = resolucion.numero_documento || ''
                    const match = num.match(/^(\d{3})(-.+)$/)
                    if (match) {
                        setNumeroDocumento(match[1])
                        setSufijoDocumento(match[2])
                    } else {
                        setNumeroDocumento(num)
                        setSufijoDocumento('')
                    }
                    if (resolucion.fecha_elaboracion) {
                        setFechaElaboracion(resolucion.fecha_elaboracion.split('T')[0])
                    }
                } else {
                    await generarCorrelativo()
                    setFechaElaboracion(getFechaPeru())
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

    const handleSubirResolucion = async () => {
        if (!archivo) {
            setMensaje({ tipo: 'error', texto: 'Debe seleccionar un archivo PDF' })
            return
        }
        if (!numeroDocumento.trim()) {
            setMensaje({ tipo: 'error', texto: 'Debe ingresar el número de resolución' })
            return
        }

        const numeroCompleto = `${numeroDocumento}${sufijoDocumento}`

        try {
            const existe = await verificarUnicidadNumeroDocumento('RESOLUCION_FUNDADA', numeroCompleto)
            if (existe) {
                setErrorUnicidad('Este número de Resolución Fundada ya existe. Debe ser único.')
                return
            }
            setErrorUnicidad('')
        } catch (err) {
            setMensaje({ tipo: 'error', texto: 'Error al verificar unicidad. Intente de nuevo.' })
            return
        }

        setMostrarConfirmacionSubida(true)
    }

    const confirmarSubida = async () => {
        setMostrarConfirmacionSubida(false)
        setEnviando(true)
        setMensaje(null)

        try {
            const numeroCompleto = `${numeroDocumento}${sufijoDocumento}`
            await subirDocumentoInterno(id, 'RESOLUCION_FUNDADA', numeroCompleto, fechaElaboracion, archivo, getUsuarioLogueado())
            setMensaje({ tipo: 'success', texto: 'Resolución Fundada subida correctamente' })
            setTimeout(() => window.location.reload(), 1500)
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.message || 'Error al subir la resolución' })
        } finally {
            setEnviando(false)
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
                                <div style={{
                                    border: '1.5px solid #9ae6b4',
                                    borderRadius: '10px',
                                    overflow: 'hidden',
                                    marginBottom: 20,
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        padding: '12px 16px',
                                        background: '#f0fff4',
                                    }}>
                                        <button
                                            onClick={toggleAcordeon}
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
                                                transform: acordeonAbierto ? 'rotate(90deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.2s',
                                            }}
                                        >
                                            ▶
                                        </button>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#0f3b6f', margin: 0 }}>
                                                {resolucionFundada.numero_documento
                                                    ? `Res. ${resolucionFundada.numero_documento}`
                                                    : resolucionFundada.nombre_archivo}
                                            </p>
                                            <p style={{ fontSize: '0.73rem', color: '#4a5568', margin: '2px 0 0' }}>
                                                {resolucionFundada.nombre_archivo}
                                                {resolucionFundada.subido_en && ` - Fecha: ${new Date(resolucionFundada.subido_en).toLocaleDateString('es-PE')}`}
                                            </p>
                                        </div>
                                        <div>
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '20px',
                                                fontSize: '0.78rem',
                                                fontWeight: 700,
                                                background: '#f0fff4',
                                                color: '#276749',
                                                border: '1px solid #9ae6b4'
                                            }}>
                                                Subido
                                            </span>
                                        </div>
                                    </div>

                                    {acordeonAbierto && (
                                        <div style={{ borderTop: '2px solid #0f3b6f', background: '#1a1a2e' }}>
                                            <div style={{
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                padding: '8px 16px',
                                                background: '#0f3b6f',
                                            }}>
                                                <span style={{ color: '#c7a03a', fontSize: '0.78rem', fontWeight: 600 }}>
                                                    Resolución Fundada
                                                </span>
                                                <a
                                                    href={getPdfUrl(resolucionFundada.ruta_archivo)}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{ color: 'white', fontSize: '0.75rem', textDecoration: 'none' }}
                                                >
                                                    Abrir en nueva pestaña ↗
                                                </a>
                                            </div>
                                            <iframe
                                                src={getPdfUrl(resolucionFundada.ruta_archivo)}
                                                title="Resolución Fundada"
                                                style={{ width: '100%', height: '500px', border: 'none', display: 'block' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {!yaTieneResolucion && !bloqueado && !esSoloLectura && (
                                <div className="rf-form">
                                    <div className="campo">
                                        <label>N° de Resolución <span className="required">*</span></label>
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
                                                disabled={enviando || cargandoCorrelativo}
                                                style={{ 
                                                    width: '80px', 
                                                    textAlign: 'center', 
                                                    fontSize: '1rem',
                                                    padding: '8px 4px'
                                                }}
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                            />
                                            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#4a5568' }}>
                                                {sufijoDocumento || '-2026-MDEP'}
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
                                                            Resolución Fundada
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
                                                                Resolución Fundada (previsualización)
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

                                    {mensaje && (
                                        <div className={`mensaje ${mensaje.tipo}`}>{mensaje.texto}</div>
                                    )}

                                    <button className="btn-subir" onClick={handleSubirResolucion} disabled={enviando || cargandoCorrelativo}>
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
                                     La Resolución Fundada ya ha sido subida. Puedes avanzar a DISOLUCIÓN cuando se cumpla el plazo.
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

                {mostrarConfirmacionSubida && (
                    <div className="modal-overlay" onClick={() => setMostrarConfirmacionSubida(false)}>
                        <div className="modal-contenido" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Confirmar subida</h3>
                                <button className="modal-cerrar" onClick={() => setMostrarConfirmacionSubida(false)}>×</button>
                            </div>
                            <div className="modal-body">
                                <p style={{ marginBottom: '8px' }}>
                                    ¿Está seguro de subir la siguiente Resolución Fundada?
                                </p>
                                <div style={{ background: '#f3f4f6', padding: '12px', borderRadius: '8px' }}>
                                    <p><strong>N° de Resolución:</strong> {numeroDocumento}{sufijoDocumento}</p>
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
                                <button className="btn-confirmar" onClick={confirmarSubida} disabled={enviando}>
                                    {enviando ? 'Subiendo...' : 'Confirmar subida'}
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

            </main>
        </>
    )
}