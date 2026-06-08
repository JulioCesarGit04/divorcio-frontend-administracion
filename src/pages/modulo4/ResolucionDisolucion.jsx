import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/modulo3/Sidebar'
import BotonesNavegacion from '../../components/modulo3/BotonesNavegacion'
import PipelineVisual from '../../components/modulo3/PipelineVisual'
import PlazoAlerta from '../../components/modulo3/PlazoAlerta'
import { 
    getExpedienteById, 
    getDocumentosInternos
} from '../../services/ProcedimientoService'

import { 
    registrarPagoCopias,
    subirResolucionDisolucion,
    avanzarArchivamiento,
    registrarSegundoPago
} from '../../services/Modulo4Service' 

const esDiaHabil = (fecha) => {
    const dia = fecha.getDay()
    return dia !== 0 && dia !== 6
}

const sumarDiasHabiles = (fecha, dias) => {
    const resultado = new Date(fecha)
    let agregados = 0
    while (agregados < dias) {
        resultado.setDate(resultado.getDate() + 1)
        if (esDiaHabil(resultado)) agregados++
    }
    return resultado
}

const diasHabilesEntre = (fechaInicio, fechaFin) => {
    let contador = 0
    let fecha = new Date(fechaInicio)
    while (fecha < fechaFin) {
        if (esDiaHabil(fecha)) contador++
        fecha.setDate(fecha.getDate() + 1)
    }
    return contador
}

