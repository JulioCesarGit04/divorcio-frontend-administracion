// src/components/modulo3/PlazoAlerta.jsx
import { useEffect, useState } from 'react'
import { getDiasHabilesEntre, sumarDiasHabiles } from '../../services/ProcedimientoService'
import '../../styles/modulo3/PlazoAlerta.css'

export default function PlazoAlerta({ expediente, audienciaActual, debug = false }) {
    // ─── Estados del componente principal ──────────────────────────────────────
    const [diasRestantes, setDiasRestantes] = useState(null)
    const [color, setColor] = useState('#64748b')
    const [estado, setEstado] = useState('normal')
    const [info, setInfo] = useState({
        titulo: '',
        fechaLimite: null,
        fechaEvento: null,
        horaEvento: null,
        mostrar: false
    })
    const [cargandoDias, setCargandoDias] = useState(false)

    // ─── Estados para el panel de depuración ──────────────────────────────────
    const [debugInicio, setDebugInicio] = useState('')
    const [debugDias, setDebugDias] = useState(15)
    const [debugResultadoBackend, setDebugResultadoBackend] = useState(null)
    const [debugDiasBackend, setDebugDiasBackend] = useState(null)
    const [debugFrontend, setDebugFrontend] = useState(null)
    const [debugCargando, setDebugCargando] = useState(false)

    // ─── Funciones auxiliares ──────────────────────────────────────────────────
    const formatFecha = (fecha) => {
        if (!fecha) return '—'
        return fecha.split('T')[0].split('-').reverse().join('/')
    }

    const formatHoraLocal = (fechaStr) => {
        if (!fechaStr) return null
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
            return null
        }
        const horaInt = parseInt(hora)
        const hora12 = horaInt % 12 || 12
        const ampm = horaInt >= 12 ? 'p. m.' : 'a. m.'
        return `${hora12}:${minuto} ${ampm}`
    }

    const calcularDiasCalendarioRestantes = (fechaLimite) => {
        if (!fechaLimite) return null
        const hoy = new Date()
        hoy.setHours(0, 0, 0, 0)
        const limite = new Date(fechaLimite)
        const diffTime = limite - hoy
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    }

    // ─── useEffect principal – maneja todos los casos ────────────────────────
    useEffect(() => {
        if (!expediente) return

        const etapa = expediente.etapa
        const tieneAudienciaProgramada = audienciaActual && audienciaActual.estado === 'PROGRAMADA'
        const tieneAudienciaRealizada = audienciaActual && audienciaActual.estado === 'REALIZADA'
        const tieneAudienciaReprogramada = audienciaActual && audienciaActual.estado === 'REPROGRAMADA'

        // 1. Espera legal (días calendario – 60 días exactos)
        if (etapa === 'ESPERA_LEGAL' && expediente.fecha_fin_espera) {
            const dias = calcularDiasCalendarioRestantes(expediente.fecha_fin_espera)
            setDiasRestantes(dias)
            setInfo({
                titulo: 'Plazo de espera legal',
                fechaLimite: expediente.fecha_fin_espera,
                fechaEvento: null,
                horaEvento: null,
                mostrar: true
            })
            return
        }

        // 2. Disolución
        if (etapa === 'DISOLUCION') {
            setInfo({
                titulo: 'Etapa de Disolución',
                fechaLimite: null,
                fechaEvento: null,
                horaEvento: null,
                mostrar: true
            })
            setDiasRestantes(null)
            return
        }

        // 3. Audiencia programada
        if (tieneAudienciaProgramada) {
            const fechaStr = audienciaActual.fecha_programada
            const horaFormateada = formatHoraLocal(fechaStr)
            setInfo({
                titulo: 'Audiencia programada',
                fechaLimite: null,
                fechaEvento: fechaStr,
                horaEvento: horaFormateada,
                mostrar: true
            })
            setDiasRestantes(null)
            return
        }

        // 4. Audiencia realizada
        if (tieneAudienciaRealizada) {
            const fechaStr = audienciaActual.fecha_programada
            const horaFormateada = formatHoraLocal(fechaStr)
            setInfo({
                titulo: 'Audiencia realizada',
                fechaLimite: null,
                fechaEvento: fechaStr,
                horaEvento: horaFormateada,
                mostrar: true
            })
            setDiasRestantes(null)
            return
        }

        // 5. Reprogramación de audiencia (con plazo límite)
if (tieneAudienciaReprogramada && expediente.fecha_limite_audiencia) {
    const fechaOriginalStr = audienciaActual.fecha_programada
    const horaOriginal = formatHoraLocal(fechaOriginalStr)
    setInfo({
        titulo: 'Reprogramación de audiencia',
        fechaLimite: expediente.fecha_limite_audiencia,
        fechaEvento: fechaOriginalStr,
        horaEvento: horaOriginal,
        mostrar: true
    })
    let dias = expediente.dias_restantes_audiencia_habiles;
    if (dias !== null && dias !== undefined) {
        dias = dias + 1;
    }
    setDiasRestantes(dias);
    return
}




        // 6. Plazo para programar audiencia (EVALUACION, DOCUMENTOS_INTERNOS, AUDIENCIA)
if ((etapa === 'EVALUACION' || etapa === 'DOCUMENTOS_INTERNOS' || etapa === 'AUDIENCIA') && expediente.fecha_limite_audiencia) {
    setInfo({
        titulo: 'Plazo para programar audiencia',
        fechaLimite: expediente.fecha_limite_audiencia,
        fechaEvento: null,
        horaEvento: null,
        mostrar: true
    })
    // Usar el valor del backend y sumarle 1 para corregir el desfase
    let dias = expediente.dias_restantes_audiencia_habiles;
    if (dias !== null && dias !== undefined) {
        dias = dias + 1;
    }
    setDiasRestantes(dias);
    return
}

        // 7. Ningún caso coincide → ocultar
        setInfo({ ...info, mostrar: false })
    }, [expediente, audienciaActual])

    // ─── useEffect para colores y estado visual ──────────────────────────────
    useEffect(() => {
        if (diasRestantes === null) {
            setColor('#64748b')
            setEstado('normal')
        } else if (diasRestantes < 0) {
            setColor('#dc2626')
            setEstado('vencido')
        } else if (diasRestantes < 3) {
            setColor('#dc2626')
            setEstado('urgente')
        } else if (diasRestantes <= 7) {
            setColor('#eab308')
            setEstado('proximo')
        } else {
            setColor('#22c55e')
            setEstado('normal')
        }
    }, [diasRestantes])

    // ─── Función para generar el mensaje ──────────────────────────────────────
    const getDescripcion = () => {
        if (estado === 'vencido') return 'PLAZO VENCIDO'
        if (diasRestantes === null) return null

        if (info.titulo === 'Plazo para programar audiencia' || info.titulo === 'Reprogramación de audiencia') {
            if (diasRestantes === 0) return 'Último día hábil'
            return `${diasRestantes} ${diasRestantes === 1 ? 'día hábil restante' : 'días hábiles restantes'}`
        }

        if (info.titulo === 'Plazo de espera legal') {
            if (diasRestantes === 0) return 'Último día'
            return `${diasRestantes} ${diasRestantes === 1 ? 'día restante' : 'días restantes'}`
        }

        return null
    }

    // ─── Panel de depuración (sin cambios) ──────────────────────────────────
    const contarDiasHabilesLocal = (inicioStr, finStr) => {
        const inicio = new Date(inicioStr)
        const fin = new Date(finStr)
        inicio.setHours(0, 0, 0, 0)
        fin.setHours(0, 0, 0, 0)
        let contador = 0
        let fecha = new Date(inicio)
        while (fecha <= fin) {
            const diaSemana = fecha.getDay()
            if (diaSemana !== 0 && diaSemana !== 6) contador++
            fecha.setDate(fecha.getDate() + 1)
        }
        return contador
    }

    const handleDebugCalcular = async () => {
        if (!debugInicio || debugDias <= 0) return;
        setDebugCargando(true);
        try {
            console.log('🔍 handleDebugCalcular - debugInicio:', debugInicio);
            console.log('🔍 handleDebugCalcular - debugDias:', debugDias);

            const resSuma = await sumarDiasHabiles(debugInicio, debugDias);
            console.log('🔍 resSuma:', resSuma);
            const fechaFinalBackend = resSuma.fecha;
            console.log('🔍 fechaFinalBackend:', fechaFinalBackend);

            const resEntre = await getDiasHabilesEntre(debugInicio, fechaFinalBackend);
            console.log('🔍 resEntre:', resEntre);
            const diasBackend = resEntre.dias;
            console.log('🔍 diasBackend:', diasBackend);

            const diasFrontend = contarDiasHabilesLocal(debugInicio, fechaFinalBackend);
            console.log('🔍 diasFrontend:', diasFrontend);

            setDebugResultadoBackend(fechaFinalBackend);
            setDebugDiasBackend(diasBackend);
            setDebugFrontend(diasFrontend);

            console.log('✅ Estados actualizados:');
            console.log('  debugResultadoBackend:', fechaFinalBackend);
            console.log('  debugDiasBackend:', diasBackend);
            console.log('  debugFrontend:', diasFrontend);
        } catch (error) {
            console.error('Error en depuración:', error);
        } finally {
            setDebugCargando(false);
        }
    };

    // ─── Renderizado condicional según debug ──────────────────────────────────
    if (debug) {
        return (
            <div className="plazo-alerta debug-panel" style={{ border: '2px solid #ccc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <h3 style={{ marginTop: 0 }}>🧪 Depuración de días hábiles</h3>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'end' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold' }}>Fecha inicio</label>
                        <input
                            type="date"
                            value={debugInicio}
                            onChange={e => setDebugInicio(e.target.value)}
                            style={{ padding: '4px 8px' }}
                        />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold' }}>Días hábiles a sumar</label>
                        <input
                            type="number"
                            min="0"
                            value={debugDias}
                            onChange={e => setDebugDias(Number(e.target.value))}
                            style={{ padding: '4px 8px', width: '80px' }}
                        />
                    </div>
                    <button onClick={handleDebugCalcular} disabled={debugCargando} style={{ padding: '6px 16px' }}>
                        {debugCargando ? 'Calculando...' : 'Calcular'}
                    </button>
                </div>

                {debugResultadoBackend && (
                    <div style={{ marginTop: '1rem', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
                        <p><strong>Fecha final (backend):</strong> {debugResultadoBackend}</p>
                        <p><strong>Días hábiles contados (backend):</strong> {debugDiasBackend} días</p>
                        <p><strong>Días hábiles contados (frontend solo fines de semana):</strong> {debugFrontend} días</p>
                        <p style={{ color: debugDiasBackend !== debugFrontend ? 'red' : 'green' }}>
                            {debugDiasBackend !== debugFrontend ? '⚠️ Desfase detectado' : '✅ Coinciden'}
                        </p>
                        {debugDiasBackend !== debugDias && (
                            <p style={{ color: 'orange' }}>
                                ⚠️ El número de días hábiles sumados ({debugDias}) no coincide con los contados ({debugDiasBackend}).
                            </p>
                        )}
                    </div>
                )}
                <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem' }}>
                    <em>Nota: El cálculo del backend considera feriados nacionales peruanos y días no laborables.</em>
                </p>
            </div>
        )
    }

    // ─── Modo normal: renderizado del componente principal ────────────────────
    if (!info.mostrar) return null

    return (
        <div className="plazo-alerta" style={{ borderLeftColor: color }}>
            <div className="plazo-alerta-icono"></div>
            <div className="plazo-alerta-contenido">
                <div className="plazo-alerta-titulo">{info.titulo}</div>

                {cargandoDias && (
                    <div className="plazo-alerta-cargando" style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                        Calculando días...
                    </div>
                )}

                {info.fechaEvento && (
                    <div className="plazo-alerta-eventos">
                        <div className="evento-info">
                            <span className="evento-fecha"> {formatFecha(info.fechaEvento)}</span>
                            {info.horaEvento && <span className="evento-hora"> {info.horaEvento}</span>}
                        </div>
                    </div>
                )}

                {info.fechaLimite && estado !== 'vencido' && getDescripcion() && (
                    <div className="plazo-alerta-dias" style={{ color: color }}>
                        {getDescripcion()}
                    </div>
                )}

                {estado === 'vencido' && (
                    <div className="plazo-alerta-vencido" style={{ color: color }}>
                        {getDescripcion()}
                    </div>
                )}

                {info.fechaLimite && (
                    <div className="plazo-alerta-fecha">
                        {info.titulo === 'Reprogramación de audiencia' ? 'Nueva fecha límite:' : 'Fecha límite:'} {formatFecha(info.fechaLimite)}
                    </div>
                )}
            </div>
        </div>
    )
}