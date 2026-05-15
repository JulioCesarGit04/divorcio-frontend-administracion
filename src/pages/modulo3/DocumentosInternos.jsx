import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/modulo3/Sidebar'
import BotonesNavegacion from '../../components/modulo3/BotonesNavegacion'
import PipelineVisual from '../../components/modulo3/PipelineVisual'
import { getExpedienteById, getDocumentosInternos, subirDocumentoInterno } from '../../services/ProcedimientoService'
import '../../styles/modulo3/documentos-internos.css'

export default function DocumentosInternos() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [expediente, setExpediente] = useState(null)
    const [documentosInternos, setDocumentosInternos] = useState([])
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState(null)
    const [subiendo, setSubiendo] = useState(false)
    const [mensaje, setMensaje] = useState(null)
const etapaActual = expediente?.etapa || expediente?.expedientes_estado_actual
console.log('🔍 DocumentosInternos - etapaActual:', etapaActual)
    // Estados para los modales de subida
    const [modalAbierto, setModalAbierto] = useState(false)
    const [tipoDocumento, setTipoDocumento] = useState('')
    const [numeroDocumento, setNumeroDocumento] = useState('')
    const [fechaElaboracion, setFechaElaboracion] = useState('')
    const [archivo, setArchivo] = useState(null)

    // Mapear etapa de la BD a la vista del pipeline
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
        if (!id) return
        setCargando(true)
        try {
            const resExp = await getExpedienteById(id)
            const data = resExp?.data || resExp
            const expedienteData = data?.expediente || data
            setExpediente(expedienteData)

            const resDocs = await getDocumentosInternos(id)
            const docsData = resDocs?.data || resDocs || []
            setDocumentosInternos(docsData)
        } catch (err) {
            console.error('Error:', err)
            setError(err.message)
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => {
        cargar()
    }, [id])

    const handleSubirDocumento = async () => {
    console.log('📤 handleSubirDocumento - tipoDocumento:', tipoDocumento)
    console.log('📤 tipoDocumento:', tipoDocumento)
    console.log('📤 fechaElaboracion:', fechaElaboracion)
    console.log('📤 numeroDocumento:', numeroDocumento)
    console.log('📤 archivo:', archivo?.name)

    if (!tipoDocumento) {
        setMensaje({ tipo: 'error', texto: 'Tipo de documento no especificado' })
        return
    }
    if (!archivo) {
        setMensaje({ tipo: 'error', texto: 'Debe seleccionar un archivo PDF' })
        return
    }
    if (!fechaElaboracion) {
        setMensaje({ tipo: 'error', texto: 'Debe ingresar la fecha de elaboración' })
        return
    }
    if (archivo.type !== 'application/pdf') {
        setMensaje({ tipo: 'error', texto: 'Solo se permiten archivos PDF' })
        return
    }

    setSubiendo(true)
    setMensaje(null)

    try {
        const formData = new FormData()
        formData.append('tipo_documento', tipoDocumento)
        formData.append('numero_documento', numeroDocumento || '')
        formData.append('fecha_elaboracion', fechaElaboracion)
        formData.append('archivo', archivo)

        const response = await fetch(`http://localhost:3000/api/procedimiento/expedientes/${id}/documentos`, {
            method: 'POST',
            body: formData,
            credentials: 'include'
        })

        const data = await response.json()
        console.log('📥 Respuesta:', data)

        if (!response.ok) {
            throw new Error(data.mensaje || 'Error al subir documento')
        }

        setMensaje({ tipo: 'success', texto: 'Documento subido correctamente' })
        setTimeout(() => {
            setModalAbierto(false)
            setArchivo(null)
            setNumeroDocumento('')
            setFechaElaboracion('')
            setMensaje(null)
            cargar()
        }, 1500)
    } catch (err) {
        console.error('❌ Error:', err)
        setMensaje({ tipo: 'error', texto: err.message })
    } finally {
        setSubiendo(false)
    }
}

    const abrirModal = (tipo) => {
    console.log('🔧 abrirModal llamado con tipo:', tipo)
    setTipoDocumento(tipo)
    setModalAbierto(true)

}

    const getDocumentoEstado = (tipo) => {
        const encontrado = documentosInternos.find(doc => doc.tipo_documento === tipo)
        if (encontrado) {
            return { 
                estado: 'subido', 
                fecha: new Date(encontrado.subido_en).toLocaleDateString('es-PE'),
                nombre: encontrado.numero_documento || '—',
                archivo: encontrado.ruta_archivo
            }
        }
        return { estado: 'pendiente', fecha: null, nombre: null, archivo: null }
    }

    const verPdf = (ruta) => {
        let url = ruta
        if (url.startsWith('/uploads')) {
            url = `http://localhost:3000${url}`
        }
        window.open(url, '_blank')
    }

    const handleVolver = () => {
        navigate(`/modulo3/detalle/${id}`)
    }



