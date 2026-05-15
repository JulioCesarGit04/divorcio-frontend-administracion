import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/modulo3/Sidebar'
import BotonesNavegacion from '../../components/modulo3/BotonesNavegacion'
import { getExpedienteById, avanzarAAudiencia } from '../../services/ProcedimientoService'
import '../../styles/modulo3/detalle.css'
import PipelineVisual from '../../components/modulo3/PipelineVisual'

export default function DetalleExpediente() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [expediente, setExpediente] = useState(null)
    const [documentos, setDocumentos] = useState([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState(null)
    const [refresh, setRefresh] = useState(false)
    const [confirmado, setConfirmado] = useState(false)

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

    const cargar = async () => {
        if (!id) {
            setError('No hay ID')
            setCargando(false)
            return
        }
        
        setCargando(true)
        setError(null)
        
        try {
            const res = await getExpedienteById(id)
            const data = res?.data || res
            const expedienteData = data?.expediente || data
            const documentosData = data?.documentos_ciudadano || data?.documentos || []
            
            setExpediente(expedienteData)
            setDocumentos(documentosData)
        } catch (error) {
            setError(error.message)
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => { 
        if (id) cargar() 
    }, [id, refresh])

    const handleVolver = () => {
        navigate('/modulo3/expedientes')
    }

    const handleConfirmarRevision = async () => {
        const confirmar = window.confirm(
            'Atención\n\n' +
            'Una vez que confirme la revisión documentaria:\n\n' +
            'Los documentos del ciudadano quedarán BLOQUEADOS\n' +
            'No podrá reemplazar ningún documento después\n\n' +
            '¿Está seguro de que todos los documentos están correctos?'
        )
        
        if (confirmar) {
            try {
                const response = await fetch(`http://localhost:3000/api/procedimiento/expedientes/${id}/estado`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ 
                        nueva_etapa: 'DOCUMENTOS_INTERNOS',
                        motivo: 'Revisión documentaria confirmada'
                    })
                })

                const data = await response.json()

                if (data.ok) {
                    setConfirmado(true)
                    alert('Revisión documentaria confirmada')
                    window.location.reload()
                } else {
                    alert('Error: ' + data.mensaje)
                }
            } catch (error) {
                console.error('Error:', error)
                alert('Error al confirmar la revisión')
            }
        }
    }

    const getPdfUrl = (ruta) => {
        if (!ruta) return '#';
        if (ruta.startsWith('http')) return ruta;
        if (ruta.startsWith('/uploads')) return `http://localhost:3000${ruta}`;
        if (ruta.includes(':\\') || ruta.includes(':/')) {
            const fileName = ruta.split(/[\\/]/).pop();
            return `http://localhost:3000/uploads/${fileName}`;
        }
        return `http://localhost:3000/uploads/${ruta}`;
    };

    const calcularDiasRestantes = () => {
        if (!expediente?.fecha_limite_audiencia) return null
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)
        const fechaLimite = new Date(expediente.fecha_limite_audiencia)
        const diffTime = fechaLimite - hoy
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays
    }

    const DocumentoItem = ({ doc, onReemplazado, bloqueado }) => {
        const [mostrarModal, setMostrarModal] = useState(false)
        const [archivo, setArchivo] = useState(null)
        const [cargandoDoc, setCargandoDoc] = useState(false)
        const [errorDoc, setErrorDoc] = useState('')
        const [exitoDoc, setExitoDoc] = useState('')

        const handleReemplazar = async () => {
            if (!archivo) {
                setErrorDoc('Debe seleccionar un archivo PDF')
                return
            }
            if (archivo.type !== 'application/pdf') {
                setErrorDoc('Solo se permiten archivos PDF')
                return
            }

            setCargandoDoc(true)
            setErrorDoc('')
            setExitoDoc('')

            try {
                const formData = new FormData()
                formData.append('documento', archivo)

                const response = await fetch(`http://localhost:3000/api/procedimiento/documentos-ciudadano/${doc.id}/reemplazar`, {
                    method: 'PUT',
                    body: formData,
                    credentials: 'include'
                })
                
                const data = await response.json()
                
                if (!response.ok) {
                    throw new Error(data.mensaje || 'Error al reemplazar')
                }
                
                setExitoDoc('Documento reemplazado correctamente')
                setTimeout(() => {
                    setMostrarModal(false)
                    setArchivo(null)
                    setExitoDoc('')
                    onReemplazado()
                }, 1500)
            } catch (err) {
                setErrorDoc(err.message)
            } finally {
                setCargandoDoc(false)
            }
        }

        return (
            <>
                <div className="documento-item">
                    <div className="documento-info">
                        <div className="documento-icono">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                            </svg>
                        </div>
                        <div>
                            <div className="documento-nombre">{doc.tipo_documento || 'Documento'}</div>
                            <div className="documento-archivo">{doc.nombre_archivo}</div>
                            <div className="documento-fecha">
                                Subido: {doc.subido_en ? new Date(doc.subido_en).toLocaleDateString('es-PE') : '—'}
                            </div>
                        </div>
                    </div>
                    <div className="documento-acciones">
                        <button className="btn-ver" onClick={() => {
                            const url = getPdfUrl(doc.ruta_archivo)
                            if (url !== '#') window.open(url, '_blank')
                            else alert('No se puede abrir el PDF')
                        }}>
                            Ver PDF
                        </button>
                        <button 
                            className="btn-reemplazar" 
                            onClick={() => setMostrarModal(true)}
                            disabled={bloqueado}
                            style={{ opacity: bloqueado ? 0.5 : 1, cursor: bloqueado ? 'not-allowed' : 'pointer' }}
                        >
                            Reemplazar
                        </button>
                    </div>
                </div>

                {mostrarModal && !bloqueado && (
                    <div className="modal-overlay" onClick={() => !cargandoDoc && setMostrarModal(false)}>
                        <div className="modal-contenido" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Reemplazar documento</h3>
                                <button className="modal-cerrar" onClick={() => !cargandoDoc && setMostrarModal(false)}>×</button>
                            </div>
                            <div className="modal-body">
                                <p><strong>Documento actual:</strong> {doc.nombre_archivo}</p>
                                <div className="campo">
                                    <label>Seleccione el nuevo archivo PDF:</label>
                                    <input type="file" accept=".pdf" onChange={(e) => setArchivo(e.target.files[0])} />
                                </div>
                                {errorDoc && <div className="error-mensaje">{errorDoc}</div>}
                                {exitoDoc && <div className="exito-mensaje">{exitoDoc}</div>}
                            </div>
                            <div className="modal-footer">
                                <button onClick={() => setMostrarModal(false)}>Cancelar</button>
                                <button onClick={handleReemplazar} disabled={!archivo}>{cargandoDoc ? 'Reemplazando...' : 'Reemplazar'}</button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        )
    }

    if (cargando) {
        return (
            <>
                <Sidebar />
                <main className="contenido-modulo3">
                    <div className="pagina-header"><h1>Detalle del Expediente</h1></div>
                    <div className="loading-spinner"></div>
                    <p>Cargando...</p>
                </main>
            </>
        )
    }

    if (error) {
        return (
            <>
                <Sidebar />
                <main className="contenido-modulo3">
                    <div className="pagina-header">
                        <button className="btn-volver" onClick={handleVolver}>← Volver</button>
                        <h1>Detalle del Expediente</h1>
                    </div>
                    <div className="error-message">{error}</div>
                </main>
            </>
        )
    }

    if (!expediente) {
        return (
            <>
                <Sidebar />
                <main className="contenido-modulo3">
                    <div className="pagina-header">
                        <button className="btn-volver" onClick={handleVolver}>← Volver</button>
                        <h1>Detalle del Expediente</h1>
                    </div>
                    <div className="warning-message">Expediente no encontrado</div>
                </main>
            </>
        )
    }

    const etapaActual = expediente.etapa || expediente.expedientes_estado_actual
    const numeroMesaPartes = expediente.numero_mesa_partes || expediente.expedientes_nro_mesa_partes
    const estadoActual = expediente.estado || expediente.expedientes_estado_actual
    const fechaPago = expediente.fecha_pago
    const fechaRecepcion = expediente.fecha_recepcion || expediente.expedientes_creado_en
    const registradoPor = expediente.registrado_por || expediente.Usuario_Vinculo
    const fechaLimiteAudiencia = expediente.fecha_limite_audiencia
    const diasRestantes = calcularDiasRestantes()
    
    const getColorDias = () => {
        if (diasRestantes === null) return '#64748b'
        if (diasRestantes < 3) return '#dc2626'
        if (diasRestantes <= 7) return '#eab308'
        return '#22c55e'
    }

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="detalle-header">
                    <button className="btn-volver" onClick={handleVolver}>← Volver</button>
                    <h1>Expediente {numeroMesaPartes || '—'}</h1>
                    <span className={`estado-badge estado-${(estadoActual || 'ACTIVO').toLowerCase()}`}>
                        {estadoActual || 'ACTIVO'}
                    </span>
                </div>

                <div className="detalle-grid">
                    {/* COLUMNA IZQUIERDA */}
                    <div className="detalle-izquierda">
                        {/* Datos del expediente */}
                        <div className="seccion">
                            <h2>Datos del expediente</h2>
                            <div className="datos-grid">
                                <div className="dato-item">
                                    <label>N° Mesa de Partes</label>
                                    <p>{numeroMesaPartes || '—'}</p>
                                </div>
                                <div className="dato-item">
                                    <label>Estado</label>
                                    <p>{estadoActual || '—'}</p>
                                </div>
                                <div className="dato-item">
                                    <label>Etapa</label>
                                    <p>{etapaActual || '—'}</p>
                                </div>
                                <div className="dato-item">
                                    <label>Fecha pago</label>
                                    <p>{fechaPago ? new Date(fechaPago).toLocaleDateString('es-PE') : '—'}</p>
                                </div>
                                <div className="dato-item">
                                    <label>Fecha recepción</label>
                                    <p>{fechaRecepcion ? new Date(fechaRecepcion).toLocaleDateString('es-PE') : '—'}</p>
                                </div>
                                <div className="dato-item">
                                    <label>Vinculado por</label>
                                    <p>{registradoPor || '—'}</p>
                                </div>
                            </div>
                            {fechaLimiteAudiencia && (
                                <div className="plazo-audiencia" style={{ borderLeftColor: getColorDias() }}>
                                    <div className="plazo-info">
                                        <span className="plazo-label">Plazo para audiencia:</span>
                                        <span className="plazo-dias" style={{ color: getColorDias() }}>{diasRestantes} días restantes</span>
                                    </div>
                                    <span className="plazo-fecha">Fecha límite: {new Date(fechaLimiteAudiencia).toLocaleDateString('es-PE')}</span>
                                </div>
                            )}
                        </div>

                        {/* Cónyuges */}
                        <div className="seccion">
                            <h2>Cónyuges</h2>
                            <div className="conyuges-grid">
                                <div className="conyuge-card">
                                    <div className="conyuge-header">
                                        <div className="conyuge-icon solicitante"></div>
                                        <h3>Solicitante</h3>
                                    </div>
                                    <div className="conyuge-content">
                                        <p><strong>{expediente.Solicitante_Nombres || '—'} {expediente.Solicitante_Apellidos || ''}</strong></p>
                                        <p>DNI: {expediente.Solicitante_Dni || '—'}</p>
                                        <p>Tel: {expediente.Solicitante_Telefono || '—'}</p>
                                        <p>Correo: {expediente.Solicitante_Correo || '—'}</p>
                                        <p>Dirección: {expediente.Solicitante_Direccion || '—'}</p>
                                    </div>
                                </div>
                                <div className="conyuge-card">
                                    <div className="conyuge-header">
                                        <div className="conyuge-icon demandado"></div>
                                        <h3>Demandado</h3>
                                    </div>
                                    <div className="conyuge-content">
                                        <p><strong>{expediente.Demandado_Nombres || '—'} {expediente.Demandado_Apellidos || ''}</strong></p>
                                        <p>DNI: {expediente.Demandado_Dni || '—'}</p>
                                        <p>Tel: {expediente.Demandado_Telefono || '—'}</p>
                                        <p>Correo: {expediente.Demandado_Correo || '—'}</p>
                                        <p>Dirección: {expediente.Demandado_Direccion || '—'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Documentos */}
                        <div className="seccion">
                            <h2>Documentos del ciudadano</h2>
                            {documentos.length === 0 ? (
                                <div className="empty-state">No hay documentos registrados</div>
                            ) : (
                                <div className="documentos-lista">
                                    {documentos.map((doc, idx) => (
                                        <DocumentoItem key={doc.id || idx} doc={doc} onReemplazado={() => setRefresh(prev => !prev)} bloqueado={confirmado || etapaActual !== 'EVALUACION'} />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Botón Continuar */}
                        {!confirmado && etapaActual === 'EVALUACION' && (
                            <div className="seccion acciones">
                                <button className="btn-continuar" onClick={handleConfirmarRevision}>
                                    Continuar revisión
                                </button>
                                <p className="texto-ayuda">Revise todos los documentos antes de continuar</p>
                            </div>
                        )}
                    </div>

                    {/* COLUMNA DERECHA */}
                    <div className="detalle-derecha">
                        <BotonesNavegacion expedienteId={id} etapaActual={etapaActual} />
                        <PipelineVisual etapaActual={getPipelineEtapa()} />
                    </div>
                </div>
            </main>
        </>
    )
}