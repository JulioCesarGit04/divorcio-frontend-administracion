import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../../components/modulo3/Sidebar'
import BotonesNavegacion from '../../components/modulo3/BotonesNavegacion'
import PipelineVisual from '../../components/modulo3/PipelineVisual'
import PlazoAlerta from '../../components/modulo3/PlazoAlerta'
import { getExpedienteById, getCronograma, programarAudiencia, getAudiencias } from '../../services/ProcedimientoService'
import '../../styles/modulo3/programar-audiencia.css'

export default function ProgramarAudiencia() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [expediente, setExpediente] = useState(null)
    const [cargando, setCargando] = useState(true)
    const [error, setError] = useState(null)
    const [fechaSeleccionada, setFechaSeleccionada] = useState('')
    const [horaSeleccionada, setHoraSeleccionada] = useState('')
    const [slotsOcupados, setSlotsOcupados] = useState([])
    const [fechaLimite, setFechaLimite] = useState(null)
    const [enviando, setEnviando] = useState(false)
    const [mensaje, setMensaje] = useState(null)
    const [audienciaVigente, setAudienciaVigente] = useState(null)
    const [audienciaProgramada, setAudienciaProgramada] = useState(null)
    const [audienciaRealizada, setAudienciaRealizada] = useState(null)
    const [audienciaReprogramada, setAudienciaReprogramada] = useState(null)
    const [modoReprogramacion, setModoReprogramacion] = useState(false)
    const [horasDisponibles, setHorasDisponibles] = useState(['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'])

    const horasDisponiblesBase = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']

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

    const formatFecha = (fecha) => {
        if (!fecha) return '—'
        return fecha.split('T')[0].split('-').reverse().join('/')
    }

    const formatHora = (fecha) => {
        if (!fecha) return '—'
        const horaStr = fecha.includes('T') ? fecha.split('T')[1] : fecha.split(' ')[1]
        const hora = horaStr.split(':')[0]
        const minuto = horaStr.split(':')[1]
        const hora12 = parseInt(hora) % 12 || 12
        const ampm = parseInt(hora) >= 12 ? 'p. m.' : 'a. m.'
        return `${hora12}:${minuto} ${ampm}`
    }

    const getHorasOcupadas = (fecha) => {
        if (!fecha) return []
        
        const horasOcupadas = slotsOcupados
            .filter(slot => {
                const slotFecha = slot.fecha_hora.split('T')[0]
                return slotFecha === fecha
            })
            .map(slot => slot.fecha_hora.split('T')[1].substring(0, 5))
        
        return horasOcupadas
    }

    useEffect(() => {
        if (fechaSeleccionada) {
            const horasOcupadas = getHorasOcupadas(fechaSeleccionada)
            const horasFiltradas = horasDisponiblesBase.filter(hora => !horasOcupadas.includes(hora))
            setHorasDisponibles(horasFiltradas)
            
            if (horaSeleccionada && horasOcupadas.includes(horaSeleccionada)) {
                setHoraSeleccionada('')
                setMensaje({ tipo: 'warning', texto: 'La hora seleccionada ya no está disponible' })
            }
        } else {
            setHorasDisponibles(horasDisponiblesBase)
        }
    }, [fechaSeleccionada, slotsOcupados])

    useEffect(() => {
        const cargar = async () => {
            if (!id) return
            setCargando(true)
            try {
                console.log('========== INICIO CARGA ==========')
                console.log('Expediente ID:', id)
                
                const resExp = await getExpedienteById(id)
                const data = resExp?.data || resExp
                const expedienteData = data?.expediente || data
                setExpediente(expedienteData)
                console.log('Expediente cargado:', expedienteData?.numero_expediente, 'etapa:', expedienteData?.etapa)

                if (expedienteData?.fecha_limite_audiencia) {
                    setFechaLimite(expedienteData.fecha_limite_audiencia)
                    console.log('Fecha límite:', expedienteData.fecha_limite_audiencia)
                }

                console.log('Cargando cronograma...')
                const resCrono = await getCronograma()
                const slots = resCrono?.data || resCrono || []
                setSlotsOcupados(slots)
                console.log('Slots ocupados:', slots.length)

                const resAudiencias = await getAudiencias(id)
                const audienciasData = resAudiencias?.data || resAudiencias || []
                console.log('========== AUDIENCIAS CARGADAS ==========')
                console.log('Total audiencias:', audienciasData.length)
                console.log('Detalle:', JSON.stringify(audienciasData, null, 2))
                
                // Buscar la audiencia con es_actual = 1 (la vigente)
                const vigente = audienciasData.find(a => a.es_actual === true || a.es_actual === 1)
                console.log('========== AUDIENCIA VIGENTE ==========')
                console.log('es_actual=1:', vigente)
                
                if (!vigente) {
                    console.log('⚠️ No se encontró audiencia con es_actual=1')
                }
                
                // Clasificar por tipo
                const realizada = vigente && vigente.estado === 'REALIZADA' ? vigente : null
                const programada = vigente && vigente.estado === 'PROGRAMADA' ? vigente : null
                const reprogramada = vigente && vigente.estado === 'REPROGRAMADA' ? vigente : null
                
                console.log('========== CLASIFICACIÓN ==========')
                console.log('realizada:', realizada)
                console.log('programada:', programada)
                console.log('reprogramada:', reprogramada)
                console.log('======================================')
                
                setAudienciaVigente(vigente)
                setAudienciaRealizada(realizada)
                setAudienciaProgramada(programada)
                setAudienciaReprogramada(reprogramada)

            } catch (err) {
                console.error('Error en carga:', err)
                setError(err.message)
            } finally {
                setCargando(false)
            }
        }
        cargar()
    }, [id])

    const isSlotOcupado = (fecha, hora) => {
        if (!fecha || !hora) return false
        const fechaHoraStr = `${fecha}T${hora}:00.000Z`
        const fechaObj = new Date(fechaHoraStr)
        
        return slotsOcupados.some(slot => {
            const slotFecha = new Date(slot.fecha_hora)
            return slotFecha.getTime() === fechaObj.getTime()
        })
    }

    const validarFecha = () => {
        if (!fechaSeleccionada) {
            setMensaje({ tipo: 'error', texto: 'Debe seleccionar una fecha' })
            return false
        }
        if (!horaSeleccionada) {
            setMensaje({ tipo: 'error', texto: 'Debe seleccionar una hora' })
            return false
        }

        const fechaObj = new Date(`${fechaSeleccionada}T${horaSeleccionada}:00`)
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)

        if (fechaObj < hoy) {
            setMensaje({ tipo: 'error', texto: 'No puede seleccionar una fecha pasada' })
            return false
        }

        if (fechaLimite) {
            const fechaLimiteDate = new Date(fechaLimite)
            if (fechaObj > fechaLimiteDate) {
                const diasExcedidos = Math.ceil((fechaObj - fechaLimiteDate) / (1000 * 60 * 60 * 24))
                const confirmar = window.confirm(
                    `ADVERTENCIA\n\nLa fecha seleccionada excede el plazo legal en ${diasExcedidos} dia(s).\n\nDesea programar la audiencia fuera de plazo?`
                )
                if (!confirmar) return false
            }
        }

        if (isSlotOcupado(fechaSeleccionada, horaSeleccionada)) {
            setMensaje({ tipo: 'error', texto: 'El horario ya esta ocupado por otra audiencia' })
            return false
        }

        return true
    }

    const puedeReprogramar = () => {
        if (!audienciaProgramada) return true
        const intentoActual = audienciaProgramada.numero_intento || 1
        return intentoActual < 2
    }

    const handleProgramar = async () => {
        if (!validarFecha()) return

        if (modoReprogramacion && !puedeReprogramar()) {
            setMensaje({ tipo: 'error', texto: 'No se puede reprogramar. Se ha alcanzado el maximo de intentos.' })
            return
        }

        setEnviando(true)
        setMensaje(null)

        try {
            const fechaCompleta = `${fechaSeleccionada}T${horaSeleccionada}:00`
            await programarAudiencia(id, fechaCompleta)
            setMensaje({ tipo: 'success', texto: modoReprogramacion ? 'Audiencia reprogramada correctamente' : 'Audiencia programada correctamente' })
            
            setTimeout(() => {
                window.location.reload()
            }, 1500)
        } catch (err) {
            console.error('Error:', err)
            setMensaje({ tipo: 'error', texto: err.message || 'Error al programar audiencia' })
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
                        <h1>Programar Audiencia</h1>
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
                        <button className="btn-volver" onClick={() => navigate(`/modulo3/detalle/${id}`)}>← Volver</button>
                        <h1>Programar Audiencia</h1>
                    </div>
                    <p style={{ color: 'red' }}>Error: {error}</p>
                </main>
            </>
        )
    }

    const numeroMesaPartes = expediente?.numero_mesa_partes || expediente?.expedientes_nro_mesa_partes
    const estaCancelado = expediente?.estado === 'CANCELADO'

    console.log('========== RENDER FINAL ==========')
    console.log('audienciaVigente:', audienciaVigente)
    console.log('audienciaProgramada:', audienciaProgramada)
    console.log('audienciaRealizada:', audienciaRealizada)
    console.log('==================================')

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
                    <div style={{ flex: 2 }}>
                        <PlazoAlerta 
                            expediente={expediente}
                            audienciaActual={audienciaVigente}
                        />

                        <div className="seccion">
                            <h2>Datos para las actas de audiencia</h2>
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
                                    <label>Direccion:</label>
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
                                    <label>Direccion:</label>
                                    <span>{expediente?.Demandado_Direccion || '—'}</span>
                                </div>
                            </div>
                        </div>

                        <div className="seccion">
                            {estaCancelado ? (
                                <>
                                    <div className="cancelado-mensaje">
                                        <div className="cancelado-icono">❌</div>
                                        <h3>Expediente Cancelado</h3>
                                        <p>Este expediente ha sido cancelado.</p>
                                        <p>No es posible programar o reprogramar una audiencia.</p>
                                        <button 
                                            className="btn-volver-detalle"
                                            onClick={() => navigate(`/modulo3/detalle/${id}`)}
                                        >
                                            Volver al detalle del expediente
                                        </button>
                                    </div>
                                </>
                            ) : audienciaRealizada ? (
                                <>
                                    <h2>Audiencia ya realizada</h2>
                                    <div className="audiencia-resumen">
                                        <div className="resumen-card">
                                            <div className="resumen-info">
                                                <label>Estado</label>
                                                <span style={{ color: '#22c55e', fontWeight: 'bold' }}>REALIZADA</span>
                                            </div>
                                        </div>
                                        <div className="resumen-card">
                                            <div className="resumen-info">
                                                <label>Fecha</label>
                                                <span>{formatFecha(audienciaRealizada.fecha_programada)}</span>
                                            </div>
                                        </div>
                                        <div className="resumen-card">
                                            <div className="resumen-info">
                                                <label>Hora</label>
                                                <span>{formatHora(audienciaRealizada.fecha_programada)}</span>
                                            </div>
                                        </div>
                                        <div className="resumen-card">
                                            <div className="resumen-info">
                                                <label>Resultado</label>
                                                <span>{audienciaRealizada.resultado === 'RATIFICACION' ? 'Ratificacion' : 'Desistimiento'}</span>
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
                                <>
                                    <h2>Audiencia programada</h2>
                                    <div className="audiencia-resumen">
                                        <div className="resumen-card">
                                            <div className="resumen-info">
                                                <label>Fecha</label>
                                                <span>{formatFecha(audienciaProgramada.fecha_programada)}</span>
                                            </div>
                                        </div>
                                        <div className="resumen-card">
                                            <div className="resumen-info">
                                                <label>Hora</label>
                                                <span>{formatHora(audienciaProgramada.fecha_programada)}</span>
                                            </div>
                                        </div>
                                        <div className="resumen-card">
                                            <div className="resumen-info">
                                                <label>Intento</label>
                                                <span>{audienciaProgramada.numero_intento}/2</span>
                                            </div>
                                        </div>
                                        <div className="resumen-card">
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
                                            Registrar Audiencia
                                        </button>
                                        {audienciaReprogramada && puedeReprogramar(
                                            <button 
                                                className="btn-reprogramar"
                                                onClick={() => {
                                                    setModoReprogramacion(true)
                                                    setFechaSeleccionada('')
                                                    setHoraSeleccionada('')
                                                    setMensaje(null)
                                                }}
                                            >
                                                Reprogramar Audiencia
                                            </button>
                                        )}
                                        {!puedeReprogramar() && (
                                            <div className="aviso-max-intentos">
                                                Maximo de reprogramaciones alcanzado (2/2)
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h2>{modoReprogramacion ? 'Reprogramar audiencia' : 'Seleccione fecha y hora'}</h2>
                                    
                                    {modoReprogramacion && (
                                        <div className="aviso-reprogramacion">
                                            Esta reprogramando la audiencia. La fecha anterior sera liberada.
                                            {audienciaProgramada && (
                                                <div className="intento-info">
                                                    Intento actual: {audienciaProgramada?.numero_intento || 1}/2
                                                    {audienciaProgramada?.numero_intento >= 2 && (
                                                        <span className="aviso-max"> (No se puede reprogramar mas)</span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    <div className="programacion-form">
                                        <div className="campo">
                                            <label>Fecha *</label>
                                            <input
                                                type="date"
                                                value={fechaSeleccionada}
                                                onChange={(e) => {
                                                    setFechaSeleccionada(e.target.value)
                                                    setHoraSeleccionada('')
                                                    setMensaje(null)
                                                }}
                                                min={new Date().toISOString().split('T')[0]}
                                            />
                                        </div>
                                        <div className="campo">
                                            <label>Hora *</label>
                                            <select
                                                value={horaSeleccionada}
                                                onChange={(e) => {
                                                    setHoraSeleccionada(e.target.value)
                                                    setMensaje(null)
                                                }}
                                                disabled={!fechaSeleccionada}
                                            >
                                                <option value="">Seleccione una hora</option>
                                                {horasDisponibles.map(hora => (
                                                    <option key={hora} value={hora}>{hora}</option>
                                                ))}
                                            </select>
                                            {fechaSeleccionada && horasDisponibles.length === 0 && (
                                                <div className="aviso-horas-ocupadas">
                                                    No hay horas disponibles para esta fecha. Seleccione otra fecha.
                                                </div>
                                            )}
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
                                                disabled={enviando || !fechaSeleccionada || !horaSeleccionada || horasDisponibles.length === 0}
                                            >
                                                {enviando ? 'Programando...' : modoReprogramacion ? 'Confirmar Reprogramacion' : 'Programar Audiencia'}
                                            </button>
                                            
                                            {modoReprogramacion && (
                                                <button
                                                    className="btn-cancelar-reprogramacion"
                                                    onClick={() => {
                                                        setModoReprogramacion(false)
                                                        setFechaSeleccionada('')
                                                        setHoraSeleccionada('')
                                                        setMensaje(null)
                                                    }}
                                                >
                                                    Cancelar
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
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