export default function ResolucionDisolucion() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [expediente, setExpediente] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState(null)
    const [enviando, setEnviando] = useState(false)
    const [mensaje, setMensaje] = useState(null)
    const [resolucionDisolucion, setResolucionDisolucion] = useState(null)
    const [archivo, setArchivo] = useState(null)
    const [numeroDocumento, setNumeroDocumento] = useState('')
    const [fechaElaboracion, setFechaElaboracion] = useState(new Date().toISOString().split('T')[0])
    
    const [fechaPagoCopias, setFechaPagoCopias] = useState('')
    const [mensajeCopias, setMensajeCopias] = useState(null)
    const [pagoCopiasRegistrado, setPagoCopiasRegistrado] = useState(false)
    const [fechaSegundoPago, setFechaSegundoPago] = useState('')
    const [diasRestantes, setDiasRestantes] = useState(null)
    const [puedeAvanzar, setPuedeAvanzar] = useState(false)

    // Estados para el visor de PDF
    const [visorAbierto, setVisorAbierto] = useState(false)
    const [pdfUrl, setPdfUrl] = useState('')
    const [tituloPdf, setTituloPdf] = useState('')

    const etapaActual = expediente?.etapa

    const getPipelineEtapa = () => {
        switch(etapaActual) {
            case 'EVALUACION': return 'revision'
            case 'DOCUMENTOS_INTERNOS': return 'documentos'
            case 'AUDIENCIA': return 'audiencia'
            case 'ESPERA_LEGAL': return 'resolucion'
            case 'DISOLUCION': return 'disolucion'
            case 'ARCHIVADO': return 'archivar'
            default: return 'disolucion'
        }
    }

    const getPdfUrl = (ruta) => {
        if (!ruta) return '#'
        if (ruta.startsWith('http')) return ruta
        if (ruta.startsWith('/uploads')) return `http://localhost:3000${ruta}`
        return `http://localhost:3000/uploads/${ruta}`
    }

    const verPdfEnModal = (ruta, titulo) => {
        const url = getPdfUrl(ruta)
        if (url !== '#') {
            setPdfUrl(url)
            setTituloPdf(titulo || 'Visualizador de PDF')
            setVisorAbierto(true)
        } else {
            alert('No se puede abrir el PDF')
        }
    }

    const formatFecha = (fechaStr) => {
        if (!fechaStr) return '—'
        return fechaStr.split('T')[0].split('-').reverse().join('/')
    }

    const actualizarDiasRestantes = (fechaPago) => {
        if (!fechaPago) return
        const fechaInicio = new Date(fechaPago)
        const fechaFin = sumarDiasHabiles(fechaInicio, 15)
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)
        setDiasRestantes(diasHabilesEntre(hoy, fechaFin))
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

                if (expedienteData?.fecha_pago_copias_certificadas) {
                    const fecha = expedienteData.fecha_pago_copias_certificadas.split('T')[0]
                    setFechaPagoCopias(fecha)
                    setPagoCopiasRegistrado(true)
                } else {
                    setFechaPagoCopias(new Date().toISOString().split('T')[0])
                }

                if (expedienteData?.fecha_pago_disolucion) {
                    actualizarDiasRestantes(expedienteData.fecha_pago_disolucion)
                }

                const resDocs = await getDocumentosInternos(id)
                const docsData = resDocs?.data || resDocs || []
                const resoluciones = docsData
                    .filter(d => d.tipo_documento === 'RESOLUCION_DISOLUCION')
                    .sort((a, b) => new Date(b.subido_en) - new Date(a.subido_en))

                const resolucionExistente = resoluciones[0] || null
                setResolucionDisolucion(resolucionExistente)
                if (resolucionExistente) {
                    setNumeroDocumento(resolucionExistente.numero_documento || '')
                    if (resolucionExistente.fecha_elaboracion) {
                        setFechaElaboracion(resolucionExistente.fecha_elaboracion.split('T')[0])
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

    useEffect(() => {
        const slaCumplido = diasRestantes !== null && diasRestantes <= 0
        const resolucionSubida = resolucionDisolucion !== null
        setPuedeAvanzar(slaCumplido && resolucionSubida && pagoCopiasRegistrado)
    }, [diasRestantes, resolucionDisolucion, pagoCopiasRegistrado])

    const handleRegistrarSegundoPago = async (e) => {
        e.preventDefault()
        if (!fechaSegundoPago) {
            setMensaje({ tipo: 'error', texto: 'Seleccione la fecha del segundo pago' })
            return
        }
        setEnviando(true)
        try {
            const result = await registrarSegundoPago(id, fechaSegundoPago)
            const datosActualizados = result?.data
            setExpediente(prev => ({
                ...prev,
                fecha_pago_disolucion: datosActualizados?.fecha_pago_disolucion || fechaSegundoPago,
                etapa: datosActualizados?.etapa || 'DISOLUCION',
                estado: datosActualizados?.estado || prev?.estado
            }))
            actualizarDiasRestantes(datosActualizados?.fecha_pago_disolucion || fechaSegundoPago)
            setMensaje({ tipo: 'success', texto: 'Segundo pago registrado correctamente.' })
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.message })
        } finally {
            setEnviando(false)
        }
    }

    if (!cargando && !error && !expediente?.fecha_pago_disolucion) {
        return (
            <>
                <Sidebar />
                <main className="contenido-modulo3">
                    <div className="rf-header">
                        <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>← Volver</button>
                        <h1>Resolución de Disolución</h1>
                        <span className="estado-badge-rf">{expediente?.numero_mesa_partes || '—'}</span>
                    </div>
                    <div className="seccion" style={{ maxWidth: '500px', margin: '2rem auto', textAlign: 'center' }}>
                        <h2> Registrar Segundo Pago</h2>
                        <p>Para continuar con el proceso de disolución, debe registrar la fecha en que el solicitante realizó el segundo pago.</p>
                        <div className="rf-campos-fila" style={{ justifyContent: 'center' }}>
                            <div className="rf-campo">
                                <label>Fecha del segundo pago <span className="required">*</span></label>
                                <input
                                    type="date"
                                    value={fechaSegundoPago}
                                    onChange={(e) => setFechaSegundoPago(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                />
                            </div>
                        </div>
                        <button className="btn-subir" onClick={handleRegistrarSegundoPago} disabled={enviando || !fechaSegundoPago}>
                            {enviando ? 'Registrando...' : 'Registrar segundo pago'}
                        </button>
                        {mensaje && <div className={`mensaje ${mensaje.tipo}`} style={{ marginTop: '1rem' }}>{mensaje.texto}</div>}
                    </div>
                </main>
            </>
        )
    }

    const handleArchivoChange = (file) => {
        if (file && file.type !== 'application/pdf') {
            setMensaje({ tipo: 'error', texto: 'Solo se permiten archivos PDF' })
            return
        }
        setArchivo(file)
        setMensaje(null)
    }

    const handleSubirResolucion = async () => {
        if (resolucionDisolucion) {
            setMensaje({ tipo: 'error', texto: 'La resolución ya fue subida y está bloqueada. No se puede modificar ni reemplazar.' })
            return
        }
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
            await subirResolucionDisolucion(id, numeroDocumento, fechaElaboracion, archivo)
            setMensaje({ tipo: 'success', texto: 'Resolución de Disolución subida correctamente. Queda bloqueada permanentemente.' })
            setTimeout(() => window.location.reload(), 1500)
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.message || 'Error al subir la resolución' })
        } finally {
            setEnviando(false)
        }
    }

    const handleRegistrarPagoCopias = async (e) => {
        if (e) e.preventDefault()
        if (!fechaPagoCopias) {
            setMensajeCopias({ tipo: 'error', texto: 'Ingrese la fecha de pago de copias certificadas' })
            return
        }
        setEnviando(true)
        setMensajeCopias(null)
        try {
            await registrarPagoCopias(id, fechaPagoCopias)
            setPagoCopiasRegistrado(true)
            setMensajeCopias({ tipo: 'success', texto: ` Pago de copias registrado con fecha ${formatFecha(fechaPagoCopias)}` })
            setExpediente(prev => ({
                ...prev,
                fecha_pago_copias_certificadas: fechaPagoCopias
            }))
        } catch (err) {
            setMensajeCopias({ tipo: 'error', texto: err.message || 'Error al registrar pago de copias' })
        } finally {
            setEnviando(false)
        }
    }

    const handleAvanzarAArchivamiento = async () => {
        if (!puedeAvanzar) {
            if (!resolucionDisolucion) {
                setMensaje({ tipo: 'error', texto: 'Primero debe subir y bloquear la Resolución de Disolución.' })
            } else if (diasRestantes > 0) {
                setMensaje({ tipo: 'error', texto: `Debe esperar ${diasRestantes} días hábiles para cumplir el plazo legal de 15 días hábiles.` })
            } else if (!pagoCopiasRegistrado) {
                setMensaje({ tipo: 'error', texto: 'Debe registrar el pago de copias certificadas antes de archivar.' })
            }
            return
        }
        const confirmar = window.confirm(
            'CONFIRMAR RECEPCIÓN DE CARGO Y ARCHIVAMIENTO\n\n' +
            '• Se registrará el cargo de SUNARP/RENIEC\n' +
            '• El expediente pasará a etapa ARCHIVADO\n' +
            '• Ya no se podrá modificar ninguna información\n\n' +
            '¿Está seguro?'
        )
        if (!confirmar) return
        setEnviando(true)
        setMensaje(null)
        try {
            await avanzarArchivamiento(id, 'Resolución de Disolución emitida, plazo cumplido y pago de copias registrado')
            setMensaje({ tipo: 'success', texto: 'Expediente archivado correctamente. Redirigiendo...' })
            setTimeout(() => navigate(`/modulo4/archivamiento/${id}`), 2000)
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.message || 'Error al avanzar' })
        } finally {
            setEnviando(false)
        }
    }

    if (expediente?.estado === 'CANCELADO') {
        return (
            <>
                <Sidebar />
                <main className="contenido-modulo3">
                    <div className="rf-header">
                        <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>← Volver</button>
                        <h1>Resolución de Disolución</h1>
                    </div>
                    <div className="seccion estado-container">
                        <div className="estado-icono">❌</div>
                        <h2>Expediente Cancelado</h2>
                        <p>Este expediente ha sido cancelado.</p>
                        <button className="btn-continuar" style={{ marginTop: 20, width: 'auto', padding: '10px 28px' }} onClick={() => navigate(`/modulo3/detalle/${id}`)}>
                            Volver al detalle
                        </button>
                    </div>
                </main>
            </>
        )
    }

    if (cargando) return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="rf-header">
                    <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>← Volver</button>
                    <h1>Resolución de Disolución</h1>
                </div>
                <p style={{ color: '#64748b', padding: '40px 0', textAlign: 'center' }}>Cargando...</p>
            </main>
        </>
    )

    if (error) return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="rf-header">
                    <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>← Volver</button>
                    <h1>Resolución de Disolución</h1>
                </div>
                <p style={{ color: '#dc2626' }}>Error: {error}</p>
            </main>
        </>
    )

    const yaTieneResolucion = resolucionDisolucion !== null
    const bloqueado = expediente?.estado === 'ARCHIVADO'
    const fechaPagoInicio = expediente?.fecha_pago_disolucion
    
    let fechaPagoFin = null
    if (fechaPagoInicio) {
        fechaPagoFin = sumarDiasHabiles(new Date(fechaPagoInicio), 15)
    }

    const formatearFechaLegible = (fechaStr) => {
        if (!fechaStr) return '—'
        const clean = fechaStr.split('T')[0]
        const [year, month, day] = clean.split('-')
        return `${day}/${month}/${year}`
    }

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="rf-header">
                    <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>← Volver</button>
                    <h1>Resolución de Disolución</h1>
                    <span className="estado-badge-rf">{expediente?.numero_mesa_partes || '—'}</span>
                </div>

                <PlazoAlerta expediente={expediente} audienciaActual={null} />

                <div className="rf-layout">
                    <div className="rf-main">
                        {/* Plazo Legal */}
                        <div className="seccion">
                            <h2>Plazo Legal (15 días hábiles)</h2>
                            <div className="datos-grid">
                                <div>
                                    <label>Fecha de Segundo Pago</label>
                                    <p>{formatFecha(fechaPagoInicio)}</p>
                                </div>
                                <div>
                                    <label>Fecha Límite</label>
                                    <p>{fechaPagoFin ? formatFecha(fechaPagoFin.toISOString()) : '—'}</p>
                                </div>
                                <div>
                                    <label>Días Restantes</label>
                                    <p className={diasRestantes > 0 ? 'dias-pendiente' : 'dias-cumplido'}>
                                        {diasRestantes !== null
                                            ? (diasRestantes > 0 ? `${diasRestantes} días hábiles` : '✓ Cumplido')
                                            : '—'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Datos del expediente */}
                        <div className="seccion">
                            <h2>Datos del expediente</h2>
                            <div className="datos-grid">
                                <div><label>N° Expediente</label><p>{expediente?.numero_expediente || '—'}</p></div>
                                <div><label>N° Mesa de Partes</label><p>{expediente?.numero_mesa_partes || '—'}</p></div>
                                <div><label>Etapa actual</label><p>{expediente?.etapa || '—'}</p></div>
                                <div><label>Registrado por</label><p>{expediente?.registrado_por || '—'}</p></div>
                            </div>
                            <div className="conyuges-rf">
                                <div className="conyuge-rf">
                                    <div className="conyuge-rf-titulo">Solicitante</div>
                                    <div className="datos-grid" style={{ marginTop: 12 }}>
                                        <div><label>Nombre completo</label><p>{expediente?.Solicitante_Nombres || '—'} {expediente?.Solicitante_Apellidos || ''}</p></div>
                                        <div><label>DNI</label><p>{expediente?.Solicitante_Dni || '—'}</p></div>
                                    </div>
                                </div>
                                <div className="conyuge-rf">
                                    <div className="conyuge-rf-titulo">Demandado</div>
                                    <div className="datos-grid" style={{ marginTop: 12 }}>
                                        <div><label>Nombre completo</label><p>{expediente?.Demandado_Nombres || '—'} {expediente?.Demandado_Apellidos || ''}</p></div>
                                        <div><label>DNI</label><p>{expediente?.Demandado_Dni || '—'}</p></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 1: EMISIÓN DE RESOLUCIÓN */}
                        <div className="seccion">
                            <h2>Emisión de Resolución de Disolución</h2>
                            {yaTieneResolucion && (
                                <div className="documento-item" style={{ marginBottom: 20 }}>
                                    <div className="documento-info">
                                        <div className="documento-icono"></div>
                                        <div>
                                            <div className="documento-nombre">
                                                {resolucionDisolucion.numero_documento
                                                    ? `Res. ${resolucionDisolucion.numero_documento}`
                                                    : resolucionDisolucion.nombre_archivo}
                                            </div>
                                            <div className="documento-descripcion">
                                                Fecha de elaboración: {formatFecha(resolucionDisolucion.fecha_elaboracion)}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="documento-acciones">
                                        <span className="estado-subido">Subido y bloqueado</span>
                                        <button className="btn-ver" onClick={() => verPdfEnModal(resolucionDisolucion.ruta_archivo, 'Resolución de Disolución')}>
                                            Ver PDF
                                        </button>
                                    </div>
                                </div>
                            )}
                            {!bloqueado && (
                                <>
                                    {!yaTieneResolucion ? (
                                        <div className="rf-form">
                                            <div className="rf-campos-fila">
                                                <div className="rf-campo">
                                                    <label>N° de Resolución <span className="required">*</span></label>
                                                    <input
                                                        type="text"
                                                        value={numeroDocumento}
                                                        onChange={(e) => setNumeroDocumento(e.target.value)}
                                                        placeholder="Ej: RES-DISOL-2026-001"
                                                    />
                                                </div>
                                                <div className="rf-campo">
                                                    <label>Fecha de elaboración <span className="required">*</span></label>
                                                    <input
                                                        type="date"
                                                        value={fechaElaboracion}
                                                        onChange={(e) => setFechaElaboracion(e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            <div className="rf-campo">
                                                <label>Archivo PDF (obligatorio)</label>
                                                <div className="rf-archivo">
                                                    <input
                                                        type="file"
                                                        accept=".pdf"
                                                        id="rd-file-input"
                                                        onChange={(e) => handleArchivoChange(e.target.files[0])}
                                                        style={{ display: 'none' }}
                                                    />
                                                    <label htmlFor="rd-file-input" className="btn-ver" style={{ cursor: 'pointer' }}>
                                                        Seleccionar archivo
                                                    </label>
                                                    {archivo && <span className="archivo-ok" style={{ marginLeft: '10px' }}>{archivo.name}</span>}
                                                    {!archivo && <span className="archivo-pendiente" style={{ marginLeft: '10px' }}>(Ningún archivo seleccionado)</span>}
                                                </div>
                                            </div>
                                            {mensaje && <div className={`mensaje ${mensaje.tipo}`} style={{ marginTop: '16px' }}>{mensaje.texto}</div>}
                                            <button className="btn-subir" onClick={handleSubirResolucion} disabled={enviando}>
                                                {enviando ? 'Subiendo...' : 'Subir Resolución'}
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="mensaje success" style={{ textAlign: 'center', marginTop: 12 }}>
                                             Resolución ya subida. No se permite modificación ni reemplazo.
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* SECCIÓN 2: PAGO DE COPIAS CERTIFICADAS */}
                        <div className="seccion" style={{ borderLeft: '4px solid #eab308', backgroundColor: '#fefce8' }}>
                            <h2> Comprobante de Pago</h2>
                            <div className="rf-campos-fila">
                                <div className="rf-campo">
                                    <label>Número de Mesa de Partes</label>
                                    <input
                                        type="text"
                                        value={expediente?.numero_mesa_partes || '—'}
                                        disabled
                                        style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                                    />
                                </div>
                                <div className="rf-campo">
                                    <label>Fecha de pago de copias</label>
                                    {pagoCopiasRegistrado ? (
                                        <div style={{ padding: '0.7rem 0.9rem', backgroundColor: '#e6f7e6', borderRadius: '0.7rem', border: '1px solid #c0e0c0' }}>
                                             {formatearFechaLegible(fechaPagoCopias)}
                                        </div>
                                    ) : (
                                        <input
                                            type="date"
                                            value={fechaPagoCopias}
                                            onChange={(e) => setFechaPagoCopias(e.target.value)}
                                            disabled={bloqueado}
                                        />
                                    )}
                                </div>
                            </div>
                            {!pagoCopiasRegistrado && !bloqueado ? (
                                <button 
                                    type="button"
                                    className="btn-subir" 
                                    style={{ backgroundColor: '#eab308', marginTop: 12 }} 
                                    onClick={handleRegistrarPagoCopias}
                                    disabled={enviando || !fechaPagoCopias}
                                >
                                    {enviando ? 'Registrando...' : 'Registrar pago de copias'}
                                </button>
                            ) : pagoCopiasRegistrado ? (
                                <div style={{ marginTop: 12, color: '#2b6e2b', fontWeight: 'bold', padding: '0.5rem', backgroundColor: '#e0f5e0', borderRadius: '0.5rem' }}>
                                     Pago registrado el {formatearFechaLegible(fechaPagoCopias)}
                                </div>
                            ) : null}
                            {mensajeCopias && (
                                <div className={`mensaje ${mensajeCopias.tipo}`} style={{ marginTop: 12 }}>{mensajeCopias.texto}</div>
                            )}
                            <p style={{ fontSize: '0.75rem', marginTop: 12, color: '#6b7280' }}>
                                Este registro es independiente de la resolución de disolución y debe realizarse después de emitirla.
                                {!pagoCopiasRegistrado && !bloqueado && ' Es necesario para habilitar el archivamiento.'}
                            </p>
                        </div>

                    </div>

                    <div className="rf-sidebar">
                        <BotonesNavegacion expedienteId={id} etapaActual={etapaActual} />
                        <PipelineVisual etapaActual={getPipelineEtapa()} />
                    </div>
                </div>

                {/* Modal visor de PDF */}
                {visorAbierto && (
                    <div className="modal-overlay" onClick={() => setVisorAbierto(false)}>
                        <div className="modal-contenido" style={{ width: '80%', maxWidth: '1000px', height: '80vh' }} onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>{tituloPdf}</h3>
                                <button className="modal-cerrar" onClick={() => setVisorAbierto(false)}>×</button>
                            </div>
                            <div className="modal-body" style={{ padding: 0, height: 'calc(100% - 60px)' }}>
                                <iframe
                                    src={pdfUrl}
                                    title={tituloPdf}
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