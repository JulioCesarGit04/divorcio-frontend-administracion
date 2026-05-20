import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/modulo3/Sidebar'
import BotonesNavegacion from '../../components/modulo3/BotonesNavegacion'
import PipelineVisual from '../../components/modulo3/PipelineVisual'
import PlazoAlerta from '../../components/modulo3/PlazoAlerta'
import { getExpedienteById, getAudiencias, registrarResultadoAudiencia, subirDocumentoInterno, getDocumentosInternos } from '../../services/ProcedimientoService'
import '../../styles/modulo3/registrar-audiencia.css'

export default function RegistrarAudiencia() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [expediente, setExpediente] = useState(null)
    const [audiencia, setAudiencia] = useState(null)
    const [historialAudiencias, setHistorialAudiencias] = useState([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState(null)
    const [enviando, setEnviando] = useState(false)
    const [mensaje, setMensaje] = useState(null)
    
    const [asistioSolicitante, setAsistioSolicitante] = useState(false)
    const [asistioDemandado, setAsistioDemandado] = useState(false)
    const [resultado, setResultado] = useState('')
    const [archivos, setArchivos] = useState({
        acta1: null,
        acta2: null,
        acta3: null
    })

    const [actasSubidas, setActasSubidas] = useState({
        acta1: null,
        acta2: null,
        acta3: null
    })

    const etapaActual = expediente?.etapa || expediente?.expedientes_estado_actual

    const getPipelineEtapa = () => {
        switch(etapaActual) {
            case 'EVALUACION': return 'revision'
            case 'DOCUMENTOS_INTERNOS': return 'documentos'
            case 'AUDIENCIA': return 'audiencia'
            case 'ESPERA_LEGAL': return 'resolucion'
            default: return 'revision'
        }
    }

    const getPdfUrl = (ruta) => {
        if (!ruta) return '#'
        if (ruta.startsWith('http')) return ruta
        if (ruta.startsWith('/uploads')) return `http://localhost:3000${ruta}`
        return `http://localhost:3000/uploads/${ruta}`
    }

    const getUsuarioLogueado = () => {
        return localStorage.getItem('usuario_nombre') || 
               localStorage.getItem('email') || 
               localStorage.getItem('usuario') || 
               'sistema'
    }

    const formatFechaLocal = (fechaStr) => {
        if (!fechaStr) return '—'
        return fechaStr.split('T')[0].split('-').reverse().join('/')
    }

    const formatHoraLocal = (fechaStr) => {
        if (!fechaStr) return '—'
        
        let hora, minuto
        if (fechaStr.includes('T')) {
            const horaParte = fechaStr.split('T')[1]
            hora = horaParte.split(':')[0]
            minuto = horaParte.split(':')[1]
        } else if (fechaStr.includes(' ')) {
            const horaParte = fechaStr.split(' ')[1]
            hora = horaParte.split(':')[0]
            minuto = horaParte.split(':')[1]
        } else {
            return '—'
        }
        
        const horaInt = parseInt(hora)
        const hora12 = horaInt % 12 || 12
        const ampm = horaInt >= 12 ? 'p. m.' : 'a. m.'
        return `${hora12}:${minuto} ${ampm}`
    }

    const puedeReprogramar = () => {
        if (!audiencia) return true
        const intentoActual = audiencia.numero_intento || 1
        return intentoActual === 1
    }

    const intentosRestantes = () => {
        if (!audiencia) return 1
        const intentoActual = audiencia.numero_intento || 1
        return 2 - intentoActual
    }

    const ambosAsistieron = () => {
        return asistioSolicitante && asistioDemandado
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

                const resAudiencias = await getAudiencias(id)
                const audienciasData = resAudiencias?.data || resAudiencias || []
                setHistorialAudiencias(audienciasData)
                
                let audienciaEncontrada = audienciasData.find(a => a.es_actual === true || a.es_actual === 1)
                let mensajeError = null
                
                if (!audienciaEncontrada) {
                    audienciaEncontrada = audienciasData.find(a => a.estado === 'PROGRAMADA')
                }
                
                if (!audienciaEncontrada) {
                    audienciaEncontrada = audienciasData.find(a => a.estado === 'REALIZADA')
                    if (audienciaEncontrada) {
                        mensajeError = 'Esta audiencia ya fue registrada. Los datos son solo de consulta.'
                    } else {
                        audienciaEncontrada = audienciasData.find(a => a.estado === 'REPROGRAMADA')
                        if (audienciaEncontrada) {
                            mensajeError = 'Esta audiencia fue reprogramada. Debe programar una nueva fecha.'
                        } else {
                            mensajeError = 'No hay una audiencia programada para este expediente'
                        }
                    }
                }

                // FIX: Cargar asistencia y resultado si la audiencia ya fue registrada
                if (audienciaEncontrada?.estado === 'REALIZADA') {
                    setAsistioSolicitante(!!audienciaEncontrada.asistio_solicitante)
                    setAsistioDemandado(!!audienciaEncontrada.asistio_demandado)
                    setResultado(audienciaEncontrada.resultado || '')
                }
                
                setAudiencia(audienciaEncontrada)
                setError(mensajeError)

                const resDocs = await getDocumentosInternos(id)
                const docsData = resDocs?.data || resDocs || []

                const actas1 = docsData.filter(d => d.tipo_documento === 'ACTA_AUDIENCIA_01').sort((a, b) => new Date(b.subido_en) - new Date(a.subido_en))
                const actas2 = docsData.filter(d => d.tipo_documento === 'ACTA_AUDIENCIA_02').sort((a, b) => new Date(b.subido_en) - new Date(a.subido_en))
                const actas3 = docsData.filter(d => d.tipo_documento === 'ACTA_AUDIENCIA_03').sort((a, b) => new Date(b.subido_en) - new Date(a.subido_en))

                setActasSubidas({
                    acta1: actas1[0] || null,
                    acta2: actas2[0] || null,
                    acta3: actas3[0] || null
                })

            } catch (err) {
                console.error('Error:', err)
                setError(err.message)
            } finally {
                setCargando(false)
            }
        }
        cargar()
    }, [id])

    const handleArchivoChange = (tipo, file) => {
        if (file && file.type !== 'application/pdf') {
            setMensaje({ tipo: 'error', texto: 'Solo se permiten archivos PDF' })
            return
        }
        setArchivos(prev => ({ ...prev, [tipo]: file }))
        setMensaje(null)
    }

    const handleSubmit = async () => {
        if (!resultado) {
            setMensaje({ tipo: 'error', texto: 'Debe seleccionar el resultado de la audiencia' })
            return
        }

        if (!expediente?.Solicitante_Id || !expediente?.Demandado_Id) {
            setMensaje({ tipo: 'error', texto: 'Error: No se encontraron los IDs de los conyuges' })
            return
        }

        if (resultado === 'RATIFICACION' && !ambosAsistieron()) {
            setMensaje({ tipo: 'error', texto: 'Para ratificar, ambos conyuges deben asistir a la audiencia' })
            return
        }

        if (resultado === 'RATIFICACION') {
            const acta1Subida = actasSubidas.acta1 || archivos.acta1
            const acta2Subida = actasSubidas.acta2 || archivos.acta2
            const acta3Subida = actasSubidas.acta3 || archivos.acta3
            
            if (!acta1Subida || !acta2Subida || !acta3Subida) {
                setMensaje({ tipo: 'error', texto: 'Debe subir las 3 actas de audiencia (PDF)' })
                return
            }
        }

        if (resultado === 'DESISTIMIENTO') {
            const confirmar = window.confirm('ATENCION\n\nEl desistimiento cancelara TODO el proceso.\n\nEsta seguro de que desea cancelar el expediente?')
            if (!confirmar) return
        }

        if (resultado === 'INASISTENCIA') {
            const intentoActual = audiencia?.numero_intento || 1
            
            if (intentoActual >= 2) {
                const confirmar = window.confirm(
                    `ATENCION\n\n` +
                    `Esta es la SEGUNDA inasistencia.\n\n` +
                    `El proceso se CANCELARA definitivamente.\n\n` +
                    `Desea continuar?`
                )
                if (!confirmar) return
            } else {
                const confirmar = window.confirm(
                    `ATENCION\n\n` +
                    `La inasistencia permitira reprogramar la audiencia UNA sola vez mas.\n\n` +
                    `Si vuelven a faltar en la proxima audiencia, el proceso se CANCELARA.\n\n` +
                    `Desea continuar?`
                )
                if (!confirmar) return
            }
        }

        setEnviando(true)
        setMensaje(null)

        try {
            const usuario = getUsuarioLogueado()

            if (resultado === 'RATIFICACION') {
                if (archivos.acta1) {
                    await subirDocumentoInterno(id, 'ACTA_AUDIENCIA_01', null, new Date().toISOString().split('T')[0], archivos.acta1, usuario)
                }
                if (archivos.acta2) {
                    await subirDocumentoInterno(id, 'ACTA_AUDIENCIA_02', null, new Date().toISOString().split('T')[0], archivos.acta2, usuario)
                }
                if (archivos.acta3) {
                    await subirDocumentoInterno(id, 'ACTA_AUDIENCIA_03', null, new Date().toISOString().split('T')[0], archivos.acta3, usuario)
                }
            }

            await registrarResultadoAudiencia(
                audiencia.id,
                resultado,
                asistioSolicitante ? 1 : 0,
                asistioDemandado ? 1 : 0,
                expediente.Solicitante_Id,
                expediente.Demandado_Id,
                usuario
            )

            if (resultado === 'RATIFICACION') {
                setMensaje({ tipo: 'success', texto: 'Ratificacion registrada. El expediente pasa a ESPERA LEGAL por 2 meses.' })
                setTimeout(() => navigate(`/modulo3/detalle/${id}`), 2000)
            } 
            else if (resultado === 'DESISTIMIENTO') {
                setMensaje({ tipo: 'warning', texto: 'Desistimiento registrado. El expediente ha sido cancelado.' })
                setTimeout(() => navigate('/modulo3/expedientes'), 2000)
            }
            else if (resultado === 'INASISTENCIA') {
                const intentoActual = audiencia?.numero_intento || 1
                if (intentoActual >= 2) {
                    setMensaje({ tipo: 'warning', texto: 'Segunda inasistencia registrada. El expediente ha sido cancelado.' })
                    setTimeout(() => navigate('/modulo3/expedientes'), 2000)
                } else {
                    setMensaje({ tipo: 'warning', texto: 'Inasistencia registrada. Podra reprogramar la audiencia.' })
                    setTimeout(() => navigate(`/modulo3/expediente/${id}/programar-audiencia`), 2000)
                }
            }

        } catch (err) {
            console.error('Error:', err)
            setMensaje({ tipo: 'error', texto: err.message || 'Error al registrar audiencia' })
        } finally {
            setEnviando(false)
        }
    }

    // Verificar si el expediente está cancelado o archivado
    if (expediente?.estado === 'CANCELADO' || expediente?.estado === 'ARCHIVADO') {
        return (
            <>
                <Sidebar />
                <main className="contenido-modulo3">
                    <div className="detalle-header">
                        <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>← Volver</button>
                        <h1>Registrar Audiencia</h1>
                    </div>
                    <div className="estado-container">
                        <div className="estado-icono">{expediente?.estado === 'CANCELADO' ? '❌' : '✅'}</div>
                        <h2>{expediente?.estado === 'CANCELADO' ? 'Expediente Cancelado' : 'Expediente Archivado'}</h2>
                        <p>{expediente?.estado === 'CANCELADO' 
                            ? 'Este expediente ha sido cancelado.' 
                            : 'Este expediente ha sido completado y archivado.'}
                        </p>
                        <p>No es posible registrar una audiencia.</p>
                        <button className="btn-volver-detalle" onClick={() => navigate(`/modulo3/detalle/${id}`)}>
                            Volver al detalle del expediente
                        </button>
                    </div>
                </main>
            </>
        )
    }

    if (cargando) {
        return (
            <>
                <Sidebar />
                <main className="contenido-modulo3">
                    <div className="pagina-header">
                        <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>← Volver</button>
                        <h1>Registrar Audiencia</h1>
                    </div>
                    <p>Cargando...</p>
                </main>
            </>
        )
    }

    if (error && !audiencia) {
        return (
            <>
                <Sidebar />
                <main className="contenido-modulo3">
                    <div className="pagina-header">
                        <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>← Volver</button>
                        <h1>Registrar Audiencia</h1>
                    </div>
                    <div className="mensaje-error" style={{ color: 'red', textAlign: 'center', padding: '20px' }}>
                        <p>{error}</p>
                        <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>Volver al expediente</button>
                    </div>
                </main>
            </>
        )
    }

    const numeroMesaPartes = expediente?.numero_mesa_partes || expediente?.expedientes_nro_mesa_partes
    const yaFueRegistrada = audiencia?.estado === 'REALIZADA'
    const esRatificacion = resultado === 'RATIFICACION' || (yaFueRegistrada && audiencia?.resultado === 'RATIFICACION')

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="detalle-header">
                    <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>← Volver</button>
                    <h1>Registrar Audiencia</h1>
                    <span className="estado-badge">Expediente {numeroMesaPartes || '—'}</span>
                </div>

                

                

                <div style={{ display: 'flex', gap: '30px' }}>
                    <div style={{ flex: 2 }}>
                        {yaFueRegistrada && (
                    <div className="alerta-info" style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
                        Esta audiencia ya fue registrada. Los datos son solo de consulta.
                    </div>
                )}
                        <PlazoAlerta 
                    expediente={expediente}
                    audienciaActual={audiencia}
                />
                        <div className="seccion">
                            <h2>DATOS DEL EXPEDIENTE</h2>
                            <div className="expediente-grid">
                                <div><label>N° Expediente:</label><span>{expediente?.numero_expediente || '—'}</span></div>
                                <div><label>N° Mesa de Partes:</label><span>{expediente?.numero_mesa_partes || '—'}</span></div>
                                <div><label>Fecha de pago:</label><span>{formatFechaLocal(expediente?.fecha_pago)}</span></div>
                                <div><label>Etapa actual:</label><span className="etapa-badge">{expediente?.etapa || '—'}</span></div>
                            </div>
                        </div>

                        <div className="seccion">
                            <h2>CONYUGES</h2>
                            <div className="conyuges-info">
                                <div className="conyuge-card">
                                    <div className="conyuge-titulo">Solicitante</div>
                                    <div><strong>{expediente?.Solicitante_Nombres || '—'} {expediente?.Solicitante_Apellidos || ''}</strong></div>
                                    <div>DNI: {expediente?.Solicitante_Dni || '—'}</div>
                                    <div>Telefono: {expediente?.Solicitante_Telefono || '—'}</div>
                                    <div>Direccion: {expediente?.Solicitante_Direccion || '—'}</div>
                                </div>
                                <div className="conyuge-card">
                                    <div className="conyuge-titulo">Demandado</div>
                                    <div><strong>{expediente?.Demandado_Nombres || '—'} {expediente?.Demandado_Apellidos || ''}</strong></div>
                                    <div>DNI: {expediente?.Demandado_Dni || '—'}</div>
                                    <div>Telefono: {expediente?.Demandado_Telefono || '—'}</div>
                                    <div>Direccion: {expediente?.Demandado_Direccion || '—'}</div>
                                </div>
                            </div>
                        </div>

                        <div className="seccion">
                            <h2>AUDIENCIA ACTUAL</h2>
                            <div className="info-audiencia">
                                <div className="info-card">
                                    <label>Fecha</label>
                                    <span>{audiencia ? formatFechaLocal(audiencia.fecha_programada) : '—'}</span>
                                </div>
                                <div className="info-card">
                                    <label>Hora</label>
                                    <span>{audiencia ? formatHoraLocal(audiencia.fecha_programada) : '—'}</span>
                                </div>
                                <div className="info-card">
                                    <label>Intento</label>
                                    <span>{audiencia?.numero_intento || 1}/2</span>
                                </div>
                            </div>
                        </div>

                        <div className="seccion">
                            <h2>ASISTENCIA</h2>
                            <div className="asistencia-opciones">
                                <label className={`opcion-asistencia ${asistioSolicitante ? 'asistio' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={asistioSolicitante}
                                        onChange={(e) => setAsistioSolicitante(e.target.checked)}
                                        disabled={yaFueRegistrada}
                                    />
                                    <span>Solicitante asistió</span>
                                    <small>{expediente?.Solicitante_Nombres || '—'} {expediente?.Solicitante_Apellidos || ''}</small>
                                </label>
                                <label className={`opcion-asistencia ${asistioDemandado ? 'asistio' : ''}`}>
                                    <input
                                        type="checkbox"
                                        checked={asistioDemandado}
                                        onChange={(e) => setAsistioDemandado(e.target.checked)}
                                        disabled={yaFueRegistrada}
                                    />
                                    <span>Demandado asistió</span>
                                    <small>{expediente?.Demandado_Nombres || '—'} {expediente?.Demandado_Apellidos || ''}</small>
                                </label>
                            </div>
                        </div>

                        {historialAudiencias.filter(a => a.id !== audiencia?.id).length > 0 && (
                            <div className="seccion">
                                <h2>HISTORIAL DE AUDIENCIAS</h2>
                                <div className="historial-audiencias">
                                    {historialAudiencias.filter(a => a.id !== audiencia?.id).map((a, idx) => (
                                        <div key={a.id} className="historial-item">
                                            <div className="historial-fecha">{formatFechaLocal(a.fecha_programada)}</div>
                                            <div className="historial-hora">{formatHoraLocal(a.fecha_programada)}</div>
                                            <div className="historial-estado">
                                                {a.estado === 'REPROGRAMADA' && 'Reprogramada'}
                                                {a.estado === 'REALIZADA' && 'Realizada'}
                                                {a.estado === 'CANCELADA' && 'Cancelada'}
                                                {a.estado === 'PROGRAMADA' && a.id !== audiencia?.id && 'Anterior'}
                                            </div>
                                            <div className="historial-resultado">
                                                {a.resultado === 'INASISTENCIA' && 'Inasistencia'}
                                                {a.resultado === 'DESISTIMIENTO' && 'Desistimiento'}
                                                {a.resultado === 'RATIFICACION' && 'Ratificacion'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

            
                        <div className="seccion">
                            <h2>RESULTADO DE LA AUDIENCIA</h2>
                            <div className="resultado-opciones">
                                <label className={`opcion-resultado ${resultado === 'RATIFICACION' ? 'seleccionado' : ''}`}>
                                    <input type="radio" name="resultado" value="RATIFICACION" checked={resultado === 'RATIFICACION'} onChange={(e) => setResultado(e.target.value)} disabled={yaFueRegistrada || !ambosAsistieron()} />
                                    <span>Ratificacion</span>
                                    <small>Ambos conyuges confirman su voluntad de divorciarse</small>
                                    {!ambosAsistieron() && <small className="aviso-requisito"> (Requiere que ambos asistan)</small>}
                                </label>
                                <label className={`opcion-resultado ${resultado === 'DESISTIMIENTO' ? 'seleccionado' : ''}`}>
                                    <input type="radio" name="resultado" value="DESISTIMIENTO" checked={resultado === 'DESISTIMIENTO'} onChange={(e) => setResultado(e.target.value)} disabled={yaFueRegistrada} />
                                    <span>Desistimiento</span>
                                    <small>Uno o ambos conyuges ya no desean divorciarse</small>
                                </label>
                                <label className={`opcion-resultado ${resultado === 'INASISTENCIA' ? 'seleccionado' : ''}`}>
                                    <input type="radio" name="resultado" value="INASISTENCIA" checked={resultado === 'INASISTENCIA'} onChange={(e) => setResultado(e.target.value)} disabled={yaFueRegistrada} />
                                    <span>Inasistencia</span>
                                    <small>Uno o ambos conyuges no asistieron a la audiencia</small>
                                    {audiencia?.numero_intento >= 2 && (
                                        <small className="aviso-max"> (Segunda inasistencia cancelara el proceso)</small>
                                    )}
                                </label>
                            </div>
                        </div>

                        {/* Mostrar actas siempre que haya ratificacion */}
                        {esRatificacion && (
                            <div className="seccion">
                                <h2>ACTAS DE AUDIENCIA</h2>
                                <div className="actas-upload">
                                    {['acta1', 'acta2', 'acta3'].map((acta, idx) => {
                                        const actaData = actasSubidas[acta]
                                        const num = idx + 1
                                        return (
                                            <div key={acta} className="acta-item">
                                                <label>Acta {num}:</label>
                                                {actaData ? (
                                                    <div className="acta-existente">
                                                        <span className="archivo-ok"> {actaData.nombre_archivo || `Acta ${num}`}</span>
                                                        <button className="btn-ver-acta" onClick={() => window.open(getPdfUrl(actaData.ruta_archivo), '_blank')}>Ver PDF</button>
                                                    </div>
                                                ) : (
                                                    <div className="acta-upload">
                                                        {!yaFueRegistrada ? (
                                                            <>
                                                                <input type="file" accept=".pdf" onChange={(e) => handleArchivoChange(acta, e.target.files[0])} />
                                                                {archivos[acta] && <span className="archivo-ok"> {archivos[acta].name}</span>}
                                                                {!archivos[acta] && <span className="archivo-pendiente">Seleccione un archivo PDF</span>}
                                                            </>
                                                        ) : (
                                                            <span className="archivo-pendiente">No se encontró acta</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {mensaje && (
                            <div className={`mensaje ${mensaje.tipo}`} style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px' }}>
                                {mensaje.texto}
                            </div>
                        )}

                        {resultado === 'DESISTIMIENTO' && !yaFueRegistrada && (
                            <div className="seccion">
                                <div className="aviso-desistimiento" style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                                    Al confirmar el desistimiento, el expediente sera CANCELADO y el proceso finalizara.
                                </div>
                                <button className="btn-cancelar-proceso" onClick={handleSubmit} disabled={enviando} style={{ backgroundColor: '#dc2626', color: 'white', width: '100%', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                                    {enviando ? 'Procesando...' : 'Cancelar Expediente'}
                                </button>
                            </div>
                        )}

                        {resultado === 'INASISTENCIA' && !yaFueRegistrada && (
                            <div className="seccion">
                                {audiencia?.numero_intento >= 2 ? (
                                    <>
                                        <div className="aviso-inasistencia" style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                                            ⚠️ Esta es la SEGUNDA inasistencia. El proceso se CANCELARA definitivamente.
                                        </div>
                                        <button className="btn-cancelar-proceso" onClick={handleSubmit} disabled={enviando} style={{ backgroundColor: '#dc2626', color: 'white', width: '100%', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                                            {enviando ? 'Procesando...' : 'Cancelar Expediente'}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <div className="aviso-inasistencia" style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                                            Al confirmar la inasistencia, podra reprogramar la audiencia.
                                        </div>
                                        <button className="btn-reprogramar" onClick={handleSubmit} disabled={enviando} style={{ backgroundColor: '#f59e0b', color: 'white', width: '100%', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                                            {enviando ? 'Procesando...' : 'Reprogramar Audiencia'}
                                        </button>
                                    </>
                                )}
                            </div>
                        )}

                        {resultado === 'RATIFICACION' && !yaFueRegistrada && (
                            <div className="seccion">
                                <button className="btn-registrar" onClick={handleSubmit} disabled={enviando} style={{ backgroundColor: '#22c55e', color: 'white', width: '100%', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                                    {enviando ? 'Registrando...' : 'Registrar Ratificacion'}
                                </button>
                            </div>
                        )}
                    </div>

                    <div style={{ flex: 1 }}>
                        <BotonesNavegacion expedienteId={id} etapaActual={etapaActual} />
                        <PipelineVisual etapaActual={getPipelineEtapa()} />
                    </div>
                </div>
            </main>
        </>
    )
}