const handleContinuar = async () => {
    if (informeLegal.estado !== 'subido' || resolucionAdmision.estado !== 'subido') {
        alert('❌ Debe subir ambos documentos antes de continuar')
        return
    }

    const confirmar = window.confirm(
        '⚠️ ATENCIÓN\n\n' +
        'Una vez que confirme, el expediente pasará a la etapa de AUDIENCIA.\n\n' +
        '¿Está seguro de que ambos documentos están correctamente subidos?'
    )

    if (!confirmar) return

    try {
        const response = await fetch(`http://localhost:3000/api/procedimiento/expedientes/${id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ 
                nueva_etapa: 'AUDIENCIA',
                motivo: 'Documentos internos completados'
            })
        })

        const data = await response.json()

        if (data.ok) {
            alert('✅ Etapa cambiada a AUDIENCIA')
            // Recargar la página para actualizar los botones y el pipeline
            window.location.reload()
        } else {
            alert('Error: ' + data.mensaje)
        }
    } catch (error) {
        console.error('Error:', error)
        alert('Error al avanzar la etapa')
    }
}







    if (cargando) {
        return (
            <>
                <Sidebar />
                <main className="contenido-modulo3">
                    <div className="pagina-header">
                        <button className="btn-volver" onClick={handleVolver}>← Volver</button>
                        <h1>Documentos Internos</h1>
                    </div>
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
                        <h1>Documentos Internos</h1>
                    </div>
                    <p style={{ color: 'red' }}>Error: {error}</p>
                </main>
            </>
        )
    }

    const informeLegal = getDocumentoEstado('INFORME_LEGAL')
    const resolucionAdmision = getDocumentoEstado('RESOLUCION_ADMISIBLE')

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="detalle-header">
                    <button className="btn-volver" onClick={handleVolver}>← Volver</button>
                    <h1>Documentos Internos</h1>
                    <span className="estado-badge">Expediente {expediente?.numero_mesa_partes || '—'}</span>
                </div>

                <div style={{ display: 'flex', gap: '24px' }}>
                    {/* COLUMNA IZQUIERDA - Contenido principal */}
                    <div style={{ flex: 2 }}>
                        {/* Datos del expediente */}
                        <div className="seccion datos-expediente">
                            <h2> Datos del expediente</h2>
                            <div className="datos-grid">
                                <div><label>N° Expediente</label><p>{expediente?.numero_expediente || '—'}</p></div>
                                <div><label>N° Mesa de Partes</label><p>{expediente?.numero_mesa_partes || '—'}</p></div>
                                <div><label>Solicitante</label><p>{expediente?.Solicitante_Nombres} {expediente?.Solicitante_Apellidos}</p></div>
                                <div><label>DNI</label><p>{expediente?.Solicitante_Dni || '—'}</p></div>
                                <div><label>Demandado</label><p>{expediente?.Demandado_Nombres} {expediente?.Demandado_Apellidos}</p></div>
                                <div><label>DNI</label><p>{expediente?.Demandado_Dni || '—'}</p></div>
                                <div><label>Dirección</label><p>{expediente?.Solicitante_Direccion || '—'}</p></div>
                                <div><label>Fecha de pago</label><p>{expediente?.fecha_pago ? new Date(expediente.fecha_pago).toLocaleDateString('es-PE') : '—'}</p></div>
                            </div>
                        </div>

                        {/* Documentos a subir */}
                        <div className="seccion documentos-subida">
                            <h2>📄 Documentos requeridos</h2>
                            <div className="documentos-lista">
                                <div className="documento-item">
                                    <div className="documento-info">
                                        <span className="documento-icono">📄</span>
                                        <div>
                                            <div className="documento-nombre">INFORME LEGAL</div>
                                            <div className="documento-descripcion">Documento que sustenta la admisión del expediente</div>
                                        </div>
                                    </div>
                                    <div className="documento-estado">
                                        {informeLegal.estado === 'subido' ? (
                                            <span className="estado-subido"> Subido {informeLegal.fecha}</span>
                                        ) : (
                                            <span className="estado-pendiente"> Pendiente</span>
                                        )}
                                    </div>
                                    <div className="documento-acciones">
                                        {informeLegal.estado === 'subido' && (
                                            <button className="btn-ver" onClick={() => verPdf(informeLegal.archivo)}> Ver PDF</button>
                                        )}
                                        <button onClick={() => abrirModal('INFORME_LEGAL')}>
                                             {informeLegal.estado === 'subido' ? 'Reemplazar' : 'Subir'}
                                        </button>

                                    </div>
                                </div>

                                <div className="documento-item">
                                    <div className="documento-info">
                                        <span className="documento-icono">📄</span>
                                        <div>
                                            <div className="documento-nombre">RESOLUCIÓN DE ADMISIÓN</div>
                                            <div className="documento-descripcion">Resolución que admite el expediente a trámite</div>
                                        </div>
                                    </div>
                                    <div className="documento-estado">
                                        {resolucionAdmision.estado === 'subido' ? (
                                            <span className="estado-subido"> Subido {resolucionAdmision.fecha}</span>
                                        ) : (
                                            <span className="estado-pendiente"> Pendiente</span>
                                        )}
                                    </div>
                                    <div className="documento-acciones">
                                        {resolucionAdmision.estado === 'subido' && (
                                            <button className="btn-ver" onClick={() => verPdf(resolucionAdmision.archivo)}> Ver PDF</button>
                                        )}
                                        <button className="btn-subir" onClick={() => abrirModal('RESOLUCION_ADMISIBLE')}>
                                             {resolucionAdmision.estado === 'subido' ? 'Reemplazar' : 'Subir'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Botón Continuar */}
                        <div className="seccion acciones">
                            <button 
                                className="btn-continuar"
                                onClick={handleContinuar}
                                disabled={informeLegal.estado !== 'subido' || resolucionAdmision.estado !== 'subido'}
                            >
                                 Continuar a Programar Audiencia
                            </button>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA - Botones y Pipeline */}
                    <div style={{ flex: 1 }}>
                        <BotonesNavegacion 
                            expedienteId={id} 
                            etapaActual={etapaActual} 
                            documentosInternosCompletados={informeLegal.estado === 'subido' && resolucionAdmision.estado === 'subido'}
                        />
                        <PipelineVisual etapaActual={getPipelineEtapa()} />
                    </div>
                </div>

                {/* Modal para subir documento */}
                {modalAbierto && (
                    <div className="modal-overlay" onClick={() => !subiendo && setModalAbierto(false)}>
                        <div className="modal-contenido" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Subir {tipoDocumento === 'INFORME_LEGAL' ? 'Informe Legal' : 'Resolución de Admisión'}</h3>

                                <button className="modal-cerrar" onClick={() => !subiendo && setModalAbierto(false)} disabled={subiendo}>×</button>
                            </div>
                            <div className="modal-body">
                                <div className="campo">
                                    <label>N° de documento (opcional)</label>
                                    <input
                                        type="text"
                                        value={numeroDocumento}
                                        onChange={(e) => setNumeroDocumento(e.target.value)}
                                        placeholder="Ej: INF-001-2026"
                                        disabled={subiendo}
                                    />
                                </div>
                                <div className="campo">
                                    <label>Fecha de elaboración *</label>
                                    <input
                                        type="date"
                                        value={fechaElaboracion}
                                        onChange={(e) => setFechaElaboracion(e.target.value)}
                                        disabled={subiendo}
                                        required
                                    />
                                </div>
                                <div className="campo">
                                    <label>Archivo PDF *</label>
                                    <input
                                        type="file"
                                        accept=".pdf"
                                        onChange={(e) => setArchivo(e.target.files[0])}
                                        disabled={subiendo}
                                    />
                                </div>
                                {mensaje && (
                                    <div className={`mensaje ${mensaje.tipo}`}>
                                        {mensaje.texto}
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn-cancelar" onClick={() => setModalAbierto(false)} disabled={subiendo}>Cancelar</button>
                                <button className="btn-confirmar" onClick={handleSubirDocumento} disabled={subiendo || !archivo || !fechaElaboracion}>
                                    {subiendo ? 'Subiendo...' : 'Subir documento'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </>
    )
}