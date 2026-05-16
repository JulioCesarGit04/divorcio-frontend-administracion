import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/modulo3/Sidebar'
import BotonesNavegacion from '../../components/modulo3/BotonesNavegacion'
import PipelineVisual from '../../components/modulo3/PipelineVisual'
import { 
    getExpedienteById, 
    getDocumentosInternos, 
    subirDocumentoInterno,
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
    
    // Estado para la resolución fundada
    const [resolucionFundada, setResolucionFundada] = useState(null)
    const [archivo, setArchivo] = useState(null)
    const [numeroDocumento, setNumeroDocumento] = useState('')
    const [fechaElaboracion, setFechaElaboracion] = useState(new Date().toISOString().split('T')[0])
    
    // Estado para plazos
    const [plazos, setPlazos] = useState(null)
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

    // Obtener usuario logueado
    const getUsuarioLogueado = () => {
        return localStorage.getItem('usuario_nombre') || 
               localStorage.getItem('email') || 
               localStorage.getItem('usuario') || 
               'sistema'
    }

    // Función para obtener URL del PDF
    const getPdfUrl = (ruta) => {
        if (!ruta) return '#'
        if (ruta.startsWith('http')) return ruta
        if (ruta.startsWith('/uploads')) return `http://localhost:3000${ruta}`
        return `http://localhost:3000/uploads/${ruta}`
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

                // 2. Cargar plazos
                const resPlazos = await getPlazos(id)
                const plazosData = resPlazos?.data || resPlazos
                setPlazos(plazosData)

                // Calcular días restantes para disolución
                if (plazosData?.fecha_fin_espera) {
                    const fechaFin = new Date(plazosData.fecha_fin_espera)
                    const hoy = new Date()
                    hoy.setHours(0, 0, 0, 0)
                    const diffDays = Math.ceil((fechaFin - hoy) / (1000 * 60 * 60 * 24))
                    setDiasRestantes(diffDays)
                    setPuedeAvanzar(diffDays <= 0)
                }

                // 3. Cargar documentos internos
                const resDocs = await getDocumentosInternos(id)
                const docsData = resDocs?.data || resDocs || []

                // Buscar resolución fundada (última versión)
                const resoluciones = docsData
                    .filter(d => d.tipo_documento === 'RESOLUCION_FUNDADA')
                    .sort((a, b) => new Date(b.subido_en) - new Date(a.subido_en))
                
                setResolucionFundada(resoluciones[0] || null)
                
                if (resoluciones[0]) {
                    setNumeroDocumento(resoluciones[0].numero_documento || '')
                    setFechaElaboracion(resoluciones[0].fecha_elaboracion?.split('T')[0] || new Date().toISOString().split('T')[0])
                }

            } catch (err) {
                console.error('Error:', err)
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

        setEnviando(true)
        setMensaje(null)

        try {
            const usuario = getUsuarioLogueado()

            // Si hay archivo nuevo, subirlo
            if (archivo) {
                await subirDocumentoInterno(
                    id, 
                    'RESOLUCION_FUNDADA', 
                    numeroDocumento, 
                    fechaElaboracion, 
                    archivo, 
                    usuario
                )
                setMensaje({ tipo: 'success', texto: '✅ Resolución Fundada subida correctamente' })
                
                // Recargar para mostrar el nuevo documento
                setTimeout(() => window.location.reload(), 1500)
            } else {
                setMensaje({ tipo: 'info', texto: 'No hay cambios para guardar' })
            }
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
            '✅ CONFIRMAR AVANCE A DISOLUCIÓN\n\n' +
            'Esta acción:\n' +
            '• Cambiará el expediente a etapa DISOLUCION\n' +
            '• El proceso estará completado\n' +
            '• El ciudadano podrá ver el resultado\n\n' +
            '¿Está seguro?'
        )

        if (!confirmar) return

        setEnviando(true)
        setMensaje(null)

        try {
            const usuario = getUsuarioLogueado()
            
            await cambiarEstadoExpediente(
                id,
                null,  // no cambiar estado
                'DISOLUCION',  // cambiar etapa
                'Resolución Fundada emitida - Expediente completado',
                usuario
            )

            setMensaje({ tipo: 'success', texto: '✅ Expediente avanzado a DISOLUCION' })
            
            setTimeout(() => navigate(`/modulo3/detalle/${id}`), 2000)
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.message || 'Error al avanzar' })
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
                        <h1>Resolución Fundada</h1>
                    </div>
                    <p>Cargando...</p>
                </main>
            </>
        )
    }

    const yaTieneResolucion = resolucionFundada !== null
    const etapaCorrecta = etapaActual === 'ESPERA_LEGAL' || etapaActual === 'DISOLUCION'

    const numeroMesaPartes = expediente?.numero_mesa_partes

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="detalle-header">
                    <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>← Volver</button>
                    <h1>Resolución Fundada</h1>
                    <span className="estado-badge">Expediente {numeroMesaPartes || '—'}</span>
                </div>

                {etapaActual === 'DISOLUCION' && (
                    <div className="alerta-exito" style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
                        ✅ Este expediente ya está en DISOLUCIÓN. El proceso ha sido completado.
                    </div>
                )}

                {!etapaCorrecta && (
                    <div className="alerta-error" style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '12px', borderRadius: '8px', marginBottom: '20px' }}>
                        ⚠️ El expediente debe estar en etapa ESPERA_LEGAL para emitir la Resolución Fundada.
                        <br />Etapa actual: <strong>{etapaActual || '—'}</strong>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '30px' }}>
                    {/* COLUMNA IZQUIERDA */}
                    <div style={{ flex: 2 }}>
                        {/* Información de plazos */}
                        <div className="seccion">
                            <h2>⏰ PLAZO LEGAL</h2>
                            <div className="plazos-info">
                                <div className="plazo-card">
                                    <label>Fecha de inicio de espera</label>
                                    <span>{plazos?.fecha_inicio_espera ? new Date(plazos.fecha_inicio_espera).toLocaleDateString('es-PE') : '—'}</span>
                                </div>
                                <div className="plazo-card">
                                    <label>Fecha de fin de espera</label>
                                    <span>{plazos?.fecha_fin_espera ? new Date(plazos.fecha_fin_espera).toLocaleDateString('es-PE') : '—'}</span>
                                </div>
                                <div className="plazo-card">
                                    <label>Días restantes</label>
                                    <span style={{ color: diasRestantes > 0 ? '#eab308' : '#22c55e', fontWeight: 'bold' }}>
                                        {diasRestantes !== null ? (diasRestantes > 0 ? `${diasRestantes} días` : 'Plazo cumplido') : '—'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Datos del expediente */}
                        <div className="seccion">
                            <h2> DATOS DEL EXPEDIENTE</h2>
                            <div className="expediente-grid">
                                <div><label>N° Expediente:</label><span>{expediente?.numero_expediente || '—'}</span></div>
                                <div><label>N° Mesa de Partes:</label><span>{expediente?.numero_mesa_partes || '—'}</span></div>
                                <div><label>Solicitante:</label><span>{expediente?.Solicitante_Nombres || '—'} {expediente?.Solicitante_Apellidos || ''}</span></div>
                                <div><label>Demandado:</label><span>{expediente?.Demandado_Nombres || '—'} {expediente?.Demandado_Apellidos || ''}</span></div>
                                <div><label>Etapa actual:</label><span className="etapa-badge">{expediente?.etapa || '—'}</span></div>
                            </div>
                        </div>

                        {/* Resolución Fundada */}
                        <div className="seccion">
                            <h2> RESOLUCIÓN FUNDADA</h2>
                            
                            {yaTieneResolucion && (
                                <div className="resolucion-existente" style={{ marginBottom: '20px', padding: '12px', backgroundColor: '#e0f2fe', borderRadius: '8px' }}>
                                    <div className="archivo-info">
                                        <span> Documento actual: <strong>{resolucionFundada.nombre_archivo}</strong></span>
                                        <button 
                                            className="btn-ver-pdf"
                                            onClick={() => window.open(getPdfUrl(resolucionFundada.ruta_archivo), '_blank')}
                                        >
                                             Ver PDF
                                        </button>
                                    </div>
                                    {resolucionFundada.numero_documento && (
                                        <div>N° Resolución: <strong>{resolucionFundada.numero_documento}</strong></div>
                                    )}
                                    <div>Fecha de elaboración: <strong>{new Date(resolucionFundada.fecha_elaboracion).toLocaleDateString('es-PE')}</strong></div>
                                </div>
                            )}

                            <div className="formulario-resolucion">
                                <div className="campo">
                                    <label>N° de Resolución *</label>
                                    <input
                                        type="text"
                                        value={numeroDocumento}
                                        onChange={(e) => setNumeroDocumento(e.target.value)}
                                        placeholder="Ej: RES-2026-001"
                                        disabled={etapaActual === 'DISOLUCION'}
                                    />
                                </div>

                                <div className="campo">
                                    <label>Fecha de elaboración *</label>
                                    <input
                                        type="date"
                                        value={fechaElaboracion}
                                        onChange={(e) => setFechaElaboracion(e.target.value)}
                                        disabled={etapaActual === 'DISOLUCION'}
                                    />
                                </div>

                                <div className="campo">
                                    <label>Archivo PDF {!yaTieneResolucion && '*'}</label>
                                    {yaTieneResolucion ? (
                                        <div className="reemplazar-archivo">
                                            <input 
                                                type="file" 
                                                accept=".pdf" 
                                                onChange={(e) => handleArchivoChange(e.target.files[0])}
                                                disabled={etapaActual === 'DISOLUCION'}
                                            />
                                            {archivo && <span className="archivo-nuevo"> Nuevo archivo: {archivo.name}</span>}
                                        </div>
                                    ) : (
                                        <input 
                                            type="file" 
                                            accept=".pdf" 
                                            onChange={(e) => handleArchivoChange(e.target.files[0])}
                                            disabled={etapaActual === 'DISOLUCION'}
                                        />
                                    )}
                                </div>

                                {etapaActual !== 'DISOLUCION' && (
                                    <button
                                        className="btn-subir"
                                        onClick={handleSubirResolucion}
                                        disabled={enviando}
                                    >
                                        {enviando ? 'Subiendo...' : (yaTieneResolucion ? ' Reemplazar Resolución' : ' Subir Resolución Fundada')}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Botón para avanzar a DISOLUCION */}
                        {etapaActual === 'ESPERA_LEGAL' && (
                            <div className="seccion">
                                {mensaje && (
                                    <div className={`mensaje ${mensaje.tipo}`} style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px' }}>
                                        {mensaje.texto}
                                    </div>
                                )}
                                
                                <button
                                    className="btn-avanzar"
                                    onClick={handleAvanzarADisolucion}
                                    disabled={enviando || !puedeAvanzar}
                                    style={{
                                        backgroundColor: puedeAvanzar ? '#22c55e' : '#94a3b8',
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        color: 'white',
                                        cursor: puedeAvanzar ? 'pointer' : 'not-allowed'
                                    }}
                                >
                                    {puedeAvanzar ? ' Avanzar a DISOLUCIÓN' : ` Esperar ${diasRestantes} días para avanzar`}
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