import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/modulo3/Sidebar'
import BotonesNavegacion from '../../components/modulo3/BotonesNavegacion'
import PipelineVisual from '../../components/modulo3/PipelineVisual'
import PlazoAlerta from '../../components/modulo3/PlazoAlerta'
import { getArchivamientoData, subirCargosExternos } from '../../services/Modulo4Service'
import '../../styles/modulo3/resolucion-fundada.css'

export default function ArchivamientoExpediente() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [expediente, setExpediente] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [archivos, setArchivos] = useState({ sunarp: null, reniec: null })
    const [mensaje, setMensaje] = useState('')
    const [enviando, setEnviando] = useState(false)

    const [archivosExistentes, setArchivosExistentes] = useState({ sunarp: null, reniec: null })
    const [yaFinalizado, setYaFinalizado] = useState(false)

    // Estados para acordeón (solo cuando ya existen)
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
                    setMensaje('No se pudo cargar la información del expediente')
                }
            } catch (err) {
                setMensaje('Error al cargar: ' + err.message)
            } finally {
                setCargando(false)
            }
        }
        cargar()
    }, [id])

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
        setArchivos({ ...archivos, [tipo]: file })
        setMensaje('')
    }

    const handleFinalizar = async () => {
        if (yaFinalizado) {
            setMensaje('El expediente ya está finalizado')
            return
        }

        // Verificar si hay archivos nuevos o ya existentes
        const tieneSunarp = archivos.sunarp || archivosExistentes.sunarp
        const tieneReniec = archivos.reniec || archivosExistentes.reniec
        if (!tieneSunarp || !tieneReniec) {
            setMensaje('Debe adjuntar ambas constancias (SUNARP y RENIEC)')
            return
        }

        setEnviando(true)
        setMensaje('')
        try {
            // Enviar los archivos nuevos (si existen) o null si ya estaban
            const sunarpFile = archivos.sunarp || null
            const reniecFile = archivos.reniec || null
            const result = await subirCargosExternos(id, sunarpFile, reniecFile)
            if (result.ok) {
                setMensaje('✅ Expediente finalizado correctamente. Redirigiendo...')
                setYaFinalizado(true)
                setTimeout(() => navigate('/modulo3/expedientes'), 2000)
            } else {
                setMensaje('❌ Error: ' + (result.mensaje || 'No se pudo finalizar'))
            }
        } catch (err) {
            console.error('Error en handleFinalizar:', err)
            setMensaje('❌ Error de conexión: ' + (err.response?.data?.mensaje || err.message))
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

    const getPdfUrl = (ruta) => {
        if (!ruta) return '#'
        if (ruta.startsWith('http')) return ruta
        if (ruta.startsWith('/uploads')) return `http://localhost:3000${ruta}`
        return `http://localhost:3000/uploads/${ruta}`
    }

    const formatearFechaSubida = (fecha) => {
        if (!fecha) return ''
        return new Date(fecha).toLocaleDateString('es-PE')
    }

    const etapaActual = expediente?.etapa || 'ARCHIVADO'
    const getPipelineEtapa = () => 'archivar'

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
                        {/* Datos del expediente */}
                        <div className="seccion">
                            <h2>Datos del expediente</h2>
                            <div className="datos-grid">
                                <div><label>N° Expediente</label><p>{expediente.numero_expediente || '—'}</p></div>
                                <div><label>N° Mesa de Partes</label><p>{expediente.numero_mesa_partes || '—'}</p></div>
                                <div><label>Solicitante</label><p>{expediente.solicitante_nombre} (DNI: {expediente.solicitante_dni})</p></div>
                                <div><label>Demandado</label><p>{expediente.demandado_nombre} (DNI: {expediente.demandado_dni})</p></div>
                                <div><label>Resolución de Disolución</label><p>{expediente.num_resolucion || '—'} - Fecha: {formatFecha(expediente.fecha_elaboracion_resolucion)}</p></div>
                            </div>
                        </div>

                        {/* Cargos SUNARP y RENIEC */}
                        <div className="seccion">
                            <h2>Cargos SUNARP y RENIEC</h2>
                            {yaFinalizado && (
                                <div className="mensaje success" style={{ marginBottom: '1rem' }}>
                                    Ambos cargos registrados. El expediente está finalizado.
                                </div>
                            )}

                            {/* SUNARP */}
                            {archivosExistentes.sunarp ? (
                                // ✅ YA SUBIDO: Acordeón
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
                                // ❌ NO SUBIDO: Selector de archivo
                                <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Constancia SUNARP (PDF):</label>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => handleFileChange(e, 'sunarp')}
                                        disabled={enviando || yaFinalizado}
                                        style={{ display: 'block', marginBottom: '8px' }}
                                    />
                                    {archivos.sunarp && <span className="archivo-ok">✅ {archivos.sunarp.name}</span>}
                                </div>
                            )}

                            {/* RENIEC */}
                            {archivosExistentes.reniec ? (
                                // ✅ YA SUBIDO: Acordeón
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
                                // ❌ NO SUBIDO: Selector
                                <div style={{ marginBottom: '24px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                    <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Constancia RENIEC (PDF):</label>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => handleFileChange(e, 'reniec')}
                                        disabled={enviando || yaFinalizado}
                                        style={{ display: 'block', marginBottom: '8px' }}
                                    />
                                    {archivos.reniec && <span className="archivo-ok">✅ {archivos.reniec.name}</span>}
                                </div>
                            )}

                            {!yaFinalizado && (
                                <button
                                    className="btn-continuar"
                                    onClick={handleFinalizar}
                                    disabled={enviando || (!archivos.sunarp && !archivosExistentes.sunarp) || (!archivos.reniec && !archivosExistentes.reniec)}
                                >
                                    {enviando ? 'Finalizando...' : 'Finalizar Expediente'}
                                </button>
                            )}
                            {mensaje && <div className={`mensaje ${mensaje.includes('✅') ? 'success' : 'error'}`} style={{ marginTop: '1rem' }}>{mensaje}</div>}
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