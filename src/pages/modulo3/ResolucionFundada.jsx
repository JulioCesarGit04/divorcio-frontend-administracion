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

    const etapaActual = expediente?.etapa

    const getPipelineEtapa = () => {
        switch(etapaActual) {
            case 'EVALUACION': return 'revision'
            case 'DOCUMENTOS_INTERNOS': return 'documentos'
            case 'AUDIENCIA': return 'audiencia'
            case 'ESPERA_LEGAL': return 'resolucion'
            case 'DISOLUCION': return 'completado'
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
        if (!archivo && !resolucionFundada) {
            setMensaje({ tipo: 'error', texto: 'Debe seleccionar un archivo PDF' })
            return
        }
        if (!numeroDocumento) {
            setMensaje({ tipo: 'error', texto: 'Debe ingresar el número de resolución' })
            return
        }
        if (!archivo) {
            setMensaje({ tipo: 'info', texto: 'No hay cambios para guardar' })
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

    const handleAvanzarADisolucion = async () => {
        if (!puedeAvanzar) {
            setMensaje({ tipo: 'error', texto: `Debe esperar ${diasRestantes} días para avanzar a disolución` })
            return
        }
        if (!resolucionFundada && !archivo) {
            setMensaje({ tipo: 'error', texto: 'Debe subir la Resolución Fundada antes de avanzar' })
            return
        }
        const confirmar = window.confirm(
            'CONFIRMAR AVANCE A DISOLUCIÓN\n\n' +
            '• Cambiará el expediente a etapa DISOLUCION\n' +
            '• El proceso estará completado\n\n' +
            '¿Está seguro?'
        )
        if (!confirmar) return
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

    // ── Estados de carga / error / cancelado ──────────────────────────────
    if (expediente?.estado === 'CANCELADO' || expediente?.estado === 'ARCHIVADO') {
        return (
            <>
                <Sidebar />
                <main className="contenido-modulo3">
                    <div className="rf-header">
                        <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>← Volver</button>
                        <h1>Resolución Fundada</h1>
                    </div>
                    <div className="seccion estado-container">
                        <div className="estado-icono">{expediente?.estado === 'CANCELADO' ? '❌' : '✅'}</div>
                        <h2>{expediente?.estado === 'CANCELADO' ? 'Expediente Cancelado' : 'Expediente Archivado'}</h2>
                        <p>{expediente?.estado === 'CANCELADO' ? 'Este expediente ha sido cancelado.' : 'Este expediente ha sido completado y archivado.'}</p>
                        <p>No es posible emitir resolución fundada.</p>
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
                <div className="rf-header">
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

                {/* Header */}
                <div className="rf-header">
                    <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>← Volver</button>
                    <h1>Resolución Fundada</h1>
                    <span className="estado-badge-rf">{expediente?.numero_mesa_partes || '—'}</span>
                </div>

                <PlazoAlerta expediente={expediente} audienciaActual={null} />

                {bloqueado && (
                    <div className="mensaje success" style={{ textAlign: 'center', marginBottom: 24 }}>
                         Este expediente ya está en DISOLUCIÓN. El proceso ha sido completado.
                    </div>
                )}

                <div className="rf-layout">
                    {/* ── COLUMNA IZQUIERDA ── */}
                    <div className="rf-main">

                        {/* Plazo Legal */}
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

                        {/* Datos del expediente */}
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

                            {/* Cónyuges */}
                            <div className="conyuges-rf">
                                <div className="conyuge-rf">
                                    <div className="conyuge-rf-titulo">Solicitante</div>
                                    <div className="datos-grid" style={{ marginTop: 12 }}>
                                        <div>
                                            <label>Nombre completo</label>
                                            <p>{expediente?.Solicitante_Nombres || '—'} {expediente?.Solicitante_Apellidos || ''}</p>
                                        </div>
                                        <div>
                                            <label>DNI</label>
                                            <p>{expediente?.Solicitante_Dni || '—'}</p>
                                        </div>
                                        <div>
                                            <label>Teléfono</label>
                                            <p>{expediente?.Solicitante_Telefono || '—'}</p>
                                        </div>
                                        <div>
                                            <label>Correo electrónico</label>
                                            <p>{expediente?.Solicitante_Correo || '—'}</p>
                                        </div>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <label>Dirección</label>
                                            <p>{expediente?.Solicitante_Direccion || '—'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="conyuge-rf">
                                    <div className="conyuge-rf-titulo">Demandado</div>
                                    <div className="datos-grid" style={{ marginTop: 12 }}>
                                        <div>
                                            <label>Nombre completo</label>
                                            <p>{expediente?.Demandado_Nombres || '—'} {expediente?.Demandado_Apellidos || ''}</p>
                                        </div>
                                        <div>
                                            <label>DNI</label>
                                            <p>{expediente?.Demandado_Dni || '—'}</p>
                                        </div>
                                        <div>
                                            <label>Teléfono</label>
                                            <p>{expediente?.Demandado_Telefono || '—'}</p>
                                        </div>
                                        <div>
                                            <label>Correo electrónico</label>
                                            <p>{expediente?.Demandado_Correo || '—'}</p>
                                        </div>
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <label>Dirección</label>
                                            <p>{expediente?.Demandado_Direccion || '—'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Resolución Fundada */}
                        <div className="seccion">
                            <h2>Resolución Fundada</h2>

                            {/* Documento actual si existe */}
                            {yaTieneResolucion && (
                                <div className="documento-item" style={{ marginBottom: 20 }}>
                                    <div className="documento-info">
                                        <div className="documento-icono"></div>
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
                                        <button className="btn-ver" onClick={() => window.open(getPdfUrl(resolucionFundada.ruta_archivo), '_blank')}>
                                            Ver PDF
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Formulario subida */}
                            {!bloqueado && (
                                <div className="rf-form">
                                    <div className="rf-campos-fila">
                                        <div className="rf-campo">
                                            <label>N° de Resolución <span className="required">*</span></label>
                                            <input
                                                type="text"
                                                value={numeroDocumento}
                                                onChange={(e) => setNumeroDocumento(e.target.value)}
                                                placeholder="Ej: RES-2026-001"
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
                                        <label>Archivo PDF {!yaTieneResolucion && <span className="required">*</span>}</label>
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
                                                : yaTieneResolucion
                                                    ? <span className="archivo-actual"> {resolucionFundada.nombre_archivo} (actual)</span>
                                                    : <span className="archivo-pendiente">Ningún archivo seleccionado</span>
                                            }
                                        </div>
                                    </div>

                                    {mensaje && (
                                        <div className={`mensaje ${mensaje.tipo}`}>{mensaje.texto}</div>
                                    )}

                                    <button className="btn-subir" onClick={handleSubirResolucion} disabled={enviando}>
                                        {enviando ? 'Subiendo...' : (yaTieneResolucion ? 'Reemplazar Resolución' : 'Subir Resolución Fundada')}
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Botón avanzar */}
                        {etapaActual === 'ESPERA_LEGAL' && (
                            <div className="seccion acciones">
                                {mensaje && !bloqueado && (
                                    <div className={`mensaje ${mensaje.tipo}`} style={{ marginBottom: 16 }}>{mensaje.texto}</div>
                                )}
                                <button
                                    className="btn-continuar"
                                    onClick={handleAvanzarADisolucion}
                                    disabled={enviando || !puedeAvanzar}
                                >
                                    {puedeAvanzar
                                        ? 'Avanzar a DISOLUCIÓN'
                                        : `Esperar ${diasRestantes} días para avanzar`}
                                </button>
                                {!puedeAvanzar && (
                                    <p className="texto-ayuda">El plazo de espera legal es de 2 meses desde la ratificación.</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* ── COLUMNA DERECHA ── */}
                    <div className="rf-sidebar">
                        <BotonesNavegacion expedienteId={id} etapaActual={etapaActual} />
                        <PipelineVisual etapaActual={getPipelineEtapa()} />
                    </div>
                </div>

            </main>
        </>
    )
}