import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/modulo3/Sidebar'
import BotonesNavegacion from '../../components/modulo3/BotonesNavegacion'
import PipelineVisual from '../../components/modulo3/PipelineVisual'
import { getExpedienteById, getCronograma, programarAudiencia, getAudiencias } from '../../services/ProcedimientoService'
import '../../styles/modulo3/programar-audiencia.css'

export default function ProgramarAudiencia() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [expediente, setExpediente] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState(null)
    const [fechaHora, setFechaHora] = useState('')
    const [slotsOcupados, setSlotsOcupados] = useState([])
    const [fechaLimite, setFechaLimite] = useState(null)
    const [diasRestantes, setDiasRestantes] = useState(null)
    const [enviando, setEnviando] = useState(false)
    const [mensaje, setMensaje] = useState(null)
    const [audienciaProgramada, setAudienciaProgramada] = useState(null)
    const [audienciaRealizada, setAudienciaRealizada] = useState(null)
    const [modoReprogramacion, setModoReprogramacion] = useState(false)

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

    // Cargar datos del expediente y cronograma
    useEffect(() => {
        const cargar = async () => {
            if (!id) return
            setCargando(true)
            try {
                // Cargar expediente
                const resExp = await getExpedienteById(id)
                const data = resExp?.data || resExp
                const expedienteData = data?.expediente || data
                setExpediente(expedienteData)

                // Cargar fecha límite de audiencia
                const fechaLimiteExp = expedienteData?.fecha_limite_audiencia
                if (fechaLimiteExp) {
                    setFechaLimite(new Date(fechaLimiteExp))
                    const hoy = new Date()
                    hoy.setHours(0, 0, 0, 0)
                    const limite = new Date(fechaLimiteExp)
                    const diffDays = Math.ceil((limite - hoy) / (1000 * 60 * 60 * 24))
                    setDiasRestantes(diffDays)
                }

                // Cargar slots ocupados
                const resCrono = await getCronograma()
                const slots = resCrono?.data || resCrono || []
                setSlotsOcupados(slots)

                // Cargar audiencias del expediente
                const resAudiencias = await getAudiencias(id)
                const audienciasData = resAudiencias?.data || resAudiencias || []
                
                // Buscar audiencia PROGRAMADA y REALIZADA
                const audienciaVigente = audienciasData.find(a => a.estado === 'PROGRAMADA')
                const realizada = audienciasData.find(a => a.estado === 'REALIZADA')
                
                setAudienciaProgramada(audienciaVigente)
                setAudienciaRealizada(realizada)

            } catch (err) {
                console.error('Error:', err)
                setError(err.message)
            } finally {
                setCargando(false)
            }
        }
        cargar()
    }, [id])

    // Verificar si una fecha/hora está ocupada
    const isSlotOcupado = (fecha) => {
        return slotsOcupados.some(slot => {
            const slotFecha = new Date(slot.fecha_hora)
            return slotFecha.getTime() === fecha.getTime()
        })
    }

    // Validar la fecha seleccionada
    const validarFecha = () => {
        if (!fechaHora) {
            setMensaje({ tipo: 'error', texto: 'Debe seleccionar una fecha y hora' })
            return false
        }

        const fechaSeleccionada = new Date(fechaHora)
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)

        if (fechaSeleccionada < hoy) {
            setMensaje({ tipo: 'error', texto: 'No puede seleccionar una fecha pasada' })
            return false
        }

        // Verificar si la fecha está fuera del plazo
        if (fechaLimite && fechaSeleccionada > fechaLimite) {
            const diasExcedidos = Math.ceil((fechaSeleccionada - fechaLimite) / (1000 * 60 * 60 * 24))
            const confirmar = window.confirm(
                `⚠️ ADVERTENCIA\n\n` +
                `La fecha seleccionada excede el plazo legal de 15 días en ${diasExcedidos} día(s).\n\n` +
                `¿Desea programar la audiencia fuera de plazo?`
            )
            if (!confirmar) {
                return false
            }
        }

        if (isSlotOcupado(fechaSeleccionada)) {
            setMensaje({ tipo: 'error', texto: 'El horario ya está ocupado por otra audiencia' })
            return false
        }

        return true
    }

    const handleProgramar = async () => {
        if (!validarFecha()) return

        setEnviando(true)
        setMensaje(null)

        try {
            const fechaObj = new Date(fechaHora)
            await programarAudiencia(id, fechaObj)
            setMensaje({ tipo: 'success', texto: modoReprogramacion ? '✅ Audiencia reprogramada correctamente' : '✅ Audiencia programada correctamente' })
            
            setTimeout(() => {
                window.location.reload()
            }, 1500)
        } catch (err) {
            setMensaje({ tipo: 'error', texto: err.message || 'Error al programar audiencia' })
        } finally {
            setEnviando(false)
        }
    }

    const getColorDias = () => {
        if (diasRestantes === null) return '#64748b'
        if (diasRestantes < 3) return '#dc2626'
        if (diasRestantes <= 7) return '#eab308'
        return '#22c55e'
    }

    if (cargando) {
        return (
            <>
                <Sidebar />
                <main className="contenido-modulo3">
                    <div className="pagina-header">
                        <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>← Volver</button>
                        <h1>Programar Audiencia</h1>
                    </div>
                    <p>Cargando...</p>
                </main>
            </>
        )
    }

    const numeroMesaPartes = expediente?.numero_mesa_partes || expediente?.expedientes_nro_mesa_partes
    const horasDisponibles = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']

    return (
        <>
            <Sidebar />
            <main className="contenido-modulo3">
                <div className="detalle-header">
                    <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>← Volver</button>
                    <h1>Programar Audiencia</h1>
                    <span className="estado-badge">Expediente {numeroMesaPartes || '—'}</span>
                </div>

                <div style={{ display: 'flex', gap: '30px' }}>
                    {/* COLUMNA IZQUIERDA */}
                    <div style={{ flex: 2 }}>
                        {/* Alerta de plazo */}
                        {diasRestantes !== null && (
                            <div className="plazo-alerta" style={{ borderLeftColor: getColorDias(), marginBottom: '24px' }}>
                                <div className="plazo-alerta-icono">⏰</div>
                                <div className="plazo-alerta-contenido">
                                    <div className="plazo-alerta-titulo">Plazo para programar audiencia</div>
                                    <div className="plazo-alerta-dias" style={{ color: getColorDias() }}>
                                        {diasRestantes} {diasRestantes === 1 ? 'día restante' : 'días restantes'}
                                    </div>
                                    <div className="plazo-alerta-fecha">
                                        Fecha límite: {fechaLimite ? fechaLimite.toLocaleDateString('es-PE') : '—'}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Datos para las actas */}
                        <div className="seccion">
                            <h2>📋 DATOS PARA LAS ACTAS DE AUDIENCIA</h2>
                            <div className="actas-datos">
                                <div className="actas-dato">
                                    <label>N° Expediente:</label>
                                    <span>{expediente?.numero_expediente || '—'}</span>
                                </div>
                                <div className="actas-dato">
                                    <label>N° Mesa de Partes:</label>
                                    <span>{expediente?.numero_mesa_partes || '—'}</span>
                                </div>
                                <div className="actas-dato">
                                    <label>Solicitante:</label>
                                    <span>{expediente?.Solicitante_Nombres || '—'} {expediente?.Solicitante_Apellidos || ''}</span>
                                </div>
                                <div className="actas-dato">
                                    <label>DNI:</label>
                                    <span>{expediente?.Solicitante_Dni || '—'}</span>
                                </div>
                                <div className="actas-dato">
                                    <label>Dirección:</label>
                                    <span>{expediente?.Solicitante_Direccion || '—'}</span>
                                </div>
                                <div className="actas-dato">
                                    <label>Demandado:</label>
                                    <span>{expediente?.Demandado_Nombres || '—'} {expediente?.Demandado_Apellidos || ''}</span>
                                </div>
                                <div className="actas-dato">
                                    <label>DNI:</label>
                                    <span>{expediente?.Demandado_Dni || '—'}</span>
                                </div>
                                <div className="actas-dato">
                                    <label>Dirección:</label>
                                    <span>{expediente?.Demandado_Direccion || '—'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Sección de programación o resumen */}
                        <div className="seccion">
                            {/* Si hay audiencia REALIZADA, mostrar mensaje y botón */}
                            {audienciaRealizada ? (
                                <>
                                    <h2> AUDIENCIA YA REALIZADA</h2>
                                    <div className="audiencia-resumen">
                                        <div className="resumen-card">
                                            <div className="resumen-icono"></div>
                                            <div className="resumen-info">
                                                <label>Estado</label>
                                                <span style={{ color: '#22c55e', fontWeight: 'bold' }}>REALIZADA</span>
                                            </div>
                                        </div>
                                        <div className="resumen-card">
                                            <div className="resumen-icono"></div>
                                            <div className="resumen-info">
                                                <label>Fecha de realización</label>
                                                <span>{new Date(audienciaRealizada.fecha_programada).toLocaleDateString('es-PE')}</span>
                                            </div>
                                        </div>
                                        <div className="resumen-card">
                                            <div className="resumen-icono"></div>
                                            <div className="resumen-info">
                                                <label>Hora</label>
                                                <span>{new Date(audienciaRealizada.fecha_programada).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                        <div className="resumen-card">
                                            <div className="resumen-icono"></div>
                                            <div className="resumen-info">
                                                <label>Resultado</label>
                                                <span>{audienciaRealizada.resultado === 'RATIFICACION' ? ' Ratificación' : ' Desistimiento'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button 
                                        className="btn-registrar-audiencia"
                                        onClick={() => navigate(`/modulo3/expediente/${id}/registrar-audiencia`)}
                                        style={{ width: '100%', marginTop: '16px' }}
                                    >
                                         Ver Registro de Audiencia
                                    </button>
                                </>
                            ) : audienciaProgramada && !modoReprogramacion ? (
                                //  Resumen de audiencia programada
                                <>
                                    <h2> AUDIENCIA PROGRAMADA</h2>
                                    <div className="audiencia-resumen">
                                        <div className="resumen-card">
                                            <div className="resumen-icono"></div>
                                            <div className="resumen-info">
                                                <label>Fecha</label>
                                                <span>{new Date(audienciaProgramada.fecha_programada).toLocaleDateString('es-PE')}</span>
                                            </div>
                                        </div>
                                        <div className="resumen-card">
                                            <div className="resumen-icono"></div>
                                            <div className="resumen-info">
                                                <label>Hora</label>
                                                <span>{new Date(audienciaProgramada.fecha_programada).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                        <div className="resumen-card">
                                            <div className="resumen-icono"></div>
                                            <div className="resumen-info">
                                                <label>Intento N°</label>
                                                <span>{audienciaProgramada.numero_intento}</span>
                                            </div>
                                        </div>
                                        <div className="resumen-card">
                                            <div className="resumen-icono"></div>
                                            <div className="resumen-info">
                                                <label>Estado</label>
                                                <span className="estado-programada">PROGRAMADA</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="botones-accion">
                                        <button 
                                            className="btn-registrar-audiencia"
                                            onClick={() => navigate(`/modulo3/expediente/${id}/registrar-audiencia`)}
                                        >
                                            🎤 Registrar Audiencia
                                        </button>
                                        <button 
                                            className="btn-reprogramar"
                                            onClick={() => {
                                                setModoReprogramacion(true)
                                                setFechaHora('')
                                                setMensaje(null)
                                            }}
                                        >
                                             Reprogramar Audiencia
                                        </button>
                                    </div>
                                </>
                            ) : (
                                // Formulario de programación (nueva o reprogramación)
                                <>
                                    <h2>{modoReprogramacion ? ' REPROGRAMAR AUDIENCIA' : ' SELECCIONE FECHA Y HORA'}</h2>
                                    
                                    {modoReprogramacion && (
                                        <div className="aviso-reprogramacion">
                                             Está reprogramando la audiencia. La fecha anterior será liberada.
                                        </div>
                                    )}
                                    
                                    <div className="programacion-form">
                                        <div className="campo">
                                            <label>Fecha *</label>
                                            <input
                                                type="date"
                                                value={fechaHora ? fechaHora.split('T')[0] : ''}
                                                onChange={(e) => {
                                                    const hora = fechaHora ? fechaHora.split('T')[1] : '10:00'
                                                    setFechaHora(e.target.value ? `${e.target.value}T${hora}` : '')
                                                    setMensaje(null)
                                                }}
                                                min={new Date().toISOString().split('T')[0]}
                                            />
                                        </div>
                                        <div className="campo">
                                            <label>Hora *</label>
                                            <select
                                                value={fechaHora ? fechaHora.split('T')[1] : ''}
                                                onChange={(e) => {
                                                    const fecha = fechaHora ? fechaHora.split('T')[0] : ''
                                                    setFechaHora(fecha ? `${fecha}T${e.target.value}` : '')
                                                    setMensaje(null)
                                                }}
                                            >
                                                <option value="">Seleccione una hora</option>
                                                {horasDisponibles.map(hora => (
                                                    <option key={hora} value={hora}>{hora}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {mensaje && (
                                            <div className={`mensaje ${mensaje.tipo}`}>
                                                {mensaje.texto}
                                            </div>
                                        )}

                                        <div className="botones-formulario">
                                            <button
                                                className="btn-programar"
                                                onClick={handleProgramar}
                                                disabled={enviando || !fechaHora}
                                            >
                                                {enviando ? 'Programando...' : modoReprogramacion ? ' Confirmar Reprogramación' : ' Programar Audiencia'}
                                            </button>
                                            
                                            {modoReprogramacion && (
                                                <button
                                                    className="btn-cancelar-reprogramacion"
                                                    onClick={() => {
                                                        setModoReprogramacion(false)
                                                        setFechaHora('')
                                                        setMensaje(null)
                                                    }}
                                                >
                                                    ❌ Cancelar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
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