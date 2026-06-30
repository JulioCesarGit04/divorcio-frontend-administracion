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
    const [sunarpPreviewUrl, setSunarpPreviewUrl] = useState(null)
    const [reniecPreviewUrl, setReniecPreviewUrl] = useState(null)
    const [mensaje, setMensaje] = useState('')
    const [enviando, setEnviando] = useState(false)

    const [archivosExistentes, setArchivosExistentes] = useState({ sunarp: null, reniec: null })
    const [yaFinalizado, setYaFinalizado] = useState(false)

    const [pdfAbiertoSunarp, setPdfAbiertoSunarp] = useState(false)
    const [pdfAbiertoReniec, setPdfAbiertoReniec] = useState(false)

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

    // Limpiar URLs de preview al desmontar
    useEffect(() => {
        return () => {
            if (sunarpPreviewUrl) URL.revokeObjectURL(sunarpPreviewUrl)
            if (reniecPreviewUrl) URL.revokeObjectURL(reniecPreviewUrl)
        }
    }, [sunarpPreviewUrl, reniecPreviewUrl])

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

        // Limpiar preview anterior del mismo tipo
        if (tipo === 'sunarp' && sunarpPreviewUrl) {
            URL.revokeObjectURL(sunarpPreviewUrl)
            setSunarpPreviewUrl(null)
        }
        if (tipo === 'reniec' && reniecPreviewUrl) {
            URL.revokeObjectURL(reniecPreviewUrl)
            setReniecPreviewUrl(null)
        }

        if (file) {
            const url = URL.createObjectURL(file)
            if (tipo === 'sunarp') setSunarpPreviewUrl(url)
            else setReniecPreviewUrl(url)
        }

        setArchivos({ ...archivos, [tipo]: file })
        setMensaje('')
    }

    const handleFinalizar = async () => {
        if (yaFinalizado) {
            setMensaje('El expediente ya esta finalizado')
            return
        }

        // Validar que existe la Resolución de Disolución
        const tieneResolucion = expediente?.num_resolucion && expediente?.fecha_elaboracion_resolucion;
        if (!tieneResolucion) {
            setMensaje('⚠️ Primero debe subir la Resolución de Disolución en la página correspondiente.');
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
                // Limpiar previews después de subir
                if (sunarpPreviewUrl) { URL.revokeObjectURL(sunarpPreviewUrl); setSunarpPreviewUrl(null) }
                if (reniecPreviewUrl) { URL.revokeObjectURL(reniecPreviewUrl); setReniecPreviewUrl(null) }
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

    // Verificar si existe resolución de disolución
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
                            <div className="datos-grid">
                                <div><label>N° Expediente</label><p>{expediente.numero_expediente || '—'}</p></div>
                                <div><label>N° Mesa de Partes</label><p>{expediente.numero_mesa_partes || '—'}</p></div>
                                <div><label>Solicitante</label><p>{expediente.solicitante_nombre} (DNI: {expediente.solicitante_dni})</p></div>
                                <div><label>Demandado</label><p>{expediente.demandado_nombre} (DNI: {expediente.demandado_dni})</p></div>
                                <div>
                                    <label>Resolucion de Disolucion</label>
                                    <p>
                                        {expediente.num_resolucion || '—'} 
                                        {expediente.fecha_elaboracion_resolucion && ` - Fecha: ${formatFecha(expediente.fecha_elaboracion_resolucion)}`}
                                        {!tieneResolucion && <span style={{ color: '#dc2626', fontWeight: 'bold', marginLeft: '8px' }}>(No subida)</span>}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="seccion">
                            <h2>Cargos SUNARP y RENIEC</h2>

                            {yaFinalizado && (
                                <div className="mensaje success" style={{ marginBottom: '1rem' }}>
                                    Ambos cargos registrados. El expediente esta finalizado.
                                </div>
                            )}

                            {/* SUNARP */}
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
                                            <iframe
                                                src={getPdfUrl(archivosExistentes.sunarp.ruta)}
                                                title="SUNARP"
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

                                    {/*  PREVISUALIZACIÓN SUNARP */}
                                    {sunarpPreviewUrl && !yaFinalizado && (
                                        <div style={{ marginTop: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                            <div style={{
                                                background: '#1a1a2e',
                                                padding: '8px 16px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <span style={{ color: '#c7a03a', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                    VISTA PREVIA DEL DOCUMENTO
                                                </span>
                                                <span style={{ color: 'white', fontSize: '0.75rem' }}>
                                                    {archivos.sunarp?.name}
                                                </span>
                                            </div>
                                            <div style={{
                                                background: '#0f3b6f',
                                                padding: '6px 16px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <span style={{ color: 'white', fontSize: '0.8rem' }}>
                                                    <strong>Constancia SUNARP</strong> (previsualización)
                                                </span>
                                                <a
                                                    href={sunarpPreviewUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{ color: '#c7a03a', fontSize: '0.75rem', textDecoration: 'none' }}
                                                >
                                                    Abrir en nueva pestaña ↗
                                                </a>
                                            </div>
                                            <iframe
                                                src={sunarpPreviewUrl}
                                                title="Vista previa SUNARP"
                                                style={{
                                                    width: '100%',
                                                    height: '500px',
                                                    border: 'none',
                                                    display: 'block'
                                                }}
                                            />
                                            <div style={{
                                                background: '#f1f5f9',
                                                padding: '4px 16px',
                                                fontSize: '0.75rem',
                                                color: '#475569',
                                                borderTop: '1px solid #e2e8f0'
                                            }}>
                                                Previsualizando
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* RENIEC */}
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
                                            <iframe
                                                src={getPdfUrl(archivosExistentes.reniec.ruta)}
                                                title="RENIEC"
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

                                    {/*  PREVISUALIZACIÓN RENIEC */}
                                    {reniecPreviewUrl && !yaFinalizado && (
                                        <div style={{ marginTop: '16px', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                            <div style={{
                                                background: '#1a1a2e',
                                                padding: '8px 16px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <span style={{ color: '#c7a03a', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                    VISTA PREVIA DEL DOCUMENTO
                                                </span>
                                                <span style={{ color: 'white', fontSize: '0.75rem' }}>
                                                    {archivos.reniec?.name}
                                                </span>
                                            </div>
                                            <div style={{
                                                background: '#0f3b6f',
                                                padding: '6px 16px',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}>
                                                <span style={{ color: 'white', fontSize: '0.8rem' }}>
                                                    <strong>Constancia RENIEC</strong> (previsualización)
                                                </span>
                                                <a
                                                    href={reniecPreviewUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{ color: '#c7a03a', fontSize: '0.75rem', textDecoration: 'none' }}
                                                >
                                                    Abrir en nueva pestaña ↗
                                                </a>
                                            </div>
                                            <iframe
                                                src={reniecPreviewUrl}
                                                title="Vista previa RENIEC"
                                                style={{
                                                    width: '100%',
                                                    height: '500px',
                                                    border: 'none',
                                                    display: 'block'
                                                }}
                                            />
                                            <div style={{
                                                background: '#f1f5f9',
                                                padding: '4px 16px',
                                                fontSize: '0.75rem',
                                                color: '#475569',
                                                borderTop: '1px solid #e2e8f0'
                                            }}>
                                                Previsualizando
                                            </div>
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