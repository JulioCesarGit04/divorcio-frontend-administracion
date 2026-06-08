import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/modulo3/Sidebar'
import BotonesNavegacion from '../../components/modulo3/BotonesNavegacion'
import PipelineVisual from '../../components/modulo3/PipelineVisual'
import PlazoAlerta from '../../components/modulo3/PlazoAlerta'
import { 
    getArchivamientoData,
    subirCargosExternos
} from '../../services/Modulo4Service'
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

    // Estados para el visor de PDF
    const [visorAbierto, setVisorAbierto] = useState(false)
    const [pdfUrl, setPdfUrl] = useState('')
    const [tituloPdf, setTituloPdf] = useState('')

    useEffect(() => {
        const cargar = async () => {
            try {
                const res = await getArchivamientoData(id)
                if (res.ok && res.data) {
                    setExpediente(res.data)
                    const sunarpExistente = res.data.ruta_sunarp || null
                    const reniecExistente = res.data.ruta_reniec || null
                    setArchivosExistentes({ sunarp: sunarpExistente, reniec: reniecExistente })
                    if (sunarpExistente && reniecExistente) {
                        setYaFinalizado(true)
                    }
                } else {
                    setMensaje('No se pudo cargar la información del expediente')
                }
            } catch (err) {
                console.error(err)
                setMensaje('Error al cargar el expediente: ' + err.message)
            } finally {
                setCargando(false)
            }
        }
        cargar()
    }, [id])

    const handleFileChange = (e, tipo) => {
        if (yaFinalizado) {
            setMensaje('Los archivos ya fueron subidos y no se pueden modificar')
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
            setMensaje('Este expediente ya fue finalizado. No se pueden subir archivos nuevamente.')
            return
        }
        const tieneSunarp = archivos.sunarp || archivosExistentes.sunarp
        const tieneReniec = archivos.reniec || archivosExistentes.reniec
        if (!tieneSunarp || !tieneReniec) {
            setMensaje('Debe adjuntar las constancias de SUNARP y RENIEC')
            return
        }
        setEnviando(true)
        setMensaje('')
        try {
            const sunarpFile = archivos.sunarp || null
            const reniecFile = archivos.reniec || null
            const result = await subirCargosExternos(id, sunarpFile, reniecFile)
            if (result.ok) {
                setMensaje(' Expediente finalizado correctamente. Redirigiendo...')
                setYaFinalizado(true)
                setTimeout(() => navigate('/modulo3/expedientes'), 2000)
            } else {
                setMensaje('Error: ' + (result.mensaje || 'No se pudo finalizar'))
            }
        } catch (err) {
            setMensaje('Error de conexión: ' + err.message)
        } finally {
            setEnviando(false)
        }
    }

    const formatFecha = (fechaStr) => {
        if (!fechaStr) return '—'
        const clean = fechaStr.split('T')[0]
        const [year, month, day] = clean.split('-')
        return `${day}/${month}/${year}`
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

    // Abrir PDF en modal
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
                <p>Cargando expediente...</p>
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
                <p>No se encontró el expediente</p>
                <button className="btn-continuar" onClick={() => navigate('/modulo4')}>Volver</button>
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
                                <div><label>Resolución de Disolución</label><p>{expediente.num_resolucion || '—'} - Fecha: {formatFecha(expediente.fecha_elaboracion_resolucion)}</p></div>
                            </div>
                        </div>

                        <div className="seccion">
                            <h2>Cargos SUNARP y RENIEC</h2>
                            {yaFinalizado ? (
                                <div className="mensaje success" style={{ marginBottom: '1rem' }}>
                                     Ambos cargos ya fueron subidos y registrados. El expediente está finalizado.
                                </div>
                            ) : (
                                <p style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '1rem' }}>
                                    Adjunte las constancias de SUNARP y RENIEC. Una vez subidas, quedarán bloqueadas.
                                </p>
                            )}
                            <div className="rf-campos-fila" style={{ flexDirection: 'column', gap: '1rem' }}>

                                {/* SUNARP */}
                                <div className="rf-campo">
                                    <label>Constancia SUNARP (PDF):</label>
                                    <div className="rf-archivo" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {archivosExistentes.sunarp ? (
                                            <>
                                                <span className="archivo-ok" style={{ backgroundColor: '#e6f7e6', padding: '0.3rem 0.7rem', borderRadius: '0.5rem' }}>
                                                    {getNombreArchivo(archivosExistentes.sunarp)}
                                                </span>
                                                <span className="estado-subido">✔ Bloqueado</span>
                                                <button
                                                    className="btn-ver"
                                                    onClick={() => verPdfEnModal(archivosExistentes.sunarp, 'Constancia SUNARP')}
                                                >
                                                    Ver PDF
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 'sunarp')} disabled={enviando || yaFinalizado} id="sunarp-file" style={{ display: 'none' }} />
                                                <label htmlFor="sunarp-file" className="btn-ver" style={{ cursor: yaFinalizado ? 'not-allowed' : 'pointer', opacity: yaFinalizado ? 0.6 : 1 }}>
                                                    Seleccionar archivo
                                                </label>
                                                {archivos.sunarp && <span className="archivo-ok">{archivos.sunarp.name}</span>}
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* RENIEC */}
                                <div className="rf-campo">
                                    <label>Constancia RENIEC (PDF):</label>
                                    <div className="rf-archivo" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {archivosExistentes.reniec ? (
                                            <>
                                                <span className="archivo-ok" style={{ backgroundColor: '#e6f7e6', padding: '0.3rem 0.7rem', borderRadius: '0.5rem' }}>
                                                    {getNombreArchivo(archivosExistentes.reniec)}
                                                </span>
                                                <span className="estado-subido">✔ Bloqueado</span>
                                                <button
                                                    className="btn-ver"
                                                    onClick={() => verPdfEnModal(archivosExistentes.reniec, 'Constancia RENIEC')}
                                                >
                                                    Ver PDF
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <input type="file" accept=".pdf" onChange={(e) => handleFileChange(e, 'reniec')} disabled={enviando || yaFinalizado} id="reniec-file" style={{ display: 'none' }} />
                                                <label htmlFor="reniec-file" className="btn-ver" style={{ cursor: yaFinalizado ? 'not-allowed' : 'pointer', opacity: yaFinalizado ? 0.6 : 1 }}>
                                                    Seleccionar archivo
                                                </label>
                                                {archivos.reniec && <span className="archivo-ok">{archivos.reniec.name}</span>}
                                            </>
                                        )}
                                    </div>
                                </div>

                            </div>
                            {!yaFinalizado && (
                                <button className="btn-continuar" onClick={handleFinalizar} disabled={enviando || (!archivos.sunarp && !archivosExistentes.sunarp) || (!archivos.reniec && !archivosExistentes.reniec)} style={{ marginTop: '1rem' }}>
                                    {enviando ? 'Finalizando...' : 'Finalizar Expediente'}
                                </button>
                            )}
                            {mensaje && <div className={`mensaje ${mensaje.includes('correctamente') ? 'success' : 'error'}`} style={{ marginTop: '1rem' }}>{mensaje}</div>}
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