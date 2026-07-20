import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/modulo3/Sidebar'
import BotonesNavegacion from '../../components/modulo3/BotonesNavegacion'
import PipelineVisual from '../../components/modulo3/PipelineVisual'
import PlazoAlerta from '../../components/modulo3/PlazoAlerta'
import { getArchivamientoData, subirCargosExternos } from '../../services/Modulo4Service'
import { getPdfUrl } from '../../services/ProcedimientoService'  
import '../../styles/modulo3/resolucion-fundada.css'

export default function ArchivamientoExpediente() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [expediente, setExpediente] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [archivos, setArchivos] = useState({ sunarp: null, reniec: null })
    const [previaAbierta, setPreviaAbierta] = useState({ sunarp: false, reniec: false })
    const [previewUrl, setPreviewUrl] = useState({ sunarp: null, reniec: null })
    const [mensaje, setMensaje] = useState('')
    const [enviando, setEnviando] = useState(false)

    const [archivosExistentes, setArchivosExistentes] = useState({ sunarp: null, reniec: null })
    const [yaFinalizado, setYaFinalizado] = useState(false)

    const [pdfAbiertoSunarp, setPdfAbiertoSunarp] = useState(false)
    const [pdfAbiertoReniec, setPdfAbiertoReniec] = useState(false)

    const togglePreviaSunarp = () => {
        setPreviaAbierta(prev => ({ ...prev, sunarp: !prev.sunarp }))
    }
    const togglePreviaReniec = () => {
        setPreviaAbierta(prev => ({ ...prev, reniec: !prev.reniec }))
    }

    useEffect(() => {
        const cargar = async () => {
            try {
                const res = await getArchivamientoData(id)
                if (res.ok && res.data) {
                    setExpediente(res.data)
                    const sunarp = res.data.ruta_sunarp ? { ruta: res.data.ruta_sunarp, fecha: res.data.fecha_sunarp } : null
                    const reniec = res.data.ruta_reniec ? { ruta: res.data.ruta_reniec, fecha: res.data.fecha_reniec } : null
                    setArchivosExistentes({ sunarp, reniec })
                    if (sunarp && reniec) setYaFinalizado(true)
                } else {
                    setMensaje('No se pudo cargar la informacion del expediente')
                }
            } catch (err) {
                setMensaje('Error al cargar: ' + err.message)
            } finally {
                setCargando(false)
            }
        }
        cargar()
    }, [id])

    useEffect(() => {
        if (previaAbierta.sunarp && archivos.sunarp) {
            const url = URL.createObjectURL(archivos.sunarp)
            setPreviewUrl(prev => ({ ...prev, sunarp: url }))
            return () => {
                URL.revokeObjectURL(url)
            }
        } else {
            if (previewUrl.sunarp) {
                URL.revokeObjectURL(previewUrl.sunarp)
                setPreviewUrl(prev => ({ ...prev, sunarp: null }))
            }
        }
    }, [previaAbierta.sunarp, archivos.sunarp])

    useEffect(() => {
        if (previaAbierta.reniec && archivos.reniec) {
            const url = URL.createObjectURL(archivos.reniec)
            setPreviewUrl(prev => ({ ...prev, reniec: url }))
            return () => {
                URL.revokeObjectURL(url)
            }
        } else {
            if (previewUrl.reniec) {
                URL.revokeObjectURL(previewUrl.reniec)
                setPreviewUrl(prev => ({ ...prev, reniec: null }))
            }
        }
    }, [previaAbierta.reniec, archivos.reniec])

    useEffect(() => {
        return () => {
            if (previewUrl.sunarp) URL.revokeObjectURL(previewUrl.sunarp)
            if (previewUrl.reniec) URL.revokeObjectURL(previewUrl.reniec)
        }
    }, [])

    const handleFileChange = (e, tipo) => {
        if (yaFinalizado) {
            setMensaje('Expediente ya finalizado, no se pueden cambiar archivos')
            return
        }

        const file = e.target.files[0]
        if (file && file.type !== 'application/pdf') {
            setMensaje('Solo se permiten archivos PDF')
            return
        }

        setPreviaAbierta(prev => ({ ...prev, [tipo]: false }))
        setArchivos(prev => ({ ...prev, [tipo]: file }))
        setMensaje('')
    }

    const handleFinalizar = async () => {
        if (yaFinalizado) {
            setMensaje('El expediente ya esta finalizado')
            return
        }

        const tieneResolucion = expediente?.num_resolucion && expediente?.fecha_elaboracion_resolucion;
        if (!tieneResolucion) {
            setMensaje(' Primero debe subir la Resolución de Disolución en la página correspondiente.');
            return;
        }

        const tieneSunarp = archivos.sunarp || archivosExistentes.sunarp
        const tieneReniec = archivos.reniec || archivosExistentes.reniec
        if (!tieneSunarp || !tieneReniec) {
            setMensaje('Debe adjuntar ambas constancias (SUNARP y RENIEC)')
            return
        }

        setEnviando(true)
        setMensaje('')
        try {
            const sunarpFile = archivos.sunarp || null
            const reniecFile = archivos.reniec || null
            const result = await subirCargosExternos(id, sunarpFile, reniecFile)
            if (result.ok) {
                setPreviaAbierta({ sunarp: false, reniec: false })
                setArchivos({ sunarp: null, reniec: null })
                setMensaje('Expediente finalizado correctamente. Redirigiendo...')
                setYaFinalizado(true)
                setTimeout(() => navigate('/modulo3/expedientes'), 2000)
            } else {
                setMensaje('Error: ' + (result.mensaje || 'No se pudo finalizar'))
            }
        } catch (err) {
            console.error('Error en handleFinalizar:', err)
            setMensaje('Error de conexion: ' + (err.response?.data?.mensaje || err.message))
        } finally {
            setEnviando(false)
        }
    }

    const formatFecha = (fechaStr) => {
        if (!fechaStr) return '—'
        return fechaStr.split('T')[0].split('-').reverse().join('/')
    }

    const getNombreArchivo = (ruta) => {
        if (!ruta) return null
        const partes = ruta.split('/')
        return partes[partes.length - 1]
    }

    const formatearFechaSubida = (fecha) => {
        if (!fecha) return ''
        return new Date(fecha).toLocaleDateString('es-PE')
    }

    const etapaActual = expediente?.etapa || 'ARCHIVADO'
    const getPipelineEtapa = () => 'archivar'

    const tieneResolucion = expediente?.num_resolucion && expediente?.fecha_elaboracion_resolucion;

    if (cargando) return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="rf-header">
                    <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>← Volver</button>
                    <h1>Archivo del Expediente</h1>
                </div>
                <p>Cargando...</p>
            </main>
        </>
    )

    if (!expediente) return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="rf-header">
                    <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>← Volver</button>
                    <h1>Archivo del Expediente</h1>
                </div>
                <p>Expediente no encontrado</p>
                <button className="btn-continuar" onClick={() => navigate('/modulo3/expedientes')}>Volver</button>
            </main>
        </>
    )

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="rf-header">
                    <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>← Volver</button>
                    <h1>Archivo del Expediente</h1>
                    <span className="estado-badge-rf">{expediente.numero_mesa_partes || '—'}</span>
                </div>

                <PlazoAlerta expediente={expediente} audienciaActual={null} />

                <div className="rf-layout">
                    <div className="rf-main">
                        <div className="seccion">
                            <h2>Datos del expediente</h2>

                            <div className="datos-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                <div>
                                    <label>N° EXPEDIENTE</label>
                                    <p>{expediente.numero_expediente || '—'}</p>
                                </div>
                                <div>
                                    <label>N° MESA DE PARTES</label>
                                    <p>{expediente.numero_mesa_partes || '—'}</p>
                                </div>
                                <div>
                                    <label>ETAPA ACTUAL</label>
                                    <p>{expediente.etapa || '—'}</p>
                                </div>
                                <div>
                                    <label>FECHA DE PAGO</label>
                                    <p>{expediente.fecha_pago ? formatFecha(expediente.fecha_pago) : (expediente.fecha_elaboracion_resolucion ? formatFecha(expediente.fecha_elaboracion_resolucion) : '—')}</p>
                                </div>
                            </div>

                            <div style={{ marginTop: '1.5rem' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#0f3b6f', marginBottom: '0.5rem' }}>Solicitante</h3>
                                <div className="datos-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                    <div><label>NOMBRE COMPLETO</label><p>{expediente.solicitante_nombre || '—'}</p></div>
                                    <div><label>DNI</label><p>{expediente.solicitante_dni || '—'}</p></div>
                                </div>
                            </div>

                            <div style={{ marginTop: '1.5rem' }}>
                                <h3 style={{ fontSize: '1rem', fontWeight: '600', color: '#0f3b6f', marginBottom: '0.5rem' }}>Demandado</h3>
                                <div className="datos-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                                    <div><label>NOMBRE COMPLETO</label><p>{expediente.demandado_nombre || '—'}</p></div>
                                    <div><label>DNI</label><p>{expediente.demandado_dni || '—'}</p></div>
                                </div>
                            </div>
                        </div>

                        <div className="seccion">
                            <h2>Cargos SUNARP y RENIEC</h2>

                            {yaFinalizado && (
                                <div className="mensaje success" style={{ marginBottom: '1rem' }}>
                                    El expediente esta finalizado
                                </div>
                            )}

                            {archivosExistentes.sunarp ? (
                                <div style={{ marginBottom: '24px', border: '1.5px solid #9ae6b4', borderRadius: '12px', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#f0fff4' }}>
                                        <button
                                            onClick={() => setPdfAbiertoSunarp(!pdfAbiertoSunarp)}
                                            style={{
                                                background: '#0f3b6f', border: 'none', borderRadius: '8px', width: '32px', height: '32px',
                                                color: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold',
                                                transform: pdfAbiertoSunarp ? 'rotate(90deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.2s'
                                            }}
                                        >
                                            ▶
                                        </button>
                                        <div style={{ flex: 1 }}>
                                            <strong style={{ color: '#0f3b6f' }}>CARGO SUNARP</strong>
                                            <div style={{ fontSize: '0.75rem', color: '#4a5568', marginTop: '2px' }}>
                                                {getNombreArchivo(archivosExistentes.sunarp.ruta)}
                                            </div>
                                            {archivosExistentes.sunarp.fecha && (
                                                <div style={{ fontSize: '0.7rem', color: '#718096', marginTop: '2px' }}>
                                                    Fecha de subida: {formatearFechaSubida(archivosExistentes.sunarp.fecha)}
                                                </div>
                                            )}
                                        </div>
                                        <span style={{
                                            padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                                            background: '#f0fff4', color: '#276749', border: '1px solid #9ae6b4'
                                        }}>
                                            Subido
                                        </span>
                                    </div>
                                    {pdfAbiertoSunarp && (
                                        <div style={{ borderTop: '2px solid #0f3b6f', background: '#1a1a2e' }}>
                                            <div style={{ background: '#0f3b6f', padding: '8px 16px', display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#c7a03a', fontSize: '0.75rem' }}>Constancia SUNARP</span>
                                                <a href={getPdfUrl(archivosExistentes.sunarp.ruta)} target="_blank" rel="noreferrer" style={{ color: 'white', fontSize: '0.75rem' }}>
                                                    Abrir en nueva pestaña ↗
                                                </a>
                                            </div>
                                            <embed
                                                src={getPdfUrl(archivosExistentes.sunarp.ruta)}
                                                type="application/pdf"
                                                style={{ width: '100%', height: '500px', border: 'none', display: 'block' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Constancia SUNARP (PDF):</label>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => handleFileChange(e, 'sunarp')}
                                        disabled={enviando || yaFinalizado || !tieneResolucion}
                                        style={{ display: 'block', marginBottom: '8px' }}
                                    />
                                    {archivos.sunarp && <span className="archivo-ok"> {archivos.sunarp.name}</span>}
                                    {!tieneResolucion && !yaFinalizado && (
                                        <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '4px' }}>
                                             Requiere Resolución de Disolución primero
                                        </div>
                                    )}

                                    {archivos.sunarp && !yaFinalizado && (
                                        <div style={{ marginTop: '16px', border: '1.5px solid #9ae6b4', borderRadius: '10px', overflow: 'hidden' }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px 16px',
                                                background: '#f0fff4',
                                            }}>
                                                <button
                                                    onClick={togglePreviaSunarp}
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
                                                        transform: previaAbierta.sunarp ? 'rotate(90deg)' : 'rotate(0deg)',
                                                        transition: 'transform 0.2s',
                                                    }}
                                                >
                                                    ▶
                                                </button>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#0f3b6f', margin: 0 }}>
                                                        Constancia SUNARP
                                                    </p>
                                                    <p style={{ fontSize: '0.73rem', color: '#4a5568', margin: '2px 0 0' }}>
                                                        {archivos.sunarp?.name}
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

                                            {previaAbierta.sunarp && previewUrl.sunarp && (
                                                <div style={{ borderTop: '2px solid #0f3b6f', background: '#1a1a2e' }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '8px 16px',
                                                        background: '#0f3b6f',
                                                    }}>
                                                        <span style={{ color: '#c7a03a', fontSize: '0.78rem', fontWeight: 600 }}>
                                                            Constancia SUNARP (previsualización)
                                                        </span>
                                                        <a
                                                            href={previewUrl.sunarp}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            style={{ color: 'white', fontSize: '0.75rem', textDecoration: 'none' }}
                                                        >
                                                            Abrir en nueva pestaña ↗
                                                        </a>
                                                    </div>
                                                    <embed
                                                        src={previewUrl.sunarp}
                                                        type="application/pdf"
                                                        style={{ width: '100%', height: '400px', border: 'none', display: 'block' }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {archivosExistentes.reniec ? (
                                <div style={{ marginBottom: '24px', border: '1.5px solid #9ae6b4', borderRadius: '12px', overflow: 'hidden' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px', background: '#f0fff4' }}>
                                        <button
                                            onClick={() => setPdfAbiertoReniec(!pdfAbiertoReniec)}
                                            style={{
                                                background: '#0f3b6f', border: 'none', borderRadius: '8px', width: '32px', height: '32px',
                                                color: 'white', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold',
                                                transform: pdfAbiertoReniec ? 'rotate(90deg)' : 'rotate(0deg)',
                                                transition: 'transform 0.2s'
                                            }}
                                        >
                                            ▶
                                        </button>
                                        <div style={{ flex: 1 }}>
                                            <strong style={{ color: '#0f3b6f' }}>CARGO RENIEC</strong>
                                            <div style={{ fontSize: '0.75rem', color: '#4a5568', marginTop: '2px' }}>
                                                {getNombreArchivo(archivosExistentes.reniec.ruta)}
                                            </div>
                                            {archivosExistentes.reniec.fecha && (
                                                <div style={{ fontSize: '0.7rem', color: '#718096', marginTop: '2px' }}>
                                                    Fecha de subida: {formatearFechaSubida(archivosExistentes.reniec.fecha)}
                                                </div>
                                            )}
                                        </div>
                                        <span style={{
                                            padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700,
                                            background: '#f0fff4', color: '#276749', border: '1px solid #9ae6b4'
                                        }}>
                                            Subido
                                        </span>
                                    </div>
                                    {pdfAbiertoReniec && (
                                        <div style={{ borderTop: '2px solid #0f3b6f', background: '#1a1a2e' }}>
                                            <div style={{ background: '#0f3b6f', padding: '8px 16px', display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#c7a03a', fontSize: '0.75rem' }}>Constancia RENIEC</span>
                                                <a href={getPdfUrl(archivosExistentes.reniec.ruta)} target="_blank" rel="noreferrer" style={{ color: 'white', fontSize: '0.75rem' }}>
                                                    Abrir en nueva pestaña ↗
                                                </a>
                                            </div>
                                            <embed
                                                src={getPdfUrl(archivosExistentes.reniec.ruta)}
                                                type="application/pdf"
                                                style={{ width: '100%', height: '500px', border: 'none', display: 'block' }}
                                            />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Constancia RENIEC (PDF):</label>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => handleFileChange(e, 'reniec')}
                                        disabled={enviando || yaFinalizado || !tieneResolucion}
                                        style={{ display: 'block', marginBottom: '8px' }}
                                    />
                                    {archivos.reniec && <span className="archivo-ok"> {archivos.reniec.name}</span>}
                                    {!tieneResolucion && !yaFinalizado && (
                                        <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '4px' }}>
                                             Requiere Resolución de Disolución primero
                                        </div>
                                    )}

                                    {archivos.reniec && !yaFinalizado && (
                                        <div style={{ marginTop: '16px', border: '1.5px solid #9ae6b4', borderRadius: '10px', overflow: 'hidden' }}>
                                            <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '12px',
                                                padding: '12px 16px',
                                                background: '#f0fff4',
                                            }}>
                                                <button
                                                    onClick={togglePreviaReniec}
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
                                                        transform: previaAbierta.reniec ? 'rotate(90deg)' : 'rotate(0deg)',
                                                        transition: 'transform 0.2s',
                                                    }}
                                                >
                                                    ▶
                                                </button>
                                                <div style={{ flex: 1 }}>
                                                    <p style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#0f3b6f', margin: 0 }}>
                                                        Constancia RENIEC
                                                    </p>
                                                    <p style={{ fontSize: '0.73rem', color: '#4a5568', margin: '2px 0 0' }}>
                                                        {archivos.reniec?.name}
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

                                            {previaAbierta.reniec && previewUrl.reniec && (
                                                <div style={{ borderTop: '2px solid #0f3b6f', background: '#1a1a2e' }}>
                                                    <div style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '8px 16px',
                                                        background: '#0f3b6f',
                                                    }}>
                                                        <span style={{ color: '#c7a03a', fontSize: '0.78rem', fontWeight: 600 }}>
                                                            Constancia RENIEC (previsualización)
                                                        </span>
                                                        <a
                                                            href={previewUrl.reniec}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            style={{ color: 'white', fontSize: '0.75rem', textDecoration: 'none' }}
                                                        >
                                                            Abrir en nueva pestaña ↗
                                                        </a>
                                                    </div>
                                                    <embed
                                                        src={previewUrl.reniec}
                                                        type="application/pdf"
                                                        style={{ width: '100%', height: '400px', border: 'none', display: 'block' }}
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {!yaFinalizado && (
                                <button
                                    className="btn-continuar"
                                    onClick={handleFinalizar}
                                    disabled={
                                        enviando || 
                                        (!archivos.sunarp && !archivosExistentes.sunarp) || 
                                        (!archivos.reniec && !archivosExistentes.reniec) ||
                                        !tieneResolucion
                                    }
                                >
                                    {enviando ? 'Finalizando...' : 'Finalizar Expediente'}
                                </button>
                            )}
                            {mensaje && <div className={`mensaje ${mensaje.includes('Expediente finalizado') ? 'success' : 'error'}`} style={{ marginTop: '1rem' }}>{mensaje}</div>}
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