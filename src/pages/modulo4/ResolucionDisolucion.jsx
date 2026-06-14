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

    // Estado para el acordeón
    const [pdfAbierto, setPdfAbierto] = useState(false)

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

    // ============================================================
    // FORMULARIO DE REGISTRO DE SEGUNDO PAGO (con diseño mejorado)
    // ============================================================
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
                    <div className="seccion" style={{ maxWidth: '550px', margin: '2rem auto', backgroundColor: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '1.5rem' }}>
                        <h2 style={{ marginTop: 0, borderBottom: '3px solid #c7a03a', paddingBottom: '0.6rem', display: 'inline-block', fontSize: '1.3rem' }}>
                            Registrar Segundo Pago
                        </h2>
                        <p style={{ color: '#4b5563', margin: '1rem 0 1.5rem', lineHeight: '1.4' }}>
                            Para continuar con el proceso de disolución, debe registrar la fecha en que el solicitante realizó el segundo pago.
                        </p>
                        <div className="rf-campos-fila" style={{ justifyContent: 'center', marginBottom: '1.5rem' }}>
                            <div className="rf-campo" style={{ width: '100%' }}>
                                <label style={{ fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                                    Fecha del segundo pago <span className="required">*</span>
                                </label>
                                <input
                                    type="date"
                                    value={fechaSegundoPago}
                                    onChange={(e) => setFechaSegundoPago(e.target.value)}
                                    max={new Date().toISOString().split('T')[0]}
                                    style={{
                                        width: '100%',
                                        padding: '10px 12px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        fontSize: '0.9rem'
                                    }}
                                />
                            </div>
                        </div>
                        <button
                            className="btn-subir"
                            onClick={handleRegistrarSegundoPago}
                            disabled={enviando || !fechaSegundoPago}
                            style={{
                                width: '100%',
                                padding: '12px',
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                backgroundColor: '#0f3b6f',
                                border: 'none',
                                borderRadius: '8px',
                                color: 'white',
                                cursor: 'pointer',
                                transition: 'opacity 0.2s'
                            }}
                        >
                            {enviando ? 'Registrando...' : 'Registrar segundo pago'}
                        </button>
                        {mensaje && (
                            <div className={`mensaje ${mensaje.tipo === 'error' ? 'error' : 'success'}`} style={{ marginTop: '1.5rem', textAlign: 'center' }}>
                                {mensaje.texto}
                            </div>
                        )}
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
                                <div style={{
                                    marginBottom: '12px',
                                    border: '1.5px solid #9ae6b4',
                                    borderRadius: '10px',
                                    overflow: 'hidden',
                                }}>
                                    {/* Cabecera con botón desplegable */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '12px 16px',
                                        background: '#f0fff4',
                                    }}>
                                        <button
                                            onClick={() => setPdfAbierto(!pdfAbierto)}
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
                                                Resolución de Disolución
                                            </p>
                                            <p style={{ fontSize: '0.73rem', color: '#4a5568', margin: '2px 0 0' }}>
                                                {resolucionDisolucion.numero_documento
                                                    ? `Res. ${resolucionDisolucion.numero_documento}`
                                                    : resolucionDisolucion.nombre_archivo}
                                                {` - Fecha: ${formatFecha(resolucionDisolucion.fecha_elaboracion)}`}
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

                                    {/* Visor inline */}
                                    {pdfAbierto && (
                                        <div style={{ borderTop: '2px solid #0f3b6f', background: '#1a1a2e' }}>
                                            <div style={{
                                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                padding: '8px 16px', background: '#0f3b6f',
                                            }}>
                                                <span style={{ color: '#c7a03a', fontSize: '0.78rem', fontWeight: 600 }}>
                                                    Resolución de Disolución
                                                </span>
                                                <a href={getPdfUrl(resolucionDisolucion.ruta_archivo)} target="_blank" rel="noreferrer" style={{ color: 'white', fontSize: '0.75rem', textDecoration: 'none' }}>
                                                    Abrir en nueva pestaña ↗
                                                </a>
                                            </div>
                                            <iframe
                                                src={getPdfUrl(resolucionDisolucion.ruta_archivo)}
                                                title="Resolución de Disolución"
                                                style={{ width: '100%', height: '500px', border: 'none', display: 'block' }}
                                            />
                                        </div>
                                    )}
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
                                    ) : null /* ❌ Mensaje eliminado: "Resolución ya subida..." */}
                                </>
                            )}
                        </div>

                        {/* SECCIÓN 2: PAGO DE COPIAS CERTIFICADAS */}
                        <div className="seccion" style={{ borderLeft: '4px solid #eab308', backgroundColor: '#fefce8' }}>
                            <h2> Comprobante de Pago de Copias Certificadas</h2>
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
                                    <label>Fecha de pago</label>
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
                        <PipelineVisual etapaActual={getPipelineEtapa()} estado={expediente?.estado} />
                    </div>
                </div>
            </main>
        </>
    )
}