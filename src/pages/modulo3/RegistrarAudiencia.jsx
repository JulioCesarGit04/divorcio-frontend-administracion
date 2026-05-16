import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/modulo3/Sidebar'
import BotonesNavegacion from '../../components/modulo3/BotonesNavegacion'
import PipelineVisual from '../../components/modulo3/PipelineVisual'
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
    
    // Estado del formulario
    const [asistioSolicitante, setAsistioSolicitante] = useState(false)
    const [asistioDemandado, setAsistioDemandado] = useState(false)
    const [resultado, setResultado] = useState('')
    const [archivos, setArchivos] = useState({
        acta1: null,
        acta2: null,
        acta3: null
    })

    // Estado para actas ya subidas
    const [actasSubidas, setActasSubidas] = useState({
        acta1: null,
        acta2: null,
        acta3: null
    })

    // Estado para documentos subidos
    const [documentosSubidos, setDocumentosSubidos] = useState({ 
        informeLegal: false, 
        resolucionAdmision: false 
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

    // Función para obtener URL del PDF
    const getPdfUrl = (ruta) => {
        if (!ruta) return '#'
        if (ruta.startsWith('http')) return ruta
        if (ruta.startsWith('/uploads')) return `http://localhost:3000${ruta}`
        return `http://localhost:3000/uploads/${ruta}`
    }

    // Obtener usuario logueado
    const getUsuarioLogueado = () => {
        return localStorage.getItem('usuario_nombre') || 
               localStorage.getItem('email') || 
               localStorage.getItem('usuario') || 
               'sistema'
    }

    // Cargar datos
    useEffect(() => {
        const cargar = async () => {
            if (!id) return
            setCargando(true)
            
            try {
                // 1. Cargar expediente
                const resExp = await getExpedienteById(id)
                const data = resExp?.data || resExp
                const expedienteData = data?.expediente || data
                setExpediente(expedienteData)

                // 2. Cargar todas las audiencias del expediente
                const resAudiencias = await getAudiencias(id)
                const audienciasData = resAudiencias?.data || resAudiencias || []
                setHistorialAudiencias(audienciasData)
                
                // 3. Buscar audiencia PROGRAMADA o REALIZADA
                let audienciaEncontrada = audienciasData.find(a => a.estado === 'PROGRAMADA')
                let mensajeError = null
                
                if (!audienciaEncontrada) {
                    audienciaEncontrada = audienciasData.find(a => a.estado === 'REALIZADA')
                    if (audienciaEncontrada) {
                        mensajeError = ' Esta audiencia ya fue registrada. Los datos son solo de consulta.'
                        setAsistioSolicitante(!!audienciaEncontrada.asistio_solicitante)
                        setAsistioDemandado(!!audienciaEncontrada.asistio_demandado)
                        setResultado(audienciaEncontrada.resultado || '')
                    } else {
                        audienciaEncontrada = audienciasData.find(a => a.estado === 'REPROGRAMADA')
                        if (audienciaEncontrada) {
                            mensajeError = '🔄 Esta audiencia fue reprogramada. Debe programar una nueva fecha.'
                        } else {
                            mensajeError = 'No hay una audiencia programada para este expediente'
                        }
                    }
                }
                
                setAudiencia(audienciaEncontrada)
                setError(mensajeError)

                // 4. Cargar documentos internos
                const resDocs = await getDocumentosInternos(id)
                const docsData = resDocs?.data || resDocs || []

                // Verificar documentos
                const tieneInformeLegal = docsData.some(d => d.tipo_documento === 'INFORME_LEGAL' && d.es_actual === 1)
                const tieneResolucionAdmision = docsData.some(d => d.tipo_documento === 'RESOLUCION_ADMISIBLE' && d.es_actual === 1)

                setDocumentosSubidos({
                    informeLegal: tieneInformeLegal,
                    resolucionAdmision: tieneResolucionAdmision
                })

                // 5. Buscar actas (última versión de cada una)
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

        // Validar IDs de cónyuges
        if (!expediente?.Solicitante_Id || !expediente?.Demandado_Id) {
            setMensaje({ tipo: 'error', texto: 'Error: No se encontraron los IDs de los cónyuges' })
            return
        }

        // RATIFICACION - Se requieren las 3 actas
        if (resultado === 'RATIFICACION') {
            const acta1Subida = actasSubidas.acta1 || archivos.acta1
            const acta2Subida = actasSubidas.acta2 || archivos.acta2
            const acta3Subida = actasSubidas.acta3 || archivos.acta3
            
            if (!acta1Subida || !acta2Subida || !acta3Subida) {
                setMensaje({ tipo: 'error', texto: 'Debe subir las 3 actas de audiencia (PDF)' })
                return
            }
        }

        // DESISTIMIENTO - Confirmación
        if (resultado === 'DESISTIMIENTO') {
            const confirmar = window.confirm('⚠️ ATENCIÓN\n\nEl desistimiento cancelará TODO el proceso.\n\n¿Está seguro de que desea cancelar el expediente?')
            if (!confirmar) return
        }

        // INASISTENCIA - Confirmación y cálculo de nueva fecha
        let nuevaFechaLimite = null
        if (resultado === 'INASISTENCIA') {
            const fechaAudiencia = new Date(audiencia.fecha_programada)
            nuevaFechaLimite = new Date(fechaAudiencia)
            nuevaFechaLimite.setDate(nuevaFechaLimite.getDate() + 15)
            
            const confirmar = window.confirm(
                `⚠️ ATENCIÓN\n\n` +
                `La inasistencia permitirá reprogramar la audiencia.\n\n` +
                `📅 Nueva fecha límite para reprogramar: ${nuevaFechaLimite.toLocaleDateString('es-PE')}\n\n` +
                `¿Desea continuar?`
            )
            if (!confirmar) return
        }

        setEnviando(true)
        setMensaje(null)

        try {
            const usuario = getUsuarioLogueado()

            // Subir actas solo si hay archivos nuevos (solo para RATIFICACION)
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

            // Registrar resultado de la audiencia
            await registrarResultadoAudiencia(
                audiencia.id,
                resultado,
                asistioSolicitante ? 1 : 0,
                asistioDemandado ? 1 : 0,
                expediente.Solicitante_Id,
                expediente.Demandado_Id,
                usuario
            )

            // Mostrar mensaje y redirección según resultado
            if (resultado === 'RATIFICACION') {
                setMensaje({ tipo: 'success', texto: '✅ Ratificación registrada. El expediente pasa a ESPERA LEGAL por 2 meses.' })
                setTimeout(() => navigate(`/modulo3/detalle/${id}`), 2000)
            } 
            else if (resultado === 'DESISTIMIENTO') {
                setMensaje({ tipo: 'warning', texto: '⚠️ Desistimiento registrado. El expediente ha sido cancelado.' })
                setTimeout(() => navigate('/modulo3/expedientes'), 2000)
            }
            else if (resultado === 'INASISTENCIA') {
                setMensaje({ 
                    tipo: 'warning', 
                    texto: `⚠️ Inasistencia registrada. Nueva fecha límite para reprogramar: ${nuevaFechaLimite.toLocaleDateString('es-PE')}` 
                })
                setTimeout(() => navigate(`/modulo3/expediente/${id}/programar-audiencia`), 2000)
            }

        } catch (err) {
            console.error('Error:', err)
            setMensaje({ tipo: 'error', texto: err.message || 'Error al registrar audiencia' })
        } finally {
            setEnviando(false)
        }
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
                        <p>❌ {error}</p>
                        <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>Volver al expediente</button>
                    </div>
                </main>
            </>
        )
    }

    const numeroMesaPartes = expediente?.numero_mesa_partes || expediente?.expedientes_nro_mesa_partes
    const fechaAudiencia = audiencia ? new Date(audiencia.fecha_programada) : null
    const yaFueRegistrada = audiencia?.estado === 'REALIZADA'
    const fechaLimiteActual = expediente?.fecha_limite_audiencia ? new Date(expediente.fecha_limite_audiencia) : null

    const { informeLegal, resolucionAdmision } = documentosSubidos

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="detalle-header">
                    <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>← Volver</button>
                    <h1>Registrar Audiencia</h1>
                    <span className="estado-badge">Expediente {numeroMesaPartes || '—'}</span>
                </div>

                {yaFueRegistrada && (
                    <div className="alerta-info" style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '12px', borderRadius: '8px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span></span>
                        <span>Esta audiencia ya fue registrada. Los datos son solo de consulta.</span>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '30px' }}>
                    <div style={{ flex: 2 }}>
                        {/* ALERTA DE DOCUMENTOS FALTANTES */}
                        {(!informeLegal || !resolucionAdmision) && !yaFueRegistrada && (
                            <div className="alerta-documentos">
                                <div className="alerta-icono">⚠️</div>
                                <div className="alerta-contenido">
                                    <strong>Documentos internos faltantes</strong>
                                    <ul>
                                        {!informeLegal && <li>❌ Informe Legal no subido</li>}
                                        {!resolucionAdmision && <li>❌ Resolución de Admisión no subida</li>}
                                    </ul>
                                </div>
                            </div>
                        )}

                        {/* DATOS DEL EXPEDIENTE */}
                        <div className="seccion">
                            <h2> DATOS DEL EXPEDIENTE</h2>
                            <div className="expediente-grid">
                                <div><label>N° Expediente:</label><span>{expediente?.numero_expediente || '—'}</span></div>
                                <div><label>N° Mesa de Partes:</label><span>{expediente?.numero_mesa_partes || '—'}</span></div>
                                <div><label>Fecha de pago:</label><span>{expediente?.fecha_pago ? new Date(expediente.fecha_pago).toLocaleDateString('es-PE') : '—'}</span></div>
                                <div><label>Etapa actual:</label><span className="etapa-badge">{expediente?.etapa || '—'}</span></div>
                                {fechaLimiteActual && (
                                    <div><label>Fecha límite para audiencia:</label><span style={{ color: fechaLimiteActual < new Date() ? 'red' : 'green' }}>{fechaLimiteActual.toLocaleDateString('es-PE')}</span></div>
                                )}
                            </div>
                        </div>

                        {/* CÓNYUGES */}
                        <div className="seccion">
                            <h2> CÓNYUGES</h2>
                            <div className="conyuges-info">
                                <div className="conyuge-card">
                                    <div className="conyuge-titulo">Solicitante</div>
                                    <div><strong>{expediente?.Solicitante_Nombres || '—'} {expediente?.Solicitante_Apellidos || ''}</strong></div>
                                    <div>DNI: {expediente?.Solicitante_Dni || '—'}</div>
                                    <div>Teléfono: {expediente?.Solicitante_Telefono || '—'}</div>
                                    <div>Dirección: {expediente?.Solicitante_Direccion || '—'}</div>
                                </div>
                                <div className="conyuge-card">
                                    <div className="conyuge-titulo">Demandado</div>
                                    <div><strong>{expediente?.Demandado_Nombres || '—'} {expediente?.Demandado_Apellidos || ''}</strong></div>
                                    <div>DNI: {expediente?.Demandado_Dni || '—'}</div>
                                    <div>Teléfono: {expediente?.Demandado_Telefono || '—'}</div>
                                    <div>Dirección: {expediente?.Demandado_Direccion || '—'}</div>
                                </div>
                            </div>
                        </div>

                        {/* AUDIENCIA ACTUAL */}
                        <div className="seccion">
                            <h2> AUDIENCIA ACTUAL</h2>
                            <div className="info-audiencia">
                                <div className="info-card">
                                    <div className="info-icono"></div>
                                    <label>Fecha</label>
                                    <span>{fechaAudiencia ? fechaAudiencia.toLocaleDateString('es-PE') : '—'}</span>
                                </div>
                                <div className="info-card">
                                    <div className="info-icono"></div>
                                    <label>Hora</label>
                                    <span>{fechaAudiencia ? fechaAudiencia.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                </div>
                                <div className="info-card">
                                    <div className="info-icono"></div>
                                    <label>Intento N°</label>
                                    <span>{audiencia?.numero_intento || '—'}</span>
                                </div>
                            </div>
                        </div>

                        {/* HISTORIAL DE AUDIENCIAS ANTERIORES */}
                        {historialAudiencias.filter(a => a.id !== audiencia?.id && a.estado !== 'PROGRAMADA').length > 0 && (
                            <div className="seccion">
                                <h2>📜 HISTORIAL DE AUDIENCIAS</h2>
                                <div className="historial-audiencias">
                                    {historialAudiencias.filter(a => a.id !== audiencia?.id && a.estado !== 'PROGRAMADA').map((a, idx) => (
                                        <div key={a.id} className="historial-item">
                                            <div className="historial-fecha">{new Date(a.fecha_programada).toLocaleDateString('es-PE')}</div>
                                            <div className="historial-estado">
                                                {a.estado === 'REPROGRAMADA' && '🔄 Reprogramada'}
                                                {a.estado === 'REALIZADA' && '✅ Realizada'}
                                                {a.estado === 'CANCELADA' && '❌ Cancelada'}
                                            </div>
                                            <div className="historial-resultado">
                                                {a.resultado === 'INASISTENCIA' && '⚠️ Inasistencia'}
                                                {a.resultado === 'DESISTIMIENTO' && '❌ Desistimiento'}
                                                {a.resultado === 'RATIFICACION' && '✅ Ratificación'}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* REGISTRO DE ASISTENCIA */}
                        <div className="seccion">
                            <h2> REGISTRO DE ASISTENCIA</h2>
                            <div className="asistencia-grid">
                                <div className="asistencia-item">
                                    <label>Solicitante</label>
                                    <div className="asistencia-botones">
                                        <button 
                                            className={`btn-asistencia ${asistioSolicitante ? 'activo' : ''}`}
                                            onClick={() => !yaFueRegistrada && setAsistioSolicitante(!asistioSolicitante)}
                                            disabled={yaFueRegistrada}
                                        >
                                            {asistioSolicitante ? ' Asistió' : ' No asistió'}
                                        </button>
                                    </div>
                                </div>
                                <div className="asistencia-item">
                                    <label>Demandado</label>
                                    <div className="asistencia-botones">
                                        <button 
                                            className={`btn-asistencia ${asistioDemandado ? 'activo' : ''}`}
                                            onClick={() => !yaFueRegistrada && setAsistioDemandado(!asistioDemandado)}
                                            disabled={yaFueRegistrada}
                                        >
                                            {asistioDemandado ? ' Asistió' : ' No asistió'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* RESULTADO DE LA AUDIENCIA */}
                        <div className="seccion">
                            <h2> RESULTADO DE LA AUDIENCIA</h2>
                            <div className="resultado-opciones">
                                <label className={`opcion-resultado ${resultado === 'RATIFICACION' ? 'seleccionado' : ''}`}>
                                    <input type="radio" name="resultado" value="RATIFICACION" checked={resultado === 'RATIFICACION'} onChange={(e) => setResultado(e.target.value)} disabled={yaFueRegistrada} />
                                    <span> Ratificación</span>
                                    <small>Ambos cónyuges confirman su voluntad de divorciarse</small>
                                </label>
                                <label className={`opcion-resultado ${resultado === 'DESISTIMIENTO' ? 'seleccionado' : ''}`}>
                                    <input type="radio" name="resultado" value="DESISTIMIENTO" checked={resultado === 'DESISTIMIENTO'} onChange={(e) => setResultado(e.target.value)} disabled={yaFueRegistrada} />
                                    <span> Desistimiento</span>
                                    <small>Uno o ambos cónyuges ya no desean divorciarse</small>
                                </label>
                                <label className={`opcion-resultado ${resultado === 'INASISTENCIA' ? 'seleccionado' : ''}`}>
                                    <input type="radio" name="resultado" value="INASISTENCIA" checked={resultado === 'INASISTENCIA'} onChange={(e) => setResultado(e.target.value)} disabled={yaFueRegistrada} />
                                    <span> Inasistencia</span>
                                    <small>Uno o ambos cónyuges no asistieron a la audiencia</small>
                                </label>
                            </div>
                        </div>

                        {/* ACTAS DE AUDIENCIA - SOLO si se selecciona RATIFICACION */}
                        {resultado === 'RATIFICACION' && (
                            <div className="seccion">
                                <h2> ACTAS DE AUDIENCIA</h2>
                                <div className="actas-upload">
                                    {['acta1', 'acta2', 'acta3'].map((acta, idx) => {
                                        const actaData = actasSubidas[acta]
                                        const archivo = archivos[acta]
                                        const num = idx + 1
                                        return (
                                            <div key={acta} className="acta-item">
                                                <label>Acta {num}:</label>
                                                {actaData ? (
                                                    <div className="acta-existente">
                                                        <span className="archivo-ok"> {actaData.nombre_archivo || `Acta ${num}`}</span>
                                                        <button className="btn-ver-acta" onClick={() => window.open(getPdfUrl(actaData.ruta_archivo), '_blank')}> Ver PDF</button>
                                                    </div>
                                                ) : (
                                                    <div className="acta-upload">
                                                        <input type="file" accept=".pdf" onChange={(e) => handleArchivoChange(acta, e.target.files[0])} disabled={yaFueRegistrada} />
                                                        {archivo && <span className="archivo-ok"> {archivo.name}</span>}
                                                        {!archivo && <span className="archivo-pendiente">Sin archivo seleccionado</span>}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* MENSAJE Y BOTONES según resultado */}
                        {mensaje && (
                            <div className={`mensaje ${mensaje.tipo}`} style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px' }}>
                                {mensaje.texto}
                            </div>
                        )}

                        {/* DESISTIMIENTO */}
                        {resultado === 'DESISTIMIENTO' && !yaFueRegistrada && (
                            <div className="seccion">
                                <div className="aviso-desistimiento" style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                                    ⚠️ Al confirmar el desistimiento, el expediente será CANCELADO y el proceso finalizará.
                                </div>
                                <button className="btn-cancelar-proceso" onClick={handleSubmit} disabled={enviando} style={{ backgroundColor: '#dc2626', color: 'white', width: '100%', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                                    {enviando ? 'Procesando...' : '❌ Cancelar Expediente'}
                                </button>
                            </div>
                        )}

                        {/* INASISTENCIA */}
                        {resultado === 'INASISTENCIA' && !yaFueRegistrada && (
                            <div className="seccion">
                                <div className="aviso-inasistencia" style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '12px', borderRadius: '8px', marginBottom: '16px' }}>
                                    ⚠️ Al confirmar la inasistencia, podrá reprogramar la audiencia dentro de 15 días.
                                </div>
                                <button className="btn-reprogramar" onClick={handleSubmit} disabled={enviando} style={{ backgroundColor: '#f59e0b', color: 'white', width: '100%', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                                    {enviando ? 'Procesando...' : ' Reprogramar Audiencia'}
                                </button>
                            </div>
                        )}

                        {/* RATIFICACION */}
                        {resultado === 'RATIFICACION' && !yaFueRegistrada && (
                            <div className="seccion">
                                <button className="btn-registrar" onClick={handleSubmit} disabled={enviando} style={{ backgroundColor: '#22c55e', color: 'white', width: '100%', padding: '12px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                                    {enviando ? 'Registrando...' : ' Registrar Ratificación'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* COLUMNA DERECHA */}
                    <div style={{ flex: 1 }}>
                        <BotonesNavegacion expedienteId={id} etapaActual={etapaActual} />
                        <PipelineVisual etapaActual={getPipelineEtapa()} />
                    </div>
                </div>
            </main>
        </>
    )
}